import assert from 'node:assert/strict';
import test from 'node:test';
import { PoseInputMapper, extractPoseMetrics } from '../src/adapters/pose-input-mapper.ts';

function makePose(cameraTorsoX, {
  shoulderWidth = 0.16,
  leftArmRaised = false,
  rightArmRaised = false,
  visibility = 0.95
} = {}) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: cameraTorsoX, y: 0.5, z: 0, visibility }));

  const leftShoulderX = cameraTorsoX - shoulderWidth / 2;
  const rightShoulderX = cameraTorsoX + shoulderWidth / 2;
  landmarks[11] = { x: leftShoulderX, y: 0.4, z: 0, visibility };
  landmarks[12] = { x: rightShoulderX, y: 0.4, z: 0, visibility };

  const raiseOffset = shoulderWidth * 0.35;
  landmarks[15] = { x: leftShoulderX, y: leftArmRaised ? 0.4 - raiseOffset : 0.6, z: 0, visibility };
  landmarks[16] = { x: rightShoulderX, y: rightArmRaised ? 0.4 - raiseOffset : 0.6, z: 0, visibility };

  landmarks[23] = { x: leftShoulderX, y: 0.7, z: 0, visibility };
  landmarks[24] = { x: rightShoulderX, y: 0.7, z: 0, visibility };

  return { landmarks };
}

test('extractPoseMetrics accurately calculates screenTorsoX, shoulderWidth and arms raised', () => {
  const pose = makePose(0.70, { shoulderWidth: 0.20, leftArmRaised: true, rightArmRaised: false });
  const metrics = extractPoseMetrics(pose);
  assert.equal(metrics.isValid, true);
  assert.equal(Math.round(metrics.screenTorsoX * 100) / 100, 0.30);
  assert.equal(Math.round(metrics.shoulderWidth * 100) / 100, 0.20);
  assert.equal(metrics.leftArmRaised, true);
  assert.equal(metrics.rightArmRaised, false);
});

test('pose calibration requires valid separated poses in each half (co-op) or single pose (solo)', () => {
  const mapper = new PoseInputMapper();
  // cameraTorsoX 0.75 -> screenTorsoX 0.25 (P1)
  // cameraTorsoX 0.25 -> screenTorsoX 0.75 (P2)
  assert.equal(mapper.canCalibrate([makePose(0.75)]), false);
  assert.equal(mapper.canCalibrate([makePose(0.75), makePose(0.80)]), false); // both on left
  assert.equal(mapper.canCalibrate([makePose(0.75), makePose(0.25)]), true); // valid P1 and P2
  assert.equal(mapper.calibrate([makePose(0.75), makePose(0.25)], 0), true);

  // Solo mode
  const soloMapper = new PoseInputMapper({ soloMode: true });
  assert.equal(soloMapper.canCalibrate([makePose(0.75)]), true);
  assert.equal(soloMapper.canCalibrate([makePose(0.75), makePose(0.25)]), false);
  assert.equal(soloMapper.calibrate([makePose(0.75)], 0), true);
});

test('scale-invariant torso lean controls P1 and P2 independently with hysteresis', () => {
  const mapper = new PoseInputMapper();
  // Calibrate: P1 neutral screenTorsoX = 0.25 (camera 0.75), shoulderWidth = 0.16
  //            P2 neutral screenTorsoX = 0.75 (camera 0.25), shoulderWidth = 0.16
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);

  // Neutral position -> moveAxis 0
  const neutral = mapper.update([makePose(0.75), makePose(0.25)], 20);
  assert.equal(neutral.p1.moveAxis, 0);
  assert.equal(neutral.p2.moveAxis, 0);

  // Small lean within hysteresis deadzone (0.25 - 0.02 = 0.23 -> dx/width = -0.02/0.16 = -0.125, < 0.22)
  const smallLean = mapper.update([makePose(0.77), makePose(0.25)], 30);
  assert.equal(smallLean.p1.moveAxis, 0);

  // Large lean left (screenTorsoX = 0.25 - 0.04 = 0.21 -> dx/width = -0.04/0.16 = -0.25, <= -0.22)
  // cameraTorsoX = 1 - 0.21 = 0.79
  const leanLeft = mapper.update([makePose(0.79), makePose(0.25)], 40);
  assert.equal(leanLeft.p1.moveAxis, -1);
  assert.equal(leanLeft.p2.moveAxis, 0);

  // Partial return within release threshold (dx/width = -0.025/0.16 = -0.156, still <= -0.12)
  // cameraTorsoX = 1 - 0.225 = 0.775
  const partialReturn = mapper.update([makePose(0.775), makePose(0.25)], 50);
  assert.equal(partialReturn.p1.moveAxis, -1); // remains moving left

  // Full return past release threshold (dx/width = -0.01/0.16 = -0.0625, > -0.12)
  // cameraTorsoX = 1 - 0.24 = 0.76
  const released = mapper.update([makePose(0.76), makePose(0.25)], 60);
  assert.equal(released.p1.moveAxis, 0);

  // Lean right for P2 (P2 neutral screenTorsoX = 0.75, lean right to 0.79 -> camera 0.21)
  const p2Right = mapper.update([makePose(0.75), makePose(0.21)], 70);
  assert.equal(p2Right.p1.moveAxis, 0);
  assert.equal(p2Right.p2.moveAxis, 1);
});

