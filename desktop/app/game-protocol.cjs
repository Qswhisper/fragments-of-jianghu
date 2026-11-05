'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const {Readable} = require('node:stream');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.ogg':'audio/ogg','.wav':'audio/wav','.mp3':'audio/mpeg','.m4a':'audio/mp4','.mp4':'video/mp4'};
function createGameHandler(gameRoot, manifest) {
  const root = fs.realpathSync(gameRoot), allowed = new Set(Object.keys(manifest.files));
  return async request => {
    try {
      const url = new URL(request.url);
      if (url.protocol !== 'jianghu:' || url.hostname !== 'game' || !['GET','HEAD'].includes(request.method)) return new Response(null,{status:403});
      const relative = decodeURIComponent(url.pathname).replace(/^\//,'') || 'play.html';
      if (relative.includes('\\') || relative.includes('\0') || !allowed.has(relative)) return new Response(null,{status:404});
      const file = path.resolve(root,relative), inside = path.relative(root,file);
      if (!inside || inside.startsWith('..') || path.isAbsolute(inside)) return new Response(null,{status:403});
      const actual=await fsp.realpath(file),canonical=path.relative(root,actual);
      if(!canonical||canonical.startsWith('..')||path.isAbsolute(canonical))return new Response(null,{status:403});
      const stat = await fsp.stat(actual);
      if (!stat.isFile() || stat.size !== manifest.files[relative].bytes) return new Response(null,{status:404});
      const headers = {'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
      let start=0,end=stat.size-1,status=200;
      const range=request.headers.get('range');
      if (range) {
        const match=/^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1]&&!match[2])) return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+stat.size}});
        if (!match[1]) start=Math.max(0,stat.size-Number(match[2]));
        else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
        if (!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size) return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+stat.size}});
        status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+stat.size;
      }
      headers['Content-Length']=String(Math.max(0,end-start+1));
      if (request.method==='HEAD'||stat.size===0) return new Response(null,{status,headers});
      const stream=fs.createReadStream(actual,{start,end});
      request.signal?.addEventListener('abort',()=>stream.destroy(),{once:true});
      return new Response(Readable.toWeb(stream),{status,headers});
    } catch { return new Response(null,{status:404}); }
  };
}
module.exports={createGameHandler};
