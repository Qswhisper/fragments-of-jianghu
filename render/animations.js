window.G = window.G || {};
G.render = G.render || {};
G.render.animations = G.render.animations || {};

(function () {
  var effects = [];
  var nextEffectId = 1;
  var activeScene = null;
  var cardDrag = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  }

  function easeOutQuad(value) {
    value = clamp(value, 0, 1);
    return 1 - (1 - value) * (1 - value);
  }

  function getVector(fromX, fromY, toX, toY) {
    var dx = (toX || 0) - (fromX || 0);
    var dy = (toY || 0) - (fromY || 0);
    var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));

    return {
      dx: dx,
      dy: dy,
      length: length,
      nx: dx / length,
      ny: dy / length,
      px: -dy / length,
      py: dx / length,
      angle: Math.atan2(dy, dx)
    };
  }

  function traceSlashPath(ctx, startX, startY, endX, endY, controlX, controlY) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    if (typeof controlX === "number" && typeof controlY === "number") {
      ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    } else {
      ctx.lineTo(endX, endY);
    }
  }

  function getAttackStyle(effect) {
    var tag = effect && effect.tag ? effect.tag : "";

    if (effect && effect.attackStyle) {
      return effect.attackStyle;
    }
    if (tag.indexOf("enemy_firearm_") === 0 || tag === "gunshot_muzzle_flash") {
      return "firearm";
    }
    return "";
  }

  function getVisibleProgress(effect) {
    var delayMs = Math.max(0, Number(effect.delayMs) || 0);
    var visibleDurationMs = Math.max(1, (effect.durationMs || 1) - delayMs);

    if ((effect.ageMs || 0) < delayMs) {
      return 0;
    }

    return clamp(((effect.ageMs || 0) - delayMs) / visibleDurationMs, 0, 1);
  }

  function syncScene(sceneName) {
    activeScene = sceneName || null;

    if (cardDrag && activeScene && cardDrag.scene !== activeScene) {
      cardDrag = null;
    }
  }

  function addEffect(type, config) {
    var effect = Object.assign({
      id: "fx_" + nextEffectId,
      type: type,
      ageMs: 0,
      durationMs: 360,
      scene: activeScene
    }, config || {});

    nextEffectId += 1;
    effects.push(effect);
    return effect.id;
  }

  function getEnemyAction(id) {
    return effects.find(function (fx) { return fx.type === 'enemy_action' && fx.scene === 'combat' && fx.sourceKey === id && fx.ageMs < fx.durationMs; }) || null;
  }

  function update(deltaMs, sceneName) {
    var delta = Math.max(0, Number(deltaMs) || 0);

    syncScene(sceneName);
    effects = effects.filter(function (effect) {
      effect.ageMs += delta;
      return effect.ageMs <= effect.durationMs;
    });
  }

  function beginCardDrag(sceneName, payload) {
    var source = payload || {};

    cardDrag = {
      scene: sceneName || activeScene,
      cardId: source.cardId,
      card: clone(source.card || {}),
      originX: source.originX || 0,
      originY: source.originY || 0,
      width: source.width || 145,
      height: source.height || 138,
      pointerX: source.pointerX || 0,
      pointerY: source.pointerY || 0,
      startPointerX: source.pointerX || 0,
      startPointerY: source.pointerY || 0,
      offsetX: source.offsetX || 0,
      offsetY: source.offsetY || 0,
      dragDistance: 0,
      dragging: false
    };

    return clone(cardDrag);
  }

  function updateCardDrag(pointer) {
    var dx = 0;
    var dy = 0;

    if (!cardDrag || !pointer) {
      return null;
    }

    cardDrag.pointerX = pointer.x;
    cardDrag.pointerY = pointer.y;
    dx = cardDrag.pointerX - cardDrag.startPointerX;
    dy = cardDrag.pointerY - cardDrag.startPointerY;
    cardDrag.dragDistance = Math.sqrt(dx * dx + dy * dy);
    if (cardDrag.dragDistance > 12 || pointer.dragDistance > 12) {
      cardDrag.dragging = true;
    }

    return clone(cardDrag);
  }

  function endCardDrag(sceneName) {
    var result = null;

    if (!cardDrag || (sceneName && cardDrag.scene !== sceneName)) {
      return null;
    }

    result = clone(cardDrag);
    cardDrag = null;
    return result;
  }

  function clearCardDrag(sceneName) {
    if (cardDrag && (!sceneName || cardDrag.scene === sceneName)) {
      cardDrag = null;
    }
  }

  function getCardDrag(sceneName) {
    if (!cardDrag || (sceneName && cardDrag.scene !== sceneName)) {
      return null;
    }

    return clone(cardDrag);
  }

  function getEffectsForScene(sceneName) {
    return effects.filter(function (effect) {
      return !effect.scene || effect.scene === sceneName;
    });
  }

  function getActiveCardMoveCardIds(sceneName, tag) {
    var activeIds = {};

    getEffectsForScene(sceneName).forEach(function (effect) {
      if (effect.type !== "card_move" || !effect.cardId) {
        return;
      }

      if (tag && effect.tag !== tag) {
        return;
      }

      if ((effect.ageMs || 0) < (effect.delayMs || 0)) {
        return;
      }

      activeIds[effect.cardId] = getVisibleProgress(effect);
    });

    return activeIds;
  }

  function clearEffects(sceneName) {
    if (!sceneName) {
      effects = [];
      cardDrag = null;
      return;
    }

    effects = effects.filter(function (effect) {
      return effect.scene && effect.scene !== sceneName;
    });

    if (cardDrag && cardDrag.scene === sceneName) {
      cardDrag = null;
    }
  }

  function spawnSlash(config) {
    return addEffect("slash", Object.assign({
      durationMs: 260,
      color: "#f1d1a0",
      accent: "#c13845",
      width: 8
    }, config || {}));
  }

  function spawnImpact(config) {
    return addEffect("impact", Object.assign({
      durationMs: 300,
      color: "#f4d8ae",
      radius: 42
    }, config || {}));
  }

  function spawnPulse(config) {
    return addEffect("pulse", Object.assign({
      durationMs: 260,
      color: "#e7c88e",
      radius: 52,
      lineWidth: 4
    }, config || {}));
  }

  function spawnCardMove(config) {
    return addEffect("card_move", Object.assign({
      durationMs: 360,
      delayMs: 0,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
      fromRotation: 0,
      toRotation: 0,
      fromScale: 1,
      toScale: 0.82,
      fromAlpha: 1,
      toAlpha: 1,
      arcHeight: 0,
      popScale: 0,
      width: 145,
      height: 138,
      cardId: "",
      card: null
    }, config || {}));
  }

  function spawnStagger(config) {
    return addEffect("stagger", Object.assign({
      durationMs: 220,
      targetKey: "",
      amplitudeX: 18,
      amplitudeY: 4
    }, config || {}));
  }

  function spawnMuzzleFlash(config) {
    return addEffect("muzzle_flash", Object.assign({
      durationMs: 210,
      x: 0,
      y: 0,
      radius: 42,
      color: "#ffd8ac",
      accent: "#fff4dd"
    }, config || {}));
  }

  function spawnScreenFlash(config) {
    return addEffect("screen_flash", Object.assign({
      durationMs: 160,
      color: "#ffe4ba",
      maxAlpha: 0.18
    }, config || {}));
  }

  function spawnShake(config) {
    return addEffect("shake", Object.assign({
      durationMs: 180,
      amplitudeX: 8,
      amplitudeY: 5,
      frequency: 22
    }, config || {}));
  }

  function spawnDefeatEcho(config) {
    return addEffect("defeat_echo", Object.assign({
      durationMs: 420,
      delayMs: 0,
      x: 0,
      y: 0,
      width: 220,
      height: 180,
      driftX: 48,
      sinkY: -10,
      tilt: 0,
      fromScale: 1,
      toScale: 0.97,
      holdRatio: 0.1,
      enemy: null,
      glowColor: "#f5d8b8"
    }, config || {}));
  }

  function renderSlash(ctx, effect) {
    if (G.render.combatVfx?.renderSlash(ctx, effect)) return;
    var progress = clamp(effect.ageMs / effect.durationMs, 0, 1);
    var eased = easeOutCubic(progress);
    var currentX = lerp(effect.fromX, effect.toX, eased);
    var currentY = lerp(effect.fromY, effect.toY, eased);
    var alpha = 1 - progress;
    var attackStyle = getAttackStyle(effect);
    var vector = getVector(effect.fromX, effect.fromY, currentX, currentY);
    var curveBend = Math.max(14, effect.width * 3.4);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    if (attackStyle === "firearm") {
      if (G.render.woodcut) {
        ctx.shadowBlur = 0; ctx.globalAlpha = alpha * .6;
        ctx.strokeStyle = '#c4b294'; ctx.lineWidth = 1.4;
        traceSlashPath(ctx,currentX - vector.nx * 30,currentY - vector.ny * 30,currentX,currentY);
        ctx.stroke(); ctx.restore(); return;
      }
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha * 0.22;
      ctx.lineWidth = effect.width * 1.1;
      traceSlashPath(
        ctx,
        effect.fromX + vector.px * 4,
        effect.fromY + vector.py * 4,
        currentX + vector.px * 2,
        currentY + vector.py * 2
      );
      ctx.stroke();
      traceSlashPath(
        ctx,
        effect.fromX - vector.px * 4,
        effect.fromY - vector.py * 4,
        currentX - vector.px * 2,
        currentY - vector.py * 2
      );
      ctx.stroke();

      ctx.strokeStyle = effect.accent;
      ctx.globalAlpha = alpha * 0.92;
      ctx.lineWidth = Math.max(2, effect.width * 0.72);
      traceSlashPath(ctx, effect.fromX, effect.fromY, currentX, currentY);
      ctx.stroke();

      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(currentX - vector.px * 8, currentY - vector.py * 8);
      ctx.lineTo(currentX + vector.px * 8, currentY + vector.py * 8);
      ctx.moveTo(currentX + vector.nx * 4, currentY + vector.ny * 4);
      ctx.lineTo(currentX + vector.nx * 12, currentY + vector.ny * 12);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (attackStyle === "bayonet") {
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha * 0.24;
      ctx.lineWidth = effect.width * 1.4;
      traceSlashPath(
        ctx,
        effect.fromX - vector.px * 3,
        effect.fromY - vector.py * 3,
        currentX + vector.nx * 6,
        currentY + vector.ny * 6
      );
      ctx.stroke();

      ctx.strokeStyle = effect.accent;
      ctx.globalAlpha = alpha * 0.94;
      ctx.lineWidth = Math.max(2, effect.width * 0.86);
      traceSlashPath(
        ctx,
        effect.fromX,
        effect.fromY,
        currentX + vector.nx * 10,
        currentY + vector.ny * 10
      );
      ctx.stroke();

      ctx.fillStyle = effect.color;
      ctx.globalAlpha = alpha * 0.76;
      ctx.beginPath();
      ctx.moveTo(currentX + vector.nx * 16, currentY + vector.ny * 16);
      ctx.lineTo(currentX + vector.nx * 4 + vector.px * 6, currentY + vector.ny * 4 + vector.py * 6);
      ctx.lineTo(currentX + vector.nx * 4 - vector.px * 6, currentY + vector.ny * 4 - vector.py * 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    if (attackStyle === "blunt") {
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha * 0.26;
      ctx.lineWidth = effect.width * 2.3;
      traceSlashPath(
        ctx,
        effect.fromX + vector.nx * 14,
        effect.fromY + vector.ny * 14,
        currentX,
        currentY
      );
      ctx.stroke();

      ctx.strokeStyle = effect.accent;
      ctx.globalAlpha = alpha * 0.84;
      ctx.lineWidth = effect.width * 1.16;
      traceSlashPath(
        ctx,
        effect.fromX + vector.px * 3,
        effect.fromY + vector.py * 3,
        currentX + vector.px * 4,
        currentY + vector.py * 4
      );
      ctx.stroke();

      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha * 0.7;
      ctx.lineWidth = Math.max(2.2, effect.width * 0.5);
      ctx.beginPath();
      ctx.moveTo(currentX - vector.px * 12, currentY - vector.py * 12);
      ctx.lineTo(currentX + vector.px * 12, currentY + vector.py * 12);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (attackStyle === "blade") {
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha * 0.24;
      ctx.lineWidth = effect.width * 1.8;
      traceSlashPath(
        ctx,
        effect.fromX,
        effect.fromY,
        currentX,
        currentY,
        (effect.fromX + currentX) * 0.5 + vector.px * curveBend,
        (effect.fromY + currentY) * 0.5 + vector.py * curveBend
      );
      ctx.stroke();

      ctx.strokeStyle = effect.accent;
      ctx.globalAlpha = alpha * 0.92;
      ctx.lineWidth = effect.width;
      traceSlashPath(
        ctx,
        effect.fromX + vector.px * 2,
        effect.fromY + vector.py * 2,
        currentX + vector.px * 2,
        currentY + vector.py * 2,
        (effect.fromX + currentX) * 0.5 + vector.px * (curveBend + 8),
        (effect.fromY + currentY) * 0.5 + vector.py * (curveBend + 8)
      );
      ctx.stroke();

      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(2, effect.width * 0.42);
      traceSlashPath(
        ctx,
        effect.fromX - vector.px * 4,
        effect.fromY - vector.py * 4,
        currentX - vector.px * 6,
        currentY - vector.py * 6,
        (effect.fromX + currentX) * 0.5 + vector.px * (curveBend - 10),
        (effect.fromY + currentY) * 0.5 + vector.py * (curveBend - 10)
      );
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = alpha * 0.28;
    ctx.lineWidth = effect.width * 1.8;
    traceSlashPath(ctx, effect.fromX, effect.fromY, currentX, currentY);
    ctx.stroke();

    ctx.strokeStyle = effect.accent;
    ctx.globalAlpha = alpha * 0.9;
    ctx.lineWidth = effect.width;
    traceSlashPath(ctx, effect.fromX, effect.fromY, currentX, currentY);
    ctx.stroke();

    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(2, effect.width * 0.45);
    traceSlashPath(ctx, effect.fromX, effect.fromY, currentX, currentY);
    ctx.stroke();

    ctx.restore();
  }

  function renderImpact(ctx, effect) {
    if (G.render.combatVfx?.renderImpact(ctx, effect)) return;
    var progress = clamp(effect.ageMs / effect.durationMs, 0, 1);
    var alpha = 1 - progress;
    var radius = lerp(10, effect.radius, easeOutQuad(progress));
    var particleRadius = radius * 0.72;
    var i = 0;
    var attackStyle = getAttackStyle(effect);
    var vector = getVector(effect.sourceX || effect.x, effect.sourceY || effect.y, effect.x, effect.y);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    if (attackStyle === "firearm") {
      ctx.translate(effect.x, effect.y);
      ctx.rotate(vector.angle);
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.82, radius * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = effect.color;
      ctx.globalAlpha = alpha * 0.24;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.36, radius * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha * 0.76;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.18, 0);
      ctx.lineTo(radius * 0.98, 0);
      ctx.moveTo(radius * 0.48, -radius * 0.18);
      ctx.lineTo(radius * 0.78, -radius * 0.38);
      ctx.moveTo(radius * 0.48, radius * 0.18);
      ctx.lineTo(radius * 0.78, radius * 0.38);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (attackStyle === "bayonet") {
      ctx.translate(effect.x, effect.y);
      ctx.rotate(vector.angle);
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.7, radius * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.82;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.64, 0);
      ctx.lineTo(radius * 0.74, 0);
      ctx.moveTo(radius * 0.74, 0);
      ctx.lineTo(radius * 0.98, radius * 0.12);
      ctx.lineTo(radius * 0.98, -radius * 0.12);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (attackStyle === "blade") {
      ctx.translate(effect.x, effect.y);
      ctx.rotate(vector.angle);
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.74, radius * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.7, radius * 0.08);
      ctx.lineTo(radius * 0.78, -radius * 0.12);
      ctx.moveTo(-radius * 0.3, radius * 0.28);
      ctx.lineTo(radius * 0.58, 0);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (attackStyle === "blunt") {
      ctx.strokeStyle = effect.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius * 0.92, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = effect.color;
      ctx.globalAlpha = alpha * 0.32;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      for (i = 0; i < 4; i += 1) {
        var bluntAngle = (Math.PI / 2) * i + progress * 0.4;
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(
          effect.x + Math.cos(bluntAngle) * (radius * 0.18),
          effect.y + Math.sin(bluntAngle) * (radius * 0.18)
        );
        ctx.lineTo(
          effect.x + Math.cos(bluntAngle) * (radius * 1.04),
          effect.y + Math.sin(bluntAngle) * (radius * 1.04)
        );
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = effect.color;
    ctx.globalAlpha = alpha * 0.28;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius * 0.52, 0, Math.PI * 2);
    ctx.fill();

    for (i = 0; i < 4; i += 1) {
      var rayAngle = (Math.PI / 2) * i + progress * 0.7;
      var innerX = effect.x + Math.cos(rayAngle) * (radius * 0.24);
      var innerY = effect.y + Math.sin(rayAngle) * (radius * 0.24);
      var outerX = effect.x + Math.cos(rayAngle) * (radius * 0.92);
      var outerY = effect.y + Math.sin(rayAngle) * (radius * 0.92);
      ctx.globalAlpha = alpha * 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }

    for (i = 0; i < 6; i += 1) {
      var angle = (Math.PI * 2 / 6) * i + progress * 0.8;
      var px = effect.x + Math.cos(angle) * particleRadius;
      var py = effect.y + Math.sin(angle) * particleRadius;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(px, py, 2 + (1 - progress) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function renderPulse(ctx, effect) {
    var progress = getVisibleProgress(effect);
    var radius = lerp(effect.radius * 0.4, effect.radius, easeOutQuad(progress));

    if (G.render.woodcut && effect.scene === 'combat') {
      // A brief dry-brush accent instead of luminous HUD rings on every draw.
      ctx.save(); ctx.globalAlpha = (1 - progress) * .5;
      ctx.strokeStyle = '#b4a183'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(effect.x - radius * .5,effect.y + 5);
      ctx.quadraticCurveTo(effect.x,effect.y + 8,effect.x + radius * .45,effect.y + 3);
      ctx.stroke(); ctx.restore(); return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = 1 - progress;
    ctx.lineWidth = effect.lineWidth || 4;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function renderCardMove(ctx, effect) {
    var progress = getVisibleProgress(effect);
    var alpha = clamp(lerp(effect.fromAlpha, effect.toAlpha, easeOutQuad(progress)), 0, 1);
    var scale = lerp(effect.fromScale, effect.toScale, easeOutQuad(progress));
    var rotation = lerp(effect.fromRotation, effect.toRotation, easeOutQuad(progress));
    var x = lerp(effect.fromX, effect.toX, easeOutCubic(progress));
    var y = lerp(effect.fromY, effect.toY, easeOutCubic(progress));
    var arcLift = Math.sin(progress * Math.PI) * (effect.arcHeight || 0);
    var popScale = Math.sin(progress * Math.PI) * (effect.popScale || 0);

    if (!effect.card || !G.render.ui || typeof G.render.ui.drawCardSlot !== "function" || (effect.ageMs || 0) < (effect.delayMs || 0)) {
      return;
    }

    G.render.ui.drawCardSlot(ctx, Object.assign({}, effect.card, {
      x: x,
      y: y - arcLift,
      width: effect.width || 145,
      height: effect.height || 138,
      alpha: alpha,
      scale: scale + popScale,
      rotation: rotation,
      glowColor: null,
      glowBlur: 0
    }));
  }

  function renderMuzzleFlash(ctx, effect) {
    if (G.render.combatVfx?.renderMuzzleFlash(ctx, effect)) return;
    var progress = getVisibleProgress(effect);
    var alpha = 1 - progress;
    var radius = lerp(effect.radius * 0.34, effect.radius, easeOutQuad(progress));
    var i = 0;
    var vector = getVector(effect.x, effect.y, effect.targetX || (effect.x + 1), effect.targetY || effect.y);

    if ((effect.ageMs || 0) < (effect.delayMs || 0)) {
      return;
    }

    if (G.render.woodcut && effect.scene === 'combat') {
      ctx.save(); ctx.translate(effect.x,effect.y); ctx.rotate(vector.angle);
      ctx.fillStyle = '#c2ba9f'; ctx.globalAlpha = (1 - progress) * .2;
      for (var puff = 0; puff < 3; puff++) {
        ctx.beginPath(); ctx.ellipse(radius * (.4 + puff * .65),-progress * 16 + puff * 3,radius * (.4 + progress),radius * (.25 + progress * .4),-.4,0,Math.PI * 2); ctx.fill();
      }
      if (progress < .35) {
        ctx.globalAlpha = (.35 - progress) * 2; ctx.fillStyle = '#dfc7a0';
        ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(25,-2); ctx.lineTo(15,2); ctx.lineTo(22,6); ctx.lineTo(0,4); ctx.closePath(); ctx.fill();
      }
      ctx.restore(); return;
    }
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(effect.x, effect.y);
    ctx.rotate(vector.angle);
    ctx.fillStyle = effect.color;
    ctx.globalAlpha = alpha * 0.44;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.moveTo(radius * 0.04, -radius * 0.2);
    ctx.lineTo(radius * 0.92, 0);
    ctx.lineTo(radius * 0.04, radius * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = effect.accent || effect.color;
    ctx.lineCap = "round";
    for (i = 0; i < 6; i += 1) {
      var angle = (Math.PI * 2 / 6) * i + progress * 0.22;
      var inner = radius * 0.22;
      var outer = i % 2 === 0 ? radius : radius * 0.68;
      ctx.globalAlpha = alpha * 0.92;
      ctx.lineWidth = i % 2 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderScreenFlash(ctx, effect) {
    var progress = getVisibleProgress(effect);

    if ((effect.ageMs || 0) < (effect.delayMs || 0)) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = (1 - progress) * (effect.maxAlpha || 0.14);
    ctx.fillStyle = effect.color || "#ffe4ba";
    ctx.fillRect(-64, -64, (ctx.canvas.logicalWidth || ctx.canvas.width) + 128, (ctx.canvas.logicalHeight || ctx.canvas.height) + 128);
    ctx.restore();
  }

  function renderDefeatEcho(ctx, effect) {
    var progress = getVisibleProgress(effect);
    var holdRatio = clamp(effect.holdRatio || 0, 0, 0.65);
    var motionProgress = progress <= holdRatio ? 0 : (progress - holdRatio) / (1 - holdRatio);
    var eased = easeOutCubic(motionProgress);
    var alpha = progress < holdRatio ? 0.98 : 1 - motionProgress;
    var reduced = !!G.main?.getState().settings?.reducedMotion || !!G.scenes.combat.feedback?.isReducedMotion?.();
    var scale = reduced ? 1 : lerp(effect.fromScale ?? 1, effect.toScale ?? 0.97, eased);
    var driftX = lerp(0, effect.driftX || 0, eased);
    var driftY = lerp(0, effect.sinkY ?? -10, eased);
    if (reduced) { driftX = 0; driftY = 0; }
    var width = effect.width || 220;
    var height = effect.height || 180;
    var flashAlpha = progress < holdRatio ? 0.3 : (1 - motionProgress) * 0.22;
    var shadowAlpha = Math.max(0, (0.16 + motionProgress * 0.12) * alpha);
    var panelFillAlpha = Math.max(0, 0.26 - motionProgress * 0.12) * alpha;
    var panelStrokeAlpha = Math.max(0, 0.72 - motionProgress * 0.28) * alpha;
    var enemy = Object.assign({}, effect.enemy || {});

    if ((effect.ageMs || 0) < (effect.delayMs || 0) || !enemy || !G.render.ui || typeof G.render.ui.drawEnemyCard !== "function") {
      return;
    }

    ctx.save();
    ctx.translate(effect.x + width / 2 + driftX, effect.y + height / 2 + driftY);
    // Retreat around the portrait's lower edge with its original proportions.
    // A vertical collapse reads as a flattened cardboard cutout.
    var lowerEdge = -height / 2 + 32 + Math.min(310, height - 82);
    ctx.translate(0, lowerEdge);
    ctx.scale(scale, scale);
    ctx.translate(0, -lowerEdge);

    if (shadowAlpha > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "#0b0909";
      ctx.globalAlpha = shadowAlpha;
      ctx.beginPath();
      if (typeof ctx.ellipse === "function") {
        ctx.ellipse(0, height * 0.35, width * (0.28 + motionProgress * 0.04), Math.max(12, height * 0.11), 0, 0, Math.PI * 2);
      } else {
        ctx.arc(0, height * 0.35, Math.max(14, width * 0.22), 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (flashAlpha > 0 && !G.render.woodcut?.combatPresentation) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = effect.glowColor || "#f5d8b8";
      ctx.globalAlpha = flashAlpha;
      ctx.fillRect(-width / 2 - 18, -height / 2 - 18, width + 36, height + 36);
      ctx.strokeStyle = effect.glowColor || "#f5d8b8";
      ctx.globalAlpha = flashAlpha * 0.9;
      ctx.lineWidth = 3;
      ctx.strokeRect(-width / 2 - 10, -height / 2 - 10, width + 20, height + 20);
      ctx.restore();
    }

    if (G.render.woodcut) {
      var presentation = G.render.woodcut.combatPresentation;
      var echoArt = (presentation?.enemyArt || G.render.woodcut.enemyArt)(enemy);
      (presentation?.figure || G.render.woodcut.figure)(ctx, echoArt, {
        x: -width / 2, y: -height / 2 + 32, width: width, height: Math.min(310, height - 82), slotRole: effect.slotRole
      }, presentation ? presentation.enemyFlip(enemy) : echoArt.startsWith('enemy-blade-front'));
      ctx.restore();
      return;
    }
    G.render.ui.drawEnemyCard(ctx, {
      x: -width / 2,
      y: -height / 2,
      width: width,
      height: height,
      name: enemy.name,
      hp: typeof enemy.hp === "number" ? enemy.hp : 0,
      maxHp: enemy.maxHp,
      block: typeof enemy.block === "number" ? enemy.block : 0,
      intent: enemy.intent,
      intentLabel: enemy.intentLabel,
      intentValue: enemy.intentValue
    });

    if (panelFillAlpha > 0 || panelStrokeAlpha > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowColor = effect.glowColor || "#f5d8b8";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (panelFillAlpha > 0) {
        ctx.fillStyle = "rgba(238, 216, 188, 0.88)";
        ctx.globalAlpha = panelFillAlpha;
        ctx.fillRect(-width / 2, -height / 2, width, height);
      }

      if (panelStrokeAlpha > 0) {
        ctx.strokeStyle = effect.glowColor || "#f5d8b8";
        ctx.globalAlpha = panelStrokeAlpha;
        ctx.lineWidth = 4;
        ctx.strokeRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6);
      }

      ctx.restore();
    }

    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = effect.glowColor || "#f5d8b8";
    ctx.globalAlpha = Math.max(0, 0.72 - motionProgress * 0.38);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-width * 0.42, -height * 0.16);
    ctx.lineTo(width * 0.38, -height * 0.34);
    ctx.moveTo(-width * 0.3, height * 0.04);
    ctx.lineTo(width * 0.3, height * 0.3);
    ctx.moveTo(-width * 0.14, -height * 0.34);
    ctx.lineTo(width * 0.14, height * 0.34);
    ctx.stroke();
    ctx.restore();
  }

  function renderEffect(ctx, effect) {
    if (effect.type === "slash") {
      renderSlash(ctx, effect);
      return;
    }

    if (effect.type === "impact") {
      renderImpact(ctx, effect);
      return;
    }

    if (effect.type === "pulse") {
      renderPulse(ctx, effect);
      return;
    }

    if (effect.type === "card_move") {
      renderCardMove(ctx, effect);
      return;
    }

    if (effect.type === "muzzle_flash") {
      renderMuzzleFlash(ctx, effect);
      return;
    }

    if (effect.type === "screen_flash") {
      renderScreenFlash(ctx, effect);
      return;
    }

    if (effect.type === "defeat_echo") {
      renderDefeatEcho(ctx, effect);
    }
  }

  function getSceneOffset(sceneName) {
    var offset = { x: 0, y: 0 };

    getEffectsForScene(sceneName).forEach(function (effect) {
      var progress = 0;
      var decay = 0;
      var oscillation = 0;

      if (effect.type !== "shake" || (effect.ageMs || 0) < (effect.delayMs || 0)) {
        return;
      }

      progress = getVisibleProgress(effect);
      decay = 1 - progress;
      oscillation = (effect.frequency || 22) * progress;
      offset.x += Math.sin(oscillation) * (effect.amplitudeX || 0) * decay;
      offset.y += Math.cos(oscillation * 1.3) * (effect.amplitudeY || 0) * decay;
    });

    return offset;
  }

  function getStaggerOffset(sceneName, targetKey) {
    var offset = { x: 0, y: 0 };

    getEffectsForScene(sceneName).forEach(function (effect) {
      var progress = 0;
      var sway = 0;

      if (effect.type !== "stagger" || effect.targetKey !== targetKey || (effect.ageMs || 0) < (effect.delayMs || 0)) {
        return;
      }

      progress = getVisibleProgress(effect);
      if(effect.contactHoldMs){
        const age=Math.max(0,(effect.ageMs||0)-(effect.delayMs||0)),hold=effect.contactHoldMs;
        const settle=clamp((age-hold)/Math.max(1,effect.durationMs-hold),0,1);
        sway=age<hold?.84:Math.exp(-settle*5)*(1-.16*Math.cos(settle*Math.PI*2));
      }else sway = Math.sin(progress * Math.PI * 2.1) * (1 - progress);
      offset.x += sway * (effect.amplitudeX || 0);
      offset.y += sway * (effect.amplitudeY || 0);
    });

    return offset;
  }

  function buildEngagementFocusCandidate(effect) {
    var tag = effect.tag || "";
    var progress = 0;
    var intensity = 0;
    var priority = 0;
    var sourceSide = null;
    var targetSide = null;

    if ((effect.ageMs || 0) < (effect.delayMs || 0)) {
      return null;
    }

    progress = getVisibleProgress(effect);
    if (progress <= 0 || progress >= 1) {
      return null;
    }

    if (effect.type === "slash") {
      intensity = Math.sin(progress * Math.PI) * 1.08;
      priority = 4;
    } else if (effect.type === "impact") {
      intensity = Math.sin(progress * Math.PI) * 0.74;
      priority = 3;
    } else if (effect.type === "stagger") {
      intensity = Math.sin(progress * Math.PI) * 0.46;
      priority = 2;
    } else if (effect.type === "muzzle_flash") {
      intensity = (1 - progress) * 0.32;
      priority = 1;
    } else {
      return null;
    }

    if (tag.indexOf("player_hit_") === 0 || tag === "enemy_hit_stagger") {
      sourceSide = "player";
      targetSide = "enemy";
    } else if (tag.indexOf("enemy_") === 0 || tag === "gunshot_muzzle_flash") {
      sourceSide = "enemy";
      targetSide = "player";
    } else {
      return null;
    }

    return {
      active: intensity > 0.01,
      priority: priority,
      intensity: clamp(intensity, 0, 1),
      progress: progress,
      tag: tag,
      sourceSide: sourceSide,
      targetSide: targetSide,
      sourceKey: effect.sourceKey || null,
      targetKey: effect.targetKey || null,
      sourceX: Number(effect.fromX || effect.sourceX || effect.x || 0),
      sourceY: Number(effect.fromY || effect.sourceY || effect.y || 0),
      targetX: Number(effect.toX || effect.targetX || effect.x || 0),
      targetY: Number(effect.toY || effect.targetY || effect.y || 0)
    };
  }

  function getEngagementFocus(sceneName) {
    var best = null;

    getEffectsForScene(sceneName).forEach(function (effect) {
      var candidate = buildEngagementFocusCandidate(effect);

      if (!candidate || !candidate.active) {
        return;
      }

      if (!best || candidate.priority > best.priority || (candidate.priority === best.priority && candidate.intensity > best.intensity)) {
        best = candidate;
      }
    });

    if (!best) {
      return {
        active: false,
        intensity: 0,
        progress: 0,
        tag: null,
        sourceSide: null,
        targetSide: null,
        sourceKey: null,
        targetKey: null,
        sourceX: 0,
        sourceY: 0,
        targetX: 0,
        targetY: 0
      };
    }

    best.midX = (best.sourceX + best.targetX) * 0.5;
    best.midY = (best.sourceY + best.targetY) * 0.5;
    return best;
  }

  function renderCardDrag(ctx, sceneName) {
    var drag = getCardDrag(sceneName);
    var centerX = 0;
    var centerY = 0;
    var rotation = 0;

    if (!drag || !drag.card || !G.render.ui || typeof G.render.ui.drawCardSlot !== "function") {
      return;
    }

    centerX = drag.pointerX - drag.offsetX + drag.width / 2;
    centerY = drag.pointerY - drag.offsetY + drag.height / 2 - 14;
    rotation = clamp((centerX - (drag.originX + drag.width / 2)) / 240, -0.16, 0.16);

    G.render.ui.drawCardSlot(ctx, Object.assign({}, drag.card, {
      x: centerX - drag.width / 2,
      y: centerY - drag.height / 2,
      width: drag.width,
      height: drag.height,
      scale: drag.dragging ? 1.08 : 1.03,
      rotation: rotation,
      glowColor: drag.card.playable ? "rgba(241, 209, 160, 0.7)" : "rgba(105, 100, 92, 0.45)",
      glowBlur: drag.dragging ? 18 : 10,
      // Fixed drag opacity can be baked once; animated fades keep direct paint.
      alpha: 0.98,
      cacheFixedAlpha: true
    }));
  }

  function render(ctx, sceneName) {
    getEffectsForScene(sceneName).forEach(function (effect) {
      renderEffect(ctx, effect);
    });
    renderCardDrag(ctx, sceneName);
  }

  function getDebugState(sceneName) {
    return {
      activeScene: activeScene,
      activeEffectCount: getEffectsForScene(sceneName || activeScene).length,
      effects: getEffectsForScene(sceneName || activeScene).map(function (effect) {
        var payload = {
          id: effect.id,
          type: effect.type,
          tag: effect.tag || null,
          attackStyle: effect.attackStyle || null,
          targetKey: effect.targetKey || null,
          ageMs: effect.ageMs,
          durationMs: effect.durationMs,
          scene: effect.scene || null
        };

        if (effect.type === "defeat_echo") {
          payload.x = effect.x || 0;
          payload.y = effect.y || 0;
          payload.width = effect.width || 0;
          payload.height = effect.height || 0;
          payload.delayMs = effect.delayMs || 0;
          payload.driftX = effect.driftX || 0;
          payload.sinkY = effect.sinkY || 0;
          payload.tilt = effect.tilt || 0;
        }

        return payload;
      }),
      sceneOffset: getSceneOffset(sceneName || activeScene),
      combatFocus: getEngagementFocus(sceneName || activeScene),
      cardDrag: getCardDrag(sceneName || activeScene)
    };
  }

  G.render.animations.update = update;
  G.render.animations.render = render;
  G.render.animations.syncScene = syncScene;
  G.render.animations.beginCardDrag = beginCardDrag;
  G.render.animations.updateCardDrag = updateCardDrag;
  G.render.animations.endCardDrag = endCardDrag;
  G.render.animations.clearCardDrag = clearCardDrag;
  G.render.animations.getCardDrag = getCardDrag;
  G.render.animations.getActiveCardMoveCardIds = getActiveCardMoveCardIds;
  G.render.animations.clearEffects = clearEffects;
  G.render.animations.spawnSlash = spawnSlash;
  G.render.animations.spawnImpact = spawnImpact;
  G.render.animations.spawnPulse = spawnPulse;
  G.render.animations.spawnCardMove = spawnCardMove;
  G.render.animations.spawnStagger = spawnStagger;
  G.render.animations.spawnMuzzleFlash = spawnMuzzleFlash;
  G.render.animations.spawnScreenFlash = spawnScreenFlash;
  G.render.animations.spawnShake = spawnShake;
  G.render.animations.spawnDefeatEcho = spawnDefeatEcho;
  G.render.animations.getSceneOffset = getSceneOffset;
  G.render.animations.getStaggerOffset = getStaggerOffset;
  G.render.animations.getEngagementFocus = getEngagementFocus;
  G.render.animations.getDebugState = getDebugState;
  G.render.animations.hasVisuals = function (scene) { return getEffectsForScene(scene).length > 0 || !!getCardDrag(scene); };
  G.render.animations.spawnEnemyAction = function (enemy) {
    return addEffect('enemy_action', { scene:'combat', sourceKey:enemy.id, enemy:clone(enemy), durationMs:320 });
  };
  G.render.animations.getEnemyAction = getEnemyAction;
})();
