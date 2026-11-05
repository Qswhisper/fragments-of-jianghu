/* Transient scene arrival. Final art, hit boxes, combat and saved rules stay fixed. */
(function(){
  'use strict';
  const M=G.render.journeyMotion,P=G.render.woodcut.combatPresentation;
  let entry=null,depth=0,history=[],frameState=null;
  const combatRender=G.scenes.combat.render;
  G.scenes.combat.render=function(s,c){frameState=s;try{return combatRender(s,c);}finally{frameState=null;}};
  const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>1-Math.pow(1-clamp(t),3);
  const eligible=(a,b)=>a.scene!==b.scene&&!(a.scene==='title'&&b.scene!=='arrival')&&!(b.scene==='title'&&b.title?.mode!=='report')&&b.scene!=='arrival';
  function active(){return !!entry&&!M.disabled();}
  function emit(cue){if(cue.done)return;cue.done=true;cue.run();history.push({scene:entry?.scene,cue:cue.key,age:entry?.age});history=history.slice(-20);}
  function queueCue(key,run,at=115){if(!active())return false;const cue=entry.cues.find(c=>c.key===key);if(cue&&!cue.done){cue.run=run;return true;}if(!cue)entry.cues.push({key,run,at,done:false});return true;}
  function finish(){if(!entry)return;entry.cues.filter(c=>c.key==='draw').forEach(emit);entry=null;}
  function part(ctx,id,options,paint){
    if(!active()||depth||ctx.canvas.id!=='game-canvas'){return paint();}
    const o=options||{},t=ease((entry.age-(o.delay||0))/(o.duration||340));
    if(t<=0)return;
    ctx.save();ctx.globalAlpha*=t;ctx.translate((1-t)*(o.x||0),(1-t)*(o.y||0));depth++;
    try{paint();}finally{depth--;ctx.restore();}
  }
  function text(ctx,x,y,paint){
    if(!active()||entry.scene==='combat'||depth||M.inSurface()||ctx.canvas.id!=='game-canvas')return false;
    part(ctx,'text',{delay:y<170?100:y>600?290:190,duration:320,y:8},paint);return true;
  }
  const change=M.change,reset=M.reset,update=M.update,visuals=M.hasVisuals,accepts=M.acceptsInput;
  M.change=function(previous,next){
    const start=eligible(previous,next);if(previous.scene!==next.scene)entry=null;
    if(start&&!M.disabled()){
      entry={scene:next.scene,age:0,duration:next.scene==='combat'?1040:670,cues:[]};
      if(['combat','shop','rest','reward'].includes(next.scene))queueCue('arrival',()=>G.audio.playSceneArrival(next.scene));
      if(next.scene==='combat'&&next.combat.hand.length)queueCue('draw',()=>G.audio.playUiCue('draw'),480);
    }
    change(previous,next);
    if(start&&next.scene==='combat'&&M.disabled()&&next.combat.hand.length)G.audio.playUiCue('draw');
  };
  M.reset=function(s){entry=null;reset(s);};
  M.update=function(delta,s){
    update(delta,s);if(!entry)return;
    if(M.disabled()){finish();return;}
    if(s.scene!==entry.scene){entry=null;return;}
    entry.age+=Math.max(0,delta);entry.cues.filter(c=>!c.done&&entry.age>=c.at).forEach(emit);
    if(entry.age>=entry.duration)entry=null;
  };
  M.hasVisuals=()=>active()||visuals();
  M.acceptsInput=()=>accepts()&&(!active()||entry.age>=90);
  // Deliberate input settles decor before main performs its existing hit test.
  // No extra button, saved timer or first-card click is consumed.
  document.getElementById('game-canvas').addEventListener('pointerdown',()=>{if(active()&&entry.age>=90)finish();},{capture:true});
  document.addEventListener('keydown',e=>{if(active()&&['Escape','Enter',' '].includes(e.key))finish();},{capture:true});
  function wrap(object,name,options){const paint=object?.[name];if(!paint)return;object[name]=function(...args){if(!active()||depth||args[0].canvas.id!=='game-canvas')return paint.apply(this,args);return part(args[0],name,typeof options==='function'?options(args):options,()=>paint.apply(this,args));};}
  const surface=M.surface;
  M.surface=function(ctx,id,b,options,paint){
    if(active()&&entry.scene!=='combat'&&!depth&&!M.inSurface())return part(ctx,id,{delay:130+(b.y>400?60:0),duration:340},()=>surface(ctx,id,b,options,paint));
    return surface(ctx,id,b,options,paint);
  };
  wrap(P,'figure',args=>{
    // The render already owns this state. Public getState deliberately deep
    // copies for callers; doing that for every entering figure wastes a frame.
    const s=frameState||G.main.getState(),player=args[1]===P.playerArt(s.player.chosenStyle||'blade');
    const boxes=G.scenes.combat.getEnemyLayoutBoxes(s),index=Math.max(0,boxes.findIndex(b=>Math.abs(b.x-args[2].x)<30));
    return {delay:player?35:100+index*65,duration:player?570:590,x:player?-370:390};
  });
  wrap(P,'roundPlaque',{delay:300,duration:300,y:-14});
  wrap(P,'enemyInfo',args=>({delay:420+Math.max(0,args[3]?.formationIndex||0)*65,duration:300,y:9}));
  wrap(P,'playerInfo',{delay:430,duration:300,x:-14});
  wrap(P,'pile',{delay:550,duration:280,y:14});wrap(P,'endTurn',{delay:580,duration:280,y:14});
  const mobile=G.render.mobileCombat;
  wrap(mobile,'round',{delay:300,duration:300,y:-14});wrap(mobile,'enemy',args=>({delay:420+(args[3]?.formationIndex||0)*65,duration:300,y:9}));
  wrap(mobile,'player',{delay:430,duration:300,x:-14});wrap(mobile,'controls',{delay:550,duration:310,y:14});
  const card=G.render.ui.drawCardSlot;
  G.render.ui.drawCardSlot=function(ctx,c){
    if(active()&&entry.scene==='combat'&&c.artRole==='combat')return part(ctx,'deal',{delay:480+clamp((c.x-300)/600)*140,duration:360,y:108},()=>card(ctx,c));
    return card(ctx,c);
  };
  const materials=G.render.journeyMaterials;
  wrap(materials,'sceneHeading',{delay:70,duration:360,x:-12});
  wrap(materials,'ledger',{delay:310,duration:310,y:10});
  wrap(materials,'sheet',args=>({delay:140+clamp(args[1].y/720)*80,duration:350,y:12}));
  wrap(materials,'action',{delay:280,duration:300,y:8});
  G.render.sceneEntry={active,part,text,queueCue,finish,cacheGroups:true,inPart:()=>depth>0&&active(),
    focusReady:()=>!active()||entry.scene!=='combat'||entry.age>=620,
    ownsTransition:(a,b)=>active()&&a.scene!==b.scene&&['combat','rest','shop','reward'].includes(b.scene),
    debug:()=>({entry:entry?{scene:entry.scene,age:entry.age,duration:entry.duration,cues:entry.cues.map(({key,at,done})=>({key,at,done}))}:null,history:[...history]})};
})();
