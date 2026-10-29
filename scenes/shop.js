window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  var SHOP_BACKGROUND_TEXTURE_PATH = "assets/ui/shop_black_market_background_gpt15all_02_16x9.png";
  var SHOP_SHELL_ART_PATHS = {
    counterPlate: "assets/ui/shop_counter_base_plate_gpt15_v5.png",
    relicTray: "assets/ui/shop_ui_shell_relic_tray_gpt15_01.png",
    ledger: "assets/ui/shop_center_ledger_board_gpt15_v1_cropped.png",
    contract: "assets/ui/shop_ui_shell_contract_gpt15_01.png",
    leaveSign: "assets/ui/shop_ui_shell_leave_sign_gpt15_01.png",
    removeBoard: "assets/ui/shop_remove_service_board_gpt15_v4.png",
    serviceStand: "assets/ui/shop_ui_shell_service_stand_gpt15_v2.png"
  };
  var SHOP_RELIC_ART_PATHS = {
    chipped_blade: "assets/ui/shop_relic_chipped_blade_gpt15all_01.png",
    rusty_mirror: "assets/ui/shop_relic_rusty_mirror_gpt15all_01.png",
    doomed_watch: "assets/ui/shop_relic_doomed_watch_gpt15all_01.png",
    lime_packet: "assets/ui/shop_relic_lime_packet_gpt15all_01.png",
    secret_manual: "assets/ui/shop_relic_secret_manual_gpt15all_01.png",
    cheat_cuff: "assets/ui/shop_relic_cheat_cuff_gpt15all_01.png",
    sleeve_trigger: "assets/ui/shop_relic_sleeve_trigger_gpt15all_01.png",
    blood_bandage: "assets/ui/shop_relic_blood_bandage_gpt15all_01.png",
    beiyang_boots: "assets/ui/shop_relic_beiyang_boots_gpt15all_01.png",
    iron_canteen: "assets/ui/shop_relic_iron_canteen_gpt15all_01.png",
    heavy_money_bag: "assets/ui/shop_relic_heavy_money_bag_gpt15all_01.png",
    whetstone: "assets/ui/shop_relic_whetstone_gpt15all_01.png",
    burning_liquor: "assets/ui/shop_relic_burning_liquor_gpt15all_01.png",
    settlement_map: "assets/ui/shop_relic_settlement_map_gpt15all_01.png",
    wanted_poster: "assets/ui/shop_relic_wanted_poster_gpt15all_01.png"
  };

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

  function calculateRemoveCost(removeServiceCount) {
    return Math.min(125, 50 + (Math.max(0, Number(removeServiceCount) || 0) * 25));
  }

  function getAmbientBrowseNote() {
    return "";
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getBodyFontFamily() {
    return "\"KGame Song\", serif";
  }

  function getTitleFontFamily() {
    return "\"KGame Ink\", \"KGame Song\", serif";
  }

  function getReadableFontFamily() {
    return "\"KGame Sans\", sans-serif";
  }

  function drawImageContain(ctx, path, x, y, width, height, options) {
    var opts = options || {};
    var entry = null;
    var image = null;
    var imageWidth = 1;
    var imageHeight = 1;
    var scale = 1;
    var drawWidth = 0;
    var drawHeight = 0;
    var drawX = 0;
    var drawY = 0;
    var alignX = typeof opts.alignX === "number" ? opts.alignX : 0.5;
    var alignY = typeof opts.alignY === "number" ? opts.alignY : 0.5;

    if (!G.render.assets || typeof G.render.assets.getImageEntry !== "function") {
      return false;
    }

    entry = G.render.assets.getImageEntry(path);
    image = entry && entry.image ? entry.image : null;
    if (!entry || !image || !entry.loaded || entry.failed) {
      return false;
    }

    imageWidth = image.naturalWidth || image.width || 1;
    imageHeight = image.naturalHeight || image.height || 1;
    scale = Math.min(width / imageWidth, height / imageHeight);
    drawWidth = imageWidth * scale;
    drawHeight = imageHeight * scale;
    drawX = x + (width - drawWidth) * alignX;
    drawY = y + (height - drawHeight) * alignY;

    ctx.save();
    ctx.globalAlpha = typeof opts.alpha === "number" ? opts.alpha : 1;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
    return true;
  }

  function drawShellAsset(ctx, path, x, y, width, height, options) {
    var opts = options || {};
    var candidates = Array.isArray(path) ? path.slice() : [path];
    var i = 0;

    for (i = 0; i < candidates.length; i += 1) {
      ctx.save();
      ctx.shadowColor = opts.shadowColor || "rgba(0, 0, 0, 0.26)";
      ctx.shadowBlur = typeof opts.shadowBlur === "number" ? opts.shadowBlur : 16;
      ctx.shadowOffsetX = typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 0;
      ctx.shadowOffsetY = typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 10;
      if (drawImageContain(ctx, candidates[i], x, y, width, height, {
        alpha: typeof opts.alpha === "number" ? opts.alpha : 1,
        alignX: typeof opts.alignX === "number" ? opts.alignX : 0.5,
        alignY: typeof opts.alignY === "number" ? opts.alignY : 0.5
      })) {
        ctx.restore();
        return true;
      }
      ctx.restore();
    }
    return false;
  }

  function drawShellAssetCover(ctx, path, x, y, width, height, options) {
    var opts = options || {};
    var drawn = false;
    var candidates = Array.isArray(path) ? path.slice() : [path];
    var i = 0;

    if (!G.render.assets || typeof G.render.assets.drawImageCover !== "function") {
      return false;
    }

    for (i = 0; i < candidates.length; i += 1) {
      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      if (typeof opts.rotation === "number") {
        ctx.rotate(opts.rotation);
      }
      ctx.beginPath();
      ctx.rect(-width / 2, -height / 2, width, height);
      ctx.clip();
      ctx.shadowColor = opts.shadowColor || "rgba(0, 0, 0, 0.26)";
      ctx.shadowBlur = typeof opts.shadowBlur === "number" ? opts.shadowBlur : 16;
      ctx.shadowOffsetX = typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 0;
      ctx.shadowOffsetY = typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 10;
      drawn = G.render.assets.drawImageCover(ctx, candidates[i], -width / 2, -height / 2, width, height, {
        focusX: typeof opts.focusX === "number" ? opts.focusX : 0.5,
        focusY: typeof opts.focusY === "number" ? opts.focusY : 0.5,
        alpha: typeof opts.alpha === "number" ? opts.alpha : 1
      });
      ctx.restore();
      if (drawn) {
        return true;
      }
    }
    return false;
  }

  function isAssetReady(path) {
    var entry = null;
    var image = null;
    var candidates = Array.isArray(path) ? path.slice() : [path];
    var i = 0;

    if (!G.render.assets || typeof G.render.assets.getImageEntry !== "function") {
      return false;
    }

    for (i = 0; i < candidates.length; i += 1) {
      entry = G.render.assets.getImageEntry(candidates[i]);
      image = entry && entry.image ? entry.image : null;
      if (entry && image && entry.loaded && !entry.failed) {
        return true;
      }
    }
    return false;
  }

  function drawBottomAnchoredAsset(ctx, path, width, bottomY, options) {
    var opts = options || {};
    var entry = null;
    var image = null;
    var candidates = Array.isArray(path) ? path.slice() : [path];
    var imageWidth = 1;
    var imageHeight = 1;
    var scale = 1;
    var drawHeight = 0;
    var drawY = 0;
    var i = 0;

    if (!G.render.assets || typeof G.render.assets.getImageEntry !== "function") {
      return false;
    }

    for (i = 0; i < candidates.length; i += 1) {
      entry = G.render.assets.getImageEntry(candidates[i]);
      image = entry && entry.image ? entry.image : null;
      if (entry && image && entry.loaded && !entry.failed) {
        break;
      }
    }

    if (!entry || !image || !entry.loaded || entry.failed) {
      return false;
    }

    imageWidth = image.naturalWidth || image.width || 1;
    imageHeight = image.naturalHeight || image.height || 1;
    scale = width / imageWidth;
    drawHeight = imageHeight * scale;
    drawY = bottomY - drawHeight + (typeof opts.offsetY === "number" ? opts.offsetY : 0);

    ctx.save();
    ctx.globalAlpha = typeof opts.alpha === "number" ? opts.alpha : 1;
    ctx.drawImage(image, 0, drawY, width, drawHeight);
    ctx.restore();
    return true;
  }

  function getLayout() {
    return {
      header: { x: 446, y: 28, width: 388, height: 60 },
      browseStage: { x: 56, y: 124, width: 1168, height: 322 },
      counter: { x: 0, y: 494, width: 1280, height: 226 },
      relicDrawer: { x: 58, y: 462, width: 306, height: 104 },
      ledger: { x: 484, y: 504, width: 330, height: 134, rotation: -0.02 },
      removeStage: { x: 108, y: 146, width: 1064, height: 458 },
      removeButton: { x: 1008, y: 500, width: 212, height: 56, rotation: 0 },
      leaveButton: { x: 1044, y: 625, width: 176, height: 54, rotation: 0 },
      footer: { x: 344, y: 454, width: 592, height: 38 },
      removeFooter: { x: 348, y: 616, width: 520, height: 60 },
      removePrev: { x: 104, y: window.KGAME_MOBILE?644:618, width: 150, height: window.KGAME_MOBILE?70:44 },
      removeNext: { x: 756, y: window.KGAME_MOBILE?644:618, width: 150, height: window.KGAME_MOBILE?70:44 },
      browsePrev: {x:64,y:635,width:166,height:70},
      browseNext: {x:672,y:635,width:166,height:70},
      removeConfirm: { x: 896, y: 538, width: 230, height: 52 },
      removeCancel: { x: 652, y: 538, width: 208, height: 52 },
      backButton: { x: 928, y: window.KGAME_MOBILE?644:608, width: 220, height: 68, rotation: -0.018 }
    };
  }

  function isInside(point, box) {
    return point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height;
  }

  function isInsideRotatedRect(point, box) {
    var rotation = typeof box.rotation === "number" ? box.rotation : 0;
    var centerX = box.x + box.width / 2;
    var centerY = box.y + box.height / 2;
    var dx = point.x - centerX;
    var dy = point.y - centerY;
    var cos = Math.cos(-rotation);
    var sin = Math.sin(-rotation);
    var localX = dx * cos - dy * sin + box.width / 2;
    var localY = dx * sin + dy * cos + box.height / 2;

    return localX >= 0 &&
      localX <= box.width &&
      localY >= 0 &&
      localY <= box.height;
  }

  function canAfford(state, price) {
    return G.player.canSpendGold(state, price);
  }

  function getBrowseCardBoxes(layout) {
    if (G.render.journeyRedesign && window.KGAME_MOBILE) {
      var page = G.main?.getState().shop?.browsePage || 0;
      return [0,1,2,3,4].map(function(i){var slot=i-page*3,hidden=slot<0||slot>2;return {x:hidden?-10000:64+slot*268,y:230+[0,8,-3][Math.max(0,Math.min(2,slot))],width:242,height:360,rotation:hidden?0:[-.016,.012,-.01][slot],hidden: hidden,priceOffsetY:6,priceWidth:242,priceHeight:34};});
    }
    if (G.render.journeyRedesign) return [0,1,2,3,4].map(function (i) {
      return {x:64+i*166,y:[316,340,322,345,326][i],width:146,height:224,rotation:[-.045,.025,-.015,.04,-.03][i],scale:1,priceOffsetY:8,priceWidth:146,priceHeight:38};
    });
    return [0,1,2,3,4].map(function (index) {
      return { x: 74 + index * 224, y: 151, width: 168, height: 232, rotation: 0, scale: 1, priceOffsetY: 6, priceWidth: 168, priceHeight: 36 };
    });
  }

  function getBrowseRelicBoxes(layout) {
    if (G.render.journeyRedesign && window.KGAME_MOBILE) return [{x:618,y:66,width:154,height:146},{x:812,y:66,width:154,height:146}];
    if (G.render.journeyRedesign) return [{x:632,y:94,width:140,height:142},{x:774,y:176,width:140,height:142}];
    return [{ x: 72, y: 481, width: 294, height: 147 }, { x: 392, y: 481, width: 294, height: 147 }];
  }

  function getBrowseCardPriceBox(cardBox) {
    var width = cardBox.priceWidth || 102;
    var height = cardBox.priceHeight || 28;
    var centerX = cardBox.x + cardBox.width / 2 + (cardBox.priceOffsetX || 0) + ((cardBox.rotation || 0) * 28);
    var topY = cardBox.y + cardBox.height + (typeof cardBox.priceOffsetY === "number" ? cardBox.priceOffsetY : -8);

    return {
      x: centerX - width / 2,
      y: topY,
      width: width,
      height: height,
      rotation: cardBox.priceRotation || 0
    };
  }

  function getBrowseCardHitOrder() {
    return [0, 1, 2, 3, 4];
  }

  function findBrowseCardHit(point, layout) {
    var cardBoxes = getBrowseCardBoxes(layout);
    var hitOrder = getBrowseCardHitOrder();
    var i = 0;
    var cardBox = null;
    var priceBox = null;

    for (i = 0; i < hitOrder.length; i += 1) {
      cardBox = cardBoxes[hitOrder[i]];
      if (cardBox.hidden) continue;
      priceBox = getBrowseCardPriceBox(cardBox);
      if (isInsideRotatedRect(point, cardBox) || isInsideRotatedRect(point, priceBox)) {
        return hitOrder[i];
      }
    }

    return -1;
  }

  function findBrowseRelicHit(point, layout) {
    var relicBoxes = getBrowseRelicBoxes(layout);
    var i = 0;

    for (i = 0; i < relicBoxes.length; i += 1) {
      if (isInside(point, relicBoxes[i])) {
        return i;
      }
    }

    return -1;
  }

  // 【彻底重写】让撤去纸片更加混乱、物理、不规则地散布
  function getRemovePageSize() { return G.render.journeyRedesign ? (window.KGAME_MOBILE ? 3 : 5) : 16; }

  function getRemoveCardBoxes(deckEntries, layout, page) {
    var pageSize = getRemovePageSize();
    var currentPage = Math.max(0, Math.min(Math.ceil(deckEntries.length / pageSize) - 1, Number(page) || 0));
    var visible = deckEntries.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    var columns = Math.min(4, Math.max(1, deckEntries.length));
    return visible.map(function (entry, index) {
      if (G.render.journeyRedesign && window.KGAME_MOBILE) return {index:entry.index,x:104+index*260,y:238+[0,8,-3][index],width:234,height:348,rotation:[-.016,.012,-.01][index]};
      if (G.render.journeyRedesign) return {index:entry.index,x:104+index*165,y:295+[0,15,-5,12,0][index],width:146,height:224,rotation:[-.035,.02,0,-.02,.035][index]};
      return { index: entry.index, x: 82 + index % 8 * 139, y: 156 + Math.floor(index / 8) * 205, width: 112, height: 166, rotation: 0 };
    });
  }

  function syncDeckEntries(nextState) {
    nextState.shop.deckEntries = G.cards.buildDeckEntries(nextState.player.masterDeckNames);
    nextState.shop.removeCost = calculateRemoveCost(nextState.player.removeServiceCount);
    return nextState;
  }

  function prepareState(state) {
    var nextState = cloneState(state);
    var seed = nextState.combat && nextState.combat.rngSeed ? nextState.combat.rngSeed : 1900;
    var builtCards = G.cards.buildShopCardOptions(nextState.player.chosenStyle || "blade", seed);
    var builtRelics = G.relics.buildShopRelicOptions(builtCards.nextSeed, nextState.player.relics || []);
    var nodeId = getCurrentNodeId(nextState);
    var existingShop = nextState.shop &&
      nextState.shop.nodeId === nodeId &&
      Array.isArray(nextState.shop.cardOffers) &&
      Array.isArray(nextState.shop.relicOffers) ?
      nextState.shop :
      null;

    nextState.player.masterDeckNames = ensureDeck(nextState);
    nextState.player.deckSize = nextState.player.masterDeckNames.length;
    nextState.player.removeServiceCount = typeof nextState.player.removeServiceCount === "number" ? nextState.player.removeServiceCount : 0;

    nextState.shop = {
      nodeId: nodeId,
      mode: existingShop && existingShop.mode ? existingShop.mode : "browse",
      title: "暗巷黑市",
      note: existingShop && existingShop.note ? existingShop.note : getAmbientBrowseNote(),
      cardOffers: existingShop ? existingShop.cardOffers : builtCards.options.map(function (card) {
        return Object.assign({}, card, { sold: false });
      }),
      relicOffers: existingShop ? existingShop.relicOffers : builtRelics.options.map(function (relic) {
        return Object.assign({}, relic, { sold: false });
      }),
      removeCost: calculateRemoveCost(nextState.player.removeServiceCount),
      removePage: existingShop ? existingShop.removePage || 0 : 0,
      browsePage: existingShop ? clamp(existingShop.browsePage || 0,0,1) : 0,
      removeSelectedIndex: existingShop && Number.isInteger(existingShop.removeSelectedIndex) ? existingShop.removeSelectedIndex : null,
      purchaseSelection: existingShop ? existingShop.purchaseSelection || null : null,
      deckEntries: G.cards.buildDeckEntries(nextState.player.masterDeckNames)
    };
    nextState.combat = nextState.combat || {};
    if (!existingShop) {
      nextState.combat.rngSeed = builtRelics.nextSeed;
    }
    nextState.scene = "shop";
    return nextState;
  }

  function ensureShopState(state) {
    if (
      state.shop &&
      state.shop.nodeId === getCurrentNodeId(state) &&
      Array.isArray(state.shop.cardOffers) &&
      Array.isArray(state.shop.relicOffers)
    ) {
      return state;
    }

    return prepareState(state);
  }

  function returnToMap(state, note) {
    var nextState = cloneState(state);

    nextState.map = nextState.map || {};
    nextState.map.note = note;
    nextState.map.lastShopAction = note;
    nextState.scene = "map";
    if (G.scenes.map && typeof G.scenes.map.prepareState === "function") {
      nextState = G.scenes.map.prepareState(nextState);
    }
    return nextState;
  }

  function setNote(state, note) {
    var nextState = cloneState(state);

    nextState.shop.note = note;
    return nextState;
  }

  function buyCard(state, index) {
    var nextState = cloneState(state);
    var offer = nextState.shop.cardOffers[index];

    if (!offer || offer.sold) {
      return state;
    }

    if (!G.player.canSpendGold(nextState, offer.price)) {
      return setNote(nextState, "大洋不够，【" + offer.name + "】还压在摊布上。");
    }

    nextState = G.player.spendGold(nextState, offer.price);
    nextState.player.masterDeckNames = nextState.player.masterDeckNames.concat(offer.deckName || offer.baseName || offer.name);
    if (G.journeyPreparation) G.journeyPreparation.recordGain(nextState, offer.deckName || offer.baseName || offer.name);
    nextState.player.deckSize = nextState.player.masterDeckNames.length;
    nextState.shop.cardOffers[index].sold = true;
    nextState = syncDeckEntries(nextState);
    nextState.shop.note = "你花了 " + offer.price + " 大洋，买下【" + offer.name + "】。";
    return nextState;
  }

  function buyRelic(state, index) {
    var nextState = cloneState(state);
    var offer = nextState.shop.relicOffers[index];

    if (!offer || offer.sold) {
      return state;
    }

    if (!G.player.canSpendGold(nextState, offer.price)) {
      return setNote(nextState, "大洋不够，【" + offer.name + "】还轮不到你。");
    }

    nextState = G.player.spendGold(nextState, offer.price);
    nextState = G.player.addRelic(nextState, offer.id);
    nextState.shop.relicOffers[index].sold = true;
    nextState.shop.note = "你花了 " + offer.price + " 大洋，买下旧物【" + offer.name + "】。";
    return nextState;
  }

  function enterRemoveMode(state) {
    var nextState = cloneState(state);

    if (nextState.player.masterDeckNames.length <= 1) {
      nextState.shop.note = "牌组只剩最后一张，不能再撤去了。";
      return nextState;
    }

    if (!canAfford(nextState, nextState.shop.removeCost)) {
      nextState.shop.note = "大洋不够，黑市的刀子还碰不到你的牌。";
      return nextState;
    }

    nextState.shop.mode = "remove";
    nextState.shop.removePage = 0;
    nextState.shop.removeSelectedIndex = null;
    nextState.shop.note = "";
    return nextState;
  }

  function removeCard(state, deckIndex) {
    var nextState = cloneState(state);
    var result = null;

    if (!G.player.canSpendGold(nextState, nextState.shop.removeCost)) {
      nextState.shop.note = "大洋不够，黑市的刀子还碰不到你的牌。";
      return nextState;
    }

    result = G.cards.removeDeckCardAt(nextState.player.masterDeckNames, deckIndex);
    if (!result.changed) {
      nextState.shop.note = "这张牌没能被顺利处理掉。";
      return nextState;
    }

    nextState = G.player.spendGold(nextState, nextState.shop.removeCost);
    nextState = G.player.incrementRemoveServiceCount(nextState);
    nextState.player.masterDeckNames = result.deckNames;
    nextState.player.deckSize = result.deckNames.length;
    nextState.shop.mode = "browse";
    nextState.shop.removeSelectedIndex = null;
    nextState = syncDeckEntries(nextState);
    nextState.shop.note = "你花了 " + (calculateRemoveCost(nextState.player.removeServiceCount - 1)) + " 大洋，撤去了【" + result.removedName + "】。";
    return nextState;
  }

  function processClicks(state) {
    var nextState = state;
    var layout = getLayout();
    var clicks = G.main && typeof G.main.consumeClicks === "function" ? G.main.consumeClicks() : [];
    var deckBoxes = getRemoveCardBoxes(nextState.shop.deckEntries, layout, nextState.shop.removePage);
    var click = null;
    var rawClick = null;
    var i = 0;
    var hitIndex = -1;

    if (clicks.length === 0) {
      return state;
    }

    while (clicks.length > 0) {
      rawClick = clicks.shift();

      // Unified UI renders removal choices without camera scaling.
      if (nextState.shop.mode === "remove") {
        click = {
          x: rawClick.x,
          y: rawClick.y
        };
      } else {
        click = rawClick;
      }

      if (nextState.shop.mode === "browse") {
        if (nextState.shop.purchaseSelection) {
          var selection = nextState.shop.purchaseSelection;
          if (G.render.canvasUtils.containsAction(click, layout.removeCancel)) { nextState = cloneState(nextState); nextState.shop.purchaseSelection = null; return nextState; }
          if (G.render.canvasUtils.containsAction(click, layout.removeConfirm)) {
            var selectedOffer = (selection.type === 'relic' ? nextState.shop.relicOffers : nextState.shop.cardOffers)[selection.index];
            if (!selectedOffer || selectedOffer.sold || !G.player.canSpendGold(nextState, selectedOffer.price)) return nextState;
            var purchase = selection.type === 'relic' ? buyRelic(nextState, selection.index) : buyCard(nextState, selection.index);
            purchase.shop.purchaseSelection = null;
            return purchase;
          }
          return nextState;
        }
        if (G.render.canvasUtils.containsAction(click, layout.leaveButton)) {
          return returnToMap(nextState, "你掀开脏布帘，带着新买卖离开了黑市。");
        }

        if (G.render.canvasUtils.containsAction(click, layout.removeButton)) {
          nextState = enterRemoveMode(nextState);
          continue;
        }

        if (window.KGAME_MOBILE && (G.render.canvasUtils.containsAction(click,layout.browsePrev) || G.render.canvasUtils.containsAction(click,layout.browseNext))) {
          nextState=cloneState(nextState);
          nextState.shop.browsePage=G.render.canvasUtils.containsAction(click,layout.browseNext)?1:0;
          return nextState;
        }

        hitIndex = findBrowseRelicHit(click, layout);
        if (hitIndex >= 0) {
          if (G.render.journeyMaterials && !nextState.shop.relicOffers[hitIndex].sold) {nextState = cloneState(nextState);nextState.shop.purchaseSelection = {type:'relic',index:hitIndex};return nextState;}
          nextState = buyRelic(nextState, hitIndex);
          continue;
        }

        if (!G.render.journeyRedesign && (isInside(click, layout.relicDrawer) || isInside(click, layout.ledger))) {
          continue;
        }

        hitIndex = findBrowseCardHit(click, layout);
        if (hitIndex >= 0) {
          if (G.render.journeyMaterials && !nextState.shop.cardOffers[hitIndex].sold) {nextState = cloneState(nextState);nextState.shop.purchaseSelection = {type:'card',index:hitIndex};return nextState;}
          nextState = buyCard(nextState, hitIndex);
          continue;
        }
      } else if (Number.isInteger(nextState.shop.removeSelectedIndex)) {
        if (G.render.canvasUtils.containsAction(click, layout.removeCancel)) {
          nextState = cloneState(nextState);
          nextState.shop.removeSelectedIndex = null;
          return nextState;
        }
        if (G.render.canvasUtils.containsAction(click, layout.removeConfirm)) {
          return removeCard(nextState, nextState.shop.removeSelectedIndex);
        }
      } else {
        var pageCount = Math.ceil(nextState.shop.deckEntries.length / getRemovePageSize());
        if (G.render.canvasUtils.containsAction(click, layout.removePrev) && nextState.shop.removePage > 0) {
          nextState = cloneState(nextState);
          nextState.shop.removePage -= 1;
          deckBoxes = getRemoveCardBoxes(nextState.shop.deckEntries, layout, nextState.shop.removePage);
          continue;
        }
        if (G.render.canvasUtils.containsAction(click, layout.removeNext) && (nextState.shop.removePage || 0) + 1 < pageCount) {
          nextState = cloneState(nextState);
          nextState.shop.removePage = (nextState.shop.removePage || 0) + 1;
          deckBoxes = getRemoveCardBoxes(nextState.shop.deckEntries, layout, nextState.shop.removePage);
          continue;
        }
        if (G.render.canvasUtils.containsAction(click, layout.backButton)) {
          nextState.shop.mode = "browse";
          nextState.shop.note = getAmbientBrowseNote();
        } else {
          for (i = 0; i < deckBoxes.length; i += 1) {
            if (isInside(click, deckBoxes[i])) {
              nextState = cloneState(nextState);
              nextState.shop.removeSelectedIndex = deckBoxes[i].index;
              return nextState;
            }
          }
        }
      }
    }

    return nextState;
  }

  function drawFallbackBackground(ctx) {
    var gradient = null;
    var glow = null;
    var lower = null;

    G.render.canvasUtils.clear(ctx, "#090b0d");

    gradient = ctx.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, "#080a0c");
    gradient.addColorStop(0.3, "#111418");
    gradient.addColorStop(0.68, "#121113");
    gradient.addColorStop(1, "#080707");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, 1280, 70);
    ctx.fillRect(0, 0, 160, 720);
    ctx.fillRect(1120, 0, 160, 720);
    ctx.restore();

    ctx.save();
    glow = ctx.createRadialGradient(640, 156, 0, 640, 156, 290);
    glow.addColorStop(0, "rgba(156, 106, 70, 0.24)");
    glow.addColorStop(1, "rgba(162, 92, 48, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(200, 0, 880, 440);

    glow = ctx.createRadialGradient(292, 316, 0, 292, 316, 260);
    glow.addColorStop(0, "rgba(58, 90, 118, 0.12)");
    glow.addColorStop(1, "rgba(58, 90, 118, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 130, 620, 420);

    glow = ctx.createRadialGradient(990, 310, 0, 990, 310, 260);
    glow.addColorStop(0, "rgba(58, 90, 118, 0.1)");
    glow.addColorStop(1, "rgba(58, 90, 118, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(660, 140, 620, 420);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255, 244, 226, 0.06)";
    ctx.fillRect(0, 204, 1280, 1.5);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 206, 1280, 2);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(482, 206, 316, 362);
    ctx.fillRect(202, 214, 138, 312);
    ctx.fillRect(938, 214, 138, 312);
    ctx.restore();

    ctx.save();
    lower = ctx.createLinearGradient(0, 470, 0, 720);
    lower.addColorStop(0, "rgba(0, 0, 0, 0)");
    lower.addColorStop(0.18, "rgba(0, 0, 0, 0.22)");
    lower.addColorStop(1, "rgba(0, 0, 0, 0.64)");
    ctx.fillStyle = lower;
    ctx.fillRect(0, 470, 1280, 250);
    ctx.restore();

    ctx.save();
    lower = ctx.createLinearGradient(0, 494, 0, 720);
    lower.addColorStop(0, "rgba(18, 15, 14, 0.18)");
    lower.addColorStop(0.26, "rgba(12, 10, 10, 0.56)");
    lower.addColorStop(1, "rgba(7, 6, 7, 0.94)");
    ctx.fillStyle = lower;
    ctx.beginPath();
    ctx.moveTo(0, 516);
    ctx.lineTo(210, 500);
    ctx.lineTo(438, 520);
    ctx.lineTo(632, 492);
    ctx.lineTo(836, 522);
    ctx.lineTo(1088, 496);
    ctx.lineTo(1280, 510);
    ctx.lineTo(1280, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBackground(ctx) {
    var texturedBackground = false;
    var overlay = null;
    var glow = null;
    var sideVignette = null;

    G.render.canvasUtils.clear(ctx, "#090b0d");

    if (G.render.assets && typeof G.render.assets.drawImageCover === "function") {
      texturedBackground = !!G.render.assets.drawImageCover(ctx, SHOP_BACKGROUND_TEXTURE_PATH, 0, 0, 1280, 720, {
        focusX: 0.5,
        focusY: 0.52,
        alpha: 1
      });
    }

    if (!texturedBackground) {
      drawFallbackBackground(ctx);
      return;
    }

    ctx.save();
    overlay = ctx.createLinearGradient(0, 0, 0, 720);
    overlay.addColorStop(0, "rgba(6, 7, 8, 0.44)");
    overlay.addColorStop(0.15, "rgba(8, 9, 10, 0.22)");
    overlay.addColorStop(0.62, "rgba(10, 9, 8, 0.08)");
    overlay.addColorStop(1, "rgba(4, 4, 5, 0.36)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
    ctx.fillRect(0, 0, 1280, 64);
    ctx.restore();

    ctx.save();
    glow = ctx.createRadialGradient(640, 166, 0, 640, 166, 260);
    glow.addColorStop(0, "rgba(182, 120, 72, 0.16)");
    glow.addColorStop(1, "rgba(182, 120, 72, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(270, 16, 740, 360);
    ctx.restore();

    ctx.save();
    sideVignette = ctx.createLinearGradient(0, 0, 1280, 0);
    sideVignette.addColorStop(0, "rgba(5, 5, 6, 0.28)");
    sideVignette.addColorStop(0.08, "rgba(5, 5, 6, 0.08)");
    sideVignette.addColorStop(0.18, "rgba(5, 5, 6, 0)");
    sideVignette.addColorStop(0.82, "rgba(5, 5, 6, 0)");
    sideVignette.addColorStop(0.92, "rgba(5, 5, 6, 0.08)");
    sideVignette.addColorStop(1, "rgba(5, 5, 6, 0.28)");
    ctx.fillStyle = sideVignette;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    ctx.save();
    overlay = ctx.createLinearGradient(0, 468, 0, 720);
    overlay.addColorStop(0, "rgba(0, 0, 0, 0)");
    overlay.addColorStop(0.32, "rgba(8, 7, 7, 0.1)");
    overlay.addColorStop(1, "rgba(4, 4, 5, 0.32)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 468, 1280, 252);
    ctx.restore();
  }

  function drawHeader(ctx, state, layout) {
    var header = layout.header;
    var modeLabel = state.shop.mode === "browse" ? "黑货在案" : "撤去一式";
    var centerX = header.x + header.width / 2;

    ctx.save();
    ctx.strokeStyle = "rgba(118, 97, 74, 0.34)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(header.x + 56, 0);
    ctx.lineTo(header.x + 56, header.y + 10);
    ctx.moveTo(header.x + header.width - 56, 0);
    ctx.lineTo(header.x + header.width - 56, header.y + 10);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.fillRect(header.x + 12, header.y + 10, header.width, header.height);
    ctx.restore();

    G.render.ui.drawPanel(ctx, header.x, header.y, header.width, header.height, {
      fill: "rgba(79, 58, 39, 0.98)",
      stroke: "rgba(152, 118, 84, 0.34)",
      surface: "wood-button",
      lineWidth: 2,
      holes: false
    });

    ctx.save();
    ctx.fillStyle = "rgba(255, 237, 210, 0.08)";
    ctx.fillRect(header.x + 10, header.y + 8, header.width - 20, 8);
    ctx.fillStyle = "rgba(34, 21, 14, 0.26)";
    ctx.fillRect(header.x + 14, header.y + header.height - 10, header.width - 28, 4);
    ctx.fillStyle = "rgba(24, 18, 14, 0.18)";
    ctx.fillRect(header.x + 18, header.y + 18, header.width - 36, header.height - 32);
    ctx.fillStyle = "rgba(174, 142, 104, 0.3)";
    ctx.beginPath();
    ctx.arc(header.x + 34, header.y + header.height / 2, 4, 0, Math.PI * 2);
    ctx.arc(header.x + header.width - 34, header.y + header.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    G.render.ui.drawLabel(ctx, state.shop.title, centerX, header.y + 31, {
      size: 29,
      align: "center",
      color: "#c4513d",
      weight: "700",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });

    G.render.ui.drawLabel(ctx, modeLabel, centerX, header.y + 48, {
      size: 11,
      align: "center",
      color: "rgba(229, 212, 186, 0.74)",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });

  }

  function drawBrowseCounterSurface(ctx, layout) {
    var box = layout.counter;
    var gradient = null;
    var runner = null;
    var glow = null;

    if (drawBottomAnchoredAsset(ctx, SHOP_SHELL_ART_PATHS.counterPlate, box.width, 720)) {
      drawShadowEllipse(ctx, layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + layout.leaveButton.height + 6, layout.leaveButton.width * 0.8, 24, 0.2);
      return;
    }

    ctx.save();
    gradient = ctx.createLinearGradient(0, box.y, 0, box.y + box.height);
    gradient.addColorStop(0, "rgba(47, 31, 20, 0.14)");
    gradient.addColorStop(0.08, "rgba(62, 42, 28, 0.62)");
    gradient.addColorStop(0.42, "rgba(42, 29, 21, 0.9)");
    gradient.addColorStop(1, "rgba(18, 13, 11, 0.98)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + 20);
    ctx.lineTo(164, box.y + 8);
    ctx.lineTo(404, box.y + 24);
    ctx.lineTo(642, box.y + 4);
    ctx.lineTo(902, box.y + 22);
    ctx.lineTo(1116, box.y + 10);
    ctx.lineTo(box.width, box.y + 20);
    ctx.lineTo(box.width, 720);
    ctx.lineTo(box.x, 720);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 232, 201, 0.12)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + 19);
    ctx.lineTo(164, box.y + 7);
    ctx.lineTo(404, box.y + 23);
    ctx.lineTo(642, box.y + 3);
    ctx.lineTo(902, box.y + 21);
    ctx.lineTo(1116, box.y + 9);
    ctx.lineTo(box.width, box.y + 19);
    ctx.stroke();

    runner = ctx.createLinearGradient(0, box.y + 40, 0, box.y + box.height - 10);
    runner.addColorStop(0, "rgba(55, 42, 34, 0.2)");
    runner.addColorStop(0.2, "rgba(29, 23, 20, 0.52)");
    runner.addColorStop(0.75, "rgba(14, 12, 12, 0.7)");
    runner.addColorStop(1, "rgba(7, 7, 8, 0.86)");
    ctx.fillStyle = runner;
    ctx.beginPath();
    ctx.moveTo(34, box.y + 48);
    ctx.lineTo(1244, box.y + 56);
    ctx.lineTo(1198, box.y + box.height - 16);
    ctx.lineTo(72, box.y + box.height - 22);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(170, 137, 95, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(54, box.y + 64.5);
    ctx.lineTo(1220, box.y + 70.5);
    ctx.moveTo(94, box.y + box.height - 42.5);
    ctx.lineTo(1182, box.y + box.height - 34.5);
    ctx.stroke();

    glow = ctx.createRadialGradient(640, box.y + 102, 0, 640, box.y + 132, 420);
    glow.addColorStop(0, "rgba(164, 118, 74, 0.14)");
    glow.addColorStop(1, "rgba(164, 118, 74, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(128, box.y + 34, 1024, box.height - 52);

    drawShadowEllipse(ctx, layout.relicDrawer.x + layout.relicDrawer.width / 2, layout.relicDrawer.y + layout.relicDrawer.height + 6, layout.relicDrawer.width * 0.92, 26, 0.3);
    drawShadowEllipse(ctx, layout.ledger.x + layout.ledger.width / 2, layout.ledger.y + layout.ledger.height + 8, layout.ledger.width * 0.78, 20, 0.2);
    drawShadowEllipse(ctx, layout.removeButton.x + layout.removeButton.width / 2, layout.removeButton.y + layout.removeButton.height + 4, layout.removeButton.width * 0.82, 24, 0.22);
    drawShadowEllipse(ctx, layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + layout.leaveButton.height + 6, layout.leaveButton.width * 0.82, 24, 0.22);
    ctx.restore();
  }

  function drawCardRigging(ctx, layout) {
    var cardBoxes = getBrowseCardBoxes(layout);
    var i = 0;
    var centerX = 0;
    var railY = layout.header.y + layout.header.height + 20;
    var anchorX = 0;
    var anchorY = 0;
    var anchorOffsets = [-14, -6, 2, 7, 14];
    var anchorYOffsets = [2, 8, -1, 7, 3];
    var stemOffsets = [-6, -2, 1, 4, 8];

    ctx.save();
    ctx.strokeStyle = "rgba(22, 16, 13, 0.9)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(layout.browseStage.x + 104, railY + 2);
    ctx.quadraticCurveTo(344, railY + 16, 640, railY + 1);
    ctx.quadraticCurveTo(924, railY - 12, layout.browseStage.x + layout.browseStage.width - 96, railY + 3);
    ctx.stroke();
    ctx.strokeStyle = "rgba(196, 162, 118, 0.18)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(layout.browseStage.x + 106, railY + 1);
    ctx.quadraticCurveTo(344, railY + 13, 640, railY);
    ctx.quadraticCurveTo(924, railY - 10, layout.browseStage.x + layout.browseStage.width - 98, railY + 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(212, 186, 156, 0.18)";
    ctx.lineWidth = 1.2;
    for (i = 0; i < cardBoxes.length; i += 1) {
      centerX = cardBoxes[i].x + cardBoxes[i].width / 2;
      anchorX = centerX + anchorOffsets[i];
      anchorY = railY + anchorYOffsets[i];
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      ctx.quadraticCurveTo(anchorX + stemOffsets[i] * 0.8, anchorY + 24, centerX + stemOffsets[i], cardBoxes[i].y - 13);
      ctx.stroke();
      ctx.fillStyle = "rgba(165, 136, 101, 0.26)";
      ctx.beginPath();
      ctx.arc(anchorX, anchorY - 1, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(15, 12, 10, 0.34)";
      ctx.fillRect(anchorX - 5, anchorY + 2, 10, 4);
      ctx.fillStyle = "rgba(218, 184, 150, 0.14)";
      ctx.fillRect(anchorX - 3, anchorY + 2, 6, 1);
      ctx.fillStyle = "rgba(171, 137, 102, 0.18)";
      ctx.beginPath();
      ctx.arc(centerX + stemOffsets[i], cardBoxes[i].y - 11, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(centerX + stemOffsets[i], cardBoxes[i].y - 12);
      ctx.rotate(cardBoxes[i].rotation || 0);
      ctx.fillStyle = "rgba(74, 56, 37, 0.96)";
      ctx.fillRect(-7, -4, 14, 8);
      ctx.fillStyle = "rgba(120, 92, 60, 0.5)";
      ctx.fillRect(-7, -4, 14, 2);
      ctx.fillStyle = "rgba(36, 27, 18, 0.96)";
      ctx.fillRect(-4, 3, 3, 10);
      ctx.fillRect(1, 3, 3, 10);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawShadowEllipse(ctx, centerX, centerY, width, height, alpha) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, " + (typeof alpha === "number" ? alpha : 0.22) + ")";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSidebarRow(ctx, box, topY, label, value, options) {
    var opts = options || {};
    var centerX = box.x + box.width / 2;

    G.render.ui.drawLabel(ctx, label, centerX, topY, {
      size: opts.labelSize || 18,
      align: "center",
      color: opts.labelColor || "#7f6951",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });

    G.render.ui.drawLabel(ctx, value, centerX, topY + 38, {
      size: opts.valueSize || 38,
      align: "center",
      color: opts.valueColor || "#2a2018",
      weight: "700",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    drawChip(ctx, box.x + box.width - 56, box.y + box.height - 26, 42, 16, "閬楀繕", {
      fill: "rgba(126, 42, 48, 0.88)",
      stroke: "rgba(109, 37, 44, 0.46)",
      surface: "lacquer-red",
      color: "#f1dfcd",
      size: 10,
      fontFamily: getReadableFontFamily()
    });
  }

  function drawSidebar(ctx, state, layout) {
    var box = layout.sidebar;
    var dividerX = box.x + 28;
    var dividerWidth = box.width - 56;
    var relicCount = Array.isArray(state.player.relics) ? state.player.relics.length : 0;

    G.render.ui.drawPanel(ctx, box.x, box.y, box.width, box.height, {
      fill: "rgba(229, 214, 188, 0.96)",
      stroke: "rgba(109, 82, 53, 0.3)",
      surface: "dossier-paper",
      lineWidth: 2,
      holes: false
    });

    ctx.save();
    ctx.fillStyle = "rgba(255, 246, 229, 0.08)";
    ctx.fillRect(box.x + 22, box.y + 22, box.width - 44, box.height - 44);
    ctx.strokeStyle = "rgba(146, 120, 88, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dividerX, box.y + 208);
    ctx.lineTo(dividerX + dividerWidth, box.y + 208);
    ctx.moveTo(dividerX, box.y + 344);
    ctx.lineTo(dividerX + dividerWidth, box.y + 344);
    ctx.stroke();
    ctx.restore();

    drawSidebarRow(ctx, box, box.y + 116, "行囊大洋", String(state.player.gold), {
      valueColor: "#5a4526"
    });
    drawSidebarRow(ctx, box, box.y + 250, "武学秘籍", String(state.player.masterDeckNames.length), {
      valueColor: "#2d2118"
    });
    drawSidebarRow(ctx, box, box.y + 384, "随身旧物", String(relicCount), {
      valueColor: "#4a3627"
    });
  }

  function drawStageFrame(ctx, box) {
    var gradient = null;
    var glow = null;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(box.x + 10, box.y + 10, box.width - 2, box.height - 2);
    ctx.restore();

    G.render.ui.drawPanel(ctx, box.x, box.y, box.width, box.height, {
      fill: "rgba(15, 14, 14, 0.94)",
      stroke: "rgba(137, 107, 73, 0.24)",
      surface: "dossier-dark",
      lineWidth: 2,
      holes: false
    });

    ctx.save();
    gradient = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.height);
    gradient.addColorStop(0, "rgba(16, 13, 11, 0.18)");
    gradient.addColorStop(0.3, "rgba(20, 16, 13, 0.05)");
    gradient.addColorStop(1, "rgba(10, 9, 8, 0.14)");
    ctx.fillStyle = gradient;
    ctx.fillRect(box.x, box.y, box.width, box.height);

    glow = ctx.createRadialGradient(box.x + box.width / 2, box.y + box.height * 0.36, 0, box.x + box.width / 2, box.y + box.height * 0.36, box.width * 0.42);
    glow.addColorStop(0, "rgba(178, 130, 80, 0.07)");
    glow.addColorStop(1, "rgba(178, 130, 80, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(233, 208, 175, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x + 14.5, box.y + 14.5, box.width - 29, box.height - 29);
    ctx.strokeRect(box.x + 22.5, box.y + 22.5, box.width - 45, box.height - 45);
    ctx.restore();
  }

  function drawTray(ctx, x, y, width, height, palette) {
    var fill = palette && palette.fill ? palette.fill : "rgba(20, 19, 19, 0.34)";
    var stroke = palette && palette.stroke ? palette.stroke : "rgba(188, 158, 122, 0.12)";

    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.restore();
  }

  function drawChip(ctx, x, y, width, height, label, colors) {
    var palette = colors || {};

    G.render.ui.drawPanel(ctx, x, y, width, height, {
      fill: palette.fill || "rgba(97, 34, 30, 0.92)",
      stroke: palette.stroke || "rgba(200, 173, 136, 0.24)",
      surface: palette.surface || "lacquer-red",
      lineWidth: 1.5,
      holes: false
    });
    G.render.ui.drawLabel(ctx, label, x + width / 2, y + height / 2, {
      size: palette.size || 14,
      align: "center",
      color: palette.color || "#ecdcc7",
      weight: "700",
      shadow: false,
      fontFamily: palette.fontFamily || getReadableFontFamily()
    });
  }

  function drawPaperTag(ctx, x, y, width, height, options, drawContent) {
    var opts = options || {};
    var rotation = typeof opts.rotation === "number" ? opts.rotation : 0;
    var innerInset = typeof opts.innerInset === "number" ? opts.innerInset : 10;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(rotation);
    ctx.shadowColor = opts.shadowColor || "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = typeof opts.shadowBlur === "number" ? opts.shadowBlur : 12;
    ctx.shadowOffsetX = typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 0;
    ctx.shadowOffsetY = typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 10;

    G.render.ui.drawPanel(ctx, -width / 2, -height / 2, width, height, {
      fill: opts.fill || "rgba(230, 219, 198, 0.98)",
      stroke: opts.stroke || "rgba(132, 98, 72, 0.34)",
      surface: opts.surface || "dossier-paper",
      lineWidth: typeof opts.lineWidth === "number" ? opts.lineWidth : 1.5,
      holes: false
    });

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = opts.innerFill || "rgba(255, 250, 240, 0.28)";
    ctx.fillRect(-width / 2 + innerInset, -height / 2 + innerInset, width - innerInset * 2, height - innerInset * 2);

    if (opts.bandHeight) {
      ctx.fillStyle = opts.bandFill || "rgba(170, 67, 49, 0.9)";
      ctx.fillRect(-width / 2, -height / 2, width, opts.bandHeight);
    }

    if (opts.ruleY) {
      ctx.fillStyle = opts.ruleColor || "rgba(142, 87, 62, 0.32)";
      ctx.fillRect(-width / 2 + innerInset, -height / 2 + opts.ruleY, width - innerInset * 2, 1);
    }

    if (typeof drawContent === "function") {
      drawContent(ctx, -width / 2, -height / 2, width, height);
    }
    ctx.restore();
  }

  function traceDeskFlyerPath(ctx, width, height) {
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 42, -height / 2 + 22);
    ctx.lineTo(width / 2 - 26, -height / 2 + 8);
    ctx.lineTo(width / 2 + 14, height / 2 - 2);
    ctx.lineTo(-width / 2 + 2, height / 2 + 14);
    ctx.closePath();
  }

  function drawDeskFlyer(ctx, x, y, width, height, options, drawContent) {
    var opts = options || {};
    var rotation = typeof opts.rotation === "number" ? opts.rotation : 0;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(rotation);

    ctx.save();
    ctx.translate(typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 4, typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 6);
    ctx.fillStyle = opts.shadowColor || "rgba(0, 0, 0, 0.12)";
    traceDeskFlyerPath(ctx, width, height);
    ctx.fill();
    ctx.restore();

    traceDeskFlyerPath(ctx, width, height);
    ctx.fillStyle = opts.fill || "rgba(228, 216, 195, 0.99)";
    ctx.fill();
    ctx.strokeStyle = opts.stroke || "rgba(138, 102, 78, 0.34)";
    ctx.lineWidth = typeof opts.lineWidth === "number" ? opts.lineWidth : 1.4;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    traceDeskFlyerPath(ctx, width, height);
    ctx.clip();
    ctx.fillStyle = opts.innerFill || "rgba(255, 252, 244, 0.22)";
    ctx.fillRect(-width / 2 + 14, -height / 2 + 14, width - 28, height - 28);
    ctx.fillStyle = opts.bandFill || "rgba(176, 70, 48, 0.9)";
    ctx.fillRect(-width / 2 + 12, -height / 2 + 10, width - 28, 6);
    ctx.fillStyle = opts.foldFill || "rgba(190, 174, 152, 0.62)";
    ctx.beginPath();
    ctx.moveTo(width / 2 - 18, -height / 2 + 10);
    ctx.lineTo(width / 2 + 2, -height / 2 + 8);
    ctx.lineTo(width / 2 - 4, -height / 2 + 26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (typeof drawContent === "function") {
      drawContent(ctx, -width / 2, -height / 2, width, height);
    }

    ctx.restore();
  }

  function traceDossierSlipPath(ctx, width, height, variant) {
    var left = -width / 2;
    var right = width / 2;
    var top = -height / 2;
    var bottom = height / 2;

    ctx.beginPath();
    if (variant === 1) {
      ctx.moveTo(left + 22, top + 8);
      ctx.lineTo(right - 18, top + 4);
      ctx.lineTo(right + 5, top + 18);
      ctx.lineTo(right - 8, bottom - 7);
      ctx.lineTo(left + 20, bottom + 4);
      ctx.lineTo(left - 6, bottom - 11);
      ctx.closePath();
      return;
    }

    if (variant === 2) {
      ctx.moveTo(left + 32, top + 4);
      ctx.lineTo(right - 26, top + 10);
      ctx.lineTo(right + 7, top + 2);
      ctx.lineTo(right - 10, bottom - 5);
      ctx.lineTo(left + 14, bottom + 6);
      ctx.lineTo(left - 7, bottom - 3);
      ctx.lineTo(left + 6, top + 18);
      ctx.closePath();
      return;
    }

    ctx.moveTo(left + 18, top + 6);
    ctx.lineTo(right - 16, top + 4);
    ctx.lineTo(right + 4, top + 14);
    ctx.lineTo(right - 12, bottom - 4);
    ctx.lineTo(left + 14, bottom + 5);
    ctx.lineTo(left - 5, bottom - 7);
    ctx.closePath();
  }

  function drawDossierSlip(ctx, x, y, width, height, options, drawContent) {
    var opts = options || {};
    var rotation = typeof opts.rotation === "number" ? opts.rotation : 0;
    var pinOffsets = Array.isArray(opts.pinOffsets) && opts.pinOffsets.length ? opts.pinOffsets : [0.22, 0.78];
    var variant = typeof opts.variant === "number" ? opts.variant : 0;
    var pinY = typeof opts.pinY === "number" ? opts.pinY : 9;
    var i = 0;
    var pinX = 0;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(rotation);

    ctx.save();
    ctx.translate(
      typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 3,
      typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 6
    );
    ctx.fillStyle = opts.shadowColor || "rgba(0, 0, 0, 0.13)";
    traceDossierSlipPath(ctx, width, height, variant);
    ctx.fill();
    ctx.restore();

    traceDossierSlipPath(ctx, width, height, variant);
    ctx.fillStyle = opts.fill || "rgba(222, 207, 179, 0.98)";
    ctx.fill();
    ctx.strokeStyle = opts.stroke || "rgba(128, 96, 73, 0.28)";
    ctx.lineWidth = typeof opts.lineWidth === "number" ? opts.lineWidth : 1.4;
    ctx.stroke();

    ctx.save();
    traceDossierSlipPath(ctx, width, height, variant);
    ctx.clip();
    ctx.fillStyle = opts.innerFill || "rgba(255, 248, 236, 0.16)";
    ctx.fillRect(-width / 2 + 12, -height / 2 + 8, width - 24, height - 16);
    if (opts.bandHeight) {
      ctx.fillStyle = opts.bandFill || "rgba(155, 58, 42, 0.82)";
      ctx.fillRect(-width / 2 + 10, -height / 2 + 8, width - 20, opts.bandHeight);
    }
    if (opts.sideBandWidth) {
      ctx.fillStyle = opts.sideBandFill || "rgba(116, 50, 40, 0.16)";
      ctx.fillRect(-width / 2 + 12, -height / 2 + 10, opts.sideBandWidth, height - 20);
    }
    if (!opts.disableFold) {
      ctx.fillStyle = opts.foldFill || "rgba(189, 173, 149, 0.52)";
      ctx.beginPath();
      if (variant === 2) {
        ctx.moveTo(width / 2 - 26, -height / 2 + 10);
        ctx.lineTo(width / 2 + 2, -height / 2 + 4);
        ctx.lineTo(width / 2 - 5, -height / 2 + 24);
      } else {
        ctx.moveTo(width / 2 - 20, -height / 2 + 8);
        ctx.lineTo(width / 2 + 2, -height / 2 + 12);
        ctx.lineTo(width / 2 - 6, -height / 2 + 28);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    for (i = 0; i < pinOffsets.length; i += 1) {
      pinX = -width / 2 + Math.round(width * pinOffsets[i]);
      ctx.fillStyle = "rgba(41, 36, 33, 0.9)";
      ctx.beginPath();
      ctx.arc(pinX, -height / 2 + pinY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(208, 192, 175, 0.78)";
      ctx.beginPath();
      ctx.arc(pinX - 1, -height / 2 + pinY - 1, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    if (typeof drawContent === "function") {
      drawContent(ctx, -width / 2, -height / 2, width, height);
    }

    ctx.restore();
  }

  function drawSoldRibbon(ctx, centerX, centerY, width, height, rotation, label, options) {
    var opts = options || {};

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(typeof rotation === "number" ? rotation : 0);

    G.render.ui.drawPanel(ctx, -width / 2, -height / 2, width, height, {
      fill: opts.fill || "rgba(121, 45, 34, 0.94)",
      stroke: opts.stroke || "rgba(86, 31, 24, 0.86)",
      surface: opts.surface || "lacquer-red",
      lineWidth: typeof opts.lineWidth === "number" ? opts.lineWidth : 1.4,
      holes: false
    });

    ctx.fillStyle = opts.innerFill || "rgba(255, 243, 228, 0.06)";
    ctx.fillRect(-width / 2 + 8, -height / 2 + 6, width - 16, height - 12);

    G.render.ui.drawLabel(ctx, label, 0, 4, {
      size: opts.size || 14,
      align: "center",
      color: opts.color || "#f2dfc9",
      shadow: false,
      fontFamily: opts.fontFamily || getTitleFontFamily()
    });
    ctx.restore();
  }

  function drawCardPriceThread(ctx, box) {
    var priceBox = getBrowseCardPriceBox(box);
    var tagHeight = priceBox.height || 32;
    var hh = tagHeight / 2;
    var centerX = priceBox.x + priceBox.width / 2;
    var centerY = priceBox.y + priceBox.height / 2;
    var rotation = priceBox.rotation || 0;

    // 精确计算打孔处的物理坐标
    var localHoleY = -hh + 6;
    var holeX = centerX - localHoleY * Math.sin(rotation);
    var holeY = centerY + localHoleY * Math.cos(rotation);

    var cardCenterX = box.x + box.width / 2;
    var cardBottomY = box.y + box.height - 2; // 只夹在卡牌最底部的边缘

    ctx.save();
    // 麻绳的强烈物理悬空投影
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 6;
    
    // 一根更硬挺的粗麻绳
    ctx.strokeStyle = "rgba(180, 145, 105, 0.95)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cardCenterX, cardBottomY);
    ctx.quadraticCurveTo(cardCenterX - 8, cardBottomY + 10, holeX, holeY);
    ctx.stroke();

    ctx.shadowColor = "transparent";

    // 卡牌底部的生锈铁夹子，用来夹住麻绳，增加厚重感
    ctx.fillStyle = "#161616";
    ctx.fillRect(cardCenterX - 8, cardBottomY - 6, 16, 8);
    ctx.fillStyle = "rgba(160, 90, 60, 0.9)"; // 铁锈高光
    ctx.fillRect(cardCenterX - 6, cardBottomY - 5, 12, 4);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(cardCenterX - 6, cardBottomY - 5, 12, 1);
    ctx.restore();
  }

  function drawOfferPriceTag(ctx, box, price, options) {
    var opts = options || {};
    var priceBox = getBrowseCardPriceBox(box);
    var affordable = opts.affordable !== false;
    var variant = opts.variant || "default";
    var labelText = typeof opts.label === "string" ? opts.label : String(price);
    var unitText = opts.hideUnit ? "" : (typeof opts.unit === "string" ? opts.unit : "大洋");

    var tagWidth = 84;
    var tagHeight = 32;
    var centerX = priceBox.x + priceBox.width / 2;
    var centerY = priceBox.y + priceBox.height / 2;
    var rotation = typeof priceBox.rotation === "number" ? priceBox.rotation : ((box.rotation || 0) * 0.82);

    drawCardPriceThread(ctx, box);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // 强烈的物理投影
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 8;

    var hw = tagWidth / 2;
    var hh = tagHeight / 2;
    var bevel = 8; // 切角的尺寸

    // 画真实的货物标签（切掉顶部的两个角）
    ctx.beginPath();
    ctx.moveTo(-hw + bevel, -hh);
    ctx.lineTo(hw - bevel, -hh);
    ctx.lineTo(hw, -hh + bevel);
    ctx.lineTo(hw, hh);
    ctx.lineTo(-hw, hh);
    ctx.lineTo(-hw, -hh + bevel);
    ctx.closePath();

    // 硬纸板的底色
    var fill = affordable ? "rgba(225, 210, 185, 1)" : "rgba(180, 170, 155, 1)";
    if (variant === "sold") fill = "rgba(160, 145, 130, 1)";
    ctx.fillStyle = fill;
    ctx.fill();

    // 清除投影（以免内部图案也有投影）
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 表面做旧与光影纹理
    var texGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
    texGrad.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    texGrad.addColorStop(0.5, "rgba(200, 180, 150, 0)");
    texGrad.addColorStop(1, "rgba(0, 0, 0, 0.15)");
    ctx.fillStyle = texGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(100, 80, 60, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 侧边醒目的红色涂装标记
    var bandFill = affordable ? "rgba(170, 50, 40, 0.75)" : "rgba(120, 90, 80, 0.7)";
    if (variant === "sold") bandFill = "rgba(100, 70, 60, 0.6)";
    ctx.fillStyle = bandFill;
    ctx.fillRect(-hw + 16, -hh, 6, tagHeight);

    // 真实的绳结穿孔（配合上方的麻绳坐标）
    var localHoleY = -hh + 6;
    ctx.fillStyle = "rgba(12, 8, 6, 0.95)";
    ctx.beginPath();
    ctx.arc(0, localHoleY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 穿孔金属防磨圈
    ctx.strokeStyle = "rgba(180, 160, 140, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    var labelColor = affordable ? "#3a2a22" : "#5a5048";
    var unitColor = affordable ? "#7a4a3a" : "#6a6058";
    if (variant === "sold") {
      labelColor = "#504035";
      unitColor = "#504035";
    }

    // 开启正片叠底，让文字像印在纸上的油墨
    ctx.globalCompositeOperation = "multiply";

    // 印记参考线
    ctx.fillStyle = variant === "sold" ? "rgba(120, 100, 80, 0.15)" : "rgba(140, 100, 80, 0.15)";
    ctx.fillRect(-hw + 28, hh - 10, tagWidth - 36, 1.5);

    if (unitText) {
      G.render.ui.drawLabel(ctx, labelText, -4, -1, {
        size: opts.labelSize || (labelText.length > 2 ? 14 : 18),
        align: "center",
        color: labelColor,
        weight: "700",
        shadow: false,
        fontFamily: labelText.length > 2 ? getReadableFontFamily() : getBodyFontFamily()
      });
      G.render.ui.drawLabel(ctx, unitText, hw - 10, 2, {
        size: 10,
        align: "right",
        color: unitColor,
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    } else {
      G.render.ui.drawLabel(ctx, labelText, 6, -1, {
        size: opts.labelSize || 14,
        align: "center",
        color: labelColor,
        weight: "700",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    }

    ctx.restore();
  }

  function drawLedgerInkEntry(ctx, x, y, amount, options) {
    var opts = options || {};
    var rotation = typeof opts.rotation === "number" ? opts.rotation : -0.015;
    var label = String(amount);
    var unitText = typeof opts.unitText === "string" ? opts.unitText : "\u5927\u6d0b";
    var skewX = typeof opts.skewX === "number" ? opts.skewX : -0.06;
    var scaleY = typeof opts.scaleY === "number" ? opts.scaleY : 0.92;
    var valueSize = typeof opts.valueSize === "number" ? opts.valueSize : 32;
    var curve = typeof opts.curve === "number" ? opts.curve : 1.2;
    var spacing = typeof opts.spacing === "number" ? opts.spacing : 2;
    var chars = label.split("");
    var widths = [];
    var totalWidth = 0;
    var cursor = 0;
    var index = 0;
    var normalized = 0;
    var baselineY = 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.transform(1, 0, skewX, scaleY, 0, 0);
    ctx.globalCompositeOperation = "multiply";

    ctx.fillStyle = "rgba(144, 103, 72, 0.12)";
    ctx.fillRect(-106, -20, 126, 1);
    ctx.fillRect(-106, -4, 126, 1);
    ctx.fillRect(-106, 12, 126, 1);
    ctx.fillStyle = "rgba(170, 66, 48, 0.08)";
    ctx.fillRect(-92, -30, 28, 4);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "700 " + valueSize + "px " + getBodyFontFamily();

    for (index = 0; index < chars.length; index += 1) {
      widths[index] = ctx.measureText(chars[index]).width;
      totalWidth += widths[index];
    }
    totalWidth += Math.max(0, chars.length - 1) * spacing;
    cursor = -totalWidth;

    for (index = 0; index < chars.length; index += 1) {
      normalized = chars.length <= 1 ? 0.5 : (index / (chars.length - 1));
      baselineY = 1 + Math.sin(normalized * Math.PI) * curve - (index % 2 === 0 ? 0.55 : -0.15);
      ctx.fillStyle = "rgba(72, 55, 43, 0.76)";
      ctx.fillText(chars[index], cursor, baselineY);
      ctx.fillStyle = "rgba(148, 86, 64, 0.16)";
      ctx.fillText(chars[index], cursor - 1, baselineY + 1);
      cursor += widths[index] + spacing;
    }

    ctx.textAlign = "left";
    ctx.font = "10px " + getReadableFontFamily();
    ctx.fillStyle = "rgba(116, 89, 65, 0.72)";
    ctx.fillText(unitText, 8, 5);
    ctx.restore();
  }

  function drawSoldCardStamp(ctx, box) {
    ctx.save();
    ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
    ctx.rotate(box.rotation || 0);
    ctx.fillStyle = "rgba(8, 8, 9, 0.28)";
    ctx.fillRect(-box.width / 2 + 6, -box.height / 2 + 6, box.width - 12, box.height - 12);
    ctx.strokeStyle = "rgba(141, 61, 48, 0.28)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-box.width / 2 + 10.5, -box.height / 2 + 10.5, box.width - 21, box.height - 21);
    ctx.restore();

    drawSoldRibbon(
      ctx,
      box.x + box.width / 2,
      box.y + box.height * 0.56,
      Math.min(box.width - 18, 126),
      34,
      (box.rotation || 0) - 0.035,
      "已取走",
      {
        size: box.width >= 180 ? 15 : 13,
        fill: "rgba(118, 43, 33, 0.96)",
        stroke: "rgba(81, 30, 23, 0.86)"
      }
    );
  }

  function drawSoldRelicStamp(ctx, box) {
    ctx.save();
    ctx.fillStyle = "rgba(8, 8, 9, 0.26)";
    ctx.fillRect(box.x + 10, box.y + 10, box.width - 20, 72);
    ctx.restore();

    drawSoldRibbon(
      ctx,
      box.x + box.width / 2,
      box.y + 48,
      box.width - 34,
      24,
      -0.05,
      "已取走",
      {
        fill: "rgba(111, 43, 33, 0.92)",
        stroke: "rgba(81, 31, 24, 0.82)",
        size: 12
      }
    );
  }

  function drawLedgerNote(ctx, state, layout) {
    var box = layout.ledger;
    var rodsY = [box.y + 30, box.y + 46, box.y + 62];
    var beadSets = [
      [box.x + 36, box.x + 50],
      [box.x + 36, box.x + 50],
      [box.x + 36]
    ];
    var row = 0;
    var bead = 0;

    ctx.save();
    ctx.fillStyle = "rgba(9, 8, 8, 0.18)";
    ctx.fillRect(box.x + 18, box.y + 12, box.width - 30, box.height - 18);
    ctx.fillStyle = "rgba(225, 196, 154, 0.06)";
    ctx.fillRect(box.x + 18, box.y + 12, box.width - 30, 2);
    ctx.fillStyle = "rgba(16, 13, 12, 0.22)";
    ctx.fillRect(box.x + 92, box.y + 22, 88, 38);

    ctx.strokeStyle = "rgba(209, 182, 142, 0.26)";
    ctx.lineWidth = 1.2;
    for (row = 0; row < rodsY.length; row += 1) {
      ctx.beginPath();
      ctx.moveTo(box.x + 22, rodsY[row]);
      ctx.lineTo(box.x + 76, rodsY[row]);
      ctx.stroke();
    }

    for (row = 0; row < beadSets.length; row += 1) {
      for (bead = 0; bead < beadSets[row].length; bead += 1) {
        ctx.fillStyle = row === 2 ? "rgba(161, 64, 47, 0.92)" : "rgba(182, 138, 89, 0.92)";
        ctx.beginPath();
        ctx.arc(beadSets[row][bead], rodsY[row], 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = "rgba(174, 148, 114, 0.24)";
    ctx.beginPath();
    ctx.arc(box.x + 20, box.y + 18, 2.8, 0, Math.PI * 2);
    ctx.arc(box.x + box.width - 22, box.y + 18, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    G.render.ui.drawLabel(ctx, "行囊现银", box.x + 18, box.y + 18, {
      size: 12,
      color: "#d7c2a2",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });

    G.render.ui.drawLabel(ctx, String(state.player.gold), box.x + 130, box.y + 50, {
      size: 30,
      align: "center",
      color: "#f3e6d4",
      weight: "700",
      shadow: false,
      fontFamily: getBodyFontFamily()
    });

    G.render.ui.drawLabel(ctx, "大洋", box.x + box.width - 14, box.y + 52, {
      size: 10,
      align: "right",
      color: "#d4bca0",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });

    G.render.ui.drawLabel(ctx, "柜上不卖", box.x + 18, box.y + box.height - 12, {
      size: 10,
      color: "rgba(215, 194, 162, 0.68)",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
  }

  function drawLedgerNoteV2(ctx, state, layout) {
    var box = layout.ledger;
    var rotation = typeof box.rotation === "number" ? box.rotation : 0;

    if (isAssetReady(SHOP_SHELL_ART_PATHS.counterPlate)) {
      ctx.save();
      ctx.fillStyle = "rgba(52, 39, 27, 0.08)";
      ctx.fillRect(box.x + 18, box.y + 16, box.width - 32, box.height - 24);
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.92;
      G.render.ui.drawLabel(ctx, "行囊现银", box.x + 24, box.y + 34, {
        size: 11,
        color: "#8f4a39",
        shadow: false,
        fontFamily: getTitleFontFamily()
      });
      G.render.ui.drawLabel(ctx, "账上现款", box.x + 208, box.y + 34, {
        size: 10,
        color: "rgba(125, 88, 61, 0.7)",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawLabel(ctx, String(state.player.gold), box.x + 240, box.y + 70, {
        size: 30,
        align: "right",
        color: "#463326",
        weight: "700",
        shadow: false,
        fontFamily: getBodyFontFamily()
      });
      G.render.ui.drawLabel(ctx, "大洋", box.x + 246, box.y + 71, {
        size: 10,
        align: "left",
        color: "#8e7c66",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      ctx.restore();
      return;
    }

    if (!drawShellAssetCover(ctx, SHOP_SHELL_ART_PATHS.ledger, box.x, box.y, box.width, box.height, {
      rotation: rotation,
      shadowBlur: 10,
      shadowOffsetX: 4,
      shadowOffsetY: 8,
      focusX: 0.5,
      focusY: 0.5
    })) {
      drawPaperTag(ctx, box.x, box.y, box.width, box.height, {
        rotation: rotation,
        fill: "rgba(223, 206, 180, 0.98)",
        stroke: "rgba(132, 98, 72, 0.24)",
        innerFill: "rgba(255, 249, 238, 0.16)",
        bandHeight: 4,
        bandFill: "rgba(156, 62, 45, 0.82)",
        shadowBlur: 10,
        shadowOffsetY: 8
      });
    }

    ctx.save();
    ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
    ctx.rotate(rotation);
    ctx.fillStyle = "rgba(121, 74, 53, 0.16)";
    ctx.fillRect(-box.width / 2 + 18, -box.height / 2 + 24, box.width - 36, 1);
    ctx.fillRect(-box.width / 2 + 18, box.height / 2 - 22, box.width - 36, 1);
    ctx.fillRect(-box.width / 2 + 74, -box.height / 2 + 18, 1, box.height - 36);
    ctx.fillStyle = "rgba(169, 60, 43, 0.18)";
    ctx.fillRect(-box.width / 2 + 28, -box.height / 2 + 36, 28, 4);
    ctx.fillRect(-box.width / 2 + 28, -box.height / 2 + 46, 20, 4);
    ctx.fillRect(-box.width / 2 + 28, -box.height / 2 + 56, 24, 4);

    G.render.ui.drawLabel(ctx, "行囊现银", -box.width / 2 + 22, -box.height / 2 + 22, {
      size: 12,
      color: "#8f4a39",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
    G.render.ui.drawLabel(ctx, "柜上不卖", -box.width / 2 + 22, box.height / 2 - 12, {
      size: 10,
      color: "rgba(101, 75, 57, 0.74)",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, String(state.player.gold), box.width / 2 - 38, 6, {
      size: 33,
      align: "right",
      color: "#433226",
      weight: "700",
      shadow: false,
      fontFamily: getBodyFontFamily()
    });
    G.render.ui.drawLabel(ctx, "大洋", box.width / 2 - 18, 8, {
      size: 10,
      align: "left",
      color: "#8f7d68",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, "只记账", box.width / 2 - 22, box.height / 2 - 12, {
      size: 10,
      align: "right",
      color: "rgba(153, 74, 54, 0.82)",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    ctx.restore();
  }

  function drawRelicDrawerShell(ctx, layout) {
    var box = layout.relicDrawer;
    var innerGlow = null;
    var usedShell = false;

    if (isAssetReady(SHOP_SHELL_ART_PATHS.counterPlate)) {
      G.render.ui.drawLabel(ctx, "旧物", box.x + 6, box.y - 6, {
        size: 13,
        color: "rgba(226, 200, 151, 0.92)",
        shadow: false,
        fontFamily: getTitleFontFamily()
      });
      G.render.ui.drawLabel(ctx, "两件旧器", box.x + box.width - 2, box.y - 6, {
        size: 10,
        align: "right",
        color: "rgba(226, 200, 151, 0.66)",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height - 8, box.width * 0.44, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    usedShell = drawShellAssetCover(ctx, SHOP_SHELL_ART_PATHS.relicTray, box.x, box.y, box.width, box.height, {
      shadowBlur: 18,
      shadowOffsetY: 10,
      focusX: 0.5,
      focusY: 0.46
    });

    ctx.save();
    innerGlow = ctx.createRadialGradient(box.x + 118, box.y + 86, 0, box.x + 118, box.y + 86, 100);
    innerGlow.addColorStop(0, "rgba(220, 164, 93, 0.18)");
    innerGlow.addColorStop(1, "rgba(220, 164, 93, 0)");
    ctx.fillStyle = innerGlow;
    ctx.fillRect(box.x + 10, box.y + 24, 190, 90);
    innerGlow = ctx.createRadialGradient(box.x + box.width - 118, box.y + 86, 0, box.x + box.width - 118, box.y + 86, 100);
    innerGlow.addColorStop(0, "rgba(220, 164, 93, 0.16)");
    innerGlow.addColorStop(1, "rgba(220, 164, 93, 0)");
    ctx.fillStyle = innerGlow;
    ctx.fillRect(box.x + box.width - 200, box.y + 24, 190, 90);
    ctx.fillStyle = "rgba(255, 232, 198, 0.05)";
    ctx.fillRect(box.x + 18, box.y + 18, box.width - 36, 14);
    ctx.restore();

    if (!usedShell) {
      G.render.ui.drawPanel(ctx, box.x, box.y, box.width, box.height, {
        fill: "rgba(61, 45, 29, 0.95)",
        stroke: "rgba(126, 92, 63, 0.32)",
        surface: "wood-button",
        lineWidth: 1.8,
        holes: false
      });

      ctx.save();
      ctx.fillStyle = "rgba(255, 244, 224, 0.05)";
      ctx.fillRect(box.x + 12, box.y + 10, box.width - 24, 18);
      ctx.fillStyle = "rgba(76, 55, 35, 0.82)";
      ctx.fillRect(box.x + 12, box.y + 32, box.width - 24, 4);
      innerGlow = ctx.createLinearGradient(box.x, box.y + 38, box.x, box.y + box.height - 10);
      innerGlow.addColorStop(0, "rgba(36, 26, 18, 0.48)");
      innerGlow.addColorStop(0.2, "rgba(24, 17, 12, 0.72)");
      innerGlow.addColorStop(1, "rgba(12, 10, 10, 0.88)");
      ctx.fillStyle = innerGlow;
      ctx.fillRect(box.x + 12, box.y + 38, box.width - 24, box.height - 50);
      ctx.fillStyle = "rgba(52, 35, 22, 0.92)";
      ctx.fillRect(box.x + box.width / 2 - 5, box.y + 40, 10, box.height - 54);
      innerGlow = ctx.createRadialGradient(box.x + 112, box.y + 78, 0, box.x + 112, box.y + 78, 88);
      innerGlow.addColorStop(0, "rgba(187, 136, 78, 0.14)");
      innerGlow.addColorStop(1, "rgba(187, 136, 78, 0)");
      ctx.fillStyle = innerGlow;
      ctx.fillRect(box.x + 12, box.y + 36, 194, 92);
      innerGlow = ctx.createRadialGradient(box.x + box.width - 112, box.y + 78, 0, box.x + box.width - 112, box.y + 78, 88);
      innerGlow.addColorStop(0, "rgba(187, 136, 78, 0.14)");
      innerGlow.addColorStop(1, "rgba(187, 136, 78, 0)");
      ctx.fillStyle = innerGlow;
      ctx.fillRect(box.x + box.width - 206, box.y + 36, 194, 92);
      ctx.strokeStyle = "rgba(143, 107, 74, 0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(box.x + 12.5, box.y + 38.5, box.width - 25, box.height - 51);
      ctx.strokeStyle = "rgba(158, 122, 86, 0.14)";
      ctx.strokeRect(box.x + 22.5, box.y + 46.5, 178, 74);
      ctx.strokeRect(box.x + 224.5, box.y + 46.5, 178, 74);
      ctx.restore();
    }

    G.render.ui.drawLabel(ctx, "旧物", box.x + 28, box.y + 26, {
      size: 14,
      color: "#e4c892",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });

    G.render.ui.drawLabel(ctx, "两件旧货", box.x + box.width - 28, box.y + 26, {
      size: 11,
      align: "right",
      color: "rgba(228, 200, 146, 0.72)",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });

  }

  function drawRelicGlyph(ctx, offer, x, y, width, height) {
    var glow = ctx.createRadialGradient(x + width * 0.52, y + height * 0.4, 6, x + width * 0.52, y + height * 0.4, width * 0.58);

    ctx.save();
    glow.addColorStop(0, "rgba(255, 238, 210, 0.12)");
    glow.addColorStop(1, "rgba(255, 238, 210, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.fillRect(x + 8, y + 8, width - 16, height - 16);
    G.render.ui.drawLabel(ctx, offer.icon || "物", x + width / 2, y + height / 2 + 2, {
      size: 52,
      align: "center",
      color: "rgba(235, 226, 210, 0.4)",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
    ctx.restore();
  }

  function drawRelicArt(ctx, offer, x, y, width, height) {
    var artPath = offer && offer.id ? SHOP_RELIC_ART_PATHS[offer.id] : "";
    var used = false;

    if (!artPath) {
      return false;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.filter = offer && offer.sold ? "brightness(0.72)" : "brightness(1.18) contrast(1.06)";
    used = drawImageContain(ctx, artPath, x + 4, y + 4, width - 8, height - 8, {
      alpha: offer && offer.sold ? 0.56 : 0.98,
      alignX: 0.5,
      alignY: 0.5
    });
    ctx.filter = "none";
    ctx.restore();

    return used;
  }

  function drawUnaffordableCardWash(ctx, box) {
    ctx.save();
    ctx.translate(box.x + box.width / 2, box.y + box.height / 2);
    ctx.rotate(box.rotation || 0);
    ctx.fillStyle = "rgba(10, 10, 11, 0.16)";
    ctx.fillRect(-box.width / 2 + 8, -box.height / 2 + 8, box.width - 16, box.height - 16);
    ctx.restore();
  }

  function drawCardOffer(ctx, state, offer, box) {
    var affordable = !offer.sold && canAfford(state, offer.price);

    G.render.ui.drawCardSlot(ctx, {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rotation: box.rotation || 0,
      scale: box.scale || 1,
      cost: offer.cost,
      name: offer.name,
      text: offer.text,
      playable: !offer.sold && affordable,
      alpha: offer.sold ? 0.78 : (affordable ? 1 : 0.82),
      layoutMode: "reward",
      artRole: "reward",
      showFooterTokens: false,
      shadowBlur: 8,
      shadowOffsetX: 2,
      shadowOffsetY: 4
    });

    if (offer.sold) {
      drawOfferPriceTag(ctx, box, offer.price, {
        affordable: false,
        variant: "sold",
        label: "已取走",
        hideUnit: true,
        labelSize: 13
      });
      drawSoldCardStamp(ctx, box);
      return;
    }

    if (!affordable) {
      drawUnaffordableCardWash(ctx, box);
    }

    drawOfferPriceTag(ctx, box, offer.price, { affordable: affordable });
  }

  function drawRelicOffer(ctx, state, offer, box) {
    var affordable = !offer.sold && canAfford(state, offer.price);
    var artX = box.x + 10;
    var artY = box.y + 6;
    var artWidth = box.width - 20;
    var artHeight = 60;
    var infoWidth = box.width - 48;
    var infoX = box.x + 24;
    var infoY = box.y + 58;
    var usedArt = false;
    var glow = null;
    var lamp = null;

    ctx.save();
    glow = ctx.createRadialGradient(box.x + box.width / 2, box.y + 38, 0, box.x + box.width / 2, box.y + 38, 80);
    glow.addColorStop(0, affordable && !offer.sold ? "rgba(214, 162, 92, 0.32)" : "rgba(255, 247, 232, 0.14)");
    glow.addColorStop(1, "rgba(182, 129, 76, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(box.x, box.y - 2, box.width, artHeight + 28);
    lamp = ctx.createRadialGradient(box.x + box.width / 2, box.y + 30, 0, box.x + box.width / 2, box.y + 34, 52);
    lamp.addColorStop(0, "rgba(255, 236, 196, 0.24)");
    lamp.addColorStop(1, "rgba(255, 236, 196, 0)");
    ctx.fillStyle = lamp;
    ctx.fillRect(artX, artY, artWidth, artHeight);
    ctx.restore();

    usedArt = drawRelicArt(ctx, offer, artX, artY, artWidth, artHeight);
    if (!usedArt) {
      drawRelicGlyph(ctx, offer, artX, artY, artWidth, artHeight);
    }

    if (offer.sold) {
      drawSoldRelicStamp(ctx, box);
    }

    if (!affordable && !offer.sold) {
      ctx.save();
      ctx.fillStyle = "rgba(10, 9, 9, 0.26)";
      ctx.fillRect(artX + 2, artY + 2, artWidth - 4, artHeight - 4);
      ctx.restore();
    }

    drawShadowEllipse(ctx, box.x + box.width / 2, box.y + 58, artWidth * 0.34, 10, offer.sold ? 0.15 : 0.22);

    drawPaperTag(ctx, infoX, infoY, infoWidth, 18, {
      rotation: box.x < 220 ? -0.018 : 0.012,
      fill: offer.sold ? "rgba(176, 163, 144, 0.92)" : (affordable ? "rgba(214, 197, 168, 0.96)" : "rgba(176, 164, 149, 0.92)"),
      stroke: offer.sold ? "rgba(108, 95, 80, 0.24)" : (affordable ? "rgba(118, 92, 66, 0.28)" : "rgba(102, 92, 83, 0.24)"),
      innerFill: "rgba(255, 247, 233, 0.12)",
      innerInset: 6,
      shadowBlur: 4,
      shadowOffsetY: 2
    }, function (drawCtx, left, top, width, height) {
      drawCtx.fillStyle = "rgba(118, 91, 67, 0.2)";
      drawCtx.fillRect(left + width - 48, top + 4, 1, height - 8);
      G.render.ui.drawLabel(drawCtx, offer.name, left + 8, top + height / 2 + 2, {
        size: 9,
        color: offer.sold ? "#74675d" : (affordable ? "#46362c" : "#5d534b"),
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawLabel(drawCtx, offer.sold ? "已取走" : String(offer.price), left + width - 8, top + height / 2 + 1, {
        size: 10,
        align: "right",
        color: offer.sold ? "#74675d" : (affordable ? "#8a4f3f" : "#7c746b"),
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    });
  }

  function drawBrowseStage(ctx, state, layout) {
    var stage = layout.browseStage;
    var cardBoxes = getBrowseCardBoxes(layout);
    var relicBoxes = getBrowseRelicBoxes(layout);
    var order = [0, 1, 2, 3, 4];
    var i = 0;
    var glow = null;
    var haze = null;

    ctx.save();
    haze = ctx.createLinearGradient(0, stage.y, 0, stage.y + 272);
    haze.addColorStop(0, "rgba(0, 0, 0, 0.08)");
    haze.addColorStop(0.35, "rgba(0, 0, 0, 0.18)");
    haze.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = haze;
    ctx.fillRect(stage.x + 44, stage.y + 10, stage.width - 88, 252);
    ctx.restore();

    ctx.save();
    glow = ctx.createRadialGradient(640, stage.y + 42, 0, 640, stage.y + 154, 418);
    glow.addColorStop(0, "rgba(196, 134, 78, 0.18)");
    glow.addColorStop(1, "rgba(174, 121, 75, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(stage.x + 32, stage.y - 2, stage.width - 64, 270);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(stage.x + 84, stage.y + 238, stage.width - 168, 24);
    ctx.restore();

    drawBrowseCounterSurface(ctx, layout);
    drawCardRigging(ctx, layout);

    for (i = 0; i < order.length; i += 1) {
      drawCardOffer(ctx, state, state.shop.cardOffers[order[i]], cardBoxes[order[i]]);
    }

    drawRelicDrawerShell(ctx, layout);
    drawLedgerNoteV2(ctx, state, layout);

    for (i = 0; i < state.shop.relicOffers.length; i += 1) {
      drawRelicOffer(ctx, state, state.shop.relicOffers[i], relicBoxes[i]);
    }
  }

  function drawBrowseActions(ctx, state, layout) {
    var canRemoveCard = state.player.masterDeckNames.length > 1;
    var canUseRemove = canRemoveCard && canAfford(state, state.shop.removeCost);

    ctx.save();
    ctx.translate(layout.removeButton.x + layout.removeButton.width / 2 + 16, layout.removeButton.y + layout.removeButton.height / 2 + 12);
    ctx.rotate(layout.removeButton.rotation || 0);
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 0, layout.removeButton.width * 0.48, layout.removeButton.height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!drawShellAssetCover(ctx, SHOP_SHELL_ART_PATHS.contract, layout.removeButton.x, layout.removeButton.y, layout.removeButton.width, layout.removeButton.height, {
      rotation: layout.removeButton.rotation || 0,
      shadowBlur: 8,
      shadowOffsetX: 6,
      shadowOffsetY: 6,
      focusX: 0.5,
      focusY: 0.42
    })) {
      drawPaperTag(ctx, layout.removeButton.x, layout.removeButton.y, layout.removeButton.width, layout.removeButton.height, {
        rotation: layout.removeButton.rotation || 0,
        fill: canUseRemove ? "rgba(228, 216, 195, 0.99)" : "rgba(196, 186, 173, 0.96)",
        stroke: canUseRemove ? "rgba(138, 102, 78, 0.34)" : "rgba(115, 101, 91, 0.28)",
        innerFill: "rgba(255, 252, 244, 0.22)",
        bandHeight: 4,
        bandFill: canUseRemove ? "rgba(176, 70, 48, 0.9)" : "rgba(112, 100, 90, 0.82)",
        shadowBlur: 6,
        shadowOffsetY: 4
      });
    }

    ctx.save();
    ctx.translate(layout.removeButton.x + layout.removeButton.width / 2, layout.removeButton.y + layout.removeButton.height / 2);
    ctx.rotate(layout.removeButton.rotation || 0);
    G.render.ui.drawLabel(ctx, "撤去招式", -28, -layout.removeButton.height / 2 + 22, {
      size: 15,
      align: "center",
      color: canUseRemove ? "#b64c38" : "#6f675f",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
    G.render.ui.drawWrappedLabel(ctx, canRemoveCard ? "剪去牌组里的一招旧式" : "至少要留下最后一张", -92, -layout.removeButton.height / 2 + 38, 132, 14, {
      size: 10,
      maxLines: 2,
      color: canUseRemove ? "#5b4a3f" : "#6d655e",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, String(state.shop.removeCost), layout.removeButton.width / 2 - 26, layout.removeButton.height / 2 - 4, {
      size: 24,
      align: "right",
      color: canUseRemove ? "#c55f43" : "#6f665e",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, "大洋", layout.removeButton.width / 2 - 26, layout.removeButton.height / 2 + 12, {
      size: 10,
      align: "right",
      color: canUseRemove ? "#9d8774" : "#7b746c",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.fillRect(layout.leaveButton.x + 10, layout.leaveButton.y + 10, layout.leaveButton.width, layout.leaveButton.height);
    ctx.strokeStyle = "rgba(169, 145, 118, 0.24)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(layout.leaveButton.x + 28, layout.leaveButton.y - 16);
    ctx.lineTo(layout.leaveButton.x + 28, layout.leaveButton.y + 4);
    ctx.moveTo(layout.leaveButton.x + layout.leaveButton.width - 28, layout.leaveButton.y - 16);
    ctx.lineTo(layout.leaveButton.x + layout.leaveButton.width - 28, layout.leaveButton.y + 4);
    ctx.stroke();
    ctx.restore();

    if (!drawShellAssetCover(ctx, SHOP_SHELL_ART_PATHS.leaveSign, layout.leaveButton.x, layout.leaveButton.y, layout.leaveButton.width, layout.leaveButton.height, {
      shadowBlur: 14,
      shadowOffsetY: 10,
      focusX: 0.5,
      focusY: 0.52
    })) {
      G.render.ui.drawPanel(ctx, layout.leaveButton.x, layout.leaveButton.y, layout.leaveButton.width, layout.leaveButton.height, {
        fill: "rgba(136, 49, 34, 0.97)",
        stroke: "rgba(93, 35, 25, 0.84)",
        surface: "lacquer-red",
        lineWidth: 2.1,
        holes: false
      });

      ctx.save();
      ctx.fillStyle = "rgba(255, 240, 220, 0.06)";
      ctx.fillRect(layout.leaveButton.x + 12, layout.leaveButton.y + 12, layout.leaveButton.width - 24, layout.leaveButton.height - 24);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "rgba(10, 8, 8, 0.16)";
    ctx.fillRect(layout.leaveButton.x + 4, layout.leaveButton.y + 4, layout.leaveButton.width - 8, layout.leaveButton.height - 8);
    ctx.restore();

    ["离", "场"].forEach(function (char, index) {
      G.render.ui.drawLabel(ctx, char, layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + 70 + index * 54, {
        size: 30,
        align: "center",
        color: "#f4e4ce",
        shadow: false,
        fontFamily: getTitleFontFamily()
      });
    });
  }

  function drawBrowseActionsV2(ctx, state, layout) {
    var canRemoveCard = state.player.masterDeckNames.length > 1;
    var canUseRemove = canRemoveCard && canAfford(state, state.shop.removeCost);
    var leaveRotation = layout.leaveButton.rotation || 0;

    if (isAssetReady(SHOP_SHELL_ART_PATHS.counterPlate)) {
      ctx.save();
      ctx.translate(layout.removeButton.x + layout.removeButton.width / 2, layout.removeButton.y + layout.removeButton.height / 2);
      ctx.rotate(layout.removeButton.rotation || 0);
      G.render.ui.drawLabel(ctx, "撤去招式", 0, -layout.removeButton.height / 2 + 30, {
        size: 16,
        align: "center",
        color: canUseRemove ? "#8b4637" : "#70655c",
        shadow: false,
        fontFamily: getTitleFontFamily()
      });
      G.render.ui.drawWrappedLabel(ctx, canRemoveCard ? "剪去牌组里的一招旧式" : "至少要留下最后一张", -62, -layout.removeButton.height / 2 + 52, 124, 14, {
        size: 10,
        maxLines: 2,
        color: canUseRemove ? "#5d4c40" : "#7a7068",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawLabel(ctx, String(state.shop.removeCost), layout.removeButton.width / 2 - 18, layout.removeButton.height / 2 - 10, {
        size: 24,
        align: "right",
        color: canUseRemove ? "#ba5a42" : "#74675f",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawLabel(ctx, "大洋", layout.removeButton.width / 2 - 18, layout.removeButton.height / 2 + 8, {
        size: 10,
        align: "right",
        color: canUseRemove ? "#8f7a65" : "#7a726b",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      ctx.restore();
    } else {

    ctx.save();
    ctx.translate(layout.removeButton.x + layout.removeButton.width / 2 + 12, layout.removeButton.y + layout.removeButton.height / 2 + 10);
    ctx.rotate(layout.removeButton.rotation || 0);
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 0, layout.removeButton.width * 0.48, layout.removeButton.height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!drawShellAssetCover(ctx, SHOP_SHELL_ART_PATHS.contract, layout.removeButton.x, layout.removeButton.y, layout.removeButton.width, layout.removeButton.height, {
      rotation: layout.removeButton.rotation || 0,
      shadowBlur: 8,
      shadowOffsetX: 5,
      shadowOffsetY: 6,
      focusX: 0.5,
      focusY: 0.42
    })) {
      drawPaperTag(ctx, layout.removeButton.x, layout.removeButton.y, layout.removeButton.width, layout.removeButton.height, {
        rotation: layout.removeButton.rotation || 0,
        fill: canUseRemove ? "rgba(228, 216, 195, 0.99)" : "rgba(196, 186, 173, 0.96)",
        stroke: canUseRemove ? "rgba(138, 102, 78, 0.34)" : "rgba(115, 101, 91, 0.28)",
        innerFill: "rgba(255, 252, 244, 0.22)",
        bandHeight: 4,
        bandFill: canUseRemove ? "rgba(176, 70, 48, 0.9)" : "rgba(112, 100, 90, 0.82)",
        shadowBlur: 6,
        shadowOffsetY: 4
      });
    }

    ctx.save();
    ctx.translate(layout.removeButton.x + layout.removeButton.width / 2, layout.removeButton.y + layout.removeButton.height / 2);
    ctx.rotate(layout.removeButton.rotation || 0);
    G.render.ui.drawLabel(ctx, "撤去招式", -22, -layout.removeButton.height / 2 + 22, {
      size: 15,
      align: "center",
      color: canUseRemove ? "#b64c38" : "#6f675f",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
    G.render.ui.drawWrappedLabel(ctx, canRemoveCard ? "剪去牌组里的一招旧式" : "至少要留下最后一张", -86, -layout.removeButton.height / 2 + 38, 124, 14, {
      size: 10,
      maxLines: 2,
      color: canUseRemove ? "#5b4a3f" : "#6d655e",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, String(state.shop.removeCost), layout.removeButton.width / 2 - 22, layout.removeButton.height / 2 - 5, {
      size: 24,
      align: "right",
      color: canUseRemove ? "#c55f43" : "#6f665e",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, "大洋", layout.removeButton.width / 2 - 22, layout.removeButton.height / 2 + 12, {
      size: 10,
      align: "right",
      color: canUseRemove ? "#9d8774" : "#7b746c",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    ctx.restore();

    }

    ctx.save();
    ctx.strokeStyle = "rgba(166, 142, 117, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y - 20);
    ctx.lineTo(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(194, 172, 148, 0.52)";
    ctx.beginPath();
    ctx.arc(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + 6, 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + layout.leaveButton.height / 2);
    ctx.rotate(leaveRotation);
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.fillRect(-layout.leaveButton.width / 2 + 6, -layout.leaveButton.height / 2 + 8, layout.leaveButton.width - 2, layout.leaveButton.height);
    ctx.restore();

    if (!drawShellAssetCover(ctx, SHOP_SHELL_ART_PATHS.leaveSign, layout.leaveButton.x, layout.leaveButton.y, layout.leaveButton.width, layout.leaveButton.height, {
      rotation: leaveRotation,
      shadowBlur: 14,
      shadowOffsetY: 10,
      focusX: 0.5,
      focusY: 0.52
    })) {
      ctx.save();
      ctx.translate(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + layout.leaveButton.height / 2);
      ctx.rotate(leaveRotation);
      G.render.ui.drawPanel(ctx, -layout.leaveButton.width / 2, -layout.leaveButton.height / 2, layout.leaveButton.width, layout.leaveButton.height, {
        fill: "rgba(120, 48, 35, 0.95)",
        stroke: "rgba(82, 30, 22, 0.78)",
        surface: "lacquer-red",
        lineWidth: 2.1,
        holes: false
      });
      ctx.fillStyle = "rgba(255, 240, 220, 0.05)";
      ctx.fillRect(-layout.leaveButton.width / 2 + 10, -layout.leaveButton.height / 2 + 12, layout.leaveButton.width - 20, layout.leaveButton.height - 24);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + layout.leaveButton.height / 2);
    ctx.rotate(leaveRotation);
    G.render.ui.drawLabel(ctx, "掀帘离场", 0, -layout.leaveButton.height / 2 + 24, {
      size: 10,
      align: "center",
      color: "rgba(241, 221, 201, 0.52)",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    ["离", "场"].forEach(function (char, index) {
      G.render.ui.drawLabel(ctx, char, 0, -18 + index * 44, {
        size: 26,
        align: "center",
        color: "#f1dcc3",
        shadow: false,
        fontFamily: getTitleFontFamily()
      });
    });
    ctx.restore();
  }

  function drawRemoveDeckTile(ctx, entry, box) {
    var pinPattern = entry.index % 4;
    var pinOffsets = pinPattern === 0 ? [0.24, 0.76] : (pinPattern === 1 ? [0.34] : (pinPattern === 2 ? [0.66] : [0.3, 0.7]));

    drawPaperTag(ctx, box.x, box.y, box.width, box.height, {
      rotation: box.rotation || 0,
      fill: "rgba(223, 208, 179, 0.98)",
      stroke: "rgba(132, 96, 76, 0.28)",
      innerFill: "rgba(255, 246, 229, 0.22)",
      bandHeight: 5,
      bandFill: "rgba(154, 56, 43, 0.84)",
      shadowBlur: 14,
      shadowOffsetY: 10
    }, function (drawCtx, left, top, width, height) {
      drawCtx.fillStyle = "rgba(120, 52, 40, 0.08)";
      drawCtx.fillRect(left + 14, top + 18, width - 28, 10);
      drawCtx.fillStyle = "rgba(255, 244, 224, 0.05)";
      drawCtx.fillRect(left + 12, top + 12, width - 24, height - 24);
      pinOffsets.forEach(function (offset) {
        var pinX = left + Math.round(width * offset);

        drawCtx.fillStyle = "rgba(41, 36, 33, 0.9)";
        drawCtx.beginPath();
        drawCtx.arc(pinX, top + 9, 3.2, 0, Math.PI * 2);
        drawCtx.fill();
        drawCtx.fillStyle = "rgba(206, 190, 172, 0.76)";
        drawCtx.beginPath();
        drawCtx.arc(pinX - 1, top + 8, 1.2, 0, Math.PI * 2);
        drawCtx.fill();
      });

      drawChip(drawCtx, left + width - 50, top + 10, 36, 20, String(entry.cost), {
        fill: "rgba(62, 53, 47, 0.94)",
        stroke: "rgba(173, 157, 137, 0.18)",
        surface: "ink-panel",
        color: "#efe2cf",
        size: 11
      });

      G.render.ui.drawWrappedLabel(drawCtx, entry.name, left + 18, top + 16, width - 84, 18, {
        size: 18,
        maxLines: 1,
        color: "#2b211a",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawWrappedLabel(drawCtx, entry.text, left + 18, top + 42, width - 42, 15, {
        size: 13,
        maxLines: 2,
        color: "#3d3128",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    });
  }

  function drawRemoveStageFinal(ctx, state, layout) {
    var stage = layout.removeStage;
    var deckBoxes = getRemoveCardBoxes(state.shop.deckEntries, layout);
    var i = 0;
    var board = null;
    var cloth = null;

    ctx.save();
    ctx.strokeStyle = "rgba(145, 121, 94, 0.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(stage.x + 88, 96);
    ctx.lineTo(stage.x + 96, stage.y + 14);
    ctx.moveTo(stage.x + stage.width - 88, 96);
    ctx.lineTo(stage.x + stage.width - 96, stage.y + 14);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.fillRect(stage.x + 14, stage.y + 14, stage.width, stage.height);
    ctx.restore();

    G.render.ui.drawPanel(ctx, stage.x, stage.y, stage.width, stage.height, {
      fill: "rgba(82, 59, 40, 0.97)",
      stroke: "rgba(153, 118, 83, 0.34)",
      surface: "wood-button",
      lineWidth: 2.4,
      holes: false
    });

    ctx.save();
    board = ctx.createLinearGradient(stage.x, stage.y + 18, stage.x, stage.y + stage.height - 18);
    board.addColorStop(0, "rgba(104, 77, 53, 0.94)");
    board.addColorStop(1, "rgba(67, 49, 36, 0.98)");
    ctx.fillStyle = board;
    ctx.fillRect(stage.x + 18, stage.y + 18, stage.width - 36, stage.height - 36);

    cloth = ctx.createLinearGradient(stage.x, stage.y + 34, stage.x, stage.y + stage.height - 34);
    cloth.addColorStop(0, "rgba(80, 64, 51, 0.95)");
    cloth.addColorStop(0.5, "rgba(68, 55, 46, 0.98)");
    cloth.addColorStop(1, "rgba(54, 44, 39, 0.98)");
    ctx.fillStyle = cloth;
    ctx.fillRect(stage.x + 34, stage.y + 34, stage.width - 68, stage.height - 68);

    ctx.strokeStyle = "rgba(223, 198, 164, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(stage.x + 34.5, stage.y + 34.5, stage.width - 69, stage.height - 69);

    ctx.strokeStyle = "rgba(184, 145, 107, 0.06)";
    [
      [58, 92, stage.width - 96, 5],
      [64, 156, stage.width - 118, -4],
      [70, 226, stage.width - 104, 6],
      [56, 308, stage.width - 126, -5],
      [74, 386, stage.width - 112, 4]
    ].forEach(function (line) {
      ctx.beginPath();
      ctx.moveTo(stage.x + line[0], stage.y + line[1]);
      ctx.lineTo(stage.x + line[2], stage.y + line[1] + line[3]);
      ctx.stroke();
    });

    ctx.strokeStyle = "rgba(178, 146, 110, 0.04)";
    [
      [82, 52, -5],
      [176, 64, 3],
      [268, 48, -4],
      [382, 60, 5],
      [506, 44, -3],
      [628, 62, 4],
      [746, 54, -5],
      [862, 66, 3],
      [958, 50, -4]
    ].forEach(function (line) {
      ctx.beginPath();
      ctx.moveTo(stage.x + line[0], stage.y + line[1]);
      ctx.lineTo(stage.x + line[0] + line[2] * 3, stage.y + stage.height - 56);
      ctx.stroke();
    });
    ctx.restore();

    drawPaperTag(ctx, stage.x + 36, stage.y + 22, 178, 32, {
      rotation: -0.028,
      fill: "rgba(207, 191, 165, 0.98)",
      stroke: "rgba(128, 97, 75, 0.26)",
      innerFill: "rgba(255, 249, 238, 0.18)",
      bandHeight: 5,
      bandFill: "rgba(160, 60, 44, 0.86)",
      shadowBlur: 8,
      shadowOffsetY: 6
    }, function (drawCtx, left, top) {
      G.render.ui.drawLabel(drawCtx, "挑一式撤去", left + 10, top + 15, {
        size: 12,
        color: "#8b4031",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    });

    drawPaperTag(ctx, stage.x + stage.width - 266, stage.y + 18, 222, 38, {
      rotation: 0.026,
      fill: "rgba(216, 204, 184, 0.98)",
      stroke: "rgba(128, 97, 75, 0.24)",
      innerFill: "rgba(255, 250, 241, 0.16)",
      bandHeight: 5,
      bandFill: "rgba(92, 76, 59, 0.82)",
      shadowBlur: 8,
      shadowOffsetY: 6
    }, function (drawCtx, left, top, width) {
      G.render.ui.drawLabel(drawCtx, "行囊 " + state.player.gold + " 大洋", left + 12, top + 16, {
        size: 11,
        color: "#54453a",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawLabel(drawCtx, "开价 " + state.shop.removeCost, left + width - 12, top + 16, {
        size: 12,
        align: "right",
        color: "#8c4334",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    });

    for (i = 0; i < state.shop.deckEntries.length; i += 1) {
      drawRemoveDeckTile(ctx, state.shop.deckEntries[i], deckBoxes[i]);
    }
  }

  function drawBackButton(ctx, layout) {
    ctx.save();
    ctx.strokeStyle = "rgba(168, 147, 123, 0.36)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(layout.backButton.x + 48, layout.backButton.y - 10);
    ctx.lineTo(layout.backButton.x + 48, layout.backButton.y + 4);
    ctx.moveTo(layout.backButton.x + layout.backButton.width - 48, layout.backButton.y - 10);
    ctx.lineTo(layout.backButton.x + layout.backButton.width - 48, layout.backButton.y + 4);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(layout.backButton.x + 8, layout.backButton.y + 10, layout.backButton.width - 4, layout.backButton.height);
    ctx.restore();

    G.render.ui.drawPanel(ctx, layout.backButton.x, layout.backButton.y, layout.backButton.width, layout.backButton.height, {
      fill: "rgba(128, 53, 39, 0.97)",
      stroke: "rgba(88, 31, 23, 0.84)",
      surface: "lacquer-red",
      lineWidth: 2,
      holes: false
    });

    ctx.save();
    ctx.fillStyle = "rgba(255, 241, 220, 0.06)";
    ctx.fillRect(layout.backButton.x + 12, layout.backButton.y + 10, layout.backButton.width - 24, layout.backButton.height - 20);
    ctx.restore();

    G.render.ui.drawLabel(ctx, "返回摊位", layout.backButton.x + layout.backButton.width / 2, layout.backButton.y + 26, {
      size: 17,
      align: "center",
      color: "#f1dfcb",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });

    G.render.ui.drawLabel(ctx, "收起黑布", layout.backButton.x + layout.backButton.width / 2, layout.backButton.y + 47, {
      size: 10,
      align: "center",
      color: "rgba(241, 223, 203, 0.78)",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });

    ctx.save();
    ctx.fillStyle = "rgba(41, 36, 33, 0.9)";
    ctx.beginPath();
    ctx.arc(layout.backButton.x + 38, layout.backButton.y + 10, 3.1, 0, Math.PI * 2);
    ctx.arc(layout.backButton.x + layout.backButton.width - 38, layout.backButton.y + 10, 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(206, 190, 172, 0.76)";
    ctx.beginPath();
    ctx.arc(layout.backButton.x + 37, layout.backButton.y + 9, 1.1, 0, Math.PI * 2);
    ctx.arc(layout.backButton.x + layout.backButton.width - 39, layout.backButton.y + 9, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBackButtonFinal(ctx, layout) {
    var rotation = layout.backButton.rotation || 0;
    var centerX = layout.backButton.x + layout.backButton.width / 2;

    ctx.save();
    ctx.strokeStyle = "rgba(168, 147, 123, 0.36)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(centerX - 52, layout.removeStage.y + layout.removeStage.height - 8);
    ctx.lineTo(centerX - 42, layout.backButton.y + 4);
    ctx.moveTo(centerX + 52, layout.removeStage.y + layout.removeStage.height - 8);
    ctx.lineTo(centerX + 42, layout.backButton.y + 4);
    ctx.stroke();
    ctx.restore();

    drawPaperTag(ctx, layout.backButton.x, layout.backButton.y, layout.backButton.width, layout.backButton.height, {
      rotation: rotation,
      fill: "rgba(214, 198, 170, 0.98)",
      stroke: "rgba(118, 90, 69, 0.26)",
      innerFill: "rgba(255, 248, 236, 0.16)",
      bandHeight: 4,
      bandFill: "rgba(160, 62, 45, 0.86)",
      shadowBlur: 12,
      shadowOffsetY: 10
    }, function (drawCtx, left, top, width, height) {
      drawCtx.fillStyle = "rgba(116, 86, 64, 0.18)";
      drawCtx.fillRect(left + 18, top + height - 20, width - 36, 1);
      G.render.ui.drawLabel(drawCtx, "返回摊位", left + width / 2, top + 26, {
        size: 16,
        align: "center",
        color: "#8b4637",
        shadow: false,
        fontFamily: getTitleFontFamily()
      });
      G.render.ui.drawLabel(drawCtx, "收起黑布", left + width / 2, top + 47, {
        size: 10,
        align: "center",
        color: "rgba(89, 71, 58, 0.78)",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      drawCtx.fillStyle = "rgba(41, 36, 33, 0.88)";
      drawCtx.beginPath();
      drawCtx.arc(left + 34, top + 9, 3.1, 0, Math.PI * 2);
      drawCtx.arc(left + width - 34, top + 9, 3.1, 0, Math.PI * 2);
      drawCtx.fill();
      drawCtx.fillStyle = "rgba(208, 192, 175, 0.78)";
      drawCtx.beginPath();
      drawCtx.arc(left + 33, top + 8, 1.1, 0, Math.PI * 2);
      drawCtx.arc(left + width - 35, top + 8, 1.1, 0, Math.PI * 2);
      drawCtx.fill();
    });
  }

  function drawFooter(ctx, state, layout) {
    var footer = state.shop.mode === "browse" ? layout.footer : layout.removeFooter;
    var isBrowse = state.shop.mode === "browse";
    var renderX = footer.x;
    var renderY = footer.y;
    var renderWidth = footer.width;
    var renderHeight = footer.height;

    if (!state.shop.note) {
      return;
    }

    if (isBrowse) {
      renderWidth = 608;
      renderHeight = 40;
      renderX = 640 - renderWidth / 2;
      renderY = layout.counter.y - 60;
    }

    G.render.ui.drawPanel(ctx, renderX, renderY, renderWidth, renderHeight, {
      fill: isBrowse ? "rgba(10, 11, 12, 0.8)" : "rgba(10, 11, 12, 0.88)",
      stroke: "rgba(103, 79, 60, 0.24)",
      surface: "ink-panel",
      lineWidth: isBrowse ? 1.2 : 1.6,
      holes: false
    });

    G.render.ui.drawWrappedLabel(ctx, state.shop.note, renderX + renderWidth / 2, renderY + (isBrowse ? 10 : 14), renderWidth - (isBrowse ? 28 : 42), isBrowse ? 16 : 18, {
      size: isBrowse ? 13 : 15,
      align: "center",
      color: "rgba(222, 203, 176, 0.9)",
      shadow: false,
      maxLines: isBrowse ? 1 : 2,
      fontFamily: getReadableFontFamily()
    });
  }

  function drawLedgerNoteV2(ctx, state, layout) {
    var box = layout.ledger;
    var centerX = box.x + box.width / 2;
    var centerY = box.y + box.height / 2;

    // 无论背景有没有账本，我们都粗暴地钉上一张验资票据，彻底解决透视冲突
    ctx.save();
    ctx.translate(centerX, centerY + 8);
    ctx.rotate(-0.035);

    // 票据的强烈物理悬浮投影
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 8;

    // 不规则的粗糙当票底纸
    ctx.fillStyle = "#d1c1a8";
    ctx.beginPath();
    ctx.moveTo(-85, -45);
    ctx.lineTo(82, -42);
    ctx.lineTo(76, 48);
    ctx.lineTo(-80, 44);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = "transparent";

    // 纸张老旧泛黄与血污纹理
    var texGrad = ctx.createLinearGradient(-80, -40, 80, 40);
    texGrad.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    texGrad.addColorStop(0.6, "rgba(90, 50, 30, 0.1)");
    texGrad.addColorStop(1, "rgba(40, 10, 5, 0.3)");
    ctx.fillStyle = texGrad;
    ctx.fill();

    // 边缘的暗色烧焦痕迹
    ctx.strokeStyle = "rgba(60, 30, 20, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 左侧血红色的"讫"字戳记
    ctx.strokeStyle = "rgba(160, 30, 20, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-45, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-45, 0, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = "multiply";
    G.render.ui.drawLabel(ctx, "讫", -45, 6, {
      size: 20,
      align: "center",
      color: "rgba(160, 30, 20, 0.85)",
      weight: "900",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });

    // 右侧的现银文字排版
    G.render.ui.drawLabel(ctx, "行囊现洋", 25, -18, {
      size: 14,
      align: "center",
      color: "#4a2818",
      weight: "900",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });

    G.render.ui.drawLabel(ctx, String(state.player.gold), 15, 20, {
      size: 36,
      align: "center",
      color: "#140a05",
      weight: "900",
      shadow: false,
      fontFamily: getBodyFontFamily()
    });

    G.render.ui.drawLabel(ctx, "圆", 60, 22, {
      size: 12,
      align: "center",
      color: "#5a4030",
      weight: "900",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });

    // 生锈的铁钉，将票据死死钉在桌面上
    ctx.globalCompositeOperation = "source-over";
    var pinX = 0;
    var pinY = -35;
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath(); ctx.arc(pinX, pinY, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(180, 100, 60, 0.8)";
    ctx.beginPath(); ctx.arc(pinX - 1, pinY - 1, 1.5, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }

  function drawRemoveServiceBoardShell(ctx, stage) {
    var centerX = stage.x + stage.width / 2;
    var centerY = stage.y + stage.height / 2;
    var rotation = -0.014;
    var board = null;
    var cloth = null;

    if (drawShellAsset(ctx, SHOP_SHELL_ART_PATHS.removeBoard, stage.x - 34, stage.y - 74, stage.width + 68, stage.height + 126, {
      shadowBlur: 10,
      shadowOffsetX: 0,
      shadowOffsetY: 10,
      alpha: 1
    })) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = "rgba(150, 126, 97, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(stage.x + 120, 102);
    ctx.lineTo(stage.x + 132, stage.y + 8);
    ctx.moveTo(stage.x + stage.width - 120, 102);
    ctx.lineTo(stage.x + stage.width - 132, stage.y + 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(201, 179, 151, 0.54)";
    ctx.beginPath();
    ctx.arc(stage.x + 132, stage.y + 8, 3.2, 0, Math.PI * 2);
    ctx.arc(stage.x + stage.width - 132, stage.y + 8, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(-stage.width / 2 + 30, -stage.height / 2 + 20, stage.width - 10, stage.height + 22);
    ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
    ctx.beginPath();
    ctx.ellipse(0, stage.height / 2 + 20, stage.width * 0.44, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    G.render.ui.drawPanel(ctx, -stage.width / 2, -stage.height / 2, stage.width, stage.height, {
      fill: "rgba(98, 72, 50, 0.98)",
      stroke: "rgba(173, 133, 92, 0.34)",
      surface: "wood-button",
      lineWidth: 2.8,
      holes: false
    });

    ctx.fillStyle = "rgba(241, 219, 186, 0.08)";
    ctx.fillRect(-stage.width / 2 + 14, -stage.height / 2 + 12, stage.width - 28, 3);
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(-stage.width / 2 + 18, stage.height / 2 - 18, stage.width - 36, 10);

    board = ctx.createLinearGradient(0, -stage.height / 2 + 22, 0, stage.height / 2 - 22);
    board.addColorStop(0, "rgba(104, 77, 53, 0.96)");
    board.addColorStop(1, "rgba(72, 52, 37, 0.98)");
    ctx.fillStyle = board;
    ctx.fillRect(-stage.width / 2 + 22, -stage.height / 2 + 22, stage.width - 44, stage.height - 44);

    cloth = ctx.createLinearGradient(0, -stage.height / 2 + 56, 0, stage.height / 2 - 64);
    cloth.addColorStop(0, "rgba(104, 84, 67, 0.94)");
    cloth.addColorStop(0.45, "rgba(84, 68, 56, 0.98)");
    cloth.addColorStop(1, "rgba(65, 52, 44, 0.98)");
    ctx.fillStyle = cloth;
    ctx.fillRect(-stage.width / 2 + 52, -stage.height / 2 + 54, stage.width - 104, stage.height - 126);

    ctx.strokeStyle = "rgba(227, 199, 165, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-stage.width / 2 + 52.5, -stage.height / 2 + 54.5, stage.width - 105, stage.height - 127);

    ctx.strokeStyle = "rgba(182, 145, 104, 0.06)";
    [
      [-stage.width / 2 + 86, -stage.height / 2 + 126, stage.width - 164, 4],
      [-stage.width / 2 + 92, -stage.height / 2 + 196, stage.width - 178, -5],
      [-stage.width / 2 + 88, -stage.height / 2 + 274, stage.width - 170, 6],
      [-stage.width / 2 + 96, -stage.height / 2 + 352, stage.width - 186, -4]
    ].forEach(function (line) {
      ctx.beginPath();
      ctx.moveTo(line[0], line[1]);
      ctx.lineTo(line[0] + line[2], line[1] + line[3]);
      ctx.stroke();
    });

    [
      [-stage.width / 2 + 34, -stage.height / 2 + 34],
      [stage.width / 2 - 34, -stage.height / 2 + 34],
      [-stage.width / 2 + 34, stage.height / 2 - 60],
      [stage.width / 2 - 34, stage.height / 2 - 60]
    ].forEach(function (point) {
      ctx.fillStyle = "rgba(73, 55, 42, 0.94)";
      ctx.beginPath();
      ctx.arc(point[0], point[1], 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(208, 190, 168, 0.62)";
      ctx.beginPath();
      ctx.arc(point[0] - 1, point[1] - 1, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(70, 49, 33, 0.98)";
    ctx.fillRect(-stage.width / 2 + 28, stage.height / 2 - 44, stage.width - 56, 18);
    ctx.fillStyle = "rgba(178, 140, 96, 0.16)";
    ctx.fillRect(-stage.width / 2 + 30, stage.height / 2 - 44, stage.width - 60, 2);

    ctx.fillStyle = "rgba(58, 40, 28, 0.84)";
    ctx.beginPath();
    ctx.moveTo(-stage.width / 2 + 44, stage.height / 2 - 24);
    ctx.lineTo(-stage.width / 2 + 78, stage.height / 2 + 12);
    ctx.lineTo(-stage.width / 2 + 112, stage.height / 2 - 24);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(stage.width / 2 - 44, stage.height / 2 - 24);
    ctx.lineTo(stage.width / 2 - 78, stage.height / 2 + 12);
    ctx.lineTo(stage.width / 2 - 112, stage.height / 2 - 24);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawRemoveStage(ctx, state, layout) {
    var stage = layout.removeStage;
    var deckBoxes = getRemoveCardBoxes(state.shop.deckEntries, layout);
    var i = 0;

    drawRemoveServiceBoardShell(ctx, stage);

    drawDeskFlyer(ctx, stage.x + 36, stage.y + 20, 188, 38, {
      rotation: -0.026,
      fill: "rgba(210, 193, 166, 0.98)",
      stroke: "rgba(124, 93, 71, 0.28)",
      innerFill: "rgba(255, 249, 238, 0.18)",
      bandFill: "rgba(160, 60, 44, 0.84)",
      shadowOffsetX: 3,
      shadowOffsetY: 6
    }, function (drawCtx, left, top) {
      G.render.ui.drawLabel(drawCtx, "\u6311\u4e00\u5f0f\u9057\u5fd8", left + 10, top + 15, {
        size: 12,
        color: "#8b4031",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    });

    drawDeskFlyer(ctx, stage.x + stage.width - 274, stage.y + 16, 236, 42, {
      rotation: 0.024,
      fill: "rgba(214, 203, 184, 0.98)",
      stroke: "rgba(128, 97, 75, 0.24)",
      innerFill: "rgba(255, 250, 241, 0.16)",
      bandFill: "rgba(95, 78, 60, 0.82)",
      shadowOffsetX: 4,
      shadowOffsetY: 6
    }, function (drawCtx, left, top, width) {
      G.render.ui.drawLabel(drawCtx, "\u884c\u56ca " + state.player.gold + " \u5927\u6d0b", left + 12, top + 16, {
        size: 11,
        color: "#54453a",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawLabel(drawCtx, "\u5f00\u4ef7 " + state.shop.removeCost, left + width - 12, top + 16, {
        size: 12,
        align: "right",
        color: "#8c4334",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    });

    for (i = 0; i < state.shop.deckEntries.length; i += 1) {
      drawRemoveDeckTile(ctx, state.shop.deckEntries[i], deckBoxes[i]);
    }
  }

  function drawRelicOffer(ctx, state, offer, box) {
    var affordable = !offer.sold && canAfford(state, offer.price);
    var artX = box.x + 10;
    var artY = box.y + 6;
    var artWidth = box.width - 20;
    var artHeight = 60;
    var infoWidth = box.width - 18;
    var infoX = box.x + 9;
    var infoY = box.y + 74;
    var infoHeight = 26;
    var usedArt = false;
    var glow = null;
    var lamp = null;
    var slipRotation = box.x < 220 ? -0.05 : 0.042;

    ctx.save();
    glow = ctx.createRadialGradient(box.x + box.width / 2, box.y + 38, 0, box.x + box.width / 2, box.y + 38, 80);
    glow.addColorStop(0, affordable && !offer.sold ? "rgba(214, 162, 92, 0.32)" : "rgba(255, 247, 232, 0.14)");
    glow.addColorStop(1, "rgba(182, 129, 76, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(box.x, box.y - 2, box.width, artHeight + 28);
    lamp = ctx.createRadialGradient(box.x + box.width / 2, box.y + 30, 0, box.x + box.width / 2, box.y + 34, 52);
    lamp.addColorStop(0, "rgba(255, 236, 196, 0.24)");
    lamp.addColorStop(1, "rgba(255, 236, 196, 0)");
    ctx.fillStyle = lamp;
    ctx.fillRect(artX, artY, artWidth, artHeight);
    ctx.restore();

    usedArt = drawRelicArt(ctx, offer, artX, artY, artWidth, artHeight);
    if (!usedArt) {
      drawRelicGlyph(ctx, offer, artX, artY, artWidth, artHeight);
    }

    if (offer.sold) {
      drawSoldRelicStamp(ctx, box);
    }

    if (!affordable && !offer.sold) {
      ctx.save();
      ctx.fillStyle = "rgba(10, 9, 9, 0.26)";
      ctx.fillRect(artX + 2, artY + 2, artWidth - 4, artHeight - 4);
      ctx.restore();
    }

    drawShadowEllipse(ctx, box.x + box.width / 2, box.y + 70, artWidth * 0.34, 10, offer.sold ? 0.14 : 0.2);

    drawDossierSlip(ctx, infoX, infoY, infoWidth, infoHeight, {
      rotation: slipRotation,
      variant: box.x < 220 ? 1 : 2,
      pinOffsets: box.x < 220 ? [0.24, 0.76] : [0.34],
      fill: offer.sold ? "rgba(186, 174, 157, 0.94)" : (affordable ? "rgba(214, 201, 176, 0.98)" : "rgba(184, 172, 156, 0.94)"),
      stroke: offer.sold ? "rgba(110, 97, 84, 0.22)" : (affordable ? "rgba(126, 96, 69, 0.26)" : "rgba(110, 99, 88, 0.24)"),
      innerFill: "rgba(255, 249, 238, 0.14)",
      bandHeight: 3,
      bandFill: offer.sold ? "rgba(114, 86, 69, 0.76)" : "rgba(154, 64, 45, 0.78)",
      shadowOffsetX: box.x < 220 ? 1 : 2,
      shadowOffsetY: 3
    }, function (drawCtx, left, top, width, height) {
      drawCtx.save();
      drawCtx.translate(left, top + 1);
      drawCtx.globalCompositeOperation = "multiply";
      drawCtx.transform(1, 0, box.x < 220 ? -0.08 : 0.08, 0.96, 0, 0);
      drawCtx.fillStyle = "rgba(118, 91, 67, 0.14)";
      drawCtx.fillRect(width - 42, 6, 1, height - 12);
      G.render.ui.drawLabel(drawCtx, offer.name, 8, 15, {
        size: 8,
        color: offer.sold ? "#74675d" : (affordable ? "#46362c" : "#5d534b"),
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawLabel(drawCtx, offer.sold ? "已取走" : String(offer.price), width - 8, 14, {
        size: offer.sold ? 10 : 14,
        align: "right",
        color: offer.sold ? "#74675d" : (affordable ? "#8a4f3f" : "#7c746b"),
        shadow: false,
        fontFamily: offer.sold ? getReadableFontFamily() : getBodyFontFamily()
      });
      if (!offer.sold) {
        G.render.ui.drawLabel(drawCtx, "大洋", width - 8, 22, {
          size: 7,
          align: "right",
          color: affordable ? "#8a4f3f" : "#7c746b",
          shadow: false,
          fontFamily: getReadableFontFamily()
        });
      }
      drawCtx.restore();
    });
  }

  function drawRemoveDeckTile(ctx, entry, box) {
    var styleIndex = entry.index % 3;
    var pinOffsets = styleIndex === 0 ? [0.22, 0.78] : (styleIndex === 1 ? [0.34] : [0.2, 0.66]);
    var fill = styleIndex === 0 ? "rgba(214, 199, 172, 0.96)" : (styleIndex === 1 ? "rgba(209, 194, 168, 0.96)" : "rgba(204, 190, 163, 0.96)");
    var stroke = styleIndex === 2 ? "rgba(122, 90, 72, 0.3)" : "rgba(132, 96, 76, 0.28)";
    var bandFill = styleIndex === 1 ? "rgba(140, 58, 43, 0.8)" : "rgba(154, 56, 43, 0.82)";
    var slipX = box.x + (styleIndex === 0 ? 2 : (styleIndex === 1 ? 12 : 18));
    var slipY = box.y + (styleIndex === 2 ? 2 : 0);
    var slipWidth = box.width - (styleIndex === 0 ? 10 : (styleIndex === 1 ? 26 : 36));
    var slipHeight = box.height - (styleIndex === 1 ? 2 : 0);

    drawDossierSlip(ctx, slipX, slipY, slipWidth, slipHeight, {
      rotation: box.rotation || 0,
      variant: styleIndex,
      pinOffsets: pinOffsets,
      fill: fill,
      stroke: stroke,
      innerFill: "rgba(255, 244, 224, 0.09)",
      bandHeight: 4,
      bandFill: bandFill,
      shadowColor: "rgba(0, 0, 0, 0.22)",
      shadowOffsetX: box.rotation < 0 ? 2 : 4,
      shadowOffsetY: 10,
      disableFold: true,
      sideBandWidth: styleIndex === 1 ? 18 : 0,
      sideBandFill: "rgba(118, 50, 40, 0.1)"
    }, function (drawCtx, left, top, width, height) {
      var textSkew = styleIndex === 2 ? -0.12 : -0.08;
      var titleWidth = width - 74;
      var bodyWidth = width - 42;

      drawCtx.save();
      drawCtx.translate(left, top);
      drawCtx.globalCompositeOperation = "multiply";
      drawCtx.transform(1, 0, textSkew, 0.96, 0, 0);
      drawCtx.fillStyle = "rgba(120, 52, 40, 0.06)";
      drawCtx.fillRect(14, 18, Math.min(54, width - 112), 5);
      drawCtx.fillStyle = "rgba(110, 84, 61, 0.08)";
      drawCtx.fillRect(14, height - 12, width - 32, 1);
      drawCtx.fillStyle = "rgba(255, 244, 224, 0.05)";
      drawCtx.fillRect(12, 12, width - 24, height - 24);
      drawCtx.fillStyle = "rgba(146, 58, 43, 0.28)";
      drawCtx.beginPath();
      drawCtx.arc(width - 26, 18, 12, 0, Math.PI * 2);
      drawCtx.fill();
      drawCtx.strokeStyle = "rgba(135, 54, 40, 0.5)";
      drawCtx.lineWidth = 1;
      drawCtx.beginPath();
      drawCtx.arc(width - 26, 18, 12, 0, Math.PI * 2);
      drawCtx.stroke();
      G.render.ui.drawLabel(drawCtx, String(entry.cost), width - 26, 19, {
        size: 11,
        align: "center",
        color: "#7f3226",
        shadow: false,
        fontFamily: getBodyFontFamily()
      });
      G.render.ui.drawWrappedLabel(drawCtx, entry.name, 18, 18, titleWidth, 18, {
        size: styleIndex === 1 ? 16 : 17,
        maxLines: 1,
        color: "#2b211a",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawWrappedLabel(drawCtx, entry.text, 18, 41, bodyWidth, 14, {
        size: 11,
        maxLines: 2,
        color: "#3d3128",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      drawCtx.restore();
    });
  }

  function drawRelicDrawerShell(ctx, layout) {
    var box = layout.relicDrawer;
    var innerGlow = null;
    var usedShell = false;

    if (isAssetReady(SHOP_SHELL_ART_PATHS.counterPlate)) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height - 8, box.width * 0.44, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    usedShell = drawShellAssetCover(ctx, SHOP_SHELL_ART_PATHS.relicTray, box.x, box.y, box.width, box.height, {
      shadowBlur: 18,
      shadowOffsetY: 10,
      focusX: 0.5,
      focusY: 0.46
    });

    ctx.save();
    innerGlow = ctx.createRadialGradient(box.x + 118, box.y + 86, 0, box.x + 118, box.y + 86, 100);
    innerGlow.addColorStop(0, "rgba(220, 164, 93, 0.18)");
    innerGlow.addColorStop(1, "rgba(220, 164, 93, 0)");
    ctx.fillStyle = innerGlow;
    ctx.fillRect(box.x + 10, box.y + 24, 190, 90);
    innerGlow = ctx.createRadialGradient(box.x + box.width - 118, box.y + 86, 0, box.x + box.width - 118, box.y + 86, 100);
    innerGlow.addColorStop(0, "rgba(220, 164, 93, 0.16)");
    innerGlow.addColorStop(1, "rgba(220, 164, 93, 0)");
    ctx.fillStyle = innerGlow;
    ctx.fillRect(box.x + box.width - 200, box.y + 24, 190, 90);
    ctx.fillStyle = "rgba(255, 232, 198, 0.05)";
    ctx.fillRect(box.x + 18, box.y + 18, box.width - 36, 14);
    ctx.restore();

    if (!usedShell) {
      G.render.ui.drawPanel(ctx, box.x, box.y, box.width, box.height, {
        fill: "rgba(61, 45, 29, 0.95)",
        stroke: "rgba(126, 92, 63, 0.32)",
        surface: "wood-button",
        lineWidth: 1.8,
        holes: false
      });

      ctx.save();
      ctx.fillStyle = "rgba(255, 244, 224, 0.05)";
      ctx.fillRect(box.x + 12, box.y + 10, box.width - 24, 18);
      ctx.fillStyle = "rgba(76, 55, 35, 0.82)";
      ctx.fillRect(box.x + 12, box.y + 32, box.width - 24, 4);
      innerGlow = ctx.createLinearGradient(box.x, box.y + 38, box.x, box.y + box.height - 10);
      innerGlow.addColorStop(0, "rgba(36, 26, 18, 0.48)");
      innerGlow.addColorStop(0.2, "rgba(24, 17, 12, 0.72)");
      innerGlow.addColorStop(1, "rgba(12, 10, 10, 0.88)");
      ctx.fillStyle = innerGlow;
      ctx.fillRect(box.x + 12, box.y + 38, box.width - 24, box.height - 50);
      ctx.fillStyle = "rgba(52, 35, 22, 0.92)";
      ctx.fillRect(box.x + box.width / 2 - 5, box.y + 40, 10, box.height - 54);
      ctx.restore();
    }

    G.render.ui.drawLabel(ctx, "\u65e7\u5668", box.x + 26, box.y + box.height - 16, {
      size: 12,
      color: "rgba(225, 197, 144, 0.82)",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
  }

  function drawBrowseActionsV2(ctx, state, layout) {
    var canRemoveCard = state.player.masterDeckNames.length > 1;
    var canUseRemove = canRemoveCard && canAfford(state, state.shop.removeCost);
    var leaveRotation = layout.leaveButton.rotation || 0;
    var removeRotation = layout.removeButton.rotation || 0;
    var assetReady = isAssetReady(SHOP_SHELL_ART_PATHS.counterPlate);
    var removeHint = canRemoveCard ? "\u526a\u53bb\u724c\u7ec4\u91cc\u7684\u4e00\u62db\u65e7\u5f0f" : "\u81f3\u5c11\u8981\u7559\u4e0b\u6700\u540e\u4e00\u5f20";
    var serviceStandBox = { x: 1002, y: 388, width: 196, height: 228 };
    var serviceStandBox = { x: 1002, y: 388, width: 196, height: 228 };

    if (!assetReady) {
      ctx.save();
      ctx.translate(layout.removeButton.x + layout.removeButton.width / 2 + 12, layout.removeButton.y + layout.removeButton.height / 2 + 10);
      ctx.rotate(removeRotation);
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.beginPath();
      ctx.ellipse(0, 0, layout.removeButton.width * 0.48, layout.removeButton.height * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (!drawShellAssetCover(ctx, SHOP_SHELL_ART_PATHS.contract, layout.removeButton.x, layout.removeButton.y, layout.removeButton.width, layout.removeButton.height, {
        rotation: removeRotation,
        shadowBlur: 8,
        shadowOffsetX: 5,
        shadowOffsetY: 6,
        focusX: 0.5,
        focusY: 0.42
      })) {
        drawPaperTag(ctx, layout.removeButton.x, layout.removeButton.y, layout.removeButton.width, layout.removeButton.height, {
          rotation: removeRotation,
          fill: canUseRemove ? "rgba(228, 216, 195, 0.99)" : "rgba(196, 186, 173, 0.96)",
          stroke: canUseRemove ? "rgba(138, 102, 78, 0.34)" : "rgba(115, 101, 91, 0.28)",
          innerFill: "rgba(255, 252, 244, 0.22)",
          bandHeight: 4,
          bandFill: canUseRemove ? "rgba(176, 70, 48, 0.9)" : "rgba(112, 100, 90, 0.82)",
          shadowBlur: 6,
          shadowOffsetY: 4
        });
      }
    }

    ctx.save();
    ctx.translate(layout.removeButton.x + layout.removeButton.width / 2 + (assetReady ? 56 : 0), layout.removeButton.y + layout.removeButton.height / 2 + (assetReady ? 16 : 0));
    ctx.rotate(removeRotation);
    if (!assetReady) {
      ctx.fillStyle = canUseRemove ? "rgba(122, 85, 61, 0.12)" : "rgba(96, 86, 78, 0.1)";
      ctx.fillRect(-58, -28, 116, 70);
      ctx.fillStyle = canUseRemove ? "rgba(160, 116, 84, 0.2)" : "rgba(126, 112, 100, 0.16)";
      ctx.fillRect(-42, -6, 84, 1);
    } else {
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.84;
      ctx.transform(1, 0, -0.24, 0.88, 0, 0);
    }
    G.render.ui.drawLabel(ctx, "\u9057\u5fd8\u62db\u5f0f", assetReady ? 4 : 0, assetReady ? -26 : -18, {
      size: 15,
      align: "center",
      color: canUseRemove ? "#8f4b3a" : "#6f675f",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
    G.render.ui.drawWrappedLabel(ctx, removeHint, assetReady ? -48 : -54, assetReady ? -6 : 2, 108, 14, {
      size: 10,
      maxLines: 2,
      color: canUseRemove ? "#5b4a3f" : "#6d655e",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, String(state.shop.removeCost), assetReady ? -10 : -8, assetReady ? 38 : 47, {
      size: 28,
      align: "right",
      color: canUseRemove ? "#c55f43" : "#6f665e",
      shadow: false,
      fontFamily: assetReady ? getBodyFontFamily() : getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, "\u5927\u6d0b", assetReady ? 14 : 16, assetReady ? 39 : 48, {
      size: 10,
      align: "left",
      color: canUseRemove ? "#9d8774" : "#7b746c",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    ctx.restore();

    if (assetReady) {
      drawDossierSlip(ctx, layout.removeButton.x + 94, layout.removeButton.y + 92, 72, 34, {
        rotation: removeRotation + 0.03,
        variant: 0,
        pinOffsets: [0.32],
        fill: canUseRemove ? "rgba(213, 198, 171, 0.96)" : "rgba(186, 175, 160, 0.94)",
        stroke: canUseRemove ? "rgba(124, 96, 74, 0.24)" : "rgba(114, 102, 91, 0.22)",
        innerFill: "rgba(255, 248, 236, 0.12)",
        bandHeight: 3,
        bandFill: canUseRemove ? "rgba(154, 64, 45, 0.78)" : "rgba(104, 92, 84, 0.72)",
        shadowOffsetX: 1,
        shadowOffsetY: 3
      }, function (drawCtx, left, top, width, height) {
        drawCtx.save();
        drawCtx.translate(left + width / 2, top + height / 2 + 1);
        drawCtx.transform(1, 0, -0.12, 0.94, 0, 0);
        drawCtx.globalCompositeOperation = "multiply";
        G.render.ui.drawLabel(drawCtx, String(state.shop.removeCost), 0, -1, {
          size: 18,
          align: "center",
          color: canUseRemove ? "#734234" : "#655b54",
          shadow: false,
          fontFamily: getBodyFontFamily()
        });
        G.render.ui.drawLabel(drawCtx, "\u5927\u6d0b", 0, 10, {
          size: 7,
          align: "center",
          color: canUseRemove ? "rgba(116, 86, 65, 0.82)" : "rgba(106, 98, 90, 0.78)",
          shadow: false,
          fontFamily: getReadableFontFamily()
        });
        drawCtx.restore();
      });
    }

    ctx.save();
    ctx.strokeStyle = "rgba(166, 142, 117, 0.3)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y - 20);
    ctx.lineTo(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(194, 172, 148, 0.52)";
    ctx.beginPath();
    ctx.arc(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + 6, 3.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + layout.leaveButton.height / 2);
    ctx.rotate(leaveRotation);
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.fillRect(-layout.leaveButton.width / 2 + 6, -layout.leaveButton.height / 2 + 8, layout.leaveButton.width - 2, layout.leaveButton.height);
    ctx.restore();

    if (!drawShellAssetCover(ctx, SHOP_SHELL_ART_PATHS.leaveSign, layout.leaveButton.x, layout.leaveButton.y, layout.leaveButton.width, layout.leaveButton.height, {
      rotation: leaveRotation,
      shadowBlur: 14,
      shadowOffsetY: 10,
      focusX: 0.5,
      focusY: 0.52
    })) {
      ctx.save();
      ctx.translate(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + layout.leaveButton.height / 2);
      ctx.rotate(leaveRotation);
      G.render.ui.drawPanel(ctx, -layout.leaveButton.width / 2, -layout.leaveButton.height / 2, layout.leaveButton.width, layout.leaveButton.height, {
        fill: "rgba(120, 48, 35, 0.95)",
        stroke: "rgba(82, 30, 22, 0.78)",
        surface: "lacquer-red",
        lineWidth: 2.1,
        holes: false
      });
      ctx.fillStyle = "rgba(255, 240, 220, 0.05)";
      ctx.fillRect(-layout.leaveButton.width / 2 + 10, -layout.leaveButton.height / 2 + 12, layout.leaveButton.width - 20, layout.leaveButton.height - 24);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(layout.leaveButton.x + layout.leaveButton.width / 2, layout.leaveButton.y + layout.leaveButton.height / 2);
    ctx.rotate(leaveRotation);
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.9;
    ctx.transform(1, 0, -0.08, 0.96, 0, 0);
    G.render.ui.drawLabel(ctx, "\u6563\u5e02\u79bb\u573a", 0, -layout.leaveButton.height / 2 + 24, {
      size: 10,
      align: "center",
      color: "rgba(182, 146, 118, 0.72)",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    ["\u79bb", "\u573a"].forEach(function (char, index) {
      G.render.ui.drawLabel(ctx, char, 0, -18 + index * 44, {
        size: 26,
        align: "center",
        color: "#ead4bb",
        shadow: false,
        fontFamily: getTitleFontFamily()
      });
    });
    ctx.restore();
  }

  function drawRelicOffer(ctx, state, offer, box) {
    var affordable = !offer.sold && canAfford(state, offer.price);
    var artX = box.x + 10;
    var artY = box.y + 6;
    var artWidth = box.width - 20;
    var artHeight = 60;
    var infoWidth = box.width - 10;
    var infoX = box.x + 5;
    var infoY = box.y + 70;
    var infoHeight = 32;
    var usedArt = false;
    var glow = null;
    var lamp = null;
    var slipRotation = box.x < 220 ? -0.05 : 0.042;

    ctx.save();
    glow = ctx.createRadialGradient(box.x + box.width / 2, box.y + 38, 0, box.x + box.width / 2, box.y + 38, 80);
    glow.addColorStop(0, affordable && !offer.sold ? "rgba(214, 162, 92, 0.18)" : "rgba(255, 247, 232, 0.08)");
    glow.addColorStop(1, "rgba(182, 129, 76, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(box.x + 10, box.y + 4, box.width - 20, artHeight + 8);
    lamp = ctx.createRadialGradient(box.x + box.width / 2, box.y + 30, 0, box.x + box.width / 2, box.y + 34, 52);
    lamp.addColorStop(0, "rgba(255, 236, 196, 0.14)");
    lamp.addColorStop(1, "rgba(255, 236, 196, 0)");
    ctx.fillStyle = lamp;
    ctx.fillRect(artX, artY, artWidth, artHeight);
    ctx.restore();

    usedArt = drawRelicArt(ctx, offer, artX, artY, artWidth, artHeight);
    if (!usedArt) {
      drawRelicGlyph(ctx, offer, artX, artY, artWidth, artHeight);
    }

    if (offer.sold) {
      drawSoldRelicStamp(ctx, box);
    }

    if (!affordable && !offer.sold) {
      ctx.save();
      ctx.fillStyle = "rgba(10, 9, 9, 0.26)";
      ctx.fillRect(artX + 2, artY + 2, artWidth - 4, artHeight - 4);
      ctx.restore();
    }

    drawShadowEllipse(ctx, box.x + box.width / 2, box.y + 66, artWidth * 0.38, 12, offer.sold ? 0.15 : 0.22);

    drawDeskFlyer(ctx, infoX, infoY, infoWidth, infoHeight, {
      rotation: slipRotation,
      fill: offer.sold ? "rgba(184, 171, 152, 0.92)" : (affordable ? "rgba(210, 195, 168, 0.96)" : "rgba(178, 166, 150, 0.92)"),
      stroke: offer.sold ? "rgba(108, 95, 80, 0.24)" : (affordable ? "rgba(118, 92, 66, 0.28)" : "rgba(102, 92, 83, 0.24)"),
      innerFill: "rgba(255, 247, 233, 0.1)",
      bandFill: offer.sold ? "rgba(114, 86, 69, 0.76)" : "rgba(154, 64, 45, 0.78)",
      shadowOffsetX: box.x < 220 ? 2 : 4,
      shadowOffsetY: 3
    }, function (drawCtx, left, top, width, height) {
      drawCtx.save();
      drawCtx.translate(left + width / 2, top + height / 2 + 1);
      drawCtx.rotate(slipRotation * 0.24);
      drawCtx.fillStyle = "rgba(118, 91, 67, 0.14)";
      drawCtx.fillRect(-width / 2 + 10, -height / 2 + 11, width - 20, 1);
      drawCtx.fillRect(width / 2 - 42, -height / 2 + 9, 1, height - 16);
      G.render.ui.drawLabel(drawCtx, offer.name, -width / 2 + 11, -3, {
        size: 8,
        color: offer.sold ? "#74675d" : (affordable ? "#46362c" : "#5d534b"),
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      G.render.ui.drawLabel(drawCtx, offer.sold ? "\u5df2\u53d6\u8d70" : String(offer.price), width / 2 - 10, 5, {
        size: offer.sold ? 10 : 15,
        align: "right",
        color: offer.sold ? "#74675d" : (affordable ? "#8a4f3f" : "#7c746b"),
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      if (!offer.sold) {
        G.render.ui.drawLabel(drawCtx, "\u5927\u6d0b", width / 2 - 10, 16, {
          size: 7,
          align: "right",
          color: affordable ? "#8a4f3f" : "#7c746b",
          shadow: false,
          fontFamily: getReadableFontFamily()
        });
      }
      drawCtx.restore();
    });
  }

  function drawRemoveDeckTile(ctx, entry, box) {
    var compact = box.width < 230;
    var centerX = box.x + box.width / 2;
    var centerY = box.y + box.height / 2;
    var rotation = box.rotation || 0;

    // 【大刀阔斧重做】极其暴力的物理质感碎片生成
    var r1 = (entry.index * 13) % 7;
    var r2 = (entry.index * 17) % 7;
    var r3 = (entry.index * 23) % 7;
    var r4 = (entry.index * 29) % 7;
    var isBloody = (entry.index % 3 === 0);
    var isBurned = (entry.index % 4 === 1);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // 强烈的物理投影
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 8;

    var hw = box.width / 2 - 4;
    var hh = box.height / 2 - 4;

    // 不规则撕裂纸张形状
    ctx.beginPath();
    ctx.moveTo(-hw + r1, -hh + r2);
    ctx.lineTo(hw - r2, -hh + r3);
    ctx.lineTo(hw - r3, hh - r4);
    ctx.lineTo(-hw + r4, hh - r1);
    ctx.closePath();

    // 污浊的底色
    ctx.fillStyle = isBurned ? "#a3907c" : "#bba893";
    ctx.fill();

    // 清除投影以免污染内部绘制
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 粗糙的老照片/牛皮纸光影叠加
    var texGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
    texGrad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    texGrad.addColorStop(0.5, "rgba(60, 40, 20, 0.15)");
    texGrad.addColorStop(1, "rgba(15, 10, 5, 0.5)");
    ctx.fillStyle = texGrad;
    ctx.fill();

    // 烧焦或血污边缘
    if (isBurned) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(30, 15, 5, 0.85)";
      ctx.stroke();
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(80, 60, 40, 0.6)";
      ctx.stroke();
    }

    // 大块血迹污染
    if (isBloody) {
      var bloodX = -hw + ((entry.index * 37) % box.width);
      var bloodY = -hh + ((entry.index * 41) % box.height);
      var bloodGrad = ctx.createRadialGradient(bloodX, bloodY, 0, bloodX, bloodY, 50);
      bloodGrad.addColorStop(0, "rgba(130, 10, 5, 0.7)");
      bloodGrad.addColorStop(1, "rgba(130, 10, 5, 0)");
      ctx.fillStyle = bloodGrad;
      ctx.fill();
    }

    // 生锈铁钉固定
    var pinX = 0;
    var pinY = -hh + 12;
    ctx.fillStyle = "rgba(15, 10, 10, 0.95)";
    ctx.beginPath();
    ctx.arc(pinX, pinY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(160, 90, 60, 0.8)"; // 铁锈高光
    ctx.beginPath();
    ctx.arc(pinX - 1.5, pinY - 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (isBloody) {
      ctx.fillStyle = "rgba(90, 5, 5, 0.8)";
      ctx.beginPath();
      ctx.moveTo(pinX, pinY);
      ctx.lineTo(pinX + 2, pinY + 20);
      ctx.lineTo(pinX - 1, pinY + 12);
      ctx.fill();
    }

    // 内容渲染 - 正片叠底，墨水渗透质感
    ctx.globalCompositeOperation = "multiply";
    
    // 狂野的血色代价戳印
    var costX = hw - 26;
    var costY = -hh + 26;
    ctx.strokeStyle = "rgba(150, 20, 10, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(costX, costY, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(costX, costY, 11, 0, Math.PI * 2);
    ctx.stroke();
    G.render.ui.drawLabel(ctx, String(entry.cost), costX, costY + 2, {
      size: 16,
      align: "center",
      color: "#7a110a",
      weight: "900",
      shadow: false,
      fontFamily: getBodyFontFamily()
    });

    var titleWidth = box.width - 65;
    var bodyWidth = box.width - 35;

    // 粗犷的招式名
    G.render.ui.drawWrappedLabel(ctx, entry.name, -hw + 16, -hh + 16, titleWidth, 22, {
      size: compact ? 17 : 19,
      maxLines: 1,
      color: "#140a05",
      weight: "900",
      shadow: false,
      fontFamily: getBodyFontFamily()
    });

    // 狂野的分割线
    ctx.fillStyle = "rgba(60, 30, 20, 0.4)";
    ctx.fillRect(-hw + 14, -hh + 44, bodyWidth, 2.5);

    // 招式效果文本
    G.render.ui.drawWrappedLabel(ctx, entry.text, -hw + 16, -hh + 54, bodyWidth, compact ? 15 : 17, {
      size: compact ? 11 : 13,
      maxLines: 3,
      color: "#24140b",
      weight: "700",
      shadow: false,
      fontFamily: getBodyFontFamily()
    });

    ctx.restore();
  }

  function drawRelicOffer(ctx, state, offer, box) {
    var affordable = !offer.sold && canAfford(state, offer.price);
    var artX = box.x + 10;
    var artY = box.y + 6;
    var artWidth = box.width - 20;
    var artHeight = 58;
    var infoWidth = box.width - 24;
    var infoX = box.x + 12;
    var infoY = box.y + 76;
    var infoHeight = 18;
    var usedArt = false;
    var glow = null;
    var lamp = null;
    var slipRotation = box.x < 220 ? -0.01 : 0.012;

    ctx.save();
    glow = ctx.createRadialGradient(box.x + box.width / 2, box.y + 38, 0, box.x + box.width / 2, box.y + 38, 80);
    glow.addColorStop(0, affordable && !offer.sold ? "rgba(214, 162, 92, 0.32)" : "rgba(255, 247, 232, 0.14)");
    glow.addColorStop(1, "rgba(182, 129, 76, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(box.x, box.y - 2, box.width, artHeight + 26);
    lamp = ctx.createRadialGradient(box.x + box.width / 2, box.y + 30, 0, box.x + box.width / 2, box.y + 34, 52);
    lamp.addColorStop(0, "rgba(255, 236, 196, 0.22)");
    lamp.addColorStop(1, "rgba(255, 236, 196, 0)");
    ctx.fillStyle = lamp;
    ctx.fillRect(artX, artY, artWidth, artHeight);
    ctx.restore();

    usedArt = drawRelicArt(ctx, offer, artX, artY, artWidth, artHeight);
    if (!usedArt) {
      drawRelicGlyph(ctx, offer, artX, artY, artWidth, artHeight);
    }

    if (offer.sold) {
      drawSoldRelicStamp(ctx, box);
    }

    if (!affordable && !offer.sold) {
      ctx.save();
      ctx.fillStyle = "rgba(10, 9, 9, 0.24)";
      ctx.fillRect(artX + 2, artY + 2, artWidth - 4, artHeight - 4);
      ctx.restore();
    }

    drawShadowEllipse(ctx, box.x + box.width / 2, box.y + 64, artWidth * 0.36, 11, offer.sold ? 0.14 : 0.2);

    ctx.save();
    ctx.fillStyle = "rgba(20, 13, 9, 0.18)";
    ctx.fillRect(box.x + 14, box.y + 68, box.width - 28, 10);
    ctx.restore();

    drawPaperTag(ctx, infoX, infoY, infoWidth, infoHeight, {
      rotation: slipRotation,
      fill: offer.sold ? "rgba(182, 170, 150, 0.96)" : (affordable ? "rgba(202, 189, 161, 0.98)" : "rgba(176, 165, 149, 0.96)"),
      stroke: offer.sold ? "rgba(108, 95, 80, 0.2)" : (affordable ? "rgba(112, 88, 65, 0.24)" : "rgba(102, 92, 83, 0.2)"),
      innerFill: "rgba(255, 247, 233, 0.06)",
      bandHeight: 2,
      bandFill: offer.sold ? "rgba(114, 86, 69, 0.66)" : "rgba(143, 60, 43, 0.7)",
      shadowOffsetX: box.x < 220 ? 1 : 2,
      shadowOffsetY: 1
    }, function (drawCtx, left, top, width, height) {
      drawCtx.save();
      drawCtx.translate(left + 8, top + 2);
      drawCtx.transform(1, 0, -0.16, 0.88, 0, 0);
      drawCtx.globalCompositeOperation = "multiply";
      drawCtx.fillStyle = "rgba(118, 91, 67, 0.14)";
      drawCtx.fillRect(4, height - 7, width - 24, 1);
      drawCtx.fillRect(width - 40, 4, 1, height - 8);
      G.render.ui.drawLabel(drawCtx, offer.name, 4, 10, {
        size: 7,
        color: offer.sold ? "#74675d" : (affordable ? "#46362c" : "#5d534b"),
        shadow: false,
        fontFamily: getBodyFontFamily()
      });
      G.render.ui.drawLabel(drawCtx, offer.sold ? "\u5df2\u53d6\u8d70" : String(offer.price), width - 19, 10, {
        size: offer.sold ? 8 : 12,
        align: "right",
        color: offer.sold ? "#74675d" : (affordable ? "#8a4f3f" : "#7c746b"),
        shadow: false,
        fontFamily: getBodyFontFamily()
      });
      drawCtx.restore();
    });
  }

  function drawRemoveStage(ctx, state, layout) {
    var stage = layout.removeStage;
    var deckBoxes = getRemoveCardBoxes(state.shop.deckEntries, layout);
    var i = 0;

    // 【彻底粉碎UI感】：不再画巨大的公告板外壳，而是在桌面上铺一张脏黑的行刑血布
    ctx.save();
    ctx.translate(stage.x + stage.width / 2, stage.y + stage.height / 2);
    ctx.rotate(0.012);

    // 行刑布的厚重物理投影
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = "#110c0a";
    ctx.fillRect(-stage.width / 2 + 20, -stage.height / 2 + 20, stage.width - 40, stage.height - 40);

    ctx.shadowColor = "transparent";

    // 布料老旧破损的渐变与血污
    var clothGrad = ctx.createRadialGradient(0, 0, stage.height * 0.1, 0, 0, stage.width * 0.7);
    clothGrad.addColorStop(0, "rgba(50, 15, 10, 0.35)"); // 中间带暗红血渍
    clothGrad.addColorStop(1, "rgba(8, 5, 5, 0.95)");    // 四周深邃死黑
    ctx.fillStyle = clothGrad;
    ctx.fillRect(-stage.width / 2 + 20, -stage.height / 2 + 20, stage.width - 40, stage.height - 40);

    // 在布料上画几条极深的陈年划痕和凝固血迹
    ctx.fillStyle = "rgba(40, 5, 5, 0.4)";
    ctx.beginPath(); ctx.ellipse(-150, -80, 140, 50, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(220, 120, 90, 180, -0.3, 0, Math.PI * 2); ctx.fill();

    // 【纯Canvas硬核手绘】：一把遗留在血布上的生锈剔骨尖刀
    ctx.save();
    ctx.translate(stage.width / 2 - 100, stage.height / 2 - 80);
    ctx.rotate(0.5);
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#110e0c"; // 刀柄
    ctx.fillRect(-60, -10, 80, 20);
    ctx.fillStyle = "#2e221b"; // 木纹亮部
    ctx.fillRect(-55, -6, 70, 4);
    ctx.fillStyle = "#050505"; // 护手圆环
    ctx.beginPath(); ctx.ellipse(20, 0, 8, 16, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); // 宽阔残破的刀刃
    ctx.moveTo(25, -14); ctx.lineTo(160, -18); ctx.lineTo(170, 20); ctx.lineTo(25, 14); ctx.closePath();
    ctx.fillStyle = "#1f1f1f"; ctx.fill();
    var bladeGrad = ctx.createLinearGradient(25, -14, 170, 20); // 刀刃高光与凝固黑血
    bladeGrad.addColorStop(0, "rgba(100, 20, 15, 0.9)"); bladeGrad.addColorStop(0.5, "rgba(200, 200, 210, 0.5)"); bladeGrad.addColorStop(1, "rgba(20, 5, 5, 0.95)");
    ctx.fillStyle = bladeGrad; ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.8)"; // 刀刃缺口
    ctx.beginPath(); ctx.arc(100, -15, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(130, -16, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore(); // 结束剔骨刀

    ctx.restore(); // 结束血布

    // 【彻底大改】：抛弃温吞的公文纸条，改为鲜血涂刷、黑铁钉死的招牌和暴力符咒
    var headerY = stage.y + 40;

    // 左侧：撤去招式的黑铁血字招牌
    ctx.save();
    ctx.translate(stage.x + 160, headerY);
    ctx.rotate(-0.035);
    
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#141414"; // 黑铁底板
    ctx.fillRect(-85, -22, 170, 44);
    
    ctx.shadowColor = "transparent";
    var ironGrad = ctx.createLinearGradient(-85, -22, 85, 22);
    ironGrad.addColorStop(0, "rgba(255,255,255,0.1)");
    ironGrad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = ironGrad;
    ctx.fillRect(-85, -22, 170, 44);

    // 粗暴的铁钉
    ctx.fillStyle = "#050505";
    [[-75, -12], [75, -12], [-75, 12], [75, 12]].forEach(function(pos) {
      ctx.beginPath(); ctx.arc(pos[0], pos[1], 4.5, 0, Math.PI*2); ctx.fill();
    });

    G.render.ui.drawLabel(ctx, "挑一式撤去", 0, 2, {
      size: 19,
      align: "center",
      color: "#ba1c1c",
      weight: "900",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
    ctx.restore();

    // 中间：行囊大洋 (粗糙的白色漆字/粉笔字划在木板上)
    ctx.save();
    ctx.translate(stage.x + stage.width / 2, headerY + 5);
    ctx.rotate(0.015);
    ctx.globalCompositeOperation = "overlay";
    G.render.ui.drawLabel(ctx, "行囊 " + state.player.gold + " 大洋", 0, 0, {
      size: 24,
      align: "center",
      color: "rgba(255, 255, 255, 0.75)",
      weight: "900",
      shadow: false,
      fontFamily: getBodyFontFamily()
    });
    ctx.restore();

    // 右侧：开价 (猩红符纸，压迫感极强)
    ctx.save();
    ctx.translate(stage.x + stage.width - 180, headerY + 5);
    ctx.rotate(0.045);
    
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#7a1111"; // 猩红符纸
    ctx.fillRect(-75, -25, 150, 50);
    
    ctx.shadowColor = "transparent";
    var fuGrad = ctx.createLinearGradient(-75, -25, 75, 25);
    fuGrad.addColorStop(0, "rgba(255, 100, 100, 0.15)");
    fuGrad.addColorStop(1, "rgba(0, 0, 0, 0.4)");
    ctx.fillStyle = fuGrad;
    ctx.fillRect(-75, -25, 150, 50);

    ctx.globalCompositeOperation = "multiply";
    G.render.ui.drawLabel(ctx, "开价", -25, 2, {
      size: 17,
      align: "center",
      color: "#0a0505",
      weight: "900",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
    G.render.ui.drawLabel(ctx, String(state.shop.removeCost), 35, 4, {
      size: 28,
      align: "center",
      color: "#050505",
      weight: "900",
      shadow: false,
      fontFamily: getBodyFontFamily()
    });
    ctx.restore();

    for (i = 0; i < state.shop.deckEntries.length; i += 1) {
      drawRemoveDeckTile(ctx, state.shop.deckEntries[i], deckBoxes[i]);
    }
  }

  function drawCardOffer(ctx, state, offer, box) {
    var affordable = !offer.sold && canAfford(state, offer.price);
    var centerX = box.x + box.width / 2;
    var centerY = box.y + box.height / 2;
    var rotation = box.rotation || 0;

    ctx.save();
    ctx.translate(centerX + 10, centerY + 18);
    ctx.rotate(rotation * 0.78);
    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.fillRect(-box.width / 2 + 10, -box.height / 2 + 14, box.width - 18, box.height - 10);
    ctx.restore();

    drawShadowEllipse(ctx, centerX + rotation * 138, box.y + box.height + 18, box.width * 0.74, 24, offer.sold ? 0.18 : 0.22);

    G.render.ui.drawCardSlot(ctx, {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rotation: rotation,
      scale: box.scale || 1,
      cost: offer.cost,
      name: offer.name,
      text: offer.text,
      playable: !offer.sold && affordable,
      alpha: offer.sold ? 0.78 : (affordable ? 1 : 0.82),
      layoutMode: "reward",
      artRole: "reward",
      showFooterTokens: false,
      shadowBlur: 8,
      shadowOffsetX: 2,
      shadowOffsetY: 4
    });

    if (offer.sold) {
      drawOfferPriceTag(ctx, box, offer.price, {
        affordable: false,
        variant: "sold",
        label: "宸插彇璧?",
        hideUnit: true,
        labelSize: 13
      });
      drawSoldCardStamp(ctx, box);
      return;
    }

    if (!affordable) {
      drawUnaffordableCardWash(ctx, box);
    }

    drawOfferPriceTag(ctx, box, offer.price, { affordable: affordable });
  }

  function drawBrowseStage(ctx, state, layout) {
    var stage = layout.browseStage;
    var cardBoxes = getBrowseCardBoxes(layout);
    var relicBoxes = getBrowseRelicBoxes(layout);
    var order = [0, 1, 2, 3, 4];
    var i = 0;
    var glow = null;
    var haze = null;

    ctx.save();
    haze = ctx.createLinearGradient(0, stage.y, 0, stage.y + 272);
    haze.addColorStop(0, "rgba(0, 0, 0, 0.08)");
    haze.addColorStop(0.35, "rgba(0, 0, 0, 0.18)");
    haze.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = haze;
    ctx.fillRect(stage.x + 44, stage.y + 10, stage.width - 88, 252);
    ctx.restore();

    ctx.save();
    glow = ctx.createRadialGradient(640, stage.y + 42, 0, 640, stage.y + 154, 418);
    glow.addColorStop(0, "rgba(196, 134, 78, 0.18)");
    glow.addColorStop(1, "rgba(174, 121, 75, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(stage.x + 32, stage.y - 2, stage.width - 64, 270);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(stage.x + 84, stage.y + 238, stage.width - 168, 24);
    ctx.restore();

    drawBrowseCounterSurface(ctx, layout);
    drawCardRigging(ctx, layout);

    for (i = 0; i < order.length; i += 1) {
      drawCardOffer(ctx, state, state.shop.cardOffers[order[i]], cardBoxes[order[i]]);
    }

    drawRelicDrawerShell(ctx, layout);
    drawLedgerNoteV2(ctx, state, layout);

    if (!isAssetReady(SHOP_SHELL_ART_PATHS.counterPlate)) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgba(34, 23, 16, 0.12)";
      ctx.fillRect(layout.ledger.x + 14, layout.ledger.y + 10, layout.ledger.width - 28, layout.ledger.height - 18);
      ctx.fillStyle = "rgba(255, 240, 214, 0.03)";
      ctx.fillRect(layout.ledger.x + 18, layout.ledger.y + 12, layout.ledger.width - 36, 14);
      ctx.restore();
    }

    for (i = 0; i < state.shop.relicOffers.length; i += 1) {
      drawRelicOffer(ctx, state, state.shop.relicOffers[i], relicBoxes[i]);
    }
  }

  G.scenes.shop = {
    inputOnly: true,
    getLayout: getLayout,
    getCardBoxes: getBrowseCardBoxes,
    getRelicBoxes: getBrowseRelicBoxes,
    getRemoveBoxes: getRemoveCardBoxes,
    getRemovePageSize: getRemovePageSize,
    prepareState: prepareState,

    update: function (state) {
      return processClicks(ensureShopState(state));
    },

    render: function (state, ctx) {
      var safeState = ensureShopState(state);
      var layout = getLayout();
      var isRemove = safeState.shop.mode === "remove";

      ctx.save();
      // 镜头特效核心：适度放大1.15倍，焦点对准屏幕正中心 (640, 360)
      if (isRemove) {
        ctx.translate(640, 360);
        ctx.scale(1.15, 1.15);
        ctx.translate(-640, -360);
      }

      drawBackground(ctx);

      // 即使在撤去模式，我们也清晰地画出整个桌子底图，彻底保留物理空间
      drawBrowseStage(ctx, safeState, layout);

      if (isRemove) {
        // 在当前操作区打一束舞台聚光，四周压暗
        ctx.save();
        var focusGlow = ctx.createRadialGradient(640, 360, 80, 640, 360, 500);
        focusGlow.addColorStop(0, "rgba(0, 0, 0, 0.2)");
        focusGlow.addColorStop(1, "rgba(0, 0, 0, 0.88)");
        ctx.fillStyle = focusGlow;
        ctx.fillRect(0, 0, 1280, 720);
        ctx.restore();

        drawRemoveStage(ctx, safeState, layout);
        drawBackButtonV2(ctx, layout);
      } else {
        drawBrowseActionsV2(ctx, safeState, layout);
      }
      ctx.restore();

      // Header和Footer是玩家的HUD，不受镜头缩放影响，放在全局层
      drawHeader(ctx, safeState, layout);
      drawFooter(ctx, safeState, layout);
    }
  };

  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !G.main || G.main.isPaused()) return;
    var state = G.main.getState();
    if (state.scene !== 'shop' || (!Number.isInteger(state.shop.removeSelectedIndex) && !state.shop.purchaseSelection && state.shop.mode !== 'remove')) return;
    event.preventDefault();
    if (Number.isInteger(state.shop.removeSelectedIndex) || state.shop.purchaseSelection) {
      state.shop.removeSelectedIndex = null;
      state.shop.purchaseSelection = null;
    } else {
      state.shop.mode = 'browse';
      state.shop.note = getAmbientBrowseNote();
    }
    G.main.replaceState(state);
  });
})();
