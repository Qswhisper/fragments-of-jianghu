/* Full journey presentation reuses the frozen combat/reward/rest assets. */
(function () {
  'use strict';
  const W=G.render.woodcut, R=G.render.realisticCombat, A=G.render.assets;
  const text=W.text, wrap=W.wrap, rect=(x,y,width,height)=>({x,y,width,height});
  const kinds={street:'战',elite:'险',gate:'关',rest:'歇',shop:'市',event:'遇',nemesis:'仇'};
  const oldTitle=G.scenes.title.render;
  // Nemesis AI changes independently of identity: retain the defeated enemy's
  // original portrait, including act 2-5 templates that share a behavior.
  const originalEnemyArt=R.enemyArt;
  const chiefArt='assets/portraits/chief-blade-natural-20261005.png';
  const chiefStages=Object.fromEntries(['revolver','carbine','rifle'].map(stage=>[stage,'assets/portraits/chief-'+stage+'-ready-20261005-r2.png']));
  const trackerArt='assets/portraits/enemy_city_tracker_knee_20261003.png';
  const mackArt='assets/portraits/enemy_mack_knee_20261003.png';
  const mackStages={blade:'assets/portraits/mack-blade-natural-20261005.png',...Object.fromEntries(['revolver','carbine','rifle'].map(stage=>[stage,'assets/portraits/mack-'+stage+'-ready-20261005-r2.png']))};
  const streetArt={soldier:'assets/portraits/street-soldier-20261005-r2.png',boxer:'assets/portraits/street-boxer-20261005-r2.png',tracker:'assets/portraits/street-tracker-20261005-r2.png'};
  const routeAssets=[chiefArt,trackerArt,mackArt,...Object.values(streetArt),...Object.values(chiefStages),...Object.values(mackStages),...Object.values(chiefStages).map(p=>p.replace('-ready-','-aim-')),...Object.values(mackStages).filter(p=>p.includes('-ready-')).map(p=>p.replace('-ready-','-aim-'))];
  routeAssets.forEach(p=>A.getImageEntry(p));
  R.assetPaths.push(...routeAssets.filter(p=>!R.assetPaths.includes(p)));
  function routeEnemyArt(enemy){
    const identity=G.render.journeyArt?.enemyArt(enemy);if(identity)return identity;
    const rawStage=enemy.firearmStage||enemy.intentData?.firearmStage;
    const stage=({mauser:'carbine',gatling:'rifle'})[rawStage]||rawStage;
    const pose=enemy.intentData?.firearm&&(enemy.intentData.damage>0||(enemy.intentData.firearmStep||0)>=(enemy.kind==='nemesis'&&stage==='revolver'?2:1))?'aim':'ready';
    const armed=(family,type)=>({chief:chiefStages,mack:mackStages}[family][type]||({chief:chiefArt,mack:mackStages.blade}[family])).replace('-ready-','-'+pose+'-');
    if(enemy.kind!=='nemesis'&&enemy.templateId==='act4_machine_loader')return armed('chief','rifle');
    let behavior=enemy.kind==='nemesis'?G.enemies.definitions[enemy.templateId]?.behavior||enemy.behavior:enemy.behavior;
    if(['dock_gunner','machine_loader','river_gunner'].includes(behavior))behavior='rifle_scout';
    const path=originalEnemyArt({...enemy,behavior});
    if(path.includes('enemy_guard_chief_gpt4ovip_01.png'))return enemy.kind==='nemesis'?armed('chief',stage):chiefArt;
    if(path.includes('enemy_city_tracker_gpt4ovip_01.png'))return enemy.kind==='nemesis'?armed('chief',stage):streetArt.tracker;
    if(path.includes('enemy_act1_elite_mack_gpt15_02.png')){
      const foreign=['elite_mack','act3_elite_barlow','act3_boss_chief_inspector'].includes(enemy.templateId);
      if(foreign)return armed('mack',enemy.kind==='nemesis'?stage:'revolver');
      return armed('chief',enemy.kind==='nemesis'?stage:enemy.templateId==='act4_elite_qin_biao'?'rifle':'revolver');
    }
    if(enemy.kind==='nemesis')return armed('chief',stage);
    if(path.includes('enemy_routed_qing_soldier'))return enemy.openingPortrait?path:streetArt.soldier;
    if(path.includes('enemy_simple_blade'))return streetArt.soldier;
    if(path.includes('enemy_boxer'))return streetArt.boxer;
    if(['rifle_scout','dock_gunner','river_gunner','machine_loader'].includes(behavior)||path.includes('rifle_scout')){
      const type=stage||(enemy.behavior==='river_gunner'?'carbine':enemy.behavior==='dock_gunner'||enemy.templateId==='act4_quick_officer'?'revolver':'rifle');
      return armed('chief',type);
    }
    return path;
  }
  // Normalized anatomical framing, independent of PNG transparent padding.
  G.render.portraitFrames={
    enemy_routed_qing_soldier_gpt4ovip_01:{top:.045,bottom:.98},enemy_simple_blade_gpt4ovip_01:{top:.04,bottom:.98},
    enemy_boxer_gpt4ovip_01:{top:.035,bottom:.98},enemy_boxer_leader_gpt4ovip_01:{top:.03,bottom:.98},
    enemy_bayonet_scout_gpt4ovip_01:{top:.06,bottom:.98},enemy_rifle_scout_gpt4ovip_01:{top:.03,bottom:.98},
    enemy_city_tracker_knee_20261003:{top:.035,bottom:.98},enemy_mack_knee_20261003:{top:.025,bottom:.98},
    enemy_guard_chief_full_20261003_v2:{top:.009,bottom:.88},nemesis_main_portrait_01:{top:.04,bottom:.98},
    'chief-blade-natural-20261005':{top:.009,bottom:.88},'chief-revolver-natural-20261005':{top:.009,bottom:.88},
    'chief-mauser-natural-20261005':{top:.009,bottom:.88},'chief-gatling-natural-20261005':{top:.045,bottom:.95},
    'mack-blade-natural-20261005':{top:.009,bottom:.88},'mack-revolver-natural-20261005':{top:.009,bottom:.88},
    'mack-mauser-natural-20261005':{top:.009,bottom:.88},'mack-gatling-natural-20261005':{top:.02,bottom:.95}
  };
  const frameEntries=G.render.portraitFrames;Object.keys(frameEntries).forEach(key=>{frameEntries[key].fadeStart=.85;});
  routeAssets.filter(p=>p.includes('-20261005-r2')).forEach(p=>{frameEntries[p.split('/').pop().replace('.png','')]={top:.008,bottom:.89,fadeStart:.88};});
  Object.values(G.render.journeyArt?.identities||{}).flatMap(stages=>Object.values(stages)).forEach(p=>{frameEntries[p.split('/').pop().replace('.png','')]={top:.008,bottom:.89,fadeStart:.88};});
  Object.assign(frameEntries,G.render.journeyArt?.revision?.frames||{});
  const originalMuzzle=R.gunMuzzle;
  G.render.journeyGunAnchors={
    'chief-carbine-aim-20261005-r2':{x:.024,y:.167},'chief-revolver-aim-20261005-r2':{x:.047,y:.125},'chief-rifle-aim-20261005-r2':{x:.023,y:.18},
    'mack-carbine-aim-20261005-r2':{x:.031,y:.135},'mack-revolver-aim-20261005-r2':{x:.039,y:.115},'mack-rifle-aim-20261005-r2':{x:.023,y:.156}
  };
  // Reserve the caption's ink ascenders below the hips. The old frame ended
  // 16px below the name baseline; an early .69 matte only concealed that overlap.
  // Drawing and firearm anchors share this exact frame transformation.
  function naturalFrame(path,b){return /20261005|expansion-20261007|revision-20261008|correction-20261008|art-refresh-20261013|portrait-feedback-20261014|feedback52|enemy_routed_qing_soldier_gpt4ovip_01/.test(path)&&b.height<=310?{...b,y:b.y+8,height:b.height-40}:b;}
  const portraitGrade='saturate(.92) contrast(1.30) brightness(.66) sepia(.14)';
  function routeFigure(ctx,path,b,flip){
    if(!/20261005|expansion-20261007|revision-20261008|correction-20261008|art-refresh-20261013|portrait-feedback-20261014|feedback52/.test(path))return R.figure(ctx,path,naturalFrame(path,b),flip);
    // Grade only the new enemy portraits; preserve the approved opening/player art.
    // W.figure caches this treatment once per path/size/density.
    ctx.save();ctx.filter=portraitGrade;const result=W.figure(ctx,path,naturalFrame(path,b),flip);ctx.restore();return result;
  }
  G.render.journeyPortraitGrade=portraitGrade;
  function routeMuzzle(enemy,b){
    const path=routeEnemyArt(enemy),key=path.split('/').pop().replace(/\.png$/,''),frame=G.render.portraitFrames[key];
    if(path.includes('-20261005-r2')||path.includes('/expansion-20261007/')||path.includes('/revision-20261008/')||path.includes('/correction-20261008/')||path.includes('/art-refresh-20261013/')||path.includes('/portrait-feedback-20261014/')||path.includes('/feedback52/')){
      const anchors={...G.render.journeyGunAnchors,...G.render.journeyArt?.gunAnchors},anchor=anchors[key];const entry=A.getImageEntry(path);if(!anchor||!entry.loaded)return originalMuzzle(enemy,b);
      const target=naturalFrame(path,{x:b.x,y:b.y+32,width:b.width,height:Math.min(310,b.height-82),slotRole:b.slotRole}),source=entry.image,{top,scale}=W.figureGeometry(path,target,R.enemyFlip(enemy));
      return {x:target.x+(target.width-source.width*scale)/2+source.width*scale*(R.enemyFlip(enemy)?1-anchor.x:anchor.x),y:target.y+(source.height*anchor.y-top)*scale};
    }
    const stageAnchors={revolver:{x:.023,y:.141},mauser:{x:.061,y:.151},gatling:{x:.057,y:.392}};
    const mackAnchors={revolver:{x:.031,y:.141},mauser:{x:.030,y:.145},gatling:{x:.042,y:.469}};
    const chiefStage=Object.keys(chiefStages).find(stage=>chiefStages[stage]===path),mackStage=Object.keys(mackAnchors).find(stage=>mackStages[stage]===path);
    const anchor=chiefStage?stageAnchors[chiefStage]:mackStage?mackAnchors[mackStage]:path===mackArt?{x:.067,y:.298}:path.includes('enemy_rifle_scout')?{x:.035,y:.383}:path.includes('enemy_bayonet_scout')?{x:.74,y:.425}:null;
    const entry=A.getImageEntry(path);if(!anchor||!entry.loaded)return originalMuzzle(enemy,b);
    const target=naturalFrame(path,{x:b.x,y:b.y+32,width:b.width,height:Math.min(310,b.height-82)});
    const source=entry.image,top=Math.round(source.height*frame.top),height=Math.round(source.height*frame.bottom)-top,scale=Math.min(target.width/source.width,target.height/height);
    return {x:target.x+(target.width-source.width*scale)/2+source.width*scale*(R.enemyFlip(enemy)?1-anchor.x:anchor.x),y:target.y+(source.height*anchor.y-top)*scale};
  }
  R.gunMuzzle=routeMuzzle;
  const originalEnemyFlip=R.enemyFlip;
  R.enemyFlip=e=>G.render.journeyArt?.enemyPortrait(e)?.flip??originalEnemyFlip(e);
  W.combatPresentation={...R,figure:routeFigure,enemyArt:routeEnemyArt,gunMuzzle:routeMuzzle};
  function backdrop(ctx, path='assets/ui/map_jiaotu_yidao_background_gpt4ovip_01.png') {
    ctx.fillStyle='#11161a';ctx.fillRect(0,0,1280,720);
    ctx.save();ctx.filter='saturate(.45) brightness(.38)';A.drawImageCover(ctx,path,0,0,1280,720);ctx.restore();
    const shade=ctx.createLinearGradient(0,0,1280,0);shade.addColorStop(0,'rgba(9,13,16,.52)');shade.addColorStop(.5,'rgba(9,13,16,.22)');shade.addColorStop(1,'rgba(9,13,16,.55)');ctx.fillStyle=shade;ctx.fillRect(0,0,1280,720);
  }
  function heading(ctx,title,subtitle,state) {
    text(ctx,title,48,43,30,'#d5c3a5','left',600,true);
    text(ctx,subtitle,48,81,16,'#aaa18f');
    if(state?.player?.chosenStyle)G.render.journeyMaterials.ledger(ctx,state,{x:690,y:15,width:500,compact:true});
  }
  G.scenes.title.render=function(state,ctx) {
    if(state.title.mode==='credits'){
      backdrop(ctx);heading(ctx,'制作与鸣谢','江湖残卷 · 完整旅程');const L=G.scenes.title.getLayout();
      [
        '晚清武侠 · 卡牌构筑 · 跨局宿敌',
        '视觉：写实人物与场景使用 AI 辅助生成；招式卡保留墨色动作图。',
        '音乐 Kawarayu — Yubatake / CC BY 4.0',
        '音乐 Fight For Freedom — Kaine Carrillo / CC BY 4.0',
        '音效 Sword Swing — DavidW / OGA BY 4.0',
        '其他音频：yd、remaxim、zer0_sol / CC0',
        '音频来源 OpenGameArt.org；完整来源、署名与许可随项目保留。'
      ].forEach((line,i)=>wrap(ctx,line,222,190+i*52,836,17,'#c6b99f',2));
      W.button(ctx,L.creditsBack,'返回主菜单');return;
    }
    if(state.title.mode!=='styles'){
      const background=W.background;W.background=function(c){backdrop(c);};
      try{oldTitle(state,ctx);}finally{W.background=background;}return;
    }
    R.stage(ctx,state);const L=G.scenes.title.getLayout(),selected=state.title.options.find(o=>o.id===state.title.selectedStyle);
    heading(ctx,'选一门活命手艺','五卷突围 · 选择改变起手牌与构筑路线');
    R.figure(ctx,R.playerArt(selected.id),rect(30,132,420,540),selected.id!=='combo');
    G.scenes.title.getStyleBoxes(L).forEach((b,i)=>W.button(ctx,b,state.title.options[i].name,{selected:state.title.options[i].id===selected.id,subtitle:state.title.options[i].keyword}));
    text(ctx,selected.name,836,156,34,'#d8c6a8','left',600,true);
    wrap(ctx,selected.theme,836,193,362,18,'#b59d80',3);
    wrap(ctx,selected.summary,836,287,362,17,'#c3b6a0',6);
    text(ctx,'起手要诀',836,444,17,'#b59d80');wrap(ctx,selected.starterSummary||selected.keyword,836,474,362,15,'#b8ac96',4);
    W.button(ctx,L.startButton,'踏入九城',{primary:true,subtitle:'开始完整旅程'});W.button(ctx,L.backButton,'返回主菜单',{size:16});
  };
  G.scenes.map.render=function(state,ctx) {
    backdrop(ctx);ctx.fillStyle='rgba(8,13,16,.30)';ctx.fillRect(0,104,1280,616);
    const m=state.map,nodes=m.nodes,reachable=m.reachableNodeIds,visited=m.visitedNodeIds;
    heading(ctx,m.actTitle,m.completed?'五卷已破 · 点击查看终局簿':'从下往上 · 亮起的节点可到达，分岔一经选择便不能折返',state);
    nodes.forEach(n=>n.nextIds.forEach(id=>{
      const next=nodes.find(v=>v.id===id);if(!next)return;
      const path=(visited.includes(n.id)&&visited.includes(id))||(m.currentNodeId===n.id&&reachable.includes(id)),option=reachable.includes(n.id);
      const reveal=G.render.journeyMotion?.enter(Math.max(0,5-n.tier)*28,460)??1;
      ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(n.x+(next.x-n.x)*reveal,n.y+(next.y-n.y)*reveal);ctx.strokeStyle='rgba(7,10,12,.8)';ctx.lineWidth=5;ctx.stroke();
      ctx.strokeStyle=path?'#c0a171':option?'#999783':'rgba(161,168,150,.58)';ctx.lineWidth=path?2.8:1.8;ctx.setLineDash(path||option?[]:[4,6]);ctx.stroke();ctx.setLineDash([]);
      if(path&&reachable.includes(id)&&G.render.journeyMotion&&!G.render.journeyMotion.disabled()) { const t=(state.timeMs/2400)%1;ctx.save();ctx.globalAlpha=Math.sin(t*Math.PI)*.7;ctx.fillStyle='#d2bd92';ctx.beginPath();ctx.arc(n.x+(next.x-n.x)*t,n.y+(next.y-n.y)*t,2.1,0,Math.PI*2);ctx.fill();ctx.restore(); }
    }));
    const pointer=G.main.getPointer(),hover=nodes.find(n=>Math.hypot(pointer.x-n.x,pointer.y-n.y)<=28);
    nodes.forEach(n=>{
      const available=reachable.includes(n.id),done=visited.includes(n.id),current=n.id===m.currentNodeId;
      const focus=G.render.journeyMotion?.hover('route:'+n.id,{x:n.x-28,y:n.y-28,width:56,height:56},available)??(available&&hover===n?1:0);
      ctx.save();ctx.beginPath();ctx.arc(n.x,n.y,26+focus*3,0,Math.PI*2);ctx.fillStyle=available?(n.type==='nemesis'?'#70372b':'#483e2c'):'#1a2021';ctx.fill();ctx.strokeStyle=current?'#e0c58e':available?'#b39b6c':done?'#74775f':'#454d4c';ctx.lineWidth=available||current?2:1;ctx.stroke();
      if(focus>.02){ctx.globalAlpha=focus*.38;ctx.beginPath();ctx.arc(n.x,n.y,33,0,Math.PI*2);ctx.strokeStyle='#c1aa7d';ctx.lineWidth=1;ctx.stroke();}ctx.restore();
      text(ctx,kinds[n.type],n.x,n.y,25,available?'#e1d0b1':done?'#aaa68a':'#77827f','center',600,true);
      const entry=n.type==='nemesis'?G.nemesis.getEntryById(state,n.nemesisEntryId):null;
      text(ctx,entry?'旧仇 · '+entry.level+' 阶':n.label,n.x,n.y+44,16,entry?'#d0a284':available?'#e0cfb1':done?'#b5ad94':'#919b94','center');
      if(entry)text(ctx,entry.name,n.x,n.y+63,14,'#d0a284','center');
    });
    if(hover){
      const copy={street:'寻常交锋，获大洋与招式。',elite:'强敌截杀，胜后可取旧物。',gate:'本卷关底，胜后进入下一卷。',rest:'裹伤恢复三成最大气血，或精进一张招式。',shop:'购买招式、旧物，或付费撤去一张牌。',event:'先看代价，再做决定。',nemesis:'旧敌记住了你的打法。迎战前可查看他的准备。'};
      const intel=hover.type==='elite'&&G.relicRuntime.hasRelic(state,'settlement_map')?G.enemies.getEliteEncounterForState(state)?.name:null;
      const enemy=hover.type==='nemesis'?G.nemesis.getEntryById(state,hover.nemesisEntryId):null;
      const risk=enemy?enemy.name+' · '+enemy.level+' 阶 · '+G.nemesis.getFirearmLabel(G.nemesis.getLevelProfile(enemy.level).firearmStage)+'。 ':'';
      text(ctx,risk+copy[hover.type]+(intel?' 本卷强敌：'+intel:''),640,668,16,'#d0b88f','center');
    }else text(ctx,m.completed?'点击查看终局簿':m.note,640,668,16,'#c4b49a','center');
    text(ctx,'战 · 街头    险 · 强敌    仇 · 宿敌    歇 · 休息    市 · 黑市    遇 · 奇遇    关 · 关底',640,702,16,'#b0b3a5','center');
  };
  G.scenes.nemesis.render=function(state,ctx) {
    R.stage(ctx,state);const n=state.nemesisIntro,L=G.scenes.nemesis.getLayout();
    heading(ctx,'旧仇再会',n.name+' · '+n.title+' · '+n.level+' 阶',state);
    const source=G.nemesis.getEntryById(state,n.entryId);
    R.figure(ctx,routeEnemyArt({templateId:source?.sourceTemplateId,behavior:'nemesis',kind:'nemesis',firearmStage:n.firearmStage}),rect(30,137,390,472),false);
    text(ctx,n.name,224,594,27,'#cbbc9e','center',600,true);
    wrap(ctx,'“'+n.dialogueLine+'”',452,174,702,25,'#d6c7b0',5);
    text(ctx,'他记住了什么',452,359,18,'#ba9675');wrap(ctx,n.memoryLine,452,391,325,16,'#b8ad9b',5);
    text(ctx,'这次的准备',830,359,18,'#ba9675');wrap(ctx,n.adaptation?n.adaptation.name+'：'+n.adaptation.description:n.note,830,391,323,16,'#c9bba3',5);
    const threat=n.firearmThreat||G.nemesis.getFirearmThreat(source);
    wrap(ctx,n.revengeLine||G.nemesis.getRevengeSummary(source),452,510,694,16,'#b8ad9b',2);
    if(threat.steps.length){text(ctx,threat.steps.join(' → '),452,566,17,'#d0a284');text(ctx,threat.summary,452,594,17,'#d3ad83');}
    else wrap(ctx,n.eraLine,452,566,694,15,'#a6a294',2);
    text(ctx,'旧敌会在败退后变强，下一局仍可能追来。',76,646,15,'#b6a58c');W.button(ctx,L.fight,'拔刀迎战',{primary:true,subtitle:n.firearmLabel});
  };
  // Shared code-only UI keeps the existing shop/event rules and hitboxes.
  ['shop','event'].forEach(name=>{
    const render=G.scenes[name].render;
    G.scenes[name].render=function(state,ctx){
      const background=W.background;W.background=function(c){backdrop(c,name==='shop'?'assets/ui/shop_black_market_background_gpt15all_02_16x9.png':undefined);};
      try{render(state,ctx);}finally{W.background=background;}
    };
  });
  Object.entries(G.scenes).forEach(([name,scene])=>{
    const update=scene.update;if(!update)return;
    scene.update=function(state,input){
      const next=update(state,input);if(!next)return next;
      if(name==='title'&&state.scene==='title'&&state.title.mode==='styles'&&['arrival','combat'].includes(next.scene)){
        next.campaign={version:1,battles:[],cardsPlayed:0};next.reviewReceipt=null;next.reviewPanel=null;next.reviewJourney=null;
      }
      if(name==='combat'&&next.campaign){
        const played=(next.combat.playedCards?.length||0)-(state.combat.playedCards?.length||0);
        next.campaign.cardsPlayed+=Math.max(0,played);
        if(state.combat.result==='active'&&next.combat.result!=='active')next.campaign.battles.push({
          act:next.combat.actNumber,nodeId:next.map?.currentNodeId||'opening',type:next.combat.nodeType,
          name:next.combat.encounterName,result:next.combat.result,turns:next.combat.turn,hp:next.player.hp,
          entryId:next.combat.nemesisEntryId||null,gold:next.combat.goldGranted||0
        });
      }
      return next;
    };
  });
  G.render.journeyRoute={backdrop};
})();
