export type PlayerId = 'p1' | 'p2';
export type CatchKind = 'energy' | 'hazard';
export type GamePhase = 'menu' | 'playing' | 'results' | 'restart';

export interface PlayerStats {
  score: number;
  combo: number;
  bestCombo: number;
}

export interface PlayerInput {
  moveAxis: -1 | 0 | 1;
  catch: boolean;
}

export interface InputFrame {
  p1: PlayerInput;
  p2: PlayerInput;
}

export interface InputAdapter {
  read(): InputFrame;
}

export interface KeyboardSnapshot {
  a: boolean;
  d: boolean;
  s: boolean;
  left: boolean;
  right: boolean;
  down: boolean;
}

export interface GameState {
  phase: GamePhase;
  durationMs: number;
  timeRemainingMs: number;
  restartRemainingMs: number;
  players: Record<PlayerId, PlayerStats>;
}

export const DEFAULT_ROUND_MS = 60_000;
export const RESTART_READY_MS = 900;
const MAX_SIMULATION_STEP_MS = 50;

export function createPlayerStats(): PlayerStats {
  return { score: 0, combo: 0, bestCombo: 0 };
}

export function scoreCatch(player: PlayerStats, kind: CatchKind): PlayerStats {
  if (kind === 'hazard') {
    return { ...player, score: Math.max(0, player.score - 50), combo: 0 };
  }

  const combo = player.combo + 1;
  const multiplier = Math.min(3, 1 + Math.floor(combo / 5) * 0.5);
  return {
    score: player.score + Math.round(100 * multiplier),
    combo,
    bestCombo: Math.max(player.bestCombo, combo)
  };
}

export function createGameState(durationMs = DEFAULT_ROUND_MS): GameState {
  const safeDuration = Number.isFinite(durationMs)
    ? Math.max(1, Math.floor(durationMs))
    : DEFAULT_ROUND_MS;
  return {
    phase: 'menu',
    durationMs: safeDuration,
    timeRemainingMs: safeDuration,
    restartRemainingMs: 0,
    players: { p1: createPlayerStats(), p2: createPlayerStats() }
  };
}

export function startGame(state: GameState): GameState {
  if (state.phase !== 'menu') return state;
  return {
    ...state,
    phase: 'playing',
    timeRemainingMs: state.durationMs,
    restartRemainingMs: 0,
    players: { p1: createPlayerStats(), p2: createPlayerStats() }
  };
}

export function advanceGame(state: GameState, deltaMs: number): GameState {
  const delta = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0);
  if (state.phase === 'restart') {
    const restartTime = Number.isFinite(state.restartRemainingMs)
      ? Math.max(0, state.restartRemainingMs)
      : 0;
    const restartRemainingMs = Math.max(0, restartTime - delta);
    if (restartRemainingMs > 0) return { ...state, restartRemainingMs };
    const playing = { ...state, phase: 'playing' as const, restartRemainingMs: 0 };
    const overflow = Math.max(0, delta - restartTime);
    return overflow > 0 ? advanceGame(playing, overflow) : playing;
  }
  if (state.phase !== 'playing') return state;

  const currentTimeRemaining = Number.isFinite(state.timeRemainingMs)
    ? Math.max(0, state.timeRemainingMs)
    : 0;
  const timeRemainingMs = Math.max(0, currentTimeRemaining - delta);
  return {
    ...state,
    timeRemainingMs,
    phase: timeRemainingMs === 0 ? 'results' : 'playing'
  };
}

export function advanceGameFrame(
  state: GameState,
  deltaMs: number,
  simulatePlayingStep: (state: GameState, deltaMs: number, elapsedMs: number) => GameState = (current) => current
): GameState {
  let current = state;
  const frameDeltaMs = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0);
  let remaining = frameDeltaMs;
  let elapsed = 0;
  const inputWindowStart = Math.max(0, frameDeltaMs - MAX_SIMULATION_STEP_MS);

  while (true) {
    if (current.phase === 'restart' && current.restartRemainingMs <= 0) {
      current = advanceGame(current, 0);
      continue;
    }
    if (current.phase === 'playing' && current.timeRemainingMs <= 0) {
      current = advanceGame(current, 0);
      break;
    }
    if (remaining <= 0) break;

    if (current.phase === 'restart') {
      const restartRemaining = Number.isFinite(current.restartRemainingMs)
        ? Math.max(0, current.restartRemainingMs)
        : 0;
      const untilInputWindow = elapsed < inputWindowStart ? inputWindowStart - elapsed : Number.POSITIVE_INFINITY;
      const step = Math.min(remaining, MAX_SIMULATION_STEP_MS, restartRemaining, untilInputWindow);
      current = advanceGame(current, step);
      remaining -= step;
      elapsed += step;
      continue;
    }

    if (current.phase === 'playing') {
      const timeRemaining = Number.isFinite(current.timeRemainingMs)
        ? Math.max(0, current.timeRemainingMs)
        : 0;
      const untilInputWindow = elapsed < inputWindowStart ? inputWindowStart - elapsed : Number.POSITIVE_INFINITY;
      const step = Math.min(remaining, MAX_SIMULATION_STEP_MS, timeRemaining, untilInputWindow);
      if (step <= 0) {
        current = advanceGame(current, 0);
        break;
      }
      current = advanceGame(simulatePlayingStep(current, step, elapsed), step);
      remaining -= step;
      elapsed += step;
      continue;
    }

    break;
  }

  return current;
}

