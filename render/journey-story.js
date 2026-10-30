/* Story scenes use illustrated environments and physical letters, not stacked boards. */
(function () {
  'use strict';
  const A=G.render.assets,P=G.render.journeyMaterials,root='assets/journey/story-20261002/';
  const paths={arrival:root+'arrival-gate.png',victory:root+'report-victory-v2.png',defeat:root+'report-defeat.png',events:Array.from({length:5},(_,i)=>root+'event-act'+(i+1)+'.png')};
  const alley='assets/ui/combat_background_checkpoint_gpt15_01.png',soldier='assets/portraits/enemy_routed_qing_soldier_gpt4ovip_01.png';
  const assetPaths=[paths.arrival,paths.victory,paths.defeat,...paths.events,alley,soldier];assetPaths.forEach(p=>A.getImageEntry(p));
  const paper={x:708,y:98,width:500,height:572};
  function wrap(ctx,value,x,y,width,size=18,color='#40382b',maxLines=5){
    ctx.save();ctx.font='500 '+size+'px '+G.render.ui.getBodyFontFamily();ctx.fillStyle=color;ctx.textBaseline='top';
    const lines=G.render.journeyTypesetting?G.render.journeyTypesetting.lines(ctx,value,width):[];
    if(!G.render.journeyTypesetting){let row='';for(const char of String(value||'')){if(char==='\n'||row&&ctx.measureText(row+char).width>width){lines.push(row);row=char==='\n'?'':char;}else row+=char;}if(row)lines.push(row);}
    lines.slice(0,maxLines).forEach((s,i)=>ctx.fillText(i===maxLines-1&&lines.length>maxLines?s.slice(0,-1)+'…':s,x,y+i*(size+8)));ctx.restore();return Math.min(lines.length,maxLines)*(size+8);
  }
  function backdrop(ctx,path,state,approach=false){
    ctx.fillStyle='#141a1d';ctx.fillRect(0,0,1280,720);const M=G.render.journeyMotion,t=M?.disabled()?0:Math.min(1,(M?.debug().age||0)/2800),scale=approach?1+t*.024:1;
    ctx.save();ctx.translate(640,360);ctx.scale(scale,scale);ctx.translate(-640,-360);A.drawImageCover(ctx,path,0,0,1280,720);ctx.restore();
    const edge=ctx.createLinearGradient(0,0,1280,0);edge.addColorStop(0,'rgba(5,9,12,.06)');edge.addColorStop(.52,'rgba(5,9,12,.05)');edge.addColorStop(1,'rgba(5,9,12,.38)');ctx.fillStyle=edge;ctx.fillRect(0,0,1280,720);
    if(!M?.disabled()&&(/arrival-gate|event-act[145]|act1_river_shrine|act4_payroll_ruts|act1_child_in_embers|report-defeat/.test(path))){
      const time=state.timeMs||0;ctx.save();ctx.strokeStyle='rgba(189,209,217,.14)';ctx.lineWidth=.7;
      for(let i=0;i<42;i++){const x=(i*89.3+Math.sin(i)*97-time*.027)%1320,y=(i*63.7+time*(.13+(i%3)*.016))%780;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y+15);ctx.stroke();}ctx.restore();
    }
  }
  function letter(ctx,paint){
    const draw=()=>{P.sheet(ctx,paper,G.main?.getSceneName()==='event'?{tone:'#988b74'}:{});ctx.save();ctx.strokeStyle='#5d50393b';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(731,110);ctx.lineTo(734,658);ctx.moveTo(742,114);ctx.lineTo(744,655);ctx.stroke();ctx.restore();paint();};
    const M=G.render.journeyMotion;if(M)M.surface(ctx,'story-letter',paper,{distance:22,angle:-.016,enabled:false},draw);else draw();
  }
  function action(ctx,b,label,primary=false){const draw=()=>P.action(ctx,b,label,{primary});const M=G.render.journeyMotion;if(M)M.surface(ctx,'story-action:'+label,b,{distance:10},draw);else draw();}
  function eventLayout(count){
    const phone=!!window.KGAME_MOBILE,x=phone?676:740,width=phone?522:442;
    return {eventPanel:{x,y:190,width,height:180},resultPanel:{x,y:384,width,height:190},continueButton:{x:922,y:606,width:276,height:64},choiceBoxes:Array.from({length:Math.max(1,Math.min(3,count||2))},(_,i)=>({x:x-5,y:(count===3?344:397)+i*(count===3?105:126),width:width+10,height:count===3?101:119}))};
  }
  function titleLayout(base){return {...base,reportPanel:paper,reportDetails:{x:488,y:602,width:184,height:46},reportButtons:[{id:'menu',x:754,y:600,width:192,height:46},{id:'retry',x:970,y:600,width:216,height:46}]};}
  function renderArrival(s,ctx){
    const gate=s.arrival.stage==='gate',L=G.scenes.arrival.getLayout();
    if(gate)backdrop(ctx,paths.arrival,s,true);else{
      G.render.realisticCombat.stage(ctx,s);const b={x:122,y:168,width:480,height:520},draw=()=>{ctx.save();ctx.filter='saturate(.55) brightness(.7)';G.render.woodcut.figure(ctx,soldier,b);ctx.restore();};
      const M=G.render.journeyMotion;if(M)M.surface(ctx,'arrival-soldier',b,{enabled:false,delay:120,distance:20},draw);else draw();
    }
    const shade=ctx.createLinearGradient(620,0,1280,0);shade.addColorStop(0,'#0b101300');shade.addColorStop(.35,'#0b1013c9');shade.addColorStop(1,'#0b1013e6');ctx.fillStyle=shade;ctx.fillRect(620,0,660,720);
    P.ink(ctx,'第一卷 · 入城前夜',754,177,17,'#a99c85');P.ink(ctx,gate?'雨夜入城':'乱军缺口',750,239,43,'#e4d6be');
    wrap(ctx,G.journeyNarrative.arrival(s,s.arrival.stage),754,275,420,21,'#c9bfad',8);
    P.seal(ctx,780,522,33,gate?'入':'战',.78);P.ink(ctx,gate?'城门之外，尚未交锋':'巷口的第一场交锋',813,522,16,'#968b77');
    action(ctx,L.next,gate?'循缺口入城':'迎上拦路人',true);
  }
  function renderEvent(s,ctx){
    const e=s.event,L=eventLayout(e.choices.length),phone=!!window.KGAME_MOBILE,x=L.eventPanel.x,width=L.eventPanel.width,bodySize=phone?26:22;
    const act=Math.max(1,Math.min(5,e.actNumber||s.map?.actNumber||1)),sceneArt=eventBackground(e,act);
    // Retain the act backdrop while the selected scene decodes; do not eagerly
    // decode fourteen full-screen images for every departure.
    if(e.eventId==="act2_bandit_dice_bowl"){ctx.save();ctx.translate(-128,36);ctx.translate(640,360);ctx.scale(1.2,1.2);ctx.translate(-640,-360);backdrop(ctx,A.getImageEntry(sceneArt).loaded?sceneArt:paths.events[act-1],s);ctx.restore();}else backdrop(ctx,A.getImageEntry(sceneArt).loaded?sceneArt:paths.events[act-1],s);
    P.sceneHeading(ctx,'乱世奇遇',e.actTitle==='乱世奇遇'?'第'+['一','二','三','四','五'][act-1]+'卷 · 沿路见闻':e.actTitle);
    const paperBox={x:x-34,y:94,width:width+70,height:590};
    const paint=()=>{
      P.sheet(ctx,paperBox,{tone:'#988b74'});P.ink(ctx,e.title,x,147,phone?34:32,'#332b20');P.seal(ctx,x+width-22,143,30,'闻',.6);
      wrap(ctx,e.body,x,190,width,bodySize,'#392f23',e.choices.length===3?4:5);
      if(e.mode==='choice')e.choices.forEach((choice,i)=>{
        const b=L.choiceBoxes[i],hover=G.render.woodcut.hovered(b);
        const draw=()=>{P.seal(ctx,b.x+17,b.y+24,28,['一','二','三'][i],hover?1:.72);
          P.ink(ctx,choice.label,b.x+42,b.y+24,phone?28:25,hover?'#823425':'#35291e');
          wrap(ctx,G.events.getChoicePreview(s,choice.id),b.x+42,b.y+49,b.width-48,phone?25:22,hover?'#713728':'#443321',2);
          ctx.strokeStyle='#68543a60';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(b.x+42,b.y+b.height-4);ctx.lineTo(b.x+b.width,b.y+b.height-4);ctx.stroke();};
        G.render.journeyMotion.surface(ctx,'event-letter-choice:'+i,b,{delay:90+i*45,distance:7,lift:1},draw);
      });else {
        P.ink(ctx,e.selectedChoiceLabel,x,375,phone?28:25,'#4c3426');
        const used=wrap(ctx,e.resultText,x,409,width,bodySize,'#392e22',4);
        wrap(ctx,(e.resultSummary||[]).join(' · '),x,420+used,width,phone?25:22,'#783124',2);
      }
    };
    G.render.journeyMotion.surface(ctx,'event-paper',paperBox,{enabled:false,distance:10},paint);
    if(e.mode!=='choice')action(ctx,L.continueButton,e.continueLabel||'继续前行',true);P.ledger(ctx,s);
  }
  function renderReport(s,ctx){
    const r=s.runReport,win=r.outcome==='victory',L=titleLayout({});backdrop(ctx,win?paths.victory:paths.defeat,s);P.sceneHeading(ctx,win?'残卷送达':'负伤撤回',win?'原件送达，暗线撤离。此案已结。':"暗线将你救回，养好伤再上路。");
    letter(ctx,()=>{
      P.ink(ctx,win?'终局簿':'败局簿',758,145,17,'#716048');P.seal(ctx,1154,149,35,win?'终':'止',.74);P.ink(ctx,r.styleName||'此行行记',755,201,33,'#382c22');
      const rows=r.summaryRows||[],get=label=>rows.find(x=>x.label===label)?.value||'';
      P.ink(ctx,'闯过卷次',758,244,15,'#74634d');P.ink(ctx,get('卷次'),758,281,38,'#6b3025');wrap(ctx,win?'《'+G.journeyNarrative.documentName(s)+'》已交付':get('止步'),909,258,253,17,'#5e4c37',2);
      const types={'气血':'health','大洋':'gold','牌组':'deck','旧物':'relic'};
      const metrics=rows.filter(x=>types[x.label]);metrics.forEach((item,i)=>P.resource(ctx,{...item,type:types[item.label],ratio:s.player.hp/s.player.maxHp},{x:756+i%2*212,y:314+Math.floor(i/2)*68,width:195,height:58},{light:true}));
      P.resourceIcon(ctx,'path',776,465,'#786144');P.ink(ctx,'脚印',802,465,14,'#68563f');P.ink(ctx,get('脚印'),858,465,18,'#382d22');
      ctx.save();ctx.strokeStyle='#64543e60';ctx.beginPath();ctx.moveTo(758,488);ctx.lineTo(1166,484);ctx.stroke();ctx.restore();
      wrap(ctx,win?r.prompt:'伤重撤回藏身处。'+(s.mission?.retrieved?'残卷藏入暗线转移点，养伤后再取。':"证据还在城里，养好伤再取。"),758,501,405,16,'#5d4c37',2);
      const old=(s.nemesis?.pool||[]).length;if(r.consequenceSummary)wrap(ctx,r.consequenceSummary,758,557,408,15,'#863d30',2);else if(r.nextAttempt)wrap(ctx,r.nextAttempt,758,557,408,16,'#663b2b',2);else P.ink(ctx,old?(win?'旧仇簿留有 '+old+' 名追缉者，重行时沿用。':'尚有 '+old+' 位宿敌，记着你的招式。'):(win?'重走此案，沿用旧仇簿。':'收起这页行记，养好伤再上路。'),758,579,15,'#863d30');
    });action(ctx,L.reportDetails,'查阅此行');L.reportButtons.forEach((b,i)=>action(ctx,b,r.buttons[i].label,i===1));
  }
  function eventBackground(e,act){return ({"act2_bandit_dice_bowl":"assets/journey/events-20261028/act2_bandit_dice_bowl.png","act1_teahouse_poison":"assets/journey/events-20261028/act1_teahouse_poison.png","act3_informer_confession":"assets/journey/events-20261028/act3_informer_confession.png","act2_overturned_caravan":"assets/journey/events-20261028/act2_overturned_caravan.png","act3_chapel_lantern":"assets/journey/events-20261028/act3_chapel_lantern.png","act4_field_hospital":"assets/journey/events-20261028/act4_field_hospital.png","act2_cinder_cistern":"assets/journey/events-20261028/act2_cinder_cistern.png","act5_arsenal_crate":"assets/journey/events-20261028/act5_arsenal_crate.png","act4_telegraph_station":"assets/journey/events-20261028/act4_telegraph_station.png","act4_rail_spikes":"assets/journey/events-20261028/act4_rail_spikes.png","act3_bridge_performance":"assets/journey/events-20261028/act3_bridge_performance.png","act1_execution_notice":"assets/journey/events-20261028/act1_execution_notice.png",act5_last_letter:'assets/journey/events-20261027/act5_last_letter.png',act1_river_shrine:'assets/journey/events-20261027/act1_river_shrine.png',act4_payroll_ruts:'assets/journey/events-20261027/act4_payroll_ruts.png',act1_child_in_embers:'assets/journey/events-20261027/act1_child_in_embers.png',act2_buried_flag:'assets/journey/events-20261027/act2_buried_flag.png'})[e?.eventId]||G.journeyEvents?.art[e?.eventId]||paths.events[Math.max(1,Math.min(5,act||e?.actNumber||1))-1];}
  G.render.journeyStory={paths,assetPaths,eventLayout,titleLayout,renderArrival,renderEvent,renderReport,eventBackground};
})();

