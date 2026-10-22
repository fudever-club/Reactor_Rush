import * as feedbackPresentation from '../src/gameplay/feedback.ts';
import {PoseInputMapper} from '../src/adapters/pose-input-mapper.ts';
import * as releaseObservation from '../src/gameplay/observed-release.ts';
import * as coreEngine from '../src/gameplay/core.ts';
import * as challengeEngine from '../src/gameplay/challenges.ts';
import * as campaignEngine from '../src/gameplay/campaign.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
// Run the real scene methods; replace only Phaser startup, DOM handles and camera I/O.
const source = stripTypeScriptTypes(await readFile(new URL('../src/main.ts', import.meta.url),'utf8'))
  .replace(/^import[\s\S]*?;\r?\n/gm,'').replace(/export const game = new Phaser.Game[\s\S]*/, 'globalThis.Scene = EnergyCatchScene;');
function element(){return {dataset:{},textContent:'',disabled:false,hidden:false,checked:true,className:'',classList:{toggle(){}},setAttribute(){},focus(){},pause(){},play(){return Promise.resolve();},srcObject:null};}
function setup(){
  const adapters=[];
  class Adapter { constructor(video, options){this.options=options;adapters.push(this);this.currentStatus='loading-model';this.pending=new Promise((res,rej)=>{this.resolve=res;this.reject=rej;});} start(){return this.pending;}stop(){this.stopped=true;this.options.onStatus('stopped');}getMetrics(){return {delegate:'CPU',fps:0,inferenceMs:0};} }
  const context={...feedbackPresentation,...releaseObservation,...coreEngine,...challengeEngine,...campaignEngine,document:{querySelector(){return null},getElementById(){return null}},Phaser:{Scene:class{}},p1Rig:{},p2Rig:{},p1Animations:{},p2Animations:{},createGameState:()=>({phase:'menu',players:{}}),MediaPipeHandInputAdapter:Adapter,MediaPipePoseInputAdapter:Adapter};
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


test('scene requires a current release at round start and after each circuit connection even across stalled frames',()=>{
 const {scene}=setup();let held=true;
 scene.state=coreEngine.startGame(coreEngine.createGameState());
 scene.campaign=campaignEngine.beginCampaignRound(campaignEngine.startCampaign(campaignEngine.createCampaign('solo')));
 scene.challenge=challengeEngine.createChallenge('duo-circuit','solo');
 scene.playerX={p1:173,p2:940};
 scene.inputAdapter={read:()=>({p1:{moveAxis:0,catch:held},p2:{moveAxis:0,catch:false}})};
 scene.movePlayers=()=>{};scene.updateHud=()=>{};scene.announceActiveItems=()=>{};scene.showCatchFeedback=()=>{};scene.rigs={p1:{play(){}},p2:{play(){}}};
 scene.update(0,1250);assert.equal(scene.state.players.p1.score,0,'historical neutral is not an observed round-start release');
 held=false;scene.update(0,50);held=true;
 for(let i=0;i<20;i++)scene.update(0,50);
 assert.equal(scene.state.players.p1.score,100);assert.equal(scene.releaseSeen.p1,false);
 scene.playerX.p1=487;scene.update(0,1250);
 for(let i=0;i<25;i++)scene.update(0,50);
 assert.equal(scene.state.players.p1.score,100,'held action cannot reconnect after catch-up neutral steps');
 held=false;scene.update(0,50);held=true;for(let i=0;i<20;i++)scene.update(0,50);
 assert.equal(scene.state.players.p1.score,200,'an actual release rearms the next socket');
});


const uiSource = stripTypeScriptTypes(await readFile(new URL('../src/gameplay/campaign-ui.ts',import.meta.url),'utf8')).replace(/^import[\s\S]*?;\r?\n/gm,'').replace('export class CampaignUi','class CampaignUi')+'\nglobalThis.CampaignUi=CampaignUi;';
function campaignUiFixture(){
 const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,{...element(),replaceChildren(){},addEventListener(){},append(){}});return nodes.get(id);};
 const context={...feedbackPresentation,...campaignEngine,...challengeEngine,document:{getElementById:get,createElement:()=>({textContent:'',append(){}})}};vm.runInNewContext(uiSource,context);
 return {ui:new context.CampaignUi(()=>{}),get};
}
for(const mode of ['solo','co-op'])test('final '+mode+' feedback shows remaining heat without changing score totals',()=>{
 const {ui,get}=campaignUiFixture();let state=campaignEngine.startCampaign(campaignEngine.createCampaign(mode));
 for(let i=0;i<3;i++){state=campaignEngine.completeCampaignRound(campaignEngine.beginCampaignRound(state),{p1:{score:100,combo:1,bestCombo:1},p2:{score:200,combo:1,bestCombo:1}});if(i<2)state=campaignEngine.continueCampaign(state);}
 ui.show(state,false,false,'P1',challengeEngine.createChallenge('cool-the-core',mode));
 assert.match(get('result-feedback').textContent,/P1.*70.*100/);
 if(mode==='co-op')assert.match(get('result-feedback').textContent,/P2.*70.*100/);else assert.doesNotMatch(get('result-feedback').textContent,/P2/);
 assert.equal(campaignEngine.campaignTotals(state).team,mode==='solo'?300:900);
});
test('Solo intro gives only active player controls',()=>{
 const {ui,get}=campaignUiFixture();ui.show(campaignEngine.startCampaign(campaignEngine.createCampaign('solo')),false,false,'P1',null);
 assert.doesNotMatch(get('intro-controls').textContent,/P2/);assert.match(get('intro-controls').textContent,/Hold S/);
});


