/* Review-only presentation. Reuses preserved RGBA portraits, never their old panels. */
(function () {
  'use strict';
  const W = G.render.woodcut, A = G.render.assets, root = 'assets/portraits/';
  const players = {
    blade: 'player_blade_form_battlecamera_20260330_v18b.png',
    iron: 'player_iron_form_battlecamera_20260330_v18b.png',
    dirty: 'player_dirty_form_battlecamera_20260330_v18c.png',
    combo: 'player_combo_form_battlecamera_20260330_v18e.png'
  };
  const enemies = {
    routed_qing_soldier: 'enemy_routed_qing_soldier_gpt4ovip_01.png',
    simple: 'enemy_simple_blade_gpt4ovip_01.png',
    boxer: 'enemy_boxer_gpt4ovip_01.png',
    boxer_leader: 'enemy_boxer_leader_gpt4ovip_01.png',
    city_tracker: 'enemy_city_tracker_gpt4ovip_01.png',
    guard_chief: 'enemy_guard_chief_gpt4ovip_01.png',
    boss_guard_chief: 'enemy_guard_chief_gpt4ovip_01.png',
    foreign_scout: 'enemy_bayonet_scout_gpt4ovip_01.png',
    rifle_scout: 'enemy_rifle_scout_gpt4ovip_01.png',
    bayonet_scout: 'enemy_bayonet_scout_gpt4ovip_01.png',
    elite_mack: 'enemy_act1_elite_mack_gpt15_02.png',
    mack: 'enemy_act1_elite_mack_gpt15_02.png',
    nemesis: 'nemesis_main_portrait_01.png'
  };
  const background = 'assets/ui/combat_background_checkpoint_gpt15_01.png';
  let stageLayer, sceneStageLayer, sceneStageKey, stageImage, stageRevision=0;
  function stage(ctx,state) {
    const place=G.render.journeyArt?.place(state),background=place?.path||'assets/ui/combat_background_checkpoint_gpt15_01.png';
    if(state?.scene==='reward'&&place?.rewardPath){
      ctx.fillStyle='#101619';ctx.fillRect(0,0,1280,720);
      A.drawImageCover(ctx,place.rewardPath,0,0,1280,720);return;
    }
    const entry = A.getImageEntry(background);
    if (!entry.loaded) { ctx.fillStyle = '#121519'; ctx.fillRect(0,0,1280,720); return; }
    const density=G.render.canvasUtils.density(ctx);
    if (!stageLayer || stageLayer.renderScale!==density || stageImage!==entry.image) {
      stageImage=entry.image;stageRevision++;sceneStageKey=null;
      stageLayer = G.render.canvasUtils.createLayer(1280,720,density);
      const c = stageLayer.getContext('2d');
      c.save(); c.filter = place&&place.id!=='act1-street'?'saturate(.65) brightness(.58) blur(.6px)':'saturate(.48) brightness(.35) blur(.6px)';
      A.drawImageCover(c,background,0,0,1280,720,{focusX:.5,focusY:.46}); c.restore();
      // Dim the architecture; feathered local light below isolates the opposing silhouettes.
      c.fillStyle = 'rgba(15,22,29,.19)'; c.fillRect(0,0,1280,720);
      const edge = c.createRadialGradient(663,325,155,640,340,760);
      edge.addColorStop(0,'rgba(5,8,11,.10)'); edge.addColorStop(.62,'rgba(5,8,11,.40)'); edge.addColorStop(1,'rgba(4,6,8,.92)');
      c.fillStyle = edge; c.fillRect(0,0,1280,720);
      const ground = c.createLinearGradient(0,390,0,720);
      ground.addColorStop(0,'rgba(6,8,10,0)'); ground.addColorStop(.47,'rgba(6,8,10,.70)'); ground.addColorStop(1,'rgba(5,7,9,.96)');
      c.fillStyle = ground; c.fillRect(0,390,1280,330);
    }
    const boxes=state?G.scenes.combat.getEnemyLayoutBoxes(state).filter(b=>b.enemy.hp>0):[];
    function paint(brush){
      brush.drawImage(stageLayer,0,0,1280,720);
      mist(brush,327,321,187,240,'150,127,91',.23);
      boxes.forEach(b=>mist(brush,b.x+b.width/2,b.y+b.height*.43,Math.min(166,b.width*.73),b.height*.58,'168,151,120',.34));
    }
    // Static architecture and local light share one opaque raster. Target
    // stagger keeps the direct path, without retaining a layer for every offset.
    if(!G.render.canvasUtils.paintCacheEnabled || boxes.some(b=>(b.baseX!==undefined&&b.x!==b.baseX)||(b.baseY!==undefined&&b.y!==b.baseY))){paint(ctx);return;}
    const key=JSON.stringify([stageRevision,density,boxes.map(b=>[b.x,b.y,b.width,b.height])]);
    if(sceneStageKey!==key){
      sceneStageLayer=G.render.canvasUtils.createLayer(1280,720,density);paint(sceneStageLayer.getContext('2d'));sceneStageKey=key;
    }
    ctx.drawImage(sceneStageLayer,0,0,1280,720);
  }
  function mist(ctx,x,y,rx,ry,color,alpha) {
    ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
    const g=ctx.createRadialGradient(0,0,.05,0,0,1);g.addColorStop(0,'rgba('+color+','+alpha+')');g.addColorStop(.42,'rgba('+color+','+(alpha*.45)+')');g.addColorStop(1,'rgba('+color+',0)');
    ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
  function playerFrame(shake) { return {x:165+shake.x,y:190+shake.y,width:380,height:360}; }
  function enemyArt(enemy) {
    return root + (enemies[enemy.templateId] || enemies[enemy.behavior] || enemies.simple);
  }
  function enemyFlip(enemy) { return enemyArt(enemy).includes('bayonet_scout'); }
  function figure(ctx, art, box, flip) {
    // Alpha-only silhouette and soft lower edge: no color-keying and no opaque backplate.
    ctx.save(); ctx.filter = 'saturate(.79) brightness(.91)';
    W.figure(ctx, art, box, flip); ctx.restore();
  }
  function gunMuzzle(enemy, box) {
    const art = enemyArt(enemy), height = Math.min(310,box.height - 82), width = Math.min(box.width,height * 2 / 3);
    // Original scout keeps his own uniform through every turn; no identity swap to a different rifleman.
    const bayonet = art.includes('bayonet_scout'), mack = art.includes('mack');
    return { x: box.x + box.width / 2 - width / 2 + width * (bayonet ? .25 : .045), y: box.y + 32 + height * (bayonet ? .43 : mack ? .355 : .39) };
  }
  const dangerColor = '#c36150', bloodColor = '#a1332e';
  const sternFont=G.render.ui.getBodyFontFamily();
  const readableFont='"KGame Sans", sans-serif';
  // Center the actual ink, not the font's em box (Chinese and numerals have different bearings).
  function ink(ctx,value,x,y,size=14,color='#dfd3bf',align='center',weight=700,font=sternFont,maxWidth,mechanics=false) {
    ctx.save();ctx.font=weight+' '+size+'px '+font;ctx.textAlign='left';ctx.textBaseline='alphabetic';
    const s=String(value),m=ctx.measureText(s),w=m.actualBoundingBoxLeft+m.actualBoundingBoxRight;
    const scale=maxWidth?Math.min(1,maxWidth/Math.max(1,w)):1;
    ctx.translate(x,y);ctx.scale(scale,1);ctx.fillStyle=color;
    const dx=align==='left'?m.actualBoundingBoxLeft:align==='right'?-m.actualBoundingBoxRight:(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2;
    const baseline=(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2;
    if(mechanics)G.render.ui.drawMechanicText(ctx,s,dx,baseline,G.render.ui.mechanicPalette.dark);else ctx.fillText(s,dx,baseline);ctx.restore();
  }
  // Match the user's 战斗页 (1–3), not the later carved-block experiments.
  const uiAssets = ['assets/ui/combat_panel_rotten_wood_plank_gpt4ovip_01.png',
    'assets/ui/combat_health_bamboo_ledger_gpt4ovip_transparent_01.png',
    'assets/ui/combat_health_blood_brush_gpt4ovip_transparent_02_cropped.png'];
  function thinFrame(ctx,b,stroke='rgba(150,128,99,.22)') {
    ctx.strokeStyle=stroke;ctx.lineWidth=1;
    ctx.strokeRect(b.x+.5,b.y+.5,b.width-1,b.height-1);
    ctx.strokeStyle='rgba(159,140,112,.09)';
    ctx.strokeRect(b.x+4.5,b.y+4.5,b.width-9,b.height-9);
  }
  function roundPlaque(ctx,state) {
    const b={x:578,y:27,width:124,height:34}, turn=String(Math.max(1,state.combat.turn||1));
    ctx.save();ctx.fillStyle='rgba(7,8,8,.86)';ctx.fillRect(b.x,b.y,b.width,b.height);
    thinFrame(ctx,b,'rgba(119,112,95,.19)');
    ctx.fillStyle='rgba(171,152,119,.07)';ctx.fillRect(b.x+14,b.y+8,14,1);ctx.fillRect(b.x+b.width-28,b.y+8,14,1);
    ctx.font='700 12px '+sternFont; const lm=ctx.measureText('回合'),labelWidth=lm.actualBoundingBoxLeft+lm.actualBoundingBoxRight;
    ctx.font='700 24px '+sternFont; const nm=ctx.measureText(turn),numberWidth=nm.actualBoundingBoxLeft+nm.actualBoundingBoxRight;
    const start=640-(labelWidth+8+numberWidth)/2;
    ink(ctx,'回合',start,44,12,'#d8c7af','left');
    ink(ctx,turn,start+labelWidth+8,44,24,'#bc5548','left');
    const count=state.combat.enemies.filter(e=>e.hp>0).length;
    const type={street:'喋血街头',elite:'强敌截杀',gate:'险关',nemesis:'宿敌寻仇'}[state.combat.nodeType]||'狭路相逢';
    ink(ctx,type+(count>1?' · '+count+'敌':''),640,67,8,'#918779');
    ctx.restore();
  }
  function endTurn(ctx,b,busy=false) {
    const active=!busy&&W.hovered(b),down=!busy&&pressed&&active;
    const face={x:b.x+(b.width-156)/2,y:b.y+(b.height-68)/2+(down?1:0),width:156,height:68};
    ctx.save();ctx.fillStyle='rgba(8,7,6,.82)';ctx.fillRect(face.x,face.y,face.width,face.height);
    thinFrame(ctx,face);
    A.drawCombatPanelSurface(ctx,face.x+7,face.y+7,face.width-14,face.height-14,{
      overlayAlpha:down?.4:active?.17:.29,stroke:'rgba(142,109,71,.40)',
      highlight:'rgba(180,144,93,.06)',lineWidth:1
    });
    ctx.shadowColor='#080604';ctx.shadowBlur=1;ctx.shadowOffsetY=1;
    ink(ctx,busy?'交锋中…':'结束本回合',face.x+face.width/2,face.y+17,9,'#c3ac88','center',600,readableFont);
    ink(ctx,'结束回合',face.x+face.width/2,face.y+39,20,'#eee4d3','center',700,readableFont);
    ctx.restore();
  }
  function healthBar(ctx,b,value,max,color) {
    A.drawCombatBarSurface(ctx,b.x,b.y,b.width,b.height,Math.max(0,Math.min(1,value/Math.max(1,max))),{
      stroke:'rgba(140,81,63,.44)',fillOverlay:'rgba(72,9,12,.16)',lineWidth:1
    });
  }
  function pile(ctx,b,count,name) {
    const active=W.hovered(b),empty=count===0,face={x:b.x+8,y:b.y+18,width:44,height:60};
    ctx.save();
    A.drawCombatPanelSurface(ctx,face.x,face.y,face.width,face.height,{
      hideNails:true,overlayAlpha:active?.18:.36,stroke:'rgba(140,109,75,.26)',
      highlight:'rgba(180,144,93,.04)',lineWidth:1
    });
    ctx.strokeStyle=empty?'#958778':'#d8c6ac';ctx.lineWidth=1.4;
    ctx.save();ctx.translate(face.x+22,face.y+23);
    if(name==='抽牌') {
      ctx.save();ctx.rotate(-.16);ctx.strokeRect(-14,-9,14,20);ctx.restore();
      ctx.save();ctx.rotate(.14);ctx.strokeRect(-2,-12,14,20);ctx.restore();
    } else {ctx.strokeRect(-12,-12,14,20);ctx.strokeRect(-4,-4,14,20);ctx.beginPath();ctx.moveTo(-10,14);ctx.lineTo(12,14);ctx.stroke();}
    ctx.restore();
    ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=2;ctx.shadowOffsetY=1;
    ink(ctx,count,face.x+22,face.y+47,empty?14:16,empty?'#ccc0ae':'#ece1d2');
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ink(ctx,name,b.x+b.width/2,b.y+4,10,active?'#d8c8b1':empty?'#887966':'#a8957e','center',600);ctx.restore();
  }
  function slipWidth(ctx,text,size,maxWidth=187) {
    ctx.save();ctx.font='700 '+size+'px '+sternFont;
    const width=Math.min(maxWidth,Math.ceil(ctx.measureText(text).width)+16);ctx.restore();return width;
  }
  function infoSlip(ctx,x,y,width,text,tone='neutral',size=12) {
    ctx.save();
    // Sample plain grain, excluding the source board's ornate corners. Stable across number changes.
    const seed=Array.from(text.replace(/[\d\s/·]/g,'')).reduce((n,c)=>n+c.charCodeAt(0),0);
    const texture=A.getImageEntry(uiAssets[0]);
    ctx.beginPath();ctx.moveTo(x+1,y+.5);ctx.lineTo(x+width*.64,y+.5);ctx.lineTo(x+width*.66,y+1.3);
    ctx.lineTo(x+width-1,y+.5);ctx.lineTo(x+width,y+17);ctx.lineTo(x+width*.23,y+17.5);
    ctx.lineTo(x+width*.21,y+16.8);ctx.lineTo(x+.5,y+17.5);ctx.closePath();ctx.clip();
    ctx.fillStyle='#17110c';ctx.fillRect(x,y,width,18);
    if(texture.loaded){ctx.globalAlpha=.64;ctx.drawImage(texture.image,160+seed%100,240+seed%350,Math.min(1100,width*10),180,x,y,width,18);ctx.globalAlpha=1;}
    const shade=ctx.createLinearGradient(0,y,0,y+18);
    shade.addColorStop(0,'rgba(185,146,98,.08)');shade.addColorStop(.35,'rgba(4,3,2,.15)');shade.addColorStop(1,'rgba(3,2,1,.62)');
    ctx.fillStyle=shade;ctx.fillRect(x,y,width,18);
    ctx.strokeStyle='rgba(137,108,72,.34)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,width-1,17);
    ctx.fillStyle='rgba(173,144,102,.27)';ctx.fillRect(x+3,y+1,8,1);ctx.fillRect(x+width-13,y+16,5,1);
    if(tone==='danger'||tone==='ready'){
      ctx.fillStyle=tone==='danger'?'rgba(139,51,39,.8)':'rgba(161,131,69,.62)';ctx.fillRect(x+2,y+3,2,12);
    }
    ctx.shadowColor='#080503';ctx.shadowBlur=1;ctx.shadowOffsetY=1;
    ink(ctx,text,x+width/2,y+9,size,tone==='muted'?'#b7a58a':'#dfd0b7','center',700,sternFont,width-10,true);ctx.restore();
  }
  function enemyInfo(ctx,enemy,shown,box,firing) {
    const cx=box.x+box.width/2,d=shown.intentData||{},intent=W.enemyIntent(shown);
    const preview=!!(d.previewDamage&&!d.damage),value=preview?d.previewDamage:shown.intentValue;
    const mark=firing?'射':preview?'预':d.damage||shown.intent==='attack'?'袭':d.block?'守':'势';
    const cy=box.y+10,r=23;
    ctx.save();ctx.fillStyle=d.damage&&G.render.motionFocus?G.render.motionFocus.sealFill(ctx,cx,cy,r):intent.danger?'#4f211c':'#29241b';ctx.strokeStyle=intent.danger?'#b98765':'#ae9672';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    const hasValue=value!==undefined&&value!==null&&value!==0;
    ink(ctx,mark,cx,cy+(hasValue?-8:0),hasValue?12:16,'#e3d1b3');
    if(hasValue)ink(ctx,value,cx,cy+9,17,'#eadcc4');
    const width=Math.min(210,box.width-14),x=cx-width/2,y=box.y+box.height-66;
    ink(ctx,enemy.name,x,y,15,'#e2d9ca','left',700,sternFont,width);
    const name=shown.intentLabel||'蓄势',hpWidth=62,intentText=(preview?'预告 · ':'')+name,intentSize=width>180?12:11;
    infoSlip(ctx,x,y+13,slipWidth(ctx,intentText,intentSize,Math.max(60,width-hpWidth-5)),intentText,intent.danger?'danger':'neutral',intentSize);
    ink(ctx,enemy.hp+' / '+enemy.maxHp,x+width,y+22,12,'#e2d9ca','right');
    healthBar(ctx,{x,y:y+37,width,height:8},enemy.hp,enemy.maxHp,bloodColor);
    if(enemy.block)infoSlip(ctx,x,y+50,slipWidth(ctx,'现守 '+enemy.block,11),'现守 '+enemy.block,'muted',11);
    const tags=G.scenes.combat.getEnemyStatusChips(enemy,false);
    const tagX=Math.min(1218,box.x+box.width-52);
    tags.forEach((t,i)=>infoSlip(ctx,tagX,box.y+57+i*21,slipWidth(ctx,t.text,10,50),t.text,'danger',10));
    // Keep firearm timing explicit while the circular marker carries its damage number.
    const turnStatus=G.scenes.combat.feedback?.turnStatus(enemy.id);
    const note=turnStatus==='done'?'已行动':turnStatus==='next'?'下一位'+(intent.note?' · '+intent.note:''):intent.note;
    if(note)ink(ctx,note,cx,cy+r+12,10,turnStatus==='done'?'#8d8373':'#b8a78b','center',600,sternFont,Math.max(width,150));
    ctx.restore();
  }
  function playerInfo(ctx,state) {
    const p=state.player,x=48,width=187;
    const name={blade:'吹命刀',iron:'铁骨衣',dirty:'下九流',combo:'江湖把子'}[p.chosenStyle]||'刀客';
    ink(ctx,name,x,482,15,'#e1d7c5','left');ink(ctx,p.hp+' / '+p.maxHp,x+width,482,13,'#e1d7c5','right');
    healthBar(ctx,{x,y:495,width,height:9},p.hp,p.maxHp,bloodColor);
    const energy='体力 '+p.energy+' / '+p.maxEnergy,block='架势 '+(p.block||0),blockWidth=slipWidth(ctx,block,12);
    infoSlip(ctx,x,509,slipWidth(ctx,energy,12),energy);infoSlip(ctx,x+width-blockWidth,509,blockWidth,block,p.block?'neutral':'muted');
    const chips=G.scenes.combat.getPlayerStatusChips(state,p);
    const styleChips=chips.filter(t=>/^(连环|铁骨)/.test(t.text)),temporaryChips=chips.filter(t=>!/^(连环|铁骨)/.test(t.text));
    let sx=x;
    styleChips.forEach(t=>{const sw=slipWidth(ctx,t.text,11,width);infoSlip(ctx,sx,535,sw,t.text,/已起|已成/.test(t.text)?'ready':'muted',11);sx+=sw+7;});
    let tx=x,ty=561;
    temporaryChips.forEach(t=>{const tw=slipWidth(ctx,t.text,11,width);if(tx+tw>x+width){tx=x;ty+=22;}infoSlip(ctx,tx,ty,tw,t.text,'danger',11);tx+=tw+7;});
  }
  let pressed=false;
  const canvas=document.getElementById('game-canvas');
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0 || !G.main || G.main.getState().scene!=='combat')return;
    const box=canvas.getBoundingClientRect();
    pressed=W.inside({x:(event.clientX-box.left)*1280/box.width,y:(event.clientY-box.top)*720/box.height},G.scenes.combat.debugGetLayout().endTurn);
  });
  ['pointerup','pointercancel','blur'].forEach(type=>window.addEventListener(type,()=>{pressed=false;}));
  const assetPaths = [...new Set([background,...uiAssets,...Object.values(players).map(p=>root+p),...Object.values(enemies).map(p=>root+p)])];
  assetPaths.forEach(p=>A.getImageEntry(p));
  const enemyPresets = {
    1: [{x:812,y:84,width:378,height:414,z:0}],
    2: [{x:786,y:128,width:188,height:332,z:0},{x:1003,y:84,width:225,height:414,z:1}],
    3: [{x:680,y:152,width:160,height:285,z:0},{x:862,y:116,width:172,height:340,z:1},{x:1050,y:82,width:220,height:414,z:2}]
  };
  function hud(draw,signature,bounds){return function(ctx,...args){
    G.render.canvasUtils.paintLayer(ctx,'combat-hud:'+draw.name+':'+signature(...args),bounds(...args),brush=>draw(brush,...args));
  };}
  const cachedPlayer=hud(playerInfo,s=>JSON.stringify([s.player,s.combat.comboCount,s.combat.comboDiscountUses]),()=>({x:36,y:465,width:216,height:245}));
  const cachedEnemy=hud(enemyInfo,(e,shown,b,firing)=>JSON.stringify([e,shown,b.width,b.height,b.x,b.y,firing,G.scenes.combat.feedback?.turnStatus(e.id)]),
    (e,shown,b)=>({x:b.x-12,y:b.y-23,width:b.width+90,height:Math.max(b.height+45,100+G.scenes.combat.getEnemyStatusChips(e,false).length*24)}));
  function drawEnemyInfo(ctx,e,shown,b,firing){
    if((b.baseX!==undefined&&b.x!==b.baseX)||(b.baseY!==undefined&&b.y!==b.baseY))enemyInfo(ctx,e,shown,b,firing);
    else cachedEnemy(ctx,e,shown,b,firing);
  }
  const cachedRound=hud(roundPlaque,s=>JSON.stringify([s.combat.turn,s.combat.nodeType,s.combat.enemies.filter(e=>e.hp>0).length]),()=>({x:550,y:20,width:180,height:58}));
  const cachedPile=hud(pile,(b,count,name)=>JSON.stringify([b,count,name,W.hovered(b)]),b=>({x:b.x-5,y:b.y-10,width:b.width+10,height:b.height+25}));
  const cachedEnd=hud(endTurn,(b,busy)=>JSON.stringify([b,busy,pressed,W.hovered(b)]),b=>({x:b.x-4,y:b.y-4,width:b.width+8,height:b.height+8}));
  G.render.realisticCombat = { stage, figure, playerFrame, enemyInfo:drawEnemyInfo, playerInfo:cachedPlayer, playerArt: style=>root+(players[style]||players.blade), enemyArt, enemyFlip, gunMuzzle, assetPaths, enemyPresets, roundPlaque:cachedRound, endTurn:cachedEnd, healthBar, pile:cachedPile, dangerColor, bloodColor,
    ui:{ink,thinFrame,infoSlip,slipWidth} };
  W.combatPresentation = G.render.realisticCombat;
  G.render.realisticCombat.getStageCacheDebug=()=>({layers:[stageLayer,sceneStageLayer].filter(Boolean).length,bytes:[stageLayer,sceneStageLayer].filter(Boolean).reduce((n,c)=>n+c.width*c.height*4,0),maximumLayers:2});
})();
