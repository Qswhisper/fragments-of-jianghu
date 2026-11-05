import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createVerificationOutput} from './verification-output.mjs';
const require=createRequire(import.meta.url),{createGameHandler}=require('../desktop/app/game-protocol.cjs');
const out=fileURLToPath(await createVerificationOutput('windows-protocol')),root=path.join(out,'game');await fs.mkdir(root);
await fs.writeFile(path.join(root,'play.html'),'<html>江湖残卷</html>');await fs.writeFile(path.join(root,'track.m4a'),'0123456789');await fs.writeFile(path.join(out,'private.txt'),'private');
const files={};for(const name of ['play.html','track.m4a'])files[name]={bytes:(await fs.stat(path.join(root,name))).size};
const handler=createGameHandler(root,{files}),get=(name,opts)=>handler(new Request('jianghu://game/'+name,opts));
const report={checks:[],scope:'Windows offline protocol: exact allowlist, streaming/ranges and read-only access; not gameplay or native presentation.'};
try{
 const page=await get('play.html');assert.equal(page.status,200);assert.match(page.headers.get('content-type'),/text\/html/);assert.equal(await page.text(),'<html>江湖残卷</html>');
 for(const [range,expected] of [['bytes=2-5','2345'],['bytes=6-','6789'],['bytes=-3','789']]){const r=await get('track.m4a',{headers:{Range:range}});assert.equal(r.status,206);assert.equal(await r.text(),expected);assert.equal(Number(r.headers.get('content-length')),expected.length);}
 for(const range of ['bytes=20-','bytes=7-2','bytes=0-1,4-5','garbage'])assert.equal((await get('track.m4a',{headers:{Range:range}})).status,416);
 const head=await get('track.m4a',{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
 for(const name of ['private.txt','../private.txt','%2e%2e/private.txt','..%5cprivate.txt','.env','track.m4a%00'])assert.notEqual((await get(name)).status,200);
 assert.equal((await get('play.html',{method:'POST'})).status,403);assert.equal((await handler(new Request('jianghu://elsewhere/play.html'))).status,403);
 report.checks.push('Exact UTF-8 game bytes and MIME','Closed, open and suffix audio ranges; invalid ranges refused; HEAD has no body','Unknown/escaping/null-byte paths, foreign host and writes refused');report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}
finally{await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({out,...report}));
