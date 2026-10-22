import type { PlayerId, PlayerStats } from './core.ts';

/** Stable identifiers in campaign order. */
export type RoundId = 'energy-catch' | 'duo-circuit' | 'cool-the-core';
export type CampaignMode = 'solo' | 'co-op';
export type CampaignPhase = 'menu' | 'intro' | 'playing' | 'round-results' | 'complete';
/** Presentation metadata; duration is simulation time and ready timing belongs to the scene. */
export interface RoundDefinition {
  readonly id: RoundId;
  readonly name: string;
  readonly durationMs: number;
  readonly objective: string;
}
/** Detached, frozen scorecards captured exactly once on round completion. */
export interface RoundResult {
  readonly roundId: RoundId;
  readonly players: Readonly<Record<PlayerId, Readonly<PlayerStats>>>;
}
/** roundIndex is zero-based; results contains completed rounds in order. */
export interface CampaignState {
  readonly mode: CampaignMode;
  readonly phase: CampaignPhase;
  readonly roundIndex: number;
  readonly results: readonly RoundResult[];
}
/** Scores exclude inactive P2; bestCombo is the largest completed-round combo. */
export interface CampaignTotals {
  readonly p1: number;
  readonly p2: number;
  readonly team: number;
  readonly bestCombo: number;
}
export const ROUND_DEFINITIONS: readonly RoundDefinition[] = Object.freeze([
  Object.freeze({id:'energy-catch' as const, name:'Energy Catch', durationMs:60_000, objective:'Catch cyan energy and avoid coral hazards.'}),
  Object.freeze({id:'duo-circuit' as const, name:'Duo Circuit', durationMs:60_000, objective:'Hold activation at each lit socket, releasing between connections.'}),
  Object.freeze({id:'cool-the-core' as const, name:'Cool the Core', durationMs:60_000, objective:'Activate the safe valve to cool your core; release during overload.'})
]);

export function createCampaign(mode: CampaignMode): CampaignState {
  return Object.freeze({mode, phase:'menu', roundIndex:0, results:Object.freeze([])});
}
/** Starts from menu, or replays a completed campaign with empty totals. */
export function startCampaign(state: CampaignState): CampaignState {
  if (state.phase !== 'menu' && state.phase !== 'complete') return state;
  return Object.freeze({...createCampaign(state.mode), phase:'intro'});
}
/** Call when the deliberate Start action's 900 ms ready beat has finished. */
export function beginCampaignRound(state: CampaignState): CampaignState {
  return state.phase === 'intro' ? Object.freeze({...state, phase:'playing'}) : state;
}
export function completeCampaignRound(
  state: CampaignState,
  players: Readonly<Record<PlayerId, Readonly<PlayerStats>>>
): CampaignState {
  if (state.phase !== 'playing') return state;
  const snapshot: RoundResult = Object.freeze({
    roundId:getCampaignRound(state).id,
    players:Object.freeze({p1:Object.freeze({...players.p1}), p2:Object.freeze(state.mode === 'solo'
      ? {score:0, combo:0, bestCombo:0} : {...players.p2})})
  });
  return Object.freeze({...state, phase:state.roundIndex === 2 ? 'complete' : 'round-results',
    results:Object.freeze([...state.results, snapshot])});
}
export function continueCampaign(state: CampaignState): CampaignState {
  if (state.phase !== 'round-results') return state;
  return Object.freeze({...state, phase:'intro', roundIndex:state.roundIndex + 1});
}
export function campaignTotals(state: CampaignState): CampaignTotals {
  let p1 = 0, p2 = 0, bestCombo = 0;
  for (const result of state.results) {
    p1 += result.players.p1.score;
    if (state.mode === 'co-op') p2 += result.players.p2.score;
    bestCombo = Math.max(bestCombo, result.players.p1.bestCombo,
      state.mode === 'co-op' ? result.players.p2.bestCombo : 0);
  }
  return Object.freeze({p1,p2,team:p1+p2,bestCombo});
}
export function getCampaignRound(state: CampaignState): RoundDefinition {
  return ROUND_DEFINITIONS[state.roundIndex];
}
