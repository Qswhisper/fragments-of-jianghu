window.G = window.G || {};
G.render = G.render || {};
G.render.assets = G.render.assets || {};

(function () {
  function getRelicPath(id) {
    return window.KGAME_ART_REVISION?.relics?.[id] || 'assets/ui/shop_relic_' + id + '_gpt15all_01.png';
  }
  var cache = {};
  var imageCache = {};
  var deferredAccess = 0, deferredEvictions = 0;
  function deferred(path) { return /\/expansion-20261007\//.test(path); }
  function trimDeferredImages(protectedPath) {
    // Only newly expanded media participates; the approved originals remain unchanged.
    var paths=Object.keys(imageCache).filter(deferred);
    while(paths.length>24){
      var candidates=paths.filter(function(p){return p!==protectedPath&&imageCache[p].loaded;});
      if(!candidates.length)break;
      candidates.sort(function(a,b){return imageCache[a].lastUse-imageCache[b].lastUse;});
      var oldest=candidates[0],entry=imageCache[oldest];entry.image.onload=null;entry.image.onerror=null;
      delete imageCache[oldest];delete keyedPortraitCache[oldest];deferredEvictions++;
      paths=paths.filter(function(p){return p!==oldest;});
    }
  }
  var assetRevision = 0, imageGeneration = 0;
  // A late, unrelated portrait must not invalidate every printed card/HUD.
  // Capture exact image entries used by each raster, including nested hits.
  var dependencyScopes = [];
  function noteDependency(path, entry) {
    dependencyScopes.forEach(function(scope){scope.set(path,{path:path,generation:entry.generation,loaded:entry.loaded,failed:entry.failed,revision:entry.revision});});
  }
  var keyedPortraitCache = {};
  var keyedImageCache = {};
  var portraitRenderStats = {};
  var uiTexturePaths = [
    "assets/ui/title_menu_background_gpt4ovip_01.png",
    "assets/ui/title_menu_button_plaque_gpt4ovip_01_cropped.png",
    "assets/ui/title_menu_button_plaque_gpt4ovip_01_fill.png",
    "assets/ui/title_menu_button_plaque_gpt4ovip_01_fill_core.png",
    "assets/ui/map_jiaotu_yidao_background_gpt4ovip_01.png",
    "assets/ui/rest_ruined_temple_background_gemini_02.png",
    "assets/ui/rest_sidebar_shell_gpt15_01.png",
    "assets/ui/rest_stage_shell_gpt15_01.png",
    "assets/ui/rest_choice_stage_split_gpt15_01.png",
    "assets/ui/map_node_seal_texture_gpt4ovip_01.png",
    "assets/ui/reward_workshop_desk_background_gpt4ovip_01.png",
    "assets/ui/reward_imperial_decree_scroll_gpt4ovip_01.png",
    "assets/ui/reward_dossier_shell_gpt4ovip_01.png",
    "assets/ui/reward_dossier_shell_gpt4ovip_02.png",
    "assets/ui/reward_stage_plinth_gpt4ovip_01.png",
    "assets/ui/reward_footer_strip_gpt4ovip_01.png",
    "assets/ui/report_muddy_blood_decree_gpt4ovip_01.png",
    "assets/ui/reward_torn_ledger_scrap.svg",
    "assets/ui/report_writing_scrap.svg",
    "assets/ui/ui_torn_rice_paper_overlay_gpt4ovip_transparent_01.png",
    "assets/ui/combat_health_bamboo_ledger.svg",
    "assets/ui/combat_health_bamboo_ledger_gpt4ovip_transparent_01.png",
    "assets/ui/combat_health_blood_brush_gpt4ovip_transparent_02_cropped.png",
    "assets/ui/combat_status_dark_scrap.svg",
    "assets/ui/reward_summary_dark_scrap.svg",
    "assets/ui/combat_status_cinnabar_paper_fragment_gpt4ovip_01.png",
    "assets/ui/combat_intent_seal_cinnabar_gpt4ovip_transparent_01.png",
    "assets/ui/combat_card_red_stamp_gpt4ovip_transparent_02_cropped.png",
    "assets/ui/combat_ground_muddy_earth_foreground_gpt4ovip_cutout_clean_01.png",
    "assets/ui/shop_black_market_background_gpt15all_01.png",
    "assets/ui/shop_black_market_background_gpt15all_02_16x9.png",
    "assets/ui/shop_counter_base_plate_gpt15_v5.png",
    "assets/ui/shop_ui_shell_relic_tray_gpt15_01.png",
    "assets/ui/shop_ui_shell_ledger_gpt15_01.png",
    "assets/ui/shop_center_ledger_board_gpt15_v1.png",
    "assets/ui/shop_center_ledger_board_gpt15_v1_cropped.png",
    "assets/ui/shop_ui_shell_contract_gpt15_01.png",
    "assets/ui/shop_ui_shell_leave_sign_gpt15_01.png",
    "assets/ui/shop_ui_shell_service_stand_gpt15_v1.png",
    "assets/ui/shop_ui_shell_service_stand_gpt15_v2.png",
    "assets/ui/shop_remove_service_board_gpt15_v2b.png",
    "assets/ui/shop_remove_service_board_gpt15_v3.png",
    "assets/ui/shop_remove_service_board_gpt15_v4.png",
    "assets/ui/shop_remove_service_board_shell_01.svg",
    "assets/ui/shop_relic_chipped_blade_gpt15all_01.png",
    "assets/ui/shop_relic_rusty_mirror_gpt15all_01.png",
    "assets/ui/shop_relic_doomed_watch_gpt15all_01.png",
    "assets/ui/shop_relic_lime_packet_gpt15all_01.png",
    "assets/ui/shop_relic_secret_manual_gpt15all_01.png",
    "assets/ui/shop_relic_cheat_cuff_gpt15all_01.png",
    "assets/ui/shop_relic_sleeve_trigger_gpt15all_01.png",
    "assets/ui/shop_relic_blood_bandage_gpt15all_01.png",
    "assets/ui/shop_relic_beiyang_boots_gpt15all_01.png",
    "assets/ui/shop_relic_iron_canteen_gpt15all_01.png",
    "assets/ui/shop_relic_heavy_money_bag_gpt15all_01.png",
    "assets/ui/shop_relic_whetstone_gpt15all_01.png",
    "assets/ui/shop_relic_burning_liquor_gpt15all_01.png",
    "assets/ui/shop_relic_settlement_map_gpt15all_01.png",
    "assets/ui/shop_relic_wanted_poster_gpt15all_01.png"
  ];
  var defaultCombatTextureAssetMap = {
    background: "assets/ui/combat_background_checkpoint_gpt15_01.png",
    cardPaper: "assets/ui/combat_card_torn_rice_paper_gpt4ovip_transparent_01.png",
    panelWood: "assets/ui/combat_panel_rotten_wood_plank_gpt4ovip_01.png",
    statusPaper: "assets/ui/combat_status_dark_scrap.svg",
    healthLedger: "assets/ui/combat_health_bamboo_ledger_gpt4ovip_transparent_01.png",
    bloodStroke: "assets/ui/combat_health_blood_brush_gpt4ovip_transparent_02_cropped.png",
    intentSeal: "assets/ui/combat_intent_seal_circle_gpt4ovip_01.png",
    cardStamp: "assets/ui/combat_card_red_stamp_gpt4ovip_transparent_02_cropped.png",
    endTurnBlock: "assets/ui/combat_end_turn_rosewood_block_gpt4ovip_01.png"
  };
  var combatTextureAssetMap = Object.assign({}, defaultCombatTextureAssetMap, window.KGAME_COMBAT_TEXTURES || {});
  var cardArtAssetMap = {};
  var cardArtManifest = window.KGAME_CARD_ART_MANIFEST && window.KGAME_CARD_ART_MANIFEST.cards ?
    window.KGAME_CARD_ART_MANIFEST.cards :
    {};
  var portraitAssetMap = {
    routed_qing_soldier: "assets/portraits/enemy_routed_qing_soldier_gpt4ovip_01.png",
    simple: "assets/portraits/enemy_simple_blade_gpt4ovip_01.png",
    boxer: "assets/portraits/enemy_boxer_gpt4ovip_01.png",
    boxer_leader: "assets/portraits/enemy_boxer_leader_gpt4ovip_01.png",
    city_tracker: "assets/portraits/enemy_city_tracker_gpt4ovip_01.png",
    guard_chief: "assets/portraits/enemy_guard_chief_gpt4ovip_01.png",
    foreign_scout: "assets/portraits/enemy_bayonet_scout_gpt4ovip_01.png",
    elite_mack: "assets/portraits/enemy_act1_elite_mack_gpt15_02.png",
    mack: "assets/portraits/enemy_act1_elite_mack_gpt15_02.png",
    rifle_scout: "assets/portraits/enemy_rifle_scout_gpt4ovip_01.png",
    bayonet_scout: "assets/portraits/enemy_bayonet_scout_gpt4ovip_01.png",
    nemesis: "assets/portraits/nemesis_main_portrait_01.png"
  };
  var playerPortraitAssetMap = {
    blade: "assets/portraits/player_blade_form_battlecamera_20260330_v18b.png",
    iron: "assets/portraits/player_iron_form_battlecamera_20260330_v18b.png",
    dirty: "assets/portraits/player_dirty_form_battlecamera_20260330_v18c.png",
    combo: "assets/portraits/player_combo_form_battlecamera_20260330_v18e.png"
  };
  var playerPortraitBattlefieldOptionMap = {
    blade: { flipX: true },
    iron: { flipX: true },
    dirty: { flipX: true },
    combo: { flipX: false }
  };

  function createCanvas(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function createRandom(seed) {
    var value = seed >>> 0;

    return function () {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getCachedCanvas(key, width, height, painter) {
    if (!cache[key]) {
      cache[key] = createCanvas(width, height);
      painter(cache[key], cache[key].getContext("2d"));
    }

    return cache[key];
  }

  function getCachedImage(path) {
    var entry = null;

    if (!path) {
      return null;
    }

    if (!imageCache[path]) {
      entry = {
        image: new Image(),
        loaded: false,
        failed: false,
        revision: 0,
        generation: ++imageGeneration
      };
      entry.image.decoding = "async";
      entry.image.onload = function () {
        entry.loaded = true;
        entry.revision++;
        if(deferred(path))trimDeferredImages(path);
        assetRevision += 1;
        delete keyedPortraitCache[path];
        keyedImageCache = {};
        requestCanvasRedraw();
      };
      entry.image.onerror = function () {
        entry.failed = true;
        entry.revision++;
        assetRevision += 1;
        delete keyedPortraitCache[path];
        keyedImageCache = {};
        requestCanvasRedraw();
      };
      entry.image.src = path;
      imageCache[path] = entry;
    }
    if(deferred(path)){imageCache[path].lastUse=++deferredAccess;trimDeferredImages(path);}
    noteDependency(path,imageCache[path]);
    return imageCache[path];
  }

  function requestCanvasRedraw() {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof window.dispatchEvent === "function") {
      try {
        window.dispatchEvent(new Event("kgame:assetload"));
      } catch (error) {
        // Older browsers can fail to construct Event without a document context.
      }
    }

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(function () {});
    }
  }

  function getCombatTexturePath(key) {
    if (!key) {
      return "";
    }

    return combatTextureAssetMap[key] ? String(combatTextureAssetMap[key]) : "";
  }

  function getCombatTexturePaths() {
    return Object.keys(combatTextureAssetMap).map(function (key) {
      return getCombatTexturePath(key);
    }).filter(Boolean);
  }

  function drawSourceCover(ctx, source, x, y, width, height, options) {
    var opts = options || {};
    var imageWidth = source ? (source.naturalWidth || source.width || 1) : 1;
    var imageHeight = source ? (source.naturalHeight || source.height || 1) : 1;
    var scale = 1;
    var drawWidth = 0;
    var drawHeight = 0;
    var focusX = typeof opts.focusX === "number" ? opts.focusX : 0.5;
    var focusY = typeof opts.focusY === "number" ? opts.focusY : 0.5;
    var drawX = 0;
    var drawY = 0;

    if (!source) {
      return false;
    }

    scale = Math.max(width / imageWidth, height / imageHeight);
    drawWidth = imageWidth * scale;
    drawHeight = imageHeight * scale;
    drawX = x - (drawWidth - width) * focusX;
    drawY = y - (drawHeight - height) * focusY;

    ctx.save();
    ctx.globalAlpha = typeof opts.alpha === "number" ? opts.alpha : 1;
    if (opts.compositeMode) {
      ctx.globalCompositeOperation = opts.compositeMode;
    }
    ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
    return true;
  }

  function drawImageCover(ctx, path, x, y, width, height, options) {
    var entry = typeof path === "string" ? getCachedImage(path) : path;
    var image = entry && entry.image ? entry.image : null;

    if (!entry || !image || !entry.loaded || entry.failed) {
      return false;
    }

    return drawSourceCover(ctx, image, x, y, width, height, options);
  }

  function getPaperTexture() {
    return getCachedCanvas("paperTexture", 160, 160, function (canvas, ctx) {
      var random = createRandom(1905);
      var i = 0;
      var x = 0;
      var y = 0;
      var radius = 0;

      ctx.fillStyle = "#d4c3a0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (i = 0; i < 220; i += 1) {
        x = random() * canvas.width;
        y = random() * canvas.height;
        radius = 2 + random() * 5;
        ctx.fillStyle = random() > 0.5 ? "rgba(95, 70, 42, 0.06)" : "rgba(255, 245, 219, 0.08)";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(123, 88, 54, 0.08)";
      ctx.lineWidth = 1;
      for (i = 0; i < 6; i += 1) {
        y = 24 + i * 22 + random() * 8;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y + random() * 6 - 3);
        ctx.stroke();
      }
    });
  }

  function getRustTexture() {
    return getCachedCanvas("rustTexture", 120, 120, function (canvas, ctx) {
      var random = createRandom(1911);
      var i = 0;
      var x = 0;
      var y = 0;
      var radius = 0;

      ctx.fillStyle = "#3b2420";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (i = 0; i < 180; i += 1) {
        x = random() * canvas.width;
        y = random() * canvas.height;
        radius = 2 + random() * 8;
        ctx.fillStyle = random() > 0.5 ? "rgba(154, 74, 43, 0.18)" : "rgba(91, 27, 21, 0.16)";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(210, 157, 101, 0.08)";
      ctx.lineWidth = 1.5;
      for (i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(random() * canvas.width, 0);
        ctx.lineTo(random() * canvas.width, canvas.height);
        ctx.stroke();
      }
    });
  }

  function fillWithPattern(ctx, x, y, width, height, canvas, alpha) {
    var pattern = ctx.createPattern(canvas, "repeat");

    if (!pattern) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = typeof alpha === "number" ? alpha : 1;
    ctx.translate(x, y);
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawNail(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = "#6e6151";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cbb69b";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "rgba(37, 33, 29, 0.8)";
    ctx.beginPath();
    ctx.moveTo(x - size * 0.55, y - size * 0.55);
    ctx.lineTo(x + size * 0.55, y + size * 0.55);
    ctx.moveTo(x + size * 0.55, y - size * 0.55);
    ctx.lineTo(x - size * 0.55, y + size * 0.55);
    ctx.stroke();
    ctx.restore();
  }

  function drawBulletHole(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = "rgba(18, 14, 13, 0.72)";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(83, 28, 28, 0.4)";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(17, 14, 13, 0.36)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size * 1.6, y - size * 0.4);
    ctx.lineTo(x - size * 0.7, y - size * 0.1);
    ctx.moveTo(x + size * 0.5, y - size * 1.4);
    ctx.lineTo(x + size * 0.2, y - size * 0.5);
    ctx.moveTo(x + size * 1.5, y + size * 0.5);
    ctx.lineTo(x + size * 0.6, y + size * 0.2);
    ctx.moveTo(x - size * 0.8, y + size * 1.5);
    ctx.lineTo(x - size * 0.2, y + size * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawSmoke(ctx, width, height, seed, color, alpha, count) {
    var random = createRandom(seed);
    var i = 0;
    var radius = 0;
    var x = 0;
    var y = 0;

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;

    for (i = 0; i < count; i += 1) {
      x = random() * width;
      y = height * (0.12 + random() * 0.6);
      radius = 28 + random() * 90;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawSkyline(ctx, width, height) {
    var random = createRandom(1931);
    var x = 0;
    var buildingWidth = 0;
    var buildingHeight = 0;

    ctx.save();
    ctx.fillStyle = "rgba(17, 12, 12, 0.78)";

    while (x < width) {
      buildingWidth = 54 + random() * 96;
      buildingHeight = 90 + random() * 140;
      ctx.fillRect(x, height - buildingHeight, buildingWidth, buildingHeight);

      if (random() > 0.45) {
        ctx.beginPath();
        ctx.moveTo(x, height - buildingHeight);
        ctx.lineTo(x + buildingWidth * 0.55, height - buildingHeight - 20 - random() * 28);
        ctx.lineTo(x + buildingWidth, height - buildingHeight);
        ctx.closePath();
        ctx.fill();
      }

      x += buildingWidth - 10;
    }

    ctx.restore();
  }

  function drawBackdrop(ctx, config) {
    var width = config.width || ctx.canvas.logicalWidth || ctx.canvas.width;
    var height = config.height || ctx.canvas.logicalHeight || ctx.canvas.height;
    var baseColor = config.baseColor || "#161315";
    var gradient = null;
    var glow = null;

    ctx.save();
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(118, 35, 33, 0.26)");
    gradient.addColorStop(0.45, "rgba(31, 23, 20, 0.08)");
    gradient.addColorStop(1, "rgba(18, 14, 14, 0.34)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    glow = ctx.createRadialGradient(width * 0.54, height * 0.1, 20, width * 0.54, height * 0.1, width * 0.42);
    glow.addColorStop(0, "rgba(188, 134, 78, 0.16)");
    glow.addColorStop(0.45, "rgba(130, 73, 46, 0.08)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    drawSkyline(ctx, width, height);
    drawSmoke(ctx, width, height, 1942, "rgba(205, 176, 150, 1)", 0.05, 12);
    drawSmoke(ctx, width, height, 1950, "rgba(117, 46, 38, 1)", 0.05, 7);

    ctx.strokeStyle = "rgba(216, 194, 161, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.08, height * 0.2);
    ctx.lineTo(width * 0.25, height * 0.14);
    ctx.moveTo(width * 0.74, height * 0.18);
    ctx.lineTo(width * 0.91, height * 0.1);
    ctx.moveTo(width * 0.18, height * 0.82);
    ctx.lineTo(width * 0.34, height * 0.9);
    ctx.stroke();

    drawBulletHole(ctx, width * 0.08, height * 0.11, 8);
    drawBulletHole(ctx, width * 0.9, height * 0.2, 6);
    drawBulletHole(ctx, width * 0.84, height * 0.86, 7);

    gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.38)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function getStylePalette(style) {
    if (style === "blade") {
      return { accent: "#a82f30", ink: "#351817", wash: "#a77d6a" };
    }
    if (style === "iron") {
      return { accent: "#6f8594", ink: "#1d2429", wash: "#9aa6b0" };
    }
    if (style === "dirty") {
      return { accent: "#657d47", ink: "#1c2417", wash: "#9a9a74" };
    }
    if (style === "combo") {
      return { accent: "#b7862d", ink: "#312412", wash: "#c7a36c" };
    }

    return { accent: "#8b4933", ink: "#2d2019", wash: "#b49177" };
  }

  function getActAccent(templateId) {
    if (templateId && templateId.indexOf("act2_") === 0) {
      return "#a85b3d";
    }
    if (templateId && templateId.indexOf("act3_") === 0) {
      return "#5f7884";
    }
    if (templateId && templateId.indexOf("act4_") === 0) {
      return "#7b8078";
    }
    if (templateId && templateId.indexOf("act5_") === 0) {
      return "#92724a";
    }

    return "#9a3a35";
  }

  function getEnemyThreatVisualStyle(enemy) {
    var behavior = enemy && enemy.behavior ? enemy.behavior : "";
    var firearmStage = enemy && enemy.firearmStage ? enemy.firearmStage : "none";

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

  function getEnemySlotRole(enemy) {
    var slotCount = enemy && enemy.slotCount ? enemy.slotCount : 1;
    var slotIndex = enemy && typeof enemy.slotIndex === "number" ? enemy.slotIndex : 0;

    if (slotCount <= 1) {
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

  function drawSlash(ctx, x1, y1, x2, y2, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawStyleGlyph(ctx, style, x, y, width, height) {
    var palette = getStylePalette(style);
    var centerX = x + width * 0.55;
    var centerY = y + height * 0.55;

    ctx.save();
    ctx.fillStyle = palette.wash;
    ctx.globalAlpha = 0.78;

    if (style === "blade") {
      ctx.beginPath();
      ctx.moveTo(centerX - width * 0.24, centerY + height * 0.16);
      ctx.lineTo(centerX + width * 0.16, centerY - height * 0.24);
      ctx.lineTo(centerX + width * 0.08, centerY - height * 0.3);
      ctx.lineTo(centerX - width * 0.3, centerY + height * 0.12);
      ctx.closePath();
      ctx.fill();
      drawSlash(ctx, centerX - width * 0.32, centerY + height * 0.24, centerX + width * 0.3, centerY - height * 0.2, palette.accent, 5);
    } else if (style === "iron") {
      ctx.fillRect(centerX - width * 0.2, centerY - height * 0.14, width * 0.4, height * 0.24);
      ctx.fillRect(centerX - width * 0.06, centerY - height * 0.3, width * 0.12, height * 0.5);
      drawSlash(ctx, centerX - width * 0.26, centerY + height * 0.14, centerX + width * 0.26, centerY + height * 0.14, palette.accent, 4);
    } else if (style === "dirty") {
      ctx.beginPath();
      ctx.arc(centerX - width * 0.06, centerY - height * 0.04, width * 0.12, Math.PI * 0.6, Math.PI * 1.9);
      ctx.lineTo(centerX + width * 0.14, centerY + height * 0.28);
      ctx.lineTo(centerX + width * 0.06, centerY + height * 0.32);
      ctx.closePath();
      ctx.fill();
      drawSlash(ctx, centerX - width * 0.24, centerY - height * 0.18, centerX + width * 0.18, centerY + height * 0.18, palette.accent, 4);
    } else if (style === "combo") {
      ctx.beginPath();
      ctx.arc(centerX - width * 0.05, centerY - height * 0.02, width * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(centerX - width * 0.1, centerY - height * 0.02, width * 0.3, height * 0.1);
      drawSlash(ctx, centerX - width * 0.28, centerY + height * 0.22, centerX + width * 0.24, centerY - height * 0.02, palette.accent, 4);
      drawSlash(ctx, centerX - width * 0.18, centerY + height * 0.3, centerX + width * 0.32, centerY + height * 0.06, palette.accent, 2.5);
    } else {
      ctx.beginPath();
      ctx.moveTo(centerX - width * 0.16, centerY + height * 0.2);
      ctx.lineTo(centerX + width * 0.16, centerY - height * 0.22);
      ctx.lineTo(centerX + width * 0.08, centerY - height * 0.28);
      ctx.lineTo(centerX - width * 0.23, centerY + height * 0.14);
      ctx.closePath();
      ctx.fill();
      drawSlash(ctx, centerX - width * 0.25, centerY + height * 0.08, centerX + width * 0.2, centerY + height * 0.08, palette.accent, 3);
    }

    ctx.restore();
  }

  function drawFigure(ctx, centerX, baseY, scale, behavior, accent) {
    ctx.save();
    ctx.fillStyle = "rgba(22, 20, 20, 0.9)";
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, scale * 0.08);
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.arc(centerX, baseY - scale * 1.1, scale * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(centerX, baseY - scale * 0.9);
    ctx.lineTo(centerX, baseY - scale * 0.28);
    ctx.lineTo(centerX - scale * 0.22, baseY + scale * 0.38);
    ctx.moveTo(centerX, baseY - scale * 0.28);
    ctx.lineTo(centerX + scale * 0.22, baseY + scale * 0.38);
    ctx.stroke();

    if (behavior === "boxer" || behavior === "boxer_leader") {
      ctx.beginPath();
      ctx.moveTo(centerX, baseY - scale * 0.7);
      ctx.lineTo(centerX - scale * 0.36, baseY - scale * 0.28);
      ctx.moveTo(centerX, baseY - scale * 0.58);
      ctx.lineTo(centerX + scale * 0.38, baseY - scale * 0.1);
      ctx.stroke();
    } else if (behavior === "rifle_scout" || behavior === "mack" || behavior === "nemesis") {
      ctx.beginPath();
      ctx.moveTo(centerX - scale * 0.34, baseY - scale * 0.28);
      ctx.lineTo(centerX + scale * 0.34, baseY - scale * 0.46);
      ctx.moveTo(centerX + scale * 0.28, baseY - scale * 0.48);
      ctx.lineTo(centerX + scale * 0.42, baseY - scale * 0.52);
      ctx.stroke();
    } else if (behavior === "bayonet_scout") {
      ctx.beginPath();
      ctx.moveTo(centerX - scale * 0.28, baseY - scale * 0.24);
      ctx.lineTo(centerX + scale * 0.36, baseY - scale * 0.46);
      ctx.moveTo(centerX + scale * 0.36, baseY - scale * 0.46);
      ctx.lineTo(centerX + scale * 0.48, baseY - scale * 0.52);
      ctx.moveTo(centerX - scale * 0.04, baseY - scale * 0.76);
      ctx.lineTo(centerX - scale * 0.28, baseY - scale * 0.12);
      ctx.stroke();
    } else if (behavior === "city_tracker") {
      ctx.beginPath();
      ctx.moveTo(centerX, baseY - scale * 0.74);
      ctx.lineTo(centerX - scale * 0.32, baseY - scale * 0.16);
      ctx.moveTo(centerX, baseY - scale * 0.62);
      ctx.lineTo(centerX + scale * 0.34, baseY - scale * 0.06);
      ctx.stroke();
    } else if (behavior === "guard_chief") {
      ctx.beginPath();
      ctx.moveTo(centerX, baseY - scale * 0.74);
      ctx.lineTo(centerX + scale * 0.38, baseY - scale * 0.2);
      ctx.lineTo(centerX + scale * 0.2, baseY + scale * 0.24);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX - scale * 0.16, baseY - scale * 0.36, scale * 0.18, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(centerX, baseY - scale * 0.76);
      ctx.lineTo(centerX + scale * 0.18, baseY - scale * 0.16);
      ctx.moveTo(centerX, baseY - scale * 0.68);
      ctx.lineTo(centerX - scale * 0.36, baseY - scale * 0.08);
      ctx.stroke();
    }

    drawSlash(ctx, centerX - scale * 0.5, baseY + scale * 0.22, centerX + scale * 0.46, baseY - scale * 0.48, accent, Math.max(2, scale * 0.07));
    ctx.restore();
  }

  function drawTexturePathCover(ctx, path, x, y, width, height, options) {
    var opts = options || {};
    var entry = null;
    var source = null;

    if (!path) {
      return false;
    }

    if (opts.keyMode) {
      source = getKeyedImageCanvas(path, {
        mode: opts.keyMode,
        solidThreshold: opts.solidThreshold,
        featherThreshold: opts.featherThreshold
      });
    } else {
      entry = getCachedImage(path);
      source = entry && entry.loaded && !entry.failed ? entry.image : null;
    }

    if (!source) {
      return false;
    }

    return drawSourceCover(ctx, source, x, y, width, height, opts);
  }

  function getCombatBackdropCanvas(nodeType) {
    var key = "combatBackdropTexture:" + (nodeType || "street");

    return getCachedCanvas(key, 1280, 720, function (canvas, ctx) {
      var random = createRandom(1900 + String(nodeType || "street").length * 31);
      var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      var i = 0;
      var x = 0;
      var y = 0;
      var radius = 0;
      var height = 0;
      var width = 0;

      gradient.addColorStop(0, "#1b1415");
      gradient.addColorStop(0.38, "#241817");
      gradient.addColorStop(1, "#120d0d");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      fillWithPattern(ctx, 0, 0, canvas.width, canvas.height, getRustTexture(), 0.2);

      for (i = 0; i < 26; i += 1) {
        x = random() * canvas.width;
        y = 42 + random() * 340;
        radius = 80 + random() * 180;
        gradient = ctx.createRadialGradient(x, y, 10, x, y, radius);
        gradient.addColorStop(0, random() > 0.45 ? "rgba(132, 38, 34, 0.16)" : "rgba(78, 56, 43, 0.18)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }

      ctx.fillStyle = "rgba(18, 12, 11, 0.94)";
      for (i = 0; i < 13; i += 1) {
        width = 54 + random() * 92;
        height = 110 + random() * 180;
        x = i * 92 + random() * 40;
        y = 356 - height * (0.18 + random() * 0.2);
        ctx.fillRect(x, y, width, height);
      }

      ctx.fillStyle = "rgba(35, 22, 20, 0.84)";
      ctx.beginPath();
      ctx.moveTo(0, 344);
      ctx.lineTo(canvas.width, 320);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fill();

      fillWithPattern(ctx, 0, 320, canvas.width, canvas.height - 320, getPaperTexture(), 0.12);

      for (i = 0; i < 18; i += 1) {
        x = random() * canvas.width;
        y = 390 + random() * 250;
        radius = 16 + random() * 42;
        gradient = ctx.createRadialGradient(x, y, 2, x, y, radius);
        gradient.addColorStop(0, "rgba(108, 20, 24, 0.22)");
        gradient.addColorStop(0.72, "rgba(108, 20, 24, 0.08)");
        gradient.addColorStop(1, "rgba(108, 20, 24, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    });
  }

  function getCombatWoodTexture() {
    return getCachedCanvas("combatWoodTexture", 320, 160, function (canvas, ctx) {
      var random = createRandom(1910);
      var gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      var i = 0;
      var y = 0;
      var x = 0;
      var scratchY = 0;

      gradient.addColorStop(0, "#2b1d17");
      gradient.addColorStop(0.5, "#3b261f");
      gradient.addColorStop(1, "#201410");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (i = 0; i < 22; i += 1) {
        y = i * 7 + random() * 5;
        ctx.strokeStyle = "rgba(120, 78, 52, " + (0.08 + random() * 0.08) + ")";
        ctx.lineWidth = 1 + random() * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(canvas.width * 0.22, y - 4, canvas.width * 0.72, y + 8, canvas.width, y + 1);
        ctx.stroke();
      }

      for (i = 0; i < 16; i += 1) {
        x = 20 + random() * (canvas.width - 40);
        scratchY = 12 + random() * (canvas.height - 24);
        ctx.strokeStyle = random() > 0.5 ? "rgba(16, 9, 7, 0.42)" : "rgba(168, 118, 74, 0.12)";
        ctx.lineWidth = 1 + random() * 2.6;
        ctx.beginPath();
        ctx.moveTo(x - 18, scratchY - 3);
        ctx.lineTo(x + 22, scratchY + 5);
        ctx.stroke();
      }

      fillWithPattern(ctx, 0, 0, canvas.width, canvas.height, getRustTexture(), 0.18);
    });
  }

  function getCombatPaperTexture() {
    return getCachedCanvas("combatPaperTexture", 240, 360, function (canvas, ctx) {
      var random = createRandom(1907);
      var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      var i = 0;
      var x = 0;
      var y = 0;
      var radius = 0;

      gradient.addColorStop(0, "#d7c29c");
      gradient.addColorStop(0.52, "#ceb58c");
      gradient.addColorStop(1, "#b3956f");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      fillWithPattern(ctx, 0, 0, canvas.width, canvas.height, getPaperTexture(), 0.38);

      for (i = 0; i < 22; i += 1) {
        x = random() * canvas.width;
        y = random() * canvas.height;
        radius = 8 + random() * 20;
        gradient = ctx.createRadialGradient(x, y, 1, x, y, radius);
        gradient.addColorStop(0, random() > 0.5 ? "rgba(126, 40, 28, 0.16)" : "rgba(94, 64, 36, 0.12)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }

      ctx.strokeStyle = "rgba(72, 53, 36, 0.18)";
      ctx.lineWidth = 1;
      for (i = 0; i < 7; i += 1) {
        y = 32 + i * 40 + random() * 12;
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(canvas.width - 10, y + random() * 8 - 4);
        ctx.stroke();
      }
    });
  }

  function getCombatBloodStrokeTexture() {
    return getCachedCanvas("combatBloodStrokeTexture", 360, 72, function (canvas, ctx) {
      var gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      var i = 0;
      var x = 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "rgba(67, 10, 12, 0.94)");
      gradient.addColorStop(0.42, "rgba(137, 16, 24, 0.98)");
      gradient.addColorStop(1, "rgba(93, 9, 16, 0.88)");
      ctx.strokeStyle = gradient;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.moveTo(18, 42);
      ctx.bezierCurveTo(82, 20, 156, 54, 252, 34);
      ctx.bezierCurveTo(296, 26, 326, 22, 344, 28);
      ctx.stroke();

      ctx.strokeStyle = "rgba(34, 6, 7, 0.28)";
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(28, 44);
      ctx.bezierCurveTo(94, 34, 170, 50, 332, 30);
      ctx.stroke();

      for (i = 0; i < 14; i += 1) {
        x = 18 + i * 22;
        ctx.fillStyle = "rgba(78, 8, 12, " + (0.12 + (i % 3) * 0.06) + ")";
        ctx.beginPath();
        ctx.arc(x, 48 + (i % 2) * 4, 4 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function getCombatSealTexture() {
    return getCachedCanvas("combatSealTexture", 160, 160, function (canvas, ctx) {
      var random = createRandom(1912);
      var i = 0;
      var angle = 0;
      var radius = 0;
      var x = 0;
      var y = 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.beginPath();
      for (i = 0; i < 20; i += 1) {
        angle = (Math.PI * 2 * i) / 20;
        radius = 50 + random() * 14;
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(154, 19, 28, 0.92)";
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(86, 7, 12, 0.32)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 52, 0, Math.PI * 2);
      ctx.stroke();

      for (i = 0; i < 16; i += 1) {
        x = 18 + random() * 124;
        y = 18 + random() * 124;
        radius = 2 + random() * 6;
        ctx.fillStyle = random() > 0.5 ? "rgba(186, 34, 42, 0.22)" : "rgba(82, 6, 10, 0.14)";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function getCombatJudgeBlockTexture() {
    return getCachedCanvas("combatJudgeBlockTexture", 440, 150, function (canvas, ctx) {
      var gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      var i = 0;
      var y = 0;

      gradient.addColorStop(0, "#2d1915");
      gradient.addColorStop(0.52, "#4a291f");
      gradient.addColorStop(1, "#261411");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      fillWithPattern(ctx, 0, 0, canvas.width, canvas.height, getCombatWoodTexture(), 0.62);

      ctx.strokeStyle = "rgba(18, 9, 8, 0.58)";
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

      ctx.strokeStyle = "rgba(176, 124, 74, 0.18)";
      ctx.lineWidth = 2;
      for (i = 0; i < 5; i += 1) {
        y = 24 + i * 22;
        ctx.beginPath();
        ctx.moveTo(24, y);
        ctx.lineTo(canvas.width - 24, y - 4);
        ctx.stroke();
      }
    });
  }

  function traceCardSurfacePath(ctx, x, y, width, height) {
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 4);
    ctx.lineTo(x + width - 12, y + 6);
    ctx.lineTo(x + width - 6, y + height * 0.22);
    ctx.lineTo(x + width - 10, y + height - 12);
    ctx.lineTo(x + width * 0.62, y + height - 6);
    ctx.lineTo(x + 18, y + height - 10);
    ctx.lineTo(x + 6, y + height * 0.58);
    ctx.lineTo(x + 12, y + 18);
    ctx.closePath();
  }

  function drawCombatBackdrop(ctx, config) {
    var opts = config || {};
    var x = opts.x || 0;
    var y = opts.y || 0;
    var width = opts.width || 1280;
    var height = opts.height || 720;
    var nodeType = opts.nodeType || "street";
    var path = getCombatTexturePath("background");
    var usedTexture = false;
    var gradient = null;

    ctx.save();
    usedTexture = drawTexturePathCover(ctx, path, x, y, width, height, {
      focusX: 0.5,
      focusY: 0.5,
      alpha: 1
    });
    if (!usedTexture) {
      drawSourceCover(ctx, getCombatBackdropCanvas(nodeType), x, y, width, height, {
        focusX: 0.5,
        focusY: 0.5
      });
    }

    ctx.fillStyle = "rgba(7, 6, 7, 0.5)";
    ctx.fillRect(x, y, width, height);
    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.28)");
    gradient.addColorStop(0.45, "rgba(0, 0, 0, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.48)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
    return true;
  }

  function drawCombatPanelSurface(ctx, x, y, width, height, palette) {
    var colors = palette || {};
    var utils = G.render.canvasUtils;
    // Flatten only opaque, ordinary material painting. Per-operation opacity,
    // filters, inherited shadows and custom compositing retain the direct path.
    var transform = ctx.getTransform();
    if (!utils || colors.skipCache || ctx.globalAlpha !== 1 ||
        (ctx.filter && ctx.filter !== "none") || ctx.globalCompositeOperation !== "source-over" ||
        ctx.shadowBlur || ctx.shadowOffsetX || ctx.shadowOffsetY || ctx.getLineDash().length ||
        transform.b || transform.c || transform.a <= 0 || transform.d <= 0 ||
        !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 ||
        Object.keys(colors).some(function (key) { return colors[key] !== null && typeof colors[key] === "object"; })) {
      return paintCombatPanelSurface(ctx, x, y, width, height, palette);
    }
    var density = utils.density(ctx);
    var padding = Math.max(4, Math.ceil(Math.abs(colors.lineWidth || 2)));
    var fields = Object.keys(colors).sort().map(function (key) { return [key, colors[key]]; });
    var key = "combat-material:" + getCombatTexturePath('panelWood') + ":" + JSON.stringify([
      fields, ctx.imageSmoothingEnabled, ctx.imageSmoothingQuality, ctx.lineJoin, ctx.miterLimit
    ]);
    var layer = utils.cachedLayer(key, width + padding * 2, height + padding * 2, density, function (brush) {
      brush.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
      brush.imageSmoothingQuality = ctx.imageSmoothingQuality;
      brush.lineJoin = ctx.lineJoin;
      brush.miterLimit = ctx.miterLimit;
      paintCombatPanelSurface(brush, padding, padding, width, height, palette);
    });
    ctx.drawImage(layer, x - padding, y - padding, width + padding * 2, height + padding * 2);
    return true;
  }

  function paintCombatPanelSurface(ctx, x, y, width, height, palette) {
    var colors = palette || {};
    var path = getCombatTexturePath("panelWood");
    var stroke = colors.stroke || "rgba(32, 20, 15, 0.7)";
    var highlight = colors.highlight || "rgba(190, 141, 92, 0.12)";
    var lineWidth = typeof colors.lineWidth === "number" ? colors.lineWidth : 2;
    var usedTexture = false;
    var i = 0;
    var nailSize = 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    usedTexture = drawTexturePathCover(ctx, path, x, y, width, height, {
      focusX: 0.5,
      focusY: 0.5
    });
    if (!usedTexture) {
      drawSourceCover(ctx, getCombatWoodTexture(), x, y, width, height, {
        focusX: 0.5,
        focusY: 0.5
      });
    }
    fillWithPattern(ctx, x, y, width, height, getRustTexture(), 0.14);
    ctx.fillStyle = "rgba(8, 6, 6, " + (typeof colors.overlayAlpha === "number" ? colors.overlayAlpha : 0.24) + ")";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = highlight;
    ctx.fillRect(x, y, width, Math.max(4, height * 0.16));
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.strokeStyle = "rgba(9, 7, 6, 0.46)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, y + 4.5, width - 9, height - 9);
    ctx.restore();

    if (!colors.hideNails && width >= 96 && height >= 36) {
      nailSize = Math.max(1.8, Math.min(3.2, Math.min(width, height) * 0.035));
      for (i = 0; i < 4; i += 1) {
        drawNail(
          ctx,
          i < 2 ? x + 10 + i * (width - 20) : x + 10 + (i - 2) * (width - 20),
          i < 2 ? y + 9 : y + height - 9,
          nailSize
        );
      }
    }

    return true;
  }

  function drawCombatSlipSurface(ctx, x, y, width, height, palette) {
    return drawCombatPanelSurface(ctx, x, y, width, height, Object.assign({}, palette || {}, {
      hideNails: width < 80 || height < 28 || !!(palette && palette.hideNails),
      lineWidth: typeof (palette && palette.lineWidth) === "number" ? palette.lineWidth : 1.6,
      overlayAlpha: typeof (palette && palette.overlayAlpha) === "number" ? palette.overlayAlpha : 0.18
    }));
  }

  function drawCombatBarSurface(ctx, x, y, width, height, ratio, palette) {
    var colors = palette || {};
    var fillWidth = Math.max(0, Math.min(width, width * Math.max(0, Math.min(1, ratio))));
    var ledgerPath = colors.backgroundTexturePath || getCombatTexturePath("healthLedger") || getCombatTexturePath("statusPaper");
    var path = getCombatTexturePath("bloodStroke");
    var usedLedger = false;
    var usedTexture = false;
    var gradient = null;
    var slatCount = 0;
    var slatWidth = 0;
    var i = 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    usedLedger = drawTexturePathCover(ctx, ledgerPath, x, y, width, height, {
      focusX: 0.5,
      focusY: 0.5
    });
    if (!usedLedger) {
      ctx.fillStyle = colors.background || "#5d472c";
      ctx.fillRect(x, y, width, height);
      slatCount = Math.max(5, Math.round(width / 36));
      slatWidth = width / slatCount;
      for (i = 0; i < slatCount; i += 1) {
        ctx.fillStyle = i % 2 === 0 ? "rgba(214, 186, 128, 0.16)" : "rgba(62, 42, 20, 0.18)";
        ctx.fillRect(x + i * slatWidth, y, Math.max(1, slatWidth - 1), height);
      }
      ctx.strokeStyle = "rgba(52, 35, 18, 0.42)";
      ctx.lineWidth = 1;
      for (i = 1; i < slatCount; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * slatWidth + 0.5, y + 2);
        ctx.lineTo(x + i * slatWidth + 0.5, y + height - 2);
        ctx.stroke();
      }
    }
    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "rgba(255, 240, 216, 0.08)");
    gradient.addColorStop(0.5, "rgba(255, 240, 216, 0)");
    gradient.addColorStop(1, "rgba(32, 19, 11, 0.2)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = colors.stroke || "rgba(88, 48, 40, 0.4)";
    ctx.lineWidth = typeof colors.lineWidth === "number" ? colors.lineWidth : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.restore();

    if (fillWidth <= 0) {
      return true;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, Math.max(0, fillWidth - 4), Math.max(0, height - 4));
    ctx.clip();
    usedTexture = drawTexturePathCover(ctx, path, x, y - Math.max(3, height * 0.18), width, height + Math.max(6, height * 0.36), {
      focusX: 0.5,
      focusY: 0.5
    });
    if (!usedTexture) {
      drawSourceCover(ctx, getCombatBloodStrokeTexture(), x, y - Math.max(3, height * 0.18), width, height + Math.max(6, height * 0.36), {
        focusX: 0.5,
        focusY: 0.5
      });
    }
    ctx.fillStyle = colors.fillOverlay || "rgba(78, 8, 14, 0.12)";
    ctx.fillRect(x, y, fillWidth, height);
    ctx.restore();

    ctx.save();
    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "rgba(255, 214, 196, 0.12)");
    gradient.addColorStop(1, "rgba(31, 3, 5, 0.22)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, Math.max(0, fillWidth - 4), Math.max(0, height - 4));
    ctx.fill();
    ctx.restore();
    return true;
  }

  function drawCombatCardSurface(ctx, config) {
    var card = config || {};
    var x = card.x || 0;
    var y = card.y || 0;
    var width = card.width || 120;
    var height = card.height || 160;
    var path = getCombatTexturePath("cardPaper");
    var usedTexture = false;
    var gradient = null;
    var tintFill = card.comboDiscounted ? "rgba(104, 42, 36, 0.18)" : (card.playable ? "rgba(82, 77, 72, 0.12)" : "rgba(74, 72, 69, 0.28)");

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 5;
    traceCardSurfacePath(ctx, x, y, width, height);
    ctx.clip();
    usedTexture = drawTexturePathCover(ctx, path, x, y, width, height, {
      focusX: 0.5,
      focusY: 0.5
    });
    if (!usedTexture) {
      drawSourceCover(ctx, getCombatPaperTexture(), x, y, width, height, {
        focusX: 0.5,
        focusY: 0.5
      });
    }
    fillWithPattern(ctx, x, y, width, height, getPaperTexture(), 0.18);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = tintFill;
    ctx.fillRect(x, y, width, height);
    ctx.globalCompositeOperation = "screen";
    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "rgba(248, 244, 236, 0.1)");
    gradient.addColorStop(0.18, "rgba(234, 228, 219, 0.06)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.globalCompositeOperation = "source-over";
    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "rgba(19, 15, 13, 0)");
    gradient.addColorStop(0.7, "rgba(39, 30, 24, 0.06)");
    gradient.addColorStop(1, "rgba(18, 14, 13, 0.18)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    ctx.save();
    traceCardSurfacePath(ctx, x, y, width, height);
    ctx.strokeStyle = "rgba(57, 43, 35, 0.52)";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    traceCardSurfacePath(ctx, x + 3, y + 3, width - 6, height - 6);
    ctx.strokeStyle = "rgba(222, 210, 195, 0.08)";
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
    return true;
  }

  function drawCombatStatusPaperSurface(ctx, x, y, width, height, options) {
    var opts = options || {};
    var path = getCombatTexturePath("statusPaper") || getCombatTexturePath("cardPaper");
    var usedTexture = false;
    var gradient = null;
    var textureCompositeMode = opts.textureCompositeMode || "source-over";
    var showStroke = opts.stroke !== "none" && opts.stroke !== false;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    usedTexture = drawTexturePathCover(ctx, path, x, y, width, height, {
      focusX: typeof opts.focusX === "number" ? opts.focusX : 0.5,
      focusY: typeof opts.focusY === "number" ? opts.focusY : 0.5,
      alpha: typeof opts.textureAlpha === "number" ? opts.textureAlpha : 0.98,
      compositeMode: textureCompositeMode
    });
    if (!usedTexture) {
      ctx.fillStyle = opts.baseFill || "rgba(18, 14, 14, 0.9)";
      ctx.fillRect(x, y, width, height);
      fillWithPattern(ctx, x, y, width, height, getRustTexture(), 0.1);
      gradient = ctx.createRadialGradient(
        x + width * 0.5,
        y + height * 0.44,
        Math.max(12, Math.min(width, height) * 0.08),
        x + width * 0.5,
        y + height * 0.5,
        Math.max(width, height) * 0.68
      );
      gradient.addColorStop(0, "rgba(142, 114, 88, 0.16)");
      gradient.addColorStop(1, "rgba(142, 114, 88, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
    }
    if (opts.textureTint) {
      ctx.globalCompositeOperation = opts.textureTintMode || "multiply";
      ctx.fillStyle = opts.textureTint;
      ctx.fillRect(x, y, width, height);
    }
    ctx.restore();

    ctx.save();
    if (showStroke) {
      ctx.strokeStyle = opts.stroke || "rgba(168, 138, 104, 0.08)";
      ctx.lineWidth = typeof opts.lineWidth === "number" ? opts.lineWidth : 0.8;
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    }
    if (!opts.hideInnerStroke && !usedTexture && width >= 72 && height >= 24) {
      ctx.strokeStyle = opts.innerStroke || "rgba(188, 160, 124, 0.06)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4.5, y + 4.5, width - 9, height - 9);
    }
    ctx.restore();
    return true;
  }

  function drawCombatIntentSeal(ctx, x, y, width, height, options) {
    var opts = options || {};
    var path = getCombatTexturePath("intentSeal");
    var usedTexture = false;
    var compositeMode = opts.compositeMode || "multiply";
    var radius = Math.min(width, height) * 0.5;
    var centerX = x + width * 0.5;
    var centerY = y + height * 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    usedTexture = drawTexturePathCover(ctx, path, x, y, width, height, {
      focusX: 0.5,
      focusY: 0.5,
      alpha: typeof opts.alpha === "number" ? opts.alpha : 1,
      compositeMode: compositeMode
    });
    if (!usedTexture) {
      drawSourceCover(ctx, getCombatSealTexture(), x, y, width, height, {
        focusX: 0.5,
        focusY: 0.5,
        compositeMode: compositeMode
      });
    }
    if (opts.tintColor) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = opts.tintColor;
      ctx.fillRect(x, y, width, height);
    }
    ctx.restore();

    if (!opts.hideRing) {
      ctx.save();
      ctx.strokeStyle = opts.ringColor || "rgba(255, 232, 204, 0.18)";
      ctx.lineWidth = typeof opts.ringWidth === "number" ? opts.ringWidth : 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(0, radius - ctx.lineWidth * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return true;
  }

  function drawCombatCardStamp(ctx, x, y, width, height, options) {
    var opts = options || {};
    var path = opts.path || getCombatTexturePath("cardStamp") || getCombatTexturePath("intentSeal");
    var usedTexture = false;

    if (!path) {
      return false;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    usedTexture = drawTexturePathCover(ctx, path, x, y, width, height, {
      focusX: typeof opts.focusX === "number" ? opts.focusX : 0.5,
      focusY: typeof opts.focusY === "number" ? opts.focusY : 0.5,
      alpha: typeof opts.alpha === "number" ? opts.alpha : 1
    });
    if (opts.tintColor) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = opts.tintColor;
      ctx.fillRect(x, y, width, height);
    }
    ctx.restore();
    return usedTexture;
  }

  function getCardArtSource(config) {
    if (!config) {
      return {};
    }
    if (config.sourceCard) {
      return config.sourceCard;
    }
    if (config.card && config.card.sourceCard) {
      return config.card.sourceCard;
    }
    return config.card || {};
  }

  function getCardArtMotif(config) {
    var style = config.style || (config.card && config.card.style) || "basic";
    var typeLabel = config.typeLabel || "";
    var source = getCardArtSource(config);

    if (config.comboTag || style === "combo") {
      return "cadence";
    }
    if ((source.hits || 0) > 1) {
      return "cadence";
    }
    if ((source.executeDamage || 0) > 0 || source.consumeFlaw) {
      return "slash";
    }
    if (source.consumeFester || (source.fester || 0) > 0 || (source.blind || 0) > 0 || (source.crippleTurns || 0) > 0) {
      return "smoke";
    }
    if (source.damageFromCurrentBlock || (source.ironBoneDamage || 0) > 0 || (source.ironBoneBlock || 0) > 0) {
      return "guard";
    }
    if ((source.draw || 0) > 0 && (source.damage || 0) <= 0 && (source.block || 0) <= 0) {
      return "dossier";
    }

    if (style === "basic") {
      if (typeLabel === "\u5b88") {
        return "guard";
      }
      if (typeLabel === "\u6280") {
        return "dossier";
      }
      return "slash";
    }

    if (style === "blade") {
      return "slash";
    }
    if (style === "iron") {
      return "guard";
    }
    if (style === "dirty") {
      return "smoke";
    }
    return "dossier";
  }

  function getCardArtPalette(config) {
    var style = config.style || (config.card && config.card.style) || "basic";
    var source = getCardArtSource(config);
    var palette = {
      bgTop: "#201b19",
      bgBottom: "#13100f",
      haze: "rgba(236, 220, 196, 0.08)",
      shadow: "rgba(0, 0, 0, 0.34)",
      accent: "rgba(160, 75, 57, 0.76)",
      accentSoft: "rgba(188, 142, 98, 0.18)",
      line: "rgba(236, 220, 198, 0.16)",
      ember: "rgba(224, 196, 154, 0.2)",
      stampTint: "rgba(107, 41, 35, 0.34)"
    };

    if (style === "basic" && (source.consumeFester || (source.fester || 0) > 0 || (source.blind || 0) > 0 || (source.crippleTurns || 0) > 0)) {
      style = "dirty";
    } else if (style === "basic" && (source.damageFromCurrentBlock || (source.ironBoneDamage || 0) > 0 || (source.ironBoneBlock || 0) > 0 || config.typeLabel === "\u5b88")) {
      style = "iron";
    } else if (style === "basic" && ((source.hits || 0) > 1 || config.typeLabel === "\u6280")) {
      style = "combo";
    } else if (style === "basic") {
      style = "blade";
    }

    if (style === "iron") {
      palette.bgTop = "#232120";
      palette.bgBottom = "#151312";
      palette.haze = "rgba(227, 220, 210, 0.08)";
      palette.accent = "rgba(151, 141, 124, 0.72)";
      palette.accentSoft = "rgba(126, 136, 145, 0.16)";
      palette.line = "rgba(228, 221, 210, 0.16)";
      palette.ember = "rgba(210, 197, 176, 0.18)";
      palette.stampTint = "rgba(95, 74, 60, 0.34)";
    } else if (style === "dirty") {
      palette.bgTop = "#241b18";
      palette.bgBottom = "#140f0e";
      palette.haze = "rgba(236, 206, 176, 0.08)";
      palette.accent = "rgba(170, 92, 54, 0.8)";
      palette.accentSoft = "rgba(208, 163, 102, 0.16)";
      palette.line = "rgba(240, 220, 196, 0.14)";
      palette.ember = "rgba(255, 214, 157, 0.24)";
      palette.stampTint = "rgba(114, 56, 34, 0.36)";
    } else if (style === "combo") {
      palette.bgTop = "#211917";
      palette.bgBottom = "#120f0e";
      palette.haze = "rgba(234, 214, 192, 0.08)";
      palette.accent = "rgba(156, 64, 52, 0.76)";
      palette.accentSoft = "rgba(211, 162, 112, 0.15)";
      palette.line = "rgba(238, 221, 202, 0.16)";
      palette.ember = "rgba(224, 196, 160, 0.18)";
      palette.stampTint = "rgba(112, 40, 33, 0.34)";
    }

    if (config.comboDiscounted) {
      palette.accent = "rgba(145, 43, 38, 0.82)";
      palette.accentSoft = "rgba(177, 80, 65, 0.18)";
      palette.stampTint = "rgba(120, 35, 31, 0.38)";
    }

    return palette;
  }

  function drawCardFallbackArt(ctx, config) {
    var x = config.x;
    var y = config.y;
    var width = config.width;
    var height = config.height;
    var centerX = x + width * 0.5;
    var centerY = y + height * 0.48;
    var motif = getCardArtMotif(config);
    var palette = getCardArtPalette(config);
    var gradient = null;
    var haze = null;
    var i = 0;
    var slashOffset = 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, palette.bgTop);
    gradient.addColorStop(0.56, "#181412");
    gradient.addColorStop(1, palette.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    fillWithPattern(ctx, x, y, width, height, getPaperTexture(), 0.06);
    fillWithPattern(ctx, x, y, width, height, getRustTexture(), 0.02);

    haze = ctx.createRadialGradient(centerX, centerY, Math.max(10, width * 0.04), centerX, centerY, Math.max(width, height) * 0.72);
    haze.addColorStop(0, palette.haze);
    haze.addColorStop(0.58, "rgba(0, 0, 0, 0)");
    haze.addColorStop(1, palette.shadow);
    ctx.fillStyle = haze;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(x, y + height * 0.72, width, height * 0.28);

    if (motif === "slash") {
      ctx.strokeStyle = palette.line;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1.5, width * 0.016);
      for (i = 0; i < 3; i += 1) {
        slashOffset = i * width * 0.08;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.18 + slashOffset, y + height * (0.74 - i * 0.07));
        ctx.lineTo(x + width * 0.62 + slashOffset, y + height * (0.22 - i * 0.02));
        ctx.stroke();
      }

      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = Math.max(3.5, width * 0.06);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.24, y + height * 0.78);
      ctx.lineTo(x + width * 0.7, y + height * 0.2);
      ctx.stroke();
    } else if (motif === "guard") {
      ctx.fillStyle = palette.accentSoft;
      ctx.fillRect(x + width * 0.18, y + height * 0.22, width * 0.18, height * 0.5);
      ctx.fillRect(x + width * 0.44, y + height * 0.18, width * 0.24, height * 0.56);
      ctx.fillRect(x + width * 0.72, y + height * 0.28, width * 0.09, height * 0.38);
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = Math.max(1.4, width * 0.014);
      ctx.strokeRect(x + width * 0.18 + 0.5, y + height * 0.22 + 0.5, width * 0.5 - 1, height * 0.5 - 1);
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = Math.max(2.6, width * 0.03);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.16, y + height * 0.72);
      ctx.lineTo(x + width * 0.68, y + height * 0.22);
      ctx.stroke();
    } else if (motif === "smoke") {
      haze = ctx.createRadialGradient(x + width * 0.64, y + height * 0.4, Math.max(6, width * 0.02), x + width * 0.64, y + height * 0.4, width * 0.34);
      haze.addColorStop(0, palette.ember);
      haze.addColorStop(0.34, palette.accentSoft);
      haze.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = haze;
      ctx.fillRect(x, y, width, height);

      ctx.strokeStyle = palette.accent;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2.8, width * 0.028);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.24, y + height * 0.68);
      ctx.lineTo(x + width * 0.6, y + height * 0.46);
      ctx.lineTo(x + width * 0.82, y + height * 0.38);
      ctx.stroke();

      ctx.strokeStyle = palette.line;
      ctx.lineWidth = Math.max(1.2, width * 0.012);
      for (i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + width * (0.34 + i * 0.09), y + height * (0.58 - i * 0.05));
        ctx.lineTo(x + width * (0.2 + i * 0.12), y + height * (0.32 - i * 0.03));
        ctx.stroke();
      }
    } else if (motif === "cadence") {
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = Math.max(1.3, width * 0.013);
      for (i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + width * 0.22, y + height * (0.28 + i * 0.12));
        ctx.lineTo(x + width * 0.76, y + height * (0.16 + i * 0.1));
        ctx.stroke();
      }

      ctx.strokeStyle = palette.accent;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2.6, width * 0.026);
      for (i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + width * (0.26 + i * 0.13), y + height * (0.74 - i * 0.06));
        ctx.lineTo(x + width * (0.42 + i * 0.13), y + height * (0.44 - i * 0.06));
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = Math.max(1.2, width * 0.012);
      ctx.strokeRect(x + width * 0.18 + 0.5, y + height * 0.2 + 0.5, width * 0.48 - 1, height * 0.5 - 1);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.24, y + height * 0.34);
      ctx.lineTo(x + width * 0.56, y + height * 0.34);
      ctx.moveTo(x + width * 0.24, y + height * 0.46);
      ctx.lineTo(x + width * 0.6, y + height * 0.46);
      ctx.moveTo(x + width * 0.24, y + height * 0.58);
      ctx.lineTo(x + width * 0.52, y + height * 0.58);
      ctx.stroke();

      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = Math.max(2.4, width * 0.024);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.64, y + height * 0.24);
      ctx.lineTo(x + width * 0.78, y + height * 0.42);
      ctx.lineTo(x + width * 0.62, y + height * 0.7);
      ctx.stroke();
    }

    drawCombatCardStamp(ctx, x + width * 0.64, y + height * 0.1, width * 0.2, Math.max(18, height * 0.48), {
      alpha: 0.12,
      tintColor: palette.stampTint
    });

    gradient = ctx.createLinearGradient(x, y + height * 0.64, x, y + height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y + height * 0.64, width, height * 0.36);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(49, 38, 31, 0.58)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.strokeStyle = "rgba(230, 217, 198, 0.06)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, y + 4.5, width - 9, height - 9);
    ctx.restore();
    return true;
  }

  function drawCombatEndTurnButton(ctx, x, y, width, height, palette) {
    var colors = palette || {};
    var path = getCombatTexturePath("endTurnBlock");
    var usedTexture = false;
    var gradient = null;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    usedTexture = drawTexturePathCover(ctx, path, x, y, width, height, {
      focusX: 0.5,
      focusY: 0.5
    });
    if (!usedTexture) {
      drawSourceCover(ctx, getCombatJudgeBlockTexture(), x, y, width, height, {
        focusX: 0.5,
        focusY: 0.5
      });
    }
    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "rgba(255, 232, 204, 0.08)");
    gradient.addColorStop(1, "rgba(11, 7, 6, 0.2)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    if (!colors.hideStroke) {
      ctx.save();
      ctx.strokeStyle = colors.stroke || "rgba(24, 13, 11, 0.74)";
      ctx.lineWidth = typeof colors.lineWidth === "number" ? colors.lineWidth : 2;
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
      ctx.restore();
    }
    return true;
  }

  function getPanelSurfaceProfile(colors) {
    var surface = colors && colors.surface ? String(colors.surface) : "default";
    var profile = {
      fill: colors.fill || "rgba(20, 20, 20, 0.85)",
      stroke: colors.stroke || "#4a3728",
      lineWidth: typeof colors.lineWidth === "number" ? colors.lineWidth : 2.5,
      paperAlpha: typeof colors.paperAlpha === "number" ? colors.paperAlpha : 0.18,
      rustAlpha: typeof colors.rustAlpha === "number" ? colors.rustAlpha : 0.04,
      topGlowStart: "rgba(255, 244, 222, 0.04)",
      topGlowEnd: "rgba(255, 255, 255, 0)",
      bottomShadeStart: "rgba(0, 0, 0, 0)",
      bottomShadeEnd: "rgba(0, 0, 0, 0.12)",
      sideShadeAlpha: 0.08,
      accentFill: "rgba(201, 166, 118, 0.12)",
      accentAlpha: 1,
      innerStroke: "rgba(246, 231, 208, 0.08)",
      cornerStroke: "rgba(201, 166, 118, 0.18)"
    };

    if (surface === "dossier-dark") {
      profile.fill = colors.fill || "rgba(16, 14, 13, 0.88)";
      profile.stroke = colors.stroke || "#6a5240";
      profile.paperAlpha = typeof colors.paperAlpha === "number" ? colors.paperAlpha : 0.16;
      profile.rustAlpha = typeof colors.rustAlpha === "number" ? colors.rustAlpha : 0.05;
      profile.topGlowStart = "rgba(255, 236, 209, 0.05)";
      profile.bottomShadeEnd = "rgba(0, 0, 0, 0.18)";
      profile.sideShadeAlpha = 0.12;
      profile.accentFill = "rgba(166, 126, 82, 0.12)";
      profile.innerStroke = "rgba(244, 228, 200, 0.08)";
      profile.cornerStroke = "rgba(194, 156, 112, 0.2)";
      return profile;
    }

    if (surface === "dossier-paper" || surface === "paper-note") {
      profile.fill = colors.fill || "rgba(232, 218, 190, 0.96)";
      profile.stroke = colors.stroke || "rgba(112, 82, 52, 0.44)";
      profile.paperAlpha = typeof colors.paperAlpha === "number" ? colors.paperAlpha : 0.34;
      profile.rustAlpha = typeof colors.rustAlpha === "number" ? colors.rustAlpha : 0.06;
      profile.topGlowStart = "rgba(255, 252, 245, 0.2)";
      profile.bottomShadeEnd = "rgba(78, 48, 31, 0.14)";
      profile.sideShadeAlpha = 0.06;
      profile.accentFill = "rgba(126, 36, 32, 0.08)";
      profile.innerStroke = "rgba(255, 247, 232, 0.32)";
      profile.cornerStroke = "rgba(146, 110, 74, 0.18)";
      return profile;
    }

    if (surface === "lacquer-red") {
      profile.fill = colors.fill || "rgba(92, 28, 25, 0.9)";
      profile.stroke = colors.stroke || "#d6bf94";
      profile.paperAlpha = typeof colors.paperAlpha === "number" ? colors.paperAlpha : 0.08;
      profile.rustAlpha = typeof colors.rustAlpha === "number" ? colors.rustAlpha : 0.03;
      profile.topGlowStart = "rgba(255, 238, 215, 0.12)";
      profile.bottomShadeEnd = "rgba(22, 8, 7, 0.22)";
      profile.sideShadeAlpha = 0.1;
      profile.accentFill = "rgba(255, 233, 204, 0.08)";
      profile.innerStroke = "rgba(255, 241, 216, 0.16)";
      profile.cornerStroke = "rgba(232, 205, 162, 0.22)";
      return profile;
    }

    if (surface === "ink-panel") {
      profile.fill = colors.fill || "rgba(9, 11, 14, 0.78)";
      profile.stroke = colors.stroke || "rgba(168, 138, 104, 0.16)";
      profile.paperAlpha = typeof colors.paperAlpha === "number" ? colors.paperAlpha : 0.04;
      profile.rustAlpha = typeof colors.rustAlpha === "number" ? colors.rustAlpha : 0.01;
      profile.topGlowStart = "rgba(255, 241, 220, 0.03)";
      profile.bottomShadeEnd = "rgba(0, 0, 0, 0.28)";
      profile.sideShadeAlpha = 0.08;
      profile.accentFill = "rgba(214, 186, 142, 0.04)";
      profile.innerStroke = "rgba(236, 226, 206, 0.04)";
      profile.cornerStroke = "rgba(188, 154, 110, 0.08)";
      return profile;
    }

    if (surface === "wood-button") {
      profile.fill = colors.fill || "rgba(53, 34, 26, 0.96)";
      profile.stroke = colors.stroke || "#ad8e69";
      profile.paperAlpha = typeof colors.paperAlpha === "number" ? colors.paperAlpha : 0.1;
      profile.rustAlpha = typeof colors.rustAlpha === "number" ? colors.rustAlpha : 0.08;
      profile.topGlowStart = "rgba(255, 228, 196, 0.08)";
      profile.bottomShadeEnd = "rgba(10, 6, 5, 0.22)";
      profile.sideShadeAlpha = 0.14;
      profile.accentFill = "rgba(214, 181, 134, 0.12)";
      profile.innerStroke = "rgba(247, 231, 209, 0.12)";
      profile.cornerStroke = "rgba(215, 181, 133, 0.24)";
      return profile;
    }

    if (surface === "combat-overlay") {
      profile.fill = colors.fill || "rgba(18, 16, 16, 0.72)";
      profile.stroke = colors.stroke || "rgba(113, 88, 64, 0.24)";
      profile.paperAlpha = typeof colors.paperAlpha === "number" ? colors.paperAlpha : 0.12;
      profile.rustAlpha = typeof colors.rustAlpha === "number" ? colors.rustAlpha : 0.03;
      profile.topGlowStart = "rgba(255, 239, 212, 0.04)";
      profile.bottomShadeEnd = "rgba(0, 0, 0, 0.2)";
      profile.sideShadeAlpha = 0.12;
      profile.accentFill = "rgba(191, 160, 114, 0.1)";
      profile.innerStroke = "rgba(244, 230, 206, 0.07)";
      profile.cornerStroke = "rgba(188, 154, 110, 0.18)";
      return profile;
    }

    return profile;
  }

  function drawPanelSurface(ctx, x, y, width, height, palette) {
    var colors = palette || {};
    var profile = getPanelSurfaceProfile(colors);
    var gradient = null;
    var accentHeight = Math.max(2, Math.min(16, height * 0.12));
    var corner = Math.max(12, Math.min(26, Math.min(width, height) * 0.2));

    ctx.save();
    ctx.fillStyle = profile.fill;
    ctx.fillRect(x, y, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    fillWithPattern(ctx, x, y, width, height, getPaperTexture(), profile.paperAlpha);
    fillWithPattern(ctx, x, y, width, height, getRustTexture(), profile.rustAlpha);

    if (profile.accentAlpha > 0) {
      ctx.globalAlpha = profile.accentAlpha;
      ctx.fillStyle = profile.accentFill;
      ctx.fillRect(x, y, width, accentHeight);
      ctx.globalAlpha = 1;
    }

    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, profile.topGlowStart);
    gradient.addColorStop(0.42, profile.topGlowEnd);
    gradient.addColorStop(1, profile.bottomShadeEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    if (profile.sideShadeAlpha > 0) {
      gradient = ctx.createLinearGradient(x, y, x + width, y);
      gradient.addColorStop(0, "rgba(0, 0, 0, " + profile.sideShadeAlpha + ")");
      gradient.addColorStop(0.12, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(0.88, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, " + (profile.sideShadeAlpha * 0.8) + ")");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
    }
    ctx.restore();

    if (profile.lineWidth > 0) {
      ctx.strokeStyle = profile.stroke;
      ctx.lineWidth = profile.lineWidth;
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

      ctx.strokeStyle = profile.innerStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4.5, y + 4.5, width - 9, height - 9);

      ctx.strokeStyle = profile.cornerStroke;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + corner);
      ctx.lineTo(x + 8, y + 8);
      ctx.lineTo(x + corner, y + 8);
      ctx.moveTo(x + width - corner, y + 8);
      ctx.lineTo(x + width - 8, y + 8);
      ctx.lineTo(x + width - 8, y + corner);
      ctx.moveTo(x + 8, y + height - corner);
      ctx.lineTo(x + 8, y + height - 8);
      ctx.lineTo(x + corner, y + height - 8);
      ctx.moveTo(x + width - corner, y + height - 8);
      ctx.lineTo(x + width - 8, y + height - 8);
      ctx.lineTo(x + width - 8, y + height - corner);
      ctx.stroke();
    }

    ctx.restore();
  }

  function getEnemyPortraitPath(enemy) {
    var templateId = enemy && enemy.templateId ? enemy.templateId : null;
    var behavior = enemy && enemy.behavior ? enemy.behavior : null;

    if (templateId && portraitAssetMap[templateId]) {
      return portraitAssetMap[templateId];
    }
    if (behavior && portraitAssetMap[behavior]) {
      return portraitAssetMap[behavior];
    }
    if (behavior === "nemesis") {
      return portraitAssetMap.nemesis;
    }

    return null;
  }

  function getPlayerPortraitPath(style) {
    return playerPortraitAssetMap[style] || null;
  }

  function getPlayerPortraitBattlefieldOptions(style) {
    return playerPortraitBattlefieldOptionMap[style] || null;
  }

  function normalizeCardArtEntry(entry) {
    if (!entry) {
      return null;
    }
    if (typeof entry === "string") {
      return { path: entry };
    }
    return entry;
  }

  function getCardArtEntry(config) {
    var card = config.card || null;
    var sourceCard = config.sourceCard || (card && card.sourceCard) || null;
    var cardId = config.cardId || (sourceCard && sourceCard.id) || (card && card.id) || null;
    var definition = cardId && G.cards && G.cards.definitions ? G.cards.definitions[cardId] : null;

    if (config.art) {
      return normalizeCardArtEntry(config.art);
    }
    if (config.artPath) {
      return { path: config.artPath };
    }
    if (card && card.art) {
      return normalizeCardArtEntry(card.art);
    }
    if (sourceCard && sourceCard.art) {
      return normalizeCardArtEntry(sourceCard.art);
    }
    if (card && card.artPath) {
      return { path: card.artPath };
    }
    if (sourceCard && sourceCard.artPath) {
      return { path: sourceCard.artPath };
    }
    if (cardId && cardArtAssetMap[cardId]) {
      return normalizeCardArtEntry(cardArtAssetMap[cardId]);
    }
    if (cardId && cardArtManifest[cardId]) {
      return normalizeCardArtEntry(cardArtManifest[cardId]);
    }
    if (definition && definition.art) {
      return normalizeCardArtEntry(definition.art);
    }
    if (definition && definition.artPath) {
      return { path: definition.artPath };
    }

    return null;
  }

  function getCardArtFocus(config, entry) {
    var artRole = config.artRole || "default";
    var focus = entry && entry.focus ? entry.focus : null;
    var chosen = null;
    var focusX = 0.5;
    var focusY = 0.5;

    if (focus && typeof focus.x === "number" && typeof focus.y === "number") {
      chosen = focus;
    } else if (focus && focus[artRole]) {
      chosen = focus[artRole];
    } else if (focus && focus.default) {
      chosen = focus.default;
    }

    if (chosen && typeof chosen.x === "number") {
      focusX = chosen.x;
    }
    if (chosen && typeof chosen.y === "number") {
      focusY = chosen.y;
    }
    if (typeof config.focusX === "number") {
      focusX = config.focusX;
    }
    if (typeof config.focusY === "number") {
      focusY = config.focusY;
    }

    return {
      x: clamp(focusX, 0, 1),
      y: clamp(focusY, 0, 1)
    };
  }

  function getCardArtPath(config) {
    var entry = getCardArtEntry(config);
    return entry && entry.path ? entry.path : null;
  }

  function getAllPortraitPaths() {
    var seen = {};
    var paths = [];

    function collect(map) {
      Object.keys(map).forEach(function (key) {
        var path = map[key];

        if (!path || seen[path]) {
          return;
        }
        seen[path] = true;
        paths.push(path);
      });
    }

    collect(portraitAssetMap);
    collect(playerPortraitAssetMap);
    return paths;
  }

  function getAllCardArtPaths() {
    var seen = {};
    var paths = [];
    var path = "";

    Object.keys(cardArtAssetMap).forEach(function (cardId) {
      path = normalizeCardArtEntry(cardArtAssetMap[cardId]);
      path = path && path.path ? path.path : "";

      if (!path || seen[path]) {
        return;
      }

      seen[path] = true;
      paths.push(path);
    });

    Object.keys(cardArtManifest).forEach(function (cardId) {
      path = normalizeCardArtEntry(cardArtManifest[cardId]);
      path = path && path.path ? path.path : "";

      if (!path || seen[path]) {
        return;
      }

      seen[path] = true;
      paths.push(path);
    });

    if (G.cards && G.cards.definitions) {
      Object.keys(G.cards.definitions).forEach(function (cardId) {
        var definition = G.cards.definitions[cardId];
        var path = definition && definition.artPath;

        if (!path || seen[path]) {
          return;
        }

        seen[path] = true;
        paths.push(path);
      });
    }

    return paths;
  }

  function preloadPortraitAssets() {
    getAllPortraitPaths().forEach(function (path) {
      getCachedImage(path);
    });
  }

  function preloadCardArtAssets() {
    getAllCardArtPaths().forEach(function (path) {
      if(!deferred(path))getCachedImage(path);
    });
  }

  function preloadUiTextures() {
    uiTexturePaths.concat(getCombatTexturePaths()).forEach(function (path) {
      getCachedImage(path);
    });
  }

  function getPortraitDebugState() {
    var state = {};
    var paths = getAllPortraitPaths();

    paths.forEach(function (path) {
      var entry = imageCache[path];

      state[path] = {
        loaded: !!(entry && entry.loaded),
        failed: !!(entry && entry.failed),
        complete: !!(entry && entry.image && entry.image.complete),
        naturalWidth: entry && entry.image ? (entry.image.naturalWidth || 0) : 0,
        naturalHeight: entry && entry.image ? (entry.image.naturalHeight || 0) : 0,
        renderStats: portraitRenderStats[path] || {
          attempts: 0,
          draws: 0
        }
      };
    });

    return state;
  }

  function getBorderSampleColor(data, width, height) {
    var points = [
      [4, 4],
      [width - 5, 4],
      [4, height - 5],
      [width - 5, height - 5],
      [Math.floor(width * 0.5), 4],
      [Math.floor(width * 0.5), height - 5],
      [4, Math.floor(height * 0.5)],
      [width - 5, Math.floor(height * 0.5)]
    ];
    var sample = { r: 0, g: 0, b: 0 };

    points.forEach(function (point) {
      var index = (point[1] * width + point[0]) * 4;
      sample.r += data[index];
      sample.g += data[index + 1];
      sample.b += data[index + 2];
    });

    sample.r /= points.length;
    sample.g /= points.length;
    sample.b /= points.length;
    return sample;
  }

  function getColorDistance(data, offset, sample) {
    return Math.abs(data[offset] - sample.r) +
      Math.abs(data[offset + 1] - sample.g) +
      Math.abs(data[offset + 2] - sample.b);
  }

  function getKeySampleColor(mode, data, width, height) {
    if (mode === "white") {
      return { r: 255, g: 255, b: 255 };
    }
    if (mode === "black") {
      return { r: 0, g: 0, b: 0 };
    }
    return getBorderSampleColor(data, width, height);
  }

  function getKeyedImageCanvas(path, options) {
    var opts = options || {};
    var entry = getCachedImage(path);
    var source = entry && entry.image;
    var canvas = null;
    var ctx = null;
    var imageData = null;
    var data = null;
    var width = 0;
    var height = 0;
    var border = null;
    var solidThreshold = typeof opts.solidThreshold === "number" ? opts.solidThreshold : 30;
    var featherThreshold = typeof opts.featherThreshold === "number" ? opts.featherThreshold : 66;
    var visited = null;
    var queue = [];
    var index = 0;
    var x = 0;
    var y = 0;
    var cache = opts.cache || keyedImageCache;
    var cacheKey = path + "|" + (opts.mode || "auto") + "|" + solidThreshold + "|" + featherThreshold;

    if (!source || !entry.loaded || entry.failed) {
      return source || null;
    }
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    width = source.naturalWidth || source.width || 0;
    height = source.naturalHeight || source.height || 0;
    if (!width || !height) {
      return source;
    }

    canvas = createCanvas(width, height);
    ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0, width, height);
    imageData = ctx.getImageData(0, 0, width, height);
    data = imageData.data;
    border = getKeySampleColor(opts.mode || "auto", data, width, height);
    visited = new Uint8Array(width * height);

    function enqueue(px, py) {
      var pixelIndex = py * width + px;
      var offset = pixelIndex * 4;

      if (px < 0 || py < 0 || px >= width || py >= height || visited[pixelIndex]) {
        return;
      }
      if (data[offset + 3] === 0 || getColorDistance(data, offset, border) > solidThreshold) {
        return;
      }
      visited[pixelIndex] = 1;
      queue.push(pixelIndex);
    }

    for (x = 0; x < width; x += 1) {
      enqueue(x, 0);
      enqueue(x, height - 1);
    }
    for (y = 1; y < height - 1; y += 1) {
      enqueue(0, y);
      enqueue(width - 1, y);
    }

    while (queue.length) {
      index = queue.pop();
      x = index % width;
      y = (index - x) / width;
      data[index * 4 + 3] = 0;
      enqueue(x - 1, y);
      enqueue(x + 1, y);
      enqueue(x, y - 1);
      enqueue(x, y + 1);
    }

    for (index = 0; index < width * height; index += 1) {
      var offset = index * 4;
      var alpha = data[offset + 3];
      var distance = 0;

      if (!alpha) {
        continue;
      }
      distance = getColorDistance(data, offset, border);
      if (distance <= solidThreshold) {
        data[offset + 3] = 0;
      } else if (distance < featherThreshold) {
        data[offset + 3] = Math.round(alpha * (distance - solidThreshold) / (featherThreshold - solidThreshold));
      }
    }

    ctx.putImageData(imageData, 0, 0);
    cache[cacheKey] = canvas;
    return canvas;
  }

  function getKeyedPortraitCanvas(path) {
    return getKeyedImageCanvas(path, {
      cache: keyedPortraitCache,
      mode: "auto",
      solidThreshold: 30,
      featherThreshold: 66
    });
  }

  function getBattlefieldPortraitFrame(enemy, width, height) {
    var slotCount = enemy && enemy.slotCount ? enemy.slotCount : 1;
    var slotIndex = enemy && typeof enemy.slotIndex === "number" ? enemy.slotIndex : 0;
    var templateId = enemy && enemy.templateId ? enemy.templateId : "";
    var behavior = enemy && enemy.behavior ? enemy.behavior : "";
    var compact = width <= 180 || height <= 128;
    var frame = null;
    var preset = null;
    var templateAdjust = null;
    var slotRole = getEnemySlotRole(enemy);
    var threatStyle = getEnemyThreatVisualStyle(enemy);
    var isFrontThreat = slotRole === "front" && enemy && enemy.intent === "attack";
    var key = "";

    if (slotCount <= 1) {
      return null;
    }

    frame = {
      anchorX: 0.5,
      zoom: compact ? 0.88 : 0.92,
      offsetY: 0,
      cropWidthRatio: compact ? 0.88 : 0.82,
      cropHeightRatio: compact ? 0.42 : 0.36,
      cropTopRatio: 0.05,
      clipLeft: 0.04,
      clipRight: 0.04,
      clipTop: 0.04,
      clipBottom: 0.08
    };
    if (templateId === "boxer" || templateId === "boxer_leader" || behavior === "boxer" || behavior === "boxer_leader") {
      templateAdjust = {
        anchorShift: -0.04,
        zoomScale: 0.94,
        offsetYAdd: height * 0.02,
        cropWidthAdd: 0.04,
        cropHeightAdd: 0.06,
        clipRightLimit: 0.04,
        clipBottomLimit: 0.06
      };
    } else if (templateId === "city_tracker" || behavior === "city_tracker") {
      templateAdjust = {
        anchorShift: -0.05,
        zoomScale: 0.96,
        offsetYAdd: height * 0.012,
        cropWidthAdd: 0.05,
        cropHeightAdd: 0.04,
        clipRightLimit: 0.05,
        clipBottomLimit: 0.08
      };
    }

    if (templateAdjust) {
      frame.anchorX = clamp(frame.anchorX + templateAdjust.anchorShift, 0.22, 0.7);
      frame.zoom *= templateAdjust.zoomScale;
      frame.offsetY += templateAdjust.offsetYAdd;
      frame.cropWidthRatio = clamp(frame.cropWidthRatio + templateAdjust.cropWidthAdd, 0.74, 0.98);
      frame.cropHeightRatio = clamp(frame.cropHeightRatio + templateAdjust.cropHeightAdd, 0.32, 0.58);
      frame.clipRight = Math.min(frame.clipRight, templateAdjust.clipRightLimit);
      frame.clipBottom = Math.min(frame.clipBottom, templateAdjust.clipBottomLimit);
    }

    if (slotRole === "front") {
      if (threatStyle === "firearm") {
        frame.anchorX = clamp(frame.anchorX - 0.05, 0.26, 0.64);
        frame.cropWidthRatio = clamp(frame.cropWidthRatio + 0.05, 0.74, 0.96);
        frame.clipLeft = Math.max(frame.clipLeft, 0.14);
        frame.clipRight = Math.max(frame.clipRight, 0.08);
      } else if (threatStyle === "bayonet") {
        frame.anchorX = clamp(frame.anchorX - 0.04, 0.26, 0.64);
        frame.cropWidthRatio = clamp(frame.cropWidthRatio + 0.06, 0.74, 0.96);
        frame.clipLeft = Math.max(frame.clipLeft, 0.14);
        frame.clipRight = Math.max(frame.clipRight, 0.08);
      } else if (threatStyle === "blunt") {
        frame.clipLeft = Math.max(frame.clipLeft, 0.08);
        frame.clipRight = Math.max(frame.clipRight, 0.08);
        frame.clipBottom = Math.max(frame.clipBottom, 0.12);
      } else {
        frame.anchorX = clamp(frame.anchorX - 0.02, 0.28, 0.66);
        frame.clipLeft = Math.max(frame.clipLeft, 0.1);
        frame.clipBottom = Math.max(frame.clipBottom, 0.1);
      }
    }

    return frame;
  }

  function getBattlefieldDepthTreatment(enemy) {
    return {
      drawAlpha: 1,
      hazeAlpha: 0,
      hazeWarmAlpha: 0,
      glowAlphaScale: 1,
      smokeAlphaScale: 1
    };
  }

  function drawPortraitCutout(ctx, image, x, y, width, height, options) {
    var imageWidth = image.naturalWidth || image.width || 1;
    var imageHeight = image.naturalHeight || image.height || 1;
    var opts = options || {};
    var sourceX = 0;
    var sourceY = 0;
    var sourceWidth = imageWidth;
    var sourceHeight = imageHeight;
    var anchorX = typeof opts.anchorX === "number" ? Math.max(0, Math.min(1, opts.anchorX)) : 0.5;
    var offsetY = typeof opts.offsetY === "number" ? opts.offsetY : 0;
    var zoom = typeof opts.zoom === "number" ? opts.zoom : 1;
    var cropWidthRatio = typeof opts.cropWidthRatio === "number" ? opts.cropWidthRatio : 0.78;
    var cropHeightRatio = typeof opts.cropHeightRatio === "number" ? opts.cropHeightRatio : 0.32;
    var cropTopRatio = typeof opts.cropTopRatio === "number" ? opts.cropTopRatio : 0.03;
    var forceCrop = !!opts.forceCrop;
    var flipX = !!opts.flipX;
    var scale = 0;
    var drawWidth = 0;
    var drawHeight = 0;
    var drawX = 0;
    var drawY = 0;

    if (height <= 120 || forceCrop) {
      sourceWidth = imageWidth * cropWidthRatio;
      sourceHeight = imageHeight * cropHeightRatio;
      sourceX = Math.max(0, Math.min(imageWidth - sourceWidth, imageWidth * anchorX - sourceWidth * 0.5));
      sourceY = imageHeight * cropTopRatio;
      scale = (height <= 120 ? Math.max((width * 0.94) / sourceWidth, (height * 0.98) / sourceHeight) : Math.min((width * 0.92) / sourceWidth, (height * 0.98) / sourceHeight)) * zoom;
      drawWidth = sourceWidth * scale;
      drawHeight = sourceHeight * scale;
      drawX = x + width * anchorX - drawWidth * 0.5;
      drawY = y + height - drawHeight + (height <= 120 ? height * 0.08 : -height * 0.015) + offsetY;
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.34)";
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 10;
      if (flipX) {
        ctx.translate(drawX + drawWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, drawY, drawWidth, drawHeight);
      } else {
        ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
      }
      ctx.restore();
      return;
    }

    scale = Math.min((width * 0.92) / imageWidth, (height * 0.96) / imageHeight) * zoom;
    drawWidth = imageWidth * scale;
    drawHeight = imageHeight * scale;
    drawX = x + width * anchorX - drawWidth * 0.5;
    drawY = y + height - drawHeight - height * 0.015 + offsetY;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.34)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    if (flipX) {
      ctx.translate(drawX + drawWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, drawY, drawWidth, drawHeight);
    } else {
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }
    ctx.restore();
  }

  function drawPortraitLowerOcclusion(ctx, x, y, width, height, options) {
    var opts = options || {};
    var mode = opts.mode || "panel";
    var centerX = x + width * (typeof opts.centerX === "number" ? opts.centerX : 0.5);
    var occlusionHalfWidth = width * (mode === "battlefield" ? 0.43 : 0.34);
    var leftX = centerX - occlusionHalfWidth;
    var rightX = centerX + occlusionHalfWidth * 1.04;
    var ridgeY = y + height * (mode === "battlefield" ? 0.855 : 0.8);
    var bandMidAlpha = mode === "battlefield" ? 0.09 : 0.26;
    var bandEndAlpha = mode === "battlefield" ? 0.18 : 0.5;
    var warmCoreAlpha = mode === "battlefield" ? 0.03 : 0.08;
    var topLipAlpha = mode === "battlefield" ? 0.022 : 0.06;
    var massAlpha = mode === "battlefield" ? 0.05 : 0.22;
    var gradient = null;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(leftX - width * 0.05, y + height * (mode === "battlefield" ? 0.89 : 0.86));
    if (typeof ctx.quadraticCurveTo === "function") {
      if (mode === "battlefield") {
        ctx.quadraticCurveTo(centerX - width * 0.28, ridgeY - height * 0.018, centerX - width * 0.1, ridgeY - height * 0.008);
        ctx.quadraticCurveTo(centerX + width * 0.06, ridgeY + height * 0.008, centerX + width * 0.2, ridgeY - height * 0.012);
        ctx.quadraticCurveTo(centerX + width * 0.34, ridgeY - height * 0.02, rightX + width * 0.03, y + height * 0.885);
      } else {
        ctx.quadraticCurveTo(centerX - width * 0.22, ridgeY - height * 0.06, centerX - width * 0.09, ridgeY);
        ctx.quadraticCurveTo(centerX, ridgeY + height * 0.035, centerX + width * 0.14, ridgeY - height * 0.01);
        ctx.quadraticCurveTo(centerX + width * 0.28, ridgeY - height * 0.03, rightX + width * 0.03, y + height * 0.84);
      }
    } else {
      ctx.lineTo(centerX - width * 0.09, ridgeY);
      ctx.lineTo(centerX + width * 0.14, ridgeY - height * 0.01);
      ctx.lineTo(rightX + width * 0.03, y + height * (mode === "battlefield" ? 0.885 : 0.84));
    }
    ctx.lineTo(rightX + width * 0.05, y + height * 1.08);
    ctx.lineTo(leftX - width * 0.05, y + height * 1.08);
    ctx.closePath();

    ctx.save();
    ctx.clip();
    gradient = ctx.createLinearGradient(x, ridgeY - height * (mode === "battlefield" ? 0.06 : 0.12), x, y + height * 1.04);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.28, mode === "battlefield" ? "rgba(16, 11, 11, 0.06)" : "rgba(20, 15, 14, 0.1)");
    gradient.addColorStop(0.7, "rgba(20, 15, 14, " + bandMidAlpha + ")");
    gradient.addColorStop(1, "rgba(20, 15, 14, " + bandEndAlpha + ")");
    ctx.fillStyle = gradient;
    ctx.fillRect(leftX - width * 0.08, ridgeY - height * (mode === "battlefield" ? 0.08 : 0.14), (rightX - leftX) + width * 0.16, height * 0.42);

    gradient = ctx.createRadialGradient(
      centerX,
      y + height * (mode === "battlefield" ? 0.89 : 0.86),
      Math.max(10, width * 0.08),
      centerX,
      y + height * (mode === "battlefield" ? 0.92 : 0.9),
      Math.max(width, height) * (mode === "battlefield" ? 0.34 : 0.4)
    );
    gradient.addColorStop(0, "rgba(202, 154, 114, " + warmCoreAlpha + ")");
    gradient.addColorStop(0.55, mode === "battlefield" ? "rgba(72, 42, 34, 0.08)" : "rgba(98, 67, 52, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(leftX - width * 0.1, y + height * 0.56, (rightX - leftX) + width * 0.2, height * 0.5);

    if (mode !== "battlefield") {
      fillWithPattern(ctx, leftX - width * 0.08, y + height * 0.68, (rightX - leftX) + width * 0.16, height * 0.44, getRustTexture(), 0.05);
    }
    gradient = ctx.createLinearGradient(x, ridgeY - height * 0.08, x, ridgeY + height * 0.12);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.45, "rgba(233, 202, 169, " + topLipAlpha + ")");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(leftX - width * 0.08, y + height * 0.6, (rightX - leftX) + width * 0.16, height * 0.32);
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(leftX - width * 0.05, y + height * (mode === "battlefield" ? 0.89 : 0.86));
    if (typeof ctx.quadraticCurveTo === "function") {
      if (mode === "battlefield") {
        ctx.quadraticCurveTo(centerX - width * 0.28, ridgeY - height * 0.018, centerX - width * 0.1, ridgeY - height * 0.008);
        ctx.quadraticCurveTo(centerX + width * 0.06, ridgeY + height * 0.008, centerX + width * 0.2, ridgeY - height * 0.012);
        ctx.quadraticCurveTo(centerX + width * 0.34, ridgeY - height * 0.02, rightX + width * 0.03, y + height * 0.885);
      } else {
        ctx.quadraticCurveTo(centerX - width * 0.22, ridgeY - height * 0.06, centerX - width * 0.09, ridgeY);
        ctx.quadraticCurveTo(centerX, ridgeY + height * 0.035, centerX + width * 0.14, ridgeY - height * 0.01);
        ctx.quadraticCurveTo(centerX + width * 0.28, ridgeY - height * 0.03, rightX + width * 0.03, y + height * 0.84);
      }
    } else {
      ctx.lineTo(centerX - width * 0.09, ridgeY);
      ctx.lineTo(centerX + width * 0.14, ridgeY - height * 0.01);
      ctx.lineTo(rightX + width * 0.03, y + height * (mode === "battlefield" ? 0.885 : 0.84));
    }
    ctx.lineTo(rightX + width * 0.05, y + height * 1.08);
    ctx.lineTo(leftX - width * 0.05, y + height * 1.08);
    ctx.closePath();
    ctx.fillStyle = "rgba(29, 21, 19, " + massAlpha + ")";
    ctx.fill();

    ctx.restore();
  }

  function drawBattlefieldThreatPoseAccent(ctx, enemy, x, y, width, height, battlefieldDepth) {
    return;
  }

  function softenBattlefieldStageEdges(ctx, x, y, width, height, options) {
    var opts = options || {};
    var leftFade = typeof opts.leftFade === "number" ? opts.leftFade : width * 0.08;
    var rightFade = typeof opts.rightFade === "number" ? opts.rightFade : width * 0.08;
    var topFade = typeof opts.topFade === "number" ? opts.topFade : height * 0.03;
    var bottomFade = typeof opts.bottomFade === "number" ? opts.bottomFade : height * 0.12;
    var strength = typeof opts.strength === "number" ? opts.strength : 0.82;
    var gradient = null;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    if (leftFade > 0) {
      gradient = ctx.createLinearGradient(x, 0, x + leftFade, 0);
      gradient.addColorStop(0, "rgba(0, 0, 0, " + strength + ")");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 1, y - 1, leftFade + 2, height + 2);
    }

    if (rightFade > 0) {
      gradient = ctx.createLinearGradient(x + width - rightFade, 0, x + width, 0);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, " + strength + ")");
      ctx.fillStyle = gradient;
      ctx.fillRect(x + width - rightFade - 1, y - 1, rightFade + 2, height + 2);
    }

    if (topFade > 0) {
      gradient = ctx.createLinearGradient(0, y, 0, y + topFade);
      gradient.addColorStop(0, "rgba(0, 0, 0, " + (strength * 0.35) + ")");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 1, y - 1, width + 2, topFade + 2);
    }

    if (bottomFade > 0) {
      gradient = ctx.createLinearGradient(0, y + height - bottomFade, 0, y + height);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, " + strength + ")");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 1, y + height - bottomFade - 1, width + 2, bottomFade + 2);
    }

    ctx.restore();
  }

  function drawImagePortrait(ctx, enemy, x, y, width, height, accent, presentation) {
    var path = getEnemyPortraitPath(enemy);
    var entry = getCachedImage(path);
    var gradient = null;
    var mode = presentation || "panel";
    var battlefieldFrame = mode === "battlefield" ? getBattlefieldPortraitFrame(enemy, width, height) : null;
    var battlefieldDepth = mode === "battlefield" ? getBattlefieldDepthTreatment(enemy) : null;
    var clipLeft = battlefieldFrame && typeof battlefieldFrame.clipLeft === "number" ? battlefieldFrame.clipLeft : 0.08;
    var clipRight = battlefieldFrame && typeof battlefieldFrame.clipRight === "number" ? battlefieldFrame.clipRight : 0.08;
    var clipTop = battlefieldFrame && typeof battlefieldFrame.clipTop === "number" ? battlefieldFrame.clipTop : 0.06;
    var clipBottom = battlefieldFrame && typeof battlefieldFrame.clipBottom === "number" ? battlefieldFrame.clipBottom : 0.1;
    var canvasWidth = ctx && ctx.canvas ? (ctx.canvas.logicalWidth || ctx.canvas.width) : 1280;
    var canvasHeight = ctx && ctx.canvas ? (ctx.canvas.logicalHeight || ctx.canvas.height) : 720;

    if (!entry || !entry.loaded || entry.failed) {
      return false;
    }

    if (!portraitRenderStats[path]) {
      portraitRenderStats[path] = {
        attempts: 0,
        draws: 0
      };
    }
    portraitRenderStats[path].attempts += 1;

    ctx.save();
    ctx.save();
    ctx.translate(x, y);
    drawSmoke(
      ctx,
      width,
      height,
      2007 + width + height,
      "rgba(88, 66, 58, 1)",
      mode === "battlefield" ? 0.08 * (battlefieldDepth ? battlefieldDepth.smokeAlphaScale : 1) : 0.05,
      mode === "battlefield" ? 4 : 3
    );
    ctx.restore();

    if (mode !== "battlefield") {
      ctx.fillStyle = "#171210";
      ctx.fillRect(x, y, width, height);
      fillWithPattern(ctx, x, y, width, height, getPaperTexture(), 0.12);
      fillWithPattern(ctx, x, y, width, height, getRustTexture(), 0.05);

      gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, "rgba(255, 247, 232, 0.08)");
      gradient.addColorStop(0.55, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.34)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);

      gradient = ctx.createRadialGradient(
        x + width * 0.52,
        y + height * 0.34,
        Math.max(12, width * 0.04),
        x + width * 0.52,
        y + height * 0.44,
        Math.max(width, height) * 0.72
      );
      gradient.addColorStop(0, "rgba(231, 206, 170, 0.16)");
      gradient.addColorStop(0.42, "rgba(155, 90, 57, 0.08)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);

      ctx.fillStyle = "rgba(17, 12, 12, 0.22)";
      ctx.fillRect(x, y + height * 0.68, width, height * 0.18);
    } else {
      gradient = ctx.createRadialGradient(
        x + width * 0.52,
        y + height * 0.4,
        Math.max(14, width * 0.06),
        x + width * 0.52,
        y + height * 0.58,
        Math.max(width, height) * 0.78
      );
      gradient.addColorStop(0, "rgba(231, 206, 170, " + (0.2 * (battlefieldDepth ? battlefieldDepth.glowAlphaScale : 1)) + ")");
      gradient.addColorStop(0.36, "rgba(155, 90, 57, " + (0.12 * (battlefieldDepth ? battlefieldDepth.glowAlphaScale : 1)) + ")");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    }

    ctx.save();
    ctx.beginPath();
    if (mode === "battlefield") {
      ctx.rect(
        x - width * clipLeft,
        y - height * clipTop,
        width * (1 + clipLeft + clipRight),
        height * (1 + clipTop + clipBottom)
      );
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.clip();
    ctx.save();
    if (battlefieldDepth) {
      ctx.globalAlpha *= battlefieldDepth.drawAlpha;
    }
    drawPortraitCutout(ctx, entry.image, x, y, width, height, battlefieldFrame);
    ctx.restore();
    if (battlefieldDepth && (battlefieldDepth.hazeAlpha > 0 || battlefieldDepth.hazeWarmAlpha > 0)) {
      gradient = ctx.createLinearGradient(x, y - height * 0.04, x, y + height * 1.04);
      gradient.addColorStop(0, "rgba(18, 13, 13, " + battlefieldDepth.hazeAlpha + ")");
      gradient.addColorStop(0.58, "rgba(18, 13, 13, " + (battlefieldDepth.hazeAlpha * 0.35) + ")");
      gradient.addColorStop(1, "rgba(18, 13, 13, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - width * clipLeft, y - height * clipTop, width * (1 + clipLeft + clipRight), height * (1 + clipTop + clipBottom));

      gradient = ctx.createRadialGradient(
        x + width * 0.5,
        y + height * 0.42,
        Math.max(14, width * 0.08),
        x + width * 0.5,
        y + height * 0.46,
        Math.max(width, height) * 0.72
      );
      gradient.addColorStop(0, "rgba(201, 150, 108, " + battlefieldDepth.hazeWarmAlpha + ")");
      gradient.addColorStop(0.7, "rgba(98, 60, 43, " + (battlefieldDepth.hazeWarmAlpha * 0.34) + ")");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - width * clipLeft, y - height * clipTop, width * (1 + clipLeft + clipRight), height * (1 + clipTop + clipBottom));
    }
    drawPortraitLowerOcclusion(ctx, x, y, width, height, {
      mode: mode,
      centerX: battlefieldFrame && typeof battlefieldFrame.anchorX === "number" ? battlefieldFrame.anchorX : 0.5
    });
    if (mode === "battlefield") {
      drawBattlefieldThreatPoseAccent(ctx, enemy, x, y, width, height, battlefieldDepth);
      softenBattlefieldStageEdges(
        ctx,
        x - width * clipLeft,
        y - height * clipTop,
        width * (1 + clipLeft + clipRight),
        height * (1 + clipTop + clipBottom),
        {
          leftFade: width * 0.09,
          rightFade: width * 0.09,
          topFade: height * 0.025,
          bottomFade: height * 0.16,
          strength: 0.78
        }
      );
    }
    ctx.restore();
    portraitRenderStats[path].draws += 1;

    if (mode !== "battlefield" && enemy.kind !== "nemesis" && enemy.behavior !== "nemesis") {
      drawSlash(ctx, x + width * 0.12, y + height * 0.82, x + width * 0.9, y + height * 0.2, accent, 4);
    }

    if (enemy.kind === "boss" && mode !== "battlefield") {
      drawBulletHole(ctx, x + width - 18, y + 16, 5);
    }

    if (mode !== "battlefield") {
      ctx.strokeStyle = "rgba(76, 47, 39, 0.48)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);
    }
    ctx.restore();
    return true;
  }

  function drawPlayerPortrait(ctx, config) {
    var style = config.style || "basic";
    var path = getPlayerPortraitPath(style);
    var entry = getCachedImage(path);
    var presentation = config.presentation || "panel";
    var source = null;
    var x = config.x;
    var y = config.y;
    var width = config.width;
    var height = config.height;
    var accent = config.accent || "#b46e54";
    var gradient = null;
    var battlefieldOptions = presentation === "battlefield" ? (getPlayerPortraitBattlefieldOptions(style) || {}) : {};
    var canvasWidth = ctx && ctx.canvas ? (ctx.canvas.logicalWidth || ctx.canvas.width) : 1280;
    var canvasHeight = ctx && ctx.canvas ? (ctx.canvas.logicalHeight || ctx.canvas.height) : 720;

    if (!path || !entry || !entry.loaded || entry.failed) {
      return false;
    }

    source = entry.image;

    if (!portraitRenderStats[path]) {
      portraitRenderStats[path] = {
        attempts: 0,
        draws: 0
      };
    }
    portraitRenderStats[path].attempts += 1;
    ctx.save();
    gradient = ctx.createRadialGradient(
      x + width * 0.46,
      y + height * 0.32,
      Math.max(16, width * 0.06),
      x + width * 0.46,
      y + height * 0.56,
      Math.max(width, height) * 0.88
    );
    gradient.addColorStop(0, "rgba(242, 219, 187, 0.1)");
    gradient.addColorStop(0.4, "rgba(110, 78, 65, 0.05)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - width * 0.05, y - height * 0.02, width * 1.07, height * 1.04);
    ctx.clip();
    if (presentation === "battlefield") {
      var clipX = x - width * 0.05;
      var clipY = y - height * 0.02;
      var clipWidth = Math.ceil(width * 1.07);
      var clipHeight = Math.ceil(height * 1.04);
      var localX = x - clipX;
      var localY = y - clipY;
      var fadeStartY = clipHeight * 0.925;
      var tempCanvas = createCanvas(clipWidth, clipHeight);
      var tempCtx = tempCanvas.getContext("2d");
      var fade = null;

      drawPortraitCutout(tempCtx, source, localX, localY, width, height, {
        anchorX: 0.5,
        zoom: 0.96,
        offsetY: 30,
        flipX: !!battlefieldOptions.flipX
      });
      tempCtx.save();
      tempCtx.globalCompositeOperation = "destination-out";
      fade = tempCtx.createLinearGradient(0, fadeStartY, 0, clipHeight);
      fade.addColorStop(0, "rgba(0, 0, 0, 0)");
      fade.addColorStop(1, "rgba(0, 0, 0, 1)");
      tempCtx.fillStyle = fade;
      tempCtx.fillRect(0, fadeStartY, clipWidth, clipHeight - fadeStartY);
      tempCtx.restore();
      ctx.drawImage(tempCanvas, clipX, clipY);
      ctx.save();
      ctx.translate(x + width * 0.47, y + height * 0.97);
      ctx.scale(width * 0.2, height * 0.038);
      fade = ctx.createRadialGradient(0, 0, 0.18, 0, 0, 1);
      fade.addColorStop(0, "rgba(0, 0, 0, 0.18)");
      fade.addColorStop(0.55, "rgba(0, 0, 0, 0.08)");
      fade.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = fade;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      softenBattlefieldStageEdges(ctx, clipX, clipY, clipWidth, clipHeight, {
        leftFade: width * 0.08,
        rightFade: width * 0.06,
        topFade: height * 0.02,
        bottomFade: height * 0.14,
        strength: 0.74
      });
    } else {
      drawPortraitCutout(ctx, source, x, y, width, height, battlefieldOptions);
      drawPortraitLowerOcclusion(ctx, x, y, width, height, {
        mode: "panel",
        centerX: 0.46
      });
    }
    ctx.restore();
    ctx.restore();

    portraitRenderStats[path].draws += 1;
    return true;
  }

  function drawCardArt(ctx, config) {
    var x = config.x;
    var y = config.y;
    var width = config.width;
    var height = config.height;
    var artSpec = getCardArtEntry(config);
    var artPath = artSpec && artSpec.path ? artSpec.path : null;
    var artFocus = getCardArtFocus(config, artSpec);
    var entry = null;
    var gradient = null;

    if (!artPath) {
      return drawCardFallbackArt(ctx, config);
    }

    entry = getCachedImage(artPath);

    if (entry && entry.loaded && !entry.failed && entry.image && entry.image.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();
      ctx.fillStyle = "#161211";
      ctx.fillRect(x, y, width, height);
      drawImageCover(ctx, entry, x, y, width, height, {
        focusX: artFocus.x,
        focusY: artFocus.y
      });
      gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, "rgba(255, 247, 234, 0.08)");
      gradient.addColorStop(0.24, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.32)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
      gradient = ctx.createRadialGradient(x + width * 0.56, y + height * 0.42, Math.max(10, width * 0.06), x + width * 0.56, y + height * 0.52, Math.max(width, height) * 0.74);
      gradient.addColorStop(0, "rgba(236, 212, 184, 0.06)");
      gradient.addColorStop(0.56, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = "rgba(49, 38, 31, 0.58)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
      ctx.strokeStyle = "rgba(230, 217, 198, 0.06)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4.5, y + 4.5, width - 9, height - 9);
      ctx.restore();
      return true;
    }

    return drawCardFallbackArt(ctx, config);
  }

  function drawEnemyPortrait(ctx, config) {
    var enemy = config.enemy || {};
    var x = config.x;
    var y = config.y;
    var width = config.width;
    var height = config.height;
    var accent = getActAccent(enemy.templateId);
    var gradient = null;
    var presentation = config.presentation || "panel";
    var battlefieldDepth = presentation === "battlefield" ? getBattlefieldDepthTreatment(enemy) : null;
    var baseY = y + height * (presentation === "battlefield" ? 0.88 : 0.82);
    var scale = Math.min(width, height) * (presentation === "battlefield" ? 0.5 : 0.42);

    if (drawImagePortrait(ctx, enemy, x, y, width, height, accent, presentation)) {
      return;
    }

    ctx.save();
    if (presentation !== "battlefield") {
      ctx.fillStyle = "#d0bea1";
      ctx.fillRect(x, y, width, height);
      fillWithPattern(ctx, x, y, width, height, getPaperTexture(), 0.36);

      gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.14)");
      gradient.addColorStop(1, "rgba(59, 32, 27, 0.24)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);

      ctx.fillStyle = "rgba(69, 46, 39, 0.14)";
      ctx.fillRect(x, y + height * 0.68, width, height * 0.16);
    } else {
      gradient = ctx.createRadialGradient(
        x + width * 0.52,
        y + height * 0.44,
        Math.max(16, width * 0.06),
        x + width * 0.52,
        y + height * 0.6,
        Math.max(width, height) * 0.74
      );
      gradient.addColorStop(0, "rgba(239, 214, 176, " + (0.18 * (battlefieldDepth ? battlefieldDepth.glowAlphaScale : 1)) + ")");
      gradient.addColorStop(0.32, "rgba(159, 92, 68, " + (0.12 * (battlefieldDepth ? battlefieldDepth.glowAlphaScale : 1)) + ")");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - width * 0.08, y - height * 0.06, width * 1.16, height * 1.18);

    }

    drawSmoke(
      ctx,
      width,
      height,
      1979 + width + height,
      "rgba(73, 58, 54, 1)",
      presentation === "battlefield" ? 0.09 * (battlefieldDepth ? battlefieldDepth.smokeAlphaScale : 1) : 0.07,
      presentation === "battlefield" ? 5 : 4
    );
    ctx.save();
    ctx.beginPath();
    if (presentation === "battlefield") {
      ctx.rect(x - width * 0.08, y - height * 0.04, width * 1.12, height * 1.08);
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.clip();
    if (battlefieldDepth) {
      ctx.globalAlpha *= battlefieldDepth.drawAlpha;
    }
    drawFigure(ctx, x + width * 0.52, baseY, scale, enemy.behavior || "simple", accent);
    drawPortraitLowerOcclusion(ctx, x, y, width, height, {
      mode: presentation === "battlefield" ? "battlefield" : "panel",
      centerX: 0.52
    });
    ctx.restore();
    if (battlefieldDepth && (battlefieldDepth.hazeAlpha > 0 || battlefieldDepth.hazeWarmAlpha > 0)) {
      gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, "rgba(19, 14, 14, " + battlefieldDepth.hazeAlpha + ")");
      gradient.addColorStop(0.62, "rgba(19, 14, 14, " + (battlefieldDepth.hazeAlpha * 0.28) + ")");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - width * 0.06, y - height * 0.04, width * 1.12, height * 1.08);
    }

    if (presentation !== "battlefield") {
      drawSlash(ctx, x + width * 0.12, y + height * 0.8, x + width * 0.9, y + height * 0.18, accent, 4);
    }

    if (enemy.kind === "boss" && presentation !== "battlefield") {
      drawBulletHole(ctx, x + width - 18, y + 16, 5);
    }

    if (presentation !== "battlefield") {
      ctx.strokeStyle = "rgba(76, 47, 39, 0.48)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);
    }
    ctx.restore();
  }

  G.render.assets.drawBackdrop = drawBackdrop;
  G.render.assets.getRevision = function () { return assetRevision; };
  G.render.assets.beginDependencies = function(){var scope=new Map();dependencyScopes.push(scope);return scope;};
  G.render.assets.endDependencies = function(scope){if(dependencyScopes.pop()!==scope)throw Error('Unbalanced raster dependencies');return Array.from(scope.values());};
  // Keep scalar identity only: a cached small raster must not retain an evicted
  // full portrait through its dependency record and bypass the 24-image limit.
  G.render.assets.dependenciesCurrent = function(deps){return !deps||deps.every(function(d){var e=imageCache[d.path];return e&&e.generation===d.generation&&e.loaded===d.loaded&&e.failed===d.failed&&e.revision===d.revision;});};
  G.render.assets.inheritDependencies = function(deps){if(deps)dependencyScopes.forEach(function(scope){deps.forEach(function(d){scope.set(d.path,d);});});};
  G.render.assets.getDeferredCacheStats = function () {
    var paths=Object.keys(imageCache).filter(deferred);
    return {limit:24,entries:paths.length,loaded:paths.filter(function(p){return imageCache[p].loaded;}).length,evictions:deferredEvictions,paths:paths};
  };
  G.render.assets.drawPanelSurface = drawPanelSurface;
  G.render.assets.drawCombatBackdrop = drawCombatBackdrop;
  G.render.assets.drawCombatPanelSurface = drawCombatPanelSurface;
  G.render.assets.drawCombatSlipSurface = drawCombatSlipSurface;
  G.render.assets.drawCombatBarSurface = drawCombatBarSurface;
  G.render.assets.drawCombatStatusPaperSurface = drawCombatStatusPaperSurface;
  G.render.assets.drawCombatCardSurface = drawCombatCardSurface;
  G.render.assets.drawCombatIntentSeal = drawCombatIntentSeal;
  G.render.assets.drawCombatCardStamp = drawCombatCardStamp;
  G.render.assets.drawCombatEndTurnButton = drawCombatEndTurnButton;
  G.render.assets.drawCardArt = drawCardArt;
  G.render.assets.drawEnemyPortrait = drawEnemyPortrait;
  G.render.assets.drawPlayerPortrait = drawPlayerPortrait;
  G.render.assets.getImageEntry = getCachedImage;
  G.render.assets.getRelicPath = getRelicPath;
  G.render.assets.drawImageCover = drawImageCover;
  G.render.assets.drawSourceCover = drawSourceCover;
  G.render.assets.getCombatTexturePath = getCombatTexturePath;
  G.render.assets.getPortraitDebugState = getPortraitDebugState;
  preloadCardArtAssets();
  // Legacy review pages still preload their original art. The woodcut runtime
  // loads only the current presentation assets; archived looks remain lazy.
  if (document.documentElement.dataset.theme !== 'woodcut') {
    preloadUiTextures();
    preloadPortraitAssets();
  }
})();

