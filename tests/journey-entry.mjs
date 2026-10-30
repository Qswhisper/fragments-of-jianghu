import {finishArrival} from './journey-actions.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const args=process.argv.slice(2),at=args.indexOf('--entry'),entry=new URL('../'+(at<0?'play.html':args[at+1]),import.meta.url);
const scope=entry.href.includes('/dist/')?'dist':entry.href.includes('/offline-package/')?'offline':'source';
import {createVerificationOutput} from './verification-output.mjs';
const out=await createVerificationOutput('entry-'+scope);
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});}catch(e){if(!/not found|doesn't exist|ENOENT/i.test(e.message))throw e;browser=await chromium.launch({channel:'msedge',headless:true,args:['--mute-audio']});}
const errors=[],checks=[],report={entry:entry.href,normalClock:true,headless:true,muted:true,checks,errors};let p;
try{
 p=await browser.newPage({viewport:{width:1280,height:720}});p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
 await p.goto(entry.href);await p.waitForFunction(()=>window.G?.main&&Object.values(G.render.journeyEntry.paths).every(a=>G.render.assets.getImageEntry(a).loaded)&&G.render.realisticCombat.assetPaths.every(a=>G.render.assets.getImageEntry(a).loaded));
 const state=()=>p.evaluate(()=>G.main.getState()),shot=async name=>{await p.mouse.move(1,1);await p.waitForTimeout(120);await p.screenshot({path:fileURLToPath(new URL(name+'.png',out))});};
 const click=async b=>{const c=await p.locator('#game-canvas').boundingBox();await p.mouse.click(c.x+(b.x+b.width/2)*c.width/1280,c.y+(b.y+b.height/2)*c.height/720,{delay:45});await p.waitForTimeout(130);};
 const openTool=async id=>{await p.click('#open-pause');await p.click(id);},closeTool=()=>p.click('#close-dialog');
 await shot('01-menu');assert.equal(await p.getByRole('button',{name:'再续前路',exact:true}).count(),0);assert.equal(await p.locator('#journey-bar').count(),0);assert.equal(await p.locator('#open-pause').isVisible(),false);assert.doesNotMatch(await p.locator('#entry-ui').textContent(),/晚清|五卷|旧仇|已保留/);await p.keyboard.press('p');assert.equal(await p.locator('dialog').isVisible(),false);checks.push('Main menu has only title/actions, no marketing labels, empty Continue, bottom bar or pause tools');
 await p.getByRole('button',{name:'设置',exact:true}).click();await p.waitForSelector('dialog[open]');
 await p.getByLabel('总音量',{exact:true}).fill('0');await p.getByLabel('音乐',{exact:true}).fill('0.35');await p.getByLabel('音效',{exact:true}).fill('0.6');await p.getByLabel('图像缩放').selectOption('low');await p.getByLabel('图像缩放').selectOption('high');await shot('02-settings');await p.getByRole('button',{name:'返回',exact:true}).click();
 await p.reload();await p.waitForFunction(()=>G.main&&G.render.assets.getImageEntry(G.render.journeyEntry.paths.menu).loaded);
 let s=await state();assert.equal(s.settings.volume,0);assert.equal(s.settings.musicVolume,.35);assert.equal(s.settings.sfxVolume,.6);
 checks.push('Direct main-menu audio/animation settings persist, including independent music/SFX');
 await p.getByRole('button',{name:'踏入九城',exact:true}).click();await p.waitForFunction(()=>G.main.getState().title.mode==='styles');
 for(const id of ['blade','iron','dirty','combo']){
   const option=await p.evaluate(id=>G.main.getState().title.options.find(o=>o.id===id),id);await p.getByRole('button',{name:option.name,exact:true}).click();await p.waitForFunction(id=>G.main.getState().title.selectedStyle===id,id);
   await shot('03-style-'+id);
   assert.equal(await p.locator('.entry-school').count(),4);assert.equal(await p.locator('.cinematic-detail').count(),1);assert.equal(await p.locator('.cinematic-detail').textContent(),await p.evaluate(id=>G.render.journeyOpening.descriptions[id].line,id));assert.equal(await p.locator('#entry-ui canvas').count(),0);assert.equal(await p.locator('#open-pause').isVisible(),false);
   await p.locator('.entry-loadout').click();await p.waitForSelector('dialog[open]');
   const expected=await p.evaluate(id=>{const names=G.cards.getStarterDeck(id);return [...new Set(names)].map(name=>({name,count:names.filter(n=>n===name).length,text:G.cards.getCardByName(name).text}));},id);
   assert.deepEqual(await p.locator('.entry h2').allTextContents(),expected.map(c=>c.name));assert.deepEqual(await p.locator('.entry p').allTextContents(),expected.map(c=>c.text));assert.deepEqual(await p.locator('.entry .meta').allTextContents(),await p.evaluate(expected=>expected.map(c=>'× '+c.count+' · 体力 '+G.cards.getCardByName(c.name).cost),expected));
   await p.keyboard.press('Escape');assert.equal(await p.locator('dialog').isVisible(),false);assert.equal((await state()).title.selectedStyle,id);
 }
 checks.push('Four scene choices show their short hint; the visible starter-book control opens exact card names, counts, costs and effects without changing style');
 await p.getByRole('button',{name:'贴身短打',exact:true}).focus();await p.keyboard.press('ArrowUp');await p.waitForFunction(()=>G.main.getState().title.selectedStyle==='dirty');assert.equal(await p.locator(':focus').getAttribute('data-entry-focus'),'dirty');await p.keyboard.press('ArrowDown');await p.waitForFunction(()=>G.main.getState().title.selectedStyle==='combo');
 // The native close event is deferred. A choice queued immediately after closing
 // must survive that event; use one UI-event task to exercise the race reliably.
 await p.evaluate(()=>G.journeyShell.openStarterDeck());await p.evaluate(()=>{document.getElementById('close-dialog').click();const b=document.querySelector('[data-entry-focus="combo"]');b.focus();b.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));});await p.waitForFunction(()=>G.main.getState().title.selectedStyle==='dirty');assert.equal(await p.locator(':focus').getAttribute('data-entry-focus'),'dirty');await p.keyboard.press('ArrowDown');await p.waitForFunction(()=>G.main.getState().title.selectedStyle==='combo');checks.push('Arrow selection preserves native focus; immediate selection after dialog close survives its deferred close event');
 for(const size of [{width:960,height:600},{width:1920,height:1080}]){await p.setViewportSize(size);await shot('04-style-'+size.width);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const bad=await p.locator('#entry-ui > *').evaluateAll(nodes=>nodes.filter(e=>{const b=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return b.left<p.left-1||b.right>p.right+1||b.bottom>p.bottom+1;}).map(e=>e.className));assert.deepEqual(bad,[]);assert.ok(await p.locator('.cinematic-detail').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));}
 await p.setViewportSize({width:1280,height:720});await p.keyboard.press('Escape');await p.waitForFunction(()=>G.main.getState().title.mode==='menu');await shot('05-menu-return');checks.push('960/1920 layouts fit; hint remains at least 16px; Escape returns to main menu');
 await p.getByRole('button',{name:'踏入九城',exact:true}).click();await p.getByRole('button',{name:'吹命刀',exact:true}).click();await p.getByRole('button',{name:'入城',exact:true}).click();await finishArrival(p);
 s=await state();assert.deepEqual(s.player.masterDeckNames,await p.evaluate(()=>G.cards.getStarterDeck('blade')));assert.equal(await p.locator('#entry-ui').isVisible(),false);await shot('06-combat');
 await p.click('#open-pause');await shot('06-pause');assert.equal(await p.locator('dialog input').count(),0);const time=(await state()).timeMs;await p.waitForTimeout(250);assert.equal((await state()).timeMs,time);await p.click('#open-settings');assert.equal(await p.getByLabel('音乐',{exact:true}).inputValue(),'0.35');await p.getByRole('button',{name:'返回上级'}).click();assert.ok(await p.locator('dialog.pause-root').isVisible());await p.keyboard.press('Escape');
 await openTool('#open-deck');assert.doesNotMatch(await p.locator('#dialog-content').textContent(),/\{\w+\}|耗气/);await shot('07-deck');await p.keyboard.press('Escape');assert.ok(await p.locator('dialog.pause-root').isVisible());await p.keyboard.press('Escape');assert.equal(await p.locator('dialog').isVisible(),false);
 await openTool('#open-route');assert.match(await p.locator('#dialog-content').textContent(),/吹命刀/);assert.doesNotMatch(await p.locator('#dialog-content').textContent(),/舍命刀/);await closeTool();checks.push('Gameplay tools live under pause; back/Escape return to parent, second Escape resumes; settings are shared');
 await click(await p.evaluate(()=>G.scenes.combat.debugGetLayout().drawPile));await p.waitForFunction(()=>G.main.getState().combat.ui?.overlay?.visible);await p.keyboard.press('Escape');await p.waitForFunction(()=>!G.main.getState().combat.ui?.overlay?.visible);assert.equal(await p.locator('dialog').isVisible(),false);checks.push('Escape closes the existing combat pile viewer without opening pause');
 // Natural opening encounter: previews use clones, submitted moves use mouse input.
 const plan=()=>p.evaluate(()=>{
   const value=s=>s.combat.result==='victory'?10000+s.player.hp*8:s.combat.result==='defeat'?-10000:(()=>{const n=G.enemyAI.resolveEndTurn(s);return n.combat.result==='defeat'?-10000:n.player.hp*8-n.combat.enemies.reduce((t,e)=>t+Math.max(0,e.hp),0)*2;})();
   let beam=[{s:G.main.getState(),moves:[]}],best=null;
   for(let depth=0;depth<7;depth++){const next=[];for(const n of beam){const score=value(n.s)-n.moves.length*.01;if(!best||score>best.score)best={...n,score};if(n.s.combat.result!=='active')continue;for(const c of n.s.combat.hand.filter(c=>c.playable))for(const e of n.s.combat.enemies.filter(e=>e.hp>0)){const s=G.scenes.combat.previewCard(n.s,c.id,e.id);next.push({s,moves:[...n.moves,{cardId:c.id,target:e.id}]});}}next.sort((a,b)=>value(b.s)-value(a.s));beam=next.slice(0,12);if(!beam.length)break;}return best?.moves[0]||null;
 });
 let moves=0;
 while(moves++<85){
   await p.waitForFunction(()=>!G.scenes.combat.feedback.isBusy(),null,{timeout:15000});s=await state();if(s.scene!=='combat')break;if(s.combat.result==='victory'){await p.waitForTimeout(250);continue;}assert.notEqual(s.combat.result,'defeat');const move=await plan();
   if(move){
     const boxes=await p.evaluate(move=>{
       const s=G.main.getState(),hand=G.scenes.combat.getHandLayoutBoxes(s),b=hand.find(b=>b.cardId===move.cardId),card=s.combat.hand.find(c=>c.id===move.cardId);
       const inside=(p,v)=>p.x>=v.hitX&&p.x<=v.hitX+v.hitWidth&&p.y>=v.hitY&&p.y<=v.hitY+v.hitHeight;let point;
       for(const fy of [.35,.18,.5,.08,.65])for(const fx of [.5,.12,.25,.04,.75,.88]){const q={x:b.hitX+b.hitWidth*fx,y:b.hitY+b.hitHeight*fy};if(!point&&q.y<718&&hand.filter(v=>inside(q,v)).at(-1)?.cardId===b.cardId)point=q;}
       if(!point)throw new Error('No exposed hand card');return {point,target:G.render.combatInteraction.needsEnemy(s.combat.cardLibrary[card.name])?G.scenes.combat.getEnemyLayoutBoxes(s).find(e=>e.enemy.id===move.target):G.render.combatInteraction.selfBox};
     },move);
     await click({...boxes.point,width:0,height:0});await p.waitForFunction(id=>G.main.getState().combat.selectedCardId===id,move.cardId);await click(boxes.target);await p.waitForFunction(id=>!G.main.getState().combat.hand.some(c=>c.id===id),move.cardId);
   }else await click(await p.evaluate(()=>G.scenes.combat.debugGetLayout().endTurn));
 }
 s=await state();assert.equal(s.scene,'reward');assert.equal(s.campaign.battles.length,1);assert.equal(s.campaign.battles[0].result,'victory');await shot('08-natural-reward');report.opening={moves,turns:s.campaign.battles[0].turns,hp:s.player.hp,stateReplacements:0};checks.push('Actual blade starter deck wins the opening encounter through normal RAF and pointer input, reaches frozen reward');
 await click((await p.evaluate(()=>G.scenes.reward.getLayout(G.main.getState().reward.options.length))).cards[0]);assert.equal((await state()).reward.reviewSelectedIndex,0);await openTool('#open-help');await p.keyboard.press('Escape');await p.keyboard.press('Escape');assert.equal((await state()).reward.reviewSelectedIndex,0);await p.keyboard.press('Escape');await p.waitForFunction(()=>G.main.getState().reward.reviewSelectedIndex===null);assert.equal(await p.locator('dialog').isVisible(),false);checks.push('Pause hierarchy preserves reward selection; scene Escape still cancels that selection');
 // Explicit content fixture after the natural encounter, separate from that playthrough.
 const names=await p.evaluate(()=>Object.values(G.cards.definitions).flatMap(d=>[d.name,d.nameUpgraded]));await p.evaluate(names=>{const s=G.main.getState();s.player.masterDeckNames=names;s.player.deckSize=names.length;G.main.replaceState(s);},names);
 await openTool('#open-deck');assert.equal(await p.locator('.entry').count(),names.length);assert.doesNotMatch(await p.locator('#dialog-content').textContent(),/\{\w+\}/);
 const rendered=await p.locator('.entry p').allTextContents(),expected=await p.evaluate(names=>names.map(n=>G.cards.getCardByName(n).text),names);assert.deepEqual(rendered,expected);checks.push(names.length+' normal/upgraded card descriptions exactly match resolved rule text');await closeTool();
 // Rest cancellation fixture checks the new global Escape handler against the
 // frozen scene's own heal and upgrade previews; it is not part of the natural opening.
 await p.evaluate(()=>{const s=G.main.getState();s.scene='rest';s.player.hp=40;s.player.masterDeckNames=G.cards.getStarterDeck('blade');s.player.deckSize=s.player.masterDeckNames.length;s.map=G.scenes.map.prepareState({...s,map:{actNumber:1}}).map;s.map.currentNodeId='pause-rest-fixture';s.rest=null;s.reviewPanel=null;s.reviewReceipt=null;G.main.replaceState(s);});
 await click(await p.evaluate(()=>G.scenes.restShared.getLayout().heal));await p.waitForFunction(()=>G.main.getState().rest.reviewChoice==='heal');await p.keyboard.press('Escape');await p.waitForFunction(()=>!G.main.getState().rest.reviewChoice);assert.equal(await p.locator('dialog').isVisible(),false);assert.equal((await state()).player.hp,40);
 await click(await p.evaluate(()=>G.scenes.restShared.getLayout().upgrade));await p.waitForFunction(()=>G.main.getState().rest.reviewChoice==='upgrade');await p.keyboard.press('Escape');await p.waitForFunction(()=>!G.main.getState().rest.reviewChoice);assert.equal(await p.locator('dialog').isVisible(),false);
 await openTool('#open-settings');await p.keyboard.press('Escape');await p.keyboard.press('Escape');assert.equal((await state()).scene,'rest');assert.equal((await state()).player.hp,40);checks.push('Rest fixture: scene Escape cancels heal/upgrade previews; pause/back leaves HP/deck unchanged');
 assert.deepEqual(errors,[]);report.passed=true;console.log(JSON.stringify(report,null,2));
}catch(e){report.passed=false;report.failure=e.stack;console.error(e);if(p)await p.screenshot({path:fileURLToPath(new URL('failure.png',out))}).catch(()=>{});process.exitCode=1;}
finally{await fs.writeFile(new URL('summary.json',out),JSON.stringify(report,null,2));await browser.close();}

