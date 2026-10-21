/** Bounded component ablation, not physical-camera/model performance certification.
 * Usage: CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/browser/pose-performance-benchmark.mjs OUTPUT BASE PLAYWRIGHT_MODULES
 * Env: RR_BENCH_SECONDS=8 RR_BENCH_VARIANTS=baseline,no-overlays,no-ui,no-raster
 * Two trials in mirrored order; fresh browser per trial; 2s warmup; 120s watchdog.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {launchBrowser} from './launch.mjs';
const [output, base='http://127.0.0.1:4173', modules] = process.argv.slice(2);
if (!output) throw Error('OUTPUT required');
const seconds=Number(process.env.RR_BENCH_SECONDS ?? 8);
const variants=(process.env.RR_BENCH_VARIANTS ?? 'baseline,no-overlays,no-ui,no-raster').split(',');
if (!Number.isFinite(seconds)||seconds<1||seconds>30||variants.length>4||variants.some(v=>!['baseline','no-overlays','no-ui','no-raster','canvas-fallback','timer-pump'].includes(v))) throw Error('Invalid bounded benchmark configuration');
const require=createRequire(modules?path.join(modules,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const fixtureSource=await fs.readFile(new URL('./pose-calibration-smoke.mjs',import.meta.url),'utf8');
const start=fixtureSource.indexOf('function fixture(){');
const end=fixtureSource.indexOf('\n}\n\ntry{',start)+2;
if(start<0||end<2)throw Error('Fixture boundary changed');
const fixture=fixtureSource.slice(start,end)+'\nfixture();';
await fs.mkdir(output,{recursive:true});
const cgroup=async()=>{try {const s=await fs.readFile('/sys/fs/cgroup/cpu.stat','utf8');return Object.fromEntries(s.trim().split('\n').map(v=>{const [k,n]=v.split(/\s+/);return [k,Number(n)];}));}catch{return null;}};
const quantiles=xs=>{const s=[...xs].sort((a,b)=>a-b);const q=p=>s.length?s[Math.ceil((s.length-1)*p)]:null;return {n:s.length,p50:q(.5),p95:q(.95),p99:q(.99),max:q(1)};};
const result={method:'Synthetic 640x360 24Hz video; fake bitmap and fake 130ms worker; Co-op P1 1280x720. Ablations intentionally disable components and are not shippable changes. No inference/physical camera or GPU benchmark.',config:{base,seconds,warmupSeconds:2,variants,order:[...variants,...variants.toReversed()],quantileConvention:'Higher empirical quantile: sorted[ceil((n-1)*p)]; p50 is not interpolated median',fixtureSha256:createHash('sha256').update(fixture).digest('hex')},started:new Date().toISOString(),trials:[],complete:false};
let browser;
const began=performance.now();
const watchdog=setTimeout(()=>{result.aborted='120s wall budget exceeded';void browser?.close();},120000);
try {
 for(const [index,variant] of result.config.order.entries()){
  if(performance.now()-began+(seconds+7)*1000>118000) {result.aborted='Insufficient time for another bounded trial';break;}
  browser=await launchBrowser(chromium);
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript({content:fixture});
  await page.addInitScript(variant=>{
   window.__DRAW_DIAGNOSTIC__={calls:0,blocked:0,canvas2dRequests:0,blockedWebGL:0};
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){
    if(variant==='canvas-fallback'&&['webgl','webgl2','experimental-webgl'].includes(type)){window.__DRAW_DIAGNOSTIC__.blockedWebGL++;return null;}
    if(type==='2d')window.__DRAW_DIAGNOSTIC__.canvas2dRequests++;
    return original.call(this,type,...args);
   };
   for(const cls of [window.WebGLRenderingContext,window.WebGL2RenderingContext]) if(cls) for(const key of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) {
    const original=cls.prototype[key];if(typeof original!=='function')continue;
    cls.prototype[key]=function(...args){window.__DRAW_DIAGNOSTIC__.calls++;if(variant==='no-raster'){window.__DRAW_DIAGNOSTIC__.blocked++;return;}return original.apply(this,args);};
   }
  },variant);
  await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);
  await page.evaluate(()=>Object.assign(window.__POSE_RECOVERY__,{solo:false,scheme:'P1',visible:true}));
  await page.locator('#choose-camera').click();await page.locator('#camera-mode-coop').click();await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();
  await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter?.currentStatus==='ready');
  await page.locator('#calibrate-camera').click();
  await page.waitForFunction(()=>{const b=document.querySelector('#start-camera-round');if(b.disabled)return false;b.click();return true;});
  await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');
  await page.evaluate(variant=>{
   const a=window.__RR_GAME_TEST__.getState().cameraAdapter;
   if(variant==='timer-pump')window.__BENCH_TIMER__=setInterval(()=>a.pumpFrame(),8);
   if(variant==='no-overlays')a.overlayCanvases=[];
   if(variant==='no-ui'){a.onDetection=undefined;a.onMetrics=undefined;}
   window.__POSE_RECOVERY__.raised=true;
  },variant);
  await page.waitForTimeout(2000);
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  const before=(await cdp.send('Performance.getMetrics')).metrics;
  await page.evaluate(()=>{
   const a=window.__RR_GAME_TEST__.getState().cameraAdapter;
   const t=window.__PERF_TRACE__={began:performance.now(),initialMetrics:a.getMetrics(),initialDraws:{...window.__DRAW_DIAGNOSTIC__},frames:[],results:[],notifications:[],raf:[],longTasks:[]};
   const worker=window.__POSE_RECOVERY__.workers.at(-1),post=worker.postMessage.bind(worker);
   worker.postMessage=(m,...args)=>{if(m.type==='frame')t.frames.push({at:performance.now(),capturedAt:m.timestamp});return post(m,...args);};
   worker.addEventListener('message',e=>{if(e.data.type==='result')t.results.push({at:performance.now(),age:performance.now()-e.data.timestamp,recalibration:a.getMetrics().recalibrationRequired});});
   const notify=a.notifyDetection.bind(a);a.notifyDetection=()=>{const at=performance.now();notify();t.notifications.push(performance.now()-at);};
   const tick=at=>{t.raf.push(at);requestAnimationFrame(tick);};requestAnimationFrame(tick);
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.startTime>=t.began)t.longTasks.push({at:e.startTime,ms:e.duration});}).observe({entryTypes:['longtask']});
  });
  const cgBefore=await cgroup();
  await page.waitForTimeout(seconds*1000);
  const cgAfter=await cgroup();
  const after=(await cdp.send('Performance.getMetrics')).metrics;
  const data=await page.evaluate(()=>{const a=window.__RR_GAME_TEST__.getState().cameraAdapter;const canvas=document.querySelector('#game-container > canvas');const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return {trace:window.__PERF_TRACE__,ended:performance.now(),metrics:a.getMetrics(),state:window.__RR_GAME_TEST__.getState().phase,draws:window.__DRAW_DIAGNOSTIC__,canvas2d:!!canvas.getContext('2d'),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};});
  const gaps=xs=>xs.slice(1).map((v,i)=>v-xs[i]);
  const captureGaps=gaps(data.trace.frames.map(f=>f.capturedAt));
  const rafGaps=gaps(data.trace.raf);
  const delta=Object.fromEntries(after.filter(m=>before.some(b=>b.name===m.name)).map(m=>[m.name,m.value-before.find(b=>b.name===m.name).value]));
  const row={index,variant,browser:browser.version(),renderer:data.renderer,canvas2d:data.canvas2d,draws:data.draws,initialMetrics:data.trace.initialMetrics,initialDraws:data.trace.initialDraws,seconds:(data.ended-data.trace.began)/1000,errors,state:data.state,metrics:data.metrics,cdpDelta:delta,cgroupBefore:cgBefore,cgroupAfter:cgAfter,cgroupDelta:cgBefore&&cgAfter?Object.fromEntries(Object.keys(cgBefore).map(k=>[k,cgAfter[k]-cgBefore[k]])):null,summary:{resultAgeMs:quantiles(data.trace.results.map(r=>r.age)),captureGapMs:quantiles(captureGaps),captureGapsOver250:captureGaps.filter(g=>g>=250).length,resultsOver250:data.trace.results.filter(r=>r.age>=250).length,rafGapMs:quantiles(rafGaps),notifyMs:quantiles(data.trace.notifications),longTaskMs:quantiles(data.trace.longTasks.map(t=>t.ms)),rafHz:data.trace.raf.length/((data.ended-data.trace.began)/1000)},raw:data.trace};
  result.trials.push(row);await browser.close();browser=undefined;
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({index,variant,summary:row.summary,cpu:row.cgroupDelta}));
 }
 result.complete=result.trials.length===result.config.order.length;
 if(!result.complete||result.aborted)process.exitCode=2;
} catch(e){result.error=e.stack;process.exitCode=1;}
finally{clearTimeout(watchdog);await browser?.close();result.wallSeconds=(performance.now()-began)/1000;await fs.writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));}
