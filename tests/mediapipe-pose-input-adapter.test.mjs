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
    createWorker: () => { calls.worker += 1; return overrides.createWorker?.() ?? worker; },
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
  const { adapter, worker } = createAdapter({ delegate: 'GPU', now: 100 });
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

function result(worker, timestamp, poses) { worker.emit('message', { data: { type: 'result', timestamp, poses } }); }
function activePose(x) { const p = makePoseData(x); p.landmarks[15].y = p.landmarks[16].y = 0.2; return p; }

test('SAF-06 adapter expires the capture at 250ms even when inference arrived later', async () => {
  const {adapter,worker,clock} = createAdapter({now:100});
  await adapter.start(); result(worker,100,[makePoseData(0.75),makePoseData(0.25)]);
  assert.equal(adapter.calibrate(),true);
  clock.now=200; result(worker,120,[activePose(0.79),makePoseData(0.25)]);
  assert.equal(adapter.read().p1.catch,true);
  clock.now=369; assert.equal(adapter.read().p1.catch,true);
  clock.now=370; assert.deepEqual(adapter.read(),{p1:{moveAxis:0,catch:false},p2:{moveAxis:0,catch:false}});
  assert.equal(adapter.getMetrics().recalibrationRequired,false);
  assert.equal(adapter.getMetrics().playerStates.p1,'WAITING_FOR_FRAME');
  adapter.stop();
});

test('late or out-of-order worker frames cannot reactivate an accepted Catch', async () => {
  const {adapter,worker,clock} = createAdapter({now:100});
  await adapter.start();result(worker,100,[makePoseData(0.75),makePoseData(0.25)]);adapter.calibrate();
  clock.now=400; result(worker,120,[activePose(0.75),makePoseData(0.25)]);
  assert.equal(adapter.read().p1.catch,false);assert.equal(adapter.canStart(),false);
  clock.now=420;result(worker,110,[activePose(0.75),makePoseData(0.25)]);
  assert.equal(adapter.read().p1.catch,false);adapter.stop();
});

test('accepted Pose telemetry reports per-player action and suppresses ambiguous overlays', async () => {
  const {adapter,worker,clock,calls}=createAdapter({now:100});
  await adapter.start();result(worker,100,[makePoseData(0.75),makePoseData(0.25)]);
  assert.deepEqual(adapter.getMetrics().playerStates,{p1:'DETECTED_NOT_READY',p2:'DETECTED_NOT_READY'});
  adapter.calibrate();clock.now=120;result(worker,120,[activePose(0.75),makePoseData(0.21)]);
  assert.deepEqual(calls.lastDetection.metrics.playerStates,{p1:'CATCH',p2:'MOVE_RIGHT'});
  clock.now=140;result(worker,140,[makePoseData(0.55),makePoseData(0.45)]);
  assert.equal(adapter.getMetrics().recalibrationRequired,true);
  assert.deepEqual(calls.lastDetection.players,[]);
  clock.now=160;result(worker,160,[makePoseData(0.75),makePoseData(0.25)]);
  assert.equal(adapter.canStart(),false);assert.equal(adapter.canCalibrate(),true);
  assert.equal(adapter.getMetrics().readinessReason,'READY_TO_CALIBRATE');
  assert.equal(adapter.calibrate(),true);assert.equal(adapter.canStart(),true);adapter.stop();
});

test('SYS-03 stop during pending Pose permission releases late stream without creating worker', async () => {
  let resolve;const permission=new Promise(r=>resolve=r);
  const {adapter,stream,track,calls}=createAdapter({getUserMedia:()=>permission});
  const pending=adapter.start();adapter.stop();resolve(stream);await pending;
  assert.equal(track.stopped,true);assert.equal(calls.worker,0);assert.equal(adapter.currentStatus,'stopped');
});

test('SYS-05 stalled worker, ended track and repeated bitmap errors release all Pose resources', async () => {
  for(const fault of ['worker','track','bitmap']){
    const {adapter,worker,track,video,calls,clock}=createAdapter({now:100,createBitmap:async()=>{throw Error('capture failed');}});
    await adapter.start();
    if(fault==='track')track.emit('ended');
    else if(fault==='worker')worker.emit('error',{message:'worker stopped'});
    else{video.readyState=2;for(let i=0;i<3;i++){clock.now+=100;video.currentTime+=1;calls.frameCallback();await new Promise(r=>setImmediate(r));}}
    assert.equal(adapter.currentStatus,'error');assert.equal(track.stopped,true);assert.equal(worker.terminated,true);
    assert.equal(adapter.read().p1.catch,false);
  }
});

