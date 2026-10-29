/* Choreograph the existing reward wait; no additional rule delay/save fields. */
(function(){
  'use strict';
  const W=G.render.woodcut,P=W.combatPresentation,U=G.render.canvasUtils,M=G.render.journeyMotion,clamp=n=>Math.max(0,Math.min(1,n));let frameState=null,depth=0;
  const layers=new Map(),full={x:0,y:0,width:1280,height:720};
  function release(){for(const layer of layers.values()){layer.width=0;layer.height=0;}layers.clear();}
  function rasterBounds(c,b){
    const d=U.density(c),x=Math.max(0,Math.floor(b.x*d)/d),y=Math.max(0,Math.floor(b.y*d)/d);
    return {x,y,width:Math.min(1280,Math.ceil((b.x+b.width)*d)/d)-x,height:Math.min(720,Math.ceil((b.y+b.height)*d)/d)-y};
  }
  const render=G.scenes.combat.render;
  G.scenes.combat.render=function(s,c){frameState=s;if(!progress())release();try{return render(s,c);}finally{frameState=null;}};
  function progress(s=frameState){return s?.scene==='combat'&&s.combat.result==='victory'&&s.combat.presentation?.pendingScene==='reward'&&!G.scenes.combat.feedback?.isBusy()&&!G.render.journeyMotion.disabled()?clamp((520-s.combat.presentation.transitionMs)/520):0;}
  function paint(c,key,b,pose,draw){
    if(pose.alpha<=0)return;
    let layer=layers.get(key);if(!layer){layer=U.createLayer(b.width,b.height,U.density(c));const brush=layer.getContext('2d');brush.translate(-b.x,-b.y);depth++;try{draw(brush);}finally{depth--;}layers.set(key,layer);}
    c.save();c.globalAlpha*=pose.alpha;c.translate(pose.x||0,pose.y||0);c.drawImage(layer,b.x,b.y,b.width,b.height);c.restore();
  }
  function wrap(object,key,pose,bounds=()=>full,snap=false){const old=object?.[key];if(!old)return;object[key]=function(...args){const t=progress(),c=args[0];if(!t||depth||c.canvas.id!=='game-canvas')return old.apply(this,args);const p=pose(t,args);if(!p)return old.apply(this,args);const b=snap?rasterBounds(c,bounds(args)):bounds(args);return paint(c,key+':'+b.x+':'+b.y,b,p,brush=>old.call(this,brush,...args.slice(1)));};}
  const out=(t,delay=0,duration=.52)=>{const p=clamp((t-delay)/duration);return p*p*(3-2*p);};
  wrap(P,'figure',(t,a)=>a[1]===P.playerArt(frameState.player.chosenStyle||'blade')?{alpha:1-out(t,.16,.76),x:-150*out(t,.16,.76)}:null,a=>a[2]);
  wrap(P,'playerInfo',t=>({alpha:1-out(t),y:18*out(t)}),()=>({x:20,y:440,width:300,height:280}));
  for(const key of ['pile','endTurn'])wrap(P,key,t=>({alpha:1-out(t),y:18*out(t)}),a=>({x:a[1].x-24,y:a[1].y-24,width:a[1].width+48,height:a[1].height+48}));
  wrap(P,'roundPlaque',t=>({alpha:1-out(t),y:-18*out(t)}),()=>({x:530,y:0,width:220,height:112}));
  wrap(G.render.mobileCombat,'round',t=>({alpha:1-out(t),y:-15*out(t)}),()=>({x:500,y:0,width:280,height:132}),true);
  wrap(G.render.mobileCombat,'player',t=>({alpha:1-out(t),y:18*out(t)}),a=>({x:0,y:a[2].playerPanel.y-32,width:a[2].playerPanel.x+a[2].playerPanel.width+48,height:720-a[2].playerPanel.y+32}),true);
  wrap(G.render.ui,'drawCardSlot',(t,a)=>a[1].artRole==='combat'?{alpha:1-out(t),y:88*out(t)}:null,a=>({x:a[1].x-40,y:a[1].y-40,width:a[1].width+80,height:a[1].height+80}));
  const change=M.change,reset=M.reset;M.change=function(a,b){if(a.scene!==b.scene)release();return change(a,b);};M.reset=function(s){release();return reset(s);};
  G.render.combatDeparture={hud:(c,key,b,draw)=>{const t=progress();if(!t)return draw(c);paint(c,key,b,{alpha:1-out(t)},draw);},control:(c,key,b,draw)=>{const t=progress();if(!t||depth||c.canvas.id!=='game-canvas')return draw(c);paint(c,'mobile-control:'+key,rasterBounds(c,b),{alpha:1-out(t),y:18*out(t)},draw);},debug:()=>({progress:progress(G.main.getState()),usesExistingTransition:true,layers:layers.size,bytes:[...layers.values()].reduce((n,c)=>n+c.width*c.height*4,0)})};
})();
