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
