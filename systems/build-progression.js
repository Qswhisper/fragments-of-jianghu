/* New journeys: acquired techniques enter the real deck, not its permanent tail. */
(function () {
  'use strict';
  const revision=4;
  const active=s=>[1,2,3,4].includes(s?.player?.buildProgressionRevision);
  const developing=s=>[2,3,4].includes(s?.player?.buildProgressionRevision);
  const challenging=s=>[3,4].includes(s?.player?.buildProgressionRevision);
  const hash=text=>{let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
  function shuffled(items,seed){
    const result=items.slice();let n=seed>>>0;
    for(let i=result.length-1;i>0;i--){
      n=(Math.imul(n,1664525)+1013904223)>>>0;
      // Mix the word before indexing; low LCG bits otherwise bias even-sized swaps.
      let word=n;word^=word>>>16;word=Math.imul(word,0x85ebca6b);word^=word>>>13;word=Math.imul(word,0xc2b2ae35);word^=word>>>16;
      const j=Math.floor((word>>>0)/4294967296*(i+1));[result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }
  function openingOrder(s,names,encounter){
    // Keep the integrated opening's established hand and every legacy journey.
    if(!active(s)||!s.map?.currentNodeId)return G.journeyPreparation.openingOrder(s,names);
    const seed=hash([s.map.routeSeed,s.map.currentNodeId,encounter?.id||'',s.map.actNumber||1].join(':'));
    return G.journeyPreparation.openingOrder(s,shuffled(names,seed));
  }
  const roles={
    blade:[['低头让锋','贴步割喉','追命赶刀','抹脖子'],['翻刃开血','封喉绝手','开膛','勾心挑肠','舍身一刀'],['连环抹线','逼门断腕','疾雨连刀','回身藏锋','踩肩越刀','换命扑斩']],
    iron:[['重脚踏桩','铜皮震步','反震臂','铁牛耕地','沉马硬架'],['开碑重捶','合身压顶','闯阵顶心','连皮带骨','贴山靠'],['金钟硬门','硬桥开门','盘桥护身','铁门闩','抱架反砸']],
    dirty:[['淬毒袖针','溃口封喉','毒钉暗甩','阴手捅刀'],['翻伤撒盐','污巷抹喉','破靴踹心','烂口追打'],['脏手夺势','下盘撩踢','贴地扬灰','撒石灰','断筋','阴沟翻身','绊脚阴腿']],
    combo:[['缠臂拿腕','追膝快打','贴地寸崩','闪身刺','卸骨手','贴身递步'],['连身靠打','卸肩拆骨','迎门顶撞','寸拳连珠'],['横身夺路','短桥护心','寸桥崩手','滚肘抢门','黏衣拿手']]
  };
  // Only genuine new starts use these substitutions. Saved deck membership and
  // every card definition stay intact; the integrated first five are unchanged.
  function starterDeck(style){
    const names=G.cards.getStarterDeck(style);
    const substitutions={blade:{10:'踩肩越刀'},iron:{8:'铜皮震步'},dirty:{6:'脏手夺势',7:'下盘撩踢'},combo:{5:'滚肘抢门',9:'短桥护心'}}[style]||{};
    for(const [index,name] of Object.entries(substitutions))names[index]=name;
    if(style==='combo')for(const [index,name]of Object.entries({6:'寸桥崩手',7:'寸桥崩手',8:'短桥护心',11:'短桥护心'}))names[index]=name;
    return names;
  }
  function capabilities(c){
    return {guard:!!(c.block||c.blind||c.crippleTurns),cycle:!!c.draw,
      setup:!!(c.flaw||c.fester||c.block),payoff:!!(c.consumeFlaw||c.consumeFester||c.bonusDamageIfTargetHasFester||c.damageFromCurrentBlock||c.executeDamage),
      tempo:c.cost===0};
  }
  function contextualOptions(s,seed,raw){
    const style=s.player.chosenStyle,pool=Object.values(G.cards.definitions).filter(c=>c.style===style).map(c=>G.cards.getCardByName(c.name));
    const owned=new Map(),coverage={guard:0,cycle:0,setup:0,payoff:0,tempo:0};
    for(const name of s.player.masterDeckNames||[]){const c=G.cards.getCardByName(name);if(!c)continue;owned.set(c.baseName,(owned.get(c.baseName)||0)+1);for(const [key,has] of Object.entries(capabilities(c)))if(has)coverage[key]++;}
    const off=raw.options.filter(c=>c.style!==style),count=raw.options.length-off.length,picked=[],used=new Set();
    const groups=roles[style];
    for(let slot=0;slot<count;slot++){
      const candidates=shuffled(pool,hash(seed+':growth2:'+slot));
      const group=groups[slot%groups.length];
      const score=c=>{
        const caps=capabilities(c),copies=owned.get(c.baseName)||0;
        // Novel tools and missing functions receive a bounded preference, not a
        // guaranteed combo recipe. Original off-style chance/cards remain raw.
        let n=(group.includes(c.name)?5:0)+(copies===0?7:-copies*5);
        for(const [key,has] of Object.entries(caps))if(has)n+=coverage[key]===0?4:coverage[key]<2?2:0;
        return n;
      };
      candidates.sort((a,b)=>score(b)-score(a));
      const card=candidates.find(c=>!used.has(c.baseName));if(!card)return raw;
      picked.push(card);used.add(card.baseName);
    }
    // A voluntary dangerous encounter can yield one already-refined technique.
    // It is still a choice, and it costs the same reward slot as the alternatives.
    const act=s.map?.actNumber||s.combat?.actNumber||1;
    if(act>=2&&['elite','nemesis'].includes(s.combat?.nodeType)){
      const candidates=picked.map((c,i)=>({c,i,u:G.cards.getCardByName(c.name+'+')}));
      const functional=candidates.find(({c,u})=>u&&(u.cost<c.cost||(u.draw||0)>(c.draw||0)))||candidates[0];
      if(functional?.u)picked[functional.i]={...functional.u,deckName:functional.u.name};
    }
    return {options:picked.concat(off),nextSeed:raw.nextSeed};
  }
  function rewardOptions(s,seed,count){
    const raw=G.cards.buildRewardOptions(s.player.chosenStyle,seed,count);
    const act=s.map?.actNumber||s.combat?.actNumber||1;
    if(developing(s))return contextualOptions(s,seed,raw);
    if(!active(s)||act>2)return raw;
    const style=s.player.chosenStyle,groups=roles[style];if(!groups)return raw;
    const owned=new Map();for(const name of s.player.masterDeckNames||[]){const base=G.cards.getCardByName(name)?.baseName||name;owned.set(base,(owned.get(base)||0)+1);}
    const offStyle=raw.options.filter(c=>c.style!==style),target=raw.options.length-offStyle.length,used=new Set(),picked=[];
    const pool=Object.values(G.cards.definitions).filter(c=>c.style===style).map(c=>c.name);
    for(let slot=0;slot<target;slot++){
      const candidates=shuffled(groups[slot]||pool,hash(seed+':'+slot+':'+act)).filter(n=>!used.has(n));
      candidates.sort((a,b)=>(owned.get(a)||0)-(owned.get(b)||0));
      const name=candidates[0]||pool.find(n=>!used.has(n));
      if(!name)return raw;used.add(name);picked.push(G.cards.getCardByName(name));
    }
    // The original cross-style draw and next RNG seed remain untouched.
    return {options:picked.concat(offStyle),nextSeed:raw.nextSeed};
  }
  function eventOptions(s,source,seed){
    const raw=G.cards.buildRewardOptions(s.player.chosenStyle,seed,3),style=s.player.chosenStyle;
    if(source==='reward')return contextualOptions({...s,combat:{nodeType:'event'}},seed,raw);
    const pool=Object.values(G.cards.definitions).filter(c=>c.style!=='basic'&&(source==='offstyle'?c.style!==style:c.style===style));
    const ordered=shuffled(pool,hash(seed+':event:'+source)).slice(0,3).map(c=>G.cards.getCardByName(c.name));
    const built={options:ordered,nextSeed:raw.nextSeed};
    return source==='offstyle'?built:contextualOptions({...s,combat:{nodeType:'event'}},seed,built);
  }
  function encounterRules(s,encounter){
    if(!challenging(s)||!encounter)return encounter;
    for(const enemy of encounter.enemies||[]){
      if(enemy.templateId==='act5_boss_final')enemy.ruleValues={lowPhaseAttack:18,lowPhaseBlock:16,lowPhaseFinisherAttack:24};
    }
    return encounter;
  }
  G.buildProgression={revision,active,developing,challenging,starterDeck,openingOrder,rewardOptions,eventOptions,encounterRules,roles,capabilities};
})();
