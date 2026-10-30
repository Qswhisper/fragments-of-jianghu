/* Contextual reading. Rules, purchases and card input stay in their owners. */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('reading') === 'legacy') return;
  const canvas = document.getElementById('game-canvas');
  const layer = document.createElement('div');
  layer.id = 'context-help'; layer.hidden = true;
  document.body.append(layer);
  const mobile = document.createElement('dialog');
  mobile.id = 'context-help-touch'; document.body.append(mobile);
  const delays = { show: 480, lock: 720, leave: 260, term: 280 };
  let candidate = null, current = null, showTimer, lockTimer, leaveTimer, termTimer;
  let locked = false, previousPause = false, pausedByHelp = false, touch = false;
  let openingTouch = false, openingRelease = null;
  let history = [], rootPanel, detailPanel, returnFocus = null;
  const state = () => G.main.getState();
  const el = (tag, cls, text) => {
    const n = document.createElement(tag); if (cls) n.className = cls;
    if (text != null) n.textContent = text; return n;
  };
  const inside = (p, b) => b && !b.hidden && p.x >= (b.hitX ?? b.x) && p.x <= (b.hitX ?? b.x) + (b.hitWidth ?? b.width) && p.y >= (b.hitY ?? b.y) && p.y <= (b.hitY ?? b.y) + (b.hitHeight ?? b.height);
  const row = (title, text) => ({ title, text });
  function rule(title, card) {
    return G.cards.getRuleNotes(card, state()).find(r => r.title === title);
  }
  // Use the same rule notes as the card book, rather than another rules glossary.
  function concept(name) {
    const seeds = {
      '破绽': { flaw: 1 }, '溃烂': { fester: 1 }, '迷眼': { blind: 1 },
      '残废': { crippleTurns: 1 }, '铁骨': { ironBoneBlock: 1 },
      '连环': { comboTag: true }, '架势': { block: 1 }, '抽牌': { draw: 1 }
    };
    if (seeds[name]) {
      const contextual = current?.card && rule(name, current.card);
      const r = contextual || rule(name, seeds[name]);
      // Duration belongs to the actual card/status, never the generic concept.
      const lines = name === '残废' && !contextual ? ['攻击伤害 -25%', '剩余回合见当前状态；重复取较长值'] : r.lines;
      return { title: name, rows: lines.map(t => row('', t)) };
    }
    if (name === '临时费用' && current?.card) {
      const r = rule(name, current.card);
      if (r) return { title: name, rows: r.lines.map(t => row('', t)) };
    }
    if (name === '中毒') return { title:name, rows:[row('', '回合开始失去 ' + G.statusEffects.PLAYER_POISON_DAMAGE + ' 气血；剩余回合 -1。'),row('', '直接失去气血，不由架势抵挡；重复取较长值。')] };
    if (name === '军靴' || name === '北洋军靴') {
      const r = G.relics.definitions.beiyang_boots;
      return { title: r.name, rows: [row('', r.description), row('', '按本场出牌顺序重算；不改变招式原费。')] };
    }
    return null;
  }
  const termPattern = /北洋军靴|临时费用|破绽|溃烂|迷眼|残废|铁骨|连环|中毒|架势|抽牌|军靴/g;
  function rich(n, value, ownTitle) {
    const text = String(value ?? ''); let from = 0;
    for (const m of text.matchAll(termPattern)) {
      n.append(document.createTextNode(text.slice(from, m.index)));
      if (m[0] !== ownTitle && concept(m[0])) {
        const b = el('button', 'help-term', m[0]); b.type = 'button';
        b.setAttribute('aria-label', '解释' + m[0]);
        b.onclick = () => { lock(); openConcept(m[0], b); };
        b.onpointerenter = e => {
          if (e.pointerType === 'touch' || !locked) return;
          clearTimeout(termTimer); termTimer = setTimeout(() => openConcept(m[0], b), delays.term);
        };
        b.onpointerleave = () => clearTimeout(termTimer);
        b.onfocus = () => { if (!touch) lock(); };
        n.append(b);
      } else n.append(document.createTextNode(m[0]));
      from = m.index + m[0].length;
    }
    n.append(document.createTextNode(text.slice(from)));
  }
  function cardInfo(card, offer) {
    const s = state(), source = G.cards.getCardByName(card.name) || card;
    const rows = [row(offer ? '体力 ' + source.cost : '体力 ' + card.cost + (card.playable === false ? ' · 暂不可出' : ''), source.text || card.text)];
    if (offer) rows.unshift(row(offer.sold ? '已售出' : '价钱 ' + offer.price + ' 大洋', offer.sold ? '' : '现有 ' + s.player.gold + ' 大洋' + (s.player.gold < offer.price ? ' · 尚缺 ' + (offer.price - s.player.gold) : ' · 招式加入行囊')));
    for (const r of G.cards.getRuleNotes(card, s)) {
      if (r.title === '临时费用') rows.push(row(r.title, r.lines[0] + ' · ' + (card.relicDiscounted ? '军靴' : '连环') + '\n' + r.lines[1].replace(/^[^：]+：/, '') + '；' + r.lines[2]));
      else if (!(source.text || card.text || '').includes(r.title)) rows.push(row(r.title, r.lines[0]));
    }
    return { title: card.name, card, rows };
  }
  function enemyInfo(enemy) {
    const i = G.render.woodcut.enemyIntent(enemy);
    const rows = [row('气血 ' + enemy.hp + '/' + enemy.maxHp + ' · 架势 ' + (enemy.block || 0), ''), row('将要行动', [i.title, i.note].filter(Boolean).join(' · '))];
    const chips = G.scenes.combat.getEnemyStatusChips(enemy, false);
    if (chips.length) rows.push(row('当前状态', chips.map(c => c.text).join(' · ')));
    const a = G.nemesis.getAdaptationMeta(enemy.currentAdaptation, enemy.nemesisLevel);
    if (a) rows.push(row(a.name, a.description));
    return { title: enemy.name, rows };
  }
  function combatInfo(s) {
    const rows = [row('自身', G.scenes.combat.getPlayerStatusChips(s, s.player).map(c => c.text).join(' · ') || '无额外状态')];
    s.combat.enemies.filter(e => e.hp > 0).forEach(e => {
      const i = G.render.woodcut.enemyIntent(e);
      rows.push(row(e.name, [i.title, ...G.scenes.combat.getEnemyStatusChips(e, false).map(c => c.text)].join(' · ')));
    });
    (s.player.relics || []).map(r => typeof r === 'string' ? G.relics.definitions[r] : r).filter(Boolean).forEach(r => rows.push(row(r.name, r.description)));
    return { title: '战况与旧物', rows };
  }
  function targetAt(clientX, clientY) {
    const s = state(), r = canvas.getBoundingClientRect();
    const p = { x: (clientX - r.x) * 1280 / r.width, y: (clientY - r.y) * 720 / r.height };
    const target = (key, box, info) => ({ key: s.scene + ':' + key, scene: s.scene, box, ...info });
    if (s.scene === 'combat' && s.combat.result === 'active' && !s.combat.selectedCardId && !s.combat.ui?.overlay && !G.render.animations.getCardDrag('combat') && !G.scenes.combat.feedback.isBusy()) {
      const C = G.scenes.combat;
      const b = C.getHandLayoutBoxes(s).filter(b => inside(p, b)).at(-1);
      if (b) { const c = s.combat.hand.find(c => c.id === b.cardId); if (c) return target(c.id, b, cardInfo(c)); }
      const e = C.getEnemyLayoutBoxes(s).find(b => b.enemy.hp > 0 && inside(p, b));
      if (e) return target(e.enemy.id, e, enemyInfo(e.enemy));
      const layout = C.debugGetLayout(), details = layout.combatDetails || layout.playerPanel;
      if (inside(p, details)) return target('details', details, combatInfo(s));
    }
    if (s.scene === 'shop' && s.shop?.mode === 'browse' && !s.reviewPanel && !s.reviewReceipt) {
      const S = G.scenes.shop, L = S.getLayout(), q = s.shop.purchaseSelection;
      for (const type of ['card', 'relic']) {
        const boxes = type === 'card' ? S.getCardBoxes(L) : S.getRelicBoxes(L);
        const offers = type === 'card' ? s.shop.cardOffers : s.shop.relicOffers;
        for (let index = 0; index < boxes.length; index++) {
          // Checkout has moved the chosen item. Never inspect the old stock slot beneath it.
          const b = q ? (q.type === type && q.index === index ? (type === 'card' ? { x:210,y:185,width:244,height:361 } : { x:200,y:232,width:270,height:250 }) : null) : boxes[index];
          const o = offers[index];
          if (!o || !inside(p, b)) continue;
          const info = type === 'card' ? cardInfo(o, o) : { title: o.name, rows: [row(o.sold ? '已售出' : '价钱 ' + o.price + ' 大洋', o.sold ? '' : '现有 ' + s.player.gold + ' 大洋' + (s.player.gold < o.price ? ' · 尚缺 ' + (o.price - s.player.gold) : ' · 收下即生效')), row('旧物', o.description || o.text)] };
          return target(type + index, b, info);
        }
      }
    }
    return null;
  }
  function panel(info, isDetail = false) {
    const section = el('section', 'help-panel' + (isDetail ? ' help-detail' : ''));
    section.setAttribute('aria-label', info.title); section.setAttribute('role', 'region');
    const header = el('header', 'help-header'), h = el('h2', '', info.title), controls = el('div', 'help-controls');
    if (touch || isDetail) {
      const back = el('button', 'help-action help-back', '返回'); back.type = 'button'; back.onclick = goBack;
      controls.append(back);
    } else {
      const pin = el('button', 'help-action help-pin', locked ? '已锁定' : '锁定'); pin.type = 'button'; pin.onclick = () => lock(); controls.append(pin);
    }
    const close = el('button', 'help-action help-close', '×'); close.type = 'button'; close.setAttribute('aria-label', '关闭说明'); close.onclick = () => dismiss(true); controls.append(close);
    header.append(h, controls); section.append(header);
    const body = el('div', 'help-body');
    // The source card stays on the table/hand. Reading explains it without
    // duplicating its illustration or turning a tooltip into another card page.
    const list = el('dl', 'help-rows');
    for (const r of info.rows) {
      const group = el('div', 'help-row' + (/^(体力|价钱|已售出|气血)/.test(r.title) ? ' help-primary' : ''));
      if (r.title) { const dt = el('dt'); rich(dt, r.title, isDetail ? info.title : null); group.append(dt); }
      if (r.text) { const dd = el('dd'); rich(dd, r.text, isDetail ? info.title : null); group.append(dd); }
      list.append(group);
    }
    body.append(list); section.append(body);
    if (!touch && !isDetail) section.append(el('footer', 'help-dwell', locked ? 'Esc 返回' : '停留锁定'));
    return section;
  }
  function place() {
    if (!current || touch) return;
    const c = canvas.getBoundingClientRect(), scale = Math.min(c.width / 1280, 1.15);
    layer.style.setProperty('--help-scale', scale);
    const width = Math.min(Math.max(300, 340 * scale), innerWidth - 24);
    rootPanel.style.width = width + 'px';
    rootPanel.style.maxHeight = (innerHeight - 24) + 'px';
    const b = current.box || {x:480,y:500,width:320,height:180};
    const source = {left:c.x+b.x*c.width/1280, right:c.x+(b.x+b.width)*c.width/1280, top:c.y+b.y*c.height/720, bottom:c.y+(b.y+b.height)*c.height/720};
    const h = rootPanel.getBoundingClientRect().height, gap = 14;
    let left, top;
    if (current.card || current.scene === 'shop') {
      left = (source.left + source.right - width) / 2;
      // Hand cards sit below the figures. Keep their note in the open lane
      // between the two bodies rather than directly over the player's face.
      if (current.scene === 'combat' && current.card) left = Math.max(c.x + c.width * .35, Math.min(left, c.x + c.width * .69 - width));
      if (current.scene === 'shop') left = Math.max(c.x + c.width * .23, left);
      top = source.top - h - gap;
      if (top < 12) { left = source.right + gap; top = source.top; }
    } else {
      left = source.right + gap;
      if (left + width > innerWidth - 12) left = source.left - width - gap;
      top = source.top + 24 * scale;
    }
    rootPanel.style.left = Math.max(12, Math.min(left, innerWidth - width - 12)) + 'px';
    rootPanel.style.top = Math.max(12, Math.min(top, innerHeight - h - 12)) + 'px';
    if (detailPanel) {
      const r = rootPanel.getBoundingClientRect(), dw = Math.min(Math.max(270, 290 * scale), innerWidth - 24);
      detailPanel.style.width = dw + 'px';
      detailPanel.style.maxHeight = (innerHeight - 24) + 'px';
      const dh = detailPanel.getBoundingClientRect().height;
      let dx = r.right + gap, dy = r.top;
      // Enemy queries expand towards the empty middle/left, away from the face,
      // intent seal and status slips that the player is explaining.
      if (!current.card && current.scene === 'combat' && r.left - dw - gap >= 12) { dx = r.left - dw - gap; dy = Math.max(12, c.y + 12); }
      if (dx + dw > innerWidth - 12) dx = r.left - dw - gap;
      if (dx < 12) { dx = r.left; dy = r.top - dh - gap >= 12 ? r.top - dh - gap : r.bottom + gap; }
      detailPanel.style.left = Math.max(12, Math.min(dx, innerWidth - dw - 12)) + 'px';
      detailPanel.style.top = Math.max(12, Math.min(dy, innerHeight - dh - 12)) + 'px';
    }
    for (const p of [rootPanel, detailPanel].filter(Boolean)) {
      p.style.maxHeight = Math.max(100, innerHeight - parseFloat(p.style.top) - 12) + 'px';
    }
  }
  function lock() {
    if (!current || locked) return;
    if (G.main.isPaused() || document.querySelector('#journey-dialog[open]')) { dismiss(); return; }
    locked = true; clearTimeout(lockTimer); layer.classList.add('help-locked');
    previousPause = G.main.isPaused(); pausedByHelp = true; G.main.setPaused(true);
    rootPanel?.querySelector('.help-pin')?.replaceChildren(document.createTextNode('已锁定'));
    const footer = rootPanel?.querySelector('.help-dwell'); if (footer) footer.textContent = 'Esc 返回';
  }
  function open(target, touchMode = false) {
    const held = touchMode && G.main.getPointer().isDown;
    dismiss(); current = target; candidate = target; touch = touchMode; openingTouch = held; history = [];
    rootPanel = panel(target);
    if (touch) {
      returnFocus = document.activeElement; previousPause = G.main.isPaused(); pausedByHelp = true;
      G.main.setPaused(true); locked = true; mobile.replaceChildren(rootPanel); mobile.showModal();
      rootPanel.querySelector('.help-close').focus({ preventScroll:true });
    } else {
      layer.hidden = false; layer.classList.remove('help-locked'); layer.replaceChildren(rootPanel); place();
      lockTimer = setTimeout(() => {
        if (current && state().scene === current.scene && !G.main.getPointer().isDown) lock();
        else dismiss();
      }, delays.lock);
    }
  }
  function openConcept(name, sourceButton) {
    if (!current || (!locked && !touch)) return;
    const info = concept(name); if (!info || history.at(-1)?.info.title === info.title) return;
    history.push({ info, sourceButton });
    renderDetail();
  }
  function renderDetail() {
    clearTimeout(termTimer);
    const last = history.at(-1);
    if (touch) {
      rootPanel = panel(last?.info || current, !!last); mobile.replaceChildren(rootPanel);
      if (last) rootPanel.prepend(el('p', 'help-trail', [current.title, ...history.slice(0,-1).map(h => h.info.title)].join(' › ')));
      rootPanel.querySelector('.help-back').focus({ preventScroll:true }); return;
    }
    detailPanel?.remove(); detailPanel = last ? panel(last.info, true) : null;
    if (detailPanel) {
      detailPanel.prepend(el('p', 'help-trail', [current.title, ...history.slice(0, -1).map(h => h.info.title)].join(' › ')));
      layer.append(detailPanel);
    }
    place();
  }
  function goBack() {
    if (!history.length) { dismiss(true); return; }
    const previous = history.pop(); renderDetail();
    if (previous.sourceButton?.isConnected) previous.sourceButton.focus({ preventScroll:true });
  }
  function dismiss(focus = false) {
    [showTimer, lockTimer, leaveTimer, termTimer].forEach(clearTimeout);
    if (mobile.open) mobile.close();
    layer.hidden = true; layer.replaceChildren();
    if (pausedByHelp) G.main.setPaused(previousPause);
    if (focus && touch && returnFocus?.isConnected) returnFocus.focus({ preventScroll:true });
    current = candidate = rootPanel = detailPanel = null;
    locked = pausedByHelp = touch = openingTouch = false; history = [];
  }
  function corridor(x, y) {
    if (!current || !rootPanel) return false;
    const c = canvas.getBoundingClientRect(), b = current.box, r = rootPanel.getBoundingClientRect();
    const source = { left:c.x+b.x*c.width/1280, right:c.x+(b.x+b.width)*c.width/1280, top:c.y+b.y*c.height/720, bottom:c.y+(b.y+b.height)*c.height/720 };
    // Bounded bridge from the source to the reading group. It never switches targets mid-route.
    return x >= Math.min(source.left,r.left)-12 && x <= Math.max(source.right,r.right)+12 && y >= Math.min(source.top,r.top)-12 && y <= Math.max(source.bottom,r.bottom)+12;
  }
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || touch) return;
    if (layer.contains(e.target)) { clearTimeout(leaveTimer); return; }
    if (current && locked) return;
    if (e.buttons || G.main.isPaused() || e.target !== canvas || !G.render.journeyMotion.acceptsInput()) {
      if (!current) { clearTimeout(showTimer); candidate = null; }
      else if (!corridor(e.clientX,e.clientY)) { clearTimeout(leaveTimer); leaveTimer = setTimeout(dismiss, delays.leave); }
      return;
    }
    const t = targetAt(e.clientX,e.clientY);
    if (current && (t?.key === current.key || corridor(e.clientX,e.clientY))) { clearTimeout(leaveTimer); return; }
    if (t?.key === candidate?.key) return;
    dismiss(); candidate = t;
    if (t) showTimer = setTimeout(() => {
      if (candidate?.key === t.key && !G.main.isPaused() && !G.main.getPointer().isDown) open(t);
    }, delays.show);
  });
  document.addEventListener('pointerdown', e => {
    if (!layer.contains(e.target) && !mobile.contains(e.target)) dismiss();
    else if (!touch) lock();
  }, true);
  // A held finger may now be above a new Back/Close button. Its release belongs
  // to the original long-press, never to a control that appeared underneath it.
  document.addEventListener('pointerup', e => {
    if (!openingTouch || e.pointerType !== 'touch') return;
    openingTouch = false;
    openingRelease = { id:e.pointerId, x:e.clientX, y:e.clientY, until:performance.now()+350 };
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  document.addEventListener('click', e => {
    if (!openingRelease || performance.now() > openingRelease.until || !e.detail) return;
    if (e.pointerId === openingRelease.id || (e.pointerId == null && Math.hypot(e.clientX-openingRelease.x,e.clientY-openingRelease.y)<12)) {
      openingRelease = null; e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);
  layer.addEventListener('pointerenter', lock, true);
  document.addEventListener('keydown', e => {
    if (!current) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); goBack(); }
    else if (e.code === 'KeyP') { e.preventDefault(); e.stopImmediatePropagation(); dismiss(true); }
  }, true);
  mobile.addEventListener('cancel', e => { e.preventDefault(); goBack(); });
  mobile.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('blur', () => dismiss());
  window.addEventListener('resize', () => dismiss());
  document.addEventListener('visibilitychange', () => { if (document.hidden) dismiss(); });
  G.contextHelp = {
    enabled: true,
    isOpen: () => !!current,
    back() { if (!current) return false; goBack(); return true; },
    close: dismiss,
    inspectTouch(target, point) {
      const s = state(); let t = point && targetAt(point.x, point.y);
      if (!t && s.scene === 'combat' && s.combat.result === 'active' && !G.scenes.combat.feedback.isBusy()) {
        if (target.card && s.combat.hand.some(c => c.id === target.card.id)) t = { scene:s.scene,key:'combat:' + target.card.id,...cardInfo(target.card) };
        else if (target.enemy?.hp > 0) t = { scene:s.scene,key:'combat:' + target.enemy.id,...enemyInfo(target.enemy) };
      }
      if (!t && s.scene === 'combat' && target.heading === '战况与旧物') t = { scene:s.scene,key:'combat:details',...combatInfo(s) };
      if (!t) return false;
      open(t, true); return true;
    }
  };
})();
