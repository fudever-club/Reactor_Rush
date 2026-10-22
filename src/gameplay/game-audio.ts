import { sanitizeVolumes, type Volumes } from './game-settings.ts';
import type {SoundCue} from './feedback.ts';
type ContextFactory=()=>AudioContext|undefined;
export type AudioCue=SoundCue|'select'|'confirm'|'start'|'cameraReady'|'trackingLost'|'trackingRestored';
type MusicTrack='menu'|'energy'|'circuit'|'cooling'|'victory';
export interface AudioAssetOptions {
 music:Partial<Record<MusicTrack,string>>;
 sfx:Partial<Record<AudioCue,string>>;
 createMusic?:()=>HTMLAudioElement;
 load?:(url:string)=>Promise<ArrayBuffer>;
}
const tones:Record<AudioCue,[number,number]>={energy:[660,.12],hazard:[140,.17],connect:[520,.14],circuit:[880,.26],cool:[740,.10],overload:[110,.22],complete:[1040,.35],select:[440,.06],confirm:[620,.12],start:[800,.25],cameraReady:[720,.2],trackingLost:[240,.2],trackingRestored:[600,.2]};
/** Local, explicit-opt-in audio. Scene and tracking signals are presentation only. */
export class GameAudio {
 enabled=false;
 available=true;
 private context?:AudioContext;
 private volumes:Volumes={master:100,music:100,sfx:100};
 private paused=false;
 private envelopes=new Map<AudioScheduledSourceNode,GainNode>();
 private voices=new Map<AudioScheduledSourceNode,GainNode>();
 private buffers=new Map<AudioCue,AudioBuffer>();
 private loading=new Map<AudioCue,Promise<void>>();
 private lastAt=Number.NEGATIVE_INFINITY;
 private generation=0;
 private pending=false;
 private media?:HTMLAudioElement;
 private desired?:MusicTrack;
 private playing?:MusicTrack;
 private scene='';
 private tracking?:boolean;
 private factory:ContextFactory;
 private changed:()=>void;
 private assets?:AudioAssetOptions;
 constructor(factory:ContextFactory=()=>typeof AudioContext==='undefined'?undefined:new AudioContext(),changed:()=>void=()=>{},assets?:AudioAssetOptions){this.factory=factory;this.changed=changed;this.assets=assets;}
 get activeVoiceCount():number{return this.voices.size;}
 async toggle():Promise<void>{
  if(this.enabled||this.pending){this.mute();return;}
  const generation=++this.generation;this.pending=true;
  try{
   this.context??=this.factory();if(!this.context)throw Error('Audio unavailable');
   await this.context.resume();if(generation!==this.generation)return;
   this.enabled=true;this.available=true;
   this.preloadSamples();this.syncMusic();
  }catch{if(generation===this.generation){this.enabled=false;this.available=false;}}
  finally{if(generation===this.generation)this.pending=false;this.changed();}
 }
 setScene(phase:string,round:string):void{
  const before=this.scene;this.scene=phase;
  this.desired=phase==='menu'?'menu':phase==='complete'?'victory':phase==='round-results'?undefined:round==='duo-circuit'?'circuit':round==='cool-the-core'?'cooling':'energy';
  if(this.enabled)this.syncMusic();
  if(phase==='playing'&&before!=='playing')this.present('start');
 }
 updateTracking(ready:boolean):void{
  if(this.tracking===undefined){if(ready)this.tracking=true;return;}
  if(ready!==this.tracking){this.tracking=ready;this.present(ready?'trackingRestored':'trackingLost');}
 }
 resetTracking():void{this.tracking=undefined;}
 setVolumes(values:Volumes):void{
  this.volumes=sanitizeVolumes(values);
  if(this.media)this.media.volume=(this.desired==='victory'?.28:.18)*this.volumes.master*this.volumes.music/10000;
  for(const gain of this.voices.values())gain.gain.setValueAtTime(this.volumes.master*this.volumes.sfx/10000,this.context!.currentTime);
 }
 setPaused(paused:boolean):void{
  if(this.paused===paused)return;this.paused=paused;
  if(paused){for(const voice of [...this.voices.keys()])this.stopVoice(voice);this.media?.pause();}
  else this.syncMusic(true);
 }
 preview(cue:AudioCue='energy'):void{this.playCue(cue,true);}
 present(cue:AudioCue):void{this.playCue(cue,false);}
 private playCue(cue:AudioCue,preview:boolean):void{
  const context=this.context;if(!this.enabled||!context||(!preview&&this.paused)||(!preview&&context.currentTime-this.lastAt<.1))return;
  this.lastAt=context.currentTime;
  try{
   while(this.voices.size>=4)this.stopVoice(this.voices.keys().next().value!);
   const gain=context.createGain(),buffer=this.buffers.get(cue);
   let voice:AudioScheduledSourceNode,duration:number;
   if(buffer){const sample=context.createBufferSource();sample.buffer=buffer;voice=sample;duration=Math.min(.45,buffer.duration);gain.gain.setValueAtTime(.45,context.currentTime);}
   else{const oscillator=context.createOscillator(),tone=tones[cue];oscillator.type=cue==='hazard'||cue==='overload'?'triangle':'sine';oscillator.frequency.setValueAtTime(tone[0],context.currentTime);voice=oscillator;duration=tone[1];gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.055,context.currentTime+.012);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+duration);}
   const volume=context.createGain();volume.gain.setValueAtTime(this.volumes.master*this.volumes.sfx/10000,context.currentTime);
   voice.connect(gain);gain.connect(volume);volume.connect(context.destination);this.voices.set(voice,volume);this.envelopes.set(voice,gain);
   voice.onended=()=>this.releaseVoice(voice);
   voice.start();voice.stop(context.currentTime+Math.min(.45,duration));
  }catch{this.mute();this.available=false;this.changed();}
 }
 mute():void{++this.generation;this.pending=false;this.enabled=false;for(const voice of [...this.voices.keys()])this.stopVoice(voice);this.stopMusic();this.lastAt=Number.NEGATIVE_INFINITY;void this.context?.suspend().catch(()=>{});this.changed();}
 dispose():void{this.mute();void this.context?.close().catch(()=>{});this.context=undefined;this.buffers.clear();this.loading.clear();if(this.media){this.media.removeAttribute?.('src');this.media.load();this.media=undefined;}}
 private preloadSamples():void{
  const context=this.context;if(!context||!this.assets)return;
  for(const [name,url] of Object.entries(this.assets.sfx)){
   const cue=name as AudioCue;if(!url||this.buffers.has(cue)||this.loading.has(cue))continue;
   const load=this.assets.load??(async(url:string)=>{const response=await fetch(url);if(!response.ok)throw Error('Audio download failed');return response.arrayBuffer();});
   const pending=Promise.resolve().then(()=>load(url)).then(data=>context.decodeAudioData(data)).then(buffer=>{if(this.context===context)this.buffers.set(cue,buffer);}).catch(()=>{/* Keep the local synthesized fallback; never queue a delayed cue. */}).finally(()=>this.loading.delete(cue));
   this.loading.set(cue,pending);
  }
 }
 private syncMusic(resuming=false):void{
  if(!this.enabled||this.paused||!this.assets)return;
  const track=this.desired,url=track?this.assets.music[track]:undefined;
  if(!track||!url){this.stopMusic();return;}
  if(this.playing===track){if(resuming)void this.media?.play().catch(()=>{});return;}
  this.stopMusic();
  try{
   this.media??=this.assets.createMusic?.()??new Audio();
   this.media.preload='none';this.media.src=url;this.media.loop=track!=='victory';this.media.volume=(track==='victory'?.28:.18)*this.volumes.master*this.volumes.music/10000;
   this.playing=track;void this.media.play().catch(()=>{/* Music rejection must not disable event feedback. */});
  }catch{this.playing=undefined;}
 }
 private stopMusic():void{if(this.media){this.media.pause();try{this.media.currentTime=0;}catch{/* Not loaded yet. */}}this.playing=undefined;}
 private releaseVoice(voice:AudioScheduledSourceNode):void{const gain=this.voices.get(voice);this.voices.delete(voice);try{voice.disconnect();gain?.disconnect();this.envelopes.get(voice)?.disconnect();this.envelopes.delete(voice);}catch{/* Already disconnected. */}}
 private stopVoice(voice:AudioScheduledSourceNode):void{try{voice.stop();}catch{/* Already ended. */}this.releaseVoice(voice);}
}
