import type { DetectedHand } from './hand-input-mapper.ts';

export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // Palm base & metacarpals
  [0, 1], [0, 5], [5, 9], [9, 13], [13, 17], [0, 17],
  // Thumb
  [1, 2], [2, 3], [3, 4],
  // Index
  [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [17, 18], [18, 19], [19, 20]
];

export function renderHandOverlay(
  ctx: CanvasRenderingContext2D | null | undefined,
  canvas: HTMLCanvasElement | null | undefined,
  hands: readonly DetectedHand[],
  soloMode: boolean
): void {
  if (!ctx || !canvas) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  if (!hands || hands.length === 0) return;

  for (const hand of hands) {
    if (!hand.landmarks || hand.landmarks.length < 21) continue;
    const wrist = hand.landmarks[0];
    const isP1 = soloMode ? true : (1 - wrist.x) < 0.5;
    const strokeColor = isP1 ? 'rgba(85, 223, 255, 0.85)' : 'rgba(255, 112, 178, 0.85)';
    const jointColor = isP1 ? '#a4efff' : '#ffc2dd';

    // Draw bones
    ctx.lineWidth = 3;
    ctx.strokeStyle = strokeColor;
    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const p1 = hand.landmarks[startIdx];
      const p2 = hand.landmarks[endIdx];
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }

    // Draw joints
    for (let i = 0; i < hand.landmarks.length; i++) {
      const p = hand.landmarks[i];
      if (!p) continue;
      const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, isTip ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? '#ffffff' : jointColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Pinch detection & highlight
    const thumb = hand.landmarks[4];
    const index = hand.landmarks[8];
    if (thumb && index) {
      const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
      if (dist < 0.09) {
        const mx = ((thumb.x + index.x) / 2) * width;
        const my = ((thumb.y + index.y) / 2) * height;
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(246, 213, 92, 0.5)';
        ctx.fill();
        ctx.strokeStyle = '#f6d55c';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  }
}
