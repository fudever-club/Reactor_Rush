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
  const safeDuration = Math.max(1, Math.floor(durationMs));
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
    const restartRemainingMs = Math.max(0, state.restartRemainingMs - delta);
    return restartRemainingMs === 0
      ? { ...state, phase: 'playing', restartRemainingMs: 0 }
      : { ...state, restartRemainingMs };
  }
  if (state.phase !== 'playing') return state;

  const timeRemainingMs = Math.max(0, state.timeRemainingMs - delta);
  return {
    ...state,
    timeRemainingMs,
    phase: timeRemainingMs === 0 ? 'results' : 'playing'
  };
}

export function applyCatch(state: GameState, playerId: PlayerId, kind: CatchKind): GameState {
  if (state.phase !== 'playing') return state;
  return {
    ...state,
    players: { ...state.players, [playerId]: scoreCatch(state.players[playerId], kind) }
  };
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
