export type FallingCuePlayer = 'p1' | 'p2';
export type FallingCuePosition = 'left' | 'center' | 'right';
export type FallingCueKind = 'energy' | 'hazard';

export interface FallingCueInput {
  player: FallingCuePlayer;
  position: FallingCuePosition;
  kind: FallingCueKind;
  y: number;
  speed: number;
  catchMinY: number;
  catchMaxY: number;
  leadTimeMs: number;
}

export function getFallingItemCue(item: FallingCueInput): string | null {
  const values = [item.y, item.speed, item.catchMinY, item.catchMaxY, item.leadTimeMs];
  if (!values.every(Number.isFinite) || item.speed <= 0 || item.leadTimeMs < 0 || item.catchMaxY < item.catchMinY) {
    return null;
  }
  if (item.y > item.catchMaxY) return null;

  const timeToCatchBandMs = Math.max(0, ((item.catchMinY - item.y) / item.speed) * 1_000);
  if (timeToCatchBandMs > item.leadTimeMs) return null;

  const eta = timeToCatchBandMs === 0
    ? 'at catch zone'
    : timeToCatchBandMs < 500
      ? 'in less than 1 second'
      : `in about ${Math.round(timeToCatchBandMs / 1_000)} second${Math.round(timeToCatchBandMs / 1_000) === 1 ? '' : 's'}`;

  return `${item.player.toUpperCase()} ${item.position} ${item.kind} ${eta}`;
}
