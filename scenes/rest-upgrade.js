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
      fontFamily: palette.fontFamily || shared.getReadableFontFamily()
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
        fontFamily: shared.getReadableFontFamily()
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
    var stacks = shared.buildUpgradeStacks(state.rest.deckEntries);
    var boxes = shared.getUpgradeStackBoxes(stacks, layout);

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
      subtitleFontFamily: shared.getReadableFontFamily(),
      fontFamily: shared.getTitleFontFamily()
    });
  }

  // Export upgrade mode renderer
  G.scenes.restUpgrade = {
    renderDeckGrid: renderDeckGrid
  };
})();
