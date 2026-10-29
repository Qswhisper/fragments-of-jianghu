window.G = window.G || {};
G.statusEffects = G.statusEffects || {};

(function () {
  var IRON_BONE_THRESHOLD = 10;
  var BLIND_DAMAGE_RATIO = 0.5;
  var CRIPPLE_DAMAGE_RATIO = 0.75;
  var COMBO_THRESHOLD = 3;
  var COMBO_DISCOUNT_LIMIT = 3;
  var PLAYER_POISON_DAMAGE = 3;

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function ensureEnemyDebuffs(enemy) {
    enemy.debuffs = Object.assign({
      flaw: 0,
      fester: 0,
      blind: 0,
      crippleTurns: 0
    }, enemy.debuffs || {});
    return enemy;
  }

  function ensurePlayerStatuses(state) {
    var nextState = cloneState(state);

    nextState.player = Object.assign({
      poisonTurns: 0
    }, nextState.player || {});
    nextState.player.poisonTurns = Math.max(0, Number(nextState.player.poisonTurns) || 0);
    return nextState;
  }

  function getEnemyAdaptation(enemy) {
    return enemy && enemy.currentAdaptation ? enemy.currentAdaptation : null;
  }

  function adjustNemesisDebuffAmount(enemy, amount, protectedAdaptation) {
    var resolved = Math.max(0, Number(amount) || 0);

    if (resolved <= 0 || getEnemyAdaptation(enemy) !== protectedAdaptation) {
      return resolved;
    }

    return Math.max(1, Math.floor(resolved * 0.5));
  }

  function ensureCombatComboState(state) {
    var nextState = cloneState(state);

    nextState.combat = nextState.combat || {};
    nextState.combat.comboCount = Math.max(0, Number(nextState.combat.comboCount) || 0);
    nextState.combat.comboDiscountUses = Math.max(0, Number(nextState.combat.comboDiscountUses) || 0);
    return nextState;
  }

  function findEnemyById(state, enemyId) {
    return state.combat.enemies.find(function (enemy) {
      return enemy.id === enemyId;
    }) || null;
  }

  function applyFlaw(state, enemyId, amount) {
    var nextState = cloneState(state);
    var enemy = findEnemyById(nextState, enemyId);
    var resolvedAmount = 0;

    if (!enemy) {
      return nextState;
    }

    ensureEnemyDebuffs(enemy);
    resolvedAmount = adjustNemesisDebuffAmount(enemy, amount, "bulletproof_vest");
    enemy.debuffs.flaw += resolvedAmount;
    return nextState;
  }

  function consumeFlaw(state, enemyId) {
    var nextState = cloneState(state);
    var enemy = findEnemyById(nextState, enemyId);
    var amount = 0;

    if (!enemy) {
      return {
        state: nextState,
        amount: amount
      };
    }

    ensureEnemyDebuffs(enemy);
    amount = enemy.debuffs.flaw;
    enemy.debuffs.flaw = 0;

    return {
      state: nextState,
      amount: amount
    };
  }

  function getFlaw(enemy) {
    if (!enemy || !enemy.debuffs) {
      return 0;
    }

    return Math.max(0, Number(enemy.debuffs.flaw) || 0);
  }

  function applyFester(state, enemyId, amount) {
    var nextState = cloneState(state);
    var enemy = findEnemyById(nextState, enemyId);
    var resolvedAmount = 0;

    if (!enemy) {
      return nextState;
    }

    ensureEnemyDebuffs(enemy);
    resolvedAmount = adjustNemesisDebuffAmount(enemy, amount, "gas_mask");
    enemy.debuffs.fester += resolvedAmount;
    return nextState;
  }

  function consumeFester(state, enemyId) {
    var nextState = cloneState(state);
    var enemy = findEnemyById(nextState, enemyId);
    var amount = 0;

    if (!enemy) {
      return {
        state: nextState,
        amount: amount
      };
    }

    ensureEnemyDebuffs(enemy);
    amount = enemy.debuffs.fester;
    enemy.debuffs.fester = 0;

    return {
      state: nextState,
      amount: amount
    };
  }

  function getFester(enemy) {
    if (!enemy || !enemy.debuffs) {
      return 0;
    }

    return Math.max(0, Number(enemy.debuffs.fester) || 0);
  }

  // TODO: 需策划补充 迷眼层数与强度的精确关系；当前实现为任意正层数都让敌人下回合伤害减半，持续 1 回合。
  function applyBlind(state, enemyId, amount) {
    var nextState = cloneState(state);
    var enemy = findEnemyById(nextState, enemyId);
    var blind = Math.max(0, Number(amount) || 0);

    if (!enemy || blind <= 0) {
      return nextState;
    }

    ensureEnemyDebuffs(enemy);
    enemy.debuffs.blind = Math.max(enemy.debuffs.blind, blind);
    return nextState;
  }

  function getBlind(enemy) {
    if (!enemy || !enemy.debuffs) {
      return 0;
    }

    return Math.max(0, Number(enemy.debuffs.blind) || 0);
  }

  function applyCripple(state, enemyId, turns) {
    var nextState = cloneState(state);
    var enemy = findEnemyById(nextState, enemyId);
    var duration = Math.max(0, Number(turns) || 0);

    if (!enemy || duration <= 0) {
      return nextState;
    }

    ensureEnemyDebuffs(enemy);
    enemy.debuffs.crippleTurns = Math.max(enemy.debuffs.crippleTurns, duration);
    return nextState;
  }

  function getCrippleTurns(enemy) {
    if (!enemy || !enemy.debuffs) {
      return 0;
    }

    return Math.max(0, Number(enemy.debuffs.crippleTurns) || 0);
  }

  function getPlayerPoisonTurns(state) {
    if (!state || !state.player) {
      return 0;
    }

    return Math.max(0, Number(state.player.poisonTurns) || 0);
  }

  function applyPlayerPoison(state, turns) {
    var nextState = ensurePlayerStatuses(state);
    var duration = Math.max(0, Number(turns) || 0);

    if (duration <= 0) {
      return nextState;
    }

    nextState.player.poisonTurns = Math.max(getPlayerPoisonTurns(nextState), duration);
    return nextState;
  }

  function resolvePlayerTurnStart(state) {
    var nextState = ensurePlayerStatuses(state);
    var notes = [];
    var poisonTurns = getPlayerPoisonTurns(nextState);

    if (poisonTurns <= 0) {
      return {
        state: nextState,
        notes: notes
      };
    }

    nextState.player.hp = Math.max(0, nextState.player.hp - PLAYER_POISON_DAMAGE);
    nextState.player.poisonTurns = Math.max(0, poisonTurns - 1);
    notes.push("毒性攻心，失去 " + PLAYER_POISON_DAMAGE + " 点气血。");
    return {
      state: nextState,
      notes: notes
    };
  }

  function adjustEnemyAttackDamage(enemy, damage) {
    var adjusted = Math.max(0, Number(damage) || 0);

    if (getCrippleTurns(enemy) > 0) {
      adjusted = Math.floor(adjusted * CRIPPLE_DAMAGE_RATIO);
    }

    if (getBlind(enemy) > 0) {
      adjusted = Math.floor(adjusted * BLIND_DAMAGE_RATIO);
    }

    return Math.max(0, adjusted);
  }

  function resolveEnemyTurnStart(state) {
    var nextState = cloneState(state);
    var enemyIds = [];
    var i = 0;
    var enemy = null;
    var damage = 0;
    var notes = [];

    nextState = nextState && nextState.combat ? nextState : cloneState(state);
    enemyIds = nextState && nextState.combat && Array.isArray(nextState.combat.enemies) ?
      nextState.combat.enemies.map(function (item) { return item.id; }) :
      [];

    for (i = 0; i < enemyIds.length; i += 1) {
      enemy = findEnemyById(nextState, enemyIds[i]);
      if (!enemy || enemy.hp <= 0) {
        continue;
      }

      ensureEnemyDebuffs(enemy);
      damage = getFester(enemy);
      if (damage <= 0) {
        continue;
      }

      if (G.enemyAI && typeof G.enemyAI.applyDamageToEnemy === "function") {
        nextState = G.enemyAI.applyDamageToEnemy(nextState, enemy.id, damage, {
          countsAsHit: false
        });
      } else {
        enemy.hp = Math.max(0, enemy.hp - damage);
      }

      enemy = findEnemyById(nextState, enemy.id);
      if (!enemy) {
        continue;
      }

      ensureEnemyDebuffs(enemy);
      enemy.debuffs.fester = Math.max(0, enemy.debuffs.fester - 1);
      notes.push(enemy.name + "伤口溃烂，受到 " + damage + " 点伤害。");
    }

    return {
      state: nextState,
      notes: notes
    };
  }

  function completeEnemyTurn(state, enemyId) {
    var nextState = cloneState(state);
    var enemy = findEnemyById(nextState, enemyId);

    if (!enemy) {
      return nextState;
    }

    ensureEnemyDebuffs(enemy);

    if (enemy.debuffs.blind > 0) {
      enemy.debuffs.blind = 0;
    }

    if (enemy.debuffs.crippleTurns > 0) {
      enemy.debuffs.crippleTurns = Math.max(0, enemy.debuffs.crippleTurns - 1);
    }

    return nextState;
  }

  function isIronBoneActiveForBlock(block) {
    return Math.max(0, Number(block) || 0) >= IRON_BONE_THRESHOLD;
  }

  function isIronBoneActive(state) {
    return !!state &&
      !!state.player &&
      isIronBoneActiveForBlock(state.player.block);
  }

  function getComboCount(state) {
    return state && state.combat ? Math.max(0, Number(state.combat.comboCount) || 0) : 0;
  }

  function getComboDiscountUses(state) {
    return state && state.combat ? Math.max(0, Number(state.combat.comboDiscountUses) || 0) : 0;
  }

  function getComboDiscountsRemaining(state) {
    return Math.max(0, COMBO_DISCOUNT_LIMIT - getComboDiscountUses(state));
  }

  function isComboDiscountActive(state) {
    return getComboCount(state) >= COMBO_THRESHOLD && getComboDiscountsRemaining(state) > 0;
  }

  function getComboCardDiscount(state, card) {
    var baseCost = card ? Math.max(0, Number(card.baseCost) || Number(card.cost) || 0) : 0;

    if (!card || !card.comboTag || baseCost <= 0 || !isComboDiscountActive(state)) {
      return 0;
    }

    return 1;
  }

  function isBeiyangBootsDiscountTurn(state, card) {
    var baseCost = card ? Math.max(0, Number(card.baseCost) || Number(card.cost) || 0) : 0;
    var playedCardCount = state && state.combat && Array.isArray(state.combat.playedCards) ?
      state.combat.playedCards.length :
      0;

    if (
      baseCost <= 0 ||
      !G.relicRuntime ||
      typeof G.relicRuntime.hasRelic !== "function" ||
      !G.relicRuntime.hasRelic(state, "beiyang_boots")
    ) {
      return false;
    }

    return ((playedCardCount + 1) % 4) === 0;
  }

  function applyComboStateToCard(state, card, template) {
    var nextCard = Object.assign({}, card);
    var source = template || {};
    var comboDiscount = 0;
    var relicFreeTurn = false;

    nextCard.baseCost = typeof nextCard.baseCost === "number" ?
      nextCard.baseCost :
      Math.max(0, Number(source.cost) || Number(nextCard.cost) || 0);
    nextCard.comboTag = !!source.comboTag || !!nextCard.comboTag;
    comboDiscount = getComboCardDiscount(state, nextCard);
    relicFreeTurn = isBeiyangBootsDiscountTurn(state, nextCard);
    nextCard.comboDiscounted = comboDiscount > 0;
    nextCard.relicDiscounted = relicFreeTurn;
    nextCard.cost = relicFreeTurn ? 0 : Math.max(0, nextCard.baseCost - comboDiscount);
    return nextCard;
  }

  function registerPlayedCard(state, playedCard) {
    var nextState = ensureCombatComboState(state);

    nextState.combat.comboCount += 1;
    if (playedCard && playedCard.comboDiscounted && nextState.combat.comboDiscountUses < COMBO_DISCOUNT_LIMIT) {
      nextState.combat.comboDiscountUses += 1;
    }
    return nextState;
  }

  function resetComboState(state) {
    var nextState = ensureCombatComboState(state);
    nextState.combat.comboCount = 0;
    nextState.combat.comboDiscountUses = 0;
    return nextState;
  }

  G.statusEffects.ensureEnemyDebuffs = ensureEnemyDebuffs;
  G.statusEffects.applyFlaw = applyFlaw;
  G.statusEffects.consumeFlaw = consumeFlaw;
  G.statusEffects.getFlaw = getFlaw;
  G.statusEffects.applyFester = applyFester;
  G.statusEffects.consumeFester = consumeFester;
  G.statusEffects.getFester = getFester;
  G.statusEffects.applyBlind = applyBlind;
  G.statusEffects.getBlind = getBlind;
  G.statusEffects.applyCripple = applyCripple;
  G.statusEffects.getCrippleTurns = getCrippleTurns;
  G.statusEffects.ensurePlayerStatuses = ensurePlayerStatuses;
  G.statusEffects.getPlayerPoisonTurns = getPlayerPoisonTurns;
  G.statusEffects.applyPlayerPoison = applyPlayerPoison;
  G.statusEffects.resolvePlayerTurnStart = resolvePlayerTurnStart;
  G.statusEffects.PLAYER_POISON_DAMAGE = PLAYER_POISON_DAMAGE;
  G.statusEffects.adjustEnemyAttackDamage = adjustEnemyAttackDamage;
  G.statusEffects.resolveEnemyTurnStart = resolveEnemyTurnStart;
  G.statusEffects.completeEnemyTurn = completeEnemyTurn;
  G.statusEffects.IRON_BONE_THRESHOLD = IRON_BONE_THRESHOLD;
  G.statusEffects.isIronBoneActiveForBlock = isIronBoneActiveForBlock;
  G.statusEffects.isIronBoneActive = isIronBoneActive;
  G.statusEffects.COMBO_THRESHOLD = COMBO_THRESHOLD;
  G.statusEffects.COMBO_DISCOUNT_LIMIT = COMBO_DISCOUNT_LIMIT;
  G.statusEffects.getComboCount = getComboCount;
  G.statusEffects.getComboDiscountUses = getComboDiscountUses;
  G.statusEffects.getComboDiscountsRemaining = getComboDiscountsRemaining;
  G.statusEffects.isComboDiscountActive = isComboDiscountActive;
  G.statusEffects.applyComboStateToCard = applyComboStateToCard;
  G.statusEffects.registerPlayedCard = registerPlayedCard;
  G.statusEffects.resetComboState = resetComboState;
})();
