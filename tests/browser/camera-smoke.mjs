import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const output = process.argv[2];
if (!output) throw Error('Usage: node tests/browser/camera-smoke.mjs ABSOLUTE_EVIDENCE_DIR [BASE_URL]. Set RR_BROWSER_NODE_MODULES to an existing directory containing Playwright; no project dependency is added.');
const base = process.argv[3] || 'http://127.0.0.1:5173';
const modules = process.argv[4] || process.env.RR_BROWSER_NODE_MODULES;
const require = createRequire(modules ? path.join(modules,'package.json') : import.meta.url);
const { chromium } = require('playwright');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
function fixture(){
  const state=window.__RR_FIXTURE__={cameraCalls:0,workers:[],streams:[],scenario:'normal',catching:false};
  navigator.mediaDevices.getUserMedia=async()=>{
    state.cameraCalls++;
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
const schemeSelector={H0:'#scheme-hand',P1:'#scheme-pose-both',P2:'#scheme-pose-one'};
async function open(width,height){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(fixture);await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);
  assert.equal(await page.evaluate(()=>window.__RR_FIXTURE__.cameraCalls),0);
  return {page,errors};
}
async function startCamera(page,scheme,coop){
  await page.locator('#choose-camera').click();if(coop)await page.locator('#camera-mode-coop').click();
  await page.locator(schemeSelector[scheme]).click();await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();
  await page.waitForFunction(()=>!document.querySelector('#calibrate-camera').disabled);await page.locator('#calibrate-camera').click();
  await page.waitForFunction(()=>!document.querySelector('#start-camera-round').disabled);await page.locator('#start-camera-round').click();
  await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');
}
try{
  for(const [width,height] of [[1280,720],[1920,1080]]){
    for(const scheme of ['H0','P1','P2']){
      const {page,errors}=await open(width,height);await startCamera(page,scheme,true);
      const want=scheme==='H0'?'PINCH':scheme==='P1'?'BOTH ARMS':'ONE ARM';assert.match(await page.locator('#hud-controls-hint').textContent(),new RegExp(want));
      const geometry=await page.evaluate(()=>{const c=document.querySelector('#game-container').getBoundingClientRect();const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {left:(r.left-c.left)*1280/c.width,right:(r.right-c.left)*1280/c.width,top:(r.top-c.top)*720/c.height,bottom:(r.bottom-c.top)*720/c.height};};return {dock:rect('#hud-camera-dock'),clock:rect('.hud-clock'),stop:rect('#stop-camera'),cue:rect('#hud-camera-cue'),video:rect('#hud-camera-preview'),overlay:rect('#hud-skeleton-overlay')};});
      assert.ok(geometry.dock.left>=571&&geometry.dock.right<=709,JSON.stringify(geometry));assert.ok(geometry.dock.top>geometry.clock.bottom);assert.ok(geometry.dock.bottom<515);
      assert.deepEqual(geometry.video,geometry.overlay);assert.ok(geometry.stop.left>=geometry.dock.left&&geometry.stop.right<=geometry.dock.right);
      await page.screenshot({path:path.join(output,scheme+'-'+width+'.png')});
      await page.keyboard.press('v');assert.equal(await page.locator('.hud-camera-preview-frame').isVisible(),false);assert.equal(await page.locator('#hud-camera-cue').isVisible(),true);await page.keyboard.press('v');
      if(scheme!=='H0'){
        // Screenshots can pause this host longer than the safety timeout; explicitly recalibrate if so.
        if(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().recalibrationRequired)){await page.waitForFunction(()=>!document.querySelector('#hud-camera-recalibrate').disabled);await page.locator('#hud-camera-recalibrate').click();}
        await page.evaluate(()=>{window.__RR_FIXTURE__.catching=true;});await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().input.p1.catch);
        await page.evaluate(()=>{window.__RR_FIXTURE__.scenario='cross';});await page.waitForFunction(()=>document.querySelector('#hud-camera-cue').textContent.includes('RECALIBRATE'));
        assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().input.p1.catch),false);
        await page.evaluate(()=>{window.__RR_FIXTURE__.scenario='normal';window.__RR_FIXTURE__.catching=false;});
        await page.waitForFunction(()=>!document.querySelector('#hud-camera-recalibrate').disabled);await page.locator('#hud-camera-recalibrate').click();
        await page.waitForFunction(()=>document.querySelector('#hud-camera-cue').textContent.includes('ACCEPTED IDLE'));
        await page.evaluate(()=>{window.__RR_FIXTURE__.scenario='stall';});await page.waitForFunction(()=>document.querySelector('#hud-camera-cue').textContent.includes('RECALIBRATE'));
        assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().input.p1.catch),false);
      }
      await page.locator('#stop-camera').click();assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().cameraMode),false);
      const x=await page.evaluate(()=>window.__RR_GAME_TEST__.getState().playerX.p1);await page.keyboard.down('a');await page.waitForTimeout(130);await page.keyboard.up('a');assert.ok(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().playerX.p1)<x);
      assert.equal(await page.evaluate(()=>window.__RR_FIXTURE__.workers.filter(w=>w.active).length),0);assert.deepEqual(errors,[]);
      results.push({id:scheme+'-'+width,status:'PASS',geometry,fixture:'synthetic stream + fake worker; no actual inference or field evidence',errors});await page.close();
    }
  }
  for(const scheme of ['H0','P1','P2']){const {page,errors}=await open(1280,720);await startCamera(page,scheme,false);assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().cameraMode),true);await page.locator('#stop-camera').click();assert.deepEqual(errors,[]);results.push({id:scheme+'-solo',status:'PASS'});await page.close();}
  const {page,errors}=await open(1280,720);await page.locator('#choose-camera').click();await page.evaluate(()=>{window.__RR_FIXTURE__.scenario='denied';});await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();await page.waitForFunction(()=>document.querySelector('#camera-status').textContent.includes('denied'));await page.locator('#camera-to-keyboard').click();await page.locator('#start-round').click();assert.deepEqual(errors,[]);results.push({id:'permission-denied-keyboard',status:'PASS'});await page.close();
} catch(error){results.push({status:'FAIL',message:error.stack});throw error;}
finally{await fs.writeFile(path.join(output,'browser-results.json'),JSON.stringify({browser:browser.version(),results},null,2));await browser.close();}
console.log(JSON.stringify(results.map(({id,status})=>({id,status})),null,2));
