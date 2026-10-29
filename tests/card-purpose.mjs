import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
import {installFrontendFixture} from './frontend-fixtures.mjs';
const args=process.argv.slice(2),arg=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const baseline=args.includes('--baseline'),entry=path.resolve(arg('--entry','play.html'));
const out=fileURLToPath(await createVerificationOutput(baseline?'card-purpose-before':'card-purpose'));
const report={entry,baseline,scope:'Same explicit hand fixtures, actual touch and Canvas text; offline muted Chrome, not physical-phone acceptance.',screens:[],states:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
try{
 for(const [width,height,mobile] of [[740,360,true],[640,320,true],[854,393,true],...(args.includes('--mobile-only')?[]:[[1280,800,false]])]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:mobile,offline:true});
  await context.addInitScript(m=>{window.KGAME_MOBILE=m;},mobile);
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.stack));
  await p.goto(pathToFileURL(entry).href,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForFunction(()=>window.G?.main&&G.fonts.loaded);
  if(mobile&&!await p.evaluate(()=>!!window.KGameAndroid)){
   await p.addStyleTag({path:path.resolve('android/mobile.css')});await p.addScriptTag({path:path.resolve('android/mobile.js')});
  }
  await p.evaluate(installFrontendFixture,{scene:'combat',o:{style:'combo',reduced:true}});
  await p.evaluate(()=>{let s=G.main.getState();s.combat.hand=['劈砍','招架','滚肘抢门','闪身刺','贴身递步'].map((name,i)=>{const c=G.cards.getCardByName(name);s.combat.cardLibrary[name]=c;return {...c,id:'purpose-'+i};});s.player.block=0;G.main.replaceState(G.deck.refreshHandPlayability(s));});
  await p.waitForTimeout(900);
  const fixture=await p.evaluate(()=>G.main.getState());
  async function shot(step){const file=`${width}x${height}-${step}.png`;await p.screenshot({path:path.join(out,file)});report.screens.push(file);}
  await shot('hand');
  report.states.push({width,height,mobile,hand:fixture.combat.hand.map(c=>({id:c.id,name:c.name,cost:c.cost})),boxes:await p.evaluate(()=>G.scenes.combat.getHandLayoutBoxes(G.main.getState()))});
  const tap=async(x,y)=>{const c=await p.locator('canvas').boundingBox();await p.touchscreen.tap(c.x+x*c.width/1280,c.y+y*c.height/720);await p.waitForTimeout(180);};
  const box=await p.evaluate(()=>G.scenes.combat.getHandLayoutBoxes(G.main.getState())[1]);
  await tap(box.centerX,box.centerY);await p.waitForTimeout(220);assert.equal(await p.evaluate(()=>G.main.getState().combat.selectedCardId),'purpose-1');assert.equal(await p.evaluate(()=>G.main.getState().player.energy),fixture.player.energy);await shot('selected');
  if(width===740){
   const c=await p.locator('canvas').boundingBox(),x=c.x+box.centerX*c.width/1280,y=c.y+box.centerY*c.height/720;
   const cdp=await context.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,radiusX:2,radiusY:2}]});await p.waitForTimeout(1250);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await p.waitForFunction(()=>document.querySelector('#mobile-read')?.open);await shot('detail');
   assert.ok((await p.locator('#mobile-read').innerText()).includes('获得 5 架势'));
   await p.getByRole('button',{name:'返回交锋',exact:true}).tap();assert.equal(await p.evaluate(()=>G.main.isPaused()),false);
  }
  // Real input still uses the same self target and action cost.
  await p.evaluate(s=>G.main.replaceState(s),fixture);await p.waitForTimeout(150);
  await tap(box.centerX,box.centerY);await p.waitForFunction(()=>G.main.getState().combat.selectedCardId==='purpose-1');await tap(330,350);await p.waitForFunction(()=>G.main.getState().player.block===5&&!G.scenes.combat.feedback.isBusy());
  const played=await p.evaluate(()=>G.main.getState());assert.equal(played.player.block,5);assert.equal(played.player.energy,fixture.player.energy-1);assert.ok(!played.combat.hand.some(c=>c.id==='purpose-1'));
  if(width===740){
   report.labels=await p.evaluate(()=>{
    const rows=[];
    const examples=['劈砍','招架','滚肘抢门','闪身刺','贴身递步','连皮带骨','舍身一刀','撒石灰','寸拳连珠','招架+','合身压顶','盘桥护身'];
    for(const name of examples){const def=G.cards.getCardByName(name),canvas=document.createElement('canvas');canvas.width=280;canvas.height=330;const ctx=canvas.getContext('2d'),texts=[],fill=ctx.fillText;ctx.fillText=function(t,x,y,...rest){texts.push({text:String(t),x,y,font:this.font});return fill.call(this,t,x,y,...rest);};G.render.ui.drawCardSlot(ctx,{...def,sourceCard:def,x:20,y:20,width:126,height:176,artRole:'combat',playable:true,showFooterTokens:false,skipCache:true});rows.push({name,texts});}
    // Incidental wording about guard must not turn a damage-only card into defense.
    for(const [name,def] of [['spends-guard',{damage:7,text:'消耗架势，造成7伤害。'}],['draw-only',{draw:2,text:'抽2张牌。'}]]){const ctx=document.createElement('canvas').getContext('2d'),texts=[],fill=ctx.fillText;ctx.fillText=function(t,...rest){texts.push({text:String(t)});return fill.call(this,t,...rest);};G.render.ui.drawCardSlot(ctx,{...def,name,sourceCard:def,x:0,y:0,width:126,height:176,artRole:'combat',cost:1,playable:true,skipCache:true});rows.push({name,texts});}
    return rows;
   });
   if(!baseline){
    const expected={'劈砍':['攻','伤害6'],'招架':['守','架势5'],'滚肘抢门':['攻守','伤害5 · 架势3'],'闪身刺':['攻','伤害3'],'贴身递步':['守','架势2'],'连皮带骨':['攻','伤害=架势'],'舍身一刀':['攻','伤害3×破绽'],'撒石灰':['辅','迷眼2'],'寸拳连珠':['攻','伤害2×4'],'招架+':['守','架势8'],'合身压顶':['攻','伤害10+架势'],'盘桥护身':['守','架势6'],'spends-guard':['攻','伤害7'],'draw-only':['辅','抽牌2']};
    for(const row of report.labels)for(const label of expected[row.name])assert.ok(row.texts.some(t=>t.text===label),row.name+' missing visible '+label);
    const sacrifice=report.labels.find(r=>r.name==='舍身一刀').texts.map(t=>t.text).join('').replace(/\s/g,'');assert.ok(sacrifice.includes('消耗所有破绽'));assert.ok(sacrifice.includes('自损1气血'),'self damage must remain visible');
    const bridge=report.labels.find(r=>r.name==='盘桥护身').texts.map(t=>t.text).join('');assert.ok(bridge.includes('已有架势：架势+4'));assert.ok(bridge.includes('铁骨：架势+4'));
   }
   await p.setViewportSize({width:1280,height:800});
   await p.evaluate(async()=>{
    const names=['连皮带骨','舍身一刀','盘桥护身','贴山靠','寸拳连珠','招架+','撒石灰','合身压顶'];
    const canvas=document.createElement('canvas');canvas.id='purpose-grid';canvas.width=1040;canvas.height=640;canvas.style.cssText='position:fixed;left:0;top:0;z-index:99999;width:1040px;height:640px';document.body.appendChild(canvas);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#171914';ctx.fillRect(0,0,1040,640);
    function paint(){ctx.fillStyle='#171914';ctx.fillRect(0,0,1040,640);names.forEach((name,i)=>{const c=G.cards.getCardByName(name);G.render.ui.drawCardSlot(ctx,{...c,sourceCard:c,x:28+(i%4)*254,y:24+Math.floor(i/4)*312,width:198,height:276,artRole:'combat',playable:true,skipCache:true,showFooterTokens:false});});}
    paint();await new Promise(r=>setTimeout(r,1200));paint();
   });
   await p.locator('#purpose-grid').screenshot({path:path.join(out,'complex-cards.png')});report.screens.push('complex-cards.png');
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}
finally{await browser.close();await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,screens:report.screens.length,failure:report.failure}));}
