window.G = window.G || {};
G.scenes = G.scenes || {};

(function () {
  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d", { alpha: false });
  var fixedWidth = 1280;
  var fixedHeight = 720;
  canvas.logicalWidth = fixedWidth;
  canvas.logicalHeight = fixedHeight;
  var renderScale = 1;
  var rafId = 0;
  var lastTimestamp = null;
  var lastFrameTimestamp = null;
  var frameRemainder = 0;
  var paused = false;
  var renderDirty = true;
  var lastRenderedState = null;
  var lastAssetRevision = -1;
  var lastFontRevision = -1;
  var renderedFrames = 0;
  var skippedFrames = 0;
  var lastRenderOffset = { x: 0, y: 0 };
  var clickQueue = [];
  var cancelRequested = false;
  var activePointerId = null;
  var pointerLeavePending = false;
  var pointerState = {
    x: fixedWidth / 2,
    y: fixedHeight / 2,
    startX: fixedWidth / 2,
    startY: fixedHeight / 2,
    isDown: false,
    pressed: false,
    released: false,
    moved: false,
    dragDistance: 0
  };

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function getStoredSettings() {
    if (G.storage && typeof G.storage.loadSettings === "function") {
      return G.storage.loadSettings();
    }

    return {
      volume: 0.7,
      quality: "high"
    };
  }

  function getStoredNemesis() {
    if (G.storage && typeof G.storage.loadPersistentNemesis === "function") {
      return G.storage.loadPersistentNemesis();
    }

    return {
      pool: [],
      nextId: 1
    };
  }

  function createInitialState(options) {
    var opts = options || {};
    var settings = opts.settings ? cloneState(opts.settings) : getStoredSettings();
    var nemesis = opts.nemesis ? cloneState(opts.nemesis) : getStoredNemesis();

    return {
      scene: "title",
      timeMs: 0,
      frameCount: 0,
      fixedWidth: fixedWidth,
      fixedHeight: fixedHeight,
      viewportScale: 1,
      settings: settings,
      chronicle: opts.chronicle || (G.storage.loadChronicle ? G.storage.loadChronicle() : null),
      title: {
        heading: "\u6c5f\u6e56\u6b8b\u5377\uff1a\u5eb6\u5b50\u523a\u5ba2",
        subtitle: "Phase 1.1 \u9879\u76ee\u9aa8\u67b6"
      },
      player: {
        hp: 80,
        maxHp: 80,
        poisonTurns: 0,
        energy: 3,
        maxEnergy: 3,
        block: 0,
        gold: 100,
        relics: [],
        removeServiceCount: 0,
        deckSize: 12,
        chosenStyle: null
      },
      combat: {
        hand: [],
        drawPileCount: 0,
        discardPileCount: 0,
        enemies: [],
        turn: 0,
        comboCount: 0,
        comboDiscountUses: 0
      },
      runReport: null,
      nemesis: nemesis
    };
  }

  function buildState(nextState) {
    var initialState = createInitialState();
    var baseState = cloneState(initialState);
    var incoming = nextState ? cloneState(nextState) : {};

    baseState = Object.assign(baseState, incoming);
    baseState.settings = Object.assign({}, initialState.settings, incoming.settings || {});
    baseState.title = Object.assign({}, initialState.title, incoming.title || {});
    baseState.player = Object.assign({}, initialState.player, incoming.player || {});
    baseState.combat = Object.assign({}, initialState.combat, incoming.combat || {});
    baseState.runReport = incoming.runReport ? cloneState(incoming.runReport) : null;
    baseState.nemesis = Object.assign({}, initialState.nemesis, incoming.nemesis || {});
    baseState.nemesis.pool = Array.isArray(baseState.nemesis.pool) ? baseState.nemesis.pool.slice() : [];
    if (G.journeyNarrative) G.journeyNarrative.ensure(baseState);

    return baseState;
  }

  function isTerminalRunState(state) {
    return !!(
      state &&
      (
        (state.scene === "combat" && state.combat && state.combat.result === "defeat") ||
        (state.scene === "map" && state.map && state.map.completed) ||
        (state.scene === "title" && state.runReport && state.runReport.active)
      )
    );
  }

  function isActiveRunState(state) {
    if (!state || state.scene === "title") {
      return false;
    }

    if (isTerminalRunState(state)) {
      return false;
    }

    return true;
  }

  function applyRuntimeSettings(state) {
    var settings = state && state.settings ? state.settings : getStoredSettings();

    if (G.audio && typeof G.audio.applySettings === "function") {
      G.audio.applySettings(settings);
    }

    canvas.style.imageRendering = settings.quality === "low" ? "pixelated" : "auto";
    ctx.imageSmoothingEnabled = settings.quality !== "low";
    if(window.KGAME_STORAGE_NAMESPACE==='kgame-journey-v1')G.scenes.combat.feedback?.setOptions({speed:settings.combatSpeed||1,reduced:!!settings.reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches});
  }

  function persistStorageState(state) {
    if (!G.storage) {
      return;
    }
    if (G.journeyNarrative && state.scene === "combat" && state.combat.result === "defeat") {
      G.journeyNarrative.finish(state, "defeat");
    }

    if (typeof G.storage.saveSettings === "function") {
      G.storage.saveSettings(state && state.settings ? state.settings : null);
    }
    if (typeof G.storage.savePersistentNemesis === "function") {
      G.storage.savePersistentNemesis(state && state.nemesis ? state.nemesis : null);
    }
    if (G.journeyNarrative && G.storage.saveChronicle) G.storage.saveChronicle(state.chronicle);

    if (isActiveRunState(state) && typeof G.storage.saveRun === "function") {
      G.storage.saveRun(state);
    } else if (isTerminalRunState(state) && typeof G.storage.clearRun === "function") {
      G.storage.clearRun();
    }
  }

  function prepareSceneState(state) {
    var scene = state && G.scenes ? G.scenes[state.scene] : null;

    if (scene && typeof scene.prepareState === "function") {
      return scene.prepareState(state);
    }

    return state;
  }

  function syncAnimationScene(state) {
    if (G.render && G.render.animations && typeof G.render.animations.syncScene === "function") {
      G.render.animations.syncScene(state ? state.scene : null);
    }
  }

  function resetTransientInput() {
    clickQueue = [];
    cancelRequested = false;
    pointerState.pressed = false;
    pointerState.released = false;
    pointerState.moved = false;
    if (!pointerState.isDown) {
      pointerState.dragDistance = 0;
      if (pointerLeavePending) {
        pointerState.x = -1;
        pointerState.y = -1;
        pointerLeavePending = false;
      }
    }
  }

  function copyPointerState() {
    return {
      x: pointerState.x,
      y: pointerState.y,
      startX: pointerState.startX,
      startY: pointerState.startY,
      isDown: pointerState.isDown,
      pressed: pointerState.pressed,
      released: pointerState.released,
      moved: pointerState.moved,
      dragDistance: pointerState.dragDistance
    };
  }

  function toCanvasPoint(event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * fixedWidth,
      y: ((event.clientY - rect.top) / rect.height) * fixedHeight
    };
  }

  var gameState = createInitialState();

  function resizeCanvasDisplay() {
    renderDirty = true;
    // A held pointer belongs to the old viewport; do not submit its release
    // against targets that moved during a resize.
    if (pointerState.isDown) cancelPointerInput();
    var scale = Math.min(window.innerWidth / fixedWidth, window.innerHeight / fixedHeight);
    var shell = document.getElementById('game-shell');
    if (window.KGAME_MOBILE && shell) {
      // Menu overlays the unused top corner; do not shrink the whole game for it.
      shell.style.paddingRight = '0px';
    }
    scale = Math.max(0.1, scale);
    canvas.style.width = Math.floor(fixedWidth * scale) + "px";
    canvas.style.height = Math.floor(fixedHeight * scale) + "px";
    gameState.viewportScale = scale;
    renderScale = Math.max(1, Math.min(2, scale * (window.devicePixelRatio || 1)));
    var width = Math.round(fixedWidth * renderScale), height = Math.round(fixedHeight * renderScale);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    canvas.renderScale = renderScale;
  }

  function updateState(deltaMs) {
    if (paused) { resetTransientInput(); return; }
    var previousState = null;
    var scene = null;
    var nextState = null;
    var preparedState = null;
    var hadInput = clickQueue.length > 0 || cancelRequested || pointerState.pressed || pointerState.released || pointerState.moved;
    var feedbackBusy = !!G.scenes.combat.feedback?.isBusy();

    gameState.timeMs += deltaMs;
    gameState.frameCount += 1;
    if (G.render.journeyMotion) G.render.journeyMotion.update(deltaMs, gameState);
    if (G.render.motionFocus) G.render.motionFocus.update(deltaMs, gameState);

    if (G.render && G.render.animations && typeof G.render.animations.update === "function") {
      G.render.animations.update(deltaMs, gameState.scene);
    }

    scene = G.scenes[gameState.scene];
    if (scene && typeof scene.update === "function" && (!scene.inputOnly || hadInput)) {
      // Rules return a fresh state for mutations; idle frames need no deep copy.
      previousState = gameState;
      nextState = scene.update(gameState, {
        deltaMs: deltaMs
      });
      if (nextState && nextState !== gameState) {
        preparedState = prepareSceneState(nextState);
        gameState = preparedState || nextState;
        if (previousState.scene !== gameState.scene) cancelPointerInput();
        if (G.render.journeyMotion) G.render.journeyMotion.change(previousState, gameState);
        if (previousState.scene !== gameState.scene || JSON.stringify(previousState.settings) !== JSON.stringify(gameState.settings)) applyRuntimeSettings(gameState);
        if (G.audio && typeof G.audio.syncState === "function") {
          G.audio.syncState(previousState, gameState);
        }
        syncAnimationScene(gameState);
        // Persist actions and completed feedback, not hover/intro animation frames.
        if (hadInput || previousState.scene !== gameState.scene || (feedbackBusy && !G.scenes.combat.feedback?.isBusy())) persistStorageState(gameState);
      }
    }

    resetTransientInput();
  }

  function renderState() {
    // Never rasterize a system fallback into the persistent text/card caches.
    if (G.fonts && !G.fonts.settled) return;
    renderDirty = false;
    lastRenderedState = gameState;
    lastAssetRevision = G.render.assets?.getRevision() || 0;
    lastFontRevision = G.render.canvasUtils.fontRevision || 0;
    renderedFrames += 1;
    var scene = G.scenes[gameState.scene];
    var sceneOffset = { x: 0, y: 0 };
    ctx.setTransform(canvas.width / fixedWidth, 0, 0, canvas.height / fixedHeight, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.imageSmoothingEnabled = !gameState.settings || gameState.settings.quality !== "low";

    if (scene && scene.coversCanvas) {
      // The scene paints an opaque stage. Only clear the shake border; the
      // procedural legacy skyline/smoke underneath would be discarded again.
      ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, fixedWidth, fixedHeight);
    } else if (G.render && G.render.canvasUtils && typeof G.render.canvasUtils.clear === "function") {
      G.render.canvasUtils.clear(ctx, "#101010");
    } else {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }

    if (G.render && G.render.animations && typeof G.render.animations.getSceneOffset === "function") {
      sceneOffset = G.render.animations.getSceneOffset(gameState.scene);
    }
    if (gameState.scene === 'combat') {
      // Subpixel screen shake bypassed every cached HUD layer on each gunshot.
      // Align at the actual backing resolution, within half a backing pixel.
      var shakeScaleX = canvas.width / fixedWidth, shakeScaleY = canvas.height / fixedHeight;
      sceneOffset.x = Math.round((sceneOffset.x || 0) * shakeScaleX) / shakeScaleX;
      sceneOffset.y = Math.round((sceneOffset.y || 0) * shakeScaleY) / shakeScaleY;
    }
    lastRenderOffset = {
      x: sceneOffset.x || 0,
      y: sceneOffset.y || 0
    };

    if (scene && typeof scene.render === "function") {
      ctx.save();
      ctx.translate(lastRenderOffset.x, lastRenderOffset.y);
      scene.render(gameState, ctx);
      if (G.render && G.render.animations && typeof G.render.animations.render === "function") {
        G.render.animations.render(ctx, gameState.scene);
      }
      ctx.restore();
      if (G.render.journeyMotion) {
        G.render.journeyMotion.render(ctx, gameState);
        G.render.motionFocus?.render(ctx, gameState);
        G.render.journeyMotion.capture();
      }
      return;
    }

    lastRenderOffset = { x: 0, y: 0 };

    if (G.render && G.render.canvasUtils) {
      G.render.canvasUtils.drawCenteredText(ctx, "\u573a\u666f\u672a\u5b9e\u73b0", fixedWidth / 2, fixedHeight / 2, {
        size: 40,
        color: "#bb2d3b"
      });
    }
  }

  function frame(timestamp) {
    if (lastTimestamp === null) { lastTimestamp = timestamp; lastFrameTimestamp = timestamp; }
    var elapsed = Math.max(0, timestamp - lastTimestamp);
    lastTimestamp = timestamp;
    if (paused || document.hidden) {
      frameRemainder = 0; lastFrameTimestamp = timestamp;
    } else {
      frameRemainder += elapsed;
      var interval = 1000 / 60;
      if (frameRemainder + 0.01 >= interval) {
        // Carry fractional vsync time: dropping it capped 90/144Hz at 45/48fps.
        frameRemainder = Math.max(0, frameRemainder - interval);
        if (frameRemainder >= interval) frameRemainder %= interval;
        var deltaMs = Math.min(100, timestamp - lastFrameTimestamp);
        lastFrameTimestamp = timestamp;
        // Rules/timers continue at 60Hz. Quiet map/combat frames submit no new
        // canvas work; keep the last animated frame so effects also disappear.
        var inputPending = clickQueue.length > 0 || cancelRequested || pointerState.pressed || pointerState.released || pointerState.moved;
        var animatedBefore = hasRenderMotion();
        updateState(deltaMs);
        var continuous = !G.scenes[gameState.scene]?.quietCanvas;
        if (continuous || renderDirty || inputPending || lastRenderedState !== gameState || animatedBefore || hasRenderMotion() ||
            lastAssetRevision !== (G.render.assets?.getRevision() || 0) || lastFontRevision !== (G.render.canvasUtils.fontRevision || 0)) renderState();
        else skippedFrames += 1;
      }
    }
    rafId = window.requestAnimationFrame(frame);
  }

  function hasRenderMotion() {
    return !!(G.render.animations.hasVisuals?.(gameState.scene) ||
      G.render.motionFocus?.hasVisuals?.() ||
      G.render.journeyMotion?.hasVisuals?.() ||
      (gameState.scene === 'combat' && (G.scenes.combat.feedback?.hasVisuals?.() || G.render.combatInteraction.hasVisuals() || gameState.combat.selectedCardId || gameState.combat.inspectPresentation?.progress > 0)));
  }

  function stepTime(ms) {
    var remaining = Math.max(0, Number(ms) || 0);

    if (remaining === 0) {
      updateState(0);
      renderState();
      return;
    }

    while (remaining > 0) {
      var slice = Math.min(remaining, 1000 / 60);
      updateState(slice);
      remaining -= slice;
    }

    renderState();
  }

  canvas.style.touchAction = "none";

  function cancelPointerInput() {
    cancelRequested = true;
    clickQueue = [];
    pointerState.isDown = false;
    pointerState.pressed = false;
    pointerState.released = false;
    pointerState.moved = false;
    pointerState.dragDistance = 0;
    if (activePointerId !== null && canvas.hasPointerCapture && canvas.hasPointerCapture(activePointerId)) {
      canvas.releasePointerCapture(activePointerId);
    }
    activePointerId = null;
  }

  canvas.addEventListener("contextmenu", function (event) {
    if (gameState.scene === "combat") {
      event.preventDefault();
      cancelPointerInput();
    }
  });
  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && gameState.scene === "combat") {
      event.preventDefault();
      cancelPointerInput();
    }
  });
  window.addEventListener("blur", cancelPointerInput);
  canvas.addEventListener("pointerleave", function () {
    if (!pointerState.isDown) {
      // Touch emits pointerleave immediately after pointerup. Keep the drop
      // location until the next scene update has consumed that release.
      if (pointerState.released) pointerLeavePending = true;
      else {
        pointerState.x = -1;
        pointerState.y = -1;
        renderDirty = true;
      }
    }
  });

  canvas.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 || event.isPrimary === false) return;
    if (G.render.journeyMotion && !G.render.journeyMotion.acceptsInput()) return;
    if (G.audio && typeof G.audio.handleUserGesture === "function") {
      G.audio.handleUserGesture();
    }
    var point = toCanvasPoint(event);

    pointerState.type = event.pointerType || "mouse";

    activePointerId = event.pointerId;
    pointerLeavePending = false;
    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(activePointerId);
    }
    pointerState.x = point.x;
    pointerState.y = point.y;
    pointerState.startX = point.x;
    pointerState.startY = point.y;
    pointerState.isDown = true;
    pointerState.pressed = true;
    pointerState.released = false;
    pointerState.moved = false;
    pointerState.dragDistance = 0;
  });

  canvas.addEventListener("pointermove", function (event) {
    var point = null;
    var dx = 0;
    var dy = 0;

    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }

    point = toCanvasPoint(event);
    pointerState.x = point.x;
    pointerState.y = point.y;

    if (!pointerState.isDown) {
      renderDirty = true;
      return;
    }

    dx = pointerState.x - pointerState.startX;
    dy = pointerState.y - pointerState.startY;
    pointerState.dragDistance = Math.max(pointerState.dragDistance, Math.sqrt(dx * dx + dy * dy));
    if (pointerState.dragDistance > 12) {
      pointerState.moved = true;
    }
  });

  canvas.addEventListener("pointerup", function (event) {
    var point = null;

    if (event.button !== 0 || activePointerId === null || event.pointerId !== activePointerId) {
      return;
    }

    point = toCanvasPoint(event);
    pointerState.x = point.x;
    pointerState.y = point.y;
    pointerState.isDown = false;
    pointerState.released = true;
    pointerState.dragDistance = Math.max(pointerState.dragDistance, Math.hypot(point.x - pointerState.startX, point.y - pointerState.startY));

    if (pointerState.dragDistance <= 12) {
      clickQueue.push({ x: point.x, y: point.y });
    }

    if (canvas.releasePointerCapture && activePointerId !== null) {
      canvas.releasePointerCapture(activePointerId);
    }
    activePointerId = null;
  });

  canvas.addEventListener("pointercancel", function (event) {
    if (activePointerId !== null && event.pointerId !== activePointerId) {
      return;
    }

    cancelPointerInput();
  });

  G.main = {
    getSceneName: function () { return gameState.scene; },
    getTime: function () { return gameState.timeMs; },
    getLayoutState: function () { return { restChoice: gameState.rest?.reviewChoice, receiptKind: gameState.reviewReceipt?.kind, hasReceipt: !!gameState.reviewReceipt, receiptCard: gameState.reviewReceipt?.cardName }; },
    resizeDisplay: resizeCanvasDisplay,
    // Native entry controls use the same scene hit testing as canvas input.
    queueSceneClick: function (point) {
      if (paused || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1280 || point.y < 0 || point.y > 720) return false;
      // The native entry control names its incoming action explicitly. Accept
      // rapid school selection; only canvas coordinates need the bridge guard.
      if (G.audio && typeof G.audio.handleUserGesture === "function") G.audio.handleUserGesture();
      clickQueue.push({ x: point.x, y: point.y });
      return true;
    },
    setPaused: function (value) {
      paused = !!value;
      renderDirty = true;
      if (G.audio && G.audio.setPaused) G.audio.setPaused(paused);
      document.documentElement.classList.toggle('journey-paused', paused);
      cancelPointerInput();
      G.render.animations.clearCardDrag('combat');
      resetTransientInput();
    },
    isPaused: function () { return paused; },
    consumeCancel: function () {
      var requested = cancelRequested;
      cancelRequested = false;
      return requested;
    },
    getPointer: function () {
      return {
        x: pointerState.x,
        y: pointerState.y,
        type: pointerState.type || "mouse",
        isDown: pointerState.isDown,
        startX: pointerState.startX,
        startY: pointerState.startY
      };
    },
    getState: function () {
      return cloneState(gameState);
    },
    replaceState: function (nextState) {
      var scene = null;
      var previousState = cloneState(gameState);
      if (G.scenes.combat.feedback) G.scenes.combat.feedback.clear();
      G.scenes.combat.resetHoverInspection();

      gameState = buildState(nextState);
      scene = G.scenes[gameState.scene];
      if (scene && typeof scene.prepareState === "function") {
        gameState = scene.prepareState(gameState);
      }
      if (G.render.journeyMotion) G.render.journeyMotion.reset(gameState);
      G.render.motionFocus?.reset();

      resetTransientInput();
      applyRuntimeSettings(gameState);
      if (G.audio && typeof G.audio.syncState === "function") {
        G.audio.syncState(previousState, gameState, { rebase: !!G.scenes.combat.feedback });
      }
      syncAnimationScene(gameState);
      persistStorageState(gameState);
      renderState();
      return cloneState(gameState);
    },
    resetState: function () {
      var previousState = cloneState(gameState);
      if (G.scenes.combat.feedback) G.scenes.combat.feedback.clear();
      G.scenes.combat.resetHoverInspection();

      gameState = prepareSceneState(createInitialState());
      if (G.render.journeyMotion) G.render.journeyMotion.reset(gameState);
      G.render.motionFocus?.reset();
      resetTransientInput();
      applyRuntimeSettings(gameState);
      if (G.audio && typeof G.audio.syncState === "function") {
        G.audio.syncState(previousState, gameState, { rebase: !!G.scenes.combat.feedback });
      }
      syncAnimationScene(gameState);
      persistStorageState(gameState);
      renderState();
      return cloneState(gameState);
    },
    setScene: function (sceneName) {
      var previousState = cloneState(gameState);

      if (G.scenes[sceneName]) {
        gameState.scene = sceneName;
        gameState = prepareSceneState(gameState);
        resetTransientInput();
        applyRuntimeSettings(gameState);
        if (G.audio && typeof G.audio.syncState === "function") {
          G.audio.syncState(previousState, gameState);
        }
        syncAnimationScene(gameState);
        persistStorageState(gameState);
      }
    },
    setSettings: function (patch) {
      if (!G.storage || typeof G.storage.normalizeSettings !== "function") {
        return cloneState(gameState);
      }

      gameState.settings = G.storage.normalizeSettings(Object.assign({}, gameState.settings || {}, patch || {}));
      applyRuntimeSettings(gameState);
      persistStorageState(gameState);
      renderState();
      return cloneState(gameState);
    },
    loadRunSave: function () {
      var savedState = G.storage && typeof G.storage.loadRun === "function" ? G.storage.loadRun() : null;

      if (!savedState) {
        return null;
      }

      return this.replaceState(savedState);
    },
    clearRunSave: function () {
      if (G.storage && typeof G.storage.clearRun === "function") {
        G.storage.clearRun();
      }
      return G.storage && typeof G.storage.getDebugSnapshot === "function" ? G.storage.getDebugSnapshot() : null;
    },
    getStorageDebug: function () {
      return G.storage && typeof G.storage.getDebugSnapshot === "function" ? G.storage.getDebugSnapshot() : null;
    },
    stepTime: stepTime,
    renderNow: renderState,
    getCanvas: function () {
      return canvas;
    },
    getContext: function () {
      return ctx;
    },
    getRenderDebug: function () {
      return {
        scene: gameState.scene,
        backingWidth: canvas.width, backingHeight: canvas.height, renderScale: renderScale,
        sceneOffset: {
          x: lastRenderOffset.x,
          y: lastRenderOffset.y
        }
      };
    },
    consumeClicks: function () {
      var clicks = clickQueue.slice();
      clickQueue = [];
      return clicks;
    },
    consumePointerFrame: function () {
      var snapshot = copyPointerState();
      pointerState.pressed = false;
      pointerState.released = false;
      pointerState.moved = false;
      return snapshot;
    },
    getRafId: function () {
      return rafId;
    },
    getFrameDebug: function () {
      return { renderedFrames: renderedFrames, skippedFrames: skippedFrames, dirty: renderDirty };
    }
  };

  gameState = prepareSceneState(gameState);
  
  // 调用初始场景的enter方法
  var initialScene = G.scenes[gameState.scene];
  if (initialScene && typeof initialScene.enter === "function") {
    initialScene.enter();
  }
  
  function startRuntime() {
    resizeCanvasDisplay();
    syncAnimationScene(gameState);
    applyRuntimeSettings(gameState);
    if (G.audio && typeof G.audio.syncState === "function") G.audio.syncState(null, gameState);
    renderState();
    window.addEventListener("resize", resizeCanvasDisplay);
    rafId = window.requestAnimationFrame(frame);
  }
  if (G.fonts) G.fonts.ready.then(startRuntime);
  else startRuntime();
})();
