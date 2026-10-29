/* Small objects used by journey menus: paper, cloth, seals and a travel ledger. */
(function () {
  'use strict';
  const A=G.render.assets,texture='assets/ui/combat_card_torn_rice_paper_gpt4ovip_transparent_01.png';
  A.getImageEntry(texture);
  function ink(ctx,value,x,y,size=18,color='#302a23',align='left'){
    if(G.render.sceneEntry?.active()&&G.render.sceneEntry.text(ctx,x,y,()=>ink(ctx,value,x,y,size,color,align)))return;
    G.render.ui.drawLabel(ctx,String(value),x,y,{size,color,align,fontFamily:"'KGame Ink',serif",weight:600,shadow:false,opticalCenter:true});
  }
  function sheet(ctx,b,{dark=false,alpha=1,tone=null}={}){
    const U=G.render.canvasUtils,pad=18,w=b.width,h=b.height,density=U.density(ctx);
    const paint=brush=>paintSheet(brush,{x:pad,y:pad,width:w,height:h},{dark,tone});
    // Blend grain into opaque paper locally, then place one source-over image.
    // Parent fades/compositing must not recolor the grain against the live scene.
    let layer;
    if(U.paintCacheEnabled)layer=U.cachedLayer('journey-paper-v2:'+JSON.stringify([w,h,dark,tone]),w+pad*2,h+pad*2,density,paint);
    else {layer=U.createLayer(w+pad*2,h+pad*2,density);paint(layer.getContext('2d'));}
    ctx.save();ctx.globalAlpha*=alpha;ctx.globalCompositeOperation='source-over';ctx.filter='none';
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=ctx.shadowOffsetY=0;
    ctx.drawImage(layer,b.x-pad,b.y-pad,w+pad*2,h+pad*2);ctx.restore();
  }
  function paintSheet(ctx,b,{dark=false,tone=null}={}){
    ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.beginPath();
    const {x,y,width:w,height:h}=b;ctx.moveTo(x+3,y+2);ctx.lineTo(x+w*.28,y);ctx.lineTo(x+w*.51,y+2);ctx.lineTo(x+w-3,y+1);
    ctx.lineTo(x+w,y+h*.57);ctx.lineTo(x+w-4,y+h-2);ctx.lineTo(x+w*.64,y+h);ctx.lineTo(x+w*.23,y+h-2);ctx.lineTo(x+1,y+h);ctx.closePath();
    ctx.shadowColor='#0008';ctx.shadowBlur=9;ctx.shadowOffsetY=4;ctx.fillStyle=tone||(dark?'#272a28':'#b6aa91');ctx.fill();ctx.shadowColor='transparent';ctx.clip();
    const p=A.getImageEntry(texture);if(p.loaded){ctx.globalAlpha*=dark?.12:.45;ctx.globalCompositeOperation=dark?'luminosity':'multiply';ctx.drawImage(p.image,p.image.width*.16,p.image.height*.19,p.image.width*.68,p.image.height*.6,x,y,w,h);}
    ctx.restore();
  }
  function seal(ctx,x,y,size,word='行',alpha=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(-.055);ctx.globalAlpha*=alpha;ctx.fillStyle='#83392d';ctx.fillRect(-size/2,-size/2,size,size);
    ctx.strokeStyle='#c99975';ctx.lineWidth=.7;ctx.strokeRect(-size/2+3,-size/2+3,size-6,size-6);ink(ctx,word,0,1,size*.64,'#dfcab0','center');ctx.restore();
  }
  function action(ctx,b,label,options={}){
    const motion=G.render.journeyMotion;
    if(motion&&!motion.inSurface()&&G.main?.getSceneName()!=='combat')return motion.surface(ctx,'action:'+b.x+':'+b.y,b,{enabled:options.enabled!==false,distance:8},()=>paintAction(ctx,b,label,options));
    paintAction(ctx,b,label,options);
  }
  function paintAction(ctx,b,label,{enabled=true,paper=false,primary=false}={}){
    const hover=enabled&&G.render.journeyMotion?.hovered(b);
    ctx.save();ctx.globalAlpha*=enabled?1:.42;
    if(paper){ink(ctx,label,b.x+b.width/2,b.y+b.height/2,Math.min(17,b.height*.46),hover?'#8c3527':'#382b20','center');ctx.strokeStyle='#7a392b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(b.x+8,b.y+b.height-5);ctx.lineTo(b.x+b.width-8,b.y+b.height-6);ctx.stroke();}
    else {
      const size=Math.min(23,b.height*.49);
      if(primary){ctx.fillStyle=hover?'#dac6a3':'#baa687';ctx.fillRect(b.x,b.y,b.width,b.height);}
      else{ctx.fillStyle=hover?'#17201ee6':'#0b1214ad';ctx.fillRect(b.x,b.y,b.width,b.height);ctx.strokeStyle=hover?'#c1ab85':'#807057';ctx.beginPath();ctx.moveTo(b.x+12,b.y+b.height-2);ctx.lineTo(b.x+b.width-12,b.y+b.height-2);ctx.stroke();}
      ink(ctx,label,b.x+b.width/2,b.y+b.height/2,size,primary?'#302a21':hover?'#f0ddbf':'#c9bea7','center');
    }
    ctx.restore();
  }
  function resourceIcon(ctx,type,x,y,color){
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.7;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
    if(type==='health'){
      ctx.moveTo(0,-12);ctx.bezierCurveTo(-3,-6,-9,-1,-9,5);ctx.bezierCurveTo(-9,16,9,16,9,5);ctx.bezierCurveTo(9,-1,3,-6,0,-12);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#ead2b77d';ctx.beginPath();ctx.moveTo(-4,3);ctx.quadraticCurveTo(-6,7,-3,9);ctx.stroke();
    }else if(type==='gold'){
      ctx.arc(0,0,11,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.stroke();ctx.strokeRect(-3,-3,6,6);
    }else if(type==='deck'){
      ctx.rect(-10,-11,15,21);ctx.stroke();ctx.beginPath();ctx.moveTo(-5,-7);ctx.lineTo(10,-7);ctx.lineTo(10,14);ctx.lineTo(-5,14);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-1,-1);ctx.lineTo(6,-1);ctx.moveTo(-1,4);ctx.lineTo(4,4);ctx.stroke();
    }else if(type==='relic'){
      ctx.moveTo(0,-12);ctx.lineTo(9,-6);ctx.lineTo(7,8);ctx.lineTo(0,12);ctx.lineTo(-7,8);ctx.lineTo(-9,-6);ctx.closePath();ctx.stroke();ctx.strokeRect(-3,-3,6,6);
    }else{
      ctx.moveTo(-9,9);ctx.quadraticCurveTo(11,4,-2,-1);ctx.quadraticCurveTo(-12,-7,8,-10);ctx.stroke();ctx.beginPath();ctx.arc(-9,9,2,0,Math.PI*2);ctx.arc(8,-10,2,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function resource(ctx,item,b,{light=false,plain=false}={}){
    const low=item.type==='health'&&item.ratio<.3;
    const accent=item.type==='health'?(light?'#953d31':low?'#dc856c':'#bd6b54'):item.type==='gold'?(light?'#816027':'#c5ac73'):item.type==='relic'?(light?'#576046':'#abae86'):(light?'#635747':'#c1b49a');
    ctx.save();
    if(light){ctx.fillStyle=item.type==='health'?'#9a443011':item.type==='gold'?'#9b752013':'#493b2a0b';ctx.fillRect(b.x,b.y,b.width,b.height);}
    else if(!plain) sheet(ctx,b,{dark:true});
    ctx.restore();
    const compact=b.height<65,labelY=b.y+(compact?13:16),valueY=b.y+(compact?34:43),value=String(item.value);
    const left=b.x+(plain?8:45);
    ink(ctx,item.label,left,labelY,compact?15:16,light?'#68563f':'#bcb19b');
    if(!plain)resourceIcon(ctx,item.type,b.x+23,b.y+b.height*.48,accent);
    const valueColor=light?(low?'#963c2d':'#352b21'):low?'#efb09a':'#efe1c7';
    let size=compact?24:26;ctx.save();
    do{ctx.font='600 '+size+'px '+"'KGame Sans',sans-serif";if(ctx.measureText(value).width<=b.width-(plain?20:57))break;size--;}while(size>16);ctx.restore();
    G.render.woodcut.text(ctx,value,left,valueY,size,valueColor,'left',600);
    G.render.journeyMotion?.resourceCue(ctx,item.type,b);
    if(item.type==='health'){
      const ratio=Math.max(0,Math.min(1,G.render.journeyMotion?.resourceRatio('health',Number(item.ratio)||0)??item.ratio)),bar={x:left,y:b.y+b.height-8,width:b.width-(plain?20:58),height:3};
      ctx.save();ctx.fillStyle=light?'#6b4d3226':'#d6c9ab25';ctx.fillRect(bar.x,bar.y,bar.width,bar.height);ctx.fillStyle=accent;ctx.fillRect(bar.x,bar.y,bar.width*ratio,bar.height);ctx.restore();
    }
  }
  // Fade the title's backing into the illustration on both axes; never darken the whole scene.
  let headingWash;
  function headingBackdrop(ctx){
    if(!headingWash){
      headingWash=document.createElement('canvas');headingWash.width=690;headingWash.height=215;const c=headingWash.getContext('2d');
      const across=c.createLinearGradient(0,0,690,0);across.addColorStop(0,'#111818e8');across.addColorStop(.58,'#111818b8');across.addColorStop(1,'#11181800');c.fillStyle=across;c.fillRect(0,0,690,215);
      const down=c.createLinearGradient(0,0,0,215);down.addColorStop(0,'#000');down.addColorStop(.6,'#000');down.addColorStop(1,'#0000');c.globalCompositeOperation='destination-in';c.fillStyle=down;c.fillRect(0,0,690,215);
    }
    ctx.drawImage(headingWash,0,0);
  }
  function sceneHeading(ctx,title,subtitle){
    headingBackdrop(ctx);
    const opts={fontFamily:"'KGame Ink',serif",weight:700,opticalCenter:true,shadowBlur:5,shadowOffsetY:2,shadowOffsetX:0};
    G.render.ui.drawLabel(ctx,title,55,76,{...opts,size:47,color:'#f3e7ce'});
    ctx.save();ctx.strokeStyle='#bb8061';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(57,105);ctx.lineTo(133,105);ctx.stroke();ctx.restore();
    G.render.ui.drawLabel(ctx,subtitle,58,130,{...opts,weight:600,size:20,color:'#dfd2ba'});
  }
  function ledger(ctx,state,{x=42,y=627,width=494,compact=false}={}){
    const p=state.player,names=p.masterDeckNames||[],healthWidth=width*.39,goldWidth=width*.27;
    ctx.save();const wash=ctx.createLinearGradient(x,y-12,x+width+30,y-12);wash.addColorStop(0,'#0d1315ed');wash.addColorStop(.83,'#0d1315cc');wash.addColorStop(1,'#0d131500');ctx.fillStyle=wash;ctx.fillRect(x-12,y-12,width+54,compact?72:86);ctx.restore();
    const items=[{type:'health',label:'气血',value:p.hp+' / '+p.maxHp,ratio:p.hp/p.maxHp},{type:'gold',label:'大洋',value:p.gold},{type:'deck',label:'招式',value:names.length+' 张'}];
    const offsets=[0,healthWidth,healthWidth+goldWidth],widths=[healthWidth,goldWidth,width-healthWidth-goldWidth];
    items.forEach((item,i)=>resource(ctx,item,{x:x+offsets[i],y,width:widths[i]-12,height:compact?58:66},{plain:true}));
    if(!compact&&p.relics?.length)ink(ctx,'随身旧物 '+p.relics.length+' 件',x+healthWidth+goldWidth+8,y+65,13,'#a79d8b');
  }
  G.render.journeyMaterials={ink,sheet,seal,action,resourceIcon,resource,headingBackdrop,sceneHeading,ledger};
})();
