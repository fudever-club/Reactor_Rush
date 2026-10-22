import type { InputFrame, PlayerId, PlayerStats } from './core.ts';
import type { CampaignMode, RoundId } from './campaign.ts';

export type Zone = 0 | 1 | 2;
/** Per-player board: connected is this board's socket count; completed counts circuits. */
export interface CircuitPlayerState {
  readonly holdMs: number;
  readonly connected: number;
  readonly completed: number;
  readonly needsRelease: boolean;
}
/** penaltyCycle prevents repeated penalties; completed counts earned cooling pulses. */
export interface CoolingPlayerState {
  readonly pulseMs: number;
  readonly heat: number;
  readonly penaltyCycle: number;
  readonly completed: number;
  readonly needsRelease: boolean;
}
/** Immutable independent boards; the scene owns whether this round is playing. */
export interface DuoCircuitState {
  readonly roundId: 'duo-circuit';
  readonly mode: CampaignMode;
  readonly players: Readonly<Record<PlayerId, CircuitPlayerState>>;
}
/** elapsedMs is simulation time since this challenge began. */
export interface CoolTheCoreState {
  readonly roundId: 'cool-the-core';
  readonly mode: CampaignMode;
  readonly elapsedMs: number;
  readonly players: Readonly<Record<PlayerId, CoolingPlayerState>>;
}
export type ChallengeState = DuoCircuitState | CoolTheCoreState;
/** points is the actual score delta (an overload near zero can deduct less than 50). */
export interface ChallengeEvent {
  readonly player: PlayerId;
  readonly kind: 'connect' | 'circuit' | 'cool' | 'overload';
  readonly points: number;
}
/** New immutable challenge/stats snapshots and events for the consumed step. */
export interface ChallengeStep {
  readonly state: ChallengeState;
  readonly players: Record<PlayerId, PlayerStats>;
  readonly events: readonly ChallengeEvent[];
}
/** completed counts circuits/pulses; connected is present only for circuit boards. */
export interface ChallengeView {
  readonly targetZone: Zone;
  readonly progress: number;
  readonly heat?: number;
  readonly overload: boolean;
  readonly completed: number;
  readonly connected?: number;
  readonly needsRelease: boolean;
}
const IDS: readonly PlayerId[] = ['p1','p2'];
const CIRCUIT_ROUTE: readonly Zone[] = [0,2,1];
const VALVE_ROUTE: readonly Zone[] = [1,0,2];
const MAX_STEP_MS = 50;
const HOLD_MS = 1000;
const CYCLE_MS = 6000;
const SAFE_MS = 4000;

function freezeState<T extends ChallengeState>(state: T): T {
  Object.freeze(state.players.p1);
  Object.freeze(state.players.p2);
  Object.freeze(state.players);
  return Object.freeze(state);
}
export function createChallenge(roundId: RoundId, mode: CampaignMode): ChallengeState | null {
  if (roundId === 'energy-catch') return null;
  if (roundId === 'duo-circuit') {
    const player = (): CircuitPlayerState => ({holdMs:0,connected:0,completed:0,needsRelease:true});
    return freezeState({roundId,mode,players:{p1:player(),p2:player()}});
  }
  const player = (): CoolingPlayerState => ({pulseMs:0,heat:70,penaltyCycle:-1,completed:0,needsRelease:true});
  return freezeState({roundId,mode,elapsedMs:0,players:{p1:player(),p2:player()}});
}
function activePlayers(mode: CampaignMode): readonly PlayerId[] {
  return mode === 'solo' ? ['p1'] : IDS;
}
function circuitTarget(player: CircuitPlayerState): Zone {
  return CIRCUIT_ROUTE[(player.completed + player.connected) % 3];
}
function cycleAt(elapsedMs: number): number { return Math.floor(elapsedMs / CYCLE_MS); }
function overloadedAt(elapsedMs: number): boolean { return elapsedMs % CYCLE_MS >= SAFE_MS; }
function valveAt(elapsedMs: number): Zone { return VALVE_ROUTE[cycleAt(elapsedMs) % 3]; }
function earn(stats: PlayerStats, points: number): PlayerStats {
  const combo = stats.combo + 1;
  return {score:stats.score + points,combo,bestCombo:Math.max(stats.bestCombo,combo)};
}

/**
 * Consume only playing simulation steps. Non-finite/nonpositive delta is a no-op;
 * oversized delta clamps to 50ms. The scene must feed neutral input on historical
 * catch-up steps, and must not call this function during intros/results.
 */
