window.G = window.G || {};

(function () {
  function getDefaultSettings() {
    if (G.storage && G.storage.DEFAULT_SETTINGS) {
      return {
        volume: G.storage.DEFAULT_SETTINGS.volume,
        quality: G.storage.DEFAULT_SETTINGS.quality
      };
    }

    return {
      volume: 0.7,
      quality: "high"
    };
  }

  function buildDefaultPayload() {
    return {
      scene: "boot",
      player: {
        hp: 80,
        maxHp: 80,
        poisonTurns: 0,
        energy: 3,
        maxEnergy: 3,
        block: 0,
        ironBoneActive: false,
        ironBoneThreshold: G.statusEffects && typeof G.statusEffects.IRON_BONE_THRESHOLD === "number" ?
          G.statusEffects.IRON_BONE_THRESHOLD :
          10,
        gold: 100,
        relics: [],
        removeServiceCount: 0,
        deckSize: 12,
        chosenStyle: null
      },
      nemesis: {
        nextId: 1,
        pool: []
      },
      animations: {
        activeScene: null,
        activeEffectCount: 0,
        effects: [],
        cardDrag: null
      },
      settings: getDefaultSettings(),
      storage: {
        available: false,
        hasRunSave: false,
        runSummary: null,
        settings: getDefaultSettings(),
        persistentNemesis: {
          nextId: 1,
          poolSize: 0,
          entries: []
        }
      },
      runReport: null
    };
  }

  window.render_game_to_text = function () {
    var payload = buildDefaultPayload();
    var state = G.main && typeof G.main.getState === "function" ? G.main.getState() : null;

    if (!state) {
      return JSON.stringify(payload);
    }

    payload.scene = state.scene;
    payload.player = {
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      poisonTurns: typeof state.player.poisonTurns === "number" ? state.player.poisonTurns : 0,
      energy: state.player.energy,
      maxEnergy: state.player.maxEnergy,
      block: state.player.block,
      ironBoneActive: G.statusEffects && typeof G.statusEffects.isIronBoneActive === "function" ?
        G.statusEffects.isIronBoneActive(state) :
        false,
      ironBoneThreshold: G.statusEffects && typeof G.statusEffects.IRON_BONE_THRESHOLD === "number" ?
        G.statusEffects.IRON_BONE_THRESHOLD :
        10,
      gold: state.player.gold,
      relics: state.player.relics.slice(),
      removeServiceCount: state.player.removeServiceCount,
      deckSize: state.player.deckSize,
      chosenStyle: state.player.chosenStyle
    };

    payload.nemesis = {
      nextId: state.nemesis && typeof state.nemesis.nextId === "number" ? state.nemesis.nextId : 1,
      pool: G.nemesis && typeof G.nemesis.getPoolSnapshot === "function" ?
        G.nemesis.getPoolSnapshot(state).map(function (entry) {
          return {
            id: entry.id,
            name: entry.name,
            title: entry.title,
            level: entry.level,
            baseHP: entry.baseHP,
            baseAttack: entry.baseAttack,
            scaledHP: entry.scaledHP,
            scaledAttack: entry.scaledAttack,
            hpMultiplier: entry.hpMultiplier,
            attackMultiplier: entry.attackMultiplier,
            firearmDamage: entry.firearmDamage,
            chainArmorBlock: entry.chainArmorBlock,
            currentAdaptation: entry.currentAdaptation,
            firearmStage: entry.firearmStage,
            firearmStep: entry.firearmStep,
            dialogueState: entry.dialogueState,
            historyLength: Array.isArray(entry.history) ? entry.history.length : 0,
            latestOutcomeTier: entry.latestOutcomeTier,
            latestHistory: entry.latestHistory,
            sourceEncounterId: entry.sourceEncounterId,
            sourceTemplateId: entry.sourceTemplateId
          };
        }) :
        []
    };

    payload.audio = G.audio && typeof G.audio.getDebugState === "function" ?
      G.audio.getDebugState() :
      {
        available: false,
        enabled: false,
        unlocked: false,
        masterVolume: getDefaultSettings().volume,
        contextState: "missing"
      };
    payload.render = G.main && typeof G.main.getRenderDebug === "function" ?
      G.main.getRenderDebug() :
      {
        scene: state.scene,
        sceneOffset: { x: 0, y: 0 }
      };
    payload.animations = G.render && G.render.animations && typeof G.render.animations.getDebugState === "function" ?
      G.render.animations.getDebugState(state.scene) :
      buildDefaultPayload().animations;
    payload.settings = state.settings ? {
      volume: typeof state.settings.volume === "number" ? state.settings.volume : getDefaultSettings().volume,
      quality: state.settings.quality || getDefaultSettings().quality
    } : getDefaultSettings();
    payload.storage = G.storage && typeof G.storage.getDebugSnapshot === "function" ?
      G.storage.getDebugSnapshot() :
      buildDefaultPayload().storage;
    payload.runReport = state.runReport ? {
      active: !!state.runReport.active,
      outcome: state.runReport.outcome || null,
      styleId: state.runReport.styleId || null,
      styleName: state.runReport.styleName || null,
      title: state.runReport.title || null,
      subtitle: state.runReport.subtitle || null,
      prompt: state.runReport.prompt || null,
      note: state.runReport.note || null,
      summaryRows: state.runReport.summaryRows || [],
      detailLines: state.runReport.detailLines || [],
      buttons: state.runReport.buttons || []
    } : null;

    if (state.scene === "title") {
      payload.title = {
        mode: state.title.mode || "menu",
        heading: state.title.heading,
        subtitle: state.title.subtitle,
        prompt: state.title.prompt,
        note: state.title.note,
        saveLine: state.title.saveLine || null,
        settingsLine: state.title.settingsLine || null,
        startLabel: state.title.startLabel,
        backLabel: state.title.backLabel || null,
        selectedStyle: state.title.selectedStyle || null,
        continueAvailable: !!state.title.continueAvailable,
        saveSummary: state.title.saveSummary || null,
        saveSummaryLines: state.title.saveSummaryLines || [],
        menuItems: state.title.menuItems || [],
        creditRows: state.title.creditRows || [],
        options: (state.title.options || []).map(function (option) {
          return {
            id: option.id,
            name: option.name,
            theme: option.theme,
            keyword: option.keyword,
            starterSummary: option.starterSummary,
            previewNames: (option.previewCards || []).map(function (card) {
              return card.name;
            })
          };
        })
      };
    }

    if (state.scene === "combat") {
      payload.combat = state.combat;
      payload.combat.enemyLayoutBoxes = G.scenes.combat && typeof G.scenes.combat.getEnemyLayoutBoxes === "function" ?
        G.scenes.combat.getEnemyLayoutBoxes(state) :
        [];
      payload.combat.comboDiscountsRemaining = G.statusEffects &&
        typeof G.statusEffects.getComboDiscountsRemaining === "function" ?
        G.statusEffects.getComboDiscountsRemaining(state) :
        0;
      payload.combat.comboDiscountActive = G.statusEffects &&
        typeof G.statusEffects.isComboDiscountActive === "function" ?
        G.statusEffects.isComboDiscountActive(state) :
        false;
      if (G.relicRuntime && typeof G.relicRuntime.getCombatDisplay === "function") {
        payload.combat.relicDisplay = G.relicRuntime.getCombatDisplay(state);
      }
    }

    if (state.scene === "reward") {
      payload.reward = {
        mode: state.reward.mode,
        title: state.reward.title,
        subtitle: state.reward.subtitle,
        goldAward: state.reward.goldAward,
        entryNodeType: state.reward.entryNodeType || null,
        entryNodeLabel: state.reward.entryNodeLabel || null,
        entryEncounterName: state.reward.entryEncounterName || null,
        entryKillCardName: state.reward.entryKillCardName || null,
        entryVictoryTitle: state.reward.entryVictoryTitle || null,
        entryVictorySubtitle: state.reward.entryVictorySubtitle || null,
        entrySummary: state.reward.entrySummary || null,
        trophyLabel: state.reward.trophyLabel || null,
        presentation: state.reward.presentation ? {
          introMs: typeof state.reward.presentation.introMs === "number" ? state.reward.presentation.introMs : 0,
          introDurationMs: typeof state.reward.presentation.introDurationMs === "number" ? state.reward.presentation.introDurationMs : 0,
          cardStaggerMs: typeof state.reward.presentation.cardStaggerMs === "number" ? state.reward.presentation.cardStaggerMs : 0
        } : null,
        options: state.reward.options.map(function (option) {
          return {
            id: option.id,
            name: option.name,
            icon: option.icon,
            style: option.style,
            cost: option.cost,
            text: option.text,
            description: option.description
          };
        }),
        skipLabel: state.reward.skipLabel,
        lastChoice: state.reward.lastChoice,
        lastRelicChoice: state.reward.lastRelicChoice
      };
    }

    if (state.scene === "rest") {
      payload.rest = state.rest || null;
    }

    if (state.scene === "shop") {
      payload.shop = state.shop || null;
    }

    if (state.scene === "nemesis") {
      payload.nemesisIntro = state.nemesisIntro || null;
    }

    if (state.scene === "event") {
      payload.event = state.event || null;
    }

    if (state.scene === "map") {
      payload.map = state.map || null;
    }

    return JSON.stringify(payload);
  };

  window.advanceTime = function (ms) {
    if (G.main && typeof G.main.stepTime === "function") {
      G.main.stepTime(ms);
    }
    return Promise.resolve();
  };

  window.replace_game_state = function (nextState) {
    if (G.main && typeof G.main.replaceState === "function") {
      return G.main.replaceState(nextState);
    }
    return null;
  };

  window.reset_game_state = function () {
    if (G.main && typeof G.main.resetState === "function") {
      return G.main.resetState();
    }
    return null;
  };

  window.get_storage_debug = function () {
    if (G.main && typeof G.main.getStorageDebug === "function") {
      return G.main.getStorageDebug();
    }
    return null;
  };

  window.update_game_settings = function (patch) {
    if (G.main && typeof G.main.setSettings === "function") {
      return G.main.setSettings(patch);
    }
    return null;
  };

  window.load_run_save = function () {
    if (G.main && typeof G.main.loadRunSave === "function") {
      return G.main.loadRunSave();
    }
    return null;
  };

  window.clear_run_save = function () {
    if (G.main && typeof G.main.clearRunSave === "function") {
      return G.main.clearRunSave();
    }
    return null;
  };
})();
