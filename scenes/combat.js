window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  var COMBAT_GROUND_FOREGROUND_TEXTURE_PATH = "assets/ui/combat_ground_muddy_earth_foreground_gpt4ovip_cutout_clean_01.png";
  var CARD_HOVER_DELAY_MS = 1000;
  var hoverInspectionCardId = null;
  var hoverInspectionElapsedMs = 0;

  function resetHoverInspection() {
    hoverInspectionCardId = null;
    hoverInspectionElapsedMs = 0;
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getCardTemplate(state, cardName) {
    return state.combat.cardLibrary[cardName] || null;
  }

  function enterRewardScene(state) {
    var nextState = state;

    if (G.relicRuntime && typeof G.relicRuntime.applyCombatEnd === "function") {
      nextState = G.relicRuntime.applyCombatEnd(nextState);
    }

    if (!G.scenes.reward || typeof G.scenes.reward.prepareState !== "function") {
      return nextState;
    }

    return G.scenes.reward.prepareState(nextState);
  }

  function queueCombatSceneTransition(state, targetScene, delayMs) {
    var nextState = cloneState(state);

    nextState.combat.presentation = Object.assign({
      pendingScene: null,
      transitionMs: 0,
      enemyLayoutHoldMs: 0,
      enemyLayoutEnemyIds: null
    }, nextState.combat.presentation || {});
    nextState.combat.presentation.pendingScene = targetScene || null;
    nextState.combat.presentation.transitionMs = Math.max(0, Number(delayMs) || 0);
    return nextState;
  }

  function clearCombatSceneTransition(state) {
    var nextState = cloneState(state);

    nextState.combat.presentation = Object.assign({
      pendingScene: null,
      transitionMs: 0,
      enemyLayoutHoldMs: 0,
      enemyLayoutEnemyIds: null
    }, nextState.combat.presentation || {});
    nextState.combat.presentation.pendingScene = null;
    nextState.combat.presentation.transitionMs = 0;
    return nextState;
  }

  function resolveCombatSceneTransition(state, input) {
    var nextState = state;
    var deltaMs = input && typeof input.deltaMs === "number" ? input.deltaMs : 0;
    var presentation = null;
    var cloned = false;

    if (!nextState.combat || !nextState.combat.presentation) {
      return nextState;
    }

    presentation = nextState.combat.presentation;

    if ((presentation.enemyLayoutHoldMs || 0) > 0) {
      nextState = cloneState(nextState);
      presentation = nextState.combat.presentation;
      presentation.enemyLayoutHoldMs = Math.max(0, (presentation.enemyLayoutHoldMs || 0) - deltaMs);
      if (presentation.enemyLayoutHoldMs <= 0) {
        presentation.enemyLayoutEnemyIds = null;
      }
      cloned = true;
    }

    if (!presentation.pendingScene) {
      return nextState;
    }

    if (!cloned) {
      nextState = cloneState(nextState);
      presentation = nextState.combat.presentation;
    }
    presentation.transitionMs = Math.max(0, (presentation.transitionMs || 0) - deltaMs);

    if (presentation.transitionMs > 0) {
      return nextState;
    }

    if (presentation.pendingScene === "reward") {
      nextState = clearCombatSceneTransition(nextState);
      return enterRewardScene(nextState);
    }

    return clearCombatSceneTransition(nextState);
  }

  function primeRewardPreview(state) {
    var nextState = state;
    var previewState = null;

    if (!nextState || !G.scenes.reward || typeof G.scenes.reward.prepareState !== "function") {
      return nextState;
    }

    previewState = G.scenes.reward.prepareState(cloneState(nextState));
    if (previewState && previewState.reward) {
      // The preview already resolves gold, RNG and nemesis memory. Commit that
      // transaction once while keeping the finishing animation in combat.
      previewState.scene = nextState.scene;
      return previewState;
    }
    return nextState;
  }

  function getCurrentMapNode(state) {
    var nodes = state && state.map && Array.isArray(state.map.nodes) ? state.map.nodes : [];
    var currentNodeId = state && state.map ? state.map.currentNodeId : null;
    var i = 0;

    for (i = 0; i < nodes.length; i += 1) {
      if (nodes[i].id === currentNodeId) {
        return nodes[i];
      }
    }

    return null;
  }

  function buildStarterCombatState(nextState) {
    var style = nextState.player.chosenStyle || "blade";
    var deckNames = nextState.player.masterDeckNames && nextState.player.masterDeckNames.length > 0 ?
      nextState.player.masterDeckNames.slice() :
      G.cards.getStarterDeck(style);
    var battleOrder = G.journeyPreparation ? G.journeyPreparation.openingOrder(nextState, deckNames) : deckNames;
    var openingHand = battleOrder.slice(0, 5);
    var drawPile = battleOrder.slice(5);
    var encounter = null;

    if (
      nextState.combat &&
      nextState.combat.nemesisEntryId &&
      G.nemesis &&
      typeof G.nemesis.buildEncounterForEntry === "function"
    ) {
      encounter = G.nemesis.buildEncounterForEntry(nextState, nextState.combat.nemesisEntryId);
    }

    if (!encounter) {
      encounter = G.enemies && typeof G.enemies.buildEncounterForNode === "function" ?
        G.enemies.buildEncounterForNode(nextState, getCurrentMapNode(nextState)) :
        null;
    }
    if (G.nemesis.distinguishSuccessors) encounter = G.nemesis.distinguishSuccessors(nextState, encounter);

    nextState.player.masterDeckNames = deckNames.slice();
    nextState.player.deckSize = deckNames.length;
    nextState.player.block = 0;
    nextState.player.energy = nextState.player.maxEnergy;
    nextState.combat.turn = 1;
    nextState.combat.comboCount = 0;
    nextState.combat.comboDiscountUses = 0;
    nextState.combat.cardSerial = 1;
    nextState.combat.cardLibrary = G.cards.buildLibraryFromDeck(deckNames);
    nextState.combat.drawPileNames = drawPile;
    nextState.combat.discardPileNames = [];
    nextState.combat.playedCards = [];
    nextState.combat.playedThisTurnNames = [];
    nextState.combat.hand = G.enemyAI.materializeHand(nextState, openingHand);
    nextState.combat.enemies = encounter && encounter.enemies && encounter.enemies.length > 0 ? encounter.enemies : [];
    nextState.combat.enemies.forEach(function(enemy){enemy.openingPortrait=!!(encounter&&encounter.id==='street_intro'&&!nextState.map?.currentNodeId);});
    nextState.combat.enemySerial = encounter && encounter.nextEnemySerial ? encounter.nextEnemySerial : (nextState.combat.enemies.length + 1);
    nextState.combat.encounterId = encounter ? encounter.id : "street_intro";
    nextState.combat.encounterName = encounter ? encounter.name : "乱军缺口";
    nextState.combat.nodeType = encounter ? encounter.nodeType : "street";
    nextState.combat.actNumber = encounter && encounter.actNumber ?
      encounter.actNumber :
      (G.enemies && typeof G.enemies.getActNumber === "function" ? G.enemies.getActNumber(nextState) : 1);
    nextState.combat.nemesisEntryId = encounter && encounter.nemesisEntryId ? encounter.nemesisEntryId : null;
    nextState.combat.nemesisName = encounter && encounter.nemesisName ? encounter.nemesisName : null;
    nextState.combat.nemesisTitle = encounter && encounter.nemesisTitle ? encounter.nemesisTitle : null;
    nextState.combat.nemesisLevel = encounter && encounter.nemesisLevel ? encounter.nemesisLevel : null;
    nextState.combat.nemesisAdaptation = encounter && encounter.nemesisAdaptation ? encounter.nemesisAdaptation : null;
    nextState.combat.nemesisFirearmStage = encounter && encounter.nemesisFirearmStage ? encounter.nemesisFirearmStage : "none";
    nextState.combat.nemesisScaledHP = encounter && encounter.nemesisScaledHP ? encounter.nemesisScaledHP : null;
    nextState.combat.nemesisScaledAttack = encounter && encounter.nemesisScaledAttack ? encounter.nemesisScaledAttack : null;
    nextState.combat.nemesisFirearmDamage = encounter && encounter.nemesisFirearmDamage ? encounter.nemesisFirearmDamage : null;
    nextState.combat.rngSeed = encounter && encounter.nextSeed ? encounter.nextSeed : 1900;
    nextState.combat.selectedCardId = null;
    nextState.combat.inspectCardId = null;
    nextState.combat.inspectPresentation = {
      cardId: null,
      progress: 0,
      targetVisible: false
    };
    nextState.combat.lastPlayedCardName = null;
    nextState.combat.lastPlayedCardStyle = null;
    nextState.combat.lastKillCardName = null;
    nextState.combat.lastKillCardStyle = null;
    nextState.combat.rewardState = {
      relicResolved: false,
      cardResolved: false,
      completed: false,
      lastRelicChoice: null,
      lastCardChoice: null
    };
    nextState.combat.lastAction = nextState.combat.nodeType === "nemesis" ?
      "旧相识拦路复仇。点击卡牌选中，再点击敌人施展。" :
      "遭遇【" + nextState.combat.encounterName + "】。点击卡牌选中，再点击敌人施展。";
    nextState.combat.lastEnemyAction = "";
    nextState.combat.result = "active";
    nextState.combat.goldGranted = 0;
    nextState.combat.nemesisRecorded = false;
    nextState.combat.nemesisResolution = null;
    nextState.combat.seeded = true;
    nextState = G.enemyAI.normalizeEnemies(nextState);
    nextState = G.enemyAI.syncPileCounts(nextState);
    nextState = G.enemyAI.generateIntent(nextState);
    if (G.relicRuntime && typeof G.relicRuntime.applyCombatStart === "function") {
      nextState = G.relicRuntime.applyCombatStart(nextState);
    }
    return nextState;
  }

  function appendActionNote(state, note) {
    var nextState = cloneState(state);

    if (!note) {
      return nextState;
    }

    nextState.combat.lastAction = nextState.combat.lastAction + " " + note;
    return nextState;
  }

  function getDefeatedEnemyEntries(previousState, nextState) {
    var layout = getLayout();
    var previousBoxes = getEnemyBoxes(layout, previousState.combat.enemies);
    var previousById = {};
    var nextById = {};

    previousBoxes.forEach(function (box) {
      previousById[box.enemy.id] = box;
    });
    (nextState.combat.enemies || []).forEach(function (enemy) {
      nextById[enemy.id] = enemy;
    });

    return (previousState.combat.enemies || []).filter(function (enemy) {
      var nextEnemy = nextById[enemy.id];
      return enemy.hp > 0 && nextEnemy && nextEnemy.hp <= 0;
    }).map(function (enemy) {
      return {
        previousEnemy: enemy,
        enemy: nextById[enemy.id],
        box: previousById[enemy.id]
      };
    }).filter(function (entry) {
      return !!entry.box;
    });
  }

  function buildDefeatEchoEntries(previousState, nextState) {
    var defeatedEntries = getDefeatedEnemyEntries(previousState, nextState);
    var slotByEnemyId = {};
    var count = defeatedEntries.length;

    defeatedEntries.slice().sort(function (left, right) {
      var leftCenter = left.box.baseX + left.box.width / 2;
      var rightCenter = right.box.baseX + right.box.width / 2;
      return leftCenter - rightCenter;
    }).forEach(function (entry, index) {
      slotByEnemyId[entry.enemy.id] = count <= 1 ? 0 : (index / (count - 1)) * 2 - 1;
    });

    return defeatedEntries.slice().sort(function (left, right) {
      var leftDepth = left.box.baseY + left.box.height;
      var rightDepth = right.box.baseY + right.box.height;
      var leftCenter = left.box.baseX + left.box.width / 2;
      var rightCenter = right.box.baseX + right.box.width / 2;

      if (leftDepth !== rightDepth) {
        return leftDepth - rightDepth;
      }

      return leftCenter - rightCenter;
    }).map(function (entry, depthIndex) {
      var slot = slotByEnemyId[entry.enemy.id] || 0;
      var retreat = clamp(entry.box.width * 0.22, 34, 64);

      return Object.assign({}, entry, {
        depthIndex: depthIndex,
        slot: slot,
        centerX: entry.box.baseX + entry.box.width / 2,
        centerY: entry.box.baseY + entry.box.height / 2,
        driftX: Math.round(retreat),
        sinkY: -(10 + depthIndex * 2),
        tilt: 0,
        delayMs: depthIndex * 18,
        durationMs: 420 + depthIndex * 36
      });
    });
  }

  function getDefeatEchoDebugSummary(previousState, nextState) {
    return buildDefeatEchoEntries(previousState, nextState).map(function (entry) {
      return {
        enemyId: entry.enemy.id,
        enemyName: entry.enemy.name,
        depthIndex: entry.depthIndex,
        slot: entry.slot,
        x: entry.box.baseX,
        y: entry.box.baseY,
        width: entry.box.width,
        height: entry.box.height,
        slotRole: entry.box.slotRole,
        driftX: entry.driftX,
        sinkY: entry.sinkY,
        tilt: entry.tilt,
        delayMs: entry.delayMs,
        durationMs: entry.durationMs
      };
    });
  }

  function applyEnemyLayoutHold(previousState, nextState) {
    var defeatedEntries = getDefeatedEnemyEntries(previousState, nextState);
    var previousLivingIds = [];
    var survivingCount = 0;

    if (defeatedEntries.length === 0 || nextState.combat.result !== "active") {
      return nextState;
    }

    previousLivingIds = (previousState.combat.enemies || []).filter(function (enemy) {
      return enemy.hp > 0;
    }).map(function (enemy) {
      return enemy.id;
    }).slice(0, 3);
    survivingCount = (nextState.combat.enemies || []).filter(function (enemy) {
      return enemy.hp > 0;
    }).length;

    if (previousLivingIds.length === 0 || survivingCount === 0 || survivingCount >= previousLivingIds.length) {
      return nextState;
    }

    nextState = cloneState(nextState);
    nextState.combat.presentation = Object.assign({
      pendingScene: null,
      transitionMs: 0,
      enemyLayoutHoldMs: 0,
      enemyLayoutEnemyIds: null
    }, nextState.combat.presentation || {});
    nextState.combat.presentation.enemyLayoutHoldMs = 420;
    nextState.combat.presentation.enemyLayoutEnemyIds = previousLivingIds;
    return nextState;
  }

  function emitEnemyDefeatEffects(previousState, nextState) {
    var defeatedEntries = [];

    if (!G.render || !G.render.animations) {
      return;
    }

    defeatedEntries = buildDefeatEchoEntries(previousState, nextState);
    defeatedEntries.forEach(function (entry) {
      var burstX = entry.centerX + entry.driftX * 0.18;
      var burstY = entry.centerY + entry.depthIndex * 4;
      var echoEnemy = Object.assign({}, entry.previousEnemy, {
        hp: 0,
        block: 0
      });

      G.render.animations.spawnImpact({
        scene: "combat",
        tag: "enemy_defeat_burst",
        x: burstX,
        y: burstY,
        color: "#f3d6b5",
        radius: entry.box.width > 240 ? 54 : 42,
        durationMs: 260
      });
      G.render.animations.spawnPulse({
        scene: "combat",
        tag: "enemy_defeat_flash",
        x: burstX,
        y: burstY,
        color: "#f3d6b5",
        radius: entry.box.width > 240 ? 92 : 74,
        lineWidth: 5,
        durationMs: 240
      });
      G.render.animations.spawnDefeatEcho({
        scene: "combat",
        tag: "enemy_defeat_echo",
        x: entry.box.baseX,
        y: entry.box.baseY,
        width: entry.box.width,
        height: entry.box.height,
        slotRole: entry.box.slotRole,
        driftX: entry.driftX,
        sinkY: entry.sinkY,
        tilt: entry.tilt,
        delayMs: entry.delayMs,
        durationMs: entry.durationMs,
        enemy: echoEnemy
      });
    });
  }

  function getVictoryFinishProfile(nodeType) {
    if (nodeType === "gate") {
      return {
        delayMs: 820,
        flashColor: "#f4df9d",
        flashAlpha: 0.24,
        flashDuration: 190,
        shakeX: 16,
        shakeY: 10,
        shakeDuration: 260,
        shakeFrequency: 24,
        headerPulseColor: "#f0d48d",
        headerPulseRadius: 168,
        arenaPulseColor: "#f3c98b",
        arenaPulseRadius: 148,
        playerPulseColor: "#f3ddb2",
        playerPulseRadius: 104
      };
    }

    if (nodeType === "elite") {
      return {
        delayMs: 620,
        flashColor: "#f5d7a2",
        flashAlpha: 0.16,
        flashDuration: 150,
        shakeX: 9,
        shakeY: 6,
        shakeDuration: 220,
        shakeFrequency: 22,
        headerPulseColor: "#e7c782",
        headerPulseRadius: 132,
        arenaPulseColor: "#f1d8aa",
        arenaPulseRadius: 108
      };
    }

    if (nodeType === "nemesis") {
      return {
        delayMs: 700,
        flashColor: "#f2caa6",
        flashAlpha: 0.18,
        flashDuration: 170,
        shakeX: 11,
        shakeY: 7,
        shakeDuration: 230,
        shakeFrequency: 23,
        headerPulseColor: "#f0c28b",
        headerPulseRadius: 146,
        arenaPulseColor: "#e6b885",
        arenaPulseRadius: 120
      };
    }

    return {
      delayMs: 420,
      flashColor: "#f2dcc1",
      flashAlpha: 0.08,
      flashDuration: 120,
      shakeX: 0,
      shakeY: 0,
      shakeDuration: 0,
      shakeFrequency: 0,
      headerPulseColor: null,
      headerPulseRadius: 0,
      arenaPulseColor: null,
      arenaPulseRadius: 0
    };
  }

  function getVictoryResultCopy(nodeType) {
    return G.nemesis.getVictoryCopy(nodeType);
  }

  function emitVictoryFinishEffects(state) {
    var layout = getLayout();
    var profile = getVictoryFinishProfile(state.combat && state.combat.nodeType);
    var headerCenterX = layout.headerPanel.x + layout.headerPanel.width / 2;
    var headerCenterY = layout.headerPanel.y + layout.headerPanel.height / 2;
    var arenaCenterX = 960;
    var arenaCenterY = 304;
    var playerCenterX = layout.playerPanel.x + layout.playerPanel.width / 2;
    var playerCenterY = layout.playerPanel.y + layout.playerPanel.height / 2;

    if (!G.render || !G.render.animations) {
      return profile;
    }

    if (profile.flashAlpha > 0) {
      G.render.animations.spawnScreenFlash({
        scene: "combat",
        tag: "victory_finish_flash",
        color: profile.flashColor,
        maxAlpha: profile.flashAlpha,
        durationMs: profile.flashDuration
      });
    }

    if (profile.shakeDuration > 0) {
      G.render.animations.spawnShake({
        scene: "combat",
        tag: "victory_finish_shake",
        amplitudeX: profile.shakeX,
        amplitudeY: profile.shakeY,
        durationMs: profile.shakeDuration,
        frequency: profile.shakeFrequency
      });
    }

    if (profile.headerPulseRadius > 0) {
      G.render.animations.spawnPulse({
        scene: "combat",
        tag: "victory_finish_header",
        x: headerCenterX,
        y: headerCenterY,
        color: profile.headerPulseColor,
        radius: profile.headerPulseRadius,
        lineWidth: 5,
        durationMs: 260
      });
    }

    if (profile.arenaPulseRadius > 0) {
      G.render.animations.spawnPulse({
        scene: "combat",
        tag: "victory_finish_arena",
        x: arenaCenterX,
        y: arenaCenterY,
        color: profile.arenaPulseColor,
        radius: profile.arenaPulseRadius,
        lineWidth: 4,
        durationMs: 260
      });
    }

    if (profile.playerPulseRadius > 0) {
      G.render.animations.spawnPulse({
        scene: "combat",
        tag: "victory_finish_player",
        x: playerCenterX,
        y: playerCenterY,
        color: profile.playerPulseColor,
        radius: profile.playerPulseRadius,
        lineWidth: 4,
        durationMs: 240
      });
    }

    return profile;
  }

  function queueVictoryRewardTransition(state) {
    var nextState = state;
    var profile = null;

    if (nextState.combat &&
      nextState.combat.presentation &&
      nextState.combat.presentation.pendingScene === "reward") {
      return nextState;
    }

    profile = emitVictoryFinishEffects(nextState);
    nextState = primeRewardPreview(nextState);
    return queueCombatSceneTransition(nextState, "reward", profile.delayMs);
  }

  function applySelectedCardEffect(previousState, nextState, targetEnemyId, hitTrace) {
    var selectedId = previousState.combat.selectedCardId;
    var playedCard = previousState.combat.hand.find(function (card) {
      return card.id === selectedId;
    });
    var template = playedCard ? getCardTemplate(previousState, playedCard.name) : null;
    var enemy = previousState.combat.enemies.find(function (item) {
      return item.id === targetEnemyId;
    });
    var afterEffect = nextState;
    function dealDamage(amount) {
      var beforeHit = hitTrace ? cloneState(afterEffect) : null;
      afterEffect = G.relicRuntime.applyPlayerDamage(afterEffect, targetEnemyId, amount);
      if (hitTrace) hitTrace.push({ before: beforeHit, after: cloneState(afterEffect) });
    }
    var consumed = null;
    var baseBlock = 0;
    var damageValue = 0;
    var ironBoneTriggered = false;
    var whetstoneBonus = G.relicRuntime && typeof G.relicRuntime.getUpgradedCardBonus === "function" ?
      G.relicRuntime.getUpgradedCardBonus(previousState, template) :
      { damage: 0, block: 0 };
    var hadFester = !!G.statusEffects &&
      typeof G.statusEffects.getFester === "function" &&
      G.statusEffects.getFester(enemy) > 0;

    if (!template || !enemy || enemy.hp <= 0) {
      return nextState;
    }

    if (template.block) {
      baseBlock += template.block;
    }
    if (template.bonusBlockIfBlocked && previousState.player.block > 0) {
      baseBlock += template.bonusBlockIfBlocked;
    }
    if (whetstoneBonus.block) {
      baseBlock += whetstoneBonus.block;
    }
    if (baseBlock > 0) {
      afterEffect = G.enemyAI.gainPlayerBlock(afterEffect, baseBlock);
    }

    ironBoneTriggered = !!G.statusEffects &&
      typeof G.statusEffects.isIronBoneActive === "function" &&
      G.statusEffects.isIronBoneActive(afterEffect);

    if (ironBoneTriggered && template.ironBoneBlock) {
      afterEffect = G.enemyAI.gainPlayerBlock(afterEffect, template.ironBoneBlock);
    }

    if (template.damage) {
      damageValue = template.damage;
      if (
        template.executeThreshold &&
        template.executeDamage &&
        enemy.maxHp > 0 &&
        enemy.hp / enemy.maxHp < template.executeThreshold
      ) {
        damageValue = template.executeDamage;
      }
      if (template.hits && template.hits > 1) {
        var hitIndex = 0;
        for (hitIndex = 0; hitIndex < template.hits; hitIndex += 1) {
          dealDamage(damageValue);
        }
      } else {
        dealDamage(damageValue);
      }
    }

    if (template.damageFromCurrentBlock) {
      dealDamage(afterEffect.player.block || 0);
    }

    if (ironBoneTriggered && template.ironBoneDamage) {
      dealDamage(template.ironBoneDamage);
    }

    if (template.flaw) {
      afterEffect = G.statusEffects.applyFlaw(afterEffect, targetEnemyId, template.flaw);
    }

    if (template.fester) {
      afterEffect = G.statusEffects.applyFester(afterEffect, targetEnemyId, template.fester);
    }

    if (template.blind) {
      afterEffect = G.statusEffects.applyBlind(afterEffect, targetEnemyId, template.blind);
    }

    if (template.crippleTurns) {
      afterEffect = G.statusEffects.applyCripple(afterEffect, targetEnemyId, template.crippleTurns);
    }

    if (template.consumeFlaw) {
      consumed = G.statusEffects.consumeFlaw(afterEffect, targetEnemyId);
      afterEffect = consumed.state;

      if (template.damagePerFlaw && consumed.amount > 0) {
        dealDamage(consumed.amount * template.damagePerFlaw);
      }
    }

    if (template.consumeFester) {
      consumed = G.statusEffects.consumeFester(afterEffect, targetEnemyId);
      afterEffect = consumed.state;

      if (template.damagePerFester && consumed.amount > 0) {
        dealDamage(consumed.amount * template.damagePerFester);
      }
    }

    if (template.bonusDamageIfTargetHasFester && hadFester) {
      dealDamage(template.bonusDamageIfTargetHasFester);
    }

    if (whetstoneBonus.damage) {
      dealDamage(whetstoneBonus.damage);
    }

    if (template.draw) {
      afterEffect = G.enemyAI.drawCards(afterEffect, template.draw);
    }

    if (ironBoneTriggered && template.ironBoneDraw) {
      afterEffect = G.enemyAI.drawCards(afterEffect, template.ironBoneDraw);
    }

    if (template.selfDamage) {
      // A card's fixed HP price is paid even while guarded; it is not an
      // incoming attack and must not spend the player's current stance.
      afterEffect.player.hp = Math.max(0, afterEffect.player.hp - template.selfDamage);
    }

    if (G.enemyAI && typeof G.enemyAI.refreshIntentsForDebuffs === "function") {
      afterEffect = G.enemyAI.refreshIntentsForDebuffs(afterEffect);
    }

    if (ironBoneTriggered) {
      afterEffect = appendActionNote(afterEffect, "铁骨激活。");
    }
    if (whetstoneBonus.damage || whetstoneBonus.block) {
      afterEffect = appendActionNote(afterEffect, "磨刀石添了一手狠劲。");
    }

    afterEffect = G.enemyAI.checkBattleOutcome(afterEffect);
    afterEffect = applyEnemyLayoutHold(previousState, afterEffect);
    afterEffect = G.deck.refreshHandPlayability(afterEffect);
    if (!hitTrace) emitEnemyDefeatEffects(previousState, afterEffect);

    if (afterEffect.combat.result === "victory") {
      afterEffect.combat.lastKillCardName = template.name;
      afterEffect.combat.lastKillCardStyle = template.style || previousState.combat.lastPlayedCardStyle || null;
      if (hitTrace) return queueCombatSceneTransition(primeRewardPreview(afterEffect), "reward", 520);
      return queueVictoryRewardTransition(afterEffect);
    }

    return afterEffect;
  }

  var preparedCombatStates = new WeakSet();
  function layoutState(state) {
    // Layout queries only read already-seeded combat snapshots. Playback views
    // have been copied, so they cannot retain the WeakSet preparation identity.
    // Re-running rule preparation here cloned the entire journey several times
    // per animation frame. Incomplete callers still get the legacy preparation.
    var combat = state && state.combat;
    return combat && combat.seeded && combat.presentation &&
      Array.isArray(combat.hand) && Array.isArray(combat.enemies) ? state : ensureSampleState(state);
  }
  function ensureSampleState(state) {
    if (preparedCombatStates.has(state)) return state;
    var nextState = cloneState(state);

    nextState.player = nextState.player || {};
    nextState.player.hp = typeof nextState.player.hp === "number" ? nextState.player.hp : 80;
    nextState.player.maxHp = typeof nextState.player.maxHp === "number" ? nextState.player.maxHp : 80;
    nextState.player.poisonTurns = typeof nextState.player.poisonTurns === "number" ? nextState.player.poisonTurns : 0;
    nextState.player.energy = typeof nextState.player.energy === "number" ? nextState.player.energy : 3;
    nextState.player.maxEnergy = typeof nextState.player.maxEnergy === "number" ? nextState.player.maxEnergy : 3;
    nextState.player.block = typeof nextState.player.block === "number" ? nextState.player.block : 0;
    nextState.player.gold = typeof nextState.player.gold === "number" ? nextState.player.gold : 100;
    nextState.player.deckSize = typeof nextState.player.deckSize === "number" ? nextState.player.deckSize : 12;
    nextState.player.chosenStyle = nextState.player.chosenStyle || "blade";

    nextState.combat = nextState.combat || {};
    nextState.combat.ui = nextState.combat.ui || { overlay: null };
    nextState.combat.playedCards = Array.isArray(nextState.combat.playedCards) ? nextState.combat.playedCards : [];
    nextState.combat.lastPlayedCardName = nextState.combat.lastPlayedCardName || null;
    nextState.combat.lastPlayedCardStyle = nextState.combat.lastPlayedCardStyle || null;
    nextState.combat.lastKillCardName = nextState.combat.lastKillCardName || null;
    nextState.combat.lastKillCardStyle = nextState.combat.lastKillCardStyle || null;
    nextState.combat.nemesisRecorded = !!nextState.combat.nemesisRecorded;
    nextState.combat.rewardState = Object.assign({
      relicResolved: false,
      cardResolved: false,
      completed: false,
      lastRelicChoice: null,
      lastCardChoice: null
    }, nextState.combat.rewardState || {});
    nextState.combat.presentation = Object.assign({
      pendingScene: null,
      transitionMs: 0,
      enemyLayoutHoldMs: 0,
      enemyLayoutEnemyIds: null
    }, nextState.combat.presentation || {});
    nextState.combat.inspectPresentation = Object.assign({
      cardId: null,
      progress: 0,
      targetVisible: false
    }, nextState.combat.inspectPresentation || {});

    if (!nextState.combat.seeded) {
      nextState = buildStarterCombatState(nextState);
    }

    nextState = G.enemyAI.normalizeEnemies(nextState);
    nextState.combat.enemies = nextState.combat.enemies.map(function (enemy) {
      var nextEnemy = cloneState(enemy);
      nextEnemy.openingPortrait=nextState.combat.encounterId==='street_intro'&&!nextState.map?.currentNodeId;
      return G.statusEffects.ensureEnemyDebuffs(nextEnemy);
    });

    if (G.statusEffects && typeof G.statusEffects.ensurePlayerStatuses === "function") {
      nextState = G.statusEffects.ensurePlayerStatuses(nextState);
    }

    nextState = G.deck.refreshHandPlayability(nextState);
    preparedCombatStates.add(nextState);
    return nextState;
  }

  function getLayout() {
    var mobile = !!window.KGAME_MOBILE;
    var layout = {
      enemyPresets: G.render.woodcut?.combatPresentation?.enemyPresets || {
        1: [
          { x: 812, y: 84, width: 378, height: 414, z: 0 }
        ],
        2: [
          { x: 766, y: 84, width: 225, height: 414, z: 0 },
          { x: 1003, y: 84, width: 225, height: 414, z: 1 }
        ],
        3: [
          { x: 660, y: 84, width: 184, height: 414, z: 0 },
          { x: 856, y: 84, width: 184, height: 414, z: 1 },
          { x: 1052, y: 84, width: 184, height: 414, z: 2 }
        ]
      },
      handStartX: 244,
      handCenterX: mobile ? 650 : 642,
      handY: mobile ? 414 : 494,
      handFanAngle: mobile ? 0.045 : 0.072,
      handLift: 0,
      handEdgeDrop: mobile ? 12 : 24,
      cardWidth: mobile ? 198 : 126,
      cardHeight: mobile ? 276 : 176,
      handSpreadStep: mobile ? 162 : 118,
      handSpreadLimit: mobile ? 648 : 500,
      cardGap: 8,
      playerPanel: { x: 36, y: 450, width: 210, height: 148 },
      drawPile: { x: 34, y: 596, width: 60, height: 84 },
      discardPile: { x: 1190, y: 596, width: 60, height: 84 },
      endTurn: mobile ? { x: 1094, y: 485, width: 160, height: 86 } : { x: 982, y: 558, width: 182, height: 86 },
      cheatCuff: { x: 104, y: 622, width: 132, height: 34 },
      overlay: { x: 12, y: 126, width: 228, height: 262 },
      encounterTitle: { x: 640, y: 56, align: "center" },
      encounterSubtitle: { x: 640, y: 88, align: "center" },
      message: { x: 378, y: 468, width: 524, height: 24 },
      result: { x: 410, y: 248, width: 460, height: 120 },
      relicPanel: { x: 34, y: 404, width: 204, height: 44 },
      relicBadge: { width: 28, height: 28, gap: 5 },
      hudRail: { x: 24, y: 124, width: 304, height: 508 },
      threatRail: { x: 772, y: 122, width: 468, height: 334 },
      headerPanel: { x: 520, y: 22, width: 240, height: 52 }
    };
    if (mobile) {
      // Account for the display canvas rounding down to a whole CSS pixel.
      var touchHeight=Math.max(88,Math.ceil(44/Math.min(window.innerWidth/1280,window.innerHeight/720))+2);
      layout.enemyPresets = {
        1: [{x:812,y:70,width:378,height:318,z:0}],
        2: [{x:774,y:64,width:190,height:254,z:0},{x:996,y:48,width:260,height:340,z:1}],
        3: [{x:664,y:70,width:170,height:244,z:0},{x:850,y:60,width:184,height:286,z:1},{x:1036,y:50,width:230,height:336,z:2}]
      };
      layout.playerPanel = {x:36,y:446,width:264,height:166};
      layout.handCenterX = 690;
      layout.handSpreadStep = 142;
      layout.handSpreadLimit = 548;
      layout.drawPile = {x:36,y:Math.min(610,708-touchHeight),width:112,height:touchHeight};
      layout.discardPile = {x:1150,y:Math.min(610,708-touchHeight),width:112,height:touchHeight};
      layout.endTurn = {x:1084,y:482,width:176,height:112};
      layout.cheatCuff = {x:164,y:Math.min(610,708-touchHeight),width:136,height:touchHeight};
      layout.combatDetails = {x:36,y:92,width:224,height:touchHeight};
    }
    return layout;
  }

  function getEnemySlotRole(slotCount, slotIndex) {
    if (!slotCount || slotCount <= 1) {
      return "front";
    }
    if (slotCount === 2) {
      return slotIndex <= 0 ? "rear" : "front";
    }
    if (slotIndex <= 0) {
      return "rear";
    }
    if (slotIndex >= slotCount - 1) {
      return "front";
    }
    return "mid";
  }

  function getEnemyThreatVisualStyle(enemy) {
    var behavior = enemy && enemy.behavior ? enemy.behavior : "";
    var firearmStage = enemy && enemy.firearmStage ? enemy.firearmStage : "none";

    if (enemy && /刺刀|连刺/.test(enemy.intentLabel || '')) return 'bayonet';

    if (firearmStage && firearmStage !== "none" ||
      behavior === "rifle_scout" ||
      behavior === "mack" ||
      behavior === "nemesis") {
      return "firearm";
    }
    if (behavior === "boxer" || behavior === "boxer_leader") {
      return "blunt";
    }
    if (behavior === "bayonet_scout") {
      return "bayonet";
    }
    if (behavior === "city_tracker" ||
      behavior === "guard_chief") {
      return "blade";
    }
    return "blade";
  }

  function getEnemyThreatAnchor(box) {
    var enemy = box && box.enemy ? box.enemy : null;
    var slotRole = box && box.slotRole ? box.slotRole : getEnemySlotRole(
      box && typeof box.slotCount === "number" ? box.slotCount : (enemy && enemy.slotCount ? enemy.slotCount : 1),
      box && typeof box.formationIndex === "number" ? box.formationIndex : (enemy && typeof enemy.slotIndex === "number" ? enemy.slotIndex : 0)
    );
    var threatStyle = getEnemyThreatVisualStyle(enemy);
    var forwardPull = slotRole === "front" ? 0.06 : (slotRole === "mid" ? 0.03 : 0);
    var xRatio = threatStyle === "firearm" ? 0.62 : (threatStyle === "bayonet" ? 0.6 : (threatStyle === "blunt" ? 0.56 : 0.58));
    var yRatio = threatStyle === "firearm" ? 0.38 : (threatStyle === "bayonet" ? 0.42 : (threatStyle === "blunt" ? 0.54 : 0.46));

    return {
      x: Math.round(box.x + box.width * (xRatio - forwardPull)),
      y: Math.round(box.y + box.height * yRatio)
    };
  }

  function getPlayerThreatFocusPoint(playerFrame, threatStyle) {
    var frame = playerFrame || getPlayerStageFrame(1);
    var style = threatStyle || "blade";
    var xShift = style === "firearm" ? 10 : (style === "bayonet" ? 18 : 24);
    var yLift = style === "firearm" ? 0.66 : (style === "bayonet" ? 0.54 : (style === "blunt" ? 0.46 : 0.5));

    return {
      x: Math.round(frame.silhouetteCenterX + xShift),
      y: Math.round(frame.silhouetteBaseY - frame.silhouetteScale * yLift)
    };
  }

  function isInside(point, box) {
    var x = typeof box.hitX === "number" ? box.hitX : box.x;
    var y = typeof box.hitY === "number" ? box.hitY : box.y;
    var width = typeof box.hitWidth === "number" ? box.hitWidth : box.width;
    var height = typeof box.hitHeight === "number" ? box.hitHeight : box.height;

    return point.x >= x &&
      point.x <= x + width &&
      point.y >= y &&
      point.y <= y + height;
  }

  function getPointerFrame() {
    return G.main && typeof G.main.consumePointerFrame === "function" ?
      G.main.consumePointerFrame() :
      null;
  }

  function getEnemyFormationLock(state) {
    if(G.scenes.combat.feedback?.reflowOwns?.(state.combat.enemies))return null;
    var presentation = state && state.combat ? state.combat.presentation : null;
    var ids = presentation && Array.isArray(presentation.enemyLayoutEnemyIds) ? presentation.enemyLayoutEnemyIds.slice(0, 3) : null;

    if (!ids || ids.length === 0 || !(presentation.enemyLayoutHoldMs > 0)) {
      return null;
    }

    return ids;
  }

  function getHandRotationJitter(cardId, index) {
    var text = String(cardId || index || 0);
    var hash = 0;
    var i = 0;

    for (i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }

    return (((hash & 1023) / 1023) * 4 - 2) * (Math.PI / 180);
  }

  function getHandPose(layout, handLength, index, selected, cardId) {
    var safeCount = Math.max(1, handLength);
    var normalized = safeCount === 1 ? 0 : ((index / (safeCount - 1)) * 2 - 1);
    var spreadStep = clamp((layout.handSpreadStep || 118) - Math.max(0, safeCount - 5) * 6, 92, layout.handSpreadStep || 118);
    var spreadWidth = (safeCount - 1) * spreadStep;
    // Drawing/combo builds can hold far more than the opening five cards.
    // Keep every card on the stage without moving the accepted opening fan.
    var spreadLimit = layout.handSpreadLimit || 500;
    if ((window.KGAME_MOBILE || safeCount > 7) && spreadWidth > spreadLimit) {
      spreadStep = spreadLimit / (safeCount - 1);
      spreadWidth = spreadLimit;
    }
    var centerLift = (1 - Math.abs(normalized)) * 18;
    var jitter = getHandRotationJitter(cardId, index);
    var centerX = layout.handCenterX - spreadWidth / 2 + index * spreadStep;
    var centerY = layout.handY + layout.cardHeight / 2 +
      Math.abs(normalized) * layout.handEdgeDrop -
      centerLift -
      (selected ? 26 : 0);
    var rotation = normalized * layout.handFanAngle + jitter;
    var cosine = Math.abs(Math.cos(rotation));
    var sine = Math.abs(Math.sin(rotation));
    var hitWidth = layout.cardWidth * cosine + layout.cardHeight * sine + 12;
    var hitHeight = layout.cardWidth * sine + layout.cardHeight * cosine + 12;

    return {
      x: centerX - layout.cardWidth / 2,
      y: centerY - layout.cardHeight / 2,
      width: layout.cardWidth,
      height: layout.cardHeight,
      centerX: centerX,
      centerY: centerY,
      rotation: rotation,
      scale: selected ? 1.04 : 1,
      hitX: centerX - hitWidth / 2,
      hitY: centerY - hitHeight / 2,
      hitWidth: hitWidth,
      hitHeight: hitHeight
    };
  }

  function getHandBoxes(layout, hand, selectedCardId) {
    var shown = G.scenes.combat.feedback?.inputHand(hand) || hand;
    return shown.map(function (card, index) {
      var selected = card.id === selectedCardId;
      var pose = getHandPose(layout, shown.length, index, selected, card.id);

      return {
        cardId: card.id,
        index: hand.indexOf(card),
        x: pose.x,
        y: pose.y,
        width: pose.width,
        height: pose.height,
        centerX: pose.centerX,
        centerY: pose.centerY,
        rotation: pose.rotation,
        scale: pose.scale,
        hitX: pose.hitX,
        hitY: pose.hitY,
        hitWidth: pose.hitWidth,
        hitHeight: pose.hitHeight
      };
    });
  }

  function findHandCardAtPoint(state, handBoxes, point) {
    var i = 0;
    var arriving = G.render.animations.getActiveCardMoveCardIds("combat", "draw_card_move");

    for (i = handBoxes.length - 1; i >= 0; i -= 1) {
      if (!arriving[handBoxes[i].cardId] && isInside(point, handBoxes[i])) {
        return {
          card: state.combat.hand[handBoxes[i].index],
          box: handBoxes[i]
        };
      }
    }

    return null;
  }

  function getEnemyBoxes(layout, enemies, lockedEnemyIds) {
    var living = [];
    var livingById = {};
    var usedIds = {};
    var presets = null;

    enemies.forEach(function (enemy, index) {
      if (enemy.hp > 0) {
        livingById[enemy.id] = {
          enemy: enemy,
          index: index
        };
      }
    });

    if (Array.isArray(lockedEnemyIds) && lockedEnemyIds.length > 0) {
      lockedEnemyIds.slice(0, 3).forEach(function (enemyId, formationIndex) {
        var entry = livingById[enemyId];

        if (!entry) {
          return;
        }

        usedIds[enemyId] = true;
        living.push({
          enemy: entry.enemy,
          index: entry.index,
          formationIndex: formationIndex
        });
      });

      Object.keys(livingById).forEach(function (enemyId) {
        var nextSlot = 0;

        if (usedIds[enemyId]) {
          return;
        }

        while (living.some(function (entry) {
          return entry.formationIndex === nextSlot;
        })) {
          nextSlot += 1;
        }

        living.push({
          enemy: livingById[enemyId].enemy,
          index: livingById[enemyId].index,
          formationIndex: nextSlot
        });
      });
    } else {
      enemies.forEach(function (enemy, index) {
        if (enemy.hp > 0) {
          living.push({
            enemy: enemy,
            index: index,
            formationIndex: living.length
          });
        }
      });
    }

    presets = layout.enemyPresets[Math.max(1, Math.min(3, (Array.isArray(lockedEnemyIds) && lockedEnemyIds.length > 0) ? lockedEnemyIds.length : (living.length || 1)))];

    return living.slice(0, 3).map(function (entry, index) {
      var presetIndex = typeof entry.formationIndex === "number" ? entry.formationIndex : index;
      var preset = presets[Math.max(0, Math.min(presets.length - 1, presetIndex))];
      var renderDepth = typeof preset.z === "number" ? preset.z : presetIndex;
      var staggerOffset = G.render &&
        G.render.animations &&
        typeof G.render.animations.getStaggerOffset === "function" ?
        G.render.animations.getStaggerOffset("combat", entry.enemy.id) :
        { x: 0, y: 0 };

      var box = {
        enemy: entry.enemy,
        index: entry.index,
        formationIndex: presetIndex,
        x: preset.x + (staggerOffset.x || 0),
        y: preset.y + (staggerOffset.y || 0),
        baseX: preset.x,
        baseY: preset.y,
        hitX: window.KGAME_MOBILE ? preset.x : undefined,
        hitY: window.KGAME_MOBILE ? 18 : undefined,
        hitWidth: window.KGAME_MOBILE ? preset.width : undefined,
        hitHeight: window.KGAME_MOBILE ? 396 : undefined,
        width: preset.width,
        height: preset.height,
        zIndex: renderDepth,
        slotRole: getEnemySlotRole(presets.length, presetIndex)
      };
      return G.scenes.combat.feedback?.layoutBox ? G.scenes.combat.feedback.layoutBox(box,enemies) : box;
    });
  }

  function findEnemyBoxAtPoint(enemyBoxes, point) {
    var i = 0;

    for (i = enemyBoxes.length - 1; i >= 0; i -= 1) {
      if (isInside(point, enemyBoxes[i])) {
        return enemyBoxes[i];
      }
    }

    return null;
  }

  function findCardBoxById(handBoxes, cardId) {
    var i = 0;

    for (i = 0; i < handBoxes.length; i += 1) {
      if (handBoxes[i].cardId === cardId) {
        return handBoxes[i];
      }
    }

    return null;
  }

  function buildDraggedCard(card) {
    return {
      artRole: "combat",
      cost: card.cost,
      name: card.name,
      playable: card.playable,
      text: card.text,
      comboTag: card.comboTag,
      comboDiscounted: card.comboDiscounted,
      style: card.style
    };
  }

  function getStyleEffectPalette(style) {
    // 【视觉重制】：极其暴力的极高对比度（纯白、铁灰、惨绿、血红）
    var palettes = {
      blade: { slash: "#ffffff", accent: "#ff0000", impact: "#ff3333" }, // 银白刀光，喷射鲜血
      iron: { slash: "#a0a0a0", accent: "#202020", impact: "#cccccc" },   // 沉重黑铁
      dirty: { slash: "#99cc00", accent: "#445500", impact: "#ccff33" },  // 刺目惨绿
      combo: { slash: "#ffaa00", accent: "#882200", impact: "#ffcc00" },  // 炽热火花
      basic: { slash: "#dddddd", accent: "#880000", impact: "#ffffff" }
    };

    return palettes[style] || palettes.basic;
  }

  function getPileGhostPosition(pileBox, width, height, scale) {
    var appliedScale = scale || 1;

    return {
      x: pileBox.x + pileBox.width / 2 - (width * appliedScale) / 2,
      y: pileBox.y + pileBox.height / 2 - (height * appliedScale) / 2
    };
  }

  function emitHandTransitionEffects(previousState, nextState, config) {
    var layout = getLayout();
    var options = config || {};
    var previousHand = previousState && previousState.combat ? previousState.combat.hand || [] : [];
    var nextHand = nextState && nextState.combat ? nextState.combat.hand || [] : [];
    var previousBoxes = getHandBoxes(layout, previousHand, previousState && previousState.combat ? previousState.combat.selectedCardId : null);
    var nextBoxes = getHandBoxes(layout, nextHand, nextState && nextState.combat ? nextState.combat.selectedCardId : null);
    var previousById = {};
    var nextById = {};
    var discardTarget = getPileGhostPosition(layout.discardPile, layout.cardWidth, layout.cardHeight, 0.72);
    var drawOrigin = getPileGhostPosition(layout.drawPile, layout.cardWidth, layout.cardHeight, 0.72);
    var discardCenterX = layout.discardPile.x + layout.discardPile.width / 2;
    var discardCenterY = layout.discardPile.y + layout.discardPile.height / 2;
    var drawCenterX = layout.drawPile.x + layout.drawPile.width / 2;
    var drawCenterY = layout.drawPile.y + layout.drawPile.height / 2;
    var discardIndex = 0;
    var drawIndex = 0;

    if (!G.render || !G.render.animations || nextState.scene !== "combat") {
      return;
    }

    previousBoxes.forEach(function (box) {
      previousById[box.cardId] = {
        box: box,
        card: previousHand[box.index]
      };
    });
    nextBoxes.forEach(function (box) {
      nextById[box.cardId] = {
        box: box,
        card: nextHand[box.index]
      };
    });

    Object.keys(previousById).forEach(function (cardId) {
      var entry = null;

      if (nextById[cardId]) {
        return;
      }

      entry = previousById[cardId];
      G.render.animations.spawnCardMove({
        scene: "combat",
        tag: "discard_card_move",
        cardId: entry.card.id,
        card: buildDraggedCard(entry.card),
        fromX: entry.box.x,
        fromY: entry.box.y,
        toX: discardTarget.x + Math.min(10, discardIndex * 4),
        toY: discardTarget.y + Math.min(6, discardIndex * 2),
        fromRotation: entry.box.rotation || 0,
        toRotation: 0.16,
        fromScale: entry.box.scale || 1,
        toScale: 0.72,
        fromAlpha: 1,
        toAlpha: 1,
        arcHeight: 10,
        popScale: 0,
        width: layout.cardWidth,
        height: layout.cardHeight,
        durationMs: 300,
        delayMs: (options.discardDelayMs || 0) + discardIndex * 22
      });
      G.render.animations.spawnPulse({
        scene: "combat",
        tag: "discard_pile",
        x: discardCenterX,
        y: discardCenterY,
        color: "#c68d79",
        radius: 34,
        lineWidth: 3,
        durationMs: 220,
        delayMs: (options.discardDelayMs || 0) + discardIndex * 22
      });
      discardIndex += 1;
    });

    Object.keys(nextById).forEach(function (cardId) {
      var entry = null;

      if (previousById[cardId]) {
        return;
      }

      entry = nextById[cardId];
      G.render.animations.spawnCardMove({
        scene: "combat",
        tag: "draw_card_move",
        cardId: entry.card.id,
        card: buildDraggedCard(entry.card),
        fromX: drawOrigin.x,
        fromY: drawOrigin.y,
        toX: entry.box.x,
        toY: entry.box.y,
        fromRotation: -0.08,
        toRotation: entry.box.rotation || 0,
        fromScale: 0.72,
        toScale: entry.box.scale || 1,
        fromAlpha: 1,
        toAlpha: 1,
        arcHeight: 18,
        popScale: 0,
        width: layout.cardWidth,
        height: layout.cardHeight,
        durationMs: 360,
        delayMs: (options.drawDelayMs || 0) + drawIndex * 36
      });
      G.render.animations.spawnPulse({
        scene: "combat",
        tag: "draw_pile",
        x: drawCenterX,
        y: drawCenterY,
        color: "#d7c1a2",
        radius: 30,
        lineWidth: 3,
        durationMs: 220,
        delayMs: (options.drawDelayMs || 0) + drawIndex * 36
      });
      G.render.animations.spawnPulse({
        scene: "combat",
        tag: "draw_arrival_snap",
        x: entry.box.centerX,
        y: entry.box.centerY,
        color: "#efe0c1",
        radius: 28,
        lineWidth: 3,
        durationMs: 180,
        delayMs: (options.drawDelayMs || 0) + drawIndex * 36 + 230
      });
      drawIndex += 1;
    });
  }

  function emitPlayerCardEffects(state, card, sourcePoint, targetBox, template, blockBefore, blockAfter) {
    var layout = getLayout();
    var palette = null;
    var anchors = null;
    var attackSourceX = 0;
    var attackSourceY = 0;
    var targetX = 0;
    var targetY = 0;
    var hitCount = 0;
    var hasTargetEffect = false;
    var i = 0;

    if (!G.render || !G.render.animations || !card || !targetBox) {
      return;
    }

    palette = getStyleEffectPalette(card.style);
    anchors = getPlayerEngagementAnchors(
      card.style,
      state && state.combat && Array.isArray(state.combat.enemies) ?
        state.combat.enemies.filter(function (enemy) { return enemy.hp > 0; }).length :
        1
    );
    attackSourceX = anchors.attack.x;
    attackSourceY = anchors.attack.y;
    targetX = targetBox.x + targetBox.width / 2;
    targetY = targetBox.y + targetBox.height / 2;
    hitCount = Math.max(1, Number(template && template.hits) || 1);
    hasTargetEffect = !!(
      (template && template.damage) ||
      (template && template.damageFromCurrentBlock) ||
      (template && template.ironBoneDamage) ||
      (template && template.flaw) ||
      (template && template.fester) ||
      (template && template.blind) ||
      (template && template.crippleTurns) ||
      (template && template.consumeFlaw) ||
      (template && template.consumeFester) ||
      (template && template.bonusDamageIfTargetHasFester)
    );

    if (hasTargetEffect) {
      G.render.animations.spawnSlash({
        scene: "combat",
        tag: "player_hit_slash",
        sourceKey: "player",
        targetKey: targetBox.enemy.id,
        fromX: attackSourceX,
        fromY: attackSourceY,
        toX: targetX,
        toY: targetY,
        color: palette.slash,
        accent: palette.accent,
        width: card.style === "combo" ? 6 : 9
      });

      for (i = 0; i < hitCount; i += 1) {
        G.render.animations.spawnImpact({
          scene: "combat",
          tag: "player_hit_impact",
          sourceKey: "player",
          targetKey: targetBox.enemy.id,
          sourceX: attackSourceX,
          sourceY: attackSourceY,
          x: targetX + (hitCount > 1 ? (i - (hitCount - 1) / 2) * 14 : 0),
          y: targetY + (hitCount > 1 ? (i % 2 === 0 ? -8 : 8) : 0),
          color: palette.impact,
          radius: card.style === "combo" ? 28 : 42,
          durationMs: card.style === "combo" ? 220 : 300
        });
      }

      G.render.animations.spawnStagger({
        scene: "combat",
        tag: "enemy_hit_stagger",
        sourceKey: "player",
        targetKey: targetBox.enemy.id,
        sourceX: attackSourceX,
        sourceY: attackSourceY,
        targetX: targetX,
        targetY: targetY,
        amplitudeX: hitCount > 1 ? 24 : 18,
        amplitudeY: card.style === "combo" ? 6 : 4,
        durationMs: card.style === "combo" ? 260 : 220
      });
    }

    if ((blockAfter || 0) > (blockBefore || 0)) {
      G.render.animations.spawnPulse({
        scene: "combat",
        x: layout.playerPanel.x + layout.playerPanel.width / 2,
        y: layout.playerPanel.y + layout.playerPanel.height / 2,
        color: "#b9d8ef",
        radius: 58,
        lineWidth: 5
      });
    }
  }

  function emitEnemyTurnEffects(previousState) {
    var layout = getLayout();
    var enemyBoxes = getEnemyBoxes(layout, previousState.combat.enemies);
    var playerAnchors = getPlayerEngagementAnchors(
      previousState && previousState.player ? previousState.player.chosenStyle : "basic",
      Array.isArray(previousState && previousState.combat ? previousState.combat.enemies : null) ?
        previousState.combat.enemies.filter(function (enemy) { return enemy.hp > 0; }).length :
        1
    );
    var playerCenterX = playerAnchors.defend.x;
    var playerCenterY = playerAnchors.defend.y;

    if (!G.render || !G.render.animations) {
      return;
    }

    enemyBoxes.forEach(function (box) {
      var data = Object.assign({}, box.enemy.intentData || {});
      var attackStyle = data.firearm ? "firearm" : getEnemyThreatVisualStyle(box.enemy);
      var threatAnchor = getEnemyThreatAnchor(box);
      var sourceX = threatAnchor.x;
      var sourceY = threatAnchor.y;
      var muzzleX = sourceX + Math.min(40, box.width * 0.12);
      var muzzleY = sourceY - Math.min(20, box.height * 0.08);

      if (box.enemy.hp <= 0) return;
      if (data.firearm || data.firearmPrep || data.gunPose) G.render.animations.spawnEnemyAction(box.enemy);
      if (data.firearm && G.render.woodcut) {
        var portraitHeight = Math.min(310,box.height - 82);
        var portraitWidth = Math.min(box.width,portraitHeight * 2 / 3);
        muzzleX = box.x + box.width / 2 - portraitWidth * .44;
        muzzleY = box.y + 32 + portraitHeight * .4;
        if (G.render.woodcut.combatPresentation?.gunMuzzle) {
          var point = G.render.woodcut.combatPresentation.gunMuzzle(box.enemy, box);
          muzzleX = point.x; muzzleY = point.y;
        }
        sourceX = muzzleX; sourceY = muzzleY;
      }

      if (data.block) {
        G.render.animations.spawnPulse({
          scene: "combat",
          tag: "enemy_block_pulse",
          x: sourceX,
          y: sourceY,
          color: "#b9d8ef",
          radius: 46,
          lineWidth: 4,
          durationMs: 240
        });
      }

      if (!data.damage) {
        return;
      }

      G.render.animations.spawnSlash({
        scene: "combat",
        tag: data.firearm ? "enemy_firearm_slash" : "enemy_melee_slash",
        sourceKey: box.enemy.id,
        targetKey: "player",
        fromX: sourceX,
        fromY: sourceY,
        toX: playerCenterX,
        toY: playerCenterY,
        attackStyle: attackStyle,
        color: data.firearm ? "#f6dbc0" : "#d8cbc0",
        accent: data.firearm ? "#d28f58" : "#9a3a42",
        width: data.firearm ? 5 : 8,
        durationMs: data.firearm ? 190 : 240
      });
      G.render.animations.spawnImpact({
        scene: "combat",
        tag: data.firearm ? "enemy_firearm_impact" : "enemy_melee_impact",
        sourceKey: box.enemy.id,
        targetKey: "player",
        sourceX: sourceX,
        sourceY: sourceY,
        x: playerCenterX,
        y: playerCenterY,
        attackStyle: attackStyle,
        color: data.firearm ? "#ffd9b0" : "#f0cdb9",
        radius: data.firearm ? 44 : 34,
        durationMs: 260
      });

      if (data.firearm) {
        G.render.animations.spawnMuzzleFlash({
          scene: "combat",
          tag: "gunshot_muzzle_flash",
          sourceKey: box.enemy.id,
          targetKey: "player",
          x: muzzleX,
          y: muzzleY,
          attackStyle: attackStyle,
          targetX: playerCenterX,
          targetY: playerCenterY,
          radius: data.target === "all" ? 28 : 20,
          durationMs: 260
        });
        G.render.animations.spawnScreenFlash({
          scene: "combat",
          tag: "gunshot_screen_flash",
          color: data.target === "all" ? "#ffe1b8" : "#ffd7ad",
          maxAlpha: data.target === "all" ? 0.09 : 0.04,
          durationMs: 120
        });
        G.render.animations.spawnShake({
          scene: "combat",
          tag: "gunshot_screen_shake",
          amplitudeX: data.target === "all" ? 14 : 10,
          amplitudeY: data.target === "all" ? 8 : 6,
          durationMs: data.target === "all" ? 220 : 180,
          frequency: data.target === "all" ? 26 : 22
        });
      }
    });
  }

  function tryPlayCard(state, card, targetBox, sourcePoint) {
    var template = getCardTemplate(state, card.name) || {};
    var blockBefore = state.player.block || 0;
    var selectedState = null;
    var playedState = null;
    var nextState = null;
    var feedback = G.scenes.combat.feedback;
    var hitTrace = feedback ? [] : null;

    if (feedback && !feedback.acceptsCards()) return state;

    if (!card.playable) {
      G.render.combatInteraction.reject(state,card,'energy');
      return setActionText(state, "体力不足，无法施展【" + card.name + "】。");
    }

    selectedState = state.combat.selectedCardId === card.id ? state : G.deck.toggleSelectedCard(state, card.id);
    var enemyTargeted = G.render.combatInteraction.needsEnemy(template);
    playedState = G.deck.playSelectedCard(selectedState, enemyTargeted ? targetBox.enemy.id : "player", enemyTargeted ? targetBox.enemy.name : "自身");
    if (playedState === selectedState) {
      return selectedState;
    }

    nextState = applySelectedCardEffect(selectedState, playedState, targetBox.enemy.id, hitTrace);
    if (feedback) {
      feedback.presentCard(selectedState, playedState, nextState, card, targetBox, template, hitTrace);
      return nextState;
    }
    emitHandTransitionEffects(selectedState, nextState, {
      discardDelayMs: 70,
      drawDelayMs: 120
    });
    emitPlayerCardEffects(selectedState, card, sourcePoint, targetBox, template, blockBefore, nextState.player.block || 0);
    return nextState;
  }

  function setOverlay(state, title, items, layout) {
    var nextState = cloneState(state);
    nextState.combat.ui.overlay = {
      visible: true,
      title: title,
      items: title === '弃牌堆' ? G.deck.discardDisplayNames(state) : items.slice(),
      x: layout.overlay.x,
      y: layout.overlay.y,
      width: layout.overlay.width,
      height: layout.overlay.height
    };
    return nextState;
  }

  function clearOverlay(state) {
    var nextState = cloneState(state);
    nextState.combat.ui.overlay = null;
    return nextState;
  }

  function setInspectedCard(state, cardId) {
    var nextState = cloneState(state);
    nextState.combat.inspectCardId = cardId || null;
    nextState.combat.inspectPresentation = Object.assign({
      cardId: null,
      progress: 0,
      targetVisible: false
    }, nextState.combat.inspectPresentation || {});
    if (cardId) {
      if (nextState.combat.inspectPresentation.cardId !== cardId) {
        nextState.combat.inspectPresentation.cardId = cardId;
        nextState.combat.inspectPresentation.progress = Math.min(nextState.combat.inspectPresentation.progress || 0, 0.22);
      }
      nextState.combat.inspectPresentation.targetVisible = true;
    } else {
      nextState.combat.inspectPresentation.targetVisible = false;
    }
    return nextState;
  }

  function clearInspectedCard(state) {
    // Pointer movement must not clone/persist an unchanged run every frame.
    // An existing closing fade is still advanced by resolveInspectPresentation.
    if (!state.combat.inspectCardId && !state.combat.inspectPresentation?.targetVisible) return state;
    return setInspectedCard(state, null);
  }

  function getInspectedCombatCard(state) {
    var hand = state && state.combat && Array.isArray(state.combat.hand) ? state.combat.hand : [];
    var selectedCardId = state && state.combat ? state.combat.selectedCardId : null;
    var inspectCardId = state && state.combat ? state.combat.inspectCardId : null;

    return hand.find(function (card) {
      return card.id === inspectCardId;
    }) || null;
  }

  function getCombatHandCardById(state, cardId) {
    var hand = state && state.combat && Array.isArray(state.combat.hand) ? state.combat.hand : [];

    return hand.find(function (card) {
      return card.id === cardId;
    }) || null;
  }

  function getInspectPresentationState(state) {
    var presentation = state && state.combat ? state.combat.inspectPresentation : null;
    var progress = presentation && typeof presentation.progress === "number" ? presentation.progress : 0;

    return {
      cardId: presentation && presentation.cardId ? presentation.cardId : null,
      progress: clamp(progress, 0, 1),
      targetVisible: !!(presentation && presentation.targetVisible)
    };
  }

  function easeInspectOpenProgress(progress) {
    var t = clamp(progress, 0, 1);
    var overshoot = 0.42;
    var curve = overshoot + 1;

    return 1 + curve * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
  }

  function easeInspectCloseProgress(progress) {
    var t = clamp(progress, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function getInspectPreviewBox(layout) {
    var width = 196;
    var height = 264;

    return {
      x: Math.round(layout.handCenterX - width / 2),
      y: 146,
      width: width,
      height: height,
      rotation: 0
    };
  }

  function resolveInspectPresentation(state, input) {
    var combat = state && state.combat ? state.combat : null;
    var presentation = combat ? combat.inspectPresentation : null;
    var visual = getInspectPresentationState(state);
    var inspectedCard = getInspectedCombatCard(state);
    var targetCardId = inspectedCard ? inspectedCard.id : null;
    var nextCardId = visual.cardId;
    var nextProgress = visual.progress;
    var nextTargetVisible = !!targetCardId;
    var deltaMs = Math.max(0, input && typeof input.deltaMs === "number" ? input.deltaMs : 0);
    var openDurationMs = 190;
    var closeDurationMs = 140;
    var changed = false;
    var nextState = state;

    if (!combat) {
      return state;
    }

    if (!nextCardId && !targetCardId && nextProgress <= 0) {
      return state;
    }

    if (targetCardId && nextCardId !== targetCardId) {
      nextCardId = targetCardId;
      nextProgress = nextProgress > 0.22 ? 0.22 : 0;
      changed = true;
    }

    if (targetCardId && nextProgress <= 0) {
      nextProgress = 0.08;
      changed = true;
    }

    if (nextTargetVisible && nextProgress < 1) {
      nextProgress = Math.min(1, nextProgress + deltaMs / openDurationMs);
      changed = true;
    } else if (!nextTargetVisible && nextProgress > 0) {
      nextProgress = Math.max(0, nextProgress - deltaMs / closeDurationMs);
      changed = true;
    }

    if (!nextTargetVisible && nextProgress <= 0) {
      nextCardId = null;
      changed = true;
    }

    if (
      !changed &&
      presentation &&
      presentation.cardId === nextCardId &&
      presentation.progress === nextProgress &&
      presentation.targetVisible === nextTargetVisible
    ) {
      return state;
    }

    nextState = cloneState(state);
    nextState.combat.inspectPresentation = {
      cardId: nextCardId,
      progress: nextProgress,
      targetVisible: nextTargetVisible
    };
    return nextState;
  }

  function toggleOverlay(state, title, items, layout) {
    var overlay = state.combat.ui && state.combat.ui.overlay;

    if (overlay && overlay.visible && overlay.title === title) {
      return clearOverlay(state);
    }

    return setOverlay(state, title, items, layout);
  }

  function setActionText(state, text) {
    var nextState = cloneState(state);
    nextState.combat.lastAction = text;
    return nextState;
  }

  function processClicks(state) {
    var nextState = state;
    var layout = getLayout();
    var clicks = G.main && typeof G.main.consumeClicks === "function" ? G.main.consumeClicks() : [];
    var click = null;
    var handBoxes = null;
    var enemyBoxes = null;
    var clickedCard = null;
    var clickedEnemyBox = null;
    var i = 0;
    var playedState = null;

    if (clicks.length === 0) {
      return state;
    }

    while (clicks.length > 0) {
      if (G.scenes.combat.feedback && G.scenes.combat.feedback.isBusy()) break;
      click = clicks.shift();
      handBoxes = getHandBoxes(layout, nextState.combat.hand, nextState.combat.selectedCardId);
      enemyBoxes = getEnemyBoxes(layout, nextState.combat.enemies, getEnemyFormationLock(nextState));
      clickedCard = null;
      clickedEnemyBox = null;

      if (nextState.combat.result !== "active") {
        if (G.runReport && typeof G.runReport.enter === "function") {
          return G.runReport.enter(nextState, nextState.combat.result);
        }
        continue;
      }

      for (i = 0; i < handBoxes.length; i += 1) {
        if (isInside(click, handBoxes[i])) {
          clickedCard = nextState.combat.hand[handBoxes[i].index];
          break;
        }
      }

      for (i = 0; i < enemyBoxes.length; i += 1) {
        if (isInside(click, enemyBoxes[i])) {
          clickedEnemyBox = enemyBoxes[i];
          break;
        }
      }

      if (isInside(click, layout.drawPile)) {
        nextState = toggleOverlay(nextState, "抽牌堆", nextState.combat.drawPileNames, layout);
        nextState = G.deck.clearSelectedCard(nextState);
        nextState = clearInspectedCard(nextState);
        nextState = setActionText(nextState, "正在查看抽牌堆。");
      } else if (isInside(click, layout.discardPile)) {
        nextState = toggleOverlay(nextState, "弃牌堆", nextState.combat.discardPileNames, layout);
        nextState = G.deck.clearSelectedCard(nextState);
        nextState = clearInspectedCard(nextState);
        nextState = setActionText(nextState, "正在查看弃牌堆。");
      } else if (isInside(click, layout.endTurn)) {
        playedState = nextState;
        nextState = G.enemyAI.resolveEndTurn(nextState);
        emitHandTransitionEffects(playedState, nextState, {
          discardDelayMs: 0,
          drawDelayMs: 230
        });
        if (nextState.combat.result === "victory") {
          nextState = queueVictoryRewardTransition(nextState);
        }
      } else if (clickedCard) {
        nextState = clearOverlay(nextState);
        nextState = setInspectedCard(nextState, clickedCard.id);
        if (!clickedCard.playable) {
          nextState = G.deck.clearSelectedCard(nextState);
          nextState = setActionText(nextState, "体力不足，无法施展【" + clickedCard.name + "】。");
        } else {
          nextState = G.deck.toggleSelectedCard(nextState, clickedCard.id);
          if (nextState.combat.selectedCardId === clickedCard.id) {
            nextState = setActionText(nextState, "已选中【" + clickedCard.name + "】，点击敌人施展。");
          } else {
            nextState = setActionText(nextState, "取消选中【" + clickedCard.name + "】。");
          }
        }
      } else if (clickedEnemyBox) {
        nextState = clearOverlay(nextState);
        if (nextState.combat.selectedCardId) {
          playedState = G.deck.playSelectedCard(nextState, clickedEnemyBox.enemy.id, clickedEnemyBox.enemy.name);
          nextState = applySelectedCardEffect(nextState, playedState, clickedEnemyBox.enemy.id);
        } else {
          nextState = setActionText(nextState, "先选中一张卡牌，再点击敌人。");
        }
      } else {
        nextState = clearOverlay(nextState);
        nextState = G.deck.clearSelectedCard(nextState);
        nextState = clearInspectedCard(nextState);
      }
    }

    return nextState;
  }

  function playCardById(state, cardId, targetEnemyId) {
    var nextState = ensureSampleState(state);
    var card = nextState.combat.hand.find(function (item) {
      return item.id === cardId;
    });
    var enemy = nextState.combat.enemies.find(function (item) {
      return item.id === targetEnemyId;
    });
    var selectedState = null;
    var playedState = null;

    if (
      nextState.combat.result !== "active" ||
      !card ||
      !enemy ||
      enemy.hp <= 0
    ) {
      return nextState;
    }

    if (!card.playable) {
      return setActionText(nextState, "体力不足，无法施展【" + card.name + "】。");
    }

    selectedState = G.deck.toggleSelectedCard(nextState, card.id);
    playedState = G.deck.playSelectedCard(selectedState, enemy.id, enemy.name);
    if (playedState === selectedState) {
      return selectedState;
    }

    nextState = applySelectedCardEffect(selectedState, playedState, enemy.id);
    return nextState;
  }

  function endTurn(state) {
    var nextState = ensureSampleState(state);

    if (nextState.combat.result !== "active") {
      return nextState;
    }

    nextState = G.enemyAI.resolveEndTurn(nextState);
    if (nextState.combat.result === "victory") {
      return queueVictoryRewardTransition(nextState);
    }
    return nextState;
  }

  function renderBackground(ctx) {
    G.render.canvasUtils.clear(ctx, "#141214");

    ctx.save();
    var gradient = ctx.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, "rgba(92, 20, 25, 0.14)");
    gradient.addColorStop(0.55, "rgba(18, 18, 18, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }

  function renderEncounterHeader(ctx, state, layout) {
    var nodeTypeLabels = {
      street: "喋血街头",
      elite: "强敌截杀",
      nemesis: "宿敌复仇",
      gate: "关卡死斗"
    };
    var aliveCount = state.combat.enemies.filter(function (enemy) {
      return enemy.hp > 0;
    }).length;
    var subtitle = (nodeTypeLabels[state.combat.nodeType] || "战斗") + " · 存活敌人 " + aliveCount;

    if (state.combat.nodeType === "nemesis" && state.combat.nemesisTitle) {
      subtitle = nodeTypeLabels.nemesis + " · " +
        state.combat.nemesisTitle +
        " · " +
        (G.nemesis && typeof G.nemesis.getFirearmLabel === "function" ?
          G.nemesis.getFirearmLabel(state.combat.nemesisFirearmStage) :
          "未知火器态");
    }

    G.render.ui.drawLabel(ctx, state.combat.encounterName || "遭遇战", layout.encounterTitle.x, layout.encounterTitle.y, {
      size: 30,
      align: "center",
      color: "#f0e5d6"
    });
    G.render.ui.drawLabel(
      ctx,
      subtitle,
      layout.encounterSubtitle.x,
      layout.encounterSubtitle.y,
      {
        size: 16,
        align: "center",
        color: "#cfc4b5"
      }
    );
  }

  function renderPlayerPanel(ctx, state, layout) {
    var ui = G.render.ui;
    var player = state.player;
    var showIronBone = player.chosenStyle === "iron";
    var comboThreshold = G.statusEffects && typeof G.statusEffects.COMBO_THRESHOLD === "number" ?
      G.statusEffects.COMBO_THRESHOLD :
      3;
    var comboCount = G.statusEffects && typeof G.statusEffects.getComboCount === "function" ?
      G.statusEffects.getComboCount(state) :
      0;
    var comboRemaining = G.statusEffects && typeof G.statusEffects.getComboDiscountsRemaining === "function" ?
      G.statusEffects.getComboDiscountsRemaining(state) :
      0;
    var comboActive = G.statusEffects && typeof G.statusEffects.isComboDiscountActive === "function" ?
      G.statusEffects.isComboDiscountActive(state) :
      false;
    var showCombo = player.chosenStyle === "combo" || comboCount > 0;
    var ironBoneActive = G.statusEffects && typeof G.statusEffects.isIronBoneActive === "function" ?
      G.statusEffects.isIronBoneActive(state) :
      false;
    var poisonTurns = G.statusEffects && typeof G.statusEffects.getPlayerPoisonTurns === "function" ?
      G.statusEffects.getPlayerPoisonTurns(state) :
      0;
    var statusLines = [];
    var statusY = layout.playerPanel.y + 142;

    ui.drawPanel(ctx, layout.playerPanel.x, layout.playerPanel.y, layout.playerPanel.width, layout.playerPanel.height, {
      fill: "rgba(17, 17, 17, 0.94)",
      stroke: "#6b2028"
    });

    ui.drawStatBar(ctx, {
      label: "气血",
      x: layout.playerPanel.x + 14,
      y: layout.playerPanel.y + 34,
      width: layout.playerPanel.width - 28,
      height: 18,
      current: player.hp,
      max: player.maxHp,
      palette: {
        background: "#28191c",
        fill: "#b12034",
        stroke: "#5e2831"
      }
    });

    ui.drawLabel(ctx, "体力 " + player.energy + " / " + player.maxEnergy, layout.playerPanel.x + 14, layout.playerPanel.y + 74, {
      size: 22,
      color: "#efe4d1"
    });

    ui.drawLabel(ctx, "架势(挡伤) " + player.block, layout.playerPanel.x + 14, layout.playerPanel.y + 102, {
      size: 17,
      color: "#b1bcc3"
    });
    ui.drawLabel(ctx, "先耗架势，再掉气血", layout.playerPanel.x + 14, layout.playerPanel.y + 122, {
      size: 11,
      color: "#7d868c"
    });
    if (showIronBone) {
      statusLines.push({
        text: ironBoneActive ?
          "铁骨已成" :
          "铁骨待发 (" + (G.statusEffects.IRON_BONE_THRESHOLD - player.block > 0 ? (G.statusEffects.IRON_BONE_THRESHOLD - player.block) : 0) + ")",
        color: ironBoneActive ? "#dfbf7f" : "#8e7d68"
      });
    }

    if (poisonTurns > 0) {
      statusLines.push({
        text: "中毒 " + poisonTurns,
        color: "#b7cf85"
      });
    }

    if (showCombo) {
      statusLines.push({
        text: comboActive ?
          "连环已起 (" + comboRemaining + ")" :
          (comboCount >= comboThreshold ? "连环已尽" : "连环 " + comboCount + " / " + comboThreshold),
        color: comboActive ? "#d8c77f" : (comboCount >= comboThreshold ? "#9b7f55" : "#8e8768")
      });
    }

    ctx.save();
    ctx.fillStyle = "rgba(54, 43, 36, 0.78)";
    ctx.fillRect(layout.playerPanel.x + 12, resourceY - 4, panelWidth - 8, 40);
    ctx.restore();

    ctx.save();
    ctx.font = "600 16px \"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    energyWidth = Math.ceil(ctx.measureText(energyText).width + 24);
    ctx.font = "600 14px \"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    stanceWidth = Math.ceil(ctx.measureText(stanceText).width + 22);
    ctx.restore();
    energyX = layout.playerPanel.x + 16;
    stanceX = Math.min(layout.playerPanel.x + panelWidth - stanceWidth + 8, energyX + energyWidth + 10);

    drawCombatSlip(ctx, energyX, resourceY, energyWidth, 30, {
      fill: "rgba(28, 22, 20, 0.84)",
      stroke: "rgba(220, 191, 151, 0.18)"
    });
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(energyX + 10, resourceY + 8);
    ctx.lineTo(energyX + energyWidth - 12, resourceY + 8);
    ctx.stroke();
    ctx.restore();
    ui.drawLabel(ctx, energyText, energyX + energyWidth / 2, resourceY + 16, {
      size: 16,
      align: "center",
      color: "#efe4d1"
    });

    drawCombatSlip(ctx, stanceX, resourceY + 2, stanceWidth, 26, {
      fill: "rgba(44, 58, 52, 0.44)",
      stroke: "rgba(148, 187, 155, 0.18)"
    });
    ui.drawLabel(ctx, stanceText, stanceX + stanceWidth / 2, resourceY + 15, {
      size: 14,
      align: "center",
      color: "#c7d7ca",
      shadow: false
    });

    statusLines.forEach(function (line) {
      ui.drawLabel(ctx, line.text, layout.playerPanel.x + 14, statusY, {
        size: 15,
        color: line.color
      });
      statusY += 16;
    });
  }

  function renderRelicPanel(ctx, state, layout) {
    var relics = G.relicRuntime && typeof G.relicRuntime.getCombatDisplay === "function" ?
      G.relicRuntime.getCombatDisplay(state) :
      [];
    var badge = layout.relicBadge;
    var columns = Math.max(1, Math.min(5, relics.length));
    var i = 0;
    var item = null;
    var x = 0;
    var y = 0;

    G.render.ui.drawPanel(ctx, layout.relicPanel.x, layout.relicPanel.y, layout.relicPanel.width, layout.relicPanel.height, {
      fill: "rgba(17, 17, 17, 0.94)",
      stroke: "#6b2028"
    });
    G.render.ui.drawLabel(ctx, "旧物", layout.relicPanel.x + 14, layout.relicPanel.y + 16, {
      size: 16,
      color: "#c8bbab"
    });

    for (i = 0; i < relics.length; i += 1) {
      item = relics[i];
      x = layout.relicPanel.x + 14 + (i % columns) * (badge.width + badge.gap);
      y = layout.relicPanel.y + 30 + Math.floor(i / columns) * (badge.height + 6);

      G.render.ui.drawPanel(ctx, x, y, badge.width, badge.height, {
        fill: item.active ? "rgba(87, 53, 18, 0.96)" : "rgba(54, 51, 48, 0.96)",
        stroke: item.active ? "#dfbf7f" : "#8e7d68"
      });
      G.render.ui.drawLabel(ctx, item.icon, x + badge.width / 2, y + 19, {
        size: 20,
        align: "center",
        color: "#f4ead9"
      });
      G.render.ui.drawLabel(ctx, item.status, x + badge.width / 2, y + 37, {
        size: 10,
        align: "center",
        color: "#d8cdbd"
      });
    }
  }

  function renderEnemyBadges(ctx, enemy, box) {
    var flaw = G.statusEffects.getFlaw(enemy);
    var fester = G.statusEffects.getFester(enemy);
    var blind = G.statusEffects.getBlind(enemy);
    var crippleTurns = G.statusEffects.getCrippleTurns(enemy);
    var fervor = enemy.buffs && enemy.buffs.fervor ? enemy.buffs.fervor : 0;
    var left = box.x + box.width - 124;
    var top = box.y - 28;

    if (flaw > 0) {
      G.render.ui.drawPanel(ctx, left, top, 124, 28, {
        fill: "rgba(123, 23, 36, 0.96)",
        stroke: "#e2c18c"
      });
      G.render.ui.drawLabel(ctx, "破绽 " + flaw, left + 62, top + 14, {
        size: 16,
        align: "center",
        color: "#f7efe0"
      });
      top -= 30;
    }

    if (fester > 0) {
      G.render.ui.drawPanel(ctx, left, top, 124, 28, {
        fill: "rgba(58, 92, 35, 0.96)",
        stroke: "#d2d485"
      });
      G.render.ui.drawLabel(ctx, "溃烂 " + fester, left + 62, top + 14, {
        size: 16,
        align: "center",
        color: "#f4f6de"
      });
      top -= 30;
    }

    if (blind > 0) {
      G.render.ui.drawPanel(ctx, left, top, 124, 28, {
        fill: "rgba(112, 104, 55, 0.96)",
        stroke: "#f0df9f"
      });
      G.render.ui.drawLabel(ctx, "迷眼 " + blind, left + 62, top + 14, {
        size: 16,
        align: "center",
        color: "#fff2c7"
      });
      top -= 30;
    }

    if (crippleTurns > 0) {
      G.render.ui.drawPanel(ctx, left, top, 124, 28, {
        fill: "rgba(74, 64, 39, 0.96)",
        stroke: "#d7c18a"
      });
      G.render.ui.drawLabel(ctx, "残废 " + crippleTurns, left + 62, top + 14, {
        size: 16,
        align: "center",
        color: "#f3e7ca"
      });
      top -= 30;
    }

    if (fervor > 0) {
      G.render.ui.drawPanel(ctx, left, top, 124, 28, {
        fill: "rgba(92, 54, 12, 0.96)",
        stroke: "#efce8a"
      });
      G.render.ui.drawLabel(ctx, "狂热 " + fervor, left + 62, top + 14, {
        size: 16,
        align: "center",
        color: "#fff0cf"
      });
    }
  }

  function renderEnemyArea(ctx, state, layout) {
    var enemyBoxes = getEnemyBoxes(layout, state.combat.enemies, getEnemyFormationLock(state));
    var i = 0;
    var box = null;
    var enemy = null;

    renderEncounterHeader(ctx, state, layout);

    for (i = 0; i < enemyBoxes.length; i += 1) {
      box = enemyBoxes[i];
      enemy = box.enemy;

      if (state.combat.selectedCardId && state.combat.result === "active") {
        G.render.ui.drawPanel(ctx, box.x - 6, box.y - 6, box.width + 12, box.height + 12, {
          fill: "rgba(177, 32, 52, 0.12)",
          stroke: "#d7b27a"
        });
      }

      G.render.ui.drawEnemyCard(ctx, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        templateId: enemy.templateId,
        behavior: enemy.behavior,
        kind: enemy.kind,
        name: enemy.name,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        block: enemy.block,
        intent: enemy.intent,
        intentLabel: enemy.intentLabel,
        intentValue: enemy.intentValue,
        timeMs: state.timeMs
      });
      renderEnemyBadges(ctx, enemy, box);
    }
  }

  function renderHand(ctx, state, layout) {
    var ui = G.render.ui;
    var hand = state.combat.hand;
    var i = 0;
    var x = 0;
    var y = 0;
    var selected = false;

    for (i = 0; i < hand.length; i += 1) {
      selected = hand[i].id === state.combat.selectedCardId;
      x = layout.handStartX + i * (layout.cardWidth + layout.cardGap);
      y = layout.handY - (selected ? 18 : 0);

      if (selected) {
        ui.drawPanel(ctx, x - 4, y - 6, layout.cardWidth + 8, layout.cardHeight + 8, {
          fill: "rgba(177, 32, 52, 0.16)",
          stroke: "#d7b27a"
        });
      }

      ui.drawCardSlot(ctx, {
        x: x,
        y: y,
        width: layout.cardWidth,
        height: layout.cardHeight,
        artRole: "combat",
        cost: hand[i].cost,
        name: hand[i].name,
        playable: hand[i].playable,
        text: hand[i].text,
        comboTag: hand[i].comboTag,
        comboDiscounted: hand[i].comboDiscounted
      });
    }
  }

  function renderMetaPanels(ctx, state, layout) {
    var ui = G.render.ui;
    var overlay = state.combat.ui && state.combat.ui.overlay;

    ui.drawPileBox(ctx, {
      x: layout.drawPile.x,
      y: layout.drawPile.y,
      width: layout.drawPile.width,
      height: layout.drawPile.height,
      label: "抽牌堆",
      count: state.combat.drawPileCount,
      active: overlay && overlay.title === "抽牌堆"
    });

    ui.drawPileBox(ctx, {
      x: layout.discardPile.x,
      y: layout.discardPile.y,
      width: layout.discardPile.width,
      height: layout.discardPile.height,
      label: "弃牌堆",
      count: state.combat.discardPileCount,
      active: overlay && overlay.title === "弃牌堆"
    });

    ui.drawButton(ctx, {
      x: layout.endTurn.x,
      y: layout.endTurn.y,
      width: layout.endTurn.width,
      height: layout.endTurn.height,
      label: "结束回合"
    });

    ui.drawLabel(ctx, state.combat.lastAction, layout.message.x, layout.message.y, {
      size: 18,
      color: "#d8cdbd"
    });

    ui.drawListOverlay(ctx, overlay);
  }

  function renderBattleResultLegacy(ctx, state, layout) {
    var title = "";
    var subtitle = "";

    if (state.combat.result === "victory") {
      title = "搏杀得手";
      subtitle = state.combat.nodeType === "gate" ? "关卡已破，当前先沿用奖励场景收口。" : "敌人倒下，接入战利品搜刮。";
    } else if (state.combat.result === "defeat") {
      title = "死于乱军";
      subtitle = "点击任意处查看本局败局簿。";
    } else {
      return;
    }

    G.render.ui.drawPanel(ctx, layout.result.x, layout.result.y, layout.result.width, layout.result.height, {
      fill: "rgba(14, 14, 14, 0.96)",
      stroke: "#c2a57a"
    });
    G.render.ui.drawLabel(ctx, title, layout.result.x + layout.result.width / 2, layout.result.y + 40, {
      size: 34,
      color: "#f3e8d8",
      align: "center"
    });
    G.render.ui.drawLabel(ctx, subtitle, layout.result.x + layout.result.width / 2, layout.result.y + 82, {
      size: 18,
      color: "#d8cdbd",
      align: "center"
    });
  }

  function renderBattleResult(ctx, state, layout) {
    var title = "";
    var subtitle = "";
    var victoryCopy = null;

    if (state.combat.result === "victory") {
      victoryCopy = getVictoryResultCopy(state.combat.nodeType);
      title = victoryCopy.title;
      subtitle = victoryCopy.subtitle;
    } else if (state.combat.result === "defeat") {
      title = "死于乱军";
      subtitle = "点击任意处查看本局收案簿。";
    } else {
      return;
    }

    G.render.ui.drawPanel(ctx, layout.result.x, layout.result.y, layout.result.width, layout.result.height, {
      fill: "rgba(14, 14, 14, 0.96)",
      stroke: "#c2a57a"
    });
    G.render.ui.drawLabel(ctx, title, layout.result.x + layout.result.width / 2, layout.result.y + 40, {
      size: 34,
      color: "#f3e8d8",
      align: "center"
    });
    G.render.ui.drawLabel(ctx, subtitle, layout.result.x + layout.result.width / 2, layout.result.y + 82, {
      size: 18,
      color: "#d8cdbd",
      align: "center"
    });
  }

  function findDraggedEnemyBox(state, layout) {
    var drag = null;

    if (!G.render || !G.render.animations || typeof G.render.animations.getCardDrag !== "function") {
      return null;
    }

    drag = G.render.animations.getCardDrag("combat");
    if (!drag || !drag.dragging) {
      return null;
    }

    return findEnemyBoxAtPoint(getEnemyBoxes(layout, state.combat.enemies, getEnemyFormationLock(state)), {
      x: drag.pointerX,
      y: drag.pointerY
    });
  }

  function getCardDropTarget(state, card, point, enemyBoxes) {
    if (G.render.combatInteraction.needsEnemy(getCardTemplate(state, card.name) || {})) {
      return findEnemyBoxAtPoint(enemyBoxes, point);
    }
    // Legacy effect resolution requires a live enemy anchor, even for self-only effects.
    return G.render.combatInteraction.contains(G.render.combatInteraction.selfBox, point) ? enemyBoxes[0] : null;
  }

  function getInputEnemyBoxes(state, layout) {
    var shown = G.scenes.combat.feedback?.getView(state) || state;
    var living = state.combat.enemies.filter(function (enemy) { return enemy.hp > 0; }).map(function (enemy) { return enemy.id; });
    return getEnemyBoxes(layout, shown.combat.enemies, getEnemyFormationLock(shown)).filter(function (box) { return living.indexOf(box.enemy.id) >= 0; });
  }

  function updateHoverInspection(state, input) {
    if (state.combat.result !== "active" || state.combat.selectedCardId ||
        (state.combat.ui && state.combat.ui.overlay) || G.render.animations.getCardDrag("combat") ||
        (G.scenes.combat.feedback && G.scenes.combat.feedback.isBusy())) {
      resetHoverInspection();
      return state;
    }
    var hit = findHandCardAtPoint(state, getHandBoxes(getLayout(), state.combat.hand, null), G.main.getPointer());
    var id = hit ? hit.card.id : null;
    if (!id || id !== hoverInspectionCardId) {
      hoverInspectionCardId = id;
      hoverInspectionElapsedMs = 0;
      return state.combat.inspectCardId ? clearInspectedCard(state) : state;
    }
    hoverInspectionElapsedMs = Math.min(CARD_HOVER_DELAY_MS + 1,
      hoverInspectionElapsedMs + Math.max(0, Number(input && input.deltaMs) || 0));
    if (hoverInspectionElapsedMs <= CARD_HOVER_DELAY_MS) return state;
    if ((state.combat.inspectCardId || null) === id) return state;
    return setInspectedCard(state, id);
  }

  function handlePointerInteractions(state) {
    var nextState = state;
    var pointer = getPointerFrame();
    var layout = getLayout();
    var handBoxes = null;
    var enemyBoxes = null;
    var dragStart = null;
    var drag = null;
    var draggedCard = null;
    var dropTarget = null;
    var sourcePoint = null;

    if (!pointer || !G.render || !G.render.animations) {
      return nextState;
    }

    if (nextState.combat.result !== "active") {
      G.render.animations.clearCardDrag("combat");
      return nextState;
    }

    handBoxes = getHandBoxes(layout, nextState.combat.hand, nextState.combat.selectedCardId);
    enemyBoxes = getInputEnemyBoxes(nextState, layout);

    if (pointer.pressed) {
      dragStart = findHandCardAtPoint(nextState, handBoxes, { x: pointer.startX, y: pointer.startY });

      if (dragStart) {
        G.render.animations.beginCardDrag("combat", {
          scene: "combat",
          cardId: dragStart.card.id,
          card: buildDraggedCard(dragStart.card),
          originX: dragStart.box.x,
          originY: dragStart.box.y,
          width: dragStart.box.width,
          height: dragStart.box.height,
          pointerX: pointer.startX,
          pointerY: pointer.startY,
          offsetX: pointer.startX - dragStart.box.x,
          offsetY: pointer.startY - dragStart.box.y
        });
      } else {
        G.render.animations.clearCardDrag("combat");
      }
    }

    drag = G.render.animations.getCardDrag("combat");
    if (drag && pointer.isDown && (pointer.moved || drag.dragging)) {
      G.render.animations.updateCardDrag(pointer);
      drag = G.render.animations.getCardDrag("combat");

      if (drag && drag.dragging) {
        nextState = clearInspectedCard(nextState);
        if (nextState.combat.ui && nextState.combat.ui.overlay) {
          nextState = clearOverlay(nextState);
        }
        if (nextState.combat.selectedCardId) {
          nextState = G.deck.clearSelectedCard(nextState);
        }
      }
    }

    if (drag && pointer.released) {
      G.render.animations.updateCardDrag(pointer);
      drag = G.render.animations.endCardDrag("combat");

      if (drag && drag.dragging) {
        draggedCard = nextState.combat.hand.find(function (card) {
          return card.id === drag.cardId;
        });
        dropTarget = draggedCard ? getCardDropTarget(nextState, draggedCard, pointer, enemyBoxes) : null;

        if (draggedCard && dropTarget) {
          sourcePoint = {
            x: drag.originX + drag.width / 2,
            y: drag.originY + drag.height / 2 - 8
          };

          if (nextState.combat.ui && nextState.combat.ui.overlay) {
            nextState = clearOverlay(nextState);
          }
          return tryPlayCard(nextState, draggedCard, dropTarget, sourcePoint);
        }

        if (draggedCard) {
          G.render.combatInteraction.reject(nextState,draggedCard,draggedCard.playable?'target':'energy');
          if (nextState.combat.ui && nextState.combat.ui.overlay) {
            nextState = clearOverlay(nextState);
          }
          if (nextState.combat.selectedCardId) {
            nextState = G.deck.clearSelectedCard(nextState);
          }
          nextState = setActionText(nextState, "未锁定目标，" + draggedCard.name + " 未出手。");
        }
      }
    }

    return nextState;
  }

  function processClicksEnhanced(state) {
    var nextState = state;
    var layout = getLayout();
    var clicks = G.main && typeof G.main.consumeClicks === "function" ? G.main.consumeClicks() : [];
    var click = null;
    var handBoxes = null;
    var enemyBoxes = null;
    var clickedCard = null;
    var clickedEnemyBox = null;
    var selectedCard = null;
    var selectedCardBox = null;
    var endTurnState = null;
    var cuffState = null;
    var i = 0;

    if (clicks.length === 0) {
      return state;
    }

    while (clicks.length > 0) {
      if (G.scenes.combat.feedback && !G.scenes.combat.feedback.acceptsCards()) break;
      click = clicks.shift();
      handBoxes = getHandBoxes(layout, nextState.combat.hand, nextState.combat.selectedCardId);
      enemyBoxes = getInputEnemyBoxes(nextState, layout);
      clickedCard = null;
      clickedEnemyBox = null;

      if (nextState.combat.result !== "active") {
        if (G.runReport && typeof G.runReport.enter === "function") {
          return G.runReport.enter(nextState, nextState.combat.result);
        }
        continue;
      }

      for (i = handBoxes.length - 1; i >= 0; i -= 1) {
        if (!G.render.animations.getActiveCardMoveCardIds("combat", "draw_card_move")[handBoxes[i].cardId] && isInside(click, handBoxes[i])) {
          clickedCard = nextState.combat.hand[handBoxes[i].index];
          break;
        }
      }

      for (i = 0; i < enemyBoxes.length; i += 1) {
        if (isInside(click, enemyBoxes[i])) {
          clickedEnemyBox = enemyBoxes[i];
          break;
        }
      }

      if (isInside(click, layout.drawPile)) {
        nextState = toggleOverlay(nextState, "抽牌堆", nextState.combat.drawPileNames, layout);
        nextState = G.deck.clearSelectedCard(nextState);
        nextState = setActionText(nextState, "正在查看抽牌堆。");
      } else if (isInside(click, layout.discardPile)) {
        nextState = toggleOverlay(nextState, "弃牌堆", nextState.combat.discardPileNames, layout);
        nextState = G.deck.clearSelectedCard(nextState);
        nextState = setActionText(nextState, "正在查看弃牌堆。");
      } else if (isInside(click, layout.cheatCuff)) {
        if (!G.relicRuntime || typeof G.relicRuntime.canUseCheatCuff !== "function") {
          nextState = setActionText(nextState, "这件旧物现在还派不上用场。");
        } else if (!nextState.combat.selectedCardId) {
          nextState = setActionText(nextState, "先选中一张手牌，再用《老千袖口》换牌。");
        } else if (!G.relicRuntime.canUseCheatCuff(nextState)) {
          nextState = setActionText(nextState, "《老千袖口》这回合已经使过了。");
        } else {
          cuffState = nextState;
          nextState = G.relicRuntime.useCheatCuff(nextState, nextState.combat.selectedCardId);
          emitHandTransitionEffects(cuffState, nextState, {
            discardDelayMs: 0,
            drawDelayMs: 100
          });
        }
      } else if (isInside(click, layout.endTurn)) {
        nextState = endTurnAnimated(nextState);
      } else if (clickedCard) {
        nextState = clearOverlay(nextState);
        // Selection aims the card; hover/long-press owns the reader.
        nextState = clearInspectedCard(nextState);
        if (!clickedCard.playable) {
          G.render.combatInteraction.reject(nextState,clickedCard,'energy');
          nextState = G.deck.clearSelectedCard(nextState);
          nextState = setActionText(nextState, "体力不足，无法施展《" + clickedCard.name + "》。");
        } else {
          nextState = G.deck.toggleSelectedCard(nextState, clickedCard.id);
          if (nextState.combat.selectedCardId === clickedCard.id) {
            nextState = setActionText(nextState, "已选中《" + clickedCard.name + "》，点击高亮目标施展。");
          } else {
            nextState = setActionText(nextState, "取消选中《" + clickedCard.name + "》。");
          }
        }
      } else if (clickedEnemyBox || G.render.combatInteraction.contains(G.render.combatInteraction.selfBox, click)) {
        nextState = clearOverlay(nextState);
        if (nextState.combat.selectedCardId) {
          selectedCard = nextState.combat.hand.find(function (card) {
            return card.id === nextState.combat.selectedCardId;
          });
          selectedCardBox = findCardBoxById(handBoxes, nextState.combat.selectedCardId);

          if (selectedCard && selectedCardBox) {
            clickedEnemyBox = getCardDropTarget(nextState, selectedCard, click, enemyBoxes);
            if (!clickedEnemyBox) {
              G.render.combatInteraction.reject(nextState,selectedCard,'target');
              nextState = setActionText(nextState, "请点击高亮目标，或按 Esc 取消。");
              continue;
            }
            nextState = tryPlayCard(nextState, selectedCard, clickedEnemyBox, {
              x: selectedCardBox.x + selectedCardBox.width / 2,
              y: selectedCardBox.y + selectedCardBox.height / 2 - 8
            });
            nextState = clearInspectedCard(nextState);
          } else {
            nextState = G.deck.clearSelectedCard(nextState);
            nextState = clearInspectedCard(nextState);
            nextState = setActionText(nextState, "先重新选定一张手牌，再对敌出手。");
          }
        } else {
          nextState = setActionText(nextState, "先选中一张卡牌，再点击敌人。");
        }
      } else {
        nextState = clearOverlay(nextState);
        nextState = G.deck.clearSelectedCard(nextState);
        nextState = clearInspectedCard(nextState);
      }
    }

    return nextState;
  }

  function playCardByIdAnimated(state, cardId, targetEnemyId) {
    var nextState = ensureSampleState(state);
    var layout = getLayout();
    var card = nextState.combat.hand.find(function (item) {
      return item.id === cardId;
    });
    var enemy = nextState.combat.enemies.find(function (item) {
      return item.id === targetEnemyId;
    });
    var sourceBox = null;
    var targetBox = null;

    if (
      nextState.combat.result !== "active" ||
      !card ||
      !enemy ||
      enemy.hp <= 0
    ) {
      return nextState;
    }

    if (!card.playable) {
      return setActionText(nextState, "体力不足，无法施展《" + card.name + "》。");
    }

    sourceBox = findCardBoxById(getHandBoxes(layout, nextState.combat.hand, nextState.combat.selectedCardId), card.id);
    targetBox = getEnemyBoxes(layout, nextState.combat.enemies, getEnemyFormationLock(nextState)).find(function (box) {
      return box.enemy.id === enemy.id;
    });

    if (!targetBox) {
      return nextState;
    }

    return tryPlayCard(nextState, card, targetBox, sourceBox ? {
      x: sourceBox.x + sourceBox.width / 2,
      y: sourceBox.y + sourceBox.height / 2 - 8
    } : {
      x: layout.handCenterX,
      y: layout.handY + layout.cardHeight / 2 - layout.handLift * 0.65 - 8
    });
  }

  function endTurnAnimated(state) {
    var nextState = ensureSampleState(state);
    var endTurnState = null;
    var feedback = G.scenes.combat.feedback;
    var trace = feedback ? [] : null;

    if (nextState.combat.result !== "active" || (feedback && feedback.isBusy())) {
      return nextState;
    }

    endTurnState = nextState;
    nextState = G.enemyAI.resolveEndTurn(nextState, trace);
    if (feedback) {
      if (nextState.combat.result === "victory") nextState = queueCombatSceneTransition(primeRewardPreview(nextState), "reward", 520);
      feedback.presentTurn(endTurnState, nextState, trace);
      return nextState;
    }
    emitHandTransitionEffects(endTurnState, nextState, {
      discardDelayMs: 0,
      drawDelayMs: 230
    });
    emitEnemyTurnEffects(endTurnState);
    if (nextState.combat.result === "victory") {
      return queueVictoryRewardTransition(nextState);
    }
    return nextState;
  }

  function renderEnemyAreaEnhanced(ctx, state, layout) {
    var enemyBoxes = getEnemyBoxes(layout, state.combat.enemies, getEnemyFormationLock(state));
    var draggedEnemyBox = findDraggedEnemyBox(state, layout);
    var drag = G.render && G.render.animations && typeof G.render.animations.getCardDrag === "function" ?
      G.render.animations.getCardDrag("combat") :
      null;
    var i = 0;
    var box = null;
    var enemy = null;

    renderEncounterHeader(ctx, state, layout);

    for (i = 0; i < enemyBoxes.length; i += 1) {
      box = enemyBoxes[i];
      enemy = box.enemy;

      if (state.combat.selectedCardId && state.combat.result === "active") {
        G.render.ui.drawPanel(ctx, box.x - 6, box.y - 6, box.width + 12, box.height + 12, {
          fill: "rgba(177, 32, 52, 0.12)",
          stroke: "#d7b27a"
        });
      }

      if (drag && drag.dragging && drag.card && drag.card.playable) {
        G.render.ui.drawPanel(ctx, box.x - 8, box.y - 8, box.width + 16, box.height + 16, {
          fill: draggedEnemyBox && draggedEnemyBox.enemy.id === enemy.id ? "rgba(241, 209, 160, 0.16)" : "rgba(241, 209, 160, 0.06)",
          stroke: draggedEnemyBox && draggedEnemyBox.enemy.id === enemy.id ? "#f1d1a0" : "rgba(241, 209, 160, 0.35)"
        });
      }

      G.render.ui.drawEnemyCard(ctx, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        templateId: enemy.templateId,
        behavior: enemy.behavior,
        kind: enemy.kind,
        name: enemy.name,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        block: enemy.block,
        intent: enemy.intent,
        intentLabel: enemy.intentLabel,
        intentValue: enemy.intentValue,
        timeMs: state.timeMs
      });
      renderEnemyBadges(ctx, enemy, box);
    }
  }

  function renderHandEnhanced(ctx, state, layout) {
    var U = G.render.canvasUtils;
    var drag = G.render.animations.getCardDrag("combat");
    // The resting fan does not change with the pointer. Compositing its small
    // card canvases again on every move stalls older Android WebViews.
    // Keep entry/deal/inspection/rejection and feedback on their original path.
    if (!U.paintCacheEnabled || !drag?.dragging || state.combat.result !== "active" ||
        !G.render.woodcut?.cardArt || G.scenes.combat.feedback?.isBusy() ||
        G.render.sceneEntry?.active() || state.combat.inspectCardId ||
        state.combat.inspectPresentation?.progress || G.render.combatInteraction.hasVisuals() ||
        ctx.globalAlpha !== 1 || ctx.filter !== "none" || ctx.globalCompositeOperation !== "source-over" ||
        document.fonts?.status === "loading" ||
        Object.keys(G.render.animations.getActiveCardMoveCardIds("combat", "draw_card_move")).length) {
      paintHandEnhanced(ctx, state, layout);
      return;
    }
    // Cached groups still touch visible source art. Their scalar dependencies
    // invalidate on actual image changes without retaining evicted originals.
    state.combat.hand.forEach(function (card) {
      if (card.id === drag.cardId) return;
      var art = G.render.woodcut.cardArt(card);
      var path = art.artPath || (typeof art.art === "string" ? art.art : art.art?.path);
      if (path) G.render.assets.getImageEntry(path);
    });
    var density = U.density(ctx);
    var y = Math.floor(Math.max(0, layout.handY - 100) * density) / density;
    var key = "drag-hand:" + JSON.stringify([state.combat.hand, state.combat.selectedCardId,
      drag.cardId, layout, U.fontRevision, ctx.imageSmoothingEnabled, ctx.imageSmoothingQuality]);
    var layer = U.cachedLayer(key, 1280, 720 - y, density, function (brush) {
      brush.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
      brush.imageSmoothingQuality = ctx.imageSmoothingQuality;
      brush.translate(0, -y);
      paintHandEnhanced(brush, state, layout);
    });
    ctx.drawImage(layer, 0, y, 1280, 720 - y);
  }

  function paintHandEnhanced(ctx, state, layout) {
    var ui = G.render.ui;
    var hand = state.combat.hand;
    var inspectVisual = getInspectPresentationState(state);
    var inspectedCardId = inspectVisual.cardId;
    var inspectFade = inspectVisual.targetVisible ?
      clamp(easeInspectOpenProgress(inspectVisual.progress), 0, 1) :
      easeInspectCloseProgress(inspectVisual.progress);
    var drag = G.render && G.render.animations && typeof G.render.animations.getCardDrag === "function" ?
      G.render.animations.getCardDrag("combat") :
      null;
    var pendingDrawCardIds = G.render && G.render.animations && typeof G.render.animations.getActiveCardMoveCardIds === "function" ?
      G.render.animations.getActiveCardMoveCardIds("combat", "draw_card_move") :
      {};
    var boxes = getHandBoxes(layout, hand, state.combat.selectedCardId);
    var i = 0;
    var box = null;
    var selected = false;
    var inspected = false;
    var draggingThisCard = false;
    var cardAlpha = 1;

    if (ui && typeof ui.drawHandTray === "function") {
      ui.drawHandTray(ctx, {
        x: layout.handCenterX - 324,
        y: layout.handY + layout.cardHeight - 10,
        width: 648,
        height: 82
      });
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(18, 15, 15, 0.22)";
      ctx.beginPath();
      ctx.ellipse(layout.handCenterX, layout.handY + layout.cardHeight + 8, 266, 18, -0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (i = 0; i < hand.length; i += 1) {
      box = boxes[i];
      var rejection = G.render.combatInteraction.rejectionFor(hand[i].id,state);
      if (rejection) box = Object.assign({},box,{x:box.x+rejection.offsetX});
      selected = hand[i].id === state.combat.selectedCardId;
      inspected = hand[i].id === inspectedCardId;
      draggingThisCard = !!(drag && drag.dragging && drag.cardId === hand[i].id);
      cardAlpha = inspected ? 1 - inspectFade * 0.52 : 1;

      if (pendingDrawCardIds[hand[i].id]) {
        continue;
      }

      if (draggingThisCard) {
        ui.drawPanel(ctx, box.x + 8, box.y + 10, layout.cardWidth - 16, layout.cardHeight - 20, {
          fill: "rgba(24, 21, 22, 0.28)",
          stroke: "rgba(215, 178, 122, 0.35)"
        });
        continue;
      }

      ui.drawCardSlot(ctx, {
        x: box.x,
        y: box.y,
        width: layout.cardWidth,
        height: layout.cardHeight,
        artRole: "combat",
        rotation: box.rotation,
        scale: box.scale,
        glowColor: selected ? "rgba(240, 209, 162, 0.28)" : (inspected ? "rgba(228, 205, 170, 0.16)" : null),
        glowBlur: selected ? 12 : (inspected ? 8 : 0),
        accentStroke: rejection ? '#c95748' : selected ? "#d7b27a" : (inspected ? "rgba(197, 171, 135, 0.5)" : null),
        alpha: cardAlpha,
        cost: hand[i].cost,
        name: hand[i].name,
        playable: hand[i].playable,
        text: hand[i].text,
        style: hand[i].style,
        comboTag: hand[i].comboTag,
        comboDiscounted: hand[i].comboDiscounted,
        sourceCard: hand[i]
      });
    }
  }

  function renderSelectedCardInspectorLegacy(ctx, state, layout) {
    var ui = G.render.ui;
    var overlay = state.combat.ui && state.combat.ui.overlay;
    var card = getInspectedCombatCard(state);
    var titleFont = ui.getTitleFontFamily ? ui.getTitleFontFamily() : "\"KGame Sans\", sans-serif";
    var readableFont = ui.getReadableFontFamily ? ui.getReadableFontFamily() : "\"KGame Sans\", sans-serif";
    var panelX = 34;
    var panelY = 130;
    var panelWidth = 252;
    var panelHeight = 308;
    var headerX = panelX + 14;
    var headerY = panelY + 12;
    var headerWidth = 88;
    var previewWidth = 136;
    var previewHeight = 190;
    var previewX = panelX + Math.round((panelWidth - previewWidth) / 2);
    var previewY = panelY + 42;
    var noteX = panelX + 12;
    var noteY = previewY + previewHeight + 12;
    var noteWidth = panelWidth - 24;
    var noteHeight = panelY + panelHeight - noteY - 12;
    var selected = !!(card && state.combat && state.combat.selectedCardId && state.combat.selectedCardId === card.id);
    var styleText = card ? (getPlayerStyleLabel(card.style || "basic") + " · " + card.cost) : "";

    if (!card || (overlay && overlay.visible)) {
      return;
    }

    drawStageMistVeil(ctx, panelX + panelWidth * 0.5, panelY + panelHeight * 0.54, panelWidth * 0.56, panelHeight * 0.42, {
      inner: "rgba(48, 33, 24, 0.12)",
      mid: "rgba(0, 0, 0, 0.06)",
      outer: "rgba(0, 0, 0, 0)"
    });
    drawCombatFlatPanel(ctx, panelX, panelY, panelWidth, panelHeight, {
      fill: "rgba(15, 13, 12, 0.32)",
      midFill: "rgba(9, 8, 8, 0.4)",
      bottomFill: "rgba(6, 5, 5, 0.52)",
      stroke: "rgba(188, 160, 125, 0.12)",
      accentLine: "rgba(214, 186, 142, 0.02)",
      topGlow: "rgba(255, 236, 210, 0.03)",
      lineWidth: 1.05,
      innerStroke: false
    });
    drawCombatSlip(ctx, headerX, headerY, headerWidth, 24, {
      fill: "rgba(56, 37, 21, 0.58)",
      stroke: "rgba(214, 186, 142, 0.16)",
      surface: "wood-button",
      paperAlpha: 0.06,
      lineWidth: 0.9
    });
    ui.drawLabel(ctx, selected ? "已选招式" : "卡牌详览", headerX + headerWidth / 2, headerY + 12, {
      size: 12,
      align: "center",
      color: "#f0e4d1",
      shadow: false,
      fontFamily: titleFont
    });
    drawCombatSlip(ctx, panelX + panelWidth - 104, headerY, 90, 24, {
      fill: "rgba(26, 23, 22, 0.46)",
      stroke: "rgba(172, 146, 109, 0.1)",
      surface: "ink-panel",
      paperAlpha: 0.05,
      lineWidth: 0.9
    });
    ui.drawLabel(ctx, styleText, panelX + panelWidth - 59, headerY + 12, {
      size: 11,
      align: "center",
      color: "#cdbca6",
      shadow: false,
      fontFamily: readableFont
    });
    ui.drawCardSlot(ctx, {
      x: previewX,
      y: previewY,
      width: previewWidth,
      height: previewHeight,
      artRole: "combat",
      layoutMode: "detail",
      cost: card.cost,
      name: card.name,
      playable: card.playable,
      text: card.text,
      style: card.style,
      comboTag: card.comboTag,
      comboDiscounted: card.comboDiscounted,
      sourceCard: card,
      showFooterTokens: false,
      disableBaseShadow: true,
      glowColor: selected ? "rgba(240, 209, 162, 0.18)" : "rgba(210, 188, 156, 0.1)",
      glowBlur: selected ? 10 : 6,
      accentStroke: selected ? "#d7b27a" : "rgba(182, 156, 124, 0.36)"
    });
    drawCombatFlatPanel(ctx, noteX, noteY, noteWidth, noteHeight, {
      fill: "rgba(22, 18, 16, 0.28)",
      stroke: "rgba(168, 138, 104, 0.1)",
      accentLine: "rgba(214, 186, 142, 0.016)",
      lineWidth: 0.95,
      innerStroke: false
    });
    ui.drawWrappedLabel(ctx, card.name, noteX + 10, noteY + 10, noteWidth - 20, 16, {
      size: 15,
      color: "#efe1cd",
      maxLines: 2,
      shadow: false,
      weight: "700",
      fontFamily: readableFont
    });
    ui.drawWrappedLabel(ctx, card.text, noteX + 10, noteY + 42, noteWidth - 20, 14, {
      size: 12.5,
      color: "#cdbca6",
      maxLines: 4,
      shadow: false,
      weight: "700",
      fontFamily: readableFont
    });
  }

  function renderSelectedCardInspector(ctx, state, layout) {
    var ui = G.render.ui;
    var overlay = state.combat.ui && state.combat.ui.overlay;
    var inspectVisual = getInspectPresentationState(state);
    var card = getCombatHandCardById(state, inspectVisual.cardId);
    var targetBox = getInspectPreviewBox(layout);
    var handBoxes = getHandBoxes(layout, state.combat.hand, state.combat.selectedCardId);
    var sourceBox = findCardBoxById(handBoxes, inspectVisual.cardId) || targetBox;
    var progress = inspectVisual.progress;
    var eased = inspectVisual.targetVisible ?
      Math.min(1.035, easeInspectOpenProgress(progress)) :
      easeInspectCloseProgress(progress);
    var settled = clamp(eased, 0, 1);
    var selected = !!(card && state.combat && state.combat.selectedCardId && state.combat.selectedCardId === card.id);
    var previewX = sourceBox.x + (targetBox.x - sourceBox.x) * eased;
    var previewY = sourceBox.y + (targetBox.y - sourceBox.y) * eased;
    var previewWidth = sourceBox.width + (targetBox.width - sourceBox.width) * eased;
    var previewHeight = sourceBox.height + (targetBox.height - sourceBox.height) * eased;
    var previewCenterX = previewX + previewWidth / 2;
    var previewCenterY = previewY + previewHeight / 2;
    var previewRotation = (sourceBox.rotation || 0) * (1 - settled);
    var previewAlpha = 0.78 + settled * 0.22;
    var settleWindow = clamp((settled - 0.72) / 0.28, 0, 1);
    var breathe = settleWindow > 0 ? (Math.sin((state.timeMs || 0) / 220) + 1) * 0.5 : 0;
    var focusAlpha = settled * 0.14 + settleWindow * 0.05;
    var hoverLift = settleWindow * (1.4 + breathe * 1.8);
    var focusGradient = null;

    if (!card || progress <= 0 || (overlay && overlay.visible)) {
      return;
    }

    previewY -= hoverLift;
    previewCenterY -= hoverLift;

    ctx.save();
    ctx.globalAlpha = focusAlpha;
    focusGradient = ctx.createRadialGradient(
      previewCenterX,
      previewCenterY,
      Math.max(28, previewWidth * 0.22),
      previewCenterX,
      previewCenterY,
      Math.max(360, previewWidth * 2.4)
    );
    focusGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    focusGradient.addColorStop(0.5, "rgba(0, 0, 0, 0.05)");
    focusGradient.addColorStop(1, "rgba(0, 0, 0, 0.72)");
    ctx.fillStyle = focusGradient;
    ctx.fillRect(0, 0, ctx.canvas.logicalWidth || ctx.canvas.width, ctx.canvas.logicalHeight || ctx.canvas.height);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = settled;
    drawStageMistVeil(ctx, previewCenterX, previewCenterY + previewHeight * 0.04, previewWidth * 0.72, previewHeight * 0.48, {
      inner: "rgba(44, 30, 20, 0.14)",
      mid: "rgba(0, 0, 0, 0.08)",
      outer: "rgba(0, 0, 0, 0)"
    });
    drawSoftGroundShadow(
      ctx,
      previewCenterX,
      previewY + previewHeight + 18,
      Math.max(72, previewWidth * 0.42),
      Math.max(14, previewHeight * 0.07),
      ((selected ? 0.2 : 0.15) + settleWindow * (0.02 + breathe * 0.025)) * settled,
      -0.03
    );
    ctx.restore();
    ui.drawCardSlot(ctx, {
      x: previewX,
      y: previewY,
      width: previewWidth,
      height: previewHeight,
      artRole: "reward",
      layoutMode: "detail",
      rotation: previewRotation,
      alpha: previewAlpha,
      cost: card.cost,
      name: card.name,
      playable: card.playable,
      text: card.text,
      style: card.style,
      comboTag: card.comboTag,
      comboDiscounted: card.comboDiscounted,
      sourceCard: card,
      showFooterTokens: false,
      disableBaseShadow: true,
      glowColor: selected ? "rgba(240, 209, 162, 0.24)" : "rgba(214, 194, 166, 0.14)",
      glowBlur: selected ? (8 + settled * 6 + settleWindow * (1 + breathe * 2)) : (5 + settled * 4 + settleWindow * (0.6 + breathe * 1.4)),
      accentStroke: selected ? "#d7b27a" : "rgba(190, 166, 132, 0.42)"
    });
  }

  function getPlayerStyleLabel(style) {
    var labels = {
      blade: "吹命刀",
      iron: "铁骨衣",
      dirty: "下九流",
      combo: "江湖把子",
      basic: "杂门手"
    };

    return labels[style] || "江湖客";
  }

  function getPlayerStageProfile(style) {
    var profiles = {
      blade: {
        accent: "#d14b54",
        highlight: "rgba(241, 213, 170, 0.7)",
        residue: "rgba(184, 54, 63, 0.34)",
        beam: "rgba(209, 75, 84, 0.16)",
        glow: "rgba(170, 64, 68, 0.12)",
        ring: "rgba(241, 213, 170, 0.16)"
      },
      iron: {
        accent: "#8ea7ba",
        highlight: "rgba(215, 241, 255, 0.74)",
        residue: "rgba(119, 144, 164, 0.28)",
        beam: "rgba(114, 137, 153, 0.16)",
        glow: "rgba(92, 118, 138, 0.12)",
        ring: "rgba(215, 241, 255, 0.16)"
      },
      dirty: {
        accent: "#7f9350",
        highlight: "rgba(223, 240, 178, 0.68)",
        residue: "rgba(109, 129, 70, 0.3)",
        beam: "rgba(108, 130, 70, 0.14)",
        glow: "rgba(93, 107, 57, 0.11)",
        ring: "rgba(223, 240, 178, 0.14)"
      },
      combo: {
        accent: "#c18a2c",
        highlight: "rgba(255, 226, 166, 0.72)",
        residue: "rgba(181, 124, 42, 0.3)",
        beam: "rgba(193, 138, 44, 0.16)",
        glow: "rgba(160, 104, 32, 0.12)",
        ring: "rgba(255, 226, 166, 0.16)"
      },
      basic: {
        accent: "#b46e54",
        highlight: "rgba(244, 225, 208, 0.66)",
        residue: "rgba(168, 94, 70, 0.28)",
        beam: "rgba(180, 110, 84, 0.14)",
        glow: "rgba(144, 82, 58, 0.11)",
        ring: "rgba(244, 225, 208, 0.14)"
      }
    };

    return profiles[style] || profiles.basic;
  }

  function getPlayerStageFrame(enemyCount) {
    var count = Math.max(1, Math.min(3, enemyCount || 1));
    var presets = {
      1: {
        x: 198,
        y: 116,
        width: 348,
        height: 402,
        silhouetteCenterX: 358,
        silhouetteBaseY: 522,
        silhouetteScale: 182,
        floorRadiusX: 170,
        floorRadiusY: 54
      },
      2: {
        x: 206,
        y: 124,
        width: 336,
        height: 388,
        silhouetteCenterX: 356,
        silhouetteBaseY: 520,
        silhouetteScale: 176,
        floorRadiusX: 164,
        floorRadiusY: 52
      },
      3: {
        x: 214,
        y: 132,
        width: 324,
        height: 374,
        silhouetteCenterX: 354,
        silhouetteBaseY: 516,
        silhouetteScale: 170,
        floorRadiusX: 158,
        floorRadiusY: 50
      }
    };

    return presets[count];
  }

  function getPlayerEngagementAnchors(style, enemyCount) {
    var frame = getPlayerStageFrame(enemyCount);
    var scaleX = frame.width / 344;
    var scaleY = frame.height / 344;
    var baseAnchors = {
      attack: {
        x: frame.x + frame.width * 0.721,
        y: frame.y + frame.height * 0.738
      },
      defend: {
        x: frame.x + frame.width * 0.547,
        y: frame.y + frame.height * 0.733
      }
    };
    var adjustments = {
      blade: {
        attack: { x: 10, y: -6 },
        defend: { x: 0, y: -4 }
      },
      iron: {
        attack: { x: -16, y: 4 },
        defend: { x: -2, y: 2 }
      },
      dirty: {
        attack: { x: -2, y: 6 },
        defend: { x: 2, y: 2 }
      },
      combo: {
        attack: { x: -14, y: 8 },
        defend: { x: 0, y: 6 }
      },
      basic: {
        attack: { x: 0, y: 0 },
        defend: { x: 0, y: 0 }
      }
    };
    var preset = adjustments[style] || adjustments.basic;

    return {
      attack: {
        x: Math.round(baseAnchors.attack.x + preset.attack.x * scaleX),
        y: Math.round(baseAnchors.attack.y + preset.attack.y * scaleY)
      },
      defend: {
        x: Math.round(baseAnchors.defend.x + preset.defend.x * scaleX),
        y: Math.round(baseAnchors.defend.y + preset.defend.y * scaleY)
      }
    };
  }

  function drawDuelSilhouette(ctx, centerX, baseY, scale, profile, facing, style) {
    var direction = facing < 0 ? -1 : 1;
    var silhouetteStyle = style || "basic";
    var stageProfile = profile || getPlayerStageProfile(silhouetteStyle);

    ctx.save();
    ctx.translate(centerX, baseY);
    ctx.scale(direction, 1);

    ctx.fillStyle = "rgba(14, 12, 14, 0.9)";
    ctx.beginPath();
    ctx.ellipse(0, scale * 0.42, scale * 0.34, scale * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-scale * 0.12, scale * 0.28);
    ctx.lineTo(scale * 0.08, -scale * 0.36);
    ctx.lineTo(scale * 0.22, scale * 0.22);
    ctx.lineTo(-scale * 0.04, scale * 0.34);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(scale * 0.06, -scale * 0.48, scale * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = stageProfile.accent;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, scale * 0.04);

    if (silhouetteStyle === "iron") {
      ctx.beginPath();
      ctx.moveTo(scale * 0.06, -scale * 0.34);
      ctx.lineTo(scale * 0.3, -scale * 0.06);
      ctx.moveTo(scale * 0.02, -scale * 0.18);
      ctx.lineTo(-scale * 0.24, scale * 0.08);
      ctx.moveTo(scale * 0.08, scale * 0.06);
      ctx.lineTo(scale * 0.38, scale * 0.26);
      ctx.moveTo(0, scale * 0.04);
      ctx.lineTo(-scale * 0.16, scale * 0.34);
      ctx.stroke();

      ctx.strokeStyle = stageProfile.highlight;
      ctx.lineWidth = Math.max(3, scale * 0.034);
      ctx.beginPath();
      ctx.moveTo(scale * 0.14, -scale * 0.42);
      ctx.lineTo(scale * 0.18, scale * 0.28);
      ctx.moveTo(-scale * 0.08, -scale * 0.24);
      ctx.lineTo(scale * 0.18, -scale * 0.16);
      ctx.stroke();
    } else if (silhouetteStyle === "dirty") {
      ctx.beginPath();
      ctx.moveTo(scale * 0.02, -scale * 0.28);
      ctx.lineTo(scale * 0.3, -scale * 0.1);
      ctx.moveTo(scale * 0.08, -scale * 0.16);
      ctx.lineTo(-scale * 0.18, scale * 0.04);
      ctx.moveTo(scale * 0.1, scale * 0.02);
      ctx.lineTo(scale * 0.32, scale * 0.24);
      ctx.moveTo(0, scale * 0.02);
      ctx.lineTo(-scale * 0.18, scale * 0.32);
      ctx.stroke();

      ctx.strokeStyle = stageProfile.highlight;
      ctx.lineWidth = Math.max(2, scale * 0.028);
      ctx.beginPath();
      ctx.moveTo(scale * 0.18, -scale * 0.14);
      ctx.lineTo(scale * 0.56, -scale * 0.3);
      ctx.moveTo(scale * 0.18, -scale * 0.12);
      ctx.lineTo(scale * 0.6, -scale * 0.12);
      ctx.moveTo(-scale * 0.12, -scale * 0.04);
      ctx.lineTo(-scale * 0.34, scale * 0.12);
      ctx.stroke();
    } else if (silhouetteStyle === "combo") {
      ctx.beginPath();
      ctx.moveTo(scale * 0.04, -scale * 0.26);
      ctx.lineTo(scale * 0.22, -scale * 0.06);
      ctx.moveTo(scale * 0.1, -scale * 0.12);
      ctx.lineTo(-scale * 0.22, scale * 0.02);
      ctx.moveTo(scale * 0.08, scale * 0.02);
      ctx.lineTo(scale * 0.26, scale * 0.24);
      ctx.moveTo(0, scale * 0.02);
      ctx.lineTo(-scale * 0.12, scale * 0.3);
      ctx.stroke();

      ctx.strokeStyle = stageProfile.highlight;
      ctx.lineWidth = Math.max(2, scale * 0.028);
      ctx.beginPath();
      ctx.moveTo(scale * 0.12, -scale * 0.06);
      ctx.lineTo(scale * 0.46, -scale * 0.18);
      ctx.moveTo(scale * 0.08, 0);
      ctx.lineTo(scale * 0.4, 0);
      ctx.moveTo(scale * 0.04, scale * 0.08);
      ctx.lineTo(scale * 0.34, scale * 0.12);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(scale * 0.02, -scale * 0.34);
      ctx.lineTo(scale * 0.32, -scale * 0.08);
      ctx.moveTo(scale * 0.1, -scale * 0.22);
      ctx.lineTo(-scale * 0.28, scale * 0.02);
      ctx.moveTo(scale * 0.08, scale * 0.04);
      ctx.lineTo(scale * 0.4, scale * 0.32);
      ctx.moveTo(scale * 0.02, scale * 0.02);
      ctx.lineTo(-scale * 0.18, scale * 0.34);
      ctx.stroke();

      ctx.strokeStyle = stageProfile.highlight;
      ctx.lineWidth = Math.max(2, scale * 0.028);
      ctx.beginPath();
      ctx.moveTo(scale * 0.24, -scale * 0.12);
      ctx.lineTo(scale * 0.74, -scale * 0.7);
      ctx.stroke();
    }

    ctx.strokeStyle = stageProfile.residue;
    ctx.lineWidth = Math.max(3, scale * 0.032);
    ctx.beginPath();
    if (silhouetteStyle === "iron") {
      ctx.moveTo(-scale * 0.26, scale * 0.16);
      ctx.quadraticCurveTo(scale * 0.02, -scale * 0.14, scale * 0.44, -scale * 0.02);
      ctx.moveTo(-scale * 0.18, scale * 0.26);
      ctx.quadraticCurveTo(scale * 0.08, 0, scale * 0.36, scale * 0.08);
    } else if (silhouetteStyle === "dirty") {
      ctx.moveTo(-scale * 0.18, scale * 0.18);
      ctx.quadraticCurveTo(scale * 0.08, -scale * 0.04, scale * 0.48, -scale * 0.02);
      ctx.moveTo(-scale * 0.08, scale * 0.26);
      ctx.quadraticCurveTo(scale * 0.14, 0.02, scale * 0.42, scale * 0.12);
    } else if (silhouetteStyle === "combo") {
      ctx.moveTo(-scale * 0.24, scale * 0.16);
      ctx.quadraticCurveTo(scale * 0.06, -scale * 0.1, scale * 0.4, -scale * 0.02);
      ctx.moveTo(-scale * 0.16, scale * 0.26);
      ctx.quadraticCurveTo(scale * 0.1, 0.04, scale * 0.34, scale * 0.12);
      ctx.moveTo(-scale * 0.06, scale * 0.34);
      ctx.quadraticCurveTo(scale * 0.14, 0.14, scale * 0.28, scale * 0.2);
    } else {
      ctx.moveTo(-scale * 0.24, scale * 0.18);
      ctx.quadraticCurveTo(scale * 0.06, -scale * 0.18, scale * 0.52, -scale * 0.08);
      ctx.moveTo(-scale * 0.16, scale * 0.28);
      ctx.quadraticCurveTo(scale * 0.12, 0, scale * 0.46, scale * 0.06);
    }
    ctx.stroke();
    ctx.restore();
  }

  function getCombatEngagementFocus() {
    if (!G.render || !G.render.animations || typeof G.render.animations.getEngagementFocus !== "function") {
      return {
        active: false,
        intensity: 0,
        sourceSide: null,
        targetSide: null,
        sourceKey: null,
        targetKey: null,
        sourceX: 0,
        sourceY: 0,
        targetX: 0,
        targetY: 0
      };
    }

    return G.render.animations.getEngagementFocus("combat");
  }

  function drawCombatSlip(ctx, x, y, width, height, palette) {
    var fill = (palette && palette.fill) || "rgba(20, 20, 20, 0.85)";
    var stroke = (palette && palette.stroke) || "#4a3728";
    var lineWidth = (palette && palette.lineWidth) || 2.5;

    if (G.render.assets && typeof G.render.assets.drawCombatSlipSurface === "function") {
      G.render.assets.drawCombatSlipSurface(ctx, x, y, width, height, Object.assign({
        fill: fill,
        stroke: stroke,
        lineWidth: lineWidth
      }, palette || {}));
      return;
    }

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  function drawCombatFlatPanel(ctx, x, y, width, height, options) {
    var opts = options || {};
    var fill = opts.fill || "rgba(9, 11, 14, 0.72)";
    var stroke = opts.stroke || "rgba(168, 138, 104, 0.14)";
    var lineWidth = typeof opts.lineWidth === "number" ? opts.lineWidth : 1.2;
    var topGlow = null;
    var bodyShade = null;
    var sideShade = null;

    ctx.save();
    bodyShade = ctx.createLinearGradient(x, y, x, y + height);
    bodyShade.addColorStop(0, fill);
    bodyShade.addColorStop(0.62, opts.midFill || fill);
    bodyShade.addColorStop(1, opts.bottomFill || "rgba(4, 6, 8, 0.82)");
    ctx.fillStyle = bodyShade;
    ctx.fillRect(x, y, width, height);

    topGlow = ctx.createLinearGradient(x, y, x, y + Math.max(18, height * 0.28));
    topGlow.addColorStop(0, opts.topGlow || "rgba(255, 241, 218, 0.04)");
    topGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(x, y, width, Math.max(18, height * 0.28));

    sideShade = ctx.createLinearGradient(x, y, x + width, y);
    sideShade.addColorStop(0, opts.leftShade || "rgba(0, 0, 0, 0.18)");
    sideShade.addColorStop(0.14, "rgba(0, 0, 0, 0)");
    sideShade.addColorStop(0.86, "rgba(0, 0, 0, 0)");
    sideShade.addColorStop(1, opts.rightShade || "rgba(0, 0, 0, 0.2)");
    ctx.fillStyle = sideShade;
    ctx.fillRect(x, y, width, height);

    if (opts.accentLine !== "none") {
      ctx.fillStyle = opts.accentLine || "rgba(214, 186, 142, 0.08)";
      ctx.fillRect(x, y, width, Math.max(2, Math.min(8, height * 0.08)));
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    if (opts.innerStroke !== false && width > 28 && height > 18) {
      ctx.strokeStyle = opts.innerStroke || "rgba(235, 224, 204, 0.04)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4.5, y + 4.5, width - 9, height - 9);
    }
    ctx.restore();
  }

  function drawCombatChip(ctx, x, y, text, palette) {
    var width = measureCombatChipWidth(ctx, text, palette);
    var fill = (palette && palette.fill) || "rgba(25, 20, 18, 0.8)";
    var stroke = (palette && palette.stroke) || "rgba(210, 184, 146, 0.28)";
    var color = (palette && palette.color) || "#f2e6d5";
    var fontSize = (palette && palette.size) || 13;
    var height = (palette && palette.height) || 24;
    var fontWeight = (palette && palette.weight) || "550";

    if (palette && palette.flat) {
      drawCombatFlatPanel(ctx, x, y, width, height, Object.assign({}, palette || {}, {
        fill: fill,
        stroke: stroke,
        lineWidth: typeof palette.lineWidth === "number" ? palette.lineWidth : 1
      }));
    } else {
      drawCombatSlip(ctx, x, y, width, height, Object.assign({}, palette || {}, {
        fill: fill,
        stroke: stroke
      }));
    }
    G.render.ui.drawLabel(ctx, text, x + width / 2, y + height / 2, {
      size: fontSize,
      weight: fontWeight,
      align: "center",
      color: color,
      shadow: false
    });
    return width;
  }

  function measureCombatChipWidth(ctx, text, palette) {
    var fontSize = (palette && palette.size) || 13;
    var paddingX = (palette && palette.paddingX) || 12;
    var minWidth = (palette && palette.minWidth) || 0;
    var width = 0;

    ctx.save();
    ctx.font = "550 " + fontSize + "px \"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    width = Math.ceil(ctx.measureText(String(text || "")).width + paddingX * 2);
    ctx.restore();
    return Math.max(width, minWidth);
  }

  function layoutCombatChipRows(ctx, chips, maxWidth, gap) {
    var rows = [];
    var currentRow = [];
    var currentWidth = 0;
    var safeGap = typeof gap === "number" ? gap : 6;
    var safeMaxWidth = Math.max(32, Number(maxWidth) || 0);

    (chips || []).forEach(function (chip) {
      var palette = chip && chip.palette ? chip.palette : {};
      var text = chip && chip.text ? chip.text : "";
      var width = measureCombatChipWidth(ctx, text, palette);
      var height = palette && palette.height ? palette.height : 24;
      var nextWidth = currentRow.length > 0 ? currentWidth + safeGap + width : width;

      if (currentRow.length > 0 && nextWidth > safeMaxWidth) {
        rows.push({
          chips: currentRow,
          width: currentWidth,
          height: Math.max.apply(null, currentRow.map(function (item) {
            return item.height;
          }))
        });
        currentRow = [];
        currentWidth = 0;
      }

      currentRow.push({
        text: text,
        palette: palette,
        width: width,
        height: height
      });
      currentWidth = currentRow.length > 1 ? currentWidth + safeGap + width : width;
    });

    if (currentRow.length > 0) {
      rows.push({
        chips: currentRow,
        width: currentWidth,
        height: Math.max.apply(null, currentRow.map(function (item) {
          return item.height;
        }))
      });
    }

    return rows;
  }

  function measureCombatChipRowsHeight(rows, rowGap) {
    var total = 0;
    var safeGap = typeof rowGap === "number" ? rowGap : 6;

    (rows || []).forEach(function (row, index) {
      total += row.height;
      if (index < rows.length - 1) {
        total += safeGap;
      }
    });
    return total;
  }

  function drawCombatChipRows(ctx, rows, x, y, options) {
    var safeGap = options && typeof options.gap === "number" ? options.gap : 6;
    var safeRowGap = options && typeof options.rowGap === "number" ? options.rowGap : 6;
    var alignRight = !!(options && options.align === "right");
    var cursorY = y;

    (rows || []).forEach(function (row) {
      var cursorX = alignRight ? x - row.width : x;

      row.chips.forEach(function (chip, index) {
        drawCombatChip(ctx, cursorX, cursorY, chip.text, chip.palette);
        cursorX += chip.width + (index < row.chips.length - 1 ? safeGap : 0);
      });

      cursorY += row.height + safeRowGap;
    });
  }

  function drawCombatStatusPaperStrip(ctx, x, y, width, height, options) {
    var opts = options || {};
    var shadowGradient = null;
    var shadowY = y + Math.max(6, height * 0.46);
    var shadowHeight = Math.max(8, height * 0.48);

    ctx.save();
    shadowGradient = ctx.createLinearGradient(x, shadowY, x, shadowY + shadowHeight);
    shadowGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    shadowGradient.addColorStop(0.5, opts.shadowColor || "rgba(0, 0, 0, 0.14)");
    shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(x + 14, shadowY, Math.max(0, width - 28), shadowHeight);
    ctx.restore();

    if (G.render.assets && typeof G.render.assets.drawCombatStatusPaperSurface === "function") {
      G.render.assets.drawCombatStatusPaperSurface(ctx, x, y, width, height, opts);
      return;
    }

    ctx.save();
    ctx.fillStyle = opts.baseFill || "rgba(18, 14, 14, 0.92)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = opts.stroke || "rgba(166, 130, 98, 0.08)";
    ctx.lineWidth = typeof opts.lineWidth === "number" ? opts.lineWidth : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.restore();
  }

  function drawFloatingPileCounter(ctx, box, label, value, active) {
    var ui = G.render.ui;
    var fill = active ? "rgba(75, 46, 19, 0.82)" : "rgba(17, 14, 13, 0.68)";
    var stroke = active ? "rgba(214, 186, 142, 0.28)" : "rgba(166, 135, 97, 0.18)";
    var labelColor = active ? "#f4ead7" : "#baa68d";
    var valueColor = active ? "#f6efe2" : "#e0d4c2";
    var labelText = label === "抽" ? "抽牌" : (label === "弃" ? "弃牌" : label);

    drawCombatSlip(ctx, box.x, box.y, box.width, box.height, {
      fill: fill,
      stroke: stroke,
      surface: active ? "wood-button" : "combat-overlay",
      paperAlpha: active ? 0.12 : 0.08
    });
    ui.drawLabel(ctx, labelText, box.x + box.width / 2, box.y + 15, {
      size: 11,
      align: "center",
      color: labelColor,
      shadow: false
    });
    ui.drawLabel(ctx, String(value), box.x + box.width / 2, box.y + box.height - 12, {
      size: 18,
      align: "center",
      color: valueColor,
      shadow: false
    });
  }

  function drawPileCounterIcon(ctx, centerX, centerY, label, active, empty) {
    var tone = active ? "#ecdeca" : (empty ? "#958778" : "#d8c6ac");
    var accent = active ? "rgba(136, 54, 40, 0.16)" : (empty ? "rgba(90, 76, 62, 0.08)" : "rgba(110, 88, 60, 0.1)");

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.strokeStyle = tone;
    ctx.fillStyle = accent;
    ctx.lineWidth = 1.4;

    if (label === "\u62bd") {
      ctx.save();
      ctx.rotate(-0.16);
      ctx.strokeRect(-14, -9, 14, 20);
      ctx.restore();
      ctx.save();
      ctx.rotate(0.14);
      ctx.strokeRect(-2, -12, 14, 20);
      ctx.restore();
    } else {
      ctx.strokeRect(-12, -12, 14, 20);
      ctx.strokeRect(-4, -4, 14, 20);
      ctx.beginPath();
      ctx.moveTo(-10, 14);
      ctx.lineTo(12, 14);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPileCounterPillar(ctx, box, label, value, active) {
    var ui = G.render.ui;
    var safeValue = Math.max(0, Number(value) || 0);
    var empty = safeValue <= 0;
    var labelColor = active ? "#d8c8b1" : (empty ? "#887966" : "#a8957e");
    var valueColor = active ? "#f3e8d9" : (empty ? "#ccc0ae" : "#ece1d2");
    var centerX = box.x + box.width / 2;
    var labelText = label === "\u62bd" ? "\u62bd\u724c" : (label === "\u5f03" ? "\u5f03\u724c" : label);
    var panelX = box.x + 8;
    var panelY = box.y + 18;
    var panelWidth = Math.max(28, box.width - 16);
    var panelHeight = Math.max(48, box.height - 24);
    var sealWidth = Math.max(20, panelWidth - 10);
    var sealHeight = 18;
    var sealX = panelX + Math.round((panelWidth - sealWidth) / 2);
    var sealY = panelY + panelHeight - sealHeight - 4;

    drawStageMistVeil(ctx, centerX, panelY + panelHeight * 0.8, Math.max(22, box.width * 0.56), Math.max(14, box.height * 0.16), {
      inner: active ? "rgba(42, 30, 18, 0.14)" : "rgba(16, 14, 12, 0.08)",
      mid: "rgba(0, 0, 0, 0.04)",
      outer: "rgba(0, 0, 0, 0)",
      rotation: -0.03
    });
    drawCombatSlip(ctx, panelX, panelY, panelWidth, panelHeight, {
      fill: active ? "rgba(72, 53, 38, 0.48)" : (empty ? "rgba(40, 35, 31, 0.26)" : "rgba(54, 46, 37, 0.34)"),
      stroke: active ? "rgba(186, 158, 124, 0.2)" : "rgba(132, 114, 93, 0.14)",
      lineWidth: 1.1
    });
    ctx.save();
    ctx.fillStyle = active ? "rgba(245, 236, 224, 0.025)" : "rgba(226, 212, 194, 0.015)";
    ctx.fillRect(panelX + 4, panelY + 4, panelWidth - 8, Math.max(14, panelHeight * 0.24));
    ctx.strokeStyle = active ? "rgba(204, 184, 158, 0.08)" : "rgba(160, 144, 122, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, panelY + 10);
    ctx.lineTo(centerX, sealY - 6);
    ctx.stroke();
    ctx.restore();
    drawPileCounterIcon(ctx, centerX, panelY + panelHeight * 0.38, label, active, empty);

    drawCombatSlip(ctx, sealX, sealY, sealWidth, sealHeight, {
      fill: active ? "rgba(122, 44, 35, 0.8)" : (empty ? "rgba(74, 63, 52, 0.56)" : "rgba(92, 74, 55, 0.72)"),
      stroke: active ? "rgba(236, 220, 196, 0.14)" : "rgba(214, 198, 178, 0.1)",
      lineWidth: 0.9
    });

    ui.drawLabel(ctx, labelText, centerX, box.y + 4, {
      size: 10,
      align: "center",
      color: labelColor,
      shadow: false
    });
    ui.drawLabel(ctx, String(safeValue), centerX, sealY + sealHeight / 2, {
      size: empty ? 14 : 16,
      align: "center",
      color: valueColor,
      shadowColor: "rgba(0, 0, 0, 0.52)",
      shadowBlur: 2,
      shadowOffsetX: 0,
      shadowOffsetY: 1
    });
  }

  function drawEndTurnIcon(ctx, centerX, centerY, radius) {
    ctx.save();
    ctx.fillStyle = "rgba(38, 18, 16, 0.24)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(238, 220, 198, 0.58)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = "rgba(246, 232, 214, 0.9)";
    ctx.lineWidth = Math.max(2.4, radius * 0.2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.42, centerY + radius * 0.04);
    ctx.lineTo(centerX - radius * 0.12, centerY + radius * 0.32);
    ctx.lineTo(centerX + radius * 0.48, centerY - radius * 0.28);
    ctx.stroke();
    ctx.restore();
  }

  function getCombatBackdropProfile(nodeType) {
    // 【全局美术重置】：极致写实，刺目的血红与老照片的深邃黑白
    if (nodeType === "gate") {
      return {
        enemyGlow: "rgba(180, 15, 15, 0.45)", // 血腥首领压迫
        arenaGlow: "rgba(0, 0, 0, 0.8)",
        floorNear: "rgba(10, 5, 5, 0.99)",
        floorFar: "rgba(35, 10, 10, 0.9)",
        laneGlow: "rgba(140, 20, 20, 0.35)",
        laneStroke: "rgba(220, 30, 30, 0.4)",
        ember: "rgba(220, 40, 20, 0.4)"
      };
    }
    if (nodeType === "elite") {
      return {
        enemyGlow: "rgba(130, 20, 20, 0.35)",
        arenaGlow: "rgba(10, 10, 10, 0.7)",
        floorNear: "rgba(8, 6, 6, 0.99)",
        floorFar: "rgba(25, 15, 12, 0.8)",
        laneGlow: "rgba(100, 15, 15, 0.25)",
        laneStroke: "rgba(160, 40, 30, 0.3)",
        ember: "rgba(140, 40, 20, 0.35)"
      };
    }
    if (nodeType === "nemesis") {
      return {
        enemyGlow: "rgba(150, 160, 170, 0.3)", // 宿敌带有火器和钢铁的死寂感
        arenaGlow: "rgba(15, 20, 25, 0.7)",
        floorNear: "rgba(5, 7, 10, 0.99)",
        floorFar: "rgba(20, 25, 35, 0.8)",
        laneGlow: "rgba(120, 130, 150, 0.2)",
        laneStroke: "rgba(160, 170, 190, 0.3)",
        ember: "rgba(120, 20, 20, 0.35)" // 依然保留一丝鲜血
      };
    }

    return {
      enemyGlow: "rgba(60, 45, 35, 0.4)", // 昏黄老照片基调
      arenaGlow: "rgba(15, 10, 5, 0.6)",
      floorNear: "rgba(10, 8, 6, 0.99)",
      floorFar: "rgba(30, 20, 15, 0.75)",
      laneGlow: "rgba(50, 35, 25, 0.25)",
      laneStroke: "rgba(80, 60, 40, 0.3)",
      ember: "rgba(80, 40, 20, 0.25)"
    };
  }

  function getEnemyClusterStageFrame(enemyBoxes, layout) {
    var boxes = Array.isArray(enemyBoxes) ? enemyBoxes : [];
    var minX = 0;
    var maxX = 0;
    var minY = 0;
    var maxY = 0;
    var width = 0;
    var height = 0;
    var centerX = 0;
    var frontBox = null;
    var frontCenterX = 0;
    var frontCenterY = 0;
    var focusPull = 0;
    var frontWeight = 0.34;

    if (!boxes.length) {
      return {
        railX: layout.threatRail.x,
        railY: layout.threatRail.y,
        railWidth: layout.threatRail.width,
        railHeight: layout.threatRail.height,
        glowX: layout.threatRail.x + layout.threatRail.width * 0.5,
        glowY: layout.threatRail.y + 120,
        darkX: layout.threatRail.x - 18,
        darkY: layout.threatRail.y + 2,
        darkWidth: layout.threatRail.width + 24,
        darkHeight: 330,
        floorX: layout.threatRail.x + layout.threatRail.width * 0.54,
        floorY: 440,
        floorRadiusX: 322,
        floorRadiusY: 80,
        pressureX: layout.threatRail.x + layout.threatRail.width * 0.64,
        pressureY: layout.threatRail.y + 152,
        pressureRadius: 214,
        emberX: layout.threatRail.x + layout.threatRail.width * 0.42,
        emberY: layout.threatRail.y + 126,
        frontWeight: 0.34
      };
    }

    boxes.forEach(function (box, index) {
      var left = box.baseX - box.width * (boxes.length === 1 ? 0.04 : 0.12);
      var right = box.baseX + box.width * 1.02;
      var top = box.baseY - 26;
      var bottom = box.baseY + box.height + 42;

      minX = index === 0 ? left : Math.min(minX, left);
      maxX = index === 0 ? right : Math.max(maxX, right);
      minY = index === 0 ? top : Math.min(minY, top);
      maxY = index === 0 ? bottom : Math.max(maxY, bottom);

      if (!frontBox || (box.zIndex || 0) >= (frontBox.zIndex || 0)) {
        frontBox = box;
      }
    });

    width = maxX - minX;
    height = maxY - minY;
    centerX = (minX + maxX) * 0.5;
    frontCenterX = frontBox.baseX + frontBox.width * 0.58;
    frontCenterY = frontBox.baseY + frontBox.height * 0.42;
    focusPull = boxes.length <= 1 ? 0 : Math.round((frontCenterX - centerX) * 0.6);
    frontWeight = clamp((frontBox.width * frontBox.height) / Math.max(1, width * height), 0.26, 0.48);

    return {
      railWidth: clamp(Math.round(width + 86), 372, 492),
      railHeight: clamp(Math.round(height + 78), 286, 366),
      railY: clamp(Math.round(minY - 12), 112, 150),
      glowX: Math.round(centerX + focusPull),
      glowY: clamp(Math.round(frontCenterY), 208, 284),
      darkWidth: clamp(Math.round(width + 38 + frontBox.width * 0.16), 342, 482),
      darkHeight: clamp(Math.round(height + 18), 280, 352),
      floorX: Math.round(centerX + width * 0.04 + focusPull * 0.52),
      floorY: clamp(Math.round(maxY + 20), 424, 462),
      floorRadiusX: clamp(Math.round(width * 0.48 + frontBox.width * 0.16), 196, 312),
      floorRadiusY: clamp(Math.round(height * 0.15 + frontBox.height * 0.02), 46, 80),
      pressureX: Math.round(frontCenterX + frontBox.width * 0.02),
      pressureY: clamp(Math.round(frontCenterY + frontBox.height * 0.08), 214, 304),
      pressureRadius: clamp(Math.round(frontBox.width * 0.82), 154, 248),
      emberX: Math.round(frontCenterX - frontBox.width * 0.18),
      emberY: clamp(Math.round(frontCenterY - frontBox.height * 0.1), 136, 248),
      frontWeight: frontWeight
    };
  }

  function drawEnemyLaneBackdrop(ctx, box, profile, laneIndex, laneCount, focus, playerFrame) {
    var slotRole = box && box.slotRole ? box.slotRole : getEnemySlotRole(laneCount, laneIndex || 0);
    var roleWeight = slotRole === "front" ? 1 : (slotRole === "mid" ? 0.78 : 0.58);
    var focusBoost = focus && focus.active && focus.sourceKey === box.enemy.id ? 0.08 : 0;
    var glowCenterX = Math.round(box.x + box.width * (slotRole === "front" ? 0.54 : 0.5));
    var glowCenterY = Math.round(box.y + box.height * 0.42);
    var lift = slotRole === "front" ? -12 : -4;
    var mistRadiusX = Math.max(84, box.width * (slotRole === "front" ? 0.74 : 0.66));
    var mistRadiusY = Math.max(140, box.height * (slotRole === "front" ? 0.94 : 0.82));
    var sideRadiusX = Math.max(92, box.width * (slotRole === "front" ? 0.86 : 0.72));
    var sideRadiusY = Math.max(168, box.height * (slotRole === "front" ? 1.06 : 0.92));

    drawStageMistVeil(ctx, glowCenterX - box.width * 0.05, glowCenterY + lift, sideRadiusX, sideRadiusY, {
      inner: "rgba(5, 7, 10, " + (0.2 + focusBoost * 0.8) + ")",
      mid: "rgba(7, 10, 13, " + (0.12 + roleWeight * 0.06) + ")",
      outer: "rgba(5, 7, 10, 0.03)",
      rotation: slotRole === "front" ? 0.04 : -0.03,
      outerX: -0.08,
      outerY: 0.06
    });
    drawStageMistVeil(ctx, glowCenterX, glowCenterY, mistRadiusX, mistRadiusY, {
      inner: "rgba(236, 220, 188, " + (0.12 + roleWeight * 0.06 + focusBoost) + ")",
      mid: profile.enemyGlow.replace("0.22", String(0.2 + focusBoost)).replace("0.2", String(0.18 + focusBoost)).replace("0.18", String(0.16 + focusBoost)),
      outer: "rgba(0, 0, 0, 0.02)",
      rotation: slotRole === "front" ? -0.04 : 0.02,
      innerY: -0.04
    });
    drawStageMistVeil(ctx, glowCenterX + box.width * 0.02, box.y + box.height + 12, Math.max(92, box.width * 0.52), Math.max(24, box.height * 0.09), {
      inner: "rgba(8, 9, 11, 0.18)",
      mid: "rgba(8, 9, 11, 0.08)",
      outer: "rgba(8, 9, 11, 0)"
    });
  }

  function drawPlayerLaneBackdrop(ctx, layout, stageProfile, focus, frame) {
    var playerFrame = frame || getPlayerStageFrame(1);
    var focusBoost = focus && focus.active && focus.sourceSide === "player" ? 0.08 : 0;
    var centerX = playerFrame.silhouetteCenterX;
    var centerY = Math.round(playerFrame.y + playerFrame.height * 0.44);
    var floorY = playerFrame.y + playerFrame.height + 22;
    var leftFalloff = null;
    var canvasWidth = ctx && ctx.canvas ? (ctx.canvas.logicalWidth || ctx.canvas.width) : 1280;
    var canvasHeight = ctx && ctx.canvas ? (ctx.canvas.logicalHeight || ctx.canvas.height) : 720;

    drawStageMistVeil(ctx, centerX - playerFrame.width * 0.09, centerY + 4, Math.max(156, playerFrame.width * 0.62), Math.max(214, playerFrame.height * 0.7), {
      inner: "rgba(5, 7, 10, " + (0.28 + focusBoost) + ")",
      mid: "rgba(7, 10, 13, " + (0.18 + focusBoost * 0.6) + ")",
      outer: "rgba(5, 7, 10, 0.04)",
      rotation: -0.08,
      outerX: -0.12,
      outerY: 0.08
    });
    drawStageMistVeil(ctx, centerX - playerFrame.width * 0.04, centerY - 10, Math.max(118, playerFrame.width * 0.48), Math.max(184, playerFrame.height * 0.58), {
      inner: "rgba(241, 223, 194, " + (0.1 + focusBoost * 0.55) + ")",
      mid: stageProfile.glow.replace("0.12", String(0.12 + focusBoost * 0.55)).replace("0.11", String(0.11 + focusBoost * 0.55)),
      outer: "rgba(0, 0, 0, 0.02)",
      rotation: -0.05,
      innerY: -0.06
    });

    ctx.save();
    leftFalloff = ctx.createLinearGradient(0, 0, playerFrame.x + playerFrame.width * 0.82, 0);
    leftFalloff.addColorStop(0, "rgba(4, 5, 7, 0.62)");
    leftFalloff.addColorStop(0.42, "rgba(4, 5, 7, 0.28)");
    leftFalloff.addColorStop(1, "rgba(4, 5, 7, 0)");
    ctx.fillStyle = leftFalloff;
    ctx.fillRect(0, 0, playerFrame.x + playerFrame.width * 0.82, canvasHeight);
    ctx.restore();

    drawSoftGroundShadow(
      ctx,
      centerX + 8,
      floorY,
      Math.max(80, playerFrame.floorRadiusX * 0.74),
      Math.max(18, playerFrame.floorRadiusY * 0.72),
      0.42,
      0.03
    );
  }

  function drawSoftGroundShadow(ctx, centerX, centerY, radiusX, radiusY, alpha, rotation) {
    var shadowAlpha = typeof alpha === "number" ? alpha : 0.7;
    var angle = typeof rotation === "number" ? rotation : 0;
    var gradient = null;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.scale(Math.max(1, radiusX), Math.max(1, radiusY));
    gradient = ctx.createRadialGradient(0, 0, 0.12, 0, 0, 1);
    gradient.addColorStop(0, "rgba(0, 0, 0, " + shadowAlpha + ")");
    gradient.addColorStop(0.52, "rgba(0, 0, 0, " + (shadowAlpha * 0.42) + ")");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStageMistVeil(ctx, centerX, centerY, radiusX, radiusY, options) {
    var opts = options || {};
    var angle = typeof opts.rotation === "number" ? opts.rotation : 0;
    var innerX = typeof opts.innerX === "number" ? opts.innerX : 0;
    var innerY = typeof opts.innerY === "number" ? opts.innerY : 0;
    var outerX = typeof opts.outerX === "number" ? opts.outerX : 0;
    var outerY = typeof opts.outerY === "number" ? opts.outerY : 0;
    var gradient = null;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.scale(Math.max(1, radiusX), Math.max(1, radiusY));
    gradient = ctx.createRadialGradient(innerX, innerY, 0.12, outerX, outerY, 1);
    gradient.addColorStop(0, opts.inner || "rgba(8, 10, 12, 0.34)");
    gradient.addColorStop(0.34, opts.mid || "rgba(8, 10, 12, 0.18)");
    gradient.addColorStop(0.72, opts.outer || "rgba(8, 10, 12, 0.06)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawConflictCorridor(ctx, enemyBoxes, stageProfile, backdropProfile, focus, playerFrame) {
    var boxes = Array.isArray(enemyBoxes) ? enemyBoxes : [];
    var frame = playerFrame || getPlayerStageFrame(1);
    var enemyMinX = 1280;
    var corridorLeft = 0;
    var corridorWidth = 0;
    var corridorTop = 62;
    var corridorBottom = 544;
    var corridorGradient = null;
    var floorGradient = null;
    var topGradient = null;
    var leftVignette = null;
    var rightVignette = null;
    var taper = 0;

    if (!boxes.length) {
      return;
    }

    boxes.forEach(function (box) {
      enemyMinX = Math.min(enemyMinX, box.x);
    });

    corridorLeft = Math.max(312, Math.round(frame.x + frame.width * 0.6));
    corridorWidth = Math.max(220, Math.min(430, enemyMinX - corridorLeft + 92));
    taper = Math.round(Math.min(72, corridorWidth * 0.18));

    ctx.save();

    corridorGradient = ctx.createLinearGradient(corridorLeft, corridorTop, corridorLeft + corridorWidth, corridorTop);
    corridorGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    corridorGradient.addColorStop(0.16, "rgba(6, 8, 11, 0.26)");
    corridorGradient.addColorStop(0.5, "rgba(10, 11, 14, 0.12)");
    corridorGradient.addColorStop(0.84, "rgba(6, 8, 11, 0.22)");
    corridorGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = corridorGradient;
    ctx.beginPath();
    ctx.moveTo(corridorLeft + taper, corridorTop);
    ctx.lineTo(corridorLeft + corridorWidth - taper, corridorTop);
    ctx.lineTo(corridorLeft + corridorWidth, corridorBottom);
    ctx.lineTo(corridorLeft, corridorBottom);
    ctx.closePath();
    ctx.fill();

    drawStageMistVeil(ctx, corridorLeft + corridorWidth * 0.42, corridorTop + 206, corridorWidth * 0.3, 180, {
      inner: "rgba(6, 8, 10, 0.18)",
      mid: "rgba(7, 9, 11, 0.1)",
      outer: "rgba(7, 9, 11, 0.04)",
      rotation: -0.06,
      outerY: 0.08
    });

    topGradient = ctx.createLinearGradient(0, 0, 0, 168);
    topGradient.addColorStop(0, "rgba(4, 5, 7, 0.72)");
    topGradient.addColorStop(1, "rgba(4, 5, 7, 0)");
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, 1280, 168);

    floorGradient = ctx.createLinearGradient(0, 430, 0, 720);
    floorGradient.addColorStop(0, "rgba(6, 7, 9, 0)");
    floorGradient.addColorStop(0.18, "rgba(6, 8, 10, 0.34)");
    floorGradient.addColorStop(0.58, "rgba(7, 9, 11, 0.76)");
    floorGradient.addColorStop(1, "rgba(8, 10, 12, 0.92)");
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, 430, 1280, 290);

    leftVignette = ctx.createLinearGradient(0, 0, 200, 0);
    leftVignette.addColorStop(0, "rgba(4, 5, 7, 0.68)");
    leftVignette.addColorStop(1, "rgba(4, 5, 7, 0)");
    ctx.fillStyle = leftVignette;
    ctx.fillRect(0, 0, 200, 720);

    rightVignette = ctx.createLinearGradient(1280, 0, 1088, 0);
    rightVignette.addColorStop(0, "rgba(4, 5, 7, 0.74)");
    rightVignette.addColorStop(1, "rgba(4, 5, 7, 0)");
    ctx.fillStyle = rightVignette;
    ctx.fillRect(1088, 0, 192, 720);

    if (focus && focus.active) {
      drawStageMistVeil(ctx, corridorLeft + corridorWidth * 0.5, corridorTop + 224, corridorWidth * 0.36, 210, {
        inner: "rgba(5, 6, 8, " + (0.12 + clamp(focus.intensity || 0, 0, 1) * 0.06) + ")",
        mid: "rgba(5, 6, 8, 0.08)",
        outer: "rgba(5, 6, 8, 0.02)"
      });
    }

    ctx.restore();
  }

  function renderBackgroundPolished(ctx, state, layout, enemyBoxes, engagementFocus) {
    var profile = getCombatBackdropProfile(state && state.combat ? state.combat.nodeType : "street");
    var playerStyle = state && state.player ? state.player.chosenStyle : "basic";
    var playerStageProfile = getPlayerStageProfile(playerStyle);
    var focusState = engagementFocus && typeof engagementFocus.active === "boolean" ? engagementFocus : getCombatEngagementFocus();
    var playerStageFrame = getPlayerStageFrame(Array.isArray(enemyBoxes) ? enemyBoxes.length : 1);
    var enemyClusterFrame = getEnemyClusterStageFrame(enemyBoxes, layout);
    var threatRailX = clamp(Math.round(enemyClusterFrame.glowX - enemyClusterFrame.railWidth * 0.5), 720, 834);

    G.render.canvasUtils.clear(ctx, "#07090d");

    ctx.save();
    var playerGlow = ctx.createRadialGradient(380, 390, 56, 380, 390, 350);
    var enemyGlow = ctx.createRadialGradient(
      enemyClusterFrame.glowX,
      enemyClusterFrame.glowY,
      84,
      enemyClusterFrame.glowX,
      enemyClusterFrame.glowY,
      330
    );
    var pressureGlow = ctx.createRadialGradient(
      enemyClusterFrame.pressureX,
      enemyClusterFrame.pressureY,
      18,
      enemyClusterFrame.pressureX,
      enemyClusterFrame.pressureY,
      enemyClusterFrame.pressureRadius
    );
    var arenaGlow = ctx.createRadialGradient(626, 378, 62, 626, 378, 360);
    var coolWash = null;
    var centerColumn = null;
    var sideVignette = null;
    var footFalloff = null;
    var canvasWidth = ctx && ctx.canvas ? (ctx.canvas.logicalWidth || ctx.canvas.width) : 1280;
    var canvasHeight = ctx && ctx.canvas ? (ctx.canvas.logicalHeight || ctx.canvas.height) : 720;
    if (G.render.assets && typeof G.render.assets.drawCombatBackdrop === "function") {
      G.render.assets.drawCombatBackdrop(ctx, {
        x: 0,
        y: 0,
        width: 1280,
        height: 720,
        nodeType: state && state.combat ? state.combat.nodeType : "street"
      });
    }

    coolWash = ctx.createLinearGradient(0, 0, 0, 720);
    coolWash.addColorStop(0, "rgba(6, 10, 14, 0.58)");
    coolWash.addColorStop(0.42, "rgba(6, 10, 14, 0.38)");
    coolWash.addColorStop(1, "rgba(5, 8, 12, 0.72)");
    coolWash.addColorStop(0, "rgba(20, 12, 8, 0.75)");
    coolWash.addColorStop(0.42, "rgba(20, 12, 8, 0.4)");
    coolWash.addColorStop(1, "rgba(10, 2, 2, 0.85)"); // 底部沉淀出暗红色血液感
    ctx.fillStyle = coolWash;
    ctx.fillRect(0, 0, 1280, 720);

    // 增加全屏的"老照片暗角/血迹污染"叠加
    var globalVignette = ctx.createRadialGradient(640, 360, 200, 640, 360, 800);
    globalVignette.addColorStop(0, "rgba(0,0,0,0)");
    globalVignette.addColorStop(0.7, "rgba(15, 5, 0, 0.45)");
    globalVignette.addColorStop(1, "rgba(25, 0, 0, 0.8)");
    ctx.fillStyle = globalVignette;
    ctx.fillRect(0, 0, 1280, 720);

    centerColumn = ctx.createLinearGradient(640, 92, 640, 574);
    centerColumn.addColorStop(0, "rgba(70, 86, 96, 0.16)");
    centerColumn.addColorStop(0.14, "rgba(44, 56, 64, 0.22)");
    centerColumn.addColorStop(0.76, "rgba(15, 21, 27, 0.18)");
    centerColumn.addColorStop(1, "rgba(8, 12, 16, 0)");
    ctx.fillStyle = centerColumn;
    ctx.fillRect(548, 92, 184, 468);

    sideVignette = ctx.createLinearGradient(0, 0, 1280, 0);
    sideVignette.addColorStop(0, "rgba(3, 5, 8, 0.6)");
    sideVignette.addColorStop(0.14, "rgba(4, 6, 9, 0.22)");
    sideVignette.addColorStop(0.5, "rgba(0, 0, 0, 0)");
    sideVignette.addColorStop(0.86, "rgba(4, 6, 9, 0.24)");
    sideVignette.addColorStop(1, "rgba(3, 5, 8, 0.66)");
    ctx.fillStyle = sideVignette;
    ctx.fillRect(0, 0, 1280, 720);

    playerGlow.addColorStop(0, playerStageProfile.glow);
    playerGlow.addColorStop(1, "rgba(48, 58, 66, 0)");
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = playerGlow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    enemyGlow.addColorStop(0, profile.enemyGlow);
    enemyGlow.addColorStop(1, "rgba(188, 214, 208, 0)");
    ctx.fillStyle = enemyGlow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    pressureGlow.addColorStop(0, "rgba(196, 214, 206, " + (0.1 + enemyClusterFrame.frontWeight * 0.12) + ")");
    pressureGlow.addColorStop(0.42, "rgba(42, 70, 76, " + (0.08 + enemyClusterFrame.frontWeight * 0.08) + ")");
    pressureGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = pressureGlow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    arenaGlow.addColorStop(0, profile.arenaGlow);
    arenaGlow.addColorStop(1, "rgba(28, 48, 56, 0)");
    ctx.fillStyle = arenaGlow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = profile.ember;
    ctx.beginPath();
    ctx.arc(88, 46, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(enemyClusterFrame.emberX, enemyClusterFrame.emberY, 72, 0, Math.PI * 2);
    ctx.fill();

    if (focusState.active) {
      ctx.fillStyle = "rgba(10, 9, 11, " + (0.12 + clamp(focusState.intensity || 0, 0, 1) * 0.18) + ")";
      ctx.fillRect(140, 86, 1110, 580);
    }

    footFalloff = ctx.createLinearGradient(0, 448, 0, 720);
    footFalloff.addColorStop(0, "rgba(0, 0, 0, 0)");
    footFalloff.addColorStop(0.36, "rgba(4, 6, 10, 0.24)");
    footFalloff.addColorStop(1, "rgba(4, 6, 10, 0.64)");
    ctx.fillStyle = footFalloff;
    ctx.fillRect(0, 448, 1280, 272);

    drawPlayerLaneBackdrop(ctx, layout, playerStageProfile, focusState, playerStageFrame);

    if (Array.isArray(enemyBoxes)) {
      drawConflictCorridor(ctx, enemyBoxes, playerStageProfile, profile, focusState, playerStageFrame);
      enemyBoxes.slice().sort(function (left, right) {
        return (left.formationIndex || 0) - (right.formationIndex || 0);
      }).forEach(function (box) {
        drawEnemyLaneBackdrop(ctx, box, profile, box.formationIndex || 0, enemyBoxes.length, focusState, playerStageFrame);
      });
    }
    ctx.restore();

    if (!G.render.assets.drawPlayerPortrait(ctx, {
      style: playerStyle,
      x: playerStageFrame.x,
      y: playerStageFrame.y,
      width: playerStageFrame.width,
      height: playerStageFrame.height,
      accent: playerStageProfile.accent,
      presentation: "battlefield"
    })) {
      drawDuelSilhouette(
        ctx,
        playerStageFrame.silhouetteCenterX,
        playerStageFrame.silhouetteBaseY,
        playerStageFrame.silhouetteScale,
        playerStageProfile,
        1,
        playerStyle
      );
    }

  }

  function renderEncounterHeaderPolished(ctx, state, layout) {
    var nodeTypeLabels = {
      street: "喋血街头",
      elite: "强敌截杀",
      nemesis: "宿敌复仇",
      gate: "关卡死斗"
    };
    var aliveCount = state.combat.enemies.filter(function (enemy) {
      return enemy.hp > 0;
    }).length;
    var subtitle = getEncounterMetaLine(state, aliveCount);

    ctx.save();
    ctx.strokeStyle = "rgba(214, 186, 142, 0.18)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(layout.headerPanel.x + layout.headerPanel.width / 2, layout.headerPanel.y - 6);
    ctx.lineTo(layout.headerPanel.x + layout.headerPanel.width / 2, layout.headerPanel.y + 4);
    ctx.stroke();
    ctx.fillStyle = "rgba(236, 214, 182, 0.16)";
    ctx.beginPath();
    ctx.arc(layout.headerPanel.x + layout.headerPanel.width / 2, layout.headerPanel.y - 6, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawCombatSlip(ctx, layout.headerPanel.x + 18, layout.headerPanel.y + 8, layout.headerPanel.width - 36, 54, {
      fill: "rgba(58, 49, 41, 0.42)",
      stroke: "rgba(215, 178, 122, 0.22)"
    });
    ctx.save();
    ctx.strokeStyle = "rgba(214, 186, 142, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(layout.headerPanel.x + 34, layout.headerPanel.y + 19);
    ctx.lineTo(layout.headerPanel.x + layout.headerPanel.width - 34, layout.headerPanel.y + 19);
    ctx.moveTo(layout.headerPanel.x + 54, layout.headerPanel.y + 56);
    ctx.lineTo(layout.headerPanel.x + layout.headerPanel.width - 54, layout.headerPanel.y + 56);
    ctx.stroke();
    ctx.restore();
    G.render.ui.drawLabel(ctx, state.combat.encounterName || "遭遇战", layout.encounterTitle.x, layout.headerPanel.y + 28, {
      size: 27,
      align: layout.encounterTitle.align || "center",
      color: "#f0e5d6"
    });
    G.render.ui.drawLabel(ctx, subtitle, layout.encounterSubtitle.x, layout.headerPanel.y + 48, {
      size: 11,
      align: layout.encounterSubtitle.align || "center",
      color: "rgba(211, 198, 177, 0.84)",
      shadow: false
    });
    drawCombatChip(ctx, layout.headerPanel.x + 28, layout.headerPanel.y + 18, nodeTypeLabels[state.combat.nodeType] || "战斗", {
      fill: "rgba(25, 20, 18, 0.62)",
      stroke: "rgba(216, 188, 150, 0.14)",
      color: "#bda78c",
      size: 11,
      paddingX: 10,
      height: 22
    });
    ctx.save();
    ctx.strokeStyle = "rgba(181, 69, 69, 0.6)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(layout.headerPanel.x + layout.headerPanel.width - 14, layout.headerPanel.y + 58, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    G.render.ui.drawLabel(ctx, "战", layout.headerPanel.x + layout.headerPanel.width - 14, layout.headerPanel.y + 58, {
      size: 8,
      align: "center",
      color: "rgba(181, 69, 69, 0.84)",
      shadow: false
    });
  }

  function getCombatStatusChipPalette(key, variant) {
    if (key === "iron") {
      if (variant === "ready") {
        return {
          fill: "rgba(92, 66, 22, 0.86)",
          stroke: "rgba(230, 199, 136, 0.32)",
          color: "#f8edd5",
          size: 10,
          height: 22,
          paddingX: 10
        };
      }
      return {
        fill: "rgba(54, 44, 33, 0.8)",
        stroke: "rgba(194, 172, 141, 0.18)",
        color: "#d8c7b0",
        size: 10,
        height: 22,
        paddingX: 10
      };
    }

    if (key === "poison") {
      return {
        fill: "rgba(44, 61, 30, 0.84)",
        stroke: "rgba(182, 207, 126, 0.26)",
        color: "#edf4da",
        size: 10,
        height: 22,
        paddingX: 10
      };
    }

    if (key === "combo") {
      if (variant === "ready") {
        return {
          fill: "rgba(101, 71, 23, 0.86)",
          stroke: "rgba(233, 204, 129, 0.32)",
          color: "#fff0ca",
          size: 10,
          height: 22,
          paddingX: 10
        };
      }
      if (variant === "spent") {
        return {
          fill: "rgba(67, 51, 29, 0.78)",
          stroke: "rgba(180, 151, 108, 0.18)",
          color: "#cfbea2",
          size: 10,
          height: 22,
          paddingX: 10
        };
      }
      return {
        fill: "rgba(58, 48, 30, 0.8)",
        stroke: "rgba(197, 170, 123, 0.18)",
        color: "#d9cdb4",
        size: 10,
        height: 22,
        paddingX: 10
      };
    }

    if (key === "flaw") {
      return {
        fill: "rgba(117, 24, 35, 0.9)",
        stroke: "rgba(226, 193, 140, 0.28)",
        color: "#f8eee0",
        size: 10,
        height: 22,
        paddingX: 9
      };
    }

    if (key === "fester") {
      return {
        fill: "rgba(57, 90, 37, 0.88)",
        stroke: "rgba(206, 214, 133, 0.26)",
        color: "#f3f6e1",
        size: 10,
        height: 22,
        paddingX: 9
      };
    }

    if (key === "blind") {
      return {
        fill: "rgba(102, 90, 47, 0.88)",
        stroke: "rgba(238, 223, 159, 0.26)",
        color: "#fff4cd",
        size: 10,
        height: 22,
        paddingX: 9
      };
    }

    if (key === "cripple") {
      return {
        fill: "rgba(75, 64, 41, 0.88)",
        stroke: "rgba(215, 193, 138, 0.24)",
        color: "#f4e8cb",
        size: 10,
        height: 22,
        paddingX: 9
      };
    }

    if (key === "fervor") {
      return {
        fill: "rgba(95, 54, 15, 0.9)",
        stroke: "rgba(239, 206, 138, 0.28)",
        color: "#fff1d1",
        size: 10,
        height: 22,
        paddingX: 9
      };
    }

    return {
      fill: "rgba(25, 20, 18, 0.8)",
      stroke: "rgba(210, 184, 146, 0.28)",
      color: "#f2e6d5",
      size: 10,
      height: 22,
      paddingX: 10
    };
  }

  function buildPlayerStatusChips(state, player, options) {
    var chips = [];
    var showIronBone = player.chosenStyle === "iron";
    var comboThreshold = G.statusEffects && typeof G.statusEffects.COMBO_THRESHOLD === "number" ?
      G.statusEffects.COMBO_THRESHOLD :
      3;
    var comboCount = G.statusEffects && typeof G.statusEffects.getComboCount === "function" ?
      G.statusEffects.getComboCount(state) :
      0;
    var comboRemaining = G.statusEffects && typeof G.statusEffects.getComboDiscountsRemaining === "function" ?
      G.statusEffects.getComboDiscountsRemaining(state) :
      0;
    var comboActive = G.statusEffects && typeof G.statusEffects.isComboDiscountActive === "function" ?
      G.statusEffects.isComboDiscountActive(state) :
      false;
    var poisonTurns = G.statusEffects && typeof G.statusEffects.getPlayerPoisonTurns === "function" ?
      G.statusEffects.getPlayerPoisonTurns(state) :
      0;
    var ironBoneActive = G.statusEffects && typeof G.statusEffects.isIronBoneActive === "function" ?
      G.statusEffects.isIronBoneActive(state) :
      false;
    var ironBoneThreshold = G.statusEffects && typeof G.statusEffects.IRON_BONE_THRESHOLD === "number" ?
      G.statusEffects.IRON_BONE_THRESHOLD :
      10;
    var remainingIron = Math.max(0, ironBoneThreshold - (Number(player.block) || 0));
    var compact = !!(options && options.compact);
    var playerChipWidth = compact ? 56 : 68;

    function withPlayerChipSizing(palette) {
      return Object.assign({}, palette, {
        minWidth: playerChipWidth,
        height: 20,
        size: compact ? 9 : 10,
        paddingX: compact ? 8 : 10
      });
    }

    if (showIronBone) {
      chips.push({
        text: ironBoneActive ?
          "\u94c1\u9aa8\u5df2\u6210" :
          (compact ? "\u94c1\u9aa8\u5f85 " + remainingIron : "\u94c1\u9aa8\u5f85\u53d1 " + remainingIron),
        palette: withPlayerChipSizing(getCombatStatusChipPalette("iron", ironBoneActive ? "ready" : "charging"))
      });
    }

    if (poisonTurns > 0) {
      chips.push({
        text: "\u4e2d\u6bd2 " + poisonTurns,
        palette: withPlayerChipSizing(getCombatStatusChipPalette("poison"))
      });
    }

    if (player.chosenStyle === "combo" || comboCount > 0) {
      chips.push({
        text: comboActive ?
          (compact ? "\u8fde\u73af\u8d77 " + comboRemaining : "\u8fde\u73af\u5df2\u8d77 " + comboRemaining) :
          (comboCount >= comboThreshold ? "\u8fde\u73af\u5df2\u5c3d" : "\u8fde\u73af " + comboCount + " / " + comboThreshold),
        palette: withPlayerChipSizing(getCombatStatusChipPalette("combo", comboActive ? "ready" : (comboCount >= comboThreshold ? "spent" : "charging")))
      });
    }

    return chips;
  }

  function buildEnemyStatusChips(enemy, compact) {
    var chips = [];
    var flaw = G.statusEffects.getFlaw(enemy);
    var fester = G.statusEffects.getFester(enemy);
    var blind = G.statusEffects.getBlind(enemy);
    var crippleTurns = G.statusEffects.getCrippleTurns(enemy);
    var fervor = enemy.buffs && enemy.buffs.fervor ? enemy.buffs.fervor : 0;
    var enemyChipWidth = compact ? 40 : 50;

    function withEnemyChipSizing(palette) {
      return Object.assign({}, palette, {
        minWidth: enemyChipWidth,
        height: compact ? 17 : 18,
        size: compact ? 8 : 9,
        paddingX: compact ? 6 : 8,
        flat: true,
        lineWidth: 0.9
      });
    }

    function pushChip(label, shortLabel, value, key) {
      if (value <= 0) {
        return;
      }
      chips.push({
        text: compact ? shortLabel + " " + value : label + " " + value,
        palette: withEnemyChipSizing(getCombatStatusChipPalette(key))
      });
    }

    pushChip("\u7834\u7efd", "\u7834", flaw, "flaw");
    pushChip("\u6e83\u70c2", "\u6e83", fester, "fester");
    pushChip("\u8ff7\u773c", "\u8ff7", blind, "blind");
    pushChip("\u6b8b\u5e9f", "\u6b8b", crippleTurns, "cripple");
    pushChip("\u72c2\u70ed", "\u72c2", fervor, "fervor");
    return chips;
  }

  function getEncounterMetaLine(state, aliveCount) {
    var nodeTypeMetaLabels = {
      street: "街斗",
      elite: "截杀",
      nemesis: "宿敌",
      gate: "关战"
    };

    return (nodeTypeMetaLabels[state.combat.nodeType] || "战斗") + " · " + aliveCount + "敌";
  }

  function getCompactCombatHintText(state, hasPlayedCards) {
    var text = state && state.combat ? String(state.combat.lastAction || "") : "";

    if (state && state.combat && state.combat.result === "active") {
      if (state.combat.selectedCardId) {
        return "\u70b9\u654c\u4eba\u65bd\u5c55";
      }
      if (!hasPlayedCards) {
        return "\u5148\u9009\u624b\u724c";
      }
    }

    if (!text) {
      return "";
    }

    if (text === "\u6b63\u5728\u67e5\u770b\u62bd\u724c\u5806\u3002") {
      return "\u67e5\u770b\u62bd\u724c\u5806";
    }
    if (text === "\u6b63\u5728\u67e5\u770b\u5f03\u724c\u5806\u3002") {
      return "\u67e5\u770b\u5f03\u724c\u5806";
    }
    if (text === "\u8fd9\u4ef6\u65e7\u7269\u73b0\u5728\u8fd8\u6d3e\u4e0d\u4e0a\u7528\u573a\u3002") {
      return "\u65e7\u7269\u6682\u4e0d\u53ef\u7528";
    }

    return text.replace(/\u3002$/, "");
  }

  function renderPlayerPanelPolished(ctx, state, layout) {
    var ui = G.render.ui;
    var player = state.player;
    var styleLabel = getPlayerStyleLabel(player.chosenStyle);
    var showIronBone = player.chosenStyle === "iron";
    var comboThreshold = G.statusEffects && typeof G.statusEffects.COMBO_THRESHOLD === "number" ?
      G.statusEffects.COMBO_THRESHOLD :
      3;
    var comboCount = G.statusEffects && typeof G.statusEffects.getComboCount === "function" ?
      G.statusEffects.getComboCount(state) :
      0;
    var comboRemaining = G.statusEffects && typeof G.statusEffects.getComboDiscountsRemaining === "function" ?
      G.statusEffects.getComboDiscountsRemaining(state) :
      0;
    var comboActive = G.statusEffects && typeof G.statusEffects.isComboDiscountActive === "function" ?
      G.statusEffects.isComboDiscountActive(state) :
      false;
    var showCombo = player.chosenStyle === "combo" || comboCount > 0;
    var ironBoneActive = G.statusEffects && typeof G.statusEffects.isIronBoneActive === "function" ?
      G.statusEffects.isIronBoneActive(state) :
      false;
    var poisonTurns = G.statusEffects && typeof G.statusEffects.getPlayerPoisonTurns === "function" ?
      G.statusEffects.getPlayerPoisonTurns(state) :
      0;
    var statusLines = [];
    var statusX = 0;
    var statusY = 0;
    var statusRowWidth = 0;
    var cursorX = 0;
    var chipWidth = 0;
    var panelX = 0;
    var panelY = 0;
    var panelWidth = 0;
    var panelHeight = 0;
    var energyText = "";
    var stanceText = "";
    var energyWidth = 0;
    var stanceWidth = 0;
    var energyX = 0;
    var stanceX = 0;
    var resourceY = 0;

    if (showIronBone) {
      statusLines.push({
        text: ironBoneActive ?
          "铁骨已成" :
          "铁骨待发 (" + (G.statusEffects.IRON_BONE_THRESHOLD - player.block > 0 ? (G.statusEffects.IRON_BONE_THRESHOLD - player.block) : 0) + ")",
        color: ironBoneActive ? "#dfbf7f" : "#8e7d68"
      });
    }

    if (poisonTurns > 0) {
      statusLines.push({
        text: "中毒 " + poisonTurns,
        color: "#b7cf85"
      });
    }

    if (showCombo) {
      statusLines.push({
        text: comboActive ?
          "连环已起 (" + comboRemaining + ")" :
          (comboCount >= comboThreshold ? "连环已尽" : "连环 " + comboCount + " / " + comboThreshold),
        color: comboActive ? "#d8c77f" : (comboCount >= comboThreshold ? "#9b7f55" : "#8e8768")
      });
    }

    panelX = layout.playerPanel.x + 4;
    panelY = layout.playerPanel.y + 10;
    panelWidth = layout.playerPanel.width - 24;
    panelHeight = 120 + (statusLines.length > 0 ? 28 : 0) + (statusLines.length > 2 ? 26 : 0);
    statusX = layout.playerPanel.x + 16;
    statusY = layout.playerPanel.y + 130;
    statusRowWidth = panelWidth - 24;
    energyText = "\u4f53\u529b " + player.energy + " / " + player.maxEnergy;
    stanceText = "\u67b6\u52bf " + player.block;
    resourceY = layout.playerPanel.y + 95;

    drawCombatSlip(ctx, panelX, panelY, panelWidth, panelHeight, {
      fill: "rgba(54, 43, 36, 0.54)",
      stroke: "rgba(215, 178, 122, 0.22)"
    });
    ctx.save();
    ctx.fillStyle = "rgba(208, 178, 132, 0.72)";
    ctx.beginPath();
    ctx.arc(panelX + 10, panelY + 10, 2.4, 0, Math.PI * 2);
    ctx.arc(panelX + panelWidth - 10, panelY + 10, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(214, 186, 142, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 18, panelY + 18);
    ctx.lineTo(panelX + panelWidth - 18, panelY + 18);
    ctx.moveTo(panelX + 26, panelY + 48);
    ctx.lineTo(panelX + panelWidth - 26, panelY + 48);
    ctx.stroke();
    ctx.restore();
    ui.drawLabel(ctx, styleLabel, layout.playerPanel.x + 16, layout.playerPanel.y + 26, {
      size: 18,
      color: "#f3e8d8"
    });
    ui.drawLabel(ctx, "生存档案", layout.playerPanel.x + layout.playerPanel.width - 18, layout.playerPanel.y + 28, {
      size: 10,
      align: "right",
      color: "#bda78c",
      shadow: false
    });

    ui.drawLabel(ctx, player.title || "", layout.playerPanel.x + 16, layout.playerPanel.y + 42, {
      size: 10,
      color: "#8f806f",
      shadow: false
    });

    ui.drawStatBar(ctx, {
      label: "气血",
      x: layout.playerPanel.x + 16,
      y: layout.playerPanel.y + 62,
      width: panelWidth - 24,
      height: 16,
      current: player.hp,
      max: player.maxHp,
      palette: {
        background: "#28191c",
        fill: "#b12034",
        stroke: "#5e2831"
      }
    });

    chipWidth = drawCombatChip(ctx, layout.playerPanel.x + 16, layout.playerPanel.y + 98, "体力 " + player.energy + " / " + player.maxEnergy, {
      fill: "rgba(25, 20, 18, 0.76)",
      stroke: "rgba(220, 191, 151, 0.18)",
      color: "#efe4d1",
      size: 17,
      paddingX: 12,
      height: 28
    });
    drawCombatChip(ctx, layout.playerPanel.x + 24 + chipWidth, layout.playerPanel.y + 98, "架势 " + player.block, {
      fill: "rgba(30, 38, 44, 0.74)",
      stroke: "rgba(175, 196, 208, 0.16)",
      color: "#c7d3da",
      size: 15,
      paddingX: 10,
      height: 28
    });

    statusLines.forEach(function (line) {
      if (cursorX > 0 && cursorX > statusRowWidth - 110) {
        cursorX = 0;
        statusY += 30;
      }
      chipWidth = drawCombatChip(ctx, statusX + cursorX, statusY, line.text, {
        fill: "rgba(24, 20, 18, 0.72)",
        stroke: "rgba(213, 184, 146, 0.16)",
        color: line.color,
        size: 12,
        paddingX: 10,
        height: 24
      });
      cursorX += chipWidth + 8;
    });
  }

  function renderEncounterHeaderPolished(ctx, state, layout) {
    var nodeTypeLabels = {
      street: "\u558b\u8840\u8857\u5934",
      elite: "\u5f3a\u654c\u622a\u6740",
      nemesis: "\u5bbf\u654c\u590d\u4ec7",
      gate: "\u5173\u5361\u6b7b\u6597"
    };
    var bodyFont = G.render.ui.getBodyFontFamily ? G.render.ui.getBodyFontFamily() : "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var aliveCount = state.combat.enemies.filter(function (enemy) {
      return enemy.hp > 0;
    }).length;
    var turnNumber = Math.max(1, state.combat.turn || 1);
    var descriptor = nodeTypeLabels[state.combat.nodeType] || "\u6218\u6597";
    var descriptorText = "";
    var turnLabel = "\u56de\u5408";
    var turnValue = String(turnNumber);
    var centerX = layout.headerPanel.x + layout.headerPanel.width / 2;
    var panelWidth = 0;
    var panelX = 0;
    var labelWidth = 0;
    var valueWidth = 0;
    var contentWidth = 0;
    var groupGap = 8;
    var groupStartX = 0;
    var showDescriptor = false;

    if (state.combat.nodeType === "nemesis" && state.combat.nemesisTitle) {
      descriptor = nodeTypeLabels.nemesis + " \u00b7 " + state.combat.nemesisTitle;
    }
    showDescriptor = state.combat.nodeType === "elite" || state.combat.nodeType === "gate" || state.combat.nodeType === "nemesis" || aliveCount > 1;
    descriptorText = descriptor + (aliveCount > 1 ? " \u00b7 " + aliveCount + "\u654c" : "");

    ctx.save();
    ctx.font = "600 12px " + bodyFont;
    labelWidth = Math.ceil(ctx.measureText(turnLabel).width);
    ctx.font = "700 24px " + bodyFont;
    valueWidth = Math.ceil(ctx.measureText(turnValue).width);
    ctx.restore();
    contentWidth = labelWidth + groupGap + valueWidth;
    panelWidth = Math.max(126, contentWidth + 36);
    panelX = Math.round(centerX - panelWidth / 2);
    groupStartX = Math.round(centerX - contentWidth / 2);

    drawCombatFlatPanel(ctx, panelX, layout.headerPanel.y + 5, panelWidth, 34, {
      fill: "rgba(9, 11, 14, 0.54)",
      midFill: "rgba(7, 9, 12, 0.58)",
      bottomFill: "rgba(4, 5, 7, 0.74)",
      stroke: "rgba(210, 188, 160, 0.1)",
      accentLine: "rgba(216, 188, 150, 0.02)",
      topGlow: "rgba(255, 240, 216, 0.024)",
      lineWidth: 1
    });
    ctx.save();
    ctx.strokeStyle = "rgba(214, 196, 170, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 16, layout.headerPanel.y + 14);
    ctx.lineTo(panelX + 30, layout.headerPanel.y + 14);
    ctx.moveTo(panelX + panelWidth - 16, layout.headerPanel.y + 14);
    ctx.lineTo(panelX + panelWidth - 30, layout.headerPanel.y + 14);
    ctx.stroke();
    ctx.restore();
    G.render.ui.drawLabel(ctx, turnLabel, groupStartX, layout.headerPanel.y + 21, {
      size: 12,
      align: "left",
      color: "#d8c7af",
      shadowColor: "rgba(0, 0, 0, 0.72)",
      shadowBlur: 3,
      shadowOffsetX: 0,
      shadowOffsetY: 1,
      fontFamily: bodyFont
    });
    G.render.ui.drawLabel(ctx, turnValue, groupStartX + labelWidth + groupGap, layout.headerPanel.y + 21, {
      size: 24,
      weight: "700",
      align: "left",
      color: "#bc5548",
      shadowColor: "rgba(0, 0, 0, 0.76)",
      shadowBlur: 4,
      shadowOffsetX: 0,
      shadowOffsetY: 1,
      fontFamily: bodyFont
    });
    if (showDescriptor) {
      G.render.ui.drawLabel(ctx, descriptorText, centerX, layout.headerPanel.y + 43, {
        size: 8,
        align: "center",
        color: "#8f8274",
        shadow: false,
        fontFamily: bodyFont
      });
    }

    ctx.save();
    ctx.strokeStyle = "rgba(214, 186, 142, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, layout.headerPanel.y - 6);
    ctx.lineTo(centerX, layout.headerPanel.y + 4);
    ctx.stroke();
    ctx.fillStyle = "rgba(236, 214, 182, 0.16)";
    ctx.beginPath();
    ctx.arc(centerX, layout.headerPanel.y - 6, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function renderPlayerPanelPolished(ctx, state, layout) {
    var ui = G.render.ui;
    var player = state.player;
    var styleLabel = getPlayerStyleLabel(player.chosenStyle);
    var titleFont = ui.getTitleFontFamily ? ui.getTitleFontFamily() : "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var bodyFont = ui.getBodyFontFamily ? ui.getBodyFontFamily() : "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var statusChips = buildPlayerStatusChips(state, player);
    var statusRows = [];
    var statusX = 0;
    var statusY = 0;
    var statusRowGap = 4;
    var statusRowsHeight = 0;
    var panelX = layout.playerPanel.x;
    var panelY = layout.playerPanel.y;
    var panelWidth = layout.playerPanel.width;
    var panelHeight = 0;
    var statLeft = panelX + 14;
    var statRight = panelX + panelWidth - 14;
    var statWidth = panelWidth - 28;
    var nameY = panelY + 30;
    var hpBarY = panelY + 42;
    var resourceY = panelY + 60;
    var bandX = panelX + 6;
    var bandY = panelY + 18;
    var bandWidth = panelWidth - 12;
    var bandHeight = 0;
    var panelCenterX = panelX + panelWidth * 0.5;
    var energyText = "";
    var stanceText = "";
    var energyWidth = 0;
    var stanceWidth = 0;
    var energyChipWidth = 0;
    var stanceChipWidth = 0;
    var energyChipHeight = 18;
    var stanceChipHeight = 18;
    var energyChipX = 0;
    var stanceChipX = 0;
    var chipRowY = 0;
    statusX = panelX + 14;
    statusRows = layoutCombatChipRows(ctx, statusChips, 1, 6);
    statusRowsHeight = measureCombatChipRowsHeight(statusRows, statusRowGap);
    panelHeight = 76 + (statusRows.length > 0 ? statusRowsHeight + 12 : 0);
    bandHeight = panelHeight;
    statusY = bandY + 66;
    energyText = "\u4f53\u529b " + player.energy + " / " + player.maxEnergy;
    stanceText = "\u67b6\u52bf " + player.block;
    resourceY = hpBarY + 22;
    chipRowY = resourceY - energyChipHeight / 2;
    ctx.save();
    ctx.font = "600 12px " + bodyFont;
    energyWidth = Math.ceil(ctx.measureText(energyText).width);
    stanceWidth = Math.ceil(ctx.measureText(stanceText).width);
    ctx.restore();
    energyChipWidth = energyWidth + 18;
    stanceChipWidth = stanceWidth + 18;
    energyChipX = statLeft;
    stanceChipX = statRight - stanceChipWidth;

    drawStageMistVeil(ctx, panelCenterX - panelWidth * 0.05, bandY + bandHeight * 0.56, Math.max(88, panelWidth * 0.66), Math.max(42, bandHeight * 0.8), {
      inner: "rgba(6, 9, 12, 0.18)",
      mid: "rgba(6, 9, 12, 0.08)",
      outer: "rgba(7, 9, 11, 0.02)",
      rotation: -0.04,
      outerX: -0.1,
      outerY: 0.08
    });
    ctx.save();
    var bandWash = ctx.createLinearGradient(bandX, 0, bandX + bandWidth, 0);
    bandWash.addColorStop(0, "rgba(8, 11, 15, 0.28)");
    bandWash.addColorStop(0.18, "rgba(8, 11, 15, 0.18)");
    bandWash.addColorStop(0.72, "rgba(8, 11, 15, 0.08)");
    bandWash.addColorStop(1, "rgba(8, 11, 15, 0)");
    ctx.fillStyle = bandWash;
    ctx.fillRect(bandX, bandY + 6, bandWidth, Math.max(28, bandHeight - 10));
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(214, 198, 178, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(statLeft, bandY + 16);
    ctx.lineTo(statRight, bandY + 16);
    ctx.moveTo(statLeft, bandY + 16);
    ctx.lineTo(statLeft, bandY + bandHeight - 6);
    ctx.stroke();
    ctx.restore();

    ui.drawLabel(ctx, styleLabel, statLeft, nameY, {
      size: 13,
      color: "#e6dfd4",
      fontFamily: titleFont,
      shadowColor: "rgba(0, 0, 0, 0.74)",
      shadowBlur: 4,
      shadowOffsetX: 0,
      shadowOffsetY: 1
    });
    ui.drawLabel(ctx, player.hp + " / " + player.maxHp, statRight, nameY, {
      size: 15,
      align: "right",
      color: "#f0e8dc",
      fontFamily: bodyFont,
      shadowColor: "rgba(0, 0, 0, 0.72)",
      shadowBlur: 3,
      shadowOffsetX: 0,
      shadowOffsetY: 1
    });
    ui.drawBar(ctx, statLeft, hpBarY, statWidth, 11, player.maxHp > 0 ? player.hp / player.maxHp : 0, {
      textureRole: "combat-blood",
      background: "rgba(10, 12, 16, 0.8)",
      fill: "#a12d2f",
      stroke: "rgba(132, 35, 37, 0.34)",
      filter: "brightness(1.08) contrast(1.04)"
    });
    drawCombatSlip(ctx, energyChipX, chipRowY, energyChipWidth, energyChipHeight, {
      fill: "rgba(28, 23, 21, 0.42)",
      stroke: "rgba(170, 146, 112, 0.12)",
      lineWidth: 0.9
    });
    drawCombatSlip(ctx, stanceChipX, chipRowY, stanceChipWidth, stanceChipHeight, {
      fill: "rgba(28, 23, 21, 0.42)",
      stroke: "rgba(170, 146, 112, 0.12)",
      lineWidth: 0.9
    });
    ui.drawLabel(ctx, energyText, energyChipX + 9, resourceY, {
      size: 12,
      align: "left",
      color: "#ddd6ca",
      fontFamily: bodyFont,
      shadowColor: "rgba(0, 0, 0, 0.64)",
      shadowBlur: 2,
      shadowOffsetX: 0,
      shadowOffsetY: 1
    });
    ui.drawLabel(ctx, stanceText, stanceChipX + 9, resourceY, {
      size: 12,
      align: "left",
      color: "#ddd6ca",
      fontFamily: bodyFont,
      shadowColor: "rgba(0, 0, 0, 0.64)",
      shadowBlur: 2,
      shadowOffsetX: 0,
      shadowOffsetY: 1
    });
    drawCombatChipRows(ctx, statusRows, statusX, statusY, {
      gap: 5,
      rowGap: statusRowGap
    });
  }

  function renderRelicPanelCompact(ctx, state, layout) {
    var relics = G.relicRuntime && typeof G.relicRuntime.getCombatDisplay === "function" ?
      G.relicRuntime.getCombatDisplay(state) :
      [];
    var badge = layout.relicBadge;
    var visible = relics.slice(0, 5);
    var i = 0;
    var item = null;
    var x = 0;
    var overflow = Math.max(0, relics.length - visible.length);

    if (!relics || relics.length === 0) {
      return;
    }

    G.render.ui.drawLabel(ctx, "旧物 " + relics.length, layout.relicPanel.x + 10, layout.relicPanel.y + 12, {
      size: 11,
      color: "#bba68a",
      shadow: false
    });

    ctx.save();
    ctx.strokeStyle = "rgba(213, 184, 146, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(layout.relicPanel.x + 56, layout.relicPanel.y + 11);
    ctx.lineTo(layout.relicPanel.x + layout.relicPanel.width - 12, layout.relicPanel.y + 11);
    ctx.stroke();
    ctx.restore();

    for (i = 0; i < visible.length; i += 1) {
      item = visible[i];
      x = layout.relicPanel.x + 10 + i * (badge.width + badge.gap);

      drawCombatSlip(ctx, x, layout.relicPanel.y + 22, badge.width, badge.height, {
        fill: item.active ? "rgba(87, 53, 18, 0.72)" : "rgba(54, 51, 48, 0.6)",
        stroke: item.active ? "rgba(223, 191, 127, 0.26)" : "rgba(142, 125, 104, 0.2)"
      });
      G.render.ui.drawLabel(ctx, item.icon, x + badge.width / 2, layout.relicPanel.y + 42, {
        size: 18,
        align: "center",
        color: "#f4ead9"
      });
    }

    if (overflow > 0) {
      x = layout.relicPanel.x + 10 + visible.length * (badge.width + badge.gap);
      drawCombatSlip(ctx, x, layout.relicPanel.y + 22, badge.width, badge.height, {
        fill: "rgba(32, 30, 30, 0.68)",
        stroke: "rgba(142, 125, 104, 0.18)"
      });
      G.render.ui.drawLabel(ctx, "+" + overflow, x + badge.width / 2, layout.relicPanel.y + 42, {
        size: 16,
        align: "center",
        color: "#f4ead9"
      });
    }
  }

  function drawEnemyTargetHalo(ctx, box, focused, emphasis, sourceGlow) {
    var strength = clamp(emphasis || 0, 0, 1);
    var insetX = box.width * 0.16;
    var insetY = box.height * 0.12;
    var fillAlpha = (focused ? 0.1 : 0.06) + strength * (focused ? 0.14 : 0.08);

    ctx.save();
    ctx.fillStyle = sourceGlow ?
      "rgba(166, 92, 74, " + fillAlpha + ")" :
      (focused ? "rgba(196, 116, 86, " + fillAlpha + ")" : "rgba(122, 34, 42, " + Math.max(0.04, fillAlpha * 0.72) + ")");
    ctx.fillRect(box.x + insetX, box.y + insetY, box.width - insetX * 2, box.height * 0.64);
    ctx.restore();
  }

  function renderEnemyBadgesCompact(ctx, enemy, box, slotIndex, slotCount) {
    var compact = box.width < 220;
    var chips = buildEnemyStatusChips(enemy, compact);
    var gap = compact ? 5 : 6;
    var rowGap = compact ? 3 : 4;
    var rows = [];
    var statusHeight = 0;
    var rightX = box.x + box.width - (compact ? 14 : 16);
    var statusBottom = box.y + (compact ? 108 : 116);
    var top = 0;

    if (chips.length === 0) {
      return;
    }

    rows = layoutCombatChipRows(ctx, chips, 1, gap);
    statusHeight = measureCombatChipRowsHeight(rows, rowGap);
    if (slotCount >= 3) {
      statusBottom += slotIndex === 0 ? -8 : (slotIndex === 1 ? -12 : 10);
    }
    top = statusBottom - statusHeight;

    drawCombatChipRows(ctx, rows, rightX, top, {
      align: "right",
      gap: gap,
      rowGap: rowGap
    });
  }

  function renderEnemyAreaPolished(ctx, state, layout, engagementFocus) {
    var enemyBoxes = getEnemyBoxes(layout, state.combat.enemies, getEnemyFormationLock(state));
    var renderOrder = enemyBoxes.slice().sort(function (left, right) {
      return (left.formationIndex || 0) - (right.formationIndex || 0);
    });
    var draggedEnemyBox = findDraggedEnemyBox(state, layout);
    var focusState = engagementFocus && typeof engagementFocus.active === "boolean" ? engagementFocus : getCombatEngagementFocus();
    var drag = G.render && G.render.animations && typeof G.render.animations.getCardDrag === "function" ?
      G.render.animations.getCardDrag("combat") :
      null;
    var i = 0;
    var box = null;
    var enemy = null;

    renderEncounterHeaderPolished(ctx, state, layout);

    for (i = 0; i < renderOrder.length; i += 1) {
      box = renderOrder[i];
      enemy = box.enemy;
      var laneAlpha = 1;
      var slotRole = box.slotRole || getEnemySlotRole(enemyBoxes.length, box.formationIndex || 0);
      var groundWidth = 0.34;
      var groundHeight = Math.max(16, box.height * 0.08);
      var groundAlpha = 0.28;

      if (focusState.active && !drag) {
        if (focusState.sourceSide === "player" && focusState.targetKey) {
          laneAlpha = enemy.id === focusState.targetKey ? 1 : (0.56 + (1 - clamp(focusState.intensity || 0, 0, 1)) * 0.16);
        } else if (focusState.sourceSide === "enemy" && focusState.sourceKey) {
          laneAlpha = enemy.id === focusState.sourceKey ? 1 : 0.74;
        }
      }

      drawSoftGroundShadow(
        ctx,
        box.x + box.width / 2,
        box.y + box.height + 22,
        box.width * groundWidth,
        groundHeight,
        groundAlpha * 2.35,
        -0.06
      );

      if (state.combat.selectedCardId && state.combat.result === "active") {
        drawEnemyTargetHalo(ctx, box, false);
      }

      if (focusState.active && focusState.targetKey === enemy.id) {
        drawEnemyTargetHalo(ctx, box, true, focusState.intensity, false);
      } else if (focusState.active && focusState.sourceKey === enemy.id) {
        drawEnemyTargetHalo(ctx, box, false, focusState.intensity * 0.72, true);
      }

      if (drag && drag.dragging && drag.card && drag.card.playable) {
        drawEnemyTargetHalo(ctx, box, !!(draggedEnemyBox && draggedEnemyBox.enemy.id === enemy.id));
      }
    }

    for (i = 0; i < renderOrder.length; i += 1) {
      box = renderOrder[i];
      enemy = box.enemy;
      var portraitAlpha = 1;

      if (focusState.active && !drag) {
        if (focusState.sourceSide === "player" && focusState.targetKey) {
          portraitAlpha = enemy.id === focusState.targetKey ? 1 : (0.56 + (1 - clamp(focusState.intensity || 0, 0, 1)) * 0.16);
        } else if (focusState.sourceSide === "enemy" && focusState.sourceKey) {
          portraitAlpha = enemy.id === focusState.sourceKey ? 1 : 0.74;
        }
      }

      ctx.save();
      ctx.globalAlpha *= portraitAlpha;
      G.render.ui.drawEnemyCard(ctx, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        templateId: enemy.templateId,
        behavior: enemy.behavior,
        kind: enemy.kind,
        name: enemy.name,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        block: enemy.block,
        intent: enemy.intent,
        intentLabel: enemy.intentLabel,
        intentValue: enemy.intentValue,
        timeMs: state.timeMs,
        firearmStage: enemy.firearmStage,
        currentAdaptation: enemy.currentAdaptation,
        slotIndex: box.formationIndex || 0,
        slotCount: enemyBoxes.length,
        slotRole: box.slotRole || getEnemySlotRole(enemyBoxes.length, box.formationIndex || 0),
        renderMode: "portrait"
      });
      ctx.restore();
    }

    for (i = 0; i < renderOrder.length; i += 1) {
      box = renderOrder[i];
      enemy = box.enemy;
      var overlayAlpha = 1;
      var overlaySlotRole = box.slotRole || getEnemySlotRole(enemyBoxes.length, box.formationIndex || 0);

      if (focusState.active && !drag) {
        if (focusState.sourceSide === "player" && focusState.targetKey) {
          overlayAlpha = enemy.id === focusState.targetKey ? 1 : (0.56 + (1 - clamp(focusState.intensity || 0, 0, 1)) * 0.16);
        } else if (focusState.sourceSide === "enemy" && focusState.sourceKey) {
          overlayAlpha = enemy.id === focusState.sourceKey ? 1 : 0.74;
        }
      }

      ctx.save();
      ctx.globalAlpha *= overlayAlpha;
      G.render.ui.drawEnemyCard(ctx, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        templateId: enemy.templateId,
        behavior: enemy.behavior,
        kind: enemy.kind,
        name: enemy.name,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        block: enemy.block,
        intent: enemy.intent,
        intentLabel: enemy.intentLabel,
        intentValue: enemy.intentValue,
        timeMs: state.timeMs,
        firearmStage: enemy.firearmStage,
        currentAdaptation: enemy.currentAdaptation,
        slotIndex: box.formationIndex || 0,
        slotCount: enemyBoxes.length,
        slotRole: overlaySlotRole,
        renderMode: "overlay"
      });
      renderEnemyBadgesCompact(ctx, enemy, box, box.formationIndex || 0, enemyBoxes.length);
      ctx.restore();
    }
  }

  function renderMetaPanelsPolished(ctx, state, layout) {
    var ui = G.render.ui;
    var overlay = state.combat.ui && state.combat.ui.overlay;
    var counterY = layout.playerPanel.y - 24;
    var drawActive = overlay && overlay.title === "抽牌堆";
    var discardActive = overlay && overlay.title === "弃牌堆";
    var drawX = layout.playerPanel.x - 4;
    var discardX = drawX + 60;

    ui.drawLabel(ctx, "抽", drawX, counterY, {
      size: 14,
      color: drawActive ? "#f0e5d6" : "#a89279",
      shadow: false
    });
    ui.drawLabel(ctx, String(state.combat.drawPileCount), drawX + 28, counterY, {
      size: 18,
      color: drawActive ? "#f0e5d6" : "#d8cdbd",
      shadow: false
    });
    ui.drawLabel(ctx, "弃", discardX, counterY, {
      size: 14,
      color: discardActive ? "#f0e5d6" : "#a89279",
      shadow: false
    });
    ui.drawLabel(ctx, String(state.combat.discardPileCount), discardX + 28, counterY, {
      size: 18,
      color: discardActive ? "#f0e5d6" : "#d8cdbd",
      shadow: false
    });

    if (drawActive || discardActive) {
      ctx.save();
      ctx.strokeStyle = drawActive ? "rgba(215, 178, 122, 0.32)" : "rgba(215, 178, 122, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(drawX - 2, counterY + 12);
      ctx.lineTo(drawX + 40, counterY + 12);
      ctx.stroke();
      ctx.strokeStyle = discardActive ? "rgba(215, 178, 122, 0.32)" : "rgba(215, 178, 122, 0.18)";
      ctx.beginPath();
      ctx.moveTo(discardX - 2, counterY + 12);
      ctx.lineTo(discardX + 40, counterY + 12);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "rgba(22, 17, 16, 0.54)";
    ctx.fillRect(layout.drawPile.x - 10, layout.playerPanel.y - 32, 138, 24);
    ctx.restore();
    drawPileCounterPillar(ctx, layout.drawPile, "\u62bd", state.combat.drawPileCount, drawActive);
    drawPileCounterPillar(ctx, layout.discardPile, "\u5f03", state.combat.discardPileCount, discardActive);

    ctx.save();
    ctx.fillStyle = "rgba(18, 12, 13, 0.24)";
    ctx.beginPath();
    ctx.moveTo(layout.endTurn.x + 20, layout.endTurn.y + layout.endTurn.height - 8);
    ctx.lineTo(layout.endTurn.x + layout.endTurn.width - 14, layout.endTurn.y + layout.endTurn.height - 14);
    ctx.lineTo(layout.endTurn.x + layout.endTurn.width - 20, layout.endTurn.y + layout.endTurn.height + 2);
    ctx.lineTo(layout.endTurn.x + 14, layout.endTurn.y + layout.endTurn.height + 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    drawCombatSlip(ctx, layout.endTurn.x + 16, layout.endTurn.y + 14, layout.endTurn.width - 28, layout.endTurn.height - 24, {
      fill: "rgba(122, 34, 45, 0.64)",
      stroke: "rgba(214, 186, 142, 0.18)"
    });
    ctx.save();
    ctx.strokeStyle = "rgba(236, 214, 182, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(layout.endTurn.x + 34, layout.endTurn.y + 30);
    ctx.lineTo(layout.endTurn.x + layout.endTurn.width - 34, layout.endTurn.y + 30);
    ctx.moveTo(layout.endTurn.x + 46, layout.endTurn.y + layout.endTurn.height - 20);
    ctx.lineTo(layout.endTurn.x + layout.endTurn.width - 46, layout.endTurn.y + layout.endTurn.height - 20);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(139, 115, 85, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(layout.endTurn.x + 20, layout.endTurn.y + 18);
    ctx.lineTo(layout.endTurn.x + 26, layout.endTurn.y + 18);
    ctx.lineTo(layout.endTurn.x + 26, layout.endTurn.y + 24);
    ctx.moveTo(layout.endTurn.x + layout.endTurn.width - 20, layout.endTurn.y + 18);
    ctx.lineTo(layout.endTurn.x + layout.endTurn.width - 26, layout.endTurn.y + 18);
    ctx.lineTo(layout.endTurn.x + layout.endTurn.width - 26, layout.endTurn.y + 24);
    ctx.moveTo(layout.endTurn.x + 20, layout.endTurn.y + layout.endTurn.height - 18);
    ctx.lineTo(layout.endTurn.x + 26, layout.endTurn.y + layout.endTurn.height - 18);
    ctx.lineTo(layout.endTurn.x + 26, layout.endTurn.y + layout.endTurn.height - 24);
    ctx.moveTo(layout.endTurn.x + layout.endTurn.width - 20, layout.endTurn.y + layout.endTurn.height - 18);
    ctx.lineTo(layout.endTurn.x + layout.endTurn.width - 26, layout.endTurn.y + layout.endTurn.height - 18);
    ctx.lineTo(layout.endTurn.x + layout.endTurn.width - 26, layout.endTurn.y + layout.endTurn.height - 24);
    ctx.stroke();
    ctx.restore();
    ui.drawLabel(ctx, "结束回合", layout.endTurn.x + layout.endTurn.width / 2, layout.endTurn.y + layout.endTurn.height / 2 + 1, {
      size: 22,
      align: "center",
      color: "#f6efe4"
    });

    ctx.save();
    ctx.strokeStyle = "rgba(139, 115, 85, 0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(layout.message.x + 18, layout.message.y + 4);
    ctx.lineTo(layout.message.x + 54, layout.message.y + 4);
    ctx.moveTo(layout.message.x + layout.message.width - 54, layout.message.y + 4);
    ctx.lineTo(layout.message.x + layout.message.width - 18, layout.message.y + 4);
    ctx.stroke();
    ctx.restore();
    ui.drawLabel(ctx, "战况", layout.message.x + 8, layout.message.y + 4, {
      size: 10,
      color: "#8b7355",
      shadow: false
    });
    ui.drawWrappedLabel(ctx, state.combat.lastAction, layout.message.x + 74, layout.message.y - 6, layout.message.width - 148, 17, {
      size: 14,
      align: "center",
      color: "#b8ada0",
      maxLines: 2,
      shadow: false
    });

    ui.drawListOverlay(ctx, overlay);
  }

  function renderMetaPanelsPolished(ctx, state, layout) {
    var ui = G.render.ui;
    var overlay = state.combat.ui && state.combat.ui.overlay;
    var counterY = layout.playerPanel.y - 18;
    var counterX = layout.playerPanel.x + (layout.playerPanel.width - 24) / 2;
    var counterText = "\u724c\u5e93: " + state.combat.drawPileCount + "  |  \u5f03\u724c: " + state.combat.discardPileCount;
    var bodyFont = ui.getBodyFontFamily ? ui.getBodyFontFamily() : "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var titleFont = ui.getTitleFontFamily ? ui.getTitleFontFamily() : "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var hasCheatCuff = G.relicRuntime && typeof G.relicRuntime.hasRelic === "function" && G.relicRuntime.hasRelic(state, "cheat_cuff");
    var canUseCheatCuff = hasCheatCuff && G.relicRuntime && typeof G.relicRuntime.canUseCheatCuff === "function" && G.relicRuntime.canUseCheatCuff(state);
    var cheatCuffUsed = state.combat && state.combat.relicState ? !!state.combat.relicState.cheatCuffUsed : false;

    ui.drawLabel(ctx, counterText, counterX, counterY, {
      size: 15,
      weight: "600",
      align: "center",
      color: "#d3d3d3",
      shadow: false,
      fontFamily: bodyFont
    });

    if (hasCheatCuff) {
      ui.drawPanel(ctx, layout.cheatCuff.x, layout.cheatCuff.y, layout.cheatCuff.width, layout.cheatCuff.height, {
        fill: canUseCheatCuff ? "rgba(54, 42, 32, 0.92)" : "rgba(30, 26, 24, 0.84)",
        stroke: canUseCheatCuff ? "#6d5644" : "#493b35",
        lineWidth: 2
      });
      ui.drawLabel(ctx, cheatCuffUsed ? "老千袖口 已用" : "老千袖口", layout.cheatCuff.x + layout.cheatCuff.width / 2, layout.cheatCuff.y + 17, {
        size: 16,
        weight: "700",
        align: "center",
        color: canUseCheatCuff ? "#f0dfc4" : "#bdaea0",
        shadow: false,
        fontFamily: titleFont
      });
      ui.drawLabel(ctx, !state.combat.selectedCardId ? "先选手牌，再弃 1 抽 1" : (cheatCuffUsed ? "本回合已换牌" : "弃 1 抽 1"), layout.cheatCuff.x + layout.cheatCuff.width / 2, layout.cheatCuff.y + 33, {
        size: 12,
        align: "center",
        color: canUseCheatCuff ? "#d8c8b3" : "#998a7b",
        shadow: false,
        fontFamily: bodyFont
      });
    }

    if (G.render.assets && typeof G.render.assets.drawCombatEndTurnButton === "function") {
      G.render.assets.drawCombatEndTurnButton(ctx, layout.endTurn.x + 16, layout.endTurn.y + 14, layout.endTurn.width - 28, layout.endTurn.height - 24, {
        hideStroke: true
      });
    } else {
      ui.drawPanel(ctx, layout.endTurn.x + 16, layout.endTurn.y + 14, layout.endTurn.width - 28, layout.endTurn.height - 24, {
        fill: "#5a1818",
        stroke: "rgba(18, 11, 11, 0.92)",
        lineWidth: 3
      });
    }
    ui.drawLabel(ctx, "\u7cbe\u75b2\u529b\u7aed", layout.endTurn.x + layout.endTurn.width / 2, layout.endTurn.y + layout.endTurn.height / 2 + 1, {
      size: 26,
      weight: "700",
      align: "center",
      color: "#f1e8d6",
      fontFamily: titleFont
    });

    ui.drawWrappedLabel(ctx, state.combat.lastAction, layout.message.x + layout.message.width / 2, layout.message.y + 10, layout.message.width - 16, 18, {
      size: 15,
      align: "center",
      color: "#b8ada0",
      maxLines: 2,
      shadow: false,
      fontFamily: bodyFont
    });

    ui.drawListOverlay(ctx, overlay);
  }

  function renderRelicPanelUnified(ctx, state, layout) {
    var relics = G.relicRuntime && typeof G.relicRuntime.getCombatDisplay === "function" ?
      G.relicRuntime.getCombatDisplay(state) :
      [];
    var badge = layout.relicBadge;
    var visible = relics.slice(0, 3);
    var overflow = Math.max(0, relics.length - visible.length);
    var i = 0;
    var item = null;
    var x = 0;
    var panelX = layout.relicPanel.x;
    var panelY = layout.relicPanel.y;
    var panelWidth = layout.relicPanel.width;
    var panelHeight = layout.relicPanel.height;
    var labelWidth = 42;
    var chipY = panelY + Math.round((panelHeight - badge.height) / 2);

    if (!relics || relics.length === 0) {
      return;
    }

    drawStageMistVeil(ctx, panelX + panelWidth * 0.54, panelY + panelHeight * 0.7, panelWidth * 0.48, panelHeight * 0.42, {
      inner: "rgba(18, 14, 14, 0.14)",
      mid: "rgba(10, 8, 9, 0.06)",
      outer: "rgba(0, 0, 0, 0)"
    });
    drawCombatFlatPanel(ctx, panelX + 2, panelY + 6, panelWidth - 4, panelHeight - 12, {
      fill: "rgba(12, 11, 12, 0.24)",
      stroke: "rgba(172, 146, 109, 0.08)",
      accentLine: "rgba(214, 186, 142, 0.025)",
      lineWidth: 0.9
    });
    G.render.ui.drawLabel(ctx, "\u65e7\u7269 " + relics.length, panelX + 8, panelY + panelHeight / 2, {
      size: 9,
      color: "#a5917a",
      shadow: false
    });

    ctx.save();
    ctx.strokeStyle = "rgba(213, 184, 146, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + labelWidth, panelY + 10);
    ctx.lineTo(panelX + labelWidth, panelY + panelHeight - 10);
    ctx.stroke();
    ctx.restore();

    for (i = 0; i < visible.length; i += 1) {
      item = visible[i];
      x = panelX + labelWidth + 10 + i * (badge.width + badge.gap);
      drawCombatSlip(ctx, x, chipY, badge.width, badge.height, {
        fill: item.active ? "rgba(76, 46, 18, 0.56)" : "rgba(42, 40, 40, 0.46)",
        stroke: item.active ? "rgba(223, 191, 127, 0.16)" : "rgba(142, 125, 104, 0.1)",
        surface: item.active ? "wood-button" : "ink-panel",
        paperAlpha: item.active ? 0.08 : 0.05
      });
      G.render.ui.drawLabel(ctx, item.icon, x + badge.width / 2, chipY + badge.height / 2, {
        size: 16,
        align: "center",
        color: "#f0e3cf"
      });
    }

    if (overflow > 0) {
      x = panelX + labelWidth + 10 + visible.length * (badge.width + badge.gap);
      drawCombatSlip(ctx, x, chipY, badge.width, badge.height, {
        fill: "rgba(28, 26, 28, 0.54)",
        stroke: "rgba(142, 125, 104, 0.1)",
        surface: "ink-panel",
        paperAlpha: 0.05
      });
      G.render.ui.drawLabel(ctx, "+" + overflow, x + badge.width / 2, chipY + badge.height / 2, {
        size: 14,
        align: "center",
        color: "#efe1ce"
      });
    }
  }

  function renderMetaPanelsUnified(ctx, state, layout) {
    var ui = G.render.ui;
    var overlay = state.combat.ui && state.combat.ui.overlay;
    var bodyFont = ui.getBodyFontFamily ? ui.getBodyFontFamily() : "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var titleFont = ui.getTitleFontFamily ? ui.getTitleFontFamily() : "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var readableFont = ui.getReadableFontFamily ? ui.getReadableFontFamily() : "\"KGame Sans\", sans-serif";
    var hasCheatCuff = G.relicRuntime && typeof G.relicRuntime.hasRelic === "function" && G.relicRuntime.hasRelic(state, "cheat_cuff");
    var canUseCheatCuff = hasCheatCuff && G.relicRuntime && typeof G.relicRuntime.canUseCheatCuff === "function" && G.relicRuntime.canUseCheatCuff(state);
    var cheatCuffUsed = state.combat && state.combat.relicState ? !!state.combat.relicState.cheatCuffUsed : false;
    var drawActive = overlay && overlay.title === "\u62bd\u724c\u5806";
    var discardActive = overlay && overlay.title === "\u5f03\u724c\u5806";
    var buttonWidth = Math.min(layout.endTurn.width, 156);
    var buttonHeight = Math.min(layout.endTurn.height, 68);
    var buttonX = layout.endTurn.x + Math.round((layout.endTurn.width - buttonWidth) / 2);
    var buttonY = layout.endTurn.y + Math.round((layout.endTurn.height - buttonHeight) / 2);
    var buttonCenterX = buttonX + buttonWidth / 2;
    var buttonInnerX = buttonX + 7;
    var buttonInnerY = buttonY + 7;
    var buttonInnerWidth = buttonWidth - 14;
    var buttonInnerHeight = buttonHeight - 14;
    var buttonAccentX = buttonInnerX + 10;
    var buttonAccentY = buttonInnerY + 11;
    var buttonAccentWidth = 4;
    var buttonAccentHeight = buttonInnerHeight - 22;
    var buttonLabelTop = buttonInnerY + 11;
    var buttonMainY = buttonY + buttonHeight / 2 + 4;
    var messageText = "";
    var hasPlayedCards = !!(state.combat.playedCards && state.combat.playedCards.length);
    var lineY = layout.message.y + 12;
    var leftLine = null;
    var rightLine = null;
    var buttonGlaze = null;
    var buttonHighlight = null;
    var promptTone = false;
    drawPileCounterPillar(ctx, layout.drawPile, "\u62bd", state.combat.drawPileCount, drawActive);
    drawPileCounterPillar(ctx, layout.discardPile, "\u5f03", state.combat.discardPileCount, discardActive);
    messageText = getCompactCombatHintText(state, hasPlayedCards);
    promptTone = state.combat.result === "active" && (!hasPlayedCards || !!state.combat.selectedCardId);

    if (hasCheatCuff) {
      var cuffWidth = Math.min(layout.cheatCuff.width, 148);
      var cuffHeight = Math.min(layout.cheatCuff.height, 32);
      var cuffX = layout.cheatCuff.x + Math.round((layout.cheatCuff.width - cuffWidth) / 2);
      var cuffY = layout.cheatCuff.y + Math.round((layout.cheatCuff.height - cuffHeight) / 2);
      var cuffPrompt = !state.combat.selectedCardId ?
        "\u5148\u9009\u624b\u724c" :
        (cheatCuffUsed ? "\u672c\u56de\u5df2\u6362" : "\u6362 1 \u62bd 1");

      drawStageMistVeil(ctx, cuffX + cuffWidth * 0.48, cuffY + cuffHeight * 0.72, cuffWidth * 0.44, cuffHeight * 0.36, {
        inner: canUseCheatCuff ? "rgba(42, 28, 18, 0.12)" : "rgba(18, 15, 14, 0.06)",
        mid: "rgba(0, 0, 0, 0.04)",
        outer: "rgba(0, 0, 0, 0)"
      });
      drawCombatFlatPanel(ctx, cuffX, cuffY, cuffWidth, cuffHeight, {
        fill: canUseCheatCuff ? "rgba(34, 27, 22, 0.32)" : "rgba(24, 21, 20, 0.22)",
        stroke: canUseCheatCuff ? "rgba(172, 146, 109, 0.1)" : "rgba(132, 118, 99, 0.06)",
        accentLine: canUseCheatCuff ? "rgba(214, 186, 142, 0.022)" : "rgba(214, 186, 142, 0.012)",
        lineWidth: 0.9,
        innerStroke: false
      });
      ctx.save();
      ctx.strokeStyle = canUseCheatCuff ? "rgba(214, 186, 142, 0.08)" : "rgba(142, 125, 104, 0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cuffX + 40, cuffY + 7);
      ctx.lineTo(cuffX + 40, cuffY + cuffHeight - 7);
      ctx.stroke();
      ctx.restore();
      ui.drawLabel(ctx, cheatCuffUsed ? "\u8896\u53e3\u5c3d" : "\u8896\u53e3", cuffX + 21, cuffY + cuffHeight / 2, {
        size: 10,
        weight: "700",
        align: "center",
        color: canUseCheatCuff ? "#d8c4a8" : "#9d8c7b",
        shadow: false,
        fontFamily: titleFont
      });
      ui.drawLabel(ctx, cuffPrompt, cuffX + 48, cuffY + cuffHeight / 2, {
        size: 10,
        align: "left",
        color: canUseCheatCuff ? "#cdbca6" : "#948473",
        shadow: false,
        fontFamily: bodyFont
      });
    }

    drawStageMistVeil(ctx, buttonX + buttonWidth / 2, buttonY + buttonHeight * 0.72, buttonWidth * 0.64, buttonHeight * 0.38, {
      inner: "rgba(54, 28, 18, 0.16)",
      mid: "rgba(18, 10, 11, 0.08)",
      outer: "rgba(0, 0, 0, 0)"
    });
    drawCombatFlatPanel(ctx, buttonX, buttonY, buttonWidth, buttonHeight, {
      fill: "rgba(17, 12, 11, 0.34)",
      midFill: "rgba(11, 8, 8, 0.42)",
      bottomFill: "rgba(6, 5, 5, 0.56)",
      stroke: "rgba(188, 160, 125, 0.12)",
      accentLine: "rgba(214, 186, 142, 0.02)",
      topGlow: "rgba(255, 236, 210, 0.03)",
      lineWidth: 1.05,
      innerStroke: false
    });
    if (G.render.assets && typeof G.render.assets.drawCombatEndTurnButton === "function") {
      G.render.assets.drawCombatEndTurnButton(ctx, buttonInnerX, buttonInnerY, buttonInnerWidth, buttonInnerHeight, {
        hideStroke: true
      });
    } else {
      drawCombatSlip(ctx, buttonInnerX, buttonInnerY, buttonInnerWidth, buttonInnerHeight, {
        fill: "rgba(92, 34, 28, 0.72)",
        stroke: "rgba(214, 186, 142, 0.18)",
        lineWidth: 1
      });
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(buttonInnerX, buttonInnerY, buttonInnerWidth, buttonInnerHeight);
    ctx.clip();
    buttonGlaze = ctx.createLinearGradient(buttonInnerX, buttonInnerY, buttonInnerX, buttonInnerY + buttonInnerHeight);
    buttonGlaze.addColorStop(0, "rgba(166, 62, 50, 0.22)");
    buttonGlaze.addColorStop(0.44, "rgba(112, 34, 29, 0.12)");
    buttonGlaze.addColorStop(1, "rgba(20, 10, 10, 0.28)");
    ctx.fillStyle = buttonGlaze;
    ctx.fillRect(buttonInnerX, buttonInnerY, buttonInnerWidth, buttonInnerHeight);
    buttonHighlight = ctx.createRadialGradient(buttonInnerX + buttonInnerWidth * 0.42, buttonInnerY + buttonInnerHeight * 0.28, 10, buttonInnerX + buttonInnerWidth * 0.42, buttonInnerY + buttonInnerHeight * 0.28, buttonInnerWidth * 0.66);
    buttonHighlight.addColorStop(0, "rgba(246, 220, 190, 0.14)");
    buttonHighlight.addColorStop(0.42, "rgba(246, 220, 190, 0.04)");
    buttonHighlight.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = buttonHighlight;
    ctx.fillRect(buttonInnerX, buttonInnerY, buttonInnerWidth, buttonInnerHeight);
    ctx.restore();
    drawCombatSlip(ctx, buttonInnerX, buttonInnerY, buttonInnerWidth, buttonInnerHeight, {
      fill: "rgba(0, 0, 0, 0)",
      stroke: "rgba(214, 186, 142, 0.16)",
      lineWidth: 1.1
    });
    ctx.save();
    ctx.strokeStyle = "rgba(235, 219, 196, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(buttonInnerX + 18, buttonInnerY + 12);
    ctx.lineTo(buttonInnerX + buttonInnerWidth - 14, buttonInnerY + 12);
    ctx.moveTo(buttonInnerX + 18, buttonInnerY + buttonInnerHeight - 12);
    ctx.lineTo(buttonInnerX + buttonInnerWidth - 14, buttonInnerY + buttonInnerHeight - 12);
    ctx.stroke();
    ctx.restore();
    drawCombatSlip(ctx, buttonAccentX, buttonAccentY, buttonAccentWidth, buttonAccentHeight, {
      fill: "rgba(129, 36, 29, 0.82)",
      stroke: "rgba(236, 220, 198, 0.08)",
      lineWidth: 1
    });
    ui.drawLabel(ctx, "\u7ed3\u675f\u672c\u56de\u5408", buttonCenterX, buttonLabelTop, {
      size: 9,
      weight: "700",
      align: "center",
      color: "#d2b48b",
      shadow: false,
      fontFamily: readableFont
    });
    ui.drawLabel(ctx, "\u7cbe\u75b2\u529b\u7aed", buttonCenterX, buttonMainY, {
      size: 20,
      weight: "700",
      align: "center",
      color: "#f2e8d8",
      shadowColor: "rgba(0, 0, 0, 0.8)",
      shadowBlur: 4,
      shadowOffsetX: 0,
      shadowOffsetY: 1,
      fontFamily: readableFont
    });

    if (messageText) {
      ctx.save();
      leftLine = ctx.createLinearGradient(layout.message.x, lineY, layout.message.x + 82, lineY);
      leftLine.addColorStop(0, "rgba(0, 0, 0, 0)");
      leftLine.addColorStop(1, promptTone ? "rgba(160, 144, 121, 0.08)" : "rgba(168, 150, 125, 0.1)");
      ctx.fillStyle = leftLine;
      ctx.fillRect(layout.message.x, lineY, 82, 1);
      rightLine = ctx.createLinearGradient(layout.message.x + layout.message.width - 82, lineY, layout.message.x + layout.message.width, lineY);
      rightLine.addColorStop(0, promptTone ? "rgba(160, 144, 121, 0.08)" : "rgba(168, 150, 125, 0.1)");
      rightLine.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = rightLine;
      ctx.fillRect(layout.message.x + layout.message.width - 82, lineY, 82, 1);
      ctx.restore();
      ui.drawWrappedLabel(ctx, messageText, layout.message.x + layout.message.width / 2, layout.message.y + 7, layout.message.width - 300, 15, {
        size: promptTone ? 10 : 10,
        align: "center",
        color: promptTone ? "#837669" : "#897c6f",
        maxLines: 1,
        shadowColor: "rgba(0, 0, 0, 0.62)",
        shadowBlur: 2,
        shadowOffsetX: 0,
        shadowOffsetY: 1,
        fontFamily: bodyFont
      });
    }

    ui.drawListOverlay(ctx, overlay);
  }

  G.scenes.combat = {
    renderHand: renderHandEnhanced,
    renderInspector: renderSelectedCardInspector,
    renderResult: renderBattleResult,
    getPlayerStatusChips: buildPlayerStatusChips,
    getEnemyStatusChips: buildEnemyStatusChips,
    prepareState: ensureSampleState,
    resetHoverInspection: resetHoverInspection,
    feedbackEffects: { hand: emitHandTransitionEffects, defeat: emitEnemyDefeatEffects },
    debugGetLayout: getLayout,
    update: function (state, input) {
      var nextState = ensureSampleState(state);
      G.render.combatInteraction.update(input.deltaMs,nextState);
      var feedback = G.scenes.combat.feedback;
      if (feedback) {
        var wasBusy = feedback.isBusy();
        feedback.update(input.deltaMs, nextState);
        if (wasBusy && feedback.isBusy() && (!feedback.acceptsCards() || nextState.combat.result !== "active")) {
          resetHoverInspection();
          G.main.consumeCancel();
          G.main.consumePointerFrame();
          G.main.consumeClicks();
          return nextState;
        }
      }
      nextState = resolveCombatSceneTransition(nextState, input);
      if (nextState.scene !== "combat") {
        return nextState;
      }
      if (nextState.combat.presentation && nextState.combat.presentation.pendingScene) {
        return nextState;
      }
      if (G.main.consumeCancel()) {
        resetHoverInspection();
        G.render.animations.clearCardDrag("combat");
        G.main.consumePointerFrame();
        G.main.consumeClicks();
        return clearInspectedCard(G.deck.clearSelectedCard(clearOverlay(nextState)));
      }
      nextState = handlePointerInteractions(nextState);
      nextState = processClicksEnhanced(nextState);
      nextState = updateHoverInspection(nextState, input);
      return resolveInspectPresentation(nextState, input);
    },

    render: function (state, ctx) {
      var layout = getLayout();
      var engagementFocus = getCombatEngagementFocus();
      var sideUiAlpha = engagementFocus.active ? 0.9 - clamp(engagementFocus.intensity || 0, 0, 1) * 0.12 : 1;
      var outerUiAlpha = engagementFocus.active ? 0.86 - clamp(engagementFocus.intensity || 0, 0, 1) * 0.12 : 1;

      ctx.globalCompositeOperation = "source-over";
      renderBackgroundPolished(ctx, state, layout, getEnemyBoxes(layout, state.combat.enemies, getEnemyFormationLock(state)), engagementFocus);
      renderEnemyAreaPolished(ctx, state, layout, engagementFocus);
      renderPlayerPanelPolished(ctx, state, layout);
      G.render.combatInteraction.render(ctx, state, getHandBoxes(layout, state.combat.hand, state.combat.selectedCardId), getEnemyBoxes(layout, state.combat.enemies, getEnemyFormationLock(state)));

      ctx.save();
      ctx.globalAlpha = sideUiAlpha;
      renderRelicPanelUnified(ctx, state, layout);
      ctx.restore();

      renderHandEnhanced(ctx, state, layout);
      renderSelectedCardInspector(ctx, state, layout);

      ctx.save();
      ctx.globalAlpha = outerUiAlpha;
      renderMetaPanelsUnified(ctx, state, layout);
      ctx.restore();

      renderBattleResult(ctx, state, layout);
    },

    playCardById: playCardByIdAnimated,
    previewCard: function (state, cardId, targetEnemyId) {
      // Read-only rule preview for playthrough planning. Never submits input or
      // starts playback; the actual game still requires a pointer interaction.
      var before = cloneState(state);
      var card = before.combat.hand.find(function (item) { return item.id === cardId; });
      var enemy = before.combat.enemies.find(function (item) { return item.id === targetEnemyId && item.hp > 0; });
      if (!card || !enemy || !card.playable || before.combat.result !== "active") return before;
      before = G.deck.toggleSelectedCard(before, cardId);
      var played = G.deck.playSelectedCard(before, targetEnemyId, enemy.name);
      return applySelectedCardEffect(before, played, targetEnemyId, []);
    },
    endTurn: endTurnAnimated,
    debugPrepareEnemyDefeatState: function (previousState, nextState) {
      var safePrevious = ensureSampleState(previousState);
      var safeNext = ensureSampleState(nextState);
      return applyEnemyLayoutHold(safePrevious, safeNext);
    },
    debugPreviewEnemyDefeatEffects: function (previousState, nextState) {
      var safePrevious = ensureSampleState(previousState);
      var safeNext = applyEnemyLayoutHold(safePrevious, ensureSampleState(nextState));

      if (G.render && G.render.animations && typeof G.render.animations.clearEffects === "function") {
        G.render.animations.clearEffects("combat");
      }

      emitEnemyDefeatEffects(safePrevious, safeNext);
      return getDefeatEchoDebugSummary(safePrevious, safeNext);
    },
    getHandLayoutBoxes: function (state) {
      var nextState = layoutState(state);
      return getHandBoxes(getLayout(), nextState.combat.hand, nextState.combat.selectedCardId);
    },
    getEnemyLayoutBoxes: function (state) {
      var nextState = layoutState(state);
      return getEnemyBoxes(getLayout(), nextState.combat.enemies, getEnemyFormationLock(nextState));
    }
  };
})();
