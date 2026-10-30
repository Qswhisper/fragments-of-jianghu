import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
const dir=process.argv[2];assert.ok(dir,'Provide the generated trial review directory');
const out=fileURLToPath(await createVerificationOutput('context-help-preview'));
const report={checks:[],errors:[],scope:'Generated live source examples, small desktop, combo discount, poison rule source and relic shop information. Fixtures, no native/physical acceptance.'};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});let page;
const local=name=>pathToFileURL(path.resolve(dir,name)).href;
async function ready(target=page){await target.waitForFunction(()=>window.G?.main&&G.main.getState().scene!=='title'&&G.fonts?.loaded&&!G.render.journeyMotion.debug().transition&&G.render.realisticCombat.assetPaths.every(p=>G.render.assets.getImageEntry(p).loaded),null,{timeout:60000});await page.waitForTimeout(500);}
async function canvasPoint(b,target=page){const r=await target.locator('#game-canvas').boundingBox();return {x:r.x+(b.centerX??b.x+b.width/2)*r.width/1280,y:r.y+(b.centerX!=null?b.y+75:b.y+b.height/2)*r.height/720};}
try{
 page=await browser.newPage({viewport:{width:960,height:600}});page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(60000);page.on('pageerror',e=>report.errors.push(e.stack));
 await page.goto(local('review.html'));assert.equal(await page.locator('img').count(),7);for(const image of await page.locator('img').all())assert.ok(await image.evaluate(i=>i.complete&&i.naturalWidth));
 await page.locator('a[href^="cost-pc"]').click();await ready();
 const p=await canvasPoint(await page.evaluate(()=>G.scenes.combat.getHandLayoutBoxes(G.main.getState())[0]));await page.mouse.move(p.x,p.y);await page.waitForTimeout(1350);
 const position=await page.locator('#context-help > section').boundingBox();
 await page.getByRole('button',{name:'解释临时费用',exact:true}).click();
 assert.deepEqual(await page.locator('#context-help > section').first().boundingBox(),position,'Following a term must not move the original card');
 const boxes=await page.locator('#context-help > section').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));assert.ok(boxes.every(r=>r.left>=0&&r.right<=960&&r.bottom<=600));
 await page.screenshot({path:path.join(out,'small-desktop.png')});report.checks.push('Review images load and its actual cost example opens; the root stays fixed and both panes fit a 960px desktop.');
 await page.evaluate(()=>{G.contextHelp.close();let s=G.main.getState();G.main.setPaused(true);s.player={...s.player,chosenStyle:'combo',relics:[],masterDeckNames:['闪身刺','招架','劈砍','招架','劈砍']};s.combat={seeded:false};s=G.scenes.combat.prepareState(s);s.combat.comboCount=3;s=G.deck.refreshHandPlayability(s);G.main.replaceState(s);G.main.setPaused(false);});await ready();
 const combo=await canvasPoint(await page.evaluate(()=>G.scenes.combat.getHandLayoutBoxes(G.main.getState())[0]));await page.mouse.move(combo.x,combo.y);await page.waitForTimeout(1350);
 assert.match(await page.locator('#context-help').innerText(),/原费 1 → 当前 0 · 连环/);await page.getByRole('button',{name:'解释临时费用',exact:true}).click();assert.match(await page.locator('.help-detail').innerText(),/回合结束后恢复原费/);report.checks.push('Combo temporary cost uses actual comboCount/refreshHandPlayability and its distinct expiry source.');
 await page.goto(local('battle-pc.html')+'?reading=trial');await ready();
 const expected=await page.evaluate(()=>{let s=G.main.getState();s.player.poisonTurns=2;s.player.block=9;G.main.replaceState(s);const result=G.statusEffects.resolvePlayerTurnStart(structuredClone(s)).state;return {damage:s.player.hp-result.player.hp,block:result.player.block,turns:result.player.poisonTurns};});assert.deepEqual(expected,{damage:3,block:9,turns:1});
 const detail=await canvasPoint(await page.evaluate(()=>{const l=G.scenes.combat.debugGetLayout();return l.combatDetails||l.playerPanel;}));await page.mouse.move(detail.x,detail.y);await page.waitForTimeout(1350);await page.getByRole('button',{name:'解释中毒',exact:true}).click();assert.match(await page.locator('.help-detail').innerText(),/失去 3 气血/);report.checks.push('Poison explanation agrees with actual turn-start resolution: direct HP loss, block retained, duration decremented.');
 await page.goto(local('shop-pc.html')+'?reading=trial');await ready();
 const offer=await page.evaluate(()=>{let s=G.main.getState();s.player.gold=0;G.main.replaceState(s);return s.shop.relicOffers[0];});
 const relic=await canvasPoint(await page.evaluate(()=>G.scenes.shop.getRelicBoxes(G.scenes.shop.getLayout())[0]));await page.mouse.move(relic.x,relic.y);await page.waitForTimeout(1350);assert.ok((await page.locator('#context-help').innerText()).includes(offer.description));assert.match(await page.locator('#context-help').innerText(),/尚缺/);
 await page.evaluate(()=>{G.contextHelp.close();let s=G.main.getState();s.shop.relicOffers[0].sold=true;G.main.replaceState(s);});await page.mouse.move(5,5);await page.mouse.move(relic.x,relic.y);await page.waitForTimeout(1350);assert.match(await page.locator('#context-help').innerText(),/已售出/);report.checks.push('Relic offer uses actual description/price and shows insufficient funds or sold state in the first layer.');
 await page.close();page=await browser.newPage({viewport:{width:1100,height:700},hasTouch:true});page.on('pageerror',e=>report.errors.push(e.stack));await page.goto(local('cost-touch.html'));
 await page.locator('iframe').waitFor();const frame=page.frames().find(f=>f.url().includes('touch-frame'));assert.ok(frame);await ready(frame);
 const touch=await canvasPoint(await frame.evaluate(()=>G.scenes.combat.getHandLayoutBoxes(G.main.getState())[0]),frame),cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frame.locator('#context-help-touch').waitFor({state:'visible'});assert.match(await frame.locator('#context-help-touch').innerText(),/原费 1 → 当前 0/);await page.screenshot({path:path.join(out,'touch-example.png')});await cdp.detach();report.checks.push('The generated fixed-viewport touch example loads real assets and responds to actual touch long-press.');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;if(page&&!page.isClosed()){report.observed=await page.evaluate(()=>({url:location.href,scene:window.G?.main?.getState().scene,fonts:window.G?.fonts&&{loaded:G.fonts.loaded,settled:G.fonts.settled,errors:G.fonts.errors},transition:window.G?.render?.journeyMotion?.debug(),unloaded:window.G?.render?.realisticCombat?.assetPaths.filter(p=>!G.render.assets.getImageEntry(p).loaded)})).catch(()=>null);await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}}
finally{await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({out,passed:report.passed,failure:report.failure,checks:report.checks.length}));
