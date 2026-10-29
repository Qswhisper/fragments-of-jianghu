window.G = window.G || {};

(function () {
  var RUNTIME_CARD_VISUAL_FIELDS = [
    "style",
    "artPath",
    "damage",
    "block",
    "draw",
    "flaw",
    "fester",
    "blind",
    "crippleTurns",
    "hits",
    "selfDamage",
    "executeDamage",
    "executeThreshold",
    "consumeFlaw",
    "consumeFester",
    "damagePerFlaw",
    "damagePerFester",
    "bonusDamageIfTargetHasFester",
    "bonusBlockIfBlocked",
    "ironBoneDamage",
    "ironBoneBlock",
    "damageFromCurrentBlock"
  ];

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function copyRuntimeCardVisualFields(target, template) {
    RUNTIME_CARD_VISUAL_FIELDS.forEach(function (key) {
      if (typeof template[key] !== "undefined") {
        target[key] = template[key];
      }
    });
    return target;
  }

  function syncOverlay(nextState) {
    var overlay = nextState.combat &&
      nextState.combat.ui &&
      nextState.combat.ui.overlay;

    if (!overlay || !overlay.visible) {
      return nextState;
    }

    if (overlay.title === "\u62bd\u724c\u5806") {
      overlay.items = nextState.combat.drawPileNames.slice();
    } else if (overlay.title === "\u5f03\u724c\u5806") {
      overlay.items = discardDisplayNames(nextState);
    }

    return nextState;
  }

  function discardDisplayNames(state) {
    var counts = {};
    (state.combat.playedThisTurnNames || []).forEach(function(name) { counts[name] = (counts[name] || 0) + 1; });
    return state.combat.discardPileNames.map(function(name) {
      if (counts[name] > 0) { counts[name] -= 1; return name + '（本回合已用）'; }
      return name;
    });
  }

  function syncHandCardRuntime(nextState) {
    nextState.combat.hand = (nextState.combat.hand || []).map(function (card) {
      var nextCard = Object.assign({}, card);
      var template = nextState.combat.cardLibrary[nextCard.name];

      if (!template) {
        return nextCard;
      }

      nextCard.definitionId = template.id;
      nextCard.sourceCard = template;
      nextCard.baseCost = typeof nextCard.baseCost === "number" ? nextCard.baseCost : (Number(template.cost) || 0);
      nextCard.comboTag = !!template.comboTag;
      nextCard.text = template.text;
      nextCard = copyRuntimeCardVisualFields(nextCard, template);

      if (G.statusEffects && typeof G.statusEffects.applyComboStateToCard === "function") {
        nextCard = G.statusEffects.applyComboStateToCard(nextState, nextCard, template);
      } else {
        nextCard.cost = nextCard.baseCost;
        nextCard.comboDiscounted = false;
      }

      return nextCard;
    });
    return nextState;
  }

  function applyHandPlayability(nextState) {
    nextState = syncHandCardRuntime(nextState);
    var energy = nextState.player.energy;
    nextState.combat.hand = nextState.combat.hand.map(function (card) {
      var nextCard = Object.assign({}, card);
      nextCard.playable = (Number(nextCard.cost) || 0) <= energy;
      return nextCard;
    });
    return nextState;
  }

  function refreshHandPlayability(state) {
    return syncOverlay(applyHandPlayability(cloneState(state)));
  }

  function clearSelectedCard(state) {
    var nextState = cloneState(state);
    nextState.combat.selectedCardId = null;
    return nextState;
  }

  function toggleSelectedCard(state, cardId) {
    var nextState = cloneState(state);
    nextState.combat.selectedCardId = nextState.combat.selectedCardId === cardId ? null : cardId;
    return nextState;
  }

  function playSelectedCard(state, targetId, targetName) {
    var selectedCardId = state.combat.selectedCardId;
    var hand = state.combat.hand || [];
    var index = hand.findIndex(function (card) {
      return card.id === selectedCardId;
    });
    var card = index >= 0 ? hand[index] : null;
    var cost = card ? (Number(card.cost) || 0) : 0;
    var nextState = null;
    var playedCard = null;
    var template = card ? state.combat.cardLibrary[card.name] : null;
    var playedStyle = template && typeof template.style === "string" ? template.style : "basic";

    if (!card || !G.player.canSpendEnergy(state, cost)) {
      return state;
    }

    nextState = G.player.spendEnergy(state, cost);
    playedCard = Object.assign({}, nextState.combat.hand[index]);
    nextState.combat.hand.splice(index, 1);
    nextState.combat.discardPileNames = nextState.combat.discardPileNames.concat(playedCard.name);
    nextState.combat.playedThisTurnNames = (nextState.combat.playedThisTurnNames || []).concat(playedCard.name);
    nextState.combat.discardPileCount += 1;
    nextState.combat.selectedCardId = null;
    nextState.combat.lastPlayedCardId = playedCard.id;
    nextState.combat.lastPlayedCardName = playedCard.name;
    nextState.combat.lastPlayedCardStyle = playedStyle;
    nextState.combat.lastTargetId = targetId;
    nextState.combat.playedCards = Array.isArray(nextState.combat.playedCards) ? nextState.combat.playedCards : [];
    nextState.combat.playedCards = nextState.combat.playedCards.concat([{
      name: playedCard.name,
      style: playedStyle
    }]);
    nextState.combat.lastAction = "\u5bf9" + targetName + "\u65bd\u5c55\u3010" + playedCard.name + "\u3011\u3002";
    if (G.statusEffects && typeof G.statusEffects.registerPlayedCard === "function") {
      nextState = G.statusEffects.registerPlayedCard(nextState, playedCard);
    }

    return refreshHandPlayability(syncOverlay(nextState));
  }

  G.deck = {
    discardDisplayNames: discardDisplayNames,
    refreshHandPlayability: refreshHandPlayability,
    clearSelectedCard: clearSelectedCard,
    toggleSelectedCard: toggleSelectedCard,
    playSelectedCard: playSelectedCard
  };
})();