function releaseSceneFixture(){
 const {scene}=setup();let command={moveAxis:0,catch:false};let metrics={playerStates:{p1:'ACCEPTED_IDLE',p2:'WAITING'},recalibrationRequired:false};
 scene.state=coreEngine.startGame(coreEngine.createGameState());scene.campaign=campaignEngine.beginCampaignRound(campaignEngine.startCampaign(campaignEngine.createCampaign('solo')));scene.challenge=challengeEngine.createChallenge('duo-circuit','solo');scene.playerX={p1:173,p2:940};
 scene.cameraMode=true;scene.cameraAdapter={currentStatus:'ready',isCalibrated:true,getMetrics:()=>metrics,getLatestPoses:()=>[{landmarks:Array.from({length:33},(_,i)=>({x:i===11?.42:i===12?.58:.5,y:i===11||i===12?.4:.6,visibility:.95,presence:.95}))}],getLatestHands:()=>[{landmarks:Array.from({length:21},(_,i)=>({x:i===4?.52:i===8?.584:i===5?.54:i===17?.46:.5,y:.5}))}]};scene.inputAdapter={read:()=>({p1:command,p2:{moveAxis:0,catch:false}})};
 scene.movePlayers=()=>{};scene.updateHud=()=>{};scene.announceActiveItems=()=>{};scene.showCatchFeedback=()=>{};scene.rigs={p1:{play(){}},p2:{play(){}}};
 return {scene,set:(nextCommand,nextMetrics)=>{command=nextCommand;metrics=nextMetrics;}};
}
for(const playerState of ['WAITING_FOR_FRAME','WAITING','LOST','RECALIBRATE','AMBIGUOUS','DETECTED_NOT_READY','KEYBOARD_FALLBACK'])test('camera safety-neutral '+playerState+' cannot arm a round or next socket',()=>{
 const {scene,set}=releaseSceneFixture();const neutral={moveAxis:0,catch:false};set(neutral,{playerStates:{p1:playerState,p2:'WAITING'},recalibrationRequired:false});scene.update(0,50);assert.equal(scene.releaseSeen.p1,false);
 set(neutral,{playerStates:{p1:'ACCEPTED_IDLE',p2:'WAITING'},recalibrationRequired:false});scene.update(0,50);
 set({moveAxis:0,catch:true},{playerStates:{p1:'CATCH',p2:'WAITING'},recalibrationRequired:false});for(let i=0;i<20;i++)scene.update(0,50);assert.equal(scene.state.players.p1.score,100);
 scene.playerX.p1=487;set(neutral,{playerStates:{p1:playerState,p2:'WAITING'},recalibrationRequired:false});scene.update(0,1250);assert.equal(scene.releaseSeen.p1,false);
 set({moveAxis:0,catch:true},{playerStates:{p1:'CATCH',p2:'WAITING'},recalibrationRequired:false});for(let i=0;i<20;i++)scene.update(0,50);assert.equal(scene.state.players.p1.score,100);
 for(const state of ['ACCEPTED_IDLE','MOVE_LEFT','MOVE_RIGHT']){scene.releaseSeen.p1=false;set(neutral,{playerStates:{p1:state,p2:'WAITING'},recalibrationRequired:false});scene.update(0,50);assert.equal(scene.releaseSeen.p1,true,state+' is a real accepted release');}
});
test('camera recalibration/pending neutral cannot arm a release and fresh H0 zone is required',()=>{
 const {scene,set}=releaseSceneFixture();const neutral={moveAxis:0,catch:false};
 set(neutral,{playerStates:{p1:'RECALIBRATE',p2:'WAITING'},recalibrationRequired:true});scene.update(0,50);assert.equal(scene.releaseSeen.p1,false);
 set(neutral,{playerStates:{p1:'ACCEPTED_IDLE',p2:'WAITING'},recalibrationRequired:false,poseCalibration:{pendingAction:'calibrate'}});scene.update(0,50);assert.equal(scene.releaseSeen.p1,false);
 scene.trackingScheme='H0';for(const zones of [[],[{player:'p1',catch:false}],[{player:'p1',currentX:.5,catch:true}]]){set(neutral,{handMovementZones:zones,recalibrationRequired:false});scene.update(0,50);assert.equal(scene.releaseSeen.p1,false);}
 set(neutral,{handMovementZones:[{player:'p1',currentX:.5,catch:false}],recalibrationRequired:false});scene.update(0,50);assert.equal(scene.releaseSeen.p1,true);
});


