import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaPipeHandInputAdapter } from '../src/adapters/mediapipe-hand-input-adapter.ts';
import { renderHandOverlay } from '../src/adapters/hand-landmarks-renderer.ts';

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

function createAdapter(overrides = {}) {
  const { track, stream } = fakeStream();
  const video = fakeVideo();
  const worker = new FakeWorker(overrides.autoReady !== false, overrides.delegate);
  const calls = { camera: 0, worker: 0, stoppedTrack: track, cancelledFrames: [] };
  const clock = { now: overrides.now ?? 10 };
  const adapter = new MediaPipeHandInputAdapter(video, {
    getUserMedia: async (constraints) => {
      calls.camera += 1;
      calls.constraints = constraints;
      if (overrides.getUserMedia) return overrides.getUserMedia(stream);
      return stream;
    },
    createWorker: () => { calls.worker += 1; return overrides.createWorker?.() ?? worker; },
    createBitmap: overrides.createBitmap,
    onStatus: overrides.onStatus,
    onMetrics: overrides.onMetrics,
    onDetection: (players, canCalibrate, calibrated, metrics) => {
      calls.lastDetection = { players, canCalibrate, calibrated, metrics };
      overrides.onDetection?.(players, canCalibrate, calibrated, metrics);
    },
    requestFrame: (callback) => { calls.frameCallback = callback; return 17; },
    cancelFrame: (id) => calls.cancelledFrames.push(id),
    now: () => clock.now,
    wasmRoot: overrides.wasmRoot,
    modelPath: overrides.modelPath
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

test('adapter initializes worker with local wasm root by default and supports custom path', async () => {
  const { adapter, worker } = createAdapter();
  await adapter.start();
  assert.equal(worker.messages[0].type, 'init');
  assert.equal(worker.messages[0].wasmRoot, '/mediapipe/wasm');
  assert.equal(worker.messages[0].modelPath, '/mediapipe/hand_landmarker.task');
  adapter.stop();

  const custom = createAdapter({ wasmRoot: '/custom/wasm', modelPath: '/custom/model.task' });
  await custom.adapter.start();
  assert.equal(custom.worker.messages[0].wasmRoot, '/custom/wasm');
  assert.equal(custom.worker.messages[0].modelPath, '/custom/model.task');
  custom.adapter.stop();
});

test('adapter captures delegate and reports inference latency, fps, and metrics callback', async () => {
  const receivedMetrics = [];
  const { adapter, worker, clock } = createAdapter({
    delegate: 'GPU',
    onMetrics: (m) => receivedMetrics.push(m)
  });

  await adapter.start();
  assert.equal(adapter.getMetrics().delegate, 'GPU');

  clock.now = 1000;
  worker.emit('message', {
    data: {
      type: 'result',
      timestamp: 1000,
      hands: [makeLandmarks(0.78), makeLandmarks(0.22)],
      inferenceMs: 32,
      delegate: 'GPU'
    }
  });

  clock.now = 1085;
  worker.emit('message', {
    data: {
      type: 'result',
      timestamp: 1085,
      hands: [makeLandmarks(0.78), makeLandmarks(0.22)],
      inferenceMs: 30,
      delegate: 'GPU'
    }
  });

  const metrics = adapter.getMetrics();
  assert.equal(metrics.delegate, 'GPU');
  assert.ok(metrics.inferenceMs >= 28 && metrics.inferenceMs <= 33);
  assert.ok(metrics.fps >= 10 && metrics.fps <= 14);
  assert.ok(receivedMetrics.length >= 2);

  adapter.stop();
});

test('adapter metrics reflect ambiguity reason when hands conflict', async () => {
  let latestMetrics;
  const { adapter, worker } = createAdapter({
    onDetection: (_players, _canCalibrate, _calibrated, metrics) => {
      latestMetrics = metrics;
    }
  });
  await adapter.start();

  worker.emit('message', {
    data: {
      type: 'result',
      timestamp: 50,
      hands: [makeLandmarks(0.78), makeLandmarks(0.22)],
      inferenceMs: 31,
      delegate: 'GPU'
    }
  });
  assert.equal(adapter.calibrate(), true);

  // Hands too close (< 0.08 distance)
  worker.emit('message', {
    data: {
      type: 'result',
      timestamp: 100,
      hands: [makeLandmarks(0.50), makeLandmarks(0.52)],
      inferenceMs: 31,
      delegate: 'GPU'
    }
  });

  assert.ok(latestMetrics);
  assert.equal(latestMetrics.ambiguityReason, 'too-close');

  adapter.stop();
});



const flushHandTasks = () => new Promise(resolve => setImmediate(resolve));

test('Hand retries a stalled GPU once on CPU using the consented stream and clears calibration', async () => {
  const gpu = new FakeWorker(true, 'GPU'); const cpu = new FakeWorker(true, 'CPU');
  const workers = [gpu, cpu];
  const {adapter, video, calls, clock, track} = createAdapter({createWorker:()=>workers.shift(), createBitmap:async()=>({close(){}})});
  await adapter.start();
  gpu.emit('message',{data:{type:'result',timestamp:10,hands:[makeLandmarks(.78),makeLandmarks(.22)]}});
  assert.equal(adapter.calibrate(),true);
  video.readyState=2; video.currentTime=1; clock.now=100; calls.frameCallback(0); await flushHandTasks();
  clock.now=2201; calls.frameCallback(0); await flushHandTasks();
  assert.equal(gpu.terminated,true); assert.equal(calls.worker,2); assert.equal(calls.camera,1); assert.equal(track.stopped,false);
  assert.equal(cpu.messages[0].delegate,'CPU'); assert.equal(adapter.currentStatus,'ready'); assert.equal(adapter.isCalibrated,false);
  assert.equal(adapter.getMetrics().recalibrationRequired,true);
  cpu.emit('message',{data:{type:'result',timestamp:2201,hands:[makeLandmarks(.78),makeLandmarks(.22)]}});
  assert.equal(adapter.calibrate(),true);assert.equal(adapter.getMetrics().recalibrationRequired,false);assert.equal(adapter.canStart(),true);
  assert.deepEqual(adapter.read(),{p1:{moveAxis:0,catch:false},p2:{moveAxis:0,catch:false}});
  video.currentTime=2; clock.now=2300; calls.frameCallback(0); await flushHandTasks();
  assert.equal(cpu.messages.at(-1).type,'frame');
  clock.now=4401; calls.frameCallback(0);
  assert.equal(adapter.currentStatus,'error'); assert.equal(calls.worker,2); assert.equal(track.stopped,true); assert.equal(cpu.terminated,true);
});

test('stopping Hand while CPU recovery loads prevents camera resurrection', async () => {
  const gpu=new FakeWorker(true,'GPU'); const cpu=new FakeWorker(false); const workers=[gpu,cpu];
  const {adapter,video,calls,clock,track}=createAdapter({createWorker:()=>workers.shift(),createBitmap:async()=>({close(){}})});
  await adapter.start(); video.readyState=2; video.currentTime=1; clock.now=100; calls.frameCallback(0); await flushHandTasks();
  clock.now=2201; calls.frameCallback(0); assert.equal(adapter.currentStatus,'loading-model');
  adapter.stop(); cpu.emit('message',{data:{type:'ready',delegate:'CPU'}}); await flushHandTasks();
  assert.equal(adapter.currentStatus,'stopped'); assert.equal(track.stopped,true); assert.equal(cpu.terminated,true);
});

test('a late Hand bitmap from the terminated GPU cannot enter the replacement CPU worker', async () => {
  const gpu=new FakeWorker(true,'GPU'); const cpu=new FakeWorker(true,'CPU'); const workers=[gpu,cpu];
  let resolveOld; let captures=0; let closed=false;
  const {adapter,video,calls,clock}=createAdapter({createWorker:()=>workers.shift(),createBitmap:()=>++captures===1?new Promise(r=>{resolveOld=r}):Promise.resolve({close(){}})});
  await adapter.start(); video.readyState=2; video.currentTime=1; clock.now=100; calls.frameCallback(0); await flushHandTasks();
  clock.now=2201; calls.frameCallback(0); await flushHandTasks();
  resolveOld({close(){closed=true}}); await flushHandTasks();
  assert.equal(closed,true); assert.equal(cpu.messages.filter(m=>m.type==='frame').length,0);
  video.currentTime=2; clock.now=2300; calls.frameCallback(0); await flushHandTasks();
  assert.equal(cpu.messages.filter(m=>m.type==='frame').length,1); adapter.stop();
});


test('Hand calibration request waits for the next valid hand instead of losing the click',async()=>{
 const {adapter,worker}=createAdapter();await adapter.start();let done=false;
 const pending=adapter.requestCalibration().then(v=>{done=true;return v});
 assert.equal(adapter.getMetrics().waitingForHand,true);assert.equal(done,false);
 worker.emit('message',{data:{type:'result',timestamp:10,hands:[]}});await flushHandTasks();assert.equal(done,false);
 worker.emit('message',{data:{type:'result',timestamp:10,hands:[makeLandmarks(.78),makeLandmarks(.22)]}});
 assert.equal(await pending,true);assert.equal(adapter.isCalibrated,true);assert.equal(adapter.getMetrics().waitingForHand,false);adapter.stop();
});

test('Hand start request waits for fresh detection after a calibrated sample expires',async()=>{
 const {adapter,worker,clock}=createAdapter();await adapter.start();
 worker.emit('message',{data:{type:'result',timestamp:10,hands:[makeLandmarks(.78),makeLandmarks(.22)]}});adapter.calibrate();
 clock.now=500;assert.equal(adapter.canStart(),false);const pending=adapter.requestStartReadiness();
 worker.emit('message',{data:{type:'result',timestamp:500,hands:[makeLandmarks(.78),makeLandmarks(.22)]}});
 assert.equal(await pending,true);assert.equal(adapter.canStart(),true);adapter.stop();
});

test('Hand pending calibration is cancelled on stop and cannot calibrate a stopped session',async()=>{
 const {adapter,worker}=createAdapter();await adapter.start();const pending=adapter.requestCalibration();adapter.stop();
 assert.equal(await pending,false);worker.emit('message',{data:{type:'result',timestamp:10,hands:[makeLandmarks(.78),makeLandmarks(.22)]}});
 assert.equal(adapter.isCalibrated,false);assert.equal(adapter.getMetrics().waitingForHand,false);
});

test('Hand pending calibration times out without bypassing missing-hand checks',async(t)=>{
 const {adapter}=createAdapter();await adapter.start();t.mock.timers.enable({apis:['setTimeout']});
 const pending=adapter.requestCalibration();t.mock.timers.tick(3001);assert.equal(await pending,false);assert.equal(adapter.isCalibrated,false);assert.equal(adapter.getMetrics().waitingForHand,false);adapter.stop();
});


test('CPU Hand capture sends a detached pixel copy, preserving aspect ratio',async()=>{
 const oldBitmap=globalThis.createImageBitmap;const oldDocument=globalThis.document;
 const pixels={width:320,height:180,data:new Uint8ClampedArray([7,8,9,255])};let received;let size;let drawSize;
 const canvas={width:0,height:0,getContext(type,options){assert.equal(type,'2d');assert.equal(options.willReadFrequently,true);return {drawImage(source,x,y,w,h){drawSize=[w,h]},getImageData(x,y,w,h){size=[w,h];return pixels}}}};
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return canvas}};
 globalThis.createImageBitmap=async source=>{received=source;return {close(){}}};
 const {adapter,video,calls,clock}=createAdapter({delegate:'CPU'});
 try{await adapter.start();video.videoWidth=640;video.videoHeight=360;video.readyState=2;video.currentTime=1;clock.now=100;calls.frameCallback(0);await flushHandTasks();
 assert.equal(received,pixels);assert.deepEqual(size,[320,180]);assert.deepEqual(drawSize,[320,180]);}finally{adapter.stop();globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
});


test('changing player count cancels an old calibration request',async()=>{
 const {adapter,worker}=createAdapter();await adapter.start();const pending=adapter.requestCalibration();adapter.setSoloMode(true);
 worker.emit('message',{data:{type:'result',timestamp:10,hands:[makeLandmarks(.5)]}});assert.equal(await pending,false);assert.equal(adapter.isCalibrated,false);adapter.stop();
});


test('Hand movement tuning cancels queued calibration, exposes zones and requires recentering',async()=>{
 const {adapter,worker}=createAdapter();adapter.setSoloMode(true);await adapter.start();const pending=adapter.requestCalibration();
 adapter.setMoveThreshold(.03);assert.equal(await pending,false);assert.equal(adapter.isCalibrated,false);assert.equal(adapter.getMetrics().moveThreshold,.03);
 worker.emit('message',{data:{type:'result',timestamp:10,hands:[makeLandmarks(.5)]}});adapter.calibrate();
 assert.equal(adapter.getMetrics().handMovementZones.length,1);assert.equal(adapter.getMetrics().handMovementZones[0].neutralX,.5);
 worker.emit('message',{data:{type:'result',timestamp:10,hands:[makeLandmarks(.45)]}});assert.equal(adapter.read().p1.moveAxis,1);
 adapter.setMoveThreshold(.15);assert.equal(adapter.isCalibrated,false);assert.equal(adapter.getMetrics().recalibrationRequired,true);assert.equal(adapter.read().p1.moveAxis,0);adapter.stop();
});

test('Hand movement overlay labels are readable after the existing mirrored canvas transform',()=>{
 const calls=[];const ctx=new Proxy({}, {get(t,k){if(k in t)return t[k];return (...args)=>calls.push([k,...args])},set(t,k,v){t[k]=v;return true}});
 renderHandOverlay(ctx,{width:640,height:360},[],true,[{player:'p1',neutralX:.5,currentX:.6,slotLeft:0,slotRight:1,leftTrigger:.42,rightTrigger:.58,stopLeft:.456,stopRight:.544,moveAxis:1,catch:false}]);
 assert.deepEqual(calls.filter(c=>c[0]==='fillText').slice(0,3).map(c=>c[1]),['LEFT','STOP','RIGHT']);
 const xs=calls.filter(c=>c[0]==='translate').map(c=>c[1]);assert.ok(xs[0]>xs[2]);assert.ok(calls.some(c=>c[0]==='scale'&&c[1]===-1));
 assert.ok(calls.some(c=>c[0]==='moveTo'&&Math.abs(c[1]-320)<1e-6));
});


test('a calibrated Hand may start while moving near the edge; only recentering requires middle space',async()=>{
 const {adapter,worker}=createAdapter();adapter.setSoloMode(true);await adapter.start();worker.emit('message',{data:{type:'result',timestamp:10,hands:[makeLandmarks(.5)]}});adapter.calibrate();
 worker.emit('message',{data:{type:'result',timestamp:10,hands:[makeLandmarks(.08)]}});assert.equal(adapter.canCalibrate(),false);assert.equal(adapter.canStart(),true);assert.equal(adapter.read().p1.moveAxis,1);adapter.stop();
});


test('repeated start is idempotent and leaves only one owned camera session', async () => {
  const {adapter,calls}=createAdapter();
  try {
    await adapter.start(); await adapter.start();
    assert.equal(calls.camera,1); assert.equal(calls.worker,1);
  } finally { adapter.stop(); }
});

test('stop permits immediate restart while an obsolete permission request is pending', async () => {
  const requests=[]; const workers=[];
  const {adapter}=createAdapter({getUserMedia:()=>new Promise(resolve=>requests.push(resolve)),
    createWorker:()=>{const worker=new FakeWorker();workers.push(worker);return worker;}});
  const old=fakeStream(); const current=fakeStream();
  const first=adapter.start();adapter.stop();const second=adapter.start();
  try {
    assert.equal(requests.length,2);
    requests[1](current.stream);await second;
    requests[0](old.stream);await first;
    assert.equal(old.track.stopped,true);assert.equal(current.track.stopped,false);
    assert.equal(adapter.currentStatus,'ready');assert.equal(workers.length,1);
  } finally { for(const resolve of requests)resolve(old.stream);adapter.stop();await Promise.allSettled([first,second]); }
});

test('cancelled CPU recovery cannot fail or stop an immediately restarted camera session', async () => {
  const workers=[new FakeWorker(true,'GPU'),new FakeWorker(false,'CPU'),new FakeWorker(true,'GPU')];
  const {adapter,video,calls,clock}=createAdapter({createWorker:()=>workers.shift(),createBitmap:async()=>({close(){}})});
  await adapter.start();video.readyState=2;video.currentTime=1;clock.now=100;calls.frameCallback();
  await Promise.resolve();await Promise.resolve();await Promise.resolve();
  clock.now=2201;video.currentTime=2;calls.frameCallback();
  assert.equal(adapter.currentStatus,'loading-model');
  adapter.stop();await adapter.start();
  try {assert.equal(adapter.currentStatus,'ready');assert.equal(calls.camera,2);assert.equal(calls.worker,3);}
  finally {adapter.stop();}
});


test('obsolete video playback rejection cannot fail a restarted session', async () => {
  const {adapter,video}=createAdapter();
  let rejectPlayback;video.play=()=>new Promise((_,reject)=>{rejectPlayback=reject;});
  const first=adapter.start();await new Promise(resolve=>setImmediate(resolve));
  adapter.stop();video.play=async()=>{};await adapter.start();
  try{rejectPlayback(Error('obsolete playback'));await first;assert.equal(adapter.currentStatus,'ready');}
  finally{adapter.stop();}
});

test('start during CPU recovery does not allocate another stream or replace the fallback worker',async()=>{
  const gpu=new FakeWorker(true,'GPU');const cpu=new FakeWorker(false,'CPU');let count=0;
  const {adapter,video,calls,clock}=createAdapter({createWorker:()=>count++===0?gpu:cpu,createBitmap:async()=>({close(){}})});
  await adapter.start();video.readyState=2;video.currentTime=1;clock.now=100;calls.frameCallback();
  await new Promise(resolve=>setImmediate(resolve));clock.now=2201;video.currentTime=2;calls.frameCallback();
  const repeated=adapter.start();await new Promise(resolve=>setImmediate(resolve));
  try{assert.equal(calls.camera,1);assert.equal(calls.worker,2);cpu.emit('message',{data:{type:'ready',delegate:'CPU'}});await repeated;await new Promise(resolve=>setImmediate(resolve));assert.equal(adapter.currentStatus,'ready');}
  finally{adapter.stop();await Promise.allSettled([repeated]);}
});
