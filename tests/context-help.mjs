import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';
import {installFrontendFixture} from './frontend-fixtures.mjs';

const out=fileURLToPath(await createVerificationOutput('context-help'));
const production=process.argv.includes('--production');
const report={scope:'Opt-in source trial. Deterministic real-rule fixtures, real mouse/CDP touch, system Chrome muted/headless. No APK/native/physical-phone or natural-campaign claim.',checks:[],screens:[],errors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
let page;
const snapshot=()=>page.evaluate(()=>{const s=G.main.getState();return {scene:s.scene,hp:s.player.hp,energy:s.player.energy,gold:s.player.gold,hand:s.combat.hand.map(c=>({id:c.id,name:c.name,cost:c.cost})),deck:s.player.masterDeckNames,relics:s.player.relics,played:s.combat.playedCards,shop:s.scene==='shop'?s.shop:null};});
const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png')});report.screens.push(name+'.png');};
const installReadingCombat=discount=>{
  let s=G.main.getState();G.main.setPaused(true);
  s.player={...s.player,hp:80,maxHp:80,energy:3,maxEnergy:3,chosenStyle:'dirty',relics:discount?['beiyang_boots']:[],masterDeckNames:[discount?'劈砍':'溃口封喉','招架','下盘撩踢','招架','劈砍'],deckSize:5};
  s.combat={seeded:false,ui:{overlay:null}};s=G.scenes.combat.prepareState(s);
  if(discount)s.combat.playedCards=Array.from({length:3},()=>({name:'劈砍',style:'basic'}));
  s.combat.enemies[0].debuffs={flaw:3,fester:4,blind:1,crippleTurns:2};
  s=G.enemyAI.refreshIntentsForDebuffs(s);s=G.deck.refreshHandPlayability(s);G.main.replaceState(s);G.main.setPaused(false);
};
async function init(trial=true,mobile=false,viewport={width:1280,height:758}) {
  const context=await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile});
  page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.stack));
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(60000);
  if(mobile)await page.addInitScript(()=>window.KGAME_MOBILE=true);
  await page.goto(pathToFileURL(path.resolve('play.html')).href+(trial?(production?'':'?reading=trial'):'?reading=legacy'));
  await page.waitForFunction(()=>G.main&&G.fonts?.loaded&&G.render.realisticCombat.assetPaths.every(p=>G.render.assets.getImageEntry(p).loaded));
  if(mobile){await page.addStyleTag({path:'android/mobile.css'});await page.addScriptTag({path:'android/mobile.js'});}
  assert.equal(await page.evaluate(()=>window.KGAME_STORAGE_NAMESPACE),trial&&!production?'kgame-context-help-trial-v1':'kgame-journey-v1');
  return context;
}
async function fixture(scene='combat',discount=false) {
  await page.evaluate(()=>G.contextHelp?.close());
  await page.evaluate(installFrontendFixture,{scene,o:{style:'dirty',reduced:true,gold:180}});
  if(scene==='combat')await page.evaluate(installReadingCombat,discount);
  await page.waitForFunction(()=>!G.render.journeyMotion.debug().transition&&!G.scenes.combat.feedback.isBusy());
  await page.waitForTimeout(350);
}
async function point(b,hand=false){const c=await page.locator('#game-canvas').boundingBox();return {x:c.x+(hand?b.centerX:b.x+b.width/2)*c.width/1280,y:c.y+(hand?b.y+75:b.y+b.height/2)*c.height/720};}
async function handPoint(){return point(await page.evaluate(()=>G.scenes.combat.getHandLayoutBoxes(G.main.getState())[0]),true);}
async function hover(p,delay=1350){await page.mouse.move(p.x,p.y);await page.waitForTimeout(delay);}
async function hold(p){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await page.waitForTimeout(180);(report.holds??=[]).push(await page.evaluate(p=>({point:p,width:innerWidth,height:innerHeight,paused:G.main.isPaused(),open:G.contextHelp?.isOpen(),mobile:document.querySelector('#mobile-read')?.open,pointer:G.main.getPointer(),text:document.querySelector('#context-help-touch')?.innerText}),p));}
async function bounds(selector){return page.locator(selector).evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,viewport:[innerWidth,innerHeight],scroll:n.scrollWidth,client:n.clientWidth};}));}
function fits(boxes){assert.ok(boxes.length);assert.ok(boxes.every(b=>b.left>=0&&b.top>=0&&b.right<=b.viewport[0]+1&&b.bottom<=b.viewport[1]+1&&b.scroll<=b.client+1),JSON.stringify(boxes));}
try{
  let context=await init(false);await fixture('combat',true);await hover(await handPoint());await shot('desktop-before-cost');
  assert.ok(await page.evaluate(()=>G.main.getState().combat.inspectCardId));assert.equal(await page.evaluate(()=>!!G.contextHelp),false);await context.close();

  context=await init();await fixture('combat',true);const before=await snapshot(),hp=await handPoint();
  await hover(hp,600);await page.mouse.move(5,5);await page.waitForTimeout(350);assert.equal(await page.locator('#context-help').isVisible(),false);assert.equal(await page.evaluate(()=>G.main.isPaused()),false,'Leaving an unlocked reader cancels its lock timer');
  await hover(hp,600);assert.ok(await page.locator('#context-help').isVisible());assert.equal(await page.evaluate(()=>G.main.isPaused()),false,'Showing and locking have separate delays');
  await page.waitForTimeout(750);assert.equal(await page.evaluate(()=>G.main.isPaused()),true);
  assert.equal(await page.evaluate(()=>G.main.getState().combat.inspectCardId||null),null,'No duplicate Canvas inspector');
  await shot('desktop-cost');
  await page.locator('#context-help > .help-panel .help-term').filter({hasText:'临时费用'}).click();
  assert.match(await page.locator('.help-detail').innerText(),/原费 1 → 当前 0/);await shot('desktop-cost-source');
  await page.locator('.help-detail .help-term').filter({hasText:'军靴'}).hover();await page.waitForTimeout(350);
  assert.match(await page.locator('.help-detail').innerText(),/第 4、8、12/);await shot('desktop-boots-chain');
  await page.keyboard.press('Escape');assert.match(await page.locator('.help-detail').innerText(),/原费 1 → 当前 0/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.help-detail').count(),0);assert.ok(await page.locator('#context-help').isVisible());
  assert.deepEqual(await snapshot(),before,'Nested reading preserves every card, resource and discount');fits(await bounds('#context-help .help-panel'));
  await page.mouse.click(hp.x,hp.y);await page.waitForTimeout(200);
  assert.equal(await page.locator('#context-help').isVisible(),false);assert.ok(await page.evaluate(()=>G.main.getState().combat.selectedCardId),'A canvas card click closes reading and still selects the card');
  await page.keyboard.press('Escape');await page.waitForTimeout(150);
  // Real drag after reading: no inspection during an action and exactly one card paid/played.
  const h2=await handPoint(),enemy=await point(await page.evaluate(()=>G.scenes.combat.getEnemyLayoutBoxes(G.main.getState())[0]));
  const count=await page.evaluate(()=>G.main.getState().combat.playedCards.length);
  await page.mouse.move(h2.x,h2.y);await page.mouse.down();await page.mouse.move(enemy.x,enemy.y,{steps:14});await page.waitForTimeout(550);
  assert.equal(await page.locator('#context-help').isVisible(),false);await page.mouse.up();
  await page.waitForFunction(n=>G.main.getState().combat.playedCards.length===n+1,count);await page.waitForFunction(()=>!G.scenes.combat.feedback.isBusy());
  report.checks.push('Desktop: separate show/lock, source → temporary cost → boots, Esc returns one level, immutable reading, click selects and drag plays exactly once.');

  await fixture();const enemyTarget=await point(await page.evaluate(()=>G.scenes.combat.getEnemyLayoutBoxes(G.main.getState())[0]));await hover(enemyTarget);
  const intent=await page.evaluate(()=>G.render.woodcut.enemyIntent(G.main.getState().combat.enemies[0]).title);assert.ok((await page.locator('#context-help').innerText()).includes(intent.replace(/\s+/g,' ')));
  await page.locator('#context-help > .help-panel .help-term').filter({hasText:'迷眼'}).click();assert.match(await page.locator('.help-detail').innerText(),/行动后清除/);await shot('desktop-enemy');
  fits(await bounds('#context-help .help-panel'));await page.keyboard.press('Escape');await page.keyboard.press('Escape');

  await fixture('shop');const shopBefore=await snapshot();const shopPoint=await point(await page.evaluate(()=>G.scenes.shop.getCardBoxes(G.scenes.shop.getLayout())[0]));
  await hover(shopPoint);assert.match(await page.locator('#context-help').innerText(),/价钱 .* 大洋/);await shot('desktop-shop');
  assert.deepEqual(await snapshot(),shopBefore,'Reading is not a purchase or selection');
  await page.mouse.click(shopPoint.x,shopPoint.y);await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>G.main.getState().shop.purchaseSelection));
  const payment=await page.evaluate(()=>{const s=G.main.getState(),q=s.shop.purchaseSelection,o=s.shop.cardOffers[q.index];return {price:o.price,gold:s.player.gold,deck:s.player.masterDeckNames.length};});
  const confirm=await point(await page.evaluate(()=>G.scenes.shop.getLayout().removeConfirm));await page.mouse.click(confirm.x,confirm.y);
  await page.waitForFunction(g=>G.main.getState().player.gold<g,payment.gold);const paid=await snapshot();assert.equal(paid.gold,payment.gold-payment.price);assert.equal(paid.deck.length,payment.deck+1);
  report.checks.push('Shop: hover leaves selection/gold/deck unchanged; existing select/confirm still buys exactly one item at its actual price.');await context.close();

  // Baseline and new touch reader use the same source scene and real Android touch adapter.
  context=await init(false,true,{width:854,height:393});await fixture('combat',true);await hold(await handPoint());await page.locator('#mobile-read').waitFor({state:'visible'});await shot('touch-before-cost');await context.close();
  for(const viewport of [{width:854,height:393},{width:640,height:360},{width:960,height:540}]){
    context=await init(true,true,viewport);await fixture('combat',true);const original=await snapshot();
    await hold(await handPoint());await page.locator('#context-help-touch').waitFor({state:'visible'});assert.equal(await page.locator('#mobile-read').isVisible(),false);
    await page.locator('#context-help-touch .help-term').filter({hasText:'临时费用'}).tap();assert.match(await page.locator('#context-help-touch').innerText(),/原费 1 → 当前 0/);
    await page.locator('#context-help-touch .help-term').filter({hasText:'军靴'}).tap();await shot('touch-'+viewport.width+'-boots');
    assert.equal(await page.evaluate(()=>KGameAndroid.back()),true);assert.match(await page.locator('#context-help-touch').innerText(),/原费 1 → 当前 0/);
    await page.locator('#context-help-touch .help-back').tap();assert.match(await page.locator('#context-help-touch').innerText(),/体力 0/);await shot('touch-'+viewport.width+'-cost');
    fits(await bounds('#context-help-touch .help-panel'));assert.deepEqual(await snapshot(),original);
    await page.locator('#context-help-touch .help-close').tap();assert.equal(await page.evaluate(()=>G.main.isPaused()),false);
    await fixture();await hold(await point(await page.evaluate(()=>G.scenes.combat.getEnemyLayoutBoxes(G.main.getState())[0])));
    await page.locator('#context-help-touch .help-term').filter({hasText:'溃烂'}).tap();
    await page.locator('#context-help-touch .help-term').filter({hasText:'架势'}).tap();assert.match(await page.locator('#context-help-touch').innerText(),/下回合开始时清零/);
    await shot('touch-'+viewport.width+'-concept');await page.locator('#context-help-touch .help-close').tap();
    await fixture('shop');const stock=await snapshot();await hold(await point(await page.evaluate(()=>G.scenes.shop.getCardBoxes(G.scenes.shop.getLayout())[0])));
    await page.locator('#context-help-touch').waitFor({state:'visible'});assert.match(await page.locator('#context-help-touch').innerText(),/价钱/);assert.deepEqual(await snapshot(),stock,'Shop long-press is not a purchase');
    await shot('touch-'+viewport.width+'-shop');fits(await bounds('#context-help-touch .help-panel'));
    await page.evaluate(()=>KGameAndroid.pause());assert.equal(await page.locator('#context-help-touch').isVisible(),false);assert.equal(await page.evaluate(()=>G.main.isPaused()),true);
    await context.close();report.checks.push('Touch '+viewport.width+'×'+viewport.height+': real hold, cost/source chain, native-back layer semantics, nested battle concepts, no resource/shop mutation, fitting reader and interruption cleanup.');
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
  // Runnable scene examples use the exact captured fixture functions and live
  // source, plus an isolated save namespace. No media copies or fake UI.
  const entry=await fs.readFile('play.html','utf8');
  for(const example of ['battle','cost','shop'])for(const phone of [false,true]){
    const name=example+'-'+(phone?'touch-frame':'pc')+'.html';
    const setup=`window.addEventListener('load',()=>{(${installFrontendFixture})({scene:${JSON.stringify(example==='shop'?'shop':'combat')},o:{style:'dirty',reduced:true,gold:180}});${example==='shop'?'':`(${installReadingCombat})(${example==='cost'});`}});`;
    const html=entry.replace('<head>','<head><base href="../../../">').replace('</head>',(phone?'<script>window.KGAME_MOBILE=true;</script><link rel="stylesheet" href="android/mobile.css">':'')+'</head>').replace('</body>',(phone?'<script src="android/mobile.js"></script>':'')+'<script>'+setup+'</script></body>');
    await fs.writeFile(path.join(out,name),html);
    if(phone)await fs.writeFile(path.join(out,example+'-touch.html'),`<!doctype html><meta charset="utf-8"><title>手机细读试用</title><style>body{margin:0;background:#101515;color:#d8c9b1;font:17px serif;display:grid;place-content:center;min-height:100vh}p{max-width:854px;line-height:1.7}iframe{width:min(854px,96vw);aspect-ratio:854/393;border:1px solid #76664d}</style><p>手机触控布局 · 长按招式、敌人或商品；点词条继续查看，返回退一层。<br>电脑可用浏览器设备模拟触摸；下方为固定横屏视口。</p><iframe src="${name}?reading=trial" title="手机细读试用"></iframe>`);
  }
  const sections=[['临时费用','desktop-before-cost.png','desktop-cost-source.png','cost'],['敌人词条',null,'desktop-enemy.png','battle'],['商店商品',null,'desktop-shop.png','shop'],['手机阅读','touch-before-cost.png','touch-854-cost.png',null],['手机逐层查询',null,'touch-854-concept.png',null]];
  await fs.writeFile(path.join(out,'review.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>说明交互 · 首轮试用</title><style>body{margin:0;background:#101515;color:#dfd1b9;font:17px/1.75 'Microsoft Yahei',sans-serif}main{max-width:1200px;margin:40px auto;padding:0 22px}h1{font-size:30px}h2{font-size:23px;margin:42px 0 16px}p{color:#bdaf98}a{color:#d7bd8d;margin-right:22px}img{width:100%;display:block;border:1px solid #5e5646}figure{margin:16px 0 30px}figcaption{color:#ad9d83;padding:8px 0;font-size:14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}@media(max-width:850px){.pair{display:block}}small{color:#aa9b83}</style><main><h1>说明交互 · 首轮试用</h1><p>鼠标停留约半秒出现，继续停留锁定，也可直接点“锁定”。词条可继续查询；Esc 先退一层。手机长按后逐层查看，点“返回”退一层。</p><p>仅战斗、临时费用和黑市商品接入试用。暗底说明沿用现有字体与词条色，卡面保留黄纸。数值、出牌、购买规则未改。</p><small>以下为同一源码、同一明确夹具的真实截图。旧版为未启用试用参数的现行界面。试用局与正式存档隔离，当前 APK／EXE 未替换。</small>${sections.map(([title,before,after,key])=>`<h2>${title}</h2>${key?`<p><a href="${key}-pc.html?reading=trial">进入实际试用</a><a href="${key}-touch.html">查看触控布局</a></p>`:''}${before?`<div class="pair"><figure><img src="${before}" alt="原有细读"><figcaption>原有细读 · 相同夹具</figcaption></figure><figure><img src="${after}" alt="试用效果"><figcaption>试用效果</figcaption></figure></div>`:`<figure><img src="${after}" alt="${title}试用效果"></figure>`}`).join('')}<p>已验证真实鼠标、三种横屏尺寸的 CDP 触摸、逐层返回、长按松手防误触、出牌和购买。实体手机与真人观感仍待后续反馈。</p></main></html>`);
}catch(e){report.failure=e.stack;process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({out,passed:report.passed,failure:report.failure,checks:report.checks.length}));
