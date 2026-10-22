import assert from 'node:assert/strict';
import test from 'node:test';
import { createChallenge, stepChallenge, getChallengeView } from '../src/gameplay/challenges.ts';

const blankPlayers = () => ({p1:{score:0,combo:0,bestCombo:0},p2:{score:0,combo:0,bestCombo:0}});
const input = (p1=false,p2=false) => ({p1:{moveAxis:0,catch:p1},p2:{moveAxis:0,catch:p2}});
const zones = (p1=0,p2=0) => ({p1,p2});
function tick(run, ms, frame=input(), position=zones()) {
  let events=[];
  while(ms>0) {
    const dt=Math.min(50,ms);
    const result=stepChallenge(run.state,run.players,frame,position,dt);
    run={state:result.state,players:result.players};
    events.push(...result.events); ms-=dt;
  }
  return {...run,events};
}
function fresh(round='duo-circuit',mode='solo') {
  return {state:createChallenge(round,mode),players:blankPlayers()};
}
const release = run => tick(run,50);
function connect(run, zone) { return tick(release(run),1000,input(true),zones(zone)); }
const near = (actual,want) => assert.ok(Math.abs(actual-want)<1e-8,actual+' != '+want);

test('Energy Catch keeps its existing engine and initial held action cannot connect a socket',()=> {
  assert.equal(createChallenge('energy-catch','solo'),null);
  const held=tick(fresh(),2000,input(true));
  assert.equal(held.players.p1.score,0);
  assert.equal(getChallengeView(held.state,'p1').needsRelease,true);
  assert.equal(getChallengeView(held.state,'p1').progress,0);
});

test('circuit requires exactly one continuous second at the target before awarding one connection',()=> {
  let run=tick(release(fresh()),950,input(true));
  assert.equal(run.players.p1.score,0);
  near(getChallengeView(run.state,'p1').progress,0.95);
  run=tick(run,50,input(true));
  assert.deepEqual(run.players.p1,{score:100,combo:1,bestCombo:1});
  assert.deepEqual(run.events,[{player:'p1',kind:'connect',points:100}]);
  const view=getChallengeView(run.state,'p1');
  assert.equal(view.targetZone,2); assert.equal(view.connected,1);
  assert.equal(view.progress,0); assert.equal(view.needsRelease,true);
});

test('wrong circuit zone and release erase partial progress without erasing scores or combo',()=> {
  let run=tick(release(fresh()),500,input(true));
  run=tick(run,50,input(true),zones(1));
  assert.equal(getChallengeView(run.state,'p1').progress,0);
  run=tick(run,500,input(true));
  run=release(run);
  assert.equal(getChallengeView(run.state,'p1').progress,0);
  run=connect(run,0);
  run=tick(release(run),700,input(true),zones(2));
  run=tick(run,50,input(true),zones(1));
  assert.deepEqual(run.players.p1,{score:100,combo:1,bestCombo:1});
  assert.equal(getChallengeView(run.state,'p1').progress,0);
});

test('a continuously held action cannot connect a second socket even after moving to it',()=> {
  let run=connect(fresh(),0);
  run=tick(run,3000,input(true),zones(2));
  assert.equal(run.players.p1.score,100);
  assert.equal(getChallengeView(run.state,'p1').connected,1);
  run=connect(run,2);
  assert.equal(run.players.p1.score,200);
});

test('three connections award the circuit bonus and rotate the next route deterministically',()=> {
  let run=fresh();
  for (const zone of [0,2,1]) run=connect(run,zone);
  assert.deepEqual(run.players.p1,{score:500,combo:3,bestCombo:3});
  assert.deepEqual(run.events,[{player:'p1',kind:'connect',points:100},{player:'p1',kind:'circuit',points:200}]);
  assert.equal(getChallengeView(run.state,'p1').completed,1);
  assert.equal(getChallengeView(run.state,'p1').connected,0);
  assert.equal(getChallengeView(run.state,'p1').targetZone,2);
  for (const zone of [2,1,0]) run=connect(run,zone);
  assert.deepEqual(run.players.p1,{score:1000,combo:6,bestCombo:6});
  assert.equal(getChallengeView(run.state,'p1').targetZone,1);
});

