window.G = window.G || {};
G.nemesis = G.nemesis || {};

(function () {
  var TRACKED_STYLES = ["blade", "iron", "dirty", "combo"];
  var MAX_POOL_SIZE = 5;
  var ADAPTATION_BY_STYLE = {
    blade: "bulletproof_vest",
    iron: "anti_block_tactics",
    dirty: "gas_mask",
    combo: "chain_armor"
  };
  var ADAPTATION_META = {
    bulletproof_vest: {
      name: "防弹胸甲",
      description: "受到的破绽层数叠加量 -50%（向下取整，最低 1）"
    },
    anti_block_tactics: {
      name: "破架战术",
      description: "无火器时普通攻击无视 50% 架势；持火器后枪击无视 100% 架势"
    },
    gas_mask: {
      name: "浸药面罩",
      description: "受到的溃烂层数 -50%（向下取整，最低 1）"
    },
    chain_armor: {
      name: "铁索甲",
      description: "回合开始自动获得 5 + 宿敌阶数×2 架势"
    }
  };
  var FIREARM_STAGE_LABELS = {
    none: "旧兵刃迎战",
    revolver: "左轮手枪",
    carbine: "短管卡宾枪",
    rifle: "栓动步枪"
  };
  var FIREARM_DIALOGUE_META = {
    none: {
      weaponName: "旧兵刃",
      eraLine: "这次仍用旧兵刃，靠记住你的路数来追你；新的军械还在筹措。"
    },
    revolver: {
      weaponName: "左轮",
      eraLine: "他已经学会左轮那一套：退步拉距、扳锤举枪，只等枪声压过刀声。"
    },
    carbine: {
      weaponName: "卡宾枪",
      eraLine: "他换了短管卡宾枪：推弹、举枪、击发，近身的空隙越来越短。"
    },
    rifle: {
      weaponName: "步枪",
      eraLine: "他借来军中的栓动步枪：推栓上膛、抵肩瞄准，只等你露出破绽。"
    }
  };
  var STYLE_LABELS = {
    blade: "破绽流",
    iron: "架势流",
    dirty: "溃烂流",
    combo: "连环流"
  };
  var DIALOGUE_STATE_META = {
    narrow_escape: {
      label: "惨胜旧恨",
      accent: "#a63f42"
    },
    standard_defeat: {
      label: "失手复命",
      accent: "#b7824d"
    },
    era_despair: {
      label: "时代绝望",
      accent: "#7f95ad"
    }
  };
  var LEVEL_PROFILES = {
    1: {
      title: "大内弃子",
      hpMultiplier: 1,
      attackMultiplier: 1,
      firearmStage: "none"
    },
    2: {
      title: "持械亡命",
      hpMultiplier: 1.2,
      attackMultiplier: 1.1,
      firearmStage: "none"
    },
    3: {
      title: "洋枪叛徒",
      hpMultiplier: 1.5,
      attackMultiplier: 1.2,
      firearmStage: "revolver"
    },
    4: {
      title: "半洋半匪",
      hpMultiplier: 1.8,
      attackMultiplier: 1.3,
      firearmStage: "carbine"
    },
    5: {
      title: "持枪追猎者",
      hpMultiplier: 2.2,
      attackMultiplier: 1.5,
      firearmStage: "rifle"
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureState(state) {
    var nextState = clone(state || {});

    nextState.nemesis = Object.assign({
      pool: [],
      nextId: 1,
      currentRunEntryIds: []
    }, nextState.nemesis || {});
    nextState.nemesis.pool = Array.isArray(nextState.nemesis.pool) ?
      nextState.nemesis.pool.map(function (entry) {
        var saved = Object.assign({
          history: [],
          currentAdaptation: null,
          firearmStage: "none",
          firearmStep: 0,
          dialogueState: "standard_defeat",
          sourceEncounterId: null,
          sourceTemplateId: null
        }, entry);
        // Cosmetic aliases keep older playable saves within the chosen era.
        // Identity, statistics and recorded battles remain unchanged.
        if (typeof saved.name === "string") saved.name = saved.name.replace("铁路线督军", "铁路线统领").replace("督军府亲兵", "统领营亲兵");
        return saved;
      }) :
      [];
    nextState.nemesis.nextId = Math.max(1, Number(nextState.nemesis.nextId) || 1);
    nextState.nemesis.closedCases = Array.isArray(nextState.nemesis.closedCases) ? nextState.nemesis.closedCases : [];
    nextState.nemesis.currentRunEntryIds = Array.isArray(nextState.nemesis.currentRunEntryIds) ?
      nextState.nemesis.currentRunEntryIds.filter(Boolean) :
      [];
    nextState.combat = Object.assign({}, nextState.combat || {});
    nextState.combat.nemesisRecorded = !!nextState.combat.nemesisRecorded;
    return nextState;
  }

  function getLevelProfile(level) {
    var normalizedLevel = Math.max(1, Math.min(5, Number(level) || 1));
    return LEVEL_PROFILES[normalizedLevel];
  }

  function getScaledHP(baseHP, level) {
    var profile = getLevelProfile(level);
    return Math.round((Math.max(0, Number(baseHP) || 0)) * profile.hpMultiplier);
  }

  function getScaledAttack(baseAttack, level) {
    var profile = getLevelProfile(level);
    return Math.round((Math.max(0, Number(baseAttack) || 0)) * profile.attackMultiplier);
  }

  function getFirearmDamage(level) {
    var resolvedLevel = Math.max(1, Math.min(5, Number(level) || 1));
    return 12 + resolvedLevel * 3;
  }

  function getChainArmorBlock(level) {
    var resolvedLevel = Math.max(1, Math.min(5, Number(level) || 1));
    return 5 + resolvedLevel * 2;
  }

  function applyLevelProfile(nemesisEntry) {
    var profile = getLevelProfile(nemesisEntry.level);

    nemesisEntry.title = getIdentityTitle(nemesisEntry);
    nemesisEntry.firearmStage = profile.firearmStage;
    nemesisEntry.firearmStep = 0;
    return nemesisEntry;
  }

  function getIdentityTitle(entry) {
    var level = Math.max(1, Math.min(5, Number(entry.level) || 1));
    var source = entry.sourceTemplateId || "";
    if (source === "boss_guard_chief" || source.indexOf("act2_") === 0) return getLevelProfile(level).title;
    return ["负伤追客", "改招旧敌", "枪行复仇客", "短枪追猎者", "步枪追猎者"][level - 1];
  }

  function buildNemesisId(nextId) {
    return "nemesis_" + nextId;
  }

  function getOutcomeTier(playerHPPercent) {
    var percent = Math.max(0, Number(playerHPPercent) || 0);

    if (percent > 0.7) {
      return "crushing";
    }

    if (percent < 0.3) {
      return "desperate";
    }

    return "standard";
  }

  function getDialogueState(playerHPPercent) {
    var tier = getOutcomeTier(playerHPPercent);

    if (tier === "crushing") {
      return "era_despair";
    }

    if (tier === "desperate") {
      return "narrow_escape";
    }

    return "standard_defeat";
  }

  function getEntryById(state, entryId) {
    var safeState = ensureState(state);
    var i = 0;

    for (i = 0; i < safeState.nemesis.pool.length; i += 1) {
      if (safeState.nemesis.pool[i].id === entryId) {
        return clone(safeState.nemesis.pool[i]);
      }
    }

    return null;
  }

  function getAdaptationMeta(adaptationId, level) {
    var baseMeta = ADAPTATION_META[adaptationId] || null;
    var resolvedLevel = Math.max(1, Math.min(5, Number(level) || 1));

    if (!baseMeta) {
      return null;
    }

    return {
      id: adaptationId,
      name: baseMeta.name,
      description: adaptationId === "chain_armor" ?
        "回合开始自动获得 " + (5 + resolvedLevel * 2) + " 架势" :
        baseMeta.description
    };
  }

  function getFirearmLabel(firearmStage) {
    return FIREARM_STAGE_LABELS[firearmStage] || FIREARM_STAGE_LABELS.none;
  }

  function getFirearmDialogueMeta(firearmStage) {
    return FIREARM_DIALOGUE_META[firearmStage] || FIREARM_DIALOGUE_META.none;
  }

  function getFirearmThreat(entry) {
    var level = Math.max(1, Math.min(5, Number(entry && (entry.level || entry.nemesisLevel)) || 1));
    var stage = getLevelProfile(level).firearmStage;
    var sequences = {
      none: [],
      revolver: ["退步拉距", "拔枪扳锤", "举枪瞄心", "开火"],
      carbine: ["推弹入膛", "举枪压人", "击发"],
      rifle: ["推栓上膛", "抵肩瞄准", "步枪击发"]
    };
    var steps = sequences[stage];
    var pierceRatio = entry && entry.currentAdaptation === "anti_block_tactics" ? 1 : 0.5;
    return {
      stage: stage,
      steps: steps.slice(),
      damage: steps.length ? getFirearmDamage(level) : 0,
      pierceRatio: steps.length ? pierceRatio : 0,
      summary: steps.length ? (steps.length - 1) + "拍准备 → 基础" + getFirearmDamage(level) + "伤 · " +
        (pierceRatio === 1 ? "无视全部架势" : "架势抵挡减半") : "仍用旧兵刃；他已经记住你的路数。"
    };
  }

  function getPreparationSummary(entry) {
    var change = entry && entry.lastPreparationChange;
    if (!change || change.toLevel !== entry.level) return "";
    var currentStage = getLevelProfile(entry.level).firearmStage;
    var loadout = currentStage === "none" ?
      (change.fromStage !== "none" ? "原枪已缺弹药，此次只能提刀追来。" : "此次仍以旧兵刃迎战。") :
      "此次可用的军械是" + getFirearmLabel(currentStage) + "。";
    return change.reason + loadout + (entry.inheritedIntel && !getLatestHistory(entry) ? "接手的报录仍在。" : "旧伤和招式记忆仍在。");
  }

  function getRevengeSummary(entry) {
    var level = Math.max(1, Math.min(5, Number(entry && entry.level) || 1));
    var preparation = getPreparationSummary(entry);
    if (preparation) return preparation;
    if (entry && entry.inheritedIntel && !getLatestHistory(entry)) {
      return "前任" + entry.inheritedIntel.fromName + "已退出追缉。继任者接到报录，按你的路数备下护具；此次领到" + getFirearmLabel(getLevelProfile(level).firearmStage) + "。这是追缉队接续的差事，不是他亲历的旧伤。";
    }
    // A gunman defeated in the original encounter already owned a firearm.
    // His early melee revenge is a setback, not his first discovery of guns.
    if (G.enemies.definitions[entry && entry.sourceTemplateId]?.behavior === "mack") {
      if (level === 1) return "上次败退时，旧枪摔坏了。他把坏枪挂回腰间，养伤后提刀追来。";
      if (level === 2) return "又一次败退后，他把坏枪送进枪行，另订新枪；等枪的日子里，刀招已专为你改过。";
      if (level === 3) return "枪行交来了新的左轮。这次他带回熟悉的枪声，不再冒险与你拼刀。";
    }
    return {
      1: "上次负伤撤走，他裹好旧伤、换了护具，又循迹追来。",
      2: "再次败退后，他托人找上枪行；枪还没到手，旧招已专为你改过。",
      3: "败退后，他从枪行赊来左轮。你的刀招没变，他却不再与你比刀。",
      4: "枪行替他换了短管卡宾枪；从三拍准备缩成两拍，留给你近身的时间更少了。",
      5: "他投靠了军中势力，借来栓动步枪。上膛、抵肩，旧仇已经落进准星。"
    }[level];
  }

  function getEscapeAccount(state) {
    var combat = state && state.combat || {};
    var card = combat.lastKillCardName || combat.lastPlayedCardName || "";
    var style = combat.lastKillCardStyle || combat.lastPlayedCardStyle;
    var wound = /封喉|抹脖|勾心|钉喉|割喉/.test(card) ? "杀招划开颈胸，受阻后未能致命。" :
      style === "iron" ? "架势被重击打散，他踉跄着站不稳。" :
      style === "dirty" ? "伤口牵动，脚下失衡，他再也攻不上来。" :
      style === "combo" ? "连环追打之下，他已无力还手。" : "伤口让他再撑不起兵刃。";
    if (combat.nodeType === "gate") return wound + "亲兵压住侧翼，将他拖进门洞救治；你抢过关口，没有折返追杀。";
    if (combat.nodeType === "elite") return wound + "同伙掀翻路旁杂物，接应他退入暗巷；你得赶路，未追进巷内。";
    if (combat.nodeType === "nemesis") return wound + "他借提前备好的烟灰遮住退路，带伤滚入接应车；你先护住残卷。";
    return "";
  }

  function getVictoryCopy(nodeType, state) {
    if (nodeType === "nemesis" && state && state.combat && state.combat.nemesisResolution && state.combat.nemesisResolution.kind === "withdrawal") {
      return {title:"旧敌退场",subtitle:state.combat.nemesisResolution.account};
    }
    var account = state ? getEscapeAccount(state) : "";
    if (nodeType === "gate") return {title:"关卡已破",subtitle:account || "守将负伤撤下，亲兵护住退路。你趁乱越过关口，旧账却没有就此结清。"};
    if (nodeType === "elite") return {title:"强敌败退",subtitle:account || "对手负伤遁走，丢下行装。这场败退，他会记在账上。"};
    if (nodeType === "nemesis") return {title:"旧仇未了",subtitle:account || "他又一次负伤遁走，遗落的物件归你；记住你这套招式的人，还活着。"};
    return {title:"搏杀得手",subtitle:"街上暂时清静了，收起能带走的东西。"};
  }

  function getStyleLabel(style) {
    return STYLE_LABELS[style] || "江湖杂手";
  }

  function getDialogueStateMeta(dialogueState) {
    return DIALOGUE_STATE_META[dialogueState] || DIALOGUE_STATE_META.standard_defeat;
  }

  function getLatestHistory(entry) {
    if (!entry || !Array.isArray(entry.history) || entry.history.length === 0) {
      return null;
    }

    return entry.history[entry.history.length - 1];
  }

  function getStrikeMemory(historyEntry) {
    if (!historyEntry || !historyEntry.playerKillCard) {
      return "那一下";
    }

    return "那记「" + historyEntry.playerKillCard + "」";
  }

  function getHistorySummary(entry) {
    var historyEntry = getLatestHistory(entry);

    if (!historyEntry) {
      if (entry && entry.inheritedIntel) return "接手报录：前任留下了" + getStrikeMemory({playerKillCard:entry.inheritedIntel.lastCard}) + "的记载；双方尚未亲自交手。";
      return "旧伤记忆：伤口好了，旧账还在。";
    }

    return "旧伤记忆：上次交手里，你以" +
      getStyleLabel(historyEntry.playerDominantStyle) +
      "压住了他，鏖战 " +
      Math.max(1, Number(historyEntry.turnsElapsed) || 1) +
      " 回合，收招是" +
      getStrikeMemory(historyEntry) +
      "。";
  }

  function getEraSummary(entry) {
    return "时代进化：" + getFirearmDialogueMeta(entry ? entry.firearmStage : "none").eraLine;
  }

  function getIntroLine(entry) {
    if (!entry) return "";
    if (entry.inheritedIntel && !getLatestHistory(entry)) return "前任的报录记着「" + (entry.inheritedIntel.lastCard || "你的路数") + "」。这回由我接令。";
    var id = entry.sourceTemplateId || "";
    var fought = !!getLatestHistory(entry);
    if (id === "elite_mack" || id === "act3_elite_barlow") return fought ? "上次让你近了身。这次你没这个机会。" : "站在那里。你还没有靠近我的本事。";
    if (id === "act3_boss_chief_inspector") return "各处出口都有人守。放下卷宗，跟我走。";
    if (id === "act3_elite_shen_lie") return fought ? "上回的亏我认。今天别想从这里过去。" : "要过这条街，先问我手里的家伙。";
    if (id.startsWith("act4_") || id === "act5_elite_meng_kui") return "命令没撤，这条路就不放人。你试试看。";
    return fought ? "上次让你过了关。这回，卷和人都得留下。" : "追缉处有令，卷和人都得留下。";
  }

  function getDialogueLine(entry) {
    if (!entry) return "";
    var historyEntry = getLatestHistory(entry);
    if (entry.inheritedIntel && !historyEntry) return "前任的报录记着「" + (entry.inheritedIntel.lastCard || "你的路数") + "」。这回由我接令。";
    var line = getIntroLine(entry);
    if (historyEntry) line += "那记「" + (historyEntry.playerKillCard || "收尾的招式") + "」，我认得。";
    if (entry.dialogueState === "narrow_escape") line += "再吃一次就没命了，我不会再硬接。";
    if (entry.firearmStage !== "none" && entry.firearmStage) line += "这次带了" + getFirearmLabel(entry.firearmStage) + "，你最好看清枪口。";
    else if (entry.dialogueState === "era_despair") line += "新军械还没到，先用手里的兵刃留住你。";
    return line;
  }

  function getIntroPayload(state, entryId) {
    var entry = getEntryById(state, entryId);
    var adaptation = null;
    var dialogueMeta = null;

    if (!entry) {
      return null;
    }

    entry = decorateEntry(entry);

    adaptation = getAdaptationMeta(entry.currentAdaptation, entry.level);
    dialogueMeta = getDialogueStateMeta(entry.dialogueState);
    return {
      entryId: entry.id,
      name: entry.name,
      title: entry.title,
      level: entry.level,
      dialogueState: entry.dialogueState,
      dialogueLabel: dialogueMeta.label,
      dialogueAccent: dialogueMeta.accent,
      dialogueLine: getDialogueLine(entry),
      memoryLine: getHistorySummary(entry),
      eraLine: getEraSummary(entry),
      revengeLine: getRevengeSummary(entry),
      firearmThreat: getFirearmThreat(entry),
      adaptation: adaptation,
      firearmStage: entry.firearmStage,
      firearmLabel: getFirearmLabel(entry.firearmStage),
      confirmLabel: "拔刀迎战",
      leaveLabel: null,
      note: adaptation ?
        "旧相识拦路而来，显然是冲着你上次那套打法来的。" :
        "旧相识拦路而来，这回也不是来讲规矩的。"
    };
  }

  function getSourceInfo(state) {
    var combat = state && state.combat ? state.combat : {};
    var enemyDefinitions = G.enemies && G.enemies.definitions ? G.enemies.definitions : {};
    var enemies = Array.isArray(combat.enemies) ? combat.enemies : [];
    var sourceEnemy = null;
    var sourceDefinition = null;
    var sourceEntry = null;
    var i = 0;

    if (combat.nodeType === "nemesis") {
      sourceEntry = getEntryById(state, combat.nemesisEntryId);
      if (!sourceEntry) {
        return null;
      }

      sourceDefinition = enemyDefinitions[sourceEntry.sourceTemplateId] || null;
      if (!sourceDefinition) {
        return null;
      }

      return {
        encounterId: sourceEntry.sourceEncounterId,
        templateId: sourceEntry.sourceTemplateId,
        definition: sourceDefinition,
        existingNemesisId: sourceEntry.id
      };
    }

    if (combat.nodeType !== "elite" && combat.nodeType !== "gate") {
      return null;
    }

    for (i = 0; i < enemies.length; i += 1) {
      sourceDefinition = enemyDefinitions[enemies[i].templateId];
      if (!sourceDefinition) {
        continue;
      }
      if (sourceDefinition.kind === "elite" || sourceDefinition.kind === "boss") {
        sourceEnemy = enemies[i];
        break;
      }
    }

    if (!sourceEnemy) {
      return null;
    }

    sourceDefinition = enemyDefinitions[sourceEnemy.templateId];
    return {
      encounterId: combat.encounterId || sourceDefinition.id,
      templateId: sourceEnemy.templateId,
      name: sourceEnemy.name,
      sourceAttempt: state.mission ? state.mission.attempt : 0,
      definition: sourceDefinition
    };
  }

  function getMaxStyleCount(styleCounts) {
    return TRACKED_STYLES.reduce(function (currentMax, style) {
      return Math.max(currentMax, styleCounts[style] || 0);
    }, 0);
  }

  function determineDominantStyle(state) {
    var combat = state && state.combat ? state.combat : {};
    var playedCards = Array.isArray(combat.playedCards) ? combat.playedCards : [];
    var player = state && state.player ? state.player : {};
    var styleCounts = {
      blade: 0,
      iron: 0,
      dirty: 0,
      combo: 0
    };
    var maxCount = 0;
    var candidates = [];
    var tieBreakerStyle = combat.lastKillCardStyle || combat.lastPlayedCardStyle || player.chosenStyle || "blade";

    playedCards.forEach(function (card) {
      if (card && TRACKED_STYLES.indexOf(card.style) >= 0) {
        styleCounts[card.style] += 1;
      }
    });

    maxCount = getMaxStyleCount(styleCounts);
    if (maxCount <= 0) {
      return TRACKED_STYLES.indexOf(player.chosenStyle) >= 0 ? player.chosenStyle : "blade";
    }

    candidates = TRACKED_STYLES.filter(function (style) {
      return styleCounts[style] === maxCount;
    });

    if (candidates.length === 1) {
      return candidates[0];
    }

    if (TRACKED_STYLES.indexOf(tieBreakerStyle) >= 0 && candidates.indexOf(tieBreakerStyle) >= 0) {
      return tieBreakerStyle;
    }

    if (TRACKED_STYLES.indexOf(player.chosenStyle) >= 0 && candidates.indexOf(player.chosenStyle) >= 0) {
      return player.chosenStyle;
    }

    return candidates[0];
  }

  function buildHistoryEntry(state, existingEntry) {
    var player = state && state.player ? state.player : {};
    var combat = state && state.combat ? state.combat : {};
    var maxHp = Math.max(1, Number(player.maxHp) || 1);

    return {
      encounter: existingEntry && Array.isArray(existingEntry.history) ? (existingEntry.history.length + 1) : 1,
      playerKillCard: combat.lastKillCardName || combat.lastPlayedCardName || null,
      playerDominantStyle: determineDominantStyle(state),
      playerHPPercent: Math.max(0, Number(player.hp) || 0) / maxHp,
      turnsElapsed: Math.max(1, Number(combat.turn) || 1),
      result: "defeated",
      escapeAccount: getEscapeAccount(state)
    };
  }

  function decorateEntry(nemesisEntry) {
    var profile = getLevelProfile(nemesisEntry.level);
    var latestHistory = Array.isArray(nemesisEntry.history) && nemesisEntry.history.length > 0 ?
      nemesisEntry.history[nemesisEntry.history.length - 1] :
      null;
    var summary = clone(nemesisEntry);

    summary.title = getIdentityTitle(summary);
    summary.firearmStage = profile.firearmStage;
    summary.firearmStep = typeof summary.firearmStep === "number" ? summary.firearmStep : 0;
    summary.scaledHP = getScaledHP(summary.baseHP, summary.level);
    summary.scaledAttack = getScaledAttack(summary.baseAttack, summary.level);
    summary.hpMultiplier = profile.hpMultiplier;
    summary.attackMultiplier = profile.attackMultiplier;
    summary.firearmDamage = getFirearmDamage(summary.level);
    summary.chainArmorBlock = getChainArmorBlock(summary.level);
    summary.latestHistory = latestHistory;
    summary.latestOutcomeTier = latestHistory ? getOutcomeTier(latestHistory.playerHPPercent) : null;
    return summary;
  }

  function createEntry(sourceInfo, historyEntry, nextId) {
    var nemesisEntry = {
      id: buildNemesisId(nextId),
      name: sourceInfo.name || sourceInfo.definition.name,
      title: "大内弃子",
      level: 1,
      baseHP: sourceInfo.definition.maxHp,
      baseAttack: sourceInfo.definition.attack,
      history: [historyEntry],
      currentAdaptation: ADAPTATION_BY_STYLE[historyEntry.playerDominantStyle] || null,
      firearmStage: "none",
      firearmStep: 0,
      dialogueState: getDialogueState(historyEntry.playerHPPercent),
      sourceEncounterId: sourceInfo.encounterId,
      sourceTemplateId: sourceInfo.templateId,
      sourceAttempt: sourceInfo.sourceAttempt || 0
    };

    return applyLevelProfile(nemesisEntry);
  }

  function updateEntry(existingEntry, historyEntry) {
    var nextEntry = clone(existingEntry);

    nextEntry.level = Math.min(5, (Number(nextEntry.level) || 1) + 1);
    nextEntry.history = Array.isArray(nextEntry.history) ? nextEntry.history.slice() : [];
    nextEntry.history.push(historyEntry);
    // A fresh battle now supplies the reason for his next preparation. Event
    // interference must not describe the later, newly earned loadout.
    delete nextEntry.lastPreparationChange;
    nextEntry.currentAdaptation = ADAPTATION_BY_STYLE[historyEntry.playerDominantStyle] || null;
    nextEntry.dialogueState = getDialogueState(historyEntry.playerHPPercent);
    return applyLevelProfile(nextEntry);
  }

  function findExistingIndex(pool, sourceInfo) {
    var index = -1;
    var i = 0;

    if (sourceInfo && sourceInfo.existingNemesisId) {
      for (i = 0; i < pool.length; i += 1) {
        if (pool[i].id === sourceInfo.existingNemesisId) {
          return i;
        }
      }
    }

    for (i = 0; i < pool.length; i += 1) {
      if ((pool[i].sourceAttempt || 0) !== (sourceInfo.sourceAttempt || 0)) continue;
      if (pool[i].sourceEncounterId === sourceInfo.encounterId || pool[i].sourceTemplateId === sourceInfo.templateId) {
        index = i;
        break;
      }
    }

    return index;
  }

  function closePursuit(state, defeatedEntry, previousEntry, nextId) {
    var successor = clone(defeatedEntry);
    var archived = clone(previousEntry);
    var generation = (Number(defeatedEntry.successionGeneration) || 0) + 1;
    var rootName = defeatedEntry.successionRootName || defeatedEntry.name;
    var latest = getLatestHistory(defeatedEntry);
    successor.id = buildNemesisId(nextId);
    // Use a new personal name; appending a generation to the old person's name
    // would still make the pursuit look like that person's repeated return.
    var surnames = ["周", "陈", "吴", "郑", "王", "冯", "何", "林"];
    var givenNames = ["承钧", "绍庭", "启山", "振川", "怀诚", "景年", "守义", "耀生"];
    var nameIndex = Math.max(0, nextId - 1);
    successor.name = "继任追缉者·" + surnames[nameIndex % surnames.length] + givenNames[Math.floor(nameIndex / surnames.length) % givenNames.length];
    successor.successionRootName = rootName;
    successor.successionGeneration = generation;
    successor.history = [];
    successor.inheritedIntel = {fromId:defeatedEntry.id,fromName:defeatedEntry.name,lastCard:latest.playerKillCard,dominantStyle:latest.playerDominantStyle};
    successor.dialogueState = "standard_defeat";
    var account = (defeatedEntry.history.length === 3 ? "他第三次败退" : "他接连败退") + "，旧伤复发，已无法继续追缉。接应者抬他离场，旧账至此留档；追缉队另派继任者，接手报录与军械。";
    latest.result = "withdrawn";
    latest.escapeAccount = account;
    // Archive the loadout actually faced, rather than the successor's new tier.
    archived.history = defeatedEntry.history;
    archived.closure = {reason:account,successorId:successor.id,successorName:successor.name,attempt:state.mission && state.mission.attempt || 0,act:state.combat.actNumber || state.map && state.map.actNumber || 1,battleNumber:defeatedEntry.history.length};
    state.nemesis.closedCases.push(archived);
    state.combat.nemesisResolution = {kind:"withdrawal",entryId:defeatedEntry.id,successorId:successor.id,account:account};
    return successor;
  }

  function findLowestLevelIndex(pool) {
    var lowestIndex = 0;
    var lowestLevel = Infinity;
    var i = 0;

    for (i = 0; i < pool.length; i += 1) {
      if ((Number(pool[i].level) || 1) < lowestLevel) {
        lowestLevel = Number(pool[i].level) || 1;
        lowestIndex = i;
      }
    }

    return lowestIndex;
  }

  function upsertEntry(pool, entry, existingIndex) {
    var nextPool = pool.slice();
    var replacementIndex = 0;

    if (existingIndex >= 0) {
      nextPool[existingIndex] = entry;
      return nextPool;
    }

    if (nextPool.length < MAX_POOL_SIZE) {
      nextPool.push(entry);
      return nextPool;
    }

    replacementIndex = findLowestLevelIndex(nextPool);
    nextPool[replacementIndex] = entry;
    return nextPool;
  }

  function recordBattleOutcome(state) {
    var nextState = ensureState(state);
    var sourceInfo = null;
    var existingIndex = -1;
    var historyEntry = null;
    var nextEntry = null;

    if (nextState.combat.nemesisRecorded || nextState.combat.result !== "victory") {
      return nextState;
    }

    sourceInfo = getSourceInfo(nextState);
    if (!sourceInfo) {
      return nextState;
    }

    existingIndex = findExistingIndex(nextState.nemesis.pool, sourceInfo);
    historyEntry = buildHistoryEntry(nextState, existingIndex >= 0 ? nextState.nemesis.pool[existingIndex] : null);
    nextEntry = existingIndex >= 0 ?
      updateEntry(nextState.nemesis.pool[existingIndex], historyEntry) :
      createEntry(sourceInfo, historyEntry, nextState.nemesis.nextId);

    if (existingIndex >= 0 && nextState.combat.nodeType === "nemesis" && nextEntry.history.length >= 3) {
      nextEntry = closePursuit(nextState, nextEntry, nextState.nemesis.pool[existingIndex], nextState.nemesis.nextId);
      nextState.nemesis.nextId += 1;
    }

    nextState.nemesis.pool = upsertEntry(nextState.nemesis.pool, nextEntry, existingIndex);
    if (existingIndex < 0) {
      nextState.nemesis.nextId += 1;
    }
    if (nextState.nemesis.currentRunEntryIds.indexOf(nextEntry.id) === -1) {
      nextState.nemesis.currentRunEntryIds = nextState.nemesis.currentRunEntryIds.concat(nextEntry.id);
    }
    nextState.combat.nemesisRecorded = true;
    return nextState;
  }

  function getPoolSnapshot(state) {
    var safeState = ensureState(state);

    return safeState.nemesis.pool.map(function (entry) {
      return decorateEntry(entry);
    });
  }

  function getClosedCases(state) {
    return ensureState(state).nemesis.closedCases.map(function (entry) { return clone(entry); });
  }

  function getCurrentRunEntries(state) {
    var safeState = ensureState(state);

    return safeState.nemesis.pool.filter(function (entry) {
      return safeState.nemesis.currentRunEntryIds.indexOf(entry.id) !== -1;
    }).map(function (entry) {
      return decorateEntry(entry);
    });
  }

  function buildEncounterForEntry(state, entryId) {
    var entry = getEntryById(state, entryId);
    var decorated = null;
    var enemy = null;
    var encounter = null;

    if (!entry || !G.enemies || typeof G.enemies.buildEncounter !== "function") {
      return null;
    }

    decorated = decorateEntry(entry);
    encounter = G.enemies.buildEncounter(entry.sourceEncounterId);
    if (!encounter) {
      return null;
    }

    encounter.id = "nemesis_" + decorated.id;
    encounter.name = "宿敌 · " + decorated.name;
    encounter.nodeType = "nemesis";
    encounter.nextSeed = state && state.combat ? (state.combat.rngSeed || 1900) : 1900;
    encounter.nemesisEntryId = decorated.id;
    encounter.nemesisName = decorated.name;
    encounter.nemesisTitle = decorated.title;
    encounter.nemesisLevel = decorated.level;
    encounter.nemesisAdaptation = decorated.currentAdaptation;
    encounter.nemesisFirearmStage = decorated.firearmStage;
    encounter.nemesisScaledHP = decorated.scaledHP;
    encounter.nemesisScaledAttack = decorated.scaledAttack;
    encounter.nemesisFirearmDamage = decorated.firearmDamage;

    if (encounter.enemies.length > 0) {
      enemy = encounter.enemies[0];
      enemy.name = decorated.name;
      enemy.kind = "nemesis";
      enemy.behavior = "nemesis";
      enemy.maxHp = decorated.scaledHP;
      enemy.hp = decorated.scaledHP;
      enemy.baseAttack = decorated.scaledAttack;
      enemy.intentValue = 0;
      enemy.intentLabel = "逼命斩";
      enemy.intentData = {};
      enemy.nemesisEntryId = decorated.id;
      enemy.nemesisTitle = decorated.title;
      enemy.nemesisLevel = decorated.level;
      enemy.currentAdaptation = decorated.currentAdaptation;
      enemy.firearmStage = decorated.firearmStage;
      enemy.firearmDamage = decorated.firearmDamage;
      enemy.ai = Object.assign({}, enemy.ai || {}, {
        cycleIndex: 0,
        pendingFervor: false,
        hitTakenThisTurn: false
      });
    }

    return encounter;
  }

  function distinguishSuccessors(state, encounter) {
    if (!state.mission || !encounter || (encounter.nodeType !== "gate" && encounter.nodeType !== "elite")) return encounter;
    var attempt = state.mission.attempt;
    (encounter.enemies || []).forEach(function (enemy) {
      if ((state.nemesis?.pool || []).some(function (entry) {
        return entry.sourceTemplateId === enemy.templateId && (entry.sourceAttempt || 0) !== attempt;
      })) {
        enemy.name = "接替者·" + enemy.name;
      }
    });
    return encounter;
  }

  G.nemesis.ensureState = ensureState;
  G.nemesis.getEntryById = getEntryById;
  G.nemesis.getLevelProfile = getLevelProfile;
  G.nemesis.getOutcomeTier = getOutcomeTier;
  G.nemesis.getAdaptationMeta = getAdaptationMeta;
  G.nemesis.getFirearmLabel = getFirearmLabel;
  G.nemesis.getFirearmDamage = getFirearmDamage;
  G.nemesis.getFirearmThreat = getFirearmThreat;
  G.nemesis.getRevengeSummary = getRevengeSummary;
  G.nemesis.getPreparationSummary = getPreparationSummary;
  G.nemesis.getVictoryCopy = getVictoryCopy;
  G.nemesis.getEscapeAccount = getEscapeAccount;
  G.nemesis.getChainArmorBlock = getChainArmorBlock;
  G.nemesis.getIntroLine = getIntroLine;
  G.nemesis.getDialogueLine = getDialogueLine;
  G.nemesis.getIntroPayload = getIntroPayload;
  G.nemesis.determineDominantStyle = determineDominantStyle;
  G.nemesis.recordBattleOutcome = recordBattleOutcome;
  G.nemesis.buildEncounterForEntry = buildEncounterForEntry;
  G.nemesis.distinguishSuccessors = distinguishSuccessors;
  G.nemesis.getPoolSnapshot = getPoolSnapshot;
  G.nemesis.getClosedCases = getClosedCases;
  G.nemesis.getCurrentRunEntries = getCurrentRunEntries;
})();
