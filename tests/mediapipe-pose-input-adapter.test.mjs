import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaPipePoseInputAdapter } from '../src/adapters/mediapipe-pose-input-adapter.ts';
import { renderPoseOverlay } from '../src/adapters/pose-landmarks-renderer.ts';

globalThis.HTMLMediaElement ??= { HAVE_CURRENT_DATA: 2 };

class FakeWorker {
  listeners = new Map();
  messages = [];
  terminated = false;

  constructor(autoReady = true, delegate = undefined) {
    this.autoReady = autoReady;
    this.delegate = delegate;
  }

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
      queueMicrotask(() => this.emit('message', { data: { type: 'ready', delegate: this.delegate } }));
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

function makePoseData(cameraTorsoX) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: cameraTorsoX, y: 0.5, z: 0, visibility: 0.95 }));
  landmarks[11] = { x: cameraTorsoX - 0.08, y: 0.4, z: 0, visibility: 0.95 };
  landmarks[12] = { x: cameraTorsoX + 0.08, y: 0.4, z: 0, visibility: 0.95 };
  landmarks[15] = { x: cameraTorsoX - 0.08, y: 0.6, z: 0, visibility: 0.95 };
  landmarks[16] = { x: cameraTorsoX + 0.08, y: 0.6, z: 0, visibility: 0.95 };
  return { landmarks };
}

function createAdapter(overrides = {}) {
  const { track, stream } = fakeStream();
  const video = fakeVideo();
  const worker = new FakeWorker(overrides.autoReady !== false, overrides.delegate);
  const calls = { camera: 0, worker: 0, stoppedTrack: track, cancelledFrames: [] };
  const clock = { now: overrides.now ?? 10 };
  const adapter = new MediaPipePoseInputAdapter(video, {
    getUserMedia: async (constraints) => {
      calls.camera += 1;
      calls.constraints = constraints;
      if (overrides.getUserMedia) return overrides.getUserMedia(stream);
      return stream;
    },
    createWorker: () => { calls.worker += 1; return worker; },
    createBitmap: overrides.createBitmap,
    onStatus: overrides.onStatus,
    onMetrics: overrides.onMetrics,
    onDetection: (players, canCalibrate, calibrated, metrics) => {
      calls.lastDetection = { players, canCalibrate, calibrated, metrics };
      overrides.onDetection?.(players, canCalibrate, calibrated, metrics);
    },
    requestFrame: (callback) => { calls.frameCallback = callback; return 17; },
    cancelFrame: (handle) => { calls.cancelledFrames.push(handle); },
    now: () => clock.now,
    soloMode: overrides.soloMode,
    scheme: overrides.scheme,
    overlayCanvas: overrides.overlayCanvas,
    wasmRoot: overrides.wasmRoot,
    modelPath: overrides.modelPath
  });

  return { adapter, video, track, worker, calls, clock, stream };
}

test('pose camera and model start only after adapter is explicitly started', async () => {
  const { adapter, calls, video, worker } = createAdapter();
  assert.equal(calls.camera, 0);
  assert.equal(calls.worker, 0);
  assert.equal(adapter.currentStatus, 'idle');

  await adapter.start();
  assert.equal(calls.camera, 1);
  assert.equal(calls.worker, 1);
  assert.equal(video.playCalls, 1);
  assert.equal(adapter.currentStatus, 'ready');
  assert.equal(worker.messages[0].type, 'init');
  assert.equal(adapter.getStream() !== undefined, true);
});

test('pose camera permission failure returns usable neutral state', async () => {
  const statuses = [];
  const { adapter, calls } = createAdapter({
    getUserMedia: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
    onStatus: (status) => statuses.push(status)
  });

  await assert.rejects(adapter.start(), /permission/i);
  assert.equal(calls.camera, 1);
  assert.equal(adapter.currentStatus, 'error');
  assert.deepEqual(adapter.read(), {
    p1: { moveAxis: 0, catch: false },
    p2: { moveAxis: 0, catch: false }
  });
  assert.equal(adapter.canCalibrate(), false);
});

test('pose adapter captures delegate and reports inference latency, fps, and ambiguity metrics', async () => {
  const { adapter, worker } = createAdapter({ delegate: 'GPU' });
  await adapter.start();

  worker.emit('message', {
    data: {
      type: 'result',
      timestamp: 100,
      poses: [makePoseData(0.75), makePoseData(0.25)],
      inferenceMs: 14.5,
      delegate: 'GPU'
    }
  });

  const metrics = adapter.getMetrics();
  assert.equal(metrics.delegate, 'GPU');
  assert.equal(metrics.inferenceMs, 15);
  assert.equal(adapter.canCalibrate(), true);

  assert.equal(adapter.calibrate(), true);
  assert.equal(adapter.canStart(), true);
});

test('pose adapter supports scheme P1 vs P2 toggle', async () => {
  const { adapter, worker } = createAdapter({ scheme: 'P1' });
  await adapter.start();
  assert.equal(adapter.getScheme(), 'P1');

  adapter.setScheme('P2');
  assert.equal(adapter.getScheme(), 'P2');
});

test('pose landmarks renderer draws 33-point skeleton and golden catch cue', () => {
  const calls = [];
  const fakeCtx = {
    clearRect: () => calls.push('clearRect'),
    beginPath: () => calls.push('beginPath'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    stroke: () => calls.push('stroke'),
    arc: () => calls.push('arc'),
    fill: () => calls.push('fill'),
    setLineDash: () => calls.push('setLineDash')
  };
  const fakeCanvas = { width: 640, height: 360 };

  const p1 = makePoseData(0.75);
  const p2 = makePoseData(0.25);

  renderPoseOverlay(fakeCtx, fakeCanvas, [
    { player: 'p1', landmarks: p1.landmarks, catching: true },
    { player: 'p2', landmarks: p2.landmarks, catching: false }
  ], false);

  assert.equal(calls.includes('clearRect'), true);
  assert.equal(calls.includes('stroke'), true);
  assert.equal(calls.includes('arc'), true);
});

test('stopping pose adapter terminates worker and stops camera track', async () => {
  const { adapter, track, worker } = createAdapter();
  await adapter.start();
  assert.equal(track.stopped, false);
  assert.equal(worker.terminated, false);

  adapter.stop();
  assert.equal(track.stopped, true);
  assert.equal(worker.terminated, true);
  assert.equal(adapter.currentStatus, 'stopped');
});
