import assert from 'node:assert/strict';
import test from 'node:test';
import { HandInputMapper } from '../src/adapters/hand-input-mapper.ts';

function makeHand(wristX, { pinched = false, palmWidth = 0.08, pinchRatio = pinched ? 0.12 : 0.8 } = {}) {
  const landmarks = Array.from({ length: 21 }, () => ({ x: wristX, y: 0.5, z: 0 }));
  landmarks[0] = { x: wristX, y: 0.5, z: 0 };
  landmarks[4] = { x: wristX + 0.02, y: 0.5, z: 0 };
  landmarks[5] = { x: wristX + palmWidth / 2, y: 0.5, z: 0 };
  landmarks[8] = { x: wristX + 0.02 + palmWidth * pinchRatio, y: 0.5, z: 0 };
  landmarks[9] = { x: wristX, y: 0.46, z: 0 };
  landmarks[17] = { x: wristX - palmWidth / 2, y: 0.5, z: 0 };
  return { landmarks };
}

test('camera calibration requires exactly one valid hand in each player half', () => {
  const mapper = new HandInputMapper();
  assert.equal(mapper.calibrate([makeHand(0.78)], 0), false);
  assert.equal(mapper.calibrate([makeHand(0.78), makeHand(0.84)], 0), false);
  assert.equal(mapper.calibrate([makeHand(0.78), makeHand(0.22)], 0), true);
});

test('mirrored hand movement controls P1 and P2 independently with a deadzone', () => {
  const mapper = new HandInputMapper();
  mapper.calibrate([makeHand(0.78), makeHand(0.22)], 0);

  const neutral = mapper.update([makeHand(0.78), makeHand(0.22)], 20);
  assert.equal(neutral.p1.moveAxis, 0);
  assert.equal(neutral.p2.moveAxis, 0);

  const insideDeadzone = mapper.update([makeHand(0.80), makeHand(0.20)], 30);
  assert.equal(insideDeadzone.p1.moveAxis, 0);
  assert.equal(insideDeadzone.p2.moveAxis, 0);

  const moved = mapper.update([makeHand(0.08), makeHand(0.92)], 40);
  assert.equal(moved.p1.moveAxis, -1);
  assert.equal(moved.p2.moveAxis, 1);
});

test('catch uses a normalized pinch and remains steady through the release threshold', () => {
  const mapper = new HandInputMapper();
  mapper.calibrate([makeHand(0.78), makeHand(0.22)], 0);

  const pinched = mapper.update([makeHand(0.78, { pinched: true }), makeHand(0.22)], 20);
  assert.equal(pinched.p1.catch, true);
  assert.equal(pinched.p2.catch, false);

  const releaseBand = mapper.update([makeHand(0.78, { pinchRatio: 0.36 }), makeHand(0.22)], 40);
  assert.equal(releaseBand.p1.catch, true);

  const released = mapper.update([makeHand(0.78, { pinchRatio: 0.8 }), makeHand(0.22)], 60);
  assert.equal(released.p1.catch, false);
});

test('missing one hand neutralizes only that player and always releases catch', () => {
  const mapper = new HandInputMapper();
  mapper.calibrate([makeHand(0.78), makeHand(0.22)], 0);
  mapper.update([makeHand(0.78, { pinched: true }), makeHand(0.08)], 20);

  const oneHand = mapper.update([makeHand(0.08)], 40);
  assert.deepEqual(oneHand.p1, { moveAxis: 0, catch: false });
  assert.equal(oneHand.p2.moveAxis, 1);
});

test('stale tracking and malformed landmarks return neutral inputs', () => {
  const mapper = new HandInputMapper({ staleAfterMs: 200 });
  mapper.calibrate([makeHand(0.78), makeHand(0.22)], 0);
  mapper.update([makeHand(0.92, { pinched: true }), makeHand(0.08)], 20);
  assert.deepEqual(mapper.read(221), {
    p1: { moveAxis: 0, catch: false },
    p2: { moveAxis: 0, catch: false }
  });

  const invalid = makeHand(Number.NaN);
  assert.equal(mapper.calibrate([invalid, makeHand(0.22)], 300), false);
});

