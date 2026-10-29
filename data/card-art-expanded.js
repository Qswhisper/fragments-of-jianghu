/* Individual action art; original eighteen illustrations keep their approved files and framing. */
(function(){
  const ids=["iron_plow","iron_counter_slam","iron_body_ram","iron_bridge_guard","iron_skin_step","iron_breach_heart","iron_rebound_arm","iron_bell_gate","iron_stomp_pile","iron_crush_drop","iron_open_gate","dirty_low_kick","dirty_poison_nail","dirty_ground_lime","dirty_salt_wound","dirty_sleeve_needle","dirty_trip_knee","dirty_rot_follow","dirty_gutter_flip","dirty_rot_lock","dirty_dirty_hands","dirty_boot_heart","blade_strike","blade_double_edge","blade_break_wrist","blade_turn_blade","blade_chase_life","blade_life_trade","blade_step_past","blade_heart_hook","blade_low_bow","blade_throat_seal","blade_rain_cut","combo_elbow_rush","combo_bridge_pop","combo_stick_hand","combo_body_chain","combo_follow_knee","combo_split_bone","combo_short_guard","combo_gate_crash","combo_side_step","combo_wrap_arm","combo_ground_burst"];
  ids.forEach(id=>{
    window.KGAME_CARD_ART_MANIFEST.cards[id]={label:G.cards.definitions[id].name,path:'assets/cards/expansion-20261007/'+id+'.png',focus:{combat:{x:.5,y:.55},reward:{x:.5,y:.55}},deferred:true};
  });
})();

