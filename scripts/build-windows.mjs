import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),args=process.argv.slice(2);
const value=n=>args.includes(n)?args[args.indexOf(n)+1]:null;
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const out=path.resolve(root,value('--output')||'output/windows-build/'+stamp);
if(!out.startsWith(path.join(root,'output')+path.sep))throw Error('Output must be inside this workspace/output.');
await fs.mkdir(path.dirname(out),{recursive:true});await fs.mkdir(out);
const resources=path.join(out,'build-resources');await fs.mkdir(resources);
const source=path.resolve(root,value('--game-dir')||'output/offline-package/江湖残卷_1.0正式版_PC');
const sourceWithinOutput=path.relative(path.join(root,'output'),source);
if(!sourceWithinOutput||sourceWithinOutput.startsWith('..')||path.isAbsolute(sourceWithinOutput))throw Error('Game input must be inside workspace/output.');
for(let current=source;path.relative(root,current);current=path.dirname(current)){
 if(path.dirname(current)===current)throw Error('Game input escaped the workspace.');
 if((await fs.lstat(current)).isSymbolicLink())throw Error('No reparse game input: '+current);
}
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const desktop=JSON.parse(await fs.readFile(path.join(root,'desktop/package.json'),'utf8'));
const release=JSON.parse(await fs.readFile(path.join(source,'release.json'),'utf8'));
if(release.version!==pkg.version||desktop.version!==pkg.version)throw Error('Desktop/current game versions differ.');
async function sha(file){const hash=createHash('sha256');const {createReadStream}=await import('node:fs');for await(const data of createReadStream(file))hash.update(data);return hash.digest('hex');}
const files={};
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),stat=await fs.lstat(file);if(stat.isSymbolicLink())throw Error('No reparse assets: '+file);if(entry.isDirectory())await walk(file);else if(entry.isFile())files[path.relative(source,file).split(path.sep).join('/')]= {bytes:stat.size,sha256:await sha(file)};}}
await walk(source);
const manifest={version:pkg.version,releaseVersion:pkg.releaseVersion,origin:'jianghu://game',saveKey:'kgame-journey-v1',sourceRelease:release,files};
await fs.writeFile(path.join(resources,'game-manifest.json'),JSON.stringify(manifest,null,2));
async function run(command,argv,name,extra={}){
 const stdout=await fs.open(path.join(out,name+'-stdout.txt'),'wx'),stderr=await fs.open(path.join(out,name+'-stderr.txt'),'wx');
 const code=await new Promise((resolve,reject)=>{const child=spawn(command,argv,{cwd:root,windowsHide:true,stdio:['ignore',stdout.fd,stderr.fd],...extra});child.on('error',reject);child.on('exit',resolve);});await stdout.close();await stderr.close();
 if(code!==0)throw Error(name+' failed ('+code+'); inspect '+out);return code;
}
await run('python',['-c',"from PIL import Image;import sys;Image.open(sys.argv[1]).save(sys.argv[2],format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])",path.join(root,'android/res/drawable-nodpi/brand_icon.png'),path.join(resources,'icon.ico')],'icon');
const env={...process.env,KGAME_WINDOWS_OUTPUT:out,KGAME_WINDOWS_RESOURCES:resources,KGAME_WINDOWS_GAME_SOURCE:source,CSC_IDENTITY_AUTO_DISCOVERY:'false'};
for(const key of ['CSC_LINK','CSC_KEY_PASSWORD','WIN_CSC_LINK','WIN_CSC_KEY_PASSWORD','GH_TOKEN','GITHUB_TOKEN'])delete env[key];
const cli=path.join(root,'desktop/node_modules/electron-builder/out/cli/cli.js');
const command=[cli,'--projectDir',path.join(root,'desktop'),'--config',path.join(root,'desktop/electron-builder.cjs'),'--x64','--publish','never'];
if(args.includes('--dir'))command.push('--dir');else command.push('--win','nsis');
const prepackaged=value('--prepackaged');if(prepackaged){const previous=path.resolve(root,prepackaged);if(!previous.startsWith(path.join(root,'output')+path.sep))throw Error('Prepackaged input must be inside output.');command.push('--prepackaged',previous);}
console.log('Windows build output: '+out);
await run(process.execPath,command,'builder',{env});
const record={version:pkg.version,output:out,source,gameFiles:Object.keys(files).length,gameBytes:Object.values(files).reduce((n,f)=>n+f.bytes,0),electron:desktop.devDependencies.electron,builder:desktop.devDependencies['electron-builder'],sourceRelease:release,icon:{source:'android/res/drawable-nodpi/brand_icon.png',sha256:await sha(path.join(root,'android/res/drawable-nodpi/brand_icon.png'))},mode:args.includes('--dir')?'directory':'offline-nsis'};
await fs.writeFile(path.join(out,'build.json'),JSON.stringify(record,null,2));console.log(JSON.stringify(record));
