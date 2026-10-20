import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
// Run the real scene methods; replace only Phaser startup, DOM handles and camera I/O.
const source = stripTypeScriptTypes(await readFile(new URL('../src/main.ts', import.meta.url),'utf8'))
  .replace(/^import[\s\S]*?;\r?\n/gm,'').replace(/export const game = new Phaser.Game[\s\S]*/, 'globalThis.Scene = EnergyCatchScene;');
function element(){return {textContent:'',disabled:false,hidden:false,checked:true,className:'',classList:{toggle(){}},setAttribute(){},focus(){},pause(){},play(){return Promise.resolve();},srcObject:null};}
function setup(){
  const adapters=[];
  class Adapter { constructor(video, options){this.options=options;adapters.push(this);this.currentStatus='loading-model';this.pending=new Promise((res,rej)=>{this.resolve=res;this.reject=rej;});} start(){return this.pending;}stop(){this.stopped=true;this.options.onStatus('stopped');}getMetrics(){return {delegate:'CPU',fps:0,inferenceMs:0};} }
  const context={document:{querySelector(){return null}},Phaser:{Scene:class{}},p1Rig:{},p2Rig:{},p1Animations:{},p2Animations:{},createGameState:()=>({phase:'menu',players:{}}),MediaPipeHandInputAdapter:Adapter,MediaPipePoseInputAdapter:Adapter};
  vm.runInNewContext(source,context);const scene=new context.Scene();
  scene.ui=new Proxy({}, {get(target,key){return target[key]??=element();}});
  scene.ui.cameraCanvas=null;scene.ui.hudCameraCanvas=null;
  scene.ui.cameraConsent.checked=true;scene.keyboardAdapter={read(){}};
  scene.state.phase='playing';return {scene,adapters};
}

test('UX-02 phase UI preserves the selected H0/P1/P2 gesture guidance',()=>{
  for(const [scheme,cue] of [['H0','PINCH'],['P1','BOTH ARMS'],['P2','ONE ARM']]){
    const {scene}=setup();scene.cameraMode=true;scene.trackingScheme=scheme;
    for(const phase of ['playing','results','restart']){scene.state.phase=phase;scene.updateInputModeUi();assert.match(scene.ui.controlsHint.textContent,new RegExp(cue));}
  }
});

test('SYS-04 stale startup callbacks and rejections cannot replace the current session UI',async()=>{
  const {scene,adapters}=setup();const first=scene.handleCameraEnableRequested();
  const second=scene.handleCameraEnableRequested();
  adapters[1].options.onStatus('ready');const label=scene.ui.cameraEnableButton.textContent;
  adapters[0].options.onStatus('error','obsolete failure');adapters[0].reject(Error('old failure'));await first;
  assert.equal(scene.ui.cameraEnableButton.textContent,label);
  assert.equal(scene.ui.cameraEnableButton.disabled,true);
  assert.doesNotMatch(scene.ui.cameraStatus.textContent,/obsolete/);
  adapters[1].resolve();await second;
});

test('SYS-07 consent withdrawal ignores callbacks from the old camera pipeline',async()=>{
  const {scene,adapters}=setup();const pending=scene.handleCameraEnableRequested();
  scene.ui.cameraConsent.checked=false;scene.handleCameraConsentChanged();
  adapters[0].options.onStatus('ready');adapters[0].reject(Error('cancelled'));await pending;
  assert.equal(scene.cameraMode,false);assert.equal(scene.ui.cameraStartButton.disabled,true);
  assert.equal(scene.ui.cameraEnableButton.disabled,true);
  assert.match(scene.ui.cameraStatus.textContent,/withdrawn/);
});

test('UX-03 accepted player actions and RECALIBRATE recovery are visible separately',()=>{
  const {scene}=setup();scene.cameraMode=true;scene.isSoloMode=false;
  scene.updateCameraDetection(['p1','p2'],true,true,{delegate:'CPU',fps:20,inferenceMs:30,playerStates:{p1:'CATCH',p2:'MOVE_RIGHT'}});
  assert.match(scene.ui.hudCameraCue.textContent,/P1.*CATCH.*P2.*MOVE RIGHT/);
  scene.updateCameraDetection([],true,true,{delegate:'CPU',fps:20,inferenceMs:30,ambiguityReason:'association-lost',recalibrationRequired:true,playerStates:{p1:'RECALIBRATE',p2:'RECALIBRATE'}});
  assert.match(scene.ui.hudCameraCue.textContent,/RECALIBRATE|CALIBRATE/);
  assert.equal(scene.ui.cameraCalibrateButton.disabled,false);
});

