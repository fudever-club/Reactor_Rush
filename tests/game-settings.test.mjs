import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_VOLUMES, SETTINGS_KEY, sanitizeVolumes, loadVolumes, saveVolumes } from '../src/gameplay/game-settings.ts';
test('volumes validate finite numbers, clamp and reject unsupported records',()=>{
 assert.deepEqual(sanitizeVolumes({master:-2,music:130,sfx:0}),{master:0,music:100,sfx:0});
 assert.deepEqual(sanitizeVolumes({master:NaN,music:Infinity,sfx:'25'}),DEFAULT_VOLUMES);
 for(const value of [null,[],true,'bad'])assert.deepEqual(sanitizeVolumes(value),DEFAULT_VOLUMES);
});
test('only versioned sanitized volumes persist; storage getter/read/write/parse failures are safe',()=>{
 let saved;const storage={getItem:()=>saved,setItem:(key,value)=>{assert.equal(key,SETTINGS_KEY);saved=value;}};
 saveVolumes({master:25,music:0,sfx:50},()=>storage);assert.deepEqual(loadVolumes(()=>storage),{master:25,music:0,sfx:50});
 assert.deepEqual(Object.keys(JSON.parse(saved)).sort(),['version','volumes']);
 for(const raw of ['{',JSON.stringify({version:99,volumes:{master:0}}),'null'])assert.deepEqual(loadVolumes(()=>({getItem:()=>raw})),DEFAULT_VOLUMES);
 assert.deepEqual(loadVolumes(()=>{throw Error('getter')}),DEFAULT_VOLUMES);
 assert.deepEqual(loadVolumes(()=>({getItem(){throw Error('read')}})),DEFAULT_VOLUMES);
 assert.doesNotThrow(()=>saveVolumes(DEFAULT_VOLUMES,()=>{throw Error('getter')}));
 assert.doesNotThrow(()=>saveVolumes(DEFAULT_VOLUMES,()=>({setItem(){throw Error('write')}})));
 assert.deepEqual(loadVolumes(()=>({getItem:()=>JSON.stringify({version:1,volumes:{master:1e400,music:20,sfx:-1}})})),{master:100,music:20,sfx:0});
});
