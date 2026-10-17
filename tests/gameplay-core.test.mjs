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

test('restart frame overflow advances the new round by the leftover time', () => {
  const createGameState = api('createGameState');
  const requestRestart = api('requestRestart');
  const advanceGameFrame = api('advanceGameFrame');
  const results = { ...createGameState(1000), phase: 'results' };
  const restarting = requestRestart(results);

  const state = advanceGameFrame(restarting, restarting.restartRemainingMs + 250);

  assert.equal(state.phase, 'playing');
  assert.equal(state.timeRemainingMs, 750);
});

test('non-finite restart time cannot stall the frame simulation', () => {
  const createGameState = api('createGameState');
  const advanceGameFrame = api('advanceGameFrame');
  const slices = [];
  const restarting = { ...createGameState(1000), phase: 'restart', restartRemainingMs: Number.POSITIVE_INFINITY };

  const state = advanceGameFrame(restarting, 125, (current, deltaMs) => {
    slices.push(deltaMs);
    return current;
  });

  assert.deepEqual(slices, [50, 25, 50]);
  assert.equal(state.phase, 'playing');
  assert.equal(state.timeRemainingMs, 875);
});

test('non-finite playing time ends the malformed round instead of stalling', () => {
  const createGameState = api('createGameState');
  const advanceGameFrame = api('advanceGameFrame');

  for (const timeRemainingMs of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const malformed = { ...createGameState(1000), phase: 'playing', timeRemainingMs };
    const state = advanceGameFrame(malformed, 125);
    assert.equal(state.phase, 'results');
    assert.equal(state.timeRemainingMs, 0);
  }
});

test('frame simulation processes a valid catch before the final timer transition', () => {
  const createGameState = api('createGameState');
  const startGame = api('startGame');
  const advanceGameFrame = api('advanceGameFrame');
  const applyCatch = api('applyCatch');
  const hasTimeAfterStep = api('hasTimeAfterStep');
  const slices = [];
  const playing = startGame(createGameState(25));

  assert.equal(hasTimeAfterStep(playing, 24), true);
  assert.equal(hasTimeAfterStep(playing, 25), false);
  assert.equal(hasTimeAfterStep({ ...playing, phase: 'results' }, 1), false);

  const state = advanceGameFrame(playing, 100, (current, deltaMs) => {
    slices.push(deltaMs);
    return applyCatch(current, 'p1', 'energy');
  });

  assert.deepEqual(slices, [25]);
  assert.equal(state.phase, 'results');
  assert.equal(state.timeRemainingMs, 0);
  assert.deepEqual(state.players.p1, { score: 100, combo: 1, bestCombo: 1 });
});

test('frame simulation consumes the full elapsed time in bounded playing slices', () => {
  const createGameState = api('createGameState');
  const startGame = api('startGame');
  const advanceGameFrame = api('advanceGameFrame');
  const slices = [];

  const state = advanceGameFrame(startGame(createGameState(1000)), 125, (current, deltaMs, elapsedMs) => {
    slices.push({ deltaMs, elapsedMs });
    return current;
  });

  assert.deepEqual(slices, [
    { deltaMs: 50, elapsedMs: 0 },
    { deltaMs: 25, elapsedMs: 50 },
    { deltaMs: 50, elapsedMs: 75 }
  ]);
  assert.equal(slices.reduce((sum, step) => sum + step.deltaMs, 0), 125);
  assert.equal(state.timeRemainingMs, 875);
});

test('fresh input applies only to the tail of a catch-up frame', () => {
  const isCurrentInputStep = api('isCurrentInputStep');
  const steps = Array.from({ length: 20 }, (_, index) => isCurrentInputStep(index * 50, 50, 1000));
  assert.equal(steps.filter(Boolean).length, 1);
  assert.equal(steps.at(-1), true);
  assert.equal(isCurrentInputStep(50, 49, 149), false);
  assert.equal(isCurrentInputStep(99, 50, 149), true);
  assert.equal(isCurrentInputStep(0, 25, 25), true);
  assert.equal(isCurrentInputStep(0, 10, 1000), false);
});

test('catch-up simulation splits a slice exactly at the fresh-input boundary', () => {
  const createGameState = api('createGameState');
  const startGame = api('startGame');
  const advanceGameFrame = api('advanceGameFrame');
  const slices = [];

  advanceGameFrame(startGame(createGameState(1000)), 149, (state, deltaMs, elapsedMs) => {
    slices.push({ deltaMs, elapsedMs });
    return state;
  });

  assert.deepEqual(slices, [
    { deltaMs: 50, elapsedMs: 0 },
    { deltaMs: 49, elapsedMs: 50 },
    { deltaMs: 50, elapsedMs: 99 }
  ]);
});

test('swept collision detects catch-band crossings at either edge', () => {
  const crossesVerticalBand = api('crossesVerticalBand');
  assert.equal(crossesVerticalBand(614, 628, 515, 615), true);
  assert.equal(crossesVerticalBand(510, 523, 515, 615), true);
  assert.equal(crossesVerticalBand(620, 634, 515, 615), false);
  assert.equal(crossesVerticalBand(Number.NaN, 600, 515, 615), false);
});

test('catch collision requires held input, vertical overlap, and horizontal reach', () => {
  const canCatchFallingItem = api('canCatchFallingItem');
  assert.equal(canCatchFallingItem(true, 614, 628, 350, 400, 0, 95, 565, 515, 615, 68), true);
  assert.equal(canCatchFallingItem(false, 614, 628, 350, 350, 0, 95, 565, 515, 615, 68), false);
  assert.equal(canCatchFallingItem(true, 620, 634, 350, 350, 0, 95, 565, 515, 615, 68), false);
  assert.equal(canCatchFallingItem(true, 614, 628, 500, 350, 0, 95, 565, 515, 615, 68), false);
});

test('catch collision requires horizontal reach during the vertical overlap interval', () => {
  const canCatchFallingItem = api('canCatchFallingItem');

  assert.equal(canCatchFallingItem(true, 614, 627.75, 350, 430, -19.5, 95, 565, 515, 615, 68), false);
  assert.equal(canCatchFallingItem(true, 614, 627.75, 350, 419, -19.5, 95, 565, 515, 615, 68), true);
});

test('invalid round durations fall back to the default duration', () => {
  const createGameState = api('createGameState');

  for (const duration of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const state = createGameState(duration);
    assert.equal(state.durationMs, core.DEFAULT_ROUND_MS);
    assert.equal(state.timeRemainingMs, core.DEFAULT_ROUND_MS);
  }
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
