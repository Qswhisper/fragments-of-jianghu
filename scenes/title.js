window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  var TITLE_MODE = {
    menu: true,
    styles: true,
    settings: true,
    credits: true,
    report: true
  };
  var STYLE_OPTIONS = [
    {
      id: "blade",
      name: "吹命刀",
      theme: "极速 / 致命斩杀",
      keyword: "破绽",
      summary: "短促试探，叠起破绽，择机以伤换命。",
      killerLine: "护身与转手争出空隙，再把破绽兑成杀招。",
      starterSummary: "起手：3 张抹脖子、1 张舍身一刀，踩肩越刀与回身藏锋护住转手，其余劈砍、招架撑底。",
      pressureLabel: "极高",
      complexityLabel: "偏难",
      accent: "#9d2a36",
      fill: "rgba(38, 16, 18, 0.96)",
      previewNames: ["抹脖子", "舍身一刀", "开膛"]
    },
    {
      id: "iron",
      name: "外家横练",
      theme: "硬抗 / 钝器反击",
      keyword: "铁骨",
      summary: "近身蓄架反击；遇到枪口，靠掩护与身位争取近身机会。",
      killerLine: "拳架能借力反击，枪弹却不能靠血肉硬接。",
      starterSummary: "起手：3 张铁牛耕地、2 张沉马硬架、2 张抱架反砸，靠连皮带骨收拳。",
      pressureLabel: "高",
      complexityLabel: "稳",
      accent: "#7a8793",
      fill: "rgba(24, 28, 32, 0.96)",
      previewNames: ["铁牛耕地", "铁门闩", "连皮带骨"]
    },
    {
      id: "dirty",
      name: "下三滥",
      theme: "阴毒 / 街头黑手",
      keyword: "溃烂",
      summary: "不讲规矩，先废手脚，再让伤口慢慢烂进去。",
      killerLine: "你靠的是脏手段，不是江湖体面。",
      starterSummary: "起手以阴手捅刀、毒钉叠溃烂，阴沟翻身护身抽牌，撒石灰争出拖伤的时间。",
      pressureLabel: "中高",
      complexityLabel: "阴狠",
      accent: "#5f7d4f",
      fill: "rgba(22, 30, 20, 0.96)",
      previewNames: ["阴手捅刀", "撒石灰", "断筋"]
    },
    {
      id: "combo",
      name: "贴身短打",
      theme: "距离 / 连续压制",
      keyword: "连环",
      summary: "挤进三步之内，靠碎快动作把人打到还不了手。",
      killerLine: "你要黏上去，连着三四手把人气打断。",
      starterSummary: "起手：3 张闪身刺、3 张卸骨手、2 张寸拳连珠，尽快把连环拉起来。",
      pressureLabel: "高",
      complexityLabel: "偏难",
      accent: "#b8862b",
      fill: "rgba(38, 28, 14, 0.96)",
      previewNames: ["闪身刺", "卸骨手", "寸拳连珠"]
    }
  ];
  var CREDIT_ROWS = [
    {
      role: "策划蓝本",
      value: "DESIGN-DOCUMENT-v3.4"
    },
    {
      role: "项目协作",
      value: "用户 + Codex"
    },
    {
      role: "视觉层",
      value: "本地程序化美术包"
    },
    {
      role: "音频层",
      value: "Web Audio 程序化配乐与音效"
    },
    {
      role: "验证环境",
      value: "系统 Edge / Chrome"
    }
  ];
  var TITLE_BACKGROUND_TEXTURE_PATH = "assets/ui/title_menu_background_gpt4ovip_01.png";
  var TITLE_BUTTON_TEXTURE_PATH = "assets/ui/title_menu_button_plaque_gpt4ovip_01_fill_core.png";
  var REPORT_BACKGROUND_TEXTURE_PATH = "assets/ui/report_muddy_blood_decree_gpt4ovip_01.png";
  var REPORT_PANEL_TEXTURE_PATH = "assets/ui/ui_torn_rice_paper_overlay_gpt4ovip_transparent_cropped_01.png";
  var STYLE_PORTRAIT_PATHS = {
    blade: "assets/portraits/player_blade_form_titlecamera_20260329_v18.png",
    iron: "assets/portraits/player_iron_form_titlecamera_20260329_v18.png",
    dirty: "assets/portraits/player_dirty_form_titlecamera_20260330_v18i.png",
    combo: "assets/portraits/player_combo_form_titlecamera_20260330_v18f.png"
  };
  var STYLE_PORTRAIT_LAYOUTS = {
    blade: { scale: 1, offsetX: 0, offsetY: 0 },
    iron: { scale: 1, offsetX: 0, offsetY: 0 },
    dirty: { scale: 1, offsetX: 0, offsetY: 0 },
    combo: { scale: 0.98, offsetX: 0, offsetY: 0 }
  };

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function isInside(point, box) {
    return point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height;
  }

  function getLayout() {
    var layout = {
      headingY: 62,
      subtitleY: 104,
      promptY: 136,
      menuPanel: { x: 34, y: 142, width: 224, height: 196 },
      menuSummary: { x: 44, y: 560, width: 300, height: 84 },
      menuButtons: [
        { id: "new_run", x: 914, y: 178, width: 298, height: 72 },
        { id: "continue", x: 924, y: 276, width: 288, height: 60 },
        { id: "settings", x: 938, y: 356, width: 274, height: 58 },
        { id: "credits", x: 952, y: 436, width: 260, height: 56 }
      ],
      styleHero: { x: 32, y: 54, width: 420, height: 616 },
      styleRail: { x: 486, y: 174, width: 252, height: 58, gap: 14 },
      styleDossier: { x: 836, y: 54, width: 372, height: 502 },
      cardsStartX: 48,
      cardsY: 160,
      cardWidth: 286,
      cardHeight: 212,
      cardGap: 12,
      detail: { x: 48, y: 410, width: 842, height: 258 },
      previewStartX: 68,
      previewY: 520,
      previewWidth: 250,
      previewHeight: 118,
      previewGap: 18,
      startButton: { x: 884, y: 578, width: 312, height: 82 },
      backButton: { x: 904, y: 670, width: 272, height: 38 },
      settingsPanel: { x: 238, y: 176, width: 804, height: 408 },
      volumeMinus: { x: 350, y: 290, width: 72, height: 60 },
      volumePlus: { x: 858, y: 290, width: 72, height: 60 },
      qualityButton: { x: 350, y: 390, width: 580, height: 62 },
      settingsBack: { x: 476, y: 500, width: 328, height: 64 },
      creditsPanel: { x: 182, y: 176, width: 916, height: 420 },
      creditsBack: { x: 476, y: 618, width: 328, height: 60 },
      reportPanel: { x: 142, y: 164, width: 996, height: 424 },
      reportButtons: [
        { id: "menu", x: 300, y: 612, width: 280, height: 64 },
        { id: "retry", x: 700, y: 612, width: 280, height: 64 }
      ],
      tipY: 642
    };
    if(G.render && G.render.journeyEntry)layout=G.render.journeyEntry.layout(layout);
    return G.render && G.render.journeyStory ? G.render.journeyStory.titleLayout(layout) : layout;
  }

  function getStyleBoxes(layout) {
    return STYLE_OPTIONS.map(function (option, index) {
      return {
        id: option.id,
        x: layout.styleRail.x + (layout.styleRail.horizontal ? index * (layout.styleRail.width + layout.styleRail.gap) : 0),
        y: layout.styleRail.y + (layout.styleRail.horizontal ? 0 : index * (layout.styleRail.height + layout.styleRail.gap)),
        width: layout.styleRail.width,
        height: layout.styleRail.height
      };
    });
  }

  function findStyleOption(styleId) {
    var i = 0;

    for (i = 0; i < STYLE_OPTIONS.length; i += 1) {
      if (STYLE_OPTIONS[i].id === styleId) {
        return STYLE_OPTIONS[i];
      }
    }

    return STYLE_OPTIONS[0];
  }

  function buildOptionView(option) {
    return {
      id: option.id,
      name: option.name,
      theme: option.theme,
      keyword: option.keyword,
      summary: option.summary,
      killerLine: option.killerLine,
      starterSummary: option.starterSummary,
      pressureLabel: option.pressureLabel,
      complexityLabel: option.complexityLabel,
      accent: option.accent,
      fill: option.fill,
      previewCards: option.previewNames.map(function (cardName) {
        return G.cards.getCardByName(cardName);
      }).filter(Boolean)
    };
  }

  function getStylePortraitPath(styleId) {
    return STYLE_PORTRAIT_PATHS[styleId] || STYLE_PORTRAIT_PATHS.blade;
  }

  function getStylePortraitLayout(styleId) {
    return STYLE_PORTRAIT_LAYOUTS[styleId] || STYLE_PORTRAIT_LAYOUTS.blade;
  }

  function hexToRgba(hex, alpha) {
    var value = String(hex || "").replace("#", "");
    var safeAlpha = typeof alpha === "number" ? alpha : 1;
    var r = 255;
    var g = 255;
    var b = 255;

    if (value.length === 3) {
      value = value.split("").map(function (part) {
        return part + part;
      }).join("");
    }

    if (/^[0-9a-fA-F]{6}$/.test(value)) {
      r = parseInt(value.slice(0, 2), 16);
      g = parseInt(value.slice(2, 4), 16);
      b = parseInt(value.slice(4, 6), 16);
    }

    return "rgba(" + r + ", " + g + ", " + b + ", " + safeAlpha + ")";
  }

  function getMenuItems(continueAvailable) {
    return [
      { id: "new_run", label: "杀入九城", subtitle: "开启新 run，先定流派再入城", disabled: false },
      { id: "continue", label: "再续死局", subtitle: continueAvailable ? "读取本地存档，接上上一次断口" : "当前没有可续的死局", disabled: !continueAvailable },
      { id: "settings", label: "设置", subtitle: "音量与画质，直接写入本地", disabled: false },
      { id: "credits", label: "风云榜", subtitle: "制作名单与当前构建说明", disabled: false }
    ];
  }

  function getSceneLabel(scene) {
    var labels = {
      title: "主菜单",
      arrival: "入城前夜",
      combat: "战斗",
      reward: "战利品",
      map: "江湖图",
      rest: "破庙",
      shop: "黑市",
      event: "奇遇",
      nemesis: "宿敌对白"
    };

    return labels[scene] || String(scene || "未知场景");
  }

  function getModeCopy(mode, continueAvailable, runReport) {
    if (mode === "styles") {
      return {
        subtitle: "杀入九城前，先选你的杀法",
        prompt: "庶子命，九城已烂。你得先决定，自己靠什么手艺活下去。",
        note: "点击流派改预览，再点「杀入九城」开始这一局。"
      };
    }

    if (mode === "settings") {
      return {
        subtitle: "刀还没出鞘，先把环境调顺",
        prompt: "设置会立刻写进本地，后续从主菜单和存档恢复都沿用同一套。",
        note: "这一步只做底层设置面板；更完整的系统项以后还能继续加。"
      };
    }

    if (mode === "credits") {
      return {
        subtitle: "风云榜 / 制作名单",
        prompt: "这是当前构建里能明确落地的制作信息，不拿虚名充数。",
        note: "名单内容后面还能继续补，但入口和版面先正式化。"
      };
    }

    if (mode === "report") {
      return {
        subtitle: runReport && runReport.subtitle ? runReport.subtitle : "这一局已经收口。",
        prompt: runReport && runReport.prompt ? runReport.prompt : "下面只保留本局实际打出来的结果。",
        note: runReport && runReport.note ? runReport.note : "返回主菜单会收起账本，再入江湖会回到流派选择。"
      };
    }

    return {
      subtitle: "乱世里先活，再决定怎么杀",
      prompt: continueAvailable ?
        "旧局还没断气，你可以接上它；若要重开，也得先定杀法。" :
        "九城已经烂透了。先挑入口，再谈怎么把人杀出路来。",
      note: continueAvailable ?
        "本地已有一局死局可续；不想接，仍可先看流派再重开。" :
        "先从「杀入九城」进去，再挑你要靠哪门手艺活命。"
    };
  }

  function getSelectedOption(state) {
    var selectedStyle = state && state.title ? state.title.selectedStyle : "blade";
    var options = state && state.title && Array.isArray(state.title.options) ? state.title.options : [];
    var i = 0;

    for (i = 0; i < options.length; i += 1) {
      if (options[i].id === selectedStyle) {
        return options[i];
      }
    }

    return options[0] || buildOptionView(findStyleOption("blade"));
  }

  function formatSaveLine(saveSummary) {
    if (!saveSummary) {
      return "本地存档：当前没有可续的 run。";
    }

    return "本地存档：已封存未完死局，点「再续死局」可直接接回。";
  }

  function formatSettingsLine(settings) {
    return "设置：音量 " + Math.round(((settings && settings.volume) || 0) * 100) +
      "% / 画质 " + (((settings && settings.quality) || "high") === "low" ? "低" : "高");
  }

  function buildSaveSummaryLines(saveSummary) {
    if (!saveSummary) {
      return [
        "还没有可续死局。",
        "从「杀入九城」进入流派选择后开启新 run。"
      ];
    }

    return [
      "卷次：" + (saveSummary.actTitle || ("卷 " + saveSummary.actNumber)),
      "停在：" + getSceneLabel(saveSummary.scene) + (saveSummary.currentNodeId ? " / " + saveSummary.currentNodeId : ""),
      "状态：" + saveSummary.chosenStyle + " / 气血 " + saveSummary.hp + "/" + saveSummary.maxHp + " / 大洋 " + saveSummary.gold,
      "牌组：" + saveSummary.deckSize + " 张"
    ];
  }

  function normalizeSettings(settings) {
    if (G.storage && typeof G.storage.normalizeSettings === "function") {
      return G.storage.normalizeSettings(settings);
    }

    return {
      volume: Math.max(0, Math.min(1, Number(settings && settings.volume) || 0.7)),
      quality: settings && settings.quality === "low" ? "low" : "high"
    };
  }

  function prepareState(state) {
    var nextState = cloneState(state);
    var storageDebug = G.main && typeof G.main.getStorageDebug === "function" ?
      G.main.getStorageDebug() :
      null;
    var runReport = nextState.runReport && nextState.runReport.active ? nextState.runReport : null;
    var selectedStyle = nextState.title && nextState.title.selectedStyle ?
      nextState.title.selectedStyle :
      (nextState.player && nextState.player.chosenStyle ? nextState.player.chosenStyle : "blade");
    var mode = nextState.title && TITLE_MODE[nextState.title.mode] ? nextState.title.mode : "menu";
    var saveSummary = storageDebug && storageDebug.runSummary ? storageDebug.runSummary : null;
    var continueAvailable = !!(storageDebug && storageDebug.hasRunSave);
    var copy = null;
    var selected = findStyleOption(selectedStyle);

    if (mode === "report" && !runReport) {
      mode = "menu";
    }

    copy = getModeCopy(mode, continueAvailable, runReport);

    var note = nextState.title && nextState.title.note ? nextState.title.note : copy.note;

    nextState.settings = normalizeSettings(nextState.settings || {});
    nextState.title = Object.assign({}, nextState.title, {
      mode: mode,
      heading: "江湖残卷",
      subtitle: copy.subtitle,
      prompt: copy.prompt,
      note: note,
      startLabel: "杀入九城",
      backLabel: "返回主菜单",
      selectedStyle: selected.id,
      continueAvailable: continueAvailable,
      saveSummary: saveSummary,
      saveLine: formatSaveLine(saveSummary),
      settingsLine: formatSettingsLine(nextState.settings),
      saveSummaryLines: buildSaveSummaryLines(saveSummary),
      menuItems: getMenuItems(continueAvailable),
      options: STYLE_OPTIONS.map(buildOptionView),
      creditRows: CREDIT_ROWS.slice()
    });

    return nextState;
  }

  function setMode(state, mode, note) {
    var nextState = cloneState(state);

    nextState.title.mode = mode;
    if (mode !== "report") {
      nextState.runReport = null;
    }
    if (note) {
      nextState.title.note = note;
    } else {
      nextState.title.note = null;
    }
    return nextState;
  }

  function selectStyle(state, styleId) {
    var nextState = cloneState(state);
    var selected = findStyleOption(styleId);

    nextState.title.selectedStyle = selected.id;
    nextState.title.note = "当前预演改成【" + selected.name + "】。定好这口刀，再往九城里送。";
    return nextState;
  }

  function startRun(state) {
    var nextState = cloneState(state);
    var selectedStyle = nextState.title.selectedStyle || "blade";
    var starterDeck = G.cards.getStarterDeck(selectedStyle);

    nextState.player.hp = 80;
    nextState.player.maxHp = 80;
    nextState.player.poisonTurns = 0;
    nextState.player.energy = 3;
    nextState.player.maxEnergy = 3;
    nextState.player.block = 0;
    nextState.player.gold = 100;
    nextState.player.relics = [];
    nextState.player.removeServiceCount = 0;
    nextState.player.deckSize = starterDeck.length;
    nextState.player.chosenStyle = selectedStyle;
    nextState.player.masterDeckNames = starterDeck.slice();

    nextState.combat = {
      hand: [],
      drawPileCount: 0,
      discardPileCount: 0,
      enemies: [],
      turn: 0,
      comboCount: 0,
      comboDiscountUses: 0,
      seeded: false,
      selectedCardId: null,
      inspectCardId: null,
      inspectPresentation: {
        cardId: null,
        progress: 0,
        targetVisible: false
      },
      goldGranted: 0,
      ui: { overlay: null }
    };
    nextState.reward = null;
    nextState.rest = null;
    nextState.shop = null;
    nextState.event = null;
    nextState.events = { seenIds: [], nextSeed: 1900, history: [] };
    nextState.map = null;
    nextState.nemesisIntro = null;
    nextState.nemesis = Object.assign({
      pool: [],
      nextId: 1,
      currentRunEntryIds: []
    }, nextState.nemesis || {});
    nextState.nemesis.currentRunEntryIds = [];
    nextState.runReport = null;
    nextState.scene = G.scenes.arrival ? "arrival" : "combat";
    nextState.arrival = G.scenes.arrival ? { stage: "gate" } : null;
    if (G.journeyNarrative) G.journeyNarrative.begin(nextState);
    if (G.journeyPreparation) G.journeyPreparation.reset(nextState);
    return nextState;
  }

  function continueRun(state) {
    var nextState = cloneState(state);
    var savedState = G.storage && typeof G.storage.loadRun === "function" ? G.storage.loadRun() : null;

    if (!savedState) {
      nextState.title.note = "现在没有可续的死局，先开新 run。";
      return nextState;
    }

    return savedState;
  }

  function changeVolume(state, delta) {
    var nextState = cloneState(state);
    var settings = normalizeSettings(Object.assign({}, nextState.settings || {}, {
      volume: ((nextState.settings && nextState.settings.volume) || 0.7) + delta
    }));

    nextState.settings = settings;
    nextState.title.note = "音量已调到 " + Math.round(settings.volume * 100) + "%。";
    return nextState;
  }

  function toggleQuality(state) {
    var nextState = cloneState(state);
    var currentQuality = nextState.settings && nextState.settings.quality === "low" ? "low" : "high";

    nextState.settings = normalizeSettings(Object.assign({}, nextState.settings || {}, {
      quality: currentQuality === "low" ? "high" : "low"
    }));
    nextState.title.note = "画质切到「" + (nextState.settings.quality === "low" ? "低" : "高") + "」。";
    return nextState;
  }

  function handleMenuClick(state, click, layout) {
    var nextState = state;
    var menuItems = state.title.menuItems || [];
    var i = 0;
    var config = null;

    for (i = 0; i < layout.menuButtons.length; i += 1) {
      if (!isInside(click, layout.menuButtons[i])) {
        continue;
      }

      config = menuItems[i];
      if (!config) {
        return nextState;
      }

      if (config.id === "continue") {
        return continueRun(nextState);
      }
      if (config.id === "new_run") {
        return setMode(nextState, "styles", "先把流派定下来，再入九城。");
      }
      if (config.id === "settings") {
        return setMode(nextState, "settings", "音量和画质会立刻写入本地。");
      }
      if (config.id === "credits") {
        return setMode(nextState, "credits", "这是当前构建已经落地的制作名单。");
      }
    }

    return nextState;
  }

  function handleStylesClick(state, click, layout) {
    var nextState = state;
    var styleBoxes = getStyleBoxes(layout);
    var i = 0;

    for (i = 0; i < styleBoxes.length; i += 1) {
      if (isInside(click, styleBoxes[i])) {
        return selectStyle(nextState, styleBoxes[i].id);
      }
    }

    if (isInside(click, layout.startButton)) {
      return startRun(nextState);
    }

    if (isInside(click, layout.backButton)) {
      return setMode(nextState, "menu", "先看入口，再决定是不是重开。");
    }

    return nextState;
  }

  function handleSettingsClick(state, click, layout) {
    var nextState = state;

    if (isInside(click, layout.volumeMinus)) {
      return changeVolume(nextState, -0.08);
    }
    if (isInside(click, layout.volumePlus)) {
      return changeVolume(nextState, 0.08);
    }
    if (isInside(click, layout.qualityButton)) {
      return toggleQuality(nextState);
    }
    if (isInside(click, layout.settingsBack)) {
      return setMode(nextState, "menu", "设置已写进本地。");
    }

    return nextState;
  }

  function handleCreditsClick(state, click, layout) {
    if (isInside(click, layout.creditsBack)) {
      return setMode(state, "menu", "风云榜收起，回到入口。");
    }

    return state;
  }

  function handleReportClick(state, click, layout) {
    if(layout.reportDetails&&G.render.canvasUtils.containsAction(click,layout.reportDetails)&&G.journeyShell){G.journeyShell.openReport();return state;}
    var buttons = state.runReport && Array.isArray(state.runReport.buttons) ? state.runReport.buttons : [];
    var i = 0;
    var button = null;
    var nextState = cloneState(state);

    for (i = 0; i < layout.reportButtons.length; i += 1) {
      if (!G.render.canvasUtils.containsAction(click, layout.reportButtons[i])) {
        continue;
      }

      button = buttons[i];
      if (!button) {
        return state;
      }

      if (button.id === "retry") {
        nextState.runReport = null;
        nextState.title.selectedStyle = state.runReport && state.runReport.styleId ? state.runReport.styleId : nextState.title.selectedStyle;
        return setMode(nextState, "styles", "沿用上一局的流派预选，重新定刀再入九城。");
      }

      return setMode(nextState, "menu", "这局账本已经封箱，回到主菜单。");
    }

    return state;
  }

  function processClicks(state) {
    var nextState = prepareState(state);
    var layout = getLayout();
    var clicks = G.main && typeof G.main.consumeClicks === "function" ? G.main.consumeClicks() : [];
    var click = null;
    var handledState = null;

    if (clicks.length === 0) {
      return nextState;
    }

    while (clicks.length > 0) {
      click = clicks.shift();

      if (nextState.title.mode === "menu") {
        handledState = handleMenuClick(nextState, click, layout);
        if (handledState.scene !== "title") {
          return handledState;
        }
        nextState = prepareState(handledState);
        continue;
      }

      if (nextState.title.mode === "styles") {
        handledState = handleStylesClick(nextState, click, layout);
        if (handledState.scene !== "title") {
          return handledState;
        }
        nextState = prepareState(handledState);
        continue;
      }

      if (nextState.title.mode === "settings") {
        nextState = prepareState(handleSettingsClick(nextState, click, layout));
        continue;
      }

      if (nextState.title.mode === "credits") {
        nextState = prepareState(handleCreditsClick(nextState, click, layout));
        continue;
      }

      if (nextState.title.mode === "report") {
        nextState = prepareState(handleReportClick(nextState, click, layout));
      }
    }

    return nextState;
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options) {
    var opts = options || {};
    var chars = String(text || "").split("");
    var line = "";
    var lines = [];
    var i = 0;

    ctx.save();
    ctx.fillStyle = opts.color || "#efe7d5";
    ctx.font = (opts.weight || "500") + " " + (opts.size || 16) + "px " +
      (opts.fontFamily || "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif");
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = "top";
    if (opts.shadowColor || opts.shadow === true) {
      ctx.shadowColor = opts.shadowColor || "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = typeof opts.shadowBlur === "number" ? opts.shadowBlur : 2;
      ctx.shadowOffsetX = typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 1;
      ctx.shadowOffsetY = typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 1;
    }

    for (i = 0; i < chars.length; i += 1) {
      if (ctx.measureText(line + chars[i]).width > maxWidth && line) {
        lines.push(line);
        line = chars[i];
      } else {
        line += chars[i];
      }
    }

    if (line) {
      lines.push(line);
    }

    if (opts.maxLines && lines.length > opts.maxLines) {
      lines = lines.slice(0, opts.maxLines);
      lines[lines.length - 1] = lines[lines.length - 1].replace(/.$/, "…");
    }

    for (i = 0; i < lines.length; i += 1) {
      if (opts.strokeColor) {
        ctx.strokeStyle = opts.strokeColor;
        ctx.lineWidth = typeof opts.strokeWidth === "number" ? opts.strokeWidth : 2;
        ctx.lineJoin = "round";
        ctx.strokeText(lines[i], x, y + i * lineHeight);
      }
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
    ctx.restore();
    return y + lines.length * lineHeight;
  }

  function renderBackground(ctx, state) {
    var utils = G.render.canvasUtils;
    var texturedBackground = false;
    var gradient = null;
    var glowLeft = null;
    var glowRight = null;
    var mode = state && state.title ? state.title.mode : "";
    var skyline = [
      { x: 0, width: 120, height: 108 },
      { x: 94, width: 84, height: 148 },
      { x: 166, width: 72, height: 128 },
      { x: 244, width: 94, height: 188 },
      { x: 334, width: 60, height: 132 },
      { x: 392, width: 110, height: 166 },
      { x: 492, width: 86, height: 122 },
      { x: 566, width: 92, height: 206 },
      { x: 654, width: 62, height: 144 },
      { x: 716, width: 118, height: 182 },
      { x: 830, width: 76, height: 136 },
      { x: 902, width: 92, height: 216 },
      { x: 988, width: 70, height: 156 },
      { x: 1056, width: 92, height: 126 },
      { x: 1142, width: 138, height: 174 }
    ];
    var i = 0;
    var width = ctx.canvas ? (ctx.canvas.logicalWidth || ctx.canvas.width) : 1280;
    var height = ctx.canvas ? (ctx.canvas.logicalHeight || ctx.canvas.height) : 720;

    if (state && state.title && state.title.mode === "report") {
      if (
        G.render.assets &&
        typeof G.render.assets.drawImageCover === "function"
      ) {
        texturedBackground = G.render.assets.drawImageCover(
          ctx,
          REPORT_BACKGROUND_TEXTURE_PATH,
          0,
          0,
          width,
          height,
          {
            focusX: 0.5,
            focusY: 0.48
          }
        );
      }

      if (!texturedBackground) {
        utils.clear(ctx, "#0b0909");
      }

      return;
    }

    if (mode === "menu") {
      utils.clear(ctx, "#0f100f");

      ctx.save();
      if (
        G.render.assets &&
        typeof G.render.assets.getImageEntry === "function" &&
        typeof G.render.assets.drawSourceCover === "function"
      ) {
        var titleBgEntry = G.render.assets.getImageEntry(TITLE_BACKGROUND_TEXTURE_PATH);
        var titleBgImage = titleBgEntry && titleBgEntry.image ? titleBgEntry.image : null;
        if (titleBgEntry && titleBgImage && titleBgEntry.loaded && !titleBgEntry.failed) {
          ctx.save();
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
          texturedBackground = G.render.assets.drawSourceCover(
            ctx,
            titleBgImage,
            0,
            0,
            width,
            height,
            {
              focusX: 0.46,
              focusY: 0.40
            }
          );
          ctx.restore();
        }
      }

      if (!texturedBackground) {
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#191511");
        gradient.addColorStop(0.48, "#131416");
        gradient.addColorStop(1, "#090a0b");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "rgba(95, 61, 40, 0.08)";
        ctx.beginPath();
        ctx.moveTo(0, 150);
        ctx.lineTo(210, 118);
        ctx.lineTo(382, 132);
        ctx.lineTo(612, 116);
        ctx.lineTo(834, 136);
        ctx.lineTo(1042, 122);
        ctx.lineTo(1280, 144);
        ctx.lineTo(1280, 224);
        ctx.lineTo(0, 240);
        ctx.closePath();
        ctx.fill();
      }

      gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(9, 7, 6, 0.30)");
      gradient.addColorStop(0.36, "rgba(15, 12, 11, 0.24)");
      gradient.addColorStop(0.72, "rgba(10, 11, 12, 0.46)");
      gradient.addColorStop(1, "rgba(3, 3, 4, 0.72)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      glowLeft = ctx.createRadialGradient(214, 166, 18, 214, 166, 360);
      glowLeft.addColorStop(0, "rgba(126, 66, 42, 0.16)");
      glowLeft.addColorStop(0.56, "rgba(126, 66, 42, 0.05)");
      glowLeft.addColorStop(1, "rgba(126, 66, 42, 0)");
      ctx.fillStyle = glowLeft;
      ctx.fillRect(0, 0, 640, 460);

      glowRight = ctx.createRadialGradient(986, 152, 18, 986, 152, 270);
      glowRight.addColorStop(0, "rgba(70, 92, 104, 0.12)");
      glowRight.addColorStop(0.58, "rgba(70, 92, 104, 0.04)");
      glowRight.addColorStop(1, "rgba(70, 92, 104, 0)");
      ctx.fillStyle = glowRight;
      ctx.fillRect(706, 0, 574, 332);

      gradient = ctx.createRadialGradient(640, 336, 18, 640, 336, 346);
      gradient.addColorStop(0, "rgba(104, 72, 52, 0.12)");
      gradient.addColorStop(0.46, "rgba(104, 72, 52, 0.04)");
      gradient.addColorStop(1, "rgba(104, 72, 52, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(240, 116, 760, 470);

      ctx.fillStyle = "rgba(190, 178, 158, 0.04)";
      ctx.beginPath();
      ctx.moveTo(448, 200);
      ctx.bezierCurveTo(600, 148, 800, 164, 906, 222);
      ctx.bezierCurveTo(1002, 274, 1016, 344, 936, 394);
      ctx.bezierCurveTo(836, 456, 610, 454, 486, 394);
      ctx.bezierCurveTo(402, 352, 372, 270, 448, 200);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(173, 159, 137, 0.028)";
      ctx.beginPath();
      ctx.moveTo(356, 288);
      ctx.bezierCurveTo(446, 236, 556, 232, 630, 272);
      ctx.bezierCurveTo(694, 308, 696, 364, 626, 400);
      ctx.bezierCurveTo(550, 440, 434, 432, 370, 388);
      ctx.bezierCurveTo(318, 352, 304, 312, 356, 288);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(7, 8, 9, 0.26)";
      for (i = 0; i < skyline.length; i += 1) {
        ctx.fillRect(skyline[i].x, height - skyline[i].height, skyline[i].width, skyline[i].height);
      }

      glowLeft = ctx.createLinearGradient(0, 0, 280, 0);
      glowLeft.addColorStop(0, "rgba(5, 6, 7, 0.22)");
      glowLeft.addColorStop(1, "rgba(5, 6, 7, 0)");
      ctx.fillStyle = glowLeft;
      ctx.fillRect(0, 0, 324, height);

      glowRight = ctx.createLinearGradient(width, 0, width - 320, 0);
      glowRight.addColorStop(0, "rgba(5, 6, 7, 0.20)");
      glowRight.addColorStop(1, "rgba(5, 6, 7, 0)");
      ctx.fillStyle = glowRight;
      ctx.fillRect(width - 360, 0, 360, height);

      gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.06)");
      gradient.addColorStop(0.58, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(202, 176, 140, 0.04)";
      ctx.fillRect(0, 610, width, 2);
      ctx.restore();
      return;
    }

    if (
      G.render.assets &&
      typeof G.render.assets.drawImageCover === "function"
    ) {
      texturedBackground = G.render.assets.drawImageCover(
        ctx,
        TITLE_BACKGROUND_TEXTURE_PATH,
        0,
        0,
        1280,
        720,
        {
          focusX: 0.5,
          focusY: 0.62
        }
      );
    }

    if (texturedBackground) {
      ctx.save();
      gradient = ctx.createLinearGradient(0, 0, 0, 720);
      gradient.addColorStop(0, "rgba(9, 7, 7, 0.08)");
      gradient.addColorStop(0.58, "rgba(19, 12, 12, 0.14)");
      gradient.addColorStop(1, "rgba(8, 7, 7, 0.26)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1280, 720);

      glowLeft = ctx.createLinearGradient(0, 0, 500, 0);
      glowLeft.addColorStop(0, "rgba(12, 10, 10, 0.56)");
      glowLeft.addColorStop(1, "rgba(12, 10, 10, 0)");
      ctx.fillStyle = glowLeft;
      ctx.fillRect(0, 0, 520, 720);

      glowRight = ctx.createLinearGradient(1280, 0, 920, 0);
      glowRight.addColorStop(0, "rgba(12, 10, 10, 0.36)");
      glowRight.addColorStop(1, "rgba(12, 10, 10, 0)");
      ctx.fillStyle = glowRight;
      ctx.fillRect(870, 0, 410, 720);

      ctx.restore();
      return;
    }

    utils.clear(ctx, "#111111");

    ctx.save();
    gradient = ctx.createLinearGradient(0, 0, 1280, 720);
    glowLeft = ctx.createRadialGradient(234, 224, 36, 234, 224, 320);
    glowRight = ctx.createRadialGradient(1030, 178, 34, 1030, 178, 260);
    gradient.addColorStop(0, "#201113");
    gradient.addColorStop(0.48, "#110f12");
    gradient.addColorStop(1, "#181113");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);

    glowLeft.addColorStop(0, "rgba(177, 32, 52, 0.24)");
    glowLeft.addColorStop(1, "rgba(177, 32, 52, 0)");
    ctx.fillStyle = glowLeft;
    ctx.fillRect(0, 0, 620, 520);

    glowRight.addColorStop(0, "rgba(240, 209, 162, 0.12)");
    glowRight.addColorStop(1, "rgba(240, 209, 162, 0)");
    ctx.fillStyle = glowRight;
    ctx.fillRect(760, 0, 420, 360);

    ctx.fillStyle = "rgba(127, 22, 34, 0.16)";
    ctx.beginPath();
    ctx.moveTo(0, 190);
    ctx.lineTo(470, 126);
    ctx.lineTo(620, 180);
    ctx.lineTo(0, 312);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 240, 206, 0.05)";
    ctx.font = "900 214px \"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("九城", 64, 138);

    ctx.strokeStyle = "rgba(255, 240, 206, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(52, 154);
    ctx.lineTo(516, 154);
    ctx.stroke();

    ctx.fillStyle = "rgba(9, 8, 10, 0.92)";
    for (i = 0; i < skyline.length; i += 1) {
      ctx.fillRect(skyline[i].x, 720 - skyline[i].height, skyline[i].width, skyline[i].height);
    }

    ctx.fillStyle = "rgba(240, 209, 162, 0.06)";
    ctx.fillRect(0, 564, 1280, 2);

    ctx.strokeStyle = "rgba(255, 240, 206, 0.06)";
    ctx.beginPath();
    ctx.moveTo(920, 0);
    ctx.lineTo(848, 720);
    ctx.moveTo(1002, 0);
    ctx.lineTo(926, 720);
    ctx.stroke();
    ctx.restore();
  }

  function drawBoundedTexture(ctx, path, x, y, width, height) {
    var entry = null;
    var image = null;

    if (
      !G.render.assets ||
      typeof G.render.assets.getImageEntry !== "function"
    ) {
      return false;
    }

    entry = G.render.assets.getImageEntry(path);
    image = entry && entry.image ? entry.image : null;

    if (!entry || !image || !entry.loaded || entry.failed || !image.complete) {
      return false;
    }

    ctx.save();
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
    return true;
  }

  function drawCoveredTexture(ctx, path, x, y, width, height, options) {
    var used = false;

    if (
      !G.render.assets ||
      typeof G.render.assets.drawImageCover !== "function"
    ) {
      return false;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    used = G.render.assets.drawImageCover(ctx, path, x, y, width, height, options || {});
    ctx.restore();
    return used;
  }

  function drawContainedTexture(ctx, path, x, y, width, height, options) {
    var entry = null;
    var image = null;
    var imageWidth = 1;
    var imageHeight = 1;
    var scale = 1;
    var drawWidth = 0;
    var drawHeight = 0;
    var alignX = 0.5;
    var alignY = 1;
    var drawX = 0;
    var drawY = 0;
    var scaleMultiplier = 1;
    var opts = options || {};

    if (
      !G.render.assets ||
      typeof G.render.assets.getImageEntry !== "function"
    ) {
      return false;
    }

    entry = G.render.assets.getImageEntry(path);
    image = entry && entry.image ? entry.image : null;

    if (!entry || !image || !entry.loaded || entry.failed || !image.complete) {
      return false;
    }

    imageWidth = image.naturalWidth || image.width || 1;
    imageHeight = image.naturalHeight || image.height || 1;
    scale = Math.min(width / imageWidth, height / imageHeight);
    scaleMultiplier = typeof opts.scale === "number" ? opts.scale : 1;
    scale *= scaleMultiplier;
    drawWidth = imageWidth * scale;
    drawHeight = imageHeight * scale;
    alignX = typeof opts.alignX === "number" ? opts.alignX : 0.5;
    alignY = typeof opts.alignY === "number" ? opts.alignY : 1;
    drawX = x + (width - drawWidth) * alignX;
    drawY = y + (height - drawHeight) * alignY;
    drawX += typeof opts.offsetX === "number" ? opts.offsetX : 0;
    drawY += typeof opts.offsetY === "number" ? opts.offsetY : 0;

    ctx.save();
    ctx.globalAlpha = typeof opts.alpha === "number" ? opts.alpha : 1;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
    return true;
  }

  function drawReportTextShade(ctx, x, y, width, height, alpha) {
    var gradient = null;
    var strength = typeof alpha === "number" ? alpha : 0.22;

    ctx.save();
    gradient = ctx.createRadialGradient(
      x + width * 0.5,
      y + height * 0.48,
      Math.max(16, Math.min(width, height) * 0.08),
      x + width * 0.5,
      y + height * 0.5,
      Math.max(width, height) * 0.72
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, " + strength + ")");
    gradient.addColorStop(0.62, "rgba(0, 0, 0, " + (strength * 0.54) + ")");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - width * 0.1, y - height * 0.12, width * 1.2, height * 1.24);
    ctx.restore();
  }

  function traceRoundedPanelPath(ctx, x, y, width, height, radius) {
    var r = Math.max(0, Math.min(radius || 18, width / 2, height / 2));

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawDarkReportPanel(ctx, x, y, width, height) {
    var textured = false;

    ctx.save();
    ctx.fillStyle = "rgba(228, 214, 188, 0.9)";
    ctx.fillRect(x, y, width, height);
    if (G.render.assets && typeof G.render.assets.drawImageCover === "function") {
      textured = G.render.assets.drawImageCover(ctx, REPORT_PANEL_TEXTURE_PATH, x - 78, y - 62, width + 156, height + 124, {
        focusX: 0.5,
        focusY: 0.5
      });
    }
    if (!textured) {
      ctx.fillStyle = "rgba(229, 214, 186, 0.96)";
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = "rgba(104, 76, 43, 0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    }
    ctx.restore();
  }

  function drawCleanPaperPanel(ctx, x, y, width, height) {
    var gradient = null;

    ctx.save();
    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "rgba(232, 220, 201, 0.98)");
    gradient.addColorStop(1, "rgba(219, 205, 183, 0.96)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = "rgba(255, 247, 232, 0.32)";
    ctx.fillRect(x, y, width, 18);
    ctx.strokeStyle = "rgba(118, 86, 53, 0.24)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.restore();
  }

  function drawWoodActionButton(ctx, box, label, subtitle) {
    var textured = false;

    if (G.render.assets && typeof G.render.assets.drawCombatEndTurnButton === "function") {
      G.render.assets.drawCombatEndTurnButton(ctx, box.x, box.y, box.width, box.height, {
        hideStroke: true
      });
      textured = true;
    }

    if (!textured) {
      ctx.save();
      ctx.fillStyle = "#392922";
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.restore();
    }

    G.render.ui.drawLabel(ctx, label, box.x + box.width / 2, box.y + box.height / 2 - (subtitle ? 7 : 1), {
      size: subtitle ? 24 : 28,
      weight: "700",
      align: "center",
      color: "#f3e7d2"
    });

    if (subtitle) {
      G.render.ui.drawLabel(ctx, subtitle, box.x + box.width / 2, box.y + box.height - 16, {
        size: 12,
        align: "center",
        color: "#e1d0bb",
        shadow: false
      });
    }
  }

  function drawMenuPlaqueButton(ctx, box, disabled) {
    var textured = false;
    var shade = null;
    var inset = 4;

    textured = drawBoundedTexture(
      ctx,
      TITLE_BUTTON_TEXTURE_PATH,
      box.x,
      box.y,
      box.width,
      box.height
    );

    ctx.save();
    if (!textured) {
      ctx.fillStyle = disabled ? "#2c2323" : "#4a1414";
      ctx.fillRect(box.x, box.y, box.width, box.height);
    }

    shade = ctx.createLinearGradient(0, box.y, 0, box.y + box.height);
    shade.addColorStop(0, disabled ? "rgba(8, 8, 8, 0.48)" : "rgba(44, 18, 18, 0.14)");
    shade.addColorStop(1, disabled ? "rgba(6, 6, 6, 0.6)" : "rgba(18, 10, 10, 0.28)");
    ctx.fillStyle = shade;
    ctx.fillRect(box.x + inset, box.y + inset, box.width - inset * 2, box.height - inset * 2);
    ctx.strokeStyle = disabled ? "#4c3c35" : "#5c4033";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x + 1, box.y + 1, box.width - 2, box.height - 2);
    ctx.restore();
  }

  function drawMenuWireButton(ctx, box, label, subtitle, disabled) {
    var textured = false;
    var inset = 4;
    var wash = null;

    textured = drawBoundedTexture(
      ctx,
      TITLE_BUTTON_TEXTURE_PATH,
      box.x,
      box.y,
      box.width,
      box.height
    );

    ctx.save();
    if (!textured) {
      ctx.fillStyle = disabled ? "#24201d" : "#2d2521";
      ctx.fillRect(box.x, box.y, box.width, box.height);
    }
    wash = ctx.createLinearGradient(0, box.y, 0, box.y + box.height);
    wash.addColorStop(0, disabled ? "rgba(9, 10, 11, 0.72)" : "rgba(11, 13, 15, 0.64)");
    wash.addColorStop(1, disabled ? "rgba(6, 7, 8, 0.82)" : "rgba(8, 10, 12, 0.74)");
    ctx.fillStyle = wash;
    ctx.fillRect(box.x + inset, box.y + inset, box.width - inset * 2, box.height - inset * 2);
    ctx.strokeStyle = disabled ? "rgba(89, 77, 67, 0.36)" : "rgba(108, 87, 65, 0.46)";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x + 1, box.y + 1, box.width - 2, box.height - 2);
    ctx.restore();

    G.render.ui.drawLabel(ctx, label, box.x + box.width / 2, box.y + Math.round(box.height / 2) + 4, {
      size: box.height >= 60 ? 24 : 22,
      weight: "700",
      align: "center",
      color: disabled ? "#8c8175" : "#e7dac8",
      shadow: false
    });

    if (subtitle) {
      G.render.ui.drawLabel(ctx, subtitle, box.x + box.width / 2, box.y + 15, {
        size: 10,
        weight: "600",
        align: "center",
        color: disabled ? "rgba(148, 136, 123, 0.44)" : "rgba(208, 191, 171, 0.52)",
        shadow: false,
        fontFamily: "\"Space Grotesk\", sans-serif"
      });
    }
  }

  function renderMenuHeader(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(6, 10, 14, 0.94)";
    ctx.fillRect(0, 0, 1280, 52);
    ctx.strokeStyle = "rgba(126, 105, 81, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, 52.5);
    ctx.lineTo(1252, 52.5);
    ctx.stroke();
    ctx.restore();

    G.render.ui.drawLabel(ctx, "\u6c5f\u6e56\u6b8b\u5377", 46, 24, {
      size: 26,
      weight: "700",
      color: "#9d3427",
      shadow: false,
      fontFamily: "\"KGame Song\", serif"
    });
    G.render.ui.drawLabel(ctx, "\u4e3b\u5165\u53e3", 184, 24, {
      size: 12,
      weight: "700",
      color: "#ece0ce",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
  }

  function renderMenuFooter(ctx) {
    ctx.save();
    ctx.strokeStyle = "rgba(126, 105, 81, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, 682.5);
    ctx.lineTo(1252, 682.5);
    ctx.stroke();
    ctx.restore();

    G.render.ui.drawLabel(ctx, "\u57ce\u95e8\u672a\u95ed\uff0c\u5148\u5b9a\u6d41\u6d3e\uff0c\u518d\u5165\u4e5d\u57ce\u3002", 640, 698, {
      size: 8,
      weight: "700",
      align: "center",
      color: "rgba(217, 203, 184, 0.76)",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
  }

  function renderHeader(ctx, state, layout) {
    var utils = G.render.canvasUtils;
    var titleMask = null;
    var titleFont = G.render.ui.getTitleFontFamily ? G.render.ui.getTitleFontFamily() : "\"KGame Ink\", serif";
    var bodyFont = G.render.ui.getBodyFontFamily ? G.render.ui.getBodyFontFamily() : "\"KGame Song\", serif";

    ctx.save();
    titleMask = ctx.createLinearGradient(0, 0, 0, 244);
    titleMask.addColorStop(0, "rgba(0, 0, 0, 0.76)");
    titleMask.addColorStop(0.42, "rgba(0, 0, 0, 0.36)");
    titleMask.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = titleMask;
    ctx.fillRect(0, 0, 1280, 244);
    ctx.restore();

    utils.drawCenteredText(ctx, state.title.heading, 640, layout.headingY, {
      size: 52,
      color: "#f5f1eb",
      weight: "700",
      fontFamily: titleFont,
      shadowColor: "rgba(0, 0, 0, 0.92)",
      shadowBlur: 12
    });
    utils.drawCenteredText(ctx, state.title.subtitle, 640, layout.subtitleY, {
      size: 24,
      color: "#ece2d4",
      weight: "500",
      fontFamily: titleFont,
      shadowColor: "rgba(0, 0, 0, 0.78)",
      shadowBlur: 10
    });
    utils.drawCenteredText(ctx, state.title.prompt, 640, layout.promptY, {
      size: 16,
      color: "#d0c2b0",
      weight: "400",
      fontFamily: bodyFont,
      shadowColor: "rgba(0, 0, 0, 0.66)",
      shadowBlur: 2
    });
  }

  function renderMenuPanel(ctx, state, layout) {
    var lines = state.title.saveSummaryLines || [];
    var i = 0;
    var buttonMeta = state.title.menuItems || [];
    var bodyFont = G.render.ui.getBodyFontFamily ?
      G.render.ui.getBodyFontFamily() :
      "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var buttonRail = {
      x: 782,
      y: 174,
      width: 452,
      height: 388
    };
    var menuOrdinals = ["壹", "贰", "叁", "肆"];

    ctx.save();
    ctx.fillStyle = "rgba(15, 15, 15, 0.85)";
    ctx.fillRect(layout.menuPanel.x, layout.menuPanel.y, layout.menuPanel.width, layout.menuPanel.height);
    ctx.fillRect(layout.menuSummary.x, layout.menuSummary.y, layout.menuSummary.width, layout.menuSummary.height);
    ctx.restore();

    G.render.ui.drawPanel(ctx, layout.menuPanel.x, layout.menuPanel.y, layout.menuPanel.width, layout.menuPanel.height, {
      fill: "rgba(12, 12, 12, 0.9)",
      stroke: "#7e2a32",
      lineWidth: 3,
      surface: "dossier-dark"
    });
    G.render.ui.drawPanel(ctx, layout.menuPanel.x + 22, layout.menuPanel.y + 22, 142, 28, {
      fill: "rgba(122, 38, 47, 0.92)",
      stroke: "#e0c3a1",
      lineWidth: 1,
      surface: "lacquer-red"
    });
    G.render.ui.drawLabel(ctx, "今夜案卷", layout.menuPanel.x + 93, layout.menuPanel.y + 37, {
      size: 13,
      align: "center",
      color: "#fff4e7"
    });
    G.render.ui.drawLabel(ctx, "主菜单", layout.menuPanel.x + 28, layout.menuPanel.y + 34, {
      size: 32,
      color: "#f4ead9"
    });
    drawWrappedText(ctx, state.title.note, layout.menuPanel.x + 28, layout.menuPanel.y + 72, layout.menuPanel.width - 56, 24, {
      size: 18,
      color: "#dbcfbe",
      maxLines: 3
    });
    G.render.ui.drawLabel(ctx, state.title.saveLine, layout.menuPanel.x + 28, layout.menuPanel.y + 170, {
      size: 17,
      color: state.title.continueAvailable ? "#e0bf87" : "#ab9f91"
    });
    G.render.ui.drawLabel(ctx, state.title.settingsLine, layout.menuPanel.x + 28, layout.menuPanel.y + 202, {
      size: 16,
      color: "#b4a99b"
    });

    for (i = 0; i < lines.length; i += 1) {
      G.render.ui.drawLabel(ctx, "• " + lines[i], layout.menuPanel.x + 30, layout.menuPanel.y + 252 + i * 28, {
        size: 17,
        color: "#d6cab7"
      });
    }

    G.render.ui.drawPanel(ctx, buttonRail.x, buttonRail.y, buttonRail.width, buttonRail.height, {
      fill: "rgba(20, 20, 20, 0.9)",
      stroke: "#5c4033",
      lineWidth: 2,
      surface: "dossier-dark"
    });
    G.render.ui.drawPanel(ctx, buttonRail.x + 26, buttonRail.y + 24, 122, 26, {
      fill: "rgba(224, 195, 161, 0.16)",
      stroke: "#d8b17c",
      lineWidth: 1,
      surface: "combat-overlay"
    });
    G.render.ui.drawLabel(ctx, "入城入口", buttonRail.x + 87, buttonRail.y + 38, {
      size: 13,
      align: "center",
      color: "#f7ead5"
    });
    G.render.ui.drawLabel(ctx, "先定路数，再决定是接旧局还是重开。", buttonRail.x + 28, buttonRail.y + 72, {
      size: 16,
      color: "#d6cab7"
    });
    G.render.ui.drawLabel(ctx, "每个入口只做一件事，避免开始菜单继续散成一排空框。", buttonRail.x + 28, buttonRail.y + 98, {
      size: 14,
      color: "#ab9f91"
    });

    G.render.ui.drawPanel(ctx, buttonRail.x + 18, buttonRail.y + 16, buttonRail.width - 36, 106, {
      fill: "rgba(20, 20, 20, 0.96)",
      stroke: "rgba(0,0,0,0)",
      lineWidth: 0
    });

    buttonMeta.forEach(function (button, index) {
      var box = layout.menuButtons[index];
      var titleColor = button.disabled ? "#b3a79a" : "#f3e6d5";
      var ordinalColor = button.disabled ? "#7d7067" : "#c9b79f";

      drawMenuPlaqueButton(ctx, box, button.disabled);
      G.render.ui.drawLabel(ctx, menuOrdinals[index] || "", box.x + 28, box.y + 18, {
        size: 16,
        weight: "700",
        color: ordinalColor,
        shadow: false,
        fontFamily: bodyFont
      });
      G.render.ui.drawLabel(ctx, button.label, box.x + box.width / 2, box.y + box.height / 2 + 1, {
        size: 25,
        weight: "700",
        align: "center",
        color: titleColor,
        shadow: false,
        fontFamily: bodyFont
      });
    });

    G.render.ui.drawPanel(ctx, layout.menuSummary.x, layout.menuSummary.y, layout.menuSummary.width, layout.menuSummary.height, {
      fill: "rgba(12, 12, 12, 0.9)",
      stroke: "#564340",
      surface: "dossier-dark"
    });
    G.render.ui.drawLabel(ctx, "当前边界", layout.menuSummary.x + 24, layout.menuSummary.y + 26, {
      size: 22,
      color: "#f1e6d7"
    });
    G.render.ui.drawLabel(ctx, "6.3 已补主菜单、设置、继续与结算账本。", layout.menuSummary.x + 24, layout.menuSummary.y + 56, {
      size: 16,
      color: "#d5c8b8"
    });
    G.render.ui.drawLabel(ctx, "败退会进败局簿，五卷打通会进终局簿。", layout.menuSummary.x + 24, layout.menuSummary.y + 84, {
      size: 16,
      color: "#d5c8b8"
    });
  }

  function renderMenuPanelV2(ctx, state, layout) {
    var lines = state.title.saveSummaryLines || [];
    var buttonMeta = state.title.menuItems || [];
    var bodyFont = G.render.ui.getBodyFontFamily ?
      G.render.ui.getBodyFontFamily() :
      "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var artBox = { x: 362, y: 144, width: 432, height: 272 };
    var artTexture = false;
    ctx.save();
    ctx.fillStyle = "rgba(7, 12, 18, 0.46)";
    ctx.fillRect(0, 52, 1280, 630);
    ctx.fillStyle = "rgba(6, 10, 15, 0.28)";
    ctx.fillRect(0, 0, 360, 720);
    ctx.fillRect(852, 0, 428, 720);
    ctx.restore();
    var systemCopy = {
      new_run: { label: "杀入九城", subtitle: "OPERATION.START" },
      continue: { label: "继续残局", subtitle: "RESUME.TRIAL" },
      settings: { label: "设置", subtitle: "CONFIGURATION" },
      credits: { label: "风云榜", subtitle: "RANKINGS" }
    };
    var currentBuild = state.title.selectedStyle || "blade";
    var chapterLine = lines[0] || "卷一 // 城门未死";

    G.render.ui.drawPanel(ctx, layout.menuPanel.x, layout.menuPanel.y, layout.menuPanel.width, layout.menuPanel.height, {
      fill: "rgba(214, 199, 178, 0.82)",
      stroke: "rgba(171, 150, 126, 0.64)",
      lineWidth: 1
    });
    G.render.ui.drawLabel(ctx, "DOSSIER // QING_0824", layout.menuPanel.x + 18, layout.menuPanel.y + 24, {
      size: 9,
      weight: "700",
      color: "#756659",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    G.render.ui.drawLabel(ctx, "引档", layout.menuPanel.x + layout.menuPanel.width - 36, layout.menuPanel.y + 26, {
      size: 12,
      weight: "700",
      color: "#a33a2b",
      align: "center",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, "状态", layout.menuPanel.x + 20, layout.menuPanel.y + 66, {
      size: 10,
      weight: "700",
      color: "#938578",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    G.render.ui.drawLabel(ctx, state.title.continueAvailable ? "活跃状态 (ACTIVE)" : "待执行 (STANDBY)", layout.menuPanel.x + 20, layout.menuPanel.y + 92, {
      size: 18,
      weight: "700",
      color: "#342b24",
      shadow: false,
      fontFamily: bodyFont
    });
    G.render.ui.drawLabel(ctx, "章节", layout.menuPanel.x + 20, layout.menuPanel.y + 142, {
      size: 10,
      weight: "700",
      color: "#938578",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    G.render.ui.drawLabel(ctx, chapterLine, layout.menuPanel.x + 20, layout.menuPanel.y + 168, {
      size: 17,
      color: "#342b24",
      shadow: false
    });
    G.render.ui.drawPanel(ctx, layout.menuPanel.x + 20, layout.menuPanel.y + 186, 104, 18, {
      fill: "rgba(16, 25, 35, 0.92)",
      stroke: "rgba(38, 63, 83, 0.35)",
      lineWidth: 1
    });
    G.render.ui.drawLabel(ctx, "SHADOW_STYLE", layout.menuPanel.x + 72, layout.menuPanel.y + 195, {
      size: 9,
      weight: "700",
      color: "#dce8ef",
      align: "center",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    G.render.ui.drawPanel(ctx, layout.menuPanel.x + 132, layout.menuPanel.y + 186, 84, 18, {
      fill: "rgba(147, 98, 42, 0.92)",
      stroke: "rgba(195, 162, 121, 0.35)",
      lineWidth: 1
    });
    G.render.ui.drawLabel(ctx, String(currentBuild).toUpperCase(), layout.menuPanel.x + 174, layout.menuPanel.y + 195, {
      size: 9,
      weight: "700",
      color: "#fff6eb",
      align: "center",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    ctx.save();
    ctx.fillStyle = "rgba(214, 199, 178, 0.92)";
    ctx.fillRect(layout.menuPanel.x + layout.menuPanel.width - 58, layout.menuPanel.y + 16, 44, 22);
    ctx.fillStyle = "rgba(148, 53, 43, 0.18)";
    ctx.fillRect(layout.menuPanel.x + layout.menuPanel.width - 26, layout.menuPanel.y + 18, 2, 18);
    ctx.restore();

    G.render.ui.drawPanel(ctx, artBox.x, artBox.y, artBox.width, artBox.height, {
      fill: "rgba(11, 16, 21, 0.9)",
      stroke: "rgba(51, 70, 79, 0.24)",
      lineWidth: 1
    });
    artTexture = drawBoundedTexture(
      ctx,
      TITLE_BACKGROUND_TEXTURE_PATH,
      artBox.x,
      artBox.y,
      artBox.width,
      artBox.height
    );
    if (!artTexture) {
      ctx.save();
      ctx.fillStyle = "rgba(22, 34, 40, 0.8)";
      ctx.fillRect(artBox.x + 1, artBox.y + 1, artBox.width - 2, artBox.height - 2);
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = "rgba(7, 12, 18, 0.34)";
    ctx.fillRect(artBox.x, artBox.y, artBox.width, artBox.height);
    ctx.fillStyle = "rgba(230, 235, 238, 0.06)";
    ctx.font = "700 48px \"Space Grotesk\", sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NINE CITIES", artBox.x + artBox.width / 2, artBox.y + artBox.height - 56);
    ctx.restore();
    G.render.ui.drawLabel(ctx, "CITY GATE // 01", artBox.x + 18, artBox.y + 18, {
      size: 10,
      weight: "700",
      color: "rgba(226, 231, 233, 0.76)",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });

    buttonMeta.forEach(function (button, index) {
      var box = layout.menuButtons[index];
      var copy = systemCopy[button.id] || { label: button.label, subtitle: "" };

      if (button.id === "new_run") {
        drawMenuPlaqueButton(ctx, box, button.disabled);
        G.render.ui.drawLabel(ctx, copy.subtitle, box.x + box.width / 2, box.y + 18, {
          size: 10,
          weight: "700",
          align: "center",
          color: "rgba(244, 224, 205, 0.56)",
          shadow: false,
          fontFamily: "\"Space Grotesk\", sans-serif"
        });
        G.render.ui.drawLabel(ctx, copy.label, box.x + box.width / 2, box.y + 45, {
          size: 31,
          weight: "700",
          align: "center",
          color: "#fff1e2",
          shadow: false,
          fontFamily: bodyFont
        });
      } else {
        drawMenuWireButton(ctx, box, copy.label, copy.subtitle, button.disabled);
      }
    });

    return;

    G.render.ui.drawPanel(ctx, layout.menuSummary.x, layout.menuSummary.y, layout.menuSummary.width, layout.menuSummary.height, {
      fill: "rgba(13, 18, 23, 0.92)",
      stroke: "rgba(65, 83, 92, 0.28)",
      lineWidth: 1
    });
    G.render.ui.drawLabel(ctx, "LAST_DISCOVERY", layout.menuSummary.x + 18, layout.menuSummary.y + 22, {
      size: 10,
      weight: "700",
      color: "#e6d5c0",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    G.render.ui.drawLabel(ctx, lines[1] || "九华里 (Absorbwork Tier)", layout.menuSummary.x + 18, layout.menuSummary.y + 48, {
      size: 13,
      color: "#c5b39f",
      shadow: false
    });
  }

  function renderMenuPanelV3(ctx, state, layout) {
    var buttonMeta = state.title.menuItems || [];
    var lines = state.title.saveSummaryLines || [];
    var bodyFont = G.render.ui.getBodyFontFamily ?
      G.render.ui.getBodyFontFamily() :
      "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var showArchiveSlip = !!state.title.continueAvailable;
    var statusBox = showArchiveSlip ?
      { x: 34, y: 398, width: 224, height: 196 } :
      layout.menuPanel;
    var archiveLine = state.title.continueAvailable ?
      (lines[0] || "\u5b58\u6863\u5df2\u5c31\u7eea") :
      "\u6682\u65e0\u53ef\u7eed\u5b58\u6863";
    var statusLabel = state.title.continueAvailable ? "\u53ef\u7eed\u5c40" : "\u672a\u542f\u7a0b";
    var currentBuild = findStyleOption(state.title.selectedStyle || "blade").name;
    var systemCopy = {
      new_run: { label: "\u6740\u5165\u4e5d\u57ce", subtitle: "" },
      continue: { label: "\u7ee7\u7eed\u6b8b\u5c40", subtitle: "" },
      settings: { label: "\u8bbe\u7f6e", subtitle: "" },
      credits: { label: "\u98ce\u4e91\u699c", subtitle: "" }
    };

    ctx.save();
    ctx.fillStyle = "rgba(10, 14, 19, 0.12)";
    ctx.fillRect(0, 52, 1280, 630);
    ctx.restore();

    if (showArchiveSlip) {
      ctx.save();
      ctx.fillStyle = "rgba(13, 15, 18, 0.62)";
      ctx.fillRect(statusBox.x, statusBox.y, statusBox.width, statusBox.height);
      ctx.strokeStyle = "rgba(128, 109, 86, 0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(statusBox.x + 0.5, statusBox.y + 0.5, statusBox.width - 1, statusBox.height - 1);
      ctx.fillStyle = "rgba(214, 191, 156, 0.055)";
      ctx.fillRect(statusBox.x + 1, statusBox.y + 1, statusBox.width - 2, 24);
      ctx.fillStyle = "rgba(150, 110, 68, 0.30)";
      ctx.fillRect(statusBox.x + 12, statusBox.y + 36, 2, statusBox.height - 54);
      ctx.restore();

      G.render.ui.drawLabel(ctx, "\u6848\u5377 0824", statusBox.x + 18, statusBox.y + 17, {
        size: 9,
        weight: "700",
        color: "rgba(217, 204, 186, 0.6)",
        shadow: false,
        fontFamily: "\"Space Grotesk\", sans-serif"
      });
      G.render.ui.drawLabel(ctx, "\u72b6\u6001", statusBox.x + 28, statusBox.y + 52, {
        size: 9,
        weight: "700",
        color: "rgba(160, 173, 184, 0.54)",
        shadow: false,
        fontFamily: "\"Space Grotesk\", sans-serif"
      });
      G.render.ui.drawLabel(ctx, statusLabel, statusBox.x + 28, statusBox.y + 78, {
        size: 17,
        weight: "700",
        color: "#ece2d2",
        shadow: false,
        fontFamily: bodyFont
      });
      G.render.ui.drawLabel(ctx, "\u5b58\u6863", statusBox.x + 28, statusBox.y + 108, {
        size: 9,
        weight: "700",
        color: "rgba(160, 173, 184, 0.54)",
        shadow: false,
        fontFamily: "\"Space Grotesk\", sans-serif"
      });
      drawWrappedText(ctx, archiveLine, statusBox.x + 28, statusBox.y + 130, statusBox.width - 46, 18, {
        size: 14,
        color: "#d7cab6",
        shadow: false,
        maxLines: 2
      });
      ctx.save();
      ctx.fillStyle = "rgba(12, 19, 26, 0.84)";
      ctx.fillRect(statusBox.x + 28, statusBox.y + 158, 72, 16);
      ctx.strokeStyle = "rgba(52, 75, 92, 0.28)";
      ctx.lineWidth = 1;
      ctx.strokeRect(statusBox.x + 28.5, statusBox.y + 158.5, 71, 15);
      ctx.fillStyle = "rgba(134, 96, 48, 0.88)";
      ctx.fillRect(statusBox.x + 106, statusBox.y + 158, 92, 16);
      ctx.strokeStyle = "rgba(195, 162, 121, 0.28)";
      ctx.strokeRect(statusBox.x + 106.5, statusBox.y + 158.5, 91, 15);
      ctx.restore();
      G.render.ui.drawLabel(ctx, "\u6d41\u6d3e", statusBox.x + 64, statusBox.y + 166, {
        size: 8,
        weight: "700",
        align: "center",
        color: "#dce8ef",
        shadow: false,
        fontFamily: "\"Space Grotesk\", sans-serif"
      });
      G.render.ui.drawLabel(ctx, currentBuild, statusBox.x + 152, statusBox.y + 166, {
        size: 8,
        weight: "700",
        align: "center",
        color: "#fff6eb",
        shadow: false,
        fontFamily: "\"Space Grotesk\", sans-serif"
      });
    }

    buttonMeta.forEach(function (button, index) {
      var box = layout.menuButtons[index];
      var copy = systemCopy[button.id] || { label: button.label, subtitle: "" };

      if (button.id === "new_run") {
        drawMenuPlaqueButton(ctx, box, button.disabled);
        G.render.ui.drawLabel(ctx, copy.label, box.x + box.width / 2, box.y + Math.round(box.height / 2) + 4, {
          size: 31,
          weight: "700",
          align: "center",
          color: "#fff1e2",
          shadow: false,
          fontFamily: bodyFont
        });
      } else {
        drawMenuWireButton(ctx, box, copy.label, copy.subtitle, button.disabled);
      }
    });
  }

  function renderStyleCard(ctx, option, box, selected) {
    var textured = false;
    var wash = null;

    if (selected) {
      ctx.save();
      ctx.fillStyle = "rgba(233, 225, 214, 0.96)";
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeStyle = option.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.width - 1, box.height - 1);
      ctx.fillStyle = option.accent;
      ctx.fillRect(box.x + box.width - 32, box.y + 10, 18, 18);
      ctx.restore();

      G.render.ui.drawLabel(ctx, "定", box.x + box.width - 23, box.y + 19, {
        size: 10,
        weight: "700",
        align: "center",
        color: "#fff7ec",
        shadow: false
      });
      G.render.ui.drawLabel(ctx, option.name, box.x + 24, box.y + 22, {
        size: 28,
        color: "#231915",
        shadow: false
      });
      G.render.ui.drawLabel(ctx, option.theme, box.x + 24, box.y + 40, {
        size: 12,
        color: option.accent,
        shadow: false,
        fontFamily: "\"Space Grotesk\", sans-serif"
      });
      return;
    }

    textured = drawBoundedTexture(
      ctx,
      TITLE_BUTTON_TEXTURE_PATH,
      box.x,
      box.y,
      box.width,
      box.height
    );

    ctx.save();
    if (!textured) {
      ctx.fillStyle = "rgba(25, 24, 26, 0.95)";
      ctx.fillRect(box.x, box.y, box.width, box.height);
    }
    wash = ctx.createLinearGradient(0, box.y, 0, box.y + box.height);
    wash.addColorStop(0, "rgba(10, 10, 12, 0.28)");
    wash.addColorStop(1, "rgba(5, 5, 6, 0.56)");
    ctx.fillStyle = wash;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeStyle = "rgba(191, 171, 142, 0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.width - 1, box.height - 1);
    ctx.restore();

    G.render.ui.drawLabel(ctx, option.name, box.x + 24, box.y + 22, {
      size: 22,
      color: "#f1e4d3",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, option.keyword, box.x + box.width - 20, box.y + 34, {
      size: 10,
      weight: "700",
      align: "right",
      color: "rgba(225, 207, 180, 0.56)",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
  }

  function renderPreviewCard(ctx, card, x, y, width, height, accent) {
    drawCleanPaperPanel(ctx, x, y, width, height);
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.fillStyle = accent;
    ctx.fillRect(x + 10, y + 10, 24, 20);
    ctx.restore();
    G.render.ui.drawLabel(ctx, String(card.cost), x + 22, y + 20, {
      size: 12,
      weight: "700",
      align: "center",
      color: "#fff7eb",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, card.name, x + 16, y + 42, {
      size: 16,
      color: "#241b16",
      shadow: false
    });
    drawWrappedText(ctx, card.text, x + 16, y + 66, width - 32, 15, {
      size: 11,
      color: "#5b4939",
      shadow: false,
      maxLines: 4
    });
  }

  function renderStyleDetails(ctx, state, layout) {
    var selected = getSelectedOption(state);
    var panel = layout.styleDossier;
    var previewCards = (selected.previewCards || []).slice(0, 2);
    var previewWidth = 156;
    var previewGap = 16;
    var previewX = panel.x + 18;
    var contentX = panel.x + 22;
    var chipY = panel.y + 108;
    var i = 0;

    drawCleanPaperPanel(ctx, panel.x, panel.y, panel.width, panel.height);
    ctx.save();
    ctx.strokeStyle = "rgba(125, 89, 54, 0.20)";
    ctx.lineWidth = 1;
    ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.width - 1, panel.height - 1);
    ctx.strokeStyle = selected.accent;
    ctx.beginPath();
    ctx.moveTo(panel.x + 22, panel.y + 142.5);
    ctx.lineTo(panel.x + panel.width - 22, panel.y + 142.5);
    ctx.stroke();
    ctx.restore();

    G.render.ui.drawLabel(ctx, "流派案卷 / 杀法定档", contentX, panel.y + 20, {
      size: 10,
      weight: "700",
      color: "#7a6251",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    G.render.ui.drawLabel(ctx, selected.name, contentX, panel.y + 48, {
      size: 34,
      color: "#221914",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, selected.theme, contentX, panel.y + 86, {
      size: 16,
      color: selected.accent,
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });

    ctx.save();
    ctx.fillStyle = hexToRgba(selected.accent, 0.10);
    ctx.fillRect(contentX, chipY, 84, 22);
    ctx.fillStyle = "rgba(33, 25, 20, 0.10)";
    ctx.fillRect(contentX + 96, chipY, 84, 22);
    ctx.strokeStyle = hexToRgba(selected.accent, 0.28);
    ctx.lineWidth = 1;
    ctx.strokeRect(contentX + 0.5, chipY + 0.5, 83, 21);
    ctx.strokeStyle = "rgba(118, 86, 53, 0.18)";
    ctx.strokeRect(contentX + 96.5, chipY + 0.5, 83, 21);
    ctx.restore();
    G.render.ui.drawLabel(ctx, "烈度  " + selected.pressureLabel, contentX + 42, chipY + 11, {
      size: 11,
      weight: "700",
      align: "center",
      color: "#3c2f25",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, "驾驭  " + selected.complexityLabel, contentX + 138, chipY + 11, {
      size: 11,
      weight: "700",
      align: "center",
      color: "#524438",
      shadow: false
    });

    G.render.ui.drawLabel(ctx, "要诀", contentX, panel.y + 166, {
      size: 10,
      weight: "700",
      color: "#7a6251",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    drawWrappedText(ctx, selected.killerLine, contentX, panel.y + 188, panel.width - 44, 24, {
      size: 20,
      color: "#231915",
      shadow: false,
      maxLines: 2
    });
    G.render.ui.drawLabel(ctx, "路数", contentX, panel.y + 254, {
      size: 10,
      weight: "700",
      color: "#7a6251",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    drawWrappedText(ctx, selected.summary, contentX, panel.y + 276, panel.width - 44, 20, {
      size: 15,
      color: "#5c4938",
      shadow: false,
      maxLines: 3
    });
    G.render.ui.drawLabel(ctx, "关键词：" + selected.keyword, contentX, panel.y + 354, {
      size: 14,
      color: selected.accent,
      shadow: false
    });
    G.render.ui.drawLabel(ctx, "起手套牌", contentX, panel.y + 382, {
      size: 10,
      weight: "700",
      color: "#7a6251",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });

    for (i = 0; i < previewCards.length; i += 1) {
      renderPreviewCard(
        ctx,
        previewCards[i],
        previewX + i * (previewWidth + previewGap),
        panel.y + 406,
        previewWidth,
        110,
        selected.accent
      );
    }
  }

  function renderStyleButtons(ctx, state, layout) {
    var selected = getSelectedOption(state);

    drawMenuPlaqueButton(ctx, layout.startButton, false);
    ctx.save();
    ctx.fillStyle = "rgba(155, 42, 54, 0.24)";
    ctx.fillRect(layout.startButton.x, layout.startButton.y, layout.startButton.width, layout.startButton.height);
    ctx.restore();
    G.render.ui.drawLabel(ctx, state.title.startLabel, layout.startButton.x + layout.startButton.width / 2, layout.startButton.y + 26, {
      size: 28,
      align: "center",
      color: "#fff5e7",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, "当前：" + selected.name, layout.startButton.x + layout.startButton.width / 2, layout.startButton.y + 56, {
      size: 14,
      align: "center",
      color: "#f0dfc8",
      shadow: false
    });

    drawMenuWireButton(ctx, layout.backButton, state.title.backLabel, "", false);
  }

  function renderStyles(ctx, state, layout) {
    var boxes = getStyleBoxes(layout);
    var selectedStyle = state.title.selectedStyle;
    var selected = getSelectedOption(state);
    var heroBox = layout.styleHero;
    var portraitPath = getStylePortraitPath(selected.id);
    var portraitLayout = getStylePortraitLayout(selected.id);
    var i = 0;

    ctx.save();
    ctx.fillStyle = "rgba(6, 7, 9, 0.56)";
    ctx.fillRect(0, 0, 792, 720);
    ctx.restore();

    ctx.save();
    var leftShade = ctx.createLinearGradient(0, 0, 812, 0);
    leftShade.addColorStop(0, "rgba(4, 4, 5, 0.78)");
    leftShade.addColorStop(1, "rgba(4, 4, 5, 0.18)");
    ctx.fillStyle = leftShade;
    ctx.fillRect(0, 0, 812, 720);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = hexToRgba(selected.accent, 0.08);
    ctx.font = "900 112px \"KGame Ink\", serif";
    ctx.translate(118, 560);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(selected.name, 0, 0);
    ctx.restore();

    G.render.ui.drawLabel(ctx, "卷首定档", heroBox.x + 8, heroBox.y + 12, {
      size: 10,
      weight: "700",
      color: "rgba(224, 208, 187, 0.66)",
      shadow: false,
      fontFamily: "\"Space Grotesk\", sans-serif"
    });
    G.render.ui.drawLabel(ctx, "杀入九城前，先选一门活命手艺。", heroBox.x + 8, heroBox.y + 30, {
      size: 16,
      color: "#d9cbb7",
      shadow: false
    });

    ctx.save();
    var styleGlow = ctx.createRadialGradient(heroBox.x + 182, heroBox.y + 244, 28, heroBox.x + 182, heroBox.y + 244, 224);
    styleGlow.addColorStop(0, hexToRgba(selected.accent, 0.18));
    styleGlow.addColorStop(0.55, hexToRgba(selected.accent, 0.07));
    styleGlow.addColorStop(1, hexToRgba(selected.accent, 0));
    ctx.fillStyle = styleGlow;
    ctx.fillRect(heroBox.x - 40, heroBox.y + 40, heroBox.width + 180, heroBox.height - 60);
    ctx.restore();

    drawReportTextShade(ctx, heroBox.x - 40, heroBox.y + 42, heroBox.width + 160, heroBox.height - 40, 0.28);
    drawContainedTexture(ctx, portraitPath, heroBox.x + 6, heroBox.y + 34, heroBox.width + 14, heroBox.height - 36, {
      alignX: 0.5,
      alignY: 1,
      scale: portraitLayout.scale,
      offsetX: portraitLayout.offsetX,
      offsetY: portraitLayout.offsetY
    });

    ctx.save();
    var heroShade = ctx.createLinearGradient(heroBox.x + 180, 0, heroBox.x + 500, 0);
    heroShade.addColorStop(0, "rgba(4, 4, 5, 0)");
    heroShade.addColorStop(1, "rgba(4, 4, 5, 0.78)");
    ctx.fillStyle = heroShade;
    ctx.fillRect(heroBox.x + 180, heroBox.y + 10, 320, heroBox.height);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(139, 112, 84, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(heroBox.x + 20, heroBox.y + heroBox.height - 20.5);
    ctx.lineTo(heroBox.x + 224, heroBox.y + heroBox.height - 20.5);
    ctx.stroke();
    ctx.restore();

    for (i = 0; i < boxes.length; i += 1) {
      renderStyleCard(ctx, state.title.options[i], boxes[i], boxes[i].id === selectedStyle);
    }

    renderStyleDetails(ctx, state, layout);
    renderStyleButtons(ctx, state, layout);
  }

  function renderSettings(ctx, state, layout) {
    var volumePercent = Math.round((state.settings.volume || 0) * 100);
    var qualityLabel = state.settings.quality === "low" ? "低" : "高";

    G.render.ui.drawPanel(ctx, layout.settingsPanel.x, layout.settingsPanel.y, layout.settingsPanel.width, layout.settingsPanel.height, {
      fill: "rgba(19, 17, 18, 0.95)",
      stroke: "#7e2a32",
      lineWidth: 3,
      surface: "dossier-dark"
    });
    G.render.ui.drawLabel(ctx, "设置", layout.settingsPanel.x + 34, layout.settingsPanel.y + 40, {
      size: 34,
      color: "#f4ead9"
    });
    drawWrappedText(ctx, state.title.note, layout.settingsPanel.x + 34, layout.settingsPanel.y + 78, layout.settingsPanel.width - 68, 24, {
      size: 17,
      color: "#d9cdbc",
      maxLines: 3
    });

    G.render.ui.drawLabel(ctx, "音量", layout.settingsPanel.x + 74, layout.settingsPanel.y + 146, {
      size: 22,
      color: "#f0e5d6"
    });
    G.render.ui.drawButton(ctx, {
      x: layout.volumeMinus.x,
      y: layout.volumeMinus.y,
      width: layout.volumeMinus.width,
      height: layout.volumeMinus.height,
      label: "－",
      fill: "#352726",
      stroke: "#a07d62"
    });
    G.render.ui.drawPanel(ctx, 446, 290, 338, 60, {
      fill: "rgba(24, 21, 22, 0.95)",
      stroke: "#8a5844",
      surface: "combat-overlay"
    });
    G.render.ui.drawLabel(ctx, volumePercent + "%", 615, 321, {
      size: 28,
      align: "center",
      color: "#f7ecdd"
    });
    G.render.ui.drawButton(ctx, {
      x: layout.volumePlus.x,
      y: layout.volumePlus.y,
      width: layout.volumePlus.width,
      height: layout.volumePlus.height,
      label: "＋",
      fill: "#352726",
      stroke: "#a07d62"
    });

    G.render.ui.drawLabel(ctx, "画质", layout.settingsPanel.x + 74, layout.settingsPanel.y + 254, {
      size: 22,
      color: "#f0e5d6"
    });
    G.render.ui.drawButton(ctx, {
      x: layout.qualityButton.x,
      y: layout.qualityButton.y,
      width: layout.qualityButton.width,
      height: layout.qualityButton.height,
      label: "当前画质：" + qualityLabel + "（点击切换）",
      fill: state.settings.quality === "low" ? "#3f3320" : "#352726",
      stroke: state.settings.quality === "low" ? "#c9a45f" : "#a07d62"
    });

    G.render.ui.drawLabel(ctx, "低画质会关闭平滑，方便老机器稳住。", layout.settingsPanel.x + 74, layout.settingsPanel.y + 314, {
      size: 15,
      color: "#baa999"
    });
    G.render.ui.drawLabel(ctx, "这两项都会立即写入本地，不需要额外确认。", layout.settingsPanel.x + 74, layout.settingsPanel.y + 338, {
      size: 15,
      color: "#baa999"
    });

    G.render.ui.drawButton(ctx, {
      x: layout.settingsBack.x,
      y: layout.settingsBack.y,
      width: layout.settingsBack.width,
      height: layout.settingsBack.height,
      label: "返回主菜单",
      fill: "#2f2625",
      stroke: "#a88a6d"
    });
  }

  function renderCredits(ctx, state, layout) {
    var rows = state.title.creditRows || [];
    var i = 0;

    G.render.ui.drawPanel(ctx, layout.creditsPanel.x, layout.creditsPanel.y, layout.creditsPanel.width, layout.creditsPanel.height, {
      fill: "rgba(19, 17, 18, 0.95)",
      stroke: "#7e2a32",
      lineWidth: 3,
      surface: "dossier-dark"
    });
    G.render.ui.drawLabel(ctx, "风云榜", layout.creditsPanel.x + 36, layout.creditsPanel.y + 42, {
      size: 34,
      color: "#f4ead9"
    });
    G.render.ui.drawLabel(ctx, "当前构建的制作名单与落地说明", layout.creditsPanel.x + 36, layout.creditsPanel.y + 76, {
      size: 18,
      color: "#d9cdbc"
    });

    for (i = 0; i < rows.length; i += 1) {
      G.render.ui.drawPanel(ctx, layout.creditsPanel.x + 34, layout.creditsPanel.y + 118 + i * 50, layout.creditsPanel.width - 68, 40, {
        fill: "rgba(24, 21, 22, 0.94)",
        stroke: "#5c4541",
        surface: "combat-overlay"
      });
      G.render.ui.drawLabel(ctx, rows[i].role, layout.creditsPanel.x + 56, layout.creditsPanel.y + 138 + i * 50, {
        size: 18,
        color: "#e6d8c2"
      });
      G.render.ui.drawLabel(ctx, rows[i].value, layout.creditsPanel.x + layout.creditsPanel.width - 56, layout.creditsPanel.y + 138 + i * 50, {
        size: 18,
        align: "right",
        color: "#c7b29b"
      });
    }

    G.render.ui.drawLabel(ctx, state.title.note, 640, layout.creditsPanel.y + layout.creditsPanel.height - 28, {
      size: 15,
      align: "center",
      color: "#ab9f91"
    });

    G.render.ui.drawButton(ctx, {
      x: layout.creditsBack.x,
      y: layout.creditsBack.y,
      width: layout.creditsBack.width,
      height: layout.creditsBack.height,
      label: "返回主菜单",
      fill: "#2f2625",
      stroke: "#a88a6d"
    });
  }

  function renderReportLegacy(ctx, state, layout) {
    var report = state.runReport || {};
    var rows = Array.isArray(report.summaryRows) ? report.summaryRows : [];
    var detailLines = Array.isArray(report.detailLines) ? report.detailLines : [];
    var buttons = Array.isArray(report.buttons) ? report.buttons : [];
    var badgeFill = report.outcome === "victory" ? "#4c3b1a" : "#5f1e26";
    var badgeStroke = report.outcome === "victory" ? "#e3c285" : "#e0b7a0";
    var badgeLabel = report.outcome === "victory" ? "打通" : "败退";
    var i = 0;
    var rowY = 0;
    var detailY = 0;
    var box = null;
    var button = null;

    G.render.ui.drawPanel(ctx, layout.reportPanel.x, layout.reportPanel.y, layout.reportPanel.width, layout.reportPanel.height, {
      fill: "rgba(19, 17, 18, 0.95)",
      stroke: "#7e2a32",
      lineWidth: 3
    });
    G.render.ui.drawPanel(ctx, layout.reportPanel.x + layout.reportPanel.width - 146, layout.reportPanel.y + 24, 104, 32, {
      fill: badgeFill,
      stroke: badgeStroke,
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, badgeLabel, layout.reportPanel.x + layout.reportPanel.width - 94, layout.reportPanel.y + 44, {
      size: 16,
      align: "center",
      color: "#fff1de"
    });
    G.render.ui.drawLabel(ctx, report.title || "收口账本", layout.reportPanel.x + 34, layout.reportPanel.y + 42, {
      size: 34,
      color: "#f4ead9"
    });
    G.render.ui.drawLabel(ctx, report.styleName ? ("流派：" + report.styleName) : "流派未定", layout.reportPanel.x + 34, layout.reportPanel.y + 76, {
      size: 17,
      color: "#d9cdbc"
    });
    drawWrappedText(ctx, state.title.note, layout.reportPanel.x + 34, layout.reportPanel.y + 112, layout.reportPanel.width - 68, 24, {
      size: 17,
      color: "#d9cdbc",
      maxLines: 2
    });

    rowY = layout.reportPanel.y + 174;
    for (i = 0; i < rows.length; i += 1) {
      G.render.ui.drawPanel(ctx, layout.reportPanel.x + 34, rowY + i * 40, 382, 30, {
        fill: "rgba(24, 21, 22, 0.92)",
        stroke: "#5c4541"
      });
      G.render.ui.drawLabel(ctx, rows[i].label, layout.reportPanel.x + 52, rowY + 19 + i * 40, {
        size: 16,
        color: "#e6d8c2"
      });
      G.render.ui.drawLabel(ctx, rows[i].value, layout.reportPanel.x + 396, rowY + 19 + i * 40, {
        size: 16,
        align: "right",
        color: "#cdb79c"
      });
    }

    G.render.ui.drawPanel(ctx, layout.reportPanel.x + 456, layout.reportPanel.y + 172, 506, 236, {
      fill: "rgba(18, 18, 18, 0.94)",
      stroke: "#5c4541"
    });
    G.render.ui.drawLabel(ctx, "本局回顾", layout.reportPanel.x + 482, layout.reportPanel.y + 198, {
      size: 22,
      color: "#f1e6d7"
    });
    detailY = layout.reportPanel.y + 234;
    for (i = 0; i < detailLines.length; i += 1) {
      drawWrappedText(ctx, "• " + detailLines[i], layout.reportPanel.x + 484, detailY, 458, 24, {
        size: 16,
        color: "#d6cab7",
        maxLines: 2
      });
      detailY += 46;
    }

    for (i = 0; i < layout.reportButtons.length; i += 1) {
      box = layout.reportButtons[i];
      button = buttons[i];
      if (!button) {
        continue;
      }

      G.render.ui.drawButton(ctx, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        label: button.label,
        fill: button.id === "retry" ? "#7a262f" : "#2f2625",
        stroke: button.id === "retry" ? "#e0c3a1" : "#a88a6d"
      });
      G.render.ui.drawLabel(ctx, button.subtitle, box.x + box.width / 2, box.y + 50, {
        size: 12,
        align: "center",
        color: "#eadcca"
      });
    }
  }

  function renderReport(ctx, state, layout) {
    var report = state.runReport || {};
    var rows = Array.isArray(report.summaryRows) ? report.summaryRows : [];
    var detailLines = Array.isArray(report.detailLines) ? report.detailLines : [];
    var buttons = Array.isArray(report.buttons) ? report.buttons : [];
    var panelX = layout.reportPanel.x;
    var panelY = layout.reportPanel.y;
    var panelWidth = layout.reportPanel.width;
    var panelHeight = layout.reportPanel.height;
    var dividerX = panelX + 446;
    var leftX = panelX + 38;
    var rightX = dividerX + 36;
    var rightWidth = panelX + panelWidth - rightX - 32;
    var badgeX = panelX + panelWidth - 172;
    var badgeY = panelY + 28;
    var badgeWidth = 132;
    var badgeHeight = 38;
    var titleColor = "#24120d";
    var textColor = "#342019";
    var mutedColor = "#62453b";
    var accentColor = report.outcome === "victory" ? "#8f5a26" : "#8a2630";
    var accentFill = report.outcome === "victory" ? "rgba(116, 72, 25, 0.24)" : "rgba(120, 23, 35, 0.28)";
    var badgeLabel = report.outcome === "victory" ? "打通" : "战殁";
    var summaryTitle = report.outcome === "victory" ? "终局账目" : "收口账目";
    var headerNote = state.title.note || report.note || "";
    var subtitle = report.subtitle || state.title.subtitle || "";
    var textureUsed = false;
    var wash = null;
    var dividerGradient = null;
    var rowY = 0;
    var detailY = 0;
    var i = 0;
    var box = null;
    var button = null;

    textureUsed = drawCoveredTexture(
      ctx,
      REPORT_BACKGROUND_TEXTURE_PATH,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      {
        focusX: 0.5,
        focusY: 0.26
      }
    );

    ctx.save();
    if (!textureUsed) {
      wash = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
      wash.addColorStop(0, "rgba(229, 205, 179, 0.96)");
      wash.addColorStop(0.58, "rgba(212, 182, 156, 0.92)");
      wash.addColorStop(1, "rgba(112, 49, 42, 0.62)");
      ctx.fillStyle = wash;
      ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    } else {
      wash = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
      wash.addColorStop(0, "rgba(247, 231, 207, 0.86)");
      wash.addColorStop(0.54, "rgba(235, 212, 187, 0.78)");
      wash.addColorStop(1, "rgba(132, 55, 49, 0.34)");
      ctx.fillStyle = wash;
      ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    }
    ctx.strokeStyle = "rgba(97, 38, 35, 0.88)";
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX + 1.5, panelY + 1.5, panelWidth - 3, panelHeight - 3);
    ctx.strokeStyle = "rgba(255, 239, 216, 0.32)";
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 10.5, panelY + 10.5, panelWidth - 21, panelHeight - 21);

    ctx.fillStyle = accentFill;
    ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(badgeX + 1, badgeY + 1, badgeWidth - 2, badgeHeight - 2);

    dividerGradient = ctx.createLinearGradient(dividerX, panelY + 154, dividerX, panelY + panelHeight - 42);
    dividerGradient.addColorStop(0, "rgba(134, 48, 44, 0.18)");
    dividerGradient.addColorStop(0.12, "rgba(96, 50, 42, 0.62)");
    dividerGradient.addColorStop(0.5, "rgba(255, 240, 214, 0.42)");
    dividerGradient.addColorStop(1, "rgba(91, 33, 31, 0.58)");
    ctx.strokeStyle = dividerGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dividerX, panelY + 156);
    ctx.lineTo(dividerX, panelY + panelHeight - 40);
    ctx.stroke();

    ctx.strokeStyle = "rgba(110, 52, 46, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX, panelY + 160);
    ctx.lineTo(dividerX - 24, panelY + 160);
    ctx.moveTo(rightX, panelY + 160);
    ctx.lineTo(panelX + panelWidth - 34, panelY + 160);
    ctx.stroke();
    ctx.restore();

    G.render.ui.drawLabel(ctx, badgeLabel, badgeX + badgeWidth / 2, badgeY + 24, {
      size: 16,
      align: "center",
      color: "#f8e7d2"
    });
    G.render.ui.drawLabel(ctx, report.title || "收口账本", leftX, panelY + 48, {
      size: 34,
      color: titleColor
    });
    G.render.ui.drawLabel(ctx, report.styleName ? ("流派：" + report.styleName) : "流派未定", leftX, panelY + 82, {
      size: 17,
      color: mutedColor
    });
    if (subtitle) {
      G.render.ui.drawLabel(ctx, subtitle, leftX, panelY + 112, {
        size: 16,
        color: "#6f4d41"
      });
    }
    drawWrappedText(ctx, headerNote, leftX, panelY + 138, panelWidth - 236, 22, {
      size: 15,
      color: "#6a4e44",
      maxLines: 2
    });

    G.render.ui.drawLabel(ctx, summaryTitle, leftX, panelY + 188, {
      size: 22,
      color: accentColor
    });
    G.render.ui.drawLabel(ctx, "本局回顾", rightX, panelY + 188, {
      size: 22,
      color: accentColor
    });

    rowY = panelY + 226;
    for (i = 0; i < rows.length; i += 1) {
      G.render.ui.drawLabel(ctx, rows[i].label, leftX + 4, rowY + i * 28, {
        size: 16,
        color: textColor
      });
      G.render.ui.drawLabel(ctx, rows[i].value, dividerX - 24, rowY + i * 28, {
        size: 16,
        align: "right",
        color: i === 1 ? accentColor : "#51362f"
      });

      ctx.save();
      ctx.strokeStyle = i === rows.length - 1 ? "rgba(98, 47, 42, 0.16)" : "rgba(98, 47, 42, 0.24)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftX, rowY + 12 + i * 28);
      ctx.lineTo(dividerX - 22, rowY + 12 + i * 28);
      ctx.stroke();
      ctx.restore();
    }

    detailY = panelY + 226;
    for (i = 0; i < detailLines.length; i += 1) {
      G.render.ui.drawLabel(ctx, "•", rightX, detailY + 2, {
        size: 18,
        color: accentColor
      });
      drawWrappedText(ctx, detailLines[i], rightX + 18, detailY, rightWidth - 18, 22, {
        size: 16,
        color: textColor,
        maxLines: 2
      });
      detailY += 48;
    }

    for (i = 0; i < layout.reportButtons.length; i += 1) {
      box = layout.reportButtons[i];
      button = buttons[i];
      if (!button) {
        continue;
      }

      G.render.ui.drawButton(ctx, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        label: button.label,
        fill: button.id === "retry" ? "#7a262f" : "#2f2625",
        stroke: button.id === "retry" ? "#e0c3a1" : "#a88a6d"
      });
      G.render.ui.drawLabel(ctx, button.subtitle, box.x + box.width / 2, box.y + 50, {
        size: 12,
        align: "center",
        color: "#eadcca"
      });
    }
  }

  function renderReportLocked(ctx, state, layout) {
    var report = state.runReport || {};
    var rows = Array.isArray(report.summaryRows) ? report.summaryRows : [];
    var detailLines = Array.isArray(report.detailLines) ? report.detailLines : [];
    var buttons = Array.isArray(report.buttons) ? report.buttons : [];
    var panelX = layout.reportPanel.x;
    var panelY = layout.reportPanel.y;
    var panelWidth = layout.reportPanel.width;
    var infoPanelWidth = 666;
    var infoPanelHeight = 290;
    var infoPanelX = Math.round(panelX + (panelWidth - infoPanelWidth) / 2);
    var infoPanelY = panelY + 126;
    var leftX = infoPanelX + 82;
    var leftValueX = infoPanelX + 306;
    var rightX = infoPanelX + 396;
    var rightWidth = infoPanelWidth - 444;
    var titleY = infoPanelY + 38;
    var styleY = infoPanelY + 70;
    var sectionTitleY = infoPanelY + 108;
    var rowY = infoPanelY + 146;
    var detailY = infoPanelY + 146;
    var detailStep = 40;
    var sealLabelX = infoPanelX + infoPanelWidth - 62;
    var sealLabelY = titleY + 2;
    var summaryTitle = report.outcome === "victory" ? "\u7ec8\u5c40\u8d26\u76ee" : "\u6536\u53e3\u8d26\u76ee";
    var reportTitle = report.title || "\u6536\u53e3\u8d26\u672c";
    var textColor = "#1a1a1a";
    var emphasisColor = "#5a0000";
    var i = 0;
    var box = null;
    var button = null;

    drawDarkReportPanel(ctx, infoPanelX, infoPanelY, infoPanelWidth, infoPanelHeight);

    G.render.ui.drawLabel(ctx, report.outcome === "victory" ? "\u6253\u901a" : "\u6218\u6b81", sealLabelX, sealLabelY, {
      size: 18,
      align: "right",
      color: emphasisColor,
      shadow: false
    });
    G.render.ui.drawLabel(ctx, reportTitle, leftX, titleY, {
      size: 28,
      color: textColor,
      shadow: false
    });

    if (report.styleName) {
      G.render.ui.drawLabel(ctx, "\u6d41\u6d3e \u00b7 " + report.styleName, leftX, styleY, {
        size: 14,
        color: textColor,
        shadow: false
      });
    }

    G.render.ui.drawLabel(ctx, summaryTitle, leftX, sectionTitleY, {
      size: 22,
      color: emphasisColor,
      shadow: false
    });
    G.render.ui.drawLabel(ctx, "\u672c\u5c40\u56de\u987e", rightX, sectionTitleY, {
      size: 22,
      color: emphasisColor,
      shadow: false
    });

    for (i = 0; i < rows.length; i += 1) {
      G.render.ui.drawLabel(ctx, rows[i].label, leftX, rowY + i * 26, {
        size: 15,
        color: textColor,
        shadow: false
      });
      G.render.ui.drawLabel(ctx, rows[i].value, leftValueX, rowY + i * 26, {
        size: 15,
        align: "right",
        color: /\d/.test(String(rows[i].value || "")) ? emphasisColor : textColor,
        shadow: false
      });
    }

    for (i = 0; i < detailLines.length; i += 1) {
      G.render.ui.drawLabel(ctx, "\u2022", rightX, detailY + 2, {
        size: 16,
        color: emphasisColor,
        shadow: false
      });
      drawWrappedText(ctx, detailLines[i], rightX + 18, detailY, rightWidth - 22, 20, {
        size: 15,
        color: textColor,
        maxLines: 2,
        shadow: false
      });
      detailY += detailStep;
    }

    for (i = 0; i < layout.reportButtons.length; i += 1) {
      box = layout.reportButtons[i];
      button = buttons[i];
      if (!button) {
        continue;
      }
      drawWoodActionButton(ctx, box, button.label, button.subtitle);
    }
  }

  function renderReport(ctx, state, layout) {
    var report = state.runReport || {};
    var rows = Array.isArray(report.summaryRows) ? report.summaryRows : [];
    var detailLines = Array.isArray(report.detailLines) ? report.detailLines : [];
    var buttons = Array.isArray(report.buttons) ? report.buttons : [];
    var panelX = layout.reportPanel.x;
    var panelY = layout.reportPanel.y;
    var panelWidth = layout.reportPanel.width;
    var panelHeight = layout.reportPanel.height;
    var leftX = panelX + 338;
    var leftValueX = panelX + 550;
    var rightX = panelX + 598;
    var rightWidth = 320;
    var sealSize = 72;
    var sealX = panelX + panelWidth - sealSize - 42;
    var sealY = panelY + 22;
    var summaryTitle = report.outcome === "victory" ? "终局账目" : "收口账目";
    var accentColor = report.outcome === "victory" ? "#d8c186" : "#d4c4a8";
    var textColor = "#e8e0ce";
    var mutedColor = "#d4c4a8";
    var emphasisColor = "#B22222";
    var shadowColor = "rgba(0, 0, 0, 0.8)";
    var reportWidth = ctx.canvas ? (ctx.canvas.logicalWidth || ctx.canvas.width) : 1280;
    var reportHeight = ctx.canvas ? (ctx.canvas.logicalHeight || ctx.canvas.height) : 720;
    var i = 0;
    var rowY = 0;
    var detailY = 0;
    var sectionTitleY = panelY + 222;
    var sectionTopY = panelY + 194;
    var detailStep = 42;
    var box = null;
    var button = null;
    ctx.save();
    ctx.fillStyle = "rgba(10, 5, 5, 0.75)";
    ctx.fillRect(0, 0, reportWidth, reportHeight);
    ctx.restore();
    drawReportTextShade(ctx, leftX - 26, panelY + 188, leftValueX - leftX + 74, 228, 0.28);
    drawReportTextShade(ctx, rightX - 26, panelY + 188, rightWidth + 56, 236, 0.32);

    if (G.render.assets && typeof G.render.assets.drawCombatIntentSeal === "function") {
      G.render.assets.drawCombatIntentSeal(ctx, sealX, sealY, sealSize, sealSize, {
        tintColor: report.outcome === "victory" ? "rgba(132, 88, 36, 0.94)" : "rgba(126, 26, 28, 0.95)"
      });
    }
    G.render.ui.drawLabel(ctx, report.outcome === "victory" ? "打通" : "战殁", sealX + sealSize / 2, sealY + sealSize / 2 + 1, {
      size: 18,
      align: "center",
      color: "#EADDCE",
      shadowColor: shadowColor,
      shadowBlur: 2,
      shadowOffsetX: 1,
      shadowOffsetY: 1
    });

    if (report.styleName) {
      G.render.ui.drawLabel(ctx, "流派 · " + report.styleName, leftX, sectionTopY, {
        size: 14,
        color: "#EADDCE",
        shadowColor: shadowColor,
        shadowBlur: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1
      });
    }

    G.render.ui.drawLabel(ctx, summaryTitle, leftX, sectionTitleY, {
      size: 22,
      color: "#EADDCE",
      shadowColor: shadowColor,
      shadowBlur: 2,
      shadowOffsetX: 1,
      shadowOffsetY: 1
    });
    G.render.ui.drawLabel(ctx, "本局回顾", rightX, sectionTitleY, {
      size: 22,
      color: "#EADDCE",
      shadowColor: shadowColor,
      shadowBlur: 2,
      shadowOffsetX: 1,
      shadowOffsetY: 1
    });

    rowY = panelY + 252;
    for (i = 0; i < rows.length; i += 1) {
      G.render.ui.drawLabel(ctx, rows[i].label, leftX, rowY + i * 26, {
        size: 15,
        color: "#EADDCE",
        shadowColor: shadowColor,
        shadowBlur: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1
      });
      G.render.ui.drawLabel(ctx, rows[i].value, leftValueX, rowY + i * 26, {
        size: 15,
        align: "right",
        color: i === 2 || i === 3 ? emphasisColor : "#EADDCE",
        shadowColor: shadowColor,
        shadowBlur: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1
      });
    }

    detailY = panelY + 252;
    for (i = 0; i < detailLines.length; i += 1) {
      G.render.ui.drawLabel(ctx, "•", rightX, detailY + 2, {
        size: 16,
        color: "#EADDCE",
        shadowColor: shadowColor,
        shadowBlur: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1
      });
      drawWrappedText(ctx, detailLines[i], rightX + 18, detailY, rightWidth - 22, 20, {
        size: 15,
        color: "#EADDCE",
        maxLines: 2,
        shadowColor: shadowColor,
        shadowBlur: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1
      });
      detailY += detailStep;
    }

    for (i = 0; i < layout.reportButtons.length; i += 1) {
      box = layout.reportButtons[i];
      button = buttons[i];
      if (!button) {
        continue;
      }
      drawWoodActionButton(ctx, box, button.label, button.subtitle);
    }
  }

  function renderFooter(ctx, state, layout) {
    if (state.title.mode === "menu" || state.title.mode === "report") {
      return;
    }
    // Secondary title screens already render dense panels; a floating footer collides with controls.
    return;
  }

  function render(state, ctx) {
    var nextState = prepareState(state);
    var layout = getLayout();

    ctx.globalCompositeOperation = "source-over";
    renderBackground(ctx, nextState);

    if (nextState.title.mode === "menu") {
      renderMenuHeader(ctx);
      renderMenuPanelV3(ctx, nextState, layout);
      renderMenuFooter(ctx);
      return;
    }

    if (nextState.title.mode === "styles") {
      renderStyles(ctx, nextState, layout);
      return;
    }

    if (nextState.title.mode === "settings") {
      renderHeader(ctx, nextState, layout);
      renderSettings(ctx, nextState, layout);
      renderFooter(ctx, nextState, layout);
      return;
    }

    if (nextState.title.mode === "report") {
      renderReportLocked(ctx, nextState, layout);
      return;
    }

    renderHeader(ctx, nextState, layout);
    renderCredits(ctx, nextState, layout);
    renderFooter(ctx, nextState, layout);
  }

  G.scenes.title = {
    getLayout: getLayout,
    getStyleBoxes: getStyleBoxes,
    prepareState: prepareState,

    update: function (state) {
      return processClicks(state);
    },

    render: function (state, ctx) {
      render(state, ctx);
    }
  };
})();
