import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const textTypes=new Set(['.js','.mjs','.cjs','.css','.html','.json','.md','.txt','.java','.xml','.svg']);
const processText=/用户.{0,16}(?:认可|认同|认定|接受|批准|确认|选定|选用|选择|反馈|要求)|(?:按|根据|遵循).{0,10}用户|已(?:认可|批准|验收)|\buser\b.{0,35}(?:select|approv|accept|request|authoriz|feedback|criticiz|directed|chose|adoption|reference)|user(?:Feedback|AestheticAcceptance|DirectionAccepted)|\b(?:Codex|ChatGPT)\b|Gemini-authored|AI\s*辅助|\bagent\b.{0,60}(?:review|acceptance)/i;
const processComment=/(?:\/\/|\/\*|<!--)[^\n]*(?:\bapproved\b|\baccepted\b)/i;
const rootFiles=['play.html','main.js','THIRD_PARTY_NOTICES.md','android-mobile.js','android-mobile.css','android/src/com/kgame/jianghu/GameActivity.java','android/mobile.js','android/mobile.css','desktop/app/main.cjs','desktop/app/game-protocol.cjs','desktop/electron-builder.cjs'];
const folders=['data','systems','render','scenes','assets'];
const artFiles=['presentation.js','dynamics.js','journey.js'];

export function distributionFile(relative){
  const name=relative.replaceAll('\\','/');
  return !['index.html','test-api.js','PLAYTEST.md'].includes(name)&&!/(?:^|\/)(?:\.env[^/]*|node_modules|\.git|__pycache__)(?:\/|$)/.test(name);
}
function reviewable(relative){
  // Original third-party source pages and licence terms are immutable evidence.
  return !/(?:^|\/)(?:licenses|sources)(?:\/|$)/i.test(relative)&&textTypes.has(path.extname(relative).toLowerCase());
}
export async function inspectReleaseContent(base){
  const found=[],files=[];
  async function walk(relative){
    const file=path.join(base,relative);let stat;
    try{stat=await fs.lstat(file);}catch(e){if(e.code==='ENOENT')return;throw e;}
    if(stat.isSymbolicLink())throw Error('Release content cannot traverse a link: '+relative);
    if(stat.isDirectory()){for(const name of await fs.readdir(file))await walk(relative+'/'+name);return;}
    if(!stat.isFile()||!reviewable(relative))return;
    files.push(relative);
    if(relative.startsWith('assets/')&&path.extname(relative).toLowerCase()==='.json'&&path.basename(relative).toLowerCase().includes('source')){
      const index=JSON.parse(await fs.readFile(file,'utf8'));
      if(index.schema!=='asset-identity-v1')found.push({file:relative,line:1,context:'Asset source records must use the release identity schema.'});
    }
    const source=(await fs.readFile(file,'utf8')).replace(/data:[^\s;"']{1,80};base64,[A-Za-z0-9+/=]+/g,'[media]')
      .replace(/\\u([0-9a-f]{4})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
    for(const [index,line] of source.split(/\r?\n/).entries()){
      const inspected=path.extname(relative).toLowerCase()==='.css'?line.replace(/(?:-webkit-)?user-select\s*:\s*[^;}]+/g,'[selection property]'):line;
      const match=processText.exec(inspected)||processComment.exec(inspected);
      if(match)found.push({file:relative,line:index+1,context:line.slice(Math.max(0,match.index-40),match.index+180)});
    }
  }
  for(const relative of [...rootFiles,...folders,...artFiles.map(f=>'art/realistic-combat/'+f)])await walk(relative);
  return {files:files.length,findings:found};
}
export async function assertReleaseContent(base){
  const result=await inspectReleaseContent(base);
  if(result.findings.length)throw Error('Process notes in release content:\n'+JSON.stringify(result.findings.slice(0,30),null,2));
  return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const base=path.resolve(process.argv[2]||'.'),result=await inspectReleaseContent(base);
  console.log(JSON.stringify({passed:result.findings.length===0,...result},null,2));
  if(result.findings.length)process.exitCode=1;
}
