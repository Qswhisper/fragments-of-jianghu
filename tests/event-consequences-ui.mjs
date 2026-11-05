import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
import {finishArrival} from './journey-actions.mjs';
const args=process.argv.slice(2),arg=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const selectedIds=arg('--ids','').split(',').filter(Boolean);
const entry=new URL('../'+arg('--entry','play.html'),import.meta.url),out=fileURLToPath(await createVerificationOutput('event-consequences-ui'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
const report={entry:entry.href,scope:'Explicit later-event fixtures, real mouse/touch input, persistence and Canvas layout; natural campaigns are separate',checks:[],screens:[],errors:[],passed:false};
let p;
try{
 for(const mobile of (args.includes('--mobile-only')?[true]:[false,true])){
  const context=await browser.newContext({viewport:mobile?{width:854,height:393}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile,offline:true});
  p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.stack));p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')report.errors.push(r.url());});
  if(mobile)await p.addInitScript(()=>{window.KGAME_MOBILE=true;window.KGameAndroid={};});
  await p.goto(entry.href);await p.waitForFunction(()=>G.main&&G.render.journeyStory.assetPaths.every(a=>G.render.assets.getImageEntry(a).loaded));await p.evaluate(()=>document.fonts.ready);
  const point=async b=>{await p.waitForFunction(()=>!G.render.journeyMotion.debug().transition);const c=await p.locator('#game-canvas').boundingBox(),x=c.x+(b.x+b.width/2)*c.width/1280,y=c.y+(b.y+b.height/2)*c.height/720;if(mobile)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y,{delay:45});await p.waitForTimeout(140);};
  const shot=async name=>{await p.waitForFunction(()=>!G.render.journeyMotion.debug().transition);await p.waitForTimeout(220);const file=name+'-'+(mobile?'mobile':'pc')+'.png';await p.screenshot({path:path.join(out,file)});report.screens.push(file);};
  const list=(await p.evaluate(()=>[...G.journeyEvents.definitions.map(d=>({id:d.id,chain:d.consequence.chain,variant:d.consequence.variant})),...G.journeyEvents.ordinary.map(d=>({id:d.id}))])).filter(d=>!selectedIds.length||selectedIds.includes(d.id));
  if(selectedIds.length)assert.deepEqual(list.map(d=>d.id).sort(),[...selectedIds].sort(),'Requested event IDs exist');
  else list.push({id:'witness-option',chain:'school',variant:'divided',witness:true},{id:'schedule-option',chain:'transport',variant:'bargain',schedule:true});
  const install=async item=>p.evaluate(item=>{
    G.main.resetState();let s=G.main.getState();s.scene='event';s.player={...s.player,hp:52,maxHp:80,gold:100,chosenStyle:'blade',masterDeckNames:G.cards.getStarterDeck('blade')};s.map={actNumber:item.chain==='informer'?4:3,currentNodeId:'ui-'+item.id,routeSeed:56,routeHistory:Array.from({length:13},()=>({act:2,type:'event'}))};s.events={seenIds:[],nextSeed:1900,history:[]};
    G.eventConsequences.ensure(s);const f=s.events.consequences.facts;
    if(item.witness){f.echo_family_shelter={choice:'send_word',act:2,step:7};f.act1_execution_notice={choice:'claim_the_bounty',act:1,step:1};}
    if(item.schedule){f.echo_informer_allies={choice:'send_schedule',act:4,step:18};f.act2_overturned_caravan={choice:'loot_the_silver',act:2,step:6};s.map.actNumber=5;}
    let d=item.chain?G.journeyEvents.build(s,item.chain,item.variant,{id:'act1_teahouse_poison',choice:'drink_anyway',act:1},G.eventConsequences.context(s)):G.journeyEvents.ordinary.find(d=>d.id===item.id);
    if(!item.chain)s.map.actNumber=d.act;
    s.nemesis={pool:[{id:'nemesis_1',name:'周守义',level:3,baseHP:100,baseAttack:10,sourceTemplateId:'boss_guard_chief',history:[]}],nextId:2,currentRunEntryIds:[]};
    s.event={nodeId:s.map.actNumber+':'+s.map.currentNodeId,eventId:d.id,actNumber:s.map.actNumber,actTitle:G.enemies.getActMeta(s.map.actNumber).title,title:d.title,body:d.body,choices:structuredClone(d.choices),consequence:d.consequence||null,mode:'choice',copyRevision:3};G.main.replaceState(s);return {id:d.id,choices:d.choices.map(c=>c.id)};
  },item);
  for(const item of list){
   for(let i=0;i<2;i++){
    const def=await install(item);await p.waitForTimeout(160);
    await p.waitForFunction(()=>{const e=G.main.getState().event;return G.render.assets.getImageEntry(G.render.journeyStory.eventBackground(e)).loaded;});
    const fit=await p.evaluate(()=>{const s=G.main.getState(),L=G.scenes.event.getLayout(2),ctx=document.createElement('canvas').getContext('2d'),font=G.render.ui.getBodyFontFamily(),phone=!!window.KGAME_MOBILE;function lines(text,size,width){ctx.font='500 '+size+'px '+font;return G.render.journeyTypesetting.lines(ctx,text,width);}
     return {body:lines(s.event.body,phone?26:22,L.eventPanel.width),previews:s.event.choices.map(c=>lines(G.events.getChoicePreview(s,c.id),phone?25:22,L.choiceBoxes[0].width-48))};});
    assert.ok(fit.body.length<=5,JSON.stringify({item,fit}));assert.ok(fit.previews.every(x=>x.length<=2),JSON.stringify({item,fit}));
    if(i===0)await shot(item.id+'-choice');
    const expected=await p.evaluate(id=>{const s=G.events.applyChoice(G.main.getState(),id);return {hp:s.player.hp,gold:s.player.gold,deck:s.player.masterDeckNames,nemesis:s.nemesis,consequences:s.events.consequences};},def.choices[i]);
    await point(await p.evaluate(i=>G.scenes.event.getLayout(2).choiceBoxes[i],i));await p.waitForFunction(()=>G.main.getState().event.mode==='result');
    const actual=await p.evaluate(()=>{const s=G.main.getState();return {hp:s.player.hp,gold:s.player.gold,deck:s.player.masterDeckNames,nemesis:s.nemesis,consequences:s.events.consequences};});assert.deepEqual(actual,expected);
    const resultFit=await p.evaluate(()=>{const s=G.main.getState(),L=G.scenes.event.getLayout(2),ctx=document.createElement('canvas').getContext('2d');ctx.font='500 '+(window.KGAME_MOBILE?26:22)+'px '+G.render.ui.getBodyFontFamily();return G.render.journeyTypesetting.lines(ctx,s.event.resultText,L.eventPanel.width);});assert.ok(resultFit.length<=4,JSON.stringify({item,resultFit}));
    await shot(item.id+'-result-'+i);await p.reload();await p.waitForFunction(()=>G.main);
    assert.deepEqual(await p.evaluate(()=>G.storage.loadRun().events.consequences),actual.consequences);
    await p.evaluate(()=>{const s=G.storage.loadRun();G.main.replaceState(s);});
    await point(await p.evaluate(()=>G.scenes.event.getLayout(2).continueButton));await p.waitForFunction(()=>G.main.getState().scene==='map');assert.equal(await p.evaluate(()=>G.main.getState().scene),'map');
   }
  }
  if(!selectedIds.length){
  // A real departure, actual choice, reload/Continue, then a later route-node preparation.
  await p.evaluate(()=>{G.storage.clearRun();G.main.resetState();});
  await p.getByRole('button',{name:'踏入九城',exact:true}).click();await p.getByRole('button',{name:'入城',exact:true}).click();
  await finishArrival(p,{touch:mobile});
  await p.evaluate(()=>{let s=G.main.getState();s.scene='event';s.map={actNumber:1,currentNodeId:'early',routeSeed:121,routeHistory:[{act:1,type:'event'}]};const d=G.events.definitions.find(d=>d.id==='act1_child_in_embers');s.event={nodeId:'1:early',eventId:d.id,actNumber:1,actTitle:G.enemies.getActMeta(1).title,title:d.title,body:d.body,choices:d.choices,mode:'choice',copyRevision:3};G.main.replaceState(s);});
  await p.waitForTimeout(220);await point(await p.evaluate(()=>G.scenes.event.getLayout(2).choiceBoxes[0]));await p.waitForFunction(()=>G.main.getState().event.mode==='result');await p.reload();await p.getByRole('button',{name:'再续前路',exact:true}).click();
  await p.waitForFunction(()=>G.main.getState().scene==='event');assert.equal(await p.evaluate(()=>G.main.getState().events.consequences.facts.act1_child_in_embers.choice),'carry_out');
  const offered=await p.evaluate(()=>{let s=G.main.getState();s.map.actNumber=3;s.map.routeHistory=Array.from({length:12},()=>({act:2,type:'event'}));let id;for(let i=0;i<100;i++){id='late-'+i;if(G.eventConsequences.pick(s,'3:'+id))break;}s.map.currentNodeId=id;s.event=null;G.main.replaceState(s);return G.main.getState().event;});assert.equal(offered.consequence.chain,'family');
  await shot('saved-family-return');await point(await p.evaluate(()=>G.scenes.event.getLayout(2).choiceBoxes[0]));
  await p.evaluate(()=>{let s=G.main.getState();s.map.completed=true;G.main.replaceState(G.runReport.enter(s,'victory'));});await shot('personal-report');
  await point(await p.evaluate(()=>G.scenes.title.getLayout().reportDetails));assert.match(await p.locator('#dialog-content').innerText(),/火巷/);await p.locator('#close-dialog').click();
  await point(await p.evaluate(()=>G.scenes.title.getLayout().reportButtons[1]));await p.getByRole('button',{name:'入城',exact:true}).click();
  await p.waitForFunction(()=>G.main.getState().scene==='arrival');
  assert.equal(await p.evaluate(()=>G.main.getState().events.consequences),undefined,'New departure has no prior moral/person facts');
  }
  report.checks.push((mobile?'Touch':'Mouse')+(selectedIds.length?': selected events '+selectedIds.join(',')+'; both choices, actual submission, reload and continue':': all 12 later variants, two ordinary additions, both cross-chain options; complete choice/body text; real submission; reload; report response; next-run reset'));
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;if(p&&!p.isClosed())await p.screenshot({path:path.join(out,'failure.png')});}
finally{await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({passed:report.passed,checks:report.checks,screens:report.screens.length,failure:report.failure,errors:report.errors,out},null,2));}
