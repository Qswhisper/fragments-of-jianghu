'use strict';
const {app,BrowserWindow,Menu,protocol,session} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const {createGameHandler} = require('./game-protocol.cjs');
const verify=process.argv.includes('--kgame-verify');
const dataArg=process.argv.find(v=>v.startsWith('--kgame-data='));
let profile;
if (verify) {
  if (!dataArg || !path.isAbsolute(dataArg.slice(13))) throw new Error('Verification requires an isolated absolute profile.');
  profile=dataArg.slice(13);
  app.commandLine.appendSwitch('mute-audio');
  app.commandLine.appendSwitch('headless');
} else profile=path.join(app.getPath('appData'),'FragmentsOfJianghu');
fs.mkdirSync(profile,{recursive:true});app.setPath('userData',profile);
app.setAppUserModelId('com.kgame.jianghu.desktop');
protocol.registerSchemesAsPrivileged([{scheme:'jianghu',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
const ownLock=app.requestSingleInstanceLock();
let window,closing=false;
if(!ownLock)app.quit();
else {
  app.on('second-instance',()=>{if(window&&!verify){if(window.isMinimized())window.restore();window.focus();}});
  app.whenReady().then(async()=>{
    Menu.setApplicationMenu(null);
    const resources=app.isPackaged?process.resourcesPath:path.resolve(__dirname,'../build');
    const game=app.isPackaged?path.join(resources,'game'):path.resolve(__dirname,'../../output/offline-package/江湖残卷_1.0正式版_PC');
    const manifest=JSON.parse(fs.readFileSync(path.join(resources,'game-manifest.json'),'utf8'));
    protocol.handle('jianghu',createGameHandler(game,manifest));
    session.defaultSession.setPermissionRequestHandler((_web,_permission,callback)=>callback(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith('jianghu://game/')&&!details.url.startsWith('data:')&&!details.url.startsWith('blob:jianghu://game/')}));
    window=new BrowserWindow({width:1280,height:800,minWidth:960,minHeight:640,title:'江湖残卷',backgroundColor:'#101411',show:false,autoHideMenuBar:true,
      webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,devTools:verify,backgroundThrottling:!verify}});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('jianghu://game/'))event.preventDefault();});
    window.once('ready-to-show',()=>{if(!verify)window.show();});
    window.on('close',event=>{
      if(closing)return;event.preventDefault();closing=true;
      window.webContents.executeJavaScript(`(()=>{if(!window.G?.main||!G.storage)return;const s=G.main.getState();if(s.scene!=='title'&&!(s.scene==='combat'&&s.combat.result==='defeat')&&!s.map?.completed)G.storage.saveRun(s);})()`).catch(()=>{}).finally(()=>{session.defaultSession.flushStorageData();window.destroy();app.quit();});
    });
    await window.loadURL('jianghu://game/play.html');
  });
  app.on('window-all-closed',()=>app.quit());
}
