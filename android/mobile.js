/* Contextual touch inspection. Tap/drag remain the same game actions. */
(function () {
  'use strict';
  const canvas=document.getElementById('game-canvas'),read=document.createElement('dialog');read.id='mobile-read';document.body.append(read);
  let wasPaused=false,hold=null,quickRead=null,closing=false,readOrigin=null,departure=null;
  const s=()=>G.main.getState();
  const escape=()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
  function closeRead(immediate=false){
    if(!read.open||closing)return;closing=true;
    const finish=()=>{read.close();read.classList.remove('read-depart');closing=false;departure=null;G.main.setPaused(wasPaused);G.audio.playUiCue('return');};
    if(immediate||G.render.journeyMotion.disabled()){finish();return;}
    read.classList.add('read-depart');departure=setTimeout(finish,160);
  }
  read.addEventListener('cancel',e=>{e.preventDefault();closeRead();});
  read.addEventListener('contextmenu',e=>e.preventDefault());
  function line(title,text){const row=document.createElement('article');row.className='read-row';const h=document.createElement('h2'),p=document.createElement('p');h.textContent=title;p.textContent=text;row.append(h,p);read.append(row);}
  function enemyPreparation(enemy){return G.nemesis.getAdaptationMeta(enemy.currentAdaptation,enemy.nemesisLevel);}
  function inspect(target){
    if(read.open)return;
    const state=s();wasPaused=G.main.isPaused();G.main.setPaused(true);read.replaceChildren();
    const header=document.createElement('header'),heading=document.createElement('h2'),done=document.createElement('button');heading.textContent=target.heading||(target.card?'招式详情':'对手详情');done.textContent=state.scene==='combat'?'返回交锋':'返回原处';done.onclick=()=>closeRead();header.append(heading,done);read.append(header);
    if(target.previewCard){const preview=document.createElement('canvas');preview.className='read-card';preview.width=264;preview.height=390;G.render.journeyBook.card(preview.getContext('2d'),target.previewCard,{x:8,y:8,width:248,height:374});read.append(preview);}
    if(target.rows)target.rows.forEach(r=>line(r.title,r.text));
    else if(target.card){const c=target.card,t=G.cards.getCardByName(c.name)||c;line(c.name+' · 体力 '+(c.cost??t.cost)+(c.playable?'':' · 暂不可出'),t.text||c.text||'');}
    else {const e=target.enemy,intent=G.render.woodcut.enemyIntent(e),preparation=enemyPreparation(e);line(e.name+' · 气血 '+e.hp+'/'+e.maxHp,[intent.title,intent.note].filter(Boolean).join(' · '));line('架势 '+(e.block||0),G.scenes.combat.getEnemyStatusChips(e,false).map(c=>c.text).join(' · ')||'无额外状态');if(preparation)line('对手的准备',preparation.name+'：'+preparation.description);}
    if(state.scene==='combat')line('气血 '+state.player.hp+'/'+state.player.maxHp+' · 架势 '+state.player.block+' · 体力 '+state.player.energy,'点牌后点目标出招；再点同一张牌或按手机返回键取消。长按手牌或对手查看详情。');
    else {const footer=document.createElement('footer');footer.textContent='气血 '+state.player.hp+'/'+state.player.maxHp+' · 大洋 '+state.player.gold+'　｜　返回后再作选择';read.append(footer);}
    read.classList.toggle('has-card',!!target.previewCard);read.classList.remove('read-depart');read.showModal();
    G.audio.playUiCue('open');
    const b=read.getBoundingClientRect(),origin=readOrigin||{x:innerWidth/2,y:innerHeight/2};read.style.setProperty('--read-x',Math.max(-60,Math.min(60,(origin.x-b.x-b.width/2)*.18))+'px');read.style.setProperty('--read-y',Math.max(-35,Math.min(35,(origin.y-b.y-b.height/2)*.18))+'px');
    done.focus({preventScroll:true});
  }
  function cancelHold(){if(hold)clearTimeout(hold.timer);hold=null;}
  function inside(p,b){return p.x>=(b.hitX??b.x)&&p.x<=(b.hitX??b.x)+(b.hitWidth??b.width)&&p.y>=(b.hitY??b.y)&&p.y<=(b.hitY??b.y)+(b.hitHeight??b.height);}
  function combatReadTarget(state,point){
    const L=G.scenes.combat.debugGetLayout(),row=(title,text)=>({title,text});
    if(L.combatDetails&&inside(point,L.combatDetails)){
      const rows=[row('玩家状态',G.scenes.combat.getPlayerStatusChips(state,state.player).map(c=>c.text).join(' · ')||'无额外状态')];
      if(state.combat.lastAction)rows.push(row('最近行动',state.combat.lastAction));
      state.combat.enemies.filter(e=>e.hp>0).forEach(e=>{const intent=G.render.woodcut.enemyIntent(e),preparation=enemyPreparation(e);rows.push(row(e.name+' · 气血 '+e.hp+'/'+e.maxHp+' · 架势 '+(e.block||0),[intent.title,intent.note,preparation?preparation.name+'：'+preparation.description:'',...G.scenes.combat.getEnemyStatusChips(e,false).map(c=>c.text)].filter(Boolean).join(' · ')));});
      const relics=(state.player.relics||[]).map(r=>typeof r==='string'?G.relics.definitions[r]:r).filter(Boolean);
      rows.push(...(relics.length?relics.map(r=>row('旧物 · '+r.name,r.description||r.text||'')):[row('随身旧物','目前没有旧物。')]));
      return {heading:'战况与旧物',rows};
    }
    for(const [key,label,names] of [['drawPile','抽牌堆',state.combat.drawPileNames],['discardPile','弃牌堆',state.combat.discardPileNames]]){
      if(inside(point,L[key])){
        const groups=new Map();(names||[]).forEach(name=>groups.set(name,(groups.get(name)||0)+1));
        const rows=groups.size?[...groups].map(([name,count])=>row(name+' × '+count,G.cards.getCardByName(name)?.text||'')):[row(label,'目前为空。')];
        if(key==='drawPile'&&names?.length)rows.unshift(row('抽牌顺序 · 下一张到堆底',names.join(' → ')));
        if(key==='discardPile')rows.unshift(row('重新抽取','本回合打出的招式，下回合起才能重新抽到。'));
        return {heading:label+' · '+(names||[]).length+' 张',rows};
      }
    }
    return null;
  }
  function journeyTarget(state,point){
    const row=(title,text)=>({title,text}),details=(heading,rows)=>({heading,rows});
    const cardRow=c=>row(c.name+' · 体力 '+c.cost,c.text||G.cards.getCardByName(c.name)?.text||'');
    if(state.reviewPanel){const rows=G.render.journeyBook.groups(state.player.masterDeckNames);return details('行囊招录',rows.map(r=>row(r.name+' · '+r.count+' 张',r.card?.text||'')));}
    if(state.scene==='reward'){
      if(state.reviewReceipt)return details(state.reviewReceipt.title,state.reviewReceipt.lines.map(t=>row('此战所得',t)));
      const r=state.reward,options=r.options.map((o,i)=>({o,b:G.render.realisticJourney.cardBox(r,i)})),hit=options.find(v=>inside(point,v.b));
      const rows=(hit?[hit]:options).map(({o})=>row(o.name+(r.mode==='card'?' · 体力 '+o.cost:''),o.text||o.description||''));
      if(!hit&&['gate','elite','nemesis'].includes(r.sourceNodeType||state.combat.nodeType))rows.unshift(row('这一战',r.entryVictorySubtitle||G.nemesis.getVictoryCopy(state.combat.nodeType,state).subtitle));
      return details('战后拾遗',rows);
    }
    if(state.scene==='shop'){
      const s=state.shop,L=G.scenes.shop.getLayout();let goods=[];
      if(s.mode==='remove'){
        const boxes=G.scenes.shop.getRemoveBoxes(s.deckEntries,L,s.removePage),hit=boxes.find(b=>inside(point,b));const chosen=s.deckEntries.find(e=>e.index===(s.removeSelectedIndex??hit?.index));
        return details('撤去招式',[row('撤招费 '+s.removeCost+' 大洋','至少留下一张；本页细读不会撤去招式。'),...(chosen?[row('第 '+(chosen.index+1)+' 张 · '+chosen.name,chosen.text)]:s.deckEntries.map(e=>row('第 '+(e.index+1)+' 张 · '+e.name,e.text)))]);
      }
      const selected=s.purchaseSelection;
      if(selected)goods=[(selected.type==='relic'?s.relicOffers:s.cardOffers)[selected.index]];
      else {for(const [list,boxes] of [[s.cardOffers,G.scenes.shop.getCardBoxes(L)],[s.relicOffers,G.scenes.shop.getRelicBoxes(L)]]){const i=boxes.findIndex(b=>inside(point,b));if(i>=0)goods.push(list[i]);}if(!goods.length)goods=[...s.cardOffers,...s.relicOffers];}
      return {...details('黑市商品',goods.map(o=>row(o.name+' · '+(o.sold?'已售出':o.price+' 大洋'),o.text||o.description||''))),previewCard:goods.length===1&&G.cards.getCardByName(goods[0].name)?goods[0]:null};
    }
    if(state.scene==='event'){const e=state.event;return details(e.title,[row('沿途见闻',e.body),...(e.mode==='choice'?e.choices.map(c=>row(c.label,G.events.getChoicePreview(state,c.id))):[row(e.selectedChoiceLabel,e.resultText),row('所得与代价',(e.resultSummary||[]).join(' · '))])]);}
    if(state.scene==='rest'){
      const r=state.rest;if(state.reviewReceipt)return details(state.reviewReceipt.title,state.reviewReceipt.lines.map(t=>row('歇脚所得',t)));
      if(r.mode==='upgrade'){const boxes=G.render.realisticJourney.upgradeBoxes(state),hit=boxes.find(b=>inside(point,b)),entry=r.deckEntries[r.reviewUpgradeIndex]||hit?.entry;
        const entries=entry?[entry]:boxes.map(b=>b.entry);return details('精进比较',entries.flatMap(e=>{const next=G.cards.getCardByName(G.cards.upgradeDeckCardAt([e.name],0).upgradedName);return [cardRow(e),row(next.name+' · 精进后',next.text)];}));}
      return details('破庙暂歇',[row('温酒裹伤','恢复 '+Math.min(r.healAmount,state.player.maxHp-state.player.hp)+' 气血：'+state.player.hp+' → '+Math.min(state.player.maxHp,state.player.hp+r.healAmount)+'/'+state.player.maxHp),row('残灯练招','精进一张招式，此次不疗伤。可先查看原式与精进后的效果。')]);
    }
    if(state.scene==='map'){
      const m=state.map,hit=m.nodes.find(n=>Math.hypot(n.x-point.x,n.y-point.y)<48),nodes=hit?[hit]:m.nodes.filter(n=>m.reachableNodeIds.includes(n.id));
      const names={street:'街头交锋',elite:'强敌截杀',gate:'本卷关底',rest:'破庙歇脚',shop:'暗巷黑市',event:'途中奇遇',nemesis:'宿敌寻仇'},notes={street:'胜后获得大洋与招式。',elite:'强敌拦路，胜后另有旧物。',gate:m.actNumber===5?'突破此关，完成五卷。':'突破此关，进入下一卷。',rest:'疗伤或精进一次。',shop:'购买招式、旧物，或付费撤去旧招。',event:'先读清代价，再作选择。',nemesis:'旧敌记着你的招式，带着新的准备寻仇。'};
      return details(m.actTitle,[row('此行任务',G.journeyNarrative.stage(state)),...nodes.map(n=>{const enemy=n.type==='nemesis'?G.nemesis.getEntryById(state,n.nemesisEntryId):null;return row(names[n.type]+' · '+(m.reachableNodeIds.includes(n.id)?'可前往':'尚不可达'),notes[n.type]+(enemy?' '+enemy.name+' · '+enemy.level+' 阶 · '+G.nemesis.getFirearmLabel(enemy.firearmStage):''));})]);
    }
    if(state.scene==='nemesis'){const n=state.nemesisIntro;return details(n.name+' · '+n.level+' 阶',[row('这次的准备',n.adaptation?n.adaptation.name+'：'+n.adaptation.description:n.note),row('旧仇来由',n.revengeLine),row(n.firearmLabel,(n.firearmThreat?.steps||[]).join(' → ')+'\n'+(n.firearmThreat?.summary||''))]);}
    if(state.scene==='title'&&state.runReport?.active)return details(state.runReport.title,[...state.runReport.summaryRows.map(r=>row(r.label,r.value)),...state.runReport.detailLines.map(t=>row('此行记载',t))]);
    return null;
  }
  canvas.addEventListener('pointerdown',e=>{
    readOrigin={x:e.clientX,y:e.clientY};
    cancelHold();quickRead=null;if(e.pointerType!=='touch'||G.main.isPaused()||!G.render.journeyMotion?.acceptsInput()||G.scenes.combat.feedback.isBusy())return;
    const state=s();if(state.scene==='combat'&&state.combat.result!=='active')return;
    const rect=canvas.getBoundingClientRect(),point={x:(e.clientX-rect.left)*1280/rect.width,y:(e.clientY-rect.top)*720/rect.height};
    let target;
    if(state.scene==='combat'){
      const detail=combatReadTarget(state,point);
      if(detail){quickRead={id:e.pointerId,x:e.clientX,y:e.clientY,target:detail};return;}
    }
    if(state.scene==='combat'){const cardBox=G.scenes.combat.getHandLayoutBoxes(state).filter(b=>inside(point,b)).at(-1),enemyBox=G.scenes.combat.getEnemyLayoutBoxes(state).find(b=>b.enemy.hp>0&&inside(point,b));target=cardBox?{card:state.combat.hand.find(c=>c.id===cardBox.cardId)}:enemyBox?{enemy:enemyBox.enemy}:null;}
    else target=journeyTarget(state,point);
    if(!target)return;
    hold={id:e.pointerId,x:e.clientX,y:e.clientY,timer:setTimeout(()=>{hold=null;inspect(target);},460)};
  });
  canvas.addEventListener('pointermove',e=>{if(hold&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>8)cancelHold();if(quickRead&&Math.hypot(e.clientX-quickRead.x,e.clientY-quickRead.y)>8)quickRead=null;});
  canvas.addEventListener('pointerup',e=>{const q=quickRead;quickRead=null;if(q&&q.id===e.pointerId&&!G.main.isPaused()&&!G.scenes.combat.feedback.isBusy())inspect(q.target);});
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{quickRead=null;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,cancelHold);
  function save(){const state=s();if(state.scene!=='title'&&!(state.scene==='combat'&&state.combat.result==='defeat')&&!state.map?.completed)G.storage.saveRun(state);}
  window.KGameAndroid={
    pause(){cancelHold();if(closing){clearTimeout(departure);closing=false;closeRead(true);}save();if(!read.open&&!document.getElementById('journey-dialog').open&&!document.getElementById('open-pause').hidden)document.getElementById('open-pause').click();G.main.setPaused(true);},
    resume(){G.main.setPaused(read.open||document.getElementById('journey-dialog').open);},
    back(){
      save();if(read.open){closeRead();return true;}
      const dialog=document.getElementById('journey-dialog');if(dialog.open){dialog.dispatchEvent(new Event('cancel',{cancelable:true}));return true;}
      const state=s();if(state.scene==='combat'&&(G.render.animations.getCardDrag('combat')||state.combat.selectedCardId||state.combat.inspectCardId||state.combat.ui?.overlay?.visible)){escape();return true;}
      if(state.scene==='shop'){
        if(state.shop.purchaseSelection||Number.isInteger(state.shop.removeSelectedIndex)){escape();return true;}
        if(state.shop.mode==='remove'){state.shop.mode='browse';G.main.replaceState(state);return true;}
      }
      if(state.reviewPanel||(state.scene==='reward'&&Number.isInteger(state.reward?.reviewSelectedIndex))||(state.scene==='rest'&&(state.rest?.reviewChoice||state.rest?.mode==='upgrade'))){escape();return true;}
      if(state.scene==='map'&&state.map.previewNodeId){state.map.previewNodeId=null;G.main.replaceState(state);return true;}
      if(!document.getElementById('open-pause').hidden){document.getElementById('open-pause').click();return true;}
      const back=document.querySelector('#entry-ui .entry-back');if(back){back.click();return true;}return false;
    }
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)KGameAndroid.pause();});
})();
