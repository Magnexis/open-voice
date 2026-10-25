import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { Readable } from 'node:stream';
import { createSqliteRepository } from './lib/sqlite.mjs';
import { createDiskStorage } from './lib/audio-storage.mjs';
import { createApi } from './lib/api.mjs';
const port=Number(process.env.PORT||8888),root=resolve('./public'),db=createSqliteRepository(process.env.VOICE_DB||'./data/voice.sqlite');
const api=createApi({db,storage:createDiskStorage(process.env.VOICE_UPLOAD_DIR||'./data/audio'),secureCookies:false});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const server=createServer(async(req,res)=>{
  try {
    const target=new URL(req.url,`http://${req.headers.host || 'localhost'}`);
    if(target.pathname.startsWith('/api/')) {
      const body=Readable.toWeb(req);
      const request=new Request(target,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:body,duplex:'half'});
      const response=await api(request);
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    let decoded;try{decoded=decodeURIComponent(target.pathname);}catch{res.writeHead(400);res.end();return;}
    let file=resolve(root,'.'+decoded);
    if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return;}
    if(file===root||decoded.endsWith('/'))file=resolve(root,'index.html');
    const info=await stat(file).catch(()=>null);
    if(!info?.isFile()) {res.writeHead(404);res.end('Not found');return;}
    const data=await readFile(file);
    res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'});
    res.end(data);
  } catch(err){console.error(err);res.writeHead(500);res.end('Server error');}
});
server.listen(port,()=>console.log(`Magnexis Voice: http://localhost:${port}`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(async()=>{await db.close();process.exit(0);}));