test('delayed bitmap capture is discarded instead of entering worker as a fresh frame', async () => {
  let resolve;let closed=false;const bitmap=new Promise(r=>resolve=r);
  const {adapter,worker,video,calls,clock}=createAdapter({now:100,createBitmap:()=>bitmap});
  await adapter.start();video.readyState=2;calls.frameCallback();
  clock.now=350;resolve({close(){closed=true;}});await new Promise(r=>setImmediate(r));
  assert.equal(closed,true);assert.equal(worker.messages.filter(m=>m.type==='frame').length,0);adapter.stop();
});

test('SAF-06 HUD expires at the exact 250ms capture boundary',async()=>{
 const {adapter,worker,clock,calls}=createAdapter({now:100});await adapter.start();result(worker,100,[makePoseData(.75),makePoseData(.25)]);adapter.calibrate();clock.now=350;calls.frameCallback();assert.equal(calls.lastDetection.metrics.recalibrationRequired,false);assert.equal(calls.lastDetection.metrics.playerStates.p1,'WAITING_FOR_FRAME');adapter.stop();
});

test('SYS-09 GPU first-frame stall replaces only the worker with CPU and preserves consented stream',async()=>{
 const workers=[new FakeWorker(true,'GPU'),new FakeWorker(true,'CPU')];let next=0;
 const {adapter,video,track,calls,clock}=createAdapter({now:100,createWorker:()=>workers[next++],createBitmap:async()=>({close(){}})});
 await adapter.start();video.readyState=2;calls.frameCallback();await new Promise(r=>setImmediate(r));
 clock.now=2201;calls.frameCallback();await new Promise(r=>setImmediate(r));
 assert.equal(track.stopped,false);assert.equal(workers[0].terminated,true);assert.equal(calls.camera,1);
 assert.equal(workers[1].messages[0].delegate,'CPU');assert.equal(workers[1].messages[0].numPoses,3);
 assert.equal(adapter.currentStatus,'ready');assert.equal(adapter.getMetrics().delegate,'CPU');
 result(workers[0],2201,[activePose(.75),makePoseData(.25)]);assert.equal(adapter.read().p1.catch,false);
 adapter.stop();assert.equal(workers[1].terminated,true);assert.equal(track.stopped,true);
});

test('SYS-09 CPU fallback stall stops instead of restarting camera or retrying indefinitely',async()=>{
 const workers=[new FakeWorker(true,'GPU'),new FakeWorker(true,'CPU')];let next=0;
 const {adapter,video,track,calls,clock}=createAdapter({now:100,createWorker:()=>workers[next++],createBitmap:async()=>({close(){}})});
 await adapter.start();video.readyState=2;calls.frameCallback();await new Promise(r=>setImmediate(r));
 clock.now=2201;calls.frameCallback();await new Promise(r=>setImmediate(r));
 clock.now=2300;video.currentTime=1;calls.frameCallback();await new Promise(r=>setImmediate(r));
 clock.now=4401;calls.frameCallback();assert.equal(adapter.currentStatus,'error');assert.equal(track.stopped,true);assert.equal(next,2);assert.equal(calls.camera,1);
});

test('SYS-03 stopping during CPU recovery cannot revive worker or camera',async()=>{
 const workers=[new FakeWorker(true,'GPU'),new FakeWorker(false,'CPU')];let next=0;
 const {adapter,video,track,calls,clock}=createAdapter({now:100,createWorker:()=>workers[next++],createBitmap:async()=>({close(){}})});
 await adapter.start();video.readyState=2;calls.frameCallback();await new Promise(r=>setImmediate(r));clock.now=2201;calls.frameCallback();await new Promise(r=>setImmediate(r));
 adapter.stop();workers[1].emit('message',{data:{type:'ready',delegate:'CPU'}});await new Promise(r=>setImmediate(r));
 assert.equal(adapter.currentStatus,'stopped');assert.equal(track.stopped,true);assert.equal(workers[1].terminated,true);
});

test('SYS-04 an old bitmap completion cannot clear a newer CPU worker request',async()=>{
 for(const settle of ['resolve','reject']){
  const workers=[new FakeWorker(true,'GPU'),new FakeWorker(true,'CPU')];let next=0;const captures=[];
  const {adapter,video,calls,clock}=createAdapter({now:100,createWorker:()=>workers[next++],createBitmap:()=>new Promise((resolve,reject)=>captures.push({resolve,reject}))});
  await adapter.start();video.readyState=2;calls.frameCallback();clock.now=2201;calls.frameCallback();await new Promise(r=>setImmediate(r));
  clock.now=2300;video.currentTime=1;calls.frameCallback();assert.equal(captures.length,2);
  if(settle==='resolve')captures[0].resolve({close(){}});else captures[0].reject(Error('old capture failed'));
  await new Promise(r=>setImmediate(r));clock.now=2400;video.currentTime=2;calls.frameCallback();
  assert.equal(captures.length,2,'CPU request remains in flight after obsolete '+settle);
  adapter.stop();captures[1].resolve({close(){}});await new Promise(r=>setImmediate(r));
 }
});

