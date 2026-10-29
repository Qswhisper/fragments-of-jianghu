window.G = window.G || {};
G.storage = G.storage || {};

(function () {
  var STORAGE_KEYS = {
    run: "kgame.run.v1",
    nemesis: "kgame.nemesis.v1",
    settings: "kgame.settings.v1",
    chronicle: "kgame.chronicle.v1"
  };
  // Standalone review entries opt into their own saves before loading runtime scripts.
  if (window.KGAME_STORAGE_NAMESPACE) {
    Object.keys(STORAGE_KEYS).forEach(function (key) {
      STORAGE_KEYS[key] = String(window.KGAME_STORAGE_NAMESPACE) + '.' + STORAGE_KEYS[key];
    });
  }
  var DEFAULT_SETTINGS = {
    volume: 0.7,
    musicVolume: 1,
    sfxVolume: 1,
    quality: "high"
  };
  var QUALITY_VALUES = {
    high: true,
    low: true
  };
  var lastError = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getStore() {
    try {
      return window.localStorage;
    } catch (error) {
      lastError = error.message;
      return null;
    }
  }

  function readJson(key) {
    var store = getStore();
    var raw = null;

    if (!store) {
      return null;
    }

    try {
      raw = store.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      lastError = error.message;
      return null;
    }
  }

  function writeJson(key, value) {
    var store = getStore();

    if (!store) {
      return false;
    }

    try {
      store.setItem(key, JSON.stringify(value));
      lastError = null;
      return true;
    } catch (error) {
      lastError = error.message;
      return false;
    }
  }

  function removeKey(key) {
    var store = getStore();

    if (!store) {
      return false;
    }

    try {
      store.removeItem(key);
      lastError = null;
      return true;
    } catch (error) {
      lastError = error.message;
      return false;
    }
  }

  function normalizeSettings(settings) {
    var nextSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    var volume = Number(nextSettings.volume);

    if (!isFinite(volume)) {
      volume = DEFAULT_SETTINGS.volume;
    }

    nextSettings.volume = Math.max(0, Math.min(1, volume));
    ["musicVolume", "sfxVolume"].forEach(function (key) {
      var value = nextSettings[key] === null ? NaN : Number(nextSettings[key]);
      nextSettings[key] = Math.max(0, Math.min(1, isFinite(value) ? value : DEFAULT_SETTINGS[key]));
    });
    if (!QUALITY_VALUES[nextSettings.quality]) {
      nextSettings.quality = DEFAULT_SETTINGS.quality;
    }

    return nextSettings;
  }

  function normalizeNemesis(nemesis) {
    return {
      pool: nemesis && Array.isArray(nemesis.pool) ? clone(nemesis.pool) : [],
      closedCases: nemesis && Array.isArray(nemesis.closedCases) ? clone(nemesis.closedCases) : [],
      nextId: Math.max(1, Number(nemesis && nemesis.nextId) || 1)
    };
  }

  function buildRunSummary(record) {
    var state = record && record.state ? record.state : null;
    var actNumber = 1;

    if (!state) {
      return null;
    }

    if (state.map && typeof state.map.actNumber === "number") {
      actNumber = state.map.actNumber;
    } else if (state.combat && typeof state.combat.actNumber === "number") {
      actNumber = state.combat.actNumber;
    }

    return {
      savedAt: record.savedAt || null,
      scene: state.scene || "title",
      actNumber: actNumber,
      actTitle: state.map && state.map.actTitle ? state.map.actTitle : null,
      chosenStyle: state.player && state.player.chosenStyle ? state.player.chosenStyle : null,
      hp: state.player && typeof state.player.hp === "number" ? state.player.hp : null,
      maxHp: state.player && typeof state.player.maxHp === "number" ? state.player.maxHp : null,
      gold: state.player && typeof state.player.gold === "number" ? state.player.gold : null,
      deckSize: state.player && typeof state.player.deckSize === "number" ? state.player.deckSize : null,
      currentNodeId: state.map && state.map.currentNodeId ? state.map.currentNodeId : null,
      completed: !!(state.map && state.map.completed),
      combatResult: state.combat && state.combat.result ? state.combat.result : null
    };
  }

  function loadSettings() {
    return normalizeSettings(readJson(STORAGE_KEYS.settings));
  }

  function saveSettings(settings) {
    var safeSettings = normalizeSettings(settings);

    writeJson(STORAGE_KEYS.settings, safeSettings);
    return safeSettings;
  }

  function clearSettings() {
    removeKey(STORAGE_KEYS.settings);
  }

  function loadPersistentNemesis() {
    return normalizeNemesis(readJson(STORAGE_KEYS.nemesis));
  }

  function savePersistentNemesis(nemesis) {
    var safeNemesis = normalizeNemesis(nemesis);

    writeJson(STORAGE_KEYS.nemesis, safeNemesis);
    return safeNemesis;
  }

  function clearPersistentNemesis() {
    removeKey(STORAGE_KEYS.nemesis);
  }

  function loadRunRecord() {
    var record = readJson(STORAGE_KEYS.run);

    if (!record || typeof record !== "object" || !record.state) {
      return null;
    }

    return {
      savedAt: record.savedAt || null,
      state: clone(record.state)
    };
  }

  // .31 balances these existing techniques. Refresh their cached definitions,
  // not the player's deck, battle progress or a pending transaction's identity.
  function refreshBalancedCards(state) {
    var changed = {blade_sacrifice:true,blade_double_edge:true,blade_break_wrist:true,
      dirty_low_kick:true,dirty_boot_heart:true,iron_rebound_arm:true,combo_close_step:true};
    function refresh(card) {
      if (!card || !changed[card.id]) return card;
      var current = G.cards.getCardByName(card.name);
      if (!current) return card;
      var next = Object.assign({}, card, current);
      if (current.id === 'dirty_boot_heart') delete next.blind;
      return next;
    }
    var combat = state.combat;
    if (combat && combat.cardLibrary) {
      Object.keys(combat.cardLibrary).forEach(function(name) {
        combat.cardLibrary[name] = refresh(combat.cardLibrary[name]);
      });
      (combat.hand || []).forEach(function(card) {
        var template = combat.cardLibrary[card.name];
        if (!template || !changed[template.id]) return;
        card.baseCost = template.cost;
        if (template.id === 'dirty_boot_heart') delete card.blind;
      });
      state = G.deck.refreshHandPlayability(state);
    }
    if (state.reward) ['options','cardOptions','randomCardOptions'].forEach(function(key) {
      if (state.reward[key]) state.reward[key] = state.reward[key].map(refresh);
    });
    if (state.shop && state.shop.cardOffers) state.shop.cardOffers = state.shop.cardOffers.map(refresh);
    return state;
  }

  function loadRun() {
    var record = loadRunRecord();
    // Settings belong to the player, not to an older campaign snapshot.
    if (record) {
      record.state.settings = loadSettings();
      // playtest.2 cached this upgraded definition inside ongoing combats.
      // Update only that obsolete card; retain piles, IDs, RNG and turn state.
      var combat = record.state.combat;
      // Rename only the two obsolete labels; keep IDs, numbers, piles and RNG.
      var aliases = {"疾雨三刀":"疾雨连刀", "疾雨三刀+":"疾雨连刀+"};
      var renamed = function(name) { return aliases[name] || name; };
      var renameCard = function(card) {
        if (!card || typeof card !== "object") return;
        ["name", "baseName", "deckName", "nameUpgraded"].forEach(function(key) { if (typeof card[key] === "string") card[key] = renamed(card[key]); });
        if (card.sourceCard) renameCard(card.sourceCard);
      };
      if (record.state.player && record.state.player.masterDeckNames) record.state.player.masterDeckNames = record.state.player.masterDeckNames.map(renamed);
      if (combat) {
        ["drawPileNames", "discardPileNames", "exhaustPileNames"].forEach(function(key) { if (combat[key]) combat[key] = combat[key].map(renamed); });
        (combat.hand || []).forEach(renameCard);
        if (combat.cardLibrary) Object.keys(combat.cardLibrary).forEach(function(key) { renameCard(combat.cardLibrary[key]); if (aliases[key]) { combat.cardLibrary[aliases[key]] = combat.cardLibrary[key]; delete combat.cardLibrary[key]; } });
      }
      ["reward", "shop"].forEach(function(scene) { (record.state[scene] && record.state[scene].options || []).forEach(renameCard); });
      var oldCard = combat && combat.cardLibrary && combat.cardLibrary["撒石灰+"];
      if (oldCard && oldCard.id === "dirty_lime_throw" && oldCard.cost === 1 && oldCard.blind === 3) {
        var currentCard = G.cards.getCardByName("撒石灰+");
        combat.cardLibrary["撒石灰+"] = currentCard;
        (combat.hand || []).forEach(function (card) {
          if (card.name === "撒石灰+") card.baseCost = currentCard.cost;
        });
        record.state = G.deck.refreshHandPlayability(record.state);
      }
      record.state = refreshBalancedCards(record.state);
    }
    return record ? record.state : null;
  }

  function saveRun(state) {
    var record = {
      savedAt: new Date().toISOString(),
      state: clone(state || {})
    };

    writeJson(STORAGE_KEYS.run, record);
    return record;
  }

  function clearRun() {
    removeKey(STORAGE_KEYS.run);
  }

  function hasRunSave() {
    return !!loadRunRecord();
  }

  function clearAll() {
    clearRun();
    clearPersistentNemesis();
    clearSettings();
    removeKey(STORAGE_KEYS.chronicle);
  }

  function loadChronicle() {
    return G.journeyNarrative ? G.journeyNarrative.normalize(readJson(STORAGE_KEYS.chronicle)) : null;
  }

  function saveChronicle(value) {
    if (G.journeyNarrative) writeJson(STORAGE_KEYS.chronicle, G.journeyNarrative.normalize(value));
  }

  function getDebugSnapshot() {
    var runRecord = loadRunRecord();
    var nemesis = loadPersistentNemesis();

    return {
      available: !!getStore(),
      keys: clone(STORAGE_KEYS),
      lastError: lastError,
      hasRunSave: !!runRecord,
      runSummary: buildRunSummary(runRecord),
      settings: loadSettings(),
      persistentNemesis: {
        nextId: nemesis.nextId,
        poolSize: nemesis.pool.length,
        entries: nemesis.pool.map(function (entry) {
          return {
            id: entry.id,
            name: entry.name,
            title: entry.title,
            level: entry.level,
            dialogueState: entry.dialogueState,
            firearmStage: entry.firearmStage
          };
        })
      }
    };
  }

  G.storage = {
    STORAGE_KEYS: clone(STORAGE_KEYS),
    DEFAULT_SETTINGS: clone(DEFAULT_SETTINGS),
    normalizeSettings: normalizeSettings,
    normalizeNemesis: normalizeNemesis,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    clearSettings: clearSettings,
    loadPersistentNemesis: loadPersistentNemesis,
    savePersistentNemesis: savePersistentNemesis,
    clearPersistentNemesis: clearPersistentNemesis,
    loadRun: loadRun,
    loadRunRecord: loadRunRecord,
    saveRun: saveRun,
    clearRun: clearRun,
    hasRunSave: hasRunSave,
    clearAll: clearAll,
    loadChronicle: loadChronicle,
    saveChronicle: saveChronicle,
    getDebugSnapshot: getDebugSnapshot
  };
})();
