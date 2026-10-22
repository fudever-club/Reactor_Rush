import assert from 'node:assert/strict';
import test from 'node:test';
import { createCampaign, startCampaign, beginCampaignRound, completeCampaignRound, continueCampaign, campaignTotals, getCampaignRound } from '../src/gameplay/campaign.ts';

const scores = (a = 100, b = 200, combo = 3) => ({ p1: {score:a, combo, bestCombo:combo}, p2: {score:b, combo:2, bestCombo:2} });
const playing = mode => beginCampaignRound(startCampaign(createCampaign(mode)));

test('campaign requires deliberate intro and result actions in round order', () => {
  let state = createCampaign('co-op');
  assert.equal(state.phase, 'menu');
  state = startCampaign(state);
  assert.equal(state.phase, 'intro');
  assert.equal(getCampaignRound(state).id, 'energy-catch');
  assert.equal(getCampaignRound(state).durationMs, 60000);
  state = completeCampaignRound(beginCampaignRound(state), scores());
  assert.equal(state.phase, 'round-results');
  state = continueCampaign(state);
  assert.equal(state.phase, 'intro');
  assert.equal(getCampaignRound(state).id, 'duo-circuit');
  state = continueCampaign(completeCampaignRound(beginCampaignRound(state), scores()));
  assert.equal(getCampaignRound(state).id, 'cool-the-core');
  state = completeCampaignRound(beginCampaignRound(state), scores());
  assert.equal(state.phase, 'complete');
  assert.deepEqual(state.results.map(r=>r.roundId), ['energy-catch','duo-circuit','cool-the-core']);
});

test('wrong-phase and repeated actions preserve object identity and cannot skip screens or duplicate results', () => {
  const menu = createCampaign('solo');
  assert.equal(beginCampaignRound(menu), menu);
  assert.equal(completeCampaignRound(menu, scores()), menu);
  assert.equal(continueCampaign(menu), menu);
  const intro = startCampaign(menu);
  assert.equal(startCampaign(intro), intro);
  assert.equal(completeCampaignRound(intro, scores()), intro);
  assert.equal(continueCampaign(intro), intro);
  const active = beginCampaignRound(intro);
  assert.equal(beginCampaignRound(active), active);
  assert.equal(startCampaign(active), active);
  assert.equal(continueCampaign(active), active);
  const result = completeCampaignRound(active, scores());
  assert.equal(completeCampaignRound(result, scores()), result);
  assert.equal(beginCampaignRound(result), result);
  assert.equal(startCampaign(result), result);
});

test('round snapshots and returned totals cannot mutate live or completed scores', () => {
  const players = scores();
  const state = completeCampaignRound(playing('co-op'), players);
  players.p1.score = 999;
  assert.equal(state.results[0].players.p1.score, 100);
  assert.notEqual(state.results[0].players.p2, players.p2);
  assert.throws(()=> {state.results[0].players.p1.score=7;}, TypeError);
  assert.throws(()=> {state.results.push(state.results[0]);}, TypeError);
  assert.deepEqual(campaignTotals(state), {p1:100,p2:200,team:300,bestCombo:3});
});

test('totals aggregate each completed round once and best combo takes maximum', () => {
  let state = completeCampaignRound(playing('co-op'), scores(100,200,7));
  state = completeCampaignRound(beginCampaignRound(continueCampaign(state)), scores(300,400,4));
  state = completeCampaignRound(beginCampaignRound(continueCampaign(state)), scores(500,600,9));
  assert.deepEqual(campaignTotals(state), {p1:900,p2:1200,team:2100,bestCombo:9});
  assert.equal(continueCampaign(state), state);
  assert.equal(completeCampaignRound(state, scores()), state);
});

test('solo excludes P2 from snapshots and totals and replay clears every round', () => {
  let state = playing('solo');
  for (let i=0;i<3;i++) {
    state = completeCampaignRound(state, scores(100,9000,3));
    if(i<2) state=beginCampaignRound(continueCampaign(state));
  }
  assert.deepEqual(campaignTotals(state), {p1:300,p2:0,team:300,bestCombo:3});
  assert.deepEqual(state.results[0].players.p2, {score:0,combo:0,bestCombo:0});
  const replay = startCampaign(state);
  assert.equal(replay.phase, 'intro');
  assert.equal(replay.mode, 'solo');
  assert.equal(getCampaignRound(replay).id, 'energy-catch');
  assert.deepEqual(replay.results, []);
  assert.deepEqual(campaignTotals(replay), {p1:0,p2:0,team:0,bestCombo:0});
});