test('Candidate P1 requires BOTH arms raised for catch', () => {
  const mapper = new PoseInputMapper({ scheme: 'P1' });
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);

  // One arm raised -> catch is FALSE in P1 scheme
  const oneArm = mapper.update([
    makePose(0.75, { leftArmRaised: true, rightArmRaised: false }),
    makePose(0.25)
  ], 20);
  assert.equal(oneArm.p1.catch, false);

  // Both arms raised -> catch is TRUE in P1 scheme
  const bothArms = mapper.update([
    makePose(0.75, { leftArmRaised: true, rightArmRaised: true }),
    makePose(0.25)
  ], 30);
  assert.equal(bothArms.p1.catch, true);
  assert.equal(bothArms.p2.catch, false);
});

test('Candidate P2 requires EITHER arm raised for catch', () => {
  const mapper = new PoseInputMapper({ scheme: 'P2' });
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);

  // One arm raised -> catch is TRUE in P2 scheme
  const oneArm = mapper.update([
    makePose(0.75, { leftArmRaised: true, rightArmRaised: false }),
    makePose(0.25)
  ], 20);
  assert.equal(oneArm.p1.catch, true);

  // Other arm raised -> catch is also TRUE
  const otherArm = mapper.update([
    makePose(0.75, { leftArmRaised: false, rightArmRaised: true }),
    makePose(0.25)
  ], 30);
  assert.equal(otherArm.p1.catch, true);

  // No arms raised -> catch is FALSE
  const noArms = mapper.update([
    makePose(0.75, { leftArmRaised: false, rightArmRaised: false }),
    makePose(0.25)
  ], 40);
  assert.equal(noArms.p1.catch, false);
});

test('never silently reassigns players when bodies cross boundary', () => {
  const mapper = new PoseInputMapper();
  // P1 calibrated at screenTorsoX 0.25 (camera 0.75)
  // P2 calibrated at screenTorsoX 0.75 (camera 0.25)
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);

  // Crossed over: both players ended up on right side or crossed halves with diff >= 0.15
  // camera 0.35 (screen 0.65) and camera 0.15 (screen 0.85), diff 0.20 >= 0.15
  const crossed = mapper.update([makePose(0.35), makePose(0.15)], 20);
  assert.equal(mapper.getLastAmbiguityReason(), 'hands-crossed');
  assert.deepEqual(crossed.p1, { moveAxis: 0, catch: false });
  assert.deepEqual(crossed.p2, { moveAxis: 0, catch: false });
});

test('bodies too close (< 0.15) triggers too-close ambiguity and neutralizes inputs', () => {
  const mapper = new PoseInputMapper();
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);

  // Two bodies with screenTorsoX 0.45 (camera 0.55) and 0.55 (camera 0.45) -> diff 0.10 < 0.15
  const tooClose = mapper.update([makePose(0.55), makePose(0.45)], 20);
  assert.equal(mapper.getLastAmbiguityReason(), 'too-close');
  assert.deepEqual(tooClose.p1, { moveAxis: 0, catch: false });
  assert.deepEqual(tooClose.p2, { moveAxis: 0, catch: false });
});

test('missing one player neutralizes only that player while other player stays active', () => {
  const mapper = new PoseInputMapper();
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);

  // Only P2 in frame (camera 0.20 -> screen 0.80, lean right)
  const onePlayer = mapper.update([makePose(0.20)], 20);
  assert.deepEqual(onePlayer.p1, { moveAxis: 0, catch: false });
  assert.equal(onePlayer.p2.moveAxis, 1);
});

