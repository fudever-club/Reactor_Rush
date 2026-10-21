/** Actual production page/UI/input with synthetic video, fake bitmap/worker.
 * No physical camera/model acceptance. Same CLI as other browser checks.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchBrowser} from './launch.mjs';
const [output,base='http://127.0.0.1:4174',modules]=process.argv.slice(2);
if(!output)throw Error('OUTPUT required');
const require=createRequire(modules?path.join(modules,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const source=await fs.readFile(new URL('./pose-calibration-smoke.mjs',import.meta.url),'utf8');
const start=source.indexOf('function fixture(){'),end=source.indexOf('\n}\n\ntry{',start)+2;
if(start<0||end<2)throw Error('Fixture boundary changed');
await fs.mkdir(output,{recursive:true});const browser=await launchBrowser(chromium);const results=[];let active;
try{
 const cases=[...['P1','P2'].flatMap(scheme=>[{solo:true,scheme,delay:80},{solo:false,scheme,delay:80}]),...['P1','P2'].map(scheme=>({solo:true,scheme,delay:130}))];
 for(const {solo,scheme,delay} of cases){
  const page=active=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript({content:source.slice(start,end)+'\nfixture();'});
  await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);
  await page.evaluate(({solo,scheme,delay})=>Object.assign(window.__POSE_RECOVERY__,{solo,scheme,delay,visible:true}),{solo,scheme,delay});
  await page.locator('#choose-camera').click();await page.locator(solo?'#camera-mode-solo':'#camera-mode-coop').click();await page.locator(scheme==='P1'?'#scheme-pose-both':'#scheme-pose-one').click();
  await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter?.currentStatus==='ready');
  await page.waitForTimeout(1400);assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().phase),'menu','no automatic initial START');
  assert.equal(await page.locator('#start-camera-round').isEnabled(),false,'initial calibration remains manual');
  await page.locator('#calibrate-camera').click();await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter.canStart());
  await page.locator('#start-camera-round').click();await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');
  await page.evaluate(()=>{window.__POSE_RECOVERY__.raised=true;});await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().input.p1.catch);
  await page.evaluate(()=>{window.__POSE_RECOVERY__.visible=false;});await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().recalibrationRequired);
  assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().input.p1.catch),false);
  await page.evaluate(()=>Object.assign(window.__POSE_RECOVERY__,{visible:true,raised:true}));
  await page.waitForTimeout(1300);assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().recalibrationRequired),true,'held raised arms cannot auto recover');
  if(solo){
   await page.evaluate(()=>{window.__POSE_RECOVERY__.delay=350;});
   await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().readinessReason==='SLOW_FRAMES');
   assert.match(await page.locator('#hud-camera-cue').innerText(),/SLOW FRAMES/,'auto recovery must show slow-frame blocker');
   await page.evaluate(delay=>{window.__POSE_RECOVERY__.delay=delay;},delay);
   await page.evaluate(()=>Object.assign(window.__POSE_RECOVERY__,{solo:false,raised:false}));
   await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().readinessReason==='EXTRA_PERSON');
   assert.match(await page.locator('#hud-camera-cue').innerText(),/ONE PERSON ONLY/,'auto recovery must show extra-person blocker');
   await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().recalibrationRequired),true);
   await page.evaluate(()=>{window.__POSE_RECOVERY__.solo=true;});
  }
  await page.evaluate(()=>{window.__POSE_RECOVERY__.raised=false;});
  if(solo){
   await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().soloRecovery?.state==='collecting');
   assert.match(await page.locator('#hud-camera-badge').innerText(),/AUTO RECOVERY/);
   assert.match(await page.locator('#hud-camera-cue').innerText(),/HOLD STILL/);
   await page.waitForFunction(()=>!window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().recalibrationRequired,null,{timeout:12000});
   assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().input.p1.catch),false);
   assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().input.p1.moveAxis),0);
  }else{
   await page.waitForTimeout(1600);assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().recalibrationRequired),true);
   assert.match(await page.locator('#hud-camera-badge').innerText(),/CALIBRATE/);
   await page.locator('#hud-camera-recalibrate').click();await page.waitForFunction(()=>!window.__RR_GAME_TEST__.getState().cameraAdapter.getMetrics().recalibrationRequired);
  }
  await page.evaluate(()=>{window.__POSE_RECOVERY__.raised=true;});await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().input.p1.catch);
  assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().phase),'playing');
  await page.locator('#stop-camera').click();
  const cleanup=await page.evaluate(()=>window.__POSE_RECOVERY__.workers.every(w=>!w.active)&&window.__POSE_RECOVERY__.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));assert.equal(cleanup,true);assert.deepEqual(errors,[]);
  results.push({solo,scheme,delay,status:'PASS',cleanup,checks:['initial manual calibration/START','Catch before loss','neutral after loss','raised arms do not recover',...(solo?['slow-frame blocker visible','extra-person blocker visible and does not recover']:[]),solo?'neutral dwell automatically restores Solo with HUD progress':'Co-op requires manual CALIBRATE','Catch restored by deliberate gesture','teardown'],errors});
  await page.close();active=undefined;
 }
}catch(e){results.push({status:'FAIL',error:e.stack,state:await active?.evaluate(()=>({state:window.__RR_GAME_TEST__?.getState().phase,metrics:window.__RR_GAME_TEST__?.getState().cameraAdapter?.getMetrics(),badge:document.querySelector('#hud-camera-badge')?.textContent})).catch(()=>null)});throw e;}
finally{await fs.writeFile(path.join(output,'results.json'),JSON.stringify({method:'Synthetic video/bitmap and80/130ms fake worker, injected350ms stale results; real built page/input/HUD; no physical inference proof',browser:browser.version(),results},null,2));await browser.close();}
console.log(JSON.stringify(results));
