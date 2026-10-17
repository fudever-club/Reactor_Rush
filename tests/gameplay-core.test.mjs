import assert from 'node:assert/strict';
import test from 'node:test';
import * as core from '../src/gameplay/core.ts';

function api(name) {
  assert.equal(typeof core[name], 'function', `gameplay core must export ${name}`);
  return core[name];
}

test('energy scoring raises combo and rewards the fifth consecutive catch', () => {
  const createPlayerStats = api('createPlayerStats');
  const scoreCatch = api('scoreCatch');
  let player = createPlayerStats();
  for (let i = 0; i < 4; i += 1) player = scoreCatch(player, 'energy');
  assert.deepEqual(player, { score: 400, combo: 4, bestCombo: 4 });
  player = scoreCatch(player, 'energy');
  assert.deepEqual(player, { score: 550, combo: 5, bestCombo: 5 });
});

test('hazards subtract points without going below zero and reset only the active combo', () => {
  const scoreCatch = api('scoreCatch');
  let player = { score: 550, combo: 5, bestCombo: 5 };
  player = scoreCatch(player, 'hazard');
  assert.deepEqual(player, { score: 500, combo: 0, bestCombo: 5 });
  player = scoreCatch({ score: 20, combo: 2, bestCombo: 4 }, 'hazard');
  assert.deepEqual(player, { score: 0, combo: 0, bestCombo: 4 });
});

test('round timer advances only during play and ends at exactly zero', () => {
  const createGameState = api('createGameState');
  const startGame = api('startGame');
  const advanceGame = api('advanceGame');
  let state = createGameState(1000);
  assert.equal(advanceGame(state, 400).timeRemainingMs, 1000);
  state = advanceGame(startGame(state), 400);
  assert.equal(state.timeRemainingMs, 600);
  state = advanceGame(state, 900);
  assert.equal(state.phase, 'results');
  assert.equal(state.timeRemainingMs, 0);
});

test('restart clears scores and combo, then returns to play after the ready interval', () => {
  const createGameState = api('createGameState');
  const startGame = api('startGame');
  const advanceGame = api('advanceGame');
  const applyCatch = api('applyCatch');
  const requestRestart = api('requestRestart');
  let state = startGame(createGameState());
  state = applyCatch(state, 'p1', 'energy');
  state = advanceGame(state, 60_000);
  state = requestRestart(state);
  assert.equal(state.phase, 'restart');
  assert.equal(state.timeRemainingMs, 60_000);
  assert.deepEqual(state.players.p1, { score: 0, combo: 0, bestCombo: 0 });
  state = advanceGame(state, state.restartRemainingMs);
  assert.equal(state.phase, 'playing');
});

test('keyboard mapping drives both players independently and cancels opposing directions', () => {
  const mapKeyboardSnapshot = api('mapKeyboardSnapshot');
  assert.deepEqual(mapKeyboardSnapshot({ a: true, d: false, s: true, left: false, right: true, down: false }), {
    p1: { moveAxis: -1, catch: true },
    p2: { moveAxis: 1, catch: false }
  });
  assert.deepEqual(mapKeyboardSnapshot({ a: true, d: true, s: false, left: true, right: true, down: true }), {
    p1: { moveAxis: 0, catch: false },
    p2: { moveAxis: 0, catch: true }
  });
});