test('stale tracking and malformed landmarks return neutral inputs', () => {
  const mapper = new PoseInputMapper({ staleAfterMs: 250 });
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);

  // Update active at t=50
  mapper.update([makePose(0.79), makePose(0.21)], 50);

  // Read at t=350 (> 250ms elapsed) -> neutral
  const staleFrame = mapper.read(350);
  assert.deepEqual(staleFrame.p1, { moveAxis: 0, catch: false });
  assert.deepEqual(staleFrame.p2, { moveAxis: 0, catch: false });
});

test('explicit calibration restores control after temporary tracking drop', () => {
  const mapper = new PoseInputMapper();
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);

  // Tracking lost
  mapper.update([], 100);
  assert.deepEqual(mapper.read(100), {
    p1: { moveAxis: 0, catch: false },
    p2: { moveAxis: 0, catch: false }
  });

  // Tracking recovers near calibrated neutral points
  const recovered = mapper.update([makePose(0.75), makePose(0.25)], 200);
  assert.equal(recovered.p1.moveAxis, 0);
  assert.equal(recovered.p2.moveAxis, 0);

  assert.equal(mapper.calibrate([makePose(0.75), makePose(0.25)], 210), true);

  // Explicit calibration restores movement from a new trusted slot assignment
  const moveAfterRecovery = mapper.update([makePose(0.80), makePose(0.25)], 250);
  assert.equal(moveAfterRecovery.p1.moveAxis, -1);
});

const neutralFrame = { p1: { moveAxis: 0, catch: false }, p2: { moveAxis: 0, catch: false } };
const raised = { leftArmRaised: true, rightArmRaised: true };

// SAF-06 catches a stale production default, including equality at the cutoff.
test('SAF-06 default releases movement and Catch at 250ms from last observation', () => {
  for (const elapsed of [249, 250, 251, 299, 301]) {
    const mapper = new PoseInputMapper();
    mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
    mapper.update([makePose(0.79, raised), makePose(0.25)], 20);
    if (elapsed === 249) assert.equal(mapper.read(20 + elapsed).p1.catch, true);
    else assert.deepEqual(mapper.read(20 + elapsed), neutralFrame, 'elapsed=' + elapsed);
  }
});

test('SAF-01 shuffled detector order preserves two independent accepted tracks for 100 frames', () => {
  const mapper = new PoseInputMapper();
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
  for (let i = 1; i <= 100; i++) {
    const poses = [makePose(0.79, raised), makePose(0.21)];
    const frame = mapper.update(i % 2 ? poses.reverse() : poses, i * 20);
    assert.deepEqual(frame, { p1: { moveAxis: -1, catch: true }, p2: { moveAxis: 1, catch: false } });
  }
});

test('SAF-02 crossing remains neutral after people separate until deliberate calibration', () => {
  const mapper = new PoseInputMapper();
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
  for (const [i, xs] of [[0,[0.70,0.30]], [1,[0.65,0.35]], [2,[0.55,0.45]]]) {
    mapper.update(xs.map(x => makePose(x, raised)), (i + 1) * 20);
  }
  assert.deepEqual(mapper.update([makePose(0.25), makePose(0.75, raised)], 100), neutralFrame);
  assert.equal(mapper.needsRecalibration(), true);
  assert.deepEqual(mapper.getAssociatedPoses([makePose(0.25), makePose(0.75)], 100), []);
  assert.equal(mapper.calibrate([makePose(0.75), makePose(0.25)], 110), true);
  assert.equal(mapper.update([makePose(0.75, raised), makePose(0.25)], 120).p1.catch, true);
});

test('SAF-03 missed middle frames cannot renew expired anonymous association', () => {
  const mapper = new PoseInputMapper();
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
  assert.deepEqual(mapper.update([makePose(0.75, raised), makePose(0.25)], 251), neutralFrame);
});

test('SAF-04 missing slot stays neutral while continuous player can act, re-entry latches', () => {
  const mapper = new PoseInputMapper();
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
  assert.equal(mapper.update([makePose(0.21, raised)], 20).p2.catch, true);
  assert.deepEqual(mapper.read(20).p1, neutralFrame.p1);
  assert.deepEqual(mapper.update([makePose(0.75, raised), makePose(0.21)], 40), neutralFrame);
});

test('SAF-05 both dropouts release Catch and require explicit recalibration on re-entry', () => {
  const mapper = new PoseInputMapper();
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
  mapper.update([makePose(0.75, raised), makePose(0.25)], 20);
  assert.deepEqual(mapper.update([], 40), neutralFrame);
  assert.deepEqual(mapper.update([makePose(0.75, raised), makePose(0.25)], 60), neutralFrame);
});

