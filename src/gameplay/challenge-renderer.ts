import Phaser from 'phaser';
import {getChallengeView,type ChallengeState} from './challenges';
import {getCoolingPhase} from './feedback';
import type {PlayerId} from './core';
/** Presentation only. Static apparatus and reusable labels stay allocated between frames. */
export class ChallengeRenderer {
 private background:Phaser.GameObjects.Graphics;
 private graphics:Phaser.GameObjects.Graphics;
 private labels=new Map<string,Phaser.GameObjects.Text>();
 private signature='';private staticSignature='';
 constructor(private scene:Phaser.Scene){this.background=scene.add.graphics().setDepth(.1);this.graphics=scene.add.graphics().setDepth(.2);}
 render(state:ChallengeState|null,solo:boolean):void{
  const staticSignature=JSON.stringify([state?.roundId,solo]);
  if(staticSignature!==this.staticSignature){this.staticSignature=staticSignature;this.drawApparatus(state,solo);}
  const signature=JSON.stringify([state?.roundId,solo,...(state?(['p1','p2'] as const).map(id=>{const view=getChallengeView(state,id);return {...view,progress:Math.floor(view.progress*25),heat:view.heat===undefined?undefined:Math.round(view.heat)};}):[]),state?.roundId==='cool-the-core'?getCoolingPhase(state.elapsedMs):null]);
  if(signature===this.signature)return;this.signature=signature;this.graphics.clear();for(const label of this.labels.values())label.setVisible(false);if(!state)return;
  const g=this.graphics;
  const text=(key:string,x:number,y:number,value:string,size=20,color='#F4F3EE')=>{let label=this.labels.get(key);if(!label){label=this.scene.add.text(x,y,value,{fontFamily:'Segoe UI, system-ui, sans-serif',fontSize:size+'px',fontStyle:'bold',color}).setOrigin(.5).setDepth(.3);this.labels.set(key,label);}label.setVisible(true).setPosition(x,y).setText(value).setFontSize(size).setColor(color);};
  for(const id of (solo?['p1']:['p1','p2']) as PlayerId[]){
   const view=getChallengeView(state,id),offset=id==='p1'?0:620,color=id==='p1'?0x55dfff:0xff70b2;
   if(state.roundId==='cool-the-core'){
    const phase=getCoolingPhase(state.elapsedMs);
    g.fillStyle(0x10142c);g.fillRoundedRect(105+offset,211,450,32,4);
    text(id+'heading',330+offset,227,(view.overload?'OVERLOAD · RELEASE':'SAFE · COOL')+'  '+phase.seconds+'s  ·  HEAT '+Math.round(view.heat!),19,view.overload?'#FFB0B8':'#C9F6FF');
    g.fillStyle(0x303c59);g.fillRect(115+offset,254,430,9);g.fillStyle(view.overload?0xff6574:color);g.fillRect(115+offset,254,430*view.heat!/100,9);
   }else text(id+'heading',330+offset,230,'CIRCUITS '+view.completed+'  ·  SOCKETS '+view.connected+'/3',23);
   [173,330,487].forEach((center,zone)=>{
    const x=center+offset,active=zone===view.targetZone,accent=active?(view.overload?0xff6574:color):0x39486a;
    if(state.roundId==='duo-circuit'){
     g.fillStyle(0x10142c);g.fillRoundedRect(x-34,296,68,68,8);g.lineStyle(active?4:2,active?0xf4f3ee:0x66789c);g.strokeRoundedRect(x-34,296,68,68,8);
     g.fillStyle(accent);g.fillRoundedRect(x-25,305,50,50,4);
     for(const dx of [-18,0,18]){g.lineStyle(3,0x66789c);g.lineBetween(x+dx,289,x+dx,296);g.lineBetween(x+dx,364,x+dx,371);}
    }else{
     g.fillStyle(0x10142c);g.fillCircle(x,330,37);g.lineStyle(active?7:4,accent);g.strokeCircle(x,330,32);
     g.lineStyle(4,accent);g.lineBetween(x-26,330,x+26,330);g.lineBetween(x,304,x,356);g.fillStyle(active?0xf4f3ee:0x74809d);g.fillCircle(x,330,16);
    }
    text(id+'zone'+zone,x,330,active&&view.overload?'!':String(zone+1),20,active?'#10142C':'#F4F3EE');
    text(id+'direction'+zone,x,395,['LEFT','MIDDLE','RIGHT'][zone],15,active?'#F4F3EE':'#AEB7D2');
    g.lineStyle(active?3:1,active?color:0x303c59,active?.55:.35);g.lineBetween(x,443,x,609);
   });
   g.fillStyle(0x303c59);g.fillRoundedRect(130+offset,419,400,10,5);g.fillStyle(color);g.fillRoundedRect(130+offset,419,Math.max(1,400*view.progress),10,5);
  }
  if(solo){text('solo-title',930,220,state.roundId==='duo-circuit'?'RELAY ARRAY':'COOLING SYSTEM',26,'#C0C9E1');text('solo-description',930,454,state.roundId==='duo-circuit'?'Three connections. Complete the circuit.':'Open the valve. Watch the phase.',18,'#C0C9E1');text('solo-player',930,489,'SOLO · P1 CYAN',16,'#55DFFF');}
 }
 private drawApparatus(state:ChallengeState|null,solo:boolean):void{
  const g=this.background;g.clear();if(!state)return;
  for(const offset of solo?[0]:[0,620]){
   if(state.roundId==='duo-circuit'){
    g.fillStyle(0x17243c);g.fillRoundedRect(93+offset,201,474,177,12);g.lineStyle(2,0x4b627e);g.strokeRoundedRect(93+offset,201,474,177,12);
    g.lineStyle(9,0x303c59);g.lineBetween(173+offset,330,487+offset,330);g.lineStyle(2,0x66e5ad,.5);g.lineBetween(173+offset,330,487+offset,330);
    for(const x of [106,554])for(const y of [214,365]){g.fillStyle(0x66789c);g.fillCircle(x+offset,y,3);}
   }else{
    g.fillStyle(0x17243c);g.fillRoundedRect(93+offset,202,474,78,8);g.lineStyle(2,0x66789c);g.strokeRoundedRect(93+offset,202,474,78,8);
    for(let x=110;x<558;x+=22){g.fillStyle(0x31566a);g.fillRect(x+offset,209,10,63);}
    g.lineStyle(10,0x31566a);g.lineBetween(173+offset,280,173+offset,294);g.lineBetween(330+offset,280,330+offset,294);g.lineBetween(487+offset,280,487+offset,294);
   }
  }
  if(solo){
   g.fillStyle(0x131e35);g.fillRect(680,178,524,370);
   if(state.roundId==='duo-circuit'){
    g.lineStyle(10,0x39486a);g.lineBetween(808,318,930,318);g.lineBetween(930,318,930,395);g.lineBetween(930,395,1052,395);g.lineBetween(1052,395,1052,280);
    for(const [x,y] of [[808,318],[930,395],[1052,280]]){g.fillStyle(0x252b47);g.fillRoundedRect(x-29,y-29,58,58,7);g.lineStyle(3,0x66e5ad);g.strokeRoundedRect(x-29,y-29,58,58,7);g.fillStyle(0x66e5ad);g.fillCircle(x,y,8);}
   }else{
    g.fillStyle(0x252b47);g.fillRoundedRect(790,276,230,139,8);g.lineStyle(3,0x66789c);g.strokeRoundedRect(790,276,230,139,8);for(let x=805;x<1010;x+=24){g.fillStyle(0x31566a);g.fillRect(x,289,12,113);}
    g.lineStyle(11,0x31566a);g.lineBetween(1025,310,1080,310);g.lineBetween(1080,310,1080,390);g.lineStyle(6,0x66e5ad);g.strokeCircle(1080,310,28);g.lineBetween(1052,310,1108,310);g.lineBetween(1080,282,1080,338);
   }
  }
 }
}
