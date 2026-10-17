import type { InputFrame, PlayerId, PlayerInput } from '../gameplay/core';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface DetectedHand {
  landmarks: readonly NormalizedLandmark[];
}

export interface HandInputMapperOptions {
  moveEnterThreshold?: number;
  moveReleaseThreshold?: number;
  pinchEnterRatio?: number;
  pinchReleaseRatio?: number;
  staleAfterMs?: number;
  centerDeadBand?: number;
}

const NEUTRAL_PLAYER: PlayerInput = { moveAxis: 0, catch: false };
const NEUTRAL_FRAME: InputFrame = {
  p1: { ...NEUTRAL_PLAYER },
  p2: { ...NEUTRAL_PLAYER }
};

interface PlayerControl {
  neutralX: number;
  moveAxis: -1 | 0 | 1;
  catch: boolean;
}

const PLAYER_IDS: readonly PlayerId[] = ['p1', 'p2'];

function validLandmark(point: NormalizedLandmark | undefined): point is NormalizedLandmark {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
}

function screenX(hand: DetectedHand): number | undefined {
  const wrist = hand.landmarks[0];
  const thumbTip = hand.landmarks[4];
  const indexMcp = hand.landmarks[5];
  const indexTip = hand.landmarks[8];
  const middleMcp = hand.landmarks[9];
  const pinkyMcp = hand.landmarks[17];
  if (![wrist, thumbTip, indexMcp, indexTip, middleMcp, pinkyMcp].every(validLandmark)) return undefined;
  return 1 - wrist.x;
}

function sideFor(x: number, centerDeadBand: number): PlayerId | undefined {
  if (x < 0.5 - centerDeadBand) return 'p1';
  if (x > 0.5 + centerDeadBand) return 'p2';
  return undefined;
}

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pinchRatio(hand: DetectedHand): number | undefined {
  const thumbTip = hand.landmarks[4];
  const indexMcp = hand.landmarks[5];
  const indexTip = hand.landmarks[8];
  const pinkyMcp = hand.landmarks[17];
  if (![thumbTip, indexMcp, indexTip, pinkyMcp].every(validLandmark)) return undefined;
  const palmWidth = distance(indexMcp, pinkyMcp);
  if (palmWidth < 0.015) return undefined;
  return distance(thumbTip, indexTip) / palmWidth;
}

function cloneFrame(frame: InputFrame): InputFrame {
  return { p1: { ...frame.p1 }, p2: { ...frame.p2 } };
}

export class HandInputMapper {
  private readonly moveEnterThreshold: number;
  private readonly moveReleaseThreshold: number;
  private readonly pinchEnterRatio: number;
  private readonly pinchReleaseRatio: number;
  private readonly staleAfterMs: number;
  private readonly centerDeadBand: number;
  private controls?: Record<PlayerId, PlayerControl>;
  private lastUpdateAt = Number.NEGATIVE_INFINITY;
  private frame: InputFrame = cloneFrame(NEUTRAL_FRAME);

  constructor(options: HandInputMapperOptions = {}) {
    this.moveEnterThreshold = options.moveEnterThreshold ?? 0.1;
    this.moveReleaseThreshold = options.moveReleaseThreshold ?? 0.055;
    this.pinchEnterRatio = options.pinchEnterRatio ?? 0.3;
    this.pinchReleaseRatio = options.pinchReleaseRatio ?? 0.43;
    this.staleAfterMs = options.staleAfterMs ?? 250;
    this.centerDeadBand = options.centerDeadBand ?? 0.035;
  }

  calibrate(hands: readonly DetectedHand[], nowMs: number): boolean {
    const assignments = this.assign(hands);
    if (!assignments || !assignments.p1 || !assignments.p2) return false;

    this.controls = {
      p1: { neutralX: assignments.p1.x, moveAxis: 0, catch: false },
      p2: { neutralX: assignments.p2.x, moveAxis: 0, catch: false }
    };
    this.lastUpdateAt = nowMs;
    this.frame = cloneFrame(NEUTRAL_FRAME);
    return true;
  }

  canCalibrate(hands: readonly DetectedHand[]): boolean {
    const assignments = this.assign(hands);
    return Boolean(assignments?.p1 && assignments.p2);
  }

  update(hands: readonly DetectedHand[], nowMs: number): InputFrame {
    if (!this.controls) return cloneFrame(NEUTRAL_FRAME);

    const assignments = this.assign(hands) ?? {};
    const next = cloneFrame(NEUTRAL_FRAME);
    for (const player of PLAYER_IDS) {
      const hand = assignments[player];
      const control = this.controls[player];
      if (!hand) {
        control.moveAxis = 0;
        control.catch = false;
        continue;
      }

      const delta = hand.x - control.neutralX;
      control.moveAxis = this.resolveAxis(control.moveAxis, delta);
      const pinch = pinchRatio(hand.hand);
      if (pinch === undefined) {
        control.catch = false;
      } else if (control.catch) {
        control.catch = pinch <= this.pinchReleaseRatio;
      } else {
        control.catch = pinch <= this.pinchEnterRatio;
      }
      next[player] = { moveAxis: control.moveAxis, catch: control.catch };
    }

    this.frame = next;
    this.lastUpdateAt = nowMs;
    return cloneFrame(this.frame);
  }

  read(nowMs: number): InputFrame {
    if (nowMs - this.lastUpdateAt > this.staleAfterMs) {
      this.frame = cloneFrame(NEUTRAL_FRAME);
      if (this.controls) {
        for (const player of PLAYER_IDS) {
          this.controls[player].moveAxis = 0;
          this.controls[player].catch = false;
        }
      }
    }
    return cloneFrame(this.frame);
  }

  reset(): void {
    this.controls = undefined;
    this.lastUpdateAt = Number.NEGATIVE_INFINITY;
    this.frame = cloneFrame(NEUTRAL_FRAME);
  }

  private assign(hands: readonly DetectedHand[]): Partial<Record<PlayerId, { hand: DetectedHand; x: number }>> | undefined {
    const assignments: Partial<Record<PlayerId, { hand: DetectedHand; x: number }>> = {};
    for (const hand of hands) {
      if (!Array.isArray(hand.landmarks) || hand.landmarks.length < 18) continue;
      const x = screenX(hand);
      if (x === undefined) continue;
      const player = sideFor(x, this.centerDeadBand);
      if (!player) continue;
      if (assignments[player]) return undefined;
      assignments[player] = { hand, x };
    }
    return assignments;
  }

  private resolveAxis(current: -1 | 0 | 1, delta: number): -1 | 0 | 1 {
    if (current < 0 && delta <= -this.moveReleaseThreshold) return -1;
    if (current > 0 && delta >= this.moveReleaseThreshold) return 1;
    if (delta <= -this.moveEnterThreshold) return -1;
    if (delta >= this.moveEnterThreshold) return 1;
    return 0;
  }
}
