/** Read-only localhost server for a portable static booth build. No dependencies. */
import http from 'node:http';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.task':'application/octet-stream'};
const within=(root,file)=>file===root||file.startsWith(root+path.sep);
export function createBoothServer(directory){
 const root=path.resolve(directory);
 return http.createServer(async(req,res)=>{
  const reply=(code,message)=>{res.writeHead(code,{'content-type':'text/plain; charset=utf-8'});res.end(message);};
  if(req.method!=='GET'&&req.method!=='HEAD'){reply(405,'Read-only server');return;}
  let file;
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname.includes('\0')||pathname.includes('\\')){reply(403,'Forbidden');return;}
   file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!within(root,file)){reply(403,'Forbidden');return;}
   const [realRoot,realFile]=await Promise.all([fs.realpath(root),fs.realpath(file)]);
   if(!within(realRoot,realFile)){reply(403,'Forbidden');return;}
   file=realFile;const stat=await fs.stat(file);
   if(!stat.isFile()){reply(404,'Not found');return;}
   res.writeHead(200,{'content-type':types[path.extname(file)]??'application/octet-stream','content-length':stat.size,'cache-control':'no-store','x-content-type-options':'nosniff'});
   if(req.method==='HEAD'){res.end();return;}
   const stream=createReadStream(file);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch(error){if(res.headersSent){res.destroy();return;}reply(error instanceof URIError?400:error.code==='ENOENT'||error.code==='ENOTDIR'?404:500,'File unavailable');}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const directory=path.resolve(process.argv[2]??path.dirname(fileURLToPath(import.meta.url)));
 const port=Number(process.argv[3]??4173);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Port must be an integer1..65535');
 const server=createBoothServer(directory);server.on('error',error=>{console.error(error.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`Reactor Rush: http://127.0.0.1:${port}/ (files: ${directory})`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
}
