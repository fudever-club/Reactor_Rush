import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchBrowser} from './launch.mjs';
const [output,base='http://127.0.0.1:4180',modules]=process.argv.slice(2);
const require=createRequire(path.join(modules,'package.json'));
const {chromium}=require('playwright');
await fs.mkdir(output,{recursive:true});
const browser=await launchBrowser(chromium); const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));const evidence={method:'Real-timer keyboard Solo campaign; synthetic stalled browser frame; no timer mutation or physical camera claims',rounds:[]};
const snapshot=()=>page.evaluate(()=>window.__RR_GAME_TEST__.getState());
const shot=name=>page.screenshot({path:path.join(output,name+'.png')});
async function intro(index){await page.waitForFunction(i=>window.__RR_GAME_TEST__.getState().campaign?.phase==='intro'&&window.__RR_GAME_TEST__.getState().campaign.roundIndex===i,index,{timeout:5000});assert.equal(await page.locator('#round-intro').isVisible(),true);await shot('intro-'+(index+1));}
async function move(zone){const centers=[173,330,487];let s=await snapshot();const dx=centers[zone]-s.playerX.p1;if(Math.abs(dx)>12){const key=dx<0?'a':'d';await page.keyboard.down(key);await page.waitForFunction(({x,left})=>window.__RR_GAME_TEST__.getState().phase!=='playing'||(left?window.__RR_GAME_TEST__.getState().playerX.p1<=x:window.__RR_GAME_TEST__.getState().playerX.p1>=x),{x:centers[zone],left:dx<0},{timeout:3000});await page.keyboard.up(key);}}
try{await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);await shot('menu');await page.locator('#start-round').click();await intro(0);
for(let i=0;i<3;i++){
 assert.equal((await snapshot()).campaign.results.length,i);await page.locator('#begin-campaign-round').click();await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');const started=Date.now();
 await page.keyboard.up('s');await page.waitForTimeout(80);
 if(i===1){await move(0);await page.keyboard.down('s');await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().players.p1.score===100,{},{timeout:2500});await move(2);await page.evaluate(()=>{const start=performance.now();while(performance.now()-start<1250){}});await page.waitForTimeout(1400);assert.equal((await snapshot()).players.p1.score,100,'held input plus historical neutral must not rearm next socket');await page.keyboard.up('s');await page.waitForTimeout(80);await page.keyboard.down('s');await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().players.p1.score===200,{},{timeout:2500});await page.keyboard.up('s');}
 if(i===2){await move(1);await page.keyboard.down('s');await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().players.p1.score>=100,{},{timeout:2500});await page.keyboard.up('s');}
 await shot('round-'+(i+1));
 while((await snapshot()).phase==='playing'){
  if(i>0){const s=await snapshot(),v=s.challengeView.p1;await page.keyboard.up('s');await move(v.targetZone);if(!v.overload){await page.waitForTimeout(65);await page.keyboard.down('s');await page.waitForTimeout(1100);await page.keyboard.up('s');}}
  else await page.waitForTimeout(400);
 }
 const s=await snapshot();assert.equal(s.timeRemainingMs,0);assert.ok(Date.now()-started>=58000);assert.equal(s.campaign.results.length,i+1);evidence.rounds.push({elapsedWallMs:Date.now()-started,state:s});console.log('round',i+1,'complete',s.players.p1.score);await shot('result-'+(i+1));
 if(i<2){assert.equal(s.campaign.phase,'round-results');await page.locator('#restart-round').click();await intro(i+1);}
}
const final=await snapshot();assert.equal(final.campaign.phase,'complete');assert.equal(await page.locator('#campaign-breakdown tbody tr').count(),3);const sum=final.campaign.results.reduce((n,r)=>n+r.players.p1.score,0);assert.equal(final.totals.team,sum);assert.equal(final.totals.p2,0);assert.equal(await page.locator('.result-player-p2').isVisible(),false);assert.match(await page.locator('.results-subtitle').innerText(),/SOLO/);assert.equal(Number((await page.locator('#result-team-total').innerText()).replaceAll(',','')),sum);assert.equal(await page.locator('#stop-camera-results').isVisible(),false);assert.match(await page.locator('#result-feedback').innerText(),/FINAL HEAT.*P1.*100/);await shot('final');
await page.setViewportSize({width:960,height:540});await shot('final-960');await page.keyboard.press('Enter');await intro(0);assert.equal((await snapshot()).campaign.results.length,0);assert.equal((await snapshot()).totals.team,0);
await page.reload();await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);await page.locator('#mode-coop').click();await page.locator('#start-round').click();await intro(0);assert.match(await page.locator('#intro-mode').innerText(),/CO-OP/);await page.locator('#begin-campaign-round').click();await page.waitForFunction(()=>window.__RR_GAME_TEST__.getState().phase==='playing');assert.equal(await page.locator('.hud-player-p2').isVisible(),true);await shot('coop-960');assert.deepEqual(errors,[]);evidence.status='PASS';console.log('PASS complete campaign, exact totals, replay, held-stall socket regression, Solo/Co-op UI');
}catch(e){evidence.status='FAIL';evidence.error=e.stack;await shot('failure');throw e;}finally{evidence.errors=errors;await fs.writeFile(path.join(output,'campaign-results.json'),JSON.stringify(evidence,null,2));await browser.close();}
