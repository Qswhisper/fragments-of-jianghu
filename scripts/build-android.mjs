import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {projectRoot,assertManagedPath} from './project-paths.mjs';

const debug=process.argv.includes('--debug');
const reuseIndex=process.argv.indexOf('--reuse-web');
const reuseWeb=reuseIndex>=0?path.resolve(process.argv[reuseIndex+1]):null;
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||path.join(os.homedir(),'AppData/Local/Android/Sdk');
const javaHome=process.env.JAVA_HOME;
if(!javaHome)throw Error('JAVA_HOME must point to JDK 17 or newer.');
const tools=path.join(sdk,'build-tools/36.0.0'),platform=path.join(sdk,'platforms/android-36/android.jar');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const build=await assertManagedPath('output/android-build/'+stamp+(debug?'-debug':''));
await fs.mkdir(build,{recursive:true});
const game=path.join(build,'assets/game');await fs.mkdir(game,{recursive:true});
function run(exe,args,options={}){
  const result=spawnSync(exe,args,{cwd:projectRoot,windowsHide:true,encoding:'utf8',maxBuffer:4*1024*1024,...options});
  if(result.error||result.status!==0)throw Error((result.error?.message||'Command failed: '+path.basename(exe))+'\n'+result.stdout+'\n'+result.stderr);
  if(result.stdout.trim())console.log(result.stdout.trim());
  return result.stdout;
}
const j=(name)=>path.join(javaHome,'bin',name+'.exe');
const pkg=JSON.parse(await fs.readFile(path.join(projectRoot,'package.json'),'utf8'));
let manifest=await fs.readFile(path.join(projectRoot,'android/AndroidManifest.xml'),'utf8');
const version=manifest.match(/android:versionName="([^"]+)"/)?.[1];
if(!version)throw Error('Android manifest must include versionName.');
if(version!==(pkg.releaseVersion||pkg.version))throw Error('Android versionName must match the public release version.');
const sourceFiles=['play.html','main.js','art/realistic-combat/presentation.js','art/realistic-combat/dynamics.js','art/realistic-combat/journey.js'];
for(const file of sourceFiles){await fs.mkdir(path.dirname(path.join(game,file)),{recursive:true});await fs.copyFile(path.join(projectRoot,file),path.join(game,file));}
for(const dir of ['data','systems','render','scenes'])await fs.cp(path.join(projectRoot,dir),path.join(game,dir),{recursive:true});
if(reuseWeb){
  const inside=path.relative(path.join(projectRoot,'output/android-build'),reuseWeb);
  if(!inside||inside.startsWith('..')||path.isAbsolute(inside))throw Error('Reuse must come from this checkout output/android-build.');
  const manifest=JSON.parse(await fs.readFile(path.join(reuseWeb,'android-art-manifest.json'),'utf8'));
  if(![2,3].includes(manifest.processingVersion))throw Error('Cached Android art uses an obsolete quality profile; make a fresh build.');
  for(const image of manifest.images){
    const source=await fs.readFile(path.join(projectRoot,image.source));
    if(createHash('sha256').update(source).digest('hex')!==image.sha256)throw Error('Cached art is stale: '+image.source);
  }
  const images=new Map(manifest.images.map(image=>[image.source,image]));
  async function copyMobile(dir){
    for(const e of await fs.readdir(path.join(projectRoot,dir),{withFileTypes:true})){
      const relative=dir+'/'+e.name;
      if(e.isDirectory()){await copyMobile(relative);continue;}
      const image=images.get(relative),target=path.join(game,image?image.mobile:relative);
      if(e.name.endsWith('.png')&&!image)throw Error('New image requires a fresh Android art build: '+relative);
      await fs.mkdir(path.dirname(target),{recursive:true});
      await fs.copyFile(image?path.join(reuseWeb,image.mobile):path.join(projectRoot,relative),target);
    }
  }
  await copyMobile('assets');
  await fs.copyFile(path.join(reuseWeb,'android-art-manifest.json'),path.join(game,'android-art-manifest.json'));
}else await fs.cp(path.join(projectRoot,'assets'),path.join(game,'assets'),{recursive:true});
await fs.copyFile(path.join(projectRoot,'android/mobile.js'),path.join(game,'android-mobile.js'));
await fs.copyFile(path.join(projectRoot,'android/mobile.css'),path.join(game,'android-mobile.css'));
let html=await fs.readFile(path.join(game,'play.html'),'utf8');
html=html.replace('<script src="test-api.js"></script>','').replace('</head>','<link rel="stylesheet" href="android-mobile.css">\n<script>window.KGAME_MOBILE=true;</script>\n</head>').replace('</body>','<script src="android-mobile.js"></script>\n</body>');
await fs.writeFile(path.join(game,'play.html'),html);
if(reuseWeb){
  async function rewrite(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await rewrite(file);else if(/\.(js|css|html)$/.test(e.name)){
    // Source/license snapshots are provenance, not mobile image references.
    const relative=path.relative(game,file).split(path.sep);
    if(relative[0]==='assets'&&(relative.includes('licenses')||relative.includes('sources')))continue;
    await fs.writeFile(file,(await fs.readFile(file,'utf8')).replaceAll('.png','.webp'));
  }}}
  await rewrite(game);
}else run('python',['scripts/android-assets.py',projectRoot,game]);
run('python',['scripts/android-ui-profile.py',game]);
const revision=run('git',['-c','safe.directory='+projectRoot,'rev-parse','HEAD']).trim();
const dirty=!!run('git',['-c','safe.directory='+projectRoot,'status','--porcelain']).trim();
await fs.writeFile(path.join(game,'release.json'),JSON.stringify({version,sourceRevision:revision,sourceDirty:dirty,channel:'android-offline',entry:'play.html',includesTestApi:false,debug,generatedAt:new Date().toISOString()},null,2));
manifest=manifest.replace(/android:versionName="[^"]+"/,'android:versionName="'+version+'"');
if(debug)manifest=manifest.replace('<application ','<application android:debuggable="true" ');
await fs.writeFile(path.join(build,'AndroidManifest.xml'),manifest);
run(path.join(tools,'aapt2.exe'),['compile','--dir',path.join(projectRoot,'android/res'),'-o',path.join(build,'res.zip')]);
run(path.join(tools,'aapt2.exe'),['link','-o',path.join(build,'unsigned.apk'),'--manifest',path.join(build,'AndroidManifest.xml'),'-I',platform,'-A',path.join(build,'assets'),path.join(build,'res.zip')]);
await fs.mkdir(path.join(build,'classes'));
run(j('javac'),['-encoding','UTF-8','-source','8','-target','8','-classpath',platform,'-d',path.join(build,'classes'),path.join(projectRoot,'android/src/com/kgame/jianghu/GameActivity.java')]);
run(j('jar'),['cf',path.join(build,'classes.jar'),'-C',path.join(build,'classes'),'.']);
await fs.mkdir(path.join(build,'dex'));
run(j('java'),['-cp',path.join(tools,'lib/d8.jar'),'com.android.tools.r8.D8','--min-api','26','--lib',platform,'--output',path.join(build,'dex'),path.join(build,'classes.jar')]);
// Windows aapt2 emits backslashes in asset entry names. Android AssetManager
// requires exact forward-slash names; never rely on Windows ZIP extraction.
run('python',['scripts/android-apk.py','assemble',path.join(build,'unsigned.apk'),path.join(build,'dex/classes.dex'),path.join(build,'assembled.apk')]);
run(path.join(tools,'zipalign.exe'),['-f','4',path.join(build,'assembled.apk'),path.join(build,'aligned.apk')]);
// One persistent local signing identity permits updates without losing saves.
// Do not copy this directory into the game assets or distributable APK folder.
// Isolated checkouts may explicitly reuse the original signing directory.
// The signing tool consumes its password file; never read or print that file here.
const sharedSigning=process.env.KGAME_SIGNING_DIRECTORY;
const signing=sharedSigning?path.resolve(sharedSigning):await assertManagedPath('output/android-signing');
if(!sharedSigning)await fs.mkdir(signing,{recursive:true});
const key=path.join(signing,'kgame-playtest.p12'),passfile=path.join(signing,'password.txt');
try{await fs.access(key);await fs.access(passfile);}catch{
  if(sharedSigning)throw Error('Original signing identity is unavailable; refusing to generate a replacement.');
  await fs.writeFile(passfile,randomBytes(32).toString('hex')+'\n',{flag:'wx'});
  run(j('keytool'),['-genkeypair','-keystore',key,'-storetype','PKCS12','-alias','kgame-playtest','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=KGame Local Playtest,O=KGame,C=CN','-storepass:file',passfile,'-keypass:file',passfile]);
}
const delivery=await assertManagedPath('output/android-package');await fs.mkdir(delivery,{recursive:true});
const apk=path.join(debug?build:delivery,'江湖残卷_'+version+'正式版'+(debug?'-debug':'')+'.apk');
try { await fs.access(apk); throw Error('Refusing to overwrite delivery: '+apk); } catch(e) { if(e.code!=='ENOENT')throw e; }
const signedApk=path.join(build,'signed.apk');
run(j('java'),['-jar',path.join(tools,'lib/apksigner.jar'),'sign','--ks',key,'--ks-key-alias','kgame-playtest','--ks-pass','file:'+passfile,'--v4-signing-enabled','false','--out',signedApk,path.join(build,'aligned.apk')]);
const signature=run(j('java'),['-jar',path.join(tools,'lib/apksigner.jar'),'verify','--verbose','--print-certs',signedApk]);
if(sharedSigning&&!signature.toLowerCase().includes('28365b98c835ac793c292a5b86f5f522c35da915d2c3b8eae074a0b5ad72fc44'))throw Error('Signing certificate does not match the existing deliverable.');
const paths=JSON.parse(run('python',['scripts/android-apk.py','check',signedApk]));
run(path.join(tools,'zipalign.exe'),['-c','4',signedApk]);
const badging=run(path.join(tools,'aapt.exe'),['dump','badging',signedApk]);
// Legacy Windows aapt cannot read Unicode paths. Verify the ASCII staging file,
// then copy byte-for-byte to the friendly delivery filename.
await fs.copyFile(signedApk,apk,2);
const bytes=await fs.readFile(apk);
const report={version,apk,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),build,webRoot:game,debug,sourceRevision:revision,sourceDirty:dirty,signature,badging,paths};
await fs.writeFile(path.join(build,'build.json'),JSON.stringify(report,null,2));
if(!debug)await fs.writeFile(path.join(delivery,'manifest.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({apk,bytes:bytes.length,sha256:report.sha256,build},null,2));
