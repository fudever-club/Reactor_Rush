import test from 'node:test';
import assert from 'node:assert/strict';
import {createChallenge,stepChallenge} from '../src/gameplay/challenges.ts';
const feedback=await import('../src/gameplay/feedback.ts').catch(()=>({}));
const players=()=>({p1:{score:0,combo:0,bestCombo:0},p2:{score:0,combo:0,bestCombo:0}});
test('coach prioritizes observed release then movement over holding',()=>{
 const state=createChallenge('duo-circuit','solo');
 assert.equal(typeof feedback.getCoachingText,'function');
 assert.match(feedback.getCoachingText(state,'p1',2,false),/RELEASE/);
 const armed=stepChallenge(state,players(),{p1:{moveAxis:0,catch:false},p2:{moveAxis:0,catch:false}},{p1:0,p2:0},50).state;
 assert.match(feedback.getCoachingText(armed,'p1',2,true),/MOVE TO LEFT/);
 assert.match(feedback.getCoachingText(armed,'p1',0,true),/HOLD 0%/);
});
test('cooling phase boundaries and rounded-up seconds follow unchanged engine clock',()=>{
 assert.equal(typeof feedback.getCoolingPhase,'function');
 assert.deepEqual(feedback.getCoolingPhase(0),{overload:false,seconds:4});
 assert.deepEqual(feedback.getCoolingPhase(3999),{overload:false,seconds:1});
 assert.deepEqual(feedback.getCoolingPhase(4000),{overload:true,seconds:2});
 assert.deepEqual(feedback.getCoolingPhase(5999),{overload:true,seconds:1});
 assert.deepEqual(feedback.getCoolingPhase(6000),{overload:false,seconds:4});
});
test('cooling overload instructs release even outside the target zone',()=>{
 let state=createChallenge('cool-the-core','solo');
 for(let i=0;i<80;i++)state=stepChallenge(state,players(),{p1:{moveAxis:0,catch:false},p2:{moveAxis:0,catch:false}},{p1:0,p2:0},50).state;
 assert.match(feedback.getCoachingText(state,'p1',2,true),/OVERLOAD.*RELEASE.*2s/);
 assert.match(feedback.getCoachingText(state,'p1',2,false),/RELEASE TO ARM/);
});
test('challenge event batches coalesce per player without changing events or points',()=>{
 const events=Object.freeze([Object.freeze({player:'p1',kind:'connect',points:100}),Object.freeze({player:'p1',kind:'circuit',points:200}),Object.freeze({player:'p2',kind:'overload',points:0})]);
 const before=JSON.stringify(events),messages=feedback.presentChallengeEvents(events);
 assert.equal(messages.length,2);assert.equal(messages[0].cue,'circuit');assert.match(messages[0].text,/P1.*CIRCUIT COMPLETE.*\+300/);
 assert.match(messages[1].text,/OVERLOAD.*NO POINTS LOST/);assert.equal(JSON.stringify(events),before);
});
test('catch feedback uses the actual delta including multipliers and floor-zero penalty',()=>{
 assert.match(feedback.presentCatch('p1','energy',250).text,/ENERGY CAUGHT.*\+250/);
 assert.match(feedback.presentCatch('p2','hazard',0).text,/HAZARD.*NO POINTS LOST/);
 assert.equal(feedback.presentCatch('p1','energy',100).cue,'energy');
});
test('accessible playfield copy follows active players and selected scheme',()=>{
 assert.doesNotMatch(feedback.getPlayfieldLabel('Duo Circuit',true,false,'P1'),/P2|Player 2/);
 assert.match(feedback.getPlayfieldLabel('Cool the Core',false,true,'P1'),/both arms/);
 assert.match(feedback.getPlayfieldLabel('Energy Catch',true,true,'H0'),/pinch/i);
 assert.match(feedback.getPlayfieldLabel('Duo Circuit',false,false,'P1'),/P2.*Down/);
});
