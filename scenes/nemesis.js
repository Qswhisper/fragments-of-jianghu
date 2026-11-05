window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  var NEMESIS_BACKGROUND_TEXTURE_PATH = "assets/ui/combat_background_ruined_street_gpt4ovip_01.png";

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function getLayout() {
    return {
      header: { x: 186, y: 38, width: 906, height: 86 },
      portrait: { x: 74, y: 144, width: 326, height: 438 },
      portraitWindow: { x: 98, y: 170, width: 278, height: 230 },
      dossier: { x: 426, y: 144, width: 772, height: 436 },
      quoteTag: { x: 452, y: 162, width: 150, height: 30 },
      quoteX: 478,
      quoteY: 218,
      quoteWidth: 668,
      memoryCard: { x: 452, y: 360, width: 350, height: 174 },
      noteCard: { x: 818, y: 360, width: 350, height: 174 },
      summary: { x: 74, y: 608, width: 776, height: 84 },
      summaryX: 98,
      summaryY: 642,
      summaryWidth: 726,
      commitmentX: 888,
      commitmentY: 590,
      fight: { x: 874, y: 604, width: 286, height: 76 }
    };
  }

  function isInside(point, box) {
    return point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height;
  }

  function getFightHitbox(layout) {
    return {
      x: layout.fight.x - 6,
      y: layout.fight.y - 48,
      width: layout.fight.width + 12,
      height: layout.fight.height + 56
    };
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options) {
    var opts = options || {};
    var chars = String(text || "").split("");
    var line = "";
    var lines = [];
    var i = 0;

    ctx.save();
    ctx.fillStyle = opts.color || "#efe7d5";
    ctx.font = (opts.weight || "500") + " " + (opts.size || 18) + "px " +
      (opts.fontFamily || "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif");
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = "top";

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

    lines.forEach(function (item, index) {
      ctx.fillText(item, x, y + index * lineHeight);
    });
    ctx.restore();
  }

  function drawSectionRule(ctx, x, y, width, alpha) {
    ctx.save();
    ctx.strokeStyle = "rgba(96, 70, 46, " + (typeof alpha === "number" ? alpha : 0.18) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5);
    ctx.lineTo(x + width, y + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawGroundShadow(ctx, x, y, width, height, alpha) {
    ctx.save();
    ctx.globalAlpha = typeof alpha === "number" ? alpha : 0.18;
    ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
    ctx.beginPath();
    ctx.ellipse(
      x + width / 2,
      y + height + 18,
      Math.max(40, width * 0.42),
      Math.max(14, height * 0.08),
      -0.02,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  function drawTag(ctx, x, y, width, text, options) {
    var opts = options || {};

    G.render.ui.drawPanel(ctx, x, y, width, 28, {
      surface: "lacquer-red",
      fill: opts.fill || "rgba(94, 30, 26, 0.92)",
      stroke: opts.stroke || "rgba(220, 193, 154, 0.24)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, text, x + width / 2, y + 14, {
      size: opts.size || 14,
      align: "center",
      color: opts.color || "#f2e8d7",
      shadow: false,
      fontFamily: opts.fontFamily
    });
  }

  function drawSmallChip(ctx, x, y, width, text) {
    G.render.ui.drawPanel(ctx, x, y, width, 24, {
      surface: "dossier-paper",
      fill: "rgba(232, 218, 191, 0.94)",
      stroke: "rgba(128, 98, 67, 0.18)",
      lineWidth: 2
    });
    G.render.ui.drawLabel(ctx, text, x + width / 2, y + 12, {
      size: 12,
      align: "center",
      color: "#4a3628",
      shadow: false
    });
  }

  function prepareState(state) {
    var nextState = cloneState(state);
    var entryId = nextState.nemesisIntro && nextState.nemesisIntro.entryId ?
      nextState.nemesisIntro.entryId :
      (nextState.map ? nextState.map.nemesisEntryId : null);
    var introPayload = G.nemesis && typeof G.nemesis.getIntroPayload === "function" ?
      G.nemesis.getIntroPayload(nextState, entryId) :
      null;

    if (!introPayload) {
      nextState.scene = "map";
      if (G.scenes.map && typeof G.scenes.map.prepareState === "function") {
        nextState = G.scenes.map.prepareState(nextState);
      }
      return nextState;
    }

    nextState.nemesisIntro = introPayload;
    nextState.scene = "nemesis";
    return nextState;
  }

  function enterCombat(state) {
    var nextState = cloneState(state);

    nextState.combat = nextState.combat || {};
    nextState.combat.seeded = false;
    nextState.combat.nemesisEntryId = state.nemesisIntro.entryId;
    nextState.combat.ui = { overlay: null };
    nextState.scene = "combat";
    return nextState;
  }

  function processClicks(state) {
    var nextState = state;
    var layout = G.scenes.nemesis.getLayout();
    var clicks = G.main && typeof G.main.consumeClicks === "function" ? G.main.consumeClicks() : [];
    var click = null;

    if (clicks.length === 0) {
      return state;
    }

    while (clicks.length > 0) {
      click = clicks.shift();

      if (isInside(click, layout.fight)) {
        return enterCombat(nextState);
      }
    }

    return nextState;
  }

  function renderPolishedIntro(state, ctx) {
    var layout = getLayout();
    var intro = state.nemesisIntro;
    var adaptation = intro.adaptation;
    var titleFont = G.render.ui.getTitleFontFamily ? G.render.ui.getTitleFontFamily() : "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var bodyFont = G.render.ui.getBodyFontFamily ? G.render.ui.getBodyFontFamily() : "\"KGame Sans\", \"Noto Sans CJK SC\", sans-serif";
    var summaryText = adaptation ?
      ("他记住了你上次的路数，「" + adaptation.name + "」已经进了身上。 " + adaptation.description) :
      "他还没把新花样先亮给你看，但这一回也绝不是来讲江湖规矩的。";
    var portraitEnemy = {
      name: intro.name,
      behavior: "nemesis",
      templateId: "nemesis",
      kind: intro.level >= 5 ? "boss" : "nemesis"
    };
    var firearmTag = intro.firearmStage && intro.firearmStage !== "none" && intro.firearmLabel ?
      ("火器：" + intro.firearmLabel) :
      "冷兵近追";
    var levelTag = "宿怨 " + intro.level + " 阶";
    var gradient = null;
    var topShade = null;
    var glow = null;
    var ember = null;
    var portraitGlow = null;
    var quoteGlow = null;
    var subText = intro.name + " · " + intro.title;

    G.render.canvasUtils.clear(ctx, "#151214");

    if (G.render.assets && typeof G.render.assets.drawImageCover === "function") {
      G.render.assets.drawImageCover(ctx, NEMESIS_BACKGROUND_TEXTURE_PATH, 0, 0, 1280, 720, {
        focusX: 0.54,
        focusY: 0.48,
        alpha: 0.92
      });
    }

    ctx.save();
    gradient = ctx.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, "rgba(10, 9, 9, 0.34)");
    gradient.addColorStop(0.42, "rgba(10, 9, 9, 0.16)");
    gradient.addColorStop(1, "rgba(6, 6, 6, 0.8)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);

    topShade = ctx.createLinearGradient(0, 0, 1280, 0);
    topShade.addColorStop(0, "rgba(20, 13, 14, 0.58)");
    topShade.addColorStop(0.3, "rgba(14, 11, 12, 0.18)");
    topShade.addColorStop(1, "rgba(12, 10, 10, 0.52)");
    ctx.fillStyle = topShade;
    ctx.fillRect(0, 0, 1280, 720);

    glow = ctx.createRadialGradient(232, 250, 36, 232, 250, 300);
    glow.addColorStop(0, "rgba(140, 38, 47, 0.22)");
    glow.addColorStop(1, "rgba(140, 38, 47, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 520, 620);

    ember = ctx.createRadialGradient(916, 210, 54, 916, 210, 340);
    ember.addColorStop(0, "rgba(232, 198, 144, 0.14)");
    ember.addColorStop(1, "rgba(232, 198, 144, 0)");
    ctx.fillStyle = ember;
    ctx.fillRect(600, 0, 640, 480);
    ctx.restore();

    drawGroundShadow(ctx, layout.header.x + 80, layout.header.y + 8, layout.header.width - 160, layout.header.height - 18, 0.12);
    G.render.ui.drawPanel(ctx, layout.header.x, layout.header.y, layout.header.width, layout.header.height, {
      surface: "paper-note",
      fill: "rgba(234, 220, 191, 0.94)",
      stroke: "rgba(122, 93, 62, 0.24)",
      lineWidth: 2
    });
    drawTag(ctx, layout.header.x + layout.header.width / 2 - 86, layout.header.y - 12, 172, "宿敌挡路", {
      size: 15,
      fontFamily: bodyFont
    });
    G.render.ui.drawLabel(ctx, subText, layout.header.x + layout.header.width / 2, layout.header.y + 26, {
      size: 17,
      align: "center",
      color: "#6a4c37",
      fontFamily: bodyFont,
      shadow: false
    });
    G.render.ui.drawLabel(ctx, intro.dialogueState === "era_despair" ? "旧账终于追到眼前" : "这不是偶遇，是追命上门", layout.header.x + layout.header.width / 2, layout.header.y + 56, {
      size: 34,
      align: "center",
      color: "#241912",
      fontFamily: titleFont,
      shadow: false
    });

    drawGroundShadow(ctx, layout.portrait.x + 8, layout.portrait.y + 8, layout.portrait.width - 16, layout.portrait.height - 12, 0.2);
    G.render.ui.drawPanel(ctx, layout.portrait.x, layout.portrait.y, layout.portrait.width, layout.portrait.height, {
      surface: "dossier-dark",
      fill: "rgba(14, 13, 12, 0.9)",
      stroke: "rgba(114, 89, 65, 0.26)",
      lineWidth: 2
    });
    drawTag(ctx, layout.portrait.x + 18, layout.portrait.y + 16, 108, "旧仇画像", {
      size: 13,
      fontFamily: bodyFont
    });
    G.render.ui.drawPanel(ctx, layout.portraitWindow.x, layout.portraitWindow.y, layout.portraitWindow.width, layout.portraitWindow.height, {
      surface: "dossier-paper",
      fill: "rgba(227, 213, 186, 0.9)",
      stroke: "rgba(125, 95, 63, 0.16)",
      lineWidth: 2
    });
    ctx.save();
    portraitGlow = ctx.createRadialGradient(
      layout.portraitWindow.x + layout.portraitWindow.width * 0.5,
      layout.portraitWindow.y + layout.portraitWindow.height * 0.28,
      18,
      layout.portraitWindow.x + layout.portraitWindow.width * 0.52,
      layout.portraitWindow.y + layout.portraitWindow.height * 0.38,
      layout.portraitWindow.width * 0.5
    );
    portraitGlow.addColorStop(0, "rgba(132, 38, 45, 0.22)");
    portraitGlow.addColorStop(0.56, "rgba(86, 28, 32, 0.08)");
    portraitGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = portraitGlow;
    ctx.fillRect(layout.portraitWindow.x + 8, layout.portraitWindow.y + 8, layout.portraitWindow.width - 16, layout.portraitWindow.height - 16);
    ctx.restore();

    if (G.render.assets && typeof G.render.assets.drawEnemyPortrait === "function") {
      G.render.assets.drawEnemyPortrait(ctx, {
        enemy: portraitEnemy,
        x: layout.portraitWindow.x + 16,
        y: layout.portraitWindow.y + 8,
        width: layout.portraitWindow.width - 32,
        height: layout.portraitWindow.height - 12,
        presentation: "battlefield"
      });
    }

    G.render.ui.drawLabel(ctx, intro.name, layout.portrait.x + 22, layout.portrait.y + 294, {
      size: 30,
      color: "#efe2c8",
      fontFamily: titleFont
    });
    G.render.ui.drawLabel(ctx, intro.title, layout.portrait.x + 22, layout.portrait.y + 332, {
      size: 17,
      color: "#c7b59f",
      fontFamily: bodyFont,
      shadow: false
    });
    drawWrappedText(ctx, "这回不是偶遇，是旧账追上来了。", layout.portrait.x + 22, layout.portrait.y + 360, layout.portrait.width - 44, 20, {
      size: 14,
      color: "#bcae98",
      fontFamily: bodyFont
    });
    drawSmallChip(ctx, layout.portrait.x + 22, layout.portrait.y + 398, 112, levelTag);
    drawSmallChip(ctx, layout.portrait.x + 142, layout.portrait.y + 398, 144, firearmTag);

    drawGroundShadow(ctx, layout.dossier.x + 12, layout.dossier.y + 10, layout.dossier.width - 24, layout.dossier.height - 14, 0.16);
    G.render.ui.drawPanel(ctx, layout.dossier.x, layout.dossier.y, layout.dossier.width, layout.dossier.height, {
      surface: "paper-note",
      fill: "rgba(236, 223, 194, 0.97)",
      stroke: "rgba(112, 84, 54, 0.36)",
      lineWidth: 2
    });
    drawTag(ctx, layout.quoteTag.x, layout.quoteTag.y, layout.quoteTag.width, intro.dialogueLabel || "旧账再来", {
      size: 14,
      color: intro.dialogueAccent || "#f2e8d7",
      fontFamily: bodyFont
    });
    ctx.save();
    quoteGlow = ctx.createRadialGradient(
      layout.dossier.x + layout.dossier.width * 0.5,
      layout.dossier.y + 116,
      24,
      layout.dossier.x + layout.dossier.width * 0.5,
      layout.dossier.y + 140,
      260
    );
    quoteGlow.addColorStop(0, "rgba(121, 47, 36, 0.1)");
    quoteGlow.addColorStop(1, "rgba(121, 47, 36, 0)");
    ctx.fillStyle = quoteGlow;
    ctx.fillRect(layout.dossier.x + 12, layout.dossier.y + 12, layout.dossier.width - 24, 180);
    ctx.restore();

    G.render.ui.drawLabel(ctx, "“", layout.quoteX - 10, layout.quoteY - 12, {
      size: 56,
      color: "rgba(123, 59, 48, 0.72)",
      fontFamily: titleFont,
      shadow: false
    });
    drawWrappedText(ctx, intro.dialogueLine, layout.quoteX + 18, layout.quoteY, layout.quoteWidth - 36, 44, {
      size: 25,
      color: "#1f1711",
      weight: "700",
      fontFamily: bodyFont
    });
    drawSectionRule(ctx, layout.dossier.x + 22, layout.dossier.y + 188, layout.dossier.width - 44, 0.16);

    G.render.ui.drawPanel(ctx, layout.memoryCard.x, layout.memoryCard.y, layout.memoryCard.width, layout.memoryCard.height, {
      surface: "dossier-paper",
      fill: "rgba(233, 219, 191, 0.92)",
      stroke: "rgba(123, 93, 62, 0.18)",
      lineWidth: 2
    });
    drawTag(ctx, layout.memoryCard.x + 14, layout.memoryCard.y + 12, 116, "旧伤记忆", {
      size: 13,
      fontFamily: bodyFont
    });
    drawWrappedText(ctx, intro.memoryLine, layout.memoryCard.x + 18, layout.memoryCard.y + 52, layout.memoryCard.width - 36, 24, {
      size: 15,
      color: "#3f2f24",
      fontFamily: bodyFont
    });

    G.render.ui.drawPanel(ctx, layout.noteCard.x, layout.noteCard.y, layout.noteCard.width, layout.noteCard.height, {
      surface: "dossier-paper",
      fill: "rgba(233, 219, 191, 0.92)",
      stroke: "rgba(123, 93, 62, 0.18)",
      lineWidth: 2
    });
    drawTag(ctx, layout.noteCard.x + 14, layout.noteCard.y + 12, 84, "这回", {
      size: 13,
      fontFamily: bodyFont
    });
    drawWrappedText(ctx, intro.note + " " + intro.eraLine, layout.noteCard.x + 18, layout.noteCard.y + 52, layout.noteCard.width - 36, 24, {
      size: 15,
      color: "#3f2f24",
      fontFamily: bodyFont
    });

    drawGroundShadow(ctx, layout.summary.x + 8, layout.summary.y + 6, layout.summary.width - 16, layout.summary.height - 10, 0.14);
    G.render.ui.drawPanel(ctx, layout.summary.x, layout.summary.y, layout.summary.width, layout.summary.height, {
      surface: "dossier-paper",
      fill: "rgba(233, 219, 191, 0.92)",
      stroke: "rgba(123, 93, 62, 0.2)",
      lineWidth: 2
    });
    drawTag(ctx, layout.summary.x + 14, layout.summary.y + 12, 118, "你该记住的", {
      size: 13,
      fontFamily: bodyFont
    });
    drawWrappedText(ctx, summaryText, layout.summaryX, layout.summaryY, layout.summaryWidth, 20, {
      size: 14,
      color: "#403024",
      fontFamily: bodyFont
    });

    G.render.ui.drawLabel(ctx, "既然撞上，就没有退路。", layout.commitmentX, layout.commitmentY, {
      size: 16,
      align: "left",
      color: "#d3c3ab",
      fontFamily: bodyFont
    });
    G.render.ui.drawButton(ctx, {
      x: layout.fight.x,
      y: layout.fight.y,
      width: layout.fight.width,
      height: layout.fight.height,
      label: intro.confirmLabel,
      subtitle: "见面只能见刀",
      fill: "#5a1818",
      stroke: "#8b6b4f",
      lineWidth: 2,
      size: 24,
      fontFamily: titleFont
    });
  }

  G.scenes.nemesis = {
    getLayout: getLayout,
    prepareState: prepareState,

    update: function (state) {
      return processClicks(prepareState(state));
    },

    render: renderPolishedIntro
  };
})();
