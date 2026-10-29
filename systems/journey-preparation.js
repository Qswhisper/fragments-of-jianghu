/* Voluntary, bounded preparation. Neither deck membership nor card values change. */
(function () {
  'use strict';
  const copy=s=>JSON.parse(JSON.stringify(s));
  const foundations={
    blade:['踩肩越刀','回身藏锋','抹脖子'],
    iron:['沉马硬架','铁牛耕地','连皮带骨'],
    dirty:['撒石灰','贴地扬灰','阴手捅刀'],
    combo:['卸骨手','闪身刺','寸拳连珠']
  };
  const act=s=>Math.max(1,Math.min(5,s.map?.actNumber||s.combat?.actNumber||1));
  const changeCost=20;
  const baseName=name=>G.cards.getCardByName(name)?.baseName||name;
  const outside=s=>['map','rest','shop','event','reward'].includes(s.scene)&&!s.map?.completed&&!s.runReport?.active;
  function reset(s){s.player.openingPreparation=null;s.player.basicDraftActs=[];return s;}
  function preparedName(s){
    const p=s.player.openingPreparation,names=s.player.masterDeckNames||[];
    if(!p||p.act!==act(s))return null;
    if(names.includes(p.name))return p.name;
    // An upgrade of the only copy remains the same prepared technique.
    const base=G.cards.getCardByName(p.name)?.baseName||p.name;
    return names.find(n=>(G.cards.getCardByName(n)?.baseName||n)===base)||null;
  }
  function canPrepare(s){return outside(s)&&s.player.openingPreparation?.act!==act(s);}
  function prepare(s,name){
    if(!canPrepare(s)||!s.player.masterDeckNames?.includes(name))return s;
    const next=copy(s);next.player.openingPreparation={act:act(s),name,newNames:[],changed:false};return next;
  }
  // Called only when a production reward, purchase or event adds a card.
  // Track techniques rather than copy indices so upgrades/removals cannot shift identity.
  function recordGain(s,name){
    const p=s.player.openingPreparation;
    if(p?.act===act(s)&&!p.changed)p.newNames=[...new Set([...(p.newNames||[]),baseName(name)])];
    return s;
  }
  function changeStatus(s,name){
    const p=s.player.openingPreparation,names=s.player.masterDeckNames||[];
    if(!outside(s)||p?.act!==act(s)||p.changed)return null;
    if(!names.includes(name)||!(p.newNames||[]).includes(baseName(name))||baseName(name)===baseName(p.name))return null;
    const candidate=copy(s);candidate.player.openingPreparation.name=name;
    const before=openingOrder(s,names).slice(0,5),after=openingOrder(candidate,names).slice(0,5);
    if(JSON.stringify(before.slice().sort())===JSON.stringify(after.slice().sort()))return null;
    return {cost:changeCost,affordable:G.player.canSpendGold(s,changeCost),before,after,previous:preparedName(s)};
  }
  function change(s,name){
    const status=changeStatus(s,name);if(!status?.affordable)return s;
    const next=G.player.spendGold(s,changeCost);
    next.player.openingPreparation={...next.player.openingPreparation,name,changed:true,newNames:[],previousName:s.player.openingPreparation.name};return next;
  }
  function openingOrder(s,names){
    const order=names.slice(),name=preparedName(s),index=name?order.indexOf(name):-1;
    if(index>0)order.unshift(order.splice(index,1)[0]);
    return order;
  }
  function basics(s){return (foundations[s.player.chosenStyle]||[]).map(name=>G.cards.getCardByName(name));}
  function canDraft(s){return s.scene==='reward'&&!s.reviewReceipt&&s.reward?.mode==='card'&&!s.combat?.rewardState?.cardResolved&&!(s.player.basicDraftActs||[]).includes(act(s))&&basics(s).length===3;}
  function useBasics(s,enabled=true){
    if(!canDraft(s))return s;
    const next=copy(s),r=next.reward;
    if(enabled){
      if(r.basicDraftAct===act(s))return s;
      r.randomCardOptions=copy(r.options);r.basicDraftAct=act(s);
      r.options=basics(s);r.cardOptions=copy(r.options);
    }else{
      if(!r.randomCardOptions)return s;
      r.options=r.randomCardOptions;r.cardOptions=copy(r.options);
      delete r.basicDraftAct;delete r.randomCardOptions;
    }
    r.reviewSelectedIndex=null;r.hoveredOptionIndex=null;r.reviewHoverIndex=null;r.reviewHoverMs=0;
    return next;
  }
  function resolveDraft(s,card){
    if(s.reward?.basicDraftAct===act(s)&&basics(s).some(c=>c.name===card.name))s.player.basicDraftActs=[...new Set([...(s.player.basicDraftActs||[]),act(s)])];
    return s;
  }
  G.journeyPreparation={act,reset,preparedName,canPrepare,prepare,openingOrder,recordGain,changeStatus,change,changeCost,basics,canDraft,useBasics,resolveDraft};
})();
