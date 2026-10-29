window.G = window.G || {};

(function () {
  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function nextSeed(seed) {
    return (seed * 1664525 + 1013904223) >>> 0;
  }

  function getEnemyDefinition(enemy) {
    if (!enemy || !G.enemies || !G.enemies.definitions) {
      return {};
    }

    return G.enemies.definitions[enemy.templateId] || {};
  }

  function ensureEnemyRuntime(enemy) {
    enemy.debuffs = Object.assign({
      flaw: 0,
      fester: 0,
      blind: 0,
      crippleTurns: 0
    }, enemy.debuffs || {});
    enemy.buffs = Object.assign({
      fervor: 0
    }, enemy.buffs || {});
    enemy.ai = Object.assign({
      cycleIndex: 0,
      pendingFervor: false,
      hitTakenThisTurn: false,
      guardChiefPhase: "high",
      phaseCycleIndex: 0
    }, enemy.ai || {});
    enemy.intentData = Object.assign({}, enemy.intentData || {});
    if(enemy.kind==='nemesis'){
      const renamed={mauser:'carbine',gatling:'rifle'};
      if(renamed[enemy.firearmStage])enemy.firearmStage=renamed[enemy.firearmStage];
      if(renamed[enemy.intentData.firearmStage])enemy.intentData.firearmStage=renamed[enemy.intentData.firearmStage];
      if(enemy.intentLabel==='扫射'){enemy.intentLabel='步枪击发';enemy.intentData.target='single';}
      if(enemy.intentLabel==='架枪')enemy.intentLabel='推栓上膛';
      if(enemy.intentLabel==='压弹校射')enemy.intentLabel='抵肩瞄准';
      if(enemy.nemesisTitle==='铁甲机械鬼')enemy.nemesisTitle='持枪追猎者';
    }
    return enemy;
  }

  function normalizeEnemies(state) {
    var nextState = cloneState(state);

    nextState.combat = nextState.combat || {};
    nextState.combat.enemies = (nextState.combat.enemies || []).map(function (enemy) {
      return ensureEnemyRuntime(enemy);
    });
    return nextState;
  }

  function syncPileCounts(state) {
    state.combat.drawPileCount = state.combat.drawPileNames.length;
    state.combat.discardPileCount = state.combat.discardPileNames.length;
    return state;
  }

  function clearEnemyBlockForTurn(state) {
    var nextState = cloneState(state);

    nextState.combat.enemies = nextState.combat.enemies.map(function (enemy) {
      var nextEnemy = Object.assign({}, enemy);
      nextEnemy.block = 0;
      return nextEnemy;
    });
    return nextState;
  }

  function createCardInstance(state, name) {
    var template = state.combat.cardLibrary[name];
    var serial = state.combat.cardSerial;

    state.combat.cardSerial += 1;

    return {
      id: "card_" + serial + "_" + name,
      name: template.name,
      definitionId: template.id,
      sourceCard: template,
      style: template.style,
      baseCost: template.cost,
      cost: template.cost,
      text: template.text,
      artPath: template.artPath || null,
      comboTag: !!template.comboTag,
      comboDiscounted: false
    };
  }

  function materializeHand(state, names) {
    return names.map(function (name) {
      return createCardInstance(state, name);
    });
  }

  function reorderDiscard(names, seed) {
    var items = names.slice();
    var rotated = [];
    var offset = 0;
    var i = 0;

    if (items.length < 2) {
      return items;
    }

    offset = seed % items.length;
    for (i = 0; i < items.length; i += 1) {
      rotated.push(items[(i + offset) % items.length]);
    }

    if ((seed & 1) === 1) {
      rotated.reverse();
    }

    return rotated;
  }

  function applyDamageToEnemy(state, enemyId, amount, config) {
    var nextState = normalizeEnemies(state);
    var enemy = nextState.combat.enemies.find(function (item) {
      return item.id === enemyId;
    });
    var damage = Math.max(0, Number(amount) || 0);
    var damageToHp = 0;
    var options = config || {};
    var countsAsHit = damage > 0 && options.countsAsHit !== false;

    if (!enemy || damage === 0) {
      return nextState;
    }

    if (
      countsAsHit &&
      !enemy.ai.hitTakenThisTurn &&
      (enemy.behavior === "boxer" || enemy.behavior === "boxer_leader")
    ) {
      enemy.ai.hitTakenThisTurn = true;
      enemy.ai.pendingFervor = true;
    }

    if (enemy.block > 0) {
      if (enemy.block >= damage) {
        enemy.block -= damage;
        damage = 0;
      } else {
        damage -= enemy.block;
        enemy.block = 0;
      }
    }

    damageToHp = Math.max(0, damage);
    enemy.hp = Math.max(0, enemy.hp - damageToHp);
    return nextState;
  }

  function gainPlayerBlock(state, amount) {
    var nextState = cloneState(state);
    nextState.player.block += Math.max(0, Number(amount) || 0);
    return nextState;
  }

  function damagePlayer(state, amount, config) {
    var nextState = cloneState(state);
    var remaining = Math.max(0, Number(amount) || 0);
    var options = config || {};
    var pierceRatio = Math.max(0, Math.min(1, Number(options.pierceRatio) || 0));
    var effectiveBlock = 0;
    var absorbed = 0;

    if (nextState.player.block > 0) {
      if (pierceRatio > 0) {
        effectiveBlock = Math.floor(nextState.player.block * (1 - pierceRatio));
        absorbed = Math.min(remaining, effectiveBlock);
        nextState.player.block = Math.max(0, nextState.player.block - absorbed);
        remaining -= absorbed;
      } else {
        if (nextState.player.block >= remaining) {
          nextState.player.block -= remaining;
          remaining = 0;
        } else {
          remaining -= nextState.player.block;
          nextState.player.block = 0;
        }
      }
    }

    nextState.player.hp = Math.max(0, nextState.player.hp - remaining);
    return nextState;
  }

  function checkBattleOutcome(state) {
    var nextState = cloneState(state);
    var allEnemiesDead = nextState.combat.enemies.every(function (enemy) {
      return enemy.hp <= 0;
    });

    if (nextState.player.hp <= 0) {
      nextState.combat.result = "defeat";
      nextState.combat.lastAction = "\u4f60\u5012\u5728\u4e86\u4e71\u519b\u4e2d\u3002";
    } else if (allEnemiesDead) {
      nextState.combat.result = "victory";
      nextState.combat.lastAction = "\u654c\u4eba\u5012\u5730\u4e0d\u8d77\uff0c\u640f\u6740\u80dc\u5229\u3002";
    } else {
      nextState.combat.result = "active";
    }

    return nextState;
  }

  function setEnemyIntent(enemy, intent, label, value, data) {
    enemy.intent = intent;
    enemy.intentLabel = label;
    enemy.intentValue = value;
    enemy.intentData = Object.assign({}, data || {});
    return enemy;
  }

  function applyIntentModifiers(enemy, built) {
    var adjusted = {
      intent: built.intent,
      label: built.label,
      value: built.value,
      data: Object.assign({}, built.data || {})
    };
    var baseDamage = 0;

    if (typeof adjusted.data.previewDamage === "number" && typeof adjusted.data.damage !== "number") {
      // This is a warning, not an attack: share the shot's modifiers without
      // adding a damage field that the resolver could execute during preparation.
      var previewBase = typeof adjusted.data.basePreviewDamage === "number" ? adjusted.data.basePreviewDamage : adjusted.data.previewDamage;
      adjusted.data.basePreviewDamage = previewBase;
      adjusted.data.previewDamage = G.statusEffects && typeof G.statusEffects.adjustEnemyAttackDamage === "function" ?
        G.statusEffects.adjustEnemyAttackDamage(enemy, previewBase) : previewBase;
      adjusted.value = adjusted.data.previewDamage;
    }
    if (!adjusted.data || typeof adjusted.data.damage !== "number") {
      return adjusted;
    }

    baseDamage = Math.max(0, Number(adjusted.data.baseDamage) || Number(adjusted.data.damage) || 0);
    adjusted.data.baseDamage = baseDamage;
    if (G.statusEffects && typeof G.statusEffects.adjustEnemyAttackDamage === "function") {
      adjusted.data.damage = G.statusEffects.adjustEnemyAttackDamage(enemy, baseDamage);
    } else {
      adjusted.data.damage = baseDamage;
    }
    adjusted.value = adjusted.data.damage;
    return adjusted;
  }

  function refreshIntentsForDebuffs(state) {
    var nextState = normalizeEnemies(state);

    nextState.combat.enemies = nextState.combat.enemies.map(function (enemy) {
      var built = null;

      if (!enemy || enemy.hp <= 0) {
        return enemy;
      }

      built = applyIntentModifiers(enemy, {
        intent: enemy.intent,
        label: enemy.intentLabel,
        value: enemy.intentValue,
        data: enemy.intentData
      });

      return setEnemyIntent(enemy, built.intent, built.label, built.value, built.data);
    });

    return nextState;
  }

  function buildSimpleIntent(enemy, seed) {
    var useAttack = (seed % 2) === 0;
    var block = Math.max(4, enemy.baseAttack - 1);

    if (enemy && enemy.templateId === "act2_road_blade") {
      return buildRoadBladeIntent(enemy);
    }

    if (enemy && enemy.templateId === "act2_courier_scout") {
      return buildCourierScoutIntent(enemy);
    }

    if (enemy && enemy.templateId === "act3_red_turban") {
      return buildRedTurbanIntent(enemy);
    }

    if (enemy && enemy.templateId === "act4_rail_guard") {
      return buildRailGuardIntent(enemy);
    }

    if (enemy && enemy.templateId === "act4_supply_chopper") {
      return buildSupplyChopperIntent(enemy);
    }

    if (enemy && enemy.templateId === "act5_loyal_blade") {
      return buildLoyalBladeIntent(enemy);
    }

    if (useAttack) {
      return {
        intent: "attack",
        label: "劈砍",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    return {
      intent: "block",
      label: "招架",
      value: block,
      data: { block: block }
    };
  }

  function buildRoadBladeIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = Math.max(5, enemy.baseAttack - 1);

    if (cycleIndex === 0) {
      return {
        intent: "attack",
        label: "\u9a7f\u9053\u6251\u5200",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "block",
        label: "\u52d2\u7f30\u67b6\u52bf",
        value: block,
        data: { block: block }
      };
    }

    return {
      intent: "attack",
      label: "\u8ffd\u8eab\u62b9\u5589",
      value: enemy.baseAttack + 1,
      data: { damage: enemy.baseAttack + 1 }
    };
  }

  function buildCourierScoutIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = Math.max(6, enemy.baseAttack - 1);
    var probeDamage = Math.max(1, enemy.baseAttack - 1);

    if (cycleIndex === 0) {
      return {
        intent: "attack",
        label: "\u63a2\u8def\u8bd5\u5200",
        value: probeDamage,
        data: { damage: probeDamage }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "block",
        label: "\u7ffb\u5305\u907f\u8eab",
        value: block,
        data: { block: block }
      };
    }

    return {
      intent: "attack",
      label: "\u6298\u8fd4\u5077\u523a",
      value: enemy.baseAttack,
      data: {
        damage: enemy.baseAttack,
        block: 3
      }
    };
  }

  function buildRedTurbanIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = Math.max(7, enemy.baseAttack - 2);

    if (cycleIndex === 0) {
      return {
        intent: "attack",
        label: "\u7ea2\u5dfe\u6251\u8138",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "block",
        label: "\u6380\u888d\u4fa7\u95ea",
        value: block,
        data: { block: block }
      };
    }

    return {
      intent: "attack",
      label: "\u8d34\u8eab\u4e71\u6345",
      value: enemy.baseAttack + 1,
      data: { damage: enemy.baseAttack + 1 }
    };
  }

  function buildRailGuardIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = Math.max(10, enemy.baseAttack + 1);
    var followDamage = Math.max(1, enemy.baseAttack - 1);

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "\u6a2a\u95f8\u67b6\u68cd",
        value: block,
        data: { block: block }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "attack",
        label: "\u62a4\u8def\u8e0f\u780d",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    return {
      intent: "attack",
      label: "\u5e76\u80a9\u538b\u4e0a",
      value: followDamage,
      data: {
        damage: followDamage,
        block: 5
      }
    };
  }

  function buildSupplyChopperIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = Math.max(9, enemy.baseAttack - 2);

    if (cycleIndex === 0) {
      return {
        intent: "attack",
        label: "\u62a1\u65a7\u5f00\u8def",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "block",
        label: "\u625b\u7bb1\u62a4\u8eab",
        value: block,
        data: { block: block }
      };
    }

    return {
      intent: "attack",
      label: "\u5288\u7bb1\u7838\u843d",
      value: enemy.baseAttack + 2,
      data: { damage: enemy.baseAttack + 2 }
    };
  }

  function buildLoyalBladeIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var followDamage = Math.max(1, enemy.baseAttack - 2);

    if (cycleIndex === 0) {
      return {
        intent: "attack",
        label: "\u6b89\u4e3b\u903c\u65a9",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "attack",
        label: "\u820d\u547d\u5e76\u6b65",
        value: followDamage,
        data: {
          damage: followDamage,
          block: 4
        }
      };
    }

    return {
      intent: "attack",
      label: "\u9999\u706b\u8ffd\u8eab",
      value: enemy.baseAttack + 1,
      data: { damage: enemy.baseAttack + 1 }
    };
  }

  function buildBoxerIntent(enemy, seed) {
    var fervor = enemy.buffs.fervor || 0;
    var attack = enemy.baseAttack + fervor;
    var block = 4 + Math.floor(fervor / 2);

    if ((seed % 3) === 0) {
      return {
        intent: "block",
        label: "摆拳守门",
        value: block,
        data: { block: block }
      };
    }

    return {
      intent: "attack",
      label: "乱拳",
      value: attack,
      data: { damage: attack }
    };
  }

  function buildBoxerLeaderIntent(enemy, state, seed) {
    // Frozen placeholder: later-act firearm normals are grouped by tactical role
    // because the design doc does not yet provide beat-by-beat scripts past Act 1.
    var definition = getEnemyDefinition(enemy);
    var summonEvery = Math.max(1, Number(definition.summonEvery) || 3);
    var aliveEnemies = state.combat.enemies.filter(function (item) {
      return item.hp > 0;
    }).length;
    var block = 6;

    if (state.combat.turn % summonEvery === 0 && aliveEnemies < 3) {
      return {
        intent: "buff",
        label: "摇旗唤众",
        value: 1,
        data: {
          summonTemplateId: "boxer"
        }
      };
    }

    if ((seed % 2) === 0) {
      return {
        intent: "attack",
        label: "开山拳",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    return {
      intent: "block",
      label: "护坛架势",
      value: block,
      data: { block: block }
    };
  }

  function buildRifleScoutIntent(enemy) {
    var definition = getEnemyDefinition(enemy);
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = Math.max(0, Number(definition.reloadBlock) || 5);
    var shotDamage = Math.max(0, Number(definition.shootDamage) || (enemy.baseAttack + 2));
    var pierceRatio = Math.max(0, Number(definition.shootPierceRatio) || 0);

    if (enemy && enemy.templateId === "act2_rifle_cart") {
      return buildRifleCartIntent(enemy, block, shotDamage, pierceRatio);
    }

    if (enemy && enemy.templateId === "act4_quick_officer") {
      return buildQuickOfficerIntent(enemy, shotDamage, pierceRatio);
    }

    if (cycleIndex === 0) {
      return {
        intent: "attack",
        label: "刺刀突进",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "block",
        label: "退步装弹",
        value: block,
        data: { block: block, gunPose: "reload", firearmPrep: true }
      };
    }

    return {
      intent: "attack",
      label: "举枪点射",
      value: shotDamage,
      data: {
        damage: shotDamage,
        firearm: true,
        firearmStage: "rifle",
        pierceRatio: pierceRatio
      }
    };
  }

  function getEnemyFirearmStage(enemy) {
    if (enemy && (enemy.behavior === "machine_loader" || enemy.templateId === "act2_rifle_cart")) {
      return "rifle";
    }

    if (enemy && enemy.behavior === "river_gunner") {
      return "carbine";
    }

    return "revolver";
  }

  function buildEnemyFirearmPrepIntent(enemy, label, note, value, stepIndex) {
    return {
      intent: "buff",
      label: label,
      value: Math.max(0, Number(value) || 0),
      data: {
        noteOnly: note,
        firearm: true,
        firearmStage: getEnemyFirearmStage(enemy),
        firearmStep: stepIndex,
        previewDamage: Math.max(0, Number(value) || 0)
      }
    };
  }

  function buildEnemyFirearmShotIntent(enemy, label, damage, pierceRatio) {
    return {
      intent: "attack",
      label: label,
      value: damage,
      data: {
        damage: damage,
        pierceRatio: Math.max(0, Number(pierceRatio) || 0),
        firearm: true,
        firearmStage: getEnemyFirearmStage(enemy),
        firearmStep: 2,
        target: "single"
      }
    };
  }

  // TODO: 策划补充卷 3-5 火器杂兵的逐拍脚本；当前先按战术身份给出可玩占位节奏。
  function buildDockGunnerIntent(enemy) {
    var definition = getEnemyDefinition(enemy);
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = Math.max(0, Number(definition.reloadBlock) || 5);
    var shotDamage = Math.max(0, Number(definition.shootDamage) || (enemy.baseAttack + 2));
    var pierceRatio = Math.max(0, Number(definition.shootPierceRatio) || 0);

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "伏箱守位",
        value: block,
        data: { block: block }
      };
    }

    if (cycleIndex === 1) {
      return buildEnemyFirearmPrepIntent(
        enemy,
        "压枪逼岸",
        enemy.name + "借着货箱压低枪口，下一拍便要贴岸开火。",
        shotDamage,
        1
      );
    }

    return buildEnemyFirearmShotIntent(enemy, "贴岸点放", shotDamage, pierceRatio);
  }

  function buildRifleCartIntent(enemy, block, shotDamage, pierceRatio) {
    var cycleIndex = enemy.ai.cycleIndex || 0;

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "\u501f\u8f66\u67b6\u67aa",
        value: block,
        data: { block: block }
      };
    }

    if (cycleIndex === 1) {
      return buildEnemyFirearmPrepIntent(
        enemy,
        "\u6276\u8f95\u7784\u4eba",
        enemy.name + "\u8d34\u7740\u8f66\u8f95\u63a2\u51fa\u67aa\u53e3\uff0c\u4e0b\u4e00\u62cd\u5c31\u8981\u62bc\u8f66\u5f00\u706b\u3002",
        shotDamage,
        1
      );
    }

    return buildEnemyFirearmShotIntent(enemy, "\u62bc\u8f66\u70b9\u653e", shotDamage, pierceRatio);
  }

  function buildQuickOfficerIntent(enemy, shotDamage, pierceRatio) {
    var cycleIndex = enemy.ai.cycleIndex || 0;

    if (cycleIndex === 0) {
      return {
        intent: "attack",
        label: "\u5feb\u6b65\u538b\u7ebf",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    if (cycleIndex === 1) {
      return buildEnemyFirearmPrepIntent(
        enemy,
        "\u7529\u67aa\u62a2\u70b9",
        enemy.name + "\u624b\u8155\u4e00\u6296\u62ac\u8d77\u67aa\u53e3\uff0c\u4e0b\u4e00\u62cd\u4fbf\u8981\u8fde\u70b9\u538b\u7ebf\u3002",
        shotDamage,
        1
      );
    }

    return buildEnemyFirearmShotIntent(enemy, "\u5feb\u67aa\u8fde\u70b9", shotDamage, pierceRatio);
  }

  function buildMachineLoaderIntent(enemy) {
    var definition = getEnemyDefinition(enemy);
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = Math.max(0, Number(definition.reloadBlock) || 6);
    var shotDamage = Math.max(0, Number(definition.shootDamage) || (enemy.baseAttack + 3));
    var pierceRatio = Math.max(0, Number(definition.shootPierceRatio) || 0);
    var recoverBlock = Math.max(4, block - 2);

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "推栓装填",
        value: block,
        data: { block: block }
      };
    }

    if (cycleIndex === 1) {
      return buildEnemyFirearmPrepIntent(
        enemy,
        "压低身位",
        enemy.name + "压低身位抵肩瞄准，步枪口已经锁住前场。",
        shotDamage,
        1
      );
    }

    if (cycleIndex === 2) {
      return buildEnemyFirearmShotIntent(enemy, "步枪击发", shotDamage, pierceRatio);
    }

    return {
      intent: "block",
      label: "换位续弹",
      value: recoverBlock,
      data: { block: recoverBlock }
    };
  }

  function buildRiverGunnerIntent(enemy) {
    var definition = getEnemyDefinition(enemy);
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var shotDamage = Math.max(0, Number(definition.shootDamage) || (enemy.baseAttack + 2));
    var pierceRatio = Math.max(0, Number(definition.shootPierceRatio) || 0);
    var skimDamage = Math.max(1, enemy.baseAttack - 2);
    var skimPierce = Math.max(0.1, pierceRatio * 0.5);

    if (cycleIndex === 0) {
      return buildEnemyFirearmShotIntent(enemy, "斜渡冷枪", skimDamage, skimPierce);
    }

    if (cycleIndex === 1) {
      return buildEnemyFirearmPrepIntent(
        enemy,
        "借浪稳枪",
        enemy.name + "顺着水势稳住枪口，下一拍便要顺流点杀。",
        shotDamage,
        1
      );
    }

    return buildEnemyFirearmShotIntent(enemy, "顺流点杀", shotDamage, pierceRatio);
  }

  function buildBayonetScoutIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = 5;
    var closeDamage = enemy.baseAttack + 2;

    if (cycleIndex === 0) {
      return {
        intent: "attack",
        label: "刺刀突进",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "block",
        label: "侧步压近",
        value: block,
        data: { block: block }
      };
    }

    return {
      intent: "attack",
      label: "贴身连刺",
      value: closeDamage,
      data: { damage: closeDamage }
    };
  }

  function buildCityTrackerIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var block = Math.max(8, enemy.baseAttack);
    var retreatDamage = Math.max(1, enemy.baseAttack - 2);
    var retreatBlock = 4;

    if (enemy && enemy.templateId === "act2_imperial_tracker") {
      return buildImperialTrackerIntent(enemy);
    }

    if (enemy && enemy.templateId === "act3_runner") {
      return buildRunnerIntent(enemy);
    }

    if (enemy && enemy.templateId === "act4_beiyang_squad") {
      return buildBeiyangSquadIntent(enemy);
    }

    if (enemy && enemy.templateId === "act5_tax_militia") {
      return buildTaxMilitiaIntent(enemy);
    }

    if (enemy && enemy.templateId === "act5_incense_deadman") {
      return buildIncenseDeadmanIntent(enemy);
    }

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "压阵",
        value: block,
        data: { block: block }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "attack",
        label: "缠拿刀",
        value: enemy.baseAttack,
        data: { damage: enemy.baseAttack }
      };
    }

    return {
      intent: "attack",
      label: "逼退",
      value: retreatDamage,
      data: {
        damage: retreatDamage,
        block: retreatBlock
      }
    };
  }

  function buildImperialTrackerIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var sealBlock = Math.max(9, enemy.baseAttack + 1);
    var pursuitDamage = enemy.baseAttack;
    var followDamage = Math.max(1, enemy.baseAttack - 1);

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "\u5c01\u9053\u641c\u7f09",
        value: sealBlock,
        data: { block: sealBlock }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "attack",
        label: "\u7f09\u65e8\u62ff\u4eba",
        value: pursuitDamage,
        data: { damage: pursuitDamage }
      };
    }

    return {
      intent: "attack",
      label: "\u63aa\u9a6c\u8ffd\u7f09",
      value: followDamage,
      data: {
        damage: followDamage,
        block: 5
      }
    };
  }

  function buildRunnerIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var probeDamage = Math.max(1, enemy.baseAttack - 1);
    var escapeBlock = Math.max(7, enemy.baseAttack - 1);

    if (cycleIndex === 0) {
      return {
        intent: "attack",
        label: "\u7a7f\u5df7\u8bd5\u5200",
        value: probeDamage,
        data: { damage: probeDamage }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "block",
        label: "\u7ffb\u5899\u8131\u8eab",
        value: escapeBlock,
        data: { block: escapeBlock }
      };
    }

    return {
      intent: "attack",
      label: "\u56de\u8eab\u6253\u54e8",
      value: enemy.baseAttack,
      data: {
        damage: enemy.baseAttack,
        block: 3
      }
    };
  }

  function buildBeiyangSquadIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var formationBlock = Math.max(10, enemy.baseAttack + 1);
    var pushDamage = enemy.baseAttack;
    var lineDamage = Math.max(1, enemy.baseAttack - 1);

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "\u5217\u961f\u538b\u7ebf",
        value: formationBlock,
        data: { block: formationBlock }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "attack",
        label: "\u80a9\u67aa\u903c\u8fdb",
        value: pushDamage,
        data: { damage: pushDamage }
      };
    }

    return {
      intent: "attack",
      label: "\u8e0f\u6b65\u9f50\u4e0a",
      value: lineDamage,
      data: {
        damage: lineDamage,
        block: 6
      }
    };
  }

  function buildTaxMilitiaIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var checkpointBlock = Math.max(10, enemy.baseAttack);
    var taxDamage = enemy.baseAttack;
    var shoreDamage = Math.max(1, enemy.baseAttack - 2);

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "\u5c01\u5cb8\u76d8\u7a0e",
        value: checkpointBlock,
        data: { block: checkpointBlock }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "attack",
        label: "\u7a0e\u68cd\u9a71\u4eba",
        value: taxDamage,
        data: { damage: taxDamage }
      };
    }

    return {
      intent: "attack",
      label: "\u559d\u5dee\u56f4\u5cb8",
      value: shoreDamage,
      data: {
        damage: shoreDamage,
        block: 5
      }
    };
  }

  function buildIncenseDeadmanIntent(enemy) {
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var vowBlock = Math.max(12, enemy.baseAttack - 2);
    var pressDamage = Math.max(1, enemy.baseAttack - 1);

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "\u711a\u9999\u7acb\u8a93",
        value: vowBlock,
        data: { block: vowBlock }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "attack",
        label: "\u8840\u7b26\u903c\u547d",
        value: pressDamage,
        data: {
          damage: pressDamage,
          block: 4
        }
      };
    }

    return {
      intent: "attack",
      label: "\u6b89\u706b\u6251\u8eab",
      value: enemy.baseAttack + 2,
      data: { damage: enemy.baseAttack + 2 }
    };
  }

  // TODO: 卷 2-5 精英 / Boss 还没有策划给逐拍正式脚本；这里先做战术身份更明确的可玩占位分流。
  function getMackIntentVariant(enemy) {
    // Frozen placeholder: Acts 2-5 elite/boss variants currently branch by named
    // tactical identity on top of the Mack/Guard Chief templates. This is an
    // explicit stopgap for logic freeze, not a claim of final design truth.
    if (!enemy) {
      return null;
    }

    if (enemy.templateId === "act2_elite_zhuo_san") {
      return {
        openingLabel: "鹰犬压步",
        openingIntent: "attack",
        openingDamageOffset: -1,
        openingBlock: 4,
        aimLabel: "斜枪锁喉",
        aimNote: enemy.name + "斜起枪口逼近，下一拍便要贴着喉口点名。",
        shotLabel: "点名绝枪"
      };
    }

    if (enemy.templateId === "act3_elite_barlow") {
      return {
        openingLabel: "清街整队",
        openingIntent: "block",
        aimLabel: "锁巷瞄肩",
        aimNote: enemy.name + "吹哨清街，枪口已经封住巷心。",
        shotLabel: "巡捕点杀"
      };
    }

    if (enemy.templateId === "act3_boss_chief_inspector") {
      return {
        openingLabel: "退步封街",
        openingIntent: "block",
        aimLabel: "校枪裁决",
        aimNote: enemy.name + "退到街心校正枪线，下一拍便要当街裁决。",
        shotLabel: "总巡裁决"
      };
    }

    if (enemy.templateId === "act4_elite_qin_biao") {
      return {
        openingLabel: "据闸整枪",
        openingIntent: "block",
        aimLabel: "抵肩校线",
        aimNote: enemy.name + "抵肩校线，步枪准星正沿铁道移来。",
        shotLabel: "步枪撕线"
      };
    }

    if (enemy.templateId === "act4_boss_warlord") {
      return {
        openingLabel: "统领整列",
        openingIntent: "block",
        aimLabel: "封道照准",
        aimNote: enemy.name + "下令封住前路，枪口转向你，下一拍就要开火。",
        shotLabel: "封路点射"
      };
    }

    if (enemy.templateId === "act5_elite_meng_kui") {
      return {
        openingLabel: "扳橹压岸",
        openingIntent: "attack",
        openingDamageOffset: -1,
        openingBlock: 5,
        aimLabel: "锁渡瞄心",
        aimNote: enemy.name + "借船橹稳住枪身，下一拍就要朝你胸前开火。",
        shotLabel: "封江点射"
      };
    }

    return null;
  }

  function buildMackVariantOpeningIntent(enemy, variant, prepBlock) {
    var openingIntent = variant && variant.openingIntent === "attack" ? "attack" : "block";
    var damage = Math.max(1, enemy.baseAttack + (Number(variant && variant.openingDamageOffset) || 0));
    var block = Math.max(0, Number(variant && variant.openingBlock) || prepBlock);
    var data = {};

    if (openingIntent === "attack") {
      data.damage = damage;
      if (block > 0) {
        data.block = block;
      }
      return {
        intent: "attack",
        label: variant.openingLabel,
        value: damage,
        data: data
      };
    }

    return {
      intent: "block",
      label: variant.openingLabel,
      value: block,
      data: { block: block }
    };
  }

  function getGuardChiefIntentVariant(enemy) {
    if (!enemy) {
      return null;
    }

    if (enemy.templateId === "act2_elite_han_bao") {
      return {
        high: [
          { label: "缉旨逼刀" },
          { label: "翻腕断喉", damageOffset: 3 }
        ],
        low: [
          { intent: "debuff", label: "翻囊淬刃" },
          { intent: "block", label: "架门守巷" },
          { intent: "attack", label: "追缉断后" }
        ]
      };
    }

    if (enemy.templateId === "act2_boss_reaper") {
      return {
        high: [
          { label: "催魂逼命", block: 4 },
          { label: "夺魄绝斩", damageOffset: 3 }
        ],
        low: [
          { intent: "debuff", label: "追魂毒刃" },
          { intent: "block", label: "披风护身" },
          { intent: "attack", label: "勾魂追命" }
        ]
      };
    }

    if (enemy.templateId === "act3_elite_shen_lie") {
      return {
        high: [
          { label: "双花压刀", block: 3 },
          { label: "红棍翻砍", damageOffset: 3 }
        ],
        low: [
          { intent: "debuff", label: "洒灰淬刃" },
          { intent: "block", label: "背巷护架" },
          { intent: "attack", label: "贴墙绝砍" }
        ]
      };
    }

    if (enemy.templateId === "act4_elite_luo_wu") {
      return {
        high: [
          { label: "并枪压线", damageOffset: -1, block: 5 },
          { label: "军营斩决", damageOffset: 3 }
        ],
        low: [
          { intent: "debuff", label: "药布割喉" },
          { intent: "block", label: "列阵护身" },
          { intent: "attack", label: "踏步追斩" }
        ]
      };
    }

    if (enemy.templateId === "act5_elite_xie_qi") {
      return {
        high: [
          { label: "供奉逼刃", block: 4 },
          { label: "王府断命", damageOffset: 3 }
        ],
        low: [
          { intent: "debuff", label: "香灰毒誓" },
          { intent: "block", label: "闭渡护身" },
          { intent: "attack", label: "祭门追斩" }
        ]
      };
    }

    if (enemy.templateId === "act5_boss_final") {
      return {
        high: [
          { label: "镇关封江", damageOffset: -1, block: 6 },
          { label: "逐岸绝斩", damageOffset: 3 }
        ],
        low: [
          { intent: "debuff", label: "沉香毒誓" },
          { intent: "block", label: "断渡架势" },
          { intent: "attack", label: "绝江追命" }
        ]
      };
    }

    return null;
  }

  function buildGuardChiefVariantHighIntent(enemy, step) {
    var highStep = step || {};
    var damage = Math.max(1, enemy.baseAttack + (Number(highStep.damageOffset) || 0));
    var data = { damage: damage };

    if (highStep.block) {
      data.block = Math.max(0, Number(highStep.block) || 0);
    }

    return {
      intent: "attack",
      label: highStep.label,
      value: damage,
      data: data
    };
  }

  function buildMackIntent(enemy) {
    var definition = getEnemyDefinition(enemy);
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var prepBlock = Math.max(0, Number(definition.prepBlock) || 0);
    var shootDamage = Math.max(0, Number(definition.shootDamage) || 0);
    var aimValue = shootDamage;
    var variant = getMackIntentVariant(enemy);

    if (variant && cycleIndex === 0) {
      return buildMackVariantOpeningIntent(enemy, variant, prepBlock);
    }

    if (cycleIndex === 0) {
      return {
        intent: "block",
        label: "抽身整枪",
        value: prepBlock,
        data: { block: prepBlock }
      };
    }

    if (variant && cycleIndex === 1) {
      return {
        intent: "buff",
        label: variant.aimLabel,
        value: aimValue,
        data: {
          noteOnly: variant.aimNote
        }
      };
    }

    if (cycleIndex === 1) {
      return {
        intent: "buff",
        label: "举枪压人",
        value: aimValue,
        data: {
          noteOnly: enemy.name + "举枪逼近，点射已在眼前。"
        }
      };
    }

    if (variant) {
      return {
        intent: "attack",
        label: variant.shotLabel,
        value: shootDamage,
        data: {
          damage: shootDamage,
          pierceRatio: Math.max(0, Number(definition.shootPierceRatio) || 0)
        }
      };
    }

    return {
      intent: "attack",
      label: "点射",
      value: shootDamage,
      data: {
        damage: shootDamage,
        pierceRatio: Math.max(0, Number(definition.shootPierceRatio) || 0)
      }
    };
  }

  function buildGuardChiefIntent(enemy) {
    var definition = getEnemyDefinition(enemy);
    var threshold = Math.max(0, Math.min(1, Number(definition.phaseThreshold) || 0.5));
    var highPhase = enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) > threshold : true;
    var lowPhaseAttack = Math.max(0, Number(definition.lowPhaseAttack) || 0);
    var lowPhaseBlock = Math.max(0, Number(definition.lowPhaseBlock) || 0);
    var lowPhaseFinisherAttack = Math.max(0, Number(definition.lowPhaseFinisherAttack) || (lowPhaseAttack + 2));
    var lowPhasePoisonTurns = Math.max(0, Number(definition.lowPhasePoisonTurns) || 0);
    var phaseKey = highPhase ? "high" : "low";
    var phaseCycleIndex = 0;
    var variant = getGuardChiefIntentVariant(enemy);
    var highStep = null;
    var lowStep = null;

    enemy.ai.guardChiefPhase = enemy.ai.guardChiefPhase || "high";
    enemy.ai.phaseCycleIndex = Math.max(0, Number(enemy.ai.phaseCycleIndex) || 0);
    if (enemy.ai.guardChiefPhase !== phaseKey) {
      enemy.ai.guardChiefPhase = phaseKey;
      enemy.ai.phaseCycleIndex = 0;
    }
    phaseCycleIndex = enemy.ai.phaseCycleIndex;

    if (highPhase) {
      if (variant) {
        highStep = variant.high[phaseCycleIndex % variant.high.length];
        return buildGuardChiefVariantHighIntent(enemy, highStep);
      }

      if ((phaseCycleIndex % 2) === 0) {
        return {
          intent: "attack",
          label: "缠身刀",
          value: enemy.baseAttack,
          data: { damage: enemy.baseAttack }
        };
      }

      return {
        intent: "attack",
        label: "御前斩",
        value: enemy.baseAttack + 3,
        data: { damage: enemy.baseAttack + 3 }
      };
    }

    if (variant) {
      lowStep = variant.low[phaseCycleIndex % variant.low.length];

      if (lowStep.intent === "debuff") {
        return {
          intent: "debuff",
          label: lowStep.label,
          value: lowPhaseAttack,
          data: {
            damage: lowPhaseAttack,
            poisonTurns: lowPhasePoisonTurns
          }
        };
      }

      if (lowStep.intent === "block") {
        return {
          intent: "block",
          label: lowStep.label,
          value: lowPhaseBlock,
          data: { block: lowPhaseBlock }
        };
      }

      return {
        intent: "attack",
        label: lowStep.label,
        value: lowPhaseFinisherAttack,
        data: { damage: lowPhaseFinisherAttack }
      };
    }

    if ((phaseCycleIndex % 3) === 0) {
      return {
        intent: "debuff",
        label: "淬毒刃",
        value: lowPhaseAttack,
        data: {
          damage: lowPhaseAttack,
          poisonTurns: lowPhasePoisonTurns
        }
      };
    }

    if ((phaseCycleIndex % 3) === 1) {
      return {
        intent: "block",
        label: "闭门架势",
        value: lowPhaseBlock,
        data: { block: lowPhaseBlock }
      };
    }

    return {
      intent: "attack",
      label: "逼宫追斩",
      value: lowPhaseFinisherAttack,
      data: { damage: lowPhaseFinisherAttack }
    };
  }

  function getNemesisLevel(enemy) {
    return Math.max(1, Math.min(5, Number(enemy && enemy.nemesisLevel) || 1));
  }

  function getNemesisFirearmStage(enemy) {
    var stage=enemy && enemy.firearmStage ? enemy.firearmStage : "none";
    return stage === "mauser" ? "carbine" : stage === "gatling" ? "rifle" : stage;
  }

  function getNemesisFirearmDamage(enemy) {
    if (G.nemesis && typeof G.nemesis.getFirearmDamage === "function") {
      return G.nemesis.getFirearmDamage(getNemesisLevel(enemy));
    }

    return 12 + getNemesisLevel(enemy) * 3;
  }

  function getNemesisChainLength(firearmStage) {
    if (firearmStage === "revolver") {
      return 4;
    }

    if (firearmStage === "carbine" || firearmStage === "rifle" || firearmStage === "mauser" || firearmStage === "gatling") {
      return 3;
    }

    return 1;
  }

  function buildNemesisPrepIntent(enemy, label, note, value, stepIndex) {
    return {
      intent: "buff",
      label: label,
      value: Math.max(0, Number(value) || 0),
      data: {
        noteOnly: note,
        firearm: true,
        firearmStage: getNemesisFirearmStage(enemy),
        firearmStep: stepIndex,
        previewDamage: Math.max(0, Number(value) || 0)
      }
    };
  }

  function buildNemesisShotIntent(enemy, label, targetAll) {
    var damage = getNemesisFirearmDamage(enemy);

    return {
      intent: "attack",
      label: label,
      value: damage,
      data: {
        damage: damage,
        firearm: true,
        firearmStage: getNemesisFirearmStage(enemy),
        firearmStep: getNemesisChainLength(getNemesisFirearmStage(enemy)) - 1,
        target: targetAll ? "all" : "single",
        pierceRatio: enemy.currentAdaptation === "anti_block_tactics" ? 1 : 0.5
      }
    };
  }

  function buildNemesisIntent(enemy) {
    var firearmStage = getNemesisFirearmStage(enemy);
    var cycleIndex = enemy.ai.cycleIndex || 0;
    var firearmDamage = getNemesisFirearmDamage(enemy);

    if (firearmStage === "none") {
      return {
        intent: "attack",
        label: enemy.currentAdaptation === "anti_block_tactics" ? "破架逼斩" : "逼命斩",
        value: Math.max(0, Number(enemy.baseAttack) || 0),
        data: {
          damage: Math.max(0, Number(enemy.baseAttack) || 0),
          pierceRatio: enemy.currentAdaptation === "anti_block_tactics" ? 0.5 : 0
        }
      };
    }

    if (firearmStage === "revolver") {
      if (cycleIndex === 0) {
        return buildNemesisPrepIntent(enemy, "退步拉距", enemy.name + "退步拉距，手已压向枪套。", 0, 0);
      }

      if (cycleIndex === 1) {
        return buildNemesisPrepIntent(enemy, "拔枪扳锤", enemy.name + "拔枪扳锤，枪口已经抬起。", 0, 1);
      }

      if (cycleIndex === 2) {
        return buildNemesisPrepIntent(enemy, "举枪瞄心", enemy.name + "举枪瞄心，下一拍便要开火。", firearmDamage, 2);
      }

      return buildNemesisShotIntent(enemy, "开火", false);
    }

    if (firearmStage === "carbine" || firearmStage === "mauser") {
      if (cycleIndex === 0) {
        return buildNemesisPrepIntent(enemy, "推弹入膛", enemy.name + "推弹入膛，枪机声逼得你难再近身。", 0, 0);
      }

      if (cycleIndex === 1) {
        return buildNemesisPrepIntent(enemy, "举枪压人", enemy.name + "举起卡宾枪，准星已经锁住你胸口。", firearmDamage, 1);
      }

      return buildNemesisShotIntent(enemy, "击发", false);
    }

    if (cycleIndex === 0) {
      return buildNemesisPrepIntent(enemy, "推栓上膛", enemy.name + "推栓上膛，步枪子弹已送入膛中。", 0, 0);
    }

    if (cycleIndex === 1) {
      return buildNemesisPrepIntent(enemy, "抵肩瞄准", enemy.name + "抵肩瞄准，下一拍便要扣动扳机。", firearmDamage, 1);
    }

    return buildNemesisShotIntent(enemy, "步枪击发", false);
  }

  function buildIntentForEnemy(enemy, state, seed) {
    if (enemy.behavior === "boxer") {
      return buildBoxerIntent(enemy, seed);
    }

    if (enemy.behavior === "boxer_leader") {
      return buildBoxerLeaderIntent(enemy, state, seed);
    }

    if (enemy.behavior === "bayonet_scout") {
      return buildBayonetScoutIntent(enemy);
    }

    if (enemy.behavior === "rifle_scout") {
      return buildRifleScoutIntent(enemy);
    }

    if (enemy.behavior === "dock_gunner") {
      return buildDockGunnerIntent(enemy);
    }

    if (enemy.behavior === "machine_loader") {
      return buildMachineLoaderIntent(enemy);
    }

    if (enemy.behavior === "river_gunner") {
      return buildRiverGunnerIntent(enemy);
    }

    if (enemy.behavior === "city_tracker") {
      return buildCityTrackerIntent(enemy);
    }

    if (enemy.behavior === "mack") {
      return buildMackIntent(enemy);
    }

    if (enemy.behavior === "guard_chief") {
      return buildGuardChiefIntent(enemy);
    }

    if (enemy.behavior === "nemesis") {
      return buildNemesisIntent(enemy);
    }

    return buildSimpleIntent(enemy, seed);
  }

  function generateIntent(state) {
    var nextState = normalizeEnemies(state);
    var currentSeed = nextState.combat.rngSeed || 1900;
    var built = null;

    nextState.combat.enemies = nextState.combat.enemies.map(function (enemy) {
      if (enemy.hp <= 0) {
        return enemy;
      }

      built = buildIntentForEnemy(enemy, nextState, currentSeed);
      // Describe existing actions explicitly; this adds no damage or extra turn.
      if (enemy.behavior === 'mack') {
        var gunCycle = enemy.ai.cycleIndex || 0;
        var gunStage = enemy.templateId === 'act4_elite_qin_biao' ? 'rifle' : 'revolver';
        built.data.gunPose = gunCycle >= 1 ? 'aim' : 'reload';
        if (built.data.damage && gunCycle >= 2) { built.data.firearm = true; built.data.firearmStage = gunStage; }
        else if (!built.data.damage) {
          built.data.firearmPrep = true;
          if (built.intent === 'buff') {
            built.data.firearm = true; built.data.firearmStage = gunStage; built.data.firearmStep = 1;
            built.data.previewDamage = built.value;
          }
        }
      }
      built = applyIntentModifiers(enemy, built);
      currentSeed = nextSeed(currentSeed);
      return setEnemyIntent(enemy, built.intent, built.label, built.value, built.data);
    });

    nextState.combat.rngSeed = currentSeed;
    return nextState;
  }

  function discardRemainingHand(state) {
    var nextState = cloneState(state);

    nextState.combat.hand.forEach(function (card) {
      nextState.combat.discardPileNames.push(card.name);
    });
    nextState.combat.hand = [];
    nextState.combat.selectedCardId = null;
    nextState.combat.ui.overlay = null;
    return syncPileCounts(nextState);
  }

  function drawToHandSize(state, targetSize) {
    var nextState = cloneState(state);
    var desired = Math.max(0, Number(targetSize) || 0);
    var shuffled = [];

    while (nextState.combat.hand.length < desired) {
      if (nextState.combat.drawPileNames.length === 0) {
        if (nextState.combat.discardPileNames.length === 0) {
          break;
        }

        // Spent techniques cannot feed their own draw loop in the same turn.
        // Count copies by name: an unused copy from an earlier turn stays eligible.
        var lockedCounts = {}, locked = [], eligible = [];
        (nextState.combat.playedThisTurnNames || []).forEach(function(name) {
          lockedCounts[name] = (lockedCounts[name] || 0) + 1;
        });
        nextState.combat.discardPileNames.forEach(function(name) {
          if (lockedCounts[name] > 0) { locked.push(name); lockedCounts[name] -= 1; }
          else eligible.push(name);
        });
        if (eligible.length === 0) break;
        shuffled = reorderDiscard(eligible, nextState.combat.rngSeed || 1900);
        nextState.combat.drawPileNames = shuffled;
        nextState.combat.discardPileNames = locked;
        nextState.combat.rngSeed = nextSeed(nextState.combat.rngSeed || 1900);
      }

      nextState.combat.hand.push(createCardInstance(nextState, nextState.combat.drawPileNames.shift()));
    }

    nextState = syncPileCounts(nextState);
    return G.deck.refreshHandPlayability(nextState);
  }

  function drawCards(state, amount) {
    var nextState = cloneState(state);
    var count = Math.max(0, Number(amount) || 0);
    return drawToHandSize(nextState, nextState.combat.hand.length + count);
  }

  function summonEnemy(state, templateId) {
    var nextState = normalizeEnemies(state);
    var aliveEnemies = nextState.combat.enemies.filter(function (enemy) {
      return enemy.hp > 0;
    }).length;
    var serial = nextState.combat.enemySerial || (nextState.combat.enemies.length + 1);
    var summoned = null;

    if (aliveEnemies >= 3 || !G.enemies || typeof G.enemies.createEnemy !== "function") {
      return {
        state: nextState,
        enemy: null
      };
    }

    summoned = G.enemies.createEnemy(templateId, serial);
    if (!summoned) {
      return {
        state: nextState,
        enemy: null
      };
    }

    nextState.combat.enemySerial = serial + 1;
    nextState.combat.enemies.push(summoned);
    return {
      state: nextState,
      enemy: summoned
    };
  }

  function resolveEnemyTurn(state, trace) {
    var nextState = normalizeEnemies(state);
    var logs = Array.isArray(nextState.combat.turnStartEnemyNotes) ? nextState.combat.turnStartEnemyNotes.slice() : [];
    var i = 0;
    var enemy = null;
    var intentData = null;
    var summonResult = null;
    var blindActive = false;
    var beforeAction = null;
    var actingEnemy = null;
    var logStart = 0;

    for (i = 0; i < nextState.combat.enemies.length; i += 1) {
      enemy = nextState.combat.enemies[i];
      if (!enemy || enemy.hp <= 0) {
        continue;
      }

      if (trace) {
        beforeAction = cloneState(nextState);
        actingEnemy = cloneState(enemy);
        logStart = logs.length;
      }

      intentData = Object.assign({}, enemy.intentData || {});

      if (intentData.block) {
        enemy.block += intentData.block;
        logs.push(enemy.name + "摆开架势，获得 " + intentData.block + " 点架势。");
      }

      if (intentData.noteOnly) {
        logs.push(intentData.noteOnly);
      }

      if (intentData.damage) {
        blindActive = !!G.statusEffects && typeof G.statusEffects.getBlind === "function" ?
          G.statusEffects.getBlind(enemy) > 0 :
          false;
        nextState = damagePlayer(nextState, intentData.damage, {
          pierceRatio: intentData.pierceRatio
        });
        if (blindActive && intentData.target === "all") {
          logs.push(enemy.name + "迷了眼，扫射只打出 " + intentData.damage + " 点全场伤害。");
        } else if (blindActive) {
          logs.push(enemy.name + "迷了眼，攻势被削到 " + intentData.damage + " 点。");
        } else if (intentData.target === "all" && intentData.pierceRatio >= 1) {
          logs.push(enemy.name + "火网横扫全场，越过全部架势，造成 " + intentData.damage + " 点伤害。");
        } else if (intentData.target === "all") {
          logs.push(enemy.name + "火网横扫全场，无视部分架势，造成 " + intentData.damage + " 点伤害。");
        } else if (intentData.firearm && intentData.pierceRatio >= 1) {
          logs.push(enemy.name + "枪火越过全部架势，造成 " + intentData.damage + " 点伤害。");
        } else if (intentData.firearm && intentData.pierceRatio) {
          logs.push(enemy.name + "枪火无视部分架势，造成 " + intentData.damage + " 点伤害。");
        } else if (intentData.pierceRatio) {
          logs.push(enemy.name + "无视部分架势，造成 " + intentData.damage + " 点伤害。");
        } else {
          logs.push(enemy.name + "造成 " + intentData.damage + " 点伤害。");
        }
      }

      if (intentData.poisonTurns && G.statusEffects && typeof G.statusEffects.applyPlayerPoison === "function") {
        nextState = G.statusEffects.applyPlayerPoison(nextState, intentData.poisonTurns);
        logs.push(enemy.name + "刀上淬毒，你中毒 " + intentData.poisonTurns + " 回合。");
      }

      if (intentData.summonTemplateId) {
        summonResult = summonEnemy(nextState, intentData.summonTemplateId);
        nextState = summonResult.state;
        if (summonResult.enemy) {
          logs.push(enemy.name + "一声喝令，唤来了【" + summonResult.enemy.name + "】。");
        } else {
          logs.push(enemy.name + "试图再唤拳民上前，但场面已经挤满。");
        }
      }

      enemy = nextState.combat.enemies.find(function (item) {
        return item.id === enemy.id;
      });
      if (enemy && G.statusEffects && typeof G.statusEffects.completeEnemyTurn === "function") {
        nextState = G.statusEffects.completeEnemyTurn(nextState, enemy.id);
        enemy = nextState.combat.enemies.find(function (item) {
          return item.id === enemy.id;
        });
      }
      if (enemy && enemy.behavior === "mack") {
        enemy.ai.cycleIndex = (enemy.ai.cycleIndex + 1) % 3;
      }
      if (enemy && enemy.behavior === "simple") {
        enemy.ai.cycleIndex = (enemy.ai.cycleIndex + 1) % 3;
      }
      if (enemy && enemy.behavior === "bayonet_scout") {
        enemy.ai.cycleIndex = (enemy.ai.cycleIndex + 1) % 3;
      }
      if (enemy && enemy.behavior === "rifle_scout") {
        enemy.ai.cycleIndex = (enemy.ai.cycleIndex + 1) % 3;
      }
      if (enemy && enemy.behavior === "dock_gunner") {
        enemy.ai.cycleIndex = (enemy.ai.cycleIndex + 1) % 3;
      }
      if (enemy && enemy.behavior === "machine_loader") {
        enemy.ai.cycleIndex = (enemy.ai.cycleIndex + 1) % 4;
      }
      if (enemy && enemy.behavior === "river_gunner") {
        enemy.ai.cycleIndex = (enemy.ai.cycleIndex + 1) % 3;
      }
      if (enemy && enemy.behavior === "city_tracker") {
        enemy.ai.cycleIndex = (enemy.ai.cycleIndex + 1) % 3;
      }
      if (enemy && enemy.behavior === "guard_chief") {
        enemy.ai.phaseCycleIndex = (enemy.ai.phaseCycleIndex + 1) % (enemy.ai.guardChiefPhase === "high" ? 2 : 3);
      }
      if (enemy && enemy.behavior === "nemesis") {
        enemy.ai.cycleIndex = (enemy.ai.cycleIndex + 1) % getNemesisChainLength(enemy.firearmStage);
      }

      if (trace) {
        var shownAction = cloneState(nextState);
        shownAction.combat.lastAction = logs.slice(logStart).join("；");
        trace.push({ type: "enemy", enemy: actingEnemy, before: beforeAction, after: shownAction });
      }

      if (nextState.player.hp <= 0) {
        break;
      }
    }

    nextState.combat.lastEnemyAction = logs.join("；");
    nextState.combat.lastAction = nextState.combat.lastEnemyAction || "敌人按兵不动。";
    nextState.combat.turnStartEnemyNotes = [];
    return nextState;
  }

  function applyRoundStartEnemyEffects(state) {
    var nextState = normalizeEnemies(state);
    var notes = [];
    var chainArmorBlock = 0;

    nextState.combat.enemies.forEach(function (enemy) {
      if (enemy.hp <= 0) {
        return;
      }

      if (enemy.currentAdaptation === "chain_armor") {
        chainArmorBlock = G.nemesis && typeof G.nemesis.getChainArmorBlock === "function" ?
          G.nemesis.getChainArmorBlock(enemy.nemesisLevel) :
          (5 + getNemesisLevel(enemy) * 2);
        enemy.block += chainArmorBlock;
        notes.push(enemy.name + "铁索缠身，自动获得 " + chainArmorBlock + " 点架势。");
      }

      if (enemy.ai.pendingFervor) {
        enemy.buffs.fervor = Math.min(5, (enemy.buffs.fervor || 0) + 1);
        enemy.ai.pendingFervor = false;
        notes.push(enemy.name + "怒意翻涌，狂热升至 " + enemy.buffs.fervor + "。");
      }

      enemy.ai.hitTakenThisTurn = false;
    });

    nextState.combat.roundStartEnemyNotes = notes;
    return nextState;
  }

  function startPlayerTurn(state) {
    var nextState = cloneState(state);
    var enemyAction = nextState.combat.lastEnemyAction;
    var notes = [];
    var playerStatusNotes = [];
    var relicNotes = [];
    var messageParts = [];
    var playerTurnStatus = null;

    nextState.player.block = 0;
    nextState.player.energy = nextState.player.maxEnergy;
    nextState.combat.turn += 1;
    nextState.combat.playedThisTurnNames = [];
    nextState.combat.selectedCardId = null;
    if (G.statusEffects && typeof G.statusEffects.resetComboState === "function") {
      nextState = G.statusEffects.resetComboState(nextState);
    } else {
      nextState.combat.comboCount = 0;
      nextState.combat.comboDiscountUses = 0;
    }
    if (G.statusEffects && typeof G.statusEffects.resolvePlayerTurnStart === "function") {
      playerTurnStatus = G.statusEffects.resolvePlayerTurnStart(nextState);
      nextState = playerTurnStatus.state;
      playerStatusNotes = playerTurnStatus.notes;
    }
    nextState = checkBattleOutcome(nextState);
    if (nextState.combat.result !== "active") {
      nextState.combat.lastAction = playerStatusNotes.length > 0 ? playerStatusNotes.join(" ") : nextState.combat.lastAction;
      return nextState;
    }
    if (G.relicRuntime && typeof G.relicRuntime.beginPlayerTurn === "function") {
      nextState = G.relicRuntime.beginPlayerTurn(nextState);
    }
    nextState = applyRoundStartEnemyEffects(nextState);
    nextState = drawToHandSize(nextState, 5);
    nextState = generateIntent(nextState);
    notes = nextState.combat.roundStartEnemyNotes || [];
    relicNotes = nextState.combat.relicTurnNotes || [];

    if (enemyAction) {
      messageParts.push(enemyAction);
    }
    if (playerStatusNotes.length > 0) {
      messageParts.push(playerStatusNotes.join(" "));
    }
    if (notes.length > 0) {
      messageParts.push(notes.join(" "));
    }
    if (relicNotes.length > 0) {
      messageParts.push(relicNotes.join(" "));
    }
    messageParts.push("新回合开始。");
    nextState.combat.lastAction = messageParts.join(" ");

    return nextState;
  }

  function resolveEndTurn(state, trace) {
    var nextState = discardRemainingHand(state);
    var turnStartEffects = null;
    var beforeStart = null;

    if (trace) trace.push({ type: "discard", before: cloneState(state), after: cloneState(nextState) });
    beforeStart = trace ? cloneState(nextState) : null;

    nextState = clearEnemyBlockForTurn(nextState);
    if (G.statusEffects && typeof G.statusEffects.resolveEnemyTurnStart === "function") {
      turnStartEffects = G.statusEffects.resolveEnemyTurnStart(nextState);
      nextState = turnStartEffects.state;
      nextState.combat.turnStartEnemyNotes = turnStartEffects.notes;
    }
    nextState = checkBattleOutcome(nextState);
    if (trace) trace.push({ type: "enemy_status", before: beforeStart, after: cloneState(nextState) });
    if (nextState.combat.result !== "active") {
      nextState.combat.lastEnemyAction = (nextState.combat.turnStartEnemyNotes || []).join(" ");
      nextState.combat.lastAction = nextState.combat.lastEnemyAction || nextState.combat.lastAction;
      nextState.combat.turnStartEnemyNotes = [];
      return G.deck.refreshHandPlayability(syncPileCounts(nextState));
    }

    nextState = resolveEnemyTurn(nextState, trace);
    nextState = checkBattleOutcome(nextState);
    if (nextState.combat.result !== "active") {
      return G.deck.refreshHandPlayability(syncPileCounts(nextState));
    }

    beforeStart = trace ? cloneState(nextState) : null;
    nextState = checkBattleOutcome(startPlayerTurn(nextState));
    if (trace) trace.push({ type: "turn_start", before: beforeStart, after: cloneState(nextState) });
    return nextState;
  }

  G.enemyAI = {
    applyDamageToEnemy: applyDamageToEnemy,
    gainPlayerBlock: gainPlayerBlock,
    damagePlayer: damagePlayer,
    checkBattleOutcome: checkBattleOutcome,
    createCardInstance: createCardInstance,
    materializeHand: materializeHand,
    generateIntent: generateIntent,
    drawCards: drawCards,
    resolveEndTurn: resolveEndTurn,
    syncPileCounts: syncPileCounts,
    normalizeEnemies: normalizeEnemies,
    refreshIntentsForDebuffs: refreshIntentsForDebuffs
  };
})();
