/** Synthetic video/fake worker only; never physical or real-SDK evidence. */
export function syntheticCamera({fakeBitmaps=false,cameraDelayMs=0}={}){
  if(fakeBitmaps)window.createImageBitmap=async()=>({close(){}});
  const state=window.__RR_FIXTURE__={cameraCalls:0,workers:[],streams:[],scenario:'normal',catching:false};
  navigator.mediaDevices.getUserMedia=async()=>{
    state.cameraCalls++;
    if(cameraDelayMs)await new Promise(resolve=>setTimeout(resolve,cameraDelayMs));
    if(state.scenario==='denied')throw new DOMException('fixture permission rejection','NotAllowedError');
    const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');
    let n=0;const tick=setInterval(()=>{ctx.fillStyle=n++%2?'#182640':'#21314c';ctx.fillRect(0,0,640,360);ctx.fillStyle='#aeb7d2';ctx.font='24px sans-serif';ctx.fillText('SYNTHETIC CAMERA — NO PEOPLE',25,180);},40);
    const stream=c.captureStream(24);state.streams.push(stream);stream.getTracks()[0].addEventListener('ended',()=>clearInterval(tick));return stream;
  };
  const pose=(x)=>{const lm=Array.from({length:33},()=>({x,y:.5,z:0,visibility:.95,presence:.95}));lm[11].x=x-.08;lm[12].x=x+.08;lm[11].y=lm[12].y=.4;lm[15].y=lm[16].y=state.catching?.2:.6;return {landmarks:lm};};
  const hand=(x)=>{const lm=Array.from({length:21},()=>({x,y:.5,z:0}));lm[4].x=x+.02;lm[5].x=x+.04;lm[8].x=x+.084;lm[9].y=.46;lm[17].x=x-.04;return lm;};
  window.Worker=class extends EventTarget{
    constructor(url){super();this.pose=String(url).includes('pose-landmarker');this.active=true;state.workers.push(this);}
    postMessage(m){if(m.type==='init'){setTimeout(()=>this.active&&this.dispatchEvent(new MessageEvent('message',{data:{type:'ready',delegate:'CPU'}})),5);return;}
      if(m.type!=='frame')return;m.bitmap.close();if(state.scenario==='stall')return;
      const coop=document.querySelector('#camera-mode-coop').classList.contains('active');
      let xs=coop?[.75,.25]:[.5];if(state.scenario==='cross')xs=[.55,.45];if(state.scenario==='extra')xs=[.75,.25,.5];if(state.scenario==='lost')xs=[];
      const data=this.pose?{poses:xs.map(pose)}:{hands:xs.map(hand)};
      setTimeout(()=>this.active&&this.dispatchEvent(new MessageEvent('message',{data:{type:'result',timestamp:m.timestamp,inferenceMs:12,delegate:'CPU',...data}})),5);
    }
    terminate(){this.active=false;}
  };
}