test('UX-08 replacing Pose with H0 exposes Hand recenter without stale Pose recovery state',()=>{
 const {scene}=setup();scene.cameraMode=true;
 scene.updateCameraDetection([],true,true,{delegate:'CPU',fps:10,inferenceMs:20,recalibrationRequired:true,playerStates:{p1:'RECALIBRATE',p2:'WAITING'}});
 assert.equal(scene.ui.hudCameraRecalibrate.hidden,false);scene.trackingScheme='H0';
 scene.updateCameraDetection(['p1'],true,true,{delegate:'CPU',fps:10,inferenceMs:20});
 assert.equal(scene.ui.hudCameraRecalibrate.hidden,false);assert.equal(scene.ui.hudCameraRecalibrate.disabled,false);assert.doesNotMatch(scene.ui.hudCameraBadge.textContent,/POSE|RECALIBRATE/);
});

test('setup displays slow frame and missing-player recovery directions',()=>{
 const {scene}=setup();scene.cameraMode=false;
 scene.updateCameraDetection([],false,false,{delegate:'CPU',inferenceMs:290,fps:3,playerStates:{p1:'WAITING',p2:'WAITING'},sampleAgeMs:310,poseCount:1,readinessReason:'SLOW_FRAMES'});
 assert.match(scene.ui.cameraStatus.textContent,/310.*250/);assert.match(scene.ui.cameraHandsStatus.textContent,/1 pose/);
 scene.updateCameraDetection(['p1'],false,false,{delegate:'CPU',inferenceMs:100,fps:8,playerStates:{p1:'DETECTED_NOT_READY',p2:'WAITING'},sampleAgeMs:110,poseCount:1,readinessReason:'NEED_TWO_PLAYERS'});
 assert.match(scene.ui.cameraStatus.textContent,/two players|Solo/i);
});


test('H0 CPU recovery during a round offers live calibration and does not claim ready',()=>{
 const {scene}=setup();scene.cameraMode=true;scene.trackingScheme='H0';scene.isSoloMode=true;
 scene.updateCameraDetection(['p1'],true,false,{delegate:'CPU',fps:8,inferenceMs:110,recalibrationRequired:true});
 assert.equal(scene.ui.hudCameraRecalibrate.hidden,false);assert.equal(scene.ui.hudCameraRecalibrate.disabled,false);
 assert.match(scene.ui.controlsHint.textContent,/CALIBRATE/);assert.match(scene.ui.hudCameraBadge.textContent,/CALIBRATE/);
 assert.doesNotMatch(scene.ui.hudCameraCue.textContent,/READY/);
 scene.lastInput={p1:{moveAxis:0,catch:false},p2:{moveAxis:0,catch:false}};
 scene.updateCameraDetection(['p1'],true,true,{delegate:'CPU',fps:8,inferenceMs:110,recalibrationRequired:false});
 assert.equal(scene.ui.hudCameraRecalibrate.hidden,false);assert.equal(scene.ui.hudCameraRecalibrate.disabled,false);assert.match(scene.ui.hudCameraBadge.textContent,/TRACKING/);
 assert.match(scene.ui.controlsHint.textContent,/PINCH/);assert.doesNotMatch(scene.ui.controlsHint.textContent,/CALIBRATE/);
});


test('H0 calibration remains requestable while waiting for a hand, and disables while a request is pending',()=>{
 const {scene}=setup();scene.trackingScheme='H0';scene.cameraMode=false;scene.cameraAdapter={currentStatus:'ready'};
 scene.updateCameraDetection([],false,false,{delegate:'GPU',fps:7,inferenceMs:120});
 assert.equal(scene.ui.cameraCalibrateButton.disabled,false);assert.equal(scene.ui.cameraStartButton.disabled,true);
 assert.match(scene.ui.cameraStatus.textContent,/hand/i);assert.match(scene.ui.cameraHandsStatus.textContent,/7Hz/);
 scene.updateCameraDetection([],false,false,{delegate:'GPU',fps:7,inferenceMs:120,waitingForHand:true});assert.equal(scene.ui.cameraCalibrateButton.disabled,true);
});

