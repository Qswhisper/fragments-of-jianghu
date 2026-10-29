window.KGAME_CARD_ART_MANIFEST = {
  version: "2026-09-29-mixed-v1",
  shared: {
    safeArea: {
      left: 0.18,
      right: 0.82,
      top: 0.16,
      bottom: 0.74
    },
    cropRoles: {
      combat: "高窄裁切，优先保住人物上半身、主手动作和武器交点。",
      reward: "稍宽裁切，允许动作外摆，但主体仍要压在中央安全区。"
    },
    styleNotes: [
      "不要做成玄幻发光海报。",
      "不要把完整人物顶天立地塞满画面。",
      "刀势、拳势、灰土、血迹都可以有，但细节不要贴边。",
      "宁可做单一动作定格，也不要做多角色叙事插画。"
    ]
  },
  firstBatch: [
    "basic_strike",
    "basic_defend",
    "blade_quick_cut",
    "blade_gut",
    "blade_sacrifice",
    "blade_hidden_edge",
    "iron_bar",
    "iron_bone_break",
    "iron_monument_hammer",
    "iron_horse_stance",
    "dirty_hidden_blade",
    "dirty_lime_throw",
    "dirty_tendon_cut",
    "dirty_alley_throat",
    "combo_dash",
    "combo_bone_hand",
    "combo_chain_punch",
    "combo_close_step"
  ],
  cards: {
    basic_strike: {
      label: "劈砍",
      batch: "alpha_core",
      priority: 1,
      path: "assets/cards/basic_strike_woodcut_20260929_v1.png",
      plannedPath: "assets/cards/basic_strike_woodcut_20260929_v1.png",
      focus: {
        combat: { x: 0.55, y: 0.44 },
        reward: { x: 0.52, y: 0.46 }
      },
      composition: "黑底骨白单一斜向刀势，保留原卡高对比度，采用干笔版画边缘。",
      prompt: "完整生成提示词见 assets/cards/woodcut-20260929-sources.json。"
    },
    basic_defend: {
      label: "招架",
      batch: "alpha_core",
      priority: 1,
      path: "assets/cards/basic_defend_technique_20260401_v7.png",
      plannedPath: "assets/cards/basic_defend_technique_20260401_v7.png",
      focus: {
        combat: { x: 0.5, y: 0.48 },
        reward: { x: 0.5, y: 0.5 }
      },
      composition: "横刀架门，双臂形成门字形，重心沉住。",
      prompt: "晚清江湖写实防守技法插画，单人横刀招架，门式构图，动作凝住，背景克制发灰。"
    },
    blade_quick_cut: {
      label: "贴步割喉",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/blade_quick_cut_technique_20260330_v5.png",
      plannedPath: "assets/cards/blade_quick_cut_technique_20260330_v5.png",
      focus: {
        combat: { x: 0.58, y: 0.4 },
        reward: { x: 0.54, y: 0.33 }
      },
      composition: "抢步贴身后横掠咽喉，刀线压在画面上中段，人物前冲。",
      prompt: "晚清街斗写实动作插画，贴步割喉，单刀横掠颈侧，身位逼近，动作狠快，画面冷硬。"
    },
    blade_gut: {
      label: "开膛",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/blade_gut_technique_20260331_v6.png",
      plannedPath: "assets/cards/blade_gut_technique_20260331_v6.png",
      focus: {
        combat: { x: 0.53, y: 0.46 },
        reward: { x: 0.5, y: 0.38 }
      },
      composition: "由下向上剖开腹线的狠刀，手臂和刀背形成上挑弧线。",
      prompt: "晚清黑帮搏杀写实插画，开膛动作定格，由下挑上的单刀重划，血迹克制，主体集中。"
    },
    blade_sacrifice: {
      label: "舍身一刀",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/blade_sacrifice_woodcut_20260929_v1.png",
      plannedPath: "assets/cards/blade_sacrifice_woodcut_20260929_v1.png",
      focus: {
        combat: { x: 0.57, y: 0.42 },
        reward: { x: 0.54, y: 0.44 }
      },
      composition: "黑底人物压身出刀，骨白刀刃与朱红刀势形成主轮廓，版画明暗块面。",
      prompt: "完整生成提示词见 assets/cards/woodcut-20260929-sources.json。"
    },
    blade_hidden_edge: {
      label: "回身藏锋",
      batch: "alpha_core",
      priority: 2,
      path: "assets/cards/blade_hidden_edge_technique_20260401_v8.png",
      plannedPath: "assets/cards/blade_hidden_edge_technique_20260401_v8.png",
      focus: {
        combat: { x: 0.48, y: 0.42 },
        reward: { x: 0.5, y: 0.44 }
      },
      composition: "回身半转，刀锋藏在肘后或腰后，像下一瞬才会出锋。",
      prompt: "晚清刺客技法写实插画，回身藏锋，半转身蓄刀，动作隐而不发，冷调，克制血色。"
    },
    iron_bar: {
      label: "铁门闩",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/iron_bar_technique_20260330_v5.png",
      plannedPath: "assets/cards/iron_bar_technique_20260330_v5.png",
      focus: {
        combat: { x: 0.48, y: 0.5 },
        reward: { x: 0.5, y: 0.32 }
      },
      composition: "双臂并架，像门闩横拦，整个人沉稳地卡住入口。",
      prompt: "晚清横练门架写实插画，铁门闩式防守，双臂横拦如门闩，厚重站桩，冷灰褐色。"
    },
    iron_bone_break: {
      label: "连皮带骨",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/iron_bone_break_technique_20260330_v5.png",
      plannedPath: "assets/cards/iron_bone_break_technique_20260330_v5.png",
      focus: {
        combat: { x: 0.54, y: 0.46 },
        reward: { x: 0.52, y: 0.48 }
      },
      composition: "借架势贴身撞碎的短爆发，臂、肩、胯在一条冲击线上。",
      prompt: "晚清横练近身写实插画，贴身硬撞碎骨，短距离爆发，身体像铁锤一样前压。"
    },
    iron_monument_hammer: {
      label: "开碑重捶",
      batch: "alpha_core",
      priority: 2,
      path: "assets/cards/iron_monument_hammer_technique_20260331_v6.png",
      plannedPath: "assets/cards/iron_monument_hammer_technique_20260331_v6.png",
      focus: {
        combat: { x: 0.5, y: 0.4 },
        reward: { x: 0.5, y: 0.42 }
      },
      composition: "自上而下的重捶压碑感，双肩压落，拳或肘像石锤砸下。",
      prompt: "晚清横练重击写实插画，开碑重捶，向下压砸的沉重动作，石碑般压迫感，画面厚重。"
    },
    iron_horse_stance: {
      label: "沉马硬架",
      batch: "alpha_core",
      priority: 2,
      path: "assets/cards/iron_horse_stance_technique_20260401_v7.png",
      plannedPath: "assets/cards/iron_horse_stance_technique_20260401_v7.png",
      focus: {
        combat: { x: 0.5, y: 0.54 },
        reward: { x: 0.5, y: 0.56 }
      },
      composition: "马步沉下，双臂外撑成硬架，重点是下盘和架势的稳定。",
      prompt: "晚清横练站桩写实插画，沉马硬架，低重心马步，双臂撑开，稳如桩石。"
    },
    dirty_hidden_blade: {
      label: "阴手捅刀",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/dirty_hidden_blade_technique_20260330_v5.png",
      plannedPath: "assets/cards/dirty_hidden_blade_technique_20260330_v5.png",
      focus: {
        combat: { x: 0.56, y: 0.46 },
        reward: { x: 0.54, y: 0.48 }
      },
      composition: "袖口或腰侧藏刀后突然前送，刀线短、狠、贴身。",
      prompt: "晚清黑巷写实插画，阴手捅刀，暗藏短刃突然前送，脏狠贴身，阴湿空气感。"
    },
    dirty_lime_throw: {
      label: "撒石灰",
      batch: "alpha_core",
      priority: 2,
      path: "assets/cards/dirty_lime_throw_technique_20260330_v5.png",
      plannedPath: "assets/cards/dirty_lime_throw_technique_20260330_v5.png",
      focus: {
        combat: { x: 0.58, y: 0.42 },
        reward: { x: 0.54, y: 0.44 }
      },
      composition: "前手猛扬粉灰，灰雾在画面中上部炸开，动作偏侧身。",
      prompt: "晚清街巷脏招写实插画，撒石灰，手掌扬起灰粉遮眼，粉尘爆开，肮脏阴狠。"
    },
    dirty_tendon_cut: {
      label: "断筋",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/dirty_tendon_cut_technique_20260331_v6.png",
      plannedPath: "assets/cards/dirty_tendon_cut_technique_20260331_v6.png",
      focus: {
        combat: { x: 0.54, y: 0.52 },
        reward: { x: 0.52, y: 0.5 }
      },
      composition: "下路割腿筋，刀锋压在画面中下段，动作低而贴地。",
      prompt: "晚清污巷搏命写实插画，低位割筋动作，刀路贴近腿部与地面，狠辣阴损。"
    },
    dirty_alley_throat: {
      label: "污巷抹喉",
      batch: "alpha_core",
      priority: 2,
      path: "assets/cards/dirty_alley_throat_technique_20260401_v9.png",
      plannedPath: "assets/cards/dirty_alley_throat_technique_20260401_v9.png",
      focus: {
        combat: { x: 0.57, y: 0.42 },
        reward: { x: 0.54, y: 0.44 }
      },
      composition: "在逼仄巷道里贴墙抹喉，刀线细而快，环境感压迫。",
      prompt: "晚清污巷写实插画，抹喉一瞬，墙面逼仄，脏水与灰土，动作快狠短。"
    },
    combo_dash: {
      label: "闪身刺",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/combo_dash_technique_20260330_v5.png",
      plannedPath: "assets/cards/combo_dash_technique_20260330_v5.png",
      focus: {
        combat: { x: 0.56, y: 0.42 },
        reward: { x: 0.53, y: 0.44 }
      },
      composition: "闪身让位后回刺，重心轻快，动作像一闪而过的针刺。",
      prompt: "晚清短打写实插画，闪身刺，轻快腾挪后突然回刺，身法灵，线条利。"
    },
    combo_bone_hand: {
      label: "卸骨手",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/combo_bone_hand_technique_20260331_v6.png",
      plannedPath: "assets/cards/combo_bone_hand_technique_20260331_v6.png",
      focus: {
        combat: { x: 0.5, y: 0.46 },
        reward: { x: 0.5, y: 0.36 }
      },
      composition: "双手拿关节、借力卸骨，重点在手型和贴身控制。",
      prompt: "晚清近身擒拿写实插画，卸骨手，双手制关节，贴身借力，动作老辣。"
    },
    combo_chain_punch: {
      label: "寸拳连珠",
      batch: "alpha_core",
      priority: 3,
      path: "assets/cards/combo_chain_punch_technique_20260330_v5.png",
      plannedPath: "assets/cards/combo_chain_punch_technique_20260330_v5.png",
      focus: {
        combat: { x: 0.54, y: 0.42 },
        reward: { x: 0.52, y: 0.44 }
      },
      composition: "连续短拳前压，手臂节奏像一串连珠，胸口到拳头在中央安全区。",
      prompt: "晚清短桥拳写实插画，寸拳连珠，多段短拳连发，节奏密，身位前压。"
    },
    combo_close_step: {
      label: "贴身递步",
      batch: "alpha_core",
      priority: 2,
      path: "assets/cards/combo_close_step_technique_20260331_v6.png",
      plannedPath: "assets/cards/combo_close_step_technique_20260331_v6.png",
      focus: {
        combat: { x: 0.52, y: 0.48 },
        reward: { x: 0.5, y: 0.5 }
      },
      composition: "连环递步逼近，前脚探进、肩线送出，像下一式的前奏。",
      prompt: "晚清贴身短打写实插画，递步逼近，脚步与肩线一起向前送，压迫感强。"
    }
  }
};