test('co-op circuit boards accumulate independently with different target and progress',()=> {
  let run=release(fresh('duo-circuit','co-op'));
  run=tick(run,1000,input(true,true),zones(0,2));
  assert.equal(run.players.p1.score,100); assert.equal(run.players.p2.score,0);
  run=tick(run,500,input(true,true),zones(2,0));
  assert.equal(getChallengeView(run.state,'p1').progress,0);
  near(getChallengeView(run.state,'p2').progress,0.5);
  run=tick(run,500,input(true,true),zones(2,0));
  assert.equal(run.players.p2.score,100);
});

test('cooling rises at four units per second without activation and uses the three valve cycle',()=> {
  let run=tick(fresh('cool-the-core'),4000);
  near(getChallengeView(run.state,'p1').heat,86);
  assert.equal(getChallengeView(run.state,'p1').targetZone,1);
  assert.equal(getChallengeView(run.state,'p1').overload,true);
  run=tick(run,2000);
  near(getChallengeView(run.state,'p1').heat,94);
  assert.equal(getChallengeView(run.state,'p1').overload,false);
  assert.equal(getChallengeView(run.state,'p1').targetZone,0);
  run=tick(run,6000);
  assert.equal(getChallengeView(run.state,'p1').targetZone,2);
  run=tick(run,6000);
  assert.equal(getChallengeView(run.state,'p1').targetZone,1);
});

test('cooling ignores held activation until released and grants repeat pulses while safely held',()=> {
  let run=tick(fresh('cool-the-core'),1000,input(true),zones(1));
  assert.equal(run.players.p1.score,0); near(getChallengeView(run.state,'p1').heat,74);
  run=release(run);
  run=tick(run,2000,input(true),zones(1));
  assert.deepEqual(run.players.p1,{score:200,combo:2,bestCombo:2});
  near(getChallengeView(run.state,'p1').heat,46.2);
  assert.equal(getChallengeView(run.state,'p1').completed,2);
  assert.deepEqual(run.events,[{player:'p1',kind:'cool',points:100},{player:'p1',kind:'cool',points:100}]);
});

test('leaving a safe valve or releasing activation resets partial cooling pulse only',()=> {
  let run=tick(release(fresh('cool-the-core')),700,input(true),zones(1));
  run=tick(run,50,input(true),zones(0));
  assert.equal(getChallengeView(run.state,'p1').progress,0);
  run=tick(run,700,input(true),zones(1));
  run=release(run);
  assert.equal(getChallengeView(run.state,'p1').progress,0);
  run=tick(run,1000,input(true),zones(1));
  assert.equal(run.players.p1.score,100);
});

test('safe-to-overload boundary clears a partial pulse and splits heat at exact phase time',()=> {
  let run=tick(fresh('cool-the-core'),3975);
  run=tick(run,50,input(true),zones(1));
  assert.equal(getChallengeView(run.state,'p1').overload,true);
  assert.equal(getChallengeView(run.state,'p1').progress,0);
  near(getChallengeView(run.state,'p1').heat,86.05);
  assert.equal(run.players.p1.combo,0);
  assert.deepEqual(run.events,[{player:'p1',kind:'overload',points:0}]);
});

test('overload adds heat and penalizes once per player per cycle with zero score floor',()=> {
  let run=fresh('cool-the-core');
  run.players.p1={score:120,combo:5,bestCombo:5};
  run=tick(run,4000);
  run=tick(run,500,input(true),zones(1));
  near(getChallengeView(run.state,'p1').heat,96);
  assert.deepEqual(run.players.p1,{score:70,combo:0,bestCombo:5});
  assert.deepEqual(run.events,[{player:'p1',kind:'overload',points:-50}]);
  run=release(run);
  run=tick(run,1450,input(true),zones(1));
  assert.equal(run.players.p1.score,70);
  assert.equal(run.events.length,0);
  run=tick(run,4000);
  run=tick(run,50,input(true),zones(0));
  assert.equal(run.players.p1.score,20);
  assert.equal(run.events.length,1);
  run=tick(run,5950);
  run=tick(run,50,input(true),zones(2));
  assert.equal(run.players.p1.score,0);
  assert.deepEqual(run.events,[{player:'p1',kind:'overload',points:-20}]);
});

