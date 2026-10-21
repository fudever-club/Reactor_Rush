import { launchBrowser } from './launch.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const [output,base='http://127.0.0.1:5173',modules]=process.argv.slice(2);
if(!output)throw Error('Usage: node tests/browser/pose-sdk-smoke.mjs EVIDENCE_DIR [BASE_URL] [PLAYWRIGHT_NODE_MODULES]');
const require=createRequire(modules?path.join(modules,'package.json'):import.meta.url);
const {chromium}=require('playwright');await fs.mkdir(output,{recursive:true});
const browser=await launchBrowser(chromium);const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'});
const remoteBlocked=[];const requests=[];const logs=[];let result;
await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();remoteBlocked.push(new URL(url).origin);return route.abort();});
const page=await context.newPage();page.on('response',r=>{if(/\.task|\.wasm|wasm.*\.js/.test(r.url()))requests.push({url:r.url(),status:r.status()});});page.on('console',m=>{if(['error','warning'].includes(m.type()))logs.push({level:m.type(),message:m.text()});});
await page.addInitScript(()=>{
 window.__RR_SYNTHETIC_STREAMS__=[];
 window.__RR_SDK_TRACE__=[];
 const NativeWorker=window.Worker;
 window.Worker=class extends NativeWorker {
   constructor(...args){super(...args);this.addEventListener('message',event=>{
     const m=event.data;
     window.__RR_SDK_TRACE__.push({type:m.type,at:performance.now(),delegate:m.delegate,
       inferenceMs:m.inferenceMs,captureAgeMs:m.type==='result'?performance.now()-m.timestamp:undefined,message:m.message});
   });}
   postMessage(message,...args){
     if(message.type==='init')window.__RR_SDK_TRACE__.push({type:'init',at:performance.now(),delegate:message.delegate});
     return super.postMessage(message,...args);
   }
 };

 navigator.mediaDevices.getUserMedia=async()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');let n=0;
 setInterval(()=>{ctx.fillStyle=n++%2?'#182640':'#21314c';ctx.fillRect(0,0,640,360);ctx.fillStyle='#aeb7d2';ctx.font='24px sans-serif';ctx.fillText('SYNTHETIC VIDEO — NO PEOPLE',30,180);},40);
 const stream=canvas.captureStream(24);window.__RR_SYNTHETIC_STREAMS__.push(stream);return stream;};
});
try{await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);await page.locator('#choose-camera').click();await page.locator('#camera-mode-coop').click();await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();
 await page.waitForFunction(()=>{const a=window.__RR_GAME_TEST__.getState().cameraAdapter;return a?.currentStatus==='ready'&&a.getMetrics().fps>0;},null,{timeout:45000});
 const state=await page.evaluate(()=>{const a=window.__RR_GAME_TEST__.getState().cameraAdapter;return {status:a.currentStatus,message:document.querySelector('#camera-status').textContent,metrics:a.getMetrics()};});
 assert.equal(state.status,'ready');assert.ok(state.metrics.inferenceMs>0);assert.ok(requests.some(r=>r.url.endsWith('pose_landmarker_lite.task')&&r.status===200));assert.ok(requests.some(r=>r.url.endsWith('.wasm')&&r.status===200));
 await page.screenshot({path:path.join(output,'pose-sdk-ready.png')});await page.locator('#camera-to-keyboard').click();assert.equal(await page.evaluate(()=>window.__RR_SYNTHETIC_STREAMS__.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),true);
 result={status:'PASS',method:'real SDK/model/WASM; synthetic video, remote origins blocked; no people or real webcam',browser:browser.version(),state,trace:await page.evaluate(()=>window.__RR_SDK_TRACE__),requests,remoteBlocked,logs,limitations:['not target hardware','not actual disconnected Wi-Fi test','no tracking accuracy/latency certification']};
}catch(error){result={status:'FAIL',error:error.stack,state:await page.evaluate(()=>({status:document.querySelector('#camera-status')?.textContent,metrics:window.__RR_GAME_TEST__?.getState().cameraAdapter?.getMetrics(),trace:window.__RR_SDK_TRACE__})).catch(()=>null),requests,remoteBlocked,logs};throw error;}
finally{await fs.writeFile(path.join(output,'pose-sdk-results.json'),JSON.stringify(result,null,2));await browser.close();}
console.log(JSON.stringify({status:result.status,state:result.state,remoteBlocked:result.remoteBlocked},null,2));
