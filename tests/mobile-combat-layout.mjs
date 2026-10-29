import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {spawnSync} from 'node:child_process';
import {createVerificationOutput} from './verification-output.mjs';
const args=process.argv.slice(2),arg=(n,d)=>args.includes(n)?args[args.indexOf(n)+1]:d;
const entry=path.resolve(arg('--entry','play.html')),baseline=args.includes('--baseline');
const pixelOnly=args.includes('--pixel-only');
const out=fileURLToPath(await createVerificationOutput('mobile-combat-layout',arg('--output')));
const report={entry,baseline,scope:'Offline background Chrome, explicit combat fixtures and actual touch. CSS dimensions and screenshots are readability evidence, not physical-phone acceptance. Three opponents and 15-card hands are explicit capacity fixtures.',checks:[],screens:[],comparisons:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
let p;
try {
 for(const [width,height] of (pixelOnly?[[640,360]]:baseline?[[640,360],[854,393],[740,416]]:[[640,320],[640,360],[854,393],[740,416]])) {
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,hasTouch:true,isMobile:true,offline:true});
  await context.addInitScript(()=>{window.KGAME_MOBILE=true;let seed=130817;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);});
  p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.stack));
  await p.goto(pathToFileURL(entry).href);await p.waitForFunction(()=>window.G?.main&&G.render.realisticCombat.assetPaths.every(a=>G.render.assets.getImageEntry(a).loaded));
  if(!await p.evaluate(()=>!!window.KGameAndroid)){
   await p.addStyleTag({path:path.resolve('android/mobile.css')});await p.addScriptTag({path:path.resolve('android/mobile.js')});
  }
  const tap=async b=>{const c=await p.locator('#game-canvas').boundingBox();await p.touchscreen.tap(c.x+(b.x+b.width/2)*c.width/1280,c.y+(b.y+b.height/2)*c.height/720);await p.waitForTimeout(150);};
  for(const [style,encounter,count] of [['blade','street_intro',1],['iron','act4_street_quick_guns',2],['dirty','street_boxer_pair',3],['combo','act4_street_machine_team',2]]) {
   await p.evaluate(({style,encounter,count})=>{
    G.main.setPaused(false);G.main.resetState();let s=G.main.getState();s.player.chosenStyle=style;s.player.masterDeckNames=G.cards.getStarterDeck(style);s.scene='combat';s.combat={seeded:false};
    const build=G.enemies.buildEncounterForNode;G.enemies.buildEncounterForNode=()=>G.enemies.buildEncounter(encounter);
    try{s=G.scenes.combat.prepareState(s);}finally{G.enemies.buildEncounterForNode=build;}
    s.combat.actNumber=Number(encounter.match(/act(\d)/)?.[1]||1);
    // Explicit renderer capacity fixture, not a naturally generated encounter.
    if(count===3)s.combat.enemies.push({...structuredClone(s.combat.enemies[0]),id:'layout-third-boxer'});
    G.main.replaceState(s);
   },{style,encounter,count});
   assert.equal(await p.evaluate(()=>G.main.getState().combat.encounterId),encounter);
   assert.equal(await p.evaluate(()=>G.main.getState().combat.enemies.length),count);
   await p.waitForTimeout(250);
   const file=`${style}-${count}-enemies-${width}x${height}.png`;await p.screenshot({path:path.join(out,file)});report.screens.push(file);
   if(baseline)continue;
   if(width===640&&height===360){
    const cached=path.join(out,style+'-cached.png'),direct=path.join(out,style+'-direct.png');
    await p.evaluate(()=>{G.main.setPaused(true);G.render.canvasUtils.paintCacheEnabled=true;G.main.renderNow();});await p.screenshot({path:cached});
    await p.evaluate(()=>{G.render.canvasUtils.paintCacheEnabled=false;G.main.renderNow();});await p.screenshot({path:direct});
    const compare=spawnSync('python',['-c',"from PIL import Image,ImageChops;import json,sys;diff=ImageChops.difference(Image.open(sys.argv[1]).convert('RGB'),Image.open(sys.argv[2]).convert('RGB'));pixels=list(diff.getdata());print(json.dumps({'mean':sum(sum(p) for p in pixels)/(len(pixels)*3),'strong':sum(max(p)>40 for p in pixels)/len(pixels)}))",cached,direct],{encoding:'utf8',windowsHide:true});
    assert.equal(compare.status,0,compare.stderr);const pixels=JSON.parse(compare.stdout);
    report.comparisons.push({style,...pixels,cached:path.basename(cached),direct:path.basename(direct)});assert.ok(pixels.mean<1&&pixels.strong<.003,'Cached/direct mobile HUD pixels');
    await p.evaluate(()=>{G.render.canvasUtils.paintCacheEnabled=true;G.main.setPaused(false);});
   }
   if(pixelOnly)continue;
   const geometry=await p.evaluate(()=>{const b=document.getElementById('game-canvas').getBoundingClientRect(),L=G.scenes.combat.debugGetLayout();return {scale:b.width/1280,L};});
   for(const key of ['endTurn','drawPile','discardPile','combatDetails','cheatCuff']) {
    const box=geometry.L[key];assert.ok(box.width*geometry.scale>=44&&box.height*geometry.scale>=44,key+' touch target');
   }
   if(width===640&&height===360&&count>1){
    const fixture=await p.evaluate(()=>G.main.getState());
    for(let target=0;target<count;target++){
     await p.evaluate(s=>G.main.replaceState(s),fixture);
     const move=await p.evaluate(target=>{
      const s=G.main.getState(),e=G.scenes.combat.getEnemyLayoutBoxes(s)[target],card=s.combat.hand.find(c=>c.playable&&G.render.combatInteraction.needsEnemy(G.cards.getCardByName(c.name)));
      return {card:G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===card.id),cost:card.cost,id:e.enemy.id,point:{x:e.baseX+e.width/2,y:e.baseY+e.height-34},hp:s.combat.enemies.map(e=>e.hp),energy:s.player.energy};
     },target);
     await tap(move.card);await tap({...move.point,width:0,height:0});await p.waitForFunction(()=>!G.scenes.combat.feedback.isBusy());
     const after=await p.evaluate(()=>G.main.getState());
     after.combat.enemies.forEach((e,i)=>e.id===move.id?assert.ok(e.hp<move.hp[i]):assert.equal(e.hp,move.hp[i]));
     assert.equal(after.player.energy,move.energy-move.cost);
    }
    await p.evaluate(s=>G.main.replaceState(s),fixture);
    report.checks.push(`${style}: actual touches on every staggered HP caption target only its own opponent and spend once`);
   }
   const before=await p.evaluate(()=>G.main.getState());
   await tap(geometry.L.combatDetails);assert.ok(await p.locator('#mobile-read').evaluate(e=>e.open));
   if(width===640&&style==='combo'){const detailFile=`details-${width}x${height}.png`;await p.screenshot({path:path.join(out,detailFile)});report.screens.push(detailFile);}
   assert.match(await p.locator('#mobile-read').textContent(),/战况|旧物/);
   await p.evaluate(()=>KGameAndroid.back());await p.waitForFunction(()=>!document.querySelector("#mobile-read")?.open);assert.equal(await p.evaluate(()=>G.main.isPaused()),false);
   await tap(geometry.L.drawPile);assert.ok(await p.locator('#mobile-read').evaluate(e=>e.open));
   assert.match(await p.locator('#mobile-read').textContent(),/抽牌堆/);
   await p.evaluate(()=>KGameAndroid.back());await p.waitForFunction(()=>!document.querySelector("#mobile-read")?.open);
   assert.equal(await p.evaluate(()=>G.main.getState().player.energy),before.player.energy);
   assert.equal(await p.evaluate(()=>G.main.getState().combat.turn),before.combat.turn);
   const move=await p.evaluate(()=>{const s=G.main.getState(),card=s.combat.hand.find(c=>c.playable&&G.render.combatInteraction.needsEnemy(G.cards.getCardByName(c.name)));return {card,box:G.scenes.combat.getHandLayoutBoxes(s).find(b=>b.cardId===card?.id),enemy:G.scenes.combat.getEnemyLayoutBoxes(s)[0],hp:s.combat.enemies[0].hp};});
   assert.ok(move.card);await tap(move.box);
   if(width===640&&style==='combo'){const selectionFile=`selected-${width}x${height}.png`;await p.screenshot({path:path.join(out,selectionFile)});report.screens.push(selectionFile);}
   const anchor=await p.evaluate(box=>G.render.mobileCombat.intentAnchor(box),move.enemy);
   await tap({...anchor,width:0,height:0});
   await p.waitForFunction(()=>!G.scenes.combat.feedback.isBusy());
   assert.ok(await p.evaluate(hp=>G.main.getState().combat.enemies[0].hp<hp,move.hp),'Enemy information region must select the corresponding target');
   const turn=await p.evaluate(()=>G.main.getState().combat.turn);await tap(geometry.L.endTurn);await p.waitForFunction(()=>!G.scenes.combat.feedback.isBusy());
   assert.equal(await p.evaluate(()=>G.main.getState().combat.turn),turn+1);
   if(width===640&&style==='combo'){
    await p.evaluate(()=>{let s=G.main.getState();s.player.poisonTurns=2;s.player.block=18;s.combat.enemies.forEach(e=>{e.debuffs={flaw:3,fester:2,blind:1,crippleTurns:2};e.buffs={fervor:3};e.block=18;});G.main.replaceState(s);});
    const stressFile=`statuses-${width}x${height}.png`;await p.screenshot({path:path.join(out,stressFile)});report.screens.push(stressFile);
    if(height===360){
     await p.evaluate(()=>{let s=G.main.getState();const original=s.combat.hand;s.combat.hand=Array.from({length:15},(_,i)=>({...original[i%original.length],id:'touch-capacity-'+i}));G.main.replaceState(s);});
     const resources=await p.evaluate(()=>({hp:G.main.getState().player.hp,energy:G.main.getState().player.energy,turn:G.main.getState().combat.turn}));
     for(let index=0;index<15;index++){
      const candidate=await p.evaluate(index=>{
       const s=G.main.getState(),boxes=G.scenes.combat.getHandLayoutBoxes(s),b=boxes[index],L=G.scenes.combat.debugGetLayout();
       const inside=(p,b)=>p.x>=(b.hitX??b.x)&&p.x<=(b.hitX??b.x)+(b.hitWidth??b.width)&&p.y>=(b.hitY??b.y)&&p.y<=(b.hitY??b.y)+(b.hitHeight??b.height);
       for(const fy of [.18,.35,.5,.65])for(const fx of [.04,.08,.12,.2,.35,.5,.75,.9]){
        const p={x:b.hitX+b.hitWidth*fx,y:b.hitY+b.hitHeight*fy};
        if(p.y<710&&boxes.filter(v=>inside(p,v)).at(-1)?.cardId===b.cardId&&![L.drawPile,L.discardPile,L.endTurn,L.cheatCuff,L.combatDetails].some(v=>inside(p,v)))return {id:b.cardId,point:p};
       }throw Error('No exposed mobile card region: '+index);
      },index);
      await tap({x:candidate.point.x,y:candidate.point.y,width:0,height:0});assert.equal(await p.evaluate(()=>G.main.getState().combat.selectedCardId),candidate.id);
     }
     assert.deepEqual(await p.evaluate(()=>({hp:G.main.getState().player.hp,energy:G.main.getState().player.energy,turn:G.main.getState().combat.turn})),resources);
     report.checks.push('640×360: all 15 cards select their own ID through actual exposed touch regions without hitting pile/turn controls or spending resources; this does not certify finger comfort for dense hands');
     const capacityFile='hand-15-640x360.png';await p.screenshot({path:path.join(out,capacityFile)});report.screens.push(capacityFile);
    }
   }
   if(width===640&&height===360&&style==='iron'){
    await p.evaluate(()=>{let s=G.main.getState();s.player.poisonTurns=2;s.combat.comboCount=1;G.main.replaceState(s);});
    assert.equal(await p.evaluate(()=>G.scenes.combat.getPlayerStatusChips(G.main.getState(),G.main.getState().player).length),3);
    const file='player-three-statuses-640x360.png';await p.screenshot({path:path.join(out,file)});report.screens.push(file);
    await tap(geometry.L.combatDetails);assert.match(await p.locator('#mobile-read').textContent(),/中毒/);assert.match(await p.locator('#mobile-read').textContent(),/连环/);await p.evaluate(()=>KGameAndroid.back());await p.waitForFunction(()=>!document.querySelector("#mobile-read")?.open);
    report.checks.push('Explicit iron/poison/combo three-status fixture: screenshot and readable paused detail; not a natural encounter');
   }
   report.checks.push(`${width}×${height} ${style}: ${count} enemies, 44px targets, details/pile pause and return without cost, circular-intent target attack, actual End Turn`);
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;await p?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally {await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
