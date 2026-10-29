window.G = window.G || {};
G.render = G.render || {};

(function () {
  var selfBox = { x: 132, y: 174, width: 404, height: 344 };
  var enemyEffects = ["damage", "damageFromCurrentBlock", "ironBoneDamage", "flaw", "fester", "blind", "crippleTurns", "consumeFlaw", "consumeFester", "bonusDamageIfTargetHasFester"];

  function needsEnemy(template) {
    return enemyEffects.some(function (key) { return !!template[key]; });
  }

  function contains(box, point) {
    var x=box.hitX??box.x,y=box.hitY??box.y,width=box.hitWidth??box.width,height=box.hitHeight??box.height;
    return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
  }

  let rejection=null,focusKey='',dragCueId='';
  function clear(){rejection=null;focusKey=dragCueId='';}
  function reject(state,card,reason){
    rejection={id:card.id,reason,age:0,encounter:state.combat.encounterId};
    G.audio?.playUiCue('reject');
  }
  function update(delta,state){
    const t=targetState(state,G.scenes.combat.getEnemyLayoutBoxes(state));
    const focus=t?.legal&&t.target?(t.enemy?t.target.enemy.id:'player'):'';
    if(focus&&focus!==focusKey)G.audio?.playUiCue('target');
    focusKey=focus;
    const dragged=t?.drag?.dragging?t.card.id:'';
    // Lifting a hand card is not acquiring/drawing a new batch. Reserve the
    // complete accepted deal for real draws, including 闪身刺's draw effect.
    if(dragged&&dragged!==dragCueId)G.audio?.playUiCue('lift');
    dragCueId=dragged;
    if(!rejection)return;
    rejection.age+=Math.max(0,Number(delta)||0);
    if(state.scene!=='combat'||state.combat.encounterId!==rejection.encounter||rejection.age>=430)clear();
  }
  function rejectionFor(id,state){
    if(!rejection||rejection.id!==id)return null;
    const reduced=state.settings?.reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {...rejection,offsetX:reduced?0:Math.sin(rejection.age/430*Math.PI*6)*7*(1-rejection.age/430)};
  }
  function targetState(state,enemyBoxes){
    if(state.combat.result!=='active'||state.combat.ui?.overlay||G.main.isPaused()||(G.scenes.combat.feedback&&!G.scenes.combat.feedback.acceptsCards()))return null;
    const drag=G.render.animations.getCardDrag('combat'),id=drag?.dragging?drag.cardId:state.combat.selectedCardId;
    const card=state.combat.hand.find(c=>c.id===id);if(!card)return null;
    const enemy=needsEnemy(state.combat.cardLibrary[card.name]||card),legal=card.playable&&state.player.energy>=(Number(card.cost)||0);
    const targets=legal?(enemy?enemyBoxes.filter(b=>b.enemy.hp>0&&(!state.combat.interactiveEnemyIds||state.combat.interactiveEnemyIds.includes(b.enemy.id))):[selfBox]):[];
    const pointer=G.main.getPointer();
    return {card,enemy,legal,targets,target:targets.find(b=>contains(b,pointer)),drag,pointer};
  }

  // The alpha of the actual, cropped portrait owns the target rim. It cannot
  // drift into the intent seal, captions or a neighbouring opponent's slot.
  function renderFigureTarget(ctx, state, id, art, frame, flip) {
    const t = targetState(state, G.scenes.combat.getEnemyLayoutBoxes(state));
    if (!t?.legal || !(id === 'player' ? !t.enemy : t.enemy && t.targets.some(b => b.enemy.id === id))) return;
    const focused = !!t.target && (id === 'player' ? !t.enemy : t.target.enemy?.id === id);
    const W=G.render.woodcut,U=G.render.canvasUtils; const geometry = W.figureGeometry(art, frame, flip);
    if (!geometry) return;
    const pad = 18, width = frame.width + pad * 2, height = frame.height + pad * 2;
    const color = id === 'player' ? '#bac4aa' : '#c7b797';
    const key = JSON.stringify(['target-soft-v2', G.render.assets.getRevision(), geometry.path, geometry.top, geometry.bottom, frame.slotRole, flip, color]);
    const layer = U.cachedLayer(key, width, height, U.density(ctx), brush => {
      const mask = U.createLayer(width, height, U.density(ctx)), m = mask.getContext('2d');
      W.figure(m, art, {...frame, x:pad, y:pad}, flip);
      m.globalCompositeOperation = 'source-in'; m.fillStyle = color; m.fillRect(0,0,width,height);
      // One soft light pass. No eight-way dilation, closed hard rim or bright skirt.
      brush.shadowColor = color; brush.shadowBlur = 8;
      brush.drawImage(mask, -.5, -.5, width, height); brush.shadowBlur = 0;
      brush.globalCompositeOperation = 'destination-out';
      for (let i=0; i<12; i++) brush.drawImage(mask,0,0,width,height);
      const fade = brush.createLinearGradient(0,pad+frame.height*.48,0,pad+frame.height*.80);
      fade.addColorStop(0,'#000'); fade.addColorStop(1,'#0000');
      brush.globalCompositeOperation = 'destination-in'; brush.fillStyle=fade; brush.fillRect(0,0,width,height);
      brush.globalCompositeOperation = 'source-over';
    });
    ctx.save(); ctx.globalAlpha *= focused ? .88 : .40;
    ctx.drawImage(layer,frame.x-pad,frame.y-pad,width,height); ctx.restore();
  };
  function render(ctx,state,handBoxes,enemyBoxes) {
    const t = targetState(state,enemyBoxes);
    if (!t?.legal) return;
    ctx.save();
    // Eligibility is on the figure; focus is a short underline tied to its ledger.
    if(t.target){
      const b=t.target, x=b.x+b.width/2;
      const y=t.enemy?b.y+b.height-18:b.y+b.height-20;
      ctx.strokeStyle=t.enemy?'#ccbaa0':'#bac4aa';ctx.globalAlpha=.75;ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(x-23,y);ctx.quadraticCurveTo(x,y+2,x+23,y);ctx.stroke();
    }
    ctx.restore();
  };

  function renderRejection(ctx,state,layout){
    if(!rejection)return;
    const progress=rejection.age/430,alpha=Math.min(1,(1-progress)*3),mobile=!!window.KGAME_MOBILE;
    if(rejection.reason==='energy'){
      const x=mobile?layout.playerPanel.x+8:48,y=mobile?layout.playerPanel.y+66:518;
      ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#c744363d';ctx.fillRect(x-7,y-18,mobile?132:100,mobile?37:28);
      G.render.woodcut.text(ctx,'体力 '+state.player.energy+'/'+state.player.maxEnergy,x,y,mobile?24:15,'#ff7260','left',700,true);ctx.restore();
    }
    const b=G.scenes.combat.getHandLayoutBoxes(state).find(b=>b.cardId===rejection.id);
    if(b){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#db6250';ctx.lineWidth=3;ctx.strokeRect(b.x-3,b.y-3,b.width+6,b.height+6);ctx.restore();}
  }
  G.render.combatInteraction = { needsEnemy, selfBox, contains, render, renderFigureTarget, targetState, reject, rejectionFor, update, clear, renderRejection, hasVisuals:()=>!!rejection };
})();


