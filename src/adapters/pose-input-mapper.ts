import type { InputFrame, PlayerId, PlayerInput } from '../gameplay/core';
import type { NormalizedPoseLandmark } from '../workers/pose-landmarker.worker.ts';

export interface DetectedPose {
  landmarks: readonly NormalizedPoseLandmark[];
}

export type PoseGestureScheme = 'P1' | 'P2'; // P1: Upper-body torso lean + both arms raised; P2: Upper-body torso lean + one arm raised

export interface PoseInputMapperOptions {
  scheme?: PoseGestureScheme;
  soloMode?: boolean;
  leanEnterRatio?: number;
  leanReleaseRatio?: number;
  minShoulderWidth?: number;
  staleAfterMs?: number;
  centerDeadBand?: number;
}

const NEUTRAL_PLAYER: PlayerInput = { moveAxis: 0, catch: false };
const NEUTRAL_FRAME: InputFrame = {
  p1: { ...NEUTRAL_PLAYER },
  p2: { ...NEUTRAL_PLAYER }
};

export const POSE_TRACKING_STALE_MS = 300;
export const MIN_SHOULDER_WIDTH = 0.04;

export type PoseAmbiguityReason = 'hands-crossed' | 'too-close' | 'multiple-hands' | 'in-deadband' | 'too-far';

interface PlayerControl {
  neutralTorsoX: number;
  neutralShoulderWidth: number;
  moveAxis: -1 | 0 | 1;
  catch: boolean;
}

interface PoseMetrics {
  screenTorsoX: number;
  shoulderWidth: number;
  leftArmRaised: boolean;
  rightArmRaised: boolean;
  isValid: boolean;
}

const VISIBILITY_MIN = 0.35;

function isPointValid(p: NormalizedPoseLandmark | undefined): p is NormalizedPoseLandmark {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  if (typeof p.visibility === 'number' && p.visibility < VISIBILITY_MIN) return false;
  return true;
}

export function extractPoseMetrics(pose: DetectedPose, minShoulderWidth = MIN_SHOULDER_WIDTH): PoseMetrics {
  const lm = pose.landmarks;
  if (!lm || lm.length < 25) {
    return { screenTorsoX: 0, shoulderWidth: 0, leftArmRaised: false, rightArmRaised: false, isValid: false };
  }

  const leftShoulder = lm[11];
  const rightShoulder = lm[12];
  if (!isPointValid(leftShoulder) || !isPointValid(rightShoulder)) {
    return { screenTorsoX: 0, shoulderWidth: 0, leftArmRaised: false, rightArmRaised: false, isValid: false };
  }

  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  if (shoulderWidth < minShoulderWidth) {
    return { screenTorsoX: 0, shoulderWidth, leftArmRaised: false, rightArmRaised: false, isValid: false };
  }

  const cameraTorsoX = (leftShoulder.x + rightShoulder.x) / 2;
  const screenTorsoX = 1 - cameraTorsoX; // Mirrored screen space

  // Arms raised check (Y = 0 is top, so wrist.y < shoulder.y means raised above shoulder)
  // Scale raise threshold with shoulder width
  const raiseThreshold = shoulderWidth * 0.2;
  const leftWrist = lm[15];
  const rightWrist = lm[16];

  const leftArmRaised = Boolean(isPointValid(leftWrist) && leftWrist.y < leftShoulder.y - raiseThreshold);
  const rightArmRaised = Boolean(isPointValid(rightWrist) && rightWrist.y < rightShoulder.y - raiseThreshold);

  return {
    screenTorsoX,
    shoulderWidth,
    leftArmRaised,
    rightArmRaised,
    isValid: true
  };
}

function cloneFrame(frame: InputFrame): InputFrame {
  return { p1: { ...frame.p1 }, p2: { ...frame.p2 } };
}

export class PoseInputMapper {
  private scheme: PoseGestureScheme;
  private soloMode: boolean;
  private readonly leanEnterRatio: number;
  private readonly leanReleaseRatio: number;
  private readonly minShoulderWidth: number;
  private readonly staleAfterMs: number;
  private readonly centerDeadBand: number;

