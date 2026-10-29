window.G = window.G || {};
G.cards = G.cards || {};

(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nextSeed(seed) {
    return (seed * 1664525 + 1013904223) >>> 0;
  }

  function fillDescription(template, values) {
    return template.replace(/\{(\w+)\}/g, function (_, key) {
      return values[key];
    });
  }

  // Logic-freeze baseline: keep shop card pricing fixed here until the design doc
  // defines a formal economy pass. This is a frozen placeholder, not hidden TODO debt.
  var SHOP_CARD_PRICE = 50;

  var definitionsById = {
    basic_strike: {
      id: "basic_strike",
      name: "劈砍",
      nameUpgraded: "劈砍+",
      style: "basic",
      cost: 1,
      upgradeRule: "damage",
      damage: 6,
      upgradedValues: { damage: 9 },
      description: "造成 {damage} 伤害。"
    },
    basic_defend: {
      id: "basic_defend",
      name: "招架",
      nameUpgraded: "招架+",
      style: "basic",
      cost: 1,
      upgradeRule: "block",
      block: 5,
      upgradedValues: { block: 8 },
      description: "获得 {block} 架势。"
    },
    iron_plow: {
      id: "iron_plow",
      name: "铁牛耕地",
      nameUpgraded: "铁牛耕地+",
      style: "iron",
      cost: 1,
      upgradeRule: "damage_block",
      damage: 6,
      block: 4,
      upgradedValues: { damage: 8, block: 6 },
      description: "造成 {damage} 伤害，获得 {block} 架势。"
    },
    iron_bar: {
      id: "iron_bar",
      name: "铁门闩",
      nameUpgraded: "铁门闩+",
      style: "iron",
      cost: 2,
      upgradeRule: "block",
      block: 15,
      bonusBlockIfBlocked: 5,
      upgradedValues: { block: 18, bonusBlockIfBlocked: 5 },
      description: "获得 {block} 架势。若出牌前已有架势，额外获得 {bonusBlockIfBlocked} 架势。"
    },
    iron_bone_break: {
      id: "iron_bone_break",
      name: "连皮带骨",
      nameUpgraded: "连皮带骨+",
      style: "iron",
      cost: 1,
      upgradeRule: "damage",
      damageFromCurrentBlock: true,
      ironBoneDamage: 4,
      upgradedValues: { ironBoneDamage: 7 },
      description: "造成等于当前架势值的伤害。若触发铁骨，额外造成 {ironBoneDamage} 伤害。"
    },
    // 【外家横练】首发牌表（15 张）
    iron_counter_slam: {
      id: "iron_counter_slam",
      name: "抱架反砸",
      nameUpgraded: "抱架反砸+",
      style: "iron",
      cost: 1,
      upgradeRule: "damage_block",
      damage: 5,
      block: 4,
      ironBoneDamage: 4,
      upgradedValues: { damage: 7, block: 6, ironBoneDamage: 4 },
      description: "造成 {damage} 伤害，获得 {block} 架势。若触发铁骨，额外造成 {ironBoneDamage} 伤害。"
    },
    iron_horse_stance: {
      id: "iron_horse_stance",
      name: "沉马硬架",
      nameUpgraded: "沉马硬架+",
      style: "iron",
      cost: 1,
      upgradeRule: "block",
      block: 8,
      ironBoneBlock: 4,
      upgradedValues: { block: 11, ironBoneBlock: 4 },
      description: "获得 {block} 架势。若触发铁骨，额外获得 {ironBoneBlock} 架势。"
    },
    iron_monument_hammer: {
      id: "iron_monument_hammer",
      name: "开碑重捶",
      nameUpgraded: "开碑重捶+",
      style: "iron",
      cost: 2,
      upgradeRule: "cost_down",
      damage: 14,
      ironBoneDamage: 6,
      upgradedValues: { cost: 1, damage: 14, ironBoneDamage: 6 },
      description: "造成 {damage} 伤害。若触发铁骨，额外造成 {ironBoneDamage} 伤害。"
    },
    iron_body_ram: {
      id: "iron_body_ram",
      name: "贴山靠",
      nameUpgraded: "贴山靠+",
      style: "iron",
      cost: 1,
      upgradeRule: "damage",
      damage: 9,
      ironBoneBlock: 3,
      upgradedValues: { damage: 12, ironBoneBlock: 3 },
      description: "造成 {damage} 伤害。若触发铁骨，额外获得 {ironBoneBlock} 架势。"
    },
    iron_bridge_guard: {
      id: "iron_bridge_guard",
      name: "盘桥护身",
      nameUpgraded: "盘桥护身+",
      style: "iron",
      cost: 1,
      upgradeRule: "block",
      block: 6,
      bonusBlockIfBlocked: 4,
      ironBoneBlock: 4,
      upgradedValues: { block: 9, bonusBlockIfBlocked: 4, ironBoneBlock: 4 },
      description: "获得 {block} 架势。若出牌前已有架势，额外获得 {bonusBlockIfBlocked} 架势。若触发铁骨，再获得 {ironBoneBlock} 架势。"
    },
    iron_skin_step: {
      id: "iron_skin_step",
      name: "铜皮震步",
      nameUpgraded: "铜皮震步+",
      style: "iron",
      cost: 1,
      upgradeRule: "damage_block",
      damage: 4,
      block: 6,
      upgradedValues: { damage: 6, block: 8 },
      description: "造成 {damage} 伤害，获得 {block} 架势。"
    },
    iron_breach_heart: {
      id: "iron_breach_heart",
      name: "闯阵顶心",
      nameUpgraded: "闯阵顶心+",
      style: "iron",
      cost: 2,
      upgradeRule: "damage_block",
      damage: 12,
      block: 6,
      ironBoneDamage: 4,
      upgradedValues: { damage: 14, block: 8, ironBoneDamage: 4 },
      description: "造成 {damage} 伤害，获得 {block} 架势。若触发铁骨，额外造成 {ironBoneDamage} 伤害。"
    },
    iron_rebound_arm: {
      id: "iron_rebound_arm",
      name: "反震臂",
      nameUpgraded: "反震臂+",
      style: "iron",
      cost: 1,
      upgradeRule: "damage_block",
      damage: 5,
      block: 5,
      ironBoneDamage: 3,
      upgradedValues: { damage: 7, block: 7, ironBoneDamage: 3 },
      description: "造成 {damage} 伤害，获得 {block} 架势。若触发铁骨，额外造成 {ironBoneDamage} 伤害。"
    },
    iron_bell_gate: {
      id: "iron_bell_gate",
      name: "金钟硬门",
      nameUpgraded: "金钟硬门+",
      style: "iron",
      cost: 2,
      upgradeRule: "block",
      block: 12,
      ironBoneBlock: 6,
      upgradedValues: { block: 15, ironBoneBlock: 6 },
      description: "获得 {block} 架势。若触发铁骨，额外获得 {ironBoneBlock} 架势。"
    },
    iron_stomp_pile: {
      id: "iron_stomp_pile",
      name: "重脚踏桩",
      nameUpgraded: "重脚踏桩+",
      style: "iron",
      cost: 0,
      upgradeRule: "damage_block",
      damage: 3,
      block: 4,
      ironBoneDamage: 3,
      upgradedValues: { damage: 5, block: 6, ironBoneDamage: 3 },
      description: "造成 {damage} 伤害，获得 {block} 架势。若触发铁骨，额外造成 {ironBoneDamage} 伤害。"
    },
    iron_crush_drop: {
      id: "iron_crush_drop",
      name: "合身压顶",
      nameUpgraded: "合身压顶+",
      style: "iron",
      cost: 2,
      upgradeRule: "damage",
      damage: 10,
      damageFromCurrentBlock: true,
      upgradedValues: { damage: 13, damageFromCurrentBlock: true },
      description: "造成 {damage} 伤害，再额外造成等于当前架势值的伤害。"
    },
    iron_open_gate: {
      id: "iron_open_gate",
      name: "硬桥开门",
      nameUpgraded: "硬桥开门+",
      style: "iron",
      cost: 1,
      upgradeRule: "damage_block",
      damage: 8,
      block: 3,
      ironBoneBlock: 3,
      upgradedValues: { damage: 10, block: 5, ironBoneBlock: 3 },
      description: "造成 {damage} 伤害，获得 {block} 架势。若触发铁骨，额外获得 {ironBoneBlock} 架势。"
    },
    dirty_hidden_blade: {
      id: "dirty_hidden_blade",
      name: "阴手捅刀",
      nameUpgraded: "阴手捅刀+",
      style: "dirty",
      cost: 1,
      upgradeRule: "status",
      damage: 4,
      fester: 3,
      upgradedValues: { damage: 4, fester: 4 },
      description: "造成 {damage} 伤害，施加 {fester} 层溃烂。"
    },
    dirty_lime_throw: {
      id: "dirty_lime_throw",
      name: "撒石灰",
      nameUpgraded: "撒石灰+",
      style: "dirty",
      cost: 1,
      upgradeRule: "status",
      blind: 2,
      // Blind strength is fixed for one enemy turn. Upgrade the action budget,
      // rather than adding a layer that cannot change its combat effect.
      upgradedValues: { cost: 0 },
      description: "施加 {blind} 层迷眼。敌人本轮攻击伤害减半。"
    },
    dirty_tendon_cut: {
      id: "dirty_tendon_cut",
      name: "断筋",
      nameUpgraded: "断筋+",
      style: "dirty",
      cost: 1,
      upgradeRule: "status",
      damage: 3,
      crippleTurns: 2,
      upgradedValues: { damage: 3, crippleTurns: 3 },
      description: "造成 {damage} 伤害，残废 {crippleTurns} 回合。"
    },
    // 【下三滥】首发牌表（15 张）
    dirty_low_kick: {
      id: "dirty_low_kick",
      name: "下盘撩踢",
      nameUpgraded: "下盘撩踢+",
      style: "dirty",
      cost: 1,
      upgradeRule: "damage",
      damage: 5,
      block: 3,
      blind: 1,
      upgradedValues: { damage: 8, block: 4, blind: 1 },
      description: "造成 {damage} 伤害，获得 {block} 架势，施加 {blind} 层迷眼。"
    },
    dirty_poison_nail: {
      id: "dirty_poison_nail",
      name: "毒钉暗甩",
      nameUpgraded: "毒钉暗甩+",
      style: "dirty",
      cost: 0,
      upgradeRule: "status",
      damage: 2,
      fester: 2,
      upgradedValues: { damage: 2, fester: 3 },
      description: "造成 {damage} 伤害，施加 {fester} 层溃烂。"
    },
    dirty_ground_lime: {
      id: "dirty_ground_lime",
      name: "贴地扬灰",
      nameUpgraded: "贴地扬灰+",
      style: "dirty",
      cost: 0,
      upgradeRule: "draw",
      blind: 1,
      draw: 1,
      upgradedValues: { blind: 1, draw: 2 },
      description: "施加 {blind} 层迷眼，抽 {draw} 张牌。"
    },
    dirty_salt_wound: {
      id: "dirty_salt_wound",
      name: "翻伤撒盐",
      nameUpgraded: "翻伤撒盐+",
      style: "dirty",
      cost: 1,
      upgradeRule: "damage",
      damage: 4,
      consumeFester: true,
      damagePerFester: 2,
      upgradedValues: { damage: 7, damagePerFester: 2 },
      description: "造成 {damage} 伤害，并消耗所有溃烂，每层额外造成 {damagePerFester} 伤害。"
    },
    dirty_sleeve_needle: {
      id: "dirty_sleeve_needle",
      name: "淬毒袖针",
      nameUpgraded: "淬毒袖针+",
      style: "dirty",
      cost: 1,
      upgradeRule: "status",
      damage: 1,
      fester: 4,
      upgradedValues: { damage: 1, fester: 5 },
      description: "造成 {damage} 伤害，施加 {fester} 层溃烂。"
    },
    dirty_trip_knee: {
      id: "dirty_trip_knee",
      name: "绊脚阴腿",
      nameUpgraded: "绊脚阴腿+",
      style: "dirty",
      cost: 1,
      upgradeRule: "damage",
      damage: 6,
      crippleTurns: 2,
      upgradedValues: { damage: 9, crippleTurns: 2 },
      description: "造成 {damage} 伤害，残废 {crippleTurns} 回合。"
    },
    dirty_alley_throat: {
      id: "dirty_alley_throat",
      name: "污巷抹喉",
      nameUpgraded: "污巷抹喉+",
      style: "dirty",
      cost: 1,
      upgradeRule: "damage",
      damage: 7,
      blind: 1,
      upgradedValues: { damage: 10, blind: 1 },
      description: "造成 {damage} 伤害，施加 {blind} 层迷眼。"
    },
    dirty_rot_follow: {
      id: "dirty_rot_follow",
      name: "烂口追打",
      nameUpgraded: "烂口追打+",
      style: "dirty",
      cost: 1,
      upgradeRule: "damage",
      damage: 6,
      bonusDamageIfTargetHasFester: 5,
      upgradedValues: { damage: 9, bonusDamageIfTargetHasFester: 5 },
      description: "造成 {damage} 伤害。若目标已陷入溃烂，额外造成 {bonusDamageIfTargetHasFester} 伤害。"
    },
    dirty_gutter_flip: {
      id: "dirty_gutter_flip",
      name: "阴沟翻身",
      nameUpgraded: "阴沟翻身+",
      style: "dirty",
      cost: 1,
      upgradeRule: "draw",
      block: 6,
      draw: 1,
      upgradedValues: { block: 6, draw: 2 },
      description: "获得 {block} 架势，抽 {draw} 张牌。"
    },
    dirty_rot_lock: {
      id: "dirty_rot_lock",
      name: "溃口封喉",
      nameUpgraded: "溃口封喉+",
      style: "dirty",
      cost: 1,
      upgradeRule: "status",
      damage: 3,
      fester: 2,
      blind: 1,
      upgradedValues: { damage: 3, fester: 3, blind: 1 },
      description: "造成 {damage} 伤害，施加 {fester} 层溃烂与 {blind} 层迷眼。"
    },
    dirty_dirty_hands: {
      id: "dirty_dirty_hands",
      name: "脏手夺势",
      nameUpgraded: "脏手夺势+",
      style: "dirty",
      cost: 1,
      upgradeRule: "damage_block",
      damage: 5,
      block: 4,
      upgradedValues: { damage: 7, block: 6 },
      description: "造成 {damage} 伤害，获得 {block} 架势。"
    },
    dirty_boot_heart: {
      id: "dirty_boot_heart",
      name: "破靴踹心",
      nameUpgraded: "破靴踹心+",
      style: "dirty",
      cost: 1,
      upgradeRule: "damage",
      damage: 10,
      upgradedValues: { damage: 13 },
      description: "造成 {damage} 伤害。"
    },
    blade_strike: {
      id: "blade_strike",
      name: "抹脖子",
      nameUpgraded: "抹脖子+",
      style: "blade",
      cost: 1,
      upgradeRule: "damage",
      damage: 9,
      flaw: 3,
      upgradedValues: { damage: 12, flaw: 3 },
      description: "造成 {damage} 伤害，施加 {flaw} 层破绽。"
    },
    blade_sacrifice: {
      id: "blade_sacrifice",
      name: "舍身一刀",
      nameUpgraded: "舍身一刀+",
      style: "blade",
      cost: 0,
      upgradeRule: "self_damage_down",
      consumeFlaw: true,
      damagePerFlaw: 3,
      selfDamage: 1,
      upgradedValues: { damagePerFlaw: 3, selfDamage: 0 },
      description: "消耗所有破绽，每层造成 {damagePerFlaw} 伤害，自己固定扣除 {selfDamage} 气血。"
    },
    blade_gut: {
      id: "blade_gut",
      name: "开膛",
      nameUpgraded: "开膛+",
      style: "blade",
      cost: 2,
      upgradeRule: "cost_down",
      damage: 16,
      executeThreshold: 0.35,
      executeDamage: 32,
      upgradedValues: { cost: 1, damage: 16, executeThreshold: 0.35, executeDamage: 32 },
      description: "造成 {damage} 伤害，若目标气血低于 35%，则改为 {executeDamage} 伤害。"
    },
    // 【吹命刀】首发牌表（15 张）
    blade_quick_cut: {
      id: "blade_quick_cut",
      name: "贴步割喉",
      nameUpgraded: "贴步割喉+",
      style: "blade",
      cost: 0,
      upgradeRule: "damage",
      damage: 5,
      flaw: 1,
      upgradedValues: { damage: 8, flaw: 1 },
      description: "造成 {damage} 伤害，施加 {flaw} 层破绽。"
    },
    blade_hidden_edge: {
      id: "blade_hidden_edge",
      name: "回身藏锋",
      nameUpgraded: "回身藏锋+",
      style: "blade",
      cost: 1,
      upgradeRule: "draw",
      block: 7,
      draw: 1,
      upgradedValues: { block: 7, draw: 2 },
      description: "获得 {block} 架势，抽 {draw} 张牌。"
    },
    blade_double_edge: {
      id: "blade_double_edge",
      name: "连环抹线",
      nameUpgraded: "连环抹线+",
      style: "blade",
      cost: 1,
      upgradeRule: "multi_hit",
      damage: 3,
      hits: 3,
      flaw: 1,
      draw: 1,
      upgradedValues: { damage: 3, hits: 4, flaw: 1 },
      description: "攻击 {hits} 次，每次造成 {damage} 伤害。随后施加 {flaw} 层破绽，抽 {draw} 张牌。"
    },
    blade_break_wrist: {
      id: "blade_break_wrist",
      name: "逼门断腕",
      nameUpgraded: "逼门断腕+",
      style: "blade",
      cost: 1,
      upgradeRule: "damage",
      damage: 8,
      flaw: 2,
      crippleTurns: 1,
      upgradedValues: { damage: 11, flaw: 2 },
      description: "造成 {damage} 伤害，施加 {flaw} 层破绽，残废 {crippleTurns} 回合。"
    },
    blade_turn_blade: {
      id: "blade_turn_blade",
      name: "翻刃开血",
      nameUpgraded: "翻刃开血+",
      style: "blade",
      cost: 1,
      upgradeRule: "damage",
      damage: 6,
      consumeFlaw: true,
      damagePerFlaw: 3,
      upgradedValues: { damage: 9, damagePerFlaw: 3 },
      description: "造成 {damage} 伤害，并消耗所有破绽，每层额外造成 {damagePerFlaw} 伤害。"
    },
    blade_chase_life: {
      id: "blade_chase_life",
      name: "追命赶刀",
      nameUpgraded: "追命赶刀+",
      style: "blade",
      cost: 1,
      upgradeRule: "draw",
      damage: 6,
      flaw: 1,
      draw: 1,
      upgradedValues: { damage: 6, flaw: 1, draw: 2 },
      description: "造成 {damage} 伤害，施加 {flaw} 层破绽，抽 {draw} 张牌。"
    },
    blade_life_trade: {
      id: "blade_life_trade",
      name: "换命扑斩",
      nameUpgraded: "换命扑斩+",
      style: "blade",
      cost: 2,
      upgradeRule: "self_damage_down",
      damage: 20,
      selfDamage: 1,
      upgradedValues: { damage: 20, selfDamage: 0 },
      description: "造成 {damage} 伤害，自己固定扣除 {selfDamage} 气血。"
    },
    blade_step_past: {
      id: "blade_step_past",
      name: "踩肩越刀",
      nameUpgraded: "踩肩越刀+",
      style: "blade",
      cost: 1,
      upgradeRule: "damage_block",
      damage: 6,
      block: 6,
      upgradedValues: { damage: 8, block: 8 },
      description: "造成 {damage} 伤害，获得 {block} 架势。"
    },
    blade_heart_hook: {
      id: "blade_heart_hook",
      name: "勾心挑肠",
      nameUpgraded: "勾心挑肠+",
      style: "blade",
      cost: 2,
      upgradeRule: "cost_down",
      damage: 14,
      executeThreshold: 0.4,
      executeDamage: 28,
      upgradedValues: { cost: 1, damage: 14, executeThreshold: 0.4, executeDamage: 28 },
      description: "造成 {damage} 伤害，若目标气血低于 40%，则改为 {executeDamage} 伤害。"
    },
    blade_low_bow: {
      id: "blade_low_bow",
      name: "低头让锋",
      nameUpgraded: "低头让锋+",
      style: "blade",
      cost: 0,
      upgradeRule: "block",
      block: 6,
      flaw: 2,
      upgradedValues: { block: 9, flaw: 2 },
      description: "获得 {block} 架势，施加 {flaw} 层破绽。"
    },
    blade_throat_seal: {
      id: "blade_throat_seal",
      name: "封喉绝手",
      nameUpgraded: "封喉绝手+",
      style: "blade",
      cost: 1,
      upgradeRule: "self_damage_down",
      damage: 4,
      consumeFlaw: true,
      damagePerFlaw: 4,
      selfDamage: 1,
      upgradedValues: { damage: 4, damagePerFlaw: 4, selfDamage: 0 },
      description: "造成 {damage} 伤害，再消耗所有破绽，每层额外造成 {damagePerFlaw} 伤害，自己固定扣除 {selfDamage} 气血。"
    },
    blade_rain_cut: {
      id: "blade_rain_cut",
      name: "疾雨连刀",
      nameUpgraded: "疾雨连刀+",
      style: "blade",
      cost: 1,
      upgradeRule: "multi_hit",
      damage: 3,
      hits: 4,
      flaw: 1,
      upgradedValues: { damage: 3, hits: 5, flaw: 1 },
      description: "攻击 {hits} 次，每次造成 {damage} 伤害。随后施加 {flaw} 层破绽。"
    },
    combo_dash: {
      id: "combo_dash",
      name: "闪身刺",
      nameUpgraded: "闪身刺+",
      style: "combo",
      attackMaterial: "blade",
      cost: 1,
      comboTag: true,
      upgradeRule: "draw",
      damage: 3,
      draw: 1,
      upgradedValues: { damage: 3, draw: 2 },
      description: "造成 {damage} 伤害，抽 {draw} 张牌。"
    },
    combo_bone_hand: {
      id: "combo_bone_hand",
      name: "卸骨手",
      nameUpgraded: "卸骨手+",
      style: "combo",
      cost: 0,
      comboTag: true,
      upgradeRule: "draw",
      block: 3,
      draw: 1,
      upgradedValues: { block: 3, draw: 2 },
      description: "获得 {block} 架势，抽 {draw} 张牌。"
    },
    combo_chain_punch: {
      id: "combo_chain_punch",
      name: "寸拳连珠",
      nameUpgraded: "寸拳连珠+",
      style: "combo",
      cost: 1,
      comboTag: true,
      upgradeRule: "multi_hit",
      damage: 2,
      hits: 4,
      upgradedValues: { damage: 2, hits: 5 },
      description: "攻击 {hits} 次，每次造成 {damage} 伤害。"
    },
    // 【贴身短打】首发牌表（15 张）
    combo_close_step: {
      id: "combo_close_step",
      name: "贴身递步",
      nameUpgraded: "贴身递步+",
      style: "combo",
      cost: 1,
      comboTag: true,
      upgradeRule: "draw",
      block: 2,
      draw: 2,
      upgradedValues: { block: 2, draw: 3 },
      description: "获得 {block} 架势，抽 {draw} 张牌。"
    },
    combo_elbow_rush: {
      id: "combo_elbow_rush",
      name: "滚肘抢门",
      nameUpgraded: "滚肘抢门+",
      style: "combo",
      cost: 1,
      comboTag: true,
      upgradeRule: "damage_block",
      damage: 5,
      block: 3,
      upgradedValues: { damage: 7, block: 5 },
      description: "造成 {damage} 伤害，获得 {block} 架势。"
    },
    combo_bridge_pop: {
      id: "combo_bridge_pop",
      name: "寸桥崩手",
      nameUpgraded: "寸桥崩手+",
      style: "combo",
      cost: 1,
      comboTag: true,
      upgradeRule: "damage",
      damage: 6,
      upgradedValues: { damage: 9 },
      description: "造成 {damage} 伤害。"
    },
    combo_stick_hand: {
      id: "combo_stick_hand",
      name: "黏衣拿手",
      nameUpgraded: "黏衣拿手+",
      style: "combo",
      cost: 1,
      comboTag: true,
      upgradeRule: "draw",
      block: 4,
      draw: 1,
      upgradedValues: { block: 4, draw: 2 },
      description: "获得 {block} 架势，抽 {draw} 张牌。"
    },
    combo_body_chain: {
      id: "combo_body_chain",
      name: "连身靠打",
      nameUpgraded: "连身靠打+",
      style: "combo",
      cost: 1,
      comboTag: true,
      upgradeRule: "multi_hit",
      damage: 3,
      hits: 3,
      upgradedValues: { damage: 3, hits: 4 },
      description: "攻击 {hits} 次，每次造成 {damage} 伤害。"
    },
    combo_follow_knee: {
      id: "combo_follow_knee",
      name: "追膝快打",
      nameUpgraded: "追膝快打+",
      style: "combo",
      cost: 1,
      comboTag: true,
      upgradeRule: "damage",
      damage: 4,
      draw: 1,
      upgradedValues: { damage: 7, draw: 1 },
      description: "造成 {damage} 伤害，抽 {draw} 张牌。"
    },
    combo_split_bone: {
      id: "combo_split_bone",
      name: "卸肩拆骨",
      nameUpgraded: "卸肩拆骨+",
      style: "combo",
      cost: 1,
      upgradeRule: "damage",
      damage: 9,
      upgradedValues: { damage: 11 },
      description: "造成 {damage} 伤害。"
    },
    combo_short_guard: {
      id: "combo_short_guard",
      name: "短桥护心",
      nameUpgraded: "短桥护心+",
      style: "combo",
      cost: 1,
      upgradeRule: "block",
      block: 7,
      upgradedValues: { block: 10 },
      description: "获得 {block} 架势。"
    },
    combo_gate_crash: {
      id: "combo_gate_crash",
      name: "迎门顶撞",
      nameUpgraded: "迎门顶撞+",
      style: "combo",
      cost: 2,
      upgradeRule: "cost_down",
      damage: 12,
      upgradedValues: { cost: 1, damage: 12 },
      description: "造成 {damage} 伤害。"
    },
    combo_side_step: {
      id: "combo_side_step",
      name: "横身夺路",
      nameUpgraded: "横身夺路+",
      style: "combo",
      cost: 1,
      upgradeRule: "damage_block",
      damage: 4,
      block: 5,
      upgradedValues: { damage: 6, block: 7 },
      description: "造成 {damage} 伤害，获得 {block} 架势。"
    },
    combo_wrap_arm: {
      id: "combo_wrap_arm",
      name: "缠臂拿腕",
      nameUpgraded: "缠臂拿腕+",
      style: "combo",
      cost: 1,
      upgradeRule: "block",
      block: 6,
      draw: 1,
      upgradedValues: { block: 9, draw: 1 },
      description: "获得 {block} 架势，抽 {draw} 张牌。"
    },
    combo_ground_burst: {
      id: "combo_ground_burst",
      name: "贴地寸崩",
      nameUpgraded: "贴地寸崩+",
      style: "combo",
      cost: 2,
      upgradeRule: "cost_down",
      damage: 10,
      draw: 1,
      upgradedValues: { cost: 1, damage: 10, draw: 1 },
      description: "造成 {damage} 伤害，抽 {draw} 张牌。"
    }
  };

  var definitionsByName = {};
  var definitionsByUpgradedName = {};
  Object.keys(definitionsById).forEach(function (cardId) {
    var definition = definitionsById[cardId];
    definitionsByName[definition.name] = definition;
    definitionsByUpgradedName[definition.nameUpgraded] = definition;
  });
  // Preserve saves and records from .23; the card ID and four/five hits stay intact.
  definitionsByName["疾雨三刀"] = definitionsById.blade_rain_cut;
  definitionsByUpgradedName["疾雨三刀+"] = definitionsById.blade_rain_cut;

  var starterDecks = {
    blade: [
      "劈砍",
      "抹脖子",
      "招架",
      "抹脖子",
      "舍身一刀",
      "劈砍",
      "踩肩越刀",
      "劈砍",
      "招架",
      "回身藏锋",
      "抹脖子",
      "招架"
    ],
    iron: [
      "铁牛耕地",
      "铁牛耕地",
      "铁牛耕地",
      "沉马硬架",
      "沉马硬架",
      "抱架反砸",
      "抱架反砸",
      "连皮带骨",
      "连皮带骨",
      "铁门闩",
      "盘桥护身",
      "贴山靠"
    ],
    dirty: [
      "阴手捅刀",
      "阴手捅刀",
      "阴手捅刀",
      "撒石灰",
      "撒石灰",
      "断筋",
      "断筋",
      "毒钉暗甩",
      "毒钉暗甩",
      "贴地扬灰",
      "绊脚阴腿",
      "烂口追打"
    ],
    combo: [
      "闪身刺",
      "闪身刺",
      "闪身刺",
      "卸骨手",
      "卸骨手",
      "卸骨手",
      "寸拳连珠",
      "寸拳连珠",
      "贴身递步",
      "贴身递步",
      "滚肘抢门",
      "黏衣拿手"
    ]
  };

  var rewardPoolNames = [
    "铁牛耕地",
    "铁门闩",
    "连皮带骨",
    "抱架反砸",
    "沉马硬架",
    "开碑重捶",
    "贴山靠",
    "盘桥护身",
    "铜皮震步",
    "闯阵顶心",
    "反震臂",
    "金钟硬门",
    "重脚踏桩",
    "合身压顶",
    "硬桥开门",
    "阴手捅刀",
    "撒石灰",
    "断筋",
    "下盘撩踢",
    "毒钉暗甩",
    "贴地扬灰",
    "翻伤撒盐",
    "淬毒袖针",
    "绊脚阴腿",
    "污巷抹喉",
    "烂口追打",
    "阴沟翻身",
    "溃口封喉",
    "脏手夺势",
    "破靴踹心",
    "抹脖子",
    "舍身一刀",
    "开膛",
    "贴步割喉",
    "回身藏锋",
    "连环抹线",
    "逼门断腕",
    "翻刃开血",
    "追命赶刀",
    "换命扑斩",
    "踩肩越刀",
    "勾心挑肠",
    "低头让锋",
    "封喉绝手",
    "疾雨连刀",
    "闪身刺",
    "卸骨手",
    "寸拳连珠",
    "贴身递步",
    "滚肘抢门",
    "寸桥崩手",
    "黏衣拿手",
    "连身靠打",
    "追膝快打",
    "卸肩拆骨",
    "短桥护心",
    "迎门顶撞",
    "横身夺路",
    "缠臂拿腕",
    "贴地寸崩"
  ];

  var shopPoolNames = [
    "劈砍",
    "招架",
    "铁牛耕地",
    "铁门闩",
    "连皮带骨",
    "抱架反砸",
    "沉马硬架",
    "开碑重捶",
    "贴山靠",
    "盘桥护身",
    "铜皮震步",
    "闯阵顶心",
    "反震臂",
    "金钟硬门",
    "重脚踏桩",
    "合身压顶",
    "硬桥开门",
    "阴手捅刀",
    "撒石灰",
    "断筋",
    "下盘撩踢",
    "毒钉暗甩",
    "贴地扬灰",
    "翻伤撒盐",
    "淬毒袖针",
    "绊脚阴腿",
    "污巷抹喉",
    "烂口追打",
    "阴沟翻身",
    "溃口封喉",
    "脏手夺势",
    "破靴踹心",
    "抹脖子",
    "舍身一刀",
    "开膛",
    "贴步割喉",
    "回身藏锋",
    "连环抹线",
    "逼门断腕",
    "翻刃开血",
    "追命赶刀",
    "换命扑斩",
    "踩肩越刀",
    "勾心挑肠",
    "低头让锋",
    "封喉绝手",
    "疾雨连刀",
    "闪身刺",
    "卸骨手",
    "寸拳连珠",
    "贴身递步",
    "滚肘抢门",
    "寸桥崩手",
    "黏衣拿手",
    "连身靠打",
    "追膝快打",
    "卸肩拆骨",
    "短桥护心",
    "迎门顶撞",
    "横身夺路",
    "缠臂拿腕",
    "贴地寸崩"
  ];

  function resolveName(cardName) {
    if (definitionsByName[cardName]) {
      return {
        definition: definitionsByName[cardName],
        upgraded: false
      };
    }

    if (definitionsByUpgradedName[cardName]) {
      return {
        definition: definitionsByUpgradedName[cardName],
        upgraded: true
      };
    }

    return null;
  }

  function buildRuntimeCard(definition, upgraded) {
    var card = clone(definition);

    if (upgraded) {
      card = Object.assign(card, clone(definition.upgradedValues || {}));
      card.name = definition.nameUpgraded;
      card.upgraded = true;
    } else {
      card.upgraded = false;
    }

    card.baseName = definition.name;
    card.text = fillDescription(card.description, card);
    return card;
  }

  function getCardByName(cardName) {
    var resolved = resolveName(cardName);
    return resolved ? buildRuntimeCard(resolved.definition, resolved.upgraded) : null;
  }

  function buildLibraryFromDeck(deckNames) {
    var library = {};

    deckNames.forEach(function (cardName) {
      if (!library[cardName]) {
        library[cardName] = getCardByName(cardName);
        // Historical deck labels remain playable after the display-name correction.
        if (library[cardName]) library[library[cardName].name] = library[cardName];
      }
    });
    return library;
  }

  function getStarterDeck(style) {
    return clone(starterDecks[style] || []);
  }

  function pickUniqueNames(poolNames, count, seed) {
    var available = poolNames.slice();
    var picked = [];
    var currentSeed = seed || 1900;
    var index = 0;

    while (picked.length < count && available.length > 0) {
      index = currentSeed % available.length;
      picked.push(available.splice(index, 1)[0]);
      currentSeed = nextSeed(currentSeed);
    }

    return {
      picked: picked,
      nextSeed: currentSeed
    };
  }

  function buildRewardOptions(style, seed, optionCount) {
    var currentSeed = seed || 1900;
    var targetCount = Math.max(3, Math.min(4, Number(optionCount) || 3));
    var picked = [];
    var stylePool = rewardPoolNames.filter(function (cardName) {
      return definitionsByName[cardName].style === style;
    });
    var offStylePool = rewardPoolNames.filter(function (cardName) {
      return definitionsByName[cardName].style !== style;
    });
    var sameStyleTarget = 0;
    var includeOffStyle = false;
    var guaranteed = null;
    var varied = null;
    var filler = null;

    // Preserve cross-style drafting, but make the chosen style the clear default.
    includeOffStyle = offStylePool.length > 0 && (currentSeed % 100) < 35;
    sameStyleTarget = includeOffStyle ? Math.max(1, targetCount - 1) : targetCount;

    if (stylePool.length > 0) {
      guaranteed = pickUniqueNames(stylePool, sameStyleTarget, currentSeed);
      picked = guaranteed.picked;
      currentSeed = guaranteed.nextSeed;
    }

    if (includeOffStyle) {
      varied = pickUniqueNames(
        offStylePool.filter(function (cardName) {
          return picked.indexOf(cardName) === -1;
        }),
        1,
        currentSeed
      );
      picked = picked.concat(varied.picked);
      currentSeed = varied.nextSeed;
    }

    filler = pickUniqueNames(
      rewardPoolNames.filter(function (cardName) {
        return picked.indexOf(cardName) === -1;
      }),
      targetCount - picked.length,
      currentSeed
    );

    picked = picked.concat(filler.picked);
    currentSeed = filler.nextSeed;

    return {
      options: picked.map(function (cardName) {
        return getCardByName(cardName);
      }),
      nextSeed: currentSeed
    };
  }

  function buildShopCardOptions(style, seed) {
    var currentSeed = seed || 1900;
    var picked = [];
    var stylePool = shopPoolNames.filter(function (cardName) {
      return definitionsByName[cardName].style === style;
    });
    var guaranteed = null;
    var filler = null;

    if (stylePool.length > 0) {
      guaranteed = pickUniqueNames(stylePool, 1, currentSeed);
      picked = guaranteed.picked;
      currentSeed = guaranteed.nextSeed;
    }

    filler = pickUniqueNames(
      shopPoolNames.filter(function (cardName) {
        return picked.indexOf(cardName) === -1;
      }),
      5 - picked.length,
      currentSeed
    );

    picked = picked.concat(filler.picked);
    currentSeed = filler.nextSeed;

    return {
      options: picked.map(function (cardName) {
        var card = getCardByName(cardName);
        card.price = SHOP_CARD_PRICE;
        card.deckName = cardName;
        return card;
      }),
      nextSeed: currentSeed
    };
  }

  function isUpgraded(cardName) {
    return !!definitionsByUpgradedName[cardName];
  }

  function canUpgrade(cardName) {
    return !!definitionsByName[cardName];
  }

  function upgradeCardName(cardName) {
    var definition = definitionsByName[cardName];
    return definition ? definition.nameUpgraded : cardName;
  }

  function buildDeckEntries(deckNames) {
    return (deckNames || []).map(function (cardName, index) {
      var card = getCardByName(cardName);
      return Object.assign({
        index: index,
        deckName: cardName,
        canUpgrade: canUpgrade(cardName)
      }, card || {
        name: cardName,
        text: "未知卡牌",
        cost: 0
      });
    });
  }

  function upgradeDeckCardAt(deckNames, index) {
    var nextDeck = clone(deckNames || []);
    var originalName = nextDeck[index];
    var upgradedName = upgradeCardName(originalName);

    if (typeof originalName !== "string" || upgradedName === originalName) {
      return {
        deckNames: nextDeck,
        upgradedName: originalName,
        changed: false
      };
    }

    nextDeck[index] = upgradedName;
    return {
      deckNames: nextDeck,
      upgradedName: upgradedName,
      changed: true
    };
  }

  function removeDeckCardAt(deckNames, index) {
    var nextDeck = clone(deckNames || []);
    var removedName = nextDeck.splice(index, 1)[0];

    return {
      deckNames: nextDeck,
      removedName: removedName,
      changed: typeof removedName === "string"
    };
  }

  G.cards.definitions = definitionsById;
  // Presentation material follows the technique, independently of its school.
  // Shared by contact sound and VFX; never used to calculate damage or draws.
  G.cards.getAttackMaterial = function (state, template) {
    var card=template||{},style=card.style==='basic'?state.player.chosenStyle:card.style||state.player.chosenStyle;
    if (card.attackMaterial) return card.attackMaterial;
    if (style!=='dirty') return style==='blade'?'blade':style==='iron'?'heavy':'fist';
    var name=(card.name||'').replace(/\+$/,'');
    if (/^(撒石灰|贴地扬灰|翻伤撒盐)$/.test(name)) return 'powder';
    if (/^(毒钉暗甩|淬毒袖针)$/.test(name)) return 'needle';
    if (/^(阴手捅刀|断筋|污巷抹喉)$/.test(name)) return 'blade';
    return name==='破靴踹心'?'heavy':'fist';
  };
  G.cards.getCardByName = getCardByName;
  G.cards.buildLibraryFromDeck = buildLibraryFromDeck;
  G.cards.getStarterDeck = getStarterDeck;
  G.cards.buildRewardOptions = buildRewardOptions;
  G.cards.buildShopCardOptions = buildShopCardOptions;
  G.cards.isUpgraded = isUpgraded;
  G.cards.buildDeckEntries = buildDeckEntries;
  G.cards.upgradeDeckCardAt = upgradeDeckCardAt;
  G.cards.removeDeckCardAt = removeDeckCardAt;
})();
