/* Contact effects for the realistic battle. Finite Canvas geometry, no per-frame
   image filters, random state, rule changes or screen-sized flashes. */
(function(){
  'use strict';
  const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>1-Math.pow(1-clamp(t),3);
  const reduced=()=>!!G.main?.getState().settings?.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function profile(state,sourceId,template){
    if(sourceId==='player'){
      if(G.cards.getAttackMaterial)return G.cards.getAttackMaterial(state,template);
      const style=template?.style==='basic'?state.player.chosenStyle:template?.style||state.player.chosenStyle;
      if(style==='dirty')return template?.blind||template?.fester&&!template?.damage?'powder':'needle';
      if(style==='iron')return 'heavy';
      if(style==='combo')return 'fist';
      return 'blade';
    }
    const actor=state.combat.enemies.find(e=>e.id===sourceId),data=actor?.intentData||{};
    if(actor&&G.enemies.getAttackMaterial)return G.enemies.getAttackMaterial(actor);
    if(data.firearm)return 'firearm';
    const art=G.render.realisticCombat?.enemyArt(actor||{})||'';
    if(/bayonet|rifle|gunner|loader/.test(art))return 'bayonet';
    if(/blade|chief|reaper|han_bao|shen_lie|luo_wu|xie_qi|loyalist/.test(art))return 'blade';
    return (data.damage||0)>=13?'heavy':'fist';
  }
  function visible(e){return e.scene==='combat'&&!!G.render.woodcut?.combatPresentation;}
  function grain(e,i){return (Math.sin((i+1)*127.1+(e.variant||0)*311.7)*43758.5453)%1;}
  function random(e,i){return Math.abs(grain(e,i));}
  function ribbon(ctx,length,bend,width,reveal,tail){
    const start=Math.max(0,reveal-tail),end=reveal,steps=20;
    function edge(t,side){const thick=Math.sin(Math.PI*clamp((t-start)/Math.max(.001,end-start)))*width;return {x:(t-.5)*length,y:Math.sin(t*Math.PI)*bend+side*thick};}
    ctx.beginPath();
    for(let i=0;i<=steps;i++){const v=edge(start+(end-start)*i/steps,1);if(i)ctx.lineTo(v.x,v.y);else ctx.moveTo(v.x,v.y);}
    for(let i=steps;i>=0;i--){const v=edge(start+(end-start)*i/steps,-1);ctx.lineTo(v.x,v.y);}ctx.closePath();ctx.fill();
  }
  function renderSlash(ctx,e){
    if(!visible(e))return false;
    if(reduced())return true;
    const p=clamp(e.ageMs/e.durationMs),reveal=ease(e.ageMs/105),alpha=Math.min(1,e.ageMs/24)*Math.pow(1-p,1.35);
    const style=e.attackStyle||'blade',x=e.contactX??e.toX,y=e.contactY??e.toY,sign=e.sourceKey==='player'?1:-1;
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;
    if(style==='firearm'){
      const dx=e.toX-e.fromX,dy=e.toY-e.fromY,angle=Math.atan2(dy,dx),distance=Math.hypot(dx,dy);
      ctx.translate(-x,-y);ctx.translate(e.fromX,e.fromY);ctx.rotate(angle);
      const head=distance*clamp(e.ageMs/38),tail=Math.max(0,head-46);
      const light=ctx.createLinearGradient(tail,0,head||1,0);light.addColorStop(0,'#bba48600');light.addColorStop(1,'#e2c6a3');
      ctx.strokeStyle=light;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(tail,0);ctx.lineTo(head,0);ctx.stroke();
    }else if(style==='blade'){
      ctx.rotate(sign*(.63+(e.variant%2?-.38:0)));ctx.scale(sign,1);
      const light=ctx.createLinearGradient(-95,-14,90,22);light.addColorStop(0,'#a5a79d00');light.addColorStop(.38,'#c8d1c4');light.addColorStop(.72,'#f2edda');light.addColorStop(1,'#7f8b7b00');
      ctx.fillStyle='#111b1b';ctx.globalAlpha=alpha*.42;ribbon(ctx,184,18,13,reveal,.88);
      ctx.fillStyle=light;ctx.globalAlpha=alpha*.9;ribbon(ctx,174,17,5.8,reveal,.83);
      ctx.translate(0,-4);ctx.fillStyle='#e7e7d4';ctx.globalAlpha=alpha*.75;ribbon(ctx,171,20,1.1,reveal,.68);
      ctx.translate(-8,13);ctx.fillStyle='#a5b1a2';ctx.globalAlpha=alpha*.23;ribbon(ctx,159,15,2.3,reveal,.66);
    }else if(style==='bayonet'||style==='needle'){
      ctx.rotate(style==='bayonet'?sign*-.12:sign*-.24);ctx.scale(sign,1);
      const length=style==='bayonet'?128:86;ctx.fillStyle='#d5d9c5';ribbon(ctx,length,3,style==='bayonet'?2.5:1.2,reveal,.72);
      if(style==='needle'){ctx.translate(-11,8);ctx.globalAlpha=alpha*.35;ribbon(ctx,67,0,.7,reveal,.65);}
    }else if(style==='powder'){
      for(let i=0;i<15;i++){const t=clamp((e.ageMs-i*2)/170),r=random(e,i),xx=-sign*(1-t)*(65+r*25),yy=(r-.5)*42*t;ctx.globalAlpha=alpha*(.1+r*.18);ctx.fillStyle='#c3b595';ctx.beginPath();ctx.ellipse(xx,yy,1.3+t*3,1+t*2,r,0,Math.PI*2);ctx.fill();}
    }else{
      // Compressed air and fabric drag, without a blade-shaped stroke on fists.
      ctx.scale(sign,1);ctx.strokeStyle='#d2c7ac';ctx.lineCap='butt';
      for(let i=0;i<3;i++){ctx.globalAlpha=alpha*(.22-i*.05);ctx.lineWidth=1.4-i*.25;ctx.beginPath();ctx.moveTo(-70+reveal*18,-13+i*13);ctx.quadraticCurveTo(-30,-18+i*13,12+reveal*12,-10+i*10);ctx.stroke();}
    }
    ctx.restore();return true;
  }
  function dust(ctx,e,p,color,count,radius,alpha){
    ctx.fillStyle=color;
    for(let i=0;i<count;i++){
      const a=random(e,i)*Math.PI*2,spread=(.28+random(e,i+37)*.72)*radius*ease(p),drift=p*p*9;
      const x=Math.cos(a)*spread+(e.direction||1)*p*12,y=Math.sin(a)*spread*.61+drift;
      const size=(1-p)*(1.3+random(e,i+71)*3.5);
      ctx.globalAlpha=alpha*(.2+random(e,i+23)*.65)*(1-p);ctx.beginPath();ctx.ellipse(x,y,size*1.8,size,a,0,Math.PI*2);ctx.fill();
    }
  }
  function renderImpact(ctx,e){
    if(!visible(e)||!['combat_contact','parry_contact','guard_contact','status_contact'].includes(e.tag))return false;
    const p=clamp(e.ageMs/e.durationMs),still=reduced(),t=still?.28:p,alpha=Math.min(1,(1-p)*2),style=e.attackStyle||'fist';
    const blocked=e.tag==='parry_contact',guard=e.tag==='guard_contact',status=e.tag==='status_contact';
    ctx.save();ctx.translate(e.x,e.y);
    if(guard){
      ctx.strokeStyle='#bbc7b0';ctx.globalAlpha=alpha*.48;ctx.lineWidth=1.7;
      // Two settling folds around the forearms; this is gained guard, not a hit.
      for(let i=0;i<2;i++){const r=20+i*11+(still?0:t*8);ctx.beginPath();ctx.ellipse(0,8,r,r*.6,-.35,-2.7,-.25);ctx.stroke();}
    }else if(status){
      dust(ctx,e,t,'#bcba8d',12,32,alpha*.6);
    }else if(blocked){
      ctx.rotate((e.direction||1)*.32);ctx.strokeStyle='#e5d4ad';ctx.lineCap='butt';
      const length=11+ease(t)*27;
      for(let i=0;i<6;i++){const a=-1.25+i*.49;ctx.globalAlpha=alpha*(1-t)*(.9-i*.07);ctx.lineWidth=i%2?1:1.6;ctx.beginPath();ctx.moveTo(Math.cos(a)*length*.35,Math.sin(a)*length*.35);ctx.lineTo(Math.cos(a)*length,Math.sin(a)*length);ctx.stroke();}
      ctx.globalAlpha=alpha*.6;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,10+t*8,1.8,4.5);ctx.stroke();
    }else{
      const heavy=style==='heavy',sharp=style==='blade'||style==='needle'||style==='bayonet';
      const radius=heavy?52:style==='firearm'?27:34;
      // A small contact glint resolves into irregular dust instead of HUD rings.
      if(p<.22){ctx.globalAlpha=(1-p/.22)*.64;const glow=ctx.createRadialGradient(0,0,1,0,0,heavy?23:15);glow.addColorStop(0,'#eee3c7');glow.addColorStop(.3,'#c9bea66b');glow.addColorStop(1,'#c9bea600');ctx.fillStyle=glow;ctx.fillRect(-26,-26,52,52);}
      dust(ctx,e,t,sharp?'#b8aa8c':'#b7ac94',heavy?22:13,radius,alpha*(heavy?.8:.64));
      if(sharp){ctx.rotate((e.direction||1)*.62);ctx.fillStyle='#8e4835';ctx.globalAlpha=alpha*.48;ribbon(ctx,45,3,1.5,1,1);dust(ctx,e,t,'#8b4836',5,26,alpha*.65);}
      else if(!still){ctx.strokeStyle='#d0c5ac';ctx.lineWidth=1.3;ctx.globalAlpha=alpha*(1-t)*.48;ctx.beginPath();ctx.ellipse((e.direction||1)*4,0,11+ease(t)*radius*.48,7+ease(t)*radius*.64,0,-1.45,1.45);ctx.stroke();}
    }
    ctx.restore();return true;
  }
  function renderMuzzleFlash(ctx,e){
    if(!visible(e))return false;
    if(reduced())return true;
    const p=clamp(e.ageMs/e.durationMs),angle=Math.atan2(e.targetY-e.y,e.targetX-e.x);
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(angle);
    if(p<.22){
      ctx.globalAlpha=(1-p/.22)*.88;ctx.fillStyle='#ead6ae';ctx.beginPath();ctx.moveTo(-3,-3);ctx.lineTo(21,-7);ctx.lineTo(14,-2);ctx.lineTo(35,1);ctx.lineTo(16,4);ctx.lineTo(22,8);ctx.lineTo(-3,3);ctx.closePath();ctx.fill();
      ctx.fillStyle='#f4e9cf';ctx.fillRect(-2,-1,13,2);
    }
    for(let i=0;i<5;i++){
      const t=clamp(p-i*.028),r=4+t*11+i*1.5;
      ctx.globalAlpha=(1-p)*(.12-i*.012);ctx.fillStyle=i%2?'#b1ad9a':'#7d8279';ctx.beginPath();ctx.ellipse(8+ease(t)*32+i*6,-t*12+Math.sin(i*2)*7,r*1.3,r*.8,-.4,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();return true;
  }
  G.render.combatVfx={profile,renderSlash,renderImpact,renderMuzzleFlash};
})();
