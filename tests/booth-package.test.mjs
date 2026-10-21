import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,readFile,mkdir,rm,symlink,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createBoothServer} from '../scripts/serve-build.mjs';
import {packageBuild} from '../scripts/package-booth.mjs';
async function fixture(t){const root=await mkdtemp(path.join(os.tmpdir(),'rr-booth-test-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
test('standalone booth server serves local HTML/WASM, rejects traversal and writes',async t=>{
 const dir=await fixture(t),site=path.join(dir,'site');await mkdir(site);await writeFile(path.join(site,'index.html'),'local game');await writeFile(path.join(site,'model.wasm'),'wasm');await writeFile(path.join(dir,'private.txt'),'private');
 const server=createBoothServer(site);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const get=url=>fetch(base+url,{signal:AbortSignal.timeout(2000)});
 const index=await get('/');assert.equal(index.status,200);assert.equal(await index.text(),'local game');
 const wasm=await get('/model.wasm');assert.match(wasm.headers.get('content-type'),/application\/wasm/);assert.equal(await wasm.text(),'wasm');
 assert.equal((await get('/..%2fprivate.txt')).status,403);
 assert.equal((await get('/missing')).status,404);
 assert.equal((await fetch(base+'/',{method:'POST',signal:AbortSignal.timeout(2000)})).status,405);
});
test('portable package has verified hashes and refuses to overwrite a destination',async t=>{
 const dir=await fixture(t),source=path.join(dir,'dist'),out=path.join(dir,'portable');await mkdir(source);await writeFile(path.join(source,'index.html'),'game');
 const report=await packageBuild(source,out);assert.ok(report.files.some(f=>f.path==='index.html'&&f.sha256.length===64));assert.equal(await readFile(path.join(out,'index.html'),'utf8'),'game');assert.ok((await readFile(path.join(out,'serve.mjs'),'utf8')).includes('createBoothServer'));
 await assert.rejects(packageBuild(source,out),/exist/i);assert.equal(await readFile(path.join(out,'index.html'),'utf8'),'game');
});

test('package rejects a destination alias inside the source before creating anything',async t=>{
 const dir=await fixture(t),source=path.join(dir,'dist'),alias=path.join(dir,'alias');await mkdir(source);await writeFile(path.join(source,'index.html'),'game');
 try{await symlink(source,alias,process.platform==='win32'?'junction':'dir');}
 catch(error){if(process.platform==='win32'&&error.code==='EPERM'){t.skip('directory symlink unavailable');return;}throw error;}
 await assert.rejects(packageBuild(source,path.join(alias,'new-parent','output')),/outside source/);
 assert.deepEqual(await readdir(source),['index.html']);
});