test('solo mode allows calibration and control with a single hand', () => {
  const mapper = new HandInputMapper({ soloMode: true });
  assert.equal(mapper.canCalibrate([makeHand(0.5)]), true);
  assert.equal(mapper.calibrate([makeHand(0.5)], 0), true);

  const movedLeft = mapper.update([makeHand(0.65)], 20);
  assert.equal(movedLeft.p1.moveAxis, -1);
  assert.equal(movedLeft.p2.moveAxis, 0);

  const pinched = mapper.update([makeHand(0.5, { pinched: true })], 30);
  assert.equal(pinched.p1.catch, true);
  assert.equal(pinched.p2.catch, false);
});

test('never silently reassigns players when hands cross boundary', () => {
  const mapper = new HandInputMapper();
  // Calibrate P1 at screenX = 0.22 (wristX 0.78) and P2 at screenX = 0.78 (wristX 0.22)
  mapper.calibrate([makeHand(0.78), makeHand(0.22)], 0);

  // P1 stays at 0.22; P2 moves towards center line: wristX 0.45 -> screenX 0.55
  mapper.update([makeHand(0.78), makeHand(0.45)], 10);

  // P1 withdraws hand; P2 continues crossing into P1 territory: wristX 0.58 -> screenX 0.42
  // This single hand belongs to P2 crossing boundary. It must NEVER silently control P1!
  const crossedP2 = mapper.update([makeHand(0.58)], 20);
  assert.equal(crossedP2.p1.moveAxis, 0, 'P1 must not be controlled by crossed hand');
  assert.equal(crossedP2.p1.catch, false);
  assert.equal(crossedP2.p2.moveAxis, 0, 'Crossed hand must not control P2');
  assert.equal(crossedP2.p2.catch, false);
});

test('ambiguous detections safely neutralize affected players', () => {
  const mapper = new HandInputMapper();
  mapper.calibrate([makeHand(0.78), makeHand(0.22)], 0);

  // Two hands on P1 side (wristX 0.78 and 0.85 -> screenX 0.22 and 0.15) and none on P2 side
  const twoHandsOnP1 = mapper.update([makeHand(0.78), makeHand(0.85)], 20);
  assert.deepEqual(twoHandsOnP1.p1, { moveAxis: 0, catch: false }, 'Ambiguous multiple hands neutralize P1');
  assert.deepEqual(twoHandsOnP1.p2, { moveAxis: 0, catch: false });

  // Hands crossing too close together at the center boundary (wristX 0.51 and 0.49 -> screenX 0.49 and 0.51)
  const handsAtCenter = mapper.update([makeHand(0.51), makeHand(0.49)], 30);
  assert.deepEqual(handsAtCenter.p1, { moveAxis: 0, catch: false }, 'Center boundary collision neutralizes P1');
  assert.deepEqual(handsAtCenter.p2, { moveAxis: 0, catch: false }, 'Center boundary collision neutralizes P2');
});

test('calibration recovery preserves player neutral point after temporary tracking loss', () => {
  const mapper = new HandInputMapper();
  mapper.calibrate([makeHand(0.78), makeHand(0.22)], 0);

  // P1 active and moving right (screenX 0.35 vs neutral 0.22, delta +0.13 > 0.1 threshold -> moveAxis = 1)
  const movedP1 = mapper.update([makeHand(0.65), makeHand(0.22)], 20);
  assert.equal(movedP1.p1.moveAxis, 1);

  // P1 temporarily disappears (e.g. occlusion)
  const lostP1 = mapper.update([makeHand(0.22)], 30);
  assert.equal(lostP1.p1.moveAxis, 0);
  assert.equal(lostP1.p1.catch, false);
  assert.equal(lostP1.p2.moveAxis, 0);

  // P1 recovers on their calibrated side at same position (screenX 0.35)
  const recoveredP1 = mapper.update([makeHand(0.65), makeHand(0.22)], 40);
  assert.equal(recoveredP1.p1.moveAxis, 1, 'P1 resumes move axis 1 from original calibrated baseline');
  assert.equal(recoveredP1.p2.moveAxis, 0);
});