  private controls?: Record<PlayerId, PlayerControl>;
  private lastKnownX?: Record<PlayerId, number>;
  private lastUpdateAt = Number.NEGATIVE_INFINITY;
  private lastAmbiguityReason?: PoseAmbiguityReason;
  private frame: InputFrame = cloneFrame(NEUTRAL_FRAME);

  constructor(options: PoseInputMapperOptions = {}) {
    this.scheme = options.scheme ?? 'P1';
    this.soloMode = options.soloMode ?? false;
    this.leanEnterRatio = options.leanEnterRatio ?? 0.22;
    this.leanReleaseRatio = options.leanReleaseRatio ?? 0.12;
    this.minShoulderWidth = options.minShoulderWidth ?? MIN_SHOULDER_WIDTH;
    this.staleAfterMs = options.staleAfterMs ?? POSE_TRACKING_STALE_MS;
    this.centerDeadBand = options.centerDeadBand ?? 0.035;
  }

  setScheme(scheme: PoseGestureScheme): void {
    this.scheme = scheme;
  }

  getScheme(): PoseGestureScheme {
    return this.scheme;
  }

  setSoloMode(solo: boolean): void {
    if (this.soloMode === solo) return;
    this.soloMode = solo;
    this.reset();
  }

  isSoloMode(): boolean {
    return this.soloMode;
  }

  getLastAmbiguityReason(): PoseAmbiguityReason | undefined {
    return this.lastAmbiguityReason;
  }

  canCalibrate(poses: readonly DetectedPose[]): boolean {
    const validMetrics = poses.map((p) => extractPoseMetrics(p, this.minShoulderWidth)).filter((m) => m.isValid);

    if (this.soloMode) {
      if (validMetrics.length !== 1) return false;
      const m = validMetrics[0];
      return m.screenTorsoX >= 0.15 && m.screenTorsoX <= 0.85;
    }

    if (validMetrics.length !== 2) return false;
    const [pA, pB] = validMetrics;
    const left = pA.screenTorsoX < pB.screenTorsoX ? pA : pB;
    const right = pA.screenTorsoX < pB.screenTorsoX ? pB : pA;

    const inLeftHalf = left.screenTorsoX < 0.5 - this.centerDeadBand && left.screenTorsoX > 0.08;
    const inRightHalf = right.screenTorsoX > 0.5 + this.centerDeadBand && right.screenTorsoX < 0.92;
    const separated = right.screenTorsoX - left.screenTorsoX >= 0.18;

    return inLeftHalf && inRightHalf && separated;
  }

  calibrate(poses: readonly DetectedPose[], now = performance.now()): boolean {
    if (!this.canCalibrate(poses)) return false;

    const validMetrics = poses.map((p) => extractPoseMetrics(p, this.minShoulderWidth)).filter((m) => m.isValid);

    if (this.soloMode) {
      const m = validMetrics[0];
      this.controls = {
        p1: { neutralTorsoX: m.screenTorsoX, neutralShoulderWidth: m.shoulderWidth, moveAxis: 0, catch: false },
        p2: { neutralTorsoX: 0.75, neutralShoulderWidth: m.shoulderWidth, moveAxis: 0, catch: false }
      };
      this.lastKnownX = { p1: m.screenTorsoX, p2: 0.75 };
    } else {
      const [pA, pB] = validMetrics;
      const left = pA.screenTorsoX < pB.screenTorsoX ? pA : pB;
      const right = pA.screenTorsoX < pB.screenTorsoX ? pB : pA;

      this.controls = {
        p1: { neutralTorsoX: left.screenTorsoX, neutralShoulderWidth: left.shoulderWidth, moveAxis: 0, catch: false },
        p2: { neutralTorsoX: right.screenTorsoX, neutralShoulderWidth: right.shoulderWidth, moveAxis: 0, catch: false }
      };
      this.lastKnownX = { p1: left.screenTorsoX, p2: right.screenTorsoX };
    }

    this.lastUpdateAt = now;
    this.lastAmbiguityReason = undefined;
    this.frame = cloneFrame(NEUTRAL_FRAME);
    return true;
  }

