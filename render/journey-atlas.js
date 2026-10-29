/* Illustrated five-act atlas: geography, reachable choices and quiet future paths. */
(function(){
  'use strict';
  const W=G.render.woodcut,A=G.render.assets,M=G.render.journeyMaterials;
  const paths=Array.from({length:5},(_,i)=>'assets/journey/route-20261003/act-'+(i+1)+'.png');paths.forEach(p=>A.getImageEntry(p));
  const titles={street:'街头交锋',elite:'强敌截杀',gate:'本卷关底',rest:'破庙歇脚',shop:'暗巷黑市',event:'途中奇遇',nemesis:'宿敌寻仇'};
  const shortTitles={street:'交锋',elite:'强敌',gate:'关底',rest:'破庙',shop:'黑市',event:'奇遇',nemesis:'宿敌'};
  const copy={street:'获胜后可取大洋与招式。',elite:'强敌截杀，胜后可取旧物。',gate:'突破此关，继续下一卷。',rest:'裹伤恢复气血，或精进一张招式。',shop:'购买招式与旧物，也可付费撤去。',event:'看清每个选择的代价，再作决定。',nemesis:'旧敌带着交锋记忆追来。'};
  const descriptions=['城门失守，沿街巷寻一条出城的路。','驿道烧尽，追兵沿着焦土压来。','租界灯火未熄，河岸仍有枪声。','铁轨把荒原分开，关卡层层封路。','江面就在前方，渡口是最后一道关。'];
  function symbol(ctx,type,x,y,color){
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.8;ctx.lineCap='round';
    const line=(a,b,c,d)=>{ctx.moveTo(a,b);ctx.lineTo(c,d);};ctx.beginPath();
    if(type==='street'||type==='elite'){line(-9,9,8,-9);line(-8,3,-2,9);line(9,9,-8,-9);line(8,3,2,9);if(type==='elite'){line(0,-15,0,-12);line(-14,0,-12,0);line(14,0,12,0);}}
    else if(type==='gate'){line(-11,11,-11,-7);line(11,11,11,-7);line(-14,-7,14,-7);line(-8,-11,8,-11);line(-3,11,-3,0);line(3,11,3,0);line(-3,0,3,0);}
    else if(type==='rest'){line(-13,-2,0,-10);line(0,-10,13,-2);line(-9,-2,9,-2);line(-7,-2,-7,10);line(7,-2,7,10);line(-11,10,11,10);}
    else if(type==='shop'){ctx.rect(-10,-5,20,15);line(-13,-5,-9,-11);line(-9,-11,9,-11);line(9,-11,13,-5);line(-4,10,-4,3);line(4,10,4,3);}
    else if(type==='event'){ctx.rect(-8,-11,16,22);line(-4,-5,4,-5);line(-4,0,4,0);line(-4,5,1,5);}
    else {ctx.arc(0,0,9,0,Math.PI*2);line(-13,0,-5,0);line(5,0,13,0);line(0,-13,0,-5);line(0,5,0,13);}
    ctx.stroke();ctx.restore();
  }
  G.scenes.map.render=function(state,ctx){
    const m=state.map,nodes=m.nodes,reachable=m.reachableNodeIds,visited=m.visitedNodeIds,act=Math.max(1,Math.min(5,m.actNumber||1));
    ctx.fillStyle='#b3a58c';ctx.fillRect(0,0,1280,720);W.image(ctx,paths[act-1],{x:0,y:0,width:1280,height:720},true);
    ctx.fillStyle='#c8b89b38';ctx.fillRect(310,82,970,638);
    const wash=ctx.createLinearGradient(0,0,1280,0);wash.addColorStop(0,'#c9b99de6');wash.addColorStop(.23,'#c9b99d80');wash.addColorStop(.36,'#c9b99d00');ctx.fillStyle=wash;ctx.fillRect(0,0,1280,720);
    ctx.fillStyle='#222920';ctx.fillRect(0,0,1280,82);W.text(ctx,m.actTitle,40,39,29,'#d9c8ac','left',600,true);
    const p=state.player;
    M.ledger(ctx,state,{x:690,y:15,width:500,compact:true});
    M.seal(ctx,60,130,34,'行');W.text(ctx,'此行前路',88,132,24,'#493826','left',600,true);
    const phone=!!window.KGAME_MOBILE;
    W.wrap(ctx,state.mission?.retrieved?'携残卷南下，交付暗线查验。':'取回残卷，查明出卖暗线的人。',42,178,272,phone?25:22,'#483827',3);
    const current=nodes.find(n=>n.id===m.currentNodeId),tier=current?.tier||0;
    W.text(ctx,'本卷 '+tier+' / 5 程',42,280,phone?25:21,'#533e2b');
    W.text(ctx,m.completed?'残卷已交付':state.mission?.retrieved?'残卷在身':'残卷待取',42,320,phone?25:21,'#843c2e');
    const pointer=G.main.getPointer(),hover=nodes.find(n=>Math.hypot(pointer.x-n.x,pointer.y-n.y)<=30),selected=nodes.find(n=>n.id===m.previewNodeId),focus=selected||hover;
    M.sheet(ctx,{x:30,y:351,width:292,height:phone?261:231});
    const justArrived=!current&&act>1;
    W.text(ctx,focus?titles[focus.type]:justArrived?'来路已明':'下一程',48,381,23,'#4e3525','left',600,true);
    if(focus){
      const entry=focus.type==='nemesis'?G.nemesis.getEntryById(state,focus.nemesisEntryId):null;
      const intel=focus.type==='elite'&&G.relicRuntime.hasRelic(state,'settlement_map')?G.enemies.getEliteEncounterForState(state)?.name:null;
      W.wrap(ctx,entry?entry.name+' · '+entry.level+' 阶 · '+G.nemesis.getFirearmLabel(G.nemesis.getLevelProfile(entry.level).firearmStage):focus.type==='gate'&&act===5?'突破渡口，交付残卷。':copy[focus.type],48,414,252,phone?25:22,'#443322',3);
      if(intel)W.wrap(ctx,'强敌：'+intel,48,493,252,phone?22:19,'#76543a',1);
      if(selected&&reachable.includes(focus.id))M.action(ctx,G.scenes.map.getPreviewConfirmBox(),'前往此处',{primary:true});
      else W.text(ctx,reachable.includes(focus.id)?'点击前往':visited.includes(focus.id)?'已经走过':'尚不可达',48,565,phone?24:21,'#843c2e');
    }else{
      W.wrap(ctx,m.completed?'五卷已破，可查看终局簿。':phone?'点选亮起的路标，查看后前往。分岔不能折返。':'选择亮起的路标。分岔不能折返。',48,414,252,phone?25:22,'#443322',4);
      W.text(ctx,reachable.length+' 处可达',48,565,phone?24:21,'#843c2e');
    }
    // Keep detail on demand; no repeated bottom legend or status sentence.
    nodes.forEach(n=>n.nextIds.forEach(id=>{
      const next=nodes.find(v=>v.id===id);if(!next)return;
      const travelled=visited.includes(n.id)&&visited.includes(id),option=m.currentNodeId===n.id&&reachable.includes(id);
      ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(next.x,next.y);ctx.lineWidth=option?6:4;ctx.strokeStyle='#d8c9acb3';ctx.stroke();
      ctx.lineWidth=option?3.4:travelled?2.2:1.6;ctx.strokeStyle=option?'#853d2bed':travelled?'#50533be0':'#5f513b99';ctx.setLineDash(option||travelled?[]:[3,7]);ctx.stroke();ctx.setLineDash([]);
    }));
    nodes.forEach(n=>{const paint=()=>{
      const available=reachable.includes(n.id),done=visited.includes(n.id),current=n.id===m.currentNodeId;
      ctx.save();ctx.translate(n.x,n.y);ctx.rotate(available?-.035:0);ctx.fillStyle=available?'#34372c':current?'#83432f':done?'#aaa087':'#bbae94cc';ctx.shadowColor=available?'#4c372f80':'transparent';ctx.shadowBlur=5;
      ctx.fillRect(-24,-24,48,48);ctx.shadowColor='transparent';ctx.strokeStyle=available?'#d1b07a':current?'#cab08c':'#78695266';ctx.lineWidth=available?1.5:.8;ctx.strokeRect(-21,-21,42,42);ctx.restore();
      symbol(ctx,n.type,n.x,n.y,available||current?'#ddc9a4':done?'#655843':'#75684f');
      if(n.id===m.previewNodeId){ctx.save();ctx.strokeStyle='#843c2e';ctx.lineWidth=2.5;ctx.strokeRect(n.x-29,n.y-29,58,58);ctx.restore();}
      const entry=n.type==='nemesis'?G.nemesis.getEntryById(state,n.nemesisEntryId):null,label=entry?'宿敌'+entry.level+'阶':shortTitles[n.type],size=phone?24:20;
      const w=Math.max(76,label.length*size+18);M.sheet(ctx,{x:n.x-w/2,y:n.y+29,width:w,height:34},{alpha:available?.98:.82});
      W.text(ctx,label,n.x,n.y+47,size,available?'#39291c':'#594a35','center',available?700:500);
      if(current)W.text(ctx,'此处',n.x,n.y-39,phone?22:18,'#783a2b','center');
      };if(G.render.sceneEntry)G.render.sceneEntry.part(ctx,'route-node',{delay:160+Math.max(0,5-(n.tier||1))*26,duration:340,y:9},paint);else paint();
    });
    const movingPursuit=act>1&&!m.completed&&state.nemesis?.pool?.length>0;
    if(movingPursuit)W.text(ctx,'宿敌可能改道，在前方交锋中再遇。',790,687,phone?24:22,'#6e2f23','center',600);
    if(m.completed)W.text(ctx,'点击查看终局簿',640,701,16,'#783a2b','center');
  };
  G.render.journeyAtlas={paths,symbol};
})();
