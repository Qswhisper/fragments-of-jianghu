/* Contextual pause hierarchy; no persistent bottom toolbar. */
(function () {
  'use strict';
  const dialog=document.getElementById('journey-dialog'),content=document.getElementById('dialog-content'),title=document.getElementById('dialog-title');
  const trigger=document.getElementById('open-pause'),back=document.getElementById('back-dialog');
  const state=()=>G.main.getState(),styleName=id=>G.scenes.title.prepareState(state()).title.options.find(o=>o.id===id)?.name||id;
  let parent=null,contentAnimation=null;
  function element(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
  function paragraph(text,parentNode=content,mechanics=false){const p=element('p',text);if(mechanics)G.render.ui.appendMechanicText(p,text);parentNode.append(p);}
  function grid(){const g=element('div',undefined,'dialog-grid');content.append(g);return g;}
  function entry(parentNode,name,meta,lines){const e=element('article',undefined,'entry');e.append(element('h2',name),element('div',meta,'meta'));lines.forEach(line=>paragraph(line,e));parentNode.append(e);}
  function close(keepRemove){contentAnimation?.cancel();contentAnimation=null;if(dialog.dataset.panel==='removeDeck'&&keepRemove!==true){const next=state();if(next.scene==='shop'){next.shop.mode='browse';next.shop.removeSelectedIndex=null;G.main.replaceState(next);}}G.render.journeyMotion?.closeDialog(dialog);dialog.close();G.main.setPaused(false);G.audio.playUiCue('return');syncUI();document.getElementById('game-canvas').focus();}
  function open(name,render,origin=null){
    const wasOpen=dialog.open;contentAnimation?.cancel();contentAnimation=null;
    G.main.setPaused(true,{keepMusic:true});parent=origin;title.textContent=name;content.replaceChildren();dialog.classList.toggle('pause-root',render===pauseMenu);dialog.dataset.panel=render.name;back.hidden=!origin;
    render(state());if(!dialog.open)dialog.showModal();dialog.scrollTop=0;content.scrollTop=0;G.audio.playUiCue('open');syncUI();
    const focusTarget=render===pauseMenu?document.getElementById('resume-journey'):origin?back:content.querySelector('input,select,button')||document.getElementById('close-dialog');focusTarget.focus({preventScroll:true});
    if(wasOpen&&!G.render.journeyMotion?.disabled()){const a=content.animate([{opacity:.35,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:150,easing:'cubic-bezier(.2,.8,.25,1)'});contentAnimation=a;a.finished.catch(()=>{}).finally(()=>{if(contentAnimation===a)contentAnimation=null;});}
  }
  function returnUp(){if(parent==='pause')open('菜单',pauseMenu);else close();}
  dialog.addEventListener('close',()=>{if(!dialog.open){parent=null;if(G.main.isPaused())G.main.setPaused(false);syncUI();}});
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();returnUp();}});
  dialog.addEventListener('cancel',e=>{e.preventDefault();returnUp();});
  back.onclick=returnUp;document.getElementById('close-dialog').onclick=close;
  function route(s){
    paragraph(G.journeyNarrative.task(s));
    paragraph(G.journeyNarrative.purpose(s));
    paragraph(G.journeyNarrative.preparation);
    const facts=G.journeyNarrative.progressSummary(s);paragraph(facts.length?'已落实：'+facts.join(' → '):'此案尚未取回原件。');
    const people=G.eventConsequences?.notes(s)||[];if(people.length){paragraph('沿路的人与事');people.forEach(line=>paragraph(line));}
    const battles=s.campaign?.battles||[],history=s.map?.routeHistory||[];
    paragraph(styleName(s.player.chosenStyle)+' · '+history.length+' 个节点 · '+battles.length+' 场交锋');
    const g=grid();g.classList.add('route-chapters');
    for(let act=1;act<=5;act++){
      const nodes=history.filter(n=>n.act===act),fights=battles.filter(b=>b.act===act);
      const currentAct=s.map?.actNumber||s.combat?.actNumber||1;
      entry(g,G.enemies.getActMeta(act).title,s.map?.clearedActs?.includes(act)?'已破关':currentAct===act?'当前卷':'尚未抵达',[
        G.journeyNarrative.stage(s,act),
        ...(s.map?.clearedActs?.includes(act)?[G.journeyNarrative.transition(s,act)]:[]),
        nodes.length?nodes.map(n=>n.label).join(' → '):currentAct===act?'正在本卷行进。':'尚未抵达。',
        ...fights.map(b=>b.name+' · '+(b.result==='victory'?'得胜':'败退')+' · '+b.turns+' 回合 · 余血 '+b.hp)
      ]);
    }
  }
  function cardCanvas(name){const canvas=G.render.canvasUtils.createLayer(300,444,Math.min(2,window.devicePixelRatio||1));canvas.setAttribute('aria-hidden','true');canvas.dataset.bookCard=name;paintBookCard(canvas);return canvas;}
  let removeScroll=0,removePending=false;
  function removeDeck(s){
    const summary=element('p','撤招费 '+s.shop.removeCost+' 大洋 · 现有 '+s.player.gold+' 大洋 · 每次撤去 1 张','remove-summary');content.append(summary);
    const shelf=element('div',undefined,'remove-shelf');content.append(shelf);
    s.shop.deckEntries.forEach(entry=>{
      const button=element('button',undefined,'book-card remove-card');button.type='button';button.dataset.deckIndex=entry.index;
      button.setAttribute('aria-label','第 '+(entry.index+1)+' 张 '+entry.name+'，'+(entry.text||''));
      button.append(cardCanvas(entry.name),element('span','第 '+(entry.index+1)+' 张','remove-card-number'));
      button.onclick=()=>{removeScroll=content.scrollTop;const next=state();next.shop.removeSelectedIndex=entry.index;close(true);G.main.replaceState(next);};shelf.append(button);
    });
  }
  function openRemoveDeck(){open('撤去招式',removeDeck);content.scrollTop=removeScroll;}
  function requestRemoveDeck(s){
    if(s.scene==='shop'&&s.shop?.mode==='remove'&&!Number.isInteger(s.shop.removeSelectedIndex)&&!removePending&&!dialog.open){
      removePending=true;requestAnimationFrame(()=>{removePending=false;const current=state();if(current.scene==='shop'&&current.shop.mode==='remove'&&!Number.isInteger(current.shop.removeSelectedIndex)&&!dialog.open)openRemoveDeck();});
    }
  }
  const shopUpdate=G.scenes.shop.update;
  G.scenes.shop.update=function(s,input){
    const next=shopUpdate(s,input);
    if(s.shop?.mode!=='remove'&&next.shop?.mode==='remove')removeScroll=0;
    requestRemoveDeck(next);
    return next;
  };
  function deck(s){
    const names=s.player.masterDeckNames||[],rows=G.render.journeyBook.groups(names);
    const summary=element('div',undefined,'book-summary');summary.append(element('span',names.length+' 张招式 · '+rows.length+' 式'),element('span','点选卡牌细读'));content.append(summary);
    const prep=G.journeyPreparation,shuffled=!!G.buildProgression?.active(s);
    if(prep&&s.scene!=='title'){
      const section=element('section',undefined,'opening-preparation'),name=prep.preparedName(s),locked=s.player.openingPreparation?.act===prep.act(s);
      paragraph('第 '+prep.act(s)+' 卷起手：'+(name?'【'+name+'】每战入手。':locked?'所定招式已移除，整备失效。':prep.canPrepare(s)?'尚未指定。选一式点「整备此式」，本卷免费定一次。':'尚未指定。战斗结束后可在战外整备，本卷免费定一次。'),section);
      if(locked)paragraph(s.player.openingPreparation.changed?(shuffled?'本卷换练已用；旧整备随牌组洗入。':'本卷换练已用；旧整备回到原牌序。'):'整备后新获得的招式，可花 '+prep.changeCost+' 大洋换练，每卷一次。点选新招查看起手变化。',section);
      if(prep.canDraft(s)){
        const toggle=element('button',s.reward.basicDraftAct?'改回随机招式':'改选本门补招');toggle.id='use-basic-draft';toggle.type='button';
        toggle.onclick=()=>{G.main.replaceState(prep.useBasics(state(),!state().reward.basicDraftAct));close();};section.append(toggle);
      }
      const rules=element('details');rules.append(element('summary','整备与补招规则'));
      paragraph(shuffled?'入城初战保留原起手，此后每战洗牌。战外可整备一式，保证本卷每战入手；另四张照常抽取。不增加手牌、体力或牌数；精进沿用此式，移除最后一张后失效。':'战外从已拥有招式中整备一式，本卷每战进入五张起手。不增加手牌、体力或牌数，其余牌序不变；精进沿用此式，移除最后一张后失效。',rules);
      paragraph('定式后新得招式可换练一次：置办练招药材花 '+prep.changeCost+' 大洋，替换原整备，不增加第二个起手名额。旧招仍在行囊，'+(shuffled?'随其余牌洗入。':'按原牌序抽取。')+'取消不扣钱；跨卷重新获得免费整备与换练机会。',rules);
      paragraph('本门补招每卷限取一式，替代当前的随机选牌。缺哪一手再补，牌组过厚可不取。取消或改回不消耗机会，确认带走时才用掉次数。',rules);section.append(rules);
      content.append(section);
    }
    const book=element('div',undefined,'deck-book'),shelf=element('div',undefined,'card-shelf'),detail=element('aside',undefined,'card-detail');detail.tabIndex=0;detail.setAttribute('aria-label','所选招式详情，可滚动');book.append(shelf,detail);content.append(book);
    function select(row,button){
      shelf.querySelectorAll('button').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});
      detail.replaceChildren(cardCanvas(row.name),element('h2',row.name),element('div','同名 '+row.count+' 张'+(G.cards.isUpgraded(row.name)?' · 已精进':''),'meta'));
      detail.scrollTop=0;
      paragraph(row.card?.text||'',detail,true);
      const rules=element('dl',undefined,'card-rules');G.cards.getRuleNotes(row.card,s).forEach(note=>{rules.append(element('dt',note.title));const description=element('dd');note.lines.forEach(line=>paragraph(line,description,true));rules.append(description);});if(rules.childElementCount)detail.append(rules);
      if(prep?.canPrepare(state())&&s.scene!=='title'){
        const current=state(),prepared=prep.prepare(current,row.name),opening=prep.openingOrder(prepared,names).slice(0,5),already=!shuffled&&names.slice(0,5).includes(row.name);
        paragraph(shuffled?'整备后【'+row.name+'】每战固定入手；另四张每战洗牌抽取。':'整备后五张起手：'+opening.join('、')+'。',detail);
        paragraph(already?'此式已在默认起手中；整备不会改变五张牌的组成，仍会用掉本卷唯一免费机会。':shuffled?'本卷免费定一次；不增加起手张数。之后仅能为新获得的招式付费换练一次。':'本卷免费定一次；其余牌序不变。之后仅能为新获得的招式付费换练一次。',detail);
        const ready=element('button','整备此式','prepare-opening');ready.type='button';ready.dataset.prepareName=row.name;
        const commit=()=>{G.main.replaceState(prep.prepare(state(),row.name));open('招式',deck,parent);};
        ready.onclick=()=>{
          if(!already){commit();return;}
          ready.disabled=true;
          const confirm=element('button','仍然整备（起手组成不变）','prepare-opening');confirm.id='confirm-unchanged-opening';confirm.type='button';confirm.onclick=commit;
          const cancel=element('button','保留整备机会','prepare-opening');cancel.type='button';cancel.onclick=()=>{confirm.remove();cancel.remove();ready.disabled=false;ready.focus();};
          detail.append(confirm,cancel);confirm.focus();
        };detail.append(ready);
      }
      const change=prep?.changeStatus(state(),row.name);
      if(change){
        paragraph('换练前：'+change.before.join('、')+'。',detail);
        paragraph(change.shuffled?'换练后【'+row.name+'】每战固定入手；另四张每战洗牌抽取。':'换练后：'+change.after.join('、')+'。',detail);
        paragraph('花 '+change.cost+' 大洋置办练招药材；替换'+(change.previous?'【'+change.previous+'】':'失效的整备')+'，本卷换练只此一次。当前 '+state().player.gold+' 大洋。',detail);
        const ready=element('button','换练此式 · '+change.cost+' 大洋','prepare-opening');ready.type='button';ready.dataset.changePreparation=row.name;ready.disabled=!change.affordable;
        if(!change.affordable)paragraph('大洋不足，仍保留原整备与换练机会。',detail);
        ready.onclick=()=>{
          ready.hidden=true;
          const exchange=element('p',(change.previous?'【'+change.previous+'】':'失效整备')+' → 【'+row.name+'】；大洋 '+state().player.gold+' → '+(state().player.gold-change.cost)+'。');
          const confirm=element('button','确认换练 · '+change.cost+' 大洋','prepare-opening');confirm.id='confirm-preparation-change';confirm.type='button';
          confirm.onclick=()=>{G.main.replaceState(prep.change(state(),row.name));open('招式',deck,parent);};
          const cancel=element('button','保留原整备','prepare-opening');cancel.id='cancel-preparation-change';cancel.type='button';cancel.onclick=()=>{exchange.remove();confirm.remove();cancel.remove();ready.hidden=false;ready.focus();};
          detail.append(exchange,confirm,cancel);confirm.focus();
        };detail.append(ready);
      }
    }
    rows.forEach((row,i)=>{const b=element('button',undefined,'book-card entry'),accessible=element('span',undefined,'card-accessible-name');b.type='button';b.setAttribute('aria-label',row.name+'，'+row.count+' 张');accessible.append(element('h2',row.name),element('span','× '+row.count+' · 体力 '+(row.card?.cost??'?'),'meta'));paragraph(row.card?.text||'',accessible);b.append(cardCanvas(row.name),accessible,element('span','× '+row.count,'card-count'));b.onclick=()=>select(row,b);shelf.append(b);if(!i)select(row,b);});
    if(!rows.length)paragraph('行囊中暂无招式。',shelf);
    if(s.player.relics?.length){const relics=element('section',undefined,'book-relics');relics.append(element('h2','随身旧物'));paragraph('持有时生效，无需出牌；各件作用与时机见下。',relics);s.player.relics.forEach(id=>{const r=G.relics.getRelicById(id),item=element('article',undefined,'relic-entry'),image=element('img');image.src='assets/ui/shop_relic_'+id+'_gpt15all_01.png';image.alt='';const copy=element('div');copy.append(element('h3',r?.name||id));paragraph(r?.description||'',copy);item.append(image,copy);relics.append(item);});content.append(relics);}
  }
  function paintBookCard(canvas){const name=canvas.dataset.bookCard,ctx=canvas.getContext('2d');ctx.clearRect(0,0,300,444);G.render.journeyBook.card(ctx,G.cards.getCardByName(name)||{name},{x:0,y:0,width:300,height:444});}
  let bookPaintPending=false;
  window.addEventListener('kgame:assetload',()=>{
    // Book canvases are DOM snapshots; the main-canvas redraw cannot refresh them.
    if(!dialog.open||bookPaintPending||!content.querySelector('canvas[data-book-card]'))return;
    bookPaintPending=true;requestAnimationFrame(()=>{bookPaintPending=false;if(dialog.open)content.querySelectorAll('canvas[data-book-card]').forEach(paintBookCard);});
  });
  function starter(s){deck({...s,player:{...s.player,masterDeckNames:G.buildProgression?G.buildProgression.starterDeck(s.title.selectedStyle):G.cards.getStarterDeck(s.title.selectedStyle),relics:[]}});}
  function credits(){
    paragraph('江湖残卷 · 1.0 正式版');
    if(window.KGAME_ART_CREDITS){
      const art=KGAME_ART_CREDITS;paragraph(art.intro);paragraph(art.licenseNote);
      for(const row of art.rows.filter(r=>r.license))paragraph(row.name+'：'+row.license.attribution+' · '+row.license.name);
      const details=element('details');details.append(element('summary','39名敌人 · 历史参考与出处'));
      for(const row of art.rows){const record=element('section');record.append(element('h3',row.name+' — '+row.reference));paragraph(row.period,record);paragraph(row.factionPeriod,record);
        for(const img of row.images){paragraph(img.author+' · '+img.rightsBasis,record);const source=element('a','原图出处');source.href=img.page;source.target='_blank';source.rel='noopener';record.append(source);}
        if(row.license){const license=element('a',row.license.name+' · 完整许可');license.href='assets/art/revision-20261008/'+row.license.local;license.target='_blank';license.rel='noopener';record.append(license);}details.append(record);
      }content.append(details);
    }
    paragraph('Sword Swing — DavidW · OGA BY 4.0');
    paragraph('Additional Sound FX by Will Leamon — Fleshy Fight Sounds · OGA-BY 3.0');
    paragraph('刀风：artisticdude；交锋与拳脚录音：StarNinjas、Independent.nu · CC0。');
    const link=element('a','素材署名与许可');
    // The native host opens this exact offline document in its separate reader.
    link.href='assets/audio/credits.html';link.target='_blank';link.rel='noopener';content.append(link);
    const actions=element('div',undefined,'actions'),done=element('button','返回');done.onclick=returnUp;actions.append(done);content.append(actions);
  }
  function nemesis(s,focusId){
    const pool=G.nemesis.getPoolSnapshot(s).filter(n=>!focusId||n.id===focusId),closed=G.nemesis.getClosedCases(s).filter(n=>!focusId||n.id===focusId),g=element('div',undefined,'nemesis-records');content.append(g);
    pool.forEach(n=>{
      const a=G.nemesis.getAdaptationMeta(n.currentAdaptation,n.level),record=element('article',undefined,'nemesis-record'),portrait=element('img'),body=element('div',undefined,'nemesis-copy');
      const source=G.nemesis.getEntryById(s,n.id);portrait.src=G.render.woodcut.combatPresentation.enemyArt({templateId:source?.sourceTemplateId||n.sourceTemplateId,kind:'nemesis',behavior:'nemesis',firearmStage:n.firearmStage});portrait.alt=n.name;
      body.append(element('span',(n.inheritedIntel&&!n.history.length?'追缉':'旧仇')+' · '+n.level+' 阶','record-stamp'),element('h2',n.name),element('div',n.title+' · '+G.nemesis.getFirearmLabel(n.firearmStage),'meta'));
      paragraph(a?a.name+'：'+a.description:'尚未摸清你的路数。',body);const threat=G.nemesis.getFirearmThreat(n);if(threat.steps.length)paragraph(threat.summary,body);
      const details=element('details',undefined,'enemy-history');details.append(element('summary','查看交锋记忆'));details.open=!!focusId;
      if(n.sourceAttempt)paragraph(n.inheritedIntel?'源自第 '+n.sourceAttempt+' 次入城的追缉报录。':'第 '+n.sourceAttempt+' 次入城时结下的旧仇。',details);
      if(n.inheritedIntel)paragraph('接手报录：'+n.inheritedIntel.fromName+' 已退出追缉，留下「'+(n.inheritedIntel.lastCard||'你的路数')+'」的记载。以下只记继任者亲自交手的经历。',details);
      paragraph(G.nemesis.getRevengeSummary(n),details);paragraph('“'+G.nemesis.getDialogueLine(source)+'”',details);if(threat.steps.length)paragraph(threat.steps.join(' → '),details);
      const history=element('ol',undefined,'memory-history');n.history.forEach(h=>{const row=element('li','收尾招式 '+(h.playerKillCard||'未记招名')+' · '+h.turnsElapsed+' 回合 · 余下 '+Math.round(h.playerHPPercent*100)+'% 气血');if(h.escapeAccount)paragraph(h.escapeAccount,row);history.append(row);});details.append(history);body.append(details);record.append(portrait,body);g.append(record);
    });closed.forEach(n=>{
      const record=element('article',undefined,'nemesis-record'),portrait=element('img'),body=element('div',undefined,'nemesis-copy'),details=element('details',undefined,'enemy-history');
      portrait.src=G.render.woodcut.combatPresentation.enemyArt({templateId:n.sourceTemplateId,kind:'nemesis',behavior:'nemesis',firearmStage:n.firearmStage});portrait.alt=n.name;
      body.append(element('span','已退出追缉','record-stamp'),element('h2',n.name));paragraph(n.closure.reason,body);paragraph('继任者：'+n.closure.successorName+'。',body);
      details.append(element('summary','查看已结旧账 · '+n.history.length+' 次交锋'));details.open=!!focusId;
      const history=element('ol',undefined,'memory-history');n.history.forEach(h=>{const row=element('li','收尾招式 '+(h.playerKillCard||'未记招名')+' · '+h.turnsElapsed+' 回合 · 余下 '+Math.round(h.playerHPPercent*100)+'% 气血');if(h.escapeAccount)paragraph(h.escapeAccount,row);history.append(row);});details.append(history);body.append(details);record.append(portrait,body);g.append(record);
    });if(!pool.length&&!closed.length){content.append(element('h2','旧仇簿尚未落墨'));paragraph("败退的敌人会记住你的路数，重新准备后再追来。");}
  }
  function help(){
    const s=state(),relay=G.statusEffects.isRelayCombo(s)||(s.scene==='title'&&!G.storage.hasRunSave()&&G.buildProgression.revision===4);
    paragraph('先看敌人意图。出牌消耗体力，架势抵挡伤害。');
    if(window.KGAME_MOBILE)paragraph('长按手牌或对手细读；返回键取消选牌。');
    const chapters=[
      ['出招与撤招',['点牌再点目标，或拖牌出招。招架点自己，攻击点敌人。','再点原牌、右键或 Esc 取消。']],
      ['读懂下一手',[G.buildProgression?.active(state())?'入城初战保留原起手，此后每战洗牌；整备招式保证入手，其余起手正常抽取。牌堆用尽后重排弃牌；本回合用过的牌，下回合才能再抽。':'起手取行囊前五张，整备招式提前。牌堆用尽后重排弃牌；本回合用过的牌，下回合才能再抽。','结束回合后弃手牌、敌人行动。新回合恢复体力、补至五张手牌，架势清零。','玩家演出中可接牌；敌方行动与结算时不能出牌。']],
      ['伤势与破绽',['破绽：本身无伤害，消耗后按招式造成伤害。','溃烂：敌人行动前按层数伤害，先抵架势，再减1层。可叠加；消耗后清零。','迷眼：本轮攻击减半，行动后清除，不叠加。','残废：攻击伤害减少25%，重复取较长回合，可与迷眼共存。']],
      ['铁骨与连环',['铁骨：架势达到10时触发，本牌先加的架势也计入。',relay?'连环：每出任意3张牌，获得1次连环减费；带连环的招式少耗1体力，最低0费。未用次数可留到本回合后续出牌；每回合最多获得3次。军靴免体不消耗连环次数，回合结束清零。':'连环：先出任意3张牌，后续连环招式少耗1体力；每回合限3次，最低0费。']],
      ['应对火器',['一回合算一拍。宿敌左轮准备3拍，卡宾枪、步枪准备2拍。','枪击让架势抵挡减半；针对横练的枪击无视架势。看准倒计时，可用迷眼、残废或抢先击倒应对。']],
      ['收获与歇脚',['奖励先选再确认，也可不取。强敌旧物与招式分开选择。',...(G.buildProgression?.developing(state())?['第二卷起，战胜强敌或宿敌后的选牌含1张精进招式，仍只取1张。']:[]),'歇脚只能疗伤或精进一次。','菜单→招式：每卷免费整备一式，进入每战起手；新得招式可花20大洋换练一次。','本门补招每卷一次，替代当前随机选牌；取消不占次数。']],
      ['选择前路',['地图从下往上，亮起的节点才可前往。触屏先看路标，再点「前往此处」；选路后不能折返。','绕开旧仇标记不保证避战，追兵会转往前方战斗节点。每卷五层，过关进入下一卷。']],
      ['此行与旧仇',['奇遇选择影响后续的人和事，行程可查已知消息。','宿敌败退三次后退出，继任者接手报录与军械。重开重整牌组与行装，旧仇记录保留。']],
      ['暂停与续行',['按 P 或点右上角菜单暂停，Esc 逐级返回。行程自动保存。']]
    ];
    chapters.forEach(([heading,lines],i)=>{const chapter=element('article',undefined,'help-chapter');chapter.append(element('span',String(i+1).padStart(2,'0'),'chapter-number'),element('h2',heading));lines.forEach(line=>paragraph(line,chapter));content.append(chapter);});
    paragraph('临时费用：军靴让本场第4、8、12…张牌免费；连环减费只管本回合。招式簿与精进页显示原费。');
    if(G.buildProgression?.challenging(state()))paragraph(G.journeyGrowthCopy.ui.helpProgression);
    const background=element('details');background.append(element('summary','此行的来由'));paragraph(G.journeyNarrative.setting,background);paragraph(G.journeyNarrative.purpose(state()),background);paragraph(G.journeyNarrative.healthMeaning,background);content.append(background);
  }
  function settings(s){
    const row=(label,control)=>{const r=element('label',undefined,'settings-row');r.append(element('span',label),control);content.append(r);};
    [['volume','总音量'],['musicVolume','音乐'],['sfxVolume','音效']].forEach(([key,label])=>{
      const volume=element('input');volume.id='setting-'+key;volume.type='range';volume.min='0';volume.max='1';volume.step='.05';volume.value=s.settings[key];
      const output=element('output',Math.round(Number(volume.value)*100)+'%');output.htmlFor=volume.id;
      const controls=element('div',undefined,'range-controls');controls.append(volume,output);
      const r=element('div',undefined,'settings-row'),caption=element('label',label);caption.htmlFor=volume.id;r.append(caption,controls);content.append(r);
      volume.oninput=()=>{output.value=Math.round(Number(volume.value)*100)+'%';G.main.setSettings({[key]:Number(volume.value)});};
    });
    const pace=element('select');[1,2].forEach(v=>{const o=element('option',v===1?'正常节奏':'加快节奏');o.value=v;pace.append(o);});pace.value=s.settings.combatSpeed||1;
    pace.onchange=()=>{G.main.setSettings({combatSpeed:Number(pace.value)});syncFeedback();};row('战斗动画',pace);
    const smoothing=element('select');[['high','平滑'],['low','保留像素']].forEach(([value,label])=>{const o=element('option',label);o.value=value;smoothing.append(o);});smoothing.value=s.settings.quality;
    smoothing.onchange=()=>G.main.setSettings({quality:smoothing.value});row('图像缩放',smoothing);
    const reduced=element('input');reduced.type='checkbox';reduced.checked=!!s.settings.reducedMotion;
    reduced.onchange=()=>{G.main.setSettings({reducedMotion:reduced.checked});syncFeedback();};row('减少动态',reduced);
    const actions=element('div',undefined,'actions'),done=element('button','返回');done.onclick=returnUp;actions.append(done);content.append(actions);
  }
  function toMenu(){const next=state();next.scene='title';next.runReport=null;next.title.mode='menu';next.title.note=null;G.main.replaceState(next);close();}
  function pauseMenu(s){
    const layout=element('div',undefined,'pause-layout'),lead=element('section',undefined,'pause-lead'),actions=element('nav',undefined,'pause-actions');
    lead.append(element('span','江湖残卷','pause-kicker'),element('h2','暂歇片刻'));
    const act=s.map?.actNumber||s.combat?.actNumber||1;paragraph(G.enemies.getActMeta(act).title,lead);paragraph(styleName(s.player.chosenStyle)+' · 气血 '+s.player.hp+'/'+s.player.maxHp+' · 大洋 '+s.player.gold,lead);
    function action(id,label,callback){const b=element('button',label);b.id=id;b.type='button';b.onclick=callback;(id==='resume-journey'?lead:actions).append(b);}
    action('resume-journey',s.scene==='title'?'返回':'继续',close);
    action('open-deck','招式',()=>open('招式',deck,'pause'));
    action('open-route','行程',()=>open('行程',route,'pause'));
    action('open-nemesis','旧仇簿',()=>open('旧仇簿',nemesis,'pause'));
    action('open-settings','设置',()=>open('设置',settings,'pause'));
    action('open-help','玩法',()=>open('玩法',help,'pause'));
    if(s.runReport?.active)action('open-run-report','此行账簿',()=>open('此行账簿',runReport,'pause'));
    action('return-main-menu','返回主菜单',toMenu);layout.append(lead,actions);content.append(layout);
  }
  function inJourney(s){return s.scene!=='title'||s.title.mode==='report';}
  function syncUI(s=state()){trigger.hidden=!inJourney(s)||dialog.open;requestRemoveDeck(s);}
  function fit(){
    const canvas=document.getElementById('game-canvas'),shell=document.getElementById('game-shell');G.main.resizeDisplay();
    const c=canvas.getBoundingClientRect(),b=shell.getBoundingClientRect();
    trigger.style.left=(c.right-b.left-(window.KGAME_MOBILE?52:54))+'px';trigger.style.top=c.top-b.top+(window.KGAME_MOBILE?8:16)+'px';
  }
  trigger.onclick=()=>open('菜单',pauseMenu);
  function eventTechniques(s){
    const reward=s.event?.techniqueReward;if(reward?.status!=='pending')return;
    const copy=G.journeyGrowthCopy.ui;
    const owned=element('details',undefined,'event-owned');
    owned.append(element('summary','现有牌组 · '+s.player.masterDeckNames.length+' 张'));
    const counts=new Map();s.player.masterDeckNames.forEach(n=>counts.set(n,(counts.get(n)||0)+1));
    paragraph([...counts].map(([name,n])=>name+' ×'+n).join(' · '),owned);content.append(owned);
    const shelf=element('div',undefined,'event-technique-shelf');content.append(shelf);
    const controls=element('div',undefined,'event-technique-actions'),confirm=element('button',copy.techniqueConfirm),skip=element('button',copy.techniqueSkip);
    confirm.id='confirm-event-technique';confirm.disabled=true;skip.id='skip-event-technique';
    let selected=null;
    reward.options.forEach(card=>{
      const button=element('button',undefined,'book-card event-technique'),body=element('div',undefined,'event-technique-copy');
      button.type='button';button.dataset.eventTechnique=card.name;button.setAttribute('aria-label',card.name+'，'+card.text);button.setAttribute('aria-pressed','false');
      body.append(element('h2',card.name),element('p',card.text));button.append(cardCanvas(card.name),body);
      button.onclick=()=>{selected=card.name;shelf.querySelectorAll('button').forEach(b=>{const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});confirm.disabled=false;};shelf.append(button);
    });
    const commit=name=>{const current=state();if(current.scene!=='event'||current.event?.techniqueReward?.status!=='pending')return;G.main.replaceState(G.events.resolveTechniqueReward(current,name));close();};
    confirm.onclick=()=>{if(selected)commit(selected);};skip.onclick=()=>commit(null);controls.append(confirm,skip);content.append(controls);
  }
  function runReport(s){
    const r=s.runReport;if(!r?.active)return;
    const book=element('article',undefined,'terminal-book');book.dataset.outcome=r.outcome;content.append(book);
    const tabs=element('nav',undefined,'ledger-tabs'),pages=element('div',undefined,'ledger-pages');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','此行账簿');book.append(tabs,pages);
    const panes=[],controls=[];let deckReady=false;
    function activate(index,focus=false){if(index===1)buildDeck();controls.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;panes[i].hidden=i!==index;});content.scrollTop=0;if(focus)controls[index].focus({preventScroll:true});}
    ['本局回顾','牌组','随身旧物'].forEach((name,i)=>{const b=element('button',name),p=element('section',undefined,'ledger-page');b.type='button';b.id='ledger-tab-'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls','ledger-page-'+i);p.id='ledger-page-'+i;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b.id);b.onclick=()=>activate(i);b.onkeydown=e=>{const next=e.key==='ArrowRight'?(i+1)%3:e.key==='ArrowLeft'?(i+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next!==null){e.preventDefault();activate(next,true);}};tabs.append(b);pages.append(p);controls.push(b);panes.push(p);});
    const spread=element('div',undefined,'ledger-spread'),hero=element('section',undefined,'ledger-outcome'),recap=element('section',undefined,'ledger-recap');spread.append(hero,recap);panes[0].append(spread);
    hero.append(element('div',r.title,'ledger-kicker'),element('h2',r.outcome==='victory'?'五卷打通':r.title,'ledger-verdict'),element('div','杀法 · '+r.styleName,'ledger-style'));
    if(r.outcome!=='victory'){const stop=(r.summaryRows||[]).find(row=>row.label==='止步');if(stop)paragraph(String(stop.value),hero);}
    const list=element('dl',undefined,'ledger-numbers');hero.append(list);
    (r.summaryRows||[]).filter(row=>!['杀法','结局','止步'].includes(row.label)).forEach(row=>{const cell=element('div'),value=element('dd'),match=String(row.value).match(/^(\d+)\s*(张|件|个路线节点)$/);if(match)value.append(element('span',match[1]),element('small',match[2]));else value.textContent=String(row.value);cell.append(element('dt',row.label),value);list.append(cell);});
    recap.append(element('h2','本局回顾'));paragraph(r.prompt,recap);
    (r.detailLines||[]).filter(line=>line!==r.prompt&&line!==G.journeyNarrative?.preparation&&!(/存档|宿敌池|最后留在身上的旧物/.test(line))).forEach(line=>paragraph(line,recap));
    if(r.nextAttempt)paragraph(r.nextAttempt,recap);
    const trophies=element('section',undefined,'ledger-trophies');trophies.append(element('h2','随身旧物 · '+(s.player.relics||[]).length+' 件'));const tray=element('div',undefined,'ledger-trophy-tray');trophies.append(tray);panes[0].append(trophies);
    const relicCatalog=element('div',undefined,'ledger-relic-catalog');panes[2].append(relicCatalog);
    function relicImage(id){const image=element('img');image.src='assets/ui/shop_relic_'+id+'_gpt15all_01.png';image.alt='';return image;}
    (s.player.relics||[]).forEach((id,i)=>{const relic=G.relics.getRelicById(id),record=element('article',undefined,'ledger-relic');record.id='ledger-relic-'+i;const body=element('div');body.append(element('h2',relic?.name||id));paragraph(relic?.description||'',body);record.append(relicImage(id),body);relicCatalog.append(record);const b=element('button');b.type='button';b.setAttribute('aria-label','查看'+(relic?.name||id));b.append(relicImage(id),element('span',relic?.name||id));b.onclick=()=>{activate(2);record.scrollIntoView({block:'center'});record.tabIndex=-1;record.focus({preventScroll:true});};tray.append(b);});
    if(!s.player.relics?.length){paragraph('此行未留下旧物。',tray);paragraph('此行未留下旧物。',relicCatalog);}
    const inheritance=element('details',undefined,'ledger-inheritance');inheritance.append(element('summary','旧仇簿 · '+(s.nemesis?.pool||[]).length+' 名追缉者'));paragraph(G.journeyGrowthCopy.ui.inheritance,inheritance);if(G.journeyNarrative?.preparation)paragraph(G.journeyNarrative.preparation,inheritance);panes[0].append(inheritance);
    function buildDeck(){
    if(deckReady)return;deckReady=true;
    const names=s.player.masterDeckNames||[],groups=new Map();names.forEach(name=>groups.set(name,(groups.get(name)||0)+1));
    const deck=element('div',undefined,'ledger-deck'),shelf=element('div',undefined,'card-shelf'),detail=element('aside',undefined,'card-detail');detail.tabIndex=0;detail.setAttribute('aria-label','所选招式详情，可滚动');deck.append(shelf,detail);panes[1].append(element('div','牌组 · '+names.length+' 张 · '+groups.size+' 式','ledger-deck-summary'),deck);
    function selectCard(name,count,button){shelf.querySelectorAll('button').forEach(b=>{const on=b===button;b.setAttribute('aria-pressed',String(on));b.classList.toggle('selected',on);});const card=G.cards.getCardByName(name);detail.replaceChildren(cardCanvas(name),element('h2',name),element('div','同名 '+count+' 张'+(G.cards.isUpgraded(name)?' · 已精进':''),'meta'));paragraph(card?.text||'',detail,true);}
    groups.forEach((count,name)=>{const b=element('button',undefined,'book-card');b.type='button';b.setAttribute('aria-label',name+'，'+count+' 张');b.append(cardCanvas(name),element('span','× '+count,'card-count'));b.onclick=()=>selectCard(name,count,b);shelf.append(b);if(shelf.childElementCount===1)selectCard(name,count,b);});
    if(!names.length)paragraph('行囊中暂无招式。',shelf);
    }
    activate(0);
  }
  G.journeyShell={openSettings:()=>open('设置',settings),openCredits:()=>open('制作与鸣谢',credits),openStarterDeck:()=>open('起手招式',starter),openEnemyRecord:id=>open('交锋记忆',s=>nemesis(s,id)),openEventTechniques:()=>open(G.journeyGrowthCopy.ui.techniqueTitle,eventTechniques),openReport:()=>open('此行账簿',runReport),syncUI};
  window.addEventListener('keydown',e=>{
    if(e.defaultPrevented)return;
    if(e.repeat||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
    if(e.code==='KeyP'){if(!dialog.open&&!inJourney(state()))return;e.preventDefault();if(dialog.open)close();else open('菜单',pauseMenu);}
    if(e.key==='Escape'&&!dialog.open){
      const s=state();
      if(s.scene==='map'&&s.map?.previewNodeId){e.preventDefault();const next=structuredClone(s);next.map.previewNodeId=null;G.main.replaceState(next);return;}
      if(!inJourney(s)||s.reviewPanel||(s.scene==='combat'&&(s.combat.selectedCardId||s.combat.inspectCardId||s.combat.ui?.overlay?.visible||G.render.animations.getCardDrag('combat')?.dragging))||(s.scene==='reward'&&Number.isInteger(s.reward?.reviewSelectedIndex))||(s.scene==='rest'&&(s.rest?.reviewChoice||s.rest?.mode==='upgrade')))return;
      e.preventDefault();open('菜单',pauseMenu);
    }
  });
  function syncFeedback(){const s=state().settings;G.scenes.combat.feedback.setOptions({speed:s.combatSpeed||1,reduced:!!s.reducedMotion});}
  window.addEventListener('resize',fit);window.addEventListener('pagehide',()=>{const s=state();if(s.scene!=='title'&&!(s.scene==='combat'&&s.combat.result==='defeat')&&!s.map?.completed)G.storage.saveRun(s);});
  syncFeedback();fit();syncUI();
})();
