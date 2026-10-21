/** Real local SDK/model/WASM, forced CPU delegate, generated video without people.
 * Same CLI as pose-performance-benchmark.mjs. Four fresh browsers in A-B-B-A order.
 * Measures setup rendering + actual inference, not full gameplay or body tracking.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {launchBrowser} from './launch.mjs';
const [output,base='http://127.0.0.1:4173',modules]=process.argv.slice(2);
if(!output)throw Error('OUTPUT required');
const require=createRequire(modules?path.join(modules,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const stats=xs=>{const a=[...xs].sort((x,y)=>x-y),q=p=>a.length?a[Math.ceil((a.length-1)*p)]:null;return {n:a.length,p50:q(.5),p95:q(.95),max:q(1)};};
const cg=async()=>{try{return Object.fromEntries((await fs.readFile('/sys/fs/cgroup/cpu.stat','utf8')).trim().split('\n').map(s=>{const [k,v]=s.split(/\s+/);return [k,Number(v)];}));}catch{return null;}};
const result={method:'Actual local SDK/model/WASM; CPU delegate requested explicitly for both renderers; synthetic 640x360 24Hz video without people; adapter downsamples CPU inference input to320x180. Camera setup phase, not gameplay/body tracking. No screenshots in measurement windows.',config:{base,seconds:8,warmupSeconds:2,order:['baseline','canvas-fallback','canvas-fallback','baseline'],quantileConvention:'Higher empirical quantile ceil((n-1)p)'},trials:[],complete:false};
await fs.mkdir(output,{recursive:true});
let browser;const began=performance.now();
const timer=setTimeout(()=>{result.aborted='120s wall budget exceeded';void browser?.close();},120000);
try{
 for(const variant of result.config.order){
  if(performance.now()-began>90000){result.aborted='Insufficient time for another SDK trial';break;}
  browser=await launchBrowser(chromium);
  const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'});
  const remoteBlocked=[],requests=[],errors=[];
  await context.route('**/*',route=>{const u=route.request().url();if(new URL(u).origin===new URL(base).origin||u.startsWith('data:')||u.startsWith('blob:'))return route.continue();remoteBlocked.push(u);return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(/\.task|\.wasm|wasm.*\.js/.test(r.url()))requests.push({url:r.url(),status:r.status()});});
  await page.addInitScript(variant=>{
   const ctx=HTMLCanvasElement.prototype.getContext;
   if(variant==='canvas-fallback')HTMLCanvasElement.prototype.getContext=function(type,...args){return ['webgl','webgl2','experimental-webgl'].includes(type)?null:ctx.call(this,type,...args);};
   window.__SDK_BENCH__={trace:[],streams:[],timers:[]};
   const NativeWorker=window.Worker;
   window.Worker=class extends NativeWorker{
    constructor(...args){super(...args);this.addEventListener('message',e=>{const m=e.data;window.__SDK_BENCH__.trace.push({type:m.type,at:performance.now(),delegate:m.delegate,inferenceMs:m.inferenceMs,age:m.type==='result'?performance.now()-m.timestamp:undefined,poses:m.poses?.length,message:m.message});});}
    postMessage(m,...args){if(m.type==='init')m={...m,delegate:'CPU'};return super.postMessage(m,...args);}
   };
   navigator.mediaDevices.getUserMedia=async()=>{
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');let n=0;
    const draw=()=>{ctx.fillStyle=n++%2?'#182640':'#21314c';ctx.fillRect(0,0,640,360);ctx.fillStyle='#aeb7d2';ctx.font='24px sans-serif';ctx.fillText('SYNTHETIC VIDEO - NO PEOPLE',30,180);};draw();
    const timer=setInterval(draw,40),stream=canvas.captureStream(24);stream.getTracks()[0].addEventListener('ended',()=>clearInterval(timer));window.__SDK_BENCH__.streams.push(stream);window.__SDK_BENCH__.timers.push(timer);return stream;
   };
  },variant);
  await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);
  await page.locator('#choose-camera').click();await page.locator('#camera-mode-coop').click();await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();
  await page.waitForFunction(()=>{const a=window.__RR_GAME_TEST__.getState().cameraAdapter;return a?.currentStatus==='ready'&&window.__SDK_BENCH__.trace.filter(e=>e.type==='result').length>=3;},null,{timeout:20000});
  await page.waitForTimeout(2000);
  const initial=await page.evaluate(()=>{window.__SDK_BENCH__.began=performance.now();window.__SDK_BENCH__.raf=[];const tick=at=>{window.__SDK_BENCH__.raf.push(at);requestAnimationFrame(tick);};requestAnimationFrame(tick);return {at:window.__SDK_BENCH__.began,metrics:window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics()};});
  const before=await cg();await page.waitForTimeout(8000);const after=await cg();
  const data=await page.evaluate(()=>{const f=window.__SDK_BENCH__;const canvas=document.querySelector('#game-container > canvas');return {ended:performance.now(),trace:f.trace.filter(t=>t.at>=f.began),raf:f.raf,canvas2d:!!canvas.getContext('2d'),metrics:window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics()};});
  const samples=data.trace.filter(t=>t.type==='result');
  if(samples.length===0||samples.some(t=>t.delegate!=='CPU')||!requests.some(r=>r.url.endsWith('.wasm')&&r.status===200)||!requests.some(r=>r.url.endsWith('.task')&&r.status===200))throw Error('Missing actual CPU inference/resource evidence');
  await page.locator('#camera-to-keyboard').click();const cleanup=await page.evaluate(()=>window.__SDK_BENCH__.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
  const row={variant,browser:browser.version(),initial,seconds:(data.ended-initial.at)/1000,raw:data,requests,remoteBlocked,errors,cleanup,cgroupBefore:before,cgroupAfter:after,cgroupDelta:before&&after?Object.fromEntries(Object.keys(before).map(k=>[k,after[k]-before[k]])):null,summary:{inferenceMs:stats(samples.map(s=>s.inferenceMs)),resultAgeMs:stats(samples.map(s=>s.age)),resultsOver250:samples.filter(s=>s.age>=250).length,resultHz:samples.length/((data.ended-initial.at)/1000),rafHz:data.raf.length/((data.ended-initial.at)/1000)}};
  result.trials.push(row);console.log(JSON.stringify({variant,summary:row.summary,cpu:row.cgroupDelta}));
  await browser.close();browser=undefined;await fs.writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));
 }
 result.complete=result.trials.length===result.config.order.length;if(!result.complete||result.aborted)process.exitCode=2;
}catch(e){result.error=e.stack;process.exitCode=1;}
finally{clearTimeout(timer);await browser?.close();result.wallSeconds=(performance.now()-began)/1000;await fs.writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));}
