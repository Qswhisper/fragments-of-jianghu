/* Phone composition uses the same ink, seals and narrow wood slips as the stage. */
(function () {
  'use strict';
  const W=G.render.woodcut,P=G.render.realisticCombat,U=G.render.canvasUtils,A=G.render.assets;
  const ink=P.ui.ink,serif=G.render.ui.getBodyFontFamily();
  const paper='#dfd3bf',muted='#b7a58a',red='#bc5548';
  function text(ctx,value,x,y,size=24,color=paper,align='left',width){
    ctx.save();ctx.filter='opacity(1)';ctx.shadowColor='#080604';ctx.shadowBlur=1;ctx.shadowOffsetY=1;
    ink(ctx,value,x,y,size,color,align,700,serif,width);ctx.restore();
  }
  function layer(ctx,key,b,paint){U.paintLayer(ctx,'mobile-combat:'+key,b,paint);}
  // Enemy HP/intent changes are small, frequent paints. A new whole-panel
  // Canvas forced a synchronous snapshot/upload at contact and first entry.
  // Keep its existing raster bounds while drawing these labels directly.
  function enemyLayer(ctx,b,paint){
    const d=U.density(ctx),x=Math.floor(b.x*d)/d,y=Math.floor(b.y*d)/d;
    const width=Math.ceil((b.x+b.width-x)*d)/d,height=Math.ceil((b.y+b.height-y)*d)/d;
    ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();
    try{paint(ctx);}finally{ctx.restore();}
  }
  function intentAnchor(box){
    // Three deep slots approach the round plaque and the phone menu: leave both clear.
    return {x:Math.max(776,Math.min(1124,(box.baseX??box.x)+box.width/2)),y:(box.baseY??box.y)+10};
  }
  function slip(ctx,x,y,width,value,tone='neutral',size=22,height=28){
    // Reuse the original irregular wood-grain strip, including its red edge mark.
    const scale=height/18;ctx.save();ctx.filter='opacity(1)';ctx.translate(x,y);ctx.scale(scale,scale);
    P.ui.infoSlip(ctx,0,0,width/scale,value,tone,size/scale);ctx.restore();
  }
  function round(ctx,state){
    const b={x:538,y:22,width:204,height:54},c=state.combat,turn=String(Math.max(1,c.turn||1));
    const count=c.enemies.filter(e=>e.hp>0).length;
    const type={street:'喋血街头',elite:'强敌截杀',gate:'险关',nemesis:'宿敌寻仇'}[c.nodeType]||'狭路相逢';
    layer(ctx,JSON.stringify([turn,type,count]),{x:532,y:18,width:216,height:88},brush=>{
      brush.fillStyle='rgba(7,8,8,.86)';brush.fillRect(b.x,b.y,b.width,b.height);
      P.ui.thinFrame(brush,b,'rgba(119,112,95,.24)');
      brush.fillStyle='rgba(171,152,119,.09)';brush.fillRect(b.x+18,b.y+12,22,1);brush.fillRect(b.x+b.width-40,b.y+12,22,1);
      brush.font='700 20px '+serif;const labelWidth=brush.measureText('回合').width;
      brush.font='700 40px '+serif;const numberWidth=brush.measureText(turn).width,start=640-(labelWidth+12+numberWidth)/2;
      text(brush,'回合',start,49,20,'#d8c7af');text(brush,turn,start+labelWidth+12,49,40,red);
      text(brush,type+(count>1?' · '+count+'敌':''),640,94,18,'#a49783','center');
    });
  }
  function player(ctx,state,L){
    const p=state.player,b=L.playerPanel,x=b.x+8,width=b.width-16;
    const name={blade:'吹命刀',iron:'铁骨衣',dirty:'下九流',combo:'江湖把子'}[p.chosenStyle]||'刀客';
    const chips=G.scenes.combat.getPlayerStatusChips(state,p).map(c=>c.text);
    const progress=chips.filter(c=>/^(连环|铁骨)/.test(c)),warnings=chips.filter(c=>!/^(连环|铁骨)/.test(c));
    layer(ctx,JSON.stringify([p.hp,p.maxHp,p.energy,p.maxEnergy,p.block,name,chips]),b,brush=>{
      text(brush,name,x,b.y+20,24,'#e1d7c5');text(brush,p.hp+' / '+p.maxHp,x+width,b.y+20,28,'#e1d7c5','right');
      P.healthBar(brush,{x,y:b.y+40,width,height:11},p.hp,p.maxHp,P.bloodColor);
      text(brush,'体力',x,b.y+66,20,muted);text(brush,p.energy+'/'+p.maxEnergy,x+55,b.y+66,24,p.energy?paper:red);
      text(brush,'架势',x+width-89,b.y+66,20,muted);text(brush,p.block||0,x+width,b.y+66,24,p.block?paper:muted,'right');
      brush.strokeStyle='rgba(174,150,114,.28)';brush.lineWidth=1;
      brush.beginPath();brush.moveTo(x+141,b.y+57);brush.lineTo(x+141,b.y+75);brush.stroke();
      if(chips.length){brush.strokeStyle='rgba(174,150,114,.18)';brush.beginPath();brush.moveTo(x,b.y+88);brush.lineTo(x+width,b.y+88);brush.stroke();}
      progress.forEach((chip,i)=>text(brush,chip,x,b.y+104+i*24,21,/已起|已成/.test(chip)?paper:muted,'left',width));
      warnings.forEach((chip,i)=>slip(brush,x,b.y+92+(progress.length+i)*24,Math.min(width,Math.max(116,chip.length*20+20)),chip,'danger',21,23));
    });
  }
  function enemy(ctx,e,shown,box,firing){
    const x=box.baseX??box.x,y=box.baseY??box.y,w=box.width,cx=x+w/2;
    const d=shown.intentData||{},intent=W.enemyIntent(shown),preview=!!(d.previewDamage&&!d.damage);
    const value=preview?d.previewDamage:shown.intentValue,hasValue=value!==undefined&&value!==null&&value!==0;
    const mark=firing?'射':preview?'预':d.damage||shown.intent==='attack'?'袭':d.block?'守':'势';
    const anchor=intentAnchor(box),cy=anchor.y,r=30,tags=G.scenes.combat.getEnemyStatusChips(e,false).map(c=>c.text);
    // Caption follows the same ground plane as its figure, including held death slots.
    const captionY=y+box.height-66;
    const tagY=Math.min(Math.max(cy+44,154),captionY-112);
    const turn=G.scenes.combat.feedback.turnStatus(e.id);
    const narrow=w<=250,layerTop=0;
    enemyLayer(ctx,{x:x-4,y:layerTop,width:w+8,height:416-layerTop},brush=>{
      brush.fillStyle=d.damage&&G.render.motionFocus?G.render.motionFocus.sealFill(brush,anchor.x,cy,r):intent.danger?'#4f211c':'#29241b';brush.strokeStyle=intent.danger?'#b98765':'#ae9672';brush.lineWidth=1.3;
      brush.beginPath();brush.arc(anchor.x,cy,r,0,Math.PI*2);brush.fill();brush.stroke();
      text(brush,mark,anchor.x,cy+(hasValue?-12:0),hasValue?18:25,'#e3d1b3','center');
      if(hasValue)text(brush,value,anchor.x,cy+12,26,'#eadcc4','center');
      const note=turn==='done'?'已行动':turn==='next'?'下一位'+(intent.note?' · '+intent.note:''):intent.note;
      if(note){
        // Keep every note inside this enemy's cached raster. The rightmost
        // slot previously painted beyond its layer and clipped the leading text.
        // Natural head/torso proportions change where the forehead enters the
        // frame. Keep timing/defense notes above seals in every phone slot.
        const noteX=narrow?cx:Math.max(x+8,Math.min(x+w-8,anchor.x)),noteWidth=Math.max(0,2*Math.min(noteX-x-6,x+w-6-noteX));
        const compact=note.replaceAll(' · ','·').replace('可用架势抵挡','架势可挡'),parts=note.split(' · ');
        brush.font='700 19px '+serif;
        text(brush,compact,noteX,12,19,turn==='done'?'#8d8373':'#c3b092','center',noteWidth);
      }
      // Status marks stay at the figure's outer edge, rather than becoming a panel.
      tags.slice(0,4).forEach((tag,i)=>slip(brush,x+w-82,tagY+i*25,78,tag,'danger',19,24));
      if(tags.length>4)text(brush,'…',x+w-10,tagY+94,18,muted,'center');
      const width=Math.min(270,w-14),left=cx-width/2;
      text(brush,e.name,left,captionY,24,'#e2d9ca','left',width);
      text(brush,e.hp+' / '+e.maxHp,left,captionY+32,26,'#e2d9ca');
      if(e.block)text(brush,'守 '+e.block,left+width,captionY+32,21,muted,'right');
      P.healthBar(brush,{x:left,y:captionY+52,width,height:10},e.hp,e.maxHp,P.bloodColor);
      const action=(preview?'预告 · ':'')+(shown.intentLabel||'蓄势');
      slip(brush,left,captionY+66,Math.min(width,action.length*20+24),action,intent.danger?'danger':'neutral',21,25);
    });
  }
  function pile(ctx,b,count,name){
    layer(ctx,JSON.stringify([b,count,name,W.hovered(b)]),{...b,height:Math.max(b.height,94)},brush=>{
      const x=b.x+(b.width-62)/2,y=b.y+24;
      A.drawCombatPanelSurface(brush,x,y,62,66,{hideNails:true,overlayAlpha:W.hovered(b)?.18:.36,stroke:'rgba(140,109,75,.26)',highlight:'rgba(180,144,93,.04)',lineWidth:1});
      brush.strokeStyle=count?'#d8c6ac':'#958778';brush.lineWidth=1.5;brush.save();brush.translate(x+31,y+24);
      if(name==='抽牌'){brush.save();brush.rotate(-.16);brush.strokeRect(-18,-11,17,23);brush.restore();brush.save();brush.rotate(.14);brush.strokeRect(-1,-14,17,23);brush.restore();}
      else{brush.strokeRect(-16,-13,17,23);brush.strokeRect(-5,-4,17,23);brush.beginPath();brush.moveTo(-12,17);brush.lineTo(15,17);brush.stroke();}
      brush.restore();text(brush,count,x+31,y+51,27,count?paper:muted,'center');text(brush,name,b.x+b.width/2,b.y+10,20,muted,'center');
    });
  }
  function controls(ctx,state,L){
    // These controls span opposite corners. Snapshot their actual areas during
    // departure instead of allocating an otherwise empty full-screen buffer.
    const part=(id,b,paint)=>{const q={x:b.x-32,y:b.y-32,width:b.width+64,height:Math.max(b.height,104)+64};if(G.render.combatDeparture?.control)return G.render.combatDeparture.control(ctx,id,q,paint);return paint(ctx);};
    part('details',L.combatDetails,c=>layer(c,'details:'+JSON.stringify(L.combatDetails),L.combatDetails,brush=>slip(brush,L.combatDetails.x+8,L.combatDetails.y+28,200,'战况 · 旧物','muted',22,30)));
    part('draw',L.drawPile,c=>pile(c,L.drawPile,state.combat.drawPileCount,'抽牌'));part('discard',L.discardPile,c=>pile(c,L.discardPile,state.combat.discardPileCount,'弃牌'));
    const b=L.endTurn,busy=G.scenes.combat.feedback.isBusy(),active=!busy&&W.hovered(b);
    const paintEnd=c=>layer(c,JSON.stringify([b,busy,active]),b,brush=>{
      const face={x:b.x+4,y:b.y+8,width:b.width-8,height:94};
      brush.fillStyle='rgba(8,7,6,.82)';brush.fillRect(face.x,face.y,face.width,face.height);P.ui.thinFrame(brush,face);
      A.drawCombatPanelSurface(brush,face.x+7,face.y+7,face.width-14,face.height-14,{overlayAlpha:active?.17:.29,stroke:'rgba(142,109,71,.40)',highlight:'rgba(180,144,93,.06)',lineWidth:1});
      text(brush,busy?'交锋中…':'结束本回合',face.x+face.width/2,face.y+25,18,'#c3ac88','center');
      text(brush,'结束回合',face.x+face.width/2,face.y+60,28,'#eee4d3','center');
    });
    part('end',b,c=>{if(G.render.journeyMotion)G.render.journeyMotion.surface(c,'combat-end',b,{enabled:!busy,entry:false,lift:0},()=>paintEnd(c));else paintEnd(c);});
    if(G.relicRuntime?.hasRelic(state,'cheat_cuff'))part('cuff',L.cheatCuff,c=>layer(c,'cuff:'+JSON.stringify([L.cheatCuff,G.relicRuntime.canUseCheatCuff(state)]),L.cheatCuff,brush=>slip(brush,L.cheatCuff.x,L.cheatCuff.y+30,L.cheatCuff.width,'袖口换牌','muted',21,30)));
  }
  G.render.mobileCombat={round,player,enemy,controls,intentAnchor};
})();
