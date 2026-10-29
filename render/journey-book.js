/* Shared travel-book and real-card presentation; rules remain in scenes. */
(function () {
  'use strict';
  const W=G.render.woodcut, M=G.render.journeyMaterials;
  function groups(names){
    const rows=[];
    (names||[]).forEach((name,index)=>{let row=rows.find(r=>r.name===name);if(!row){row={name,index,count:0,card:G.cards.getCardByName(name)};rows.push(row);}row.count++;});
    return rows;
  }
  function card(ctx,entry,b){
    const def=G.cards.getCardByName(entry.name)||entry, scale=b.width/150;
    ctx.save();ctx.translate(b.x,b.y);ctx.scale(scale,scale);
    W.card(ctx,{...def,sourceCard:def,x:0,y:0,width:150,height:b.height/scale,layoutMode:'detail',readingScale:window.KGAME_MOBILE&&G.main.getSceneName()==='shop'?1.3:1,playable:true,skipMotion:true,disableBaseShadow:true});ctx.restore();
  }
  function surface(ctx,b){
    ctx.save();ctx.shadowColor='#000b';ctx.shadowBlur=24;ctx.shadowOffsetY=10;
    ctx.fillStyle='#252623';ctx.fillRect(b.x-9,b.y+4,b.width+18,b.height+8);ctx.restore();
    M.sheet(ctx,b);
    const fold=ctx.createLinearGradient(b.x+b.width*.66,0,b.x+b.width*.70,0);
    fold.addColorStop(0,'#211a1400');fold.addColorStop(.5,'#211a1425');fold.addColorStop(1,'#211a1400');ctx.fillStyle=fold;ctx.fillRect(b.x+b.width*.66,b.y,b.width*.04,b.height);
  }
  function badge(ctx,b,value,selected=false){
    M.sheet(ctx,{x:b.x+b.width-48,y:b.y+b.height-11,width:57,height:28},{dark:true});
    W.text(ctx,value,b.x+b.width-19,b.y+b.height+3,14,selected?'#ead7b6':'#c9b99c','center');
  }
  function deckRows(state){
    const panel=state.reviewPanel||{page:0};return groups(state.player.masterDeckNames).slice(panel.page*8,panel.page*8+8).map((row,i)=>({...row,index:panel.page*8+i,box:{x:90+i%4*180,y:160+Math.floor(i/4)*222,width:137,height:202}}));
  }
  function renderDeck(ctx,state){
    const all=groups(state.player.masterDeckNames),panel=state.reviewPanel,selected=all[panel.index]||all[0];
    ctx.fillStyle='rgba(6,9,10,.90)';ctx.fillRect(0,0,1280,720);
    surface(ctx,{x:54,y:116,width:1172,height:540});
    W.text(ctx,'行囊招录',76,66,34,'#ded0b6','left',600,true);
    W.text(ctx,state.player.masterDeckNames.length+' 张招式 · '+all.length+' 式',290,69,16,'#aca38f');
    W.text(ctx,'随身旧物 '+(state.player.relics||[]).length+' 件 · 菜单招式簿可查',700,69,15,'#aca38f');
    deckRows(state).forEach(row=>{
      const active=panel.index===row.index;
      if(active){ctx.save();ctx.shadowColor='#632c26';ctx.shadowBlur=9;ctx.strokeStyle='#803d31';ctx.lineWidth=2;ctx.strokeRect(row.box.x-4,row.box.y-4,row.box.width+8,row.box.height+8);ctx.restore();}
      if(row.card)card(ctx,row.card,row.box);badge(ctx,row.box,'× '+row.count,active);
    });
    if(selected?.card){
      W.text(ctx,'当前招式',903,142,14,'#594c3b');card(ctx,selected.card,{x:901,y:170,width:211,height:316});
      W.text(ctx,'同名 '+selected.count+' 张'+(G.cards.isUpgraded(selected.name)?' · 已精进':''),1007,518,17,'#4b3c2c','center');
      W.wrap(ctx,selected.card.text,865,548,292,16,'#4b3c2c',3);
    }
    const pages=Math.max(1,Math.ceil(all.length/8));
    W.text(ctx,'点选卡牌细读',90,621,15,'#64513b');W.text(ctx,(panel.page+1)+' / '+pages,504,621,16,'#64513b','center');
    if(pages>1){M.action(ctx,{x:356,y:600,width:102,height:38},'上一页',{enabled:panel.page>0,paper:true});M.action(ctx,{x:550,y:600,width:102,height:38},'下一页',{enabled:panel.page+1<pages,paper:true});}
    M.action(ctx,{x:1100,y:92,width:134,height:40},'收起行囊');
  }
  G.render.journeyBook={groups,card,surface,badge,deckRows,renderDeck};
})();
