import {beginRoundIntro} from './campaign-helpers.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launchBrowser } from './launch.mjs';
import { syntheticCamera } from './fixtures.mjs';
const [output,base='http://127.0.0.1:5173',modules]=process.argv.slice(2);
if(!output)throw Error('Usage: node tests/browser/endurance-smoke.mjs OUTPUT [BASE_URL] [PLAYWRIGHT_NODE_MODULES] [--cycles-only]');
const require=createRequire(modules?path.join(modules,'package.json'):import.meta.url);
const {chromium}=require('playwright');
await fs.mkdir(output,{recursive:true});
const browser=await launchBrowser(chromium);const results=[];let active;
const selectors={H0:'#scheme-hand',P1:'#scheme-pose-both',P2:'#scheme-pose-one'};
async function open(scheme,coop){
 const page=active=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(syntheticCamera,{fakeBitmaps:true});await page.goto(base);
 await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);
 await page.locator('#choose-camera').click();await page.locator(coop?'#camera-mode-coop':'#camera-mode-solo').click();await page.locator(selectors[scheme]).click();
 await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();
 await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter?.currentStatus==='ready');
 return {page,errors};
}
async function startRound(page){
 await page.locator('#calibrate-camera').click();await page.waitForFunction(()=>!document.querySelector('#start-camera-round').disabled);
 await page.waitForFunction(()=>{const button=document.querySelector('#start-camera-round');if(button.disabled)return false;button.click();return true;});await beginRoundIntro(page);await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');
}
async function released(page){
 return page.evaluate(()=>window.__RR_FIXTURE__.workers.every(w=>!w.active)&&window.__RR_FIXTURE__.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
}
try{
 for(let i=0;i<10;i++){
  const scheme=['H0','P1','P2'][i%3];const {page,errors}=await open(scheme,i%2===1);
  await startRound(page);await page.locator('#stop-camera').click();assert.equal(await released(page),true);assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().cameraMode),false);
  assert.deepEqual(errors,[]);results.push({id:'cycle-'+(i+1),scheme,status:'PASS',scope:'fresh-page camera opt-in/calibration/start/stop and resource teardown'});
  await page.close();active=undefined;console.log('Cycle',i+1,'PASS');
 }
 if(!process.argv.includes('--cycles-only'))for(let pair=0;pair<5;pair++){
  const scheme=['H0','P1','P2'][pair%3],coop=pair%2===1;const {page,errors}=await open(scheme,coop);
  await startRound(page);
  for(let round=0;round<2;round++){
   const started=performance.now();
   const before=await page.evaluate(()=>({time:window.__RR_GAME_TEST__.getState().timeRemainingMs,heap:performance.memory?.usedJSHeapSize}));
   assert.ok(before.time>58000&&before.time<=60000);
   await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='results',null,{timeout:90000,polling:500});
   const after=await page.evaluate(()=>{const s=window.__RR_GAME_TEST__.getState();return {time:s.timeRemainingMs,players:s.players,cameraMode:s.cameraMode,metrics:s.cameraAdapter.getMetrics(),workers:window.__RR_FIXTURE__.workers.length,heap:performance.memory?.usedJSHeapSize,team:Number(document.querySelector('#result-team-total').textContent.replace(/[^0-9]/g,''))};});
   assert.equal(after.time,0);assert.equal(after.cameraMode,true);assert.equal(after.workers,1);
   assert.equal(after.team,after.players.p1.score+after.players.p2.score);
   assert.deepEqual(errors,[]);
   const id='campaign-'+(pair+1)+'-round-'+(round+1);results.push({id,scheme,coop,status:'PASS',wallSeconds:(performance.now()-started)/1000,before,after});console.log(id,'PASS');
   if(round===0){await page.locator('#restart-round').click();await beginRoundIntro(page,1);await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');}
  }
  await page.locator('#stop-camera-results').click();assert.equal(await released(page),true);await page.close();active=undefined;
 }
}catch(error){results.push({status:'FAIL',error:error.stack,state:await active?.evaluate(()=>({phase:window.__RR_GAME_TEST__?.getState().phase,metrics:window.__RR_GAME_TEST__?.getState().cameraAdapter?.getMetrics()})).catch(()=>null)});throw error;}
finally{await fs.writeFile(path.join(output,'endurance-results.json'),JSON.stringify({browser:browser.version(),method:'Synthetic camera, fake worker and bitmap; actual production60s timer, round results/Next Round and resource lifecycle. Not physical endurance, SDK inference, render FPS or body latency.',results},null,2));await browser.close();}
