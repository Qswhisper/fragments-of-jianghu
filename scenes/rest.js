window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  var shared = G.scenes.restShared;
  var cloneState = shared.cloneState;
  var getCurrentNodeId = shared.getCurrentNodeId;
  var ensureDeck = shared.ensureDeck;
  var getLayout = shared.getLayout;
  var isInside = shared.isInside;
  var getBodyFontFamily = shared.getBodyFontFamily;
  var getTitleFontFamily = shared.getTitleFontFamily;
  var getReadableFontFamily = shared.getReadableFontFamily;
  var drawClippedTexture = shared.drawClippedTexture;
  var buildUpgradeStacks = shared.buildUpgradeStacks;
  var getUpgradeStackBoxes = shared.getUpgradeStackBoxes;
  var getUpgradableCount = shared.getUpgradableCount;

  var REST_BACKGROUND_TEXTURE_PATH = shared.REST_BACKGROUND_TEXTURE_PATH;
  var REST_BACKGROUND_TEXTURE_ASPECT = shared.REST_BACKGROUND_TEXTURE_ASPECT;
  var REST_SIDEBAR_SHELL_TEXTURE_PATH = shared.REST_SIDEBAR_SHELL_TEXTURE_PATH;
  var REST_STAGE_SHELL_TEXTURE_PATH = shared.REST_STAGE_SHELL_TEXTURE_PATH;
  var REST_CHOICE_STAGE_TEXTURE_PATH = shared.REST_CHOICE_STAGE_TEXTURE_PATH;

  function prepareState(state) {
    var nextState = cloneState(state);
    var healMultiplier = G.relicRuntime && typeof G.relicRuntime.getRestHealMultiplier === "function" ?
      G.relicRuntime.getRestHealMultiplier(nextState) :
      1;
    var healAmount = Math.floor(nextState.player.maxHp * 0.3 * healMultiplier);
    var deckNames = ensureDeck(nextState);
    var doubled = healMultiplier > 1;
    var nodeId = getCurrentNodeId(nextState);
    var defaultNote = doubled ?
      "破庙风冷，半壶烧刀子酒把药性顶了上来。你可以恢复 60% 气血，或再练 1 张未升级招式。" :
      "破庙风冷。你可以用烈酒绷带恢复 30% 气血，或再练 1 张未升级招式。";
    var existingRest = nextState.rest &&
      nextState.rest.nodeId === nodeId &&
      Array.isArray(nextState.rest.deckEntries) ?
      nextState.rest :
      null;

    nextState.player.masterDeckNames = deckNames.slice();
    nextState.player.deckSize = deckNames.length;
    nextState.rest = {
      nodeId: nodeId,
      mode: existingRest && existingRest.mode ? existingRest.mode : "choice",
      title: "破庙苟活",
      note: existingRest && existingRest.note ? existingRest.note : defaultNote,
      healAmount: healAmount,
      deckEntries: G.cards.buildDeckEntries(deckNames)
    };
    nextState.scene = "rest";
    return nextState;
  }

  function ensureRestState(state) {
    if (
      state.rest &&
      state.rest.nodeId === getCurrentNodeId(state) &&
      Array.isArray(state.rest.deckEntries)
    ) {
      return state;
    }

    return prepareState(state);
  }

  function returnToMap(state, note) {
    var nextState = cloneState(state);
    nextState.map = nextState.map || {};
    nextState.map.note = note;
    nextState.map.lastRestAction = note;
    nextState.scene = "map";
    if (G.scenes.map && typeof G.scenes.map.prepareState === "function") {
      nextState = G.scenes.map.prepareState(nextState);
    }
    return nextState;
  }

  function chooseHeal(state) {
    var healed = G.player.heal(state, state.rest.healAmount);
    var actualHeal = healed.player.hp - state.player.hp;
    return returnToMap(healed, "你在破庙裹好伤口，恢复了 " + actualHeal + " 点气血。");
  }

  function enterUpgradeMode(state) {
    var nextState = cloneState(state);
    var hasUpgradable = nextState.rest.deckEntries.some(function (entry) {
      return entry.canUpgrade;
    });

    if (!hasUpgradable) {
      nextState.rest.note = "招式已无可精进，今夜只能靠烈酒裹伤。";
      return nextState;
    }

    nextState.rest.mode = "upgrade";
    nextState.rest.note = "挑 1 式未升级招式，再练一遍。同名多张时，只先练其中 1 张。";
    return nextState;
  }

  function chooseUpgrade(state, deckIndex) {
    var nextState = cloneState(state);
    var upgraded = G.cards.upgradeDeckCardAt(nextState.player.masterDeckNames, deckIndex);

    if (!upgraded.changed) {
      nextState.rest.note = "这张牌已经精进过，换一张未升级的招式。";
      return nextState;
    }

    nextState.player.masterDeckNames = upgraded.deckNames;
    nextState.player.deckSize = upgraded.deckNames.length;
    return returnToMap(nextState, "你在残灯下再练一式，【" + upgraded.upgradedName + "】更见火候。");
  }

  function processClicks(state) {
    var nextState = state;
    var layout = getLayout();
    var clicks = G.main && typeof G.main.consumeClicks === "function" ? G.main.consumeClicks() : [];
    var boxes = [];
    var click = null;
    var i = 0;

    if (clicks.length === 0) {
      return state;
    }

    while (clicks.length > 0) {
      click = clicks.shift();

      if (nextState.rest.mode === "choice") {
        if (isInside(click, layout.heal)) {
          nextState = chooseHeal(nextState);
        } else if (isInside(click, layout.upgrade)) {
          nextState = enterUpgradeMode(nextState);
        }
      } else if (nextState.rest.mode === "upgrade") {
        boxes = getUpgradeStackBoxes(buildUpgradeStacks(nextState.rest.deckEntries), layout);
        if (isInside(click, layout.back)) {
          nextState.rest.mode = "choice";
          nextState.rest.note = nextState.rest.healAmount > Math.floor(nextState.player.maxHp * 0.3) ?
            "破庙风冷，半壶烧刀子酒把药性顶了上来。你可以恢复 60% 气血，或再练 1 张未升级招式。" :
            "破庙风冷。你可以用烈酒绷带恢复 30% 气血，或再练 1 张未升级招式。";
        } else {
          for (i = 0; i < boxes.length; i += 1) {
            if (isInside(click, boxes[i])) {
              nextState = chooseUpgrade(nextState, boxes[i].deckIndex);
              break;
            }
          }
        }
      }
    }

    return nextState;
  }

  function drawBackground(ctx) {
    var gradient = null;
    var i = 0;
    var x = 0;
    var width = 0;
    var height = 0;
    var drewTexture = false;
    var targetWidth = 0;
    var targetHeight = 0;
    var targetX = 0;
    var targetY = 0;

    G.render.canvasUtils.clear(ctx, "#120d0c");

    gradient = ctx.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, "#1f1714");
    gradient.addColorStop(0.42, "#17110f");
    gradient.addColorStop(1, "#0f0b0a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);

    if (G.render.assets && typeof G.render.assets.drawImageCover === "function") {
      if ((1280 / 720) > REST_BACKGROUND_TEXTURE_ASPECT) {
        targetHeight = 720;
        targetWidth = targetHeight * REST_BACKGROUND_TEXTURE_ASPECT;
      } else {
        targetWidth = 1280;
        targetHeight = targetWidth / REST_BACKGROUND_TEXTURE_ASPECT;
      }
      targetX = Math.round((1280 - targetWidth) / 2);
      targetY = Math.round((720 - targetHeight) / 2);
      drewTexture = G.render.assets.drawImageCover(ctx, REST_BACKGROUND_TEXTURE_PATH, targetX, targetY, targetWidth, targetHeight, {
        focusX: 0.5,
        focusY: 0.5
      });
    }

    if (drewTexture) {
      ctx.save();
      gradient = ctx.createLinearGradient(0, 0, 0, 720);
      gradient.addColorStop(0, "rgba(8, 7, 7, 0.38)");
      gradient.addColorStop(0.36, "rgba(22, 14, 10, 0.16)");
      gradient.addColorStop(1, "rgba(8, 6, 6, 0.46)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1280, 720);

      gradient = ctx.createRadialGradient(640, 356, 0, 640, 356, 560);
      gradient.addColorStop(0, "rgba(196, 142, 78, 0.03)");
      gradient.addColorStop(0.46, "rgba(196, 142, 78, 0.01)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.22)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1280, 720);

      gradient = ctx.createRadialGradient(640, 360, 140, 640, 360, 610);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(0.68, "rgba(0, 0, 0, 0.04)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.16)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
    }

    function drawGlow(cx, cy, radius, color, alpha) {
      var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      glow.addColorStop(0, color.replace("__ALPHA__", String(alpha)));
      glow.addColorStop(0.36, color.replace("__ALPHA__", String(alpha * 0.42)));
      glow.addColorStop(1, color.replace("__ALPHA__", "0"));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    drawGlow(292, 238, 210, "rgba(166, 96, 54, __ALPHA__)", drewTexture ? 0.1 : 0.22);
    drawGlow(1010, 246, 250, "rgba(112, 118, 124, __ALPHA__)", drewTexture ? 0.07 : 0.16);
    drawGlow(652, 152, 140, "rgba(218, 167, 98, __ALPHA__)", drewTexture ? 0.03 : 0.06);
    drawGlow(648, 628, 320, "rgba(68, 42, 26, __ALPHA__)", drewTexture ? 0.06 : 0.14);

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(250, 0);
    ctx.lineTo(166, 56);
    ctx.lineTo(0, 84);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(1280, 0);
    ctx.lineTo(1032, 0);
    ctx.lineTo(1102, 62);
    ctx.lineTo(1280, 94);
    ctx.closePath();
    ctx.fill();

    gradient = ctx.createLinearGradient(0, 648, 0, 720);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 648, 1280, 72);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 226, 192, 0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(92, 150);
    ctx.lineTo(318, 106);
    ctx.moveTo(960, 128);
    ctx.lineTo(1210, 72);
    ctx.moveTo(242, 594);
    ctx.lineTo(432, 654);
    ctx.stroke();
    ctx.restore();
  }

  function drawHeader(ctx, state, layout) {
    var header = layout.header;
    var modeLabel = state.rest.mode === "choice" ? "歇脚一回" : "挑一式精进";

    G.render.ui.drawPanel(ctx, header.x, header.y, header.width, header.height, {
      fill: "rgba(15, 14, 14, 0.9)",
      stroke: "rgba(149, 122, 88, 0.22)",
      surface: "dossier-dark",
      lineWidth: 2,
      holes: false
    });

    ctx.save();
    ctx.fillStyle = "rgba(155, 74, 58, 0.82)";
    ctx.fillRect(header.x + 28, header.y + 17, 2, header.height - 34);
    ctx.restore();

    G.render.ui.drawLabel(ctx, state.rest.title, header.x + 48, header.y + 29, {
      size: 30,
      weight: "700",
      color: "#f0e4d0",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
    G.render.ui.drawLabel(ctx, "庙里只剩半壶烈酒与一盏残灯。", header.x + 50, header.y + 54, {
      size: 13,
      color: "rgba(212, 192, 166, 0.78)",
      shadow: false,
      fontFamily: getBodyFontFamily()
    });

    G.render.ui.drawPanel(ctx, header.x + header.width - 150, header.y + 14, 118, 42, {
      fill: "rgba(58, 34, 28, 0.92)",
      stroke: "rgba(171, 139, 96, 0.24)",
      surface: "wood-button",
      lineWidth: 1.5,
      holes: false
    });
    G.render.ui.drawLabel(ctx, modeLabel, header.x + header.width - 91, header.y + 35, {
      size: 15,
      align: "center",
      color: "#ead9c2",
      weight: "700",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
  }

  function drawSidebarRow(ctx, box, topY, label, value, options) {
    var opts = options || {};
    var centerX = box.x + box.width / 2;
    var valueSize = opts.valueSize || 38;

    G.render.ui.drawLabel(ctx, label, centerX, topY, {
      size: opts.labelSize || 18,
      align: "center",
      color: opts.labelColor || "#7f6951",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });

    G.render.ui.drawLabel(ctx, value, centerX, topY + 38, {
      size: valueSize,
      align: "center",
      color: opts.valueColor || "#2a2018",
      weight: "700",
      shadow: false,
      fontFamily: opts.valueFontFamily || getReadableFontFamily()
    });

    if (opts.subvalue) {
      G.render.ui.drawLabel(ctx, opts.subvalue, centerX, topY + 70, {
        size: 14,
        align: "center",
        color: opts.subvalueColor || "#9a8466",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    }
  }

  function drawSidebar(ctx, state, layout) {
    var box = layout.sidebar;
    var dividerX = box.x + 28;
    var dividerWidth = box.width - 56;
    var usedShell = false;
    var topFade = null;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(box.x + 10, box.y + 10, box.width - 4, box.height - 4);
    ctx.restore();

    usedShell = drawClippedTexture(
      ctx,
      REST_SIDEBAR_SHELL_TEXTURE_PATH,
      box.x,
      box.y,
      box.width,
      box.height,
      {
        focusX: 0.5,
        focusY: 0.5,
        alpha: 0.98
      }
    );

    if (!usedShell) {
      G.render.ui.drawPanel(ctx, box.x, box.y, box.width, box.height, {
        fill: "rgba(229, 214, 188, 0.96)",
        stroke: "rgba(108, 81, 52, 0.38)",
        surface: "dossier-paper",
        lineWidth: 2,
        holes: false
      });
    }

    ctx.save();
    if (usedShell) {
      topFade = ctx.createLinearGradient(box.x, box.y + 12, box.x, box.y + 108);
      topFade.addColorStop(0, "rgba(12, 10, 9, 0.42)");
      topFade.addColorStop(0.72, "rgba(12, 10, 9, 0.18)");
      topFade.addColorStop(1, "rgba(12, 10, 9, 0)");
      ctx.fillStyle = topFade;
      ctx.fillRect(box.x + 18, box.y + 10, box.width - 36, 112);
      ctx.fillStyle = "rgba(255, 245, 228, 0.11)";
      ctx.fillRect(box.x + 28, box.y + 96, box.width - 56, box.height - 128);
    } else {
      ctx.fillStyle = "rgba(255, 245, 228, 0.08)";
      ctx.fillRect(box.x + 22, box.y + 22, box.width - 44, box.height - 44);
    }
    ctx.restore();

    drawSidebarRow(ctx, box, box.y + 116, "当前气血", state.player.hp + " / " + state.player.maxHp, {
      valueColor: "#5d3f35"
    });

    ctx.save();
    ctx.strokeStyle = "rgba(146, 120, 88, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dividerX, box.y + 208);
    ctx.lineTo(dividerX + dividerWidth, box.y + 208);
    ctx.moveTo(dividerX, box.y + 344);
    ctx.lineTo(dividerX + dividerWidth, box.y + 344);
    ctx.stroke();
    ctx.restore();

    drawSidebarRow(ctx, box, box.y + 250, "行囊大洋", String(state.player.gold), {
      valueColor: "#5a4526"
    });

    drawSidebarRow(ctx, box, box.y + 384, "武学秘籍", String(state.player.masterDeckNames.length), {
      valueColor: "#2d2118"
    });

    ctx.save();
    topFade = ctx.createLinearGradient(box.x, box.y + box.height - 52, box.x, box.y + box.height - 12);
    topFade.addColorStop(0, "rgba(244, 232, 210, 0.18)");
    topFade.addColorStop(0.55, "rgba(244, 232, 210, 0.1)");
    topFade.addColorStop(1, "rgba(244, 232, 210, 0)");
    ctx.fillStyle = topFade;
    ctx.fillRect(box.x + 36, box.y + box.height - 52, box.width - 72, 40);
    ctx.restore();
  }

  function drawStageFrame(ctx, box) {
    var calmField = null;
    var usedShell = false;
    var centerGlow = null;
    var topShade = null;
    var topBand = null;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(box.x + 10, box.y + 10, box.width - 2, box.height - 2);
    ctx.restore();

    usedShell = drawClippedTexture(
      ctx,
      REST_STAGE_SHELL_TEXTURE_PATH,
      box.x,
      box.y,
      box.width,
      box.height,
      {
        focusX: 0.5,
        focusY: 0.42,
        alpha: 0.98
      }
    );

    if (!usedShell) {
      G.render.ui.drawPanel(ctx, box.x, box.y, box.width, box.height, {
        fill: "rgba(17, 15, 14, 0.9)",
        stroke: "rgba(129, 101, 74, 0.24)",
        surface: "dossier-dark",
        lineWidth: 2,
        holes: false
      });
    }

    ctx.save();
    topShade = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.height);
    topShade.addColorStop(0, "rgba(10, 9, 8, 0.14)");
    topShade.addColorStop(0.22, "rgba(18, 15, 12, 0.04)");
    topShade.addColorStop(0.76, "rgba(15, 12, 10, 0.08)");
    topShade.addColorStop(1, "rgba(9, 8, 7, 0.16)");
    ctx.fillStyle = topShade;
    ctx.fillRect(box.x, box.y, box.width, box.height);

    centerGlow = ctx.createRadialGradient(
      box.x + box.width / 2,
      box.y + box.height * 0.46,
      0,
      box.x + box.width / 2,
      box.y + box.height * 0.46,
      box.width * 0.42
    );
    centerGlow.addColorStop(0, "rgba(223, 190, 143, 0.07)");
    centerGlow.addColorStop(0.58, "rgba(168, 121, 71, 0.02)");
    centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = centerGlow;
    ctx.fillRect(box.x, box.y, box.width, box.height);

    topBand = ctx.createLinearGradient(box.x, box.y + 14, box.x, box.y + 64);
    topBand.addColorStop(0, usedShell ? "rgba(16, 13, 11, 0.18)" : "rgba(16, 13, 11, 0.1)");
    topBand.addColorStop(1, "rgba(16, 13, 11, 0)");
    ctx.fillStyle = topBand;
    ctx.fillRect(box.x + 16, box.y + 14, box.width - 32, 54);

    calmField = ctx.createLinearGradient(box.x, box.y + 56, box.x, box.y + box.height - 34);
    calmField.addColorStop(0, "rgba(15, 12, 10, 0.08)");
    calmField.addColorStop(0.4, "rgba(23, 18, 14, 0.12)");
    calmField.addColorStop(1, "rgba(12, 10, 9, 0.1)");
    ctx.fillStyle = calmField;
    ctx.fillRect(box.x + 28, box.y + 58, box.width - 56, box.height - 96);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = usedShell ? "rgba(232, 209, 176, 0.12)" : "rgba(232, 209, 176, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x + 14.5, box.y + 14.5, box.width - 29, box.height - 29);
    ctx.strokeRect(box.x + 22.5, box.y + 22.5, box.width - 45, box.height - 45);
    ctx.restore();

    ctx.save();
    var innerGlow = ctx.createRadialGradient(
      box.x + box.width / 2,
      box.y + box.height * 0.42,
      0,
      box.x + box.width / 2,
      box.y + box.height * 0.42,
      box.width * 0.44
    );
    innerGlow.addColorStop(0, "rgba(167, 118, 62, 0.05)");
    innerGlow.addColorStop(1, "rgba(167, 118, 62, 0)");
    ctx.fillStyle = innerGlow;
    ctx.fillRect(box.x, box.y, box.width, box.height);
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
      size: palette.size || 15,
      align: "center",
      color: palette.color || "#ecdcc7",
      weight: "700",
      shadow: false,
      fontFamily: palette.fontFamily || getReadableFontFamily()
    });
  }

  function drawChoiceStageScene(ctx, box) {
    var imageBox = {
      x: box.x + 24,
      y: box.y + 26,
      width: box.width - 48,
      height: box.height - 62
    };
    var usedTexture = false;
    var wash = null;
    var centerHaze = null;

    usedTexture = drawClippedTexture(
      ctx,
      REST_CHOICE_STAGE_TEXTURE_PATH,
      imageBox.x,
      imageBox.y,
      imageBox.width,
      imageBox.height,
      {
        focusX: 0.5,
        focusY: 0.52,
        alpha: 1
      }
    );

    ctx.save();
    wash = ctx.createLinearGradient(imageBox.x, imageBox.y, imageBox.x, imageBox.y + imageBox.height);
    wash.addColorStop(0, "rgba(8, 7, 7, 0.08)");
    wash.addColorStop(0.34, "rgba(19, 15, 12, 0.02)");
    wash.addColorStop(0.78, "rgba(9, 8, 8, 0.04)");
    wash.addColorStop(1, "rgba(0, 0, 0, 0.12)");
    ctx.fillStyle = wash;
    ctx.fillRect(imageBox.x, imageBox.y, imageBox.width, imageBox.height);

    centerHaze = ctx.createRadialGradient(
      box.x + box.width / 2,
      box.y + box.height * 0.38,
      0,
      box.x + box.width / 2,
      box.y + box.height * 0.38,
      box.width * 0.34
    );
    centerHaze.addColorStop(0, "rgba(20, 17, 14, 0.08)");
    centerHaze.addColorStop(1, "rgba(20, 17, 14, 0)");
    ctx.fillStyle = centerHaze;
    ctx.fillRect(imageBox.x, imageBox.y, imageBox.width, imageBox.height);
    ctx.restore();

    if (!usedTexture) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 230, 193, 0.05)";
      ctx.fillRect(box.x + 54, box.y + 248, 258, 112);
      ctx.fillStyle = "rgba(214, 225, 235, 0.04)";
      ctx.fillRect(box.x + box.width - 312, box.y + 248, 258, 112);
      ctx.restore();
    }
  }

  function drawChoiceCallout(ctx, box, config) {
    var centerX = box.x + box.width / 2;
    var labelY = box.y + 140;
    var titleY = box.y + 166;
    var primaryY = box.y + 206;
    var secondaryY = box.y + 238;
    var accentGlow = null;
    var textHaze = null;
    var accentX = centerX + (config.accentShiftX || 0);
    var badgeTextX = centerX + 72;

    ctx.save();
    accentGlow = ctx.createRadialGradient(accentX, primaryY - 26, 0, accentX, primaryY - 26, box.width * 0.42);
    accentGlow.addColorStop(0, config.glowColor || "rgba(166, 120, 76, 0.14)");
    accentGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = accentGlow;
    ctx.fillRect(box.x + 8, box.y + 56, box.width - 16, 188);

    textHaze = ctx.createRadialGradient(centerX, primaryY - 6, 0, centerX, primaryY - 6, box.width * 0.36);
    textHaze.addColorStop(0, config.textHazeCenter || "rgba(8, 8, 8, 0.24)");
    textHaze.addColorStop(0.68, config.textHazeEdge || "rgba(8, 8, 8, 0.08)");
    textHaze.addColorStop(1, "rgba(8, 8, 8, 0)");
    ctx.fillStyle = textHaze;
    ctx.fillRect(box.x + 24, box.y + 82, box.width - 48, 144);

    ctx.strokeStyle = config.lineColor || "rgba(226, 208, 184, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 92, primaryY - 6.5);
    ctx.lineTo(centerX + 92, primaryY - 6.5);
    ctx.stroke();
    ctx.restore();

    if (config.chip) {
      G.render.ui.drawLabel(ctx, config.chip, centerX - 54, labelY, {
        size: 15,
        align: "center",
        color: config.labelColor || "#d4c1aa",
        weight: "700",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });

      ctx.save();
      ctx.strokeStyle = config.labelLineColor || "rgba(214, 195, 170, 0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 24, labelY + 0.5);
      ctx.lineTo(centerX + 30, labelY + 0.5);
      ctx.stroke();
      ctx.restore();
    }

    if (config.badge) {
      G.render.ui.drawLabel(ctx, config.badge, badgeTextX, labelY, {
        size: 13,
        align: "center",
        color: config.badgeColor || "#cda67d",
        weight: "700",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
    }

    G.render.ui.drawLabel(ctx, config.title, centerX, titleY, {
      size: 28,
      align: "center",
      color: config.titleColor || "#efe3d1",
      weight: "700",
      shadow: false,
      fontFamily: getTitleFontFamily()
    });
    G.render.ui.drawLabel(ctx, config.primary, centerX, primaryY, {
      size: config.primarySize || 36,
      align: "center",
      color: config.primaryColor || "#f2e2cb",
      weight: "800",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, config.secondary, centerX, secondaryY, {
      size: 15,
      align: "center",
      color: config.secondaryColor || "#d4c0a4",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
  }

  function renderChoice(ctx, state, layout) {
    var player = state.player;
    var upgradableCount = getUpgradableCount(state.rest.deckEntries);
    var healBoosted = state.rest.healAmount > Math.floor(player.maxHp * 0.3);
    var splitShade = null;
    var centerShade = null;
    var warmGlow = null;
    var coolGlow = null;

    drawStageFrame(ctx, layout.choiceStage);
    drawChoiceStageScene(ctx, layout.choiceStage);

    ctx.save();
    splitShade = ctx.createLinearGradient(layout.choiceStage.x + 32, layout.choiceStage.y + 156, layout.choiceStage.x + layout.choiceStage.width - 32, layout.choiceStage.y + 156);
    splitShade.addColorStop(0, "rgba(42, 22, 14, 0.04)");
    splitShade.addColorStop(0.44, "rgba(0, 0, 0, 0)");
    splitShade.addColorStop(0.56, "rgba(0, 0, 0, 0)");
    splitShade.addColorStop(1, "rgba(18, 24, 30, 0.04)");
    ctx.fillStyle = splitShade;
    ctx.fillRect(layout.choiceStage.x + 28, layout.choiceStage.y + 48, layout.choiceStage.width - 56, layout.choiceStage.height - 116);

    centerShade = ctx.createLinearGradient(layout.choiceStage.x, layout.choiceStage.y + 240, layout.choiceStage.x, layout.choiceStage.y + layout.choiceStage.height - 24);
    centerShade.addColorStop(0, "rgba(0, 0, 0, 0)");
    centerShade.addColorStop(0.24, "rgba(0, 0, 0, 0.04)");
    centerShade.addColorStop(1, "rgba(0, 0, 0, 0.1)");
    ctx.fillStyle = centerShade;
    ctx.fillRect(layout.choiceStage.x + 24, layout.choiceStage.y + 188, layout.choiceStage.width - 48, layout.choiceStage.height - 188);

    warmGlow = ctx.createRadialGradient(layout.heal.x + 118, layout.heal.y + 88, 0, layout.heal.x + 118, layout.heal.y + 88, 168);
    warmGlow.addColorStop(0, "rgba(201, 129, 72, 0.12)");
    warmGlow.addColorStop(1, "rgba(201, 129, 72, 0)");
    ctx.fillStyle = warmGlow;
    ctx.fillRect(layout.heal.x - 32, layout.heal.y - 16, layout.heal.width + 64, layout.heal.height + 64);

    coolGlow = ctx.createRadialGradient(layout.upgrade.x + layout.upgrade.width - 118, layout.upgrade.y + 88, 0, layout.upgrade.x + layout.upgrade.width - 118, layout.upgrade.y + 88, 172);
    coolGlow.addColorStop(0, "rgba(132, 148, 161, 0.12)");
    coolGlow.addColorStop(1, "rgba(132, 148, 161, 0)");
    ctx.fillStyle = coolGlow;
    ctx.fillRect(layout.upgrade.x - 32, layout.upgrade.y - 16, layout.upgrade.width + 64, layout.upgrade.height + 64);
    ctx.restore();

    drawChoiceCallout(ctx, layout.heal, {
      chip: "",
      title: "烈酒绷带",
      primary: "+" + state.rest.healAmount + " 气血",
      secondary: "先扎紧伤口，再撑过明日一战",
      badge: healBoosted ? "药性翻涌" : "",
      glowColor: "rgba(196, 133, 80, 0.16)",
      plateFill: "rgba(38, 21, 15, 0.44)",
      plateStroke: "rgba(214, 177, 141, 0.12)",
      plateSurface: "wood-button",
      chipFill: "rgba(112, 43, 33, 0.92)",
      chipStroke: "rgba(225, 189, 150, 0.22)",
      titleColor: "#f0dfca",
      primaryColor: "#f3d4b0",
      secondaryColor: "#d7c1a4",
      lineColor: "rgba(235, 208, 180, 0.12)"
    });

    drawChoiceCallout(ctx, layout.upgrade, {
      chip: "",
      title: "再练一式",
      primary: upgradableCount > 0 ? (upgradableCount + " 张可精进") : "今夜不可精进",
      secondary: upgradableCount > 0 ? "挑 1 张未升级招式，再练一遍" : "今夜已无可精进招式，只剩疗伤可做",
      glowColor: "rgba(138, 150, 162, 0.15)",
      plateFill: "rgba(16, 18, 21, 0.48)",
      plateStroke: "rgba(187, 199, 210, 0.11)",
      plateSurface: "ink-panel",
      chipFill: "rgba(71, 54, 42, 0.94)",
      chipStroke: "rgba(184, 163, 131, 0.18)",
      chipSurface: "wood-button",
      titleColor: "#ebeff2",
      primaryColor: upgradableCount > 0 ? "#dae0e4" : "#b4babf",
      secondaryColor: "#b8c2ca",
      lineColor: "rgba(220, 228, 236, 0.1)"
    });
  }

  function drawUpgradeCard(ctx, entry, box) {
    var available = entry.canUpgrade;
    var cardPayload = Object.assign({}, entry, {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      playable: available,
      alpha: available ? 1 : 0.72,
      layoutMode: "reward",
      artRole: "reward",
      disableBaseShadow: false,
      shadowBlur: available ? 7 : 4,
      shadowOffsetX: 2,
      shadowOffsetY: 4,
      glowColor: available ? "rgba(176, 128, 74, 0.16)" : "",
      glowBlur: 8,
      comboDiscounted: false,
      showFooterTokens: false
    });

    G.render.ui.drawCardSlot(ctx, cardPayload);

    if (!available) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(box.x + 8, box.y + box.height - 28, box.width - 16, 20);
      ctx.restore();
      G.render.ui.drawLabel(ctx, "已出锋", box.x + box.width - 18, box.y + box.height - 18, {
        size: 11,
        align: "right",
        color: "rgba(223, 211, 194, 0.88)",
        shadow: false,
        fontFamily: getReadableFontFamily()
      });
      return;
    }
  }

  function drawUpgradeStack(ctx, stackBox) {
    var depth = Math.min(2, Math.max(0, stackBox.count - 1));
    var stepX = 7;
    var stepY = 5;
    var layer = 0;

    for (layer = depth; layer >= 1; layer -= 1) {
      G.render.ui.drawPanel(ctx, stackBox.x + (layer * stepX), stackBox.y + (layer * stepY), stackBox.width, stackBox.height, {
        fill: "rgba(27, 22, 18, 0.54)",
        stroke: "rgba(166, 140, 112, 0.1)",
        surface: "dossier-dark",
        lineWidth: 1.2,
        holes: false
      });
    }

    drawUpgradeCard(ctx, stackBox.entry, stackBox);

    if (stackBox.count > 1) {
      drawChip(ctx, stackBox.x + stackBox.width - 58, stackBox.y + 14, 40, 20, "x" + stackBox.count, {
        fill: "rgba(52, 39, 29, 0.88)",
        stroke: "rgba(190, 167, 139, 0.16)",
        surface: "wood-button",
        size: 11,
        color: "#ecdfcd"
      });
    }
  }

  function renderDeckGrid(ctx, state, layout) {
    var box = layout.upgradeStage;
    var stacks = buildUpgradeStacks(state.rest.deckEntries);
    var boxes = getUpgradeStackBoxes(stacks, layout);

    drawStageFrame(ctx, box);

    ctx.save();
    ctx.fillStyle = "rgba(7, 6, 6, 0.22)";
    ctx.fillRect(box.x + 24, box.y + 58, box.width - 48, box.height - 108);

    boxes.forEach(function (stackBox) {
      var rowBandHeight = stackBox.height + 18;
      var bandY = stackBox.y - 10;
      var rowBand = ctx.createLinearGradient(box.x + 42, bandY, box.x + 42, bandY + rowBandHeight);
      rowBand.addColorStop(0, "rgba(255, 236, 208, 0.03)");
      rowBand.addColorStop(0.2, "rgba(25, 20, 17, 0.18)");
      rowBand.addColorStop(0.82, "rgba(16, 13, 11, 0.24)");
      rowBand.addColorStop(1, "rgba(255, 236, 208, 0.04)");
      ctx.fillStyle = rowBand;
      ctx.fillRect(box.x + 42, bandY, box.width - 84, rowBandHeight);
    });
    ctx.restore();

    boxes.forEach(function (stackBox) {
      drawUpgradeStack(ctx, stackBox);
    });

    G.render.ui.drawButton(ctx, {
      x: layout.back.x,
      y: layout.back.y,
      width: layout.back.width,
      height: layout.back.height,
      label: "先不练了",
      fill: "#6a4d3c",
      stroke: "#c2a27a",
      surface: "wood-button",
      size: 21,
      subtitle: "返回歇脚",
      subtitleSize: 10,
      subtitleColor: "#d5c3ab",
      subtitleFontFamily: getReadableFontFamily(),
      fontFamily: getTitleFontFamily()
    });
  }

  function drawFooter(ctx, state, layout) {
    var footer = state.rest.mode === "choice" ? {
      x: layout.choiceStage.x,
      y: layout.footer.y,
      width: layout.choiceStage.width,
      height: layout.footer.height
    } : layout.footer;

    G.render.ui.drawPanel(ctx, footer.x, footer.y, footer.width, footer.height, {
      fill: "rgba(10, 10, 10, 0.94)",
      stroke: "rgba(133, 109, 84, 0.2)",
      surface: "ink-panel",
      lineWidth: 2,
      holes: false
    });

    G.render.ui.drawLabel(ctx, state.rest.note, footer.x + footer.width / 2, footer.y + footer.height / 2, {
      size: 17,
      align: "center",
      color: "rgba(222, 203, 176, 0.9)",
      shadow: false,
      fontFamily: getReadableFontFamily()
    });
  }

  G.scenes.rest = {
    prepareState: prepareState,

    update: function (state) {
      return processClicks(ensureRestState(state));
    },

    render: function (state, ctx) {
      var safeState = ensureRestState(state);
      var layout = getLayout();

      drawBackground(ctx);
      drawHeader(ctx, safeState, layout);
      drawSidebar(ctx, safeState, layout);

      if (safeState.rest.mode === "choice") {
        renderChoice(ctx, safeState, layout);
      } else {
        renderDeckGrid(ctx, safeState, layout);
      }

      drawFooter(ctx, safeState, layout);
    }
  };
})();
