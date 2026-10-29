/* Location and identity are presentation data, independent of encounter behavior. */
(function(){
  'use strict';
  const root='assets/journey/expansion-20261007/',portraits='assets/portraits/expansion-20261007/';
  const revision=window.KGAME_ART_REVISION;
  const names=['沦陷九城','焦土驿道','津门租界','北洋铁路营','南下渡口'];
  const places=Object.fromEntries(names.flatMap((name,i)=>['street','gate'].map(kind=>{
    const act=i+1,id='act'+act+'-'+kind;
    return [id,{id,act,kind,name:name+(kind==='gate'?' · 关口':' · 途中'),path:act===1&&kind==='street'?'assets/ui/combat_background_checkpoint_gpt15_01.png':root+'battle-'+id+'.png',rewardPath:revision?.rewardPlaces[id]}];
  })));
  const identities=Object.fromEntries(['act2_elite_zhuo_san','act2_elite_han_bao','act2_boss_reaper','act3_elite_barlow','act3_elite_shen_lie','act3_boss_chief_inspector','act4_elite_luo_wu','act4_elite_qin_biao','act4_boss_warlord','act5_elite_meng_kui','act5_elite_xie_qi','act5_boss_final'].map(id=>[id,Object.fromEntries(['blade','revolver','carbine','rifle'].map(stage=>[stage,portraits+id+'-'+stage+'.png']))]));
  function place(state){
    // A defeated gate keeps its own act even if the route has already advanced.
    const inBattle=['combat','reward'].includes(state?.scene);
    const act=['title','arrival'].includes(state?.scene)?1:Math.max(1,Math.min(5,Number(inBattle?state.combat?.actNumber:state?.map?.actNumber)||1));
    const kind=inBattle&&state.combat?.nodeType==='gate'?'gate':'street';
    return places['act'+act+'-'+kind];
  }
  function enemyArt(enemy){
    const selected=enemyPortrait(enemy);if(selected)return selected.path;
    const id=enemy.templateId||enemy.sourceTemplateId,family=identities[id];if(!family)return null;
    const raw=enemy.firearmStage||enemy.intentData?.firearmStage;
    const stage=enemy.kind==='nemesis'?({none:'blade',mauser:'carbine',gatling:'rifle'})[raw]||raw||'blade':id==='act4_elite_qin_biao'?'rifle':G.enemies.definitions[id]?.behavior==='mack'?'revolver':'blade';
    return family[stage]||family.blade;
  }
  function enemyPortrait(enemy){
    // The integrated opening retains its fixed approved soldier portrait.
    if(enemy.openingPortrait)return null;
    const id=enemy.templateId||enemy.sourceTemplateId,row=revision?.enemies[id];if(!row)return null;
    const d=enemy.intentData||{},raw=enemy.firearmStage||d.firearmStage;
    const weapon=enemy.kind==='nemesis'?({none:'blade',mauser:'carbine',gatling:'rifle'})[raw]||raw||'blade':row.kind==='normal'?'normal':id==='act4_elite_qin_biao'?'rifle':row.behavior==='mack'?'revolver':'blade';
    const stages=row.stages[weapon]||row.stages.normal;if(!stages)return null;
    const aim=weapon!=='blade'&&(d.gunPose==='aim'||d.firearm&&(d.damage>0||(d.firearmStep||0)>=(enemy.kind==='nemesis'&&weapon==='revolver'?2:1)));
    return stages[weapon==='blade'?'blade':aim?'aim':'ready']||stages.ready||stages.blade||stages.aim;
  }
  // Normalized barrel tips in the original RGBA sprite, before portrait cropping.
  // Reviewed against the four-weapon identity galleries; never reuse a body's centre.
  const tips={
    act2_elite_zhuo_san:[[.043,.157],[.043,.136],[.036,.150]],
    act2_elite_han_bao:[[.036,.157],[.061,.176],[.036,.150]],
    act2_boss_reaper:[[.043,.140],[.039,.169],[.036,.145]],
    act3_elite_barlow:[[.036,.162],[.057,.179],[.021,.150]],
    act3_elite_shen_lie:[[.032,.162],[.043,.160],[.032,.155]],
    act3_boss_chief_inspector:[[.025,.124],[.061,.160],[.039,.162]],
    act4_elite_luo_wu:[[.039,.126],[.043,.181],[.039,.155]],
    act4_elite_qin_biao:[[.029,.136],[.043,.145],[.043,.190]],
    act4_boss_warlord:[[.036,.200],[.043,.179],[.039,.202]],
    act5_elite_meng_kui:[[.029,.136],[.043,.160],[.039,.188]],
    act5_elite_xie_qi:[[.043,.145],[.043,.164],[.057,.188]],
    act5_boss_final:[[.036,.181],[.057,.179],[.029,.157]]
  };
  const gunAnchors=Object.fromEntries(Object.entries(tips).flatMap(([id,points])=>points.map(([x,y],i)=>[id+'-'+['revolver','carbine','rifle'][i],{x,y}])));
  Object.assign(gunAnchors,revision?.gunAnchors||{});
  if(revision)Object.entries(revision.cards).forEach(([id,entry])=>Object.assign(KGAME_CARD_ART_MANIFEST.cards[id],entry,{label:G.cards.definitions[id].name}));
  G.render.journeyArt={places,identities,place,enemyArt,enemyPortrait,gunAnchors,revision};
})();