  update(poses: readonly DetectedPose[], now = performance.now()): InputFrame {
    if (!this.controls) {
      this.frame = cloneFrame(NEUTRAL_FRAME);
      return this.read(now);
    }

    const validPoses = poses
      .map((p) => ({ pose: p, metrics: extractPoseMetrics(p, this.minShoulderWidth) }))
      .filter((entry) => entry.metrics.isValid);

    // Solo mode processing
    if (this.soloMode) {
      if (validPoses.length > 1) {
        this.lastAmbiguityReason = 'multiple-hands';
        this.frame.p1 = { ...NEUTRAL_PLAYER };
        this.frame.p2 = { ...NEUTRAL_PLAYER };
        return this.read(now);
      }
      if (validPoses.length === 0) {
        this.lastAmbiguityReason = undefined;
        this.frame.p1 = { ...NEUTRAL_PLAYER };
        this.frame.p2 = { ...NEUTRAL_PLAYER };
        return this.read(now);
      }

      this.lastAmbiguityReason = undefined;
      const { metrics } = validPoses[0];
      this.updatePlayerControl('p1', metrics);
      this.lastKnownX!.p1 = metrics.screenTorsoX;
      this.lastUpdateAt = now;
      return this.read(now);
    }

    // Co-op mode processing (2 players)
    if (validPoses.length > 2) {
      this.lastAmbiguityReason = 'multiple-hands';
      this.frame = cloneFrame(NEUTRAL_FRAME);
      return this.read(now);
    }

    // Check proximity if 2 poses present
    if (validPoses.length === 2) {
      const diff = Math.abs(validPoses[0].metrics.screenTorsoX - validPoses[1].metrics.screenTorsoX);
      if (diff < 0.15) {
        this.lastAmbiguityReason = 'too-close';
        this.frame = cloneFrame(NEUTRAL_FRAME);
        return this.read(now);
      }
    }

    // Associate poses with P1 and P2 based on calibrated neutral positions
    const p1Neutral = this.controls.p1.neutralTorsoX;
    const p2Neutral = this.controls.p2.neutralTorsoX;

    let p1PoseMetrics: PoseMetrics | undefined;
    let p2PoseMetrics: PoseMetrics | undefined;

    if (validPoses.length === 1) {
      const m = validPoses[0].metrics;
      const distP1 = Math.abs(m.screenTorsoX - p1Neutral);
      const distP2 = Math.abs(m.screenTorsoX - p2Neutral);

      // Deadband check
      if (Math.abs(m.screenTorsoX - 0.5) < this.centerDeadBand) {
        this.lastAmbiguityReason = 'in-deadband';
        this.frame = cloneFrame(NEUTRAL_FRAME);
        return this.read(now);
      }

      if (distP1 < distP2 && m.screenTorsoX < 0.5 - this.centerDeadBand) {
        p1PoseMetrics = m;
      } else if (distP2 < distP1 && m.screenTorsoX > 0.5 + this.centerDeadBand) {
        p2PoseMetrics = m;
      } else {
        // Person crossed over to opposing side
        this.lastAmbiguityReason = 'hands-crossed';
        this.frame = cloneFrame(NEUTRAL_FRAME);
        return this.read(now);
      }
    } else if (validPoses.length === 2) {
      const [entryA, entryB] = validPoses;
      const mA = entryA.metrics;
      const mB = entryB.metrics;

      // Ensure one is on left and one on right
      const leftEntry = mA.screenTorsoX < mB.screenTorsoX ? mA : mB;
      const rightEntry = mA.screenTorsoX < mB.screenTorsoX ? mB : mA;

      // Crossing check: left entry must be < 0.5, right entry must be > 0.5
      if (leftEntry.screenTorsoX > 0.5 - this.centerDeadBand || rightEntry.screenTorsoX < 0.5 + this.centerDeadBand) {
        this.lastAmbiguityReason = 'hands-crossed';
        this.frame = cloneFrame(NEUTRAL_FRAME);
        return this.read(now);
      }

      p1PoseMetrics = leftEntry;
      p2PoseMetrics = rightEntry;
    }

    this.lastAmbiguityReason = undefined;

    if (p1PoseMetrics) {
      this.updatePlayerControl('p1', p1PoseMetrics);
      this.lastKnownX!.p1 = p1PoseMetrics.screenTorsoX;
    } else {
      this.controls.p1.moveAxis = 0;
      this.controls.p1.catch = false;
      this.frame.p1 = { ...NEUTRAL_PLAYER };
    }

    if (p2PoseMetrics) {
      this.updatePlayerControl('p2', p2PoseMetrics);
      this.lastKnownX!.p2 = p2PoseMetrics.screenTorsoX;
    } else {
      this.controls.p2.moveAxis = 0;
      this.controls.p2.catch = false;
      this.frame.p2 = { ...NEUTRAL_PLAYER };
    }

    this.lastUpdateAt = now;
    return this.read(now);
  }

