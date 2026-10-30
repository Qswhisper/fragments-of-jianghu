import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {_electron} from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
import {finishArrival} from './journey-actions.mjs';
const args=process.argv.slice(2),arg=(n,d)=>args.includes(n)?args[args.indexOf(n)+1]:d;
assert.ok(arg('--exe'),'Pass the actual packaged EXE');
const executable=path.resolve(arg('--exe')),out=fileURLToPath(await createVerificationOutput('windows-app'));
const profile=path.resolve(arg('--profile',path.join(out,'profile'))),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const report={executable,profile,scope:'Actual packaged Windows EXE, hidden/muted native window, real pointer input and separate-process cold save; not audible/physical-device or installer-wizard acceptance.',checks:[],errors:[],runs:[]};
let app,page;
const state=()=>page.evaluate(()=>G.main.getState());
const fingerprint=s=>JSON.parse(JSON.stringify({scene:s.scene,hp:s.player.hp,energy:s.player.energy,hand:s.combat.hand.map(c=>c.name),enemy:s.combat.enemies.map(e=>({id:e.id,hp:e.hp})),rng:s.combat.rngSeed}));
async function launch(){
 app=await _electron.launch({executablePath:executable,args:['--kgame-verify','--kgame-data='+profile,'--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-features=CalculateNativeWinOcclusion'],env,timeout:60000});
 const metadata=await app.evaluate(({app,BrowserWindow})=>({version:app.getVersion(),electron:process.versions.electron,userData:app.getPath('userData'),windows:BrowserWindow.getAllWindows().map(w=>({visible:w.isVisible(),preferences:w.webContents.getLastWebPreferences()}))}));
 assert.equal(metadata.version,JSON.parse(await fs.readFile(path.join(fileURLToPath(new URL('../',import.meta.url)),'package.json'),'utf8')).version);assert.equal(path.resolve(metadata.userData),profile);assert.ok(metadata.windows.every(w=>!w.visible&&w.preferences.sandbox&&w.preferences.contextIsolation&&!w.preferences.nodeIntegration));report.runs.push(metadata);
 page=await app.firstWindow();page.on('pageerror',e=>report.errors.push(e.stack));await page.waitForURL('jianghu://game/play.html',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.G?.main&&G.render.realisticCombat.assetPaths.every(a=>G.render.assets.getImageEntry(a).loaded),undefined,{timeout:60000});await page.evaluate(()=>document.fonts.ready);
 assert.equal(page.url(),'jianghu://game/play.html');assert.deepEqual(await page.evaluate(()=>({require:typeof require,process:typeof process})),{require:'undefined',process:'undefined'});
}
async function click(b){const c=await page.locator('#game-canvas').boundingBox();await page.mouse.click(c.x+(b.x+b.width/2)*c.width/1280,c.y+(b.y+b.height/2)*c.height/720,{delay:60});}
async function capture(name){
 const session=await page.context().newCDPSession(page);
 try{const result=await Promise.race([session.send('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Hidden compositor unavailable after 3 seconds')),3000))]);await fs.writeFile(path.join(out,name+'.png'),Buffer.from(result.data,'base64'));}
 catch(e){(report.captureLimitations??=[]).push({name,error:e.message,scope:'Native input, DOM and save assertions continue; missing hidden compositor pixels are not claimed.'});}
 finally{await session.detach().catch(()=>{});}
}
async function nativeShot(name){
 await page.waitForFunction(()=>{const e=document.querySelector('.cinematic-story-body');return e&&Number(getComputedStyle(e).opacity)>.95;},undefined,{timeout:30000});
 const metrics=await page.locator('.cinematic-story-body').evaluate(e=>({text:e.innerText,opacity:getComputedStyle(e).opacity,display:getComputedStyle(e).display,family:getComputedStyle(e).fontFamily,color:getComputedStyle(e).color,width:e.clientWidth,height:e.clientHeight,scroll:e.scrollHeight}));assert.ok(metrics.text&&Number(metrics.opacity)>.95&&metrics.width>0&&metrics.scroll<=metrics.height+1);if(args.includes('--paper')){assert.match(metrics.family,/KGame Song/);assert.equal(metrics.color,'rgb(57, 47, 35)');}(report.chapterViews??=[]).push({name,...metrics});
 if(args.includes('--cinematic')){assert.match(metrics.family,/KGame Song/);assert.equal(metrics.color,'rgb(195, 188, 172)');}
 const session=await page.context().newCDPSession(page);
 try{const capture=await Promise.race([session.send('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Hidden compositor capture unavailable after 3 seconds')),3000))]);await fs.writeFile(path.join(out,name+'.png'),Buffer.from(capture.data,'base64'));}
 catch(e){(report.captureLimitations??=[]).push({name,error:e.message,scope:'Native DOM text, opacity, geometry and cold restore checked; unavailable hidden compositor pixels are not claimed.'});}
 finally{await session.detach().catch(()=>{});}
}
async function resume(){const buttons=await page.getByRole('button',{name:/继续/}).all();if(buttons.length)await buttons[0].click();else await click(await page.evaluate(()=>G.scenes.title.getLayout().menuButtons[1]));await page.waitForFunction(()=>G.main.getState().scene==='combat'&&!G.scenes.combat.feedback.isBusy());}
try{
 await launch();await page.screenshot({path:path.join(out,'01-title.png')});
 const loaded=await state();
 if(arg('--resume-only')){
  const expected=JSON.parse(await fs.readFile(arg('--resume-only'),'utf8'));await resume();assert.deepEqual(fingerprint(await state()),expected);report.checks.push('Same saved run continues from a different packaged EXE location with stable origin/profile');
 }else{
  assert.equal(loaded.scene,'title');await page.getByRole('button',{name:'踏入九城',exact:true}).click();await page.locator('[data-entry-focus="dirty"]').click();await page.getByRole('button',{name:'入城',exact:true}).click();await finishArrival(page);await page.waitForFunction(()=>G.main.getState().combat.hand.length&&!G.scenes.combat.feedback.isBusy());
  await page.waitForFunction(()=>!G.render.journeyMotion.debug().transition&&!G.render.sceneEntry.active()&&!G.render.animations.getActiveCardMoveCardIds('combat','draw_card_move').length,undefined,{timeout:60000,polling:100});await page.screenshot({path:path.join(out,'02-opening.png')});
  const action=await page.evaluate(()=>{const s=G.main.getState(),c=s.combat.hand.find(c=>c.playable&&G.cards.getCardByName(c.name).damage>0),e=s.combat.enemies.find(e=>e.hp>0);const expected=G.scenes.combat.previewCard(s,c.id,e.id);return {card:G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===c.id),enemy:G.scenes.combat.getEnemyLayoutBoxes(s).find(b=>b.enemy.id===e.id),expected:{energy:expected.player.energy,hp:expected.combat.enemies.find(v=>v.id===e.id).hp}};});
  await click(action.card);await page.waitForFunction(id=>G.main.getState().combat.selectedCardId===id,action.card.cardId,{timeout:30000,polling:100});await click(action.enemy);await page.waitForFunction(id=>!G.main.getState().combat.hand.some(c=>c.id===id),action.card.cardId,{timeout:30000,polling:100});await page.waitForFunction(()=>!G.scenes.combat.feedback.isBusy());
  const played=await state();assert.equal(played.player.energy,action.expected.energy);assert.equal(played.combat.enemies[0].hp,action.expected.hp);report.checks.push('Actual pointer card/target commits correct damage and energy in the packaged engine');
  await page.screenshot({path:path.join(out,'03-played.png')});const expected=fingerprint(played);await fs.writeFile(path.join(out,'expected-save.json'),JSON.stringify(expected,null,2));
  await app.close();app=null;await launch();await resume();assert.deepEqual(fingerprint(await state()),expected);report.checks.push('Normal window exit, process restart and Continue retain exact HP/energy/hand/enemy/RNG');
 }
 const media=await page.evaluate(async()=>{const manifest=await fetch('jianghu://game/assets/audio/music/suno-weathered-v1/manifest.json').then(r=>r.json());return {loaded:!!manifest,files:performance.getEntriesByType('resource').map(e=>e.name)};});assert.ok(media.loaded);assert.ok(media.files.every(u=>u.startsWith('jianghu://game/')||u.startsWith('data:')));
 const sample=await fs.readFile(path.join(path.dirname(executable),'resources/game-manifest.json'),'utf8').then(JSON.parse);const audio=Object.keys(sample.files).find(n=>/\.(ogg|wav|mp3|m4a)$/.test(n));assert.ok(audio,'The package contains an audio file for range verification');
 const range=await page.evaluate(async n=>{const r=await fetch('jianghu://game/'+n.split('/').map(encodeURIComponent).join('/'),{headers:{Range:'bytes=0-63'}});return {status:r.status,bytes:(await r.arrayBuffer()).byteLength};},audio);assert.deepEqual(range,{status:206,bytes:64});report.checks.push('Bundled fonts/images/music manifest and actual audio byte ranges load with network requests blocked');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(960,640));await page.waitForTimeout(500);await page.keyboard.press('Escape');await page.mouse.move(0,0);await page.waitForTimeout(200);
 const hand=await page.evaluate(()=>G.scenes.combat.getHandLayoutBoxes(G.main.getState())[0]),canvas=await page.locator('#game-canvas').boundingBox();report.hoverStart=await page.evaluate(()=>({frames:G.main.getState().frameCount,time:G.main.getState().timeMs}));await page.mouse.move(canvas.x+hand.centerX*canvas.width/1280,canvas.y+(hand.y+75)*canvas.height/720);await page.waitForFunction(()=>G.contextHelp?.isOpen()||G.main.getState().combat.inspectPresentation.targetVisible,undefined,{timeout:20000,polling:100}).catch(()=>{});report.hover=await page.evaluate(()=>({frames:G.main.getState().frameCount,time:G.main.getState().timeMs,result:G.main.getState().combat.result,arriving:G.render.animations.getActiveCardMoveCardIds('combat','draw_card_move'),hand:G.scenes.combat.getHandLayoutBoxes(G.main.getState()),pointer:G.main.getPointer(),overlay:G.main.getState().combat.ui?.overlay,drag:G.render.animations.getCardDrag('combat'),selected:G.main.getState().combat.selectedCardId,inspection:G.main.getState().combat.inspectPresentation,contextReader:G.contextHelp?.isOpen(),paused:G.main.isPaused(),busy:G.scenes.combat.feedback.isBusy(),visibility:document.visibilityState}));assert.ok(report.hover.contextReader||report.hover.inspection.targetVisible);await capture('04-small-hover');
 await page.evaluate(()=>G.contextHelp?.close());
 const actualRun=await state();
 await page.evaluate(()=>{let s=structuredClone(G.main.getState());s.scene='map';s.map=G.scenes.map.prepareState({...s,map:{actNumber:1,routeSeed:1223}}).map;s.mission.readPassages=[];G.main.replaceState(G.scenes.map.advanceAfterGate(s,'Windows交接夹具'));});
 await page.waitForFunction(()=>G.journeyPassage.active(G.main.getState())&&!G.render.journeyOpening.passageWaiting(G.main.getState()),undefined,{timeout:30000});
 await page.locator('.cinematic-story-body').waitFor({state:'visible'});await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.cinematic-story-body')).opacity)>.95,undefined,{timeout:30000});await nativeShot('05-chapter-fixture');
 const chapter=await state();await app.close();app=null;await launch();await page.getByRole('button',{name:'再续前路',exact:true}).click();await page.waitForFunction(()=>G.journeyPassage.active(G.main.getState())&&!G.render.journeyOpening.passageWaiting(G.main.getState()),undefined,{timeout:30000});
 const restored=await state();assert.deepEqual(restored.map.passage,chapter.map.passage);assert.deepEqual(restored.player,chapter.player);await nativeShot('06-chapter-cold-fixture');await click(await page.evaluate(()=>G.render.journeyOpening.passageLayout().next));await page.waitForFunction(()=>!G.journeyPassage.active(G.main.getState()));
 if(args.includes('--cinematic')){
  await page.evaluate(()=>{let s=structuredClone(G.main.getState());s.scene='map';s.map=G.scenes.map.prepareState({...s,map:{actNumber:5,routeSeed:1227,clearedActs:[1,2,3,4]}}).map;s.mission.readPassages=[];s.mission.resolved=false;G.main.replaceState(G.scenes.map.advanceAfterGate(s,'Windows终局夹具'));});
  await page.waitForFunction(()=>G.journeyPassage.active(G.main.getState())&&!G.render.journeyOpening.passageWaiting(G.main.getState()));
  assert.equal(await page.evaluate(()=>G.journeyPassage.describe(G.main.getState()).button),'查看本局结算');
  const expected=await page.evaluate(()=>G.runReport.build(G.main.getState(),'victory'));
  await click(await page.evaluate(()=>G.render.journeyOpening.passageLayout().next));await page.waitForFunction(()=>G.main.getState().title.mode==='report');
  const settled=await state();assert.deepEqual(settled.runReport.summaryRows,expected.summaryRows);assert.deepEqual(settled.runReport.detailLines,expected.detailLines);assert.equal(settled.runReport.outcome,'victory');assert.equal(settled.runReport.summaryRows.find(r=>r.label==='卷次').value,'5 / 5');report.settlement=settled.runReport;
  await page.waitForFunction(()=>G.render.journeyMotion.debug().age>=600&&!G.render.sceneEntry.active(),undefined,{timeout:30000});await page.screenshot({path:path.join(out,'07-final-settlement.png')});report.checks.push('Final story button reaches unchanged original settlement with exact summary and detail values in actual packaged Windows EXE');
 }
 await page.evaluate(s=>G.main.replaceState(s),actualRun);report.checks.push('Explicit native chapter fixture renders, survives full process restart, and dismisses with actual pointer; original isolated combat save restored');
 assert.deepEqual(report.errors,[]);report.checks.push('Hidden window, isolated fixed save directory and sandboxed renderer; small-window card reading works');report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{await app?.close().catch(()=>{});await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({out,passed:report.passed,profile,checks:report.checks,failure:report.failure}));

