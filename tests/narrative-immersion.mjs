import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
import {finishArrival} from './journey-actions.mjs';
const args=process.argv.slice(2),arg=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const root=fileURLToPath(new URL('../',import.meta.url)),entry=new URL('../'+arg('--entry','play.html'),import.meta.url);
const before=arg('--before'),out=fileURLToPath(await createVerificationOutput('narrative-immersion'));
const report={entry:entry.href,before,scope:'Actual opening/input, saved handoff and later-scene fixtures; not a natural campaign or human narrative acceptance',checks:[],screens:[],layouts:[],errors:[]};
let browser,p;
const sizes=[[1280,720],[960,600],[1920,1080],[854,393],[740,360],[640,360],[880,405]];
const outcomes={};
async function nemesis(page,base){return page.evaluate(base=>{let s=structuredClone(base);s.map=G.scenes.map.prepareState({...s,map:{actNumber:2,routeSeed:77}}).map;s.nemesis={pool:[],nextId:1,currentRunEntryIds:[]};const e=G.enemies.buildEncounter('gate_guard_chief');s.combat={...s.combat,result:'victory',nodeType:'gate',encounterId:e.id,enemies:e.enemies,nemesisRecorded:false,lastKillCardName:'抹脖子',lastPlayedCardName:'抹脖子'};s=G.nemesis.recordBattleOutcome(s);s.scene='nemesis';s.nemesisIntro={entryId:s.nemesis.pool[0].id};G.main.replaceState(G.scenes.nemesis.prepareState(s));},base);}
async function shot(page,name){await page.waitForFunction(()=>!G.render.journeyMotion.debug().transition&&(G.main.getState().title?.mode!=='report'||G.render.journeyMotion.debug().age>=600&&!G.render.sceneEntry.active()));if(await page.locator('.cinematic-story-body:visible').count())await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.cinematic-story-body')).opacity)>.95);await page.screenshot({path:path.join(out,name+'.png')});report.screens.push(name);}
async function click(page,b,touch=false){await page.waitForFunction(()=>!G.render.journeyMotion.debug().transition);const c=await page.locator('#game-canvas').boundingBox(),x=c.x+(b.x+b.width/2)*c.width/1280,y=c.y+(b.y+b.height/2)*c.height/720;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y,{delay:45});await page.waitForTimeout(160);}
async function start(page){await page.goto(entry.href);await page.getByRole('button',{name:'踏入九城',exact:true}).click();await page.getByRole('button',{name:'入城',exact:true}).click();await page.locator('.cinematic-story-body').waitFor({state:'visible'});}
async function gate(page,base,act){return page.evaluate(({base,act})=>{
  let s=structuredClone(base);s.scene='map';s.mission.readPassages=[];s.mission.resolved=false;s.mission.outcome=null;
  s.map=G.scenes.map.prepareState({...s,map:{actNumber:act,routeSeed:1000+act,clearedActs:Array.from({length:act-1},(_,i)=>i+1)}}).map;
  s=G.scenes.map.advanceAfterGate(s,'同输入对照');G.main.replaceState(s);
  return {player:s.player,combat:s.combat,nemesis:s.nemesis,events:s.events,mapSeed:s.map.routeSeed,completed:s.map.completed,mission:s.mission};
},{base,act});}
try{
  if(before){
    async function definitions(dir){const c={G:{}};c.window=c;vm.createContext(c);for(const f of ['data/journey-events.js','data/events.js']){const source=await fs.stat(path.join(dir,f)).catch(()=>null)?path.join(dir,f):path.join(root,f);vm.runInContext(await fs.readFile(source,'utf8'),c);}return JSON.parse(JSON.stringify([...c.G.events.definitions,...c.G.journeyEvents.definitions].map(e=>({id:e.id,act:e.act,consequence:e.consequence,choices:e.choices.map(q=>({id:q.id,preview:q.preview,effects:q.effects}))}))));}
    assert.deepEqual(await definitions(root),await definitions(before));report.checks.push('All 34 ordinary/later definitions retain IDs, choices, effects, previews and consequences exactly');
  }
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
  p=await browser.newPage({viewport:{width:1280,height:720},hasTouch:true,offline:true});p.on('pageerror',e=>report.errors.push(e.stack));
  await start(p);await shot(p,'new-opening');
  for(const [width,height] of sizes){await p.setViewportSize({width,height});const fit=await p.locator('.cinematic-story-body').evaluate(e=>({scroll:e.scrollHeight,height:e.clientHeight,bottom:e.getBoundingClientRect().bottom,button:document.querySelector('.entry-start').getBoundingClientRect().top}));report.layouts.push({scene:'opening',width,height,...fit});assert.ok(fit.scroll<=fit.height+1,JSON.stringify(report.layouts.at(-1)));assert.ok(fit.bottom<fit.button);}
  await p.setViewportSize({width:1280,height:720});await finishArrival(p);await p.waitForFunction(()=>G.main.getState().combat.seeded);
  const base=await p.evaluate(()=>G.main.getState());
  for(let act=1;act<=5;act++){
    const next=await gate(p,base,act);outcomes[act]=next;await p.waitForFunction(()=>G.journeyPassage.active(G.main.getState())&&!G.render.journeyOpening.passageWaiting(G.main.getState()));
    if(args.includes('--paper')){
      await p.waitForFunction(()=>{const e=document.querySelector('.cinematic-story-body'),h=document.querySelector('.cinematic-heading');return e&&h?.textContent===G.journeyPassage.describe(G.main.getState()).title&&Number(getComputedStyle(e).opacity)>.95;});
      const type=await p.locator('.cinematic-story-body').evaluate(e=>{const f=getComputedStyle(e),button=document.querySelector('.story-paper-action'),bg=getComputedStyle(button,'::before');return {family:f.fontFamily,weight:f.fontWeight,color:f.color,loaded:document.fonts.check('500 26px "KGame Song"','老陈原件'),buttonWidth:button.clientWidth,paintedButtonWidth:parseFloat(bg.width),rotate:bg.rotate};});
      (report.paperTypography??=[]).push({act,...type});assert.match(type.family,/KGame Song/);assert.ok(type.loaded);assert.equal(type.color,'rgb(57, 47, 35)');assert.ok(type.paintedButtonWidth>=type.buttonWidth-1,JSON.stringify(type));assert.equal(type.rotate,'0deg');
    }
    if(args.includes('--cinematic')){
      await p.waitForFunction(()=>document.querySelector('.cinematic-heading')?.textContent===G.journeyPassage.describe(G.main.getState()).title);
      const type=await p.locator('.cinematic-story-body').evaluate(e=>({family:getComputedStyle(e).fontFamily,color:getComputedStyle(e).color,loaded:document.fonts.check('500 26px "KGame Song"','老陈原件'),arrow:!!document.querySelector('.cinematic-forward'),paperAction:!!document.querySelector('.story-paper-action'),button:document.querySelector('[data-entry-focus="passage-next"]').getAttribute('aria-label')}));
      (report.cinematicTypography??=[]).push({act,...type});assert.match(type.family,/KGame Song/);assert.ok(type.loaded&&type.arrow&&!type.paperAction);assert.equal(type.color,'rgb(195, 188, 172)');if(act===5)assert.equal(type.button,'查看本局结算');
    }
    for(const [width,height] of sizes){await p.setViewportSize({width,height});await p.locator('.cinematic-story-body').waitFor({state:'visible'});const fit=await p.locator('.cinematic-story-body').evaluate(e=>({scroll:e.scrollHeight,height:e.clientHeight,bottom:e.getBoundingClientRect().bottom,button:document.querySelector('.entry-start').getBoundingClientRect().top,text:e.innerText}));report.layouts.push({scene:'chapter-'+act,width,height,...fit});assert.ok(fit.scroll<=fit.height+1,JSON.stringify(report.layouts.at(-1)));assert.ok(fit.bottom<fit.button);if(width===1280||width===640)await shot(p,'new-chapter-'+act+'-'+width);}
    await p.setViewportSize({width:1280,height:720});
    if(act===1){
      const saved=await p.evaluate(()=>G.storage.loadRun());assert.equal(saved.map.passage.act,1);
      await p.reload();await p.getByRole('button',{name:'再续前路',exact:true}).click();await p.waitForFunction(()=>G.journeyPassage.active(G.main.getState())&&!G.render.journeyOpening.passageWaiting(G.main.getState()));
      assert.match(await p.locator('.cinematic-story-body').innerText(),/老陈/);report.checks.push('Reload/Continue resumes unread handoff at the same act without replaying reward');
    }
    // Background clicks cannot select a route through the reading scene.
    await click(p,{x:400,y:600,width:0,height:0});assert.equal(await p.evaluate(()=>G.main.getState().map.passage.act),act);
    const expectedReport=act===5?await p.evaluate(()=>G.runReport.build(G.main.getState(),'victory')):null;
    await click(p,await p.evaluate(()=>G.render.journeyOpening.passageLayout().next),act===2||act===5);
    await p.waitForFunction(()=>!G.journeyPassage.active(G.main.getState()));
    const after=await p.evaluate(()=>G.main.getState());assert.deepEqual(after.player,next.player);assert.deepEqual(after.combat,next.combat);
    if(act<5){assert.equal(after.scene,'map');assert.ok(after.mission.readPassages.includes(act));}else {
      assert.equal(after.scene,'title');assert.equal(after.title.mode,'report');assert.equal(after.runReport.outcome,'victory');assert.equal(await p.evaluate(()=>G.storage.hasRunSave()),false);
      assert.deepEqual(after.runReport.summaryRows,expectedReport.summaryRows);assert.deepEqual(after.runReport.detailLines,expectedReport.detailLines);report.settlement={title:after.runReport.title,rows:after.runReport.summaryRows,details:after.runReport.detailLines};
      await shot(p,'settlement-1280');await p.setViewportSize({width:640,height:360});await shot(p,'settlement-640');
      await click(p,await p.evaluate(()=>G.scenes.title.getLayout().reportDetails),true);await p.locator('#journey-dialog[open]').waitFor();await shot(p,'settlement-details-640');await p.keyboard.press('Escape');
      await p.setViewportSize({width:1280,height:720});await click(p,await p.evaluate(()=>G.scenes.title.getLayout().reportButtons[0]));await p.waitForFunction(()=>G.main.getState().title.mode==='menu');
      report.checks.push('Final chapter actual touch leads to original settlement with exact summary/detail values; details open on touch, and return-to-menu works');
    }
  }
  report.checks.push('All five handoffs fit seven viewports; actual mouse and touch dismissal, background blocking and no resource/combat changes; victory closes once');
  await gate(p,base,3);await p.evaluate(()=>{const s=structuredClone(G.main.getState());delete s.mission.storyRevision;G.main.replaceState(s);});assert.doesNotMatch(await p.evaluate(()=>G.journeyPassage.describe(G.main.getState()).body),/老陈/);report.checks.push('Old active save uses a factual handoff without inserting unseen personal history');
  await p.evaluate(base=>{let s=structuredClone(base);s.map=G.scenes.map.prepareState({...s,map:{actNumber:1,routeSeed:8}}).map;s.map.currentNodeId='node_1';s.scene='event';s=G.events.prepareSceneState(s);s.event.mode='result';s.event.resultText='已提交的旧结果';s.event.resultSummary=['原回执'];s.event.copyRevision=3;const next=G.events.prepareSceneState(s);if(next.event.resultText!=='已提交的旧结果')throw Error('Committed result changed');},base);
  await nemesis(p,base);await shot(p,'new-nemesis');
  report.nemesisPaint=await p.evaluate(()=>G.render.nemesisDossier.debug().painted);assert.ok(report.nemesisPaint.some(x=>x.text.includes('抹脖子')));assert.ok(report.nemesisPaint.filter(x=>x.text.includes('抹脖子')||x.text.includes('这次，')).every(x=>x.y<300));
  if(before){
    const old=await browser.newPage({viewport:{width:1280,height:720},offline:true});
    await old.route('**/*',async route=>{let rel;try{rel=path.relative(root,fileURLToPath(route.request().url()));}catch{return route.continue();}if(rel.startsWith('..'))return route.continue();try{const body=await fs.readFile(path.join(before,rel));await route.fulfill({body,contentType:rel.endsWith('.html')?'text/html':rel.endsWith('.css')?'text/css':'application/javascript'});}catch(e){if(e.code!=='ENOENT')throw e;await route.continue();}});
    await start(old);const previousHasPassage=await old.evaluate(()=>!!G.journeyPassage);report.comparisonHasPassage=previousHasPassage;await shot(old,'old-opening');await finishArrival(old);
    for(const act of [1,3,5]){const previous=await gate(old,base,act);for(const key of ['player','combat','nemesis','events','mapSeed','completed'])assert.deepEqual(previous[key],outcomes[act][key],key+' changed at '+act);if(previousHasPassage)await old.waitForFunction(()=>!G.render.journeyOpening.passageWaiting(G.main.getState()));await shot(old,'old-after-gate-'+act);report.checks.push('Actual pre-change code/rendering captured at gate '+act+' under the same player/combat seed input; resources, RNG and outcomes equal');
      if(act===5){await click(old,previousHasPassage?await old.evaluate(()=>G.render.journeyOpening.passageLayout().next):{x:500,y:600,width:0,height:0});await old.waitForFunction(()=>G.main.getState().title.mode==='report');assert.deepEqual(await old.evaluate(()=>G.main.getState().runReport.summaryRows),report.settlement.rows);await shot(old,'old-settlement-1280');}
    }
    await nemesis(old,base);await shot(old,'old-nemesis');if(!previousHasPassage)assert.ok(!(await old.evaluate(()=>G.render.nemesisDossier.debug().painted)).some(x=>x.text.includes('抹脖子')));
    await old.close();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;if(p)await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{await browser?.close();await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({out,passed:report.passed,checks:report.checks,failure:report.failure}));