export function stepChallenge(
  state: ChallengeState,
  players: Record<PlayerId, PlayerStats>,
  input: InputFrame,
  zones: Readonly<Record<PlayerId, Zone>>,
  deltaMs: number
): ChallengeStep {
  const delta = Number.isFinite(deltaMs) ? Math.min(MAX_STEP_MS, Math.max(0,deltaMs)) : 0;
  if (delta === 0) return {state,players,events:Object.freeze([])};
  const nextPlayers = {p1:{...players.p1},p2:{...players.p2}};
  const events: ChallengeEvent[] = [];
  const event = (player: PlayerId, kind: ChallengeEvent['kind'], points: number) => {
    events.push(Object.freeze({player,kind,points}));
  };
  let nextState: ChallengeState;
  if (state.roundId === 'duo-circuit') {
    const boards = {...state.players};
    for (const id of activePlayers(state.mode)) {
      let board = {...state.players[id]};
      if (!input[id].catch) board = {...board,holdMs:0,needsRelease:false};
      else if (!board.needsRelease && zones[id] === circuitTarget(board)) {
        board.holdMs += delta;
        if (board.holdMs >= HOLD_MS) {
          nextPlayers[id] = earn(nextPlayers[id],100);
          event(id,'connect',100);
          board = {...board,holdMs:0,connected:board.connected+1,needsRelease:true};
          if (board.connected === 3) {
            nextPlayers[id] = {...nextPlayers[id],score:nextPlayers[id].score+200};
            event(id,'circuit',200);
            board = {...board,connected:0,completed:board.completed+1};
          }
        }
      } else board = {...board,holdMs:0};
      boards[id] = board;
    }
    nextState = freezeState({...state,players:boards});
  } else {
    const cores = {...state.players};
    // Split a step that straddles safe/overload or a valve cycle boundary.
    // Apply the observed input to both portions, never to earlier scene steps.
    let elapsed = state.elapsedMs;
    let remaining = delta;
    while (remaining > 0) {
      const cycle = cycleAt(elapsed);
      const overload = overloadedAt(elapsed);
      const boundary = cycle*CYCLE_MS + (overload ? CYCLE_MS : SAFE_MS);
      const segment = Math.min(remaining,boundary-elapsed);
      const target = valveAt(elapsed);
      for (const id of activePlayers(state.mode)) {
        let core = {...cores[id]};
        if (!input[id].catch) core.needsRelease = false;
        const activating = input[id].catch && !core.needsRelease && zones[id] === target;
        const cooling = activating && !overload;
        core.heat = Math.min(100,Math.max(0,core.heat + segment/1000 * (4 + (cooling ? -18 : activating && overload ? 16 : 0))));
        if (cooling) {
          core.pulseMs += segment;
          if (core.pulseMs >= HOLD_MS) {
            core.pulseMs -= HOLD_MS;
            core.completed++;
            nextPlayers[id] = earn(nextPlayers[id],100);
            event(id,'cool',100);
          }
        } else core.pulseMs = 0;
        if (activating && overload && core.penaltyCycle !== cycle) {
          core.penaltyCycle = cycle;
          const score = Math.max(0,nextPlayers[id].score-50);
          event(id,'overload',score-nextPlayers[id].score);
          nextPlayers[id] = {...nextPlayers[id],score,combo:0};
        }
        cores[id] = core;
      }
      elapsed += segment;
      remaining -= segment;
      if (elapsed === boundary) {
        for (const id of activePlayers(state.mode)) cores[id] = {...cores[id],pulseMs:0};
      }
    }
    nextState = freezeState({...state,elapsedMs:elapsed,players:cores});
  }
  Object.freeze(nextPlayers.p1);
  Object.freeze(nextPlayers.p2);
  return Object.freeze({state:nextState,players:Object.freeze(nextPlayers),events:Object.freeze(events)});
}

export function getChallengeView(state: ChallengeState, player: PlayerId): ChallengeView {
  if (state.roundId === 'duo-circuit') {
    const board = state.players[player];
    return Object.freeze({targetZone:circuitTarget(board),progress:board.holdMs/HOLD_MS,
      overload:false,completed:board.completed,connected:board.connected,needsRelease:board.needsRelease});
  }
  const core = state.players[player];
  return Object.freeze({targetZone:valveAt(state.elapsedMs),progress:core.pulseMs/HOLD_MS,
    heat:core.heat,overload:overloadedAt(state.elapsedMs),completed:core.completed,needsRelease:core.needsRelease});
}
