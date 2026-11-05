window.G = window.G || {};
G.relics = G.relics || {};

(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nextSeed(seed) {
    return (seed * 1664525 + 1013904223) >>> 0;
  }

  // Logic-freeze baseline: keep shop relic pricing fixed here until the design doc
  // defines a formal economy pass. This is a frozen placeholder, not hidden TODO debt.
  var SHOP_RELIC_PRICE = 100;

  var definitionsById = {
    chipped_blade: {
      id: "chipped_blade",
      icon: "刃",
      name: "缺口的厚背砍刀",
      description: "每场战斗第一回合体力 +1。"
    },
    rusty_mirror: {
      id: "rusty_mirror",
      icon: "镜",
      name: "锈护心镜",
      description: "每回合开始获得 3 架势。"
    },
    blood_bandage: {
      id: "blood_bandage",
      icon: "绷",
      name: "血绷带",
      description: "每场战斗获胜后恢复 5 气血。"
    },
    doomed_watch: {
      id: "doomed_watch",
      icon: "表",
      name: "亡命怀表",
      description: "每场战斗的第 1 回合额外抽 2 张牌。"
    },
    lime_packet: {
      id: "lime_packet",
      icon: "灰",
      name: "下九流石灰包",
      description: "战斗开始时对所有敌人施加 2 层溃烂和 1 层迷眼。"
    },
    beiyang_boots: {
      id: "beiyang_boots",
      icon: "靴",
      name: "北洋军靴",
      description: "每场战斗累计第 4、8、12……张牌免体力。"
    },
    sleeve_trigger: {
      id: "sleeve_trigger",
      icon: "箭",
      name: "袖箭扳指",
      description: "每回合首次造成伤害时，额外造成 5 伤害。"
    },
    secret_manual: {
      id: "secret_manual",
      icon: "卷",
      name: "大内密卷",
      description: "选卡时额外多 1 个选项。"
    },
    iron_canteen: {
      id: "iron_canteen",
      icon: "壶",
      name: "洋人的铁皮水壶",
      description: "最大气血 +15。"
    },
    heavy_money_bag: {
      id: "heavy_money_bag",
      icon: "袋",
      name: "沉甸的大洋袋",
      description: "每场战斗后额外获得 15 大洋。"
    },
    whetstone: {
      id: "whetstone",
      icon: "石",
      name: "磨刀石",
      description: "已精进招式追加一次 3 伤害；无伤害的防御招式改为多得 3 架势。"
    },
    cheat_cuff: {
      id: "cheat_cuff",
      icon: "袖",
      name: "老千袖口",
      description: "每回合可将 1 张手牌置入弃牌堆，抽 1 张新牌。"
    },
    burning_liquor: {
      id: "burning_liquor",
      icon: "酒",
      name: "半壶烧刀子酒",
      description: "破庙苟活恢复量翻倍。"
    },
    settlement_map: {
      id: "settlement_map",
      icon: "图",
      name: "租界洋务地图",
      description: "地图上显示精英节点的具体敌人信息。"
    },
    wanted_poster: {
      id: "wanted_poster",
      icon: "缉",
      name: "染血的通缉令",
      description: "第二卷起，每卷最多 2 名宿敌设伏，受现存宿敌与可用路线限制。",
    }
  };

  function getPoolIds(ownedIds) {
    return Object.keys(definitionsById).filter(function (relicId) {
      var definition = definitionsById[relicId];
      return definition &&
        definition.implemented !== false &&
        (!ownedIds || ownedIds.indexOf(relicId) === -1);
    });
  }

  function pickUniqueIds(poolIds, count, seed) {
    var available = poolIds.slice();
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

  function getRelicById(relicId) {
    var relic = definitionsById[relicId];
    return relic ? Object.assign(clone(relic), { price: SHOP_RELIC_PRICE }) : null;
  }

  function buildShopRelicOptions(seed, ownedIds) {
    var poolIds = getPoolIds(ownedIds);
    var picked = pickUniqueIds(poolIds, 2, seed || 1900);

    return {
      options: picked.picked.map(function (relicId) {
        return getRelicById(relicId);
      }),
      nextSeed: picked.nextSeed
    };
  }

  function buildRewardRelicOptions(seed, ownedIds) {
    var poolIds = getPoolIds(ownedIds);
    var picked = pickUniqueIds(poolIds, 3, seed || 1900);

    return {
      options: picked.picked.map(function (relicId) {
        return getRelicById(relicId);
      }),
      nextSeed: picked.nextSeed
    };
  }

  G.relics.definitions = definitionsById;
  G.relics.getRelicById = getRelicById;
  G.relics.buildShopRelicOptions = buildShopRelicOptions;
  G.relics.buildRewardRelicOptions = buildRewardRelicOptions;
})();
