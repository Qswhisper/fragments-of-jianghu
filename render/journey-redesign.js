/* Illustrated places and a single decision focus. Scene modules retain transactions. */
(function(){
  'use strict';
  const A=G.render.assets,W=G.render.woodcut,M=G.render.journeyMaterials,B=G.render.journeyBook;
  const root='assets/journey/redesign-20261005/',art={shop:root+'shop-interior.png',reward:root+'reward-ground.png'};
  const nemesisScenes=Object.fromEntries(['chief','mack'].flatMap(family=>['blade','revolver','carbine','rifle'].map(stage=>[family+'-'+stage,'assets/journey/integration-20261005/nemesis-'+family+'-'+stage+'.png'])));
  const box=(x,y,width,height)=>({x,y,width,height}),inside=(p,b)=>p&&p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;
  const ink=(c,s,x,y,size=20,color='#dbceb5',align='left')=>W.text(c,String(s||''),x,y,size,color,align,600,true);
  const wrap=(c,s,x,y,width,size=18,color='#c4bba9',lines=4)=>W.wrap(c,s,x,y,width,size,color,lines);
  function place(c,path){c.fillStyle='#101619';c.fillRect(0,0,1280,720);A.drawImageCover(c,path,0,0,1280,720);}
  function wash(c,b,alpha=.74){const g=c.createLinearGradient(b.x,0,b.x+b.width,0);g.addColorStop(0,'rgba(8,13,15,0)');g.addColorStop(.15,'rgba(8,13,15,'+alpha+')');g.addColorStop(.85,'rgba(8,13,15,'+alpha+')');g.addColorStop(1,'rgba(8,13,15,0)');c.fillStyle=g;c.fillRect(b.x,b.y,b.width,b.height);}
  function card(c,entry,b,rotation=0){
    c.save();c.translate(b.x+b.width/2,b.y+b.height/2);c.rotate(rotation);
    if(G.main.getSceneName()!=='shop'){B.card(c,entry,box(-b.width/2,-b.height/2,b.width,b.height));c.restore();return;}
    const U=G.render.canvasUtils,pad=24,density=U.density(c),key='counter-card-v2:'+entry.name+':'+b.x+':'+b.y+':'+b.width+':'+b.height;
    const layer=U.cachedLayer(key,b.width+pad*2,b.height+pad*2,density,brush=>{
      brush.save();brush.translate(pad,pad);brush.shadowColor='#070402b0';brush.shadowBlur=12;brush.shadowOffsetX=8;brush.shadowOffsetY=9;
      brush.fillStyle='#2c2114';brush.fillRect(2,b.height-6,b.width-4,7);brush.shadowColor='transparent';B.card(brush,entry,box(0,0,b.width,b.height));
      // Lantern at x550: warmer/brighter tops near it, darker contact edge below.
      brush.globalCompositeOperation='source-atop';const shade=brush.createLinearGradient(0,0,b.width,b.height),distance=Math.min(1,Math.abs(b.x+b.width/2-550)/550);
      shade.addColorStop(0,'rgba(127,85,39,'+(.10+distance*.17)+')');shade.addColorStop(.55,'rgba(116,80,43,.08)');shade.addColorStop(1,'rgba(34,22,14,.24)');brush.globalCompositeOperation='multiply';brush.fillStyle=shade;brush.fillRect(0,0,b.width,b.height);brush.restore();
    });c.drawImage(layer,-b.width/2-pad,-b.height/2-pad,b.width+pad*2,b.height+pad*2);c.restore();
  }
  function tag(c,b,label){c.save();c.translate(b.x+b.width/2,b.y+b.height/2);c.rotate(-.025);M.sheet(c,box(-b.width/2,-b.height/2,b.width,b.height));M.ink(c,label,0,0,window.KGAME_MOBILE?23:17,'#48382b','center');c.restore();}
  function relicTag(c,b,o){
    const paper=box(b.x-15,b.y+84,b.width+30,58);M.sheet(c,paper);
    M.ink(c,o.name,paper.x+paper.width/2,paper.y+18,window.KGAME_MOBILE?23:17,'#382b20','center');
    M.ink(c,o.sold?'已售出':o.price+' 大洋',paper.x+paper.width/2,paper.y+42,window.KGAME_MOBILE?24:19,o.sold?'#64543d':'#74382b','center');
  }
  function shopBackground(c){place(c,art.shop);const g=c.createLinearGradient(0,0,0,150);g.addColorStop(0,'#080f14bf');g.addColorStop(1,'#080f1400');c.fillStyle=g;c.fillRect(0,0,1280,150);}
  function shopHeading(c,s,title){ink(c,title,54,57,42,'#ede0c8');ink(c,'大洋 '+s.player.gold,58,104,23,'#ccb280');G.render.journeyMotion?.resourceCue(c,'gold',box(51,82,155,38),{x:222,y:104,size:22});if(window.KGAME_MOBILE)ink(c,'长按商品细读',58,145,22,'#d7c9af');}
  const checkoutCardBox=relic=>relic?box(200,232,270,250):box(210,185,244,361);
  const receiptCardBox=()=>G.render.journeyMotion?.rect('receipt-card',box(474,178,236,350))||box(474,178,236,350);
  function checkout(c,state,offer,remove=false){
    // Goods remain on the same counter; only the merchant's bill comes forward.
    const appear=G.render.journeyMotion.enter(0,220);wash(c,box(80,135,1140,478),.80*appear);
    const S=G.scenes.shop,L=S.getLayout(),selection=state.shop.purchaseSelection;
    const origin=remove?S.getRemoveBoxes(state.shop.deckEntries,L,state.shop.removePage).find(b=>b.index===state.shop.removeSelectedIndex):selection?(selection.type==='relic'?S.getRelicBoxes(L):S.getCardBoxes(L))[selection.index]:null;
    const target=checkoutCardBox(!remove&&offer.type==='relic'),t=G.render.journeyMotion.enter(0,280);
    const shown=origin&&!origin.hidden?Object.fromEntries(['x','y','width','height'].map(k=>[k,origin[k]+(target[k]-origin[k])*t])):target;
    if(remove||offer.type!=='relic'){
      // Reuse the final-size card raster throughout the lift, rather than
      // caching a new bitmap for every interpolated rectangle.
      c.save();c.translate(shown.x,shown.y);c.scale(shown.width/target.width,shown.height/target.height);c.translate(-target.x,-target.y);card(c,offer,target,-.055*t);c.restore();
    }
    else W.image(c,G.render.assets.getRelicPath(offer.id),shown);
    c.save();c.translate(0,(1-appear)*12);c.globalAlpha*=.25+.75*appear;
    c.save();c.translate(893,380);c.rotate(-.012);M.sheet(c,box(-273,-226,546,452));c.restore();
    M.ink(c,remove?'划去旧招':offer.name,652,198,33,'#362b23');
    wrap(c,remove?'本次只撤去第 '+(state.shop.removeSelectedIndex+1)+' 张「'+offer.name+'」。':offer.text||offer.description,652,237,460,window.KGAME_MOBILE?26:22,'#443322',4);
    const cost=remove?state.shop.removeCost:offer.price;
    M.ink(c,'价钱  '+cost+' 大洋',652,390,27,'#743a2d');M.ink(c,state.player.gold<cost?'现有  '+state.player.gold+' 大洋 · 余额不足':'大洋  '+state.player.gold+' → '+(state.player.gold-cost),652,436,22,'#584936');
    const extra=remove?'牌组 '+state.player.masterDeckNames.length+' → '+(state.player.masterDeckNames.length-1)+' 张':state.player.gold<cost?'尚缺 '+(cost-state.player.gold)+' 大洋':offer.type==='relic'?'收下即生效':'招式加入行囊';
    M.ink(c,extra,652,480,18,'#69543d');
    M.action(c,G.scenes.shop.getLayout().removeCancel,'再想想',{paper:true});M.action(c,G.scenes.shop.getLayout().removeConfirm,remove?'确认撤去':'确认成交',{primary:true,enabled:state.player.gold>=cost});
    c.restore();
  }
  function shop(state,c){
    const s=state.shop,S=G.scenes.shop,L=S.getLayout();shopBackground(c);shopHeading(c,state,s.mode==='remove'?'掌柜替你划账':'暗巷黑市');
    if(s.mode==='remove'){
      ink(c,'摊开行囊，选一式撤去。',106,197,25);ink(c,'撤招费 '+s.removeCost+' 大洋',window.KGAME_MOBILE?630:106,window.KGAME_MOBILE?197:240,window.KGAME_MOBILE?24:20,'#bfa67e');
      S.getRemoveBoxes(s.deckEntries,L,s.removePage).forEach(b=>{const e=s.deckEntries.find(e=>e.index===b.index);if(s.removeSelectedIndex!==b.index)card(c,e,b,b.rotation);tag(c,box(b.x,b.y+b.height+10,b.width,32),'第 '+(e.index+1)+' 张');});
      const count=Math.ceil(s.deckEntries.length/S.getRemovePageSize()),page=s.removePage||0;
      M.action(c,L.removePrev,'前一叠',{enabled:page>0});M.action(c,L.removeNext,'后一叠',{enabled:page+1<count});ink(c,(page+1)+' / '+count,504,window.KGAME_MOBILE?681:640,window.KGAME_MOBILE?23:18,'#bfa67e','center');M.action(c,L.backButton,'收起行囊');
      if(Number.isInteger(s.removeSelectedIndex)){const e=s.deckEntries.find(e=>e.index===s.removeSelectedIndex);checkout(c,state,e,true);}
    }else{
      S.getCardBoxes(L).forEach((b,i)=>{const o=s.cardOffers[i];if(!o||b.hidden)return;c.save();c.globalAlpha=o.sold?.36:1;if(s.purchaseSelection?.type!=='card'||s.purchaseSelection.index!==i)G.render.journeyMotion.surface(c,'shop-stock:'+i,b,{enabled:!o.sold&&!s.purchaseSelection,distance:8,lift:2,delay:i*24},()=>card(c,o,b,b.rotation));c.restore();tag(c,box(b.x,b.y+b.height+8,b.width,34),o.sold?'已售出':o.price+' 大洋');});
      S.getRelicBoxes(L).forEach((b,i)=>{const o=s.relicOffers[i];if(!o)return;c.save();c.globalAlpha=o.sold?.35:1;if(s.purchaseSelection?.type!=='relic'||s.purchaseSelection.index!==i)G.render.journeyMotion.surface(c,'shop-relic:'+i,b,{enabled:!o.sold&&!s.purchaseSelection,distance:5,lift:1},()=>W.image(c,G.render.assets.getRelicPath(o.id),box(b.x+15,b.y,b.width-30,82)));c.restore();relicTag(c,b,o);});
      ink(c,'“看中了，就拿近些。”',960,440,21,'#d7c5a8');M.action(c,L.removeButton,'撤去旧招');ink(c,s.removeCost+' 大洋',1114,579,17,'#baa78b','center');M.action(c,L.leaveButton,'出门',{primary:true});
      if(window.KGAME_MOBILE){M.action(c,L.browsePrev,'前一叠',{enabled:!!s.browsePage});M.action(c,L.browseNext,'后一叠',{enabled:!s.browsePage});ink(c,(s.browsePage?'4–5':'1–3')+' / '+s.cardOffers.length+' 式',450,670,23,'#d2bea0','center');}
      if(s.purchaseSelection){const q=s.purchaseSelection,o=(q.type==='relic'?s.relicOffers:s.cardOffers)[q.index];checkout(c,state,{...o,type:q.type});}
    }
    if(s.note) {const y=window.KGAME_MOBILE?176:665;wash(c,box(24,y,920,48),.8);wrap(c,s.note,54,y+12,880,window.KGAME_MOBILE?24:17,'#d7c9af',1);}
  }
  const detailBox=box(624,608,224,54);
  function nemesisScene(n,source){
    return G.render.woodcut.combatPresentation.enemyArt({templateId:source.sourceTemplateId,kind:'nemesis',firearmStage:n.firearmStage});
  }
  function nemesis(state,c){
    const n=state.nemesisIntro,source=G.nemesis.getEntryById(state,n.entryId),threat=n.firearmThreat||G.nemesis.getFirearmThreat(source);
    // Subject, wet ground and illumination are painted together in the source.
    const R=G.render.woodcut.combatPresentation;
    G.render.realisticCombat.stage(c,state);
    R.figure(c,nemesisScene(n,source),box(60,116,440,490),false);
    wash(c,box(540,90,720,620),.38);
    ink(c,source.inheritedIntel&&!source.history?.length?'追缉接续':'旧仇再会',62,65,33,'#c7b79a');ink(c,n.name,624,137,Math.min(49,Math.floor(540/n.name.length)),'#eee0c4');ink(c,n.title+' · '+n.level+' 阶',628,183,21,'#c9ab84');
    // Keep the full personalized quote and history in the optional record.
    wrap(c,'“'+G.nemesis.getIntroLine(source)+'”',628,231,555,25,'#d7ccba',2);
    ink(c,'这次的准备',628,318,18,'#b59b77');wrap(c,n.adaptation?n.adaptation.name+' · '+n.adaptation.description:n.note,628,346,550,21,'#e0d0b3',3);
    if(threat.steps.length){ink(c,n.firearmLabel,628,430,26,'#dca778');wrap(c,threat.steps.join(' → '),628,464,550,20,'#d4c6ae',2);wrap(c,threat.summary,628,509,550,19,'#d9b58b',2);}
    else wrap(c,n.revengeLine,628,438,550,21,'#c4bba9',3);
    M.action(c,detailBox,'交锋记忆');M.action(c,G.scenes.nemesis.getLayout().fight,'拔刀迎战',{primary:true});
  }
  const oldNemesisUpdate=G.scenes.nemesis.update;
  G.scenes.nemesis.update=function(state,input){const clicks=G.main.consumeClicks();if(clicks.some(p=>inside(p,detailBox))){G.journeyShell.openEnemyRecord(state.nemesisIntro.entryId);return state;}const original=G.main.consumeClicks;G.main.consumeClicks=()=>clicks;try{return oldNemesisUpdate(state,input);}finally{G.main.consumeClicks=original;}};
  function reward(state,c){
    const R=G.render.realisticJourney;if(state.reviewPanel){originalReward(state,c);return;}
    G.render.realisticCombat.stage(c,state);wash(c,box(320,0,920,655),.57);
    const r=state.reward,receipt=state.reviewReceipt;
    M.headingBackdrop(c);
    ink(c,receipt?receipt.title:'战后拾遗',54,66,44,'#ede0c8');ink(c,receipt?'清点妥当，继续上路。':'此战所得  '+r.goldAward+' 大洋',58,116,22,'#caae7b');
    if(window.KGAME_MOBILE&&!receipt)ink(c,'长按牌面或旧物细读',58,160,22,'#d7c9af');
    M.ledger(c,state,{x:42,y:614,width:328,compact:true});
    if(receipt){
      const entry=receipt.cardName&&G.cards.getCardByName(receipt.cardName);if(entry)card(c,entry,receiptCardBox(state),-.025*G.render.journeyMotion.enter(0,420));
      G.render.journeyMotion.receiptContent(c,()=>receipt.lines.forEach((s,i)=>wrap(c,s,entry?782:482,240+i*92,entry?388:648,23,'#dfd0b4',3)));
      M.action(c,R.boxes.cancel,'翻看行囊');M.action(c,R.boxes.accept,'继续上路',{primary:true,enabled:!receipt.lockMs});return;
    }
    ink(c,r.mode==='relic'?'先取旧物':r.basicDraftAct?'本门补招 · 择一式':'择一式带走',444,118,27,'#e3d5ba');
    if(r.lastRelicChoice){
      ink(c,r.lastRelicChoice==='放弃旧物'?'旧物未取':r.lastRelicChoice+'已收好',1168,152,20,'#c4b294','right');
      const relic=Object.values(G.relics.definitions).find(o=>o.name===r.lastRelicChoice);
      if(relic){c.save();c.globalAlpha*=G.render.journeyMotion.relicOpacity(relic.id);W.image(c,A.getRelicPath(relic.id),box(1180,138,28,28));c.restore();}
    }
    r.options.forEach((o,i)=>{const b=R.cardBox(r,i),selected=r.reviewSelectedIndex===i;G.render.journeyMotion.surface(c,'reward-choice:'+i,b,{distance:10,lift:0,delay:i*28},()=>{if(r.mode==='relic'){M.sheet(c,b);W.image(c,G.render.assets.getRelicPath(o.id),box(b.x+24,b.y+20,b.width-48,114));M.ink(c,o.name,b.x+16,b.y+165,22);wrap(c,o.description,b.x+16,b.y+187,b.width-32,17,'#51422f',5);}else card(c,o,b);
      if(selected){c.strokeStyle='#cba36b';c.lineWidth=2;c.strokeRect(b.x-3,b.y-3,b.width+6,b.height+6);}});});
    const choice=Number.isInteger(r.reviewSelectedIndex)?r.options[r.reviewSelectedIndex]:null;ink(c,choice?'已选 · '+choice.name:G.journeyPreparation?.canDraft(state)?r.basicDraftAct?'本门补招每卷一次；确认带走时使用。':'点选后确认；菜单→招式可改选本门补招。':'点选一件，核对后带走。',444,516,21,'#ccbda3');
    M.action(c,R.boxes.confirm,r.mode==='relic'?'收下旧物':'带走此式',{primary:true,enabled:!!choice});M.action(c,G.scenes.reward.getLayout(r.options.length).skip,r.mode==='relic'?'不取旧物':'不取招式');M.action(c,R.boxes.deck,'翻看行囊');
  }
  const originalReward=G.render.realisticJourney.renderReward;
  G.render.journeyRedesign={art,nemesisScenes,nemesisScene,detailBox,shop,nemesis,reward,receiptCardBox,checkoutCardBox};A.getImageEntry(art.shop);G.render.realisticCombat.assetPaths.push(art.shop);
  // These renderers replace the earlier entry wrapper. Preserve its DOM cleanup
  // for direct save restoration as well as ordinary map-to-place transitions.
  function placeRenderer(draw){return function(s,c){document.getElementById('entry-ui').hidden=true;G.journeyShell?.syncUI(s);draw(s,c);};}
  G.scenes.shop.render=placeRenderer(shop);G.scenes.nemesis.render=placeRenderer(nemesis);G.render.realisticJourney.renderReward=reward;
})();

