/* User-selected audition result, 2026-10-06: D blade + C parry/fist/finisher. */
window.G = window.G || {};
(function () {
  'use strict';
  var assets = {}, base = 'assets/audio/sfx/selected-v1/';
  function group(name, count, volume) {
    var keys = [];
    for (var i = 1; i <= count; i++) {
      var key = 'selected_' + name + '_' + i;
      assets[key] = {src:base + name + '-' + i + '.wav', volume:volume, playbackRate:1};
      keys.push(key);
    }
    return keys;
  }
  var swing = group('swing',3,.52), blade = group('blade',2,.48);
  var parry = group('parry',3,.55), fist = group('contact',3,.48), heavy = group('heavy',3,.48);
  // Preserve accepted swings/blade identity; the new material palette adds
  // dry steel parries and compact body contacts, with three authored variants.
  Object.keys(assets).forEach(function(key){
    if(/^selected_(parry|contact|heavy)_/.test(key))assets[key].src='assets/audio/sfx/material-metal-v1/'+key.replace('selected_','').replace(/_(\d+)$/, '-$1')+'.wav';
    if(/^selected_(contact|heavy)_/.test(key)){
      // Restore the actual C body-hit recordings the user previously chose.
      // Keep their authored attacks/decays; do not soften them into bass thuds.
      assets[key].src=base+key.replace('selected_','').replace(/_(\d+)$/, '-$1')+'.wav';
      assets[key].volume=.48;
    }
  });
  var powder=group('powder',3,.5),needle=group('needle',3,.5);
  powder.concat(needle).forEach(function(key){assets[key].src='assets/audio/sfx/dirty-actions-v1/'+key.replace('selected_','').replace(/_(\d+)$/, '-$1')+'.wav';});
  // Existing CC0 recorded firearm excerpts, with three real source variations.
  // A shared generic shot bank, not a claim of model-specific revolver sounds.
  var shots=[];
  for(var n=1;n<=3;n++){
    var key='recorded_rifle_'+n;
    assets[key]={src:'assets/audio/candidates/combat-v1/rifle-'+n+'.wav',volume:.32,playbackRate:1};
    shots.push(key);
  }
  G.adoptedCombatSounds = {id:'material-metal-v1',assets:assets,groups:{
    style_blade:blade,style_iron:parry,style_dirty:fist,style_combo:heavy,
    player_blade:swing,player_combo:swing,player_iron:swing,player_dirty:swing,player_basic:swing,
    enemy_melee:swing,block:parry,wound:fist,player_contact:fist,
    player_contact_blade:blade,player_contact_fist:fist,player_contact_heavy:heavy,
    player_contact_powder:powder,player_contact_needle:needle,status_fester:powder,
    enemy_contact_blade:blade,enemy_contact_fist:fist,enemy_contact_heavy:heavy,
    gunshot_revolver:shots,gunshot_carbine:shots,gunshot_rifle:shots,
    gunshot_mauser:shots,gunshot_heavy:shots,gunshot_gatling:shots
  }};
})();