test('actual Pose mapper expiry and obscured wrists cannot rearm the next socket without an observed release',()=>{
 const {scene}=releaseSceneFixture();const mapper=new PoseInputMapper({soloMode:true,scheme:'P1'});let now=100,capture=100;
 const pose=raised=>({landmarks:Array.from({length:33},(_,i)=>({x:i===11?.42:i===12?.58:.5,y:i===11||i===12?.4:i===15||i===16?(raised?.2:.6):.5,visibility:.95,presence:.95}))});
 let latest=pose(false);mapper.calibrate([latest],100);
 scene.inputAdapter={read:()=>mapper.read(now)};scene.cameraAdapter={currentStatus:'ready',getMetrics:()=>({playerStates:mapper.getPlayerStates(now),recalibrationRequired:mapper.needsRecalibration()}),getLatestPoses:()=>now-capture<250?[latest]:[]};
 scene.update(0,50);for(let i=1;i<=20;i++){now=capture=100+i*50;latest=pose(true);mapper.update([latest],capture);scene.update(0,50);}assert.equal(scene.state.players.p1.score,100);assert.equal(scene.releaseSeen.p1,false);
 scene.playerX.p1=487;now=1350;scene.update(0,50);assert.equal(mapper.getPlayerStates(now).p1,'WAITING_FOR_FRAME');assert.equal(scene.releaseSeen.p1,false);
 for(let i=0;i<20;i++){capture=1240+i*50;now=capture+130;latest=pose(true);mapper.update([latest],capture);scene.update(0,50);}assert.equal(scene.state.players.p1.score,100);
 now=capture+=150;latest=pose(true);latest.landmarks[15].visibility=latest.landmarks[16].visibility=.1;mapper.update([latest],capture);scene.update(0,50);assert.equal(mapper.getPlayerStates(now).p1,'ACCEPTED_IDLE');assert.equal(scene.releaseSeen.p1,false,'obscured wrists do not prove lowered arms');
 now=capture+=50;latest=pose(false);mapper.update([latest],capture);scene.update(0,50);assert.equal(scene.releaseSeen.p1,true);
 for(let i=0;i<20;i++){now=capture+=50;latest=pose(true);mapper.update([latest],capture);scene.update(0,50);}assert.equal(scene.state.players.p1.score,200);
});


for(const invalidPresent of [false,true])test('actual Co-op Pose mapper preserves P1 release with P2 '+(invalidPresent?'invalid torso still detected':'missing'),()=>{
 const {scene}=releaseSceneFixture();scene.isSoloMode=false;scene.challenge=challengeEngine.createChallenge('duo-circuit','co-op');
 const mapper=new PoseInputMapper({soloMode:false,scheme:'P1'});let now=100;
 const pose=(x,raised=false)=>({landmarks:Array.from({length:33},(_,i)=>({x:i===11?x-.08:i===12?x+.08:x,y:i===11||i===12?.4:i===15||i===16?(raised?.2:.6):.5,visibility:.95,presence:.95}))});
 const onlyP1=p=>{if(!invalidPresent)return [p];const other=pose(.25);other.landmarks[11].visibility=.1;return [p,other];};
 let latest=[pose(.75),pose(.25)];mapper.calibrate(latest,now);scene.inputAdapter={read:()=>mapper.read(now)};scene.cameraAdapter={currentStatus:'ready',getMetrics:()=>({playerStates:mapper.getPlayerStates(now),recalibrationRequired:mapper.needsRecalibration()}),getLatestPoses:()=>latest};scene.update(0,50);
 for(let i=0;i<20;i++){now+=50;latest=[pose(.75,true),pose(.25)];mapper.update(latest,now);scene.update(0,50);}assert.equal(scene.state.players.p1.score,100);assert.equal(scene.releaseSeen.p1,false);
 now+=50;latest=onlyP1(pose(.75));mapper.update(latest,now);assert.equal(mapper.needsRecalibration(),true);assert.equal(mapper.getPlayerStates(now).p2,'LOST');scene.update(0,50);assert.equal(scene.releaseSeen.p1,true);assert.equal(scene.releaseSeen.p2,true,'prior real P2 release stays independent');
 scene.playerX.p1=487;for(let i=0;i<20;i++){now+=50;latest=onlyP1(pose(.75,true));mapper.update(latest,now);scene.update(0,50);}assert.equal(scene.state.players.p1.score,200);
});