test('setup explains stale worker frames without accepting them for calibration',async()=>{
 const {adapter,worker,clock,calls}=createAdapter({now:100});await adapter.start();clock.now=400;result(worker,100,[makePoseData(.75),makePoseData(.25)]);
 assert.equal(adapter.canCalibrate(),false);assert.equal(calls.lastDetection.metrics.readinessReason,'SLOW_FRAMES');
 assert.equal(calls.lastDetection.metrics.sampleAgeMs,300);assert.equal(calls.lastDetection.metrics.poseCount,2);adapter.stop();
});
test('setup distinguishes no pose, insufficient players and valid calibration',async()=>{
 const {adapter,worker,clock}=createAdapter({now:100});await adapter.start();result(worker,100,[]);assert.equal(adapter.getMetrics().readinessReason,'NO_POSE');
 clock.now=120;result(worker,120,[makePoseData(.75)]);assert.equal(adapter.getMetrics().readinessReason,'NEED_TWO_PLAYERS');
 clock.now=140;result(worker,140,[makePoseData(.75),makePoseData(.25)]);assert.equal(adapter.getMetrics().readinessReason,'READY_TO_CALIBRATE');adapter.stop();
});

test('CPU capture reduces pixels while preserving camera aspect ratio; GPU capture stays native',async()=>{
 const original=globalThis.createImageBitmap;const seen=[];globalThis.createImageBitmap=async(source,options)=>{seen.push(options);return {close(){}};};
 try{for(const [delegate,width,height,want] of [['CPU',640,360,{resizeWidth:320,resizeHeight:180,resizeQuality:'low'}],['CPU',640,480,{resizeWidth:320,resizeHeight:240,resizeQuality:'low'}],['GPU',640,360,undefined]]){
  const {adapter,video,calls}=createAdapter({now:100,delegate});await adapter.start();video.readyState=2;video.videoWidth=width;video.videoHeight=height;calls.frameCallback();await new Promise(r=>setImmediate(r));assert.deepEqual(seen.at(-1),want);adapter.stop();
 }}finally{globalThis.createImageBitmap=original;}
});

