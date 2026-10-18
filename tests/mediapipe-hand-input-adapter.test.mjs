import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaPipeHandInputAdapter } from '../src/adapters/mediapipe-hand-input-adapter.ts';
import { renderHandOverlay } from '../src/adapters/hand-landmarks-renderer.ts';

globalThis.HTMLMediaElement ??= { HAVE_CURRENT_DATA: 2 };

class FakeWorker {
  listeners = new Map();
  messages = [];
  terminated = false;

  constructor(autoReady = true) { this.autoReady = autoReady; }

  addEventListener(type, callback) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, callback) {
    this.listeners.get(type)?.delete(callback);
  }

  postMessage(message) {
    this.messages.push(message);
    if (message.type === 'init' && this.autoReady) {
      queueMicrotask(() => this.emit('message', { data: { type: 'ready' } }));
    }
  }

  terminate() { this.terminated = true; }

  emit(type, event) {
    for (const callback of this.listeners.get(type) ?? []) callback(event);
  }
}

function fakeStream() {
  const track = {
    stopped: false,
    listeners: new Map(),
    addEventListener(type, callback) {
      const listeners = this.listeners.get(type) ?? new Set();
      listeners.add(callback);
      this.listeners.set(type, listeners);
    },
    removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); },
    stop() { this.stopped = true; },
    emit(type) { for (const callback of this.listeners.get(type) ?? []) callback(new Event(type)); }
  };
  return {
    track,
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track]
    }
  };
}

function fakeVideo() {
  return {
    srcObject: null,
    muted: false,
    playsInline: false,
    playCalls: 0,
    pauseCalls: 0,
    readyState: 0,
    currentTime: 0,
    dataset: {},
    play() { this.playCalls += 1; return Promise.resolve(); },
    pause() { this.pauseCalls += 1; }
  };
}

function createAdapter(overrides = {}) {
  const { track, stream } = fakeStream();
  const video = fakeVideo();
  const worker = new FakeWorker(overrides.autoReady !== false);
  const calls = { camera: 0, worker: 0, stoppedTrack: track, cancelledFrames: [] };
  const clock = { now: 10 };
  const adapter = new MediaPipeHandInputAdapter(video, {
    getUserMedia: async (constraints) => {
      calls.camera += 1;
      calls.constraints = constraints;
      if (overrides.getUserMedia) return overrides.getUserMedia(stream);
      return stream;
    },
    createWorker: () => { calls.worker += 1; return worker; },
    createBitmap: overrides.createBitmap,
    onStatus: overrides.onStatus,
    onDetection: (players, canCalibrate, calibrated) => {
      calls.lastDetection = { players, canCalibrate, calibrated };
      overrides.onDetection?.(players, canCalibrate, calibrated);
    },
    requestFrame: (callback) => { calls.frameCallback = callback; return 17; },
    cancelFrame: (id) => calls.cancelledFrames.push(id),
    now: () => clock.now
  });
  return { adapter, calls, video, worker, stream, track, clock };
}

function makeLandmarks(wristX) {
  const landmarks = Array.from({ length: 21 }, () => ({ x: wristX, y: 0.5 }));
  landmarks[0] = { x: wristX, y: 0.5 };
  landmarks[4] = { x: wristX + 0.02, y: 0.5 };
  landmarks[5] = { x: wristX + 0.04, y: 0.5 };
  landmarks[8] = { x: wristX + 0.06, y: 0.5 };
  landmarks[9] = { x: wristX, y: 0.46 };
  landmarks[17] = { x: wristX - 0.04, y: 0.5 };
  return landmarks;
}

test('camera and model start only after the adapter is explicitly started', async () => {
  const { adapter, calls, video, worker } = createAdapter();
  assert.deepEqual(adapter.read(), {
    p1: { moveAxis: 0, catch: false },
    p2: { moveAxis: 0, catch: false }
  });
  assert.equal(calls.camera, 0);
  assert.equal(calls.worker, 0);

  await adapter.start();
  assert.equal(calls.camera, 1);
  assert.equal(calls.worker, 1);
  assert.equal(calls.constraints.audio, false);
  assert.equal(calls.constraints.video.width.ideal, 640);
  assert.equal(adapter.currentStatus, 'ready');
  assert.equal(video.muted, true);
  assert.equal(video.playsInline, true);
  assert.equal(video.dataset.active, 'true');
  assert.equal(worker.messages[0].type, 'init');

  adapter.stop();
  assert.equal(calls.stoppedTrack.stopped, true);
  assert.equal(video.srcObject, null);
  assert.equal(video.dataset.active, undefined);
  assert.equal(worker.terminated, true);
  assert.deepEqual(calls.cancelledFrames, [17]);
});

test('camera permission failure returns a usable neutral adapter state', async () => {
  const { adapter, calls } = createAdapter({
    getUserMedia: async () => { throw new DOMException('permission denied', 'NotAllowedError'); }
  });

  await assert.rejects(adapter.start(), /Camera permission was denied/);
  assert.equal(calls.camera, 1);
  assert.equal(calls.worker, 0);
  assert.equal(adapter.currentStatus, 'error');
  assert.deepEqual(adapter.read(), {
    p1: { moveAxis: 0, catch: false },
    p2: { moveAxis: 0, catch: false }
  });
});

