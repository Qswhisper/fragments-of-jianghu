window.G = window.G || {};
G.render = G.render || {};
G.render.ui = G.render.ui || {};

(function () {
  var mechanicPalette = {paper: "#5e360f", dark: "#c2a77f"};
  function mechanicSpans(value) {
    var spans = [], match, pattern = /破绽|溃烂|迷眼|残废|铁骨|连环|中毒/g;
    while ((match = pattern.exec(String(value || "")))) spans.push({start: match.index, end: pattern.lastIndex});
    return spans;
  }
  function drawMechanicText(ctx, value, x, y, color, spans) {
    var text = String(value == null ? "" : value), ranges = spans || mechanicSpans(text);
    if (!ranges.length) { ctx.fillText(text, x, y); return; }
    ctx.save();
    var font = ctx.font, ink = ctx.fillStyle, width = ctx.measureText(text).width;
    var left = x - (ctx.textAlign === "center" ? width / 2 : ctx.textAlign === "right" || ctx.textAlign === "end" ? width : 0);
    var cursor = 0;
    ctx.textAlign = "left";
    ranges.forEach(function (range) {
      ctx.font = font; ctx.fillStyle = ink;
      if (range.start > cursor) ctx.fillText(text.slice(cursor, range.start), left + ctx.measureText(text.slice(0, cursor)).width, y);
      var start = left + ctx.measureText(text.slice(0, range.start)).width;
      ctx.font = font.replace(/^(\d+) /, function (_, weight) { return Math.min(800, Number(weight) + 100) + " "; });
      ctx.fillStyle = color; ctx.fillText(text.slice(range.start, range.end), start, y); cursor = range.end;
    });
    ctx.font = font; ctx.fillStyle = ink;
    if (cursor < text.length) ctx.fillText(text.slice(cursor), left + ctx.measureText(text.slice(0, cursor)).width, y);
    ctx.restore();
  }
  function appendMechanicText(node, value) {
    var text = String(value == null ? "" : value), cursor = 0;
    node.replaceChildren();
    mechanicSpans(text).forEach(function (range) {
      node.append(document.createTextNode(text.slice(cursor, range.start)));
      var word = document.createElement("strong"); word.className = "mechanic-keyword"; word.textContent = text.slice(range.start, range.end); node.append(word); cursor = range.end;
    });
    node.append(document.createTextNode(text.slice(cursor)));
    return node;
  }
  function getUiBodyFontFamily() {
    return "\"KGame Song\", serif";
  }

  function getUiTitleFontFamily() {
    return "\"KGame Ink\", \"KGame Song\", serif";
  }

  function getUiReadableFontFamily() {
    return "\"KGame Sans\", sans-serif";
  }

  function getUiChineseFontFamily() {
    return getUiBodyFontFamily();
  }

  function getCardTypeBadge(card) {
    var text = String(card && card.text ? card.text : "");
    var hasAttack = /\u9020\u6210|\u4f24\u5bb3/.test(text);
    var hasDefense = /\u67b6\u52bf|\u683c\u6321|\u9632\u5fa1|\u62a4\u7532/.test(text);

    if (hasAttack && !hasDefense) {
      return {
        label: "\u653b",
        fill: "rgba(96, 28, 30, 0.94)"
      };
    }
    if (hasDefense && !hasAttack) {
      return {
        label: "\u5b88",
        fill: "rgba(56, 56, 60, 0.92)"
      };
    }

    return {
      label: "\u6280",
      fill: "rgba(73, 56, 42, 0.92)"
    };
  }

  function getCardDataSource(card) {
    var source = card || null;
    var depth = 0;

    while (source && source.sourceCard && source.sourceCard !== source && depth < 4) {
      source = source.sourceCard;
      depth += 1;
    }

    return source;
  }

  function getCombatCardReadout(card) {
    var source = getCardDataSource(card) || {};
    var definition = G.cards && G.cards.getCardByName ? G.cards.getCardByName(source.name || card.name) : null;
    source = Object.assign({}, definition || {}, source);
    // Classify effects, not incidental words such as spending existing guard.
    var attack = (source.damage || 0) > 0 || !!source.damageFromCurrentBlock ||
      (source.ironBoneDamage || 0) > 0 || (source.executeDamage || 0) > 0 ||
      (!!source.consumeFlaw && (source.damagePerFlaw || 0) > 0) ||
      (!!source.consumeFester && (source.damagePerFester || 0) > 0);
    var guard = (source.block || 0) > 0 || (source.ironBoneBlock || 0) > 0 ||
      (source.bonusBlockIfBlocked || 0) > 0;
    var type = attack && guard ? {label: "攻守", fill: "#71352c", shape: "mixed"} :
      attack ? {label: "攻", fill: "#842e27", shape: "round"} :
      guard ? {label: "守", fill: "#3d4948", shape: "square"} :
      {label: "辅", fill: "#62533f", shape: "diamond"};
    var primary = [];
    var damage = Number(source.damage) || 0;
    var block = Number(source.block) || 0;
    var secondary = String(card.text || source.text || "");
    if (damage > 0) {
      primary.push("伤害" + damage + (source.hits > 1 ? "×" + source.hits : "") +
        (source.damageFromCurrentBlock ? "+架势" : ""));
      if (source.hits > 1) {
        secondary = secondary.replace(new RegExp("^攻击\\s*" + source.hits + "\\s*次，每次造成\\s*" + damage + "\\s*伤害[，。]?"), "");
      } else {
        secondary = secondary.replace(new RegExp("^造成\\s*" + damage + "\\s*伤害[，。]?"), "");
      }
      if (source.damageFromCurrentBlock) {
        secondary = secondary.replace(/^再额外造成等于当前架势值的伤害[，。]?/, "");
      }
    } else if (source.damageFromCurrentBlock) {
      primary.push("伤害=架势");
      secondary = secondary.replace(/^造成等于当前架势值的伤害[，。]?/, "");
    } else if (source.consumeFlaw && source.damagePerFlaw > 0) {
      primary.push("伤害" + source.damagePerFlaw + "×破绽");
      secondary = secondary.replace(new RegExp("每层造成\\s*" + source.damagePerFlaw + "\\s*伤害[，。]?"), "");
    }
    if (block > 0) {
      primary.push("架势" + block);
      secondary = secondary.replace(new RegExp("^获得\\s*" + block + "\\s*架势[，。]?"), "");
    }
    if (!primary.length) {
      if (source.blind > 0) primary.push("迷眼" + source.blind);
      else if (source.fester > 0) primary.push("溃烂" + source.fester);
      else if (source.draw > 0) primary.push("抽牌" + source.draw);
    }
    // Short hand-face wording; the unchanged full description remains in details.
    secondary = secondary.replace(/\s+/g, "")
      .replace(/若出牌前已有架势，额外获得(\d+)架势。?/g, "已有架势：架势+$1。")
      .replace(/若触发铁骨，(?:额外|再)获得(\d+)架势。?/g, "铁骨：架势+$1。")
      .replace(/若触发铁骨，额外造成(\d+)伤害。?/g, "铁骨：伤害+$1。")
      .replace(/自己固定扣除(\d+)气血/g, "自损$1气血")
      .replace(/。(?=铁骨：)/g, "\n");
    // Main numbers are base effects, never an invented target-specific total.
    // Conditional bonuses, costs and status rules stay verbatim below them.
    return {type: type, primary: primary.join(" · "), secondary: secondary};
  }

  function getCardEffectNote(card) {
    var source = getCardDataSource(card) || {};

    if (typeof source.executeDamage === "number" && source.executeDamage > 0) {
      return { label: "\u5904\u51b3", family: "attack" };
    }
    if (source.consumeFlaw) {
      return { label: "\u8017\u7834", family: "attack" };
    }
    if (source.consumeFester) {
      return { label: "\u8ffd\u70c2", family: "dirty" };
    }
    if (typeof source.fester === "number" && source.fester > 0) {
      return { label: "\u6e83\u70c2", family: "dirty" };
    }
    if (typeof source.blind === "number" && source.blind > 0) {
      return { label: "\u8ff7\u773c", family: "dirty" };
    }
    if (typeof source.crippleTurns === "number" && source.crippleTurns > 0) {
      return { label: "\u65ad\u7b4b", family: "dirty" };
    }
    if (source.damageFromCurrentBlock) {
      return { label: "\u501f\u67b6", family: "guard" };
    }
    if ((source.ironBoneDamage || 0) > 0 || (source.ironBoneBlock || 0) > 0) {
      return { label: "\u94c1\u9aa8", family: "guard" };
    }
    if ((source.hits || 0) > 1) {
      return { label: "\u8fde\u6253", family: "combo" };
    }
    if ((source.draw || 0) > 0 && (source.block || 0) > 0) {
      return { label: "\u5b88\u62bd", family: "utility" };
    }
    if ((source.draw || 0) > 0 && (source.damage || 0) > 0) {
      return { label: "\u7eed\u624b", family: "utility" };
    }
    if ((source.flaw || 0) > 0) {
      return { label: "\u7834\u7efd", family: "attack" };
    }
    if ((source.draw || 0) > 0) {
      return { label: "\u62bd\u724c", family: "utility" };
    }
    if ((source.block || 0) > 0 && (source.damage || 0) > 0) {
      return { label: "\u653b\u5b88", family: "hybrid" };
    }
    if ((source.block || 0) > 0) {
      return { label: "\u67b6\u52bf", family: "guard" };
    }
    if ((source.damage || 0) > 0) {
      return { label: "\u4f24\u5bb3", family: "attack" };
    }

    return { label: "\u6280\u6cd5", family: "neutral" };
  }

  function getCardEffectNotePalette(note) {
    var family = note && note.family ? note.family : "neutral";

    if (family === "attack") {
      return {
        fill: "rgba(104, 35, 31, 0.12)",
        stroke: "rgba(122, 49, 42, 0.22)",
        text: "#6b201b"
      };
    }
    if (family === "guard") {
      return {
        fill: "rgba(78, 73, 67, 0.12)",
        stroke: "rgba(92, 88, 82, 0.22)",
        text: "#47413a"
      };
    }
    if (family === "dirty") {
      return {
        fill: "rgba(108, 69, 38, 0.12)",
        stroke: "rgba(118, 81, 48, 0.22)",
        text: "#694327"
      };
    }
    if (family === "combo") {
      return {
        fill: "rgba(101, 50, 40, 0.11)",
        stroke: "rgba(118, 66, 54, 0.2)",
        text: "#633429"
      };
    }
    if (family === "utility") {
      return {
        fill: "rgba(98, 84, 62, 0.12)",
        stroke: "rgba(118, 100, 76, 0.2)",
        text: "#584636"
      };
    }
    if (family === "hybrid") {
      return {
        fill: "rgba(89, 62, 50, 0.12)",
        stroke: "rgba(112, 82, 66, 0.2)",
        text: "#543728"
      };
    }

    return {
      fill: "rgba(78, 66, 53, 0.1)",
      stroke: "rgba(95, 81, 66, 0.18)",
      text: "#4f3f32"
    };
  }

  function buildCardEffectTokens(card) {
    var source = getCardDataSource(card) || {};
    var tokens = [];

    function pushToken(label) {
      if (!label || tokens.indexOf(label) >= 0) {
        return;
      }
      tokens.push(label);
    }

    if (typeof source.damage === "number" && source.damage > 0) {
      pushToken("\u4f24" + source.damage);
    }
    if (typeof source.hits === "number" && source.hits > 1) {
      pushToken("\u8fde" + source.hits);
    }
    if (typeof source.block === "number" && source.block > 0) {
      pushToken("\u52bf" + source.block);
    }
    if (typeof source.draw === "number" && source.draw > 0) {
      pushToken("\u62bd" + source.draw);
    }
    if (typeof source.flaw === "number" && source.flaw > 0) {
      pushToken("\u7834" + source.flaw);
    }
    if (typeof source.fester === "number" && source.fester > 0) {
      pushToken("\u70c2" + source.fester);
    }
    if (typeof source.blind === "number" && source.blind > 0) {
      pushToken("\u76f2" + source.blind);
    }
    if (typeof source.crippleTurns === "number" && source.crippleTurns > 0) {
      pushToken("\u5e9f" + source.crippleTurns);
    }
    if (typeof source.executeDamage === "number" && source.executeDamage > 0) {
      pushToken("\u51b3" + source.executeDamage);
    }
    if (source.consumeFlaw) {
      pushToken("\u8017\u7834");
    }
    if (source.consumeFester) {
      pushToken("\u8017\u70c2");
    }
    if (source.damageFromCurrentBlock) {
      pushToken("\u501f\u67b6");
    }
    if ((source.ironBoneDamage || 0) > 0 || (source.ironBoneBlock || 0) > 0) {
      pushToken("\u94c1\u9aa8");
    }
    if (typeof source.bonusDamageIfTargetHasFester === "number" && source.bonusDamageIfTargetHasFester > 0) {
      pushToken("\u8ffd\u4f24");
    }
    if (typeof source.bonusBlockIfBlocked === "number" && source.bonusBlockIfBlocked > 0) {
      pushToken("\u7eed\u67b6");
    }
    if (typeof source.selfDamage === "number" && source.selfDamage > 0) {
      pushToken("\u81ea\u635f");
    }

    return tokens;
  }

  function buildWrappedLineLayout(ctx, text, maxWidth, maxLines) {
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

    return {
      lines: maxLines && lines.length > maxLines ? lines.slice(0, maxLines) : lines,
      truncated: !!(maxLines && lines.length > maxLines)
    };
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

  function drawWrappedLabel(ctx, text, x, y, maxWidth, lineHeight, options) {
    var opts = options || {};
    var layout = null;
    var lines = null;
    var i = 0;
    var drawY = 0;

    ctx.save();
    ctx.fillStyle = opts.color || "#efe7d5";
    ctx.font = (opts.weight || "600") + " " + (opts.size || 18) + "px " +
      (opts.fontFamily || getUiBodyFontFamily());
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = "top";
    layout = buildWrappedLineLayout(ctx, text, maxWidth, opts.maxLines);
    if (opts.journeyTypeset && G.render.journeyTypesetting) {
      var measured = G.render.journeyTypesetting.lines(ctx, text, maxWidth);
      layout = {lines: opts.maxLines ? measured.slice(0,opts.maxLines) : measured, truncated: !!(opts.maxLines && measured.length>opts.maxLines)};
    }
    lines = opts.fadeOverflow ? layout.lines.slice() : buildWrappedLines(ctx, text, maxWidth, opts.maxLines);

    if (opts.shadow !== false && (
      opts.shadowColor ||
      typeof opts.shadowBlur === "number" ||
      typeof opts.shadowOffsetX === "number" ||
      typeof opts.shadowOffsetY === "number"
    )) {
      ctx.shadowColor = opts.shadowColor || "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = typeof opts.shadowBlur === "number" ? opts.shadowBlur : 2;
      ctx.shadowOffsetX = typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 1;
      ctx.shadowOffsetY = typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 1;
    }

    var keywordOffset = 0, keywordSpans = opts.keywordColor ? mechanicSpans(lines.join("")) : [];
    for (i = 0; i < lines.length; i += 1) {
      var rowSpans = keywordSpans.filter(function (range) { return range.end > keywordOffset && range.start < keywordOffset + lines[i].length; }).map(function (range) { return {start: Math.max(0, range.start - keywordOffset), end: Math.min(lines[i].length, range.end - keywordOffset)}; });
      drawY = y + i * lineHeight;
      if (opts.fadeOverflow && layout.truncated && i === lines.length - 1) {
        ctx.restore();
        drawOverflowFadeLabel(ctx, lines[i], x, drawY, maxWidth, {
          size: opts.size || 18,
          color: opts.color || "#efe7d5",
          align: opts.align || "left",
          weight: opts.weight || "600",
          shadow: opts.shadow,
          shadowColor: opts.shadowColor,
          shadowBlur: opts.shadowBlur,
          shadowOffsetX: opts.shadowOffsetX,
          shadowOffsetY: opts.shadowOffsetY,
          fontFamily: opts.fontFamily || getUiBodyFontFamily(),
          fadeWidth: opts.fadeWidth,
          clipHeight: Math.max(lineHeight + 3, Math.ceil((opts.size || 18) * 1.35)),
          textBaseline: "top",
          forceFade: true,
          keywordColor: opts.keywordColor, keywordRanges: rowSpans
        });
        return lines.length;
      }
      if (opts.keywordColor) drawMechanicText(ctx, lines[i], x, drawY, opts.keywordColor, rowSpans);
      else ctx.fillText(lines[i], x, drawY);
      keywordOffset += lines[i].length;
    }

    ctx.restore();
    return lines.length;
  }

  function withAlpha(color, alpha) {
    var raw = String(color || "#000000").trim();
    var hex = null;
    var parts = null;
    var r = 0;
    var g = 0;
    var b = 0;

    if (/^#[0-9a-f]{3}$/i.test(raw)) {
      hex = raw.slice(1);
      r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    }

    if (/^#[0-9a-f]{6}$/i.test(raw)) {
      hex = raw.slice(1);
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
      return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    }

    parts = raw.match(/^rgba?\(([^)]+)\)$/i);
    if (parts) {
      parts = parts[1].split(",").map(function (part) {
        return part.trim();
      });
      if (parts.length >= 3) {
        return "rgba(" + parts[0] + ", " + parts[1] + ", " + parts[2] + ", " + alpha + ")";
      }
    }

    return alpha <= 0 ? "rgba(0, 0, 0, 0)" : raw;
  }

  function drawOverflowFadeLabel(ctx, text, x, y, maxWidth, options) {
    var opts = options || {};
    var label = String(text || "");
    var baseColor = opts.color || "#efe7d5";
    var fontSize = opts.size || 18;
    var clipHeight = opts.clipHeight || Math.ceil(fontSize * 1.7);
    var fadeWidth = Math.max(10, Math.min(24, typeof opts.fadeWidth === "number" ? opts.fadeWidth : maxWidth * 0.22));
    var textBaseline = opts.textBaseline || "middle";
    var shouldFade = !!opts.forceFade;
    var measuredWidth = 0;
    var fadeEndX = 0;
    var fadeStartX = 0;
    var fadeMask = null;
    var fadeStartRatio = 0;
    var clipY = 0;

    ctx.save();
    ctx.fillStyle = baseColor;
    ctx.font = (opts.weight || "600") + " " + fontSize + "px " +
      (opts.fontFamily || getUiBodyFontFamily());
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = textBaseline;
    measuredWidth = ctx.measureText(label).width;
    shouldFade = shouldFade || (maxWidth > 0 && measuredWidth > maxWidth);
    clipY = textBaseline === "top" ? y : (y - clipHeight / 2);

    if (opts.shadow !== false && (
      opts.shadowColor ||
      typeof opts.shadowBlur === "number" ||
      typeof opts.shadowOffsetX === "number" ||
      typeof opts.shadowOffsetY === "number"
    )) {
      ctx.shadowColor = opts.shadowColor || "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = typeof opts.shadowBlur === "number" ? opts.shadowBlur : 2;
      ctx.shadowOffsetX = typeof opts.shadowOffsetX === "number" ? opts.shadowOffsetX : 1;
      ctx.shadowOffsetY = typeof opts.shadowOffsetY === "number" ? opts.shadowOffsetY : 1;
    }

    if (maxWidth > 0) {
      ctx.beginPath();
      ctx.rect(x, clipY, maxWidth, clipHeight);
      ctx.clip();
    }

    if (maxWidth > 0 && shouldFade) {
      fadeEndX = x + Math.max(0, Math.min(maxWidth, measuredWidth));
      if (fadeEndX <= x) {
        fadeEndX = x + maxWidth;
      }
      fadeStartX = Math.max(x, fadeEndX - fadeWidth);
      fadeStartRatio = Math.max(0, Math.min(1, (fadeStartX - x) / Math.max(1, fadeEndX - x)));
      fadeMask = ctx.createLinearGradient(x, y, fadeEndX, y);
      fadeMask.addColorStop(0, withAlpha(baseColor, 1));
      fadeMask.addColorStop(fadeStartRatio, withAlpha(baseColor, 1));
      fadeMask.addColorStop(1, withAlpha(baseColor, 0));
      ctx.fillStyle = fadeMask;
    }

    if (opts.keywordColor) {
      var keywordPaint = opts.keywordColor;
      if (maxWidth > 0 && shouldFade) {
        keywordPaint = ctx.createLinearGradient(x, y, fadeEndX, y);
        keywordPaint.addColorStop(0, withAlpha(opts.keywordColor, 1));
        keywordPaint.addColorStop(fadeStartRatio, withAlpha(opts.keywordColor, 1));
        keywordPaint.addColorStop(1, withAlpha(opts.keywordColor, 0));
      }
      drawMechanicText(ctx, label, x, y, keywordPaint, opts.keywordRanges);
    } else ctx.fillText(label, x, y);

    ctx.restore();
    return measuredWidth;
  }

  function drawPanel(ctx, x, y, width, height, colors) {
    var palette = colors || {};

    if (palette.textureRole === "combat-panel" && G.render.assets && typeof G.render.assets.drawCombatPanelSurface === "function") {
      G.render.assets.drawCombatPanelSurface(ctx, x, y, width, height, palette);
      return;
    }

    if (G.render.assets && typeof G.render.assets.drawPanelSurface === "function") {
      G.render.assets.drawPanelSurface(ctx, x, y, width, height, palette);
      return;
    }

    ctx.save();
    ctx.fillStyle = palette.fill || "rgba(18, 18, 18, 0.92)";
    ctx.strokeStyle = palette.stroke || "#6f1d24";
    ctx.lineWidth = palette.lineWidth || 2;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  function drawHandTray(ctx, config) {
    var tray = config || {};
    var x = tray.x || 0;
    var y = tray.y || 0;
    var width = tray.width || 640;
    var height = tray.height || 84;
    var panelY = y + 8;
    var panelHeight = Math.max(28, height - 12);
    var shadow = null;
    var slab = null;
    var topGlow = null;
    var centerBand = null;

    ctx.save();

    shadow = ctx.createRadialGradient(
      x + width / 2,
      y + height + 12,
      18,
      x + width / 2,
      y + height + 12,
      width * 0.42
    );
    shadow.addColorStop(0, "rgba(0, 0, 0, 0.3)");
    shadow.addColorStop(0.55, "rgba(0, 0, 0, 0.18)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    if (typeof ctx.ellipse === "function") {
      ctx.ellipse(x + width / 2, y + height + 10, width * 0.4, Math.max(14, height * 0.16), -0.02, 0, Math.PI * 2);
    } else {
      ctx.arc(x + width / 2, y + height + 8, Math.max(16, width * 0.2), 0, Math.PI * 2);
    }
    ctx.fill();

    slab = ctx.createLinearGradient(x, panelY, x, panelY + panelHeight);
    slab.addColorStop(0, "rgba(25, 31, 38, 0.64)");
    slab.addColorStop(0.18, "rgba(14, 18, 24, 0.84)");
    slab.addColorStop(0.68, "rgba(8, 11, 16, 0.94)");
    slab.addColorStop(1, "rgba(6, 8, 12, 0.98)");
    ctx.fillStyle = slab;
    ctx.beginPath();
    ctx.moveTo(x + 30, panelY);
    ctx.lineTo(x + width - 30, panelY);
    ctx.lineTo(x + width - 8, panelY + 18);
    ctx.lineTo(x + width - 8, panelY + panelHeight);
    ctx.lineTo(x + 8, panelY + panelHeight);
    ctx.lineTo(x + 8, panelY + 18);
    ctx.closePath();
    ctx.fill();

    topGlow = ctx.createLinearGradient(x + width * 0.18, panelY + 3, x + width * 0.82, panelY + 3);
    topGlow.addColorStop(0, "rgba(0, 0, 0, 0)");
    topGlow.addColorStop(0.5, "rgba(214, 223, 232, 0.12)");
    topGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(x + width * 0.12, panelY + 3, width * 0.76, 1.1);

    centerBand = ctx.createLinearGradient(x + width * 0.24, panelY + 10, x + width * 0.76, panelY + 10);
    centerBand.addColorStop(0, "rgba(0, 0, 0, 0)");
    centerBand.addColorStop(0.5, "rgba(143, 164, 182, 0.1)");
    centerBand.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = centerBand;
    ctx.fillRect(x + width * 0.18, panelY + 10, width * 0.64, 0.9);

    ctx.strokeStyle = "rgba(190, 203, 214, 0.1)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x + 30, panelY + 0.5);
    ctx.lineTo(x + width - 30, panelY + 0.5);
    ctx.lineTo(x + width - 8.5, panelY + 18.5);
    ctx.lineTo(x + width - 8.5, panelY + panelHeight - 0.5);
    ctx.lineTo(x + 8.5, panelY + panelHeight - 0.5);
    ctx.lineTo(x + 8.5, panelY + 18.5);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = "rgba(210, 220, 230, 0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 58, panelY + panelHeight - 6);
    ctx.lineTo(x + width - 58, panelY + panelHeight - 6);
    ctx.stroke();

    ctx.restore();
  }

  function drawLabel(ctx, text, x, y, options) {
    var opts = options || {};
    var drawY = y;
    var drawX = x;
    var metrics = null;
    var ascent = 0;
    var descent = 0;
    ctx.save();
    ctx.fillStyle = opts.color || "#efe7d5";
    ctx.font = (opts.weight || "600") + " " + (opts.size || 18) + "px " +
      (opts.fontFamily || getUiBodyFontFamily());
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = opts.baseline || "middle";

    if (opts.opticalCenter) {
      // Measure and paint on the same baseline. Measuring on "middle" and
      // painting alphabetically applies the font's baseline shift twice.
      ctx.textBaseline = "alphabetic";
      metrics = ctx.measureText(String(text || ""));
      ascent = metrics && typeof metrics.actualBoundingBoxAscent === "number" && metrics.actualBoundingBoxAscent > 0 ?
        metrics.actualBoundingBoxAscent :
        (opts.size || 18) * 0.72;
      descent = metrics && Number.isFinite(metrics.actualBoundingBoxDescent) ?
        metrics.actualBoundingBoxDescent :
        (opts.size || 18) * 0.28;
      drawY = y + (ascent - descent) / 2 + (typeof opts.opticalOffsetY === "number" ? opts.opticalOffsetY : 0);
      if (ctx.textAlign === "center" && Number.isFinite(metrics.actualBoundingBoxLeft) && Number.isFinite(metrics.actualBoundingBoxRight)) {
        drawX += (metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) / 2;
      }
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
      ctx.strokeText(text, drawX, drawY);
    }

    if (opts.keywordColor) drawMechanicText(ctx, text, drawX, drawY, opts.keywordColor);
    else ctx.fillText(text, drawX, drawY);
    ctx.restore();
  }

  function drawBar(ctx, x, y, width, height, ratio, palette) {
    var colors = palette || {};
    var clampedRatio = Math.max(0, Math.min(1, ratio));
    var fillWidth = width * clampedRatio;
    var gradient = null;

    if (colors.textureRole === "combat-blood" && G.render.assets && typeof G.render.assets.drawCombatBarSurface === "function") {
      ctx.save();
      ctx.filter = colors.filter || "brightness(1.5) contrast(1.2)";
      G.render.assets.drawCombatBarSurface(ctx, x, y, width, height, clampedRatio, colors);
      ctx.filter = "none";
      gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, "rgba(255, 232, 214, 0.18)");
      gradient.addColorStop(0.3, "rgba(255, 232, 214, 0.08)");
      gradient.addColorStop(1, "rgba(255, 232, 214, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, y + 1, Math.max(0, width - 2), Math.max(1, height * 0.45));
      if (fillWidth > 2) {
        gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, "rgba(255, 246, 236, 0.12)");
        gradient.addColorStop(0.22, "rgba(255, 246, 236, 0.05)");
        gradient.addColorStop(1, "rgba(255, 246, 236, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y + 1, Math.max(0, fillWidth - 2), Math.max(1, height * 0.32));
      }
      ctx.fillStyle = "rgba(36, 15, 16, 0.28)";
      ctx.fillRect(x + 1, y + height - 2, Math.max(0, width - 2), 1);
      ctx.fillStyle = "rgba(255, 238, 220, 0.16)";
      ctx.fillRect(x + 1, y + 1, Math.max(0, width - 2), 1);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.fillStyle = colors.background || "#231f20";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = colors.fill || "#a21b2b";
    ctx.fillRect(x, y, width * clampedRatio, height);
    ctx.strokeStyle = colors.stroke || "#73504d";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  function drawStatBar(ctx, config) {
    drawLabel(ctx, config.label, config.x, config.y - 12, {
      size: 16,
      color: config.labelColor || "#c8bbab"
    });
    drawBar(ctx, config.x, config.y, config.width, config.height, config.current / config.max, config.palette);
    drawLabel(ctx, config.current + " / " + config.max, config.x + config.width / 2, config.y + config.height / 2, {
      size: 18,
      align: "center",
      color: config.valueColor || "#f7efe0"
    });
  }

  function drawIntentIcon(ctx, x, y, intent, enemy) {
    var type = intent || "unknown";
    var iconText = "?";
    var fill = "#595959";
    var threatStyle = enemy ? getEnemyThreatVisualStyle(enemy) : "";

    if (type === "attack") {
      if (threatStyle === "firearm") {
        iconText = "\u67aa";
        fill = "#8f241e";
      } else if (threatStyle === "bayonet") {
        iconText = "\u523a";
        fill = "#8d4024";
      } else if (threatStyle === "blunt") {
        iconText = "\u7808";
        fill = "#885125";
      } else {
        iconText = "\u65a9";
        fill = "#9b1c28";
      }
    } else if (type === "block") {
      iconText = "\u5b88";
      fill = "#4a6572";
    } else if (type === "debuff") {
      iconText = "\u7834";
      fill = "#8a6d3b";
    } else if (type === "buff") {
      iconText = "\u52bf";
      fill = "#436b42";
    }

    ctx.save();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#d9cfc1";
    ctx.stroke();
    ctx.restore();

    if (type === "attack" && threatStyle) {
      ctx.save();
      ctx.strokeStyle = "rgba(246, 234, 216, 0.22)";
      ctx.lineCap = "round";
      ctx.lineWidth = threatStyle === "blunt" ? 2 : 1.3;
      if (threatStyle === "firearm") {
        ctx.beginPath();
        ctx.moveTo(x - 9, y);
        ctx.lineTo(x - 4, y);
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x + 9, y);
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x, y - 4);
        ctx.stroke();
      } else if (threatStyle === "bayonet") {
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 4);
        ctx.lineTo(x + 6, y - 4);
        ctx.moveTo(x + 6, y - 4);
        ctx.lineTo(x + 10, y - 1);
        ctx.stroke();
      } else if (threatStyle === "blunt") {
        ctx.beginPath();
        ctx.moveTo(x - 7, y - 5);
        ctx.lineTo(x + 5, y + 2);
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 2, y + 8);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 6);
        ctx.lineTo(x + 7, y - 7);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawLabel(ctx, iconText, x, y + 1, {
      size: 20,
      color: "#f6f0e7",
      align: "center"
    });
  }

  function getIntentBadgeText(intent, enemy) {
    var type = intent || "unknown";
    var threatStyle = enemy ? getEnemyThreatVisualStyle(enemy) : "";
    var label = enemy && enemy.intentLabel ? String(enemy.intentLabel) : "";
    var intentData = enemy && enemy.intentData ? enemy.intentData : {};

    if (type === "attack") {
      if (threatStyle === "firearm") {
        return "\u67aa";
      }
      if (threatStyle === "bayonet") {
        return "\u523a";
      }
      if (threatStyle === "blunt") {
        return "\u7808";
      }
      return "\u65a9";
    }
    if (type === "block") {
      if (intentData.firearm || /\u88c5|\u6263|\u67b6\u67aa|\u6574\u67aa/.test(label)) {
        return "\u88c5";
      }
      return "\u5b88";
    }
    if (type === "debuff") {
      if (/\u6bd2/.test(label)) {
        return "\u6bd2";
      }
      if (/\u67aa|\u7784|\u9501|\u538b/.test(label)) {
        return "\u538b";
      }
      return "\u7834";
    }
    if (type === "buff") {
      if (intentData.firearm || /\u67aa|\u88c5|\u7784|\u6821|\u538b|\u6263/.test(label)) {
        if (/\u88c5|\u6263|\u6574\u67aa|\u67b6\u67aa|\u62c9\u8ddd/.test(label)) {
          return "\u88c5";
        }
        return "\u7784";
      }
      return "\u52bf";
    }
    return "?";
  }

  function getIntentPalette(intent, enemy) {
    var isNemesis = !!(enemy && enemy.kind === "nemesis");
    var threatStyle = getEnemyThreatVisualStyle(enemy);
    var hasFirearmThreat = threatStyle === "firearm" || !!(enemy && enemy.firearmStage && enemy.firearmStage !== "none");

    if (intent === "attack") {
      if (threatStyle === "firearm") {
        return {
          fill: isNemesis ? "rgba(118, 14, 22, 0.96)" : "rgba(108, 18, 24, 0.95)",
          stroke: isNemesis ? "#f0c49c" : "#e3b18e",
          text: "#fff0e1",
          ring: isNemesis ? "rgba(248, 212, 176, 0.34)" : "rgba(235, 192, 150, 0.28)",
          threat: true,
          telegraph: false
        };
      }
      if (threatStyle === "bayonet") {
        return {
          fill: "rgba(107, 34, 22, 0.94)",
          stroke: "#dfb58d",
          text: "#fceddf",
          ring: "rgba(236, 202, 166, 0.24)",
          threat: true,
          telegraph: false
        };
      }
      if (threatStyle === "blunt") {
        return {
          fill: "rgba(94, 50, 23, 0.92)",
          stroke: "#ddb38c",
          text: "#f9ecdf",
          ring: "rgba(231, 198, 164, 0.22)",
          threat: true,
          telegraph: false
        };
      }
      return {
        fill: "rgba(109, 18, 29, 0.92)",
        stroke: "#d89d8f",
        text: "#f8ebe4",
        ring: "rgba(228, 204, 174, 0.18)",
        threat: false,
        telegraph: false
      };
    }
    if (intent === "block") {
      return {
        fill: "rgba(51, 74, 86, 0.92)",
        stroke: "#b4cad4",
        text: "#edf5f8",
        ring: "rgba(228, 204, 174, 0.18)",
        threat: false,
        telegraph: false
      };
    }
    if (intent === "debuff") {
      return {
        fill: "rgba(94, 75, 31, 0.92)",
        stroke: "#e0cb92",
        text: "#fff2d0",
        ring: "rgba(228, 204, 174, 0.18)",
        threat: false,
        telegraph: false
      };
    }
    if (intent === "buff") {
      if (hasFirearmThreat) {
        return {
          fill: "rgba(35, 24, 19, 0.74)",
          stroke: "#efc394",
          text: "#f6e6cb",
          ring: "rgba(239, 195, 148, 0.42)",
          threat: true,
          telegraph: true
        };
      }
      return {
        fill: "rgba(43, 76, 40, 0.92)",
        stroke: "#b8d6a6",
        text: "#eff7e6",
        ring: "rgba(228, 204, 174, 0.18)",
        threat: false,
        telegraph: false
      };
    }

    return {
      fill: "rgba(70, 62, 58, 0.92)",
      stroke: "#c5b6a8",
      text: "#f3ebe3",
      ring: "rgba(228, 204, 174, 0.18)",
      threat: false,
      telegraph: false
    };
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

  function getEnemyHudDepth(slotCount, slotIndex, compact) {
    return {
      panelScale: 1,
      panelAlpha: 1,
      textScale: 1,
      textAlpha: 1,
      metaAlpha: 1,
      barAlpha: 1,
      blockAlpha: 1,
      intentScale: 1,
      intentAlpha: 1,
      panelDx: 0,
      panelDy: 0,
      intentDx: 0,
      intentDy: 0,
      glowAlphaScale: 1,
      shadowScale: 0.34,
      shadowAlpha: 0.18,
      backdropAlpha: 0.18
    };
  }

  function drawEnemyFrameAccents(ctx, x, y, width, height, stroke) {
    var corner = Math.max(16, Math.min(30, width * 0.12));

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x + 10, y + corner);
    ctx.lineTo(x + 10, y + 10);
    ctx.lineTo(x + corner, y + 10);
    ctx.moveTo(x + width - corner, y + 10);
    ctx.lineTo(x + width - 10, y + 10);
    ctx.lineTo(x + width - 10, y + corner);
    ctx.moveTo(x + 10, y + height - corner);
    ctx.lineTo(x + 10, y + height - 10);
    ctx.lineTo(x + corner, y + height - 10);
    ctx.moveTo(x + width - corner, y + height - 10);
    ctx.lineTo(x + width - 10, y + height - 10);
    ctx.lineTo(x + width - 10, y + height - corner);
    ctx.stroke();
    ctx.restore();
  }

  function drawThreatIntentMotif(ctx, centerX, centerY, radius, style, intensity) {
    var strength = Math.max(0, Math.min(1, intensity || 0));

    ctx.save();
    ctx.lineCap = "round";

    if (style === "firearm") {
      ctx.strokeStyle = "rgba(244, 214, 180, " + (0.2 + strength * 0.16) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(centerX - radius - 7, centerY);
      ctx.lineTo(centerX - radius - 1, centerY);
      ctx.moveTo(centerX + radius + 1, centerY);
      ctx.lineTo(centerX + radius + 7, centerY);
      ctx.moveTo(centerX, centerY - radius - 7);
      ctx.lineTo(centerX, centerY - radius - 1);
      ctx.moveTo(centerX, centerY + radius + 1);
      ctx.lineTo(centerX, centerY + radius + 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 2.5, -0.3, 0.3);
      ctx.stroke();
    } else if (style === "bayonet") {
      ctx.strokeStyle = "rgba(242, 206, 176, " + (0.18 + strength * 0.14) + ")";
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(centerX - radius - 5, centerY + 2);
      ctx.lineTo(centerX + radius * 0.56, centerY - radius * 0.12);
      ctx.moveTo(centerX + radius * 0.56, centerY - radius * 0.12);
      ctx.lineTo(centerX + radius + 5, centerY + 1);
      ctx.moveTo(centerX + radius * 0.58, centerY - radius * 0.12);
      ctx.lineTo(centerX + radius * 0.7, centerY - radius * 0.32);
      ctx.stroke();
    } else if (style === "blunt") {
      ctx.strokeStyle = "rgba(236, 192, 156, " + (0.18 + strength * 0.14) + ")";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(centerX - radius - 4, centerY - 4);
      ctx.lineTo(centerX - radius * 0.36, centerY - radius - 5);
      ctx.moveTo(centerX + radius + 4, centerY - 2);
      ctx.lineTo(centerX + radius * 0.3, centerY - radius - 7);
      ctx.moveTo(centerX + radius + 2, centerY + 6);
      ctx.lineTo(centerX + radius * 0.44, centerY + radius + 4);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(239, 198, 178, " + (0.18 + strength * 0.14) + ")";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(centerX - radius - 4, centerY + radius * 0.08);
      ctx.lineTo(centerX - radius * 0.08, centerY - radius - 6);
      ctx.moveTo(centerX - radius * 0.54, centerY + radius + 4);
      ctx.lineTo(centerX + radius + 4, centerY - radius * 0.12);
      ctx.stroke();
    }

    ctx.lineCap = "butt";
    ctx.restore();
  }

  function drawEnemyCard(ctx, enemy) {
    var x = enemy.x;
    var y = enemy.y;
    var width = enemy.width;
    var height = enemy.height;
    var compact = width < 230;
    var slotCount = enemy.slotCount || 1;
    var slotIndex = typeof enemy.slotIndex === "number" ? enemy.slotIndex : 0;
    var hudDepth = getEnemyHudDepth(slotCount, slotIndex, compact);
    var slotRole = enemy.slotRole || (slotCount <= 1 ? "front" : (slotCount === 2 ? (slotIndex <= 0 ? "rear" : "front") : (slotIndex <= 0 ? "rear" : (slotIndex >= slotCount - 1 ? "front" : "mid"))));
    var isNemesis = enemy.kind === "nemesis";
    var renderMode = enemy.renderMode || "all";
    var drawPortraitPass = renderMode !== "overlay";
    var drawOverlayPass = renderMode !== "portrait";
    var threatStyle = getEnemyThreatVisualStyle(enemy);
    var hasFirearmThreat = threatStyle === "firearm" || !!(enemy.firearmStage && enemy.firearmStage !== "none");
    var dangerIntent = hasFirearmThreat && enemy.intent === "attack";
    var frontThreatLevel = slotRole === "front" && enemy.intent === "attack" ? (hasFirearmThreat ? 1 : 0.72) : 0;
    var portraitX = x + Math.max(10, width * 0.05);
    var portraitY = y + 10;
    var portraitWidth = width - Math.max(20, width * 0.1);
    var portraitHeight = height - 78;
    var portraitCenterX = portraitX + portraitWidth * 0.5;
    var intentPalette = getIntentPalette(enemy.intent, enemy);
    var titleSize = Math.max(compact ? 12 : 13, Math.round((compact ? 13 : 15) * hudDepth.textScale));
    var metaSize = Math.max(compact ? 10 : 11, Math.round((compact ? 11 : 12) * hudDepth.textScale));
    var hpLabelSize = Math.max(8, Math.round(9 * hudDepth.textScale));
    var hpValueSize = Math.max(compact ? 12 : 13, Math.round((compact ? 13 : 14) * hudDepth.textScale));
    var blockLabelSize = Math.max(compact ? 10 : 11, Math.round((compact ? 11 : 12) * hudDepth.textScale));
    var hasIntentValue = enemy.intentValue !== undefined && enemy.intentValue !== null && String(enemy.intentValue) !== "";
    var numericIntentValue = hasIntentValue ? Number(enemy.intentValue) : NaN;
    var showIntentNumericPrimary = hasIntentValue && isFinite(numericIntentValue) && numericIntentValue > 0;
    var intentValueSize = Math.max(compact ? 13 : 15, Math.round((compact ? 15 : 17) * hudDepth.intentScale));
    var intentRadius = compact ? 22 : 24;
    var intentCenterX = Math.round(portraitCenterX);
    var intentCenterY = Math.round(portraitY + 8);
    var badgeTimeMs = typeof enemy.timeMs === "number" ? enemy.timeMs :
      (G.main?.getTime ? G.main.getTime() : 0);
    var telegraphedThreatIntent = hasFirearmThreat && enemy.intent === "buff" && showIntentNumericPrimary;
    var actualAttackIntent = enemy.intent === "attack" && showIntentNumericPrimary;
    var telegraphWave = telegraphedThreatIntent ? ((Math.sin(badgeTimeMs / 420) + 1) / 2) : 0;
    var attackWave = actualAttackIntent ? Math.pow((Math.sin(badgeTimeMs / (dangerIntent ? 135 : 175)) + 1) / 2, dangerIntent ? 2.4 : 2) : 0;
    var badgeScale = telegraphedThreatIntent ?
      (1 + telegraphWave * 0.045) :
      (actualAttackIntent ? (1 + attackWave * (dangerIntent ? 0.052 : 0.034)) : 1);
    var badgeTextAlpha = telegraphedThreatIntent ?
      (0.86 + telegraphWave * 0.14) :
      (actualAttackIntent ? (0.94 + attackWave * 0.06) : 1);
    var badgeGlowAlpha = actualAttackIntent ? ((dangerIntent ? 0.08 : 0.05) + attackWave * (dangerIntent ? 0.16 : 0.1)) : 0;
    var telegraphRingAlpha = telegraphedThreatIntent ? (0.34 + telegraphWave * 0.34) : 0;
    var telegraphCrosshairReach = telegraphedThreatIntent ? (5 + telegraphWave * 3.5) : 0;
    var attackPulseRadius = actualAttackIntent ? (intentRadius + 3 + attackWave * (dangerIntent ? 3.6 : 2.4)) : 0;
    var intentBadgeLabel = telegraphedThreatIntent ? "\u9884" : getIntentBadgeText(enemy.intent, enemy);
    var intentBadgeValueText = hasIntentValue ? String(enemy.intentValue) : "";
    var showIntentTypeLabel = showIntentNumericPrimary;
    var intentBadgeText = showIntentNumericPrimary ? intentBadgeValueText : intentBadgeLabel;
    var intentBadgePrimaryY = showIntentTypeLabel ? intentCenterY + (compact ? 5 : 6) : intentCenterY + 1;
    var intentBadgePrimarySize = showIntentNumericPrimary ?
      intentValueSize :
      Math.max(compact ? 11 : 12, Math.round((compact ? 12 : 14) * hudDepth.intentScale));
    var intentBadgeLabelY = intentCenterY - (compact ? 9 : 10);
    var intentBadgeLabelSize = telegraphedThreatIntent ?
      Math.max(compact ? 8 : 9, Math.round((compact ? 9 : 10) * hudDepth.intentScale)) :
      Math.max(compact ? 7 : 8, Math.round((compact ? 8 : 9) * hudDepth.intentScale));
    var weaponLabel = enemy.firearmStage && enemy.firearmStage !== "none" && G.nemesis && typeof G.nemesis.getFirearmLabel === "function" ?
      G.nemesis.getFirearmLabel(enemy.firearmStage) :
      "";
    var adaptationMeta = enemy.currentAdaptation && G.nemesis && typeof G.nemesis.getAdaptationMeta === "function" ?
      G.nemesis.getAdaptationMeta(enemy.currentAdaptation, enemy.kind === "nemesis" ? 3 : 1) :
      null;
    var intentMetaLabel = (enemy.intent !== "attack" || hasFirearmThreat) && enemy.intentLabel ?
      (telegraphedThreatIntent ? "\u9884\u544a\u00b7" + enemy.intentLabel : enemy.intentLabel) :
      "";
    var baseInfoPanelWidth = Math.max(compact ? 112 : 146, Math.min(compact ? width - 20 : width - 16, compact ? 168 : 188));
    var baseInfoPanelHeight = compact ? 64 : 70;
    var infoPanelWidth = Math.min(width - 14, Math.max(compact ? 108 : 136, Math.round(baseInfoPanelWidth * hudDepth.panelScale)));
    var singleEnemyLift = !compact && slotCount <= 1 ? 20 : 0;
    var infoMetaLabel = intentMetaLabel || weaponLabel || (adaptationMeta ? adaptationMeta.name : "");
    var infoMetaWidth = 0;
    var infoMetaChipWidth = 0;
    var infoMetaChipHeight = compact ? 16 : 18;
    var blockChipWidth = 0;
    var blockChipHeight = compact ? 16 : 18;
    var paperTextColor = isNemesis ? "#eadfce" : "#ebe0d1";
    var paperMutedColor = isNemesis ? "#bbab98" : "#c7b7a3";
    var metaTextColor = hasFirearmThreat ? "#e5d0b2" : "#cdbba6";
    var hpText = enemy.hp + " / " + enemy.maxHp;
    var stripGradient = null;
    var accentLineGradient = null;
    var separatorGradient = null;
    var blockText = enemy.block > 0 ? "\u73b0\u5b88 " + enemy.block : "";
    var infoMetaChipFill = enemy.intent === "block" ?
      "rgba(42, 36, 31, 0.82)" :
      ((enemy.intentData && enemy.intentData.firearm) || hasFirearmThreat ?
        "rgba(96, 54, 31, 0.86)" :
        (enemy.intent === "debuff" ? "rgba(78, 60, 30, 0.8)" : "rgba(52, 48, 35, 0.76)"));
    var infoMetaChipStroke = enemy.intent === "block" ?
      "rgba(196, 180, 154, 0.22)" :
      ((enemy.intentData && enemy.intentData.firearm) || hasFirearmThreat ?
        "rgba(228, 191, 146, 0.3)" :
        (enemy.intent === "debuff" ? "rgba(214, 191, 138, 0.22)" : "rgba(188, 176, 142, 0.2)"));
    var blockChipFill = "rgba(38, 34, 31, 0.84)";
    var blockChipStroke = "rgba(188, 174, 148, 0.24)";

    infoPanelY -= singleEnemyLift;

    if (infoMetaLabel) {
      ctx.save();
      ctx.font = "600 " + metaSize + "px " + getUiBodyFontFamily();
      infoMetaWidth = Math.ceil(ctx.measureText(infoMetaLabel).width + 14);
      ctx.restore();
      infoMetaChipWidth = Math.max(compact ? 58 : 70, infoMetaWidth);
    }

    if (blockText) {
      ctx.save();
      ctx.font = "600 " + blockLabelSize + "px " + getUiBodyFontFamily();
      blockChipWidth = Math.max(compact ? 52 : 62, Math.ceil(ctx.measureText(blockText).width + 16));
      ctx.restore();
    }

    var panelInnerX = 8;
    var nameRowTop = 4;
    var separatorY = compact ? 22 : 24;
    var infoRowTop = compact ? 23 : 26;
    var infoRowHeight = Math.max(compact ? 16 : 18, Math.max(infoMetaChipHeight, hpValueSize + 2));
    var infoRowGap = compact ? 4 : 5;
    var barHeight = compact ? 8 : 9;
    var infoMetaChipTop = infoRowTop + Math.max(0, Math.floor((infoRowHeight - infoMetaChipHeight) / 2));
    var infoMetaChipCenterY = infoMetaChipTop + Math.round(infoMetaChipHeight / 2);
    var hpTextY = infoRowTop + Math.round(infoRowHeight / 2);
    var barY = infoRowTop + infoRowHeight + infoRowGap;
    var blockChipTop = barY + barHeight + infoRowGap;
    var blockChipCenterY = blockChipTop + Math.round(blockChipHeight / 2);
    var requiredInfoPanelHeight = blockText ?
      blockChipTop + blockChipHeight + (compact ? 4 : 5) :
      barY + barHeight + (compact ? 5 : 6);
    var infoPanelHeight = Math.max(requiredInfoPanelHeight, Math.round(baseInfoPanelHeight * hudDepth.panelScale));
    var infoPanelX = Math.round(Math.max(x + 9, Math.min(x + width - infoPanelWidth - 9, portraitCenterX - infoPanelWidth / 2)));
    var infoPanelY = Math.round(Math.min(y + height - infoPanelHeight - 8, portraitY + portraitHeight - Math.round(infoPanelHeight * 0.3)));

    if (drawPortraitPass) {
      ctx.save();
      var glow = ctx.createRadialGradient(
        x + width * 0.5,
        y + height * 0.38,
        Math.max(18, width * 0.06),
        x + width * 0.5,
        y + height * 0.52,
        Math.max(width, height) * 0.78
      );
      glow.addColorStop(0, "rgba(233, 204, 162, " + (0.16 * hudDepth.glowAlphaScale) + ")");
      glow.addColorStop(0.34, "rgba(137, 71, 56, " + (0.08 * hudDepth.glowAlphaScale) + ")");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 10, y - 10, width + 20, height + 20);
      ctx.restore();

      if (G.render.assets && typeof G.render.assets.drawEnemyPortrait === "function") {
        G.render.assets.drawEnemyPortrait(ctx, {
          enemy: enemy,
          x: portraitX,
          y: portraitY,
          width: portraitWidth,
          height: portraitHeight,
          presentation: "battlefield"
        });
      }
    }

    if (!drawOverlayPass) {
      return;
    }

    ctx.save();
    ctx.globalAlpha *= hudDepth.panelAlpha;
    stripGradient = ctx.createLinearGradient(infoPanelX, infoPanelY - 6, infoPanelX, infoPanelY + infoPanelHeight + 10);
    stripGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    stripGradient.addColorStop(0.16, "rgba(10, 11, 13, 0.22)");
    stripGradient.addColorStop(0.58, "rgba(8, 9, 11, 0.34)");
    stripGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = stripGradient;
    ctx.fillRect(infoPanelX - 10, infoPanelY - 6, infoPanelWidth + 20, infoPanelHeight + 14);
    ctx.fillStyle = "rgba(9, 10, 12, " + (compact ? 0.04 : 0.06) + ")";
    ctx.fillRect(infoPanelX + 6, infoPanelY + 6, infoPanelWidth - 12, infoPanelHeight - 14);

    accentLineGradient = ctx.createLinearGradient(infoPanelX, infoPanelY + infoPanelHeight - 6, infoPanelX + infoPanelWidth, infoPanelY + infoPanelHeight - 6);
    accentLineGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    accentLineGradient.addColorStop(0.18, frontThreatLevel > 0.01 ? (threatStyle === "firearm" ? "rgba(142, 44, 34, 0.24)" :
      (threatStyle === "bayonet" ? "rgba(136, 62, 36, 0.22)" :
        (threatStyle === "blunt" ? "rgba(132, 70, 28, 0.2)" : "rgba(120, 42, 38, 0.2)"))) : "rgba(216, 188, 150, 0.06)");
    accentLineGradient.addColorStop(0.82, frontThreatLevel > 0.01 ? "rgba(216, 188, 150, 0.12)" : "rgba(216, 188, 150, 0.08)");
    accentLineGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = accentLineGradient;
    ctx.fillRect(infoPanelX, infoPanelY + infoPanelHeight - 7, infoPanelWidth, 1.8);
    separatorGradient = ctx.createLinearGradient(infoPanelX + panelInnerX, infoPanelY + separatorY, infoPanelX + infoPanelWidth - panelInnerX, infoPanelY + separatorY);
    separatorGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    separatorGradient.addColorStop(0.18, "rgba(224, 200, 168, 0.04)");
    separatorGradient.addColorStop(0.82, "rgba(224, 200, 168, 0.04)");
    separatorGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = separatorGradient;
    ctx.fillRect(infoPanelX + panelInnerX, infoPanelY + separatorY, infoPanelWidth - panelInnerX * 2, 1);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha *= hudDepth.textAlpha;
    drawWrappedLabel(
      ctx,
      enemy.name,
      infoPanelX + panelInnerX,
      infoPanelY + nameRowTop,
      Math.max(42, infoPanelWidth - panelInnerX * 2),
      compact ? 11 : 13,
      {
        size: titleSize,
        color: paperTextColor,
        maxLines: 1,
        shadowColor: "rgba(0, 0, 0, 0.8)",
        shadowBlur: 3,
        shadowOffsetX: 1,
        shadowOffsetY: 1
      }
    );
    ctx.restore();

    if (infoMetaLabel) {
      ctx.save();
      ctx.globalAlpha *= hudDepth.textAlpha;
      drawPanel(ctx, infoPanelX + panelInnerX, infoPanelY + infoMetaChipTop, infoMetaChipWidth, infoMetaChipHeight, {
        fill: infoMetaChipFill,
        stroke: infoMetaChipStroke,
        lineWidth: 1.2,
        holes: false
      });
      drawLabel(ctx, infoMetaLabel, infoPanelX + panelInnerX + infoMetaChipWidth / 2, infoPanelY + infoMetaChipCenterY, {
        size: metaSize + 1,
        align: "center",
        color: metaTextColor,
        shadowColor: "rgba(0, 0, 0, 0.8)",
        shadowBlur: 3,
        shadowOffsetX: 1,
        shadowOffsetY: 1
      });
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha *= hudDepth.textAlpha;
    drawLabel(ctx, hpText, infoPanelX + infoPanelWidth - panelInnerX, infoPanelY + hpTextY, {
      size: hpValueSize,
      align: "right",
      color: paperTextColor,
      shadowColor: "rgba(0, 0, 0, 0.8)",
      shadowBlur: 3,
      shadowOffsetX: 1,
      shadowOffsetY: 1
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha *= hudDepth.barAlpha;
    drawBar(ctx, infoPanelX + panelInnerX, infoPanelY + barY, infoPanelWidth - panelInnerX * 2, barHeight, enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0, {
      textureRole: "combat-blood",
      background: "rgba(24, 17, 18, 0.82)",
      fill: "#a22d2f",
      stroke: "rgba(130, 28, 34, 0.46)",
      filter: "brightness(1.08) contrast(1.04)"
    });
    ctx.restore();

    if (enemy.block > 0) {
      ctx.save();
      ctx.globalAlpha *= hudDepth.textAlpha;
      drawPanel(ctx, infoPanelX + panelInnerX, infoPanelY + blockChipTop, blockChipWidth, blockChipHeight, {
        fill: blockChipFill,
        stroke: blockChipStroke,
        lineWidth: 1.1,
        holes: false
      });
      drawLabel(ctx, blockText, infoPanelX + panelInnerX + blockChipWidth / 2, infoPanelY + blockChipCenterY, {
        size: blockLabelSize + 2,
        align: "center",
        color: paperMutedColor,
        shadowColor: "rgba(0, 0, 0, 0.8)",
        shadowBlur: 3,
        shadowOffsetX: 1,
        shadowOffsetY: 1
      });
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha *= hudDepth.intentAlpha;
    ctx.translate(intentCenterX, intentCenterY);
    ctx.scale(badgeScale, badgeScale);
    if (badgeGlowAlpha > 0) {
      var badgeGlow = ctx.createRadialGradient(0, 0, Math.max(4, intentRadius * 0.25), 0, 0, intentRadius + 10);
      badgeGlow.addColorStop(0, "rgba(255, 226, 198, " + badgeGlowAlpha + ")");
      badgeGlow.addColorStop(0.5, "rgba(188, 52, 40, " + (badgeGlowAlpha * 0.45) + ")");
      badgeGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = badgeGlow;
      ctx.fillRect(-intentRadius - 14, -intentRadius - 14, (intentRadius + 14) * 2, (intentRadius + 14) * 2);
    }
    ctx.fillStyle = intentPalette.fill;
    ctx.beginPath();
    ctx.arc(0, 0, intentRadius - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = intentPalette.stroke || "#d9cfc1";
    ctx.lineWidth = telegraphedThreatIntent ? 1.5 : 1.3;
    ctx.stroke();

    if (telegraphedThreatIntent) {
      ctx.save();
      ctx.globalAlpha *= telegraphRingAlpha;
      ctx.strokeStyle = intentPalette.ring || "rgba(239, 195, 148, 0.38)";
      ctx.lineWidth = 1.1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, intentRadius + 4 + telegraphWave * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(-intentRadius - telegraphCrosshairReach, 0);
      ctx.lineTo(-intentRadius - 1.5, 0);
      ctx.moveTo(intentRadius + 1.5, 0);
      ctx.lineTo(intentRadius + telegraphCrosshairReach, 0);
      ctx.moveTo(0, -intentRadius - telegraphCrosshairReach);
      ctx.lineTo(0, -intentRadius - 1.5);
      ctx.moveTo(0, intentRadius + 1.5);
      ctx.lineTo(0, intentRadius + telegraphCrosshairReach);
      ctx.stroke();
      ctx.restore();
    } else if (actualAttackIntent) {
      ctx.save();
      ctx.globalAlpha *= 0.24 + attackWave * (dangerIntent ? 0.36 : 0.24);
      ctx.strokeStyle = intentPalette.ring || "rgba(228, 204, 174, 0.24)";
      ctx.lineWidth = dangerIntent ? 1.25 : 1;
      ctx.beginPath();
      ctx.arc(0, 0, attackPulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha *= hudDepth.textAlpha * badgeTextAlpha;
    drawLabel(ctx, intentBadgeText, intentCenterX, intentBadgePrimaryY, {
      size: intentBadgePrimarySize,
      align: "center",
      color: intentPalette.text || "#f5ead7",
      shadowColor: "rgba(0, 0, 0, 0.8)",
      shadowBlur: 2,
      shadowOffsetX: 1,
      shadowOffsetY: 1
    });
    if (showIntentTypeLabel) {
      drawLabel(ctx, intentBadgeLabel, intentCenterX, intentBadgeLabelY, {
        size: intentBadgeLabelSize,
        align: "center",
        color: intentPalette.text || "#f5ead7",
        shadowColor: "rgba(0, 0, 0, 0.8)",
        shadowBlur: 2,
        shadowOffsetX: 1,
        shadowOffsetY: 1
      });
    }
    ctx.restore();

  }

  function drawCardParchmentPatina(ctx, x, y, width, height) {
    var inset = 6;
    var innerX = x + inset;
    var innerY = y + inset;
    var innerWidth = Math.max(0, width - inset * 2);
    var innerHeight = Math.max(0, height - inset * 2);
    var edgeShade = null;
    var topShade = null;
    var bottomShade = null;
    var foldLine = null;

    if (innerWidth <= 0 || innerHeight <= 0) {
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX, innerY, innerWidth, innerHeight);
    ctx.clip();

    topShade = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerHeight * 0.18);
    topShade.addColorStop(0, "rgba(70, 56, 43, 0.09)");
    topShade.addColorStop(1, "rgba(78, 61, 43, 0)");
    ctx.fillStyle = topShade;
    ctx.fillRect(innerX, innerY, innerWidth, innerHeight * 0.18);

    bottomShade = ctx.createLinearGradient(innerX, innerY + innerHeight, innerX, innerY + innerHeight * 0.78);
    bottomShade.addColorStop(0, "rgba(78, 60, 45, 0.12)");
    bottomShade.addColorStop(1, "rgba(82, 64, 46, 0)");
    ctx.fillStyle = bottomShade;
    ctx.fillRect(innerX, innerY + innerHeight * 0.78, innerWidth, innerHeight * 0.22);

    edgeShade = ctx.createLinearGradient(innerX, innerY, innerX + innerWidth * 0.18, innerY);
    edgeShade.addColorStop(0, "rgba(62, 49, 39, 0.09)");
    edgeShade.addColorStop(1, "rgba(62, 49, 39, 0)");
    ctx.fillStyle = edgeShade;
    ctx.fillRect(innerX, innerY, innerWidth * 0.2, innerHeight);

    edgeShade = ctx.createLinearGradient(innerX + innerWidth, innerY, innerX + innerWidth * 0.82, innerY);
    edgeShade.addColorStop(0, "rgba(62, 49, 39, 0.09)");
    edgeShade.addColorStop(1, "rgba(62, 49, 39, 0)");
    ctx.fillStyle = edgeShade;
    ctx.fillRect(innerX + innerWidth * 0.8, innerY, innerWidth * 0.2, innerHeight);

    foldLine = ctx.createLinearGradient(innerX, innerY + innerHeight * 0.68, innerX + innerWidth, innerY + innerHeight * 0.68);
    foldLine.addColorStop(0, "rgba(0, 0, 0, 0)");
    foldLine.addColorStop(0.2, "rgba(87, 70, 53, 0.04)");
    foldLine.addColorStop(0.8, "rgba(87, 70, 53, 0.04)");
    foldLine.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = foldLine;
    ctx.fillRect(innerX, innerY + innerHeight * 0.68, innerWidth, 2);

    ctx.restore();
  }

  function drawCardSlot(ctx, card) {
    var width = card.width;
    var height = card.height;
    var x = card.x;
    var y = card.y;
    var sourceCard = getCardDataSource(card);
    var isDetailLayout = card.layoutMode === "detail";
    var isRewardLayout = card.artRole === "reward" || card.layoutMode === "reward";
    var isExpandedTextLayout = isRewardLayout || isDetailLayout;
    var combatReadout = card.artRole === "combat" ? getCombatCardReadout(card) : null;
    var isCombatHand = !!combatReadout && !isExpandedTextLayout;
    var ruleText = isCombatHand && combatReadout.primary ? combatReadout.secondary : card.text;
    var artInsetX = 9;
    var artInsetY = 9;
    var artX = 0;
    var artY = 0;
    var artWidth = 0;
    var artHeight = 0;
    var titleBandY = 0;
    var titleBandHeight = height >= 188 ? 22 : 20;
    var bodyX = 0;
    var bodyY = 0;
    var bodyWidth = 0;
    var bodyHeight = 0;
    var textStartY = 0;
    var textLineHeight = 15;
    var maxLines = card.height >= 150 ? 4 : 3;
    var edgeStroke = "#2c221d";
    var innerStroke = "rgba(74, 59, 47, 0.16)";
    var costFill = card.comboDiscounted ? "#642521" : "rgba(34, 30, 27, 0.94)";
    var costStroke = card.cost > 0 ? "rgba(216, 193, 164, 0.52)" : "rgba(163, 151, 138, 0.28)";
    var costColor = card.cost > 0 ? "#f0e6d6" : "#d5cabb";
    var typeBadge = combatReadout ? combatReadout.type : getCardTypeBadge(card);
    var titleBandFill = card.comboDiscounted ? "rgba(118, 42, 36, 0.18)" : "rgba(248, 241, 231, 0.64)";
    var titleRule = card.comboDiscounted ? "rgba(118, 42, 36, 0.18)" : "rgba(118, 101, 82, 0.26)";
    var bodyFill = card.playable ? "rgba(247, 242, 234, 0.72)" : "rgba(232, 226, 218, 0.56)";
    if (G.render.woodcut && G.render.woodcut.materialRevision >= 2) {
      titleBandFill = "rgba(194, 171, 131, 0.64)";
      bodyFill = card.playable ? "rgba(188, 169, 134, 0.64)" : "rgba(158, 146, 120, 0.54)";
    }
    var bodyStroke = "rgba(103, 86, 68, 0.16)";
    var stampX = 0;
    var typeStampY = 0;
    var comboStampY = 0;
    var stampSize = 22;
    var costCenterX = 0;
    var costCenterY = 0;
    var bodyGradient = null;
    var titleGradient = null;
    var cardArtRendered = false;
    var effectNote = getCardEffectNote(card);
    var effectNotePalette = getCardEffectNotePalette(effectNote);
    var effectTokens = buildCardEffectTokens(card);
    var showFooterTokens = typeof card.showFooterTokens === "boolean" ? card.showFooterTokens : !isExpandedTextLayout;
    var footerTokens = showFooterTokens && height >= 176 ? effectTokens.slice(0, 3) : [];
    var footerText = footerTokens.join(" \u00b7 ");
    var footerHeight = footerText ? 16 : 0;
    var effectChipWidth = effectNote && effectNote.label ? Math.max(30, effectNote.label.length * 11 + 10) : 0;
    var effectChipHeight = 13;
    var effectChipX = 0;
    var effectChipY = 0;
    if (isCombatHand) effectChipWidth = 0;
    var titleTextWidth = 0;
    var titleText = String(card.name || "");
    var readableFontFamily = getUiReadableFontFamily();
    var titleFontFamily = readableFontFamily;
    var ruleTextSize = isDetailLayout ? 12 : (isRewardLayout ? (height >= 188 ? 12.5 : 12) : (height >= 188 ? 12 : 11.5));
    var titleFontSize = isDetailLayout ? 17 : (height >= 188 ? 17 : 16);
    var readingScale = card.readingScale || 1;
    ruleTextSize *= readingScale;

    function refreshMetrics() {
      artX = x + artInsetX;
      artY = y + artInsetY;
      artWidth = width - artInsetX * 2;
      artHeight = Math.max(
        isExpandedTextLayout ? 40 : 46,
        Math.min(
          height >= 188 ? (isExpandedTextLayout ? (isDetailLayout ? 96 : 70) : 88) : (isExpandedTextLayout ? (isDetailLayout ? 76 : 60) : 72),
          Math.floor(height * (height >= 188 ? (isExpandedTextLayout ? (isDetailLayout ? 0.4 : 0.34) : 0.43) : (isExpandedTextLayout ? (isDetailLayout ? 0.38 : 0.33) : 0.39)))
        )
      );
      titleBandY = artY + artHeight + 8;
      if (readingScale > 1) { artHeight *= .78; titleBandY = artY + artHeight + 8; }
      bodyX = x + 11;
      bodyWidth = width - 22;
      bodyY = titleBandY + titleBandHeight + (isExpandedTextLayout ? 6 : 7);
      bodyHeight = Math.max(isExpandedTextLayout ? (isDetailLayout ? 48 : 44) : 36, y + height - 11 - bodyY - (footerHeight ? footerHeight + 6 : 0));
      textStartY = bodyY + 7;
      if (isCombatHand && combatReadout.primary) textStartY += 20;
      textLineHeight = isDetailLayout ? 14 : (isRewardLayout ? (height >= 150 ? 14.5 : 13.5) : (height >= 150 ? 15 : 14));
      maxLines = isDetailLayout ?
        (bodyHeight >= 82 ? 5 : (bodyHeight >= 66 ? 4 : 3)) :
        (isRewardLayout ?
        (bodyHeight >= 68 ? 5 : (bodyHeight >= 52 ? 4 : 3)) :
        (bodyHeight >= 64 ? 4 : 3));
      costCenterX = x + 21;
      if (readingScale > 1) { textLineHeight *= readingScale; maxLines = Math.max(3,Math.floor((bodyHeight-12)/textLineHeight)); }
      costCenterY = y + 21;
      stampX = x + width - 34;
      typeStampY = artY + 2;
      if (isCombatHand) {
        stampSize = 26;
        stampX = x + 8;
        typeStampY = artY + 30;
      }
      comboStampY = artY + 28;
      effectChipX = bodyX + bodyWidth - effectChipWidth - 6;
      effectChipY = titleBandY + Math.floor((titleBandHeight - effectChipHeight) / 2);
      titleTextWidth = bodyWidth - 14 - (effectChipWidth ? effectChipWidth + 8 : 0);
    }

    refreshMetrics();

    ctx.save();

    if (typeof card.alpha === "number") {
      ctx.globalAlpha *= Math.max(0, Math.min(1, card.alpha));
    }

    if (card.rotation || card.scale) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(card.rotation || 0);
      ctx.scale(card.scale || 1, card.scale || 1);
      x = -width / 2;
      y = -height / 2;
      refreshMetrics();
    }

    if (!card.disableBaseShadow) {
      ctx.save();
      ctx.fillStyle = "rgba(24, 18, 17, 0.22)";
      ctx.beginPath();
      ctx.moveTo(x + 10, y + height - 2);
      ctx.lineTo(x + width - 8, y + height - 8);
      ctx.lineTo(x + width - 12, y + height + 6);
      ctx.lineTo(x + 6, y + height + 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = card.shadowColor || "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = typeof card.shadowBlur === "number" ? card.shadowBlur : 8;
    ctx.shadowOffsetX = typeof card.shadowOffsetX === "number" ? card.shadowOffsetX : 2;
    ctx.shadowOffsetY = typeof card.shadowOffsetY === "number" ? card.shadowOffsetY : 4;
    if (G.render.assets && typeof G.render.assets.drawCombatCardSurface === "function") {
      G.render.assets.drawCombatCardSurface(ctx, {
        x: x,
        y: y,
        width: width,
        height: height,
        playable: card.playable,
        comboDiscounted: card.comboDiscounted
      });
    } else {
      drawPanel(ctx, x, y, width, height, {
        fill: card.playable ? "#c5b9a8" : "#a89d8d",
        stroke: edgeStroke,
        lineWidth: 2,
        holes: false
      });
      ctx.fillStyle = card.playable ? "#ddd3c1" : "#c2b7a6";
      ctx.fillRect(x + 6, y + 6, width - 12, height - 12);
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();

    if (card.glowColor) {
      ctx.save();
      ctx.shadowColor = card.glowColor;
      ctx.shadowBlur = typeof card.glowBlur === "number" ? card.glowBlur : 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = card.accentStroke || edgeStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = innerStroke;
    ctx.lineWidth = 1.2;
    if (!(G.render.assets && typeof G.render.assets.drawCombatCardSurface === "function")) {
      ctx.strokeRect(x + 7.5, y + 7.5, width - 15, height - 15);
    }
    ctx.restore();

    drawCardParchmentPatina(ctx, x, y, width, height);

    ctx.save();
    bodyGradient = ctx.createLinearGradient(bodyX, bodyY - 2, bodyX, bodyY + bodyHeight + 4);
    bodyGradient.addColorStop(0, card.playable ? "rgba(249, 244, 236, 0.36)" : "rgba(232, 228, 221, 0.22)");
    bodyGradient.addColorStop(1, bodyFill);
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(bodyX, bodyY - 2, bodyWidth, bodyHeight + 4);
    ctx.strokeStyle = bodyStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(bodyX + 0.5, bodyY - 1.5, bodyWidth - 1, bodyHeight + 2);
    ctx.restore();

    if (G.render.assets && typeof G.render.assets.drawCardArt === "function") {
      cardArtRendered = !!G.render.assets.drawCardArt(ctx, {
        card: card,
        sourceCard: sourceCard,
        cardId: (sourceCard && sourceCard.id) || card.definitionId || card.id,
        artRole: card.artRole,
        artPath: card.artPath,
        style: card.style,
        typeLabel: typeBadge.label,
        comboTag: !!card.comboTag,
        comboDiscounted: !!card.comboDiscounted,
        x: artX,
        y: artY,
        width: artWidth,
        height: artHeight
      });
    }

    if (!cardArtRendered) {
      var artCenterX = artX + artWidth / 2;
      var artCenterY = artY + artHeight / 2;
      ctx.save();
      ctx.fillStyle = "rgba(22, 18, 17, 0.88)";
      ctx.fillRect(artX, artY, artWidth, artHeight);
      ctx.strokeStyle = "rgba(76, 59, 46, 0.24)";
      ctx.lineWidth = 1;
      ctx.strokeRect(artX + 0.5, artY + 0.5, artWidth - 1, artHeight - 1);
      ctx.restore();
      drawLabel(ctx, typeBadge.label, artCenterX, artCenterY - 1, {
        size: Math.max(22, Math.floor(artHeight * 0.56)),
        color: card.comboDiscounted ? "rgba(208, 144, 133, 0.24)" : "rgba(220, 208, 192, 0.18)",
        align: "center",
        weight: "700",
        shadow: false,
        fontFamily: getUiBodyFontFamily()
      });
    }

    ctx.save();
    titleGradient = ctx.createLinearGradient(bodyX, titleBandY, bodyX, titleBandY + titleBandHeight);
    titleGradient.addColorStop(0, "rgba(255, 250, 242, 0.12)");
    titleGradient.addColorStop(1, titleBandFill);
    ctx.fillStyle = titleGradient;
    ctx.fillRect(bodyX, titleBandY, bodyWidth, titleBandHeight);
    ctx.strokeStyle = titleRule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bodyX + 6, titleBandY + 0.5);
    ctx.lineTo(bodyX + bodyWidth - 6, titleBandY + 0.5);
    ctx.moveTo(bodyX + 6, titleBandY + titleBandHeight - 0.5);
    ctx.lineTo(bodyX + bodyWidth - 6, titleBandY + titleBandHeight - 0.5);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = costFill;
    ctx.beginPath();
    ctx.arc(costCenterX, costCenterY, 13.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = costStroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, String(card.cost), costCenterX, costCenterY, {
      size: 17,
      color: costColor,
      align: "center",
      weight: "700",
      shadow: false,
      fontFamily: getUiBodyFontFamily()
    });

    if (isCombatHand) {
      ctx.save();
      ctx.fillStyle = typeBadge.fill;
      ctx.strokeStyle = "rgba(237, 223, 201, 0.66)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeBadge.shape === "round") {
        ctx.arc(stampX + stampSize / 2, typeStampY + stampSize / 2, stampSize / 2, 0, Math.PI * 2);
      } else if (typeBadge.shape === "diamond") {
        ctx.moveTo(stampX + stampSize / 2, typeStampY - 2);
        ctx.lineTo(stampX + stampSize + 2, typeStampY + stampSize / 2);
        ctx.lineTo(stampX + stampSize / 2, typeStampY + stampSize + 2);
        ctx.lineTo(stampX - 2, typeStampY + stampSize / 2);
        ctx.closePath();
      } else {
        ctx.rect(stampX, typeStampY, stampSize, stampSize);
      }
      ctx.fill();ctx.stroke();ctx.clip();
      if (G.render.assets && G.render.assets.drawCombatCardStamp) {
        G.render.assets.drawCombatCardStamp(ctx, stampX, typeStampY, stampSize, stampSize, {alpha: 0.32, tintColor: typeBadge.fill});
      }
      ctx.restore();
    } else if (!(G.render.assets && typeof G.render.assets.drawCombatCardStamp === "function" &&
      G.render.assets.drawCombatCardStamp(ctx, stampX, typeStampY, stampSize, stampSize, {
        alpha: 0.92,
        tintColor: "rgba(112, 36, 31, 0.9)"
      }))) {
      ctx.save();
      ctx.fillStyle = "rgba(112, 36, 31, 0.9)";
      ctx.fillRect(stampX, typeStampY, stampSize, stampSize);
      ctx.strokeStyle = "rgba(236, 216, 196, 0.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(stampX + 0.5, typeStampY + 0.5, stampSize - 1, stampSize - 1);
      ctx.restore();
    }
    drawLabel(ctx, typeBadge.label, stampX + stampSize / 2, typeStampY + stampSize / 2, {
      size: isCombatHand ? (typeBadge.label.length > 1 ? 12 : 17) : 10,
      color: "#efe3d2",
      align: "center",
      shadow: false,
      fontFamily: readableFontFamily
    });

    if (effectChipWidth > 0) {
      ctx.save();
      ctx.fillStyle = effectNotePalette.fill;
      ctx.fillRect(effectChipX, effectChipY, effectChipWidth, effectChipHeight);
      ctx.strokeStyle = effectNotePalette.stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(effectChipX + 0.5, effectChipY + 0.5, effectChipWidth - 1, effectChipHeight - 1);
      ctx.restore();
      drawLabel(ctx, effectNote.label, effectChipX + effectChipWidth / 2, effectChipY + effectChipHeight / 2 - 0.5, {
        size: 10,
        color: mechanicSpans(effectNote.label).length ? mechanicPalette.paper : effectNotePalette.text,
        align: "center",
        shadow: false,
        weight: "700",
        fontFamily: readableFontFamily
      });
    }

    if (!isExpandedTextLayout) {
      // Fit combat text within its existing windows, without changing card or
      // reward geometry. A four-character title used to fade under its chip.
      ctx.save();
      ctx.font = "800 " + titleFontSize + "px " + titleFontFamily;
      var measuredTitleWidth = ctx.measureText(titleText).width;
      if (measuredTitleWidth > titleTextWidth) titleFontSize *= titleTextWidth / measuredTitleWidth;
      var availableTextHeight = bodyY + bodyHeight - 3 - textStartY;
      for (var fitSize = ruleTextSize; fitSize >= 10; fitSize -= 0.25) {
        ctx.font = "700 " + fitSize + "px " + readableFontFamily;
        var fullLines = (readingScale > 1 || isCombatHand) && G.render.journeyTypesetting ? G.render.journeyTypesetting.lines(ctx,ruleText,bodyWidth-12).length : buildWrappedLineLayout(ctx, ruleText, bodyWidth - 12, 0).lines.length;
        var fitLeading = Math.max(11, fitSize + 2);
        if (fullLines * fitLeading <= availableTextHeight + fitLeading / 2) {
          ruleTextSize = fitSize; textLineHeight = fitLeading; maxLines = fullLines; break;
        }
      }
      if (isCombatHand) {
        // Dense rules may still need long-press reading, but never spill past paper.
        ctx.font = "700 " + ruleTextSize + "px " + readableFontFamily;
        var handLines = G.render.journeyTypesetting ? G.render.journeyTypesetting.lines(ctx, ruleText, bodyWidth - 12).length : buildWrappedLineLayout(ctx, ruleText, bodyWidth - 12, 0).lines.length;
        if (handLines * textLineHeight > availableTextHeight + textLineHeight / 2) {
          ruleTextSize = 10;
          textLineHeight = 11;
        }
        maxLines = Math.max(1, Math.floor(availableTextHeight / textLineHeight) + 1);
      }
      ctx.restore();
    }
    drawOverflowFadeLabel(ctx, titleText, bodyX + 6, titleBandY + titleBandHeight / 2, titleTextWidth, {
      size: titleFontSize,
      color: card.comboDiscounted ? "#4d1814" : "#1a1410",
      align: "left",
      weight: "800",
      shadow: false,
      fontFamily: titleFontFamily,
      fadeWidth: isRewardLayout ? 22 : 18
    });
    if (isCombatHand && combatReadout.primary) {
      ctx.save();
      var primarySize = 14;
      ctx.font = "800 " + primarySize + "px " + readableFontFamily;
      primarySize *= Math.min(1, (bodyWidth - 12) / Math.max(1, ctx.measureText(combatReadout.primary).width));
      drawLabel(ctx, combatReadout.primary, bodyX + 6, bodyY + 13, {
        size: primarySize, color: "#25160f", weight: "800", shadow: false, fontFamily: readableFontFamily, keywordColor: mechanicPalette.paper
      });
      ctx.restore();
    }
    ctx.save();
    if (isCombatHand) {
      ctx.beginPath();ctx.rect(bodyX, textStartY - 1, bodyWidth, Math.max(0, y + height - 8 - textStartY));ctx.clip();
    }
    drawWrappedLabel(ctx, ruleText, bodyX + 6, textStartY, bodyWidth - 12, textLineHeight, {
      size: ruleTextSize,
      keywordColor: mechanicPalette.paper,
      journeyTypeset: readingScale > 1 || isCombatHand,
      color: isRewardLayout ? "#17100c" : "#18120f",
      maxLines: maxLines,
      fadeOverflow: true,
      fadeWidth: isDetailLayout ? 20 : 16,
      shadow: false,
      weight: "700",
      fontFamily: readableFontFamily
    });
    ctx.restore();

    if (footerText) {
      var footerY = bodyY + bodyHeight + 6;
      var footerLineY = footerY + 0.5;
      ctx.save();
      ctx.strokeStyle = "rgba(112, 95, 76, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bodyX + 5, footerLineY);
      ctx.lineTo(bodyX + bodyWidth - 5, footerLineY);
      ctx.stroke();
      ctx.fillStyle = effectNotePalette.fill;
      ctx.fillRect(bodyX + 4, footerY + 3, bodyWidth - 8, footerHeight - 4);
      ctx.strokeStyle = effectNotePalette.stroke;
      ctx.strokeRect(bodyX + 4.5, footerY + 3.5, bodyWidth - 9, footerHeight - 5);
      ctx.restore();
      drawLabel(ctx, footerText, bodyX + bodyWidth / 2, footerY + footerHeight / 2 + 1, {
        size: 10,
        align: "center",
        color: effectNotePalette.text,
        weight: "700",
        shadow: false,
        fontFamily: readableFontFamily
      });
    }

    if (card.comboTag) {
      var comboSlipX = x + width - 50;
      var comboSlipWidth = 38;
      var comboSlipHeight = 15;
      ctx.save();
      ctx.fillStyle = card.comboDiscounted ? "rgba(121, 39, 35, 0.14)" : "rgba(90, 63, 40, 0.09)";
      ctx.fillRect(comboSlipX, comboStampY, comboSlipWidth, comboSlipHeight);
      ctx.strokeStyle = card.comboDiscounted ? "rgba(121, 39, 35, 0.28)" : "rgba(86, 61, 39, 0.18)";
      ctx.lineWidth = 1;
      ctx.strokeRect(comboSlipX + 0.5, comboStampY + 0.5, comboSlipWidth - 1, comboSlipHeight - 1);
      ctx.beginPath();
      ctx.moveTo(comboSlipX + 5, comboStampY + comboSlipHeight - 4.5);
      ctx.lineTo(comboSlipX + comboSlipWidth - 5, comboStampY + comboSlipHeight - 4.5);
      ctx.stroke();
      ctx.restore();
      drawLabel(ctx, "\u8fde\u73af", comboSlipX + comboSlipWidth / 2, comboStampY + comboSlipHeight / 2 - 0.5, {
        size: 10,
        align: "center",
        color: mechanicPalette.paper,
        weight: "700",
        shadow: false,
        fontFamily: readableFontFamily
      });
    }

    if (card.comboDiscounted) {
      var discountSealX = x + width - 42;
      var discountSealY = y + height - 28;
      var discountSealWidth = 28;
      var discountSealHeight = 14;
      ctx.save();
      ctx.strokeStyle = "rgba(113, 34, 29, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 18, discountSealY + discountSealHeight / 2 + 0.5);
      ctx.lineTo(discountSealX - 6, discountSealY + discountSealHeight / 2 + 0.5);
      ctx.stroke();
      ctx.restore();
      if (!(G.render.assets && typeof G.render.assets.drawCombatCardStamp === "function" &&
        G.render.assets.drawCombatCardStamp(ctx, discountSealX, discountSealY, discountSealWidth, discountSealHeight, {
          alpha: 0.92,
          tintColor: "rgba(112, 31, 27, 0.9)"
        }))) {
        ctx.save();
        ctx.fillStyle = "rgba(112, 31, 27, 0.9)";
        ctx.fillRect(discountSealX, discountSealY, discountSealWidth, discountSealHeight);
        ctx.restore();
      }
      drawLabel(ctx, "\u51cf\u8d39", discountSealX + discountSealWidth / 2, discountSealY + discountSealHeight / 2, {
        size: 10,
        align: "center",
        color: "#f1e7d8",
        weight: "700",
        fontFamily: readableFontFamily
      });
    }

    if (false && card.comboTag) {
      ctx.save();
      ctx.fillStyle = card.comboDiscounted ? "#d9c8a9" : "#d6c3a0";
      ctx.fillRect(x + width - 42, y + 10, 28, 18);
      ctx.strokeStyle = "rgba(59, 47, 47, 0.42)";
      ctx.lineWidth = 1.1;
      ctx.strokeRect(x + width - 41.5, y + 10.5, 27, 17);
      ctx.restore();
      drawLabel(ctx, "连", x + width - 28, y + 19, {
        size: 11,
        align: "center",
        color: "#1a1a1a"
      });
    }

    if (false && card.comboDiscounted) {
      drawLabel(ctx, "减费", x + width - 14, y + height - 14, {
        size: 12,
        align: "right",
        color: "#1a1a1a"
      });
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();
  }

  function drawPileBox(ctx, pile) {
    drawPanel(ctx, pile.x, pile.y, pile.width, pile.height, {
      fill: "rgba(20, 20, 20, 0.94)",
      stroke: pile.active ? "#b12034" : "#4f3f41"
    });
    drawLabel(ctx, pile.label, pile.x + pile.width / 2, pile.y + 18, {
      size: 16,
      align: "center",
      color: pile.active ? "#f0e6d8" : "#c8bbab"
    });
    drawLabel(ctx, String(pile.count), pile.x + pile.width / 2, pile.y + 50, {
      size: 30,
      align: "center",
      color: "#b12034"
    });
  }

  function drawButton(ctx, button) {
    var hasSubtitle = !!button.subtitle;
    drawPanel(ctx, button.x, button.y, button.width, button.height, {
      fill: button.fill || "#7b1724",
      stroke: button.stroke || "#c2a57a",
      lineWidth: button.lineWidth || 2.5,
      surface: button.surface || "wood-button",
      holes: false
    });
    drawLabel(ctx, button.label, button.x + button.width / 2, button.y + button.height / 2 - (hasSubtitle ? 8 : 0), {
      size: button.size || (hasSubtitle ? 22 : 24),
      weight: button.weight || "700",
      align: "center",
      opticalCenter: true,
      color: button.color || "#f6efe4",
      fontFamily: button.fontFamily || getUiTitleFontFamily()
    });

    if (hasSubtitle) {
      drawLabel(ctx, button.subtitle, button.x + button.width / 2, button.y + button.height - 16, {
        size: button.subtitleSize || 12,
        align: "center",
        opticalCenter: true,
        color: button.subtitleColor || "#e2d2bf",
        shadow: false,
        fontFamily: button.subtitleFontFamily || getUiBodyFontFamily()
      });
    }
  }

  function drawListOverlay(ctx, overlay) {
    var panelX = 0;
    var panelY = 0;
    var panelWidth = 0;
    var panelHeight = 0;
    var titleWidth = 72;
    var titleHeight = 22;
    var titleX = 0;
    var titleY = 0;
    var listStartY = 0;
    var footerY = 0;
    var lineHeight = 20;
    var availableHeight = 0;
    var maxItems = 0;
    var visibleItems = [];
    var overflow = 0;
    var i = 0;
    var rowY = 0;
    var mist = null;
    var topRule = null;

    if (!overlay || !overlay.visible) {
      return;
    }

    panelX = overlay.x;
    panelY = overlay.y;
    panelWidth = overlay.width;
    panelHeight = overlay.height;
    titleX = panelX + 12;
    titleY = panelY + 10;
    listStartY = panelY + 52;
    footerY = panelY + panelHeight - 16;
    availableHeight = Math.max(0, footerY - listStartY - 12);
    maxItems = Math.max(1, Math.floor(availableHeight / lineHeight));
    visibleItems = (overlay.items || []).slice(0, maxItems);
    overflow = Math.max(0, (overlay.items || []).length - visibleItems.length);

    ctx.save();
    mist = ctx.createRadialGradient(
      panelX + panelWidth * 0.46,
      panelY + panelHeight * 0.48,
      Math.max(18, panelWidth * 0.12),
      panelX + panelWidth * 0.46,
      panelY + panelHeight * 0.48,
      Math.max(panelWidth, panelHeight) * 0.74
    );
    mist.addColorStop(0, "rgba(24, 19, 17, 0.18)");
    mist.addColorStop(0.48, "rgba(10, 8, 9, 0.08)");
    mist.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = mist;
    ctx.fillRect(panelX - 18, panelY - 20, panelWidth + 36, panelHeight + 40);
    ctx.restore();

    drawPanel(ctx, panelX, panelY, panelWidth, panelHeight, {
      fill: "rgba(10, 11, 14, 0.76)",
      stroke: "rgba(168, 138, 104, 0.14)",
      surface: "ink-panel",
      paperAlpha: 0.04,
      lineWidth: 1.1
    });
    ctx.save();
    ctx.fillStyle = "rgba(9, 10, 12, 0.16)";
    ctx.fillRect(panelX + 6, panelY + 6, panelWidth - 12, panelHeight - 12);
    topRule = ctx.createLinearGradient(panelX + 14, panelY + 40, panelX + panelWidth - 14, panelY + 40);
    topRule.addColorStop(0, "rgba(0, 0, 0, 0)");
    topRule.addColorStop(0.2, "rgba(214, 186, 142, 0.08)");
    topRule.addColorStop(0.8, "rgba(214, 186, 142, 0.08)");
    topRule.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = topRule;
    ctx.fillRect(panelX + 14, panelY + 40, panelWidth - 28, 1);
    ctx.restore();

    drawPanel(ctx, titleX, titleY, titleWidth, titleHeight, {
      fill: "rgba(56, 37, 21, 0.58)",
      stroke: "rgba(214, 186, 142, 0.16)",
      surface: "wood-button",
      paperAlpha: 0.06,
      lineWidth: 0.9
    });
    drawLabel(ctx, overlay.title, titleX + titleWidth / 2, titleY + titleHeight / 2, {
      size: 14,
      align: "center",
      color: "#f0e4d1",
      shadow: false,
      fontFamily: getUiTitleFontFamily()
    });

    if (visibleItems.length === 0) {
      drawLabel(ctx, "此处暂无", panelX + 26, listStartY + 8, {
        size: 14,
        color: "#b7ab9b",
        shadow: false
      });
    }

    for (i = 0; i < visibleItems.length; i += 1) {
      rowY = listStartY + i * lineHeight;
      drawLabel(ctx, String(i + 1).padStart(2, "0"), panelX + 16, rowY, {
        size: 11,
        color: "#8f806d",
        shadow: false
      });
      drawLabel(ctx, visibleItems[i], panelX + 38, rowY, {
        size: 14,
        color: "#d9cfbf",
        shadow: false
      });
      if (i < visibleItems.length - 1) {
        ctx.save();
        ctx.fillStyle = "rgba(214, 186, 142, 0.035)";
        ctx.fillRect(panelX + 38, rowY + 9, panelWidth - 56, 1);
        ctx.restore();
      }
    }

    if (overflow > 0) {
      drawLabel(ctx, "\u53e6 " + overflow + " \u5f20\u672a\u5c55\u5f00", panelX + panelWidth - 14, footerY - 14, {
        size: 10,
        align: "right",
        color: "#9b8c79",
        shadow: false
      });
    }

    drawLabel(ctx, "\u518d\u70b9\u5207\u6362 \u00b7 \u70b9\u7a7a\u767d\u6536\u8d77", panelX + 16, footerY, {
      size: 10,
      color: "#948775",
      shadow: false
    });
  }

  G.render.ui.drawPanel = drawPanel;
  G.render.ui.mechanicPalette = mechanicPalette;
  G.render.ui.mechanicSpans = mechanicSpans;
  G.render.ui.drawMechanicText = drawMechanicText;
  G.render.ui.appendMechanicText = appendMechanicText;
  G.render.ui.drawHandTray = drawHandTray;
  G.render.ui.drawLabel = drawLabel;
  G.render.ui.drawBar = drawBar;
  G.render.ui.drawStatBar = drawStatBar;
  G.render.ui.drawIntentIcon = drawIntentIcon;
  G.render.ui.drawEnemyCard = drawEnemyCard;
  G.render.ui.drawCardSlot = drawCardSlot;
  G.render.ui.drawWrappedLabel = drawWrappedLabel;
  G.render.ui.drawPileBox = drawPileBox;
  G.render.ui.drawButton = drawButton;
  G.render.ui.drawListOverlay = drawListOverlay;
  G.render.ui.getBodyFontFamily = getUiBodyFontFamily;
  G.render.ui.getTitleFontFamily = getUiTitleFontFamily;
  G.render.ui.getReadableFontFamily = getUiReadableFontFamily;
})();
