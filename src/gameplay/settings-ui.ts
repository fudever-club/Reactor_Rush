import { DEFAULT_VOLUMES, loadVolumes, saveVolumes, type Volumes } from './game-settings.ts';
export type SessionAction = 'restart' | 'menu';
interface SettingsActions { close:()=>void; volume:(v:Volumes)=>void; preview:()=>void; stopCamera:()=>void; action:(action:SessionAction)=>void; unfinished:()=>boolean; canRestart:()=>boolean }
/** DOM-only controls. The scene owns simulation and session lifecycle. */
export class SettingsUi {
 readonly dialog=document.getElementById('settings-dialog')!;
 private content=document.getElementById('settings-content')!;
 private confirmation=document.getElementById('settings-confirmation')!;
 private toolbar=document.getElementById('session-toolbar')!;
 private home:Node|null=null;
 private returnFocus?:HTMLElement;
 private inertBefore=new Map<HTMLElement,boolean>();
 private pending?:SessionAction;
 volumes=loadVolumes();
 private actions:SettingsActions;
 private listeners=new AbortController();
 constructor(actions:SettingsActions){
  this.actions=actions;
  for(const key of ['master','music','sfx'] as const){
   const slider=document.getElementById('volume-'+key) as HTMLInputElement;
   slider.addEventListener('input',()=>{this.volumes={...this.volumes,[key]:Number(slider.value)};this.applyVolumes();},{signal:this.listeners.signal});
  }
  document.getElementById('settings-close')!.addEventListener('click',actions.close,{signal:this.listeners.signal});
  document.getElementById('settings-defaults')!.addEventListener('click',()=>{this.volumes={...DEFAULT_VOLUMES};this.applyVolumes();},{signal:this.listeners.signal});
  document.getElementById('settings-test-sfx')!.addEventListener('click',actions.preview,{signal:this.listeners.signal});
  document.getElementById('settings-stop-camera')!.addEventListener('click',()=>{actions.stopCamera();this.update(false);},{signal:this.listeners.signal});
  for(const action of ['restart','menu'] as const)document.getElementById('settings-'+action)!.addEventListener('click',()=>this.requestAction(action),{signal:this.listeners.signal});
  document.getElementById('settings-cancel')!.addEventListener('click',()=>this.cancel(),{signal:this.listeners.signal});
  document.getElementById('settings-confirm')!.addEventListener('click',()=>{if(this.pending)actions.action(this.pending);},{signal:this.listeners.signal});
  document.getElementById('fullscreen-toggle')!.addEventListener('click',this.toggleFullscreen,{signal:this.listeners.signal});
  document.addEventListener('fullscreenchange',this.syncFullscreen,{signal:this.listeners.signal});
  window.addEventListener('resize',this.refreshRestart,{signal:this.listeners.signal});
  this.syncFullscreen();this.applyVolumes(false);
 }
 private applyVolumes(persist=true):void{
  for(const key of ['master','music','sfx'] as const){(document.getElementById('volume-'+key) as HTMLInputElement).value=String(this.volumes[key]);document.getElementById('volume-'+key+'-value')!.textContent=this.volumes[key]+'%';}
  if(persist)saveVolumes(this.volumes);this.actions.volume(this.volumes);
 }
 open(paused:boolean,camera:boolean):void{
  this.returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
  this.home=this.toolbar.parentNode;this.dialog.prepend(this.toolbar);
  for(const node of [...document.getElementById('runtime-ui')!.children])if(node instanceof HTMLElement&&node!==this.dialog){this.inertBefore.set(node,node.inert);node.inert=true;}
  this.pending=undefined;this.content.hidden=false;this.confirmation.hidden=true;this.dialog.hidden=false;
  document.getElementById('settings-close')!.textContent=paused?'RESUME · 3, 2, 1':'CLOSE SETTINGS';
  document.getElementById('settings-pause-status')!.textContent=paused?'Mission paused. Resume starts a short ready countdown.':'Adjust your sound and session controls.';
  this.update(camera);document.getElementById('settings-title')!.focus({preventScroll:true});
 }
 close():void{
  this.dialog.hidden=true;this.pending=undefined;if(this.toolbar.parentNode===this.dialog)this.home?.appendChild(this.toolbar);
  for(const [node,inert] of this.inertBefore)node.inert=inert;this.inertBefore.clear();
  if(this.returnFocus?.isConnected&&this.returnFocus.getClientRects().length)this.returnFocus.focus({preventScroll:true});
 }
 private refreshRestart=():void=>{const allowed=this.actions.canRestart();(document.getElementById('settings-restart') as HTMLButtonElement).disabled=!allowed;document.getElementById('settings-start-guard')!.hidden=allowed;};
 update(camera:boolean,enabled?:boolean):void{
  this.refreshRestart();
  (document.getElementById('settings-stop-camera') as HTMLButtonElement).disabled=!camera;
  if(enabled!==undefined)(document.getElementById('settings-test-sfx') as HTMLButtonElement).disabled=!enabled;
  if(!this.dialog.hidden&&(!this.dialog.contains(document.activeElement)||(document.activeElement instanceof HTMLButtonElement&&document.activeElement.disabled)))document.getElementById('settings-title')!.focus({preventScroll:true});
 }
 private requestAction(action:SessionAction):void{
  if(!this.actions.unfinished()){this.actions.action(action);return;}
  this.pending=action;this.content.hidden=true;this.confirmation.hidden=false;
  document.getElementById('settings-confirm-title')!.textContent=action==='restart'?'Restart the whole mission?':'Return to the menu?';
  document.getElementById('settings-confirm-copy')!.textContent=action==='restart'?'All round scores will be cleared. Your selected controls stay connected.':'All round scores will be cleared. Camera and sound will stop.';
  document.getElementById('settings-confirm')!.textContent=action==='restart'?'RESTART MISSION':'RETURN TO MENU';
  document.getElementById('settings-cancel')!.focus();
 }
 private cancel():void{const action=this.pending;this.pending=undefined;this.confirmation.hidden=true;this.content.hidden=false;document.getElementById('settings-'+action)?.focus();}
 handleKey(event:KeyboardEvent):void{
  if(event.code==='Escape'){event.preventDefault();if(this.pending)this.cancel();else this.actions.close();return;}
  if(event.code!=='Tab')return;
  const nodes=[...this.dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')].filter(node=>node.getClientRects().length>0);
  const first=nodes[0],last=nodes[nodes.length-1],active=document.activeElement;
  if(event.shiftKey&&(active===first||!nodes.includes(active as HTMLElement))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&(active===last||!nodes.includes(active as HTMLElement))){event.preventDefault();first?.focus();}
 }
 private syncFullscreen=():void=>{const active=document.fullscreenElement===document.querySelector('.game-frame');const button=document.getElementById('fullscreen-toggle')!;button.textContent=active?'EXIT FULLSCREEN':'FULLSCREEN';button.setAttribute('aria-pressed',String(active));};
 private toggleFullscreen=async():Promise<void>=>{
  const status=document.getElementById('fullscreen-status')!;const frame=document.querySelector<HTMLElement>('.game-frame')!;
  try {if(document.fullscreenElement===frame)await document.exitFullscreen();else if(typeof frame.requestFullscreen==='function'&&document.fullscreenEnabled!==false)await frame.requestFullscreen();else{status.textContent='Fullscreen is unavailable in this browser.';return;}status.textContent='';}
  catch{status.textContent='Fullscreen could not open. You can keep playing in this window.';}
  this.syncFullscreen();
 };
 dispose():void{this.listeners.abort();document.removeEventListener('fullscreenchange',this.syncFullscreen);document.getElementById('fullscreen-toggle')?.removeEventListener('click',this.toggleFullscreen);}
}
