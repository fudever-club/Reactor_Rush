import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchBrowser} from './launch.mjs';
import {syntheticCamera} from './fixtures.mjs';
const [output,base='http://127.0.0.1:5173',modules]=process.argv.slice(2);
if(!output)throw Error('Usage: node tests/browser/camera-lifecycle-smoke.mjs OUTPUT [BASE_URL] [PLAYWRIGHT_NODE_MODULES]');
const require=createRequire(modules?path.join(modules,'package.json'):import.meta.url);
const {chromium}=require('playwright');await fs.mkdir(output,{recursive:true});
const browser=await launchBrowser(chromium);const results=[];let active,id;
const selectors={H0:'#scheme-hand',P1:'#scheme-pose-both',P2:'#scheme-pose-one'};
async function setup(scheme,delay=0){
 const page=active=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(syntheticCamera,{fakeBitmaps:true,cameraDelayMs:delay});
 await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);
 assert.equal(await page.evaluate(()=>window.__RR_FIXTURE__.cameraCalls),0);
 await page.locator('#choose-camera').click();await page.locator(selectors[scheme]).click();await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();
 if(!delay)await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter?.currentStatus==='ready');
 return {page,errors};
}
async function released(page){return page.evaluate(()=>window.__RR_FIXTURE__.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))&&window.__RR_FIXTURE__.workers.every(w=>!w.active));}
try{
 for(const scheme of ['H0','P1','P2'])for(const action of ['withdraw-consent','disconnect','worker-error','cancel-permission']){
  id=scheme+'-'+action;const {page,errors}=await setup(scheme,action==='cancel-permission'?1000:0);
  if(action==='cancel-permission'){
   await page.locator('#camera-to-keyboard').click();
   await page.waitForFunction(()=>window.__RR_FIXTURE__.streams.length===1);
   await page.waitForFunction(()=>window.__RR_FIXTURE__.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
   assert.equal(await page.evaluate(()=>window.__RR_FIXTURE__.workers.length),0);
   assert.equal(await page.evaluate(()=>window.__RR_GAME_TEST__.getState().cameraAdapter),undefined);
  }else if(action==='withdraw-consent'){
   await page.locator('#camera-consent').uncheck();assert.equal(await released(page),true);
   assert.equal(await page.locator('#calibrate-camera').isDisabled(),true);assert.equal(await page.locator('#start-camera-round').isDisabled(),true);
  }else{
   await page.locator('#calibrate-camera').click();
   await page.waitForFunction(()=>{const b=document.querySelector('#start-camera-round');if(b.disabled)return false;b.click();return true;});
   await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');
   await page.evaluate(action=>{
    const f=window.__RR_FIXTURE__;
    if(action==='disconnect'){const track=f.streams.at(-1).getVideoTracks()[0];track.stop();track.dispatchEvent(new Event('ended'));}
    else f.workers.at(-1).dispatchEvent(new ErrorEvent('error',{message:'Synthetic worker failure'}));
   },action);
   await page.waitForFunction(()=>!window.__RR_GAME_TEST__.getState().cameraMode);
   assert.equal(await released(page),true);
   const x=await page.evaluate(()=>window.__RR_GAME_TEST__.getState().playerX.p1);
   await page.keyboard.down('a');await page.waitForFunction(x=>window.__RR_GAME_TEST__.getState().playerX.p1<x,x);await page.keyboard.up('a');
  }
  assert.deepEqual(errors,[]);results.push({id,status:'PASS'});console.log(id,'PASS');await page.close();active=undefined;
 }
 id='keyboard-focus-loss';const page=active=await browser.newPage();await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);await page.locator('#start-round').click();
 await page.keyboard.down('s');await page.keyboard.down('a');await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().input.p1.catch);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForFunction(()=>!window.__RR_GAME_TEST__.getState().input.p1.catch&&window.__RR_GAME_TEST__.getState().input.p1.moveAxis===0);
 await page.keyboard.up('s');await page.keyboard.up('a');results.push({id,status:'PASS'});await page.close();active=undefined;
}catch(error){results.push({id,status:'FAIL',error:error.stack,state:await active?.evaluate(()=>({phase:window.__RR_GAME_TEST__?.getState().phase,status:document.querySelector('#camera-status')?.textContent,metrics:window.__RR_GAME_TEST__?.getState().cameraAdapter?.getMetrics()})).catch(()=>null)});throw error;}
finally{await fs.writeFile(path.join(output,'lifecycle-results.json'),JSON.stringify({browser:browser.version(),method:'Synthetic video, fake bitmap/worker; disconnect/error events injected; consent UI and late stream cleanup exercised; blur event injected. Not OS permission-revoke or physical camera testing.',results},null,2));await browser.close();}
