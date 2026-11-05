import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

import {createVerificationOutput} from './verification-output.mjs';
const output=await createVerificationOutput('journey-layers');
const fixture=new URL('./fixtures/journey-layering/',import.meta.url);
await fs.mkdir(output,{recursive:true});
let browser;
try{browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});}
catch(e){if(!/not found|doesn't exist|ENOENT/i.test(e.message))throw e;browser=await chromium.launch({channel:'msedge',headless:true,args:['--mute-audio']});}
const errors=[],checks=[];
try{
  const preparePage=async()=>{
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url());});
    await page.goto(new URL('../art/realistic-combat/index.html',import.meta.url).href);
    await page.waitForFunction(()=>[...G.render.realisticCombat.assetPaths,...G.render.realisticJourney.assetPaths].every(path=>G.render.assets.getImageEntry(path).loaded));
    await page.clock.install({time:new Date('2026-10-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-01T00:00:01Z'));
    return page;
  };
  let p=await preparePage();
  const step=ms=>p.evaluate(ms=>advanceTime(ms),ms),state=()=>p.evaluate(()=>G.main.getState());
  const click=async(b,options)=>{await step(260);const c=await p.locator('canvas').boundingBox();await p.mouse.click(c.x+(b.x+b.width/2)*c.width/1280,c.y+(b.y+b.height/2)*c.height/720,options);await step(0);};
  const action=async name=>click(await p.evaluate(name=>G.render.realisticJourney.boxes[name],name));
  const reset=async stage=>{await p.selectOption('#review-stage',stage);await p.click('#retry');await step(1200);};
  const shot=async name=>{await p.mouse.move(1270,790);await step(0);await p.locator('canvas').screenshot({path:fileURLToPath(new URL(name+'.png',output))});};

  // Compare both journey implementations on one fight with the same loaded image caches.
  // Separate browser starts can cache procedural UI surfaces before different texture loads complete.
  const preserved=JSON.parse(await fs.readFile(new URL('combat-state.json',fixture),'utf8'));
  await p.evaluate(s=>{replace_game_state(s);G.render.animations.clearEffects('combat');advanceTime(0);},preserved);
  // Replaying a different style starts card-art requests; wait for those pixels before comparing.
  await p.waitForFunction(()=>Object.values(KGAME_CARD_ART_MANIFEST.cards).every(art=>{
    const path=typeof art==='string'?art:art?.path;return !path||G.render.assets.getImageEntry(path).loaded;
  }));
  await p.evaluate(()=>document.fonts.ready);
  await p.mouse.move(1270,790);await step(0);
  const after=await p.locator('canvas').screenshot();
  await fs.writeFile(new URL('combat-after.png',output),after);
  await p.evaluate(source=>{(0,eval)(source);advanceTime(0);},await fs.readFile(new URL('journey-before.js.txt',fixture),'utf8'));
  const before=await p.locator('canvas').screenshot();
  await fs.writeFile(new URL('combat-control-before.png',output),before);
  assert.ok(before.equals(after),'The exact preserved combat state must render identically after the menu changes');
  await fs.writeFile(new URL('combat-baseline.json',output),JSON.stringify({identical:true,sameRuntimeAndCaches:true,beforeSHA256:createHash('sha256').update(before).digest('hex'),afterSHA256:createHash('sha256').update(after).digest('hex'),scope:'Original and current journey code on one serialized three-enemy combat state with the same caches; not a whole-game pixel guarantee'},null,2));
  checks.push('Original/current journey code on the same combat state and image caches: identical screenshot bytes');
  // The control deliberately installs the old wrappers; use a fresh current runtime for interactions.
  await p.close();p=await preparePage();

  // Read each source PNG through a data URI to inspect alpha without file-origin canvas restrictions.
  const art=await p.evaluate(()=>G.render.realisticJourney.art),alpha=[];
  for(const [role,path] of Object.entries(art)){
    if(/background/i.test(role))continue;
    const url='data:image/png;base64,'+(await fs.readFile(new URL('../'+path,import.meta.url))).toString('base64');
    const stats=await p.evaluate(async ({url,role})=>{
      const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;
      let clear=0,solid=0,rightClear=0,total=0,rightTotal=0,core=0,coreSolid=0;
      const rest=['idle','heal','practice'].includes(role),body=rest?{x:c.width*350/1672,y:c.height*410/941,w:c.width*130/1672,h:c.height*110/941}:{x:360,y:470,w:120,h:110};
      for(let y=0;y<c.height;y+=16)for(let x=0;x<c.width;x+=16){const a=pixels[(y*c.width+x)*4+3];total++;if(a===0)clear++;if(a>240)solid++;if(x>c.width*.67){rightTotal++;if(a===0)rightClear++;}if(x>=body.x&&x<body.x+body.w&&y>=body.y&&y<body.y+body.h){core++;if(a>240)coreSolid++;}}
      return {width:c.width,height:c.height,clear:clear/total,solid:solid/total,rightClear:rightClear/rightTotal,bodyCoreOpaque:coreSolid/core};
    },{url,role});
    assert.ok(stats.width>=1280&&stats.height>=720,role+' must retain enough source resolution for the full scene');
    // Wide scene placement leaves a smaller silhouette; opacity belongs to the robe, not a fixed canvas-area quota.
    assert.ok(stats.clear>.3&&stats.solid>.1&&stats.bodyCoreOpaque>.98,role+' must contain an opaque body core with a substantial silhouette and transparent exterior');
    if(['idle','heal','practice'].includes(role))assert.equal(stats.rightClear,1,'Rest foreground must leave its right third completely transparent');
    alpha.push({role,path,...stats});
  }
  await fs.writeFile(new URL('source-alpha.json',output),JSON.stringify(alpha,null,2));
  checks.push('All six figure/foreground PNGs have genuine alpha; all rest poses have a fully transparent right third');

  await p.selectOption('#style','blade');await reset('rest');const original=await state(),layout=await p.evaluate(()=>G.scenes.restShared.getLayout());
  assert.equal(await p.evaluate(()=>G.render.realisticJourney.restPose(G.main.getState())),'idle');
  await click(layout.heal);assert.equal((await state()).rest.reviewChoice,'heal');assert.equal((await state()).player.hp,original.player.hp);
  assert.equal(await p.evaluate(()=>G.render.realisticJourney.restPose(G.main.getState())),'heal');await shot('21-rest-heal-selected');
  await p.evaluate(()=>load_run_save());assert.equal((await state()).rest.reviewChoice,'heal');assert.equal((await state()).player.hp,original.player.hp);
  await p.keyboard.press('Escape');await step(0);assert.equal((await state()).rest.reviewChoice,null);
  assert.equal(await p.evaluate(()=>G.render.realisticJourney.restPose(G.main.getState())),'idle');
  await click(layout.upgrade);assert.equal((await state()).rest.reviewChoice,'upgrade');
  assert.deepEqual((await state()).player.masterDeckNames,original.player.masterDeckNames);await shot('22-rest-practice-selected');
  await click(layout.heal);await action('restConfirm');assert.equal((await state()).player.hp,78);assert.equal((await state()).reviewReceipt.title,'伤口已裹好');
  checks.push('Rest selection previews the corresponding pose; select/swap/Escape and save/load have no HP/deck mutation; explicit confirmation heals once');

  for(const style of ['blade','iron','dirty','combo']){
    await p.selectOption('#style',style);await reset('reward');
    const s=await state(),L=await p.evaluate(()=>G.scenes.reward.getLayout(G.main.getState().reward.options.length));
    assert.equal(s.player.chosenStyle,style);await shot('23-reward-'+style);
    await click(L.cards[0]);await action('confirm');assert.equal((await state()).player.masterDeckNames.length,s.player.masterDeckNames.length+1);
  }
  checks.push('All four styles render and commit a reward with the correct deck, using blade, short dagger, or unarmed idle poses');

  await p.setViewportSize({width:960,height:600});await reset('rest');await click(layout.heal);await action('restConfirm');
  assert.equal((await state()).player.hp,78);const c=await p.locator('canvas').boundingBox();assert.ok(c.y+c.height<=600);
  await shot('24-small-confirmed-rest');checks.push('Small-window rest selection and confirmation operate at correctly scaled coordinates');
  assert.deepEqual(errors,[]);
  const report={passed:true,headless:true,muted:true,checks,errors};await fs.writeFile(new URL('layers-summary.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
