window.G = window.G || {};
G.runReport = G.runReport || {};

(function () {
  var STYLE_LABELS = {
    blade: "吹命刀",
    iron: "外家横练",
    dirty: "下三滥",
    combo: "贴身短打"
  };
  var NODE_LABELS = {
    street: "喋血街头",
    elite: "强敌截杀",
    gate: "关卡死斗",
    nemesis: "宿敌复仇"
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getStyleName(styleId) {
    return STYLE_LABELS[styleId] || styleId || "未定流派";
  }

  function getActLabel(state) {
    var actNumber = 1;
    var actTitle = null;

    if (state && state.map && typeof state.map.actNumber === "number") {
      actNumber = state.map.actNumber;
      actTitle = state.map.actTitle || null;
    } else if (state && state.combat && typeof state.combat.actNumber === "number") {
      actNumber = state.combat.actNumber;
      actTitle = state.combat.actTitle || null;
    }

    return actTitle || ("卷" + actNumber);
  }

  function getEncounterLabel(state) {
    if (state && state.combat && state.combat.encounterName) {
      return state.combat.encounterName;
    }

    return getActLabel(state);
  }

  function getNodeLabel(state) {
    var nodeType = state && state.combat ? state.combat.nodeType : null;

    return NODE_LABELS[nodeType] || "乱局收口";
  }

  function getRelicNames(player) {
    var relicIds = player && Array.isArray(player.relics) ? player.relics : [];

    return relicIds.map(function (relicId) {
      var relic = G.relics && typeof G.relics.getRelicById === "function" ?
        G.relics.getRelicById(relicId) :
        null;

      return relic && relic.name ? relic.name : relicId;
    });
  }

  function buildSummaryRows(state, outcome) {
    var player = state && state.player ? state.player : {};
    var map = state && state.map ? state.map : {};
    var nemesisPool = state && state.nemesis && Array.isArray(state.nemesis.pool) ? state.nemesis.pool : [];
    var clearedActs = Array.isArray(map.clearedActs) ? map.clearedActs.length : 0;
    var visitedNodes = Array.isArray(map.routeHistory) ? map.routeHistory.length : (Array.isArray(map.visitedNodeIds) ? map.visitedNodeIds.length : 0);

    return [
      {
        label: "杀法",
        value: getStyleName(player.chosenStyle)
      },
      {
        label: outcome === "victory" ? "结局" : "止步",
        value: outcome === "victory" ? "五卷打通" : (getActLabel(state) + " / " + getEncounterLabel(state))
      },
      {
        label: "气血",
        value: String(player.hp || 0) + " / " + String(player.maxHp || 0)
      },
      {
        label: "大洋",
        value: String(player.gold || 0)
      },
      {
        label: "牌组",
        value: String(player.deckSize || 0) + " 张"
      },
      {
        label: "旧物",
        value: String(Array.isArray(player.relics) ? player.relics.length : 0) + " 件"
      },
      {
        label: "卷次",
        value: String(clearedActs) + " / 5"
      },
      {
        label: "脚印",
        value: String(visitedNodes) + " 个路线节点"
      }
    ];
  }

  function buildDetailLines(state, outcome) {
    var details = [];
    var player = state && state.player ? state.player : {};
    var combat = state && state.combat ? state.combat : {};
    var map = state && state.map ? state.map : {};
    var nemesisPool = state && state.nemesis && Array.isArray(state.nemesis.pool) ? state.nemesis.pool : [];
    var visitedNodes = Array.isArray(map.routeHistory) ? map.routeHistory.length : (Array.isArray(map.visitedNodeIds) ? map.visitedNodeIds.length : 0);
    var relicNames = getRelicNames(player);
    var aliveEnemies = Array.isArray(combat.enemies) ?
      combat.enemies.filter(function (enemy) {
        return enemy.hp > 0;
      }).map(function (enemy) {
        return enemy.name;
      }) :
      [];

    if (outcome === "victory") {
      details.push(G.journeyNarrative ? G.journeyNarrative.outcome(state, true) : "五卷关卡已经全部压过去，这一局暂时算是杀出九城。");
      if (G.eventConsequences) details.push.apply(details, G.eventConsequences.epilogue(state));
      details.push("最后一战：" + getEncounterLabel(state) + " / " + getActLabel(state));
      details.push("最后留在身上的旧物：" + (relicNames.length ? relicNames.join("、") : "无"));
      if (G.journeyNarrative) details.push(G.journeyNarrative.preparation);
      details.push("本局共踏过 " + visitedNodes + " 个节点，宿敌池余下 " + nemesisPool.length + " 条，本局存档已清空。");
      return details;
    }

    details.push("败于【" + getEncounterLabel(state) + "】，负伤退出封锁线。");
    details.push(G.journeyNarrative ? G.journeyNarrative.outcome(state, false) : "行囊散失，养伤再入；旧仇仍在。");
    if (G.eventConsequences) details.push.apply(details, G.eventConsequences.epilogue(state));
    if (G.journeyNarrative) details.push(G.journeyNarrative.preparation);
    details.push("战斗回合：" + String(combat.turn || 0) + " / 最后一手：" + (combat.lastPlayedCardName || "未留下清晰招名"));
    if (combat.lastEnemyAction) details.push("最近一轮敌方行动：" + combat.lastEnemyAction);
    details.push("当场还活着的敌人：" + (aliveEnemies.length ? aliveEnemies.join("、") : "已全部倒下"));
    details.push("本局共踏过 " + visitedNodes + " 个节点，宿敌池里还压着 " + nemesisPool.length + " 条旧账，本局存档已清空。");
    return details;
  }

  function nextAttempt(state) {
    var player = state.player || {};
    var cards = (player.masterDeckNames || []).map(function (name) { return G.cards.getCardByName(name); }).filter(Boolean);
    if (player.chosenStyle === "dirty") {
      if (!cards.some(function (card) { return card.consumeFester; })) return "可补翻伤撒盐，把溃烂转为伤害。";
      return "先减伤护身，再用溃烂消耗或收招。";
    }
    if (player.chosenStyle === "blade") return "先叠破绽，再出消耗招式；舍身招会扣血。";
    if (player.chosenStyle === "iron") return "蓄架后反击；遇枪手可补迷眼或残废。";
    return "低费、抽牌起手，三张后接连环减费。";
  }

  function buildReport(state, outcome) {
    var safeOutcome = outcome === "victory" ? "victory" : "defeat";
    var chosenStyle = state && state.player ? state.player.chosenStyle : null;

    return {
      active: true,
      outcome: safeOutcome,
      styleId: chosenStyle || "blade",
      styleName: getStyleName(chosenStyle),
      title: safeOutcome === "victory" ? "终局簿" : "败局簿",
      subtitle: safeOutcome === "victory" ?
        "五道封锁已过，残卷交付，此行有了着落。" :
        "负伤撤回藏身处。任务未完，养伤后重新准备。",
      prompt: safeOutcome === "victory" ?
        (G.journeyNarrative ? G.journeyNarrative.outcome(state, true) : "一路闯过五卷关隘，旧仇仍留在江湖。") :
        "此行止步于" + getEncounterLabel(state) + "。旧仇未散，回顾这局战况，再入江湖。",
      note: safeOutcome === "victory" ?
        "此案已结；重走此案时，重新准备招式，沿用旧仇簿。" :
        "收起败局簿；养伤后重新准备，仍追查这份未送达的证据。",
      summaryRows: buildSummaryRows(state, safeOutcome),
      detailLines: buildDetailLines(state, safeOutcome),
      nextAttempt: safeOutcome === "defeat" ? nextAttempt(state) : null,
      consequenceSummary: G.eventConsequences ? G.eventConsequences.epilogue(state).slice(-1)[0] || null : null,
      buttons: [
        {
          id: "menu",
          label: "返回主菜单",
          subtitle: "收起这局账本，回入口"
        },
        {
          id: "retry",
          label: G.journeyNarrative ? (safeOutcome === "victory" ? "重走此案" : "养伤再出发") : "再入江湖",
          subtitle: "重新准备招式与行装，旧仇仍在"
        }
      ]
    };
  }

  function enter(state, outcome) {
    var sourceState = clone(state || {});
    if (G.journeyNarrative) G.journeyNarrative.finish(sourceState, outcome);
    var report = buildReport(sourceState, outcome);

    sourceState.scene = "title";
    sourceState.title = Object.assign({}, sourceState.title || {}, {
      mode: "report",
      selectedStyle: report.styleId,
      note: report.note
    });
    sourceState.runReport = report;
    return sourceState;
  }

  G.runReport = {
    build: buildReport,
    enter: enter,
    getStyleName: getStyleName
  };
})();
