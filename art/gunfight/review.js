(function () {
  'use strict';
  const options = { scout:'street_foreign_scout', instructor:'elite_mack', pair:'act2_street_rifle_cart' };
  const build = G.enemies.buildEncounterForNode;
  function start() {
    const encounterId = options[document.getElementById('encounter').value];
    const style = document.getElementById('style').value;
    reset_game_state();
    const state = G.main.getState();
    state.player.chosenStyle = style;
    state.player.masterDeckNames = G.cards.getStarterDeck(style);
    state.scene = 'combat'; state.combat = { seeded:false };
    // Use the real encounter and starter deck, with no damage or health bonuses.
    G.enemies.buildEncounterForNode = function () { return G.enemies.buildEncounter(encounterId); };
    try { replace_game_state(G.scenes.combat.prepareState(state)); }
    finally { G.enemies.buildEncounterForNode = build; }
    G.render.animations.clearEffects('combat');
    document.getElementById('game-canvas').focus();
  }
  document.getElementById('retry').addEventListener('click',start);
  function fit() {
    const shell = document.getElementById('game-shell'), canvas = document.getElementById('game-canvas');
    const scale = Math.min(shell.clientWidth / 1280,shell.clientHeight / 720);
    canvas.style.width = 1280 * scale + 'px'; canvas.style.height = 720 * scale + 'px';
  }
  window.addEventListener('resize',fit);
  start();
  fit();
})();
