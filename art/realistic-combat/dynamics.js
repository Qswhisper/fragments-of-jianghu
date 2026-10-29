/* Opt-in combat playback for the accepted realistic sample. Rule state is committed
   once; snapshots and effects are transient, so a save never contains half a turn. */
(function () {
  'use strict';
  const S=G.scenes.combat, A=G.render.animations, P=G.render.realisticCombat;
  const copy=value=>JSON.parse(JSON.stringify(value));
  const clamp=n=>Math.max(0,Math.min(1,n));
  let sequence=null, serial=0, notices=[], banner=null, speed=1, reduced=false, reflow=null;
  const updateEffects=A.update;
  A.update=(delta,scene)=>updateEffects(scene==='combat'?delta*speed:delta,scene);
  const enemy=(state,id)=>state.combat.enemies.find(e=>e.id===id);
  function clean(state) {
    const view=copy(state);
    view.combat.selectedCardId=null;view.combat.inspectCardId=null;
    view.combat.inspectPresentation={cardId:null,progress:0,targetVisible:false};
    view.combat.ui.overlay=null;
    return view;
  }
  function clear() { sequence=null;reflow=null;notices=[];banner=null;G.render.combatInteraction.clear();A.clearEffects('combat');G.audio?.stopCombatSfx(); }
  function ownsAudio(state) { return !!sequence && state.scene==='combat' && state.combat.feedbackToken===sequence.token; }
  function getView(state) {
    if (sequence && !ownsAudio(state)) clear();
    if(!sequence)return state;
    if(sequence.kind!=='card')return sequence.view;
    // Hits remain staged, while the hand/costs respond to committed input now.
    return {...sequence.view,player:{...sequence.view.player,energy:state.player.energy},combat:{...sequence.view.combat,
      feedbackToken:state.combat.feedbackToken,hand:inputHand(state.combat.hand),
      selectedCardId:state.combat.selectedCardId,inspectCardId:state.combat.inspectCardId,
      inspectPresentation:state.combat.inspectPresentation,ui:state.combat.ui,
      interactiveEnemyIds:state.combat.enemies.filter(e=>e.hp>0).map(e=>e.id)}};
  }
  function acceptsCards(){return !sequence||sequence.kind==='card';}
  function inputHand(hand){return sequence?.kind==='card'&&sequence.revealedHand?hand.filter(c=>sequence.revealedHand.has(c.id)):hand;}
  function cue(text) { banner={text,age:0,duration:520}; }
  function audio(type,before,after,actor) { G.audio?.playCombatBeat(type,before,after,actor); }
  function point(state,id) {
    if (id==='player') return {x:351,y:335};
    const b=S.getEnemyLayoutBoxes(state).find(b=>b.enemy.id===id);
    return b?{x:b.x+b.width/2,y:b.y+32+Math.min(310,b.height-82)*.48}:null;
  }
  function notice(text,id,state,tone='hurt',line=0) {
    const p=point(state,id);if(!p)return;
    notices.push({text,target:id,x:p.x+(id==='player'?-76:0),y:p.y-38+line*27,tone,age:0,duration:640});
  }
  function beat(actor,target,label,contact,duration,firearm=false,attackStyle='') {
    const fromMotion=actor==='player'&&sequence.beat?.actor==='player'?getMotion(actor):null;
    sequence.beat={actor,target,label,contact,duration,firearm,attackStyle,fromMotion,start:sequence.age};
  }
  function event(list,at,run) {list.push({at,run});}
  function start(previous,next,events,duration,kind='turn') {
    next.combat.feedbackToken=++serial;
    sequence={token:serial,kind,age:0,duration,cursor:0,events:events.sort((a,b)=>a.at-b.at),view:clean(previous),beat:null};
    A.clearCardDrag('combat');update(0,next);
  }
  function liveKey(enemies) {return enemies.filter(e=>e.hp>0).map(e=>e.id).join('|');}
  function setView(state) {
    const old=sequence.view,changed=liveKey(old.combat.enemies)!==liveKey(state.combat.enemies);
    const from=changed?S.getEnemyLayoutBoxes(old):null;
    sequence.view=clean(state);
    if(changed)reflow={age:reduced?-90:-420,duration:reduced?90:340,key:liveKey(state.combat.enemies),from:new Map(from.map(b=>[b.enemy.id,b]))};
    if(reflow&&liveKey(state.combat.enemies)===reflow.key){
      // The death echo retains the former slot for its exit, then reflow owns
      // the survivor positions. Never persist a partly moved formation.
      for(const view of [state,sequence.view])if(view.combat.presentation){view.combat.presentation.enemyLayoutHoldMs=0;view.combat.presentation.enemyLayoutEnemyIds=null;}
    }
  }
  function layoutBox(box,enemies) {
    if(!reflow||liveKey(enemies)!==reflow.key)return box;
    const from=reflow.from.get(box.enemy.id);if(!from)return box;
    const p=clamp(reflow.age/reflow.duration),t=p*p*(3-2*p),b={...box,moving:reflow.age>=0};
    for(const key of ['x','y','width','height','baseX','baseY'])b[key]=from[key]+(box[key]-from[key])*t;
    if(window.KGAME_MOBILE){b.hitX=b.baseX;b.hitWidth=b.width;}
    return b;
  }
  function impact(before,after,id,sourceId,firearm=false,countBlock=true,attackStyle='',variant=0) {
    const was=id==='player'?before.player:enemy(before,id), now=id==='player'?after.player:enemy(after,id);
    if(!was||!now)return;
    const hp=Math.max(0,was.hp-now.hp),blocked=countBlock?Math.max(0,(was.block||0)-(now.block||0)):0;
    const p=point(before,id),source=point(before,sourceId)||p;
    if(!p)return;
    const style=attackStyle||G.render.combatVfx?.profile(before,sourceId)||(firearm?'firearm':'blunt');
    const oldTags=id!=='player'&&sourceId==='player'?S.getEnemyStatusChips(was,false).map(t=>t.text):[];
    const tags=id!=='player'&&sourceId==='player'?S.getEnemyStatusChips(now,false).filter(t=>!oldTags.includes(t.text)):[];
    const poisonAdded=id==='player' && (now.poisonTurns||0)>(was.poisonTurns||0);
    // A new contact replaces that target's previous readout. Fast multi-hits must
    // not stack several opaque numbers over the same face or status marker.
    if(hp||blocked||now.block>was.block||tags.length||poisonAdded) notices=notices.filter(n=>n.target!==id);
    if(hp||blocked) {
      A.spawnImpact({scene:'combat',tag:sourceId===id?'status_contact':blocked&&!hp?'parry_contact':'combat_contact',sourceKey:sourceId,targetKey:id,
        x:p.x,y:p.y,sourceX:source.x,sourceY:source.y,radius:blocked&&!hp?20:27,
        color:blocked&&!hp?'#d0c6a8':'#c08a76',attackStyle:style,variant,direction:p.x<source.x?-1:1,durationMs:blocked&&!hp?210:290});
      if(!reduced&&sourceId!==id) {
        const heavy=style==='heavy'||hp>=12;
        A.spawnStagger({scene:'combat',tag:'combat_reaction',targetKey:id,sourceX:source.x,sourceY:source.y,
          targetX:p.x,targetY:p.y,amplitudeX:(p.x<source.x?-1:1)*(hp?(heavy?18:11)+Math.min(6,hp*.22):4),amplitudeY:hp?(heavy?4:2):1,durationMs:heavy?285:220,contactHoldMs:heavy?42:28});
        if(hp&&heavy)A.spawnShake({scene:'combat',amplitudeX:1.8,amplitudeY:1.1,durationMs:110,frequency:23});
      }
      if(blocked) notice('挡下 '+blocked,id,before,'block');
      if(hp) notice('−'+hp+' 气血',id,before,'hurt',blocked?1:0);
      else if(blocked) notice('未伤气血',id,before,'quiet',1);
    }
    if(now.block>was.block) {
      notice('架势 +'+(now.block-was.block),id,before,'block');
      A.spawnImpact({scene:'combat',tag:'guard_contact',targetKey:id,x:p.x,y:p.y,attackStyle:style,durationMs:240});
    }
    if(poisonAdded) notice('中毒 '+now.poisonTurns,id,before,'status',hp||blocked?2:0);
    tags.forEach((t,i)=>notice(t.text,id,before,'status',(blocked?2:hp||now.block>was.block?1:0)+i));
    if(tags.length||poisonAdded) A.spawnImpact({scene:'combat',tag:'status_contact',targetKey:id,x:p.x,y:p.y,attackStyle:style,durationMs:310});
  }
  function defeat(before,after) {
    // Only emit at the actual HP-changing beat, not when the final rule state is committed.
    S.feedbackEffects.defeat(before,after);
  }
  function slash(state,sourceId,targetId,firearm=false,attackStyle='',variant=0) {
    const from=point(state,sourceId),to=point(state,targetId);if(!from||!to)return;
    const style=attackStyle||G.render.combatVfx?.profile(state,sourceId)||(firearm?'firearm':'blade'),contact={...to};
    if(firearm) {
      const b=S.getEnemyLayoutBoxes(state).find(b=>b.enemy.id===sourceId);
      if(b)Object.assign(from,P.gunMuzzle(b.enemy,b));
    } else {
      // A blade leaves a short trail at contact; do not draw a glowing beam across the street.
      from.x=to.x+(sourceId==='player'?-55:55);from.y=to.y-34;
    }
    A.spawnSlash({scene:'combat',tag:firearm?'enemy_firearm_slash':sourceId==='player'?'player_hit_slash':'enemy_melee_slash',
      sourceKey:sourceId,targetKey:targetId,fromX:from.x,fromY:from.y,toX:to.x,toY:to.y,
      attackStyle:style,variant,contactX:contact.x,contactY:contact.y,color:'#d8c8ae',accent:'#a96556',width:firearm?3:5,durationMs:firearm?100:240});
  }
  function presentCard(previous,paid,next,card,target,template,hits) {
    const list=[],id=target.enemy.id,hasTarget=G.render.combatInteraction.needsEnemy(template);
    const queued=sequence?.kind==='card';
    const style=G.render.combatVfx?.profile(previous,'player',template)||'';
    // Keep the paid card out of the hand immediately, but reveal HP and status at contact.
    const initial=clean(paid);initial.player.block=previous.player.block;
    const usefulHits=hits.filter(h=>{const a=enemy(h.before,id),b=enemy(h.after,id);return a&&b&&(a.hp!==b.hp||a.block!==b.block);});
    const frames=usefulHits.length?usefulHits:[{before:previous,after:next}];
    const lastContact=145+(frames.length-1)*130;
    const killed=next.combat.enemies.some(e=>e.hp<=0&&enemy(previous,e.id)?.hp>0);
    event(list,0,()=>{
      setView(initial);beat('player',hasTarget?id:'player',card.name,145,lastContact+260,false,style);
      if(!queued)S.feedbackEffects.hand(previous,paid,{discardDelayMs:0,drawDelayMs:0});
      audio('player_windup',previous,next,{cardTemplate:template,attackStyle:style});
    });
    frames.forEach((frame,index)=>{
      const at=145+index*130,after=index===frames.length-1?next:frame.after;
      if(hasTarget) event(list,Math.max(0,at-90),()=>slash(frame.before,'player',id,false,style,index));
      event(list,at,()=>{
        setView(after);
        if(frames.length>1) sequence.beat.label=card.name+' · 第 '+(index+1)+' / '+frames.length+' 击';
        impact(frame.before,after,hasTarget?id:'player','player',false,true,style,index);
        if(hasTarget && after.player.block>previous.player.block && index===0) impact(previous,after,'player','player');
        audio('player_hit',frame.before,after,{cardTemplate:template,contactIndex:index,contactCount:frames.length,deferOutcome:true});defeat(frame.before,after);
        if(index===frames.length-1){
          next.combat.hand.forEach(c=>{if(!sequence.spentHand.has(c.id))sequence.revealedHand.add(c.id);});
          S.feedbackEffects.hand(paid,next,{drawDelayMs:0});
        }
      });
    });
    if(previous.combat.result!==next.combat.result)event(list,lastContact+260,()=>audio('outcome',previous,next));
    if(queued){
      const at=Math.max(sequence.age,sequence.lastContact+(sequence.lastKilled?440:90));
      next.combat.feedbackToken=sequence.token;
      // A queued card leaves the hand on release, without resetting earlier hits.
      S.feedbackEffects.hand(previous,paid,{discardDelayMs:0,drawDelayMs:0});
      sequence.spentHand.add(card.id);sequence.revealedHand.delete(card.id);
      sequence.events.push(...list.map(e=>({...e,at:e.at+at})));sequence.events.sort((a,b)=>a.at-b.at);
      sequence.duration=at+lastContact+(killed?440:300);sequence.lastContact=at+lastContact;sequence.lastKilled=killed;
      sequence.cardCount++;update(0,next);
    }else{
      start(initial,next,list,lastContact+(killed?440:300),'card');
      sequence.revealedHand=new Set(initial.combat.hand.map(c=>c.id));
      sequence.spentHand=new Set([card.id]);
      sequence.lastContact=lastContact;sequence.lastKilled=killed;sequence.cardCount=1;
    }
  }
  function presentTurn(previous,next,trace) {
    const list=[];let time=0;
    G.audio?.playUiCue('turn');
    trace.forEach(step=>{
      const at=time;
      if(step.type==='discard') {
        event(list,at,()=>{setView(step.after);sequence.beat=null;cue('敌方行动');audio('discard',step.before,step.after);S.feedbackEffects.hand(step.before,step.after,{});});
        time+=260;return;
      }
      if(step.type==='enemy_status') {
        event(list,at,()=>{
          setView(step.after);audio('enemy_status',step.before,step.after,{deferOutcome:true});
          if(step.after.combat.enemies.some(e=>e.hp!==enemy(step.before,e.id)?.hp)) cue('溃烂发作');
          step.after.combat.enemies.forEach(e=>impact(step.before,step.after,e.id,e.id,false,false));
          defeat(step.before,step.after);
        });
        if(step.after.combat.enemies.some(e=>e.hp!==enemy(step.before,e.id)?.hp)) time+=440;
        return;
      }
      if(step.type==='enemy') {
        const actor=step.enemy,data=actor.intentData||{},contact=data.firearm&&data.damage?255:180;
        const duration=data.damage?(data.firearm?660:570):410;
        event(list,at,()=>{
          setView(step.before);beat(actor.id,data.damage?'player':actor.id,actor.intentLabel,contact,duration,!!data.firearm,G.render.combatVfx?.profile(step.before,actor.id)||'');
          audio('enemy_windup',step.before,step.after,actor);
        });
        if(data.damage&&!data.firearm)event(list,at+contact-95,()=>slash(step.before,actor.id,'player'));
        event(list,at+contact,()=>{
          setView(step.after);audio('enemy_hit',step.before,step.after,{...actor,deferOutcome:true});
          sequence.completed.push(actor.id);
          impact(step.before,step.after,'player',actor.id,!!data.firearm);
          impact(step.before,step.after,actor.id,actor.id);
          if(data.firearm&&data.damage) {
            const box=S.getEnemyLayoutBoxes(step.before).find(b=>b.enemy.id===actor.id),muzzle=P.gunMuzzle(actor,box);
            A.spawnMuzzleFlash({scene:'combat',tag:'gunshot_muzzle_flash',sourceKey:actor.id,x:muzzle.x,y:muzzle.y,
              targetX:351,targetY:335,radius:20,durationMs:240});
            if(!reduced) A.spawnShake({scene:'combat',amplitudeX:3,amplitudeY:2,durationMs:130,frequency:22});
            slash(step.before,actor.id,'player',true);
          }
          defeat(step.before,step.after);
        });
        time+=duration;return;
      }
      if(step.type==='turn_start') {
        event(list,at,()=>{
          setView(step.after);sequence.beat=null;cue(step.after.combat.result==='active'?'轮到你出手':'气血耗尽');
          sequence.order=null;
          audio('turn_start',step.before,step.after,{deferOutcome:true});
          // Turn-start poison and relics can change HP; block reset is not a parry.
          if(step.before.player.hp>step.after.player.hp) notice('毒伤 −'+(step.before.player.hp-step.after.player.hp),'player',step.after);
          S.feedbackEffects.hand(step.before,step.after,{drawDelayMs:0});
        });
        time+=520;
      }
    });
    event(list,time,()=>{
      // Outcome bookkeeping may happen after the last actor (e.g. lethal attack).
      setView(next);audio('outcome',previous,next);
    });
    start(previous,next,list,time+40);
    sequence.order=trace.filter(step=>step.type==='enemy').map(step=>step.enemy.id);
    sequence.completed=[];
  }
  function turnStatus(id) {
    if(!sequence?.order?.includes(id))return null;
    if(sequence.beat?.actor===id)return 'active';
    if(sequence.completed.includes(id))return 'done';
    const waiting=sequence.order.filter(key=>!sequence.completed.includes(key)&&key!==sequence.beat?.actor);
    return waiting[0]===id?'next':'waiting';
  }
  function update(delta,state) {
    const dt=Math.max(0,Number(delta)||0)*speed;
    if(reflow){
      reflow.age+=dt;
      if(state.combat.presentation){state.combat.presentation.enemyLayoutHoldMs=0;state.combat.presentation.enemyLayoutEnemyIds=null;}
      if(reflow.age>=reflow.duration)reflow=null;
    }
    notices.forEach(n=>n.age+=dt);notices=notices.filter(n=>n.age<n.duration);
    if(banner){banner.age+=dt;if(banner.age>=banner.duration)banner=null;}
    if(!sequence)return;
    if(!ownsAudio(state)){clear();return;}
    sequence.age+=dt;
    while(sequence && sequence.cursor<sequence.events.length && sequence.events[sequence.cursor].at<=sequence.age) {
      const item=sequence.events[sequence.cursor++];item.run();
    }
    if(sequence.age>=sequence.duration) sequence=null;
  }
  function getMotion(id) {
    const b=sequence?.beat;if(!b||b.actor!==id||reduced)return {x:0,y:0};
    const elapsed=sequence.age-b.start,progress=clamp(elapsed/b.contact);
    const smooth=motion=>{if(!b.fromMotion||elapsed>=60)return motion;const t=1-Math.pow(1-clamp(elapsed/60),3);return {x:b.fromMotion.x+(motion.x-b.fromMotion.x)*t,y:b.fromMotion.y+(motion.y-b.fromMotion.y)*t};};
    if(b.firearm) return smooth({x:elapsed>b.contact?Math.sin(clamp((elapsed-b.contact)/180)*Math.PI)*6:0,y:0});
    if(b.target===id)return smooth({x:0,y:-Math.sin(clamp(elapsed/b.duration)*Math.PI)*3});
    const direction=id==='player'?1:-1,windup=clamp(progress/.38),strike=clamp((progress-.38)/.62),heavy=b.attackStyle==='heavy',pull=heavy?8:5,reach=heavy?26:18;
    const forward=elapsed<=b.contact?progress<.38?-pull*Math.sin(windup*Math.PI/2):(-pull+(reach+pull)*(1-Math.pow(1-strike,3))):reach*Math.exp(-clamp((elapsed-b.contact-28)/240)*5);
    return smooth({x:forward*direction,y:elapsed<=b.contact?Math.sin(progress*Math.PI)*2:-Math.exp(-clamp((elapsed-b.contact)/210)*4)*2});
  }
  function paintActor(ctx,id,frame,paint){
    const b=sequence?.beat;if(!b||b.actor!==id||reduced||b.firearm){paint();return;}
    const elapsed=sequence.age-b.start,t=clamp(elapsed/b.duration),direction=id==='player'?1:-1,angle=Math.sin(t*Math.PI*1.2)*direction*.018;
    ctx.save();const x=frame.x+frame.width*.5,y=frame.y+frame.height*.95;ctx.translate(x,y);ctx.rotate(angle);ctx.scale(1,1-Math.sin(t*Math.PI)*.008);ctx.translate(-x,-y);paint();ctx.restore();
  }
  function actorAlpha(id) {
    const b=sequence?.beat;return !b||b.actor===id||b.target===id?1:.88;
  }
  function text(ctx,value,x,y,size,color) {
    ctx.font='600 '+size+'px "KGame Sans", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=color;ctx.shadowColor='#080908';ctx.shadowBlur=5;ctx.fillText(value,x,y);
  }
  function render(ctx,state) {
    ctx.save();
    const b=sequence?.beat;
    if(b) {
      const actor=b.actor==='player'?null:enemy(state,b.actor);
      if(actor) {
        const box=S.getEnemyLayoutBoxes(state).find(box=>box.enemy.id===b.actor);
        if(box) {
          ctx.strokeStyle='#cfb489';ctx.lineWidth=1.7;ctx.shadowBlur=0;
          ctx.beginPath();ctx.arc(box.x+box.width/2,box.y+10,28,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp((sequence.age-b.start)/b.duration));ctx.stroke();
        }
      }
    }
    notices.forEach(n=>{
      const progress=clamp(n.age/n.duration);
      ctx.globalAlpha=Math.min(1,(1-progress)*3);
      text(ctx,n.text,n.x,n.y-(reduced?0:Math.sin(progress*Math.PI/2)*22),n.tone==='hurt'?23:14,
        {hurt:'#e1ad98',block:'#ced3be',quiet:'#aaa795',status:'#d6c398'}[n.tone]);
    });ctx.restore();
  }
  S.feedback={presentCard,presentTurn,update,getView,getMotion,paintActor,actorAlpha,render,clear,ownsAudio,turnStatus,layoutBox,acceptsCards,inputHand,
    reflowOwns:enemies=>!!reflow&&liveKey(enemies)===reflow.key,
    attentionBeat:()=>sequence?.beat?{...sequence.beat,age:sequence.age-sequence.beat.start}:null,
    hasVisuals:()=>!!sequence||!!reflow||!!banner||notices.length>0,
    isBusy:()=>!!sequence||!!reflow,
    setOptions:options=>{speed=options.speed===2?2:1;reduced=!!options.reduced;},
    isReducedMotion:()=>reduced,
    debug:()=>({busy:!!sequence,kind:sequence?.kind||null,cardCount:sequence?.cardCount||0,age:sequence?.age||0,duration:sequence?.duration||0,
      actor:sequence?.beat?.actor||null,label:sequence?.beat?.label||null,
      view:sequence?{hp:sequence.view.player.hp,block:sequence.view.player.block,turn:sequence.view.combat.turn,
        hand:sequence.view.combat.hand.map(c=>c.id),enemies:sequence.view.combat.enemies.map(e=>({id:e.id,hp:e.hp,block:e.block,intent:e.intentLabel}))}:null,
      reflow:reflow?{age:reflow.age,duration:reflow.duration,ids:[...reflow.from.keys()]}:null,
      notices:notices.map(n=>n.text),speed,reduced})};
})();
