import {getCoachingText} from './feedback';
import { campaignTotals, getCampaignRound, ROUND_DEFINITIONS, type CampaignState } from './campaign';
import { getChallengeView, type ChallengeState } from './challenges';
import type { PlayerId } from './core';
const el = (id:string) => document.getElementById(id)!;
const steps: Record<string,string[]> = {
 'energy-catch':['Move under cyan energy.','Hold activation to catch: +100.','Avoid coral hazards: −50.'],
 'duo-circuit':['Move to the lit socket.','Hold activation for one second: +100.','Release, then move on. Three sockets: +200.'],
 'cool-the-core':['Move to the active valve.','Hold during SAFE to cool and score.','Release during OVERLOAD to avoid −50.']
};
/** DOM presentation only; campaign and challenge engines own all scoring and transitions. */
export class CampaignUi {
 private lastStatus='';
 readonly stopButton = el('stop-camera-intro');
 constructor(onBegin:()=>void) { el('begin-campaign-round').addEventListener('click',onBegin); }
 show(state:CampaignState,ready:boolean,camera:boolean,scheme:string,challenge:ChallengeState|null):void {
  const round=getCampaignRound(state), intro=state.phase==='intro'&&!ready;
  el('round-intro').hidden=!intro;
  el('intro-number').textContent=String(state.roundIndex+1).padStart(2,'0');
  el('intro-art').setAttribute('data-round',round.id);
  el('intro-title').textContent=round.name;
  el('intro-objective').textContent=round.objective;
  el('intro-mode').textContent=(state.mode==='solo'?'SOLO':'CO-OP')+' · ROUND '+(state.roundIndex+1)+' OF 3 · 60 SECONDS';
  const action=camera?(scheme==='H0'?'Pinch to activate; release to stop.':scheme==='P1'?'Raise both arms to activate; lower arms to stop.':'Raise one arm to activate; lower arms to stop.'):'A / D to move · Hold S to activate.'+(state.mode==='co-op'?' P2: ← / → and ↓.':'');
  el('intro-controls').textContent=(camera?'Move by '+(scheme==='H0'?'hand position. ':'torso lean. '):'')+action+' Release once when the round starts.';
  el('intro-steps').replaceChildren(...steps[round.id].map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  this.stopButton.hidden=!camera;
  el('hud-round-label').textContent=(state.roundIndex+1)+'/3 · '+round.name;
  const final=state.phase==='complete';
  el('mission-menu').hidden=!final;
  el('buggy-celebration').hidden=!final;
  el('final-club-logo').hidden=!final;
  el('results-title').textContent=final?'MISSION COMPLETE':'ROUND '+(state.roundIndex+1)+' COMPLETE';
  el('results-round-name').textContent=final?'THREE-ROUND CAMPAIGN':round.name;
  el('results-mode').textContent=(state.mode==='solo'?'SOLO':'CO-OP')+' SCORECARD';
  el('restart-round').textContent=final?'PLAY AGAIN · R / ENTER':'NEXT ROUND · ENTER';
  el('campaign-breakdown').hidden=!final;
  if(final){const body=el('campaign-rows');body.replaceChildren(...state.results.map((r,i)=>{
   const tr=document.createElement('tr');const values=[String(i+1)+' · '+ROUND_DEFINITIONS[i].name,r.players.p1.score.toLocaleString(),...(state.mode==='co-op'?[r.players.p2.score.toLocaleString()]:[]),(r.players.p1.score+(state.mode==='co-op'?r.players.p2.score:0)).toLocaleString()];
   for(const v of values){const td=document.createElement('td');td.textContent=v;tr.append(td);}return tr;
  }));el('breakdown-p2').hidden=state.mode==='solo';
   el('final-best-combo').textContent='BEST COMBO '+campaignTotals(state).bestCombo;
  }
  el('final-best-combo').hidden=!final;
  const heat = final && challenge?.roundId==='cool-the-core'
   ? (state.mode==='solo'?(['p1'] as PlayerId[]):(['p1','p2'] as PlayerId[])).map(id=>id.toUpperCase()+' '+Math.round(getChallengeView(challenge,id).heat!)+'/100').join(' · ') : '';
  el('result-feedback').textContent=final?'FINAL HEAT · '+heat+' · Score unchanged by remaining heat.':'Round saved. Your campaign total: '+campaignTotals(state).team.toLocaleString();
  el('task-status').hidden=round.id==='energy-catch';
  el('energy-rules').hidden=round.id!=='energy-catch';
  el('energy-landmark').hidden=round.id!=='energy-catch'||state.mode!=='solo';
  el('action-feedback-p2').hidden=state.mode==='solo';
 }
 updateStatus(state:CampaignState,challenge:ChallengeState|null,release:Record<PlayerId,boolean>,zones:Record<PlayerId,0|1|2>):void {
  if(!challenge||state.phase!=='playing')return;
  const ids:PlayerId[]=state.mode==='solo'?['p1']:['p1','p2'];
  const text=ids.map(id=>getCoachingText(challenge,id,zones[id],release[id])).join('    /    ');
  if(text===this.lastStatus)return;this.lastStatus=text;el('task-status').textContent=text;
 }
}
