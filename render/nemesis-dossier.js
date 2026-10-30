/* One encounter dossier; existing payload, portraits and decisions stay intact. */
(function(){
  'use strict';
  const S=G.scenes.nemesis,M=G.render.journeyMaterials,W=G.render.woodcut;
  const b=(x,y,width,height)=>({x,y,width,height});
  const layout={paper:b(70,300,646,248),portrait:b(768,84,458,520),fight:b(332,584,284,88),record:b(74,584,230,88)};
  const oldLayout=S.getLayout;S.getLayout=()=>({...oldLayout(),fight:layout.fight});
  Object.assign(G.render.journeyRedesign.detailBox,layout.record);
  let painted=[];
  function text(c,s,x,y,size=24,color='#332a23',weight=600){
    G.render.ui.drawLabel(c,String(s||''),x,y,{size,color,weight,fontFamily:"'KGame Ink',serif",opticalCenter:true,shadow:false});
    painted.push({text:String(s||''),x,y,size});
  }
  function lines(c,s,x,y,width,size=24,color='#45392c',lineHeight=31){
    c.save();c.font='600 '+size+"px 'KGame Ink',serif";
    let line='',row=0;for(const ch of String(s||'')){if(line&&c.measureText(line+ch).width>width){text(c,line,x,y+row++*lineHeight,size,color);line='';}line+=ch;}if(line)text(c,line,x,y+row++*lineHeight,size,color);c.restore();return y+row*lineHeight;
  }
  function group(c,id,delay,paint){if(G.render.sceneEntry?.active())G.render.sceneEntry.part(c,id,{delay,duration:340,y:10},paint);else paint();}
  function summary(n){
    const t=n.firearmThreat||{steps:[],damage:0,pierceRatio:0},gun=t.steps.length>0;
    const brief={bulletproof_vest:'破绽叠加减半',gas_mask:'溃烂叠加减半',chain_armor:'每回合 +'+(5+n.level*2)+' 架势',anti_block_tactics:gun?'枪击无视全部架势':'刀招无视一半架势'}[n.adaptation?.id]||'新的准备，交锋记忆可查';
    return {adaptation:n.adaptation?.name||'循迹追来',brief,weapon:n.firearmLabel+(gun?' · '+(t.steps.length-1)+'拍准备':''),threat:gun?'基础 '+t.damage+' 伤 · '+(t.pierceRatio===1?'无视全部架势':'架势抵挡减半'):''};
  }
  function preparation(c,n,source){
    const s=summary(n);text(c,'这次的准备',100,341,20,'#73604a');text(c,s.adaptation,100,380,30,'#773c2d');text(c,s.brief,100,418,24);
    c.strokeStyle='#624b343e';c.lineWidth=1;c.beginPath();c.moveTo(100,445);c.lineTo(681,445);c.stroke();
    text(c,s.weapon,100,476,25);if(s.threat)text(c,s.threat,100,514,23,'#773c2d');
  }
  function fight(c){const q=layout.fight;G.render.journeyMotion.surface(c,'nemesis-fight',q,{distance:7,lift:1},()=>{
    c.fillStyle=G.render.journeyMotion.hovered(q)?'#8d4233':'#713529';c.fillRect(q.x,q.y,q.width,q.height);c.strokeStyle='#b9875a';c.lineWidth=1;c.strokeRect(q.x+5,q.y+5,q.width-10,q.height-10);c.fillStyle='#cdb490';c.fillRect(q.x+18,q.y+q.height/2-11,2,22);G.render.ui.drawLabel(c,'拔刀迎战',q.x+q.width/2,q.y+q.height/2,{size:30,color:'#f0dfbe',weight:600,fontFamily:"'KGame Ink',serif",align:'center',opticalCenter:true,shadow:false});});}
  function render(state,c){
    document.getElementById('entry-ui').hidden=true;G.journeyShell?.syncUI(state);painted=[];
    const n=state.nemesisIntro,source=G.nemesis.getEntryById(state,n.entryId),R=W.combatPresentation;
    G.render.realisticCombat.stage(c,state);const shade=c.createLinearGradient(0,0,1280,0);shade.addColorStop(0,'#080f1488');shade.addColorStop(.66,'#080f1400');shade.addColorStop(1,'#080f1433');c.fillStyle=shade;c.fillRect(0,0,1280,720);
    R.figure(c,G.render.journeyRedesign.nemesisScene(n,source),layout.portrait,false);
    group(c,'nemesis-paper',60,()=>M.sheet(c,layout.paper,{tone:'#b6aa91'}));
    group(c,'nemesis-identity',110,()=>{
      text(c,source.inheritedIntel&&!source.history?.length?'追缉接续':'旧仇再会',78,112,24,'#c4a783');
      text(c,n.name,74,182,n.name.length>10?42:52,'#eee1c7',700);text(c,'宿怨 '+n.level+' 阶',78,230,25,'#c9ab84');
      const last=source.history?.at(-1),quote=last?.playerKillCard?'上回那记「'+last.playerKillCard+'」，我认得。这次，卷和人都得留下。':G.nemesis.getIntroLine(source);
      lines(c,'“'+quote+'”',78,259,625,22,'#c8b89e',25);
    });
    group(c,'nemesis-threat',230,()=>preparation(c,n,source));group(c,'nemesis-actions',310,()=>{M.action(c,layout.record,'交锋记忆');fight(c);});
  }
  G.render.nemesisDossier={render,summary,getLayout:()=>layout,debug:()=>({layout,painted:[...painted]})};S.render=render;
})();