export function isCurrentInputStep(elapsedMs: number, stepMs: number, frameDeltaMs: number): boolean {
  if (![elapsedMs, stepMs, frameDeltaMs].every(Number.isFinite) || stepMs <= 0 || frameDeltaMs <= 0) return false;
  const inputWindowStart = Math.max(0, frameDeltaMs - MAX_SIMULATION_STEP_MS);
  return elapsedMs >= inputWindowStart && elapsedMs < frameDeltaMs;
}

export function crossesVerticalBand(previousY: number, nextY: number, bandMin: number, bandMax: number): boolean {
  if (![previousY, nextY, bandMin, bandMax].every(Number.isFinite) || bandMin > bandMax) return false;
  const segmentMin = Math.min(previousY, nextY);
  const segmentMax = Math.max(previousY, nextY);
  return segmentMax >= bandMin && segmentMin <= bandMax;
}

export function canCatchFallingItem(
  catchHeld: boolean,
  previousY: number,
  nextY: number,
  itemX: number,
  playerXStart: number,
  playerDeltaX: number,
  playerMinX: number,
  playerMaxX: number,
  bandMin: number,
  bandMax: number,
  maxHorizontalDistance: number
): boolean {
  if (![itemX, playerXStart, playerDeltaX, playerMinX, playerMaxX, maxHorizontalDistance].every(Number.isFinite) ||
      playerMinX > playerMaxX || maxHorizontalDistance < 0 || !catchHeld ||
      !crossesVerticalBand(previousY, nextY, bandMin, bandMax)) return false;

  const itemDeltaY = nextY - previousY;
  let overlapStart = 0;
  let overlapEnd = 1;
  if (itemDeltaY === 0) {
    if (previousY < bandMin || previousY > bandMax) return false;
  } else {
    const bandEntry = (bandMin - previousY) / itemDeltaY;
    const bandExit = (bandMax - previousY) / itemDeltaY;
    overlapStart = Math.max(0, Math.min(bandEntry, bandExit));
    overlapEnd = Math.min(1, Math.max(bandEntry, bandExit));
    if (overlapStart > overlapEnd) return false;
  }

  const playerXAt = (time: number) => Math.min(
    playerMaxX,
    Math.max(playerMinX, playerXStart + playerDeltaX * time)
  );
  const playerPathMin = Math.min(playerXAt(overlapStart), playerXAt(overlapEnd));
  const playerPathMax = Math.max(playerXAt(overlapStart), playerXAt(overlapEnd));
  return playerPathMax >= itemX - maxHorizontalDistance && playerPathMin <= itemX + maxHorizontalDistance;
}

export function applyCatch(state: GameState, playerId: PlayerId, kind: CatchKind): GameState {
  if (state.phase !== 'playing') return state;
  return {
    ...state,
    players: { ...state.players, [playerId]: scoreCatch(state.players[playerId], kind) }
  };
}

export function hasTimeAfterStep(state: GameState, deltaMs: number): boolean {
  return state.phase === 'playing' &&
    Number.isFinite(state.timeRemainingMs) &&
    Number.isFinite(deltaMs) &&
    deltaMs >= 0 &&
    state.timeRemainingMs > deltaMs;
}

export function requestRestart(state: GameState): GameState {
  if (state.phase !== 'results') return state;
  return {
    ...createGameState(state.durationMs),
    phase: 'restart',
    restartRemainingMs: RESTART_READY_MS
  };
}

function direction(negative: boolean, positive: boolean): -1 | 0 | 1 {
  if (negative === positive) return 0;
  return negative ? -1 : 1;
}

export function mapKeyboardSnapshot(keys: KeyboardSnapshot): InputFrame {
  return {
    p1: { moveAxis: direction(keys.a, keys.d), catch: keys.s },
    p2: { moveAxis: direction(keys.left, keys.right), catch: keys.down }
  };
}