test('starting a replacement camera clears stale enabled calibration and start buttons immediately',()=>{
 const {scene}=setup();scene.trackingScheme='H0';scene.ui.cameraCalibrateButton.disabled=false;scene.ui.cameraStartButton.disabled=false;
 scene.updateCameraStatus('requesting-camera');assert.equal(scene.ui.cameraCalibrateButton.disabled,true);assert.equal(scene.ui.cameraStartButton.disabled,true);
});


test('a calibration completion from an old player mode cannot overwrite the current setup',async()=>{
 const {scene,adapters}=setup();scene.trackingScheme='H0';const startup=scene.handleCameraEnableRequested();adapters[0].resolve();await startup;
 const adapter=adapters[0];adapter.currentStatus='ready';adapter.setSoloMode=()=>{};
 let resolveCalibration;adapter.requestCalibration=()=>new Promise(r=>{resolveCalibration=r});
 const pending=scene.handleCameraCalibrationRequested();scene.updateHud=()=>{};scene.updateInstructionsForScheme=()=>{};scene.setSoloMode(false);scene.setSoloMode(true);
 const currentLabel=scene.ui.cameraStatus.textContent;resolveCalibration(true);await pending;assert.equal(scene.ui.cameraStatus.textContent,currentLabel);
});


test('Hand movement slider reaches the adapter and live recenter remains available',()=>{
 const {scene}=setup();scene.trackingScheme='H0';scene.cameraMode=true;let threshold;
 scene.cameraAdapter={currentStatus:'ready',setMoveThreshold(v){threshold=v},getMetrics(){return {}}};scene.ui.handMoveSlider.value='3';scene.handleHandMovementChanged();
 assert.equal(threshold,.03);assert.match(scene.ui.handMoveValue.textContent,/3%/);
 scene.updateCameraDetection(['p1'],true,true,{delegate:'GPU',fps:7,inferenceMs:100});assert.equal(scene.ui.hudCameraRecalibrate.hidden,false);
});

test('Hand center/two-hand guidance is explicit and tuning is hidden for Pose',()=>{
 const {scene}=setup();scene.trackingScheme='H0';scene.cameraMode=false;scene.cameraAdapter={currentStatus:'ready'};
 scene.updateCameraDetection(['p1'],false,false,{delegate:'GPU',fps:7,inferenceMs:100,handCalibrationIssue:'CENTER_HAND'});assert.match(scene.ui.cameraStatus.textContent,/center.*both directions/i);
 scene.updateCameraDetection(['p1'],false,false,{delegate:'GPU',fps:7,inferenceMs:100,handCalibrationIssue:'ONE_HAND_ONLY'});assert.match(scene.ui.cameraStatus.textContent,/one hand/i);
 scene.trackingScheme='P1';scene.updateInstructionsForScheme();assert.equal(scene.ui.handTuning.hidden,true);
 scene.trackingScheme='H0';scene.updateInstructionsForScheme();assert.equal(scene.ui.handTuning.hidden,false);
});

 test('Pose recovery distinguishes searching, returned preview and accepted controls in setup and live HUD',()=>{
  const {scene}=setup();scene.trackingScheme='P1';scene.isSoloMode=true;scene.cameraMode=false;
  const recovery={delegate:'GPU',fps:10,inferenceMs:60,recalibrationRequired:true,playerStates:{p1:'RECALIBRATE',p2:'WAITING'}};
  scene.updateCameraDetection([],false,true,{...recovery,posePreviewCount:0,readinessReason:'NO_POSE'});
  assert.match(scene.ui.cameraStatus.textContent,/searching/i);
  scene.updateCameraDetection([],true,true,{...recovery,posePreviewCount:1,readinessReason:'READY_TO_CALIBRATE'});
  assert.match(scene.ui.cameraStatus.textContent,/detected again.*CALIBRATE/i);assert.equal(scene.ui.cameraStartButton.disabled,true);
  scene.cameraMode=true;scene.updateCameraDetection([],false,true,{...recovery,posePreviewCount:0,readinessReason:'NO_POSE'});
  assert.match(scene.ui.hudCameraCue.textContent,/SEARCHING/i);assert.equal(scene.ui.hudCameraRecalibrate.disabled,true);
  scene.updateCameraDetection([],true,true,{...recovery,posePreviewCount:1,readinessReason:'READY_TO_CALIBRATE'});
  assert.match(scene.ui.hudCameraCue.textContent,/BODY FOUND.*CALIBRATE/);assert.equal(scene.ui.hudCameraRecalibrate.disabled,false);
  scene.updateCameraDetection(['p1'],true,true,{...recovery,recalibrationRequired:false,posePreviewCount:1,readinessReason:'ACCEPTED',playerStates:{p1:'ACCEPTED_IDLE',p2:'WAITING'}});
  assert.doesNotMatch(scene.ui.hudCameraCue.textContent,/SEARCHING|BODY FOUND/);
 });

