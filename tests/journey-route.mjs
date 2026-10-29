import {finishArrival} from './journey-actions.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const args=process.argv.slice(2),at=args.indexOf('--entry'),entry=new URL('../'+(at<0?'play.html':args[at+1]),import.meta.url);
const scope=entry.href.includes('/dist/')?'regression-dist':entry.href.includes('/offline-package/')?'regression-offline':'regression';
import {createVerificationOutput} from './verification-output.mjs';
const outputAt=args.indexOf('--output');
if(outputAt>=0&&!args[outputAt+1])throw new Error('Missing --output value');
const out=await createVerificationOutput(scope,outputAt<0?undefined:args[outputAt+1]+'/'+scope);
let browser;try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});}catch(e){if(!/not found|doesn't exist|ENOENT/i.test(e.message))throw e;browser=await chromium.launch({channel:'msedge',headless:true,args:['--mute-audio']});}
const checks=[],errors=[];let p;
try{
  p=await browser.newPage({viewport:{width:1280,height:758}});p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  await p.goto(entry.href);await p.waitForFunction(()=>G.main&&G.render.realisticCombat.assetPaths.every(a=>G.render.assets.getImageEntry(a).loaded));
  const state=()=>p.evaluate(()=>G.main.getState()),click=async b=>{const c=await p.locator('#game-canvas').boundingBox();await p.mouse.click(c.x+(b.x+b.width/2)*c.width/1280,c.y+(b.y+b.height/2)*c.height/720,{delay:50});await p.waitForTimeout(160);};
  const shot=async name=>p.screenshot({path:fileURLToPath(new URL(name+'.png',out))});
  const titleLayout=()=>p.evaluate(()=>G.scenes.title.getLayout());
  const openTool=async id=>{await p.click('#open-pause');await p.click(id);};
  assert.equal(await p.locator('#journey-bar').count(),0);assert.equal(await p.locator('#open-pause').isVisible(),false);
  await click((await titleLayout()).menuButtons[2]);await p.waitForSelector('dialog[open]');await p.getByLabel('战斗动画').selectOption('2');await p.locator('dialog input[type=checkbox]').check();await p.getByLabel('总音量',{exact:true}).fill('0');await p.click('#close-dialog');await p.reload();await p.waitForFunction(()=>G.main);
  assert.equal((await state()).settings.combatSpeed,2);assert.equal((await state()).settings.reducedMotion,true);assert.equal((await state()).settings.volume,0);await click((await titleLayout()).menuButtons[2]);await p.waitForSelector('dialog[open]');await p.getByLabel('战斗动画').selectOption('1');await p.locator('dialog input[type=checkbox]').uncheck();await p.click('#close-dialog');checks.push('Speed/reduced motion/mute persist and restore playback options');
  // Explicit fixtures below isolate edge cases; full-journey.mjs is the separate
  // unmodified, normal-clock, actual-pointer complete playthrough.
  const topology=await p.evaluate(()=>{
    const base=G.main.getState();let count=0;
    for(let seed=1;seed<=100;seed++){
      const s=G.scenes.map.prepareState({...base,map:{actNumber:1,routeSeed:seed}}),nodes=s.map.nodes;
      for(const n of nodes){if(n.type!=='gate'&&(!n.nextIds.length||n.nextIds.some(id=>!nodes.some(v=>v.id===id&&v.tier===n.tier+1))))throw new Error('Broken outgoing route '+seed+':'+n.id);if(n.tier>1&&!nodes.some(v=>v.nextIds.includes(n.id)))throw new Error('Unreachable node '+seed+':'+n.id);}
      count++;
    }return count;
  });assert.equal(topology,100);checks.push('100 generated routes: all nodes reachable, forward edges and gate paths');
  await click((await titleLayout()).menuButtons[0]);await click((await titleLayout()).startButton);await finishArrival(p);const base=await state();
  for(const [button,name] of [['#open-help','玩法'],['#open-route','行程'],['#open-deck','招式'],['#open-nemesis','旧仇']]){
    await openTool(button);assert.ok(await p.locator('dialog').isVisible());const t=(await state()).timeMs;await p.waitForTimeout(200);assert.equal((await state()).timeMs,t);assert.match(await p.locator('dialog h1').textContent(),new RegExp(name));await p.keyboard.press('Escape');assert.ok(await p.locator('dialog.pause-root').isVisible());await p.keyboard.press('Escape');assert.equal(await p.locator('dialog').isVisible(),false);
  }checks.push('Pause hierarchy: help/route/deck/nemesis children freeze time; Escape returns to menu then resumes');
  await p.click('#open-pause');await p.getByRole('button',{name:'返回主菜单',exact:true}).click();assert.equal((await state()).scene,'title');assert.equal((await state()).title.continueAvailable,true);await click((await titleLayout()).menuButtons[1]);assert.equal((await state()).scene,'combat');assert.deepEqual((await state()).combat.hand,base.combat.hand);checks.push('Save -> main menu -> Continue keeps the actual hand and current encounter');
  const identities=await p.evaluate(()=>{
    const s=G.main.getState();s.scene='shop';s.map=G.scenes.map.prepareState({...s,map:null}).map;s.map.currentNodeId='node_5';
    const first=G.scenes.shop.prepareState(s);first.shop.cardOffers[0].sold=true;first.shop.mode='remove';
    const reload=G.scenes.shop.prepareState(first);if(!reload.shop.cardOffers[0].sold)throw new Error('Same shop changed stock');
    first.map.actNumber=2;const second=G.scenes.shop.prepareState(first);if(second.shop.cardOffers[0].sold||second.shop.mode!=='browse')throw new Error('Next act reused a shop');
    s.scene='rest';let rest=G.scenes.rest.prepareState(s);rest.rest.mode='upgrade';rest.rest.reviewChoice='upgrade';rest.map.actNumber=2;rest=G.scenes.rest.prepareState(rest);if(rest.rest.mode!=='choice')throw new Error('Next act reused a rest choice');
    s.scene='event';let event=G.events.prepareSceneState(s);const id=event.event.eventId;event.event.mode='result';event.map.actNumber=2;event=G.events.prepareSceneState(event);if(event.event.eventId===id||event.event.actNumber!==2||event.event.mode!=='choice')throw new Error('Next act reused an event');return [first.shop.nodeId,second.shop.nodeId];
  });assert.notEqual(identities[0],identities[1]);checks.push('Shop/rest/event identity includes act; reload keeps stock while next act starts fresh');
  const memory=await p.evaluate(()=>{
    let s=G.main.getState();s.combat.nodeType='gate';s.combat.encounterId='gate_guard_chief';s.combat.enemies=G.enemies.buildEncounter('gate_guard_chief').enemies;s.combat.result='victory';s.combat.nemesisRecorded=false;s.combat.lastKillCardName='抹脖子';s.combat.playedCards=[{name:'抹脖子',style:'blade'}];s.combat.lastPlayedCardStyle='blade';s.combat.turn=4;
    s=G.nemesis.recordBattleOutcome(s);let id=s.nemesis.pool[0].id;
    if(s.nemesis.pool[0].currentAdaptation!=='bulletproof_vest')throw new Error('Wrong remembered style');
    const once=G.nemesis.recordBattleOutcome(s);if(once.nemesis.pool[0].history.length!==1)throw new Error('Duplicate memory');
    s.nemesis.currentRunEntryIds=[];s.map=G.scenes.map.prepareState({...s,map:{actNumber:2}}).map;
    if(!s.map.nodes.some(n=>n.nemesisEntryId===id))throw new Error('Persistent enemy never returned in new run');
    for(let level=2;level<=5;level++){
      s.combat.nodeType='nemesis';s.combat.nemesisEntryId=id;s.combat.nemesisRecorded=false;s=G.nemesis.recordBattleOutcome(s);if(s.nemesis.pool[0].level!==level)throw new Error('Progression '+level);id=s.nemesis.pool[0].id;
    }
    const before=s.nemesis.pool[0].history.length;s=G.nemesis.recordBattleOutcome(s);if(s.nemesis.pool[0].history.length!==before)throw new Error('Memory duplicated at cap');
    G.storage.savePersistentNemesis(s.nemesis);G.main.replaceState(s);return s.nemesis.pool[0];
  });assert.equal(memory.level,5);assert.equal(memory.history.length,2);assert.ok(memory.inheritedIntel);await p.reload();await p.waitForFunction(()=>G.main);assert.equal((await state()).nemesis.pool[0].level,5);assert.equal((await state()).nemesis.closedCases[0].history.length,3);checks.push('Fixture memory: personal closure/successor, actual played style, idempotence, tiers 1-5, cross-run assignment and reload persistence');
  for(const level of [3,4,5]){
    await p.evaluate(({base,memory,level})=>{
      base.nemesis.pool=[{...memory,level}];base.scene='combat';base.combat={seeded:false,nemesisEntryId:memory.id};base.player.chosenStyle='blade';base.player.masterDeckNames=G.cards.getStarterDeck('blade');base.map={actNumber:2};base.campaign={battles:[],cardsPlayed:0};G.main.replaceState(base);
    },{base:structuredClone(base),memory,level});
    let shots=0;
    for(let turn=0;turn<9;turn++){
      const s=await state();if(s.combat.result!=='active')break;
      const intents=s.combat.enemies[0].intentData,before=s.player.hp,fire=!!intents.firearm&&(intents.damage||0)>0;
      await click(await p.evaluate(()=>G.scenes.combat.debugGetLayout().endTurn));await p.waitForFunction(()=>!G.scenes.combat.feedback.isBusy(),null,{timeout:12000});
      const after=await state();if(fire){assert.ok(after.player.hp<before);shots++;}else if(intents.firearm)assert.equal(after.player.hp,before,'Gun preparation cannot wound the player');
      if(fire)await shot('nemesis-gun-tier'+level);if(after.combat.result==='defeat')break;
    }assert.ok(shots>0,'Nemesis gun tier '+level+' must actually fire');
  }checks.push('Actual pointer enemy turns at tiers 3/4/5: gun preparation vs real shot HP damage and fatal feedback');
  await p.evaluate(base=>{base.nemesis=G.main.getState().nemesis;base.scene='combat';base.combat=G.scenes.combat.prepareState(base).combat;base.combat.result='defeat';base.player.hp=0;G.main.replaceState(base);},base);
  await click({x:600,y:380,width:80,height:40});assert.equal((await state()).title.mode,'report');assert.equal(await p.evaluate(()=>G.storage.hasRunSave()),false);assert.ok((await state()).nemesis.pool.length>0);await shot('defeat-report');await click((await titleLayout()).reportButtons[1]);assert.equal((await state()).title.mode,'styles');checks.push('Defeat clears active run, preserves old enemies, and retry returns to styles');
  await p.setViewportSize({width:960,height:600});await shot('small-styles');let b=await p.locator('#game-canvas').boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.y+b.height<=600);await click((await titleLayout()).startButton);await finishArrival(p);await openTool('#open-nemesis');await shot('small-old-enemies');assert.ok(await p.locator('dialog').isVisible());await p.click('#close-dialog');
  await p.setViewportSize({width:390,height:844});await openTool('#open-help');await shot('narrow-help');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push('960px canvas and narrow-screen dialogs fit without horizontal overflow');
  await p.click('#close-dialog');await p.setViewportSize({width:1280,height:758});
  await p.evaluate(base=>{base.combat.result='victory';base.scene='combat';base.reward=null;base.reviewReceipt=null;base.reviewPanel=null;G.main.replaceState(G.scenes.reward.prepareState(base));},base);
  await click((await p.evaluate(()=>G.scenes.reward.getLayout(G.main.getState().reward.options.length))).cards[0]);
  assert.equal((await state()).reward.reviewSelectedIndex,0);await openTool('#open-help');await p.keyboard.press('Escape');await p.keyboard.press('Escape');await p.waitForTimeout(120);assert.equal((await state()).reward.reviewSelectedIndex,0);checks.push('Esc through the pause hierarchy preserves the underlying reward selection');
  await p.evaluate(base=>{base.scene='combat';base.reward=null;base.reviewReceipt=null;base.combat={seeded:false};base.player.chosenStyle='combo';base.player.masterDeckNames=G.cards.getStarterDeck('combo').concat(Array(15).fill('招架'));const s=G.scenes.combat.prepareState(base);s.combat.hand=G.enemyAI.materializeHand(s,Array(15).fill('招架'));s.player.energy=3;G.main.replaceState(s);},base);
  const hand=await p.evaluate(()=>G.scenes.combat.getHandLayoutBoxes(G.main.getState())),endTurn=await p.evaluate(()=>G.scenes.combat.debugGetLayout().endTurn);assert.equal(hand.length,15);assert.ok(hand.every(b=>b.hitX>0&&b.hitX+b.hitWidth<endTurn.x),'Dense hand must leave the end-turn token exposed');await shot('dense-hand-15');
  for(const card of hand){
    const point=await p.evaluate(id=>{const s=G.main.getState(),boxes=G.scenes.combat.getHandLayoutBoxes(s),b=boxes.find(v=>v.cardId===id);const inside=(p,v)=>p.x>=v.hitX&&p.x<=v.hitX+v.hitWidth&&p.y>=v.hitY&&p.y<=v.hitY+v.hitHeight;for(const fy of [.35,.18,.5,.08,.65])for(const fx of [.5,.12,.25,.04,.75,.88]){const p={x:b.hitX+b.hitWidth*fx,y:b.hitY+b.hitHeight*fy};if(p.y<718&&boxes.filter(v=>inside(p,v)).at(-1)?.cardId===id)return p;}throw new Error('No visible selection for '+id);},card.cardId);
    await click({x:point.x,y:point.y,width:0,height:0});await p.waitForFunction(id=>G.main.getState().combat.selectedCardId===id,card.cardId,{timeout:3000});assert.equal((await state()).combat.selectedCardId,card.cardId);await p.keyboard.press('Escape');await p.waitForFunction(()=>G.main.getState().combat.selectedCardId===null,null,{timeout:3000});
  }checks.push('15-card draw/combo fixture: every card stays on stage and can be selected through its exposed region without spending');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,entry:entry.href,checks,errors},null,2));await fs.writeFile(new URL('summary.json',out),JSON.stringify({passed:true,entry:entry.href,checks,errors,fixtureScope:'Topology, economy identity, persistence, high-tier firearm and defeat edge cases; complete campaigns are separately unmodified UI playthroughs.'},null,2));
}catch(e){if(p)await shotFailure();await fs.writeFile(new URL('summary.json',out),JSON.stringify({passed:false,checks,errors,failure:e.stack},null,2));console.error(e);process.exitCode=1;}
finally{await browser.close();}
async function shotFailure(){await p.screenshot({path:fileURLToPath(new URL('failure.png',out))}).catch(()=>{});}

