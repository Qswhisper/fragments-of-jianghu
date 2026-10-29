window.G = window.G || {};
G.render = G.render || {};

(function () {
  'use strict';
  const colors = { ink: '#171510', panel: '#242019', raised: '#393025', paper: '#baa88a', text: '#e0d3b9', muted: '#a59780', line: '#62513c', red: '#762d24', danger: '#d49b78', green: '#afa985' };
  const heritageCard = G.render.ui.drawCardSlot;
  let cardPaints = 0, cardHits = 0, fontRevision = 0;
  document.fonts?.addEventListener('loadingdone', () => { fontRevision += 1; });
  const font = '"KGame Sans", sans-serif';
  const serif = '"KGame Ink", "KGame Song", serif';
  const root = 'assets/woodcut/';
  const imageIds = new WeakMap();
  let nextImageId = 0;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const inside = (p, b) => p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
  const hovered = b => G.main && inside(G.main.getPointer(), b);
  function text(ctx, value, x, y, size = 16, color = colors.text, align = 'left', weight = 500, title = false) {
    if(G.render.sceneEntry?.active()&&G.render.sceneEntry.text(ctx,x,y,()=>text(ctx,value,x,y,size,color,align,weight,title)))return;
    ctx.save(); ctx.font = weight + ' ' + size + 'px ' + (title ? serif : font);
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(String(value ?? ''), x, y); ctx.restore();
  }
  function wrap(ctx, value, x, y, width, size = 16, color = colors.text, maxLines = 8) {
    if(G.render.sceneEntry?.active()&&G.render.sceneEntry.text(ctx,x,y,()=>wrap(ctx,value,x,y,width,size,color,maxLines)))return;
    ctx.save(); ctx.font = '500 ' + size + 'px ' + font; ctx.textBaseline = 'top'; ctx.fillStyle = color;
    let lines;
    if(G.render.journeyTypesetting&&G.main?.getSceneName()!=='combat')lines=G.render.journeyTypesetting.lines(ctx,value,width);
    else {
    lines = []; let line = '';
    for (const ch of String(value ?? '')) {
      if (ch === '\n' || (line && ctx.measureText(line + ch).width > width && !/[，。、；：！？）】》]/.test(ch))) { lines.push(line); line = ch === '\n' ? '' : ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    }
    lines.slice(0, maxLines).forEach((row, i) => ctx.fillText(i === maxLines - 1 && lines.length > maxLines ? row.slice(0, -1) + '…' : row, x, y + i * (size + 7)));
    ctx.restore(); return Math.min(lines.length, maxLines) * (size + 7);
  }
  function panel(ctx, b, options = {}) {
    ctx.save(); ctx.globalAlpha *= options.alpha ?? .94;
    // Slightly uneven ink-paper edge; no dashboard outline or corner hatching.
    ctx.beginPath(); ctx.moveTo(b.x + 3, b.y + 2); ctx.lineTo(b.x + b.width * .38, b.y);
    ctx.lineTo(b.x + b.width - 2, b.y + 3); ctx.lineTo(b.x + b.width, b.y + b.height * .55);
    ctx.lineTo(b.x + b.width - 4, b.y + b.height - 2); ctx.lineTo(b.x + b.width * .61, b.y + b.height);
    ctx.lineTo(b.x + 1, b.y + b.height - 3); ctx.closePath();
    ctx.fillStyle = options.light ? colors.paper : (options.fill || colors.panel); ctx.fill(); ctx.clip();
    G.render.assets.drawImageCover(ctx, 'assets/ui/combat_panel_rotten_wood_plank_gpt4ovip_01.png', b.x, b.y, b.width, b.height, { alpha: .18 });
    const wash = ctx.createLinearGradient(0, b.y, 0, b.y + b.height);
    wash.addColorStop(0, 'rgba(8,6,4,.08)'); wash.addColorStop(1, 'rgba(8,6,4,.45)'); ctx.fillStyle = wash; ctx.fillRect(b.x,b.y,b.width,b.height);
    if (options.active) { ctx.fillStyle = 'rgba(165,125,71,.16)'; ctx.fillRect(b.x,b.y,b.width,b.height); }
    ctx.restore();
  }
  function button(ctx, b, label, options = {}) {
    const motion=G.render.journeyMotion;
    if(motion) { motion.surface(ctx,'button:'+b.x+':'+b.y,b,{enabled:!options.disabled,distance:9},()=>paintButton(ctx,b,label,options)); return; }
    paintButton(ctx,b,label,options);
  }
  function paintButton(ctx, b, label, options = {}) {
    const active = !options.disabled && (hovered(b) || options.selected);
    ctx.save(); ctx.globalAlpha *= options.disabled ? .48 : 1;
    G.render.assets.drawCombatPanelSurface(ctx, b.x, b.y, b.width, b.height, { hideNails: true, overlayAlpha: active ? .12 : .4, stroke: 'rgba(69,45,27,.5)', highlight: 'rgba(173,130,77,.05)' });
    if (options.primary || active) { ctx.fillStyle = 'rgba(119,37,26,' + (active ? '.36' : '.16') + ')'; ctx.fillRect(b.x + 4,b.y + 4,b.width - 8,b.height - 8); }
    ctx.restore();
    G.render.ui.drawLabel(ctx,label,b.x+b.width/2,b.y+b.height/2-(options.subtitle?9:0),{size:options.size||20,color:options.disabled?'#73817f':colors.text,align:'center',weight:600,fontFamily:serif,opticalCenter:true,shadow:false});
    if (options.subtitle) G.render.ui.drawLabel(ctx,options.subtitle,b.x+b.width/2,b.y+b.height/2+17,{size:12,color:colors.muted,align:'center',weight:500,fontFamily:font,opticalCenter:true,shadow:false});
  }
  function image(ctx, name, b, cover = false, alpha = 1) {
    const entry = G.render.assets.getImageEntry(name.includes('/') ? name : root + name + '.png');
    if (!entry?.loaded || entry.failed) return false;
    const img = entry.image, scale = (cover ? Math.max : Math.min)(b.width / img.width, b.height / img.height);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.rect(b.x, b.y, b.width, b.height); ctx.clip();
    ctx.drawImage(img, b.x + (b.width - img.width * scale) / 2, b.y + (b.height - img.height * scale) / 2, img.width * scale, img.height * scale); ctx.restore(); return true;
  }
  function figureGeometry(name,b,flip=false){
    const path=name.includes('/')?name:root+name+'.png',entry=G.render.assets.getImageEntry(path);
    if(!entry?.loaded||entry.failed)return null;
    const key=path.split('/').pop().replace(/\.png$/,''),original=G.render.portraitFrames?.[key];
    const frame=original?.dynamic&&b.slotRole?{...original,bottom:Math.min(original.bottom||1,{front:.94,mid:.97,rear:1}[b.slotRole]||1)}:original;
    const top=Math.round(entry.image.height*(frame?.top||0)),bottom=Math.round(entry.image.height*(frame?.bottom||1));
    const scale=Math.min(b.width/entry.image.width,b.height/(bottom-top)),width=entry.image.width*scale,height=(bottom-top)*scale;
    return {path,entry,frame,top,bottom,scale,width,height,x:b.x+(b.width-width)/2,y:b.y,flip};
  }
  function figure(ctx, name, b, flip = false) {
    const path = name.includes('/') ? name : root + name + '.png', entry = G.render.assets.getImageEntry(path);
    if (!entry?.loaded || entry.failed) return false;
    const geometry=figureGeometry(name,b,flip),{frame,top,bottom,width,height}=geometry,filter=ctx.filter;
    // Reflow changes the destination continuously; retain one source raster
    // instead of allocating a fresh portrait/matte for every animation frame.
    const rasterScale=b.moving?310/height:1,rasterWidth=Math.ceil(width*rasterScale),rasterHeight=Math.ceil(height*rasterScale);
    if(!imageIds.has(entry.image))imageIds.set(entry.image,++nextImageId);
    const cached=G.render.canvasUtils.cachedLayer('figure:'+path+':'+imageIds.get(entry.image)+':'+filter+':'+JSON.stringify(frame||{}),rasterWidth,rasterHeight,G.render.canvasUtils.density(ctx),brush=>{
      // Build the alpha matte on the destination raster grid. A source-sized
      // mask retained tens of MiB per portrait and added large raster work.
      const layer=G.render.canvasUtils.createLayer(rasterWidth,rasterHeight,G.render.canvasUtils.density(ctx));
      const matte=layer.getContext('2d');matte.drawImage(entry.image,0,top,entry.image.width,bottom-top,0,0,rasterWidth,rasterHeight);
      const fade = matte.createLinearGradient(0,0,0,rasterHeight);
      fade.addColorStop(0,'rgba(0,0,0,1)'); fade.addColorStop(frame?.fadeStart||.78,'rgba(0,0,0,1)'); fade.addColorStop(1,'rgba(0,0,0,0)');
      matte.globalCompositeOperation = 'destination-in'; matte.fillStyle = fade; matte.fillRect(0,0,rasterWidth,rasterHeight);
      brush.filter=filter;brush.drawImage(layer,0,0,rasterWidth,rasterHeight);
    });
    ctx.save(); if (flip) { ctx.translate(b.x * 2 + b.width,0); ctx.scale(-1,1); }
    ctx.filter='none';ctx.drawImage(cached,b.x + (b.width - width) / 2,b.y,width,height); ctx.restore(); return true;
  }
  function background(ctx, kind = 'gate', dim = .38) {
    ctx.fillStyle = colors.ink; ctx.fillRect(0, 0, 1280, 720);
    image(ctx, 'background-' + kind, { x: 0, y: 0, width: 1280, height: 720 }, true);
    ctx.fillStyle = 'rgba(10,19,24,' + dim + ')'; ctx.fillRect(0, 0, 1280, 720);
    const shade = ctx.createLinearGradient(0, 0, 0, 720); shade.addColorStop(0, 'rgba(7,14,18,.66)'); shade.addColorStop(.4, 'rgba(7,14,18,0)'); shade.addColorStop(1, 'rgba(7,14,18,.9)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, 1280, 720);
  }
  function header(ctx, title, subtitle, state) {
    text(ctx, title, 40, 43, 30, colors.text, 'left', 600, true);
    if (subtitle) text(ctx, subtitle, 40, 78, 14, colors.muted);
    if (state?.player) {if(G.render.journeyMaterials)G.render.journeyMaterials.ledger(ctx,state,{x:690,y:15,width:500,compact:true});else text(ctx, '气血 ' + state.player.hp + '/' + state.player.maxHp + '    大洋 ' + state.player.gold, 1152, 43, 15, colors.paper, 'right');}
  }
  function footer(ctx, value) { wrap(ctx, value, 40, 686, 1180, 13, colors.muted, 1); }
  function bar(ctx, b, value, max, color = colors.red) {
    ctx.fillStyle = '#201914'; ctx.fillRect(b.x, b.y + 2, b.width, Math.max(3,b.height - 4));
    const fill = b.width * clamp(value / Math.max(1, max), 0, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(b.x,b.y,fill,b.height); ctx.clip();
    ctx.fillStyle = color; ctx.fillRect(b.x,b.y + 1,b.width,b.height - 2);
    G.render.assets.drawImageCover(ctx,'assets/ui/combat_health_blood_brush_gpt4ovip_transparent_02_cropped.png',b.x,b.y,b.width,b.height,{alpha:.8}); ctx.restore();
  }
  function cardArt(card) {
    const source = card.sourceCard || card;
    const def = G.cards.getCardByName(card.name || source.name) || source;
    if (card.art || card.artPath || source.art || source.artPath) return { art: card.art || source.art, artPath: card.artPath || source.artPath, cardId: def.id };
    const manifest = window.KGAME_CARD_ART_MANIFEST.cards;
    let id = def.id;
    // Unillustrated cards share an explicitly chosen action-family image until unique art is produced.
    if (!manifest[id]) id = def.consumeFlaw ? 'blade_sacrifice' : (def.flaw ? 'blade_quick_cut' : (def.fester || def.blind ? 'dirty_lime_throw' : (def.block && !def.damage ? 'basic_defend' : (def.hits > 1 ? 'combo_chain_punch' : 'basic_strike'))));
    return { cardId: id, art: manifest[id] };
  }
  function card(ctx, config) {
    const motion=G.render.journeyMotion;
    if(motion&&!config.skipMotion&&G.main?.getSceneName()!=='combat') { motion.surface(ctx,'card:'+config.x+':'+config.y,config,{distance:24,angle:-.025,enabled:config.playable!==false},()=>paintCard(ctx,config)); return; }
    paintCard(ctx,config);
  }
  function cardSourceCacheIdentity(source,depth=0) {
    if(!source||typeof source!=='object'||depth>4)return source;
    const identity={...source};
    // A newly dealt hand gives the same printed card a fresh instance serial.
    // Keep template IDs/art/visual fields; omit only those serials from the key.
    if(typeof identity.id==='string'&&/^card_\d+_/.test(identity.id))delete identity.id;
    if(identity.sourceCard&&identity.sourceCard!==source)identity.sourceCard=cardSourceCacheIdentity(identity.sourceCard,depth+1);
    return identity;
  }
  function paintCard(ctx, config) {
    const resolved = cardArt(config), def = G.cards.getCardByName(config.name) || {};
    const artPath = resolved.artPath || (typeof resolved.art === 'string' ? resolved.art : resolved.art?.path);
    // Touch the source even when the card's raster is reused, keeping visible art in the bounded media cache.
    if(artPath)G.render.assets.getImageEntry(artPath);
    const card = { ...def, ...config, artPath, sourceCard: { ...def, ...(config.sourceCard || {}), artPath }, showFooterTokens: false };
    // Combat feedback keeps legacy per-operation fades. Scene entry explicitly
    // fades a cached complete card so it does not repaint paper/text each frame.
    const fixedAlpha=card.cacheFixedAlpha===true;
    const entryGroup=ctx.canvas.id==='game-canvas'&&G.render.sceneEntry?.cacheGroups&&G.render.sceneEntry.inPart();
    if (config.skipCache || (!fixedAlpha&&typeof card.alpha==='number'&&card.alpha!==1) || (!entryGroup&&ctx.globalAlpha!==1) || document.fonts?.status === 'loading' || (ctx.filter && ctx.filter !== 'none')) { readableCard(ctx,card); return; }
    const utils=G.render.canvasUtils,density=utils.density(ctx),transformed=!!(card.rotation||card.scale);
    const originX=transformed?-card.width/2:card.x,originY=transformed?-card.height/2:card.y;
    const padding=Math.max(32,(card.shadowBlur||8)*2+Math.abs(card.shadowOffsetX||2)+Math.abs(card.shadowOffsetY||4),(card.glowBlur||12)*2+4);
    const local={...card,x:originX,y:originY,rotation:0,scale:1,alpha:fixedAlpha?card.alpha:1};
    delete local.skipMotion; delete local.skipCache;
    const identity={...local,sourceCard:cardSourceCacheIdentity(local.sourceCard)};
    const key='card:'+fontRevision+':'+JSON.stringify(Object.keys(identity).sort().map(field=>[field,identity[field]]));
    let painted=false;
    const layer=utils.cachedLayer(key,card.width+padding*2,card.height+padding*2,density,brush=>{
      painted=true;cardPaints++;brush.translate(padding-originX,padding-originY);readableCard(brush,local);
    });
    if(!painted)cardHits++;
    ctx.save();if(!fixedAlpha&&typeof card.alpha==='number')ctx.globalAlpha*=Math.max(0,Math.min(1,card.alpha));
    if(transformed){ctx.translate(card.x+card.width/2,card.y+card.height/2);ctx.rotate(card.rotation||0);ctx.scale(card.scale||1,card.scale||1);}
    ctx.drawImage(layer,originX-padding,originY-padding,card.width+padding*2,card.height+padding*2);ctx.restore();
  }
  function readableCard(ctx, card) {
    // Enlarge the whole ink/card treatment together, rasterized at display density.
    // Enlarging the paper alone would leave the original 11.5px rules unchanged.
    if (!window.KGAME_MOBILE || card.artRole!=='combat' || card.width<=126) { heritageCard(ctx,card); return; }
    const ratio=card.width/126;
    ctx.save();ctx.translate(card.x+card.width/2,card.y+card.height/2);ctx.rotate(card.rotation||0);ctx.scale((card.scale||1)*ratio,(card.scale||1)*ratio);
    heritageCard(ctx,{...card,x:-63,y:-card.height/ratio/2,width:126,height:card.height/ratio,rotation:0,scale:1});ctx.restore();
  }
  function gunPose(enemy) {
    const d = enemy.intentData || {}, label = enemy.intentLabel || '';
    if (d.gunPose) return d.gunPose;
    if (/刺刀|连刺/.test(label) || enemy.behavior === 'bayonet_scout') return 'bayonet';
    if (/装|整枪|架枪/.test(label) || (enemy.intent === 'block' && /rifle|mack|gun/.test(enemy.behavior || ''))) return 'reload';
    return 'aim';
  }
  function enemyIntent(enemy) {
    const d = enemy.intentData || {}, title = enemy.intentLabel || '蓄势';
    if(enemy.behavior==='nemesis'&&d.firearm){
      const threat=G.nemesis.getFirearmThreat(enemy),stepsUntilShot=Math.max(0,threat.steps.length-1-(enemy.ai?.cycleIndex||0));
      const defense=d.damage?(d.pierceRatio>=1?'无视架势':'架势抵挡减半'):(threat.pierceRatio>=1?'无视架势':'架势抵挡减半');
      return {title:title+(d.damage?'  '+enemy.intentValue:''),note:d.damage?'本回合开火 · '+defense:stepsUntilShot+'拍后开火 · '+defense,danger:!!d.damage};
    }
    if (d.previewDamage && !d.damage) return { title, note: '蓄势 · 下回合射击', danger: false };
    if (d.firearm && d.damage) return { title: title + '  ' + enemy.intentValue, note: d.pierceRatio >= 1 ? '本回合开火 · 无视架势' : (d.pierceRatio ? '本回合开火 · 无视'+Math.round(d.pierceRatio*100)+'%架势' : '本回合开火 · 可用架势抵挡'), danger: true };
    // A weapon pose does not cancel the attack actually scheduled this turn.
    const consequences=[];
    if(d.poisonTurns)consequences.push('中毒'+d.poisonTurns+'回合','每回合失3血');
    if(d.pierceRatio)consequences.push(d.pierceRatio>=1?'无视架势':'无视'+Math.round(d.pierceRatio*100)+'%架势');
    if(d.damage&&d.block)consequences.push('并获'+d.block+'架势');
    if(d.summonTemplateId){
      const reinforcement=G.enemies.definitions[d.summonTemplateId];
      consequences.push('未满3人时','援兵入场即攻'+(reinforcement?.attack||0));
    }
    if(consequences.length||d.damage)return {title:title+(enemy.intentValue?'  '+enemy.intentValue:''),note:consequences.join(' · '),danger:!!(d.damage||d.poisonTurns||d.summonTemplateId)};
    if (d.firearmPrep || gunPose(enemy) === 'reload') return { title: title + (d.block ? '  +' + d.block + ' 架势' : ''), note: '本回合不射击', danger: false };
    return { title: title + (enemy.intentValue ? '  ' + enemy.intentValue : ''), note: '', danger: enemy.intent === 'attack' };
  }
  function enemyArt(enemy) {
    const key = [enemy.behavior, enemy.templateId, enemy.id, enemy.firearmStage, enemy.intentLabel].join(' ');
    if (/rifle|bayonet|mack|musket|gun|pistol|firearm|枪|射击|装填|瞄准/i.test(key)) {
      const pose = gunPose(enemy);
      return pose === 'aim' ? 'enemy-rifle-front-v3' : 'enemy-rifle-' + pose + '-v3';
    }
    if (/boxer|拳|monk|iron/i.test(key)) return 'enemy-boxer-front-v3';
    return 'enemy-blade-front-v3';
  }
  G.render.woodcut = { colors, font, text, wrap, panel, button, image, figure, figureGeometry, background, header, footer, bar, card, cardArt, hovered, inside, enemyArt, enemyIntent, gunPose, materialRevision: 2 };
  G.render.woodcut.getCardCacheDebug = () => ({paints:cardPaints,hits:cardHits});
  G.render.woodcut.getFigureCacheDebug = () => ({sourceLayers:0,sourceBytes:0,rasterCache:G.render.canvasUtils.getLayerCacheDebug()});
  G.render.ui.drawCardSlot = card;
  G.render.ui.drawHandTray = function () {};
  ['assets/ui/title_menu_background_gpt4ovip_01.png','assets/ui/combat_panel_rotten_wood_plank_gpt4ovip_01.png','assets/ui/combat_card_torn_rice_paper_gpt4ovip_transparent_01.png','assets/ui/combat_end_turn_rosewood_block_gpt4ovip_01.png','assets/ui/combat_health_blood_brush_gpt4ovip_transparent_02_cropped.png','assets/ui/combat_intent_seal_circle_gpt4ovip_01.png','assets/ui/combat_card_red_stamp_gpt4ovip_transparent_02_cropped.png'].forEach(path => G.render.assets.getImageEntry(path));
  ['background-gate','background-market','background-temple','player-blade','player-iron','player-dirty','player-combo'].forEach(name => G.render.assets.getImageEntry(root + name + '.png'));
  ['player-blade-rear-v3','player-iron-rear-v3','player-dirty-rear-v3','player-combo-rear-v3','enemy-blade-front-v3','enemy-rifle-front-v3','enemy-rifle-reload-v3','enemy-rifle-bayonet-v3','enemy-boxer-front-v3'].forEach(name => G.render.assets.getImageEntry(root + name + '.png'));
})();