test('Pose processing wait keeps calibration and shows WAITING instead of searching or lost',()=>{
 const {scene}=setup();scene.trackingScheme='P1';const metrics={delegate:'GPU',fps:7,inferenceMs:140,recalibrationRequired:false,posePreviewCount:0,readinessReason:'WAITING_FOR_FRAME',playerStates:{p1:'WAITING_FOR_FRAME',p2:'WAITING'}};
 scene.cameraMode=false;scene.updateCameraDetection([],false,true,metrics);assert.match(scene.ui.cameraStatus.textContent,/waiting.*frame/i);assert.doesNotMatch(scene.ui.cameraStatus.textContent,/searching|lost/i);
 scene.cameraMode=true;scene.updateCameraDetection([],false,true,metrics);assert.match(scene.ui.hudCameraBadge.textContent,/WAITING/);assert.match(scene.ui.hudCameraCue.textContent,/WAITING FOR FRAME/);assert.doesNotMatch(scene.ui.controlsHint.textContent,/TRACKING LOST/);
});

test('Pose CALIBRATE stays requestable without a fresh frame and collecting shows cancel and checklist',()=>{
 const {scene}=setup();scene.trackingScheme='P1';scene.cameraMode=false;scene.cameraAdapter={currentStatus:'ready',getMetrics(){return {}}};
 const base={delegate:'GPU',fps:6,inferenceMs:140,playerStates:{p1:'WAITING',p2:'WAITING'},recalibrationRequired:false,poseCalibration:{state:'idle',cameraReady:true,expectedPlayers:1,detectedPlayers:0,playersReady:false,shouldersReady:false,positionReady:false,fresh:false,stableSamples:0,requiredSamples:3}};
 scene.updateCameraDetection([],false,false,base);assert.equal(scene.ui.cameraCalibrateButton.disabled,false);assert.equal(scene.ui.poseCalibrationChecks.hidden,false);assert.match(scene.ui.posePlayerCheck.textContent,/0.*1/);
 scene.updateCameraDetection([],false,false,{...base,poseCalibration:{...base.poseCalibration,state:'collecting',pendingAction:'calibrate',stableSamples:1}});assert.equal(scene.ui.cameraCalibrateButton.disabled,false);assert.match(scene.ui.cameraCalibrateButton.textContent,/CANCEL/);assert.match(scene.ui.poseStableCheck.textContent,/1.*3/);
 scene.cameraMode=true;scene.updateCameraDetection([],false,false,{...base,recalibrationRequired:true,poseCalibration:{...base.poseCalibration,state:'collecting',pendingAction:'calibrate',stableSamples:1}});assert.match(scene.ui.hudCameraCue.textContent,/1.*3/);assert.match(scene.ui.controlsHint.textContent,/CALIBRATING/);scene.cameraMode=false;
 scene.updateCameraDetection([],false,true,{...base,playerStates:{p1:'WAITING_FOR_FRAME',p2:'WAITING'},poseCalibration:{...base.poseCalibration,state:'saved',stableSamples:3}});assert.equal(scene.ui.cameraStartButton.disabled,false,'saved calibration keeps START available during delivery wait');
});
test('Pose calibration completion from an obsolete mode cannot overwrite the current UI',async()=>{
 const {scene,adapters}=setup();scene.trackingScheme='P1';const start=scene.handleCameraEnableRequested();adapters[0].resolve();await start;const adapter=adapters[0];adapter.currentStatus='ready';let resolve;adapter.getMetrics=()=>({});adapter.requestCalibration=()=>new Promise(r=>{resolve=r});adapter.setSoloMode=()=>{};const pending=scene.handleCameraCalibrationRequested();scene.updateHud=()=>{};scene.updateInstructionsForScheme=()=>{};scene.setSoloMode(false);const text=scene.ui.cameraStatus.textContent;resolve(true);await pending;assert.equal(scene.ui.cameraStatus.textContent,text);
});