  private updatePlayerControl(player: PlayerId, metrics: PoseMetrics): void {
    const ctrl = this.controls![player];
    const dx = metrics.screenTorsoX - ctrl.neutralTorsoX;
    const leanRatio = dx / Math.max(metrics.shoulderWidth, this.minShoulderWidth);

    // Lean Move Hysteresis
    if (ctrl.moveAxis === 0) {
      if (leanRatio <= -this.leanEnterRatio) ctrl.moveAxis = -1;
      else if (leanRatio >= this.leanEnterRatio) ctrl.moveAxis = 1;
    } else if (ctrl.moveAxis === -1) {
      if (leanRatio > -this.leanReleaseRatio) ctrl.moveAxis = 0;
    } else if (ctrl.moveAxis === 1) {
      if (leanRatio < this.leanReleaseRatio) ctrl.moveAxis = 0;
    }

    // Catch Gesture Evaluation
    // Scheme P1: Torso lean + BOTH arms raised
    // Scheme P2: Torso lean + ONE arm raised
    if (this.scheme === 'P1') {
      ctrl.catch = metrics.leftArmRaised && metrics.rightArmRaised;
    } else {
      ctrl.catch = metrics.leftArmRaised || metrics.rightArmRaised;
    }

    this.frame[player] = {
      moveAxis: ctrl.moveAxis,
      catch: ctrl.catch
    };
  }

  read(now = performance.now()): InputFrame {
    if (!this.controls) return cloneFrame(NEUTRAL_FRAME);
    if (this.lastAmbiguityReason) return cloneFrame(NEUTRAL_FRAME);
    if (now - this.lastUpdateAt > this.staleAfterMs) {
      return cloneFrame(NEUTRAL_FRAME);
    }
    return cloneFrame(this.frame);
  }

  getAssociatedPoses(poses: readonly DetectedPose[]): Array<{ player: PlayerId; landmarks: NormalizedPoseLandmark[]; catching: boolean }> {
    if (!this.controls) return [];
    const valid = poses
      .map((p) => ({ landmarks: p.landmarks, metrics: extractPoseMetrics(p, this.minShoulderWidth) }))
      .filter((e) => e.metrics.isValid);

    const result: Array<{ player: PlayerId; landmarks: NormalizedPoseLandmark[]; catching: boolean }> = [];

    if (this.soloMode) {
      if (valid.length === 1) {
        result.push({
          player: 'p1',
          landmarks: [...valid[0].landmarks],
          catching: this.frame.p1.catch
        });
      }
      return result;
    }

    if (valid.length === 1) {
      const m = valid[0].metrics;
      const isP1 = m.screenTorsoX < 0.5;
      result.push({
        player: isP1 ? 'p1' : 'p2',
        landmarks: [...valid[0].landmarks],
        catching: isP1 ? this.frame.p1.catch : this.frame.p2.catch
      });
    } else if (valid.length === 2) {
      const left = valid[0].metrics.screenTorsoX < valid[1].metrics.screenTorsoX ? valid[0] : valid[1];
      const right = valid[0].metrics.screenTorsoX < valid[1].metrics.screenTorsoX ? valid[1] : valid[0];
      result.push({
        player: 'p1',
        landmarks: [...left.landmarks],
        catching: this.frame.p1.catch
      });
      result.push({
        player: 'p2',
        landmarks: [...right.landmarks],
        catching: this.frame.p2.catch
      });
    }

    return result;
  }

  reset(): void {
    this.controls = undefined;
    this.lastKnownX = undefined;
    this.lastUpdateAt = Number.NEGATIVE_INFINITY;
    this.lastAmbiguityReason = undefined;
    this.frame = cloneFrame(NEUTRAL_FRAME);
  }
}
