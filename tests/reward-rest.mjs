import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

import {createVerificationOutput} from './verification-output.mjs';
const entry=new URL('../art/realistic-combat/index.html',import.meta.url),output=await createVerificationOutput('reward-rest');
await fs.mkdir(output,{recursive:true});
let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});}
catch(e){if(!/not found|doesn't exist|ENOENT/i.test(e.message))throw e;browser=await chromium.launch({channel:'msedge',headless:true,args:['--mute-audio']});}
const checks=[],errors=[];
try{
  const p=await browser.newPage({viewport:{width:1280,height:800}});
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  await p.goto(entry.href);
  await p.waitForFunction(()=>G.render.realisticJourney.assetPaths.every(path=>G.render.assets.getImageEntry(path).loaded));
  await p.clock.install({time:new Date('2026-09-30T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-30T00:00:01Z'));
  const state=()=>p.evaluate(()=>G.main.getState()),step=ms=>p.evaluate(ms=>advanceTime(ms),ms);
  const rawClick=async(x,y,options)=>{const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+x*b.width/1280,b.y+y*b.height/720,options);};
  const hover=async b=>{const c=await p.locator('canvas').boundingBox();await p.mouse.move(c.x+(b.x+b.width/2)*c.width/1280,c.y+(b.y+b.height/2)*c.height/720);await step(0);};
  const currentBox=async(b,page=p)=>{const key=Object.keys(boxes).find(key=>boxes[key]===b);return key?await page.evaluate(key=>G.render.realisticJourney.boxes[key],key):b;};
  const click=async b=>{await step(260);b=await currentBox(b);await rawClick(b.x+b.width/2,b.y+b.height/2);await step(0);};
  const boxes=await p.evaluate(()=>G.render.realisticJourney.boxes),restLayout=await p.evaluate(()=>G.scenes.restShared.getLayout());
  const chooseRest=async b=>{await click(b);await click(boxes.restConfirm);};
  const rewardBoxes=()=>p.evaluate(()=>G.scenes.reward.getLayout(G.main.getState().reward.options.length));
  const reset=async(stage,encounter='street')=>{await p.selectOption('#review-stage',stage);await p.selectOption('#encounter',encounter);await p.click('#retry');await step(1200);};
  const shot=async name=>{await p.mouse.move(1270,790);await step(0);await (name==='11-small-window'?p:p.locator('canvas')).screenshot({path:fileURLToPath(new URL(name+'.png',output))});};
  const cancel=async()=>{await p.keyboard.press('Escape');await step(0);};
  const paintedText=()=>p.evaluate(()=>{
    const proto=CanvasRenderingContext2D.prototype,original=proto.fillText,values=[];
    proto.fillText=function(value,...args){values.push(String(value));return original.call(this,value,...args);};
    // Inspect actual glyph painting on a cold raster, then let normal cached
    // screenshots/hover checks exercise reuse. A cache hit uses drawImage.
    G.render.canvasUtils.layers.clear();
    try{advanceTime(0);}finally{proto.fillText=original;}return values;
  });

  await reset('reward');await shot('01-reward');let initial=await state(),layout=await rewardBoxes();
  let painted=await paintedText();assert.ok(painted.every(s=>!/[{}]/.test(s)),'Card rules must display resolved numeric effects, not description templates');
  assert.match(painted.join(''),/造成 16 伤害/);assert.match(painted.join(''),/35%/);
  await rawClick(layout.cards[0].x-2,layout.cards[0].y-2);await step(0);
  assert.ok(!Number.isInteger((await state()).reward.reviewSelectedIndex),'Space outside the visible upright card is not clickable');
  await hover({x:20,y:20,width:0,height:0});await hover(layout.cards[0]);assert.equal((await state()).reward.reviewHoverMs,0);const hoverBefore=await p.locator('canvas').screenshot();
  await step(1000);assert.ok(hoverBefore.equals(await p.locator('canvas').screenshot()),'Reward card must keep its size through 1000ms');
  await step(40);assert.ok(!hoverBefore.equals(await p.locator('canvas').screenshot()),'Reward card enlarges after one second');
  await step(180);
  await p.locator('canvas').screenshot({path:fileURLToPath(new URL('19-reward-close-reading.png',output))});
  const focus=layout.cards[0];await rawClick(focus.x+focus.width/2+focus.width*.58,focus.y+focus.height/2);await step(0);
  assert.equal((await state()).reward.reviewSelectedIndex,0,'Clicking the enlarged paper outside its original bounds selects the visible page');
  const zoomedConfirm=await currentBox(boxes.confirm);await rawClick(zoomedConfirm.x+zoomedConfirm.width/2,zoomedConfirm.y+zoomedConfirm.height/2);await step(0);
  assert.equal((await state()).reviewReceipt.kind,'reward','The confirmation on the enlarged card commits the visible choice');
  assert.equal((await state()).player.masterDeckNames.length,initial.player.masterDeckNames.length+1);
  await reset('reward');layout=await rewardBoxes();
  await hover(layout.cards[1]);assert.equal((await state()).reward.reviewHoverMs,0);await p.mouse.move(1270,790);await step(0);
  await click(boxes.confirm);assert.equal((await state()).player.masterDeckNames.length,initial.player.masterDeckNames.length);
  await click(layout.cards[0]);assert.equal((await state()).reward.reviewSelectedIndex,0);
  assert.deepEqual((await state()).player.masterDeckNames,initial.player.masterDeckNames);
  await click(layout.cards[1]);await cancel();assert.equal((await state()).reward.reviewSelectedIndex,null);
  await click(layout.cards[0]);await rawClick(10,710,{button:'right'});await step(0);assert.equal((await state()).reward.reviewSelectedIndex,null);
  await click(layout.cards[1]);await shot('02-reward-selected');
  const selectedConfirm=await currentBox(boxes.confirm);await rawClick(selectedConfirm.x+selectedConfirm.width/2,selectedConfirm.y+selectedConfirm.height/2,{clickCount:2});await step(0);
  let result=await state();assert.equal(result.player.masterDeckNames.length,initial.player.masterDeckNames.length+1);
  assert.equal(result.player.gold,initial.player.gold);assert.equal(result.combat.rewardState.completed,true);assert.equal(result.reviewReceipt.kind,'reward');
  await click(boxes.confirm);assert.equal((await state()).player.masterDeckNames.length,result.player.masterDeckNames.length);
  await p.evaluate(()=>load_run_save());assert.equal((await state()).reviewReceipt.kind,'reward');
  assert.equal((await state()).player.gold,result.player.gold);assert.equal((await state()).player.masterDeckNames.length,result.player.masterDeckNames.length);
  await shot('03-reward-receipt');await click(boxes.cancel);assert.equal((await state()).reviewPanel.type,'deck');await shot('04-deck');await cancel();
  await p.selectOption('#look','woodcut');await step(0);assert.equal((await state()).reviewReceipt.kind,'reward');
  await click(boxes.accept);assert.equal((await state()).scene,'map');
  await p.selectOption('#look','realistic');
  checks.push('Reward: select/swap/cancel before commitment; confirm adds one card, double clicks and save/load do not duplicate gold/cards');

  await reset('reward');initial=await state();layout=await rewardBoxes();await click(layout.skip);
  assert.deepEqual((await state()).player.masterDeckNames,initial.player.masterDeckNames);assert.equal((await state()).player.gold,initial.player.gold);
  checks.push('Skip keeps battle gold and leaves the deck unchanged');
  await reset('reward','instructor');assert.equal((await state()).reward.mode,'relic');initial=await state();layout=await rewardBoxes();
  await shot('18-relic-reward');
  await click(layout.cards[0]);await shot('25-relic-selected');await click(boxes.confirm);result=await state();assert.equal(result.reward.mode,'card');
  assert.equal(result.player.relics.length,initial.player.relics.length+1);assert.equal(result.player.masterDeckNames.length,initial.player.masterDeckNames.length);
  await click(boxes.confirm);assert.equal((await state()).player.relics.length,result.player.relics.length);
  await step(1000);layout=await rewardBoxes();await click(layout.cards[0]);await click(boxes.confirm);
  assert.equal((await state()).player.masterDeckNames.length,initial.player.masterDeckNames.length+1);
  checks.push('Elite relic confirmation resolves once and then offers the separate card reward');

  await reset('rest');await shot('05-rest');initial=await state();await chooseRest(restLayout.heal);result=await state();
  assert.equal(result.player.hp,78);assert.equal(result.reviewReceipt.kind,'rest');assert.deepEqual(result.player.masterDeckNames,initial.player.masterDeckNames);
  await click(restLayout.heal);assert.equal((await state()).player.hp,78);await p.evaluate(()=>load_run_save());assert.equal((await state()).player.hp,78);
  await shot('06-heal-result');checks.push('Heal applies the existing 30% once, preserves the deck and survives save/load');
  await reset('rest');await p.evaluate(()=>{let s=G.main.getState();s.player.hp=79;replace_game_state(s);});await chooseRest(restLayout.healLabel);assert.equal((await state()).player.hp,80);
  assert.match((await state()).reviewReceipt.lines[0],/恢复 1 点/);
  await reset('rest');await p.evaluate(()=>{let s=G.main.getState();s.player.hp=80;replace_game_state(s);});await click(restLayout.heal);
  assert.equal((await state()).reviewReceipt,null);assert.match((await state()).rest.note,/气血已满/);await click(restLayout.back);assert.ok((await state()).reviewReceipt);
  checks.push('Heal reports the actual clamped amount; full HP gives feedback and permits leaving');

  await reset('rest');initial=await state();await chooseRest(restLayout.upgradeLabel);await shot('07-upgrade-stacks');
  let upgrades=await p.evaluate(()=>G.render.realisticJourney.upgradeBoxes(G.main.getState()));
  await rawClick(upgrades[0].x-1,upgrades[0].y-1);await step(0);assert.ok(!Number.isInteger((await state()).rest.reviewUpgradeIndex),'Space outside the displayed upgrade row is not clickable');
  await hover({x:20,y:20,width:0,height:0});await hover(upgrades[0]);const upgradeBefore=await p.locator('canvas').screenshot();
  await step(1000);assert.ok(upgradeBefore.equals(await p.locator('canvas').screenshot()),'Upgrade card must keep its size through 1000ms');
  await step(40);assert.ok(!upgradeBefore.equals(await p.locator('canvas').screenshot()),'Upgrade card enlarges after one second');
  await p.locator('canvas').screenshot({path:fileURLToPath(new URL('20-folio-close-reading.png',output))});
  await p.mouse.move(1270,790);await step(0);assert.equal((await state()).rest.reviewHoverMs,0);await click(upgrades[0]);
  assert.equal((await state()).rest.reviewUpgradeIndex,upgrades[0].deckIndex);
  await p.evaluate(()=>load_run_save());assert.equal((await state()).rest.reviewUpgradeIndex,upgrades[0].deckIndex);
  assert.deepEqual((await state()).player.masterDeckNames,initial.player.masterDeckNames);await shot('08-upgrade-comparison');
  painted=await paintedText();assert.ok(painted.every(s=>!/[{}]/.test(s)));assert.match(painted.join(''),/造成 6 伤害/);assert.match(painted.join(''),/造成 9 伤害/);await cancel();
  assert.equal((await state()).rest.mode,'upgrade');assert.equal((await state()).rest.reviewUpgradeIndex,null);
  await click(upgrades[0]);await click(boxes.accept);result=await state();
  const receiptAccept=await currentBox(boxes.accept);await rawClick(receiptAccept.x+20,receiptAccept.y+20);await step(0);assert.equal((await state()).reviewReceipt.kind,'rest');
  assert.equal(result.player.hp,initial.player.hp);assert.equal(result.player.masterDeckNames.length,initial.player.masterDeckNames.length);
  assert.equal(result.player.masterDeckNames.filter((name,i)=>name!==initial.player.masterDeckNames[i]).length,1);
  await click(boxes.accept);assert.equal((await state()).scene,'map');checks.push('Upgrade compares before/after and cancels without mutation; confirmation upgrades one duplicate without healing');

  // Isolated large-deck and all-upgraded fixtures exercise pagination and unavailable choices.
  await reset('rest');await p.evaluate(()=>{let s=G.main.getState();s.player.masterDeckNames=Object.values(G.cards.definitions).map(d=>d.name);s.rest=null;replace_game_state(G.scenes.rest.prepareState(s));});
  await click(boxes.restDeck);let rows=await p.evaluate(()=>G.render.realisticJourney.deckRows(G.main.getState()));assert.equal(rows.length,8);
  await click(boxes.next);assert.equal((await state()).reviewPanel.page,1);rows=await p.evaluate(()=>G.render.realisticJourney.deckRows(G.main.getState()));await click(rows[2].box);
  assert.equal((await state()).reviewPanel.index,10);await shot('09-large-deck');await cancel();await chooseRest(restLayout.upgrade);
  await click(boxes.upgradeNext);assert.equal((await state()).rest.reviewUpgradePage,1);upgrades=await p.evaluate(()=>G.render.realisticJourney.upgradeBoxes(G.main.getState()));
  assert.ok(upgrades.every(b=>b.y+b.height<538));await shot('10-paged-upgrades');await click(upgrades[0]);initial=await state();await click(boxes.accept);result=await state();
  assert.equal(result.player.masterDeckNames.filter((name,i)=>name!==initial.player.masterDeckNames[i]).length,1);
  await reset('rest');await p.evaluate(()=>{let s=G.main.getState();s.player.masterDeckNames=s.player.masterDeckNames.map(n=>G.cards.upgradeDeckCardAt([n],0).upgradedName);s.rest=null;replace_game_state(G.scenes.rest.prepareState(s));});
  await click(restLayout.upgrade);assert.equal((await state()).rest.mode,'choice');assert.match((await state()).rest.note,/无可精进/);
  checks.push('Large decks paginate for inspection and upgrades; all-upgraded decks give explicit feedback');
  checks.push('Painted numeric rules and percentages; one-second reading boundary; enlarged card confirmation, upright card and list hit areas; explicit rest confirmation');

  await p.setViewportSize({width:960,height:600});await reset('rest');await shot('11-small-window');
  const canvas=await p.locator('canvas').boundingBox();assert.ok(canvas.y+canvas.height<=600);
  await click(boxes.restDeck);assert.equal((await state()).reviewPanel.type,'deck');await cancel();
  checks.push('Smaller viewport fits the toolbar and canvas and preserves logical click coordinates');

  // Normal RAF clock, actual starter deck, real victories. No combat stats are modified.
  const live=await browser.newPage({viewport:{width:1280,height:800}}),trace=[];
  live.on('pageerror',e=>errors.push(e.message));live.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  live.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  await live.goto(entry.href);await live.waitForFunction(()=>G.render.realisticJourney.assetPaths.every(path=>G.render.assets.getImageEntry(path).loaded));
  await live.evaluate(()=>localStorage.setItem('kgame.run.v1','root-save-sentinel'));
  await live.selectOption('#review-stage','sequence');await live.click('#retry');
  const liveState=()=>live.evaluate(()=>G.main.getState());
  const liveClick=async b=>{
    if(b===boxes.accept)await live.waitForFunction(()=>!G.main.getState().reviewReceipt?.lockMs);
    b=await currentBox(b,live);
    const c=await live.locator('canvas').boundingBox();await live.mouse.click(c.x+(b.x+b.width/2)*c.width/1280,c.y+(b.y+b.height/2)*c.height/720);
  };
  const ready=()=>live.waitForFunction(()=>!G.scenes.combat.feedback.isBusy());
  const liveShot=async name=>{await live.mouse.move(1270,790);await live.locator('canvas').screenshot({path:fileURLToPath(new URL(name+'.png',output))});};
  const win=async()=>{
    for(let actions=0;actions<70;actions++){
      await ready();const s=await liveState();if(s.scene==='reward'){assert.equal(s.combat.result,'victory');return;}
      if(s.combat.result==='victory'){await live.waitForFunction(()=>G.main.getState().scene==='reward');return;}
      assert.equal(s.player.hp>0,true,'Player must survive without fixture bonuses');
      const action=await live.evaluate(()=>{
        const s=G.main.getState(),cards=s.combat.hand.filter(c=>c.playable),template=c=>s.combat.cardLibrary[c.name]||c,needs=c=>G.render.combatInteraction.needsEnemy(template(c));
        // Choose defense for the first scout cycle so the real reload and shot can be reviewed.
        const cautious=s.combat.encounterId==='street_foreign_scout'&&s.combat.turn<=3;
        const c=cautious?cards.find(c=>!needs(c)&&template(c).block):(cards.find(needs)||cards[0]);
        if(!c)return {end:true};
        const b=G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===c.id),e=G.scenes.combat.getEnemyLayoutBoxes(s).find(b=>b.enemy.hp>0);
        return {name:c.name,id:c.id,card:{x:b.centerX,y:b.centerY,width:0,height:0},target:needs(c)?{x:e.x+e.width/2,y:e.y+e.height/2,width:0,height:0}:{x:330,y:330,width:0,height:0}};
      });
      trace.push({encounter:s.combat.encounterId,turn:s.combat.turn,hp:s.player.hp,action:action.name||'end'});
      if(action.end){
        await liveClick({x:1070,y:600,width:0,height:0});await live.waitForFunction(turn=>G.main.getState().combat.turn>turn||G.main.getState().combat.result!=='active',s.combat.turn);
        if(s.combat.encounterId==='street_foreign_scout'&&s.combat.turn===3){
          await live.waitForFunction(()=>G.render.animations.getDebugState('combat').effects.some(e=>e.tag==='gunshot_muzzle_flash'));
          await liveShot('17-live-rifle-contact');
        }
      }
      else {await liveClick(action.card);await live.waitForFunction(id=>G.main.getState().combat.selectedCardId===id,action.id);await liveClick(action.target);await live.waitForFunction(()=>G.scenes.combat.feedback.isBusy()||G.main.getState().scene!=='combat');}
      await ready();
    }
    throw new Error('Actual-deck sequence exceeded 70 actions');
  };
  assert.deepEqual((await liveState()).player.masterDeckNames,await live.evaluate(()=>G.cards.getStarterDeck('blade')));
  await win();await liveShot('12-live-victory-reward');let carried=await liveState();
  const l=await live.evaluate(()=>G.scenes.reward.getLayout(G.main.getState().reward.options.length));await liveClick(l.cards[0]);
  await live.waitForFunction(()=>G.main.getState().reward.reviewSelectedIndex===0);await liveClick(boxes.confirm);
  await live.waitForFunction(()=>!!G.main.getState().reviewReceipt);await live.evaluate(()=>load_run_save());await liveClick(boxes.accept);
  await live.waitForFunction(()=>G.main.getState().scene==='rest');await liveShot('13-live-rest');
  assert.equal((await liveState()).player.masterDeckNames.length,carried.player.masterDeckNames.length+1);
  carried=await liveState();await liveClick(carried.player.hp<carried.player.maxHp?restLayout.heal:restLayout.back);
  if(carried.player.hp<carried.player.maxHp){await live.waitForFunction(()=>G.main.getState().rest.reviewChoice==='heal');await liveClick(boxes.restConfirm);}
  await live.waitForFunction(()=>!!G.main.getState().reviewReceipt);carried=await liveState();await liveClick(boxes.accept);
  await live.waitForFunction(()=>G.main.getState().scene==='combat');result=await liveState();
  assert.equal(result.combat.encounterId,'street_foreign_scout');assert.equal(result.player.hp,carried.player.hp);assert.equal(result.player.gold,carried.player.gold);assert.deepEqual(result.player.masterDeckNames,carried.player.masterDeckNames);
  await liveShot('14-live-scout');await win();await liveShot('15-live-second-reward');
  const l2=await live.evaluate(()=>G.scenes.reward.getLayout(G.main.getState().reward.options.length));
  await live.waitForFunction(()=>G.main.getState().reward.presentation.introMs<=0);await liveClick(l2.skip);await live.waitForFunction(()=>!!G.main.getState().reviewReceipt);
  await liveClick(boxes.accept);await live.waitForFunction(()=>G.main.getState().scene==='rest');await liveClick(restLayout.upgrade);
  await live.waitForFunction(()=>G.main.getState().rest.reviewChoice==='upgrade');await liveClick(boxes.restConfirm);
  await live.waitForFunction(()=>G.main.getState().rest.mode==='upgrade');const b2=await live.evaluate(()=>G.render.realisticJourney.upgradeBoxes(G.main.getState())[0]);
  await liveClick(b2);await live.waitForFunction(()=>Number.isInteger(G.main.getState().rest.reviewUpgradeIndex));await liveClick(boxes.accept);
  await live.waitForFunction(()=>!!G.main.getState().reviewReceipt);await liveClick(boxes.accept);await live.waitForFunction(()=>G.main.getState().reviewReceipt?.kind==='complete');await liveShot('16-live-sequence-complete');
  assert.equal(await live.evaluate(()=>localStorage.getItem('kgame.run.v1')),'root-save-sentinel');
  await fs.writeFile(new URL('live-sequence.json',output),JSON.stringify({normalClock:true,headless:true,muted:true,fixtureBonuses:false,trace,final:await liveState()},null,2));
  checks.push('Normal RAF: actual starter-deck victories link ordinary combat, reward, heal, firearm encounter, reward and upgrade; HP/deck/gold carry and root save stays isolated');

  assert.deepEqual(errors,[]);
  await fs.writeFile(new URL('summary.json',output),JSON.stringify({passed:true,checks,errors,limitations:['Preview scenes and large-deck edge cases use isolated fixtures.','No listening review; all browser checks run headless and muted.']},null,2));
  console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser.close();}
