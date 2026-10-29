window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  // ============================================================================
  // 常量定义
  // ============================================================================
  
  var COLORS = {
    background: "#141110",
    gradientStart: "rgba(133, 31, 42, 0.18)",
    gradientMid: "rgba(70, 55, 35, 0.10)",
    gradientEnd: "rgba(0, 0, 0, 0)",
    titlePrimary: "#f3e8d8",
    titleSecondary: "#cdbca7",
    hintText: "#d8cdbd",
    eventPanelFill: "rgba(18, 14, 14, 0.94)",
    eventPanelStroke: "#7c2a31",
    eventTitle: "#f3e8d8",
    eventActNumber: "#bfa37c",
    eventBody: "#d9cdbd",
    choicePanelFill: "rgba(24, 21, 22, 0.95)",
    choicePanelStroke: "#8a5844",
    choiceLabel: "#f0e5d5",
    choicePreview: "#d4c7b5",
    choiceHint: "#b98c73",
    resultPanelFill: "rgba(18, 14, 14, 0.95)",
    resultPanelStroke: "#7c2a31",
    resultTitle: "#f2e6d6",
    resultText: "#d3c6b6",
    resultSummary: "#cba77c",
    buttonFill: "#352726",
    buttonStroke: "#a07d62"
  };

  var LAYOUT = {
    titleX: 640,
    titleY: 58,
    subtitleY: 92,
    hintY: 116,
    eventPanel: { x: 96, y: 142, width: 1088, height: 170 },
    resultPanel: { x: 96, y: 340, width: 1088, height: 228 },
    continueButton: { x: 472, y: 610, width: 336, height: 68 },
    choiceHeight2: 132,
    choiceHeight3: 106,
    choiceGap: 18,
    choiceStartY2: 368,
    choiceStartY3: 334
  };

  var TEXT = {
    sceneTitle: "乱世奇遇",
    hintChoice: "选一条路，后果不会少一分。",
    hintResult: "尘埃落下，你只能带着结果继续走。"
  };

  // ============================================================================
  // 布局计算
  // ============================================================================

  function getLayout(choiceCount) {
    if(G.render && G.render.journeyStory)return G.render.journeyStory.eventLayout(choiceCount);
    var count = Math.max(1, Math.min(3, choiceCount || 2));
    var choiceHeight = count === 2 ? LAYOUT.choiceHeight2 : LAYOUT.choiceHeight3;
    var choiceStartY = count === 2 ? LAYOUT.choiceStartY2 : LAYOUT.choiceStartY3;
    var boxes = [];
    var i = 0;

    for (i = 0; i < count; i += 1) {
      boxes.push({
        x: 96,
        y: choiceStartY + i * (choiceHeight + LAYOUT.choiceGap),
        width: 1088,
        height: choiceHeight
      });
    }

    return {
      titleX: LAYOUT.titleX,
      titleY: LAYOUT.titleY,
      subtitleY: LAYOUT.subtitleY,
      hintY: LAYOUT.hintY,
      eventPanel: LAYOUT.eventPanel,
      resultPanel: LAYOUT.resultPanel,
      continueButton: LAYOUT.continueButton,
      choiceBoxes: boxes
    };
  }

  // ============================================================================
  // 工具函数
  // ============================================================================

  function isInside(point, box) {
    return point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height;
  }

  // ============================================================================
  // 状态管理
  // ============================================================================

  function prepareState(state) {
    if (G.events && typeof G.events.prepareSceneState === "function") {
      return G.events.prepareSceneState(state);
    }
    return state;
  }

  // ============================================================================
  // 交互逻辑
  // ============================================================================

  function processClicks(state) {
    var nextState = prepareState(state);
    var clicks = G.main && typeof G.main.consumeClicks === "function" ? G.main.consumeClicks() : [];
    var layout = getLayout(nextState.event ? nextState.event.choices.length : 2);
    var click = null;
    var i = 0;

    if (clicks.length === 0) {
      return nextState;
    }

    while (clicks.length > 0) {
      click = clicks.shift();

      if (!nextState.event || nextState.event.mode === "choice") {
        // 选择模式：检测选项点击
        for (i = 0; i < layout.choiceBoxes.length; i += 1) {
          if (isInside(click, layout.choiceBoxes[i]) && nextState.event && nextState.event.choices[i]) {
            // The shared loop observes mutations through a fresh state. Keep
            // the pre-choice values intact for feedback and save persistence.
            return G.events.applyChoice(JSON.parse(JSON.stringify(nextState)), nextState.event.choices[i].id);
          }
        }
      } else if (G.render.canvasUtils.containsAction(click, layout.continueButton)) {
        // 结果模式：检测继续按钮
        return G.events.leaveScene(nextState);
      }
    }

    return nextState;
  }

  // ============================================================================
  // 渲染函数 - 背景
  // ============================================================================

  function renderBackground(ctx) {
    G.render.canvasUtils.clear(ctx, COLORS.background);

    ctx.save();
    var gradient = ctx.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, COLORS.gradientStart);
    gradient.addColorStop(0.55, COLORS.gradientMid);
    gradient.addColorStop(1, COLORS.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }

  // ============================================================================
  // 渲染函数 - 事件标题
  // ============================================================================

  function renderEventHeader(ctx, state, layout) {
    var hint = state.event.mode === "choice" ? TEXT.hintChoice : TEXT.hintResult;

    // 场景标题
    G.render.ui.drawLabel(ctx, TEXT.sceneTitle, layout.titleX, layout.titleY, {
      size: 40,
      align: "center",
      color: COLORS.titlePrimary
    });

    // 章节标题
    G.render.ui.drawLabel(ctx, state.event.actTitle, layout.titleX, layout.subtitleY, {
      size: 17,
      align: "center",
      color: COLORS.titleSecondary
    });

    // 提示文本
    G.render.ui.drawLabel(ctx, hint, layout.titleX, layout.hintY, {
      size: 18,
      align: "center",
      color: COLORS.hintText
    });

    // 事件面板
    G.render.ui.drawPanel(ctx, layout.eventPanel.x, layout.eventPanel.y, layout.eventPanel.width, layout.eventPanel.height, {
      fill: COLORS.eventPanelFill,
      stroke: COLORS.eventPanelStroke
    });

    // 事件标题
    G.render.ui.drawLabel(ctx, state.event.title, layout.eventPanel.x + 28, layout.eventPanel.y + 34, {
      size: 30,
      color: COLORS.eventTitle
    });

    // 章节编号
    G.render.ui.drawLabel(ctx, "卷 " + state.event.actNumber, layout.eventPanel.x + layout.eventPanel.width - 34, layout.eventPanel.y + 38, {
      size: 16,
      align: "right",
      color: COLORS.eventActNumber
    });

    // 事件描述
    G.render.ui.drawWrappedLabel(
      ctx,
      state.event.body,
      layout.eventPanel.x + 28,
      layout.eventPanel.y + 74,
      layout.eventPanel.width - 56,
      24,
      {
        size: 18,
        color: COLORS.eventBody,
        maxLines: 4
      }
    );
  }

  // ============================================================================
  // 渲染函数 - 选项列表
  // ============================================================================

  function renderChoices(ctx, state, layout) {
    state.event.choices.forEach(function (currentChoice, index) {
      var box = layout.choiceBoxes[index];

      // 选项面板
      G.render.ui.drawPanel(ctx, box.x, box.y, box.width, box.height, {
        fill: COLORS.choicePanelFill,
        stroke: COLORS.choicePanelStroke
      });

      // 选项标签
      G.render.ui.drawLabel(ctx, currentChoice.label, box.x + 24, box.y + 28, {
        size: 24,
        color: COLORS.choiceLabel
      });

      // 选项预览
      G.render.ui.drawWrappedLabel(ctx, currentChoice.preview, box.x + 24, box.y + 58, box.width - 220, 22, {
        size: 17,
        color: COLORS.choicePreview,
        maxLines: 3
      });

      // 点击提示
      G.render.ui.drawLabel(ctx, "点击承受", box.x + box.width - 26, box.y + box.height - 24, {
        size: 16,
        align: "right",
        color: COLORS.choiceHint
      });
    });
  }

  // ============================================================================
  // 渲染函数 - 结果显示
  // ============================================================================

  function renderResult(ctx, state, layout) {
    var summaryLines = Array.isArray(state.event.resultSummary) ? state.event.resultSummary : [];
    var i = 0;
    var lineY = layout.resultPanel.y + 128;

    // 结果面板
    G.render.ui.drawPanel(ctx, layout.resultPanel.x, layout.resultPanel.y, layout.resultPanel.width, layout.resultPanel.height, {
      fill: COLORS.resultPanelFill,
      stroke: COLORS.resultPanelStroke
    });

    // 选择标题
    G.render.ui.drawLabel(ctx, state.event.selectedChoiceLabel || "你做了选择", layout.resultPanel.x + 28, layout.resultPanel.y + 34, {
      size: 28,
      color: COLORS.resultTitle
    });

    // 结果描述
    G.render.ui.drawWrappedLabel(
      ctx,
      state.event.resultText,
      layout.resultPanel.x + 28,
      layout.resultPanel.y + 72,
      layout.resultPanel.width - 56,
      22,
      {
        size: 17,
        color: COLORS.resultText,
        maxLines: 3
      }
    );

    // 结果摘要列表
    for (i = 0; i < summaryLines.length; i += 1) {
      G.render.ui.drawLabel(ctx, "• " + summaryLines[i], layout.resultPanel.x + 32, lineY + i * 28, {
        size: 18,
        color: COLORS.resultSummary
      });
    }

    // 继续按钮
    G.render.ui.drawButton(ctx, {
      x: layout.continueButton.x,
      y: layout.continueButton.y,
      width: layout.continueButton.width,
      height: layout.continueButton.height,
      label: state.event.continueLabel,
      fill: COLORS.buttonFill,
      stroke: COLORS.buttonStroke
    });
  }

  // ============================================================================
  // 公共接口
  // ============================================================================

  G.scenes.event = {
    inputOnly: true,
    getLayout: getLayout,
    prepareState: prepareState,

    update: function (state) {
      return processClicks(state);
    },

    render: function (state, ctx) {
      var safeState = prepareState(state);
      var layout = getLayout(safeState.event ? safeState.event.choices.length : 2);

      renderBackground(ctx);
      renderEventHeader(ctx, safeState, layout);

      if (safeState.event.mode === "choice") {
        renderChoices(ctx, safeState, layout);
      } else {
        renderResult(ctx, safeState, layout);
      }
    }
  };
})();
