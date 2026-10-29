window.G = window.G || {};
G.enemies = G.enemies || {};

(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nextSeed(seed) {
    return (seed * 1664525 + 1013904223) >>> 0;
  }

  function createDefinition(id, name, kind, maxHp, attack, behavior, extra) {
    return Object.assign({
      id: id,
      name: name,
      kind: kind,
      maxHp: maxHp,
      attack: attack,
      behavior: behavior
    }, extra || {});
  }

  function createEncounter(id, name, enemyIds) {
    return {
      id: id,
      name: name,
      enemyIds: enemyIds.slice()
    };
  }

  var actCatalog = {
    1: {
      number: 1,
      title: "卷一：沦陷的九城",
      mapSubtitle: "12 个节点，3 条路径，在乱城废墟间寻找活路。",
      streetIntroId: "street_intro",
      streetPool: [
        "street_boxer_pair",
        "street_boxer_leader",
        "street_foreign_scout",
        "street_city_tracker_patrol"
      ],
      elitePool: ["elite_mack"],
      gateEncounterId: "gate_guard_chief"
    },
    2: {
      number: 2,
      title: "卷二：焦土驿道",
      mapSubtitle: "12 个节点，3 条路径，驿道尽成焦土，劫匪和追兵一路压来。",
      streetIntroId: "act2_street_intro",
      streetPool: [
        "act2_street_burned_bandits",
        "act2_street_courier_ambush",
        "act2_street_imperial_patrol",
        "act2_street_rifle_cart"
      ],
      elitePool: [
        "act2_elite_zhuo_san",
        "act2_elite_han_bao"
      ],
      gateEncounterId: "act2_gate_reaper"
    },
    3: {
      number: 3,
      title: "卷三：津门租界",
      mapSubtitle: "12 个节点，3 条路径，租界灯火未熄，但刀枪都比城外更整齐。",
      streetIntroId: "act3_street_intro",
      streetPool: [
        "act3_street_green_gang_corner",
        "act3_street_patrol_whistle",
        "act3_street_dock_guns",
        "act3_street_settlement_mix"
      ],
      elitePool: [
        "act3_elite_barlow",
        "act3_elite_shen_lie"
      ],
      gateEncounterId: "act3_gate_chief_inspector"
    },
    4: {
      number: 4,
      title: "卷四：北洋铁路营",
      mapSubtitle: "12 个节点，3 条路径，清廷追缉令已到北洋军营，铁路与军械运输一齐封锁。",
      streetIntroId: "act4_street_intro",
      streetPool: [
        "act4_street_rail_guards",
        "act4_street_quick_guns",
        "act4_street_machine_team",
        "act4_street_supply_cutters"
      ],
      elitePool: [
        "act4_elite_luo_wu",
        "act4_elite_qin_biao"
      ],
      gateEncounterId: "act4_gate_warlord"
    },
    5: {
      number: 5,
      title: "卷五：南下渡口",
      mapSubtitle: "12 个节点，3 条路径，南下只剩最后一道渡口，死士与枪手一齐封江。",
      streetIntroId: "act5_street_intro",
      streetPool: [
        "act5_street_tax_men",
        "act5_street_river_hunters",
        "act5_street_loyalists",
        "act5_street_water_cutters"
      ],
      elitePool: [
        "act5_elite_meng_kui",
        "act5_elite_xie_qi"
      ],
      gateEncounterId: "act5_gate_final"
    }
  };

  var definitions = {
    routed_qing_soldier: createDefinition("routed_qing_soldier", "溃逃清兵", "normal", 25, 6, "simple"),
    boxer: createDefinition("boxer", "义和团拳师", "normal", 30, 5, "boxer"),
    boxer_leader: createDefinition("boxer_leader", "义和团香主", "normal", 40, 10, "boxer_leader", {
      summonEvery: 3
    }),
    foreign_scout: createDefinition("foreign_scout", "洋兵斥候", "normal", 28, 7, "rifle_scout", {
      shootDamage: 8,
      shootPierceRatio: 0
    }),
    city_tracker: createDefinition("city_tracker", "九门缉捕", "normal", 34, 8, "city_tracker"),
    elite_mack: createDefinition("elite_mack", "洋枪队教官·麦克", "elite", 70, 8, "mack", {
      prepBlock: 6,
      aimValue: 15,
      shootDamage: 15,
      shootPierceRatio: 0.3
    }),
    boss_guard_chief: createDefinition("boss_guard_chief", "大内侍卫总长", "boss", 120, 13, "guard_chief", {
      phaseThreshold: 0.5,
      lowPhaseAttack: 8,
      lowPhaseBlock: 12,
      lowPhaseFinisherAttack: 10,
      lowPhasePoisonTurns: 2
    }),
    // 卷二：焦土驿道
    act2_road_blade: createDefinition("act2_road_blade", "驿道刀客", "normal", 36, 9, "simple"),
    act2_cinder_looter: createDefinition("act2_cinder_looter", "焦土流匪", "normal", 40, 8, "boxer"),
    act2_courier_scout: createDefinition("act2_courier_scout", "驿站望风", "normal", 34, 10, "simple"),
    act2_rifle_cart: createDefinition("act2_rifle_cart", "押车枪手", "normal", 38, 9, "rifle_scout", {
      reloadBlock: 6,
      shootDamage: 11,
      shootPierceRatio: 0
    }),
    act2_imperial_tracker: createDefinition("act2_imperial_tracker", "缉旨缇骑", "normal", 44, 10, "city_tracker"),
    act2_elite_zhuo_san: createDefinition("act2_elite_zhuo_san", "大内鹰犬·卓三", "elite", 84, 11, "mack", {
      prepBlock: 7,
      aimValue: 18,
      shootDamage: 18,
      shootPierceRatio: 0.35
    }),
    act2_elite_han_bao: createDefinition("act2_elite_han_bao", "缉旨刀客·韩豹", "elite", 92, 13, "guard_chief", {
      phaseThreshold: 0.55,
      lowPhaseAttack: 11,
      lowPhaseBlock: 11,
      lowPhaseFinisherAttack: 13,
      lowPhasePoisonTurns: 1
    }),
    act2_boss_reaper: createDefinition("act2_boss_reaper", "御前追魂使", "boss", 132, 12, "guard_chief", {
      phaseThreshold: 0.46,
      lowPhaseAttack: 8,
      lowPhaseBlock: 9,
      lowPhaseFinisherAttack: 11,
      lowPhasePoisonTurns: 1
    }),
    // 卷三：津门租界
    act3_settlement_patrol: createDefinition("act3_settlement_patrol", "租界巡捕", "normal", 46, 11, "city_tracker"),
    act3_green_gang: createDefinition("act3_green_gang", "青帮红棍", "normal", 48, 11, "boxer"),
    act3_dock_gunner: createDefinition("act3_dock_gunner", "码头枪手", "normal", 44, 11, "rifle_scout", {
      reloadBlock: 6,
      shootDamage: 13,
      shootPierceRatio: 0.1
    }),
    act3_red_turban: createDefinition("act3_red_turban", "红头阿三", "normal", 47, 12, "simple"),
    act3_runner: createDefinition("act3_runner", "跑狗探子", "normal", 42, 10, "city_tracker"),
    act3_elite_barlow: createDefinition("act3_elite_barlow", "巡捕房教头·巴洛", "elite", 104, 13, "mack", {
      prepBlock: 8,
      aimValue: 20,
      shootDamage: 20,
      shootPierceRatio: 0.4
    }),
    act3_elite_shen_lie: createDefinition("act3_elite_shen_lie", "双花红棍·沈烈", "elite", 112, 14, "guard_chief", {
      phaseThreshold: 0.55,
      lowPhaseAttack: 12,
      lowPhaseBlock: 13,
      lowPhaseFinisherAttack: 14,
      lowPhasePoisonTurns: 1
    }),
    act3_boss_chief_inspector: createDefinition("act3_boss_chief_inspector", "租界总巡长", "boss", 156, 13, "mack", {
      prepBlock: 8,
      aimValue: 21,
      shootDamage: 20,
      shootPierceRatio: 0.25
    }),
    // 卷四：北洋铁路营
    act4_beiyang_squad: createDefinition("act4_beiyang_squad", "北洋棚目", "normal", 56, 13, "city_tracker"),
    act4_rail_guard: createDefinition("act4_rail_guard", "铁路护兵", "normal", 60, 14, "simple"),
    act4_quick_officer: createDefinition("act4_quick_officer", "快枪哨官", "normal", 54, 13, "rifle_scout", {
      reloadBlock: 6,
      shootDamage: 17,
      shootPierceRatio: 0.2
    }),
    act4_supply_chopper: createDefinition("act4_supply_chopper", "辎重刀斧手", "normal", 64, 15, "simple"),
    act4_machine_loader: createDefinition("act4_machine_loader", "步枪射手", "normal", 58, 14, "rifle_scout", {
      reloadBlock: 8,
      shootDamage: 19,
      shootPierceRatio: 0.25
    }),
    act4_elite_luo_wu: createDefinition("act4_elite_luo_wu", "统领营亲兵·罗伍", "elite", 122, 15, "guard_chief", {
      phaseThreshold: 0.52,
      lowPhaseAttack: 13,
      lowPhaseBlock: 14,
      lowPhaseFinisherAttack: 15,
      lowPhasePoisonTurns: 1
    }),
    act4_elite_qin_biao: createDefinition("act4_elite_qin_biao", "枪营把总·秦彪", "elite", 128, 15, "mack", {
      prepBlock: 9,
      aimValue: 26,
      shootDamage: 25,
      shootPierceRatio: 0.4
    }),
    act4_boss_warlord: createDefinition("act4_boss_warlord", "铁路线统领", "boss", 166, 15, "mack", {
      prepBlock: 7,
      aimValue: 24,
      shootDamage: 20,
      shootPierceRatio: 0.05
    }),
    // 卷五：南下渡口
    act5_tax_militia: createDefinition("act5_tax_militia", "渡口税勇", "normal", 64, 15, "city_tracker"),
    act5_loyal_blade: createDefinition("act5_loyal_blade", "清廷死士", "normal", 68, 16, "simple"),
    act5_river_gunner: createDefinition("act5_river_gunner", "缉江枪手", "normal", 62, 15, "rifle_scout", {
      reloadBlock: 7,
      shootDamage: 18,
      shootPierceRatio: 0.3
    }),
    act5_water_knifer: createDefinition("act5_water_knifer", "水道刀客", "normal", 72, 16, "boxer"),
    act5_incense_deadman: createDefinition("act5_incense_deadman", "香火死士", "normal", 72, 17, "city_tracker"),
    act5_elite_meng_kui: createDefinition("act5_elite_meng_kui", "内河统带·孟奎", "elite", 140, 16, "mack", {
      prepBlock: 9,
      aimValue: 27,
      shootDamage: 26,
      shootPierceRatio: 0.35
    }),
    act5_elite_xie_qi: createDefinition("act5_elite_xie_qi", "王府供奉·谢七", "elite", 140, 15, "guard_chief", {
      phaseThreshold: 0.45,
      lowPhaseAttack: 12,
      lowPhaseBlock: 13,
      lowPhaseFinisherAttack: 15,
      lowPhasePoisonTurns: 1
    }),
    act5_boss_final: createDefinition("act5_boss_final", "南下镇关使", "boss", 188, 16, "guard_chief", {
      phaseThreshold: 0.35,
      lowPhaseAttack: 12,
      lowPhaseBlock: 13,
      lowPhaseFinisherAttack: 15,
      lowPhasePoisonTurns: 0
    })
  };

  var encounterDefinitions = {
    street_intro: createEncounter("street_intro", "乱军缺口", ["routed_qing_soldier"]),
    street_boxer_pair: createEncounter("street_boxer_pair", "拳民围堵", ["boxer", "boxer"]),
    street_boxer_leader: createEncounter("street_boxer_leader", "香主压阵", ["boxer_leader"]),
    street_foreign_scout: createEncounter("street_foreign_scout", "租界刺刀哨", ["foreign_scout"]),
    street_city_tracker_patrol: createEncounter("street_city_tracker_patrol", "缉捕巡街", ["city_tracker", "routed_qing_soldier"]),
    elite_mack: createEncounter("elite_mack", "洋枪队教官·麦克", ["elite_mack"]),
    gate_guard_chief: createEncounter("gate_guard_chief", "大内侍卫总长", ["boss_guard_chief"]),
    act2_street_intro: createEncounter("act2_street_intro", "焦驿断口", ["act2_road_blade"]),
    act2_street_burned_bandits: createEncounter("act2_street_burned_bandits", "焦土匪棚", ["act2_cinder_looter", "act2_road_blade"]),
    act2_street_courier_ambush: createEncounter("act2_street_courier_ambush", "驿站伏哨", ["act2_courier_scout", "act2_road_blade"]),
    act2_street_imperial_patrol: createEncounter("act2_street_imperial_patrol", "缉旨巡道", ["act2_imperial_tracker"]),
    act2_street_rifle_cart: createEncounter("act2_street_rifle_cart", "押车火枪", ["act2_rifle_cart", "act2_cinder_looter"]),
    act2_elite_zhuo_san: createEncounter("act2_elite_zhuo_san", "大内鹰犬·卓三", ["act2_elite_zhuo_san"]),
    act2_elite_han_bao: createEncounter("act2_elite_han_bao", "缉旨刀客·韩豹", ["act2_elite_han_bao"]),
    act2_gate_reaper: createEncounter("act2_gate_reaper", "御前追魂使", ["act2_boss_reaper"]),
    act3_street_intro: createEncounter("act3_street_intro", "租界岗口", ["act3_settlement_patrol"]),
    act3_street_green_gang_corner: createEncounter("act3_street_green_gang_corner", "红棍堵巷", ["act3_green_gang", "act3_red_turban"]),
    act3_street_patrol_whistle: createEncounter("act3_street_patrol_whistle", "巡捕哨声", ["act3_settlement_patrol", "act3_runner"]),
    act3_street_dock_guns: createEncounter("act3_street_dock_guns", "码头短枪", ["act3_dock_gunner", "act3_runner"]),
    act3_street_settlement_mix: createEncounter("act3_street_settlement_mix", "租界混战", ["act3_green_gang", "act3_dock_gunner"]),
    act3_elite_barlow: createEncounter("act3_elite_barlow", "巡捕房教头·巴洛", ["act3_elite_barlow"]),
    act3_elite_shen_lie: createEncounter("act3_elite_shen_lie", "双花红棍·沈烈", ["act3_elite_shen_lie"]),
    act3_gate_chief_inspector: createEncounter("act3_gate_chief_inspector", "租界总巡长", ["act3_boss_chief_inspector"]),
    act4_street_intro: createEncounter("act4_street_intro", "铁路岗哨", ["act4_beiyang_squad"]),
    act4_street_rail_guards: createEncounter("act4_street_rail_guards", "铁道截兵", ["act4_rail_guard", "act4_beiyang_squad"]),
    act4_street_quick_guns: createEncounter("act4_street_quick_guns", "快枪压线", ["act4_quick_officer", "act4_beiyang_squad"]),
    act4_street_machine_team: createEncounter("act4_street_machine_team", "枪营巡哨", ["act4_machine_loader", "act4_quick_officer"]),
    act4_street_supply_cutters: createEncounter("act4_street_supply_cutters", "辎重刀队", ["act4_supply_chopper", "act4_rail_guard"]),
    act4_elite_luo_wu: createEncounter("act4_elite_luo_wu", "统领营亲兵·罗伍", ["act4_elite_luo_wu"]),
    act4_elite_qin_biao: createEncounter("act4_elite_qin_biao", "枪营把总·秦彪", ["act4_elite_qin_biao"]),
    act4_gate_warlord: createEncounter("act4_gate_warlord", "铁路线统领", ["act4_boss_warlord"]),
    act5_street_intro: createEncounter("act5_street_intro", "渡口拦检", ["act5_tax_militia"]),
    act5_street_tax_men: createEncounter("act5_street_tax_men", "税勇封岸", ["act5_tax_militia", "act5_loyal_blade"]),
    act5_street_river_hunters: createEncounter("act5_street_river_hunters", "缉江火枪", ["act5_river_gunner", "act5_tax_militia"]),
    act5_street_loyalists: createEncounter("act5_street_loyalists", "香火死士", ["act5_incense_deadman", "act5_loyal_blade"]),
    act5_street_water_cutters: createEncounter("act5_street_water_cutters", "水道截杀", ["act5_water_knifer", "act5_river_gunner"]),
    act5_elite_meng_kui: createEncounter("act5_elite_meng_kui", "内河统带·孟奎", ["act5_elite_meng_kui"]),
    act5_elite_xie_qi: createEncounter("act5_elite_xie_qi", "王府供奉·谢七", ["act5_elite_xie_qi"]),
    act5_gate_final: createEncounter("act5_gate_final", "南下镇关使", ["act5_boss_final"])
  };

  function getActCount() {
    return Object.keys(actCatalog).length;
  }

  function getActNumber(state) {
    var raw = state && state.map ? Number(state.map.actNumber) : 1;

    if (!raw || raw < 1) {
      raw = 1;
    }

    return Math.max(1, Math.min(getActCount(), raw));
  }

  function getActMeta(actNumber) {
    var safeNumber = Math.max(1, Math.min(getActCount(), Number(actNumber) || 1));
    return actCatalog[safeNumber] || actCatalog[1];
  }

  function createEnemy(templateId, serial) {
    var definition = definitions[templateId];

    if (!definition) {
      return null;
    }

    return {
      id: templateId + "_" + serial,
      templateId: definition.id,
      name: definition.name,
      kind: definition.kind,
      behavior: definition.behavior,
      maxHp: definition.maxHp,
      hp: definition.maxHp,
      block: 0,
      baseAttack: definition.attack,
      intent: "attack",
      intentLabel: "劈砍",
      intentValue: definition.attack,
      intentData: { damage: definition.attack },
      debuffs: { flaw: 0, fester: 0 },
      buffs: { fervor: 0 },
      ai: {
        cycleIndex: 0,
        pendingFervor: false,
        hitTakenThisTurn: false
      }
    };
  }

  function buildEncounter(encounterId) {
    var encounter = encounterDefinitions[encounterId];
    var serial = 1;

    if (!encounter) {
      return null;
    }

    return {
      id: encounter.id,
      name: encounter.name,
      enemies: encounter.enemyIds.map(function (enemyId) {
        var enemy = createEnemy(enemyId, serial);
        serial += 1;
        return enemy;
      }).filter(Boolean),
      nextEnemySerial: serial
    };
  }

  function getNodeById(state, nodeId) {
    var nodes = state && state.map && Array.isArray(state.map.nodes) ? state.map.nodes : [];
    var i = 0;

    for (i = 0; i < nodes.length; i += 1) {
      if (nodes[i].id === nodeId) {
        return nodes[i];
      }
    }

    return null;
  }

  function countVisitedNodesOfType(state, nodeType) {
    var visitedNodeIds = state && state.map && Array.isArray(state.map.visitedNodeIds) ? state.map.visitedNodeIds : [];
    var total = 0;
    var i = 0;
    var node = null;

    for (i = 0; i < visitedNodeIds.length; i += 1) {
      node = getNodeById(state, visitedNodeIds[i]);
      if (node && (node.baseType || node.type) === nodeType) {
        total += 1;
      }
    }

    return total;
  }

  function pickEncounterFromPool(pool, seed, offset) {
    var safePool = Array.isArray(pool) && pool.length > 0 ? pool : [];
    var safeSeed = Math.max(0, Number(seed) || 0);
    var safeOffset = Math.max(0, Number(offset) || 0);

    if (safePool.length === 0) {
      return null;
    }

    return safePool[(safeSeed + safeOffset) % safePool.length];
  }

  function pickStreetEncounterId(state, actMeta, seed) {
    var streetCount = countVisitedNodesOfType(state, "street");
    var currentSeed = seed || 1900;
    var encounterId = null;

    if (streetCount <= 1) {
      return {
        encounterId: actMeta.streetIntroId,
        nextSeed: currentSeed
      };
    }

    encounterId = pickEncounterFromPool(actMeta.streetPool, currentSeed, streetCount);
    return {
      encounterId: encounterId || actMeta.streetIntroId,
      nextSeed: nextSeed(currentSeed)
    };
  }

  function pickEliteEncounterId(state, actMeta, seed) {
    var eliteCount = countVisitedNodesOfType(state, "elite");
    var currentSeed = seed || 1900;
    var encounterId = pickEncounterFromPool(actMeta.elitePool, currentSeed, eliteCount);

    return {
      encounterId: encounterId || actMeta.elitePool[0],
      nextSeed: nextSeed(currentSeed)
    };
  }

  function buildEncounterForNode(state, node) {
    var mapNode = node || getNodeById(state, state && state.map ? state.map.currentNodeId : null);
    var currentSeed = state && state.combat ? (state.combat.rngSeed || 1900) : 1900;
    var actMeta = getActMeta(getActNumber(state));
    var picked = null;
    var encounter = null;

    if (!mapNode) {
      encounter = buildEncounter(actMeta.streetIntroId);
      encounter.nodeType = "street";
      encounter.actNumber = actMeta.number;
      encounter.nextSeed = currentSeed;
      return encounter;
    }

    if (mapNode.type === "elite") {
      picked = pickEliteEncounterId(state, actMeta, currentSeed);
      encounter = buildEncounter(picked.encounterId);
      encounter.nodeType = mapNode.type;
      encounter.actNumber = actMeta.number;
      encounter.nextSeed = picked.nextSeed;
      return encounter;
    }

    if (mapNode.type === "gate") {
      encounter = buildEncounter(actMeta.gateEncounterId);
      encounter.nodeType = mapNode.type;
      encounter.actNumber = actMeta.number;
      encounter.nextSeed = nextSeed(currentSeed);
      return encounter;
    }

    picked = pickStreetEncounterId(state, actMeta, currentSeed);
    encounter = buildEncounter(picked.encounterId);
    encounter.nodeType = mapNode.type;
    encounter.actNumber = actMeta.number;
    encounter.nextSeed = picked.nextSeed;
    return encounter;
  }

  // Act 3-5 firearm normals get distinct behavior loops without rewriting the mojibake-heavy table above.
  definitions.act3_dock_gunner.behavior = "dock_gunner";
  definitions.act4_machine_loader.behavior = "machine_loader";
  definitions.act5_river_gunner.behavior = "river_gunner";

  G.enemies.definitions = clone(definitions);
  // Presentation follows the held weapon/action, not a portrait filename or
  // damage threshold. Reviewed against all 39 current ready portraits.
  var meleeMaterials = {
    boxer:'fist',boxer_leader:'fist',act2_cinder_looter:'fist',act3_green_gang:'fist',
    foreign_scout:'bayonet',
    elite_mack:'heavy',act2_rifle_cart:'heavy',act2_elite_zhuo_san:'heavy',
    act3_dock_gunner:'heavy',act3_elite_barlow:'heavy',act3_boss_chief_inspector:'heavy',
    act4_rail_guard:'heavy',act4_quick_officer:'heavy',act4_machine_loader:'heavy',
    act4_elite_qin_biao:'heavy',act4_boss_warlord:'heavy',act5_tax_militia:'heavy',
    act5_river_gunner:'heavy',act5_elite_meng_kui:'heavy'
  };
  G.enemies.getAttackMaterial = function (enemy) {
    var data=enemy?.intentData||{},id=enemy?.templateId||enemy?.sourceTemplateId;
    if(data.firearm)return 'firearm';
    if(data.attackMaterial)return data.attackMaterial;
    if(/刺刀|枪刺|刺枪/.test(enemy?.intentLabel||''))return 'bayonet';
    var stage=enemy?.firearmStage;
    if(enemy?.kind==='nemesis'&&stage&&!['none','blade'].includes(stage))return 'heavy';
    var material=meleeMaterials[id]||(['boxer','boxer_leader'].includes(enemy?.behavior)?'fist':'blade');
    return material==='fist'&&(data.damage||0)>=13?'heavy':material;
  };
  G.enemies.encounters = clone(encounterDefinitions);
  G.enemies.actCatalog = clone(actCatalog);
  G.enemies.getActCount = getActCount;
  G.enemies.getActNumber = getActNumber;
  G.enemies.getActMeta = function (actNumber) {
    return clone(getActMeta(actNumber));
  };
  G.enemies.createEnemy = createEnemy;
  G.enemies.buildEncounter = buildEncounter;
  G.enemies.buildEncounterForNode = buildEncounterForNode;
})();
