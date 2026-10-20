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

export const POSE_TRACKING_STALE_MS = 250;
export const MIN_SHOULDER_WIDTH = 0.04;

export type PoseAmbiguityReason = 'hands-crossed' | 'too-close' | 'multiple-hands' | 'in-deadband' | 'too-far' | 'association-lost' | 'tracking-lost';
export type PosePlayerState = 'WAITING' | 'WAITING_FOR_FRAME' | 'DETECTED_NOT_READY' | 'ACCEPTED_IDLE' | 'MOVE_LEFT' | 'MOVE_RIGHT' | 'CATCH' | 'AMBIGUOUS' | 'LOST' | 'RECALIBRATE' | 'KEYBOARD_FALLBACK';

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
  for (const confidence of [p.visibility, p.presence]) {
    if (confidence !== undefined && (!Number.isFinite(confidence) || confidence < VISIBILITY_MIN)) return false;
  }
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
  private tracks: Partial<Record<PlayerId, { x: number; width: number; at: number; live: boolean }>> = {};
  private associated: Partial<Record<PlayerId, DetectedPose>> = {};
  private recalibrationRequired = false;
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
    if (poses.length !== (this.soloMode ? 1 : 2)) return false;
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
      this.tracks = { p1: { x: m.screenTorsoX, width: m.shoulderWidth, at: now, live: true } };
    } else {
      const [pA, pB] = validMetrics;
      const left = pA.screenTorsoX < pB.screenTorsoX ? pA : pB;
      const right = pA.screenTorsoX < pB.screenTorsoX ? pB : pA;

      this.controls = {
        p1: { neutralTorsoX: left.screenTorsoX, neutralShoulderWidth: left.shoulderWidth, moveAxis: 0, catch: false },
        p2: { neutralTorsoX: right.screenTorsoX, neutralShoulderWidth: right.shoulderWidth, moveAxis: 0, catch: false }
      };
      this.tracks = { p1: { x: left.screenTorsoX, width: left.shoulderWidth, at: now, live: true }, p2: { x: right.screenTorsoX, width: right.shoulderWidth, at: now, live: true } };
    }

    this.associated = {};
    this.recalibrationRequired = false;
    this.lastUpdateAt = now;
    this.lastAmbiguityReason = undefined;
    this.frame = cloneFrame(NEUTRAL_FRAME);
    return true;
  }

  needsRecalibration(): boolean {
    return this.recalibrationRequired || Object.values(this.tracks).some(track => !track.live);
  }

  private invalidate(reason: PoseAmbiguityReason): InputFrame {
    this.recalibrationRequired = true;
    this.lastAmbiguityReason = reason;
    this.associated = {};
    this.frame = cloneFrame(NEUTRAL_FRAME);
    for (const ctrl of Object.values(this.controls ?? {})) {
      ctrl.moveAxis = 0;
      ctrl.catch = false;
    }
    return cloneFrame(this.frame);
  }

  update(poses: readonly DetectedPose[], now = performance.now()): InputFrame {
    if (!this.controls || this.recalibrationRequired) return cloneFrame(NEUTRAL_FRAME);
    if (!Number.isFinite(now) || now < this.lastUpdateAt || now - this.lastUpdateAt >= this.staleAfterMs) {
      return this.invalidate('tracking-lost');
    }
    if (poses.length > (this.soloMode ? 1 : 2)) return this.invalidate('multiple-hands');
    const valid = poses.map(pose => ({ pose, metrics: extractPoseMetrics(pose, this.minShoulderWidth) }))
      .filter(entry => entry.metrics.isValid);
    if (valid.length === 0) return this.invalidate('tracking-lost');
    if (valid.length === 2 && Math.abs(valid[0].metrics.screenTorsoX - valid[1].metrics.screenTorsoX) < 0.15) {
      return this.invalidate('too-close');
    }
    if (!this.soloMode && valid.length === 2 &&
        (valid.every(e => e.metrics.screenTorsoX < 0.5) || valid.every(e => e.metrics.screenTorsoX > 0.5))) {
      return this.invalidate('hands-crossed');
    }
    const accepted: Partial<Record<PlayerId, typeof valid[number]>> = {};
    for (const entry of valid) {
      const m = entry.metrics;
      if (!this.soloMode && Math.abs(m.screenTorsoX - 0.5) <= this.centerDeadBand) {
        return this.invalidate('hands-crossed');
      }
      // A slot token means uninterrupted anonymous visual continuity, never personal identity.
      // Never use detector array order or current left/right sorting as association.
      const candidates = (Object.keys(this.tracks) as PlayerId[]).filter(player => {
        const track = this.tracks[player]!;
        const dt = now - track.at;
        if (!track.live || dt < 0 || dt >= this.staleAfterMs) return false;
        const distanceGate = Math.min(0.14, 0.06 + dt * 0.0004);
        const widthRatio = m.shoulderWidth / track.width;
        return Math.abs(m.screenTorsoX - track.x) <= distanceGate && widthRatio >= 0.6 && widthRatio <= 1.75;
      });
      if (candidates.length !== 1 || accepted[candidates[0]]) return this.invalidate('association-lost');
      const player = candidates[0];
      if (!this.soloMode && ((player === 'p1' && m.screenTorsoX >= 0.5 - this.centerDeadBand) ||
          (player === 'p2' && m.screenTorsoX <= 0.5 + this.centerDeadBand))) return this.invalidate('hands-crossed');
      accepted[player] = entry;
    }
    this.associated = {};
    for (const player of Object.keys(this.tracks) as PlayerId[]) {
      const entry = accepted[player];
      if (entry) {
        this.updatePlayerControl(player, entry.metrics);
        this.tracks[player] = { x: entry.metrics.screenTorsoX, width: entry.metrics.shoulderWidth, at: now, live: true };
        this.associated[player] = entry.pose;
      } else {
        this.tracks[player]!.live = false; // Re-entry cannot prove this is the calibrated person.
        this.controls[player].moveAxis = 0;
        this.controls[player].catch = false;
        this.frame[player] = { ...NEUTRAL_PLAYER };
      }
    }
    this.lastUpdateAt = now;
    this.lastAmbiguityReason = undefined;
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
    if (!Number.isFinite(now) || now < this.lastUpdateAt) return this.invalidate('tracking-lost');
    // The input deadline is a delivery-time safety limit, not proof that an
    // already captured, in-flight observation has lost anonymous continuity.
    // update() still latches any actual capture gap >=250ms or invalid association.
    if (this.recalibrationRequired) return cloneFrame(NEUTRAL_FRAME);
    if (now - this.lastUpdateAt >= this.staleAfterMs) {
      for (const ctrl of Object.values(this.controls)) { ctrl.moveAxis = 0; ctrl.catch = false; }
      this.frame = cloneFrame(NEUTRAL_FRAME);
      return cloneFrame(NEUTRAL_FRAME);
    }
    return cloneFrame(this.frame);
  }

  getPlayerStates(now = performance.now()): Record<PlayerId, PosePlayerState> {
    const frame = this.read(now);
    const states: Record<PlayerId, PosePlayerState> = { p1: 'WAITING', p2: 'WAITING' };
    if (!this.controls) return states;
    for (const player of Object.keys(this.tracks) as PlayerId[]) {
      if (this.recalibrationRequired) states[player] = 'RECALIBRATE';
      else if (!this.tracks[player]!.live) states[player] = 'LOST';
      else if (now - this.lastUpdateAt >= this.staleAfterMs) states[player] = 'WAITING_FOR_FRAME';
      else if (frame[player].catch) states[player] = 'CATCH';
      else if (frame[player].moveAxis < 0) states[player] = 'MOVE_LEFT';
      else if (frame[player].moveAxis > 0) states[player] = 'MOVE_RIGHT';
      else states[player] = 'ACCEPTED_IDLE';
    }
    return states;
  }

  getAssociatedPoses(poses: readonly DetectedPose[], now = performance.now()): Array<{ player: PlayerId; landmarks: NormalizedPoseLandmark[]; catching: boolean }> {
    const frame = this.read(now);
    if (!this.controls || this.recalibrationRequired || now - this.lastUpdateAt >= this.staleAfterMs) return [];
    return (Object.keys(this.associated) as PlayerId[]).filter(player => poses.includes(this.associated[player]!))
      .map(player => ({ player, landmarks: [...this.associated[player]!.landmarks], catching: frame[player].catch }));
  }

  reset(): void {
    this.controls = undefined;
    this.tracks = {};
    this.associated = {};
    this.recalibrationRequired = false;
    this.lastUpdateAt = Number.NEGATIVE_INFINITY;
    this.lastAmbiguityReason = undefined;
    this.frame = cloneFrame(NEUTRAL_FRAME);
  }
}
