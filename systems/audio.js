window.G = window.G || {};

(function () {
  var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  var BUS_GAIN = {
    // The adopted tracks are already normalized to about -20 LUFS.
    // Keep them present beneath combat instead of attenuating them twice.
    music: 0.72,
    sfx: 0.82
  };
  var MUSIC_ASSETS = {
    title: { track: "journey", volume: 0.8 },
    map: { track: "journey", volume: 0.85 },
    combat: { track: "combat", volume: 0.92 },
    nemesis: { track: "nemesis", volume: 0.95 },
    rest: { track: "journey", volume: 0.6 },
    reward: { track: "journey", volume: 0.7 },
    shop: { track: "journey", volume: 0.7 }
  };
  var SFX_ASSETS = {
    ui_press: { src: "assets/audio/sfx/material-metal-v1/select.wav", volume: 0.14 },
    ui_target: { src: "assets/audio/sfx/material-metal-v1/select.wav", volume: 0.12 },
    card_draw: { src: "assets/audio/sfx/card-deal-v1/deal.wav", volume: 0.22 },
    card_acquire: { src: "assets/audio/sfx/card-deal-v1/deal.wav", volume: 0.24 },
    card_discard: { src: "assets/audio/sfx/material-metal-v1/discard.wav", volume: 0.30 },
    turn_confirm: { src: "assets/audio/sfx/material-metal-v1/discard.wav", volume: 0.28 },
    ui_soft: { src: "assets/audio/sfx/material-metal-v1/select.wav", volume: 0.22 },
    ui_confirm: { src: "assets/audio/sfx/material-metal-v1/inspect.wav", volume: 0.24 },
    card_inspect: { src: "assets/audio/sfx/material-metal-v1/inspect.wav", volume: 0.22 },
    result_purchase: { src: "assets/audio/sfx/scene-results-v1/purchase.wav", volume: 0.48 },
    result_remove: { src: "assets/audio/sfx/scene-results-v1/remove.wav", volume: 0.36 },
    result_relic: { src: "assets/audio/sfx/scene-results-v1/relic.wav", volume: 0.48 },
    result_relic_paper: { src: "assets/audio/sfx/scene-results-v1/upgrade.wav", volume: 0.44 },
    result_relic_cloth: { src: "assets/audio/sfx/scene-results-v1/heal.wav", volume: 0.40 },
    result_relic_coin: { src: "assets/audio/sfx/scene-results-v1/purchase.wav", volume: 0.44 },
    result_heal: { src: "assets/audio/sfx/scene-results-v1/heal.wav", volume: 0.44 },
    result_upgrade: { src: "assets/audio/sfx/scene-results-v1/upgrade.wav", volume: 0.44 },
    result_victory: { src: "assets/audio/sfx/victory-gong-v3/ordinary.wav", volume: 0.40 },
    result_victory_gate: { src: "assets/audio/sfx/victory-gong-v3/gate.wav", volume: 0.46 },
    ui_return: { src: "assets/audio/sfx/material-metal-v1/discard.wav", volume: 0.18 },
    ui_reject: { src: "assets/audio/sfx/material-metal-v1/select.wav", volume: 0.18 },
    style_blade: { src: "assets/audio/ui/recorded-v1/blade.wav", volume: 0.58 },
    style_iron: { src: "assets/audio/ui/recorded-v1/iron.wav", volume: 0.16 },
    style_dirty: { src: "assets/audio/ui/recorded-v1/dirty.wav", volume: 0.16 },
    style_combo: { src: "assets/audio/ui/recorded-v1/combo.wav", volume: 0.78 },
    player_blade: { src: "assets/audio/sfx/imported/sword-swing.wav", volume: 0.64, playbackRate: 1.35, maxDurationMs: 220 },
    player_combo: { src: "assets/audio/sfx/imported/sword-swing.wav", volume: 0.58, playbackRate: 1.5, maxDurationMs: 180 },
    player_dirty: { src: "assets/audio/sfx/imported/melee-strike.mp3", volume: 0.64, playbackRate: 1.18, maxDurationMs: 220 },
    player_iron: { src: "assets/audio/sfx/imported/melee-strike.mp3", volume: 0.58, playbackRate: 1.08, maxDurationMs: 240 },
    player_basic: { src: "assets/audio/sfx/imported/melee-strike.mp3", volume: 0.58, playbackRate: 1.12, maxDurationMs: 220 },
    block: { src: "assets/audio/sfx/imported/melee-strike.mp3", volume: 0.48, playbackRate: 1.38, maxDurationMs: 150 },
    wound: { src: "assets/audio/sfx/imported/melee-strike.mp3", volume: 0.56, playbackRate: 1.04, maxDurationMs: 230 },
    enemy_melee: { src: "assets/audio/sfx/imported/melee-strike.mp3", volume: 0.52, playbackRate: 1.14, maxDurationMs: 210 },
    // Source true peak is +5.4 dBTP. Leave >2 dB of single-cue headroom at
    // master/SFX volume 1 (bus 0.82), while keeping the original relative mix.
    gun_prep_revolver: { src: "assets/audio/sfx/material-metal-v1/hammer.wav", volume: 0.56 },
    gun_prep_carbine: { src: "assets/audio/sfx/material-metal-v1/bolt.wav", volume: 0.46 },
    gun_prep_rifle: { src: "assets/audio/sfx/material-metal-v1/bolt.wav", volume: 0.46 },
    gun_prep_mauser: { src: "assets/audio/sfx/material-metal-v1/bolt.wav", volume: 0.46 },
    gun_prep_heavy: { src: "assets/audio/sfx/material-metal-v1/bolt.wav", volume: 0.50 }
  };
  var defaultSfxAssets = cloneJson(SFX_ASSETS);
  var combatSoundProfile = 'original';
  var sfxVariantCursor = {};
  var debugHistoryLimit = 80;
  var musicIntervalId = 0;
  var musicDuckTimerId = 0;
  var currentMusicKey = null;
  var desiredMusicKey = null;
  var musicStep = 0;
  var musicDuckFactor = 1;
  var musicPlayer = null;
  var musicPaused = false;
  var appliedMusicTarget = null;
  var uiCueTimes = {};
  var activeSfxByKey = {};
  var activeSfxMix = {};
  var cachedSfxByKey = {};
  var pendingSfxTimers = new Set();
  var sfxPlaybackSerial = 0;
  var ambienceDesired = { key: null, level: 0 };
  var ambienceVoices = [], ambienceTimer = 0, ambienceSerial = 0;
  var ambienceFailed = {};
  var resultFocused = false;
  var resultMusicFactor = 1, resultAmbienceFactor = 1, resultUiFactor = 1;
  var runtime = {
    enabled: true,
    unlocked: false,
    available: !!AudioContextCtor,
    context: null,
    masterGain: null,
    musicGain: null,
    musicAnalyser: null,
    sfxGain: null,
    masterVolumeValue: 0.7,
    musicVolumeValue: 1,
    sfxVolumeValue: 1,
    noiseBuffer: null,
    currentMusicElement: null,
    debugHistory: [],
    debugCounts: {}
  };

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function pushDebug(name, meta) {
    var entry = {
      name: name,
      time: Date.now(),
      meta: meta || null
    };

    runtime.debugHistory.push(entry);
    runtime.debugCounts[name] = (runtime.debugCounts[name] || 0) + 1;

    if (runtime.debugHistory.length > debugHistoryLimit) {
      runtime.debugHistory.shift();
    }
  }

  function buildNoiseBuffer(ctx) {
    var duration = 2;
    var sampleRate = ctx.sampleRate;
    var frameCount = sampleRate * duration;
    var buffer = ctx.createBuffer(1, frameCount, sampleRate);
    var data = buffer.getChannelData(0);
    var i = 0;

    for (i = 0; i < frameCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.9;
    }

    return buffer;
  }

  function getContext() {
    var ctx = null;

    if (!runtime.available) {
      return null;
    }

    if (runtime.context) {
      return runtime.context;
    }

    ctx = new AudioContextCtor();
    runtime.context = ctx;
    runtime.masterGain = ctx.createGain();
    runtime.musicGain = ctx.createGain();
    runtime.sfxGain = ctx.createGain();
    runtime.masterGain.gain.value = runtime.masterVolumeValue;
    runtime.musicGain.gain.value = BUS_GAIN.music * runtime.musicVolumeValue;
    runtime.sfxGain.gain.value = BUS_GAIN.sfx * runtime.sfxVolumeValue;
    runtime.musicAnalyser = ctx.createAnalyser();
    runtime.musicAnalyser.fftSize = 2048;
    runtime.musicGain.connect(runtime.musicAnalyser);
    runtime.musicAnalyser.connect(runtime.masterGain);
    runtime.sfxGain.connect(runtime.masterGain);
    runtime.masterGain.connect(ctx.destination);
    runtime.noiseBuffer = buildNoiseBuffer(ctx);
    pushDebug("audio:init", { state: ctx.state });
    return ctx;
  }

  function canPlay() {
    var ctx = getContext();
    return !!ctx && runtime.enabled && runtime.unlocked;
  }

  function stopMusic() {
    var activeMusic = runtime.currentMusicElement;

    if (musicIntervalId) {
      window.clearInterval(musicIntervalId);
      musicIntervalId = 0;
    }
    if (musicPlayer) {
      musicPlayer.suspend();
    } else if (activeMusic) {
      activeMusic.pause();
      activeMusic.currentTime = 0;
      runtime.currentMusicElement = null;
    }
    currentMusicKey = null;
  }

  function cleanupActiveSfx(key, audio) {
    if (activeSfxByKey[key] === audio) {
      delete activeSfxByKey[key];
      delete activeSfxMix[key];
      refreshResultFocus();
    }
  }

  function stopActiveSfx(key) {
    var audio = activeSfxByKey[key];

    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.kgamePlaybackId = ++sfxPlaybackSerial;
    delete activeSfxByKey[key];
    delete activeSfxMix[key];
    refreshResultFocus();
  }

  function stopAllActiveSfx() {
    pendingSfxTimers.forEach(function (timer) { window.clearTimeout(timer); });
    pendingSfxTimers.clear();
    Object.keys(activeSfxByKey).forEach(function (key) {
      stopActiveSfx(key);
    });
  }

  function getBusVolume(bus) {
    return runtime.masterVolumeValue * (bus === "music" ? BUS_GAIN.music * runtime.musicVolumeValue * musicDuckFactor * resultMusicFactor : BUS_GAIN.sfx * runtime.sfxVolumeValue);
  }

  function applyMediaVolume(media, bus, assetVolume) {
    if (!media) {
      return;
    }

    media.volume = Math.max(0, Math.min(1, getBusVolume(bus) * (assetVolume || 1)));
  }

  // Quiet place beds have their own two-voice limit. They cannot evict a hit,
  // result cue or complete deal. Only fades run a timer; steady rooms are idle.
  function ambienceLevel(voice) {
    voice.audio.volume = Math.max(0, Math.min(1, getBusVolume('sfx') * voice.level));
  }

  function removeAmbience(voice) {
    voice.audio.pause();
    voice.audio.removeAttribute('src');
    voice.audio.load();
    ambienceVoices = ambienceVoices.filter(function(v) { return v !== voice; });
  }

  function stopAmbience() {
    ambienceSerial++;
    if (ambienceTimer) window.clearTimeout(ambienceTimer);
    ambienceTimer = 0;
    ambienceVoices.slice().forEach(removeAmbience);
  }

  function fadeAmbience(voice, target, durationMs) {
    if (voice.target === target) {
      if (voice.ready && target === 0 && voice.level === 0) removeAmbience(voice);
      return;
    }
    voice.from = voice.level;
    voice.target = target;
    voice.fadeAt = performance.now();
    voice.fadeDuration = durationMs || 720;
    if (!ambienceTimer) ambienceTimer = window.setTimeout(stepAmbience, 40);
  }

  function stepAmbience() {
    ambienceTimer = 0;
    var moving = false, now = performance.now();
    ambienceVoices.slice().forEach(function(voice) {
      if (!voice.ready) return;
      var t = Math.max(0, Math.min(1, (now - voice.fadeAt) / voice.fadeDuration));
      var eased = t * t * (3 - 2 * t);
      voice.level = voice.from + (voice.target - voice.from) * eased;
      ambienceLevel(voice);
      if (t >= 1 && voice.target === 0) removeAmbience(voice);
      else if (t < 1) moving = true;
    });
    if (moving) ambienceTimer = window.setTimeout(stepAmbience, 40);
  }

  function ensureAmbience() {
    if (!runtime.enabled || !runtime.unlocked || musicPaused || getBusVolume('sfx') <= 0) {
      stopAmbience();
      return;
    }
    var key = ambienceDesired.key;
    if (!key || ambienceFailed[key]) {
      ambienceVoices.forEach(function(v) { fadeAmbience(v, 0); });
      return;
    }
    var voice = ambienceVoices.find(function(v) { return v.key === key; });
    if (voice) {
      if (voice.ready) {
        fadeAmbience(voice, ambienceDesired.level * resultAmbienceFactor);
        ambienceVoices.filter(function(v) { return v !== voice; }).forEach(function(v) { fadeAmbience(v, 0); });
      }
      return;
    }
    // Rapid scene changes discard a pending/quiet tail before allocating a bed.
    if (ambienceVoices.length >= 2) removeAmbience(ambienceVoices.slice().sort(function(a,b) { return a.level-b.level; })[0]);
    var audio = new Audio('assets/audio/sfx/scene-results-v1/' + key + '.wav');
    audio.preload = 'auto'; audio.loop = true; audio.volume = 0;
    voice = { key:key, audio:audio, level:0, from:0, target:0, fadeAt:0, ready:false };
    ambienceVoices.push(voice);
    var serial = ambienceSerial;
    var fail = function(error) {
      if (!ambienceVoices.includes(voice)) return;
      removeAmbience(voice);
      if (error && error.name === 'AbortError') return;
      ambienceFailed[key] = true;
      pushDebug('ambience:error', { key:key });
      ambienceVoices.forEach(function(v) { fadeAmbience(v, 0); });
    };
    audio.addEventListener('error', fail, { once:true });
    var playing = audio.play();
    if (playing && playing.then) playing.then(function() {
      if (serial !== ambienceSerial || !ambienceVoices.includes(voice)) return;
      voice.ready = true;
      // Keep the previous place audible until the new bed actually starts.
      fadeAmbience(voice, ambienceDesired.key === key ? ambienceDesired.level * resultAmbienceFactor : 0);
      if (ambienceDesired.key === key) ambienceVoices.filter(function(v) { return v !== voice; }).forEach(function(v) { fadeAmbience(v, 0); });
      pushDebug('ambience:ready', { key:key });
    }).catch(fail);
  }

  function syncAmbience(state) {
    // The two generic loops implied offscreen movement in unrelated places.
    // Keep their originals/provenance, but do not start them on scene changes.
    ambienceDesired = { key:null, level:0 };
    stopAmbience();
  }

  function applyCurrentMusicLevel() {
    var currentAsset = currentMusicKey ? MUSIC_ASSETS[currentMusicKey] : null;

    if (runtime.musicGain) {
      var gain = runtime.musicGain.gain, ctx = runtime.context;
      var target = BUS_GAIN.music * runtime.musicVolumeValue * musicDuckFactor * resultMusicFactor;
      if (appliedMusicTarget !== target) {
        gain.cancelScheduledValues(ctx.currentTime);
        if (!target) gain.setValueAtTime(0, ctx.currentTime);
        else gain.setTargetAtTime(target, ctx.currentTime, musicDuckFactor < 1 || resultFocused ? 0.025 : 0.08);
        appliedMusicTarget = target;
      }
    }
    if (musicPlayer) {
      musicPlayer.setAudible(getBusVolume('music') > 0 && !musicPaused && runtime.enabled);
    } else if (runtime.currentMusicElement) {
      applyMediaVolume(runtime.currentMusicElement, "music", currentAsset ? currentAsset.volume : 1);
    }
  }

  function refreshResultFocus() {
    var playing = Object.keys(activeSfxMix).filter(function(key) { return activeSfxMix[key].resultPlaying; });
    var focused = playing.length > 0, music = 1, ambience = 1, ui = 1;
    playing.forEach(function(key) {
      var cue = activeSfxMix[key].cue;
      var profile = /^result_victory/.test(cue) ? [.62,.35,.45] : [.78,.55,.55];
      music = Math.min(music,profile[0]); ambience = Math.min(ambience,profile[1]); ui = Math.min(ui,profile[2]);
    });
    if (focused === resultFocused && music === resultMusicFactor && ambience === resultAmbienceFactor && ui === resultUiFactor) return;
    resultFocused = focused;
    resultMusicFactor = music; resultAmbienceFactor = ambience; resultUiFactor = ui;
    Object.keys(activeSfxByKey).forEach(function(key) {
      var voice = activeSfxMix[key];
      if (voice.priority !== 1) return;
      var factor = focused ? resultUiFactor : 1;
      voice.gain = voice.gain / (voice.uiFocusFactor || 1) * factor;
      voice.uiFocusFactor = factor;
      applyMediaVolume(activeSfxByKey[key], 'sfx', SFX_ASSETS[key].volume * voice.gain);
    });
    applyCurrentMusicLevel();
    ambienceVoices.filter(function(v) { return v.ready && v.key === ambienceDesired.key; }).forEach(function(v) {
      fadeAmbience(v, ambienceDesired.level * resultAmbienceFactor, focused ? 120 : 380);
    });
    pushDebug('audio:result_focus', { active:focused, musicFactor:music, ambienceFactor:ambience, uiFactor:ui });
  }

  function duckMusic(durationMs, factor) {
    var releaseDelay = Math.max(60, Math.round(durationMs || 180));
    var nextFactor = Math.max(0.18, Math.min(1, Number(factor) || 1));

    if (!runtime.enabled || !runtime.unlocked) {
      return;
    }

    musicDuckFactor = Math.min(musicDuckFactor, nextFactor);
    applyCurrentMusicLevel();
    pushDebug("audio:duck", {
      factor: musicDuckFactor,
      durationMs: releaseDelay
    });

    if (musicDuckTimerId) {
      window.clearTimeout(musicDuckTimerId);
    }
    musicDuckTimerId = window.setTimeout(function () {
      musicDuckFactor = 1;
      applyCurrentMusicLevel();
      pushDebug("audio:duck_release");
      musicDuckTimerId = 0;
    }, releaseDelay);
  }

  function playExternalSfx(key, delayMs, mix) {
    var cueKey = key;
    var gain = mix && Number.isFinite(mix.gain) ? Math.max(0,Math.min(1.2,mix.gain)) : 1;
    // UI detail must never steal a contact, shot or the accepted full deal tail.
    var priority = /^result_|^card_(draw|acquire)$/.test(cueKey) ? 4 : /^ui_|^card_inspect$|^style_/.test(cueKey) ? 1 : /windup|^player_(blade|combo|iron|dirty|basic)$|^enemy_melee$/.test(cueKey) ? 2 : 3;
    if (resultFocused && priority === 1) gain *= resultUiFactor;
    if (/^ui_|^card_inspect$/.test(key)) {
      var now = Date.now();
      if (uiCueTimes[key] && now-uiCueTimes[key]<65) return true;
      uiCueTimes[key]=now;
    }
    var group = SFX_ASSETS[key];
    if (group && group.variants) {
      var cursor = sfxVariantCursor[key] || 0;
      key = group.variants[cursor % group.variants.length];
      sfxVariantCursor[cueKey] = cursor + 1;
    }
    var asset = SFX_ASSETS[key];
    var startDelay = Math.max(0, Math.round(delayMs || 0));

    if (!asset || !runtime.enabled || !runtime.unlocked) {
      return false;
    }

    if (getBusVolume('sfx') <= 0) return true;
    var startPlayback=function () {
      if(timer!==undefined)pendingSfxTimers.delete(timer);
      if (!runtime.enabled || !runtime.unlocked || getBusVolume('sfx') <= 0) return;
      var audio = getCachedSfx(key);
      var playAttempt = null;

      // Keep consecutive contacts readable without accumulating long sample tails.
      var voices = Object.keys(activeSfxByKey).filter(function(voice){return voice!==key;});
      if (voices.length >= 3) {
        var quietest = voices.reduce(function(a,b){return activeSfxMix[b].priority<activeSfxMix[a].priority?b:a;});
        if (activeSfxMix[quietest].priority > priority) {
          pushDebug('audio:detail_suppressed',{cue:cueKey});return;
        }
        stopActiveSfx(quietest);
      }
      stopActiveSfx(key);
      activeSfxByKey[key] = audio;
      activeSfxMix[key] = {gain:gain,priority:priority,cue:cueKey,uiFocusFactor:priority === 1 && resultFocused ? resultUiFactor : 1};
      audio.currentTime = 0;
      var playbackId = ++sfxPlaybackSerial;
      audio.kgamePlaybackId = playbackId;
      applyMediaVolume(audio, "sfx", asset.volume * gain);
      audio.playbackRate = asset.playbackRate || 1;
      playAttempt = audio.play();
      if (/^result_|^card_acquire$/.test(cueKey) && playAttempt && playAttempt.then) {
        // Loading/rejected playback does not duck the score. Real media start
        // opens focus; natural end, eviction, pause and mute all close it.
        playAttempt.then(function() {
          if (activeSfxByKey[key] !== audio || audio.kgamePlaybackId !== playbackId) return;
          activeSfxMix[key].resultPlaying = true;
          refreshResultFocus();
        }, function() {});
      }
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(function () {
          if (audio.kgamePlaybackId !== playbackId) return;
          cleanupActiveSfx(key, audio);
          pushDebug("audio:asset_sfx_blocked", { key: key });
        });
      }
      if (asset.maxDurationMs) {
        var clipTimer = window.setTimeout(function () {
          pendingSfxTimers.delete(clipTimer);
          if (activeSfxByKey[key] !== audio || audio.kgamePlaybackId !== playbackId) {
            return;
          }

          audio.pause();
          audio.currentTime = 0;
          cleanupActiveSfx(key, audio);
          pushDebug("audio:asset_sfx_clip", { key: key, maxDurationMs: asset.maxDurationMs });
        }, asset.maxDurationMs);
        pendingSfxTimers.add(clipTimer);
      }
    };
    // A zero-delay timer ran only after the expensive Canvas render returned,
    // making contact sound late on a stalled frame. Submit it at the hit beat.
    var timer;
    if(startDelay){timer=window.setTimeout(startPlayback,startDelay);pendingSfxTimers.add(timer);}
    else startPlayback();

    pushDebug("audio:asset_sfx", { key: key, cue: cueKey, src: asset.src, delayMs: startDelay, gain:gain, priority:priority });
    return true;
  }

  function getCachedSfx(key) {
    if (cachedSfxByKey[key]) return cachedSfxByKey[key];
    var audio = new window.Audio(SFX_ASSETS[key].src);
    audio.preload = 'auto';
    audio.addEventListener('error', function () {
      cleanupActiveSfx(key, audio);
      pushDebug('audio:asset_sfx_error', { key: key });
    });
    audio.addEventListener('ended', function () { cleanupActiveSfx(key, audio); });
    cachedSfxByKey[key] = audio;
    audio.load();
    return audio;
  }

  function stopCombatSfx() {
    stopAllActiveSfx();
    // Already scheduled synthesized tails must not follow a retry into the new fight.
    if (runtime.context && runtime.sfxGain) {
      runtime.sfxGain.disconnect();
      runtime.sfxGain = runtime.context.createGain();
      runtime.sfxGain.gain.value = BUS_GAIN.sfx * runtime.sfxVolumeValue;
      runtime.sfxGain.connect(runtime.masterGain);
    }
    if (musicDuckTimerId) window.clearTimeout(musicDuckTimerId);
    musicDuckTimerId = 0;
    musicDuckFactor = 1;
    applyCurrentMusicLevel();
  }

  function setCombatSoundProfile(profile) {
    stopCombatSfx();
    cachedSfxByKey = {};
    sfxVariantCursor = {};
    SFX_ASSETS = cloneJson(defaultSfxAssets);
    combatSoundProfile = profile ? profile.id : 'original';
    if (profile) {
      Object.keys(profile.assets).forEach(function (key) { SFX_ASSETS[key] = profile.assets[key]; });
      Object.keys(profile.groups).forEach(function (key) { SFX_ASSETS[key] = { variants: profile.groups[key].slice() }; });
    }
    pushDebug('audio:profile', { id: combatSoundProfile });
  }

  function startExternalMusic(key) {
    var asset = MUSIC_ASSETS[key];

    if (!asset || !runtime.enabled || !runtime.unlocked || !G.createMusicPlayer) {
      return false;
    }
    if (!musicPlayer) {
      musicPlayer = G.createMusicPlayer({
        context: getContext,
        parent: function () { return runtime.musicGain; },
        debug: pushDebug,
        changed: function (media) { runtime.currentMusicElement = media; },
        audible: function () { return getBusVolume('music') > 0 && !musicPaused && runtime.enabled; }
      });
    }
    if (currentMusicKey !== key) pushDebug("music:asset:" + key);
    currentMusicKey = key;
    musicPlayer.select(key, asset);
    return true;
  }

  function connectMaybePan(node, parent, panValue) {
    var ctx = getContext();
    var target = parent;

    if (ctx.createStereoPanner && typeof panValue === "number") {
      target = ctx.createStereoPanner();
      target.pan.value = Math.max(-1, Math.min(1, panValue));
      target.connect(parent);
      node.connect(target);
      return;
    }

    node.connect(parent);
  }

  function playTone(startTime, duration, options) {
    var ctx = getContext();
    var opts = options || {};
    var oscillator = null;
    var filter = null;
    var gain = null;
    var parent = null;
    var peak = Math.max(0.0001, opts.volume || 0.08);
    var endTime = startTime + Math.max(0.02, duration);
    var attack = Math.max(0.002, opts.attack || 0.005);
    var decay = Math.max(0.02, opts.decay || duration * 0.75);
    var startFreq = Math.max(30, opts.from || opts.frequency || 440);
    var endFreq = Math.max(30, opts.to || startFreq);

    if (!canPlay()) {
      return;
    }

    parent = opts.bus === "music" ? runtime.musicGain : runtime.sfxGain;
    oscillator = ctx.createOscillator();
    oscillator.type = opts.type || "triangle";
    oscillator.frequency.setValueAtTime(startFreq, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, endTime);

    gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * (opts.sustain || 0.18)), startTime + Math.min(duration * 0.35, attack + decay));
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    if (opts.filterType) {
      filter = ctx.createBiquadFilter();
      filter.type = opts.filterType;
      filter.frequency.setValueAtTime(opts.filterFrequency || 1200, startTime);
      if (opts.filterQ) {
        filter.Q.value = opts.filterQ;
      }
      oscillator.connect(filter);
      filter.connect(gain);
    } else {
      oscillator.connect(gain);
    }

    connectMaybePan(gain, parent, opts.pan);
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.02);
  }

  function playNoise(startTime, duration, options) {
    var ctx = getContext();
    var opts = options || {};
    var source = null;
    var filter = null;
    var gain = null;
    var parent = null;
    var peak = Math.max(0.0001, opts.volume || 0.06);
    var endTime = startTime + Math.max(0.02, duration);

    if (!canPlay() || !runtime.noiseBuffer) {
      return;
    }

    parent = opts.bus === "music" ? runtime.musicGain : runtime.sfxGain;
    source = ctx.createBufferSource();
    source.buffer = runtime.noiseBuffer;

    filter = ctx.createBiquadFilter();
    filter.type = opts.filterType || "bandpass";
    filter.frequency.setValueAtTime(opts.filterFrequency || 900, startTime);
    filter.Q.value = opts.filterQ || 0.8;

    gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + Math.max(0.002, opts.attack || 0.004));
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * (opts.sustain || 0.2)), startTime + Math.max(0.015, duration * 0.35));
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    source.connect(filter);
    filter.connect(gain);
    connectMaybePan(gain, parent, opts.pan);
    source.start(startTime);
    source.stop(endTime + 0.02);
  }

  function playPulseSeries(startTime, count, interval, options) {
    var i = 0;

    for (i = 0; i < count; i += 1) {
      playTone(startTime + i * interval, options.duration || 0.06, {
        type: options.type || "square",
        from: options.from || 240,
        to: options.to || 110,
        volume: (options.volume || 0.05) * (1 - i * 0.12),
        filterType: options.filterType,
        filterFrequency: options.filterFrequency,
        pan: options.pan,
        bus: options.bus
      });
      if (options.withNoise) {
        playNoise(startTime + i * interval, options.duration || 0.05, {
          volume: (options.noiseVolume || 0.03) * (1 - i * 0.12),
          filterType: options.noiseFilterType || "highpass",
          filterFrequency: options.noiseFilterFrequency || 1800,
          pan: options.pan,
          bus: options.bus
        });
      }
    }
  }

  function playKick(startTime, volume, bus) {
    playTone(startTime, 0.18, {
      type: "sine",
      from: 140,
      to: 46,
      volume: volume || 0.08,
      bus: bus || "music"
    });
    playNoise(startTime, 0.05, {
      volume: (volume || 0.08) * 0.14,
      filterType: "highpass",
      filterFrequency: 1400,
      bus: bus || "music"
    });
  }

  function playMetal(startTime, brightness, bus) {
    playNoise(startTime, 0.1, {
      volume: brightness || 0.05,
      filterType: "bandpass",
      filterFrequency: 2200,
      filterQ: 1.4,
      bus: bus || "music"
    });
    playTone(startTime, 0.12, {
      type: "triangle",
      from: 1320,
      to: 740,
      volume: (brightness || 0.05) * 0.5,
      bus: bus || "music"
    });
  }

  function playPluck(startTime, frequency, volume, pan, bus) {
    playTone(startTime, 0.22, {
      type: "triangle",
      from: frequency,
      to: Math.max(60, frequency * 0.72),
      volume: volume || 0.035,
      filterType: "lowpass",
      filterFrequency: 1800,
      pan: pan,
      bus: bus || "music"
    });
    playNoise(startTime, 0.03, {
      volume: (volume || 0.035) * 0.35,
      filterType: "highpass",
      filterFrequency: 2600,
      pan: pan,
      bus: bus || "music"
    });
  }

  function playUiSoft() {
    pushDebug("sfx:ui_soft");
    playExternalSfx("ui_soft");
  }

  function playUiConfirm() {
    pushDebug("sfx:ui_confirm");
    playExternalSfx("ui_confirm");
  }

  function playCardInspect(styleId) {
    var style = styleId || "basic";
    pushDebug("sfx:card_inspect", { style: style });
    playExternalSfx("card_inspect");
  }

  function playMapMove() {
    pushDebug("sfx:map_move");
    // Arrival is already visible. No extra confirmation after the route click.
  }

  function playStylePreview(styleId) {
    pushDebug("sfx:style_" + styleId);
    // Selecting a school is a menu action, not an unseen strike or metal clash.
    playExternalSfx("ui_soft");
  }

  function playPlayerCard(styleId, meta) {
    var now = getContext() ? getContext().currentTime : 0;
    var info = meta || {};
    var assetKey = "player_" + (styleId || "basic");

    pushDebug("sfx:player_" + (styleId || "basic"), {
      damage: info.damage || 0,
      block: info.block || 0
    });
    // The physical contact owns the accent. Keep cloth/arm travel behind it;
    // retain the accepted blade windup and its original media untouched.
    var motionGain = info.attackStyle ? (info.attackStyle==='blade'||info.attackStyle==='bayonet' ? (styleId==='combo'?.42:.82) : info.attackStyle==='heavy' ? .42 : .34) : styleId==='blade'?1:.42;
    if (playExternalSfx(assetKey,0,{gain:motionGain}) || playExternalSfx("player_basic",0,{gain:motionGain})) {
      return;
    }

    if (styleId === "blade") {
      playNoise(now, 0.1, { volume: 0.07, filterType: "highpass", filterFrequency: 3200, pan: -0.2 });
      playTone(now, 0.14, { type: "sawtooth", from: 1320, to: 420, volume: 0.05 });
    } else if (styleId === "iron") {
      playKick(now, 0.07, "sfx");
      playTone(now + 0.02, 0.11, { type: "square", from: 220, to: 110, volume: 0.03 });
      if ((info.block || 0) > 0) {
        playMetal(now + 0.05, 0.03, "sfx");
      }
    } else if (styleId === "dirty") {
      playNoise(now, 0.14, { volume: 0.065, filterType: "bandpass", filterFrequency: 1400, filterQ: 1.2 });
      playTone(now + 0.04, 0.12, { type: "square", from: 280, to: 150, volume: 0.026 });
    } else if (styleId === "combo") {
      playPulseSeries(now, 4, 0.035, { from: 680, to: 380, volume: 0.032, withNoise: true, noiseVolume: 0.013 });
    } else {
      playNoise(now, 0.08, { volume: 0.045, filterType: "highpass", filterFrequency: 2500 });
      playTone(now, 0.09, { type: "triangle", from: 760, to: 420, volume: 0.03 });
    }

    if ((info.damage || 0) > 0) {
      playTone(now + 0.05, 0.1, {
        type: "sine",
        from: 180,
        to: 90,
        volume: 0.022
      });
    }
  }

  function playBlock(broken) {
    var now = getContext() ? getContext().currentTime : 0;

    pushDebug("sfx:block");
    if (broken) pushDebug('sfx:guard_break');
    if (playExternalSfx("block",0,{gain:broken?1.1:.9})) {
      return;
    }
    playMetal(now, 0.042, "sfx");
    playTone(now + 0.01, 0.08, { type: "square", from: 420, to: 260, volume: 0.018 });
  }

  function playerSoundMaterial(state, template) {
    return G.cards.getAttackMaterial(state, template);
  }

  function playPlayerContact(before, after, contact) {
    var info = contact || {}, template = info.cardTemplate || {};
    var style = template.style || after.combat.lastPlayedCardStyle || 'basic';
    if (style === 'basic') style = after.player.chosenStyle || 'basic';
    var key = 'player_contact';
    // Material/weight selection is sound feedback only; it never changes damage.
    // Generic starter strikes inherit the selected school's physical profile;
    // their shared printed name must not turn an unarmed hit into a blade hit.
    var attackStyle=playerSoundMaterial(after,template);
    var blade = attackStyle ? attackStyle==='blade'||attackStyle==='bayonet' : style==='blade';
    if(attackStyle==='powder'&&SFX_ASSETS.player_contact_powder)key='player_contact_powder';
    else if(attackStyle==='needle'&&SFX_ASSETS.player_contact_needle)key='player_contact_needle';
    else if (SFX_ASSETS.player_contact_blade && blade) key = 'player_contact_blade';
    else if (SFX_ASSETS.player_contact_fist) {
      var lastComboHit = style === 'combo' && info.contactCount > 1 && info.contactIndex === info.contactCount - 1;
      var heavy = attackStyle==='heavy' || lastComboHit || template.cost >= 2 || template.damage >= 10;
      key = heavy && SFX_ASSETS.player_contact_heavy ? 'player_contact_heavy' : 'player_contact_fist';
    }
    var lethal = getAliveEnemyCount(before)>getAliveEnemyCount(after);
    var gain = lethal ? 1.12 : info.contactCount>1 && info.contactIndex<info.contactCount-1 ? .82 : 1;
    pushDebug('sfx:player_contact', {cue:key,style:style,material:attackStyle,lethal:lethal,gain:gain});
    if (!playExternalSfx(key,0,{gain:gain})) {
      var now = getContext() ? getContext().currentTime : 0;
      playNoise(now,0.045,{volume:0.026,filterType:'bandpass',filterFrequency:850});
      playTone(now,0.07,{type:'sine',from:150,to:70,volume:0.025});
    }
  }

  function playWound(contact) {
    var now = getContext() ? getContext().currentTime : 0;

    pushDebug("sfx:wound");
    var style=contact&&contact.attackStyle,key='wound';
    // The recorded gunshot owns this contact. A second generic punch sample
    // made firearm damage sound like a fist, especially over the old synth shot.
    if(style==='firearm')return;
    if(style==='blade'||style==='bayonet')key='enemy_contact_blade';
    else if(style==='heavy')key='enemy_contact_heavy';
    else if(style==='fist'||style==='needle')key='enemy_contact_fist';
    if (playExternalSfx(key) || (key!=='wound'&&playExternalSfx('wound'))) {
      return;
    }
    playNoise(now, 0.12, { volume: 0.055, filterType: "bandpass", filterFrequency: 950, filterQ: 0.8 });
    playTone(now, 0.18, { type: "sine", from: 220, to: 70, volume: 0.032 });
  }

  function playKillAccent(atContact) {
    pushDebug("sfx:kill");
    // Keep the accepted physical contact. A fall needs no electronic reward cue.
    if(atContact) duckMusic(190,.82);
  }

  function playReward() {
    var now = getContext() ? getContext().currentTime : 0;

    pushDebug("sfx:reward");
    if (playExternalSfx("card_acquire")) return;
    playTone(now, 0.12, { type: "sine", from: 520, to: 780, volume: 0.04 });
    playTone(now + 0.06, 0.12, { type: "sine", from: 780, to: 1040, volume: 0.04 });
    playTone(now + 0.12, 0.18, { type: "triangle", from: 1040, to: 1180, volume: 0.03 });
  }

  function playRelic(relicId) {
    var now = getContext() ? getContext().currentTime : 0;
    var material = /^(secret_manual|settlement_map|wanted_poster)$/.test(relicId) ? 'paper' :
      /^(blood_bandage|lime_packet|beiyang_boots|cheat_cuff)$/.test(relicId) ? 'cloth' :
      relicId === 'heavy_money_bag' ? 'coin' : 'hard';
    var key = material === 'hard' ? 'result_relic' : 'result_relic_' + material;
    pushDebug("sfx:relic", { id:relicId || null, material:material });
    if (playExternalSfx(key)) return;
    playTone(now, 0.2, { type: "sine", from: 440, to: 660, volume: 0.038 });
    playTone(now + 0.08, 0.18, { type: "sine", from: 660, to: 990, volume: 0.036 });
    playMetal(now + 0.12, 0.025, "sfx");
  }

  function playHeal() {
    var now = getContext() ? getContext().currentTime : 0;

    pushDebug("sfx:heal");
    if (playExternalSfx("result_heal")) return;
    playTone(now, 0.18, { type: "triangle", from: 320, to: 540, volume: 0.035 });
    playTone(now + 0.1, 0.2, { type: "sine", from: 540, to: 820, volume: 0.03 });
    playNoise(now, 0.18, { volume: 0.01, filterType: "highpass", filterFrequency: 4200 });
  }

  function playUpgrade() {
    var now = getContext() ? getContext().currentTime : 0;

    pushDebug("sfx:upgrade");
    if (playExternalSfx("result_upgrade")) return;
    playNoise(now, 0.12, { volume: 0.05, filterType: "highpass", filterFrequency: 3600 });
    playTone(now + 0.04, 0.2, { type: "triangle", from: 560, to: 1120, volume: 0.036 });
  }

  function playShopBuy() {
    var now = getContext() ? getContext().currentTime : 0;

    pushDebug("sfx:shop_buy");
    playExternalSfx("result_purchase");
    if (playExternalSfx("card_acquire")) return;
    playTone(now, 0.08, { type: "square", from: 760, to: 980, volume: 0.03 });
    playTone(now + 0.05, 0.1, { type: "square", from: 980, to: 1320, volume: 0.03 });
  }

  function playShopRemove() {
    var now = getContext() ? getContext().currentTime : 0;

    pushDebug("sfx:shop_remove");
    if (playExternalSfx("result_remove")) return;
    playNoise(now, 0.12, { volume: 0.05, filterType: "bandpass", filterFrequency: 1600, filterQ: 1.2 });
    playTone(now + 0.04, 0.12, { type: "sine", from: 300, to: 180, volume: 0.025 });
  }

  function playNemesisReveal() {
    pushDebug("sfx:nemesis_reveal");
    // The portrait and existing nemesis score carry the reveal, without a synth sting.
  }

  function playVictory(nodeType) {
    // The outcome beat also starts the accepted ink verdict. One acoustic
    // strike; real playback owns result focus and its natural release.
    var cue = nodeType || "street";
    pushDebug("sfx:victory");
    pushDebug("sfx:victory_" + cue);
    playExternalSfx(cue === 'gate' ? 'result_victory_gate' : 'result_victory');
  }

  function playDefeat() {
    pushDebug("sfx:defeat");
    // Let the actual final contact decay; do not append an electronic failure tone.
  }

  function playEnemyMelee(offsetSeconds, attackStyle) {
    var now = getContext() ? getContext().currentTime : 0;
    var start = now + (offsetSeconds || 0);

    pushDebug("sfx:enemy_melee");
    var gain=attackStyle ? (attackStyle==='blade'||attackStyle==='bayonet'?.82:attackStyle==='heavy'?.7:.56) : 1;
    if (playExternalSfx("enemy_melee", (offsetSeconds || 0) * 1000,{gain:gain})) {
      return;
    }
    playNoise(start, 0.09, { volume: 0.055, filterType: "highpass", filterFrequency: 2400, pan: 0.18 });
    playTone(start, 0.11, { type: "triangle", from: 520, to: 180, volume: 0.024, pan: 0.18 });
  }

  function playEnemyBrace(offsetSeconds) {
    pushDebug("sfx:enemy_brace");
    // Preparing guard has no contact. The existing parry is reserved for a hit.
  }

  function playGuard() {
    // Gaining guard is preparation; reserve the metallic clash for absorbed hits.
    pushDebug('sfx:guard');
    playEnemyBrace(0);
  }

  function playGunPrep(stage, step, offsetSeconds) {
    var now = getContext() ? getContext().currentTime : 0;
    var start = now + (offsetSeconds || 0);
    var label = "sfx:gun_prep_" + stage + "_" + step;

    pushDebug(label);
    if (playExternalSfx("gun_prep_" + stage, (offsetSeconds || 0) * 1000)) {
      return;
    }

    if (stage === "revolver") {
      playTone(start, 0.06, { type: "square", from: 780, to: 420, volume: 0.024, pan: 0.22 });
      playNoise(start, 0.04, { volume: 0.018, filterType: "highpass", filterFrequency: 3600, pan: 0.22 });
      return;
    }

    if (stage === "mauser" || stage === "carbine" || stage === "rifle") {
      playNoise(start, 0.08, { volume: 0.03, filterType: "bandpass", filterFrequency: 2400, filterQ: 1.4, pan: 0.26 });
      playTone(start + 0.02, 0.08, { type: "square", from: 520, to: 240, volume: 0.02, pan: 0.26 });
      return;
    }

    playPulseSeries(start, 3, 0.035, {
      from: 220,
      to: 130,
      volume: 0.025,
      withNoise: true,
      noiseVolume: 0.018,
      noiseFilterType: "bandpass",
      noiseFilterFrequency: 900,
      pan: 0.3
    });
  }

  function playGunShot(stage, targetAll, offsetSeconds) {
    var now = getContext() ? getContext().currentTime : 0;
    var start = now + (offsetSeconds || 0);
    var label = "sfx:gunshot_" + stage + (targetAll ? "_all" : "_single");

    pushDebug(label);

    if (playExternalSfx('gunshot_' + stage, (offsetSeconds || 0) * 1000) || playExternalSfx('gunshot_rifle', (offsetSeconds || 0) * 1000)) {
      duckMusic(targetAll ? 320 : 260, targetAll ? 0.58 : 0.65);
      return;
    }
    if (stage === "revolver") {
      playMetal(start, 0.06, "sfx");
      playNoise(start, 0.16, { volume: 0.13, filterType: "highpass", filterFrequency: 3200, pan: 0.3 });
      playTone(start, 0.14, { type: "square", from: 260, to: 76, volume: 0.075, pan: 0.28 });
      playTone(start, 0.18, { type: "sine", from: 128, to: 48, volume: 0.045, pan: 0.18 });
      playNoise(start + 0.04, 0.22, { volume: 0.04, filterType: "bandpass", filterFrequency: 760, filterQ: 0.5, pan: 0.18 });
      duckMusic(240, targetAll ? 0.6 : 0.65);
      return;
    }

    if (stage === "mauser" || stage === "carbine" || stage === "rifle") {
      playMetal(start, 0.065, "sfx");
      playNoise(start, 0.18, { volume: 0.14, filterType: "highpass", filterFrequency: 3400, pan: 0.32 });
      playTone(start, 0.12, { type: "square", from: 320, to: 84, volume: 0.082, pan: 0.3 });
      playTone(start, 0.16, { type: "triangle", from: 154, to: 58, volume: 0.038, pan: 0.18 });
      playNoise(start + 0.035, 0.2, { volume: 0.045, filterType: "bandpass", filterFrequency: 980, filterQ: 0.6, pan: 0.24 });
      duckMusic(250, targetAll ? 0.58 : 0.63);
      return;
    }

    playPulseSeries(start, targetAll ? 4 : 3, 0.05, {
      from: 260,
      to: 95,
      volume: 0.058,
      withNoise: true,
      noiseVolume: 0.068,
      noiseFilterType: "highpass",
      noiseFilterFrequency: 2500,
      pan: 0.34
    });
    playTone(start, 0.24, { type: "sine", from: 142, to: 44, volume: 0.05, pan: 0.12 });
    playNoise(start, 0.32, { volume: 0.05, filterType: "bandpass", filterFrequency: 520, filterQ: 0.4, pan: 0.18 });
    duckMusic(targetAll ? 320 : 260, targetAll ? 0.55 : 0.6);
  }

  function playMusicTitle(startTime, step) {
    if (step === 0) {
      playTone(startTime, 0.45, { type: "sine", from: 130, to: 110, volume: 0.024, bus: "music" });
      playPluck(startTime + 0.08, 330, 0.028, -0.25, "music");
    } else if (step === 2) {
      playPluck(startTime, 392, 0.028, 0.18, "music");
    } else if (step === 4) {
      playTone(startTime, 0.32, { type: "triangle", from: 260, to: 196, volume: 0.018, bus: "music" });
      playMetal(startTime + 0.1, 0.012, "music");
    } else if (step === 6) {
      playPluck(startTime, 294, 0.026, -0.12, "music");
    }
  }

  function playMusicMap(startTime, step) {
    if (step % 2 === 0) {
      playKick(startTime, 0.045, "music");
    }

    if (step === 1 || step === 5) {
      playPluck(startTime + 0.02, 294, 0.022, -0.18, "music");
    }

    if (step === 3 || step === 7) {
      playPluck(startTime + 0.02, 392, 0.022, 0.18, "music");
    }
  }

  function playMusicCombat(startTime, step) {
    playKick(startTime, step % 2 === 0 ? 0.065 : 0.05, "music");

    if (step % 2 === 1) {
      playMetal(startTime + 0.02, 0.028, "music");
    }

    if (step === 2 || step === 6) {
      playTone(startTime + 0.04, 0.16, { type: "triangle", from: 220, to: 170, volume: 0.018, bus: "music" });
    }
  }

  function playMusicNemesis(startTime, step) {
    playMusicCombat(startTime, step);

    if (step === 0 || step === 4) {
      playNoise(startTime, 0.2, { volume: 0.014, filterType: "bandpass", filterFrequency: 620, filterQ: 0.55, bus: "music" });
    }

    if (step === 3 || step === 7) {
      playTone(startTime, 0.22, { type: "sawtooth", from: 180, to: 120, volume: 0.012, bus: "music" });
    }
  }

  function playMusicRest(startTime, step) {
    playNoise(startTime, 0.42, {
      volume: 0.008,
      filterType: "highpass",
      filterFrequency: 4800,
      bus: "music"
    });

    if (step === 0 || step === 3 || step === 6) {
      playPluck(startTime + 0.04, step === 6 ? 262 : 330, 0.02, step === 3 ? 0.16 : -0.16, "music");
    }

    if (step === 4) {
      playTone(startTime, 0.28, { type: "sine", from: 196, to: 156, volume: 0.012, bus: "music" });
    }
  }

  function playMusicReward(startTime, step) {
    if (step === 0) {
      playPluck(startTime, 392, 0.022, -0.14, "music");
    } else if (step === 2) {
      playPluck(startTime, 494, 0.024, 0.14, "music");
    } else if (step === 4) {
      playTone(startTime, 0.24, { type: "sine", from: 330, to: 440, volume: 0.013, bus: "music" });
    } else if (step === 6) {
      playPluck(startTime, 524, 0.022, 0, "music");
    }
  }

  function playMusicShop(startTime, step) {
    if (step === 0 || step === 4) {
      playKick(startTime, 0.032, "music");
    }

    if (step === 1 || step === 5) {
      playPluck(startTime + 0.03, 262, 0.02, -0.1, "music");
    }

    if (step === 3 || step === 7) {
      playPluck(startTime + 0.02, 349, 0.02, 0.12, "music");
    }
  }

  var musicPresets = {
    title: { length: 8, intervalMs: 720, play: playMusicTitle },
    map: { length: 8, intervalMs: 480, play: playMusicMap },
    combat: { length: 8, intervalMs: 340, play: playMusicCombat },
    nemesis: { length: 8, intervalMs: 340, play: playMusicNemesis },
    rest: { length: 8, intervalMs: 840, play: playMusicRest },
    reward: { length: 8, intervalMs: 620, play: playMusicReward },
    shop: { length: 8, intervalMs: 560, play: playMusicShop }
  };

  function startMusic(key) {
    var preset = musicPresets[key] || musicPresets.map;
    var ctx = null;

    if (!runtime.enabled || !runtime.unlocked) {
      return;
    }

    if (currentMusicKey === key && (musicIntervalId || runtime.currentMusicElement)) {
      return;
    }

    if (startExternalMusic(key)) {
      return;
    }

    ctx = getContext();
    if (!ctx) {
      return;
    }

    stopMusic();
    currentMusicKey = key;
    musicStep = 0;
    pushDebug("music:" + key);

    function tick() {
      var now = ctx.currentTime + 0.05;
      preset.play(now, musicStep);
      musicStep = (musicStep + 1) % preset.length;
    }

    tick();
    musicIntervalId = window.setInterval(tick, preset.intervalMs);
  }

  function ensureMusic() {
    if (!runtime.enabled || !runtime.unlocked || musicPaused || getBusVolume('music') <= 0) {
      stopMusic();
      return;
    }

    if (!desiredMusicKey) {
      stopMusic();
      return;
    }

    startMusic(desiredMusicKey);
  }

  function resumeContext() {
    var ctx = getContext();

    if (!ctx) {
      return Promise.resolve(false);
    }

    runtime.unlocked = true;
    if (ctx.state === "suspended") {
      return ctx.resume().then(function () {
        pushDebug("audio:resume", { state: ctx.state });
        ensureMusic();
        ensureAmbience();
        return true;
      });
    }

    ensureMusic();
    ensureAmbience();
    return Promise.resolve(true);
  }

  function setDesiredMusicKey(key) {
    desiredMusicKey = key || null;
    ensureMusic();
  }

  function getSceneMusicKey(state) {
    if (!state || !state.scene) {
      return "title";
    }

    if (state.scene === "combat") {
      return state.combat && state.combat.nodeType === "nemesis" ? "nemesis" : "combat";
    }

    if (state.scene === "nemesis") {
      return "nemesis";
    }

    if (state.scene === "rest") {
      return "rest";
    }

    if (state.scene === "reward") {
      return "reward";
    }

    if (state.scene === "shop") {
      return "shop";
    }

    if (state.scene === "map" || state.scene === "event") {
      return "map";
    }

    return "title";
  }

  function getTotalEnemyHp(state) {
    var enemies = state && state.combat && Array.isArray(state.combat.enemies) ? state.combat.enemies : [];
    return enemies.reduce(function (sum, enemy) {
      return sum + Math.max(0, Number(enemy.hp) || 0);
    }, 0);
  }

  function getAliveEnemyCount(state) {
    var enemies = state && state.combat && Array.isArray(state.combat.enemies) ? state.combat.enemies : [];
    return enemies.filter(function (enemy) {
      return enemy && enemy.hp > 0;
    }).length;
  }

  function sameDeckSignature(left, right) {
    var a = left && left.player && Array.isArray(left.player.masterDeckNames) ? left.player.masterDeckNames.join("|") : "";
    var b = right && right.player && Array.isArray(right.player.masterDeckNames) ? right.player.masterDeckNames.join("|") : "";
    return a === b;
  }

  function playEnemyTurnFromPreviousState(previousState) {
    var enemies = previousState && previousState.combat && Array.isArray(previousState.combat.enemies) ? previousState.combat.enemies : [];

    enemies.forEach(function (enemy, index) {
      var data = Object.assign({}, enemy.intentData || {});
      var offset = index * 0.09;

      if (enemy.hp <= 0) {
        return;
      }

      if (data.block) {
        playEnemyBrace(offset);
      }

      if (data.firearmPrep || (data.noteOnly && data.firearm)) {
        playGunPrep(data.firearmStage || "revolver", data.firearmStep || 0, offset + 0.02);
      }

      if (data.damage) {
        if (data.firearm) {
          playGunShot(data.firearmStage || "revolver", data.target === "all", offset + 0.04);
        } else {
          playEnemyMelee(offset + 0.04);
        }
      }
    });
  }

  function syncTitle(previousState, nextState) {
    var previousStyle = previousState && previousState.title ? previousState.title.selectedStyle : null;
    var nextStyle = nextState && nextState.title ? nextState.title.selectedStyle : null;

    if (previousStyle !== nextStyle && nextStyle) {
      playStylePreview(nextStyle);
    } else if ((previousState.title && previousState.title.mode) !== (nextState.title && nextState.title.mode)) {
      if (nextState.title.mode === "styles") playUiConfirm();
      else playUiSoft();
    }
  }

  function syncMap(previousState, nextState) {
    var previousMap = previousState && previousState.map ? previousState.map : null;
    var nextMap = nextState && nextState.map ? nextState.map : null;

    if (!previousMap || !nextMap) {
      return;
    }

    if (previousMap.currentNodeId !== nextMap.currentNodeId && nextMap.currentNodeId) {
      if(!G.render.sceneEntry?.queueCue('arrival',playMapMove))playMapMove();
    }

    if (previousMap.nemesisNodeId !== nextMap.nemesisNodeId && nextMap.nemesisNodeId) {
      playNemesisReveal();
    }
  }

  function syncCombat(previousState, nextState) {
    if (G.scenes.combat.feedback && G.scenes.combat.feedback.ownsAudio(nextState)) return;
    var prevCombat = previousState && previousState.combat ? previousState.combat : {};
    var nextCombat = nextState && nextState.combat ? nextState.combat : {};
    var enemyHpDelta = getTotalEnemyHp(previousState) - getTotalEnemyHp(nextState);
    var blockDelta = (nextState.player.block || 0) - (previousState.player.block || 0);
    var aliveDelta = getAliveEnemyCount(previousState) - getAliveEnemyCount(nextState);
    var cardPlayed = nextCombat.lastPlayedCardId && nextCombat.lastPlayedCardId !== prevCombat.lastPlayedCardId;
    var inspectOpened = prevCombat.inspectCardId !== nextCombat.inspectCardId && !!nextCombat.inspectCardId;
    var inspectedCard = null;

    if (inspectOpened && Array.isArray(nextCombat.hand)) {
      inspectedCard = nextCombat.hand.find(function (card) {
        return card.id === nextCombat.inspectCardId;
      }) || null;
    }

    if (inspectOpened && inspectedCard?.playable !== false) {
      playCardInspect(inspectedCard && inspectedCard.style ? inspectedCard.style : "basic");
    } else if (prevCombat.selectedCardId !== nextCombat.selectedCardId && nextCombat.selectedCardId) {
      playUiSoft();
    }
    if(prevCombat.selectedCardId&&!nextCombat.selectedCardId&&!cardPlayed&&!inspectOpened)G.audio.playUiCue('return');

    if (prevCombat.ui && prevCombat.ui.overlay && nextCombat.ui && nextCombat.ui.overlay &&
      prevCombat.ui.overlay.title !== nextCombat.ui.overlay.title) {
      playUiSoft();
    } else if ((!prevCombat.ui || !prevCombat.ui.overlay) && nextCombat.ui && nextCombat.ui.overlay) {
      playUiSoft();
    }

    if (cardPlayed) {
      playPlayerCard(nextCombat.lastPlayedCardStyle || "basic", {
        damage: enemyHpDelta,
        block: Math.max(0, blockDelta)
      });
    } else if (blockDelta > 0 && nextCombat.turn === prevCombat.turn) {
      playBlock();
    }

    if (aliveDelta > 0) {
      playKillAccent();
    }

    if ((previousState.player.hp || 0) > (nextState.player.hp || 0)) {
      playWound();
    }

    if ((nextCombat.turn || 0) > (prevCombat.turn || 0) && previousState.scene === "combat") {
      playEnemyTurnFromPreviousState(previousState);
    }

    if (prevCombat.result !== "victory" && nextCombat.result === "victory") {
      playVictory(nextCombat.nodeType || "street");
    }

    if (prevCombat.result !== "defeat" && nextCombat.result === "defeat") {
      playDefeat();
    }
  }

  function syncReward(previousState, nextState) {
    if (previousState.scene !== "reward") return;
    if ((nextState.player.relics || []).length > (previousState.player.relics || []).length) {
      playRelic(nextState.player.relics.find(function(id) { return previousState.player.relics.indexOf(id) < 0; }));
    } else if ((nextState.player.deckSize || 0) > (previousState.player.deckSize || 0)) {
      playReward();
    } else if (nextState.scene === "map") {
      playUiSoft();
    }
  }

  function syncRest(previousState, nextState) {
    if (previousState.scene === "rest") {
      if ((nextState.player.hp || 0) > (previousState.player.hp || 0)) {
        playHeal();
      } else if (!sameDeckSignature(previousState, nextState)) {
        playUpgrade();
      }
    }
  }

  function syncShop(previousState, nextState) {
    if (previousState.scene !== "shop") {
      return;
    }

    if (nextState.scene === "shop") {
      if ((nextState.player.relics || []).length > (previousState.player.relics || []).length) {
        var relicId = nextState.player.relics.find(function(id) { return previousState.player.relics.indexOf(id) < 0; });
        if (nextState.player.gold < previousState.player.gold && relicId !== 'heavy_money_bag') playExternalSfx('result_purchase',0,{gain:.72});
        playRelic(relicId);
      } else if ((nextState.player.removeServiceCount || 0) > (previousState.player.removeServiceCount || 0) ||
        (nextState.player.deckSize || 0) < (previousState.player.deckSize || 0)) {
        playShopRemove();
      } else if ((nextState.player.deckSize || 0) > (previousState.player.deckSize || 0) &&
        (nextState.player.gold || 0) < (previousState.player.gold || 0)) {
        playShopBuy();
      }
      return;
    }

    if (nextState.scene === "map") {
      playUiConfirm();
    }
  }

  function syncSceneTransition(previousState, nextState) {
    if (!previousState || previousState.scene === nextState.scene) {
      return;
    }
    if(G.render.sceneEntry?.ownsTransition(previousState,nextState))return;

    if (nextState.scene === "combat" && previousState.scene !== "combat") {
      playUiConfirm();
    } else if (nextState.scene === "nemesis") {
      playNemesisReveal();
    } else if (nextState.scene === "shop" || nextState.scene === "rest" || nextState.scene === "reward") {
      playUiConfirm();
    }
  }

  function syncState(previousState, nextState, options) {
    setDesiredMusicKey(getSceneMusicKey(nextState));
    syncAmbience(nextState);

    // Restoring an already committed receipt sets music but never awards a cue.
    if (!previousState || !nextState || options && options.rebase) {
      return;
    }

    syncSceneTransition(previousState, nextState);

    if (nextState.scene === "title") {
      syncTitle(previousState, nextState);
    }

    if (nextState.scene === "map" || previousState.scene === "map") {
      syncMap(previousState, nextState);
    }

    if (!(options && options.rebase) && (nextState.scene === "combat" || previousState.scene === "combat")) {
      syncCombat(previousState, nextState);
    }

    syncReward(previousState, nextState);
    syncRest(previousState, nextState);
    syncShop(previousState, nextState);
  }

  function getDebugState() {
    var ctx = runtime.context;

    return {
      available: runtime.available,
      enabled: runtime.enabled,
      unlocked: runtime.unlocked,
      masterVolume: runtime.masterVolumeValue,
      musicVolume: runtime.musicVolumeValue,
      sfxVolume: runtime.sfxVolumeValue,
      musicBusGain: runtime.musicGain ? runtime.musicGain.gain.value : null,
      sfxBusGain: runtime.sfxGain ? runtime.sfxGain.gain.value : null,
      musicMediaVolume: runtime.currentMusicElement ? runtime.currentMusicElement.volume : null,
      musicTargetGain: BUS_GAIN.music * runtime.musicVolumeValue * musicDuckFactor,
      musicPlayback: musicPlayer ? musicPlayer.debug() : null,
      activeSfxVolumes: Object.keys(activeSfxByKey).map(function(key){return {key:key,volume:activeSfxByKey[key].volume,cue:activeSfxMix[key].cue,priority:activeSfxMix[key].priority};}),
      pendingSfxTimers: pendingSfxTimers.size,
      preloadedSfx: Object.keys(cachedSfxByKey).map(function(key){return {key:key,readyState:cachedSfxByKey[key].readyState};}),
      desiredMusicKey: desiredMusicKey,
      currentMusicKey: currentMusicKey,
      musicMode: runtime.currentMusicElement ? "asset" : (musicIntervalId ? "procedural" : "idle"),
      activeSfxCount: Object.keys(activeSfxByKey).length,
      resultFocus: { active:resultFocused, musicFactor:resultMusicFactor, ambienceFactor:resultAmbienceFactor, uiFactor:resultUiFactor },
      ambience: { desired:cloneJson(ambienceDesired), fadeTimer:!!ambienceTimer,
        voices:ambienceVoices.map(function(v) { return { key:v.key, src:v.audio.src, volume:v.audio.volume, level:v.level, target:v.target, ready:v.ready, paused:v.audio.paused }; }) },
      combatSoundProfile: combatSoundProfile,
      activeSfxKeys: Object.keys(activeSfxByKey),
      contextState: ctx ? ctx.state : "unavailable",
      debugCounts: cloneJson(runtime.debugCounts),
      history: cloneJson(runtime.debugHistory.slice(-20))
    };
  }

  G.audio = {
    playSceneArrival: function(scene) {
      // The place fade carries arrival; avoid a universal confirmation clack.
      pushDebug('sfx:scene_arrival', { scene:scene });
    },
    playUiCue: function (cue) {
      var material = {press:'ui_press',target:'ui_target',draw:'card_draw',discard:'card_discard',turn:'turn_confirm'}[cue];
      if(material){pushDebug('sfx:'+material);playExternalSfx(material);}
      else if (cue === "confirm") playUiConfirm();
      else if (cue === "open") playCardInspect("basic");
      else if (cue === "return" || cue === "cancel") { pushDebug('sfx:ui_return');playExternalSfx('ui_return'); }
      else if (cue === "reject") { pushDebug('sfx:ui_reject');playExternalSfx('ui_reject'); }
      else playUiSoft();
    },
    preloadCombatSfx: function () { Object.keys(SFX_ASSETS).filter(function(key){return !!SFX_ASSETS[key].src;}).forEach(getCachedSfx); },
    setCombatSoundProfile: setCombatSoundProfile,
    stopCombatSfx: stopCombatSfx,
    previewCombatCue: function (cue) {
      if (cue === 'swing') playPlayerCard('blade', {});
      else if (cue === 'contact') playExternalSfx('player_contact') || playWound();
      else if (cue === 'parry') playBlock();
      else if (cue === 'prep') playGunPrep('rifle', 0);
      else if (cue === 'shot') playGunShot('rifle', false);
    },
    // The realistic review dispatches these at the same timeline beats as its visuals.
    playCombatBeat: function (type, before, after, enemy) {
      var hpLoss = (before.player.hp || 0) - (after.player.hp || 0);
      var blockSpent = (before.player.block || 0) - (after.player.block || 0);
      var data = enemy && enemy.intentData || {};
      var outcome = function(){
        if (before.combat.result !== 'victory' && after.combat.result === 'victory') playVictory(after.combat.nodeType || 'street');
        if (before.combat.result !== 'defeat' && after.combat.result === 'defeat') playDefeat();
      };
      if(type==='outcome'){outcome();return;}
      if(type==='discard'&&before.combat.hand.length)G.audio.playUiCue('discard');
      if(type==='turn_start'||type==='player_hit'){
        var oldHand=new Set(before.combat.hand.map(function(c){return c.id;}));
        if(after.combat.hand.some(function(c){return !oldHand.has(c.id);}))G.audio.playUiCue('draw');
      }
      if (type === 'enemy_windup') {
        if (!data.damage && (data.firearmPrep || data.firearm || data.gunPose)) playGunPrep(data.firearmStage || 'rifle',data.firearmStep || 0);
        else if (data.damage && !data.firearm) playEnemyMelee(0,G.render.combatVfx?.profile(before,enemy.id));
        else if (data.block) playEnemyBrace();
        return;
      }
      if (type === 'player_windup') {
        var template=enemy&&enemy.cardTemplate;
        var attacking=template ? !!(template.damage||template.damagePerFlaw||template.damagePerCombo||template.damagePerBlock||template.hits||template.trueDamage) : getTotalEnemyHp(before)!==getTotalEnemyHp(after)||before.combat.enemies.some(function(e,i){return e.block>(after.combat.enemies[i]?.block||0);});
        var style=template?.style||after.combat.lastPlayedCardStyle||'basic';
        if(style==='basic')style=after.player.chosenStyle||'basic';
        var material=playerSoundMaterial(after,template);
        // Powder release and dart contact have their own cue at the actual
        // effect beat, including status-only actions. No sword sweep for them.
        if(material==='powder'||material==='needle')return;
        if (attacking) playPlayerCard(style,{attackStyle:material});
        else playUiSoft();
        return;
      }
      if (type === 'enemy_hit' && data.damage && data.firearm) playGunShot(data.firearmStage || 'rifle',data.target === 'all');
      if (type !== 'turn_start' && blockSpent > 0) playBlock((after.player.block||0)===0&&hpLoss>0);
      if (type !== 'turn_start' && type !== 'discard' && hpLoss > 0) {
        var attackStyle=type==='enemy_hit'&&G.render.combatVfx ? G.render.combatVfx.profile(before,enemy.id) : '';
        playWound({attackStyle:attackStyle});
      }
      if (type === 'player_hit' && (after.player.block || 0) > (before.player.block || 0)) playGuard();
      if (type === 'player_hit') {
        var enemyBlockBefore=before.combat.enemies.reduce(function(n,e){return n+(e.block||0);},0);
        var enemyBlockAfter=after.combat.enemies.reduce(function(n,e){return n+(e.block||0);},0);
        if (enemyBlockBefore>enemyBlockAfter) playBlock(enemyBlockAfter===0&&getTotalEnemyHp(before)>getTotalEnemyHp(after));
        var material=playerSoundMaterial(after,enemy&&enemy.cardTemplate);
        if (getTotalEnemyHp(before)>getTotalEnemyHp(after)||(material==='powder'&&enemy?.cardTemplate)) {
          playPlayerContact(before,after,enemy);
        }
      }
      if(type==='enemy_status'&&getTotalEnemyHp(before)>getTotalEnemyHp(after))playExternalSfx('status_fester',0,{gain:.35});
      if (getAliveEnemyCount(before) > getAliveEnemyCount(after)) playKillAccent(true);
      if (!enemy?.deferOutcome) outcome();
    },
    handleUserGesture: function () {
      return resumeContext();
    },
    setEnabled: function (enabled) {
      runtime.enabled = !!enabled;
      pushDebug("audio:enabled", { value: runtime.enabled });
      if (!runtime.enabled) {
        stopAllActiveSfx();
      }
      ensureMusic();
      ensureAmbience();
    },
    setPaused: function (paused) {
      musicPaused = !!paused;
      if (musicPaused) stopCombatSfx();
      ensureMusic();
      ensureAmbience();
    },
    applySettings: function (settings) {
      var volume = Number(settings && settings.volume);
      var currentAsset = currentMusicKey ? MUSIC_ASSETS[currentMusicKey] : null;

      if (!isFinite(volume)) {
        return getDebugState();
      }

      runtime.masterVolumeValue = Math.max(0, Math.min(1, volume));
      function channelVolume(key) {
        var value = settings && settings[key] !== null ? Number(settings[key]) : NaN;
        return Math.max(0, Math.min(1, isFinite(value) ? value : 1));
      }
      runtime.musicVolumeValue = channelVolume('musicVolume');
      runtime.sfxVolumeValue = channelVolume('sfxVolume');
      if (runtime.masterGain) {
        runtime.masterGain.gain.value = runtime.masterVolumeValue;
      }
      applyCurrentMusicLevel();
      ensureMusic();
      if (runtime.sfxGain) runtime.sfxGain.gain.value = BUS_GAIN.sfx * runtime.sfxVolumeValue;
      Object.keys(activeSfxByKey).forEach(function(key){applyMediaVolume(activeSfxByKey[key],'sfx',SFX_ASSETS[key].volume*activeSfxMix[key].gain);});
      if (getBusVolume('sfx') <= 0) stopAllActiveSfx();
      ambienceVoices.forEach(ambienceLevel);
      ensureAmbience();
      pushDebug("audio:volume", { value: runtime.masterVolumeValue });
      return getDebugState();
    },
    syncState: syncState,
    getDebugState: getDebugState,
    sampleMusicSignal: function () {
      if (!runtime.musicAnalyser) return { peak: 0, rms: 0 };
      var data = new Float32Array(runtime.musicAnalyser.fftSize), peak = 0, power = 0;
      runtime.musicAnalyser.getFloatTimeDomainData(data);
      for (var i = 0; i < data.length; i++) { peak = Math.max(peak, Math.abs(data[i])); power += data[i] * data[i]; }
      return { peak: peak, rms: Math.sqrt(power / data.length) };
    },
    debugUnlock: function () {
      runtime.unlocked = true;
      var ctx = getContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      ensureMusic();
      ensureAmbience();
      pushDebug("audio:debug_unlock");
      return getDebugState();
    }
  };
  if (G.adoptedCombatSounds) setCombatSoundProfile(G.adoptedCombatSounds);
})();

