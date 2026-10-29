/* License-checked audition palette. Opt-in in the review; no final listening claim. */
(function () {
  'use strict';
  const base='assets/audio/candidates/combat-v1/';
  const assets={},group=(name,count,volume)=>Array.from({length:count},(_,i)=>{
    const key='candidate_'+name+'_'+(i+1);
    assets[key]={src:base+name+'-'+(i+1)+'.wav',volume:volume,playbackRate:1};return key;
  });
  const swing=group('swing',3,.52),parry=group('parry',3,.55),contact=group('contact',3,.48);
  const rifle=group('rifle',3,.48),mechanism=group('mechanism',2,.43);
  G.combatAudioCandidate={id:'recorded-candidate-v1',assets,groups:{
    player_blade:swing,player_combo:swing,player_basic:swing,enemy_melee:swing,
    block:parry,player_contact:contact,wound:contact,
    gunshot_rifle:rifle,gun_prep_rifle:mechanism
  }};
})();
