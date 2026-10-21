import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const source=await fs.readFile('/workspace/Reactor_Rush/tests/browser/pose-calibration-smoke.mjs','utf8');
const start=source.indexOf('function fixture(){'),end=source.indexOf('\n}\n\ntry{',start)+2;
if(start<0||end<2)throw Error('Fixture boundary missing');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});const results=[];
try{for(const solo of [false]){
 const page=await browser.newPage({viewport:{width:1280,height:720}});await page.addInitScript({content:source.slice(start,end)+'\nfixture();'});
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);
 await page.evaluate(solo=>Object.assign(window.__POSE_RECOVERY__,{solo,scheme:'P1',visible:true}),solo);
 await page.locator('#choose-camera').click();await page.locator(solo?'#camera-mode-solo':'#camera-mode-coop').click();await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter?.currentStatus==='ready');
 await page.evaluate(()=>{
  const adapter=window.__RR_GAME_TEST__.getState().cameraAdapter;
  const t=window.__PROFILE__={pump:[],frames:[],results:[],notifications:[],longTasks:[]};
  const pump=adapter.pumpFrame.bind(adapter);adapter.pumpFrame=()=>{t.pump.push(performance.now());return pump();};
  const notify=adapter.notifyDetection.bind(adapter);adapter.notifyDetection=()=>{const start=performance.now();notify();t.notifications.push({at:start,ms:performance.now()-start});};
  const worker=window.__POSE_RECOVERY__.workers.at(-1),post=worker.postMessage.bind(worker);
  worker.postMessage=(m,...args)=>{if(m.type==='frame')t.frames.push({sent:performance.now(),capturedAt:m.timestamp,videoTime:document.querySelector('#camera-preview').currentTime});return post(m,...args);};
  worker.addEventListener('message',e=>{if(e.data.type!=='result')return;const m=adapter.getMetrics();t.results.push({at:performance.now(),capturedAt:e.data.timestamp,age:performance.now()-e.data.timestamp,recalibrationRequired:m.recalibrationRequired,reason:m.ambiguityReason});});
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())t.longTasks.push({at:e.startTime,ms:e.duration});}).observe({entryTypes:['longtask']});}catch{}
 });
 await page.locator('#calibrate-camera').click();await page.waitForFunction(()=>{const b=document.querySelector('#start-camera-round');if(b.disabled)return false;b.click();return true;});await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:2000});await cdp.send('Profiler.start');
 await page.evaluate(()=>{window.__POSE_RECOVERY__.raised=true;});await page.waitForTimeout(65000);
 const {profile}=await cdp.send('Profiler.stop');await fs.writeFile(path.join(path.dirname(new URL(import.meta.url).pathname),'pose-coop.cpuprofile'),JSON.stringify(profile));
 const renderer=await page.evaluate(()=>{const canvas=document.querySelector('#game-container > canvas');const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_debug_renderer_info');return extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'not exposed';});
 const trace=await page.evaluate(()=>({trace:window.__PROFILE__,metrics:window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics()}));
 results.push({solo,renderer,...trace});await page.close();
}}finally{await fs.writeFile(path.join(path.dirname(new URL(import.meta.url).pathname),'pose-profile-long.json'),JSON.stringify({method:'Instrumentation only; synthetic video/fake130ms worker; no input deadline change',results},null,2));await browser.close();}
console.log('Profile complete');
