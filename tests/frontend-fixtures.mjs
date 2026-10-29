// Explicit deterministic setup for frontend captures, never a natural campaign.
export const installFrontendFixture = ({scene,o})=>{
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());G.main.setPaused(false);G.main.resetState();
  let seed=381011;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  let s=G.main.getState();s.settings.reducedMotion=!!o.reduced;s.player.chosenStyle=o.style||'blade';s.player.masterDeckNames=G.cards.getStarterDeck(s.player.chosenStyle);s.player.gold=o.gold??180;s.player.hp=o.hp??53;s.player.maxHp=80;s.player.relics=[];
  if(o.fullDeck)s.player.masterDeckNames=Object.values(G.cards.definitions).filter(c=>c.style===s.player.chosenStyle||c.style==='basic').map(c=>c.name);
  if(o.upgraded)s.player.masterDeckNames=s.player.masterDeckNames.map(n=>G.cards.upgradeDeckCardAt([n],0).upgradedName||n);
  s.player.deckSize=s.player.masterDeckNames.length;s.map={actNumber:o.act||2,routeSeed:381011,currentNodeId:'review-'+scene};s.reviewPanel=null;s.reviewReceipt=null;s.nemesis={pool:[],nextId:1,currentRunEntryIds:[]};
  s.scene='combat';s.combat={seeded:false};const old=G.enemies.buildEncounterForNode;G.enemies.buildEncounterForNode=()=>G.enemies.buildEncounter(o.encounter||'street_intro');try{s=G.scenes.combat.prepareState(s);}finally{G.enemies.buildEncounterForNode=old;}
  if(scene==='title'){s.scene='title';s.title.mode='menu';}
  else if(scene==='arrival'){s.scene='arrival';s.arrival={stage:o.stage||'gate'};}
  else if(scene==='report'){s=G.runReport.enter(s,o.outcome||'defeat');}
  else if(scene==='nemesis'){
   s.combat.nodeType='gate';s.combat.encounterId='gate_guard_chief';s.combat.enemies=G.enemies.buildEncounter('gate_guard_chief').enemies;s.combat.result='victory';s.combat.nemesisRecorded=false;s=G.nemesis.recordBattleOutcome(s);let id=s.nemesis.pool[0].id;
   const profile=G.nemesis.getLevelProfile(o.level||1);Object.assign(s.nemesis.pool[0],{level:o.level||1,title:profile.title,firearmStage:profile.firearmStage});
   s.map.nemesisEntryId=id;s.nemesisIntro={entryId:id};s.scene='nemesis';s=G.scenes.nemesis.prepareState(s);
  }else if(scene!=='combat'){
   s.scene=scene;if(scene==='map')s.map=G.scenes.map.buildStateForAct(o.act||2,{routeSeed:381011,actNumber:o.act||2});else s[scene]=null;
   if(scene==='reward'){s.combat.result='victory';s.combat.nodeType=o.relic?'elite':'battle';s.combat.rewardState=null;s.combat.enemies.forEach(e=>e.hp=0);}
   s=G.scenes[scene].prepareState(s);
   if(scene==='event'&&o.event){const d=G.events.definitions.find(d=>d.id===o.event)||G.journeyEvents?.definitions.find(d=>d.id===o.event);Object.assign(s.event,{eventId:d.id,title:d.title,body:d.body,choices:structuredClone(d.choices),copyRevision:G.journeyEvents?.art[d.id]?4:3,mode:'choice'});}
  }
  G.main.replaceState(s);G.main.setSettings({reducedMotion:!!o.reduced});G.main.setPaused(false);

};

