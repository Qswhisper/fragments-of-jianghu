import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
const output = await createVerificationOutput('realistic-combat');
await fs.mkdir(output,{recursive:true});
let browser;
try { browser = await chromium.launch({channel:'chrome', headless: true, args: ['--mute-audio']}); }
catch(e) { if (!/not found|doesn't exist|ENOENT/i.test(e.message)) throw e; browser=await chromium.launch({channel:'msedge', headless: true, args: ['--mute-audio']}); }
const errors=[], checks=[];
try {
  const p=await browser.newPage({viewport:{width:1280,height:800}});
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  await p.goto(new URL('../art/realistic-combat/index.html',import.meta.url).href);
  await p.waitForFunction(()=>G.render.realisticCombat.assetPaths.every(path=>G.render.assets.getImageEntry(path).loaded));
  const settle=()=>p.evaluate(()=>{advanceTime(800);if(G.scenes.combat.feedback.isBusy())advanceTime(4000);advanceTime(800);});
  const state=()=>p.evaluate(()=>G.main.getState());
  const shot=async name=>{await settle();await p.mouse.move(1270,795);await p.screenshot({path:new URL(name+'.png',output).pathname.replace(/^\//,'')});};
  const click=async(x,y)=>{const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+x*b.width/1280,b.y+y*b.height/720,{delay:40});await settle();};
  const play=async(name,drag=false,target=0)=>{
    const b=await p.locator('canvas').boundingBox();
    const q=await p.evaluate(name=>{const s=G.main.getState(),card=s.combat.hand.find(c=>c.name===name);const box=G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===card.id);return {x:box.centerX,y:box.centerY};},name);
    const aim=await p.evaluate(target=>{const box=G.scenes.combat.getEnemyLayoutBoxes(G.main.getState())[target];return {x:box.x+box.width/2,y:box.y+box.height*.5};},target);
    if(!drag){await click(q.x,q.y);await click(name==='招架'?330:aim.x,name==='招架'?330:aim.y);}
    else {await p.mouse.move(b.x+q.x*b.width/1280,b.y+q.y*b.height/720);await p.mouse.down();await p.mouse.move(b.x+aim.x*b.width/1280,b.y+aim.y*b.height/720,{steps:14});await p.mouse.up();await settle();}
  };
  await shot('01-street');
  const beforeLook=await state();await p.selectOption('#look','woodcut');
  assert.equal(await p.evaluate(()=>G.render.woodcut.combatPresentation),null);
  await shot('02-woodcut-same-state');
  await p.selectOption('#look','realistic');assert.equal((await state()).player.hp,beforeLook.player.hp);
  assert.equal((await state()).combat.turn,beforeLook.combat.turn);
  checks.push('Same-state presentation switch preserves the current fight');
  const canvasBox=await p.locator('canvas').boundingBox();
  await p.mouse.move(canvasBox.x+1070*canvasBox.width/1280,canvasBox.y+600*canvasBox.height/720);
  await p.mouse.down();await settle();
  assert.equal((await state()).combat.turn,1);
  await p.screenshot({path:new URL('09-tangmu-pressed.png',output).pathname.replace(/^\//,'')});
  await p.mouse.up();await settle();assert.equal((await state()).combat.turn,2);
  await p.click('#retry');await settle();
  for(const key of ['drawPile','discardPile']){
    const b=await p.evaluate(key=>G.scenes.combat.debugGetLayout()[key],key);
    await click(b.x+b.width/2,b.y+b.height/2);assert.equal((await state()).combat.ui.overlay.visible,true);
    await p.keyboard.press('Escape');await settle();assert.equal((await state()).combat.ui.overlay,null);
  }
  checks.push('Wooden end-turn token commits once on release; both pile tokens open and Escape closes');
  await play('招架');assert.equal((await state()).player.block,5);
  const hp=(await state()).combat.enemies[0].hp;
  await play('劈砍',true);assert.ok((await state()).combat.enemies[0].hp<hp);
  for(let t=0;t<12&&(await state()).scene==='combat';t++){
    for(let m=0;m<5;m++){
      const s=await state();if(s.scene!=='combat'||s.combat.result!=='active')break;
      const card=s.combat.hand.find(c=>c.playable&&c.name!=='招架');if(!card)break;
      await play(card.name);
    }
    const s=await state();if(s.scene==='combat'&&s.combat.result==='active')await click(1070,600);else break;
  }
  assert.equal((await state()).scene,'reward');await shot('03-victory');
  checks.push('Real click defense, drag attack, unchanged starter deck to victory and reward');
  await p.evaluate(()=>localStorage.setItem('kgame.run.v1','main-save-sentinel'));
  for(const encounter of ['instructor','scout','pair','triple']){
    await p.selectOption('#encounter',encounter);await p.click('#retry');await shot('04-'+encounter);
    if(encounter==='instructor'){
      assert.match(await p.evaluate(()=>G.render.realisticCombat.enemyArt(G.main.getState().combat.enemies[0])),/elite_mack/);
      await click(1070,600);assert.equal((await state()).player.hp,80);await shot('05-mack-aim');
      await click(1070,600);assert.equal((await state()).player.hp,80);await shot('06-mack-shot');
      await click(1070,600);assert.equal((await state()).player.hp,65);
    }
    if(encounter==='triple'){
      assert.equal((await state()).combat.enemies.length,3);
      for(const [index,name] of ['劈砍','抹脖子','抹脖子'].entries()){
        const before=(await state()).combat.enemies.map(e=>e.hp);
        await play(name,index===1,index);
        const after=(await state()).combat.enemies.map(e=>e.hp);
        assert.ok(after[index]<before[index]);
        after.forEach((hp,i)=>{if(i!==index)assert.equal(hp,before[i]);});
      }
      checks.push('Each depth-staggered opponent receives only its own targeted damage');
    }
  }
  for(const style of ['iron','dirty','combo']){await p.selectOption('#style',style);await p.click('#retry');await shot('07-'+style);}
  assert.equal(await p.evaluate(()=>localStorage.getItem('kgame.run.v1')),'main-save-sentinel');
  checks.push('Distinct enemy portraits, three-enemy layout, four styles, Mack preparation and shot, isolated saves');
  await p.setViewportSize({width:960,height:600});await shot('08-small');
  const box=await p.locator('canvas').boundingBox();assert.ok(box.y+box.height<=600);
  assert.deepEqual(errors,[]);
  const report={passed:true,checks,errors};await fs.writeFile(new URL('summary.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
