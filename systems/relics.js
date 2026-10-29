window.G = window.G || {};

(function () {
  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function hasRelic(state, relicId) {
    return !!state &&
      !!state.player &&
      Array.isArray(state.player.relics) &&
      state.player.relics.indexOf(relicId) !== -1;
  }

  function ensureCombatRelicState(state) {
    var nextState = cloneState(state);

    nextState.combat = nextState.combat || {};
    nextState.combat.relicState = Object.assign({
      combatStartApplied: false,
      combatEndApplied: false,
      sleeveTriggerUsed: false,
      lastSleeveTriggerBonus: 0,
      lastBandageHeal: 0,
      cheatCuffUsed: false,
      lastCheatCuffCardName: null
    }, nextState.combat.relicState || {});

    return nextState;
  }

  function applyCombatStart(state) {
    var nextState = ensureCombatRelicState(state);
    var notes = [];
    var enemyIds = [];
    var i = 0;

    if (nextState.combat.relicState.combatStartApplied) {
      return nextState;
    }

    nextState.combat.relicState.combatStartApplied = true;
    nextState.combat.relicState.sleeveTriggerUsed = false;
    nextState.combat.relicState.lastSleeveTriggerBonus = 0;

    if (hasRelic(nextState, "chipped_blade")) {
      nextState.player.energy += 1;
      notes.push("缺口的厚背砍刀让你首回合多出 1 点体力。");
    }

    if (hasRelic(nextState, "doomed_watch")) {
      nextState = G.enemyAI.drawCards(nextState, 2);
      notes.push("亡命怀表催着你多摸了 2 张牌。");
    }

    if (hasRelic(nextState, "rusty_mirror")) {
      nextState = G.enemyAI.gainPlayerBlock(nextState, 3);
      notes.push("锈护心镜在战斗伊始映出 3 点架势。");
    }

    if (hasRelic(nextState, "lime_packet")) {
      enemyIds = nextState.combat && Array.isArray(nextState.combat.enemies) ?
        nextState.combat.enemies.map(function (enemy) { return enemy.id; }) :
        [];
      for (i = 0; i < enemyIds.length; i += 1) {
        nextState = G.statusEffects.applyFester(nextState, enemyIds[i], 2);
        nextState = G.statusEffects.applyBlind(nextState, enemyIds[i], 1);
      }
      if (G.enemyAI && typeof G.enemyAI.refreshIntentsForDebuffs === "function") {
        nextState = G.enemyAI.refreshIntentsForDebuffs(nextState);
      }
      if (enemyIds.length > 0) {
        notes.push("下九流石灰包呛得敌人眼花，伤口也一起烂开了。");
      }
    }

    if (notes.length > 0) {
      nextState.combat.lastAction = notes.join(" ");
    }

    return nextState;
  }

  function beginPlayerTurn(state) {
    var nextState = ensureCombatRelicState(state);
    var notes = [];

    nextState.combat.relicState.sleeveTriggerUsed = false;
    nextState.combat.relicState.lastSleeveTriggerBonus = 0;
    nextState.combat.relicState.cheatCuffUsed = false;
    nextState.combat.relicState.lastCheatCuffCardName = null;

    if (hasRelic(nextState, "rusty_mirror")) {
      nextState = G.enemyAI.gainPlayerBlock(nextState, 3);
      notes.push("锈护心镜映出 3 点架势。");
    }

    nextState.combat.relicTurnNotes = notes;
    return nextState;
  }

  function applyPlayerDamage(state, enemyId, amount) {
    var nextState = ensureCombatRelicState(state);
    var damage = Math.max(0, Number(amount) || 0);
    var bonus = 0;

    if (damage <= 0) {
      return nextState;
    }

    if (hasRelic(nextState, "sleeve_trigger") && !nextState.combat.relicState.sleeveTriggerUsed) {
      bonus = 5;
      nextState.combat.relicState.sleeveTriggerUsed = true;
      nextState.combat.relicState.lastSleeveTriggerBonus = bonus;
    } else {
      nextState.combat.relicState.lastSleeveTriggerBonus = 0;
    }

    return G.enemyAI.applyDamageToEnemy(nextState, enemyId, damage + bonus);
  }

  function applyCombatEnd(state) {
    var nextState = ensureCombatRelicState(state);
    var healed = null;
    var actualHeal = 0;

    if (nextState.combat.relicState.combatEndApplied) {
      return nextState;
    }

    nextState.combat.relicState.combatEndApplied = true;

    if (nextState.combat.result === "victory" && hasRelic(nextState, "blood_bandage")) {
      healed = G.player.heal(nextState, 5);
      actualHeal = healed.player.hp - nextState.player.hp;
      nextState = healed;
      nextState.combat.relicState.lastBandageHeal = actualHeal;
    }

    return nextState;
  }

  function onRelicGained(state, relicId) {
    var nextState = cloneState(state);

    if (relicId === "iron_canteen") {
      nextState.player.maxHp = Math.max(1, (Number(nextState.player.maxHp) || 80) + 15);
      nextState.player.hp = Math.min(nextState.player.hp, nextState.player.maxHp);
    }

    return nextState;
  }

  function getRewardOptionCount(state) {
    return hasRelic(state, "secret_manual") ? 4 : 3;
  }

  function getBattleGoldBonus(state) {
    return hasRelic(state, "heavy_money_bag") ? 15 : 0;
  }

  function getRestHealMultiplier(state) {
    return hasRelic(state, "burning_liquor") ? 2 : 1;
  }

  function shouldShowEliteIntel(state) {
    return hasRelic(state, "settlement_map");
  }

  function getNemesisAmbushCount(state) {
    return hasRelic(state, "wanted_poster") ? 2 : 1;
  }

  function getUpgradedCardBonus(state, card) {
    var safeCard = card || {};
    var grantsDamage = !!(
      safeCard.damage ||
      safeCard.damageFromCurrentBlock ||
      safeCard.ironBoneDamage ||
      safeCard.damagePerFlaw ||
      safeCard.damagePerFester ||
      safeCard.bonusDamageIfTargetHasFester ||
      safeCard.executeDamage
    );
    var grantsBlock = !!(
      safeCard.block ||
      safeCard.bonusBlockIfBlocked ||
      safeCard.ironBoneBlock
    );

    if (!hasRelic(state, "whetstone") || !safeCard.upgraded) {
      return { damage: 0, block: 0 };
    }

    if (grantsDamage) {
      return { damage: 3, block: 0 };
    }

    if (grantsBlock) {
      return { damage: 0, block: 3 };
    }

    return { damage: 0, block: 0 };
  }

  function canUseCheatCuff(state) {
    var selectedCardId = state && state.combat ? state.combat.selectedCardId : null;
    var hand = state && state.combat && Array.isArray(state.combat.hand) ? state.combat.hand : [];
    var used = state && state.combat && state.combat.relicState ? !!state.combat.relicState.cheatCuffUsed : false;
    var exists = hand.some(function (card) {
      return card.id === selectedCardId;
    });

    return hasRelic(state, "cheat_cuff") && !used && !!selectedCardId && exists;
  }

  function useCheatCuff(state, cardId) {
    var nextState = ensureCombatRelicState(state);
    var hand = nextState.combat.hand || [];
    var index = hand.findIndex(function (card) {
      return card.id === cardId;
    });
    var card = index >= 0 ? hand[index] : null;

    if (!hasRelic(nextState, "cheat_cuff") || nextState.combat.relicState.cheatCuffUsed || !card) {
      return nextState;
    }

    nextState.combat.hand.splice(index, 1);
    nextState.combat.discardPileNames = nextState.combat.discardPileNames.concat(card.name);
    nextState.combat.discardPileCount = nextState.combat.discardPileNames.length;
    nextState.combat.selectedCardId = null;
    nextState.combat.relicState.cheatCuffUsed = true;
    nextState.combat.relicState.lastCheatCuffCardName = card.name;
    nextState.combat.lastAction = "你把《" + card.name + "》塞进袖里换了手，重新摸 1 张牌。";
    nextState = G.enemyAI.drawCards(nextState, 1);

    if (G.deck && typeof G.deck.refreshHandPlayability === "function") {
      nextState = G.deck.refreshHandPlayability(nextState);
    }

    return nextState;
  }

  function getCombatDisplay(state) {
    var relicIds = state && state.player && Array.isArray(state.player.relics) ? state.player.relics : [];
    var relicState = state && state.combat ? (state.combat.relicState || {}) : {};
    var turn = state && state.combat ? state.combat.turn || 1 : 1;

    return relicIds.map(function (relicId) {
      var definition = G.relics.getRelicById(relicId);
      var active = false;
      var status = "";

      if (!definition) {
        return null;
      }

      if (relicId === "chipped_blade") {
        active = turn === 1;
        status = turn === 1 ? "首回合" : "已过";
      } else if (relicId === "lime_packet") {
        active = turn === 1;
        status = turn === 1 ? "开场扬灰" : "已用";
      } else if (relicId === "beiyang_boots") {
        active = true;
        status = "每4张免体";
      } else if (relicId === "rusty_mirror") {
        active = true;
        status = "+3架势";
      } else if (relicId === "blood_bandage") {
        active = false;
        status = relicState.lastBandageHeal > 0 ? "回了 " + relicState.lastBandageHeal : "战后回血";
      } else if (relicId === "doomed_watch") {
        active = turn === 1;
        status = turn === 1 ? "首回合" : "已过";
      } else if (relicId === "sleeve_trigger") {
        active = !relicState.sleeveTriggerUsed;
        status = relicState.sleeveTriggerUsed ? "本回合已触发" : "待触发";
      } else if (relicId === "secret_manual") {
        active = false;
        status = "四选一";
      } else if (relicId === "iron_canteen") {
        active = false;
        status = "气血上限+15";
      } else if (relicId === "heavy_money_bag") {
        active = false;
        status = "战后+15洋";
      } else if (relicId === "whetstone") {
        active = false;
        status = "升级牌强化";
      } else if (relicId === "cheat_cuff") {
        active = !relicState.cheatCuffUsed;
        status = relicState.cheatCuffUsed ? "本回合已换牌" : "待换牌";
      } else if (relicId === "burning_liquor") {
        active = false;
        status = "破庙翻倍";
      } else if (relicId === "settlement_map") {
        active = false;
        status = "显露强敌";
      }

      if (relicId === "wanted_poster") {
        active = false;
        status = "最多2处设伏";
      }

      return {
        id: definition.id,
        icon: definition.icon,
        name: definition.name,
        active: active,
        status: status
      };
    }).filter(Boolean);
  }

  G.relicRuntime = {
    hasRelic: hasRelic,
    onRelicGained: onRelicGained,
    applyCombatStart: applyCombatStart,
    beginPlayerTurn: beginPlayerTurn,
    applyPlayerDamage: applyPlayerDamage,
    applyCombatEnd: applyCombatEnd,
    getRewardOptionCount: getRewardOptionCount,
    getBattleGoldBonus: getBattleGoldBonus,
    getRestHealMultiplier: getRestHealMultiplier,
    shouldShowEliteIntel: shouldShowEliteIntel,
    getNemesisAmbushCount: getNemesisAmbushCount,
    getUpgradedCardBonus: getUpgradedCardBonus,
    canUseCheatCuff: canUseCheatCuff,
    useCheatCuff: useCheatCuff,
    getCombatDisplay: getCombatDisplay
  };
})();
