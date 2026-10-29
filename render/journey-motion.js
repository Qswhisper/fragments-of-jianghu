/* Transient choreography for the full journey. No animation state enters a save. */
(function () {
  'use strict';
  const canvas=document.getElementById('game-canvas'),shell=document.getElementById('game-shell');
  const values=new Map(),surfaceEntries=new Map(),flights=[],notices=[],resourceChanges=new Map();let surfaceDepth=0;
  let state=null,key='',age=1000,clock=0,bridge=null,ghost=null,hasFrame=false,receiptFrom=null,poseBlend=null;
  const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>1-Math.pow(1-clamp(t),3),mix=(a,b,t)=>a+(b-a)*t;
  // One live MediaQueryList follows OS preference changes without allocating
  // and evaluating a new query for every letter, card and HUD paint.
  const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const disabled=s=>!!s?.settings?.reducedMotion||motionPreference.matches;
  function phase(s){return s.scene+':'+(s.scene==='title'?s.title?.mode:s.scene==='arrival'?s.arrival?.stage:s.reviewPanel?'deck':s.reviewReceipt?'receipt':s.scene==='rest'?s.rest?.mode+':'+(Number.isInteger(s.rest?.reviewUpgradeIndex)?'compare':'list'):s.scene==='reward'?s.reward?.mode:s.scene==='event'?s.event?.mode:s.scene==='shop'?s.shop?.mode+':'+(s.shop?.removePage||0)+':'+(s.shop?.browsePage||0)+':'+(s.shop?.purchaseSelection?.type||'')+':'+(s.shop?.purchaseSelection?.index??s.shop?.removeSelectedIndex??''):s.map?.actNumber||'');}
  function sync(s){state=s;document.documentElement.classList.toggle('motion-reduced',disabled(s));if(disabled(s))stopControls();}
  function clearGhost(){ghost?.remove();ghost=null;const ui=document.getElementById('entry-ui');if(ui)ui.style.opacity='';}
  function reset(s){sync(s);key=phase(s);age=1000;bridge=null;receiptFrom=null;poseBlend=null;values.clear();surfaceEntries.clear();resourceChanges.clear();flights.length=notices.length=0;clearGhost();}
  function value(id,target,start=target){let v=values.get(id);if(!v){v={value:start,target,velocity:0};values.set(id,v);}v.target=target;return v.value;}
  function hovered(b){const p=G.main?.getPointer();return !!p&&(p.type!=='touch'||p.isDown)&&!G.main.isPaused()&&p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;}
  function hover(id,b,enabled=true){return disabled(state)?(enabled&&hovered(b)?1:0):value('hover:'+id,enabled&&hovered(b)?1:0,0);}
  function enter(delay=0,duration=420){return disabled(state)?1:ease((age-delay)/duration);}
  function surface(ctx,id,b,options,paint){
    if(disabled(state)){paint();return;}
    const o=options||{},p=G.main.getPointer(),h=hover(id,b,o.enabled!==false),down=o.enabled!==false&&hovered(b)&&p.isDown&&p.startX>=b.x&&p.startX<=b.x+b.width&&p.startY>=b.y&&p.startY<=b.y+b.height;
    // A local mode/selection change must not replay entry on persistent paper,
    // stock or controls. New surfaces still enter on the current phase clock;
    // a genuine scene change clears these per-surface start times below.
    if(!surfaceEntries.has(id))surfaceEntries.set(id,clock-age);
    const released=value('press:'+id,down?1:0,0),pressed=down?1:released;
    const t=o.entry===false||state?.scene==='combat'?1:ease((clock-surfaceEntries.get(id)-(o.delay||0))/(o.duration||360));
    if(down){const v=values.get('press:'+id);if(v){v.value=1;v.velocity=0;}}
    const x=b.x+b.width/2,y=b.y+b.height/2;
    ctx.save();ctx.translate(x,y+(1-t)*(o.distance??16)-h*(o.lift??3)+pressed*2);ctx.rotate((1-t)*(o.angle||0));ctx.scale(1+h*.004-pressed*.012,1+h*.004-pressed*.012);ctx.translate(-x,-y);ctx.globalAlpha*=.4+.6*t;
    surfaceDepth++;try{paint();}finally{surfaceDepth--;ctx.restore();}
  }
  function layers(pose,ready=()=>true){
    if(!poseBlend||disabled(state))return [{pose,alpha:1}];
    // Keep the already visible pose while the next image decodes. The blend
    // clock begins at readiness, rather than expiring behind a missing image.
    if(!ready(pose))return [{pose:poseBlend.from,alpha:1}];
    if(poseBlend.waiting){poseBlend.waiting=false;poseBlend.age=0;}
    const t=ease(poseBlend.age/260);return [{pose:poseBlend.from,alpha:1-t},{pose,alpha:t}];
  }
  function pose(ctx,paint){if(disabled(state)){paint();return;}const breath=Math.sin(clock/1450);ctx.save();ctx.translate(240,720);ctx.scale(1+breath*.0008,1+breath*.0014);ctx.translate(-240,-720);paint();ctx.restore();}
  function rect(id,b){if(id!=='receipt-card'||!receiptFrom||disabled(state))return b;const t=ease(receiptFrom.age/420),f=receiptFrom.box;return {...b,x:mix(f.x,b.x,t),y:mix(f.y,b.y,t),width:mix(f.width,b.width,t),height:mix(f.height,b.height,t)};}
  function receiptContent(ctx,paint){ctx.save();if(receiptFrom&&!disabled(state))ctx.globalAlpha*=ease((receiptFrom.age-240)/160);try{paint();}finally{ctx.restore();}}
  function fly(card,from,type='card',shop=false){flights.push({card,from:{...from},type,age:0,duration:shop?460:620,to:shop?{x:from.x+from.width/2,y:790}:{x:1110,y:52},shop});}
  function receiptBox(s){return s.scene==='reward'&&G.render.journeyRedesign?G.render.journeyRedesign.receiptCardBox(s):rect('receipt-card',{x:614,y:234,width:218,height:326});}
  function transitionRegion(s){
    if(s.scene==='rest')return {x:578,y:130,width:662,height:502};
    if(s.scene==='reward')return {x:426,y:150,width:804,height:484};
    if(s.scene==='shop')return {x:70,y:144,width:1140,height:496};
    if(s.scene==='event')return {x:638,y:90,width:602,height:600};
    return null;
  }
  function change(previous,next){
    // A restored run already owns its receipt/resources. Loading it is not a
    // new transaction and has no card source on the title screen.
    if(previous.scene==='title'&&!['title','arrival'].includes(next.scene)||next.scene==='title'&&previous.scene!=='title'){reset(next);return;}
    const sourceRect=!previous.reviewReceipt&&next.reviewReceipt?.cardName?(previous.scene==='reward'?G.render.realisticJourney.cardBox(previous.reward,previous.reward.reviewSelectedIndex):{x:908,y:224,width:236,height:346}):null;
    const departingReceipt=previous.reviewReceipt?.cardName&&!next.reviewReceipt?receiptBox(previous):null;
    sync(next);if(disabled(next)){reset(next);return;}
    if(next.scene!=='combat'&&previous.player&&next.player){
      for(const [type,a,b] of [['health',previous.player.hp,next.player.hp],['gold',previous.player.gold,next.player.gold],['deck',previous.player.masterDeckNames?.length,next.player.masterDeckNames?.length]]){
        if(Number.isFinite(a)&&Number.isFinite(b)&&a!==b){
          const from=resourceChanges.get(type)?.from??a;
          resourceChanges.set(type,{age:0,from,to:b,delta:b-from,gain:b>from,fromRatio:type==='health'?a/previous.player.maxHp:null});
        }
      }
    }
    const oldKey=phase(previous),newKey=phase(next);
    if(oldKey!==newKey){
      if(previous.scene!==next.scene)surfaceEntries.clear();
      // Capture only on a transition, before main renders the incoming scene.
      const old=G.render.canvasUtils.createLayer(1280,720,canvas.renderScale||1);if(hasFrame)old.getContext('2d').drawImage(canvas,0,0,1280,720);
      const opening=previous.scene==='arrival'||(previous.scene==='title'&&['menu','styles'].includes(previous.title?.mode)&&((next.scene==='title'&&['menu','styles'].includes(next.title?.mode))||next.scene==='arrival'));
      const checkoutOpening=previous.scene==='shop'&&next.scene==='shop'&&(!previous.shop.purchaseSelection&&next.shop.purchaseSelection||!Number.isInteger(previous.shop.removeSelectedIndex)&&Number.isInteger(next.shop.removeSelectedIndex));
      bridge=hasFrame&&!checkoutOpening?{old,age:0,duration:opening?380:previous.scene===next.scene?190:280,opening,region:previous.scene===next.scene?transitionRegion(next):null}:null;
      if(bridge&&previous.scene!==next.scene&&G.render.sceneEntry?.active())bridge.duration=140;
      if(bridge&&previous.scene==='reward'&&next.scene==='reward'&&!previous.reviewReceipt&&next.reviewReceipt){
        bridge.regions=previous.reward.options.map((_,i)=>i===previous.reward.reviewSelectedIndex&&next.reviewReceipt.cardName?null:G.render.realisticJourney.cardBox(previous.reward,i)).filter(Boolean).map(b=>({x:b.x-10,y:b.y-10,width:b.width+20,height:b.height+20}));
      }
      clearGhost();const ui=document.getElementById('entry-ui');
      if(ui&&!ui.hidden&&bridge){ghost=ui.cloneNode(true);ghost.removeAttribute('id');ghost.classList.add('journey-motion-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.querySelectorAll('*').forEach(e=>{e.style.animation='none';e.removeAttribute('id');});shell.append(ghost);}
      age=0;key=newKey;values.clear();
    }
    if(previous.scene==='rest'&&next.scene==='rest'){
      const a=G.render.realisticJourney.restPose(previous),b=G.render.realisticJourney.restPose(next);if(a!==b)poseBlend={from:poseBlend?.waiting?poseBlend.from:a,age:0,waiting:true};
    }
    if(!previous.reviewReceipt&&next.reviewReceipt?.cardName){
      const from=sourceRect;receiptFrom={box:{...from},age:0};
      if(bridge)bridge.old.getContext('2d').clearRect(from.x-16,from.y-16,from.width+32,from.height+32);
    }
    if(previous.scene==='shop'&&next.scene==='shop'&&previous.shop&&next.shop){
      for(const field of ['cardOffers','relicOffers'])next.shop[field].forEach((offer,i)=>{if(offer.sold&&!previous.shop[field][i]?.sold){const selected=previous.shop.purchaseSelection,b=selected?.index===i&&selected.type===(field==='cardOffers'?'card':'relic')&&G.render.journeyRedesign?G.render.journeyRedesign.checkoutCardBox(field==='relicOffers'):(field==='cardOffers'?G.scenes.shop.getCardBoxes:G.scenes.shop.getRelicBoxes)(G.scenes.shop.getLayout())[i];if(bridge)bridge.old.getContext('2d').clearRect(b.x-20,b.y-20,b.width+40,b.height+40);fly(offer,b,field==='cardOffers'?'card':'relic',true);}});
    }
    if(previous.scene==='reward'&&next.scene==='reward'&&previous.reward?.mode==='relic'&&next.reward?.mode==='card'){
      const selected=previous.reward.options[previous.reward.reviewSelectedIndex];
      if(selected&&!previous.player.relics.includes(selected.id)&&next.player.relics.includes(selected.id)){
        const b=G.render.realisticJourney.cardBox(previous.reward,previous.reward.reviewSelectedIndex),from={x:b.x+24,y:b.y+20,width:b.width-48,height:114};
        if(bridge)bridge.old.getContext('2d').clearRect(from.x-2,from.y-2,from.width+4,from.height+4);
        fly(selected,from,'relic');const flight=flights[flights.length-1];flight.to={x:1194,y:152};flight.duration=580;flight.scaleTo=28/from.width;flight.rewardRelic=true;
      }
    }
    if(previous.reviewReceipt?.cardName&&!next.reviewReceipt&&next.scene!==previous.scene){
      const from=departingReceipt;
      if(bridge)bridge.old.getContext('2d').clearRect(from.x-16,from.y-16,from.width+32,from.height+32);
      fly(G.cards.getCardByName(previous.reviewReceipt.cardName),from);
    }
  }
  function update(delta,s){
    sync(s);if(disabled(s)){if(bridge||ghost||receiptFrom||poseBlend||resourceChanges.size||flights.length||notices.length)reset(s);return;}
    clock+=delta;age+=delta;if(bridge){bridge.age+=delta;if(bridge.age>=bridge.duration){bridge=null;clearGhost();}}
    if(receiptFrom){receiptFrom.age+=delta;if(receiptFrom.age>=420)receiptFrom=null;}
    if(poseBlend&&!poseBlend.waiting){poseBlend.age+=delta;if(poseBlend.age>=260)poseBlend=null;}
    const dt=Math.min(delta,32)/1000;
    values.forEach((v,id)=>{const tactile=id.startsWith('press:');v.velocity+=(v.target-v.value)*(tactile?480:260)*dt;v.velocity*=Math.exp(-(tactile?19:24)*dt);v.value+=v.velocity*dt;if(Math.abs(v.target-v.value)<.001&&Math.abs(v.velocity)<.001)v.value=v.target;});
    for(const list of [flights,notices]){list.forEach(f=>f.age+=delta);for(let i=list.length-1;i>=0;i--)if(list[i].age>=list[i].duration)list.splice(i,1);}
    resourceChanges.forEach((v,k)=>{v.age+=delta;if(v.age>=1080)resourceChanges.delete(k);});
  }
  function resourceRatio(type,ratio){const cue=resourceChanges.get(type);return cue&&Number.isFinite(cue.fromRatio)&&!disabled(state)?mix(cue.fromRatio,ratio,ease(cue.age/460)):ratio;}
  function relicOpacity(id){const f=flights.find(f=>f.rewardRelic&&f.card.id===id);return f?ease((f.age-300)/280):1;}
  function resourceCue(ctx,type,b,options={}){
    const cue=resourceChanges.get(type);if(!cue||disabled(state))return;
    const t=clamp(cue.age/1080),alpha=Math.min(1,cue.age/55,(1080-cue.age)/260),color=cue.gain?(type==='health'?'#c8d4ab':'#dec18d'):'#d79b81';
    ctx.save();ctx.globalAlpha*=alpha;
    G.render.woodcut.text(ctx,(cue.delta>0?'+':'−')+Math.abs(cue.delta),options.x??b.x+8,(options.y??b.y-5)-ease(t)*5,options.size??20,color,'left',600);
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.globalAlpha*=.58*(1-t);
    ctx.beginPath();ctx.moveTo(b.x+7,b.y+b.height-3);ctx.lineTo(b.x+7+(b.width-18)*ease(cue.age/300),b.y+b.height-3);ctx.stroke();ctx.restore();
  }
  function ambient(ctx,s){
    if(disabled(s)||s.scene==='combat'||s.scene==='map')return;
    ctx.save();
    if(s.scene==='rest'){
      const flicker=.58+.16*Math.sin(clock*.005)+.08*Math.sin(clock*.011);
      const glow=ctx.createRadialGradient(103,427,4,103,427,108);glow.addColorStop(0,'rgba(218,155,78,'+(.075*flicker)+')');glow.addColorStop(1,'rgba(160,94,44,0)');ctx.fillStyle=glow;ctx.fillRect(0,319,214,216);
      for(let i=0;i<5;i++){const t=(clock/4500+i*.19)%1;ctx.globalAlpha=(1-t)*.24;ctx.fillStyle='#d6ae76';ctx.beginPath();ctx.ellipse(98+Math.sin(t*5+i)*9,420-t*48,.75,1.1,0,0,Math.PI*2);ctx.fill();}
    }else{
      for(let i=0;i<12;i++){const t=(clock/18000+i*.173)%1,x=(i*137+clock*.008)%1280,y=210+(i*79)%380-t*28;ctx.globalAlpha=Math.sin(t*Math.PI)*.13;ctx.fillStyle='#b8b4a6';ctx.beginPath();ctx.arc(x,y,i%3===0?1.1:.65,0,Math.PI*2);ctx.fill();}
    }ctx.restore();
  }
  function render(ctx,s){
    if(disabled(s))return;
    ambient(ctx,s);ctx.save();
    if(bridge){const t=clamp(bridge.age/bridge.duration),out=1-ease(t);ctx.save();if(bridge.regions||bridge.region){ctx.beginPath();(bridge.regions||[bridge.region]).forEach(b=>ctx.rect(b.x,b.y,b.width,b.height));ctx.clip();}ctx.globalAlpha=out;ctx.drawImage(bridge.old,0,0,1280,720);ctx.restore();
      if(ghost){ghost.style.opacity=out;ghost.style.transform=bridge.opening?'none':'translateX('+(-t*6)+'px)';}const ui=document.getElementById('entry-ui');if(ui&&!ui.hidden)ui.style.opacity=ease(t);
    }
    flights.forEach(f=>{
      const t=ease(f.age/f.duration),x=mix(f.from.x+f.from.width/2,f.to.x,t),y=mix(f.from.y+f.from.height/2,f.to.y,t)-Math.sin(t*Math.PI)*(f.shop?16:70),scale=mix(1,f.scaleTo??(f.shop?.62:.12),t);
      ctx.save();ctx.globalAlpha=clamp((1-t)*4);ctx.translate(x,y);ctx.rotate((f.shop?-.055:-.025)*(1-t)+Math.sin(t*Math.PI)*.06);ctx.scale(scale,scale);
      if(f.type==='relic')G.render.woodcut.image(ctx,G.render.assets.getRelicPath(f.card.id),{x:-f.from.width/2,y:-f.from.height/2,width:f.from.width,height:f.from.height});
      else if(G.render.journeyBook)G.render.journeyBook.card(ctx,f.card,{x:-f.from.width/2,y:-f.from.height/2,width:f.from.width,height:f.from.height});
      else G.render.woodcut.card(ctx,{...f.card,sourceCard:f.card,x:-f.from.width/2,y:-f.from.height/2,width:f.from.width,height:f.from.height,playable:true,skipMotion:true,disableBaseShadow:true});
      ctx.restore();
      if(!f.shop&&!f.rewardRelic&&t>.6){ctx.globalAlpha=clamp((1-t)*3);G.render.woodcut.text(ctx,f.type==='relic'?'+1 旧物':'+1 招式',1096,83-18*(t-.6),14,'#d4bc93','center');ctx.globalAlpha=1;}
    });
    notices.forEach(n=>{const t=clamp(n.age/n.duration);ctx.globalAlpha=Math.min(1,t*6,(1-t)*4);G.render.woodcut.text(ctx,n.text,n.x,n.y-ease(t)*25,19,'#d2d9b6','center');});ctx.restore();
  }
  function closeDialog(dialog){
    if(disabled(state))return;
    const clone=document.createElement('div'),b=dialog.getBoundingClientRect();clone.className=dialog.className+' journey-dialog-ghost';clone.innerHTML=dialog.innerHTML;clone.inert=true;clone.setAttribute('aria-hidden','true');
    const original=[dialog,...dialog.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
    copies.forEach((e,i)=>{if(e.id)e.removeAttribute('id');const css=getComputedStyle(original[i]);for(const property of ['font','color','padding','border','background','box-shadow','display','align-items','justify-content','gap','box-sizing','overflow'])e.style.setProperty(property,css.getPropertyValue(property));});
    Object.assign(clone.style,{position:'fixed',left:b.x+'px',top:b.y+'px',width:b.width+'px',height:b.height+'px',margin:'0',maxHeight:'none',pointerEvents:'none',zIndex:'12',animation:'none'});
    const frame=document.createElement('div');frame.className='journey-dialog-departure';Object.assign(frame.style,{position:'fixed',inset:'0',overflow:'hidden',contain:'strict',pointerEvents:'none',zIndex:'12'});frame.append(clone);document.body.append(frame);
    clone.animate([{opacity:Number(getComputedStyle(dialog).opacity),transform:'translateY(0)'},{opacity:0,transform:'translateY(5px)'}],{duration:120,easing:'ease-out'}).finished.then(()=>frame.remove(),()=>frame.remove());
  }
  function capture(){hasFrame=true;}
  // A short, bounded release spring belongs to controls, never to prose or portraits.
  const controlAnimations=new Map();
  function settleControl(event){
    const button=event.target.closest?.('button');
    if(!button||button.disabled||disabled(state)||event.type==='keyup'&&!['Enter',' '].includes(event.key))return;
    controlAnimations.get(button)?.cancel();
    const animation=button.animate([{scale:'.985',offset:0},{scale:'1.003',offset:.65},{scale:'1',offset:1}],{duration:170,easing:'ease-out'});
    controlAnimations.set(button,animation);animation.finished.catch(()=>{}).finally(()=>{if(controlAnimations.get(button)===animation)controlAnimations.delete(button);});
  }
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest?.('button');
    if(!button||button.disabled||event.button!==0)return;
    // The completed action owns its cue. A global down sound doubled menu,
    // dialog and purchase feedback, and also sounded on cancelled touches.
    G.audio?.handleUserGesture();
  });
  document.addEventListener('pointerup',settleControl);
  document.addEventListener('pointercancel',()=>stopControls());
  document.addEventListener('keyup',settleControl);
  function stopControls(){controlAnimations.forEach(a=>a.cancel());controlAnimations.clear();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopControls();});
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',stopControls);
  function hasVisuals(){return !disabled(state)&&(!!bridge||!!receiptFrom||!!poseBlend||resourceChanges.size>0||flights.length>0||notices.length>0||age<600||Array.from(values.values()).some(v=>Math.abs(v.target-v.value)>.001||Math.abs(v.velocity)>.001));}
  G.render.journeyMotion={inSurface:()=>surfaceDepth>0,change,update,render,capture,reset,value,hover,hovered,enter,surface,layers,pose,rect,receiptContent,closeDialog,resourceCue,resourceRatio,relicOpacity,hasVisuals,acceptsInput:()=>!bridge||bridge.age>=Math.min(90,bridge.duration*.25),disabled:()=>disabled(state),debug:()=>({phase:key,age,transition:bridge?{age:bridge.age,duration:bridge.duration,region:bridge.region}:null,flights:flights.length,flightDetails:flights.map(f=>({from:f.from,to:f.to,age:f.age,shop:f.shop,type:f.type})),notices:notices.length,resources:[...resourceChanges.keys()],resourceDetails:[...resourceChanges].map(([type,v])=>({type,...v})),receipt:receiptFrom?.age??null,reduced:disabled(state)})};
})();

