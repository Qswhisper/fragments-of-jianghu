import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
const output = await createVerificationOutput('gunfight');
await fs.mkdir(output,{recursive:true});
let browser;
try { browser = await chromium.launch({channel:'chrome', headless: true, args: ['--mute-audio']}); }
catch(e) { if (!/not found|doesn't exist|ENOENT/i.test(e.message)) throw e; browser = await chromium.launch({channel:'msedge', headless: true, args: ['--mute-audio']}); }
const errors=[],checks=[];
try {
  const p = await browser.newPage({viewport:{width:1280,height:780}});
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  await p.goto(new URL('../art/gunfight/index.html',import.meta.url).href);
  await p.waitForFunction(()=>G.main?.getState().scene==='combat');
  await p.waitForFunction(()=>['front','reload','bayonet'].every(s=>G.render.assets.getImageEntry('assets/woodcut/enemy-rifle-'+s+'-v3.png').loaded));
  await p.evaluate(()=>localStorage.setItem('kgame.run.v1','production-save-sentinel'));
  const state=()=>p.evaluate(()=>G.main.getState());
  const settle=()=>p.evaluate(()=>advanceTime(700));
  const click=async(x,y)=>{const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+x*b.width/1280,b.y+y*b.height/720,{delay:30});};
  const end=async()=>{await click(1070,600);await settle();};
  const shot=async name=>{await settle();await p.mouse.move(1270,775);await p.screenshot({path:new URL(name+'.png',output).pathname.replace(/^\//,'')});};
  const play=async name=>{
    const point=await p.evaluate(name=>{const s=G.main.getState(),c=s.combat.hand.find(c=>c.name===name),b=G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===c.id);return {x:b.centerX,y:b.centerY};},name);
    await click(point.x,point.y);await settle();await click(name==='招架'?330:1000,330);await settle();
  };
  await shot('01-bayonet');
  assert.equal(await p.evaluate(()=>G.render.woodcut.enemyArt(G.main.getState().combat.enemies[0])),'enemy-rifle-bayonet-v3');
  await play('招架'); assert.equal((await state()).player.block,5);
  await end(); assert.equal((await state()).player.hp,78);
  assert.equal(await p.evaluate(()=>G.render.woodcut.enemyArt(G.main.getState().combat.enemies[0])),'enemy-rifle-reload-v3');
  await shot('02-reload'); await end();
  assert.equal((await state()).player.hp,78);
  assert.equal((await state()).combat.enemies[0].intentData.firearm,true);
  assert.match(await p.evaluate(()=>G.render.woodcut.enemyIntent(G.main.getState().combat.enemies[0]).note),/本回合开火/);
  await shot('03-aim');
  await play('招架');
  // The flash can expire between two host round trips on a loaded machine.
  // Capture effects immediately after the real spawner returns; keep rendering
  // untouched and still require the actual click, shot damage and correct tag.
  await p.evaluate(()=>{
    window.observedGunEffects=[];window.originalGunSpawners={};
    for(const key of ['spawnMuzzleFlash','spawnSlash']){
      originalGunSpawners[key]=G.render.animations[key];
      G.render.animations[key]=function(config){const result=originalGunSpawners[key](config);observedGunEffects.push(...G.render.animations.getDebugState('combat').effects);return result;};
    }
  });
  await click(1070,600);
  await p.waitForFunction(()=>G.main.getState().combat.turn===4);
  const effects=await p.evaluate(()=>{
    const captured=observedGunEffects;for(const key of Object.keys(originalGunSpawners))G.render.animations[key]=originalGunSpawners[key];return captured;
  });
  assert.ok(effects.some(e=>e.tag==='gunshot_muzzle_flash'));
  assert.ok(!effects.some(e=>e.tag==='enemy_melee_slash'));
  await settle(); assert.equal((await state()).player.hp,75);
  checks.push('Real clicks: bayonet 7 vs block 5, reload does no damage, rifle 8 vs block 5; correct shot effect');
  // Complete the actual scout fight using the normal hand, energy and target input.
  for(let turn=0;turn<12 && (await state()).combat.result==='active';turn++){
    for(let move=0;move<5;move++){
      const s=await state();if(s.scene!=='combat'||s.combat.result!=='active')break;
      const c=s.combat.hand.find(c=>c.playable&&c.name!=='招架');if(!c)break;
      await play(c.name);
    }
    const s=await state();if(s.scene==='combat'&&s.combat.result==='active')await end();else break;
  }
  assert.ok((await state()).scene==='reward'||(await state()).combat.result==='victory');
  checks.push('Scout encounter completes through real card clicks with an unchanged starter deck');
  await p.selectOption('#encounter','instructor');await p.click('#retry');await settle();
  await end();
  let s=await state(); assert.equal(s.player.hp,80);assert.equal(s.combat.enemies[0].intentData.previewDamage,15);
  assert.match(await p.evaluate(()=>G.render.woodcut.enemyIntent(G.main.getState().combat.enemies[0]).note),/下回合/);
  await shot('04-instructor-aim');await end();assert.equal((await state()).player.hp,80);
  assert.equal((await state()).combat.enemies[0].intentData.pierceRatio,.3);
  await shot('05-instructor-shot');
  await end();assert.equal((await state()).player.hp,65);
  checks.push('Instructor preparation and aim cause zero HP loss; advertised 15 damage occurs only on shot');
  assert.equal(await p.evaluate(()=>localStorage.getItem('kgame.run.v1')),'production-save-sentinel');
  assert.ok(await p.evaluate(()=>G.storage.STORAGE_KEYS.run.startsWith('kgame-gunfight-review.')));
  checks.push('Practice saves are isolated from the main run');
  await p.selectOption('#encounter','pair');await p.click('#retry');await shot('06-pair');
  for (const style of ['iron','dirty','combo']){
    await p.selectOption('#style',style);await p.click('#retry');
    await p.waitForFunction(style=>G.render.assets.getImageEntry('assets/woodcut/player-'+style+'-rear-v3.png').loaded,style);
    assert.equal((await state()).player.chosenStyle,style);await shot('07-'+style);
  }
  await p.setViewportSize({width:960,height:540}); await shot('08-small');
  const box=await p.locator('canvas').boundingBox();assert.ok(box.y+box.height<=540);
  checks.push('All remaining styles, two enemies and 960x540 preview fit');
  assert.deepEqual(errors,[]);
  const report={passed:true,checks,errors};console.log(JSON.stringify(report,null,2));
  await fs.writeFile(new URL('summary.json',output),JSON.stringify(report,null,2));
} finally { await browser.close(); }
