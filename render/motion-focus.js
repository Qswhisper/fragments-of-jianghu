/* Finite attention cues. Quiet battle/map frames must become quiet again. */
(function(){
  'use strict';
  let scene='',turnKey='',mapKey='',pulses=[],route=null;
  const clamp=t=>Math.max(0,Math.min(1,t));
  const disabled=()=>G.render.journeyMotion?.disabled();
  function reset(){scene=turnKey=mapKey='';pulses=[];route=null;}
  function update(dt,s){
    if(scene!==s.scene){reset();scene=s.scene;}
    if(s.scene==='combat'&&G.render.sceneEntry&&!G.render.sceneEntry.focusReady()){pulses=[];return;}
    pulses.forEach(p=>p.age+=dt);pulses=pulses.filter(p=>p.age<760);
    if(route&&(route.age+=dt)>=480)route=null;
    if(s.scene==='combat'){
      const key=s.combat.turn+':'+s.combat.enemies.filter(e=>e.hp>0).map(e=>e.id+':'+e.intentLabel+':'+e.intentValue).join('|');
      if(!G.scenes.combat.feedback.isBusy()&&key!==turnKey){
        turnKey=key;
        if(!disabled()&&s.combat.result==='active')pulses=s.combat.enemies.filter(e=>e.hp>0&&e.intentData?.damage).map((e,i)=>({id:e.id,age:-i*75}));
      }
    }else if(s.scene==='map'){
      const key=s.map.actNumber+':'+(s.map.previewNodeId||'');
      if(key!==mapKey){mapKey=key;const to=s.map.nodes.find(n=>n.id===s.map.previewNodeId),from=s.map.nodes.find(n=>n.id===s.map.currentNodeId);
        route=!disabled()&&to?{to,from,age:0}:null;
      }
    }
    if(disabled()){pulses=[];route=null;}
  }
  function sealFill(ctx,x,y,r){const g=ctx.createRadialGradient(x-r*.28,y-r*.38,r*.08,x,y,r);g.addColorStop(0,'#a23e31');g.addColorStop(.58,'#74281f');g.addColorStop(1,'#351717');return g;}
  function ripple(ctx,x,y,r,t,strength=1){
    if(t<0||t>=1)return;
    const fade=Math.sin(Math.PI*t)*strength;
    for(let i=0;i<2;i++){
      const p=clamp(t-i*.19),radius=r+3+p*(i?20:26);if(!p)continue;
      ctx.strokeStyle='rgba(151,49,36,'+(fade*(i?.48:.75)*(1-p))+')';ctx.lineWidth=(1-p)*2.8+.6;
      ctx.beginPath();for(let n=0;n<=64;n++){const a=n/64*Math.PI*2,rr=radius+Math.sin(a*5+p*5)*.8;const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;(n?ctx.lineTo:ctx.moveTo).call(ctx,px,py);}ctx.stroke();
    }
  }
  function render(ctx,s){
    if(disabled())return;ctx.save();
    if(s.scene==='combat'){
      const F=G.scenes.combat.feedback,view=F.getView(s),boxes=G.scenes.combat.getEnemyLayoutBoxes(view),active=F.attentionBeat();
      boxes.forEach(b=>{
        const e=b.enemy;if(!e||e.hp<=0)return;
        const a=window.KGAME_MOBILE?G.render.mobileCombat.intentAnchor(b):{x:(b.baseX??b.x)+b.width/2,y:(b.baseY??b.y)+10},r=window.KGAME_MOBILE?30:23;
        const pulse=pulses.find(p=>p.id===e.id);if(pulse)ripple(ctx,a.x,a.y,r,pulse.age/760,.8);
        if(active?.actor===e.id&&active.target==='player')ripple(ctx,a.x,a.y,r,clamp(active.age/active.duration),1.4);
      });
    }else if(s.scene==='map'&&route){
      const t=clamp(route.age/480),p=1-Math.pow(1-t,3),{from,to}=route;
      if(from){ctx.strokeStyle='rgba(129,48,32,'+Math.sin(t*Math.PI)*.8+')';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(from.x+(to.x-from.x)*p,from.y+(to.y-from.y)*p);ctx.stroke();}
      ripple(ctx,to.x,to.y,28,t,.8);
    }
    ctx.restore();
  }
  G.render.motionFocus={update,render,reset,sealFill,hasVisuals:()=>pulses.length>0||!!route,debug:()=>({pulses:pulses.map(p=>({...p})),route:route&&{age:route.age,id:route.to.id}})};
})();
