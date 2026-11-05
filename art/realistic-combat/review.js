(function () {
  'use strict';
  const options = { street:'street_intro', scout:'street_foreign_scout', instructor:'elite_mack', pair:'street_city_tracker_patrol', triple:'street_city_tracker_patrol' };
  const build = G.enemies.buildEncounterForNode;
  function beginBattle(state,encounterId,triple=false) {
    state.scene = 'combat'; state.combat = { seeded:false };
    state.reward=null;state.rest=null;state.reviewPanel=null;state.reviewReceipt=null;
    // Use the real encounter and starter deck, with no damage or health bonuses.
    G.enemies.buildEncounterForNode = function () {
      const encounter = G.enemies.buildEncounter(encounterId);
      encounter.nodeType=encounterId==='elite_mack'?'elite':'street';
      if (triple) {
        const extra = G.enemies.buildEncounter('street_foreign_scout').enemies[0];
        extra.id = 'review-scout-3'; encounter.enemies.push(extra);
        encounter.nextEnemySerial = 4; encounter.name = '三敌围堵 · 布局样段';
      }
      return encounter;
    };
    try { return G.scenes.combat.prepareState(state); }
    finally { G.enemies.buildEncounterForNode = build; }
  }
  function start() {
    const encounter=document.getElementById('encounter').value,style=document.getElementById('style').value;
    const stage=document.getElementById('review-stage').value;
    reset_game_state();G.render.realisticJourney.reset();
    let state=G.main.getState();state.player.chosenStyle=style;state.player.masterDeckNames=G.cards.getStarterDeck(style);
    state=beginBattle(state,options[encounter],encounter==='triple');
    if(stage==='sequence')state.reviewJourney={mode:'sequence',leg:0};
    // Isolated scene previews. The playable sequence uses actual combat outcomes.
    if(stage==='reward'){
      state.combat.result='victory';state.combat.enemies.forEach(e=>{e.hp=0;});
      state.scene='reward';state=G.scenes.reward.prepareState(state);
    }else if(stage==='rest'){
      state.player.hp=54;state.scene='rest';state=G.scenes.rest.prepareState(state);
    }
    replace_game_state(state);
    G.render.animations.clearEffects('combat');
    document.getElementById('game-canvas').focus();
  }
  G.realisticReview={beginBattle,restart:start};
  document.getElementById('retry').addEventListener('click',start);
  function setPlaybackOptions() {
    G.scenes.combat.feedback.setOptions({speed:Number(document.getElementById('pace').value),reduced:document.getElementById('reduced-motion').checked});
  }
  document.getElementById('pace').addEventListener('change',setPlaybackOptions);
  document.getElementById('reduced-motion').addEventListener('change',setPlaybackOptions);
  const soundPanel=document.getElementById('sound-panel'),soundToggle=document.getElementById('sound-toggle');
  function syncSoundControls() {
    const settings=G.main.getState().settings;
    for(const [channel,key] of [['music','musicVolume'],['sfx','sfxVolume']]) {
      const percent=Math.round(settings[key]*100);
      document.getElementById(channel+'-volume').value=percent;
      document.getElementById(channel+'-level').value=percent+'%';
    }
  }
  function showSoundPanel(show) {
    soundPanel.hidden=!show;soundToggle.setAttribute('aria-expanded',String(show));
    if(show){syncSoundControls();document.getElementById('music-volume').focus();}
    else soundToggle.focus();
  }
  soundToggle.addEventListener('click',()=>{G.audio.handleUserGesture();showSoundPanel(soundPanel.hidden);});
  document.getElementById('sound-close').addEventListener('click',()=>showSoundPanel(false));
  soundPanel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();showSoundPanel(false);}});
  for(const [channel,key] of [['music','musicVolume'],['sfx','sfxVolume']]) {
    const slider=document.getElementById(channel+'-volume');
    slider.addEventListener('input',()=>{G.audio.handleUserGesture();update_game_settings({[key]:Number(slider.value)/100});syncSoundControls();});
  }
  const auditionNote=document.getElementById('sound-audition-note');
  document.getElementById('sound-palette').addEventListener('change',event=>{
    G.audio.handleUserGesture();
    G.audio.setCombatSoundProfile(event.target.value==='candidate'?G.combatAudioCandidate:null);
    G.audio.preloadCombatSfx();
    auditionNote.textContent=event.target.value==='candidate'?'实录候选已接入当前战斗，听感待评审。':'已恢复现有音效。';
  });
  document.querySelectorAll('[data-audio-cue]').forEach(button=>button.addEventListener('click',()=>{
    if(G.scenes.combat.feedback.isBusy()){auditionNote.textContent='行动结束后可单项试听。';return;}
    G.audio.handleUserGesture();G.audio.previewCombatCue(button.dataset.audioCue);
    auditionNote.textContent=button.textContent+' · 试听';
  }));
  function fit() {
    const shell = document.getElementById('game-shell'), canvas = document.getElementById('game-canvas');
    const scale = Math.min(shell.clientWidth / 1280,shell.clientHeight / 720);
    canvas.style.width = 1280 * scale + 'px'; canvas.style.height = 720 * scale + 'px';
    soundPanel.style.top=document.getElementById('review-controls').offsetHeight+6+'px';
  }
  window.addEventListener('resize',fit);
  document.getElementById('look').addEventListener('change', () => {
    G.render.woodcut.combatPresentation = document.getElementById('look').value === 'realistic' ? G.render.realisticCombat : null;
    advanceTime(1);
  });
  start();
  fit();
  syncSoundControls();
  G.audio.preloadCombatSfx();
})();

