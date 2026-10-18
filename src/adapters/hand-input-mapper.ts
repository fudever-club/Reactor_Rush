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
  soloMode?: boolean;
}

const NEUTRAL_PLAYER: PlayerInput = { moveAxis: 0, catch: false };
const NEUTRAL_FRAME: InputFrame = {
  p1: { ...NEUTRAL_PLAYER },
  p2: { ...NEUTRAL_PLAYER }
};

export const HAND_TRACKING_STALE_MS = 250;

export type AmbiguityReason = 'hands-crossed' | 'too-close' | 'multiple-hands' | 'in-deadband';

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
  private soloMode: boolean;
  private controls?: Record<PlayerId, PlayerControl>;
  private lastKnownX?: Record<PlayerId, number>;
  private lastUpdateAt = Number.NEGATIVE_INFINITY;
  private lastAmbiguityReason?: AmbiguityReason;
  private frame: InputFrame = cloneFrame(NEUTRAL_FRAME);

  constructor(options: HandInputMapperOptions = {}) {
    this.moveEnterThreshold = options.moveEnterThreshold ?? 0.1;
    this.moveReleaseThreshold = options.moveReleaseThreshold ?? 0.055;
    this.pinchEnterRatio = options.pinchEnterRatio ?? 0.3;
    this.pinchReleaseRatio = options.pinchReleaseRatio ?? 0.43;
    this.staleAfterMs = options.staleAfterMs ?? HAND_TRACKING_STALE_MS;
    this.centerDeadBand = options.centerDeadBand ?? 0.035;
    this.soloMode = options.soloMode ?? false;
  }

  getLastAmbiguityReason(): AmbiguityReason | undefined {
    return this.lastAmbiguityReason;
  }

  setSoloMode(solo: boolean): void {
    if (this.soloMode === solo) return;
    this.soloMode = solo;
    this.reset();
  }

  isSoloMode(): boolean {
    return this.soloMode;
  }

  calibrate(hands: readonly DetectedHand[], nowMs: number): boolean {
    const assignments = this.assign(hands);
    if (!assignments || !assignments.p1) return false;
    if (!this.soloMode && !assignments.p2) return false;

    this.controls = {
      p1: { neutralX: assignments.p1.x, moveAxis: 0, catch: false },
      p2: assignments.p2
        ? { neutralX: assignments.p2.x, moveAxis: 0, catch: false }
        : { neutralX: 0.75, moveAxis: 0, catch: false }
    };
    this.lastKnownX = {
      p1: assignments.p1.x,
      p2: assignments.p2 ? assignments.p2.x : 0.75
    };
    this.lastUpdateAt = nowMs;
    this.frame = cloneFrame(NEUTRAL_FRAME);
    return true;
  }

  canCalibrate(hands: readonly DetectedHand[]): boolean {
    const assignments = this.assign(hands);
    if (!assignments?.p1) return false;
    return this.soloMode ? true : Boolean(assignments.p2);
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

      if (this.lastKnownX) {
        this.lastKnownX[player] = hand.x;
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
    this.lastKnownX = undefined;
    this.lastUpdateAt = Number.NEGATIVE_INFINITY;
    this.lastAmbiguityReason = undefined;
    this.frame = cloneFrame(NEUTRAL_FRAME);
  }

  private assign(hands: readonly DetectedHand[]): Partial<Record<PlayerId, { hand: DetectedHand; x: number }>> | undefined {
    const assignments: Partial<Record<PlayerId, { hand: DetectedHand; x: number }>> = {};
    const validHands: Array<{ hand: DetectedHand; x: number }> = [];

    for (const hand of hands) {
      if (!Array.isArray(hand.landmarks) || hand.landmarks.length < 18) continue;
      const x = screenX(hand);
      if (x === undefined) continue;
      validHands.push({ hand, x });
    }

    if (validHands.length === 0) {
      this.lastAmbiguityReason = undefined;
      return assignments;
    }

    if (this.soloMode) {
      if (validHands.length > 2) {
        this.lastAmbiguityReason = 'multiple-hands';
      } else {
        this.lastAmbiguityReason = undefined;
      }
      if (validHands.length === 1) {
        assignments.p1 = validHands[0];
        return assignments;
      }
      const targetX = this.lastKnownX?.p1 ?? this.controls?.p1.neutralX ?? 0.5;
      let bestHand = validHands[0];
      let bestDist = Math.abs(bestHand.x - targetX);
      for (let i = 1; i < validHands.length; i++) {
        const dist = Math.abs(validHands[i].x - targetX);
        if (dist < bestDist) {
          bestDist = dist;
          bestHand = validHands[i];
        }
      }
      assignments.p1 = bestHand;
      return assignments;
    }

    // 2-Player Co-op Mode:
    // 1. Minimum hand separation check: overlapping or crossing hands neutralize both players
    if (validHands.length >= 2) {
      for (let i = 0; i < validHands.length; i++) {
        for (let j = i + 1; j < validHands.length; j++) {
          if (Math.abs(validHands[i].x - validHands[j].x) < 0.08) {
            this.lastAmbiguityReason = 'too-close';
            return assignments;
          }
        }
      }
    }

    const leftBoundary = 0.5 - this.centerDeadBand;
    const rightBoundary = 0.5 + this.centerDeadBand;

    const leftHands = validHands.filter((h) => h.x < leftBoundary);
    const rightHands = validHands.filter((h) => h.x > rightBoundary);
    const deadbandHands = validHands.filter((h) => h.x >= leftBoundary && h.x <= rightBoundary);

    if (leftHands.length > 1 || rightHands.length > 1) {
      this.lastAmbiguityReason = 'multiple-hands';
    } else if (deadbandHands.length > 0 && leftHands.length === 0 && rightHands.length === 0) {
      this.lastAmbiguityReason = 'in-deadband';
    } else {
      this.lastAmbiguityReason = undefined;
    }

    const p1Candidate = leftHands.length === 1 ? leftHands[0] : undefined;
    const p2Candidate = rightHands.length === 1 ? rightHands[0] : undefined;

    if (this.lastKnownX) {
      if (p1Candidate) {
        const distToP1 = Math.abs(p1Candidate.x - this.lastKnownX.p1);
        const distToP2 = Math.abs(p1Candidate.x - this.lastKnownX.p2);
        if (distToP2 < distToP1 && distToP2 < 0.25) {
          // Hand belonged to P2 crossing into P1 territory -> ignore
          this.lastAmbiguityReason = 'hands-crossed';
        } else {
          assignments.p1 = p1Candidate;
        }
      }
      if (p2Candidate) {
        const distToP1 = Math.abs(p2Candidate.x - this.lastKnownX.p1);
        const distToP2 = Math.abs(p2Candidate.x - this.lastKnownX.p2);
        if (distToP1 < distToP2 && distToP1 < 0.25) {
          // Hand belonged to P1 crossing into P2 territory -> ignore
          this.lastAmbiguityReason = 'hands-crossed';
        } else {
          assignments.p2 = p2Candidate;
        }
      }
    } else {
      if (p1Candidate) assignments.p1 = p1Candidate;
      if (p2Candidate) assignments.p2 = p2Candidate;
    }

    if (assignments.p1 && assignments.p2) {
      this.lastAmbiguityReason = undefined;
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
