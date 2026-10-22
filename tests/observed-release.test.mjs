import assert from 'node:assert/strict';import test from 'node:test';import {hasObservedCameraRelease} from '../src/gameplay/observed-release.ts';
const metrics={delegate:'CPU',fps:10,inferenceMs:80,recalibrationRequired:false,playerStates:{p1:'ACCEPTED_IDLE',p2:'ACCEPTED_IDLE'}};
const pose=(x=.5,raised=false)=>{const landmarks=Array.from({length:33},()=>({x,y:.6,visibility:.95,presence:.95}));landmarks[11]={x:x-.08,y:.4};landmarks[12]={x:x+.08,y:.4};landmarks[15]={x:x-.08,y:raised?.2:.6,visibility:.95,presence:.95};landmarks[16]={x:x+.08,y:raised?.2:.6,visibility:.95,presence:.95};return {landmarks};};
const hand=(x=.5)=>{const landmarks=Array.from({length:21},()=>({x:1-x,y:.5}));landmarks[4].x+=.02;landmarks[8].x+=.084;landmarks[5].x+=.04;landmarks[17].x-=.04;return {landmarks};};
const check=(poses,extra={})=>hasObservedCameraRelease({player:'p1',scheme:'P1',solo:true,metrics,poses,...extra});
test('Pose release requires accepted fresh fully visible lowered-arm evidence',()=>{assert.equal(check([pose()]),true);assert.equal(check([pose(.5,true)]),false);assert.equal(check([]),false);for(const state of ['WAITING_FOR_FRAME','LOST','RECALIBRATE','AMBIGUOUS'])assert.equal(check([pose()],{metrics:{...metrics,playerStates:{p1:state,p2:'WAITING'}}}),false);for(const defect of ['visibility','presence','x']){const p=pose();p.landmarks[15][defect]=defect==='x'?NaN:.1;assert.equal(check([p]),false,defect);}assert.equal(check([pose()],{metrics:{...metrics,recalibrationRequired:true,playerStates:{p1:'RECALIBRATE',p2:'WAITING'}}}),false);});
test('Co-op Pose release uses existing accepted slots and rejects extra/ambiguous bodies',()=>{const left=pose(.75),right=pose(.25,true);const data={player:'p1',scheme:'P1',solo:false,metrics,poses:[right,left]};assert.equal(hasObservedCameraRelease(data),true);assert.equal(hasObservedCameraRelease({...data,player:'p2'}),false);assert.equal(hasObservedCameraRelease({...data,poses:[left,left]}),false);assert.equal(hasObservedCameraRelease({...data,poses:[left,right,pose()]}),false);});
test('H0 release needs a fresh assigned open hand with valid pinch geometry',()=>{const zone={player:'p1',currentX:.5,catch:false};const data={player:'p1',scheme:'H0',solo:true,metrics:{...metrics,handMovementZones:[zone]},hands:[hand()]};assert.equal(hasObservedCameraRelease(data),true);assert.equal(hasObservedCameraRelease({...data,hands:[]}),false);assert.equal(hasObservedCameraRelease({...data,metrics:{...data.metrics,handMovementZones:[{...zone,currentX:undefined}]}}),false);for(const index of [4,8,5,17]){const h=hand();h.landmarks[index].x=NaN;assert.equal(hasObservedCameraRelease({...data,hands:[h]}),false);}const h=hand();h.landmarks[17]={...h.landmarks[5]};assert.equal(hasObservedCameraRelease({...data,hands:[h]}),false);});

test('H0 positive release rejects a held pinch even if calibration metadata is neutral',()=>{const h=hand();h.landmarks[8]={...h.landmarks[4]};assert.equal(hasObservedCameraRelease({player:'p1',scheme:'H0',solo:true,metrics:{...metrics,handMovementZones:[{player:'p1',currentX:.5,catch:false}]},hands:[h]}),false);});

test('accepted continuous Co-op P1 can release while P2 is missing despite global recovery flag',()=>{assert.equal(hasObservedCameraRelease({player:'p1',scheme:'P1',solo:false,metrics:{...metrics,recalibrationRequired:true,playerStates:{p1:'ACCEPTED_IDLE',p2:'LOST'}},poses:[pose(.75)]}),true);});

test('per-player Pose release ignores only another invalid torso and retains all ambiguity guards',()=>{
 const left=pose(.75),right=pose(.25),bad=pose(.25);bad.landmarks[11].visibility=.1;
 const data={player:'p1',scheme:'P1',solo:false,metrics:{...metrics,recalibrationRequired:true,playerStates:{p1:'ACCEPTED_IDLE',p2:'LOST'}},poses:[left,bad]};
 assert.equal(hasObservedCameraRelease(data),true);assert.equal(hasObservedCameraRelease({...data,player:'p2'}),false);
 const hidden=pose(.25);hidden.landmarks[15].visibility=hidden.landmarks[16].visibility=.1;
 const pair={...data,metrics,poses:[hidden,left]};assert.equal(hasObservedCameraRelease(pair),true);assert.equal(hasObservedCameraRelease({...pair,player:'p2'}),false);
 assert.equal(check([pose(),bad]),false,'Solo rejects an extra raw invalid person');
 assert.equal(hasObservedCameraRelease({...data,poses:[left,right,bad]}),false,'Co-op rejects a raw third person');
 assert.equal(hasObservedCameraRelease({...data,poses:[left,left]}),false,'two valid same-slot people are ambiguous');
 assert.equal(hasObservedCameraRelease({...data,poses:[left,pose(.5)]}),false,'valid deadband person is ambiguous');
 assert.equal(hasObservedCameraRelease({...data,metrics:{...metrics,playerStates:{p1:'LOST',p2:'ACCEPTED_IDLE'}},poses:[left,right]}),false,'valid-looking candidate cannot override lost association');
});
