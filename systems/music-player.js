/* Two native media decks, data-backed for Web Audio on direct file:// pages. */
(function () {
  'use strict';
  window.G = window.G || {};
  G.createMusicPlayer = function (options) {
    var decks = [], active = null, desired = null, transitioning = false;
    var stopped = true, serial = 0, finishTimer = 0, lastSave = 0;
    var positions = {}, storageKey = 'kgame-music-v1:' + location.pathname;
    try { positions = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) {}
    function bookmark(deck) {
      if (!deck || !deck.track || !Number.isFinite(deck.media.currentTime)) return;
      positions[deck.track] = deck.media.ended ? 0 : deck.media.currentTime;
      try { localStorage.setItem(storageKey, JSON.stringify(positions)); } catch (_) {}
    }
    function ramp(deck, value, seconds) {
      var ctx = options.context(), param = deck.gain.gain;
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(ctx.currentTime);
      else { var current = param.value; param.cancelScheduledValues(ctx.currentTime); param.setValueAtTime(current, ctx.currentTime); }
      param.linearRampToValueAtTime(value, ctx.currentTime + seconds);
    }
    function pool() {
      if (decks.length) return;
      var ctx = options.context();
      for (var i = 0; i < 2; i++) {
        var media = new Audio();
        media.preload = 'auto'; media.playbackRate = 1;
        var source = ctx.createMediaElementSource(media), gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain); gain.connect(options.parent());
        var deck = { media: media, gain: gain, track: null, key: null, asset: null };
        decks.push(deck);
        media.addEventListener('error', function () { options.debug('audio:asset_music_error'); });
      }
    }
    async function load(deck, track) {
      var library = G.musicLibrary && G.musicLibrary[track];
      if (!library) throw new Error('Music data unavailable: ' + track);
      if (deck.loading && deck.loadingTrack === track) return deck.loading;
      if (deck.track === track && deck.media.readyState >= 1) return;
      deck.media.pause(); deck.gain.gain.value = 0; deck.track = track;
      deck.loadingTrack = track;
      deck.loading = new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { clean(); reject(new Error('Music load timeout')); }, 10000);
        function clean() { clearTimeout(timer); deck.media.removeEventListener('loadedmetadata', ready); deck.media.removeEventListener('error', fail); }
        function ready() { clean(); resolve(); }
        function fail() { clean(); reject(new Error('Music decode failed')); }
        deck.media.addEventListener('loadedmetadata', ready); deck.media.addEventListener('error', fail);
        deck.media.src = library.dataUrl; deck.media.load();
      });
      var pending = deck.loading;
      try { await pending; } finally { if (deck.loading === pending) { deck.loading = null; deck.loadingTrack = null; } }
    }
    async function reconcile(loop) {
      if (stopped || transitioning || !desired) return;
      pool();
      var request = desired, asset = request.asset;
      if (!loop && active && active.track === asset.track) {
        var resumed = active, resumeToken = serial;
        resumed.requestToken = resumeToken;
        active.key = request.key; active.asset = asset;
        // suspend() zeros the native media volume as well as the gain. Restore
        // both on the same deck, retaining its currentTime through inspections.
        active.media.volume = options.audible() ? 1 : 0;
        if (active.media.ended) active.media.currentTime = 0;
        if (active.media.paused) {
          active.gain.gain.value = 0;
          try { await active.media.play(); } catch (_) { options.debug('audio:asset_music_blocked'); return; }
        }
        if (stopped || resumeToken !== serial) {
          if (resumed.requestToken === resumeToken) resumed.media.pause();
          return;
        }
        ramp(active, asset.volume, .35); options.changed(active.media); return;
      }
      transitioning = true;
      var token = ++serial, outgoing = active;
      var incoming = decks.find(function (deck) { return deck !== outgoing; });
      incoming.requestToken = token;
      try {
        await load(incoming, asset.track);
        if (token !== serial || stopped) return;
        var position = loop ? 0 : Number(positions[asset.track]) || 0;
        incoming.media.currentTime = Math.max(0, Math.min(position, Math.max(0, incoming.media.duration - 3.1)));
        incoming.media.playbackRate = 1; incoming.media.volume = options.audible() ? 1 : 0;
        incoming.key = request.key; incoming.asset = asset;
        incoming.gain.gain.cancelScheduledValues(options.context().currentTime);
        incoming.gain.gain.value = 0;
        await incoming.media.play();
        if (token !== serial || stopped) {
          // A cancelled play promise must not pause a deck reused by a newer request.
          if (incoming.requestToken === token) incoming.media.pause();
          return;
        }
        active = incoming; options.changed(incoming.media);
        var fade = loop ? 3 : .7;
        ramp(incoming, asset.volume, fade);
        if (outgoing) ramp(outgoing, 0, fade);
        options.debug(loop ? 'music:loop_crossfade' : 'music:transition', { track: asset.track, key: request.key, seconds: fade });
        finishTimer = setTimeout(function () {
          finishTimer = 0;
          if (token !== serial) return;
          if (outgoing) {
            if (!loop) bookmark(outgoing);
            outgoing.media.pause(); outgoing.gain.gain.value = 0;
          }
          transitioning = false;
          if (!stopped && desired && (desired.asset.track !== active.track || desired.key !== active.key)) reconcile(false);
        }, fade * 1000);
      } catch (error) {
        if (token === serial) {
          transitioning = false;
          incoming.media.pause();
          options.debug('audio:asset_music_blocked', { message: error.message, track: asset.track });
        }
      }
    }
    function suspend() {
      if (stopped) return;
      stopped = true; serial++;
      if (finishTimer) clearTimeout(finishTimer);
      finishTimer = 0; transitioning = false;
      decks.forEach(function (deck) { if (deck !== active && !deck.media.paused) bookmark(deck); });
      bookmark(active);
      decks.forEach(function (deck) {
        deck.media.pause(); deck.media.volume = 0;
        deck.gain.gain.cancelScheduledValues(options.context().currentTime); deck.gain.gain.value = 0;
      });
    }
    setInterval(function () {
      if (stopped || !active) return;
      if (Date.now() - lastSave > 5000) { bookmark(active); lastSave = Date.now(); }
      if (!transitioning && desired && desired.asset.track === active.track &&
          Number.isFinite(active.media.duration) && active.media.currentTime >= active.media.duration - 3) reconcile(true);
    }, 50);
    window.addEventListener('pagehide', function () { bookmark(active); suspend(); });
    return {
      select: function (key, asset) { desired = { key: key, asset: asset }; stopped = false; reconcile(false); },
      suspend: suspend,
      setAudible: function (audible) { decks.forEach(function (deck) { deck.media.volume = audible ? 1 : 0; }); },
      debug: function () { return {
        track: active ? active.track : null, key: active ? active.key : null,
        time: active ? active.media.currentTime : 0, duration: active ? active.media.duration : null,
        paused: !active || active.media.paused, transitioning: transitioning,
        playbackRate: active ? active.media.playbackRate : 1,
        decks: decks.map(function (deck) { return { track: deck.track, time: deck.media.currentTime,
          paused: deck.media.paused, volume: deck.media.volume, gain: deck.gain.gain.value,
          readyState: deck.media.readyState, error: deck.media.error ? deck.media.error.code : null }; }),
        positions: Object.assign({}, positions)
      }; }
    };
  };
})();
