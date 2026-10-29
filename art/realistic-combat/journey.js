/* Layered journey sample. Existing scenes own all rule mutations. */
(function () {
  'use strict';
  const reward=G.scenes.reward,rest=G.scenes.rest,S=G.scenes.restShared,A=G.render.assets;
  const base={rewardUpdate:reward.update,restUpdate:rest.update,restPrepare:rest.prepareState,rewardLayout:reward.getLayout,restLayout:S.getLayout};
  const copy=x=>JSON.parse(JSON.stringify(x)),box=(x,y,width,height)=>({x,y,width,height}),root='assets/journey/material-light-20261002/';
  const art={background:root+'rest-background.png',rewardBackground:root+'reward-background.png',idle:root+'rest-idle.png',heal:root+'rest-heal.png',practice:root+'rest-practice.png',blade:root+'reward-blade.png',dirty:root+'reward-dirty.png',unarmed:root+'reward-unarmed.png'};
  const contains=(p,b)=>!!p&&!!b&&p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height,active=()=>!!G.render.realisticJourney;
  const actionContains=(p,b)=>G.render.canvasUtils.containsAction(p,b);
  // Keep the full journey's native pause control clear at every viewport scale.
  const B={deck:box(1100,92,134,40),restDeck:box(1100,92,134,40),close:box(1100,92,134,40),prev:box(356,600,102,38),next:box(550,600,102,38),upgradePrev:box(602,560,112,40),upgradeNext:box(1050,560,112,40)};
  Object.defineProperties(B,{
    confirm:{enumerable:true,get:()=>rewardConfirmBox()},
    restConfirm:{enumerable:true,get:()=>restConfirmBox(G.main?.getLayoutState().restChoice)},
    cancel:{enumerable:true,get:()=>{const r=G.main?.getLayoutState();return r?.receiptKind==='reward'?box(564,650,190,44):r?.hasReceipt?B.deck:box(622,588,178,44);}},
    accept:{enumerable:true,get:()=>{const r=G.main?.getLayoutState();return r?.receiptKind==='reward'?box(972,650,220,44):r?.hasReceipt&&!r.receiptCard?box(768,478,220,44):box(916,588,218,44);}}
  });
  function rewardLayout(count){
    const L=base.rewardLayout(count),w=count===4?140:184,gap=count===4?24:30,start=866-(count*w+(count-1)*gap)/2;
    if(G.render.journeyRedesign){const rw=count===4?174:194,rg=count===4?22:32,rx=785-(count*rw+(count-1)*rg)/2;L.cards=Array.from({length:count},(_,i)=>box(rx+i*(rw+rg),178,rw,306));L.skip=box(444,552,190,48);return L;}
    L.cards=Array.from({length:count},(_,i)=>box(start+i*(w+gap),240,w,304));L.skip=box(564,600,190,44);return L;
  }
  function cardBox(r,index){
    const motion=G.render.journeyMotion,b=rewardLayout(r.options.length).cards[index],t=index===r.reviewHoverIndex?Math.max(0,Math.min(1,((r.reviewHoverMs||0)-(motion?160:1000))/220)):0;
    const scale=1+(motion?.disabled()?0:motion ? .10 : .18)*(1-Math.pow(1-t,3)),lift=motion&&!motion.disabled()?motion.value('reward-lift:'+index,r.reviewSelectedIndex===index?12:0,0):r.reviewSelectedIndex===index?12:0;
    return {...box(b.x+(b.width-b.width*scale)/2,b.y+(b.height-b.height*scale)/2-lift,b.width*scale,b.height*scale),scale};
  }
  function rewardConfirmBox(r){
    if(G.render.journeyRedesign)return box(918,552,252,48);
    return box(972,600,220,44);
  }
  function restLayout(){return {...base.restLayout(),heal:box(750,266,430,118),upgrade:box(750,430,430,118),healLabel:box(762,274,360,50),upgradeLabel:box(762,438,360,50),back:box(1090,634,144,40)};}
  function restConfirmBox(choice){return box(1008,choice==='upgrade'?500:336,184,48);}
  const stackBoxes=S.getUpgradeStackBoxes;
  function upgradeBoxes(state){const page=state.rest.reviewUpgradePage||0;return S.buildUpgradeStacks(state.rest.deckEntries).slice(page*4,page*4+4).map((s,i)=>({...s,...box(592,214+i*82,608,76)}));}
  reward.getLayout=rewardLayout;S.getLayout=restLayout;
  const assetPaths=[...Object.values(art),'assets/ui/combat_card_torn_rice_paper_gpt4ovip_transparent_01.png',...Object.keys(G.relics.definitions).map(id=>G.render.assets.getRelicPath(id))];
  let cancelRequested=false,restChoiceGuard=null;
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&active()&&['reward','rest'].includes(G.main?.getState().scene)){e.preventDefault();cancelRequested=true;}});
  window.addEventListener('contextmenu',e=>{if(e.target.id==='game-canvas'&&active()&&['reward','rest'].includes(G.main?.getState().scene)){e.preventDefault();cancelRequested=true;}});
  function invoke(fn,state,input,clicks){const consume=G.main.consumeClicks;G.main.consumeClicks=()=>{const q=clicks;clicks=[];return q;};try{return fn(state,input);}finally{G.main.consumeClicks=consume;}}
  function text(ctx,value,x,y,size=18,color='#d9c9ad',align='left'){
    if(G.render.sceneEntry?.active()&&G.render.sceneEntry.text(ctx,x,y,()=>text(ctx,value,x,y,size,color,align)))return;
    ctx.save();ctx.shadowColor=/^#[0-7]/i.test(color)?'transparent':'#060808';ctx.shadowBlur=/^#[0-7]/i.test(color)?0:2;ctx.shadowOffsetY=1;G.render.realisticCombat.ui.ink(ctx,value,x,y,size,color,align);ctx.restore();
  }
  function button(ctx,b,label,enabled=true,wood=false){
    const motion=G.render.journeyMotion;if(motion){motion.surface(ctx,'journey-button:'+label,b,{enabled,distance:8},()=>paintButton(ctx,b,label,enabled,wood));return;}paintButton(ctx,b,label,enabled,wood);
  }
  function paintButton(ctx,b,label,enabled=true,wood=false){
    if(G.render.journeyMaterials){G.render.journeyMaterials.action(ctx,b,label,{enabled,paper:!!b.paper,primary:wood});return;}
    const hover=enabled&&contains(G.main.getPointer(),b);ctx.save();ctx.globalAlpha=enabled?1:.4;
    if(wood)A.drawCombatPanelSurface(ctx,b.x,b.y,b.width,b.height,{overlayAlpha:hover?.18:.36,stroke:'rgba(137,111,76,.35)',highlight:'rgba(180,144,93,.04)',lineWidth:1,hideNails:true});
    text(ctx,label,b.x+b.width/2,b.y+b.height/2,wood?18:15,b.paper?(hover?'#81392b':'#382b20'):(hover?'#eee3cf':'#c7baa6'),'center');
    if(hover&&!wood){ctx.strokeStyle=b.paper?'#81392b':'#a88e65';ctx.beginPath();ctx.moveTo(b.x+20,b.y+b.height-5);ctx.lineTo(b.x+b.width-20,b.y+b.height-5);ctx.stroke();}ctx.restore();
  }
  function wrap(ctx,value,x,y,width,size=14,color='#c1b8aa',maxLines=5){
    if(G.render.sceneEntry?.active()&&G.render.sceneEntry.text(ctx,x,y,()=>wrap(ctx,value,x,y,width,size,color,maxLines)))return;
    ctx.save();ctx.font='600 '+size+'px '+G.render.ui.getBodyFontFamily();ctx.fillStyle=color;ctx.textBaseline='top';
    const lines=G.render.journeyTypesetting?G.render.journeyTypesetting.lines(ctx,value,width):[];
    if(!G.render.journeyTypesetting){let row='';for(const char of String(value||'')){if(char==='\n'||row&&ctx.measureText(row+char).width>width){lines.push(row);row=char==='\n'?'':char;}else row+=char;}if(row)lines.push(row);}
    lines.slice(0,maxLines).forEach((s,i)=>ctx.fillText(i===maxLines-1&&lines.length>maxLines?s.slice(0,-1)+'…':s,x,y+i*(size+7)));ctx.restore();
  }
  function resolvedCard(entry){
    const def=G.cards.getCardByName(entry.name)||entry,c={...def,...entry},manifest=window.KGAME_CARD_ART_MANIFEST.cards;let id=c.id;
    if(!manifest[id])id=c.consumeFlaw?'blade_sacrifice':c.flaw?'blade_quick_cut':c.fester||c.blind?'dirty_lime_throw':c.block&&!c.damage?'basic_defend':c.hits>1?'combo_chain_punch':'basic_strike';return {c,art:manifest[id]};
  }
  function originalArt(ctx,entry,b){
    const {art:cardArt}=resolvedCard(entry),path=typeof cardArt==='string'?cardArt:cardArt?.path;if(!path)return;
    ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.width,b.height);ctx.clip();A.drawImageCover(ctx,path,b.x,b.y,b.width,b.height);ctx.restore();
  }
  function combatCard(ctx,entry,b){
    const {c}=resolvedCard(entry),scale=b.width/150;ctx.save();ctx.translate(b.x,b.y);ctx.scale(scale,scale);
    G.render.woodcut.card(ctx,{...c,sourceCard:c,x:0,y:0,width:150,height:b.height/scale,layoutMode:'detail',playable:true,disableBaseShadow:true,shadowBlur:3,shadowOffsetX:2,shadowOffsetY:3});ctx.restore();
  }
  function paper(ctx,b){
    ctx.save();ctx.beginPath();ctx.moveTo(b.x+5,b.y+2);ctx.lineTo(b.x+b.width*.31,b.y);ctx.lineTo(b.x+b.width*.34,b.y+2);ctx.lineTo(b.x+b.width-4,b.y+1);
    ctx.lineTo(b.x+b.width,b.y+b.height*.61);ctx.lineTo(b.x+b.width-2,b.y+b.height*.65);ctx.lineTo(b.x+b.width-3,b.y+b.height-3);
    ctx.lineTo(b.x+b.width*.28,b.y+b.height);ctx.lineTo(b.x+3,b.y+b.height-2);ctx.lineTo(b.x,b.y+b.height*.24);ctx.closePath();ctx.clip();
    ctx.fillStyle='#bcad90';ctx.fillRect(b.x,b.y,b.width,b.height);
    const entry=A.getImageEntry('assets/ui/combat_card_torn_rice_paper_gpt4ovip_transparent_01.png');
    if(entry.loaded){const img=entry.image;ctx.globalAlpha*=.52;ctx.filter='saturate(.45)';ctx.drawImage(img,img.width*.16,img.height*.19,img.width*.68,img.height*.6,b.x,b.y,b.width,b.height);}
    ctx.restore();
  }
  function relicContents(ctx,entry,b){
    const image=A.getImageEntry(G.render.assets.getRelicPath(entry.id));
    if(image.loaded){const img=image.image,scale=Math.min((b.width-32)/img.width,104/img.height),w=img.width*scale,h=img.height*scale;ctx.save();ctx.filter='saturate(.4)';ctx.globalCompositeOperation='multiply';ctx.drawImage(img,b.x+(b.width-w)/2,b.y+16+(104-h)/2,w,h);ctx.restore();}
    else text(ctx,entry.icon||'旧',b.x+b.width/2,b.y+72,38,'#4a3626','center');
    text(ctx,entry.name,b.x+14,b.y+140,20,'#35281d');wrap(ctx,entry.description||entry.text,b.x+14,b.y+160,b.width-28,16,'#463624',5);
  }
  function sheet(ctx,entry,b,selected=false,relic=false){
    const motion=G.render.journeyMotion;if(motion){motion.surface(ctx,'sheet:'+entry.name,b,{delay:Math.max(0,b.x-480)*.12,distance:26,angle:-.025},()=>paintSheet(ctx,entry,b,selected,relic));return;}paintSheet(ctx,entry,b,selected,relic);
  }
  function paintSheet(ctx,entry,b,selected=false,relic=false){
    // Card light belongs to the menu; the shared combat card itself remains unchanged.
    if(selected){ctx.save();ctx.shadowColor='rgba(196,158,94,.40)';ctx.shadowBlur=18;ctx.fillStyle='#241b12';ctx.fillRect(b.x+10,b.y+9,b.width-20,b.height-18);ctx.restore();}
    if(relic){paper(ctx,b);relicContents(ctx,entry,b);}else combatCard(ctx,entry,b);
    if(selected){ctx.strokeStyle='#c69962';ctx.lineWidth=2;ctx.strokeRect(b.x+1,b.y+1,b.width-2,b.height-2);}
  }
  const backgroundCache={};
  let rewardWash;
  function rewardDecisionWash(ctx){
    if(!rewardWash){rewardWash=document.createElement('canvas');rewardWash.width=750;rewardWash.height=526;const c=rewardWash.getContext('2d'),across=c.createLinearGradient(0,0,750,0);across.addColorStop(0,'#0b111400');across.addColorStop(.14,'#0b1114eb');across.addColorStop(.88,'#0b1114eb');across.addColorStop(1,'#0b111400');c.fillStyle=across;c.fillRect(0,0,750,526);c.globalCompositeOperation='destination-in';const down=c.createLinearGradient(0,0,0,526);down.addColorStop(0,'#0000');down.addColorStop(.08,'#000');down.addColorStop(.87,'#000');down.addColorStop(1,'#0000');c.fillStyle=down;c.fillRect(0,0,750,526);}
    ctx.drawImage(rewardWash,490,156);
  }
  function restPose(state){
    if(state.reviewReceipt?.cardName||state.rest?.mode==='upgrade')return 'practice';
    if(state.reviewReceipt?.title==='伤口已裹好')return 'heal';
    return state.rest?.reviewChoice==='heal'?'heal':state.rest?.reviewChoice==='upgrade'?'practice':'idle';
  }
  function stage(ctx,state,kind=state.scene){
    const scene=kind==='reward'?'reward':'rest',background=scene==='reward'?art.rewardBackground:art.background;
    const density=G.render.canvasUtils.density(ctx);
    if(!backgroundCache[scene]||backgroundCache[scene].renderScale!==density){
      const entry=A.getImageEntry(background);if(!entry.loaded){ctx.fillStyle='#11161a';ctx.fillRect(0,0,1280,720);return;}
      const layer=G.render.canvasUtils.createLayer(1280,720,density);
      const c=layer.getContext('2d');c.imageSmoothingQuality='high';
      // Quiet the distant detail, while keeping the figure and real card art crisp.
      c.filter=scene==='reward'?'saturate(.65) brightness(.80) blur(.6px)':'saturate(.65) brightness(.85) blur(.6px)';
      A.drawImageCover(c,background,0,0,1280,720);c.filter='none';
      if(scene==='rest'){
        // Courtyard shadow begins below the roof; the roof and lamp-lit left stones retain their light.
        const shade=document.createElement('canvas');shade.width=1280;shade.height=720;
        const s=shade.getContext('2d'),vertical=s.createLinearGradient(0,190,0,460);
        vertical.addColorStop(0,'rgba(4,8,11,0)');vertical.addColorStop(1,'rgba(4,8,11,.24)');
        s.fillStyle=vertical;s.fillRect(500,190,780,530);s.globalCompositeOperation='destination-in';
        const lateral=s.createLinearGradient(500,0,780,0);lateral.addColorStop(0,'rgba(0,0,0,0)');lateral.addColorStop(1,'rgba(0,0,0,1)');
        s.fillStyle=lateral;s.fillRect(0,0,1280,720);c.drawImage(shade,0,0);
      }
      backgroundCache[scene]=layer;
    }
    ctx.drawImage(backgroundCache[scene],0,0,1280,720);
    const style=state.player.chosenStyle,pose=scene==='reward'?(style==='blade'?'blade':style==='dirty'?'dirty':'unarmed'):restPose(state),foreground=A.getImageEntry(art[pose]);
    // These menu layers have their own subdued scene light; combat presentation stays independent.
    if(foreground.loaded||scene==='rest'){const motion=G.render.journeyMotion,draw=()=>{
      for(const layer of (scene==='rest'&&motion?motion.layers(pose,p=>A.getImageEntry(art[p]).loaded):[{pose,alpha:1}])){const image=A.getImageEntry(art[layer.pose]);if(!image.loaded)continue;ctx.save();ctx.globalAlpha*=layer.alpha;ctx.imageSmoothingQuality='high';
        const filtered=G.render.canvasUtils.cachedLayer('journey-figure:'+scene+':'+art[layer.pose],1280,720,density,c=>{
          c.filter=scene==='reward'?'saturate(.75) brightness(.86)':'saturate(.55) brightness(.88)';
          if(scene==='reward')c.drawImage(image.image,8,51,1189,669);else c.drawImage(image.image,0,0,1280,720);
        });ctx.drawImage(filtered,0,0,1280,720);ctx.restore();}
    };if(motion)motion.pose(ctx,draw);else draw();
      if(scene==='rest'){
        // Let the small flame keep its source brightness, without re-lighting the entire robe.
        ctx.save();ctx.beginPath();ctx.ellipse(102,426,24,34,0,0,Math.PI*2);ctx.clip();
        // Only this small ellipse can be seen. Snap its padded buffer to the
        // same backing grid; retain the original image transform/filter.
        const x=Math.floor(74*density)/density,y=Math.floor(388*density)/density,w=Math.ceil((130-x)*density)/density,h=Math.ceil((464-y)*density)/density;
        const lit=G.render.canvasUtils.cachedLayer('journey-flame:'+art[pose],w,h,density,c=>{
          const full=G.render.canvasUtils.createLayer(1280,720,density),brush=full.getContext('2d');
          brush.filter='saturate(.65) brightness(.96)';brush.drawImage(foreground.image,0,0,1280,720);
          c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(full,Math.round(x*density),Math.round(y*density),c.canvas.width,c.canvas.height,0,0,c.canvas.width,c.canvas.height);c.restore();
          full.width=full.height=0;
        });
        const t=ctx.getTransform();
        if(!t.b&&!t.c&&!t.e&&!t.f&&Math.abs(t.a-density)<.00001&&Math.abs(t.d-density)<.00001){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(lit,Math.round(x*density),Math.round(y*density));ctx.restore();}
        else ctx.drawImage(lit,x,y,w,h);
        ctx.restore();
      }
    }
    const edge=ctx.createLinearGradient(0,660,0,720);edge.addColorStop(0,'rgba(5,8,10,0)');edge.addColorStop(1,'rgba(5,8,10,.32)');ctx.fillStyle=edge;ctx.fillRect(0,660,1280,60);
  }
  function stats(ctx,state){if(G.render.journeyMaterials){G.render.journeyMaterials.ledger(ctx,state);return;}const p=state.player,b=box(42,648,308,34);A.drawCombatPanelSurface(ctx,b.x,b.y,b.width,b.height,{overlayAlpha:.44,stroke:'rgba(137,111,76,.3)',highlight:'rgba(180,144,93,.04)',hideNails:true});text(ctx,'气血 '+p.hp+'/'+p.maxHp+'  ·  大洋 '+p.gold+'  ·  行囊 '+p.masterDeckNames.length+' 张',b.x+12,b.y+17,13,'#c9bba3');}
  function header(ctx,state,title,subtitle,x=596,y=162,size=34){text(ctx,title,x,y,size,'#e6dcc8');if(subtitle)wrap(ctx,subtitle,x,y+size*.72,Math.min(580,1234-x),16,'#c3b59e',2);stats(ctx,state);}
  function deckGroups(state){
    const groups=[];for(const name of state.player.masterDeckNames){let item=groups.find(g=>g.name===name);if(!item){item={name,count:0,card:G.cards.getCardByName(name)};groups.push(item);}item.count++;}return groups;
  }
  function deckRows(state){if(G.render.journeyBook)return G.render.journeyBook.deckRows(state);return deckGroups(state).slice((state.reviewPanel.page||0)*8,(state.reviewPanel.page||0)*8+8).map((g,i)=>({...g,index:state.reviewPanel.page*8+i,box:box(94,190+i*43,370,38)}));}
  function renderDeck(ctx,state){
    if(G.render.journeyBook){G.render.journeyBook.renderDeck(ctx,state);return;}
    stage(ctx,state);ctx.fillStyle='rgba(5,8,10,.80)';ctx.fillRect(0,0,1280,720);
    const groups=deckGroups(state),panel=state.reviewPanel,selected=groups[panel.index]||groups[0];
    header(ctx,state,'行囊招录',state.player.masterDeckNames.length+' 张 · '+groups.length+' 式',94,96);
    deckRows(state).forEach(g=>{const b=g.box,selected=panel.index===g.index,hover=contains(G.main.getPointer(),b);
      text(ctx,g.name,b.x+16,b.y+19,20,selected||hover?'#eee1c6':'#b5aa94');text(ctx,'× '+g.count,b.x+b.width-16,b.y+19,16,'#9c907a','right');
      if(selected){ctx.fillStyle='#a04435';ctx.fillRect(b.x,b.y+11,3,16);}});
    if(selected?.card){text(ctx,'行囊中的招式',708,160,14,'#a99a83');combatCard(ctx,selected.card,box(708,192,226,354));}
    button(ctx,B.close,'收起行囊');button(ctx,B.prev,'上一页',panel.page>0);button(ctx,B.next,'下一页',(panel.page+1)*8<groups.length);
    text(ctx,(panel.page+1)+' / '+Math.max(1,Math.ceil(groups.length/8)),282,594,13,'#aa9a82','center');
  }
  function updateDeck(state,click,cancel){
    if(cancel||actionContains(click,B.close)){state.reviewPanel=null;return state;}const p=state.reviewPanel,groups=deckGroups(state);
    if(actionContains(click,B.prev)&&p.page>0){p.page--;p.index=p.page*8;}else if(actionContains(click,B.next)&&(p.page+1)*8<groups.length){p.page++;p.index=p.page*8;}
    else{const row=deckRows(state).find(r=>contains(click,r.box));if(row)p.index=row.index;}return state;
  }
  function openDeck(state){state.reviewPanel={type:'deck',page:0,index:0};return state;}
  rest.prepareState=function(state){
    const next=base.restPrepare(state);
    if(active()&&state.rest?.nodeId===next.rest.nodeId){
      next.rest.reviewUpgradePage=Math.min(state.rest.reviewUpgradePage||0,Math.max(0,Math.ceil(S.buildUpgradeStacks(next.rest.deckEntries).length/4)-1));
      next.rest.reviewChoice=next.rest.mode==='choice'?state.rest.reviewChoice||null:null;
      next.rest.reviewUpgradeIndex=next.rest.mode==='upgrade'&&Number.isInteger(state.rest.reviewUpgradeIndex)&&next.rest.deckEntries[state.rest.reviewUpgradeIndex]?.canUpgrade?state.rest.reviewUpgradeIndex:null;
      next.rest.reviewHoveredStack=next.rest.mode==='upgrade'?state.rest.reviewHoveredStack:null;next.rest.reviewHoverMs=next.rest.mode==='upgrade'?(state.rest.reviewHoverMs||0):0;
    }return next;
  };
  function receipt(state,previous,title,lines,kind){
    const cardName=title==='已收入行囊'?previous.reward.options[previous.reward.reviewSelectedIndex]?.name:title==='再练一式'?state.player.masterDeckNames[previous.rest.reviewUpgradeIndex]:null;
    state.scene=kind;state[kind]=copy(previous[kind]);state.reviewPanel=null;state.reviewReceipt={title,lines,kind,cardName,lockMs:240};
    if(kind==='rest'){state.rest.mode='result';state.rest.reviewUpgradeIndex=null;state.rest.reviewChoice=null;}return state;
  }
  function continueReceipt(state){
    const kind=state.reviewReceipt.kind;state.reviewReceipt=null;state.reviewPanel=null;
    if(state.reviewJourney?.mode==='sequence'){
      if(kind==='reward'){state.reward=null;state.rest=null;state.scene='rest';return rest.prepareState(state);}
      if(state.reviewJourney.leg===0){state.reviewJourney.leg=1;return G.realisticReview.beginBattle(state,'street_foreign_scout');}
      state.rest.mode='result';state.reviewReceipt={kind:'complete',title:'暂得喘息',lines:["刀伤裹好了，出手也比先前沉稳。","过了这道关，前头还有人拦路。"]};return state;
    }state.reward=null;state.rest=null;state.scene='map';return G.scenes.map.prepareState(state);
  }
  function receiptInput(state,click,cancel,input){
    state.reviewReceipt.lockMs=Math.max(0,(state.reviewReceipt.lockMs||0)-(input?.deltaMs||0));if(state.reviewPanel)return updateDeck(state,click,cancel);
    if(actionContains(click,B.cancel))return openDeck(state);
    if(actionContains(click,B.accept)&&state.reviewReceipt.lockMs===0){if(state.reviewReceipt.kind==='complete'){G.realisticReview.restart();return G.main.getState();}return continueReceipt(state);}return state;
  }
  function renderReceipt(ctx,state){
    const r=state.reviewReceipt,entry=r.cardName&&G.cards.getCardByName(r.cardName);stage(ctx,state,r.kind==='reward'?'reward':'rest');
    if(r.kind==='reward'&&G.render.journeyMaterials){rewardDecisionWash(ctx);G.render.journeyMaterials.sceneHeading(ctx,'战后拾遗','此战所得已清点');text(ctx,r.title,564,200,28,'#e6dcc8');stats(ctx,state);}
    else header(ctx,state,r.title,entry?'招式已记入行囊。':null,entry?596:750,168);
    if(entry){combatCard(ctx,entry,G.render.journeyMotion?.rect('receipt-card',box(614,234,218,326))||box(614,234,218,326));const paint=()=>r.lines.forEach((line,i)=>wrap(ctx,line,878,258+i*112,324,16,'#c1b8aa',4));if(G.render.journeyMotion?.receiptContent)G.render.journeyMotion.receiptContent(ctx,paint);else paint();}
    else r.lines.forEach((line,i)=>wrap(ctx,line,750,258+i*76,420,17,'#c1b8aa',3));
    button(ctx,B.cancel,'翻看行囊');button(ctx,B.accept,r.kind==='complete'?'再走一遍':r.kind==='reward'&&state.reviewJourney?.mode==='sequence'?'去破庙歇脚':'继续上路',!r.lockMs,true);
  }
  reward.update=function(state,input){
    if(!active())return base.rewardUpdate(state,input);
    const click=G.main.consumeClicks()[0],cancel=cancelRequested;cancelRequested=false;
    if(!click&&!cancel){
      if(state.reviewPanel)return state;
      if(state.reviewReceipt&&!(state.reviewReceipt.lockMs>0))return state;
      const r=state.reward,pointer=G.main.getPointer();
      if(!state.reviewReceipt&&r?.options?.length&&!(r.presentation?.introMs>0)&&!pointer.isDown&&!pointer.pressed&&!pointer.released){
        const index=r.hoverActivated?r.options.findIndex((_,i)=>contains(pointer,cardBox(r,i))):-1,hover=index<0?null:index;
        const hoverDone=!Number.isInteger(hover)||(r.reviewHoverMs||0)>=(G.render.journeyMotion?380:1220);
        if(r.hoverPointerX===pointer.x&&r.hoverPointerY===pointer.y&&r.hoveredOptionIndex===hover&&r.reviewHoverIndex===hover&&hoverDone)return state;
      }
    }
    let next=copy(state);
    if(next.reviewReceipt)return receiptInput(next,click,cancel,input);if(next.reviewPanel)return updateDeck(next,click,cancel);
    next=invoke(base.rewardUpdate,next,input,[]);const r=next.reward,L=rewardLayout(r.options.length),pointer=G.main.getPointer();
    let hover=r.hoverActivated?r.options.findIndex((_,i)=>contains(pointer,cardBox(r,i))):-1;hover=hover<0?null:hover;
    r.hoveredOptionIndex=hover;if(r.reviewHoverIndex!==hover){r.reviewHoverIndex=hover;r.reviewHoverMs=0;}else if(Number.isInteger(hover))r.reviewHoverMs=(r.reviewHoverMs||0)+(input?.deltaMs||0);
    if(cancel){r.reviewSelectedIndex=null;return next;}if(!click)return next;if(actionContains(click,B.deck))return openDeck(next);
    const selected=Number.isInteger(r.reviewSelectedIndex)?r.options[r.reviewSelectedIndex]:null;
    if(selected&&actionContains(click,rewardConfirmBox(r))){
      const b=base.rewardLayout(r.options.length).cards[r.reviewSelectedIndex],result=invoke(base.rewardUpdate,next,{deltaMs:0},[{x:b.x+4,y:b.y+4}]);
      if(result.scene==='reward'){result.reward.reviewSelectedIndex=null;return result;}
      return receipt(result,next,'已收入行囊',['招式【'+selected.name+'】已加入牌组。','牌组 '+next.player.masterDeckNames.length+' → '+result.player.masterDeckNames.length+' 张；此战大洋已结入行囊。'],'reward');
    }
    const index=r.options.findIndex((_,i)=>contains(click,cardBox(r,i)));if(index>=0){r.presentation.introMs=0;r.reviewSelectedIndex=index;return next;}
    if(actionContains(click,L.skip)){
      const b=base.rewardLayout(r.options.length).skip,result=invoke(base.rewardUpdate,next,{deltaMs:0},[{x:b.x+4,y:b.y+4}]);
      if(result.scene==='reward'){result.reward.reviewSelectedIndex=null;return result;}
      return receipt(result,next,'拂袖而去',['未取招式，牌组保持 '+result.player.masterDeckNames.length+' 张。','已获得的战斗大洋保留。'],'reward');
    }return next;
  };
  rest.update=function(state,input){
    // A touch selection can lie inside the newly exposed confirmation's 44px
    // hit area. Let the selection settle before a second tap can spend the rest.
    // This is transient input protection, including reduced motion; never save it.
    if(restChoiceGuard){
      if(restChoiceGuard.nodeId!==state.rest?.nodeId||restChoiceGuard.choice!==state.rest?.reviewChoice||state.reviewReceipt)restChoiceGuard=null;
      else restChoiceGuard.ms=Math.max(0,restChoiceGuard.ms-(input?.deltaMs||0));
    }
    if(!active())return base.restUpdate(state,input);
    const click=G.main.consumeClicks()[0],cancel=cancelRequested;cancelRequested=false;
    if(!click&&!cancel){
      if(state.reviewPanel)return state;
      if(state.reviewReceipt&&!(state.reviewReceipt.lockMs>0))return state;
      if(!state.reviewReceipt){
        const r=state.rest,hovered=r.mode==='upgrade'&&!Number.isInteger(r.reviewUpgradeIndex)?upgradeBoxes(state).find(b=>contains(G.main.getPointer(),b))?.deckIndex:null;
        if((r.reviewHoveredStack??null)===(hovered??null)&&(!Number.isInteger(hovered)||(r.reviewHoverMs||0)>=1001))return state;
      }
    }
    let next=copy(state);
    if(next.reviewReceipt)return receiptInput(next,click,cancel,input);if(next.reviewPanel)return updateDeck(next,click,cancel);
    next=invoke(base.restUpdate,next,input,[]);const r=next.rest,L=restLayout();
    const hovered=r.mode==='upgrade'&&!Number.isInteger(r.reviewUpgradeIndex)?upgradeBoxes(next).find(b=>contains(G.main.getPointer(),b))?.deckIndex:null;
    if(r.reviewHoveredStack!==hovered){r.reviewHoveredStack=hovered;r.reviewHoverMs=0;}else if(Number.isInteger(hovered))r.reviewHoverMs=Math.min(1001,(r.reviewHoverMs||0)+(input?.deltaMs||0));
    if(cancel){if(Number.isInteger(r.reviewUpgradeIndex))r.reviewUpgradeIndex=null;else{r.mode='choice';r.reviewChoice=null;}return next;}if(!click)return next;
    if(actionContains(click,B.restDeck))return openDeck(next);
    if(Number.isInteger(r.reviewUpgradeIndex)){
      if(actionContains(click,B.cancel)){r.reviewUpgradeIndex=null;return next;}if(!actionContains(click,B.accept))return next;
      const entry=r.deckEntries[r.reviewUpgradeIndex],b=stackBoxes(S.buildUpgradeStacks(r.deckEntries),base.restLayout()).find(b=>b.deckIndex===entry.index),result=invoke(base.restUpdate,next,input,[{x:b.x+4,y:b.y+4}]);
      return receipt(result,next,'再练一式',['【'+entry.deckName+'】 → 【'+result.player.masterDeckNames[entry.index]+'】','只精进同名牌中的 1 张；此次不恢复气血。'],'rest');
    }
    if(r.mode==='upgrade'){
      const count=S.buildUpgradeStacks(r.deckEntries).length,page=r.reviewUpgradePage||0;
      const navigation=G.render.canvasUtils.pickAction(click,[B.upgradePrev,B.upgradeNext,L.back]);
      if(navigation===B.upgradePrev&&page>0){r.reviewUpgradePage=page-1;return next;}if(navigation===B.upgradeNext&&(page+1)*4<count){r.reviewUpgradePage=page+1;return next;}
      const b=upgradeBoxes(next).find(b=>contains(click,b));if(b){r.reviewUpgradeIndex=b.deckIndex;return next;}
      if(navigation===L.back){r.mode='choice';r.reviewChoice=null;}return next;
    }
    if(actionContains(click,L.back)){next.scene='map';next.map=next.map||{};next.map.note='歇过脚，继续上路。';return receipt(next,state,'歇脚上路',['没有疗伤或精进；气血和牌组保持。'],'rest');}
    // Selection changes the preview pose only. Confirmation invokes the original rule.
    const confirm=restConfirmBox(r.reviewChoice);
    if(r.reviewChoice&&actionContains(click,confirm)){
      // A deliberate tap on the visible confirmation stays immediate. Only
      // its invisible enlarged margin can inherit the rapid selection tap.
      if(restChoiceGuard?.ms>0&&!contains(click,confirm))return next;
      const action=r.reviewChoice,original=base.restLayout()[action],result=invoke(base.restUpdate,next,input,[{x:original.x+4,y:original.y+4}]);
      if(result.scene==='map')return receipt(result,next,'伤口已裹好',['恢复 '+(result.player.hp-next.player.hp)+' 点气血：'+next.player.hp+' → '+result.player.hp+'。','此次歇脚已用来疗伤，不再精进招式。'],'rest');
      result.rest.reviewChoice=null;return result;
    }
    if(contains(click,L.heal)){if(next.player.hp>=next.player.maxHp){r.note='气血已满。可以再练一式，或歇脚后上路。';r.reviewChoice=null;}else r.reviewChoice='heal';}
    else if(contains(click,L.upgrade)){if(!S.getUpgradableCount(r.deckEntries)){r.note='无可精进招式。可以裹伤，或歇脚后上路。';r.reviewChoice=null;}else r.reviewChoice='upgrade';}
    if(r.reviewChoice!==state.rest.reviewChoice)restChoiceGuard=r.reviewChoice?{nodeId:r.nodeId,choice:r.reviewChoice,ms:260}:null;
    return next;
  };
  function renderReward(state,ctx){
    if(state.reviewPanel){renderDeck(ctx,state);return;}if(state.reviewReceipt){renderReceipt(ctx,state);return;}
    const r=state.reward,L=rewardLayout(r.options.length);stage(ctx,state,'reward');
    const M=G.render.journeyMaterials;
    if(M)M.sceneHeading(ctx,'战后拾遗','此战已得 '+r.goldAward+' 大洋');else header(ctx,state,'战后拾遗','此战已得 '+r.goldAward+' 大洋',54,76,38);
    if(['elite','gate','nemesis'].includes(r.sourceNodeType||state.combat.nodeType)){
      const copy=G.nemesis.getVictoryCopy(r.sourceNodeType||state.combat.nodeType,state);
      wrap(ctx,copy.subtitle,54,124,456,16,'#b7ad9b',3);
    }
    // One quiet decision area connects options, selection and commitment.
    rewardDecisionWash(ctx);
    text(ctx,r.mode==='relic'?'先取旧物 · 随后选招式':r.basicDraftAct?'本门补招 · 择一式带走':'择一式带走',564,207,24,'#e4d5bd');
    const last=r.lastRelicChoice; if(r.mode==='card'&&last)text(ctx,last==='放弃旧物'?'旧物未取':last+'已收好',1186,207,15,'#bdac90','right');
    r.options.forEach((entry,i)=>{ctx.save();ctx.globalAlpha=1-Math.min(.55,(r.presentation?.introMs||0)/1400);sheet(ctx,entry,cardBox(r,i),r.reviewSelectedIndex===i,r.mode==='relic');ctx.restore();});
    const selected=Number.isInteger(r.reviewSelectedIndex)?r.options[r.reviewSelectedIndex]:null;
    if(selected){const owned=r.mode==='relic'?(state.player.relics||[]).includes(selected.id):state.player.masterDeckNames.filter(n=>n===(selected.deckName||selected.name)).length;
      text(ctx,'已选 · '+selected.name,564,571,18,'#e2ceb0');text(ctx,r.mode==='relic'?'收下后立即生效':'同名 '+owned+' → '+(owned+1)+' 张',1186,571,16,'#bcac92','right');
    }else text(ctx,G.journeyPreparation?.canDraft(state)?'点选后确认。菜单→招式可改选本门补招。':'点选细读，再确认收下。',564,571,17,'#bcac92');
    button(ctx,B.confirm,r.mode==='relic'?'收下这件旧物':'取 · 带走此式',!!selected,true);
    button(ctx,B.deck,'翻看行囊');button(ctx,L.skip,r.mode==='relic'?'不取旧物':'不取招式');stats(ctx,state);
  }
  function renderRest(state,ctx){
    if(state.reviewPanel){renderDeck(ctx,state);return;}if(state.reviewReceipt){renderReceipt(ctx,state);return;}
    const r=state.rest,L=restLayout(),stacks=S.buildUpgradeStacks(r.deckEntries);stage(ctx,state,'rest');
    // Quiet local backing: keep the character, candle and the standard ledger visible.
    const backing=G.render.canvasUtils.cachedLayer('rest-reading-wash-v2',720,590,G.render.canvasUtils.density(ctx),brush=>{
      const across=brush.createLinearGradient(0,0,720,0);across.addColorStop(0,'#08101100');across.addColorStop(.15,'#081011b8');across.addColorStop(.9,'#081011c4');across.addColorStop(1,'#08101100');brush.fillStyle=across;brush.fillRect(0,0,720,590);
      const vertical=brush.createLinearGradient(0,0,0,590);vertical.addColorStop(0,'#0000');vertical.addColorStop(.12,'#000');vertical.addColorStop(.82,'#000');vertical.addColorStop(1,'#0000');brush.globalCompositeOperation='destination-in';brush.fillStyle=vertical;brush.fillRect(0,0,720,590);
    });ctx.drawImage(backing,540,90,720,590);
    if(Number.isInteger(r.reviewUpgradeIndex)){
      const entry=r.deckEntries[r.reviewUpgradeIndex],up=G.cards.getCardByName(G.cards.upgradeDeckCardAt([entry.deckName],0).upgradedName);
      header(ctx,state,'再练一式','只精进一张，此次不疗伤。',614,150);text(ctx,'原有招式',614,210,14,'#b2a48f');text(ctx,'精进之后',908,210,14,'#b2a48f');
      combatCard(ctx,entry,box(614,224,236,346));combatCard(ctx,up,box(908,224,236,346));
      button(ctx,B.restDeck,'翻看行囊');button(ctx,B.cancel,'再想想');button(ctx,B.accept,'确认精进',true,true);return;
    }
    if(r.mode==='upgrade'){
      header(ctx,state,'残灯练招','点选招式，比较原式与精进效果。',592,150);const rows=upgradeBoxes(state);
      rows.forEach(row=>{const b=row,hover=r.reviewHoveredStack===row.deckIndex;
        ctx.save();ctx.fillStyle=hover?'#25302a99':'#10191b66';ctx.fillRect(b.x,b.y,b.width,b.height-3);ctx.restore();originalArt(ctx,row.entry,box(b.x+8,b.y+9,74,56));text(ctx,row.entry.name,b.x+100,b.y+20,22,hover?'#eee1c6':'#ded2bb');
        text(ctx,'体力 '+row.entry.cost+' · ×'+row.count,b.x+b.width-8,b.y+20,16,'#b6a991','right');wrap(ctx,row.entry.text,b.x+100,b.y+36,b.width-116,16,'#cec5b5',2);if(hover){ctx.fillStyle='#a04435';ctx.fillRect(b.x,b.y+20,3,20);}});
      const focused=r.reviewHoverMs>1000&&rows.find(row=>row.deckIndex===r.reviewHoveredStack);
      if(focused)combatCard(ctx,focused.entry,box(378,218,192,324));
      if(stacks.length>4){const page=r.reviewUpgradePage||0,pages=Math.ceil(stacks.length/4);button(ctx,B.upgradePrev,'上一页',page>0);button(ctx,B.upgradeNext,'下一页',page+1<pages);text(ctx,(page+1)+' / '+pages,882,580,13,'#aa9a82','center');}
      button(ctx,B.restDeck,'翻看行囊');button(ctx,L.back,'先不练了');return;
    }
    const heal=Math.min(r.healAmount,state.player.maxHp-state.player.hp),phone=!!window.KGAME_MOBILE,M=G.render.journeyMaterials;
    text(ctx,'破庙暂歇',750,168,38,'#e6dcc8');
    wrap(ctx,r.note&&!/^破庙风冷/.test(r.note)?r.note:'夜深路远，今夜只做一件事。',750,198,474,phone?23:20,'#c3b59e',2);stats(ctx,state);
    const choices=[
      {id:'heal',b:L.heal,seal:'息',title:'温酒裹伤',flavor:'喝口烈酒，裹紧新伤。',value:heal?'恢复 '+heal+' 气血':'气血已满',detail:heal?state.player.hp+' → '+(state.player.hp+heal)+' / '+state.player.maxHp:'无需再疗伤',enabled:heal>0},
      {id:'upgrade',b:L.upgrade,seal:'练',title:'残灯练招',flavor:'灯火未尽，再磨一式。',value:stacks.length?'精进 1 张招式':'无可精进招式',detail:'本次不疗伤',enabled:stacks.length>0}
    ];
    choices.forEach(c=>{
      const selected=r.reviewChoice===c.id,hover=c.enabled&&contains(G.main.getPointer(),c.b),frame=box(c.b.x-22,c.b.y-16,492,144);
      const paint=()=>{
        ctx.save();
        if(M)M.sheet(ctx,frame,{dark:true,alpha:selected?.84:hover?.7:.52,tone:'#18201e'});
        ctx.strokeStyle=selected?'#b78b60aa':'#9c886139';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(frame.x+20,frame.y+frame.height-2);ctx.lineTo(frame.x+frame.width-20,frame.y+frame.height-2);ctx.stroke();
        ctx.globalAlpha*=c.enabled?1:.5;
        if(M)M.seal(ctx,c.b.x+18,c.b.y+20,32,c.seal,selected?1:.68);
        text(ctx,c.title,c.b.x+53,c.b.y+20,phone?36:34,selected||hover?'#f1e2c7':'#dfd1b7');
        text(ctx,c.detail,1190,c.b.y+21,phone?22:19,c.id==='heal'&&heal?'#d2b582':'#b9ac94','right');
        text(ctx,c.flavor,c.b.x+53,c.b.y+55,phone?22:19,'#aaa18e');
        text(ctx,c.value,c.b.x+53,c.b.y+91,phone?24:22,c.enabled?'#e2c798':'#beb39e');
        ctx.restore();
      };
      if(G.render.journeyMotion)G.render.journeyMotion.surface(ctx,'rest-choice:'+c.id,frame,{entry:false,enabled:c.enabled,lift:1},paint);else paint();
      if(selected)button(ctx,B.restConfirm,c.id==='heal'?'就此疗伤':'挑选招式',c.enabled,true);
    });
    button(ctx,B.restDeck,'翻看行囊');button(ctx,L.back,'继续赶路');
  }
  G.render.realisticJourney={renderReward,renderRest,assetPaths,boxes:B,deckRows,upgradeBoxes,cardBox,restPose,art,stage,reset:()=>{cancelRequested=false;restChoiceGuard=null;}};
})();
