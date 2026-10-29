import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
const output=await createVerificationOutput('combat-hover-audio');
await fs.mkdir(output,{recursive:true});
let browser;
try{browser=await chromium.launch({channel:'chrome',headless: true, args: ['--mute-audio']});}
catch(e){if(!/not found|doesn't exist|ENOENT/i.test(e.message))throw e;browser=await chromium.launch({channel:'msedge', headless: true, args: ['--mute-audio']});}
const errors=[],checks=[];
try {
  const p=await browser.newPage({viewport:{width:1280,height:800}});
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  await p.goto(new URL('../art/realistic-combat/index.html',import.meta.url).href);
  await p.waitForFunction(()=>G.render.realisticCombat.assetPaths.every(path=>G.render.assets.getImageEntry(path).loaded));
  await p.waitForFunction(()=>G.audio.getDebugState().preloadedSfx.every(a=>a.readyState===4));
  await p.clock.install({time:new Date('2026-09-30T00:00:00Z')});
  await p.clock.pauseAt(new Date('2026-09-30T00:00:01Z'));
  const step=ms=>p.evaluate(ms=>advanceTime(ms),ms);
  const state=()=>p.evaluate(()=>G.main.getState());
  const audio=()=>p.evaluate(()=>G.audio.getDebugState());
  const card=async name=>p.evaluate(name=>{const s=G.main.getState(),c=s.combat.hand.find(c=>c.name===name);return G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===c.id);},name);
  const move=async(x,y)=>{const b=await p.locator('canvas').boundingBox();await p.mouse.move(b.x+x*b.width/1280,b.y+y*b.height/720);await step(0);};
  const click=async(x,y)=>{const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+x*b.width/1280,b.y+y*b.height/720);await step(0);};
  const reset=async()=>{await move(640,80);await p.click('#retry');await step(0);};
  const shot=async name=>p.screenshot({path:new URL(name+'.png',output).pathname.replace(/^\//,'')});
  const a=await card('劈砍'),b=await card('招架');
  await move(a.centerX,a.centerY);await step(1000);
  assert.equal((await state()).combat.inspectCardId,null);
  assert.equal((await state()).combat.inspectPresentation.progress,0);await shot('01-at-one-second');
  await step(1);assert.equal((await state()).combat.inspectCardId,a.cardId);await step(210);await shot('02-after-one-second');
  assert.equal((await state()).player.energy,3);assert.equal((await state()).combat.selectedCardId,null);
  checks.push('At 1000 ms there is no enlarged card; after 1000 ms inspection opens without selection or cost');

  await move(b.centerX,b.centerY);await step(999);assert.equal((await state()).combat.inspectCardId,null);
  await move(b.centerX+3,b.centerY+2);await step(2);assert.equal((await state()).combat.inspectCardId,b.cardId);
  await move(640,80);await step(150);assert.equal((await state()).combat.inspectPresentation.progress,0);
  await move(a.centerX,a.centerY);await step(700);await move(640,80);await step(50);
  await move(a.centerX,a.centerY);await step(700);assert.equal((await state()).combat.inspectCardId,null);
  await step(302);assert.equal((await state()).combat.inspectCardId,a.cardId);
  checks.push('Changing cards or leaving resets the delay; moving within the same card keeps the elapsed dwell');

  await p.keyboard.press('Escape');await step(0);await step(900);assert.equal((await state()).combat.inspectCardId,null);
  await reset();await click(a.centerX,a.centerY);
  assert.equal((await state()).combat.selectedCardId,a.cardId);assert.equal((await state()).combat.inspectCardId,null);assert.equal((await state()).combat.inspectPresentation.targetVisible,false);
  await p.keyboard.press('Escape');await step(0);
  await p.selectOption('#pace','2');await move(a.centerX,a.centerY);await step(1000);assert.equal((await state()).combat.inspectCardId,null);
  await step(1);assert.equal((await state()).combat.inspectCardId,a.cardId);
  await reset();await move(a.centerX,a.centerY);await step(900);await p.click('#retry');await step(0);
  await move(a.centerX,a.centerY);await step(300);assert.equal((await state()).combat.inspectCardId,null);
  checks.push('Click responds immediately; Escape/retry reset dwell; fast combat does not halve the hover delay');

  await reset();await move(a.centerX,a.centerY);const canvas=await p.locator('canvas').boundingBox();
  await p.mouse.down();await step(0);await step(1200);assert.equal((await state()).combat.inspectCardId,null);
  await p.mouse.move(canvas.x+1000*canvas.width/1280,canvas.y+330*canvas.height/720,{steps:12});await step(0);
  await p.mouse.up();await step(0);assert.equal((await state()).player.energy,2);await step(3000);
  checks.push('Holding/dragging does not trigger hover enlargement and drag still submits once');

  await p.evaluate(()=>localStorage.setItem('kgame.settings.v1','production-settings-sentinel'));
  await p.click('#sound-toggle');await p.locator('#music-volume').press('Home');
  assert.equal((await state()).settings.musicVolume,0);assert.equal((await audio()).musicMediaVolume,0);
  assert.equal((await audio()).musicBusGain,0);assert.ok((await audio()).sfxBusGain>.8);
  await p.locator('#sfx-volume').press('Home');assert.equal((await audio()).sfxBusGain,0);
  for(let i=0;i<10;i++)await p.locator('#sfx-volume').press('ArrowRight');
  assert.equal((await state()).settings.sfxVolume,.1);assert.ok(Math.abs((await audio()).sfxBusGain-.082)<.0001);
  assert.equal((await audio()).musicMediaVolume,0);await shot('03-independent-levels');
  checks.push('Real slider keys mute music independently and set both sampled/procedural SFX bus level');

  // Observe native media calls without replacing playback or inventing audio results.
  await p.evaluate(()=>{
    window.mediaCalls=[];const ids=new WeakMap();let serial=0;
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){if(!ids.has(this))ids.set(this,++serial);mediaCalls.push({id:ids.get(this),src:this.src,volume:this.volume});return play.apply(this,arguments);};
    // Production beats carry the actual card template; exercise blade routing
    // rather than a synthetic style marker with a different chosen school.
    window.cueSwing=()=>{const before=G.main.getState(),after=structuredClone(before);after.combat.lastPlayedCardStyle='blade';after.combat.enemies[0].hp-=1;G.audio.playCombatBeat('player_windup',before,after,{cardTemplate:{style:'blade',name:'劈砍',damage:1}});};
    cueSwing();
  });
  await p.clock.runFor(5);
  await p.evaluate(()=>cueSwing());await p.clock.runFor(5);
  const calls=await p.evaluate(()=>mediaCalls.filter(c=>c.src.includes('sword-swing.wav')));
  assert.equal(calls.length,2);assert.equal(calls[0].id,calls[1].id);
  assert.ok(Math.abs(calls[1].volume-(.7*.82*.64*.1*.82))<.000001);
  const resetSubmission=await p.evaluate(()=>{cueSwing();const submitted=mediaCalls.filter(c=>c.src.includes('sword-swing.wav')).length;G.audio.stopCombatSfx();return submitted;});
  assert.equal(resetSubmission,3,'Zero-delay swing submits at the beat before reset stops it');await p.clock.runFor(10);
  assert.equal(await p.evaluate(()=>mediaCalls.filter(c=>c.src.includes('sword-swing.wav')).length),resetSubmission,'Reset cannot leave a later replay');
  assert.equal((await audio()).pendingSfxTimers,0);assert.equal((await audio()).activeSfxCount,0);
  checks.push('Preloaded native media elements are reused at the configured level; immediate submission is stopped by reset without a later replay');

  await p.evaluate(()=>cueSwing());await p.locator('#sfx-volume').press('Home');await p.clock.runFor(20);
  assert.equal((await audio()).activeSfxCount,0);assert.equal((await audio()).pendingSfxTimers,0);
  await p.locator('#sfx-volume').press('End');await p.locator('#music-volume').press('Home');
  await p.locator('#sound-close').click();
  await p.clock.resume();await p.reload();
  await p.waitForFunction(()=>G.main&&G.main.getState().scene==='combat');
  assert.equal((await state()).settings.musicVolume,0);assert.equal((await state()).settings.sfxVolume,1);
  await p.click('#sound-toggle');assert.equal(await p.locator('#music-volume').inputValue(),'0');
  assert.equal(await p.locator('#sfx-volume').inputValue(),'100');
  assert.equal(await p.evaluate(()=>localStorage.getItem('kgame.settings.v1')),'production-settings-sentinel');
  await p.keyboard.press('Escape');assert.equal(await p.locator('#sound-panel').isVisible(),false);
  checks.push('Mute cancels pending SFX; levels including zero survive reload in isolated sample settings; Escape closes controls');
  await p.setViewportSize({width:960,height:600});await p.click('#sound-toggle');await shot('04-small-window');
  const panel=await p.locator('#sound-panel').boundingBox();assert.ok(panel.x>=0&&panel.x+panel.width<=960);
  const fit=await p.locator('canvas').boundingBox();assert.ok(fit.y+fit.height<=600);
  assert.deepEqual(errors,[]);
  const report={passed:true,checks,errors,limitations:['Media readiness, routing, playback calls and timing verified; human listening quality remains unreviewed.','No replacement audio assets added.']};
  await fs.writeFile(new URL('summary.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
