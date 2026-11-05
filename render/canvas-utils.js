window.G = window.G || {};
G.render = G.render || {};

G.render.canvasUtils = {
  fontRevision: 0,
  paintCacheEnabled: true,
  density: function (ctx) { return ctx.canvas.renderScale || 1; },
  actionHitbox: function (box, touch) {
    if (!touch) return box;
    var canvas = document.getElementById('game-canvas');
    var rect = canvas && canvas.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return box;
    var width = Math.max(box.width, 44 * 1280 / rect.width);
    var height = Math.max(box.height, 44 * 720 / rect.height);
    return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width: width, height: height };
  },
  containsAction: function (point, box) {
    if (!point || !box) return false;
    // Expand deliberately chosen actions only; dense card/choice rows keep
    // their own selection geometry. Canvas raster density is not CSS scale.
    var touch = (point.type || G.main?.getPointer().type) === 'touch';
    var b = this.actionHitbox(box, touch);
    return point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height;
  },
  pickAction: function (point, boxes) {
    if (!point) return null;
    var exact = boxes.find(function (b) { return point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height; });
    if (exact) return exact;
    var candidates = boxes.filter(b => this.containsAction(point, b));
    candidates.sort(function (a, b) {
      return Math.hypot(point.x-a.x-a.width/2, point.y-a.y-a.height/2) - Math.hypot(point.x-b.x-b.width/2, point.y-b.y-b.height/2);
    });
    return candidates[0] || null;
  },
  createLayer: function (width, height, density) {
    var layer = document.createElement('canvas');
    layer.width = Math.round(width * density); layer.height = Math.round(height * density);
    layer.logicalWidth = width; layer.logicalHeight = height; layer.renderScale = density;
    layer.getContext('2d').setTransform(layer.width / width, 0, 0, layer.height / height, 0, 0);
    return layer;
  },
  layers: new Map(),
  layerBudgetBytes: 48 * 1024 * 1024,
  dependencyInvalidations: 0,
  cachedLayer: function (key, width, height, density, paint) {
    var id = key + ':' + width + ':' + height + ':' + density, cache = this.layers;
    var assets=G.render.assets;
    if (cache.has(id)) {
      var hit = cache.get(id);cache.delete(id);
      if(!assets.dependenciesCurrent||assets.dependenciesCurrent(hit.assetDependencies)){cache.set(id,hit);assets.inheritDependencies?.(hit.assetDependencies);return hit;}
      this.dependencyInvalidations++;
    }
    var scope=assets.beginDependencies?.(),layer=this.createLayer(width,height,density);
    try{paint(layer.getContext('2d'));}finally{if(scope)layer.assetDependencies=assets.endDependencies(scope);}
    // Oversized one-off layers may be drawn, but must not pin an over-budget
    // allocation or evict every reusable small surface on each request.
    if (layer.width * layer.height * 4 > this.layerBudgetBytes) return layer;
    cache.set(id, layer);
    var bytes = 0; cache.forEach(function (item) { bytes += item.width * item.height * 4; });
    while (bytes > this.layerBudgetBytes && cache.size > 0) {
      var oldest = cache.keys().next().value, item = cache.get(oldest);
      bytes -= item.width * item.height * 4; cache.delete(oldest);
    }
    return layer;
  },
  getLayerCacheDebug: function () {
    var bytes = 0;
    this.layers.forEach(function (layer) { bytes += layer.width * layer.height * 4; });
    return { layers: this.layers.size, bytes: bytes, budgetBytes: this.layerBudgetBytes };
  },
  paintLayer: function (ctx, key, box, paint) {
    // Entry UI moves/fades a prepared group; attack/departure fades and arbitrary
    // compositing still keep their original per-operation drawing semantics.
    var t = ctx.getTransform(), density = this.density(ctx);
    var entryGroup=ctx.canvas.id==='game-canvas'&&G.render.sceneEntry?.cacheGroups&&G.render.sceneEntry.inPart();
    if (!this.paintCacheEnabled || (!entryGroup&&ctx.globalAlpha !== 1) || ctx.globalCompositeOperation !== 'source-over' ||
        ctx.filter !== 'none' || ctx.shadowBlur || ctx.shadowOffsetX || ctx.shadowOffsetY ||
        t.b || t.c || Math.abs(t.a-density)>.001 || Math.abs(t.d-density)>.001 || (!entryGroup&&(Math.abs(t.e-Math.round(t.e))>.001 || Math.abs(t.f-Math.round(t.f))>.001)) || document.fonts?.status === 'loading') { paint(ctx); return; }
    var x = Math.floor(box.x*density)/density, y = Math.floor(box.y*density)/density;
    var width = Math.ceil((box.x+box.width-x)*density)/density, height = Math.ceil((box.y+box.height-y)*density)/density;
    var id = 'paint:'+this.fontRevision+':'+ctx.imageSmoothingEnabled+':'+ctx.imageSmoothingQuality+':'+key+':'+x+':'+y;
    var layer = this.cachedLayer(id,width,height,density,function (brush) {
      brush.imageSmoothingEnabled=ctx.imageSmoothingEnabled;brush.imageSmoothingQuality=ctx.imageSmoothingQuality;
      brush.translate(-x,-y);paint(brush);
    });
    ctx.drawImage(layer,x,y,width,height);
  },
  clear: function (ctx, color) {
    if (G.render.assets && typeof G.render.assets.drawBackdrop === "function") {
      G.render.assets.drawBackdrop(ctx, {
        baseColor: color || "#151315",
        width: ctx.canvas.logicalWidth || ctx.canvas.width,
        height: ctx.canvas.logicalHeight || ctx.canvas.height
      });
      return;
    }

    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ctx.canvas.logicalWidth || ctx.canvas.width, ctx.canvas.logicalHeight || ctx.canvas.height);
    ctx.restore();
  },

  drawCenteredText: function (ctx, text, x, y, options) {
    var opts = options || {};
    var defaultFont = G.render.ui && typeof G.render.ui.getTitleFontFamily === "function" ?
      G.render.ui.getTitleFontFamily() :
      "\"KGame Ink\", \"KGame Song\", serif";
    ctx.save();
    ctx.textAlign = opts.align || "center";
    ctx.textBaseline = opts.baseline || "middle";
    ctx.fillStyle = opts.color || "#f3f0e8";
    if (opts.shadowColor) {
      ctx.shadowColor = opts.shadowColor;
      ctx.shadowBlur = opts.shadowBlur || 0;
      ctx.shadowOffsetX = opts.shadowOffsetX || 0;
      ctx.shadowOffsetY = opts.shadowOffsetY || 0;
    }
    ctx.font = (opts.weight || "700") + " " + (opts.size || 24) + "px " +
      (opts.fontFamily || defaultFont);
    ctx.fillText(text, x, y);
    ctx.restore();
  },

  drawFrame: function (ctx, x, y, width, height, strokeColor) {
    ctx.save();
    ctx.strokeStyle = strokeColor || "#7f1d1d";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }
};
document.fonts?.addEventListener('loadingdone', function () { G.render.canvasUtils.fontRevision += 1; });
