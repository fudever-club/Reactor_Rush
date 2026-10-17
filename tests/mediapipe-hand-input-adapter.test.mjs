import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaPipeHandInputAdapter } from '../src/adapters/mediapipe-hand-input-adapter.ts';

class FakeWorker {
  listeners = new Map();
  messages = [];
  terminated = false;

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
    if (message.type === 'init') {
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
    stop() { this.stopped = true; }
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
    play() { this.playCalls += 1; return Promise.resolve(); },
    pause() { this.pauseCalls += 1; }
  };
}

function createAdapter(overrides = {}) {
  const { track, stream } = fakeStream();
  const video = fakeVideo();
  const worker = new FakeWorker();
  const calls = { camera: 0, worker: 0, stoppedTrack: track, cancelledFrames: [] };
  const adapter = new MediaPipeHandInputAdapter(video, {
    getUserMedia: async (constraints) => {
      calls.camera += 1;
      calls.constraints = constraints;
      if (overrides.getUserMedia) return overrides.getUserMedia(stream);
      return stream;
    },
    createWorker: () => { calls.worker += 1; return worker; },
    requestFrame: () => 17,
    cancelFrame: (id) => calls.cancelledFrames.push(id),
    now: () => 10
  });
  return { adapter, calls, video, worker, stream, track };
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
  assert.equal(worker.messages[0].type, 'init');

  adapter.stop();
  assert.equal(calls.stoppedTrack.stopped, true);
  assert.equal(video.srcObject, null);
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