test('cancelling while browser permission is pending stops the eventual stream', async () => {
  let resolveCamera;
  const { adapter, calls, track } = createAdapter({
    getUserMedia: () => new Promise((resolve) => { resolveCamera = resolve; })
  });

  const pendingStart = adapter.start();
  adapter.stop();
  const { stream } = fakeStream();
  const lateTrack = stream.getTracks()[0];
  resolveCamera(stream);
  await pendingStart;

  assert.equal(lateTrack.stopped, true);
  assert.equal(calls.worker, 0);
  assert.equal(adapter.currentStatus, 'stopped');
  assert.equal(track.stopped, false);
});

test('stale hand detections disable calibration and camera start feedback', async () => {
  const { adapter, worker, calls, clock } = createAdapter();
  await adapter.start();
  worker.emit('message', {
    data: { type: 'result', timestamp: 10, hands: [makeLandmarks(0.78), makeLandmarks(0.22)] }
  });

  assert.equal(adapter.canCalibrate(), true);
  assert.deepEqual(calls.lastDetection.players, ['p1', 'p2']);
  assert.equal(adapter.calibrate(), true);
  assert.equal(adapter.canStart(), true);

  clock.now = 400;
  calls.frameCallback(0);

  assert.equal(adapter.canCalibrate(), false);
  assert.equal(adapter.canStart(), false);
  assert.deepEqual(calls.lastDetection.players, []);
  assert.equal(calls.lastDetection.canCalibrate, false);
  adapter.stop();
});

test('repeated frame capture failures stop camera mode and expose an error', async () => {
  const statuses = [];
  const originalHtmlMediaElement = globalThis.HTMLMediaElement;
  globalThis.HTMLMediaElement ??= { HAVE_CURRENT_DATA: 2 };
  const { adapter, video, worker, calls, clock, track } = createAdapter({
    createBitmap: async () => { throw new Error('bitmap unavailable'); },
    onStatus: (status, message) => statuses.push({ status, message })
  });
  await adapter.start();
  video.readyState = 2;

  for (let failure = 1; failure <= 3; failure += 1) {
    clock.now = failure * 100;
    video.currentTime = failure;
    calls.frameCallback(0);
    await new Promise((resolve) => setImmediate(resolve));
  }

  assert.equal(adapter.currentStatus, 'error');
  assert.equal(track.stopped, true);
  assert.equal(worker.terminated, true);
  assert.equal(statuses.at(-1).status, 'error');
  assert.match(statuses.at(-1).message, /frame capture/i);
  if (originalHtmlMediaElement === undefined) delete globalThis.HTMLMediaElement;
});

test('camera track ending during model load rejects startup immediately', async () => {
  const { adapter, worker, track } = createAdapter({ autoReady: false });
  const pendingStart = adapter.start().then(
    () => ({ outcome: 'resolved' }),
    (error) => ({ outcome: 'rejected', error })
  );
  await new Promise((resolve) => setImmediate(resolve));

  track.emit('ended');
  const outcome = await Promise.race([
    pendingStart,
    new Promise((resolve) => setTimeout(() => resolve({ outcome: 'pending' }), 30))
  ]);

  assert.equal(outcome.outcome, 'rejected');
  assert.match(outcome.error.message, /disconnected/i);
  assert.equal(adapter.currentStatus, 'error');
  assert.equal(track.stopped, true);
  assert.equal(worker.terminated, true);
});

test('a worker that stops responding releases camera resources after the inference timeout', async () => {
  const statuses = [];
  const { adapter, video, worker, calls, clock, track } = createAdapter({
    createBitmap: async () => ({ close() {} }),
    onStatus: (status, message) => statuses.push({ status, message })
  });
  await adapter.start();
  video.readyState = 2;
  video.currentTime = 1;
  clock.now = 100;
  calls.frameCallback(0);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(worker.messages.some((message) => message.type === 'frame'), true);

  clock.now = 3000;
  calls.frameCallback(0);

  assert.equal(adapter.currentStatus, 'error');
  assert.equal(track.stopped, true);
  assert.equal(worker.terminated, true);
  assert.match(statuses.at(-1).message, /stopped responding/i);
});

test('hand landmarks renderer draws connections and joints on canvas', () => {
  const operations = [];
  const fakeCtx = {
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
    clearRect(...args) { operations.push(['clearRect', ...args]); },
    beginPath() { operations.push(['beginPath']); },
    moveTo(x, y) { operations.push(['moveTo', x, y]); },
    lineTo(x, y) { operations.push(['lineTo', x, y]); },
    stroke() { operations.push(['stroke']); },
    arc(...args) { operations.push(['arc', ...args]); },
    fill() { operations.push(['fill']); }
  };
  const fakeCanvas = { width: 640, height: 360 };

  renderHandOverlay(fakeCtx, fakeCanvas, [], true);
  assert.equal(operations.length, 1);
  assert.equal(operations[0][0], 'clearRect');

  operations.length = 0;
  const hands = [{ landmarks: makeLandmarks(0.5) }];
  renderHandOverlay(fakeCtx, fakeCanvas, hands, true);
  assert.ok(operations.some((op) => op[0] === 'moveTo'));
  assert.ok(operations.some((op) => op[0] === 'lineTo'));
  assert.ok(operations.some((op) => op[0] === 'arc'));
});

test('latest hands are exposed and cleared on stop or stale expiration', async () => {
  const { adapter, worker, clock, calls } = createAdapter();
  await adapter.start();

  worker.emit('message', {
    data: { type: 'result', timestamp: 10, hands: [makeLandmarks(0.78)] }
  });
  assert.equal(adapter.getLatestHands().length, 1);

  clock.now = 400;
  calls.frameCallback(0);
  assert.equal(adapter.getLatestHands().length, 0);

  adapter.stop();
});