function recoveryOverlayProbe() {
 const drawing={joints:[],strokes:[]};
 const ctx={clearRect(){drawing.joints=[];drawing.strokes=[];},beginPath(){},moveTo(){},lineTo(){},stroke(){drawing.strokes.push(this.strokeStyle);},arc(x,y,r){drawing.joints.push({x,y,r});},fill(){},setLineDash(){}};
 return {drawing,canvas:{width:640,height:360,getContext(){return ctx;}}};
}
for (const soloMode of [true,false]) for (const scheme of ['P1','P2']) {
 test('Pose '+scheme+' '+(soloMode?'Solo':'Co-op')+' keeps detecting after loss and previews returned people before explicit calibration',async()=>{
  const {drawing,canvas}=recoveryOverlayProbe();
  const {adapter,worker,clock,video,calls,track}=createAdapter({now:100,soloMode,scheme,overlayCanvas:canvas,createBitmap:async()=>({close(){}})});
  try {
   await adapter.start();const poses=soloMode?[activePose(.5)]:[activePose(.75),activePose(.25)];
   result(worker,100,poses);
   assert.ok(drawing.joints.length>0,'detected skeleton visible before calibration');
   assert.ok(drawing.strokes.includes('rgba(255, 204, 102, 0.88)'),'unassigned preview is amber');
   assert.equal(drawing.joints.some(p=>p.r===14),false,'preview cannot signal Catch');
   assert.equal(adapter.getMetrics().posePreviewCount,poses.length);
   assert.equal(adapter.calibrate(),true);assert.equal(adapter.read().p1.catch,true);
   clock.now=150;result(worker,150,[]);assert.equal(adapter.getMetrics().recalibrationRequired,true);assert.equal(drawing.joints.length,0);
   clock.now=200;video.readyState=2;video.currentTime=1;calls.frameCallback();await new Promise(r=>setImmediate(r));
   assert.ok(worker.messages.some(m=>m.type==='frame'),'inference continues while tracking is lost');
   clock.now=220;result(worker,220,poses);
   assert.equal(adapter.getLatestPoses().length,poses.length);assert.equal(worker.terminated,false);assert.equal(track.stopped,false);
   assert.ok(drawing.joints.length>0,'fresh returned people are visible');assert.ok(drawing.strokes.includes('rgba(255, 204, 102, 0.88)'));
   assert.equal(drawing.joints.some(p=>p.r===14),false);assert.equal(adapter.canCalibrate(),true);assert.equal(adapter.canStart(),false);
   assert.deepEqual(adapter.read(),{p1:{moveAxis:0,catch:false},p2:{moveAxis:0,catch:false}},'preview does not silently resume input');
   assert.equal(adapter.calibrate(),true);assert.equal(adapter.canStart(),true);assert.equal(adapter.read().p1.catch,true);
   assert.ok(drawing.strokes.includes('rgba(85, 223, 255, 0.88)'));assert.equal(drawing.strokes.includes('rgba(255, 204, 102, 0.88)'),false);
  } finally {adapter.stop();}
 });
}
test('Pose candidate preview expires at250ms and stays cleared after stop or late frames',async()=>{
 const {drawing,canvas}=recoveryOverlayProbe();const {adapter,worker,clock,calls}=createAdapter({now:100,soloMode:true,overlayCanvas:canvas});
 await adapter.start();result(worker,100,[activePose(.5)]);assert.ok(drawing.joints.length>0);
 clock.now=350;calls.frameCallback();assert.equal(drawing.joints.length,0);assert.equal(adapter.getMetrics().posePreviewCount,0);
 clock.now=400;result(worker,120,[activePose(.5)]);assert.equal(drawing.joints.length,0);assert.equal(adapter.canCalibrate(),false);
 result(worker,400,[activePose(.5)]);assert.ok(drawing.joints.length>0);adapter.stop();
 clock.now=420;result(worker,420,[activePose(.5)]);assert.equal(drawing.joints.length,0);assert.equal(adapter.getMetrics().posePreviewCount,0);
});
test('candidate Pose rendering has no player color or Catch rings and ignores invalid landmarks',()=>{
 const {drawing,canvas}=recoveryOverlayProbe();const p=activePose(.5);p.landmarks[0].x=NaN;p.landmarks[1].presence=0;
 renderPoseOverlay(canvas.getContext(),canvas,[{candidate:true,landmarks:p.landmarks,catching:true}],true);
 assert.ok(drawing.joints.length>0);assert.equal(drawing.joints.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.r===14),false);
 assert.ok(drawing.strokes.includes('rgba(255, 204, 102, 0.88)'));assert.equal(drawing.strokes.includes('rgba(255, 112, 178, 0.88)'),false);
});

for(const soloMode of [true,false])for(const scheme of ['P1','P2'])test('130ms serial Pose processing preserves '+scheme+' '+(soloMode?'Solo':'Co-op')+' observation continuity across neutral waits',async()=>{
 const {adapter,worker,clock,calls}=createAdapter({now:230,soloMode,scheme});
 try{await adapter.start();const poses=soloMode?[activePose(.5)]:[activePose(.75),activePose(.25)];
 result(worker,100,poses);assert.equal(adapter.calibrate(),true);assert.equal(adapter.read().p1.catch,true);
 for(const capture of [240,380,520]){clock.now=capture+110;calls.frameCallback();assert.equal(adapter.read().p1.catch,false,'old sample age250 neutral');assert.equal(adapter.getMetrics().recalibrationRequired,false,'no proven capture gap');
 clock.now=capture+130;result(worker,capture,poses);assert.equal(adapter.read().p1.catch,true);assert.equal(adapter.canStart(),true);}
 clock.now=800;result(worker,660,[]);assert.equal(adapter.getMetrics().recalibrationRequired,true);clock.now=940;result(worker,800,poses);assert.equal(adapter.read().p1.catch,false,'actual body loss still requires explicit calibration');
 assert.equal(adapter.calibrate(),true);assert.equal(adapter.read().p1.catch,true);
 }finally{adapter.stop();}
});

