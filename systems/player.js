window.G = window.G || {};

(function () {
  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function ensurePlayer(state) {
    var nextState = cloneState(state);
    nextState.player = nextState.player || {};
    nextState.player.hp = typeof nextState.player.hp === "number" ? nextState.player.hp : 80;
    nextState.player.maxHp = typeof nextState.player.maxHp === "number" ? nextState.player.maxHp : 80;
    nextState.player.energy = typeof nextState.player.energy === "number" ? nextState.player.energy : 3;
    nextState.player.maxEnergy = typeof nextState.player.maxEnergy === "number" ? nextState.player.maxEnergy : 3;
    nextState.player.block = typeof nextState.player.block === "number" ? nextState.player.block : 0;
    nextState.player.gold = typeof nextState.player.gold === "number" ? nextState.player.gold : 100;
    nextState.player.relics = Array.isArray(nextState.player.relics) ? nextState.player.relics.slice() : [];
    nextState.player.removeServiceCount = typeof nextState.player.removeServiceCount === "number" ? nextState.player.removeServiceCount : 0;
    return nextState;
  }

  G.player = {
    canSpendEnergy: function (state, amount) {
      return !!state &&
        !!state.player &&
        state.player.energy >= Math.max(0, Number(amount) || 0);
    },

    spendEnergy: function (state, amount) {
      var nextState = ensurePlayer(state);
      var spend = Math.max(0, Number(amount) || 0);
      nextState.player.energy = Math.max(0, nextState.player.energy - spend);
      return nextState;
    },

    canSpendGold: function (state, amount) {
      return !!state &&
        !!state.player &&
        state.player.gold >= Math.max(0, Number(amount) || 0);
    },

    spendGold: function (state, amount) {
      var nextState = ensurePlayer(state);
      var spend = Math.max(0, Number(amount) || 0);
      nextState.player.gold = Math.max(0, nextState.player.gold - spend);
      return nextState;
    },

    gainGold: function (state, amount) {
      var nextState = ensurePlayer(state);
      nextState.player.gold += Math.max(0, Number(amount) || 0);
      return nextState;
    },

    heal: function (state, amount) {
      var nextState = ensurePlayer(state);
      var heal = Math.max(0, Number(amount) || 0);
      nextState.player.hp = Math.min(nextState.player.maxHp, nextState.player.hp + heal);
      return nextState;
    },

    addRelic: function (state, relicId) {
      var nextState = ensurePlayer(state);
      if (nextState.player.relics.indexOf(relicId) === -1) {
        nextState.player.relics.push(relicId);
        if (G.relicRuntime && typeof G.relicRuntime.onRelicGained === "function") {
          nextState = G.relicRuntime.onRelicGained(nextState, relicId);
        }
      }
      return nextState;
    },

    incrementRemoveServiceCount: function (state) {
      var nextState = ensurePlayer(state);
      nextState.player.removeServiceCount += 1;
      return nextState;
    }
  };
})();
