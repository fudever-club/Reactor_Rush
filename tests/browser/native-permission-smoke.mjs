import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchBrowser} from './launch.mjs';
import {syntheticCamera} from './fixtures.mjs';
const [output,base='http://127.0.0.1:4173',modules]=process.argv.slice(2);
if(!output)throw Error('Usage: node tests/browser/native-permission-smoke.mjs OUTPUT [BASE_URL] [PLAYWRIGHT_NODE_MODULES]');
const require=createRequire(modules?path.join(modules,'package.json'):import.meta.url);
const {chromium}=require('playwright');await fs.mkdir(output,{recursive:true});
const browser=await launchBrowser(chromium,{args:['--use-fake-device-for-media-stream']});const results=[];let active,id;
try{for(const scheme of ['H0','P1','P2']){
 id=scheme+'-native-permission-revoke';
 const context=await browser.newContext({viewport:{width:1280,height:720},permissions:['camera']});
 const page=active=await context.newPage();
 await page.addInitScript({content:`{
 const native=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
 (${syntheticCamera.toString()})({fakeBitmaps:true});
 navigator.mediaDevices.getUserMedia=async (...args)=>{const stream=await native(...args);window.__RR_FIXTURE__.streams.push(stream);return stream;};
 }`});
 await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);
 await page.locator('#choose-camera').click();await page.locator({H0:'#scheme-hand',P1:'#scheme-pose-both',P2:'#scheme-pose-one'}[scheme]).click();await page.locator('#camera-consent').check();await page.locator('#enable-camera').click();await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().cameraAdapter?.currentStatus==='ready');
 await page.locator('#calibrate-camera').click();await page.waitForFunction(()=>{const button=document.querySelector('#start-camera-round');if(button.disabled)return false;button.click();return true;});await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');
 const before=await page.evaluate(async()=>({permission:(await navigator.permissions.query({name:'camera'})).state,tracks:window.__RR_FIXTURE__.streams.flatMap(s=>s.getTracks().map(t=>({label:t.label,state:t.readyState})))}));
 assert.equal(before.permission,'granted');assert.ok(before.tracks.every(t=>t.state==='live'));
 const cdp=await context.newCDPSession(page);const {targetInfo}=await cdp.send('Target.getTargetInfo');
 await cdp.send('Browser.setPermission',{permission:{name:'camera'},setting:'denied',origin:new URL(base).origin,browserContextId:targetInfo.browserContextId});
 await page.waitForFunction(()=>window.__RR_FIXTURE__.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')),null,{timeout:5000});
 await page.waitForFunction(()=>!window.__RR_GAME_TEST__.getState().cameraMode);
 const after=await page.evaluate(async()=>({permission:(await navigator.permissions.query({name:'camera'})).state,status:window.__RR_GAME_TEST__.getState().cameraAdapter?.currentStatus,workersStopped:window.__RR_FIXTURE__.workers.every(w=>!w.active),tracks:window.__RR_FIXTURE__.streams.flatMap(s=>s.getTracks().map(t=>t.readyState))}));
 assert.equal(after.permission,'denied');assert.equal(after.workersStopped,true);assert.equal(after.status,'error');
 const x=await page.evaluate(()=>window.__RR_GAME_TEST__.getState().playerX.p1);await page.keyboard.down('a');await page.waitForFunction(x=>window.__RR_GAME_TEST__.getState().playerX.p1<x,x);await page.keyboard.up('a');
 results.push({id,status:'PASS',before,after});console.log(id,'PASS');await context.close();active=undefined;
}}catch(error){results.push({id,status:'FAIL',error:error.stack,state:await active?.evaluate(async()=>({permission:(await navigator.permissions.query({name:'camera'})).state,status:window.__RR_GAME_TEST__?.getState().cameraAdapter?.currentStatus,metrics:window.__RR_GAME_TEST__?.getState().cameraAdapter?.getMetrics(),tracks:window.__RR_FIXTURE__?.streams.flatMap(s=>s.getTracks().map(t=>t.readyState))})).catch(()=>null)});throw error;}
finally{await fs.writeFile(path.join(output,'native-permission-results.json'),JSON.stringify({browser:browser.version(),method:'Chromium native getUserMedia with built-in fake capture device; permission revoked through browser CDP; model/bitmap fake; no people or physical webcam.',results},null,2));await browser.close();}