test('rejects an edge calibration whose movement thresholds cannot fit the player slot',()=>{
 const m=new HandInputMapper({soloMode:true});for(const x of [.02,.08,.92,.98])assert.equal(m.calibrate([makeHand(1-x)],0),false);
 assert.equal(m.getCalibrationIssue([makeHand(.08)]),'CENTER_HAND');assert.equal(m.calibrate([makeHand(.5)],0),true);
 assert.equal(m.update([makeHand(.65)],20).p1.moveAxis,-1);assert.equal(m.update([makeHand(.35)],40).p1.moveAxis,1);
});

test('Solo requires one control hand and neutralizes two detected hands',()=>{
 const m=new HandInputMapper({soloMode:true});assert.equal(m.canCalibrate([makeHand(.3),makeHand(.7)]),false);
 assert.equal(m.getCalibrationIssue([makeHand(.3),makeHand(.7)]),'ONE_HAND_ONLY');m.calibrate([makeHand(.5)],0);
 m.update([makeHand(.65)],10);assert.deepEqual(m.update([makeHand(.65),makeHand(.35)],20).p1,{moveAxis:0,catch:false});
});

test('movement distance tuning is symmetric and resets the old calibration',()=>{
 const m=new HandInputMapper({soloMode:true});m.setMoveThreshold(.03);m.calibrate([makeHand(.5)],0);
 assert.equal(m.update([makeHand(.45)],20).p1.moveAxis,1);assert.equal(m.update([makeHand(.55)],40).p1.moveAxis,-1);
 m.setMoveThreshold(.15);assert.deepEqual(m.read(50).p1,{moveAxis:0,catch:false});m.calibrate([makeHand(.5)],60);
 assert.equal(m.update([makeHand(.45)],80).p1.moveAxis,0);assert.equal(m.update([makeHand(.55)],100).p1.moveAxis,0);
 assert.throws(()=>m.setMoveThreshold(NaN),RangeError);assert.throws(()=>m.setMoveThreshold(.2),RangeError);
});

test('movement zones use mirrored screen coordinates and accepted action, and hide stale cursor',()=>{
 const m=new HandInputMapper({soloMode:true,moveEnterThreshold:.08});m.calibrate([makeHand(.5)],0);m.update([makeHand(.4)],20);
 const z=m.getMovementZones(20)[0];assert.equal(z.player,'p1');assert.equal(z.neutralX,.5);assert.equal(z.currentX,.6);assert.equal(z.moveAxis,1);
 assert.ok(Math.abs(z.leftTrigger-.42)<1e-8);assert.ok(Math.abs(z.rightTrigger-.58)<1e-8);
 assert.equal(m.getMovementZones(300)[0].currentX,undefined);assert.equal(m.getMovementZones(300)[0].moveAxis,0);
});

test('entry boundaries and the inner stop box work equally in both directions',()=>{
 const m=new HandInputMapper({soloMode:true,moveEnterThreshold:.08,moveReleaseThreshold:.044});m.calibrate([makeHand(.5)],0);
 assert.equal(m.update([makeHand(.42)],10).p1.moveAxis,1);assert.equal(m.update([makeHand(.45)],20).p1.moveAxis,1);
 assert.equal(m.update([makeHand(.46)],30).p1.moveAxis,0);assert.equal(m.update([makeHand(.58)],40).p1.moveAxis,-1);
 assert.equal(m.update([makeHand(.55)],50).p1.moveAxis,-1);assert.equal(m.update([makeHand(.54)],60).p1.moveAxis,0);
});
