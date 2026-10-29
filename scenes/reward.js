window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  var GOLD_BY_NODE_TYPE = {
    street: 20,
    elite: 35,
    nemesis: 35,
    gate: 60
  };
  var REWARD_INTRO_MS = 760;
  var CARD_PHASE_INTRO_MS = 420;
  var REWARD_BACKGROUND_TEXTURE_PATH = "assets/ui/reward_workshop_desk_background_gpt15_16x9_01.png";
  var REWARD_DECREE_TEXTURE_PATH = "assets/ui/reward_imperial_decree_scroll_gpt4ovip_transparent_01.png";
  var REWARD_LEDGER_SCRAP_TEXTURE_PATH = "assets/ui/reward_summary_dark_scrap.svg";
  var REWARD_SUMMARY_PAPER_TEXTURE_PATH = "assets/ui/reward_torn_ledger_scrap.svg";
  var REWARD_NOTE_PAPER_TEXTURE_PATH = "assets/ui/report_writing_scrap.svg";
  var REWARD_DOSSIER_SHELL_TEXTURE_PATH = "assets/ui/reward_dossier_shell_gpt4ovip_02.png";
  var REWARD_STAGE_PLINTH_TEXTURE_PATH = "assets/ui/reward_stage_plinth_gpt4ovip_01.png";
  var REWARD_FOOTER_STRIP_TEXTURE_PATH = "assets/ui/reward_footer_strip_gpt4ovip_01.png";

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeOutCubic(value) {
    var t = clamp(value, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function isInside(point, box) {
    return point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height;
  }

  function buildWrappedLines(ctx, text, maxWidth, maxLines) {
    var chars = String(text || "").split("");
    var lines = [];
    var line = "";
    var i = 0;

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

    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, "…");
    }

    return lines;
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options) {
    var opts = options || {};
    var lines = null;
    var i = 0;
    ctx.save();
    ctx.fillStyle = opts.color || "#efe7d5";
    ctx.font = (opts.weight || "600") + " " + (opts.size || 18) + "px " +
      (opts.fontFamily || "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif");
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = "top";
    lines = buildWrappedLines(ctx, text, maxWidth, opts.maxLines);

    if (opts.shadow !== false) {
      ctx.shadowColor = opts.shadowColor || "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = typeof opts.shadowBlur === "number" ? opts.shadowBlur : 2;
      ctx.shadowOffsetX = typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 1;
      ctx.shadowOffsetY = typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 1;
    }

    for (i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }

    ctx.restore();
    return lines.length;
  }

  function getRewardBodyFontFamily() {
    if (G.render && G.render.ui && typeof G.render.ui.getBodyFontFamily === "function") {
      return G.render.ui.getBodyFontFamily();
    }

    return "\"KGame Song\", serif";
  }

  function getRewardTitleFontFamily() {
    if (G.render && G.render.ui && typeof G.render.ui.getTitleFontFamily === "function") {
      return G.render.ui.getTitleFontFamily();
    }

    return "\"KGame Ink\", \"KGame Song\", serif";
  }

  function getRewardReadableFontFamily() {
    if (G.render && G.render.ui && typeof G.render.ui.getReadableFontFamily === "function") {
      return G.render.ui.getReadableFontFamily();
    }

    return "\"KGame Sans\", sans-serif";
  }

  function measureRewardTextWidth(ctx, text, size, weight, fontFamily) {
    var measuredWidth = 0;

    ctx.save();
    ctx.font = (weight || "600") + " " + (size || 18) + "px " + (fontFamily || getRewardBodyFontFamily());
    measuredWidth = ctx.measureText(String(text || "")).width;
    ctx.restore();
    return measuredWidth;
  }

  function drawTrackedLabel(ctx, text, x, y, tracking, options) {
    var opts = options || {};
    var chars = String(text || "").split("");
    var track = typeof tracking === "number" ? tracking : 0;
    var totalWidth = 0;
    var startX = x;
    var i = 0;

    if (chars.length === 0) {
      return;
    }

    ctx.save();
    ctx.fillStyle = opts.color || "#efe7d5";
    ctx.font = (opts.weight || "600") + " " + (opts.size || 18) + "px " +
      (opts.fontFamily || getRewardBodyFontFamily());
    ctx.textBaseline = opts.baseline || "middle";

    for (i = 0; i < chars.length; i += 1) {
      totalWidth += ctx.measureText(chars[i]).width;
      if (i < chars.length - 1) {
        totalWidth += track;
      }
    }

    if ((opts.align || "left") === "center") {
      startX = x - totalWidth / 2;
    } else if ((opts.align || "left") === "right") {
      startX = x - totalWidth;
    }

    if (opts.shadow !== false) {
      ctx.shadowColor = opts.shadowColor || "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = typeof opts.shadowBlur === "number" ? opts.shadowBlur : 2;
      ctx.shadowOffsetX = typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 1;
      ctx.shadowOffsetY = typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 1;
    }

    if (opts.strokeColor) {
      ctx.strokeStyle = opts.strokeColor;
      ctx.lineWidth = typeof opts.strokeWidth === "number" ? opts.strokeWidth : 2;
      ctx.lineJoin = "round";
    }

    for (i = 0; i < chars.length; i += 1) {
      if (opts.strokeColor) {
        ctx.strokeText(chars[i], startX, y);
      }
      ctx.fillText(chars[i], startX, y);
      startX += ctx.measureText(chars[i]).width + track;
    }

    ctx.restore();
  }

  function drawCenteredFooterCopy(ctx, footerCopy, x, y, maxWidth) {
    var fontFamily = footerCopy.fontFamily || getRewardBodyFontFamily();
    var fontWeight = footerCopy.weight || "600";
    var fontSize = footerCopy.size || 14;
    var lineHeight = footerCopy.lineHeight || Math.round(fontSize * 1.45);
    var maxLines = footerCopy.maxLines || 2;
    var lines = null;
    var startY = y;

    ctx.save();
    ctx.font = fontWeight + " " + fontSize + "px " + fontFamily;
    lines = buildWrappedLines(ctx, footerCopy.text, maxWidth, maxLines);
    ctx.restore();

    if (footerCopy.tracking && lines.length === 1) {
      drawTrackedLabel(ctx, lines[0], x, y, footerCopy.tracking, {
        size: fontSize,
        weight: fontWeight,
        align: "center",
        baseline: "middle",
        color: footerCopy.color,
        shadowColor: footerCopy.shadowColor,
        shadowBlur: footerCopy.shadowBlur,
        shadowOffsetX: footerCopy.shadowOffsetX,
        shadowOffsetY: footerCopy.shadowOffsetY,
        shadow: footerCopy.shadow,
        fontFamily: fontFamily
      });
      return;
    }

    startY = y - (lines.length * lineHeight) / 2 + 1;
    drawWrappedText(ctx, footerCopy.text, x, startY, maxWidth, lineHeight, {
      size: fontSize,
      weight: fontWeight,
      color: footerCopy.color,
      align: "center",
      shadowColor: footerCopy.shadowColor,
      shadowBlur: footerCopy.shadowBlur,
      shadowOffsetX: footerCopy.shadowOffsetX,
      shadowOffsetY: footerCopy.shadowOffsetY,
      shadow: footerCopy.shadow,
      maxLines: maxLines,
      fontFamily: fontFamily
    });
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

  function fillRoundedPanel(ctx, x, y, width, height, radius, fillStyle, alpha) {
    ctx.save();
    if (typeof alpha === "number") {
      ctx.globalAlpha = alpha;
    }
    traceRoundedPanelPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
  }

  function drawDarkInfoPanel(ctx, x, y, width, height, radius) {
    var textured = false;
    var texturePath = height > width * 1.2 ? REWARD_SUMMARY_PAPER_TEXTURE_PATH : REWARD_NOTE_PAPER_TEXTURE_PATH;

    ctx.save();
    ctx.fillStyle = "rgba(233, 220, 192, 0.92)";
    ctx.fillRect(x, y, width, height);
    textured = drawClippedTexture(ctx, texturePath, x, y, width, height, {
      focusX: 0.5,
      focusY: 0.5,
      alpha: 0.98
    });
    if (!textured) {
      ctx.fillStyle = "rgba(232, 217, 189, 0.96)";
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = "rgba(104, 76, 43, 0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    }
    ctx.restore();
  }

  function drawRewardDecreeSurface(ctx, x, y, width, height, options) {
    var opts = options || {};
    var usedTexture = false;
    var gradient = null;

    ctx.save();
    ctx.fillStyle = opts.baseFill || "rgba(231, 214, 186, 0.94)";
    ctx.fillRect(x, y, width, height);
    ctx.restore();
    usedTexture = drawClippedTexture(ctx, REWARD_DECREE_TEXTURE_PATH, x, y, width, height, {
      focusX: typeof opts.focusX === "number" ? opts.focusX : 0.5,
      focusY: typeof opts.focusY === "number" ? opts.focusY : 0.5,
      alpha: typeof opts.textureAlpha === "number" ? opts.textureAlpha : 0.96,
      compositeMode: opts.textureCompositeMode || "source-over"
    });

    if (!usedTexture) {
      ctx.save();
      ctx.fillStyle = opts.baseFill || "rgba(232, 214, 186, 0.96)";
      ctx.fillRect(x, y, width, height);
      ctx.restore();
      return;
    }

    if (opts.paperWash !== false) {
      ctx.save();
      ctx.globalAlpha = typeof opts.paperWashAlpha === "number" ? opts.paperWashAlpha : 0.18;
      ctx.fillStyle = opts.paperWash || "#ead8bb";
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    }

    if (opts.topShade || opts.bottomShade) {
      ctx.save();
      gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, opts.topShade || "rgba(84, 48, 34, 0.03)");
      gradient.addColorStop(0.5, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, opts.bottomShade || "rgba(84, 48, 34, 0.12)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    }
  }

  function drawRewardLedgerScrapSurface(ctx, x, y, width, height, options) {
    var opts = options || {};
    var usedTexture = false;

    usedTexture = drawClippedTexture(ctx, REWARD_LEDGER_SCRAP_TEXTURE_PATH, x, y, width, height, {
      focusX: typeof opts.focusX === "number" ? opts.focusX : 0.5,
      focusY: typeof opts.focusY === "number" ? opts.focusY : 0.5,
      alpha: typeof opts.textureAlpha === "number" ? opts.textureAlpha : 1,
      compositeMode: opts.textureCompositeMode || "source-over"
    });

    if (!usedTexture) {
      ctx.save();
      ctx.fillStyle = opts.baseFill || "rgba(18, 14, 14, 0.92)";
      ctx.fillRect(x, y, width, height);
      ctx.restore();
      return;
    }

    if (opts.liftAlpha) {
      ctx.save();
      ctx.globalAlpha = typeof opts.liftAlpha === "number" ? opts.liftAlpha : 0.08;
      ctx.fillStyle = opts.liftColor || "#8c7158";
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    }
  }

  function drawRewardPaperBoardSurface(ctx, x, y, width, height, options) {
    var opts = options || {};
    var radius = Math.max(10, Math.min(18, Math.min(width, height) * 0.04));
    var textured = false;
    var gradient = null;

    ctx.save();
    traceRoundedPanelPath(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = opts.baseFill || "rgba(234, 220, 192, 0.98)";
    ctx.fillRect(x, y, width, height);
    textured = drawClippedTexture(ctx, REWARD_NOTE_PAPER_TEXTURE_PATH, x, y, width, height, {
      focusX: 0.5,
      focusY: 0.5,
      alpha: typeof opts.textureAlpha === "number" ? opts.textureAlpha : 0.98
    });
    if (textured) {
      ctx.globalAlpha = typeof opts.liftAlpha === "number" ? opts.liftAlpha : 0.08;
      ctx.fillStyle = opts.liftColor || "#8f6e52";
      ctx.fillRect(x, y, width, height);
    }
    gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, "rgba(255, 250, 240, 0.2)");
    gradient.addColorStop(0.45, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(1, "rgba(98, 70, 47, 0.12)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    ctx.save();
    traceRoundedPanelPath(ctx, x, y, width, height, radius);
    ctx.strokeStyle = opts.stroke || "rgba(112, 82, 52, 0.34)";
    ctx.lineWidth = typeof opts.lineWidth === "number" ? opts.lineWidth : 2;
    ctx.stroke();
    traceRoundedPanelPath(ctx, x + 10, y + 10, width - 20, height - 20, Math.max(6, radius - 4));
    ctx.strokeStyle = "rgba(151, 115, 76, 0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawWoodActionButton(ctx, box, label, subtitle) {
    var usedSurface = false;

    if (G.render.assets && typeof G.render.assets.drawCombatEndTurnButton === "function") {
      G.render.assets.drawCombatEndTurnButton(ctx, box.x, box.y, box.width, box.height, {
        hideStroke: true
      });
      usedSurface = true;
    }

    if (!usedSurface) {
      ctx.save();
      ctx.fillStyle = "#3a2a22";
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.restore();
    }

    G.render.ui.drawLabel(ctx, label, box.x + box.width / 2, box.y + box.height / 2 - (subtitle ? 7 : 1), {
      size: subtitle ? 24 : 28,
      weight: "700",
      align: "center",
      color: "#f2e6d2"
    });

    if (subtitle) {
      G.render.ui.drawLabel(ctx, subtitle, box.x + box.width / 2, box.y + box.height - 16, {
        size: 12,
        align: "center",
        color: "#e0d0ba",
        shadow: false
      });
    }
  }

  function getNodeTypeLabel(nodeType) {
    if (nodeType === "gate") {
      return "关卡死斗";
    }

    if (nodeType === "elite") {
      return "强敌截杀";
    }

    if (nodeType === "nemesis") {
      return "宿敌复仇";
    }

    return "喋血街头";
  }

  function getVictoryResultCopy(nodeType, state) {
    return G.nemesis.getVictoryCopy(nodeType, state);
  }

  function getRewardPalette(nodeType, mode) {
    if (nodeType === "gate") {
      return {
        glow: "rgba(242, 206, 126, 0.34)",
        panel: "rgba(20, 20, 20, 0.85)",
        stroke: "#4a3728",
        accent: "#f0d29d",
        ribbon: "#6e3b2b"
      };
    }

    if (nodeType === "elite" || mode === "relic") {
      return {
        glow: "rgba(209, 167, 102, 0.28)",
        panel: "rgba(20, 20, 20, 0.85)",
        stroke: "#4a3728",
        accent: "#dec48f",
        ribbon: "#5a3827"
      };
    }

    if (nodeType === "nemesis") {
      return {
        glow: "rgba(193, 120, 84, 0.26)",
        panel: "rgba(20, 20, 20, 0.85)",
        stroke: "#5c4033",
        accent: "#e2b18e",
        ribbon: "#5c3129"
      };
    }

    return {
      glow: "rgba(182, 108, 82, 0.22)",
      panel: "rgba(20, 20, 20, 0.85)",
      stroke: "#4a3728",
      accent: "#dfc2b1",
      ribbon: "#4d2a2b"
    };
  }

  function createPresentation(introMs) {
    return {
      introMs: Math.max(0, Number(introMs) || 0),
      introDurationMs: Math.max(0, Number(introMs) || 0),
      cardStaggerMs: 86
    };
  }

  function ensureCombatRewardState(state) {
    var nextState = cloneState(state);

    nextState.combat = nextState.combat || {};
    nextState.combat.rewardState = Object.assign({
      relicResolved: false,
      cardResolved: false,
      completed: false,
      lastRelicChoice: null,
      lastCardChoice: null
    }, nextState.combat.rewardState || {});

    return nextState;
  }

  function ensureRewardPresentation(nextState) {
    nextState.reward.presentation = Object.assign(createPresentation(0), nextState.reward.presentation || {});
    return nextState;
  }

  function buildRewardCardBoxes(optionCount, tableRect) {
    var count = Math.max(3, Math.min(4, Number(optionCount) || 3));
    var tableX = tableRect ? tableRect.x + 30 : 344;
    var tableWidth = tableRect ? tableRect.width - 60 : 850;
    var cardWidth = 0;
    var cardHeight = 0;
    var gap = 0;
    var startX = 0;

    if (count === 4) {
      cardWidth = 170;
      cardHeight = 230;
      gap = 18;
      startX = tableX + Math.round((tableWidth - (cardWidth * count + gap * (count - 1))) / 2);
      return [
        { x: startX, y: 236, width: cardWidth, height: cardHeight },
        { x: startX + (cardWidth + gap), y: 224, width: cardWidth, height: cardHeight },
        { x: startX + (cardWidth + gap) * 2, y: 224, width: cardWidth, height: cardHeight },
        { x: startX + (cardWidth + gap) * 3, y: 236, width: cardWidth, height: cardHeight }
      ];
    }

    cardWidth = 198;
    cardHeight = 266;
    gap = 24;
    startX = tableX + Math.round((tableWidth - (cardWidth * count + gap * (count - 1))) / 2);
    return [
      { x: startX, y: 214, width: cardWidth, height: cardHeight },
      { x: startX + (cardWidth + gap), y: 194, width: cardWidth, height: cardHeight },
      { x: startX + (cardWidth + gap) * 2, y: 214, width: cardWidth, height: cardHeight }
    ];
  }

  function getLayout(optionCount) {
    var table = { x: 300, y: 148, width: 926, height: 396 };

    return {
      header: { x: 34, y: 24, width: 1212, height: 92 },
      summary: { x: 52, y: 118, width: 220, height: 530 },
      table: table,
      cards: buildRewardCardBoxes(optionCount, table),
      footer: { x: 300, y: 568, width: 686, height: 68 },
      skip: { x: 1012, y: 574, width: 190, height: 62 }
    };
  }

  function getChoiceCountLabel(count) {
    return count === 4 ? "四" : "三";
  }

  function buildCardRewardSubtitle(goldAward, optionCount) {
    return "获得 " + goldAward + " 大洋，再从 " + optionCount + " 张招式中选 1 张加入牌组，或点击放弃。";
  }

  function buildRelicRewardSubtitle() {
    return "强敌倒下，先从 3 件旧物中选 1 件带走；若都看不上，也可放弃旧物。";
  }

  function buildEntrySummary(nodeType, goldAward, mode) {
    var gainLine = "到手 " + goldAward + " 大洋";

    if (mode === "relic") {
      gainLine += "，先翻旧物，再挑招式。";
    } else {
      gainLine += "，这一轮直接收招式。";
    }

    if (nodeType === "gate") {
      return "这一场是硬碰硬的关口死斗，" + gainLine;
    }

    if (nodeType === "elite") {
      return "强敌身上的油水更多些，" + gainLine;
    }

    if (nodeType === "nemesis") {
      return "仇人倒下后留下的东西更像回响，" + gainLine;
    }

    return "街头收尾要利索，" + gainLine;
  }

  function getRewardIndexCode(nodeType, goldAward) {
    var code = "STREET";

    if (nodeType === "elite") {
      code = "ELITE";
    } else if (nodeType === "gate") {
      code = "GATE";
    } else if (nodeType === "nemesis") {
      code = "NEMESIS";
    }

    return code + " // " + String(goldAward || 0);
  }

  function getRewardModeTitleClean(mode) {
    return mode === "relic" ? "\u5f3a\u654c\u65e7\u7269" : "\u6218\u540e\u641c\u5f97";
  }

  function getRewardSubtitleClean(mode, goldAward, optionCount) {
    if (mode === "relic") {
      return "\u5f3a\u654c\u5012\u4e0b\uff0c\u8eab\u4e0a\u65e7\u7269\u4e5f\u8be5\u7ffb\u4e00\u7ffb\u3002";
    }

    return "\u5f97\u4e86 " + goldAward + " \u5927\u6d0b\uff0c\u8fd8\u53ef\u4ece " + optionCount + " \u5f0f\u91cc\u5e26\u8d70\u4e00\u5f0f\u3002";
  }

  function getRewardTrophyLabelClean(mode) {
    return mode === "relic" ? "\u5f3a\u654c\u8eab\u4e0a" : "\u6b64\u6218\u6240\u5f97";
  }

  function getRewardEntrySummaryClean(nodeType, goldAward, mode) {
    var gainLine = "\u5230\u624b " + goldAward + " \u5927\u6d0b";

    if (mode === "relic") {
      gainLine += "\uff0c\u5148\u7ffb\u65e7\u7269\uff0c\u518d\u770b\u62db\u5f0f\u3002";
    } else {
      gainLine += "\uff0c\u518d\u6311\u4e00\u5f0f\u5e26\u8d70\u3002";
    }

    if (nodeType === "gate") {
      return "\u8fd9\u4e00\u6218\u662f\u786c\u78b0\u786c\u7684\u5173\u53e3\u6b7b\u6597\uff0c" + gainLine;
    }
    if (nodeType === "elite") {
      return "\u5f3a\u654c\u8eab\u4e0a\u7684\u6cb9\u6c34\u66f4\u591a\u4e9b\uff0c" + gainLine;
    }
    if (nodeType === "nemesis") {
      return "\u4ec7\u4eba\u5012\u4e0b\u540e\u7559\u4e0b\u7684\u4e1c\u897f\u66f4\u50cf\u56de\u54cd\uff0c" + gainLine;
    }

    return "\u8857\u5934\u6536\u5c3e\u8981\u5229\u7d22\uff0c" + gainLine;
  }

  function getRewardTableTitleClean(mode) {
    return mode === "relic" ? "挑一件旧物" : "挑一式带走";
  }

  function getRewardTableHintClean(mode) {
    return "";
  }

  function getRewardSectionLabelClean(kind) {
    if (kind === "summary") {
      return "\u6240\u5f97";
    }
    if (kind === "kill") {
      return "\u6536\u62db\u4e00\u5f0f";
    }
    if (kind === "gold") {
      return "\u5165\u888b";
    }

    return "";
  }

  function getRewardHeaderLineClean(state) {
    if (state && state.reward && state.reward.entryVictoryTitle) {
      return state.reward.entryVictoryTitle;
    }

    return "";
  }

  function getRewardFooterEncounterClean(state) {
    if (state && state.reward && state.reward.entryEncounterName) {
      return state.reward.entryEncounterName;
    }

    if (state && state.reward && state.reward.entryNodeLabel) {
      return state.reward.entryNodeLabel;
    }

    return "\u8fd9\u4e00\u6218";
  }

  function getRewardSkipSubtitleClean(mode) {
    return "";
  }

  function getRewardStatusPanelTagClean() {
    return "当前身上";
  }

  function getRewardDeckCount(state) {
    if (state && state.player && typeof state.player.deckSize === "number" && state.player.deckSize > 0) {
      return state.player.deckSize;
    }

    if (state && state.player && Array.isArray(state.player.masterDeckNames)) {
      return state.player.masterDeckNames.length;
    }

    return 0;
  }

  function pushRewardGlossaryNote(notes, text) {
    if (!text || notes.indexOf(text) >= 0) {
      return;
    }

    notes.push(text);
  }

  function getRewardCardGlossaryText(card) {
    var notes = [];
    var thresholdPercent = 0;

    if (!card) {
      return "搜刮战利品。不可贪多，仅取其一。";
    }

    if (card.executeThreshold && card.executeDamage) {
      thresholdPercent = Math.round(card.executeThreshold * 100);
      pushRewardGlossaryNote(notes, "【处决】目标气血低于 " + thresholdPercent + "% 时，改用 " + card.executeDamage + " 点伤害。");
    }
    if (card.consumeFlaw) {
      if (card.damagePerFlaw) {
        pushRewardGlossaryNote(notes, "【收招】消耗目标身上的破绽；每层再补 " + card.damagePerFlaw + " 点伤害。");
      } else {
        pushRewardGlossaryNote(notes, "【收招】会把目标身上的破绽一并收尽。");
      }
    }
    if (card.flaw) {
      pushRewardGlossaryNote(notes, "【破绽】留在敌人身上的破口层数，可被收招类招式消耗。");
    }
    if (card.block || card.bonusBlockIfBlocked || card.damageFromCurrentBlock || card.ironBoneBlock) {
      pushRewardGlossaryNote(notes, "【架势】本回合用于抵消伤害；到下个自己回合开始时清零。");
    }
    if (card.ironBoneDamage || card.ironBoneBlock || card.damageFromCurrentBlock) {
      pushRewardGlossaryNote(notes, "【铁骨】当前架势达到 10 时触发额外效果。");
    }
    if (card.fester || card.consumeFester || card.damagePerFester || card.bonusDamageIfTargetHasFester) {
      pushRewardGlossaryNote(notes, "【溃烂】敌人回合开始时按层数掉血，然后减少 1 层。");
    }
    if (card.blind) {
      pushRewardGlossaryNote(notes, "【迷眼】让敌人下回合造成的伤害减半。");
    }
    if (card.crippleTurns) {
      pushRewardGlossaryNote(notes, "【残废】在持续回合内，敌人造成的伤害降为 75%。");
    }
    if (card.comboTag) {
      pushRewardGlossaryNote(notes, "【连环】本回合累计打出第 3 张连环牌后，后续连环牌会减费，最多触发 3 次。");
    }
    if (card.draw) {
      pushRewardGlossaryNote(notes, "【抽牌】立刻补 " + card.draw + " 张牌。");
    }

    if (notes.length === 0) {
      return "【" + card.name + "】" + (card.text || card.description || "这一式没有额外词条说明。");
    }

    return notes.slice(0, 2).join("  ");
  }

  function getRewardFooterDisplayCopy(state) {
    var hoveredIndex = state && state.reward ? state.reward.hoveredOptionIndex : null;
    var option = null;

    if (
      typeof hoveredIndex === "number" &&
      hoveredIndex >= 0 &&
      state &&
      state.reward &&
      Array.isArray(state.reward.options) &&
      hoveredIndex < state.reward.options.length
    ) {
      option = state.reward.options[hoveredIndex];
    }

    if (option) {
      if (state.reward.mode === "relic") {
        return {
          text: "【" + option.name + "】" + (option.description || "旧物在手，自有用场。"),
          color: "#cfc3b0",
          size: 14.6,
          weight: "600",
          maxLines: 2,
          shadowColor: "rgba(0, 0, 0, 0.52)",
          shadowBlur: 1,
          shadowOffsetX: 0,
          shadowOffsetY: 1,
          fontFamily: getRewardReadableFontFamily()
        };
      }

      return {
        text: getRewardCardGlossaryText(option),
        color: "#cfc3b0",
        size: 14.6,
        weight: "600",
        maxLines: 2,
        shadowColor: "rgba(0, 0, 0, 0.52)",
        shadowBlur: 1,
        shadowOffsetX: 0,
        shadowOffsetY: 1,
        fontFamily: getRewardReadableFontFamily()
      };
    }

    return {
      text: state && state.reward && state.reward.mode === "relic" ?
        "翻检旧物。只取一件，余下不必沾手。" :
        "搜刮战利品。不可贪多，仅取其一。",
      color: "rgba(193, 175, 144, 0.78)",
      size: 14.8,
      weight: "600",
      maxLines: 2,
      tracking: 0.1,
      shadowColor: "rgba(0, 0, 0, 0.42)",
      shadowBlur: 1,
      shadowOffsetX: 0,
      shadowOffsetY: 1,
      fontFamily: getRewardReadableFontFamily()
    };
  }

  function getRewardFooterNoteClean(state) {
    if (state.reward.lastRelicChoice && state.reward.lastRelicChoice !== "\u653e\u5f03\u65e7\u7269") {
      return "\u65e7\u7269\u5df2\u6536\uff0c\u4e0b\u9762\u518d\u6311\u4e00\u5f0f\u3002";
    }

    if (state.reward.lastRelicChoice === "\u653e\u5f03\u65e7\u7269") {
      return "\u65e7\u7269\u4e0d\u53d6\uff0c\u4e0b\u9762\u53ea\u6311\u62db\u5f0f\u3002";
    }

    if (state.reward.mode === "relic") {
      return "\u5148\u7ffb\u65e7\u7269\uff0c\u518d\u770b\u62db\u5f0f\u3002";
    }

    return "\u770b\u4e2d\u7684\u5e26\u8d70\uff0c\u4e0d\u987a\u773c\u5c31\u7559\u5728\u6848\u4e0a\u3002";
  }

  function buildRewardState(nextState, goldAward, builtCards, builtRelics) {
    var nodeType = nextState.combat && nextState.combat.nodeType ? nextState.combat.nodeType : "street";
    var relicMode = builtRelics && builtRelics.options.length > 0;
    var victoryCopy = getVictoryResultCopy(nodeType, nextState);

    nextState.reward = {
      mode: relicMode ? "relic" : "card",
      title: relicMode ? "强敌旧物" : "战利品搜刮",
      subtitle: relicMode ? buildRelicRewardSubtitle() : buildCardRewardSubtitle(goldAward, builtCards.options.length),
      cardOptions: builtCards.options,
      relicOptions: builtRelics ? builtRelics.options : [],
      options: relicMode ? builtRelics.options : builtCards.options,
      skipLabel: relicMode ? "不取旧物" : "拂袖而去",
      lastChoice: nextState.combat.rewardState.lastCardChoice,
      lastRelicChoice: nextState.combat.rewardState.lastRelicChoice,
      goldAward: goldAward,
      entryNodeType: nodeType,
      entryNodeLabel: getNodeTypeLabel(nodeType),
      entryEncounterName: nextState.combat.encounterName || "无名遭遇",
      entryKillCardName: nextState.combat.lastKillCardName || null,
      entryVictoryTitle: victoryCopy.title,
      entryVictorySubtitle: victoryCopy.subtitle,
      entrySummary: buildEntrySummary(nodeType, goldAward, relicMode ? "relic" : "card"),
      trophyLabel: relicMode ? "缴获旧物" : "缴获招式",
      hoverActivated: false,
      hoveredOptionIndex: null,
      hoverPointerX: null,
      hoverPointerY: null,
      presentation: createPresentation(REWARD_INTRO_MS)
    };
    nextState.reward.title = getRewardModeTitleClean(nextState.reward.mode);
    nextState.reward.subtitle = getRewardSubtitleClean(nextState.reward.mode, goldAward, builtCards.options.length);
    nextState.reward.entrySummary = getRewardEntrySummaryClean(nodeType, goldAward, nextState.reward.mode);
    nextState.reward.trophyLabel = getRewardTrophyLabelClean(nextState.reward.mode);

    return nextState;
  }

  function buildRewardStateFromCombat(state) {
    var nextState = ensureCombatRewardState(state);
    var currentSeed = nextState.combat.rngSeed || 1900;
    var nodeType = nextState.combat && nextState.combat.nodeType ? nextState.combat.nodeType : "street";
    var goldAward = GOLD_BY_NODE_TYPE[nodeType] || 20;
    var builtRelics = null;
    var builtCards = null;
    var cardOptionCount = G.relicRuntime && typeof G.relicRuntime.getRewardOptionCount === "function" ?
      G.relicRuntime.getRewardOptionCount(nextState) :
      3;
    var extraGold = G.relicRuntime && typeof G.relicRuntime.getBattleGoldBonus === "function" ?
      G.relicRuntime.getBattleGoldBonus(nextState) :
      0;

    if (nextState.combat.rewardState.completed) {
      nextState.scene = "map";
      if (G.scenes.map && typeof G.scenes.map.prepareState === "function") {
        nextState = G.scenes.map.prepareState(nextState);
      }
      return nextState;
    }

    if (
      G.nemesis &&
      typeof G.nemesis.recordBattleOutcome === "function" &&
      !nextState.combat.nemesisRecorded
    ) {
      nextState = G.nemesis.recordBattleOutcome(nextState);
    }

    goldAward += extraGold;

    if (!nextState.combat.goldGranted) {
      nextState = G.player.gainGold(nextState, goldAward);
      nextState.combat.goldGranted = goldAward;
    } else {
      goldAward = nextState.combat.goldGranted;
    }

    if ((nodeType === "elite" || nodeType === "nemesis") && !nextState.combat.rewardState.relicResolved) {
      builtRelics = G.relics.buildRewardRelicOptions(currentSeed, nextState.player.relics || []);
      currentSeed = builtRelics.nextSeed;
    }

    builtCards = G.cards.buildRewardOptions(nextState.player.chosenStyle || "blade", currentSeed, cardOptionCount);
    currentSeed = builtCards.nextSeed;
    nextState = buildRewardState(nextState, goldAward, builtCards, builtRelics);
    nextState.combat.rngSeed = currentSeed;
    nextState.scene = "reward";
    return nextState;
  }

  function prepareState(state) {
    if (state && state.scene === "reward" && state.reward && state.reward.mode && Array.isArray(state.reward.options)) {
      return ensureRewardPresentation(cloneState(state));
    }

    return buildRewardStateFromCombat(state);
  }

  function ensureRewardState(state) {
    var nextState = null;

    if (state.reward && state.reward.mode && state.reward.options && state.reward.options.length > 0) {
      nextState = cloneState(state);
      return ensureRewardPresentation(nextState);
    }

    return buildRewardStateFromCombat(state);
  }

  function buildMapReturnNote(state) {
    var parts = [];

    if (state.reward.lastRelicChoice && state.reward.lastRelicChoice !== "放弃旧物") {
      parts.push("旧物【" + state.reward.lastRelicChoice + "】");
    }
    if (state.reward.lastChoice && state.reward.lastChoice !== "放弃") {
      parts.push("招式【" + state.reward.lastChoice + "】");
    }

    if (parts.length === 0) {
      return "你放弃了战利品。";
    }

    return "已带走 " + parts.join("、") + "。";
  }

  function returnToMap(nextState, note) {
    nextState.map = nextState.map || {};
    nextState.map.note = note;
    nextState.map.lastRewardChoice = nextState.reward.lastChoice;
    nextState.map.lastRewardRelicChoice = nextState.reward.lastRelicChoice;
    nextState.reward = null;

    if (
      nextState.combat &&
      nextState.combat.nodeType === "gate" &&
      G.scenes.map &&
      typeof G.scenes.map.advanceAfterGate === "function"
    ) {
      return G.scenes.map.advanceAfterGate(nextState, note);
    }

    nextState.scene = "map";
    if (G.scenes.map && typeof G.scenes.map.prepareState === "function") {
      nextState = G.scenes.map.prepareState(nextState);
    }
    return nextState;
  }

  function enterCardReward(state) {
    var nextState = cloneState(state);

    nextState.reward.mode = "card";
    nextState.reward.title = "战利品搜刮";
    nextState.reward.subtitle = buildCardRewardSubtitle(nextState.reward.goldAward, nextState.reward.cardOptions.length);
    nextState.reward.options = nextState.reward.cardOptions.slice();
    nextState.reward.skipLabel = "拂袖而去";
    nextState.reward.trophyLabel = "缴获招式";
    nextState.reward.entrySummary = buildEntrySummary(nextState.reward.entryNodeType, nextState.reward.goldAward, "card");
    nextState.reward.title = getRewardModeTitleClean("card");
    nextState.reward.subtitle = getRewardSubtitleClean("card", nextState.reward.goldAward, nextState.reward.cardOptions.length);
    nextState.reward.trophyLabel = getRewardTrophyLabelClean("card");
    nextState.reward.entrySummary = getRewardEntrySummaryClean(nextState.reward.entryNodeType, nextState.reward.goldAward, "card");
    nextState.reward.hoverActivated = false;
    nextState.reward.hoveredOptionIndex = null;
    nextState.reward.hoverPointerX = null;
    nextState.reward.hoverPointerY = null;
    nextState.reward.presentation = createPresentation(CARD_PHASE_INTRO_MS);
    return nextState;
  }

  function resolveRelicChoice(state, relic) {
    var nextState = ensureCombatRewardState(state);

    if (nextState.combat.rewardState.relicResolved) {
      return nextState;
    }

    nextState = G.player.addRelic(nextState, relic.id);
    nextState.reward.lastRelicChoice = relic.name;
    nextState.combat.rewardState.relicResolved = true;
    nextState.combat.rewardState.lastRelicChoice = relic.name;
    return enterCardReward(nextState);
  }

  function resolveRelicSkip(state) {
    var nextState = ensureCombatRewardState(state);

    if (nextState.combat.rewardState.relicResolved) {
      return nextState;
    }

    nextState.reward.lastRelicChoice = "放弃旧物";
    nextState.combat.rewardState.relicResolved = true;
    nextState.combat.rewardState.lastRelicChoice = nextState.reward.lastRelicChoice;
    return enterCardReward(nextState);
  }

  function resolveCardChoice(state, card) {
    var nextState = ensureCombatRewardState(state);

    if (nextState.combat.rewardState.cardResolved) {
      return returnToMap(nextState, buildMapReturnNote(nextState));
    }

    nextState.player.masterDeckNames = (nextState.player.masterDeckNames || []).concat(card.deckName || card.baseName || card.name);
    if (G.journeyPreparation) G.journeyPreparation.recordGain(nextState, card.deckName || card.baseName || card.name);
    nextState.player.deckSize = nextState.player.masterDeckNames.length;
    if (G.journeyPreparation) G.journeyPreparation.resolveDraft(nextState, card);
    nextState.reward.lastChoice = card.name;
    nextState.combat.rewardState.cardResolved = true;
    nextState.combat.rewardState.completed = true;
    nextState.combat.rewardState.lastCardChoice = card.name;
    return returnToMap(nextState, buildMapReturnNote(nextState));
  }

  function resolveCardSkip(state) {
    var nextState = ensureCombatRewardState(state);

    if (nextState.combat.rewardState.cardResolved) {
      return returnToMap(nextState, buildMapReturnNote(nextState));
    }

    nextState.reward.lastChoice = "放弃";
    nextState.combat.rewardState.cardResolved = true;
    nextState.combat.rewardState.completed = true;
    nextState.combat.rewardState.lastCardChoice = nextState.reward.lastChoice;
    return returnToMap(nextState, buildMapReturnNote(nextState));
  }

  function updatePresentation(state, input) {
    var nextState = state;
    var deltaMs = input && typeof input.deltaMs === "number" ? input.deltaMs : 0;

    if (!nextState.reward || !nextState.reward.presentation || nextState.reward.presentation.introMs <= 0) {
      return nextState;
    }

    nextState = cloneState(nextState);
    nextState.reward.presentation.introMs = Math.max(0, nextState.reward.presentation.introMs - deltaMs);
    return nextState;
  }

  function updateHoveredOption(state) {
    var pointer = G.main && typeof G.main.consumePointerFrame === "function" ? G.main.consumePointerFrame() : null;
    var layout = null;
    var hoveredIndex = null;
    var i = 0;
    var nextState = state;
    var hoverActivated = !!(state && state.reward && state.reward.hoverActivated);
    var previousPointerX = state && state.reward && typeof state.reward.hoverPointerX === "number" ? state.reward.hoverPointerX : null;
    var previousPointerY = state && state.reward && typeof state.reward.hoverPointerY === "number" ? state.reward.hoverPointerY : null;
    var pointerMovedEnough = false;
    var needsPointerSnapshot = false;

    if (!pointer || !state || !state.reward || !Array.isArray(state.reward.options)) {
      return state;
    }

    if (previousPointerX !== null && previousPointerY !== null) {
      pointerMovedEnough =
        Math.abs(pointer.x - previousPointerX) > 2 ||
        Math.abs(pointer.y - previousPointerY) > 2;
    }

    if (!hoverActivated && !pointerMovedEnough && !pointer.pressed && !pointer.isDown) {
      needsPointerSnapshot = previousPointerX !== pointer.x || previousPointerY !== pointer.y;
      if (!needsPointerSnapshot) {
        return state;
      }

      nextState = cloneState(state);
      nextState.reward.hoverPointerX = pointer.x;
      nextState.reward.hoverPointerY = pointer.y;
      return nextState;
    }

    if (!hoverActivated) {
      hoverActivated = true;
    }

    layout = getLayout(state.reward.options.length);
    for (i = layout.cards.length - 1; i >= 0; i -= 1) {
      if (isInside(pointer, layout.cards[i])) {
        hoveredIndex = i;
        break;
      }
    }

    if (
      (typeof state.reward.hoveredOptionIndex === "number" ? state.reward.hoveredOptionIndex : null) === hoveredIndex &&
      !!state.reward.hoverActivated === hoverActivated &&
      state.reward.hoverPointerX === pointer.x &&
      state.reward.hoverPointerY === pointer.y
    ) {
      return state;
    }

    if (nextState === state) {
      nextState = cloneState(state);
    }
    nextState.reward.hoverActivated = hoverActivated;
    nextState.reward.hoveredOptionIndex = hoveredIndex;
    nextState.reward.hoverPointerX = pointer.x;
    nextState.reward.hoverPointerY = pointer.y;
    return nextState;
  }

  function processClicks(state) {
    var nextState = state;
    var layout = getLayout(nextState.reward.options.length);
    var clicks = G.main && typeof G.main.consumeClicks === "function" ? G.main.consumeClicks() : [];
    var click = null;
    var i = 0;
    var option = null;

    if (clicks.length === 0) {
      return state;
    }

    if (nextState.reward.presentation && nextState.reward.presentation.introMs > 0) {
      nextState = cloneState(nextState);
      nextState.reward.presentation.introMs = 0;
      return nextState;
    }

    while (clicks.length > 0) {
      click = clicks.shift();
      option = null;

      for (i = 0; i < layout.cards.length; i += 1) {
        if (isInside(click, layout.cards[i])) {
          option = nextState.reward.options[i];
          break;
        }
      }

      if (option) {
        if (nextState.reward.mode === "relic") {
          nextState = resolveRelicChoice(nextState, option);
        } else {
          nextState = resolveCardChoice(nextState, option);
        }
      } else if (isInside(click, layout.skip)) {
        if (nextState.reward.mode === "relic") {
          nextState = resolveRelicSkip(nextState);
        } else {
          nextState = resolveCardSkip(nextState);
        }
      }
    }

    return nextState;
  }

  function getRevealElapsed(state) {
    var presentation = state.reward && state.reward.presentation ? state.reward.presentation : null;

    if (!presentation || presentation.introDurationMs <= 0) {
      return 9999;
    }

    return presentation.introDurationMs - presentation.introMs;
  }

  function getSceneReveal(state) {
    var presentation = state.reward && state.reward.presentation ? state.reward.presentation : null;

    if (!presentation || presentation.introDurationMs <= 0) {
      return 1;
    }

    return easeOutCubic(1 - presentation.introMs / presentation.introDurationMs);
  }

  function getCardReveal(state, index) {
    var presentation = state.reward && state.reward.presentation ? state.reward.presentation : null;
    var elapsedMs = getRevealElapsed(state);
    var staggerMs = presentation ? presentation.cardStaggerMs : 86;
    return easeOutCubic(clamp((elapsedMs - index * staggerMs) / 260, 0, 1));
  }

  function drawAftermathSilhouette(ctx, centerX, baseY, scale, accent, facing, alpha) {
    var direction = facing < 0 ? -1 : 1;
    var appliedAlpha = clamp(alpha, 0, 1);

    ctx.save();
    ctx.globalAlpha *= appliedAlpha;
    ctx.translate(centerX, baseY);
    ctx.scale(direction, 1);

    ctx.fillStyle = "rgba(14, 12, 14, 0.9)";
    ctx.beginPath();
    ctx.ellipse(0, scale * 0.42, scale * 0.34, scale * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-scale * 0.12, scale * 0.28);
    ctx.lineTo(scale * 0.08, -scale * 0.36);
    ctx.lineTo(scale * 0.22, scale * 0.22);
    ctx.lineTo(-scale * 0.04, scale * 0.34);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(scale * 0.06, -scale * 0.48, scale * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, scale * 0.04);
    ctx.beginPath();
    ctx.moveTo(scale * 0.02, -scale * 0.34);
    ctx.lineTo(scale * 0.32, -scale * 0.08);
    ctx.moveTo(scale * 0.1, -scale * 0.22);
    ctx.lineTo(-scale * 0.28, scale * 0.02);
    ctx.moveTo(scale * 0.08, scale * 0.04);
    ctx.lineTo(scale * 0.4, scale * 0.32);
    ctx.moveTo(scale * 0.02, scale * 0.02);
    ctx.lineTo(-scale * 0.18, scale * 0.34);
    ctx.stroke();

    ctx.strokeStyle = "rgba(240, 209, 162, 0.58)";
    ctx.lineWidth = Math.max(2, scale * 0.028);
    ctx.beginPath();
    ctx.moveTo(scale * 0.24, -scale * 0.12);
    ctx.lineTo(scale * 0.74, -scale * 0.7);
    ctx.stroke();

    ctx.strokeStyle = "rgba(184, 54, 63, 0.28)";
    ctx.lineWidth = Math.max(3, scale * 0.032);
    ctx.beginPath();
    ctx.moveTo(-scale * 0.24, scale * 0.18);
    ctx.quadraticCurveTo(scale * 0.06, -scale * 0.18, scale * 0.52, -scale * 0.08);
    ctx.moveTo(-scale * 0.16, scale * 0.28);
    ctx.quadraticCurveTo(scale * 0.12, 0, scale * 0.46, scale * 0.06);
    ctx.stroke();
    ctx.restore();
  }

  function renderCombatEcho(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var introStrength = Math.pow(1 - reveal, 1.05);
    var enemies = state.combat && Array.isArray(state.combat.enemies) ? state.combat.enemies.slice(0, 2) : [];
    var enemySlots = [
      { x: 850, y: 40, width: 224, height: 164, driftX: -18, driftY: 72, rotation: -0.04 },
      { x: 1030, y: 68, width: 196, height: 146, driftX: 20, driftY: 56, rotation: 0.03 }
    ];
    var i = 0;
    var enemy = null;
    var slot = null;
    var cardAlpha = 0;

    if (introStrength <= 0.02) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.1 + introStrength * 0.2;
    G.render.ui.drawPanel(ctx, 392, 28 - introStrength * 12, 496, 84, {
      fill: "rgba(18, 16, 17, 0.84)",
      stroke: "rgba(215, 178, 122, 0.28)"
    });
    G.render.ui.drawLabel(ctx, state.reward.entryEncounterName || "遭遇", 640, 69 - introStrength * 12, {
      size: 26,
      align: "center",
      color: "#eadcc7"
    });
    G.render.ui.drawLabel(ctx, state.reward.entryNodeLabel || "战斗", 640, 94 - introStrength * 12, {
      size: 14,
      align: "center",
      color: "#b9a48d"
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.08 + introStrength * 0.22;
    ctx.fillStyle = "rgba(23, 18, 19, 0.82)";
    ctx.fillRect(24, 126, 298, 522);
    ctx.fillRect(818, 124, 452, 360);
    ctx.strokeStyle = "rgba(216, 192, 159, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 126, 298, 522);
    ctx.strokeRect(818, 124, 452, 360);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.12 + introStrength * 0.22;
    ctx.strokeStyle = "rgba(240, 209, 162, 0.14)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(336, 424);
    ctx.lineTo(1188, 308);
    ctx.moveTo(350, 492);
    ctx.lineTo(458, 334);
    ctx.lineTo(610, 276);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.16 + introStrength * 0.22;
    ctx.fillStyle = "rgba(14, 12, 14, 0.86)";
    ctx.beginPath();
    ctx.ellipse(1026, 448, 286, 66, -0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(430, 446, 168, 54, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawAftermathSilhouette(ctx, 434 - introStrength * 20, 420 + introStrength * 10, 154, "#c55a5a", 1, 0.16 + introStrength * 0.26);

    for (i = 0; i < enemies.length; i += 1) {
      enemy = enemies[i];
      slot = enemySlots[i];
      cardAlpha = 0.16 + introStrength * 0.32;

      ctx.save();
      ctx.globalAlpha = cardAlpha;
      ctx.translate(slot.x + slot.width / 2 + slot.driftX * introStrength, slot.y + slot.height / 2 + slot.driftY * introStrength);
      ctx.rotate(slot.rotation * introStrength);
      ctx.translate(-slot.width / 2, -slot.height / 2);
      G.render.ui.drawEnemyCard(ctx, {
        x: 0,
        y: 0,
        width: slot.width,
        height: slot.height,
        name: enemy.name,
        hp: 0,
        maxHp: enemy.maxHp || 1,
        block: 0,
        intent: "attack",
        intentLabel: "已诛",
        intentValue: ""
      });
      ctx.restore();
    }
  }

  function renderBackground(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var palette = getRewardPalette(state.reward.entryNodeType, state.reward.mode);
    var radial = null;
    var texturedBackground = false;

    G.render.canvasUtils.clear(ctx, "#151214");

    texturedBackground = !!(
      G.render.assets &&
      typeof G.render.assets.drawImageCover === "function" &&
      G.render.assets.drawImageCover(ctx, REWARD_BACKGROUND_TEXTURE_PATH, 0, 0, 1280, 720, {
        focusX: 0.54,
        focusY: 0.56
      })
    );

    renderCombatEcho(ctx, state, layout);

    ctx.save();
    radial = ctx.createRadialGradient(836, 286, 60, 836, 286, 560);
    radial.addColorStop(0, palette.glow);
    radial.addColorStop(0.45, "rgba(91, 44, 33, 0.16)");
    radial.addColorStop(1, "rgba(12, 10, 10, 0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    ctx.save();
    var gradient = ctx.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, texturedBackground ? "rgba(10, 9, 9, 0.3)" : "rgba(68, 24, 20, 0.58)");
    gradient.addColorStop(0.46, texturedBackground ? "rgba(10, 9, 9, 0.18)" : "rgba(41, 17, 18, 0.22)");
    gradient.addColorStop(1, texturedBackground ? "rgba(6, 6, 6, 0.72)" : "rgba(8, 8, 8, 0.82)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.2 + reveal * 0.28;
    ctx.fillStyle = "rgba(13, 11, 12, 0.92)";
    ctx.beginPath();
    ctx.moveTo(0, 468);
    ctx.bezierCurveTo(236, 390, 470, 424, 658, 446);
    ctx.bezierCurveTo(872, 472, 1068, 430, 1280, 380);
    ctx.lineTo(1280, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.beginPath();
    ctx.ellipse(848, 560, 326, 54, -0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function renderHeader(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var headerX = Math.round(layout.table.x + layout.table.width / 2 - layout.header.width / 2);
    var headerY = layout.header.y - (1 - reveal) * 24;

    ctx.save();
    ctx.globalAlpha = 0.36 + reveal * 0.64;
    drawRewardDecreeSurface(ctx, headerX, headerY, layout.header.width, layout.header.height, {
      focusX: 0.5,
      focusY: 0.3,
      textureAlpha: 0.98
    });

    G.render.ui.drawPanel(ctx, headerX + 22, headerY + 16, 112, 28, {
      fill: "rgba(124, 33, 28, 0.16)",
      stroke: "rgba(96, 36, 31, 0.12)",
      lineWidth: 1
    });
    G.render.ui.drawLabel(ctx, state.reward.entryNodeLabel, headerX + 78, headerY + 30, {
      size: 15,
      align: "center",
      color: "#4a0e0e",
      shadow: false
    });

    G.render.ui.drawLabel(ctx, state.reward.title, headerX + layout.header.width / 2, headerY + 32, {
      size: 38,
      align: "center",
      color: "#1a1a1a"
    });
    G.render.ui.drawLabel(ctx, state.reward.subtitle, headerX + layout.header.width / 2, headerY + 68, {
      size: 17,
      align: "center",
      color: "#4b342e",
      shadow: false
    });
    ctx.restore();
  }

  function renderSummaryPanel(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var baseX = layout.summary.x;
    var baseY = layout.summary.y + (1 - reveal) * 18;
    var summaryGrad = null;
    var summaryWidth = Math.max(baseX + layout.summary.width + 18, 320);
    var summaryGrad = null;
    var summaryWidth = Math.max(baseX + layout.summary.width + 18, 320);
    var summaryGrad = null;
    var killCard = state.reward.entryKillCardName || "拳脚收尾";

    ctx.save();
    ctx.globalAlpha = 0.34 + reveal * 0.66;
    ctx.translate(-(1 - reveal) * 28, 0);
    drawRewardDecreeSurface(ctx, baseX, baseY, layout.summary.width, layout.summary.height, {
      focusX: 0.24,
      focusY: 0.56,
      textureAlpha: 0.98
    });

    G.render.ui.drawPanel(ctx, baseX + 18, baseY + 22, 112, 28, {
      fill: "rgba(124, 33, 28, 0.14)",
      stroke: "rgba(96, 36, 31, 0.1)",
      lineWidth: 1
    });
    G.render.ui.drawLabel(ctx, state.reward.trophyLabel, baseX + 74, baseY + 36, {
      size: 15,
      align: "center",
      color: "#4a0e0e",
      shadow: false
    });

    G.render.ui.drawLabel(ctx, state.reward.entryVictoryTitle, baseX + 24, baseY + 82, {
      size: 30,
      color: "#1a1a1a"
    });

    drawWrappedText(ctx, state.reward.entryVictorySubtitle, baseX + 24, baseY + 110, layout.summary.width - 48, 24, {
      size: 16,
      color: "#4b342e",
      shadow: false,
      maxLines: 3
    });

    G.render.ui.drawLabel(ctx, "遭遇", baseX + 24, baseY + 224, {
      size: 14,
      color: "#704a3d",
      shadow: false
    });
    drawWrappedText(ctx, state.reward.entryEncounterName, baseX + 24, baseY + 242, layout.summary.width - 48, 28, {
      size: 24,
      color: "#1a1a1a",
      maxLines: 2
    });

    G.render.ui.drawLabel(ctx, "收束", baseX + 24, baseY + 322, {
      size: 14,
      color: "#704a3d",
      shadow: false
    });
    drawWrappedText(ctx, state.reward.entrySummary, baseX + 24, baseY + 340, layout.summary.width - 48, 24, {
      size: 16,
      color: "#4b342e",
      shadow: false,
      maxLines: 4
    });

    G.render.ui.drawLabel(ctx, "致命一击", baseX + 24, baseY + 450, {
      size: 14,
      color: "#704a3d",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, killCard, baseX + 24, baseY + 476, {
      size: 22,
      color: "#4a0e0e"
    });

    G.render.ui.drawLabel(ctx, "到手", baseX + 24, baseY + 496, {
      size: 14,
      color: "#704a3d",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, String(state.reward.goldAward) + " 大洋", baseX + 24, baseY + 520, {
      size: 20,
      color: "#4a0e0e"
    });
    ctx.restore();
  }

  function renderTableFrame(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var driftX = (1 - reveal) * 64;
    var driftY = (1 - reveal) * 18;

    ctx.save();
    ctx.globalAlpha = 0.3 + reveal * 0.7;
    ctx.translate(driftX, driftY);
    drawRewardDecreeSurface(ctx, layout.table.x, layout.table.y, layout.table.width, layout.table.height, {
      focusX: 0.56,
      focusY: 0.52,
      textureAlpha: 0.98
    });

    G.render.ui.drawLabel(ctx, state.reward.mode === "relic" ? "挑一件旧物" : "挑一式带走", layout.table.x + 26, layout.table.y + 30, {
      size: 22,
      color: "#1a1a1a"
    });
    G.render.ui.drawLabel(ctx, getChoiceCountLabel(state.reward.options.length) + "选一，留白也可以。", layout.table.x + layout.table.width - 26, layout.table.y + 30, {
      size: 15,
      align: "right",
      color: "#5b4034",
      shadow: false
    });

    ctx.save();
    ctx.strokeStyle = "rgba(90, 56, 42, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(layout.table.x + 24, layout.table.y + 48);
    ctx.lineTo(layout.table.x + layout.table.width - 24, layout.table.y + 48);
    ctx.stroke();
    ctx.restore();

  }

  function renderRelicCard(ctx, option, box, reveal, palette) {
    var x = box.x;
    var y = box.y + (1 - reveal) * 34;
    var scale = 0.94 + reveal * 0.06;
    var alpha = 0.18 + reveal * 0.82;
    var width = box.width;
    var height = box.height;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    if (G.render.assets && typeof G.render.assets.drawCombatStatusPaperSurface === "function") {
      G.render.assets.drawCombatStatusPaperSurface(ctx, 0, 0, width, height, {
        baseFill: "rgba(235, 223, 197, 0.95)",
        textureTint: "rgba(126, 36, 32, 0.14)",
        stroke: "rgba(94, 65, 47, 0.2)"
      });
    } else {
      G.render.ui.drawPanel(ctx, 0, 0, width, height, {
        fill: "rgba(232, 219, 194, 0.95)",
        stroke: "rgba(94, 65, 47, 0.2)"
      });
    }
    G.render.ui.drawPanel(ctx, 18, 18, width - 36, 46, {
      fill: "rgba(124, 33, 28, 0.12)",
      stroke: "rgba(96, 36, 31, 0.1)",
      lineWidth: 1
    });
    G.render.ui.drawLabel(ctx, option.icon || "旧", 40, 42, {
      size: 28,
      align: "center",
      color: "#4a0e0e"
    });
    G.render.ui.drawLabel(ctx, option.name, width / 2 + 10, 42, {
      size: 22,
      align: "center",
      color: "#1a1a1a"
    });
    drawWrappedText(ctx, option.description, 22, 92, width - 44, 24, {
      size: 16,
      color: "#4b342e",
      shadow: false,
      maxLines: 4
    });

    ctx.restore();
  }

  function renderCards(ctx, state, layout) {
    var palette = getRewardPalette(state.reward.entryNodeType, state.reward.mode);
    var i = 0;
    var option = null;
    var reveal = 0;
    var box = null;

    for (i = 0; i < layout.cards.length; i += 1) {
      option = state.reward.options[i];
      if (!option) {
        continue;
      }

      box = layout.cards[i];
      reveal = getCardReveal(state, i);

      if (state.reward.mode === "relic") {
        renderRelicCard(ctx, option, box, reveal, palette);
      } else {
        G.render.ui.drawCardSlot(ctx, {
          x: box.x + (1 - reveal) * 56,
          y: box.y + (1 - reveal) * 52,
          width: box.width,
          height: box.height,
          layoutMode: "reward",
          artRole: "reward",
          cost: option.cost,
          name: option.name,
          playable: true,
          text: option.text,
          showFooterTokens: false,
          alpha: 0.18 + reveal * 0.82,
          scale: 0.94 + reveal * 0.06,
          disableBaseShadow: true,
          shadowColor: "rgba(0, 0, 0, 0.6)",
          shadowBlur: 15,
          shadowOffsetX: 0,
          shadowOffsetY: 10,
          glowColor: palette.glow,
          glowBlur: 16,
          accentStroke: palette.stroke,
          style: option.style
        });
      }
    }
  }

  function renderFooterReadable(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var note = state.reward.lastRelicChoice && state.reward.lastRelicChoice !== "放弃旧物" ?
      "旧物已取【" + state.reward.lastRelicChoice + "】，下面再挑招式。" :
      (state.reward.mode === "relic" ? "先从强敌身上翻出一样旧物，再决定要不要带走。" : "想要的就带走，不想要就把这一局余物留在原地。");

    ctx.save();
    ctx.globalAlpha = 0.34 + reveal * 0.66;
    ctx.translate((1 - reveal) * 36, (1 - reveal) * 18);
    drawRewardDecreeSurface(ctx, layout.footer.x, layout.footer.y, layout.footer.width, layout.footer.height, {
      focusX: 0.52,
      focusY: 0.74,
      textureAlpha: 0.98,
      paperWash: false,
      paperWashAlpha: 0.14
    });
    drawDarkInfoPanel(ctx, layout.footer.x + 8, layout.footer.y + 8, layout.footer.width - 16, layout.footer.height - 16, 14);
    G.render.ui.drawLabel(ctx, "战后余温", layout.footer.x + 22, layout.footer.y + 22, {
      size: 16,
      color: "#5a0000",
      shadow: false
    });
    drawWrappedText(ctx, note, layout.footer.x + 22, layout.footer.y + 36, layout.footer.width - 44, 24, {
      size: 15,
      color: "#1a1a1a",
      shadow: false,
      maxLines: 2
    });
    ctx.restore();
  }

  function renderSkipButton(ctx, state, layout) {
    var reveal = getSceneReveal(state);

    ctx.save();
    ctx.globalAlpha = 0.5 + reveal * 0.5;
    ctx.translate((1 - reveal) * 24, 0);
    G.render.ui.drawButton(ctx, {
      x: layout.skip.x,
      y: layout.skip.y,
      width: layout.skip.width,
      height: layout.skip.height,
      label: state.reward.skipLabel,
      fill: "#312628",
      stroke: "#8d7377"
    });
    ctx.restore();
  }

  function renderHeader(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var headerX = Math.round(layout.table.x + layout.table.width / 2 - layout.header.width / 2);
    var headerY = layout.header.y - (1 - reveal) * 24;
    var centerX = headerX + layout.header.width / 2;

    ctx.save();
    ctx.globalAlpha = 0.36 + reveal * 0.64;
    if (G.render.ui && typeof G.render.ui.drawPanel === "function") {
      G.render.ui.drawPanel(ctx, headerX + 86, headerY + 4, layout.header.width - 172, 82, {
        fill: "rgba(14, 12, 11, 0.44)",
        stroke: "rgba(201, 166, 118, 0.12)",
        lineWidth: 2,
        surface: "combat-overlay"
      });
    }
    G.render.ui.drawLabel(ctx, state.reward.entryNodeLabel, centerX, headerY + 16, {
      size: 15,
      align: "center",
      color: "#cfb7aa",
      shadowColor: "rgba(0, 0, 0, 0.78)",
      shadowBlur: 5,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      strokeColor: "rgba(0, 0, 0, 0.42)",
      strokeWidth: 1
    });
    G.render.ui.drawLabel(ctx, state.reward.title, centerX, headerY + 40, {
      size: 38,
      align: "center",
      color: "#e8e0ce",
      shadowColor: "rgba(0, 0, 0, 0.84)",
      shadowBlur: 6,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      strokeColor: "rgba(0, 0, 0, 0.52)",
      strokeWidth: 1.8
    });
    G.render.ui.drawLabel(ctx, state.reward.subtitle, centerX, headerY + 70, {
      size: 17,
      align: "center",
      color: "#d4c4a8",
      shadowColor: "rgba(0, 0, 0, 0.78)",
      shadowBlur: 5,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      strokeColor: "rgba(0, 0, 0, 0.44)",
      strokeWidth: 1.2
    });
    ctx.restore();
  }

  function renderSummaryPanel(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var baseX = layout.summary.x;
    var baseY = layout.summary.y + (1 - reveal) * 18;
    var killCard = state.reward.entryKillCardName || "拳脚收尾";

    ctx.save();
    ctx.globalAlpha = 0.34 + reveal * 0.66;
    ctx.translate(-(1 - reveal) * 28, 0);
    drawDarkInfoPanel(ctx, baseX + 4, baseY + 8, layout.summary.width - 8, layout.summary.height - 18, 18);
    G.render.ui.drawLabel(ctx, state.reward.trophyLabel, baseX + 22, baseY + 34, {
      size: 15,
      align: "left",
      color: "#5a0000",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, state.reward.entryVictoryTitle, baseX + 22, baseY + 82, {
      size: 30,
      color: "#1a1a1a",
      shadow: false
    });
    drawWrappedText(ctx, state.reward.entryVictorySubtitle, baseX + 22, baseY + 112, layout.summary.width - 44, 24, {
      size: 16,
      color: "#1a1a1a",
      shadow: false,
      maxLines: 3
    });

    G.render.ui.drawLabel(ctx, "遭遇", baseX + 22, baseY + 224, {
      size: 14,
      color: "#5a0000",
      shadow: false
    });
    drawWrappedText(ctx, state.reward.entryEncounterName, baseX + 22, baseY + 242, layout.summary.width - 44, 28, {
      size: 24,
      color: "#1a1a1a",
      shadow: false,
      maxLines: 2
    });

    G.render.ui.drawLabel(ctx, "收束", baseX + 22, baseY + 322, {
      size: 14,
      color: "#5a0000",
      shadow: false
    });
    drawWrappedText(ctx, state.reward.entrySummary, baseX + 22, baseY + 340, layout.summary.width - 44, 24, {
      size: 16,
      color: "#1a1a1a",
      shadow: false,
      maxLines: 4
    });

    G.render.ui.drawLabel(ctx, "致命一击", baseX + 22, baseY + 450, {
      size: 14,
      color: "#5a0000",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, killCard, baseX + 22, baseY + 476, {
      size: 22,
      color: "#1a1a1a",
      shadow: false
    });

    G.render.ui.drawLabel(ctx, "到手", baseX + 22, baseY + 496, {
      size: 14,
      color: "#5a0000",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, String(state.reward.goldAward) + " 大洋", baseX + 22, baseY + 520, {
      size: 20,
      color: "#5a0000",
      shadow: false
    });
    ctx.restore();
  }

  function renderTableFrame(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var driftX = (1 - reveal) * 64;
    var driftY = (1 - reveal) * 18;

    ctx.save();
    ctx.globalAlpha = 0.3 + reveal * 0.7;
    ctx.translate(driftX, driftY);
    drawRewardDecreeSurface(ctx, layout.table.x, layout.table.y, layout.table.width, layout.table.height, {
      focusX: 0.56,
      focusY: 0.52,
      textureAlpha: 0.98,
      paperWash: false,
      paperWashAlpha: 0.16
    });
    G.render.ui.drawLabel(ctx, state.reward.mode === "relic" ? "挑一件旧物" : "挑一式带走", layout.table.x + 26, layout.table.y + 30, {
      size: 22,
      color: "#1a1a1a"
    });
    G.render.ui.drawLabel(ctx, getChoiceCountLabel(state.reward.options.length) + "选一，留白也可以。", layout.table.x + layout.table.width - 26, layout.table.y + 30, {
      size: 15,
      align: "right",
      color: "#5b4034",
      shadow: false
    });
    ctx.restore();
  }

  function renderFooter(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var note = state.reward.lastRelicChoice && state.reward.lastRelicChoice !== "放弃旧物" ?
      "旧物已取【" + state.reward.lastRelicChoice + "】，下面再挑招式。" :
      (state.reward.mode === "relic" ? "先从强敌身上翻出一样旧物，再决定要不要带走。" : "想要的就带走，不想要就把这一局余物留在原地。");

    ctx.save();
    ctx.globalAlpha = 0.34 + reveal * 0.66;
    ctx.translate((1 - reveal) * 36, (1 - reveal) * 18);
    drawRewardDecreeSurface(ctx, layout.footer.x, layout.footer.y, layout.footer.width, layout.footer.height, {
      focusX: 0.52,
      focusY: 0.74,
      textureAlpha: 0.98,
      paperWash: false,
      paperWashAlpha: 0.14
    });
    G.render.ui.drawLabel(ctx, "战后余温", layout.footer.x + 22, layout.footer.y + 22, {
      size: 16,
      color: "#4a0e0e",
      shadow: false
    });
    drawWrappedText(ctx, note, layout.footer.x + 22, layout.footer.y + 36, layout.footer.width - 44, 24, {
      size: 15,
      color: "#4b342e",
      shadow: false,
      maxLines: 2
    });
    ctx.restore();
  }

  function renderSkipButton(ctx, state, layout) {
    var reveal = getSceneReveal(state);

    ctx.save();
    ctx.globalAlpha = 0.5 + reveal * 0.5;
    ctx.translate((1 - reveal) * 24, 0);
    drawWoodActionButton(ctx, layout.skip, state.reward.skipLabel);
    ctx.restore();
  }

  function drawRewardSectionRule(ctx, x, y, width, alpha) {
    ctx.save();
    ctx.strokeStyle = "rgba(84, 58, 37, " + (typeof alpha === "number" ? alpha : 0.2) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5);
    ctx.lineTo(x + width, y + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawRewardGroundShadow(ctx, x, y, width, height, alpha) {
    ctx.save();
    ctx.globalAlpha = typeof alpha === "number" ? alpha : 0.22;
    ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
    ctx.beginPath();
    ctx.ellipse(
      x + width / 2,
      y + height + 18,
      Math.max(44, width * 0.44),
      Math.max(14, height * 0.1),
      -0.02,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  function drawRewardCornerBrackets(ctx, x, y, width, height, alpha) {
    var length = 14;
    var strength = typeof alpha === "number" ? alpha : 0.16;

    ctx.save();
    ctx.strokeStyle = "rgba(200, 173, 136, " + strength + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 0.5);
    ctx.lineTo(x + 8 + length, y + 0.5);
    ctx.moveTo(x + 0.5, y + 8);
    ctx.lineTo(x + 0.5, y + 8 + length);

    ctx.moveTo(x + width - 8 - length, y + 0.5);
    ctx.lineTo(x + width - 8, y + 0.5);
    ctx.moveTo(x + width - 0.5, y + 8);
    ctx.lineTo(x + width - 0.5, y + 8 + length);

    ctx.moveTo(x + 8, y + height - 0.5);
    ctx.lineTo(x + 8 + length, y + height - 0.5);
    ctx.moveTo(x + 0.5, y + height - 8 - length);
    ctx.lineTo(x + 0.5, y + height - 8);

    ctx.moveTo(x + width - 8 - length, y + height - 0.5);
    ctx.lineTo(x + width - 8, y + height - 0.5);
    ctx.moveTo(x + width - 0.5, y + height - 8 - length);
    ctx.lineTo(x + width - 0.5, y + height - 8);
    ctx.stroke();
    ctx.restore();
  }

  function buildRewardFooterNote(state) {
    if (state.reward.lastRelicChoice && state.reward.lastRelicChoice !== "放弃旧物") {
      return "旧物已取「" + state.reward.lastRelicChoice + "」，下面再挑招式。";
    }

    if (state.reward.mode === "relic") {
      return "先翻强敌身上的旧物，再决定要不要带走。";
    }

    return "想要的就带走，不想要就把这一局余物留在案上。";
  }

  function renderBackgroundUnified(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var palette = getRewardPalette(state.reward.entryNodeType, state.reward.mode);
    var texturedBackground = false;
    var radial = null;
    var topFade = null;
    var edgeVignette = null;

    G.render.canvasUtils.clear(ctx, "#151214");

    ctx.save();
    ctx.filter = "blur(6px) saturate(0.88) brightness(0.74) contrast(0.98)";
    texturedBackground = !!(
      G.render.assets &&
      typeof G.render.assets.drawImageCover === "function" &&
      G.render.assets.drawImageCover(ctx, REWARD_BACKGROUND_TEXTURE_PATH, 0, 0, 1280, 720, {
        focusX: 0.5,
        focusY: 0.08,
        alpha: 0.8
      })
    );
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.08 + reveal * 0.04;
    ctx.fillStyle = "rgba(24, 18, 15, 0.72)";
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    ctx.save();
    topFade = ctx.createLinearGradient(0, 0, 0, 720);
    topFade.addColorStop(0, texturedBackground ? "rgba(8, 7, 7, 0.34)" : "rgba(40, 16, 14, 0.4)");
    topFade.addColorStop(0.22, texturedBackground ? "rgba(8, 7, 7, 0.16)" : "rgba(25, 12, 12, 0.2)");
    topFade.addColorStop(0.6, texturedBackground ? "rgba(8, 7, 7, 0.12)" : "rgba(18, 10, 10, 0.14)");
    topFade.addColorStop(1, texturedBackground ? "rgba(3, 3, 3, 0.74)" : "rgba(8, 8, 8, 0.78)");
    ctx.fillStyle = topFade;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    ctx.save();
    radial = ctx.createRadialGradient(
      layout.table.x + layout.table.width * 0.5,
      layout.table.y + layout.table.height * 0.4,
      60,
      layout.table.x + layout.table.width * 0.5,
      layout.table.y + layout.table.height * 0.44,
      540
    );
    radial.addColorStop(0, "rgba(178, 126, 86, 0.16)");
    radial.addColorStop(0.45, "rgba(91, 44, 33, 0.08)");
    radial.addColorStop(1, "rgba(12, 10, 10, 0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    ctx.save();
    edgeVignette = ctx.createRadialGradient(640, 344, 120, 640, 344, 760);
    edgeVignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    edgeVignette.addColorStop(0.52, "rgba(0, 0, 0, 0.04)");
    edgeVignette.addColorStop(0.78, "rgba(0, 0, 0, 0.12)");
    edgeVignette.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    ctx.fillStyle = edgeVignette;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.18 + reveal * 0.22;
    G.render.ui.drawPanel(ctx, 30, 22, 1220, 64, {
      surface: "dossier-dark",
      fill: "rgba(10, 12, 15, 0.56)",
      stroke: "rgba(173, 149, 116, 0.1)",
      lineWidth: 1.5,
      paperAlpha: 0.08,
      rustAlpha: 0.02
    });
    ctx.restore();

    fillRoundedPanel(
      ctx,
      layout.summary.x - 18,
      layout.summary.y - 8,
      layout.summary.width + 36,
      layout.summary.height + 20,
      24,
      "rgba(6, 8, 10, 0.8)",
      0.04 + reveal * 0.03
    );

    fillRoundedPanel(
      ctx,
      layout.table.x - 12,
      layout.table.y - 10,
      layout.table.width + 24,
      layout.table.height + 24,
      28,
      "rgba(7, 8, 11, 0.84)",
      0.05 + reveal * 0.04
    );

    fillRoundedPanel(
      ctx,
      layout.footer.x - 10,
      layout.footer.y - 8,
      layout.footer.width + 20,
      layout.footer.height + 16,
      22,
      "rgba(7, 8, 10, 0.82)",
      0.03 + reveal * 0.03
    );

    fillRoundedPanel(
      ctx,
      layout.skip.x - 8,
      layout.skip.y - 8,
      layout.skip.width + 16,
      layout.skip.height + 16,
      20,
      "rgba(7, 8, 10, 0.8)",
      0.02 + reveal * 0.02
    );

    ctx.save();
    ctx.globalAlpha = 0.16 + reveal * 0.18;
    ctx.fillStyle = "rgba(13, 11, 12, 0.92)";
    ctx.beginPath();
    ctx.moveTo(0, 482);
    ctx.bezierCurveTo(236, 404, 470, 430, 658, 448);
    ctx.bezierCurveTo(872, 470, 1068, 438, 1280, 388);
    ctx.lineTo(1280, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.12 + reveal * 0.16;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(824, 564, 334, 58, -0.02, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(196, 606, 166, 34, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function renderHeaderUnified(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var headerX = layout.header.x;
    var headerY = layout.header.y - (1 - reveal) * 12;
    var centerX = layout.table.x + layout.table.width / 2;
    var accentX = headerX + 26;
    var accentY = headerY + 18;
    var headerLine = getRewardHeaderLineClean(state);
    var nodeLabel = state.reward.entryNodeLabel || getNodeTypeLabel(state.reward.entryNodeType);
    var goldLabel = String(state.reward.goldAward || 0) + " 大洋";
    var headerGlow = null;

    ctx.save();
    ctx.globalAlpha = 0.44 + reveal * 0.56;
    G.render.ui.drawPanel(ctx, headerX, headerY + 2, layout.header.width, 66, {
      surface: "dossier-dark",
      fill: "rgba(12, 13, 16, 0.74)",
      stroke: "rgba(173, 149, 116, 0.14)",
      lineWidth: 1.5,
      paperAlpha: 0.04,
      rustAlpha: 0.01
    });
    fillRoundedPanel(ctx, headerX + 8, headerY + 10, layout.header.width - 16, 18, 10, "rgba(255, 255, 255, 0.025)", 1);
    headerGlow = ctx.createLinearGradient(0, headerY + 2, 0, headerY + 68);
    headerGlow.addColorStop(0, "rgba(255, 255, 255, 0.035)");
    headerGlow.addColorStop(0.45, "rgba(255, 255, 255, 0.01)");
    headerGlow.addColorStop(1, "rgba(0, 0, 0, 0.08)");
    ctx.fillStyle = headerGlow;
    ctx.fillRect(headerX + 2, headerY + 4, layout.header.width - 4, 62);
    drawRewardSectionRule(ctx, headerX + 18, headerY + 62, layout.header.width - 36, 0.1);
    ctx.fillStyle = "#9f4b39";
    ctx.fillRect(accentX, accentY, 2, 42);
    G.render.ui.drawLabel(ctx, state.reward.title, accentX + 16, headerY + 26, {
        size: 26,
        color: "#efe1c8",
        shadow: false
      });
    G.render.ui.drawLabel(ctx, nodeLabel, headerX + layout.header.width - 26, headerY + 22, {
      size: 12,
      align: "right",
      color: "rgba(233, 220, 196, 0.5)",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, goldLabel, headerX + layout.header.width - 26, headerY + 48, {
      size: 24,
      align: "right",
      color: "#dec48f",
      shadow: false
    });
    drawWrappedText(ctx, headerLine, centerX, headerY + 74, 420, 18, {
      size: 14,
      align: "center",
      color: "#e3d0b1",
      maxLines: 1,
      shadowColor: "rgba(0, 0, 0, 0.72)",
      shadowBlur: 4,
      shadowOffsetX: 0,
      shadowOffsetY: 0
    });
    ctx.restore();
  }

  function renderSummaryPanelUnifiedLegacy(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var baseX = layout.summary.x;
    var baseY = layout.summary.y + (1 - reveal) * 18;
    var shellHeight = layout.summary.height - 10;
    var sheetX = baseX + 20;
    var sheetY = baseY + 54;
    var sheetWidth = layout.summary.width - 40;
    var sheetHeight = layout.summary.height - 116;
    var killCard = state.reward.entryKillCardName || "拳脚收尾";

    ctx.save();
    ctx.globalAlpha = 0.34 + reveal * 0.66;
    ctx.translate(-(1 - reveal) * 24, 0);
    drawRewardGroundShadow(ctx, baseX + 10, baseY + 8, layout.summary.width - 20, shellHeight - 12, 0.16 + reveal * 0.08);
    G.render.ui.drawPanel(ctx, baseX, baseY, layout.summary.width, shellHeight, {
      surface: "dossier-dark",
      fill: "rgba(13, 15, 18, 0.76)",
      stroke: "rgba(171, 148, 115, 0.18)",
      lineWidth: 2
    });
    G.render.ui.drawPanel(ctx, baseX + 8, baseY + 8, layout.summary.width - 16, shellHeight - 18, {
      surface: "dossier-dark",
      fill: "rgba(255, 255, 255, 0.01)",
      stroke: "rgba(207, 184, 149, 0.08)",
      lineWidth: 1.2
    });
    ctx.fillStyle = "rgba(153, 67, 50, 0.72)";
    ctx.fillRect(baseX + 18, baseY + 56, 2, shellHeight - 92);
    drawRewardGroundShadow(ctx, sheetX + 6, sheetY + 6, sheetWidth - 12, sheetHeight - 14, 0.12 + reveal * 0.04);
    G.render.ui.drawPanel(ctx, sheetX, sheetY, sheetWidth, sheetHeight, {
      surface: "paper-note",
      fill: "rgba(234, 222, 198, 0.97)",
      stroke: "rgba(107, 82, 57, 0.28)",
      lineWidth: 2
    });
    ctx.fillStyle = "rgba(171, 148, 115, 0.18)";
    ctx.beginPath();
    ctx.moveTo(sheetX + sheetWidth - 18, sheetY);
    ctx.lineTo(sheetX + sheetWidth, sheetY + 18);
    ctx.lineTo(sheetX + sheetWidth - 18, sheetY + 18);
    ctx.closePath();
    ctx.fill();
    G.render.ui.drawPanel(ctx, baseX + 18, baseY + 16, 112, 26, {
      surface: "lacquer-red",
      fill: "rgba(96, 31, 27, 0.92)",
      stroke: "rgba(219, 193, 154, 0.22)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, state.reward.trophyLabel, baseX + 74, baseY + 29, {
      size: 14,
      align: "center",
      color: "#f2e8d6",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, state.reward.entryVictoryTitle, innerX, sheetY + 56, {
      size: 24,
      color: "#241912",
      shadow: false
    });
    drawWrappedText(ctx, state.reward.entryVictorySubtitle, innerX, sheetY + 82, innerWidth, 20, {
      size: 13,
      color: "#4d3929",
      shadow: false,
      maxLines: 2
    });

    drawRewardSectionRule(ctx, innerX, sheetY + 132, innerWidth, 0.18);
    G.render.ui.drawLabel(ctx, "遭遇", innerX, baseY + 210, {
      size: 14,
      color: "#7b5140",
      shadow: false
    });
    drawWrappedText(ctx, state.reward.entryEncounterName, innerX, sheetY + 174, innerWidth, 23, {
      size: 18,
      color: "#241912",
      shadow: false,
      maxLines: 2
    });

    drawRewardSectionRule(ctx, innerX, sheetY + 232, innerWidth, 0.18);
    G.render.ui.drawLabel(ctx, "收束", innerX, baseY + 328, {
      size: 14,
      color: "#7b5140",
      shadow: false
    });
    drawWrappedText(ctx, state.reward.entrySummary, innerX, sheetY + 274, innerWidth, 20, {
      size: 13,
      color: "#4d3929",
      shadow: false,
      maxLines: 3
    });

    drawRewardSectionRule(ctx, innerX, sheetY + 320, innerWidth, 0.18);
    G.render.ui.drawLabel(ctx, "致命一击", innerX, baseY + 468, {
      size: 14,
      color: "#7b5140",
      shadow: false
    });
    drawWrappedText(ctx, killCard, innerX, sheetY + 360, innerWidth - 8, 19, {
      size: 17,
      color: "#5d1913",
      shadow: false,
      maxLines: 2
    });
    G.render.ui.drawPanel(ctx, baseX + 18, goldBarY, layout.summary.width - 36, 44, {
      surface: "dossier-dark",
      fill: "rgba(22, 18, 17, 0.82)",
      stroke: "rgba(166, 142, 110, 0.16)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, "到手", innerX, baseY + 544, {
      size: 14,
      color: "#7b5140",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, String(state.reward.goldAward) + " 大洋", innerX, baseY + 566, {
      size: 20,
      color: "#5d1913",
      shadow: false
    });
    ctx.restore();
  }

  function renderTableFrameUnifiedLegacy(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var driftX = (1 - reveal) * 54;
    var driftY = (1 - reveal) * 16;

    ctx.save();
    ctx.globalAlpha = 0.32 + reveal * 0.68;
    ctx.translate(driftX, driftY);
    drawRewardGroundShadow(ctx, layout.table.x + 18, layout.table.y + 10, layout.table.width - 36, layout.table.height - 8, 0.18 + reveal * 0.08);
    G.render.ui.drawPanel(ctx, layout.table.x, layout.table.y, layout.table.width, layout.table.height, {
      surface: "dossier-dark",
      fill: "rgba(16, 14, 15, 0.72)",
      stroke: "rgba(173, 149, 116, 0.16)",
      lineWidth: 2,
      paperAlpha: 0.08,
      rustAlpha: 0.03
    });
    ctx.save();
    traceRoundedPanelPath(ctx, layout.table.x + 10, layout.table.y + 12, layout.table.width - 20, layout.table.height - 24, 18);
    ctx.clip();
    var stageGradient = ctx.createLinearGradient(0, layout.table.y, 0, layout.table.y + layout.table.height);
    stageGradient.addColorStop(0, "rgba(255, 255, 255, 0.035)");
    stageGradient.addColorStop(0.34, "rgba(255, 255, 255, 0.01)");
    stageGradient.addColorStop(0.78, "rgba(0, 0, 0, 0.08)");
    stageGradient.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    ctx.fillStyle = stageGradient;
    ctx.fillRect(layout.table.x, layout.table.y, layout.table.width, layout.table.height);
    ctx.restore();
    G.render.ui.drawPanel(ctx, layout.table.x + 20, layout.table.y + 14, 160, 28, {
      surface: "lacquer-red",
      fill: "rgba(94, 30, 26, 0.9)",
      stroke: "rgba(219, 193, 154, 0.24)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, state.reward.mode === "relic" ? "挑一件旧物" : "挑一式带走", layout.table.x + 100, layout.table.y + 28, {
      size: 18,
      align: "center",
      color: "#f0e7d6",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, getChoiceCountLabel(state.reward.options.length) + "选一，留白也可以。", layout.table.x + layout.table.width - 26, layout.table.y + 30, {
      size: 14,
      align: "right",
      color: "#d4c2a3",
      shadow: false
    });
    drawRewardSectionRule(ctx, layout.table.x + 24, layout.table.y + 54, layout.table.width - 48, 0.12);
    ctx.restore();
  }

  function renderRelicCardUnifiedLegacy(ctx, option, box, reveal, palette) {
    var x = box.x + (1 - reveal) * 34;
    var y = box.y + (1 - reveal) * 28;
    var width = box.width;
    var height = box.height;

    ctx.save();
    ctx.globalAlpha = 0.16 + reveal * 0.84;
    drawRewardGroundShadow(ctx, x + 8, y + 4, width - 16, height - 12, 0.16 + reveal * 0.08);
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(0.95 + reveal * 0.05, 0.95 + reveal * 0.05);
    ctx.translate(-width / 2, -height / 2);

    G.render.ui.drawPanel(ctx, 0, 0, width, height, {
      surface: "paper-note",
      fill: "rgba(236, 223, 196, 0.98)",
      stroke: "rgba(111, 82, 53, 0.34)",
      lineWidth: 2
    });
    G.render.ui.drawPanel(ctx, 14, 14, width - 28, 38, {
      surface: "lacquer-red",
      fill: palette && palette.ribbon ? palette.ribbon : "rgba(92, 31, 27, 0.9)",
      stroke: "rgba(219, 193, 154, 0.24)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, option.icon || "物", 38, 34, {
      size: 24,
      align: "center",
      color: "#f1e8d8",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, option.name, width / 2 + 8, 34, {
      size: 19,
      align: "center",
      color: "#f1e8d8",
      shadow: false
    });
    drawRewardSectionRule(ctx, 18, 70, width - 36, 0.16);
    drawWrappedText(ctx, option.description, 20, 86, width - 40, 22, {
      size: 15,
      color: "#34271d",
      shadow: false,
      maxLines: 4
    });
    G.render.ui.drawLabel(ctx, "旧物", width - 18, height - 16, {
      size: 12,
      align: "right",
      color: "#725745",
      shadow: false
    });
    ctx.restore();
  }

  function renderCardsUnifiedLegacy(ctx, state, layout) {
    var palette = getRewardPalette(state.reward.entryNodeType, state.reward.mode);
    var i = 0;
    var option = null;
    var reveal = 0;
    var box = null;
    var cardCount = state.reward.options.length;
    var centerFocus = false;
    var x = 0;
    var y = 0;
    var scale = 1;
    var shadowAlpha = 0;

    for (i = 0; i < layout.cards.length; i += 1) {
      option = state.reward.options[i];
      if (!option) {
        continue;
      }

      box = layout.cards[i];
      reveal = getCardReveal(state, i);
      centerFocus = cardCount === 3 && i === 1;
      x = box.x + (1 - reveal) * 36;
      y = box.y + (1 - reveal) * 34 - (centerFocus ? 12 * reveal : 0);
      scale = (0.95 + reveal * 0.05) * (centerFocus ? 1.04 : 1);
      shadowAlpha = (0.08 + reveal * 0.12) * (centerFocus ? 1.26 : 1);

      if (state.reward.mode === "relic") {
        renderRelicCardUnified(ctx, option, box, reveal, palette);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = shadowAlpha;
      ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
      ctx.beginPath();
      ctx.ellipse(
        x + box.width / 2,
        y + box.height + 18 + (1 - reveal) * 8,
        Math.max(42, box.width * (centerFocus ? 0.42 : 0.38)),
        centerFocus ? 18 : 16,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      G.render.ui.drawCardSlot(ctx, {
        x: x,
        y: y,
        width: box.width,
        height: box.height,
        layoutMode: "reward",
        artRole: "reward",
        cost: option.cost,
        name: option.name,
        playable: true,
        text: option.text,
        showFooterTokens: false,
        alpha: 0.18 + reveal * 0.82,
        scale: scale,
        disableBaseShadow: true,
        shadowColor: "rgba(0, 0, 0, 0.6)",
        shadowBlur: centerFocus ? 20 : 15,
        shadowOffsetX: 0,
        shadowOffsetY: centerFocus ? 12 : 10,
        glowColor: palette.glow,
        glowBlur: centerFocus ? 18 : 12,
        accentStroke: palette.stroke,
        style: option.style,
        sourceCard: option
      });
    }
  }

  function renderFooterUnified(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var encounter = getRewardFooterEncounterClean(state);
    var note = getRewardFooterNoteClean(state);
    var leftLabelX = layout.footer.x + 20;
    var leftContentX = layout.footer.x + 108;
    var splitX = layout.footer.x + 308;
    var rightLabelX = splitX + 20;
    var rightContentX = splitX + 108;
    var footerGlow = null;

    ctx.save();
    ctx.globalAlpha = 0.36 + reveal * 0.64;
    ctx.translate((1 - reveal) * 28, (1 - reveal) * 12);
    drawRewardGroundShadow(ctx, layout.footer.x + 12, layout.footer.y + 4, layout.footer.width - 24, layout.footer.height - 10, 0.14 + reveal * 0.08);
    G.render.ui.drawPanel(ctx, layout.footer.x, layout.footer.y, layout.footer.width, layout.footer.height, {
      surface: "dossier-dark",
      fill: "rgba(14, 13, 14, 0.86)",
      stroke: "rgba(166, 142, 110, 0.18)",
      lineWidth: 2
    });
    footerGlow = ctx.createLinearGradient(0, layout.footer.y, 0, layout.footer.y + layout.footer.height);
    footerGlow.addColorStop(0, "rgba(255, 255, 255, 0.045)");
    footerGlow.addColorStop(0.55, "rgba(255, 255, 255, 0.01)");
    footerGlow.addColorStop(1, "rgba(0, 0, 0, 0.12)");
    ctx.fillStyle = footerGlow;
    ctx.fillRect(layout.footer.x + 2, layout.footer.y + 2, layout.footer.width - 4, layout.footer.height - 4);
    ctx.fillStyle = "rgba(153, 67, 50, 0.72)";
    ctx.fillRect(layout.footer.x + 18, layout.footer.y + 18, 2, layout.footer.height - 36);
    drawRewardSectionRule(ctx, layout.footer.x + 28, layout.footer.y + 18, layout.footer.width - 56, 0.08);
    G.render.ui.drawPanel(ctx, leftLabelX - 4, layout.footer.y + 14, 72, 26, {
      surface: "lacquer-red",
      fill: "rgba(86, 29, 25, 0.42)",
      stroke: "rgba(219, 193, 154, 0.14)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, "战后余温", layout.footer.x + 75, layout.footer.y + 27, {
      size: 14,
      align: "center",
      color: "rgba(0, 0, 0, 0)",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, "\u6765\u8def", leftLabelX + 32, layout.footer.y + 27, {
      size: 14,
      align: "center",
      color: "#eadfcb",
      shadow: false
    });
    drawWrappedText(ctx, encounter, leftContentX, layout.footer.y + 24, splitX - leftContentX - 16, 21, {
      size: 15,
      color: "#e4d6c0",
      shadowColor: "rgba(0, 0, 0, 0.52)",
      shadowBlur: 1,
      shadowOffsetX: 0,
      shadowOffsetY: 1,
      maxLines: 2
    });
    ctx.fillStyle = "rgba(192, 166, 132, 0.14)";
    ctx.fillRect(splitX, layout.footer.y + 14, 1, layout.footer.height - 28);
    G.render.ui.drawPanel(ctx, rightLabelX - 4, layout.footer.y + 14, 72, 26, {
      surface: "lacquer-red",
      fill: "rgba(86, 29, 25, 0.32)",
      stroke: "rgba(219, 193, 154, 0.12)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, "\u773c\u4e0b", rightLabelX + 32, layout.footer.y + 27, {
      size: 14,
      align: "center",
      color: "#eadfcb",
      shadow: false
    });
    drawWrappedText(ctx, note, rightContentX, layout.footer.y + 24, layout.footer.x + layout.footer.width - rightContentX - 24, 21, {
      size: 15,
      color: "#e4d6c0",
      shadowColor: "rgba(0, 0, 0, 0.52)",
      shadowBlur: 1,
      shadowOffsetX: 0,
      shadowOffsetY: 1,
      maxLines: 2
    });
    ctx.restore();
  }

  function renderSummaryPanelUnified(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var baseX = layout.summary.x;
    var baseY = layout.summary.y + (1 - reveal) * 18;
    var shellHeight = layout.summary.height - 10;
    var sheetX = baseX + 20;
    var sheetY = baseY + 54;
    var sheetWidth = layout.summary.width - 40;
    var sheetHeight = layout.summary.height - 116;
    var innerX = sheetX + 18;
    var innerWidth = sheetWidth - 36;
    var killCard = state.reward.entryKillCardName || "\u62ac\u8116\u5b50";

    ctx.save();
    ctx.globalAlpha = 0.34 + reveal * 0.66;
    ctx.translate(-(1 - reveal) * 24, 0);
    drawRewardGroundShadow(ctx, baseX + 10, baseY + 8, layout.summary.width - 20, shellHeight - 12, 0.16 + reveal * 0.08);
    G.render.ui.drawPanel(ctx, baseX, baseY, layout.summary.width, shellHeight, {
      surface: "dossier-dark",
      fill: "rgba(11, 13, 16, 0.86)",
      stroke: "rgba(171, 148, 115, 0.2)",
      lineWidth: 2
    });
    fillRoundedPanel(
      ctx,
      baseX + 8,
      baseY + 8,
      layout.summary.width - 16,
      shellHeight - 18,
      18,
      "rgba(255, 255, 255, 0.03)",
      1
    );
    drawRewardGroundShadow(ctx, sheetX + 6, sheetY + 6, sheetWidth - 12, sheetHeight - 14, 0.1 + reveal * 0.04);
    G.render.ui.drawPanel(ctx, sheetX, sheetY, sheetWidth, sheetHeight, {
      surface: "paper-note",
      fill: "rgba(234, 222, 198, 0.97)",
      stroke: "rgba(107, 82, 57, 0.28)",
      lineWidth: 2
    });
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.024)";
    ctx.fillRect(sheetX + 2, sheetY + 2, sheetWidth - 4, 24);
    ctx.fillStyle = "rgba(152, 67, 50, 0.14)";
    ctx.fillRect(sheetX + 12, sheetY + 18, 2, sheetHeight - 36);
    ctx.beginPath();
    ctx.moveTo(sheetX + sheetWidth - 24, sheetY + 2);
    ctx.lineTo(sheetX + sheetWidth - 2, sheetY + 2);
    ctx.lineTo(sheetX + sheetWidth - 2, sheetY + 24);
    ctx.closePath();
    ctx.fillStyle = "rgba(214, 198, 171, 0.58)";
    ctx.fill();
    ctx.strokeStyle = "rgba(125, 96, 66, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    G.render.ui.drawPanel(ctx, baseX + 18, baseY + 16, 112, 26, {
      surface: "lacquer-red",
      fill: "rgba(96, 31, 27, 0.92)",
      stroke: "rgba(219, 193, 154, 0.22)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, state.reward.trophyLabel, baseX + 74, baseY + 29, {
      size: 14,
      align: "center",
      color: "#f2e8d6",
      shadow: false
    });
    drawRewardSectionRule(ctx, innerX, sheetY + 64, innerWidth, 0.18);
    G.render.ui.drawLabel(ctx, getRewardSectionLabelClean("summary"), innerX, sheetY + 84, {
      size: 13,
      color: "#7b5140",
      shadow: false
    });
    drawWrappedText(ctx, state.reward.entrySummary, innerX, sheetY + 106, innerWidth, 20, {
      size: 13,
      color: "#4d3929",
      shadow: false,
      maxLines: 6
    });

    drawRewardSectionRule(ctx, innerX, sheetY + 238, innerWidth, 0.18);
    G.render.ui.drawLabel(ctx, getRewardSectionLabelClean("kill"), innerX, sheetY + 258, {
      size: 13,
      color: "#7b5140",
      shadow: false
    });
    drawWrappedText(ctx, killCard, innerX, sheetY + 280, innerWidth - 8, 19, {
      size: 17,
      color: "#5d1913",
      shadow: false,
      maxLines: 4
    });
    ctx.restore();
  }

  function renderTableFrameUnifiedLegacy(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var driftX = (1 - reveal) * 54;
    var driftY = (1 - reveal) * 16;
    var cardBayY = layout.table.y + 74;
    var cardBayHeight = layout.table.height - 114;
    var stageGradient = null;
    var glow = null;
    var choiceCopy = state.reward.mode === "relic" ? "旧物里挑一件" : "看中的就带走";
    var noteCopy = state.reward.mode === "relic" ? "合用的带走，嫌脏就留在原地。" : "合用的带走，用不上就留在这。";

    ctx.save();
    ctx.globalAlpha = 0.32 + reveal * 0.68;
    ctx.translate(driftX, driftY);
    drawRewardGroundShadow(ctx, layout.table.x + 16, layout.table.y + 12, layout.table.width - 32, layout.table.height - 18, 0.18 + reveal * 0.08);
    G.render.ui.drawPanel(ctx, layout.table.x, layout.table.y, layout.table.width, layout.table.height, {
      surface: "dossier-dark",
      fill: "rgba(14, 15, 18, 0.68)",
      stroke: "rgba(173, 149, 116, 0.12)",
      lineWidth: 2,
      paperAlpha: 0.06,
      rustAlpha: 0.03
    });
    ctx.save();
    traceRoundedPanelPath(ctx, layout.table.x + 10, layout.table.y + 12, layout.table.width - 20, layout.table.height - 24, 18);
    ctx.clip();
    stageGradient = ctx.createLinearGradient(0, layout.table.y, 0, layout.table.y + layout.table.height);
    stageGradient.addColorStop(0, "rgba(255, 255, 255, 0.035)");
    stageGradient.addColorStop(0.28, "rgba(255, 255, 255, 0.012)");
    stageGradient.addColorStop(0.7, "rgba(0, 0, 0, 0.12)");
    stageGradient.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    ctx.fillStyle = stageGradient;
    ctx.fillRect(layout.table.x, layout.table.y, layout.table.width, layout.table.height);
    glow = ctx.createRadialGradient(
      layout.table.x + layout.table.width * 0.5,
      layout.table.y + 162,
      36,
      layout.table.x + layout.table.width * 0.5,
      layout.table.y + 198,
      320
    );
    glow.addColorStop(0, "rgba(231, 197, 137, 0.12)");
    glow.addColorStop(0.4, state.reward.mode === "relic" ? "rgba(150, 170, 195, 0.075)" : "rgba(164, 76, 52, 0.1)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(layout.table.x, layout.table.y, layout.table.width, layout.table.height);
    ctx.strokeStyle = "rgba(183, 159, 126, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(layout.table.x + layout.table.width * 0.52, layout.table.y + layout.table.height * 0.52, 176, 112, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(layout.table.x + layout.table.width * 0.52, layout.table.y + layout.table.height * 0.52, 116, 72, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(layout.table.x, layout.table.y + layout.table.height - 92, layout.table.width, 92);
    ctx.restore();
    ctx.save();
    traceRoundedPanelPath(ctx, layout.table.x + 24, cardBayY, layout.table.width - 48, cardBayHeight, 20);
    ctx.strokeStyle = "rgba(192, 170, 136, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.012)";
    ctx.fillRect(layout.table.x + 24, cardBayY, layout.table.width - 48, 30);
    ctx.restore();
    G.render.ui.drawPanel(ctx, layout.table.x + 20, layout.table.y + 14, 160, 28, {
      surface: "lacquer-red",
      fill: "rgba(94, 30, 26, 0.9)",
      stroke: "rgba(219, 193, 154, 0.24)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, choiceCopy, layout.table.x + 100, layout.table.y + 28, {
      size: 18,
      align: "center",
      color: "#f0e7d6",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, noteCopy, layout.table.x + layout.table.width - 26, layout.table.y + 29, {
      size: 13,
      align: "right",
      color: "#d4c2a3",
      shadow: false
    });
    drawRewardSectionRule(ctx, layout.table.x + 24, layout.table.y + 54, layout.table.width - 48, 0.12);
    ctx.restore();
  }

  function renderRelicCardUnified(ctx, option, box, reveal, palette) {
    var x = box.x;
    var y = box.y;
    var width = box.width;
    var height = box.height;
    var scale = box.scale || (0.95 + reveal * 0.05);
    var rotation = box.rotation || 0;
    var shadowAlpha = box.shadowAlpha || (0.16 + reveal * 0.84);

    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    drawRewardGroundShadow(ctx, x + 8, y + 4, width - 16, height - 12, 0.15 + reveal * 0.1);
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    G.render.ui.drawPanel(ctx, 0, 0, width, height, {
      surface: "paper-note",
      fill: "rgba(236, 223, 196, 0.98)",
      stroke: "rgba(111, 82, 53, 0.34)",
      lineWidth: 2
    });
    G.render.ui.drawPanel(ctx, 14, 14, width - 28, 38, {
      surface: "lacquer-red",
      fill: palette && palette.ribbon ? palette.ribbon : "rgba(92, 31, 27, 0.9)",
      stroke: "rgba(219, 193, 154, 0.24)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, option.icon || "\u7269", 38, 34, {
      size: 24,
      align: "center",
      color: "#f1e8d8",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, option.name, width / 2 + 8, 34, {
      size: 19,
      align: "center",
      color: "#f1e8d8",
      shadow: false
    });
    drawRewardSectionRule(ctx, 18, 70, width - 36, 0.16);
    drawWrappedText(ctx, option.description, 20, 86, width - 40, 22, {
      size: 15,
      color: "#34271d",
      shadow: false,
      maxLines: 4
    });
    G.render.ui.drawLabel(ctx, "\u65e7\u7269", width - 18, height - 16, {
      size: 12,
      align: "right",
      color: "#725745",
      shadow: false
    });
    ctx.restore();
  }

  function renderCardsUnified(ctx, state, layout) {
    var palette = getRewardPalette(state.reward.entryNodeType, state.reward.mode);
    var cardCount = state.reward.options.length;
    var i = 0;
    var option = null;
    var box = null;
    var reveal = 0;
    var centerFocus = false;
    var x = 0;
    var y = 0;
    var scale = 1;
    var shadowAlpha = 0;
    var rotation = 0;
    var renderBox = null;

    for (i = 0; i < layout.cards.length; i += 1) {
      option = state.reward.options[i];
      if (!option) {
        continue;
      }

      box = layout.cards[i];
      reveal = getCardReveal(state, i);
      centerFocus = cardCount === 3 && i === 1;
      x = box.x + (1 - reveal) * 36;
      y = box.y + (1 - reveal) * 34;
      scale = (0.95 + reveal * 0.05) * (centerFocus ? 1.06 : 1);
      shadowAlpha = (0.08 + reveal * 0.12) * (centerFocus ? 1.34 : 1);
      if (cardCount === 3) {
        rotation = i === 0 ? -0.028 * reveal : (i === 2 ? 0.028 * reveal : 0);
      } else {
        rotation = (-0.03 + i * 0.02) * reveal;
      }

      renderBox = {
        x: x,
        y: y,
        width: box.width,
        height: box.height,
        scale: scale,
        rotation: rotation,
        shadowAlpha: 0.16 + reveal * 0.72
      };

      if (state.reward.mode === "relic") {
        renderRelicCardUnified(ctx, option, renderBox, reveal, palette);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = shadowAlpha;
      ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
      ctx.beginPath();
      ctx.ellipse(
        x + box.width / 2,
        y + box.height + 18 + (1 - reveal) * 8,
        Math.max(42, box.width * (centerFocus ? 0.42 : 0.38)),
        centerFocus ? 18 : 16,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x + box.width / 2, y + box.height / 2);
      ctx.rotate(rotation);
      ctx.translate(-box.width / 2, -box.height / 2);
      G.render.ui.drawCardSlot(ctx, {
        x: 0,
        y: 0,
        width: box.width,
        height: box.height,
        layoutMode: "detail",
        artRole: "reward",
        cost: option.cost,
        name: option.name,
        playable: true,
        text: option.text,
        showFooterTokens: false,
        alpha: 0.18 + reveal * 0.82,
        scale: scale,
        disableBaseShadow: true,
        shadowColor: "rgba(0, 0, 0, 0.6)",
        shadowBlur: centerFocus ? 22 : 15,
        shadowOffsetX: 0,
        shadowOffsetY: centerFocus ? 14 : 10,
        glowColor: palette.glow,
        glowBlur: centerFocus ? 20 : 12,
        accentStroke: palette.stroke,
        style: option.style,
        sourceCard: option
      });
      ctx.restore();
    }
  }

  function renderSkipButtonUnifiedLegacy(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var subtitle = state.reward.mode === "relic" ? "直接进下一栏" : "空手离开";

    ctx.save();
    ctx.globalAlpha = 0.52 + reveal * 0.48;
    ctx.translate((1 - reveal) * 18, 0);
    G.render.ui.drawButton(ctx, {
      x: layout.skip.x,
      y: layout.skip.y,
      width: layout.skip.width,
      height: layout.skip.height,
      label: state.reward.skipLabel,
      subtitle: subtitle,
      fill: "#462c22",
      stroke: "#c29a6d"
    });
    ctx.restore();
  }

  function renderSkipButtonUnified(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var subtitle = getRewardSkipSubtitleClean(state.reward.mode);

    ctx.save();
    ctx.globalAlpha = 0.52 + reveal * 0.48;
    ctx.translate((1 - reveal) * 18, 0);
    G.render.ui.drawButton(ctx, {
      x: layout.skip.x,
      y: layout.skip.y,
      width: layout.skip.width,
      height: layout.skip.height,
      label: state.reward.skipLabel,
      subtitle: subtitle,
      fill: "#3b291f",
      stroke: "#b18e66"
    });
    ctx.restore();
  }

  function renderTableFrameUnified(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var driftX = (1 - reveal) * 54;
    var driftY = (1 - reveal) * 16;
    var cardBayY = layout.table.y + 74;
    var cardBayHeight = layout.table.height - 114;
    var stageGradient = null;
    var glow = null;
    var choiceCopy = getRewardTableTitleClean(state.reward.mode);
    var noteCopy = getRewardTableHintClean(state.reward.mode);
    var usedStagePlate = false;
    var chipX = layout.table.x + 18;
    var chipWidth = 176;

    ctx.save();
    ctx.globalAlpha = 0.32 + reveal * 0.68;
    ctx.translate(driftX, driftY);
    drawRewardGroundShadow(ctx, layout.table.x + 16, layout.table.y + 12, layout.table.width - 32, layout.table.height - 18, 0.18 + reveal * 0.08);
    G.render.ui.drawPanel(ctx, layout.table.x, layout.table.y, layout.table.width, layout.table.height, {
      surface: "dossier-dark",
      fill: "rgba(12, 13, 16, 0.86)",
      stroke: "rgba(173, 149, 116, 0.16)",
      lineWidth: 2,
      paperAlpha: 0.05,
      rustAlpha: 0.03
    });
    ctx.save();
    traceRoundedPanelPath(ctx, layout.table.x + 10, layout.table.y + 12, layout.table.width - 20, layout.table.height - 24, 18);
    ctx.clip();
    usedStagePlate = drawClippedTexture(
      ctx,
      REWARD_STAGE_PLINTH_TEXTURE_PATH,
      layout.table.x + 6,
      layout.table.y + 6,
      layout.table.width - 12,
      layout.table.height - 12,
      {
        focusX: 0.5,
        focusY: 0.54,
        alpha: 0.92
      }
    );
    if (usedStagePlate) {
      fillRoundedPanel(ctx, layout.table.x + 8, layout.table.y + 8, layout.table.width - 16, layout.table.height - 16, 18, "rgba(8, 9, 11, 0.14)", 1);
      fillRoundedPanel(ctx, layout.table.x + 30, layout.table.y + 54, layout.table.width - 60, layout.table.height - 110, 20, "rgba(18, 13, 11, 0.12)", 1);
      stageGradient = ctx.createLinearGradient(layout.table.x, 0, layout.table.x + layout.table.width, 0);
      stageGradient.addColorStop(0, "rgba(12, 10, 10, 0.28)");
      stageGradient.addColorStop(0.14, "rgba(12, 10, 10, 0.08)");
      stageGradient.addColorStop(0.86, "rgba(12, 10, 10, 0.08)");
      stageGradient.addColorStop(1, "rgba(12, 10, 10, 0.28)");
      ctx.fillStyle = stageGradient;
      ctx.fillRect(layout.table.x + 6, layout.table.y + 8, layout.table.width - 12, layout.table.height - 16);
    } else {
      stageGradient = ctx.createLinearGradient(0, layout.table.y, 0, layout.table.y + layout.table.height);
      stageGradient.addColorStop(0, "rgba(255, 255, 255, 0.028)");
      stageGradient.addColorStop(0.2, "rgba(255, 255, 255, 0.01)");
      stageGradient.addColorStop(0.54, "rgba(0, 0, 0, 0.08)");
      stageGradient.addColorStop(1, "rgba(0, 0, 0, 0.28)");
      ctx.fillStyle = stageGradient;
      ctx.fillRect(layout.table.x, layout.table.y, layout.table.width, layout.table.height);
      glow = ctx.createRadialGradient(
        layout.table.x + layout.table.width * 0.5,
        layout.table.y + 162,
        36,
        layout.table.x + layout.table.width * 0.5,
        layout.table.y + 198,
        320
      );
      glow.addColorStop(0, "rgba(231, 197, 137, 0.1)");
      glow.addColorStop(0.4, state.reward.mode === "relic" ? "rgba(150, 170, 195, 0.06)" : "rgba(164, 76, 52, 0.08)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(layout.table.x, layout.table.y, layout.table.width, layout.table.height);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(layout.table.x, layout.table.y + layout.table.height - 92, layout.table.width, 92);
    ctx.restore();
    ctx.save();
    traceRoundedPanelPath(ctx, layout.table.x + 12, layout.table.y + 14, layout.table.width - 24, layout.table.height - 28, 18);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    traceRoundedPanelPath(ctx, layout.table.x + 24, cardBayY, layout.table.width - 48, cardBayHeight, 20);
    ctx.clip();
    if (!usedStagePlate) {
      stageGradient = ctx.createLinearGradient(0, cardBayY, 0, cardBayY + cardBayHeight);
      stageGradient.addColorStop(0, "rgba(46, 31, 25, 0.18)");
      stageGradient.addColorStop(0.18, "rgba(26, 18, 17, 0.08)");
      stageGradient.addColorStop(0.58, "rgba(10, 10, 11, 0.14)");
      stageGradient.addColorStop(1, "rgba(0, 0, 0, 0.24)");
      ctx.fillStyle = stageGradient;
      ctx.fillRect(layout.table.x + 24, cardBayY, layout.table.width - 48, cardBayHeight);
      glow = ctx.createRadialGradient(
        layout.table.x + layout.table.width * 0.5,
        cardBayY + 84,
        20,
        layout.table.x + layout.table.width * 0.5,
        cardBayY + 114,
        280
      );
      glow.addColorStop(0, "rgba(230, 198, 146, 0.14)");
      glow.addColorStop(0.46, "rgba(123, 73, 49, 0.08)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(layout.table.x + 24, cardBayY, layout.table.width - 48, cardBayHeight);
    } else {
      fillRoundedPanel(ctx, layout.table.x + 24, cardBayY, layout.table.width - 48, cardBayHeight, 20, "rgba(10, 8, 8, 0.14)", 1);
      glow = ctx.createRadialGradient(
        layout.table.x + layout.table.width * 0.5,
        cardBayY + 108,
        24,
        layout.table.x + layout.table.width * 0.5,
        cardBayY + 132,
        240
      );
      glow.addColorStop(0, "rgba(214, 188, 140, 0.08)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(layout.table.x + 24, cardBayY, layout.table.width - 48, cardBayHeight);
      stageGradient = ctx.createLinearGradient(layout.table.x + 24, 0, layout.table.x + layout.table.width - 24, 0);
      stageGradient.addColorStop(0, "rgba(12, 10, 10, 0.26)");
      stageGradient.addColorStop(0.16, "rgba(12, 10, 10, 0.06)");
      stageGradient.addColorStop(0.84, "rgba(12, 10, 10, 0.06)");
      stageGradient.addColorStop(1, "rgba(12, 10, 10, 0.26)");
      ctx.fillStyle = stageGradient;
      ctx.fillRect(layout.table.x + 24, cardBayY, layout.table.width - 48, cardBayHeight);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.018)";
    ctx.fillRect(layout.table.x + 24, cardBayY, layout.table.width - 48, 24);
    ctx.restore();
    ctx.save();
    traceRoundedPanelPath(ctx, layout.table.x + 24, cardBayY, layout.table.width - 48, cardBayHeight, 20);
    ctx.strokeStyle = "rgba(192, 170, 136, 0.09)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    G.render.ui.drawPanel(ctx, chipX, layout.table.y + 18, chipWidth, 28, {
      surface: "lacquer-red",
      fill: "rgba(94, 30, 26, 0.9)",
      stroke: "rgba(219, 193, 154, 0.24)",
      lineWidth: 2
    });
    drawTrackedLabel(ctx, choiceCopy, chipX + chipWidth / 2, layout.table.y + 32, 0.3, {
      size: 15,
      weight: "650",
      align: "center",
      baseline: "middle",
      color: "#eadfce",
      shadow: false,
      fontFamily: getRewardBodyFontFamily()
    });
    G.render.ui.drawLabel(ctx, noteCopy, layout.table.x + layout.table.width - 26, layout.table.y + 29, {
      size: 13,
      align: "right",
      color: "#d4c2a3",
      shadow: false
    });
    drawRewardSectionRule(ctx, layout.table.x + 24, layout.table.y + 54, layout.table.width - 48, 0.12);
    ctx.restore();
  }

  function drawRewardLedgerLabel(ctx, label, x, y, color) {
    G.render.ui.drawLabel(ctx, label, x, y, {
      size: 13,
      weight: "550",
      color: color,
      shadow: false,
      fontFamily: getRewardReadableFontFamily()
    });
  }

  function drawRewardSidebarStackRow(ctx, centerX, topY, label, value, options) {
    var opts = options || {};

    G.render.ui.drawLabel(ctx, label, centerX, topY, {
      size: opts.labelSize || 18,
      align: "center",
      color: opts.labelColor || "#7f6951",
      shadow: false,
      fontFamily: getRewardReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, value, centerX, topY + 38, {
      size: opts.valueSize || 38,
      align: "center",
      color: opts.valueColor || "#2a2018",
      weight: "700",
      shadow: false,
      fontFamily: opts.valueFontFamily || getRewardReadableFontFamily()
    });

    if (opts.subvalue) {
      G.render.ui.drawLabel(ctx, opts.subvalue, centerX, topY + 70, {
        size: 14,
        align: "center",
        color: opts.subvalueColor || "#9a8466",
        shadow: false,
        fontFamily: getRewardReadableFontFamily()
      });
    }
  }

  function drawRewardLedgerNumberUnit(ctx, numberText, unitText, rightX, y, options) {
    var opts = options || {};
    var fontFamily = opts.fontFamily || getRewardReadableFontFamily();
    var unitWidth = measureRewardTextWidth(ctx, unitText, opts.unitSize || 14, opts.unitWeight || "600", fontFamily);

    G.render.ui.drawLabel(ctx, unitText, rightX, y + (typeof opts.unitOffsetY === "number" ? opts.unitOffsetY : 6), {
      size: opts.unitSize || 14.5,
      align: "right",
      weight: opts.unitWeight || "600",
      color: opts.unitColor || "#6c5330",
      shadow: false,
      fontFamily: fontFamily,
      opticalCenter: true
    });
    G.render.ui.drawLabel(ctx, numberText, rightX - unitWidth - (typeof opts.gap === "number" ? opts.gap : 7), y, {
      size: opts.numberSize || 30,
      align: "right",
      weight: opts.numberWeight || "700",
      color: opts.numberColor || "#1a1410",
      shadow: false,
      fontFamily: fontFamily,
      opticalCenter: true
    });
  }

  function drawRewardLedgerHpValue(ctx, currentHp, maxHp, rightX, y) {
    var fontFamily = getRewardReadableFontFamily();
    var suffixText = "/ " + maxHp;
    var suffixWidth = measureRewardTextWidth(ctx, suffixText, 15, "600", fontFamily);

    G.render.ui.drawLabel(ctx, suffixText, rightX, y + 5, {
      size: 15,
      align: "right",
      weight: "600",
      color: "rgba(49, 36, 28, 0.64)",
      shadow: false,
      fontFamily: fontFamily,
      opticalCenter: true
    });
    G.render.ui.drawLabel(ctx, currentHp, rightX - suffixWidth - 8, y, {
      size: 32,
      align: "right",
      weight: "700",
      color: "#653b34",
      shadow: false,
      fontFamily: fontFamily,
      opticalCenter: true
    });
  }

  function drawRewardHeaderGoldValue(ctx, amount, rightX, y) {
    var fontFamily = getRewardBodyFontFamily();
    var unitText = "大洋";
    var unitWidth = measureRewardTextWidth(ctx, unitText, 14, "600", fontFamily);

    G.render.ui.drawLabel(ctx, unitText, rightX, y + 1, {
      size: 14,
      align: "right",
      weight: "600",
      color: "rgba(196, 170, 123, 0.78)",
      shadow: false,
      fontFamily: fontFamily,
      opticalCenter: true
    });
    G.render.ui.drawLabel(ctx, amount, rightX - unitWidth - 8, y, {
      size: 28,
      align: "right",
      weight: "700",
      color: "#d7ad67",
      shadow: false,
      fontFamily: fontFamily,
      opticalCenter: true
    });
  }

  function drawRewardSidebarTagPlate(ctx, x, y, width, height, label) {
    G.render.ui.drawPanel(ctx, x, y, width, height, {
      surface: "lacquer-red",
      fill: "rgba(94, 30, 26, 0.9)",
      stroke: "rgba(219, 193, 154, 0.24)",
      lineWidth: 2
    });
    drawTrackedLabel(ctx, label, x + width / 2, y + height / 2 + 1, 0.25, {
      size: 13,
      weight: "650",
      align: "center",
      baseline: "middle",
      color: "#eadfce",
      shadow: false,
      fontFamily: getRewardBodyFontFamily()
    });
  }

  function renderHeaderUnifiedRefined(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var headerX = layout.header.x;
    var headerY = layout.header.y - (1 - reveal) * 12;
    var accentX = headerX + 26;
    var accentY = headerY + 18;
    var trophyLabel = state.reward.trophyLabel || getRewardTrophyLabelClean(state.reward.mode);
    var headerGlow = null;

    ctx.save();
    ctx.globalAlpha = 0.44 + reveal * 0.56;
    G.render.ui.drawPanel(ctx, headerX, headerY + 2, layout.header.width, 66, {
      surface: "dossier-dark",
      fill: "rgba(12, 13, 16, 0.74)",
      stroke: "rgba(173, 149, 116, 0.14)",
      lineWidth: 1.5,
      paperAlpha: 0.04,
      rustAlpha: 0.01
    });
    fillRoundedPanel(ctx, headerX + 8, headerY + 10, layout.header.width - 16, 18, 10, "rgba(255, 255, 255, 0.025)", 1);
    headerGlow = ctx.createLinearGradient(0, headerY + 2, 0, headerY + 68);
    headerGlow.addColorStop(0, "rgba(255, 255, 255, 0.035)");
    headerGlow.addColorStop(0.45, "rgba(255, 255, 255, 0.01)");
    headerGlow.addColorStop(1, "rgba(0, 0, 0, 0.08)");
    ctx.fillStyle = headerGlow;
    ctx.fillRect(headerX + 2, headerY + 4, layout.header.width - 4, 62);
    drawRewardSectionRule(ctx, headerX + 18, headerY + 62, layout.header.width - 36, 0.1);
    ctx.fillStyle = "#9f4b39";
    ctx.fillRect(accentX, accentY, 2, 42);
    G.render.ui.drawLabel(ctx, state.reward.entryVictoryTitle || state.reward.title, accentX + 16, headerY + 26, {
      size: 28,
      color: "#efe1c8",
      shadow: false
    });
    G.render.ui.drawLabel(ctx, trophyLabel, headerX + layout.header.width - 26, headerY + 22, {
      size: 12,
      align: "right",
      color: "rgba(233, 220, 196, 0.5)",
      shadow: false
    });
    drawRewardHeaderGoldValue(ctx, String(state.reward.goldAward || 0), headerX + layout.header.width - 26, headerY + 52);
    ctx.restore();
  }

  function renderFooterUnifiedRefined(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var footerCopy = getRewardFooterDisplayCopy(state);
    var contentX = layout.footer.x + layout.footer.width / 2;
    var contentWidth = layout.footer.width - 92;
    var footerGlow = null;
    var usedFooterPlate = false;

    ctx.save();
    ctx.globalAlpha = 0.36 + reveal * 0.64;
    ctx.translate((1 - reveal) * 28, (1 - reveal) * 12);
    drawRewardGroundShadow(ctx, layout.footer.x + 12, layout.footer.y + 4, layout.footer.width - 24, layout.footer.height - 10, 0.14 + reveal * 0.08);
    G.render.ui.drawPanel(ctx, layout.footer.x, layout.footer.y, layout.footer.width, layout.footer.height, {
      surface: "dossier-dark",
      fill: "rgba(14, 13, 14, 0.86)",
      stroke: "rgba(166, 142, 110, 0.18)",
      lineWidth: 2
    });
    footerGlow = ctx.createLinearGradient(0, layout.footer.y, 0, layout.footer.y + layout.footer.height);
    footerGlow.addColorStop(0, "rgba(255, 255, 255, 0.045)");
    footerGlow.addColorStop(0.55, "rgba(255, 255, 255, 0.01)");
    footerGlow.addColorStop(1, "rgba(0, 0, 0, 0.12)");
    ctx.fillStyle = footerGlow;
    ctx.fillRect(layout.footer.x + 2, layout.footer.y + 2, layout.footer.width - 4, layout.footer.height - 4);
    ctx.save();
    traceRoundedPanelPath(ctx, layout.footer.x + 8, layout.footer.y + 8, layout.footer.width - 16, layout.footer.height - 16, 14);
    ctx.clip();
    usedFooterPlate = drawClippedTexture(
      ctx,
      REWARD_FOOTER_STRIP_TEXTURE_PATH,
      layout.footer.x + 6,
      layout.footer.y + 6,
      layout.footer.width - 12,
      layout.footer.height - 12,
      {
        focusX: 0.5,
        focusY: 0.74,
        alpha: 0.94
      }
    );
    ctx.restore();
    if (usedFooterPlate) {
      fillRoundedPanel(ctx, layout.footer.x + 12, layout.footer.y + 14, layout.footer.width - 24, layout.footer.height - 28, 12, "rgba(22, 14, 12, 0.14)", 1);
      fillRoundedPanel(ctx, layout.footer.x + 24, layout.footer.y + 16, layout.footer.width - 48, layout.footer.height - 32, 12, "rgba(31, 20, 16, 0.18)", 1);
      ctx.fillStyle = "rgba(204, 178, 141, 0.06)";
      ctx.fillRect(layout.footer.x + 30, layout.footer.y + layout.footer.height - 14, layout.footer.width - 60, 1);
    } else {
      fillRoundedPanel(ctx, layout.footer.x + 10, layout.footer.y + 10, layout.footer.width - 20, layout.footer.height - 20, 14, "rgba(255, 255, 255, 0.022)", 1);
      fillRoundedPanel(ctx, layout.footer.x + 24, layout.footer.y + 14, layout.footer.width - 48, layout.footer.height - 28, 12, "rgba(0, 0, 0, 0.12)", 1);
      drawRewardCornerBrackets(ctx, layout.footer.x + 10, layout.footer.y + 10, layout.footer.width - 20, layout.footer.height - 20, 0.16);
      ctx.fillStyle = "rgba(204, 178, 141, 0.08)";
      ctx.fillRect(layout.footer.x + 22, layout.footer.y + layout.footer.height - 14, layout.footer.width - 44, 1);
    }
    drawRewardSectionRule(ctx, layout.footer.x + 28, layout.footer.y + 18, layout.footer.width - 56, 0.08);
    drawCenteredFooterCopy(ctx, footerCopy, contentX, layout.footer.y + layout.footer.height / 2 + 2, contentWidth);
    ctx.restore();
  }

  function renderSummaryPanelUnifiedRefined(ctx, state, layout) {
    var reveal = getSceneReveal(state);
    var baseX = layout.summary.x;
    var baseY = layout.summary.y + (1 - reveal) * 18;
    var shellHeight = layout.summary.height - 10;
    var sheetX = baseX + 20;
    var sheetY = baseY + 54;
    var sheetWidth = layout.summary.width - 40;
    var sheetHeight = layout.summary.height - 116;
    var innerX = sheetX + 18;
    var innerWidth = sheetWidth - 36;
    var currentHpText = String(state.player && typeof state.player.hp === "number" ? state.player.hp : 0);
    var maxHpText = String(state.player && typeof state.player.maxHp === "number" ? state.player.maxHp : 0);
    var hpValue = currentHpText + " / " + maxHpText;
    var goldValue = String(state.player && typeof state.player.gold === "number" ? state.player.gold : 0);
    var deckValue = String(getRewardDeckCount(state));
    var centerX = 0;
    var dividerX = 0;
    var dividerWidth = 0;
    var rowOneTopY = 0;
    var rowTwoTopY = 0;
    var rowThreeTopY = 0;
    var usedDossierShell = false;

    ctx.save();
    ctx.globalAlpha = 0.34 + reveal * 0.66;
    ctx.translate(-(1 - reveal) * 24, 0);
    drawRewardGroundShadow(ctx, baseX + 10, baseY + 8, layout.summary.width - 20, shellHeight - 12, 0.16 + reveal * 0.08);
    usedDossierShell = drawClippedTexture(
      ctx,
      REWARD_DOSSIER_SHELL_TEXTURE_PATH,
      baseX,
      baseY,
      layout.summary.width,
      shellHeight,
      {
        focusX: 0.5,
        focusY: 0.5,
        alpha: 0.98
      }
    );
    if (usedDossierShell) {
      sheetX = baseX + 26;
      sheetY = baseY + 48;
      sheetWidth = layout.summary.width - 52;
      sheetHeight = shellHeight - 92;
      fillRoundedPanel(ctx, baseX + 8, baseY + 8, layout.summary.width - 16, shellHeight - 18, 18, "rgba(9, 10, 12, 0.06)", 1);
      fillRoundedPanel(ctx, sheetX + 2, sheetY + 14, sheetWidth - 4, sheetHeight - 28, 12, "rgba(255, 248, 233, 0.05)", 1);
    } else {
      G.render.ui.drawPanel(ctx, baseX, baseY, layout.summary.width, shellHeight, {
        surface: "dossier-dark",
        fill: "rgba(11, 13, 16, 0.86)",
        stroke: "rgba(171, 148, 115, 0.2)",
        lineWidth: 2
      });
      fillRoundedPanel(ctx, baseX + 8, baseY + 8, layout.summary.width - 16, shellHeight - 18, 18, "rgba(255, 255, 255, 0.03)", 1);
      fillRoundedPanel(ctx, baseX + 14, baseY + 14, layout.summary.width - 28, shellHeight - 30, 16, "rgba(0, 0, 0, 0.1)", 1);
      drawRewardCornerBrackets(ctx, baseX + 10, baseY + 10, layout.summary.width - 20, shellHeight - 22, 0.17);
      ctx.fillStyle = "rgba(204, 178, 141, 0.08)";
      ctx.fillRect(baseX + 20, baseY + 46, layout.summary.width - 40, 1);
      fillRoundedPanel(ctx, sheetX - 6, sheetY - 8, sheetWidth + 12, sheetHeight + 16, 14, "rgba(18, 14, 12, 0.16)", 1);
      drawRewardGroundShadow(ctx, sheetX + 6, sheetY + 6, sheetWidth - 12, sheetHeight - 14, 0.1 + reveal * 0.04);
      G.render.ui.drawPanel(ctx, sheetX, sheetY, sheetWidth, sheetHeight, {
        surface: "paper-note",
        fill: "rgba(234, 222, 198, 0.97)",
        stroke: "rgba(107, 82, 57, 0.28)",
        lineWidth: 2
      });
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.024)";
      ctx.fillRect(sheetX + 2, sheetY + 2, sheetWidth - 4, 24);
      fillRoundedPanel(ctx, sheetX + 8, sheetY + 10, sheetWidth - 16, sheetHeight - 20, 12, "rgba(255, 255, 255, 0.04)", 0.32);
      ctx.fillStyle = "rgba(152, 67, 50, 0.14)";
      ctx.fillRect(sheetX + 12, sheetY + 18, 2, sheetHeight - 36);
      ctx.beginPath();
      ctx.moveTo(sheetX + sheetWidth - 24, sheetY + 2);
      ctx.lineTo(sheetX + sheetWidth - 2, sheetY + 2);
      ctx.lineTo(sheetX + sheetWidth - 2, sheetY + 24);
      ctx.closePath();
      ctx.fillStyle = "rgba(214, 198, 171, 0.58)";
      ctx.fill();
      ctx.strokeStyle = "rgba(125, 96, 66, 0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    centerX = sheetX + sheetWidth / 2;
    dividerX = sheetX + 28;
    dividerWidth = sheetWidth - 56;
    rowOneTopY = sheetY + 62;
    rowTwoTopY = rowOneTopY + 134;
    rowThreeTopY = rowTwoTopY + 134;

    drawRewardSidebarStackRow(ctx, centerX, rowOneTopY, "当前气血", hpValue, {
      valueColor: "#5d3f35"
    });
    drawRewardSectionRule(ctx, dividerX, rowOneTopY + 86, dividerWidth, 0.16);

    drawRewardSidebarStackRow(ctx, centerX, rowTwoTopY, "行囊大洋", goldValue, {
      valueColor: "#5a4526"
    });
    drawRewardSectionRule(ctx, dividerX, rowTwoTopY + 86, dividerWidth, 0.16);

    drawRewardSidebarStackRow(ctx, centerX, rowThreeTopY, "武学秘籍", deckValue, {
      valueColor: "#2d2118"
    });
    ctx.restore();
  }

  G.scenes.reward = {
    getLayout: getLayout,
    prepareState: prepareState,

    update: function (state, input) {
      var nextState = ensureRewardState(state);
      nextState = updatePresentation(nextState, input);
      nextState = updateHoveredOption(nextState);
      return processClicks(nextState);
    },

    render: function (state, ctx) {
      var nextState = ensureRewardState(state);
      var layout = getLayout(nextState.reward.options.length);

      ctx.globalCompositeOperation = "source-over";
      renderBackgroundUnified(ctx, nextState, layout);
      renderHeaderUnifiedRefined(ctx, nextState, layout);
      renderSummaryPanelUnifiedRefined(ctx, nextState, layout);
      renderTableFrameUnified(ctx, nextState, layout);
      renderCardsUnified(ctx, nextState, layout);
      renderFooterUnifiedRefined(ctx, nextState, layout);
      renderSkipButtonUnified(ctx, nextState, layout);
    }
  };
})();
