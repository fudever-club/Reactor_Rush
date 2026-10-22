import type {SoundCue} from './feedback.ts';
type ContextFactory=()=>AudioContext|undefined;
const tones:Record<SoundCue,[number,number]>={energy:[660,.12],hazard:[140,.17],connect:[520,.14],circuit:[880,.26],cool:[740,.10],overload:[110,.22],complete:[1040,.35]};
/** Optional, local event sonification. It never interprets input or changes gameplay. */
export class GameAudio {
 enabled=false;
 available=true;
 private context?:AudioContext;
 private factory:ContextFactory;
 private changed:()=>void;
 private voices=new Set<OscillatorNode>();
 private lastAt=Number.NEGATIVE_INFINITY;
 private generation=0;
 private pending=false;
 constructor(factory:ContextFactory=()=>typeof AudioContext==='undefined'?undefined:new AudioContext(),changed:()=>void=()=>{}){this.factory=factory;this.changed=changed;}
 get activeVoiceCount():number{return this.voices.size;}
 async toggle():Promise<void>{
  if(this.enabled||this.pending){this.mute();return;}
  const generation=++this.generation;this.pending=true;
  try{
   this.context??=this.factory();if(!this.context)throw Error('Audio unavailable');
   await this.context.resume();if(generation!==this.generation)return;
   this.enabled=true;this.available=true;
  }catch{if(generation===this.generation){this.enabled=false;this.available=false;}}
  finally{if(generation===this.generation)this.pending=false;this.changed();}
 }
 present(cue:SoundCue):void{
  const context=this.context;if(!this.enabled||!context||context.currentTime-this.lastAt<.1)return;
  this.lastAt=context.currentTime;
  try{
   while(this.voices.size>=4)this.stopVoice(this.voices.values().next().value!);
   const voice=context.createOscillator(),gain=context.createGain(),[frequency,duration]=tones[cue];
   voice.type=cue==='hazard'||cue==='overload'?'triangle':'sine';
   voice.frequency.setValueAtTime(frequency,context.currentTime);
   gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.055,context.currentTime+.012);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+duration);
   voice.connect(gain);gain.connect(context.destination);this.voices.add(voice);
   voice.onended=()=>{this.voices.delete(voice);voice.disconnect();gain.disconnect();};
   voice.start();voice.stop(context.currentTime+Math.min(.45,duration));
  }catch{this.mute();this.available=false;this.changed();}
 }
 mute():void{++this.generation;this.pending=false;this.enabled=false;for(const voice of [...this.voices])this.stopVoice(voice);this.lastAt=Number.NEGATIVE_INFINITY;void this.context?.suspend().catch(()=>{});this.changed();}
 dispose():void{this.mute();void this.context?.close().catch(()=>{});this.context=undefined;}
 private stopVoice(voice:OscillatorNode):void{this.voices.delete(voice);try{voice.stop();voice.disconnect();}catch{/* Already ended. */}}
}
