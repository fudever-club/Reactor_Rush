import assert from 'node:assert/strict';
import test from 'node:test';
import { getFallingItemCue } from '../src/gameplay/accessibility-cues.ts';

const baseCue = {
  player: 'p1',
  position: 'left',
  kind: 'energy',
  speed: 200,
  catchMinY: 515,
  catchMaxY: 615,
  leadTimeMs: 1200
};

test('item cue starts within the action lead window and gives lane, side, type, and approximate ETA', () => {
  assert.equal(getFallingItemCue({ ...baseCue, y: 274.9 }), null);
  assert.equal(getFallingItemCue({ ...baseCue, y: 275.1 }), 'P1 left energy in about 1 second');
});

test('item cue describes the catch band and does not imply an item is catchable after it passes', () => {
  assert.equal(getFallingItemCue({ ...baseCue, y: 515 }), 'P1 left energy at catch zone');
  assert.equal(getFallingItemCue({ ...baseCue, y: 615 }), 'P1 left energy at catch zone');
  assert.equal(getFallingItemCue({ ...baseCue, y: 615.01 }), null);
});

test('item cue distinguishes less than one second and supports hazard/player variants', () => {
  assert.equal(getFallingItemCue({ ...baseCue, player: 'p2', position: 'right', kind: 'hazard', y: 435 }), 'P2 right hazard in less than 1 second');
});

test('invalid item motion and cue configuration produce no announcement', () => {
  assert.equal(getFallingItemCue({ ...baseCue, speed: 0, y: 500 }), null);
  assert.equal(getFallingItemCue({ ...baseCue, speed: Number.NaN, y: 500 }), null);
  assert.equal(getFallingItemCue({ ...baseCue, leadTimeMs: -1, y: 500 }), null);
});
