/* Shared presentation layer. Scene rules and input handlers remain in scenes/. */
(function () {
  'use strict';
  const W = G.render.woodcut, C = W.colors;
  const rect = (x, y, width, height) => ({ x, y, width, height });
  const label = W.text, paragraph = W.wrap;
  function title(state, ctx) {
    const t = state.title, L = G.scenes.title.getLayout();
    if (t.mode === 'menu') {
      ctx.fillStyle = '#130f0c'; ctx.fillRect(0,0,1280,720);
      ctx.save(); ctx.translate(1280,0); ctx.scale(-1,1);
      G.render.assets.drawImageCover(ctx,'assets/ui/title_menu_background_gpt4ovip_01.png',0,0,1280,720,{focusX:.46,focusY:.40}); ctx.restore();
      const dusk = ctx.createLinearGradient(0,0,0,720); dusk.addColorStop(0,'rgba(13,9,7,.32)'); dusk.addColorStop(.5,'rgba(13,9,7,.1)'); dusk.addColorStop(1,'rgba(7,5,4,.78)');
      ctx.fillStyle = dusk; ctx.fillRect(0,0,1280,720);
      label(ctx, '江 湖 残 卷', 72, 102, 52, C.text, 'left', 600, true);
      label(ctx, '乱世浮沉，旧怨未了。', 78, 151, 16, C.paper, 'left', 500, true);
      t.menuItems.forEach((item, i) => W.button(ctx, L.menuButtons[i], { new_run: '踏入江湖', continue: '继续旅程', settings: '设置', credits: '制作与鸣谢' }[item.id], { disabled: item.disabled, primary: i === 0 }));
      if (t.continueAvailable) paragraph(ctx, t.saveLine, 920, 528, 292, 13, C.muted, 4);
      return;
    }
    W.background(ctx, 'gate', .55);
    if (t.mode === 'styles') {
      const selected = t.options.find(o => o.id === t.selectedStyle) || t.options[0];
      W.header(ctx, '选一门活命手艺', '流派决定起手牌与构筑方向');
      W.image(ctx, 'player-' + selected.id, rect(28, 110, 408, 558));
      G.scenes.title.getStyleBoxes(L).forEach((b, i) => W.button(ctx, b, t.options[i].name, { selected: t.options[i].id === selected.id, subtitle: t.options[i].keyword }));
      W.panel(ctx, rect(836, 120, 372, 436), { fill: C.ink });
      label(ctx, selected.name, 860, 156, 34, C.paper, 'left', 600, true);
      paragraph(ctx, selected.theme, 860, 185, 320, 16, C.danger, 2);
      paragraph(ctx, selected.killerLine || selected.summary, 860, 238, 320, 21, C.text, 3);
      paragraph(ctx, selected.summary, 860, 315, 320, 15, C.muted, 4);
      label(ctx, '起手要诀', 860, 427, 14, C.paper);
      paragraph(ctx, selected.starterSummary || selected.keyword, 860, 455, 320, 15, C.text, 3);
      W.button(ctx, L.startButton, '启程', { primary: true, subtitle: selected.name });
      W.button(ctx, L.backButton, '返回主菜单', { size: 16 }); return;
    }
    if (t.mode === 'settings') {
      W.header(ctx, '设置', '调整适合自己的游玩方式'); W.panel(ctx, L.settingsPanel);
      label(ctx, '总音量', 350, 245, 23); W.button(ctx, L.volumeMinus, '−'); W.button(ctx, L.volumePlus, '+');
      W.bar(ctx, rect(458, 311, 364, 15), state.settings.volume, 1, C.paper);
      label(ctx, Math.round(state.settings.volume * 100) + '%', 640, 279, 18, C.paper, 'center');
      W.button(ctx, L.qualityButton, '画面质量：' + (state.settings.quality === 'high' ? '高' : '低'), { subtitle: '点击切换' });
      W.button(ctx, L.settingsBack, '返回主菜单'); return;
    }
    if (t.mode === 'report') {
      if(G.render.journeyStory){G.render.journeyStory.renderReport(state,ctx);return;}
      const r = state.runReport || {};
      W.header(ctx, r.title || '此行终卷', r.subtitle || t.subtitle); W.panel(ctx, L.reportPanel);
      label(ctx, r.heading || (r.outcome === 'victory' ? '此路已尽' : '江湖未远'), 187, 215, 36, C.paper, 'left', 600, true);
      paragraph(ctx, r.summary || r.prompt || t.prompt, 187, 275, 900, 18, C.text, 3);
      const rows = r.stats || r.summaryRows || [];
      if (Array.isArray(rows)) rows.forEach((item, i) => paragraph(ctx, typeof item === 'string' ? item : (item.label || '') + '  ' + (item.value ?? ''), 190 + i % 2 * 450, 320 + Math.floor(i / 2) * 34, 420, 15, C.text, 1));
      paragraph(ctx, (r.detailLines || []).join('\n').replaceAll('continue 存档', '本局存档'), 190, 471, 882, 16, C.text, 5);
      L.reportButtons.forEach((b, i) => W.button(ctx, b, i ? '再入江湖' : '返回主菜单', { primary: i === 1 })); return;
    }
    W.header(ctx, '制作与鸣谢', '江湖残卷'); W.panel(ctx, L.creditsPanel);
    const credits = [
      '江湖残卷 · 晚清武侠、卡牌构筑与宿敌',
      '视觉：写实人物与环境；场景、人物及卡图使用 AI 辅助生成。',
      '音乐 Kawarayu — Yubatake / CC BY 4.0',
      '音乐 Fight For Freedom — Kaine Carrillo / CC BY 4.0',
      '音效 Sword Swing — DavidW / OGA BY 4.0',
      '其他音频：yd、remaxim、zer0_sol / CC0'
    ];
    credits.forEach((row, i) => paragraph(ctx, row, 222, 207 + i * 48, 826, 16, C.text, 2));
    paragraph(ctx, '音频来源：OpenGameArt.org。完整素材署名与许可说明随游戏提供。', 222, 540, 824, 14, C.muted, 2);
    W.button(ctx, L.creditsBack, '返回主菜单');
  }
  let combatStageLayer;
  function combatStage(ctx) {
    if (combatStageLayer) { ctx.drawImage(combatStageLayer,0,0); return; }
    if (!G.render.assets.getImageEntry('assets/woodcut/background-gate.png').loaded) {
      ctx.fillStyle = '#0b0d0d'; ctx.fillRect(0,0,1280,720); return;
    }
    const screen = ctx;
    combatStageLayer = document.createElement('canvas'); combatStageLayer.width = 1280; combatStageLayer.height = 720;
    ctx = combatStageLayer.getContext('2d');
    ctx.fillStyle = '#0b0d0d'; ctx.fillRect(0,0,1280,720);
    // A closer, subdued street leaves the figures as the sharpest forms.
    ctx.save(); ctx.filter = 'saturate(.55) brightness(.68) blur(.65px)';
    W.image(ctx, 'background-gate', rect(-92,-62,1464,824), true); ctx.restore();
    const depth = ctx.createRadialGradient(675,282,95,655,340,700);
    depth.addColorStop(0,'rgba(9,12,13,.38)'); depth.addColorStop(.53,'rgba(7,10,11,.58)'); depth.addColorStop(1,'rgba(5,7,8,.96)');
    ctx.fillStyle = depth; ctx.fillRect(0,0,1280,720);
    const ground = ctx.createLinearGradient(0,280,0,580);
    ground.addColorStop(0,'rgba(6,8,9,0)'); ground.addColorStop(.5,'rgba(6,8,9,.68)'); ground.addColorStop(1,'rgba(6,8,9,.99)');
    ctx.fillStyle = ground; ctx.fillRect(0,280,1280,440);
    screen.drawImage(combatStageLayer,0,0);
  }
  function combatPile(ctx, b, count, name) {
    const active = W.hovered(b), x = b.x + 14, y = b.y + 20;
    ctx.save(); ctx.globalAlpha = active ? .85 : .48;
    ctx.strokeStyle = C.paper; ctx.lineWidth = 1;
    ctx.strokeRect(x + 4,y - 4,25,34); ctx.fillStyle = '#171a18'; ctx.fillRect(x,y,25,34); ctx.strokeRect(x,y,25,34);
    ctx.restore();
    label(ctx,count,b.x + b.width / 2,y + 17,16,C.paper,'center',600,true);
    label(ctx,name,b.x + b.width / 2,y + 49,11,active ? C.text : C.muted,'center');
  }
  function combat(state, ctx) {
    const feedback = G.scenes.combat.feedback;
    if (feedback) state = feedback.getView(state);
    const S = G.scenes.combat, L = S.debugGetLayout(), c = state.combat;
    const presentation = W.combatPresentation;
    const mobile=window.KGAME_MOBILE&&G.render.mobileCombat;
    (presentation?.stage || combatStage)(ctx,state);
    if (!presentation?.enemyInfo) label(ctx, c.encounterName || '九城 · 狭路相逢', 40, 35, 17, C.muted, 'left', 500, true);
    if(mobile)mobile.round(ctx,state);
    else if (presentation?.roundPlaque) presentation.roundPlaque(ctx,state);
    else label(ctx, '回合  ' + Math.max(1, c.turn), 640, 35, 17, C.paper, 'center',500,true);
    const playerShake = G.render.animations.getStaggerOffset('combat', 'player');
    const playerMotion = feedback?.getMotion('player') || {x:0,y:0};
    playerShake.x += playerMotion.x; playerShake.y += playerMotion.y;
    const style = state.player.chosenStyle || 'blade';
    const playerFrame = presentation?.playerFrame ? presentation.playerFrame(playerShake) : rect(142 + playerShake.x, 175 + playerShake.y, 430, 418);
    const drawFigure = presentation?.figure || W.figure;
    ctx.save();ctx.globalAlpha = feedback?.actorAlpha('player') ?? 1;
    G.render.combatInteraction.renderFigureTarget(ctx,state,'player',presentation?presentation.playerArt(style):'player-'+style+'-rear-v3',playerFrame,style!=='combo');
    const paintPlayer=()=>drawFigure(ctx, presentation ? presentation.playerArt(style) : 'player-' + style + '-rear-v3', playerFrame, style !== 'combo');
    if(feedback?.paintActor)feedback.paintActor(ctx,'player',playerFrame,paintPlayer);else paintPlayer();ctx.restore();
    S.getEnemyLayoutBoxes(state).forEach(box => {
      const e = box.enemy;
      if (e.hp <= 0) return;
      const cx = box.x + box.width / 2;
      const action = G.render.animations.getEnemyAction(e.id), shown = action?.enemy || e;
      const firing = action && shown.intentData?.firearm && shown.intentData?.damage;
      const recoil = firing ? Math.sin(Math.min(1,action.ageMs / 180) * Math.PI) * 10 : 0;
      const motion = feedback?.getMotion(e.id) || {x:0,y:0};
      // Layout boxes already include the enemy's stagger offset, including hit targets.
      const enemyArt = (presentation?.enemyArt || W.enemyArt)(shown), enemyFrame = rect(box.x + recoil + motion.x, box.y + 32 + motion.y, box.width, Math.min(310, box.height - 82));
      enemyFrame.slotRole=box.slotRole;enemyFrame.moving=!!box.moving;
      ctx.save();ctx.globalAlpha = feedback?.actorAlpha(e.id) ?? 1;
      G.render.combatInteraction.renderFigureTarget(ctx,state,e.id,enemyArt,enemyFrame,presentation?presentation.enemyFlip(shown):enemyArt.startsWith('enemy-blade-front'));
      const paintEnemy=()=>drawFigure(ctx, enemyArt, enemyFrame, presentation ? presentation.enemyFlip(shown) : enemyArt.startsWith('enemy-blade-front'));
      if(feedback?.paintActor)feedback.paintActor(ctx,e.id,enemyFrame,paintEnemy);else paintEnemy();
      ctx.restore();
      if(mobile){mobile.enemy(ctx,e,shown,box,!!firing);return;}
      if (presentation?.enemyInfo) { presentation.enemyInfo(ctx,e,shown,box,!!firing); return; }
      // Small danger mark belongs to its opponent, without a hanging panel.
      const intent = W.enemyIntent(shown);
      ctx.save(); ctx.shadowColor = '#050606'; ctx.shadowBlur = 8;
      label(ctx, firing ? '开火' : intent.title, cx, box.y + 7, 16, intent.danger ? (presentation?.dangerColor || '#c69581') : C.paper, 'center', 600,true);
      if (intent.note && !firing) label(ctx,intent.note,cx,box.y + 25,11,C.muted,'center');
      ctx.restore();
      label(ctx, e.name, cx, box.y + box.height - 64, 16, C.text, 'center', 500, true);
      const hpWidth = Math.min(210, box.width - 26), bx = cx - hpWidth / 2, by = box.y + box.height - 47;
      (presentation?.healthBar || W.bar)(ctx, rect(bx, by, hpWidth, presentation?.bloodColor ? 8 : 6), e.hp, e.maxHp, presentation?.bloodColor || C.red);
      label(ctx, e.hp + '/' + e.maxHp + (e.block ? '  架势 ' + e.block : ''), cx, by + 21, 12, C.paper, 'center');
      const tags = S.getEnemyStatusChips(e, false).map(chip => chip.text);
      if (tags.length) label(ctx, tags.join(' · '), cx, by + 43, 11, C.danger, 'center');
    });
    if(mobile)mobile.player(ctx,state,L);
    else if (presentation?.playerInfo) presentation.playerInfo(ctx,state);
    else {
    label(ctx, ({blade:'吹命刀',iron:'外家横练',dirty:'下三滥',combo:'贴身短打'})[state.player.chosenStyle] || '刀客', 48, 485, 17, C.text, 'left', 600, true);
    label(ctx, state.player.hp + '/' + state.player.maxHp, 235, 485, 14,C.paper,'right');
    (presentation?.healthBar || W.bar)(ctx, rect(48, 501, 187, presentation?.bloodColor ? 9 : 7), state.player.hp, state.player.maxHp, presentation?.bloodColor || C.red);
    label(ctx, '体力 ' + state.player.energy + '/' + state.player.maxEnergy, 48, 526, 15, C.paper);
    label(ctx, '架势 ' + (state.player.block || 0), 235, 526, 13, C.paper,'right');
    paragraph(ctx, S.getPlayerStatusChips(state, state.player).map(chip => chip.text).join(' · '), 40, 441, 380, 14, C.green, 1);
    }
    if(mobile)mobile.controls(ctx,state,L);
    else {
    if (state.player.relics?.length) paragraph(ctx, '旧物  ' + state.player.relics.map(r => typeof r === 'string' ? G.relics.definitions[r]?.name || r : r.name).join(' / '), 106, 590, 150, 11, C.muted, 4);
    (presentation?.pile || combatPile)(ctx, L.drawPile, c.drawPileCount, '抽牌');
    (presentation?.pile || combatPile)(ctx, L.discardPile, c.discardPileCount, '弃牌');
    // Keep the original physical wood token; brightness rises only on hover.
    ctx.save(); ctx.globalAlpha = presentation?.endTurn || W.hovered(L.endTurn) ? 1 : .78;
    if (presentation?.endTurn) {const paint=()=>presentation.endTurn(ctx,L.endTurn,feedback?.isBusy());if(G.render.journeyMotion)G.render.journeyMotion.surface(ctx,'combat-end',L.endTurn,{enabled:!feedback?.isBusy(),entry:false,lift:1},paint);else paint();}
    else W.button(ctx, L.endTurn, '结束回合', { subtitle: '结束本回合', size: 23 });
    ctx.restore();
    if (G.relicRuntime?.hasRelic(state, 'cheat_cuff')) W.button(ctx, L.cheatCuff, '袖口换牌', { size: 14 });
    if (c.lastAction && !/^(遭遇【|已选中|取消选中|拖到高亮|请点击高亮|未锁定目标)/.test(c.lastAction)) {
      const paint=brush=>paragraph(brush,c.lastAction,106,652,203,11,C.muted,3);
      if(G.render.combatDeparture)G.render.combatDeparture.hud(ctx,'last-action',{x:90,y:640,width:240,height:80},paint);else paint(ctx);
    }
    }
    G.render.combatInteraction.render(ctx, state, S.getHandLayoutBoxes(state), S.getEnemyLayoutBoxes(state));
    S.renderHand(ctx, state, L);
    G.render.combatInteraction.renderRejection(ctx,state,L);
    // Touch has a full-size long-press reader. A second floating preview would
    // cover the opponent's HP and intent while the player is choosing a target.
    if(!mobile)S.renderInspector(ctx, state, L);
    feedback?.render(ctx,state);
    G.render.victoryMark?.render(ctx,state);
    const overlay = c.ui?.overlay;
    if (overlay?.visible) {
      W.panel(ctx, overlay); label(ctx, overlay.title, overlay.x + 24, overlay.y + 30, 24);
      paragraph(ctx, (overlay.title==='抽牌堆'?'下一张 → 底部：':'')+(overlay.items || []).join(' · '), overlay.x + 24, overlay.y + 66, overlay.width - 48, 17, C.text, 16);
    }
    if (c.result !== 'active' && !feedback?.isBusy() && !(c.result==='victory'&&G.render.victoryMark)) {
      const paint=brush=>{W.panel(brush,L.result);label(brush,c.result==='victory'?'搏杀得手':'折戟江湖',L.result.x+L.result.width/2,L.result.y+37,30,C.paper,'center',600,true);label(brush,c.result==='victory'?'清点此战所得…':'点击任意处，查看本局记录',L.result.x+L.result.width/2,L.result.y+79,17,C.text,'center');};
      if(G.render.combatDeparture)G.render.combatDeparture.hud(ctx,'outcome',L.result,paint);else paint(ctx);
    }
  }
  function map(state, ctx) {
    W.background(ctx, 'gate', .78); W.header(ctx, state.map.actTitle, '沿亮起的节点前行', state);
    const m = state.map, nodes = m.nodes || [];
    nodes.forEach(n => (n.nextIds || []).forEach(id => {
      const next = nodes.find(v => v.id === id); if (!next) return;
      ctx.strokeStyle = m.reachableNodeIds.includes(n.id) ? '#b7c3b5' : '#46565d'; ctx.lineWidth = 2; ctx.setLineDash([5,7]);
      ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(next.x, next.y); ctx.stroke(); ctx.setLineDash([]);
    }));
    nodes.forEach(n => {
      const reachable = m.reachableNodeIds.includes(n.id), visited = (m.visitedNodeIds || []).includes(n.id);
      const b = rect(n.x - 29, n.y - 29, 58, 58);
      W.panel(ctx, b, { fill: reachable ? C.red : (visited ? '#38473f' : C.ink), active: reachable && W.hovered(b), accent: reachable ? C.paper : C.line });
      label(ctx, ({street:'战',elite:'险',gate:'关',rest:'歇',shop:'市',event:'遇',nemesis:'仇'})[n.type] || '路', n.x, n.y, 29, reachable ? C.text : C.muted, 'center', 600, true);
      label(ctx, n.label, n.x, n.y + 44, 13, reachable ? C.text : C.muted, 'center');
    });
    W.footer(ctx, m.completed ? '此行已尽 · 点击查看终局' : m.note);
  }
  function reward(state, ctx) {
    if(G.render.realisticJourney){G.render.realisticJourney.renderReward(state,ctx);return;}
    const r = state.reward, L = G.scenes.reward.getLayout(r.options.length);
    W.background(ctx, 'gate', .58); W.header(ctx, r.mode === 'relic' ? '拾得旧物' : '战后所得', '挑选一件带走，或继续上路', state);
    W.panel(ctx, L.summary); label(ctx, '此战所得', 78, 158, 23, C.paper, 'left', 600, true);
    label(ctx, '+' + (r.goldAward || 0), 78, 230, 48, C.text); label(ctx, '大洋', 78, 274, 16, C.muted);
    label(ctx, '气血', 78, 367, 15, C.muted); label(ctx, state.player.hp + '/' + state.player.maxHp, 78, 401, 26);
    label(ctx, '牌组', 78, 479, 15, C.muted); label(ctx, state.player.deckSize + ' 张', 78, 513, 26);
    r.options.forEach((option, i) => {
      const b = L.cards[i]; if (!b) return;
      if (r.mode === 'relic') { W.panel(ctx, b, { active: W.hovered(b) }); label(ctx, '旧', b.x + b.width / 2, b.y + 55, 48, C.paper, 'center', 600, true); label(ctx, option.name, b.x + b.width / 2, b.y + 117, 21, C.text, 'center'); paragraph(ctx, option.description || option.text, b.x + 18, b.y + 150, b.width - 36, 14, C.muted, 6); }
      else W.card(ctx, { ...b, ...option, sourceCard: option, artRole: 'reward', playable: true, accentStroke: W.hovered(b) ? C.paper : null });
    });
    paragraph(ctx, r.subtitle || '点击一张牌加入牌组。', L.footer.x + 12, L.footer.y + 18, L.footer.width - 24, 16, C.paper, 2);
    W.button(ctx, L.skip, r.mode === 'relic' ? '放弃旧物' : '继续上路');
  }
  function shop(state, ctx) {
    const s = state.shop, S = G.scenes.shop, L = S.getLayout(); W.background(ctx, 'market', .54);
    const M=G.render.journeyMaterials||{sheet:(ctx,b)=>W.panel(ctx,b),action:(ctx,b,value,o={})=>W.button(ctx,b,value,{...o,disabled:o.enabled===false})};
    W.header(ctx, s.mode === 'remove' ? '撤去旧招' : '暗巷黑市', s.mode === 'remove' ? '先选一张招式，核对后再撤去' : G.render.journeyMaterials?'点选细读，核对价钱后成交':'招式与旧物 · 点击购买', state);
    if (s.mode === 'remove') {
      const book=G.render.journeyBook;
      if(book)book.surface(ctx,rect(54,124,1172,486));
      S.getRemoveBoxes(s.deckEntries, L, s.removePage).forEach(b => { const entry = s.deckEntries.find(e=>e.index===b.index); if(book){book.card(ctx,entry,b);book.badge(ctx,b,'第 '+(entry.index+1)+' 张');if(W.hovered(b)){ctx.strokeStyle='#863e2d';ctx.lineWidth=2;ctx.strokeRect(b.x-3,b.y-3,b.width+6,b.height+6);}}else W.button(ctx,b,entry.name,{size:17}); });
      const pages=Math.ceil(s.deckEntries.length/16),page=s.removePage||0;
      if(pages>1){M.action(ctx,L.removePrev,'上一页',{enabled:page>0,paper:true});M.action(ctx,L.removeNext,'下一页',{enabled:page+1<pages,paper:true});label(ctx,(page+1)+' / '+pages,510,584,15,'#624d37','center');}
      label(ctx, '费用 ' + s.removeCost + ' 大洋', 380, 647, 17, state.player.gold >= s.removeCost ? C.paper : C.danger);
      M.action(ctx, L.backButton, '返回黑市');
      if (Number.isInteger(s.removeSelectedIndex)) {
        const entry=s.deckEntries.find(e=>e.index===s.removeSelectedIndex),name=state.player.masterDeckNames[s.removeSelectedIndex],card=G.cards.getCardByName(name);
        ctx.fillStyle='rgba(4,8,10,.86)';ctx.fillRect(0,108,1280,612);
        if(book)book.surface(ctx,rect(384,132,756,486));else W.panel(ctx,rect(384,132,756,486));
        if(card&&book)book.card(ctx,card,rect(436,165,213,316));
        label(ctx,'撤去这一式',718,197,29,'#493426','left',600,true);
        paragraph(ctx,'【'+(entry?.name||name)+'】\n只移除第 '+(s.removeSelectedIndex+1)+' 张；同名的其他牌保留。',718,251,354,18,'#55422f',4);
        label(ctx,'花费 '+s.removeCost+' 大洋',718,382,23,'#823c2e');
        label(ctx,'余额 '+state.player.gold+' → '+(state.player.gold-s.removeCost),718,424,18,'#6b543b');
        label(ctx,'牌组 '+state.player.masterDeckNames.length+' → '+(state.player.masterDeckNames.length-1)+' 张',718,462,16,'#6b543b');
        M.action(ctx,L.removeCancel,'再想想');M.action(ctx,L.removeConfirm,'确认撤去',{primary:true,enabled:state.player.gold>=s.removeCost});
      }
    } else {
      S.getCardBoxes(L).forEach((b, i) => {
        const offer = s.cardOffers[i]; if (!offer) return;
        W.card(ctx, { ...b, ...offer, sourceCard: offer, playable: true, accentStroke: !offer.sold && W.hovered(b) ? C.paper : null });
        label(ctx, offer.sold ? '已售出' : offer.price + ' 大洋', b.x + b.width / 2, b.y + b.height + 22, 15, state.player.gold >= offer.price ? C.paper : C.danger, 'center');
        if (offer.sold) { const opacity=G.render.journeyMotion?.value('sold-card:'+i,1,0)??1;ctx.fillStyle = 'rgba(9,17,22,'+(.6*opacity)+')'; ctx.fillRect(b.x, b.y, b.width, b.height); }
      });
      S.getRelicBoxes(L).forEach((b, i) => {
        const offer = s.relicOffers[i]; if (!offer) return;const paint=()=>{M.sheet(ctx,b);
        W.image(ctx,'assets/ui/shop_relic_'+offer.id+'_gpt15all_01.png',rect(b.x+8,b.y+16,66,86));
        label(ctx, offer.name, b.x + 82, b.y + 24, 20, '#493727'); paragraph(ctx, offer.description, b.x + 82, b.y + 47, b.width - 94, 15, '#57432f',3);
        label(ctx, offer.sold ? '已售出' : offer.price + ' 大洋', b.x + 15, b.y + b.height - 18, 15, '#813b2e');
        };if(G.render.journeyMotion)G.render.journeyMotion.surface(ctx,'shop-relic:'+i,b,{enabled:!offer.sold,delay:80+i*35,distance:16},paint);else paint();
      });
      M.action(ctx,L.removeButton,'撤去旧招');label(ctx,s.removeCost+' 大洋',L.removeButton.x+L.removeButton.width/2,L.removeButton.y+L.removeButton.height+15,14,C.paper,'center');
      M.action(ctx,L.leaveButton,'离开黑市',{primary:true});
      if(s.purchaseSelection){
        const selection=s.purchaseSelection,offer=(selection.type==='relic'?s.relicOffers:s.cardOffers)[selection.index],book=G.render.journeyBook;
        ctx.fillStyle='rgba(4,8,10,.90)';ctx.fillRect(0,108,1280,612);book.surface(ctx,rect(384,132,756,486));
        if(selection.type==='card')book.card(ctx,offer,rect(436,165,213,316));else W.image(ctx,'assets/ui/shop_relic_'+offer.id+'_gpt15all_01.png',rect(432,190,220,245));
        label(ctx,offer.name,718,197,29,'#493426','left',600,true);paragraph(ctx,offer.text||offer.description,718,240,354,18,'#55422f',4);
        label(ctx,'花费 '+offer.price+' 大洋',718,382,23,'#823c2e');label(ctx,'余额 '+state.player.gold+' → '+(state.player.gold-offer.price),718,424,18,'#6b543b');
        label(ctx,state.player.gold<offer.price?'尚缺 '+(offer.price-state.player.gold)+' 大洋':selection.type==='card'?'招式 '+state.player.masterDeckNames.length+' → '+(state.player.masterDeckNames.length+1)+' 张':'收下后立即生效',718,466,17,'#6b543b');
        M.action(ctx,L.removeCancel,'再想想');M.action(ctx,L.removeConfirm,'确认成交',{primary:true,enabled:state.player.gold>=offer.price});
      }
    }
    W.footer(ctx, s.note);
  }
  function rest(state, ctx) {
    if(G.render.realisticJourney){G.render.realisticJourney.renderRest(state,ctx);return;}
    const r = state.rest, S = G.scenes.restShared, L = S.getLayout(); W.background(ctx, 'temple', .48);
    W.header(ctx, '破庙歇脚', r.mode === 'upgrade' ? '挑一式精进 · 同名招式只升级一张' : '一夜喘息，养伤或练功', state);
    W.panel(ctx, L.sidebar); W.image(ctx, 'player-' + state.player.chosenStyle, rect(62, 151, 198, 306));
    label(ctx, '气血', 80, 487, 16, C.muted); label(ctx, state.player.hp + '/' + state.player.maxHp, 80, 523, 27);
    label(ctx, '牌组 ' + state.player.deckSize + ' 张', 80, 580, 17, C.paper);
    if (r.mode === 'upgrade') {
      S.getUpgradeStackBoxes(S.buildUpgradeStacks(r.deckEntries), L).forEach(b => { const entry = b.entry.card || G.cards.getCardByName(b.entry.name) || b.entry; W.card(ctx, { ...b, ...entry, sourceCard: entry, playable: true, accentStroke: W.hovered(b) ? C.paper : null }); label(ctx, '同名 ' + b.count + ' 张', b.x + b.width / 2, b.y + b.height + 15, 12, C.muted, 'center'); });
      W.button(ctx, L.back, '返回');
    } else {
      [L.heal, L.upgrade].forEach((b, i) => { W.panel(ctx, b, { active: W.hovered(b) }); label(ctx, i ? '练' : '养', b.x + b.width / 2, b.y + 69, 62, C.paper, 'center', 500, true); label(ctx, i ? '再练一式' : '包扎伤口', b.x + b.width / 2, b.y + 146, 28, C.text, 'center', 600, true); paragraph(ctx, i ? '选择一张未升级的牌，使其更见火候。' : '恢复 ' + r.healAmount + ' 气血，随后继续前行。', b.x + 32, b.y + 192, b.width - 64, 17, C.muted, 3); });
    }
    paragraph(ctx, r.note, L.footer.x + 10, L.footer.y + 13, L.footer.width - 20, 13, C.muted, 2);
  }
  function event(state, ctx) {
    if(G.render.journeyStory){G.render.journeyStory.renderEvent(state,ctx);return;}
    const e = state.event, L = G.scenes.event.getLayout(e.choices.length); W.background(ctx, 'market', .68);
    W.header(ctx, '乱世奇遇', e.actTitle, state); W.panel(ctx, L.eventPanel);
    label(ctx, e.title, L.eventPanel.x + 28, L.eventPanel.y + 34, 27, C.paper, 'left', 600, true);
    paragraph(ctx, e.body, L.eventPanel.x + 28, L.eventPanel.y + 67, L.eventPanel.width - 56, 17, C.text, 4);
    if (e.mode === 'choice') e.choices.forEach((choice, i) => { const b = L.choiceBoxes[i],paint=()=>{W.panel(ctx, b, { active: W.hovered(b) }); label(ctx, choice.label, b.x + 24, b.y + 27, 23, C.paper); paragraph(ctx, G.events.getChoicePreview(state,choice.id), b.x + 24, b.y + 54, b.width - 65, 16, C.muted, 3);};if(G.render.journeyMotion)G.render.journeyMotion.surface(ctx,'event-choice:'+i,b,{delay:80+i*55,distance:14,lift:2},paint);else paint(); });
    else { W.panel(ctx, L.resultPanel); label(ctx, e.selectedChoiceLabel, L.resultPanel.x + 28, L.resultPanel.y + 34, 24, C.paper); paragraph(ctx, e.resultText, L.resultPanel.x + 28, L.resultPanel.y + 70, L.resultPanel.width - 56, 18, C.text, 4); paragraph(ctx, (e.resultSummary || []).join(' / '), L.resultPanel.x + 28, L.resultPanel.y + 169, L.resultPanel.width - 56, 15, C.danger, 2); W.button(ctx, L.continueButton, e.continueLabel || '继续前行', { primary: true }); }
  }
  function nemesis(state, ctx) {
    const n = state.nemesisIntro, L = G.scenes.nemesis.getLayout(); W.background(ctx, 'gate', .53);
    W.header(ctx, '旧仇再会', n.name + ' · ' + n.title, state);
    W.figure(ctx, W.enemyArt(n), rect(46, 134, 365, 432));
    label(ctx, n.name, 235, 571, 28, C.paper, 'center', 600, true);
    W.panel(ctx, L.dossier); paragraph(ctx, '“' + n.dialogueLine + '”', 460, 182, 690, 26, C.text, 4);
    label(ctx, '旧伤记忆', 458, 377, 17, C.danger); paragraph(ctx, n.memoryLine, 458, 410, 304, 16, C.muted, 5);
    label(ctx, '这一次', 830, 377, 17, C.danger); paragraph(ctx, (n.note || '') + ' ' + (n.eraLine || ''), 830, 410, 318, 16, C.muted, 5);
    paragraph(ctx, n.adaptation?.description || '宿怨 ' + n.level + ' 阶 · 旧敌会记住你的打法。', 80, 627, 710, 16, C.paper, 3);
    W.button(ctx, L.fight, n.confirmLabel || '拔刀相见', { primary: true });
  }
  const renderers = { title, combat, map, reward, shop, rest, event, nemesis };
  Object.entries(renderers).forEach(([name, renderer]) => { G.scenes[name].coversCanvas = true; G.scenes[name].render = function (state, ctx) { ctx.save(); ctx.globalCompositeOperation = 'source-over'; renderer(state, ctx); ctx.restore(); }; });
  // Preparation happens on entry/state replacement and after actions in main.
  // These pages have no rule deadlines; pointer-driven drawing remains separate.
  ['title','map','nemesis'].forEach(name=>{G.scenes[name].inputOnly=true;});
  // Event sheets and shop details have no idle rule deadlines. Retain their
  // settled Canvas instead of submitting the entire Android surface for dust
  // alone; input, asset/resize dirtiness and active motion still repaint it.
  ['map','combat','event','shop'].forEach(name=>{G.scenes[name].quietCanvas=true;});
  G.render.woodcutScenes = renderers;
})();
