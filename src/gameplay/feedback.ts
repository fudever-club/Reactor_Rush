import {getChallengeView, type ChallengeState, type ChallengeEvent, type Zone} from './challenges.ts';
import type {PlayerId} from './core.ts';
export type SoundCue='energy'|'hazard'|'connect'|'circuit'|'cool'|'overload'|'complete';
export interface FeedbackMessage {player:PlayerId; text:string; cue:SoundCue; points:number}
const zones=['LEFT','MIDDLE','RIGHT'];
export function getCoolingPhase(elapsedMs:number):{overload:boolean;seconds:number}{
 const phase=Math.max(0,Number.isFinite(elapsedMs)?elapsedMs:0)%6000;
 return {overload:phase>=4000,seconds:Math.ceil(((phase>=4000?6000:4000)-phase)/1000)};
}
export function getCoachingText(state:ChallengeState,player:PlayerId,currentZone:Zone,releaseSeen:boolean):string {
 const view=getChallengeView(state,player),prefix=player.toUpperCase()+': ';
 if(!releaseSeen||view.needsRelease)return prefix+'RELEASE TO ARM';
 const phase=state.roundId==='cool-the-core'?getCoolingPhase(state.elapsedMs):null;
 if(phase?.overload)return prefix+'OVERLOAD — RELEASE / WAIT '+phase.seconds+'s';
 const action=currentZone!==view.targetZone?'MOVE TO '+zones[view.targetZone]:'HOLD '+Math.floor(view.progress*100)+'%';
 return prefix+action+(phase?' · SAFE '+phase.seconds+'s · HEAT '+Math.round(view.heat!):' · '+view.connected+'/3 · CIRCUITS '+view.completed);
}
function pointsLabel(points:number):string{return points>0?'+'+points:points<0?'−'+Math.abs(points):'NO POINTS LOST';}
export function presentChallengeEvents(events:readonly ChallengeEvent[]):FeedbackMessage[]{
 const messages:FeedbackMessage[]=[];
 for(const player of ['p1','p2'] as const){
  const batch=events.filter(event=>event.player===player);if(!batch.length)continue;
  const kind=batch.some(event=>event.kind==='circuit')?'circuit':batch.some(event=>event.kind==='overload')?'overload':batch[0].kind;
  const points=batch.reduce((total,event)=>total+event.points,0);
  const title={connect:'SOCKET CONNECTED',circuit:'CIRCUIT COMPLETE',cool:'COOLING PULSE',overload:'OVERLOAD'}[kind];
  messages.push({player,points,cue:kind,text:player.toUpperCase()+' · '+title+' · '+pointsLabel(points)});
 }
 return messages;
}
export function presentCatch(player:PlayerId,kind:'energy'|'hazard',points:number):FeedbackMessage {
 return {player,points,cue:kind,text:player.toUpperCase()+' · '+(kind==='energy'?'ENERGY CAUGHT':'HAZARD')+' · '+pointsLabel(points)};
}
export function getPlayfieldLabel(roundName:string,solo:boolean,camera:boolean,scheme:string):string{
 const controls=camera?(scheme==='H0'?'Move by hand position; pinch to activate and release to stop.':scheme==='P1'?'Lean to move; raise both arms to activate and lower arms to stop.':'Lean to move; raise one arm to activate and lower arms to stop.'):'P1 uses A and D to move and holds S to activate.'+(!solo?' P2 uses Left and Right to move and holds Down to activate.':'');
 return 'Reactor Rush — '+roundName+' playfield. '+(solo?'Solo. ':'Co-op. ')+controls;
}
