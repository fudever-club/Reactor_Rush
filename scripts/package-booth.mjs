/** Copy an existing build to a new portable directory. Does not publish or install. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
async function canonicalDestination(destination){
 let ancestor=path.resolve(destination);const missing=[];
 for(;;){
  try{return path.join(await fs.realpath(ancestor),...missing);}
  catch(error){
   if(error.code!=='ENOENT')throw error;
   const parent=path.dirname(ancestor);if(parent===ancestor)throw error;
   missing.unshift(path.basename(ancestor));ancestor=parent;
  }
 }
}
export async function packageBuild(source,destination){
 source=await fs.realpath(source);destination=await canonicalDestination(destination);
 await fs.access(path.join(source,'index.html'));
 if(destination===source||destination.startsWith(source+path.sep))throw Error('Destination must be outside source build');
 await fs.mkdir(path.dirname(destination),{recursive:true});
 await fs.mkdir(destination); // Deliberately refuses an existing destination.
 const files=[];
 const store=async(name,buffer)=>{
  const target=path.join(destination,name);await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,buffer,{flag:'wx'});
  const copied=await fs.readFile(target);if(hash(copied)!==hash(buffer))throw Error(`Copy verification failed:${name}`);
  files.push({path:name.split(path.sep).join('/'),bytes:buffer.length,sha256:hash(buffer)});
 };
 const copy=async(directory,prefix='')=>{
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
   const name=path.join(prefix,entry.name),file=path.join(directory,entry.name);
   if(entry.isSymbolicLink())throw Error(`Build contains a symbolic link:${name}`);
   if(entry.isDirectory())await copy(file,name);
   else if(entry.isFile())await store(name,await fs.readFile(file));
  }
 };
 try{
  await copy(source);
  await store('serve.mjs',await fs.readFile(new URL('./serve-build.mjs',import.meta.url)));
  await store('START-BOOTH.txt',Buffer.from('Reactor Rush — local technical candidate, not a certified booth release.\n\nRequires Node.js22.18+ (Cloud checks used24.19.0). No npm install needed.\nOpen a terminal in this folder and run:\n  node serve.mjs\nThen open http://127.0.0.1:4173/ in Chrome/Edge.\nUse Ctrl+C to stop. Keep the server running while playing.\nFor a different port: node serve.mjs . 5000\n\nKeyboard controls: P1 A/D + hold S; P2 arrows + hold Down.\nCamera is opt-in and experimental. Physical performance/accuracy and TV acceptance remain pending.\nModels/WASM are included locally; validate cold-start with actual network disconnected on the target device.\nDo not double-click index.html: camera/workers need the localhost server.\nPACKAGE-MANIFEST.json lists SHA256 hashes (excluding itself).\nNo camera recordings or identity data are included.\n'));
  const report={createdUtc:new Date().toISOString(),status:'LOCAL_TECHNICAL_CANDIDATE',releaseCertified:false,files:files.sort((a,b)=>a.path.localeCompare(b.path))};
  await fs.writeFile(path.join(destination,'PACKAGE-MANIFEST.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  return report;
 }catch(error){
  // Preserve partial output for diagnosis; never remove a path that might contain user changes.
  throw new Error(`Packaging stopped; partial output retained at ${destination}: ${error.message}`,{cause:error});
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const destination=process.argv[2];if(!destination)throw Error('Usage: node scripts/package-booth.mjs NEW_OUTPUT_DIRECTORY');
 const source=fileURLToPath(new URL('../dist/',import.meta.url));
 packageBuild(source,destination).then(report=>console.log(JSON.stringify({output:path.resolve(destination),files:report.files.length,status:report.status}))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
