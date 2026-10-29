window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  // Texture paths and constants
  var REST_BACKGROUND_TEXTURE_PATH = "assets/ui/rest_ruined_temple_background_gemini_02.png";
  var REST_BACKGROUND_TEXTURE_ASPECT = 1344 / 768;
  var REST_SIDEBAR_SHELL_TEXTURE_PATH = "assets/ui/rest_sidebar_shell_gpt15_01.png";
  var REST_STAGE_SHELL_TEXTURE_PATH = "assets/ui/rest_stage_shell_gpt15_01.png";
  var REST_CHOICE_STAGE_TEXTURE_PATH = "assets/ui/rest_choice_stage_split_gpt15_01.png";

  // Font families
  function getBodyFontFamily() {
    return "\"KGame Song\", serif";
  }

  function getTitleFontFamily() {
    return "\"KGame Ink\", \"KGame Song\", serif";
  }

  function getReadableFontFamily() {
    return "\"KGame Sans\", sans-serif";
  }

  // Utility functions
  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function getCurrentNodeId(state) {
    return state && state.map && state.map.currentNodeId ?
      (state.map.actNumber || 1) + ":" + state.map.currentNodeId : null;
  }

  function ensureDeck(state) {
    if (state.player.masterDeckNames && state.player.masterDeckNames.length > 0) {
      return state.player.masterDeckNames.slice();
    }

    return G.cards.getStarterDeck(state.player.chosenStyle || "blade");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function drawClippedTexture(ctx, path, x, y, width, height, options) {
    var used = false;

    if (!G.render.assets || typeof G.render.assets.drawImageCover !== "function") {
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

  function getLayout() {
    return {
      header: { x: 34, y: 24, width: 1212, height: 72 },
      sidebar: { x: 54, y: 128, width: 216, height: 548 },
      choiceStage: { x: 300, y: 146, width: 934, height: 430 },
      heal: { x: 332, y: 172, width: 374, height: 284 },
      upgrade: { x: 828, y: 172, width: 374, height: 284 },
      footer: { x: 300, y: 612, width: 722, height: 58 },
      upgradeStage: { x: 292, y: 140, width: 948, height: 460 },
      gridStartX: 320,
      gridStartY: 210,
      cardWidth: 212,
      cardHeight: 116,
      cardGapX: 16,
      cardGapY: 14,
      gridColumns: 4,
      back: { x: 1034, y: 612, width: 206, height: 58 }
    };
  }

  function isInside(point, box) {
    return point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height;
  }

  function getUpgradableCount(deckEntries) {
    return deckEntries.filter(function (entry) {
      return entry.canUpgrade;
    }).length;
  }

  function buildUpgradeStacks(deckEntries) {
    var grouped = {};
    var stacks = [];

    deckEntries.forEach(function (entry) {
      var key = "";

      if (!entry || !entry.canUpgrade) {
        return;
      }

      key = entry.deckName || entry.name || String(entry.index);
      if (!grouped[key]) {
        grouped[key] = {
          deckIndex: entry.index,
          deckName: key,
          count: 0,
          entry: entry
        };
        stacks.push(grouped[key]);
      }

      grouped[key].count += 1;
    });

    return stacks;
  }

  function getUpgradeStackBoxes(upgradeStacks, layout) {
    var count = upgradeStacks.length;
    var box = layout.upgradeStage;
    var columns = 0;
    var rows = 0;
    var gapX = 0;
    var gapY = 18;
    var cardWidth = 0;
    var cardHeight = 112;
    var gridWidth = 0;
    var gridHeight = 0;
    var startX = 0;
    var startY = 0;

    if (count === 0) {
      return [];
    }

    if (count <= 4) {
      columns = count;
      rows = 1;
      gapX = 18;
      cardWidth = Math.floor((box.width - 112 - ((columns - 1) * gapX)) / columns);
      cardWidth = clamp(cardWidth, 168, 182);
      cardHeight = Math.round(cardWidth * 1.34);
      gridWidth = (columns * cardWidth) + ((columns - 1) * gapX);
      gridHeight = cardHeight;
      startX = box.x + Math.floor((box.width - gridWidth) / 2);
      startY = box.y + 92 + Math.max(0, Math.floor((box.height - 206 - gridHeight) / 2));
    } else {
      columns = Math.min(4, Math.max(2, count));
      rows = Math.ceil(count / columns);
      gapX = 16;
      cardWidth = Math.floor((box.width - 104 - ((columns - 1) * gapX)) / columns);
      cardWidth = clamp(cardWidth, 138, 154);
      cardHeight = Math.round(cardWidth * 1.34);
      gridWidth = (columns * cardWidth) + ((columns - 1) * gapX);
      gridHeight = (rows * cardHeight) + ((rows - 1) * gapY);
      startX = box.x + Math.floor((box.width - gridWidth) / 2);
      startY = box.y + 78 + Math.max(0, Math.floor((box.height - 168 - gridHeight) / 2));
    }

    return upgradeStacks.map(function (stack, index) {
      var column = index % columns;
      var row = Math.floor(index / columns);
      return {
        deckIndex: stack.deckIndex,
        count: stack.count,
        entry: stack.entry,
        x: startX + column * (cardWidth + gapX),
        y: startY + row * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight
      };
    });
  }

  // Export shared utilities
  G.scenes.restShared = {
    // Constants
    REST_BACKGROUND_TEXTURE_PATH: REST_BACKGROUND_TEXTURE_PATH,
    REST_BACKGROUND_TEXTURE_ASPECT: REST_BACKGROUND_TEXTURE_ASPECT,
    REST_SIDEBAR_SHELL_TEXTURE_PATH: REST_SIDEBAR_SHELL_TEXTURE_PATH,
    REST_STAGE_SHELL_TEXTURE_PATH: REST_STAGE_SHELL_TEXTURE_PATH,
    REST_CHOICE_STAGE_TEXTURE_PATH: REST_CHOICE_STAGE_TEXTURE_PATH,

    // Font functions
    getBodyFontFamily: getBodyFontFamily,
    getTitleFontFamily: getTitleFontFamily,
    getReadableFontFamily: getReadableFontFamily,

    // Utility functions
    cloneState: cloneState,
    getCurrentNodeId: getCurrentNodeId,
    ensureDeck: ensureDeck,
    clamp: clamp,
    drawClippedTexture: drawClippedTexture,
    getLayout: getLayout,
    isInside: isInside,
    getUpgradableCount: getUpgradableCount,
    buildUpgradeStacks: buildUpgradeStacks,
    getUpgradeStackBoxes: getUpgradeStackBoxes
  };
})();
