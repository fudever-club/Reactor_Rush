import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchBrowser} from './launch.mjs';
const [output,base='http://127.0.0.1:5173',modules]=process.argv.slice(2);
if(!output)throw Error('OUTPUT required');
const require=createRequire(modules?path.join(modules,'package.json'):import.meta.url);
const {chromium}=require('playwright');await fs.mkdir(output,{recursive:true});
const browser=await launchBrowser(chromium);const results=[];
try{
 for(const [width,height] of [[1280,720],[1920,1080]]){
  const page=await browser.newPage({viewport:{width,height}});await page.goto(base);await page.waitForFunction(()=>window.__RR_GAME_TEST__?.ready);
  // Isolate real DOM/CSS hit testing without shortening or mutating the game timer.
  // The full-round endurance suite separately reaches actual results and clicks STOP.
  await page.evaluate(()=>{document.querySelector('#menu-screen').hidden=true;document.querySelector('#results-screen').hidden=false;document.querySelector('#stop-camera-results').hidden=false;});
  const geometry=await page.evaluate(()=>{const button=document.querySelector('#stop-camera-results'),r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {pointerEvents:getComputedStyle(button).pointerEvents,height:r.height,inViewport:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,receivesPointer:hit===button||button.contains(hit),hit:hit?.tagName};});
  results.push({id:'results-pointer-'+width,geometry,status:geometry.receivesPointer&&geometry.inViewport&&geometry.height>=44?'PASS':'FAIL'});
  assert.equal(geometry.receivesPointer,true,JSON.stringify(geometry));assert.equal(geometry.inViewport,true);assert.ok(geometry.height>=44);await page.close();
 }
}finally{await fs.writeFile(path.join(output,'results-controls.json'),JSON.stringify({browser:browser.version(),method:'Real page DOM/CSS; results visibility forced only for isolated pointer hit testing; not a full game round.',results},null,2));await browser.close();}
console.log(JSON.stringify(results));