test('SAF-09 extra detected person invalidates calibration, including an invalid third skeleton', () => {
  const mapper = new PoseInputMapper();
  const poses = [makePose(0.75), makePose(0.25), makePose(0.5, { visibility: 0.1 })];
  assert.equal(mapper.canCalibrate(poses), false);
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
  mapper.update(poses, 20);
  assert.deepEqual(mapper.update([makePose(0.75, raised), makePose(0.25)], 40), neutralFrame);
});

test('SAF-10 confidence NaN, absent shoulders and low presence never accept input', () => {
  for (const mutate of [p => {p.landmarks[11].visibility = NaN;}, p => {p.landmarks[12] = undefined;}, p => {p.landmarks[11].presence = 0.1;}, p => {p.landmarks[11].presence = NaN;}, p => {p.landmarks[11].x = NaN;}]) {
    const mapper = new PoseInputMapper();
    const bad = makePose(0.75, raised); mutate(bad);
    assert.equal(mapper.canCalibrate([bad, makePose(0.25)]), false);
    mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
    assert.deepEqual(mapper.update([bad, makePose(0.25)], 20).p1, neutralFrame.p1);
  }
});

test('SAF-11 sudden torso jump and implausible width change cannot silently replace a slot', () => {
  for (const replacement of [makePose(0.58, raised), makePose(0.75, { ...raised, shoulderWidth: 0.05 })]) {
    const mapper = new PoseInputMapper();
    mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
    assert.deepEqual(mapper.update([replacement, makePose(0.25)], 20), neutralFrame);
  }
});

test('GS-05 obscured wrist releases prior Catch without losing a valid torso', () => {
  const mapper = new PoseInputMapper();
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
  mapper.update([makePose(0.75, raised), makePose(0.25)], 20);
  const pose = makePose(0.75, raised); pose.landmarks[15].presence = 0.1;
  assert.equal(mapper.update([pose, makePose(0.25)], 40).p1.catch, false);
});

test('accepted overlay and per-player states agree with current movement and Catch', () => {
  const mapper = new PoseInputMapper();
  const poses = [makePose(0.79, raised), makePose(0.21)];
  mapper.calibrate([makePose(0.75), makePose(0.25)], 0);
  mapper.update(poses, 20);
  assert.deepEqual(mapper.getPlayerStates(20), { p1: 'CATCH', p2: 'MOVE_RIGHT' });
  assert.deepEqual(mapper.getAssociatedPoses(poses,20).map(p=>[p.player,p.catching]), [['p1',true],['p2',false]]);
  assert.deepEqual(mapper.getAssociatedPoses(poses,270), []);
});

test('processing wait neutralizes stale input without destroying continuous capture association',()=>{
 const m=new PoseInputMapper();m.calibrate([makePose(.75),makePose(.25)],100);m.update([makePose(.75,raised),makePose(.25)],100);
 assert.deepEqual(m.read(350),neutralFrame);assert.equal(m.needsRecalibration(),false);
 assert.deepEqual(m.getPlayerStates(350),{p1:'WAITING_FOR_FRAME',p2:'WAITING_FOR_FRAME'});assert.deepEqual(m.getAssociatedPoses([makePose(.75),makePose(.25)],350),[]);
 m.update([makePose(.75,raised),makePose(.25)],240);assert.equal(m.read(370).p1.catch,true);
 assert.deepEqual(m.read(490),neutralFrame);assert.equal(m.needsRecalibration(),false);
 m.update([makePose(.75,raised),makePose(.25)],380);assert.equal(m.read(510).p1.catch,true);
});
test('a true capture gap still requires calibration even after a neutral processing wait',()=>{
 const m=new PoseInputMapper();m.calibrate([makePose(.75),makePose(.25)],100);m.update([makePose(.75,raised),makePose(.25)],100);
 assert.deepEqual(m.read(350),neutralFrame);assert.equal(m.needsRecalibration(),false);
 assert.deepEqual(m.update([makePose(.75,raised),makePose(.25)],350),neutralFrame);assert.equal(m.needsRecalibration(),true);
 assert.deepEqual(m.update([makePose(.75,raised),makePose(.25)],400),neutralFrame);
});

test('processing wait clears held movement hysteresis before the next fresh observation',()=>{
 const m=new PoseInputMapper();m.calibrate([makePose(.75),makePose(.25)],100);m.update([makePose(.70),makePose(.25)],100);assert.equal(m.read(230).p1.moveAxis,1);
 assert.deepEqual(m.read(350),neutralFrame);m.update([makePose(.725),makePose(.25)],240);assert.equal(m.read(370).p1.moveAxis,0);
});