for(const soloMode of [true,false])for(const scheme of ['P1','P2'])test('one Pose calibration click collects3stable fresh samples for '+scheme+' '+(soloMode?'Solo':'Co-op'),async()=>{
 const {adapter,worker,clock}=createAdapter({now:100,soloMode,scheme});await adapter.start();
 try{const pending=adapter.requestCalibration();assert.equal(adapter.getMetrics().poseCalibration.pendingAction,'calibrate');
 const poses=soloMode?[makePoseData(.5)]:[makePoseData(.75),makePoseData(.25)];
 for(const t of [100,250]){clock.now=t;result(worker,t,poses);assert.equal(adapter.canStart(),false);}
 assert.equal(adapter.getMetrics().poseCalibration.stableSamples,2);clock.now=400;result(worker,400,[...poses].reverse());assert.equal(await pending,true);
 assert.equal(adapter.getMetrics().poseCalibration.state,'saved');assert.equal(adapter.canStart(),true);assert.equal(adapter.getMetrics().poseCalibration.stableSamples,3);
 }finally{adapter.stop();}
});
test('Pose checklist names unmet conditions and unstable, missing or stale samples cannot accumulate',async()=>{
 const {adapter,worker,clock}=createAdapter({now:100,soloMode:true});await adapter.start();try{const pending=adapter.requestCalibration();
 assert.equal(adapter.getMetrics().poseCalibration.playersReady,false);result(worker,100,[makePoseData(.5)]);assert.equal(adapter.getMetrics().poseCalibration.stableSamples,1);
 clock.now=150;result(worker,150,[makePoseData(.6)]);assert.equal(adapter.getMetrics().poseCalibration.stableSamples,1,'movement resets stability anchor');
 clock.now=200;result(worker,200,[makePoseData(.6),makePoseData(.3)]);assert.equal(adapter.getMetrics().poseCalibration.playersReady,false);assert.equal(adapter.getMetrics().poseCalibration.stableSamples,0);
 const bad=makePoseData(.5);bad.landmarks[11].visibility=.1;clock.now=250;result(worker,250,[bad]);assert.equal(adapter.getMetrics().poseCalibration.shouldersReady,false);
 clock.now=300;result(worker,300,[makePoseData(.96)]);assert.equal(adapter.getMetrics().poseCalibration.positionReady,false);
 for(const t of [340,390]){clock.now=t;result(worker,t,[makePoseData(.5)]);}assert.equal(adapter.getMetrics().poseCalibration.stableSamples,2);clock.now=800;result(worker,440,[makePoseData(.5)]);assert.equal(adapter.getMetrics().poseCalibration.fresh,false);assert.equal(adapter.getMetrics().poseCalibration.stableSamples,0);
 for(const t of [820,970,1120]){clock.now=t;result(worker,t,[makePoseData(.5)]);}assert.equal(await pending,true);
 }finally{adapter.stop();}
});
test('Pose calibration request cancels on explicit cancel,mode,scheme,error or stop; late bodies cannot save it',async()=>{
 for(const cancel of ['cancel','mode','scheme','error','stop']){const {adapter,worker,clock}=createAdapter({now:100,soloMode:true});await adapter.start();const pending=adapter.requestCalibration();
 if(cancel==='cancel')adapter.cancelPendingAction();else if(cancel==='mode')adapter.setSoloMode(false);else if(cancel==='scheme')adapter.setScheme('P2');else if(cancel==='error')worker.emit('error',{message:'worker failed'});else adapter.stop();
 assert.equal(await pending,false);clock.now=200;result(worker,200,[makePoseData(.5)]);assert.notEqual(adapter.getMetrics().poseCalibration.state,'saved');adapter.stop();}
});
test('Pose calibration times out after8seconds with a retryable state',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {adapter}=createAdapter({soloMode:true});await adapter.start();const pending=adapter.requestCalibration();t.mock.timers.tick(8001);assert.equal(await pending,false);assert.equal(adapter.getMetrics().poseCalibration.state,'timeout');adapter.stop();
});
test('Pose START intent survives a delivery wait but never calibrates after real tracking loss',async()=>{
 const {adapter,worker,clock}=createAdapter({now:100,soloMode:true});await adapter.start();try{result(worker,100,[makePoseData(.5)]);adapter.calibrate();clock.now=350;assert.equal(adapter.canStart(),false);const pending=adapter.requestStartReadiness();clock.now=370;result(worker,240,[makePoseData(.5)]);assert.equal(await pending,true);
 clock.now=400;result(worker,300,[]);assert.equal(await adapter.requestStartReadiness(),false);assert.equal(adapter.getMetrics().recalibrationRequired,true);
 }finally{adapter.stop();}
});

test('Pose checklist clears saved conditions when camera stops',async()=>{
 const {adapter,worker}=createAdapter({now:100,soloMode:true});await adapter.start();result(worker,100,[makePoseData(.5)]);adapter.calibrate();assert.equal(adapter.getMetrics().poseCalibration.state,'saved');adapter.stop();const p=adapter.getMetrics().poseCalibration;assert.equal(p.cameraReady,false);assert.equal(p.playersReady,false);assert.equal(p.shouldersReady,false);assert.equal(p.detectedPlayers,0);assert.equal(p.stableSamples,0);
});
