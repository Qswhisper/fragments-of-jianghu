import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { chromium } from 'playwright';

const entry=new URL('../art/realistic-combat/index.html',import.meta.url);
import {createVerificationOutput} from './verification-output.mjs';
const output=await createVerificationOutput('combat-dynamics');
await fs.mkdir(output,{recursive:true});
// This sample has a <base>; resolve its script references against that base.
const html=await fs.readFile(entry,'utf8'),base=new URL(html.match(/<base href="([^"]+)"/)[1],entry);
for(const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
  const url=new URL(match[1],base);url.search='';
  new vm.Script(await fs.readFile(url,'utf8'),{filename:url.pathname});
}
let browser;
try {browser=await chromium.launch({channel:'chrome',headless: true, args: ['--mute-audio']});}
catch(e){if(!/not found|doesn't exist|ENOENT/i.test(e.message))throw e;browser=await chromium.launch({channel:'msedge', headless: true, args: ['--mute-audio']});}
const checks=[],errors=[];
try {
  const p=await browser.newPage({viewport:{width:1280,height:800}});
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  await p.goto(entry.href);
  await p.waitForFunction(()=>G.render.realisticCombat.assetPaths.every(path=>G.render.assets.getImageEntry(path).loaded));
  // Freeze RAF only in this test so each real pointer event can be inspected at contact.
  await p.clock.install({time:new Date('2026-09-30T00:00:00Z')});
  await p.clock.pauseAt(new Date('2026-09-30T00:00:01Z'));
  const state=()=>p.evaluate(()=>G.main.getState());
  const debug=()=>p.evaluate(()=>G.scenes.combat.feedback.debug());
  const step=ms=>p.evaluate(ms=>advanceTime(ms),ms);
  const finish=()=>step(5000);
  const click=async(x,y)=>{const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+x*b.width/1280,b.y+y*b.height/720);await step(0);};
  const end=()=>click(1070,600);
  const reset=async(encounter='street',style='blade')=>{
    await p.selectOption('#encounter',encounter);await p.selectOption('#style',style);await p.click('#retry');await step(0);
  };
  const shot=async name=>{await p.mouse.move(1270,790);await step(0);await p.screenshot({path:new URL(name+'.png',output).pathname.replace(/^\//,'')});};
  const choose=async name=>{
    const b=await p.evaluate(name=>{const s=G.main.getState(),c=s.combat.hand.find(c=>c.name===name);return G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===c.id);},name);
    await click(b.centerX,b.centerY);
  };
  const play=async(name,target=0,drag=false)=>{
    const q=await p.evaluate(({name,target})=>{const s=G.main.getState(),c=s.combat.hand.find(c=>c.name===name),b=G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===c.id),e=G.scenes.combat.getEnemyLayoutBoxes(s)[target];return {x:b.centerX,y:b.centerY,tx:G.render.combatInteraction.needsEnemy(c)?e.x+e.width/2:330,ty:330};},{name,target});
    if(!drag){await click(q.x,q.y);await click(q.tx,q.ty);}
    else {const b=await p.locator('canvas').boundingBox();await p.mouse.move(b.x+q.x*b.width/1280,b.y+q.y*b.height/720);await p.mouse.down();await step(0);await p.mouse.move(b.x+q.tx*b.width/1280,b.y+q.ty*b.height/720,{steps:12});await step(0);await p.mouse.up();await step(0);}
  };
  const counts=()=>p.evaluate(()=>G.audio.getDebugState().debugCounts);
  const ruleEquivalence=async()=>p.evaluate(()=>{
    const s=G.main.getState(),trace=[],plain=G.enemyAI.resolveEndTurn(s),recorded=G.enemyAI.resolveEndTurn(s,trace);
    return {equal:JSON.stringify(plain)===JSON.stringify(recorded),types:trace.map(t=>t.type),names:trace.filter(t=>t.enemy).map(t=>t.enemy.name)};
  });
  await shot('01-static-baseline');
  assert.equal((await ruleEquivalence()).equal,true);
  await play('招架');assert.equal((await state()).player.block,5);assert.equal((await debug()).view.block,0);
  await step(147);assert.equal((await debug()).view.block,5);await finish();
  const sounds=await counts();await end();
  assert.equal((await state()).player.hp,79);assert.equal((await debug()).view.hp,80);
  assert.equal((await debug()).view.block,5);assert.equal((await debug()).view.turn,1);
  assert.deepEqual((await debug()).view.hand,[]);
  assert.equal((await counts())['sfx:wound']||0,sounds['sfx:wound']||0);
  await click(1070,600);assert.equal((await state()).combat.turn,2);
  await step(439);assert.equal((await debug()).view.hp,80);
  await step(3);assert.equal((await debug()).view.hp,79);
  assert.equal((await debug()).view.block,0);assert.ok((await debug()).notices.includes('挡下 5'));
  assert.ok((await debug()).notices.includes('−1 气血'));
  assert.equal((await counts())['sfx:wound'],(sounds['sfx:wound']||0)+1);
  await shot('02-parry-contact');await finish();assert.equal((await debug()).busy,false);
  checks.push('Real defense and end-turn: HP/block change at contact, audio follows contact, no duplicate turn, draw waits');

  await reset('street','iron');await play('沉马硬架');await finish();
  assert.ok((await state()).player.block>=6);await end();await step(443);
  assert.equal((await debug()).view.hp,80);assert.ok((await debug()).notices.includes('未伤气血'));await finish();
  checks.push('Full parry reports absorbed damage without a wound');

  await reset('triple');assert.equal((await ruleEquivalence()).equal,true);
  await end();await step(442);let d=await debug();assert.equal(d.actor,'city_tracker_1');
  assert.equal(await p.evaluate(()=>G.scenes.combat.feedback.turnStatus('routed_qing_soldier_2')),'next');
  assert.deepEqual(d.view.enemies.map(e=>e.block),[8,0,0]);await shot('03-first-actor');
  await step(410);d=await debug();assert.equal(d.actor,'routed_qing_soldier_2');assert.deepEqual(d.view.enemies.map(e=>e.block),[8,5,0]);
  assert.equal(await p.evaluate(()=>G.scenes.combat.feedback.turnStatus('city_tracker_1')),'done');
  await step(410);d=await debug();assert.equal(d.actor,'review-scout-3');assert.equal(d.view.hp,73);
  await finish();await end();await step(439);assert.equal((await debug()).view.hp,73);
  await step(3);assert.equal((await debug()).view.hp,65);await step(570);assert.equal((await debug()).view.hp,59);
  await shot('04-second-attack');await finish();assert.equal((await state()).player.hp,59);
  checks.push('Three opponents: guard gains and sequential 8/6 damage are shown only for the current actor');

  await reset('instructor');await end();await finish();assert.equal((await state()).player.hp,80);
  assert.equal((await state()).combat.enemies[0].intentData.previewDamage,15);await end();await finish();
  const gunActor=(await state()).combat.enemies[0];assert.equal(gunActor.templateId,'elite_mack');assert.equal(gunActor.intentData.firearmStage,'revolver');
  const gunSounds=await counts();await end();await step(513);
  assert.equal((await debug()).view.hp,80);assert.equal((await counts())['sfx:gunshot_revolver_single']||0,gunSounds['sfx:gunshot_revolver_single']||0);
  await shot('05-mack-windup');await step(4);assert.equal((await debug()).view.hp,65);
  assert.ok(await p.evaluate(()=>G.render.animations.getDebugState('combat').effects.some(e=>e.tag==='gunshot_muzzle_flash')));
  assert.equal((await counts())['sfx:gunshot_revolver_single'],(gunSounds['sfx:gunshot_revolver_single']||0)+1);
  await shot('06-mack-shot');await finish();
  checks.push('Mack: preparation does no damage; 15 HP, muzzle flash and gunshot start at the firing beat');

  // Isolated fixture: a real existing three-hit card, enemy block 4, no changed card values.
  await reset();await p.evaluate(()=>{
    const s=G.main.getState(),name='连环抹线';s.combat.cardLibrary[name]=G.cards.getCardByName(name);
    s.combat.hand=[G.enemyAI.createCardInstance(s,name)];s.combat.enemies[0].block=4;
    replace_game_state(G.deck.refreshHandPlayability(s));
  });
  await play('连环抹线',0,true);await step(147);d=await debug();assert.equal(d.view.enemies[0].hp,25);assert.equal(d.view.enemies[0].block,1);
  await step(130);d=await debug();assert.equal(d.view.enemies[0].hp,23);assert.equal(d.view.enemies[0].block,0);
  await step(130);assert.equal((await debug()).view.enemies[0].hp,20);
  assert.match((await debug()).label,/第 3 \/ 3 击/);
  assert.ok((await debug()).notices.includes('−3 气血'));assert.ok(!(await debug()).notices.includes('−2 气血'));
  await shot('07-multi-hit');await finish();
  checks.push('Three-hit fixture: each hit independently spends block then HP, matching the existing rule values');

  await reset('triple');await p.evaluate(()=>{const s=G.main.getState();s.combat.enemies[0].hp=4;replace_game_state(s);});
  await play('劈砍',0,true);await step(147);
  assert.equal((await debug()).view.enemies[0].hp,0);
  assert.ok((await debug()).notices.includes('−4 气血'));
  assert.ok(await p.evaluate(()=>G.render.animations.getDebugState('combat').effects.some(e=>e.type==='defeat_echo')));
  assert.equal(await p.evaluate(()=>G.scenes.combat.getEnemyLayoutBoxes(G.scenes.combat.feedback.getView(G.main.getState())).filter(b=>b.enemy.hp>0).length),2);
  await step(120);await shot('08-enemy-exit');await finish();await end();await finish();assert.equal((await state()).combat.turn,2);
  checks.push('Enemy death fixture: exit starts at lethal contact, formation is held and the dead enemy cannot act');

  await reset();await p.evaluate(()=>{const s=G.main.getState();s.combat.enemies[0].hp=4;replace_game_state(s);});
  await play('劈砍');await step(147);assert.equal((await state()).scene,'combat');await finish();assert.equal((await state()).scene,'reward');
  await shot('09-victory-reward');checks.push('Final kill completes its exit before reward');

  await reset('triple');await p.evaluate(()=>{const s=G.main.getState();s.player.hp=4;s.combat.enemies.forEach(e=>{e.intent='attack';e.intentLabel='测试斩击';e.intentData={damage:6};});replace_game_state(s);});
  assert.equal((await ruleEquivalence()).names.length,1);await end();await step(443);
  assert.equal((await debug()).view.hp,0);await finish();assert.equal((await state()).combat.result,'defeat');
  checks.push('Lethal player damage stops the remaining enemies and completes defeat feedback');

  await reset('triple');await end();let saved=await p.evaluate(()=>G.storage.loadRun());
  assert.equal(saved.combat.turn,2);assert.equal(saved.player.hp,73);assert.equal(saved.combat.trace,undefined);
  await p.evaluate(()=>load_run_save());assert.equal((await debug()).busy,false);assert.equal((await state()).player.hp,73);
  await reset('triple');await end();await step(300);await reset('street');const resetCounts=await counts();await finish();
  assert.equal((await state()).player.hp,80);assert.equal((await state()).combat.turn,1);assert.equal((await debug()).busy,false);
  assert.equal((await counts())['sfx:enemy_melee']||0,resetCounts['sfx:enemy_melee']||0);
  checks.push('Save/load restores the committed turn; retry drops pending visual/audio beats');

  await choose('劈砍');const unplayed=await state();await p.keyboard.press('Escape');await step(0);
  assert.equal((await state()).player.energy,unplayed.player.energy);assert.equal((await debug()).busy,false);
  await p.selectOption('#pace','2');await p.check('#reduced-motion');await end();await step(300);
  assert.equal((await debug()).speed,2);assert.equal((await debug()).reduced,true);
  assert.deepEqual(await p.evaluate(()=>G.scenes.combat.feedback.getMotion(G.scenes.combat.feedback.debug().actor)),{x:0,y:0});
  await finish();assert.equal((await state()).player.hp,74);
  await p.setViewportSize({width:960,height:600});await reset('triple');await shot('10-small-window');
  const b=await p.locator('canvas').boundingBox();assert.ok(b.y+b.height<=600);
  checks.push('Cancel remains reversible; fast/reduced playback keeps rule results and fits the smaller viewport');
  assert.deepEqual(errors,[]);
  const report={passed:true,checks,errors,limitations:['Audio scheduling verified; no human listening review.','Multi-hit and lethal cases use isolated fixtures; no balance claims.']};
  await fs.writeFile(new URL('summary.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