test('overload at the wrong valve has no extra heat or penalty',()=> {
  let run=tick(fresh('cool-the-core'),4000);
  run.players={...run.players,p1:{score:100,combo:2,bestCombo:2}};
  run=tick(run,500,input(true),zones(0));
  near(getChallengeView(run.state,'p1').heat,88);
  assert.deepEqual(run.players.p1,{score:100,combo:2,bestCombo:2});
  assert.equal(run.events.length,0);
});

test('heat clamps to zero and one hundred without hidden score penalties',()=> {
  let run=tick(fresh('cool-the-core'),60000);
  assert.equal(getChallengeView(run.state,'p1').heat,100);
  assert.equal(run.players.p1.score,0);
  let cool=release(fresh('cool-the-core'));
  cool=tick(cool,3950,input(true),zones(1));
  cool=tick(cool,2000);
  cool=tick(cool,4000,input(true),zones(0));
  assert.equal(getChallengeView(cool.state,'p1').heat,0);
  assert.equal(cool.players.p1.score,700);
});

test('cooling co-op heat, pulse, and overload penalties are independent',()=> {
  let run=tick(fresh('cool-the-core','co-op'),50);
  run=tick(run,2000,input(true,true),zones(1,0));
  assert.equal(run.players.p1.score,200); assert.equal(run.players.p2.score,0);
  near(getChallengeView(run.state,'p1').heat,42.2);
  near(getChallengeView(run.state,'p2').heat,78.2);
  run=tick(run,1950);
  run=tick(run,50,input(false,true),zones(1,1));
  assert.equal(run.players.p1.score,200);
  assert.equal(run.players.p2.score,0);
  assert.deepEqual(run.events,[{player:'p2',kind:'overload',points:0}]);
});

for (const round of ['duo-circuit','cool-the-core']) {
  test(round+' leaves inactive Solo P2 state and score untouched',()=> {
    const initial=fresh(round); const before=structuredClone(initial.state.players.p2);
    const run=tick(release(initial),5000,input(true,true),zones(0,0));
    assert.deepEqual(run.players.p2,{score:0,combo:0,bestCombo:0});
    assert.deepEqual(run.state.players.p2,before);
  });
  test(round+' consumes zero invalid delta and clamps oversized calls to fifty milliseconds',()=> {
    const run=release(fresh(round));
    for(const delta of [-1,NaN,Infinity,-Infinity,0]) {
      const result=stepChallenge(run.state,run.players,input(true),zones(0),delta);
      assert.equal(result.state,run.state); assert.equal(result.players,run.players);
      assert.deepEqual(result.events,[]);
    }
    assert.deepEqual(stepChallenge(run.state,run.players,input(true),zones(0),10000),
      stepChallenge(run.state,run.players,input(true),zones(0),50));
  });
  test(round+' never mutates caller state, stats, input, or zone objects',()=> {
    const run=release(fresh(round)); const frame=input(true,true), position=zones(1,2);
    const previous=structuredClone({run,frame,position});
    Object.freeze(run.players.p1); Object.freeze(run.players.p2); Object.freeze(run.players);
    Object.freeze(frame.p1); Object.freeze(frame.p2); Object.freeze(frame); Object.freeze(position);
    const next=stepChallenge(run.state,run.players,frame,position,50);
    assert.deepEqual({run,frame,position},previous);
    assert.notEqual(next.state,run.state);
    assert.throws(()=>{next.state.players.p1.needsRelease=true;},TypeError);
  });
}
