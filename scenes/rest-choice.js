window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  var shared = G.scenes.restShared;

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

    usedShell = shared.drawClippedTexture(
      ctx,
      shared.REST_STAGE_SHELL_TEXTURE_PATH,
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

    usedTexture = shared.drawClippedTexture(
      ctx,
      shared.REST_CHOICE_STAGE_TEXTURE_PATH,
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
        fontFamily: shared.getReadableFontFamily()
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
        fontFamily: shared.getReadableFontFamily()
      });
    }

    G.render.ui.drawLabel(ctx, config.title, centerX, titleY, {
      size: 28,
      align: "center",
      color: config.titleColor || "#efe3d1",
      weight: "700",
      shadow: false,
      fontFamily: shared.getTitleFontFamily()
    });
    G.render.ui.drawLabel(ctx, config.primary, centerX, primaryY, {
      size: config.primarySize || 36,
      align: "center",
      color: config.primaryColor || "#f2e2cb",
      weight: "800",
      shadow: false,
      fontFamily: shared.getReadableFontFamily()
    });
    G.render.ui.drawLabel(ctx, config.secondary, centerX, secondaryY, {
      size: 15,
      align: "center",
      color: config.secondaryColor || "#d4c0a4",
      shadow: false,
      fontFamily: shared.getReadableFontFamily()
    });
  }

  function renderChoice(ctx, state, layout) {
    var player = state.player;
    var upgradableCount = shared.getUpgradableCount(state.rest.deckEntries);
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
      secondary: "先把伤口压住，再撑过明日一战",
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

  // Export choice mode renderer
  G.scenes.restChoice = {
    renderChoice: renderChoice
  };
})();
