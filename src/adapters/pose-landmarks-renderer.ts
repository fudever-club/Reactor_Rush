import type { NormalizedPoseLandmark } from '../workers/pose-landmarker.worker.ts';

export interface RenderedPlayerPose {
  player?: 'p1' | 'p2';
  candidate?: boolean;
  landmarks: NormalizedPoseLandmark[];
  catching?: boolean;
}

export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // Head
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  // Shoulders & Torso
  [11, 12],
  [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Legs (if visible)
  [23, 25], [24, 26], [25, 27], [26, 28]
];

const VISIBILITY_THRESHOLD = 0.35;

function isVisiblePoint(point: NormalizedPoseLandmark | undefined): point is NormalizedPoseLandmark {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
    [point.visibility, point.presence].every(value => value === undefined || (Number.isFinite(value) && value >= VISIBILITY_THRESHOLD));
}

export function renderPoseOverlay(
  ctx: CanvasRenderingContext2D | null | undefined,
  canvas: HTMLCanvasElement | null | undefined,
  poses: readonly RenderedPlayerPose[],
  soloMode: boolean
): void {
  if (!ctx || !canvas) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  // In 2-player mode, draw a subtle center lane divider guide
  if (!soloMode) {
    ctx.strokeStyle = 'rgba(80, 90, 123, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (!poses || poses.length === 0) return;

  for (const { player, candidate, landmarks, catching } of poses) {
    if (!landmarks || landmarks.length < 25) continue;
    const preview = candidate || player === undefined;
    const isP1 = player === 'p1';
    const strokeColor = preview ? 'rgba(255, 204, 102, 0.88)' : isP1 ? 'rgba(85, 223, 255, 0.88)' : 'rgba(255, 112, 178, 0.88)';
    const jointColor = preview ? '#ffcc66' : isP1 ? '#a4efff' : '#ffc2dd';

    // Draw skeleton bones
    ctx.lineWidth = 3;
    ctx.strokeStyle = strokeColor;
    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (!isVisiblePoint(p1) || !isVisiblePoint(p2)) continue;

      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      if (!isVisiblePoint(p)) continue;

      // Wrists, elbows, shoulders are prominent
      const isKeyJoint = i === 11 || i === 12 || i === 13 || i === 14 || i === 15 || i === 16;
      const radius = isKeyJoint ? 4.5 : 3;

      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, radius, 0, Math.PI * 2);
      ctx.fillStyle = isKeyJoint && !preview ? '#ffffff' : jointColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Catch action cue (wrists glow gold)
    if (catching && !preview) {
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      for (const wrist of [leftWrist, rightWrist]) {
        if (!isVisiblePoint(wrist)) continue;
        ctx.beginPath();
        ctx.arc(wrist.x * width, wrist.y * height, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(246, 213, 92, 0.45)';
        ctx.fill();
        ctx.strokeStyle = '#f6d55c';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  }
}
