import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
const root=new URL('../',import.meta.url),output=await createVerificationOutput('combat-audio-palette');
await fs.mkdir(output,{recursive:true});
const manifest=JSON.parse(await fs.readFile(new URL('assets/audio/candidates/combat-v1/manifest.json',root),'utf8'));
const checks=[],errors=[];
for(const asset of manifest.assets){
  const bytes=await fs.readFile(new URL(asset.file,root)),original=await fs.readFile(new URL(asset.original,root));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'),asset.originalSha256);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(asset.clippedSamples,0);
  assert.ok(asset.samplePeakDbfs<=-1.7&&asset.durationSeconds<=1.1);
  assert.equal(manifest.sources[asset.source].license,'CC0 1.0');
}
assert.equal(manifest.assets.length,14);
assert.match(await fs.readFile(new URL('assets/audio/candidates/combat-v1/licenses/CC0-1.0.txt',root),'utf8'),/commercial purposes/);
checks.push('All 14 WAVs and retained originals match hashes; source/license records exist; sample peaks have headroom and no clipped PCM samples');
let browser;
try{browser=await chromium.launch({channel:'chrome',headless: true, args: ['--mute-audio']});}
catch(e){if(!/not found|doesn't exist|ENOENT/i.test(e.message))throw e;browser=await chromium.launch({channel:'msedge', headless: true, args: ['--mute-audio']});}
try{
  const p=await browser.newPage({viewport:{width:1280,height:800}});
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
  await p.goto(new URL('art/realistic-combat/index.html',root).href);
  await p.waitForFunction(()=>G.render.realisticCombat.assetPaths.every(path=>G.render.assets.getImageEntry(path).loaded));
  assert.equal(await p.evaluate(()=>G.audio.getDebugState().combatSoundProfile),'original');
  await p.click('#sound-toggle');await p.selectOption('#sound-palette','candidate');
  await p.waitForFunction(()=>G.audio.getDebugState().preloadedSfx.every(a=>a.readyState===4));
  assert.equal(await p.evaluate(()=>G.audio.getDebugState().combatSoundProfile),'recorded-candidate-v1');
  assert.equal(await p.evaluate(()=>G.audio.getDebugState().preloadedSfx.filter(a=>a.key.startsWith('candidate_')).length),14);
  await p.evaluate(()=>{
    window.mediaCalls=[];const original=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){mediaCalls.push({src:this.src,volume:this.volume});return original.apply(this,arguments);};
  });
  for(let i=0;i<4;i++){await p.click('[data-audio-cue="swing"]');await p.waitForTimeout(20);}
  const swings=await p.evaluate(()=>mediaCalls.filter(c=>/swing-\d\.wav/.test(c.src)));
  assert.deepEqual(swings.map(c=>c.src.match(/swing-\d/)[0]),['swing-1','swing-2','swing-3','swing-1']);
  await p.click('[data-audio-cue="contact"]');await p.click('[data-audio-cue="parry"]');await p.click('[data-audio-cue="prep"]');await p.click('[data-audio-cue="shot"]');
  await p.waitForTimeout(30);
  const calls=await p.evaluate(()=>mediaCalls);
  for(const name of ['contact','parry','mechanism','rifle'])assert.ok(calls.some(c=>c.src.includes(name+'-')));
  assert.ok(calls.every(c=>c.volume>=0&&c.volume<=1));
  assert.ok(await p.evaluate(()=>G.audio.getDebugState().activeSfxCount<=3));
  checks.push('Real sound controls preload the candidate, cycle three swing recordings, play separate contact/parry/mechanism/shot samples and cap active sampled voices at three');
  await p.keyboard.press('Escape');await p.click('#retry');
  await p.clock.install({time:new Date('2026-09-30T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-30T00:00:01Z'));
  const step=async ms=>{await p.evaluate(ms=>advanceTime(ms),ms);await p.clock.runFor(5);};
  const click=async(x,y)=>{const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+x*b.width/1280,b.y+y*b.height/720);await step(0);};
  const play=async name=>{const q=await p.evaluate(name=>{const s=G.main.getState(),card=s.combat.hand.find(c=>c.name===name),b=G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===card.id),e=G.scenes.combat.getEnemyLayoutBoxes(s)[0];return {b,tx:name==='招架'?330:e.x+e.width/2,ty:name==='招架'?330:e.y+e.height/2};},name);await click(q.b.centerX,q.b.centerY);await click(q.tx,q.ty);};
  await p.evaluate(()=>{mediaCalls=[];});
  await play('招架');await step(1000);
  assert.ok(await p.evaluate(()=>G.audio.getDebugState().debugCounts['sfx:guard']>0));
  assert.equal(await p.evaluate(()=>mediaCalls.filter(c=>c.src.includes('parry-')).length),0);
  await click(1070,600);await step(500);
  const impact=await p.evaluate(()=>mediaCalls.map(c=>c.src));
  assert.ok(impact.some(s=>s.includes('parry-')));assert.ok(impact.some(s=>s.includes('contact-')));
  checks.push('Real defense gains guard without a collision sample; partial parry plays metallic contact and the actual HP-loss cue at the enemy hit');
  await step(5000);await p.click('#retry');await step(0);await p.evaluate(()=>{mediaCalls=[];});
  await play('劈砍');await step(50);
  assert.ok(await p.evaluate(()=>mediaCalls.some(c=>c.src.includes('swing-'))));
  assert.equal(await p.evaluate(()=>mediaCalls.filter(c=>c.src.includes('contact-')).length),0);
  await step(300);assert.ok(await p.evaluate(()=>mediaCalls.some(c=>c.src.includes('contact-'))));await step(5000);
  checks.push('Real attack plays the swing during windup and the body impact only at contact');
  await p.selectOption('#encounter','instructor');await p.click('#retry');await step(0);
  // Candidate palette has rifle samples; normal Mack now correctly fires a revolver.
  // Use the actual Qin rifle encounter rather than changing Mack's weapon to fit a test.
  await p.evaluate(()=>{const s=G.main.getState();s.combat={seeded:false};const build=G.enemies.buildEncounterForNode;G.enemies.buildEncounterForNode=()=>G.enemies.buildEncounter('act4_elite_qin_biao');try{G.main.replaceState(G.scenes.combat.prepareState(s));}finally{G.enemies.buildEncounterForNode=build;}});await step(0);
  assert.equal(await p.evaluate(()=>G.main.getState().combat.enemies[0].templateId),'act4_elite_qin_biao');
  await p.evaluate(()=>{mediaCalls=[];});await click(1070,600);await step(5000);
  assert.ok(await p.evaluate(()=>mediaCalls.some(c=>c.src.includes('mechanism-'))));
  assert.equal(await p.evaluate(()=>mediaCalls.filter(c=>c.src.includes('rifle-')).length),0);
  await click(1070,600);await step(5000);await p.evaluate(()=>{mediaCalls=[];});
  const musicBefore=await p.evaluate(()=>G.audio.getDebugState().musicTargetGain);
  await click(1070,600);await step(360);
  assert.equal(await p.evaluate(()=>mediaCalls.filter(c=>c.src.includes('rifle-')).length),0);
  await step(250);assert.equal(await p.evaluate(()=>mediaCalls.filter(c=>c.src.includes('rifle-')).length),1);
  assert.ok(await p.evaluate(()=>G.audio.getDebugState().musicTargetGain)<musicBefore);
  await p.clock.runFor(350);assert.ok(Math.abs(await p.evaluate(()=>G.audio.getDebugState().musicTargetGain)-musicBefore)<.00001);
  checks.push('Explicit Qin rifle preparation never fires; shot sample and music duck start at firing contact, then music level recovers');
  await p.evaluate(()=>{G.audio.previewCombatCue('shot');G.audio.stopCombatSfx();});await p.clock.runFor(10);
  assert.equal(await p.evaluate(()=>G.audio.getDebugState().activeSfxCount),0);
  assert.equal(await p.evaluate(()=>G.audio.getDebugState().pendingSfxTimers),0);
  await p.clock.resume();await p.click('#sound-toggle');await p.selectOption('#sound-palette','original');
  assert.equal(await p.evaluate(()=>G.audio.getDebugState().combatSoundProfile),'original');
  await p.setViewportSize({width:960,height:600});await p.screenshot({path:new URL('sound-controls.png',output).pathname.replace(/^\//,'')});
  const panel=await p.locator('#sound-panel').boundingBox();assert.ok(panel.y+panel.height<=600);
  const credits=await browser.newPage();await credits.goto(new URL('art/realistic-combat/audio-credits.html',root).href);
  assert.ok((await credits.locator('body').innerText()).includes('StarNinjas'));
  const main=await browser.newPage();await main.goto(new URL('index.html',root).href);await main.waitForFunction(()=>G.main?.getState());
  assert.equal(await main.evaluate(()=>G.audio.getDebugState().combatSoundProfile),'original');
  assert.equal(await main.evaluate(()=>typeof G.combatAudioCandidate),'undefined');
  checks.push('Reset cancels pending cues; original palette restores; credits and small-window controls work; main entry stays on original audio');
  assert.deepEqual(errors,[]);
  const report={passed:true,checks,errors,limitations:['Playback, waveform measurements and event timing verified; no human listening acceptance of the SFX candidate.','User-selected Suno music is shared with the complete game; the recorded SFX candidate remains opt-in in the realistic sample.']};
  await fs.writeFile(new URL('summary.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