test('final Mission Menu stops camera and audio, resets campaign and restores menu focus',()=>{
 const {scene}=setup();assert.equal(typeof scene.handleMissionMenuRequested,'function');
 scene.campaign={mode:'solo',phase:'complete',roundIndex:2,results:[{}]};
 let stopped=0,muted=0,focused=0;scene.cameraAdapter={stop(){stopped++;}};scene.audio={mute(){muted++;}};scene.cameraMode=true;
 scene.ui.startButton.focus=()=>focused++;scene.showPhase=()=>{};scene.resetPositions=()=>{};scene.clearItems=()=>{};
 scene.handleMissionMenuRequested();assert.equal(stopped,1);assert.equal(muted,1);assert.equal(scene.cameraMode,false);assert.equal(scene.cameraAdapter,undefined);assert.equal(scene.inputAdapter,scene.keyboardAdapter);assert.equal(scene.campaign.phase,'menu');assert.equal(scene.campaign.results.length,0);assert.equal(scene.challenge,null);assert.equal(scene.releaseSeen.p1,false);assert.equal(focused,1);
});
test('Mission Menu does not interrupt a playing or intermediate campaign',()=>{for(const phase of ['playing','intro','round-results']){const {scene}=setup();scene.campaign={phase};let stopped=0;scene.handleCameraStopRequested=()=>stopped++;scene.handleMissionMenuRequested();assert.equal(stopped,0);assert.equal(scene.campaign.phase,phase);}});


test('Solo keyboard hint names only P1 bindings in every campaign round',()=>{
 for(let roundIndex=0;roundIndex<3;roundIndex++){
  const {scene}=setup();scene.cameraMode=false;scene.isSoloMode=true;scene.campaign={...campaignEngine.createCampaign('solo'),roundIndex};scene.updateInputModeUi();
  const hint=scene.ui.controlsHint.textContent;assert.match(hint,/A.*D.*MOVE.*HOLD S/);assert.doesNotMatch(hint,/P2|←|→|↓/);assert.match(hint,roundIndex===0?/CATCH/:/ACTIVATE/);
 }
});
test('Co-op keyboard hint explicitly separates both players bindings in every round',()=>{
 for(let roundIndex=0;roundIndex<3;roundIndex++){
  const {scene}=setup();scene.cameraMode=false;scene.isSoloMode=false;scene.campaign={...campaignEngine.createCampaign('co-op'),roundIndex};scene.updateInputModeUi();
  const hint=scene.ui.controlsHint.textContent;assert.match(hint,/P1.*A.*D.*HOLD S.*P2.*←.*→.*HOLD ↓/);assert.match(hint,roundIndex===0?/CATCH/:/ACTIVATE/);
 }
});

test('scene audio follows all campaign rounds and distinguishes final completion',()=>{const {scene}=setup();const scenes=[];scene.audio={setScene:(...args)=>scenes.push(args)};scene.rigs={p2:{root:{setVisible(){}}}};scene.game={canvas:{focus(){},setAttribute(){}}};scene.updateHud=()=>{};for(const [roundIndex,id] of [[0,'energy-catch'],[1,'duo-circuit'],[2,'cool-the-core']]){scene.campaign={...campaignEngine.createCampaign('solo'),phase:'intro',roundIndex};scene.state.phase='menu';scene.showPhase('menu');assert.equal(scenes.at(-1)?.[0],'intro');assert.equal(scenes.at(-1)?.[1],id);}scene.campaign.phase='complete';scene.state.phase='results';scene.showPhase('results');assert.equal(scenes.at(-1)[0],'complete');});

test('tracking sounds consume current adapter readiness only during camera gameplay',()=>{const {scene}=setup();let ready=true;const accepted=[];let resets=0;scene.audio={updateTracking:value=>accepted.push(value),resetTracking:()=>resets++};scene.cameraMode=true;scene.cameraAdapter={canStart:()=>ready,currentStatus:'ready',getMetrics:()=>({})};scene.updateCameraDetection(['p1'],true,true,{delegate:'CPU',fps:10,inferenceMs:20});ready=false;scene.updateCameraDetection([],true,false,{delegate:'CPU',fps:10,inferenceMs:20});assert.deepEqual(accepted,[true,false]);scene.cameraMode=false;scene.updateCameraDetection([],false,false);assert.ok(resets>0);});
