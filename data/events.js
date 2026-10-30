window.G = window.G || {};
G.events = G.events || {};

(function () {
  var MIN_MAX_HP = 20;
  var HISTORY_LIMIT = 20;
  var definitions = [
    eventDef("act1_child_in_embers", 1, "灶灰里的孩子", "火梁下，孩子的哭声渐弱。父亲被搜兵挡在街口，护身札记攥皱了也递不进来。墙根落着钱袋，另一条退路尽是毒烟。火梁已开始往下沉。", [
      choice("carry_out", "冒火背出孩子", "气血 -10，获得 1 张本流派招式", "你用湿衣裹住孩子冲出火场，肩头灼伤。父亲接过孩子，把护身札记塞给你，又撕下衣袖替你裹伤。", [
        effect("hp", -10),
        effect("gain_card", 0, "style")
      ]),
      choice("walk_away", "拾钱袋，穿烟巷", "最大气血 -4，获得 25 大洋", "你抄起钱袋钻进烟巷，滚烫黑烟呛入肺管，往后发力总觉气短。街口汉子盯着你腰间的钱袋，不再吭声。", [
        effect("max_hp", -4),
        effect("gold", 25)
      ])
    ]),
    eventDef("act1_execution_notice", 1, "城门示众榜", "城门横木上吊着旧营同门，衣襟里露出半截校招札记。弓手守着尸身，差役在下面收旧营凭据、发赏银。你认得那本札记，往日拆招时他总夹在腰间。", [
      choice("cut_the_rope", "冒箭收殓，取札记", "气血 -8，随机移除 1 张牌", "你冒着冷箭割断绳索，将尸身拖入暗巷收殓。翻看他怀里的血册，你划去了自己常用的一式破绽招法。", [
        effect("hp", -8),
        effect("remove_random_card")
      ]),
      choice("claim_the_bounty", "交同门凭据领赏", "获得 30 大洋，最大气血 -3", "你交出同门凭据，按下手印。差役付了赏银，又一枪托砸中胸骨；这处暗伤，往后发力仍会牵痛。", [
        effect("gold", 30),
        effect("max_hp", -3)
      ])
    ]),
    eventDef("act1_teahouse_poison", 1, "茶摊冷盏", "拳师把茶盏放回桌上，压低声音：“搜兵盯上我了，劳你送过前巷。”巷口刀枪未收，他的钱绳和别派招谱还塞在桌下。你可护他过巷，也可掀桌夺走东西。", [
      choice("drink_anyway", "护拳师过巷", "气血 -6，随机升级 1 张牌", "你护拳师穿过巷口，交手时受了伤。他等你喘匀气，伸手压下你的肩：“方才这一下，劲走偏了。”", [
        effect("hp", -6),
        effect("upgrade_random_card")
      ]),
      choice("flip_the_table", "掀桌夺钱与杂招", "获得 20 大洋，获得 1 张异流派招式", "你掀桌夺走钱和招谱。拳师退到棚后，茶水流过他没来得及收回的手。", [
        effect("gold", 20),
        effect("gain_card", 0, "offstyle")
      ])
    ]),
    eventDef("act1_river_shrine", 1, "河神小龛", "负伤拳师靠着河神龛，药包压在膝上，供刀还横在身旁。搜兵的脚步越来越近，他指指你的旧创：“引开他们，回来我替你治。”龛沿撒着碎瓷，抄刀就走也得伤手。", [
      choice("blood_oath", "引开搜兵，换治伤", "气血 -8，最大气血 +5", "你引开搜兵，折返时添了新伤。拳师替你清理旧创，又把新伤裹好：“这几天少使蛮劲。”", [
        effect("hp", -8),
        effect("max_hp", 5)
      ]),
      choice("take_the_blade", "翻龛取刀", "获得旧物【缺口的厚背砍刀】，气血 -6", "你没应声，探手越过神龛抄走厚背砍刀。碎瓷割破掌心，拳师攥紧药囊闭上眼，任由你跃出后窗。", [
        effect("gain_relic", 0, "chipped_blade"),
        effect("hp", -6)
      ])
    ]),
    eventDef("act2_cinder_cistern", 2, "焦土水窖", "水壶递过去，伤兵喝了一口，又捧给旁边的人。他们想留些水走余下的路，药包已摊在你脚边。你可留下水换药，也可夺回独饮；争抢会牵动肋下旧创。", [
      choice("share_water", "留下水，换药", "气血 -8，最大气血 +4", "你留下水壶。伤兵替你换好药，才去接同伴递回的水。你忍着渴意上路，他嘴唇上的裂口还没合。", [
        effect("hp", -8),
        effect("max_hp", 4)
      ]),
      choice("drink_alone", "夺回水壶，独饮", "恢复 12 气血，最大气血 -4", "你硬夺回水壶仰头喝干，撕扯间肋下旧创崩裂，伤及筋络。伤兵默默把铺盖挪开，同路脚夫也避开了你的目光。", [
        effect("hp", 12),
        effect("max_hp", -4)
      ])
    ]),
    eventDef("act2_overturned_caravan", 2, "驿道翻车", "驿道边粮车翻进深沟，断辕压着护车伤员，受惊的驮马还在乱踢。伤员指着腰间浸药的绷带喊你搭救；断板另一头卡着只沉重银箱，车架眼看就要散塌。", [
      choice("free_the_horse", "救伤员，替马解绳", "气血 -6，获得旧物【血绷带】", "你扑上去割断缰绳，被乱蹬的马蹄擦伤小臂。伤员脱下药浸的血绷带，翻出干净里侧替你缠紧伤口。", [
        effect("hp", -6),
        effect("gain_relic", 0, "blood_bandage")
      ]),
      choice("loot_the_silver", "拖走银箱", "获得 40 大洋，最大气血 -3", "你拖走银箱，塌落的断板砸伤肋下，留下内伤。伤员在沟底喊了一声，你没有回头。", [
        effect("gold", 40),
        effect("max_hp", -3)
      ])
    ]),
    eventDef("act2_bandit_dice_bowl", 2, "马匪骰碗", "五十块大洋赢下了，马匪却按着钱袋，要你割肉才认账。马匪另提了个价：十五块大洋，再加一本擒拿札记，余下的钱就此两清。", [
      choice("bet_your_life", "割肉换整袋路费", "气血 -10，获得 50 大洋", "刀口划过皮肉，钱袋才松到你手里。马匪让开路，你带走五十块大洋，没再看那只骰碗。", [
        effect("hp", -10),
        effect("gold", 50)
      ]),
      choice("smash_the_table", "收下十五块与札记", "随机升级 1 张牌，获得 15 大洋", "你收下十五块大洋和札记，不再追讨余款。册里写的关节诀窍，正能补上一式旧招的破绽。", [
        effect("upgrade_random_card"),
        effect("gold", 15)
      ])
    ]),
    eventDef("act2_buried_flag", 2, "灰里旧旗", "旧旗裹着操练册，暗线药包藏在旗坑旁。埋旗歇脚，可舍去僵招、处理旧伤；扛旗带册能拾回本门招数，却会把行踪亮给追兵。", [
      choice("bury_it", "埋旗歇脚，弃旧招", "随机移除 1 张牌，最大气血 +3", "你不再照旧营的僵招行事，埋旗后在背风处敷药调息。冗招少了一手，旧伤也松开一处。", [
        effect("remove_random_card"),
        effect("max_hp", 3)
      ]),
      choice("carry_it", "扛旗带走操练册", "获得 1 张本流派招式，1 名宿敌阶数 +1", "操练册里，有一式本门的老招。你扛旗带走，追兵也循着旗影找准了方向。", [
        effect("gain_card", 0, "style"),
        effect("nemesis_shift", 1)
      ])
    ]),
    eventDef("act3_foreign_clinic", 3, "租界诊所", "诊所肯为逃难者缝合新伤、取出旧创碎片。药柜里有值钱麻药，门房的杂门护院谱也挂在旁边；若抢走，就得冒铁棍翻窗，来不及治伤。", [
      choice("let_him_stitch", "留下缝合，治旧创", "恢复 12 气血，最大气血 +4", "旧创里的碎片终于取出，新伤也缝好了。医生收起针线，你试着吸气，胸口比来时松快了些。", [
        effect("hp", 12),
        effect("max_hp", 4)
      ]),
      choice("grab_the_meds", "夺药与杂谱，翻窗走", "获得 20 大洋，最大气血 -3，获得 1 张异流派招式", "你夺走能换钱的麻药和杂门护院谱。翻窗时，门房一棍击中肋骨；东西到手，伤却来不及处理。", [
        effect("gold", 20),
        effect("max_hp", -3),
        effect("gain_card", 0, "offstyle")
      ])
    ]),
    eventDef("act3_bridge_performance", 3, "天桥卖艺", "看客围着场子等你出手，几趟硬招便能挣下盘缠。桥阴的老拳师却朝你招手：“脚下虚了，先收势。”随他校招调息，就赶不上这场赏钱；继续演练，伤口还得硬撑。", [
      choice("perform_for_coins", "忍伤卖艺挣盘缠", "气血 -8，获得 35 大洋", "几趟硬招演完，伤口又渗出血。看客渐渐散去，留下的大洋够你再走一段路。", [
        effect("hp", -8),
        effect("gold", 35)
      ]),
      choice("hide_the_edge", "放弃赏钱，随师校招", "随机升级 1 张牌，最大气血 +2", "你收势走入桥阴，随老拳师压稳脚跟、改掉多余发力。招式更顺，旧伤也不再处处牵扯呼吸。", [
        effect("upgrade_random_card"),
        effect("max_hp", 2)
      ])
    ]),
    eventDef("act3_informer_confession", 3, "密探口供", "断指密探把追兵补给去向和旧营护身谱塞向你，求你拦住街口刀手。刀手却亮出钱袋要你让开；他已认出你的脸，拿钱也未必能全身退开。", [
      choice("take_the_hit", "挡刀救人，取口供", "气血 -12，获得 1 张本流派招式，1 名宿敌阶数 -1", "你架住来刀，将密探拖进暗巷。口供和招谱沾了血，字还认得清；暗线循口供截下了补给。", [
        effect("hp", -12),
        effect("gain_card", 0, "style"),
        effect("nemesis_shift", -1)
      ]),
      choice("push_him_out", "交人拿钱，冒险脱身", "获得 30 大洋，最大气血 -4", "你收下钱袋，刀手却反手劈来。翻窗时肋下受创，往后吐纳总带着痛；袋里也滑出一张兑票。", [
        effect("gold", 30),
        effect("max_hp", -4)
      ])
    ]),
    eventDef("act3_chapel_lantern", 3, "洋楼祷房", "睡着的看守身旁，一只侧柜放着护心镜，另一只锁柜压着军需钱。巡哨将回：轻手取镜可无声离开，砸锁拿钱就会惊动追兵。", [
      choice("snuff_and_take", "轻手取镜，悄然离开", "获得旧物【锈护心镜】", "你熄灯摸开侧柜，取走锈护心镜，从巡哨的脚步声间退出。看守仍没醒。", [
        effect("gain_relic", 0, "rusty_mirror")
      ]),
      choice("overturn_the_altar", "砸柜夺钱，惊动巡哨", "获得 30 大洋，气血 -6，1 名宿敌阶数 +1", "柜响惊醒看守，混战中你受了伤。你带走军需钱，赶来的巡哨也看清了你逃向哪条街。", [
        effect("gold", 30),
        effect("hp", -6),
        effect("nemesis_shift", 1)
      ])
    ]),
    eventDef("act4_rail_spikes", 4, "铁路工钉", "工人正拆运械支线，老工匠喊你搭手，把撬杠递来：“肩别硬扛，借腰上的劲。”带伤出力会扯开伤口。军需队也在收钉包，肯付现钱，却要当面盘查身份。", [
      choice("help_the_workers", "帮工人拆轨", "气血 -10，随机升级 1 张牌，1 名宿敌阶数 -1", "轨钉起出时扯开了伤口。歇手后你按老工匠说的巧劲试招，发力顺了；支线已断，运械车过不来了。", [
        effect("hp", -10),
        effect("upgrade_random_card"),
        effect("nemesis_shift", -1)
      ]),
      choice("sell_to_quartermaster", "向军需队卖钉包", "获得 45 大洋，最大气血 -3", "轨钉换了钱，押车兵却要查你的身份。夺路时胸骨受创，这口气往后也难顺过来。", [
        effect("gold", 45),
        effect("max_hp", -3)
      ])
    ]),
    eventDef("act4_telegraph_station", 4, "雨夜电报局", "密电夹着补给时刻和杂门操练页，值夜兵的盘缠压在另一头。巡兵将回：抄密电能给暗线断供线索；抢钱烧屋只来得及捞一页散招，还须冒火。", [
      choice("intercept_wire", "抄密电，交暗线断供", "获得 1 张异流派招式，1 名宿敌阶数 -1", "你抄下补给时刻，把密电送给暗线安排截运。夹页上的杂门练法也被带走，追兵下一批军械由此受阻。", [
        effect("gain_card", 0, "offstyle"),
        effect("nemesis_shift", -1)
      ]),
      choice("burn_the_room", "抢盘缠与散招，烧屋", "气血 -8，获得 25 大洋，获得 1 张随机招式", "你抓起盘缠和一页散招，点燃追缉记录后冲出火场。火舌燎开伤口；补给时刻没能抄出，现有追兵并未减弱。", [
        effect("hp", -8),
        effect("gold", 25),
        effect("gain_card", 0, "reward")
      ])
    ]),
    eventDef("act4_field_hospital", 4, "野战医院", "医院的担架排到了门外。医官卷着袖口喊人搭手，药盘里还放着吗啡。留下搬担架会扯伤，忙完能清创治旧患；偷药虽能压痛赶路，深伤却会继续拖重。", [
      choice("steal_morphine", "偷药压痛，带深伤走", "恢复 18 气血，最大气血 -3", "药劲暂时止痛，让你能赶路。你没处理深创，反而因痛觉被压住继续用力，留下了更重的后患。", [
        effect("hp", 18),
        effect("max_hp", -3)
      ]),
      choice("leave_it_for_them", "忍伤搬担架，换清创", "气血 -6，最大气血 +4", "担架放下，伤口也挣开了。医官洗净手替你清创缝合；眼前仍疼，拖了许久的旧患总算能好好养。", [
        effect("hp", -6),
        effect("max_hp", 4)
      ])
    ]),
    eventDef("act4_payroll_ruts", 4, "军饷车辙", "押军饷车的少年兵停下来，领头的递出军医伤药和护身谱，只求放他们过去。后头追缉骑兵将至，另一个小兵攥着示警火筒。截下军饷能拿钱，也会招来追兵。", [
      choice("take_the_payroll", "截饷拿钱，冒示警", "获得 60 大洋，1 名宿敌阶数 +1", "你夺下军饷车，把钱用于路费。押车兵点起信号，追缉骑兵很快接上了你的去向。", [
        effect("gold", 60),
        effect("nemesis_shift", 1)
      ]),
      choice("let_them_pass", "放行换护身法与药", "最大气血 +4，获得 1 张本流派招式", "你侧身让开。领头的松了口气，放下护身谱和军医伤药；药能治陈伤，谱上的练法也刚好合用。", [
        effect("max_hp", 4),
        effect("gain_card", 0, "style")
      ])
    ]),
    eventDef("act5_refugee_boat", 5, "难民破船", "破船压得太低，孩子还挤不上舷。船夫喊你先帮着卸货，伸手指了指药包：“旧伤上船给你看，撑船卸力的法子也教你。”抢包袱和船位更快，舷边却翘着断钉。", [
      choice("lift_the_child", "忍伤卸货，救孩子", "气血 -12，最大气血 +5，获得 1 张本流派招式", "你顶住推挤，托孩子上船，又卸下重货。船夫替你敷药治旧伤，指点卸力；新伤还疼着，孩子已靠着船篷睡了。", [
        effect("hp", -12),
        effect("max_hp", 5),
        effect("gain_card", 0, "style")
      ]),
      choice("steal_the_last_seat", "夺包袱，抢上船", "获得 40 大洋，最大气血 -5", "你夺过装着盘缠的包袱，踩着舷边断钉翻上船。钉尖扎伤了腿，深及骨头，往后发力总受牵制。", [
        effect("gold", 40),
        effect("max_hp", -5)
      ])
    ]),
    eventDef("act5_arsenal_crate", 5, "码头军火箱", "军械就要运给追兵。拆袖箭零件，须冒弹簧割手的险；留下记好操练单，再贴箱安引线，能断下一批补给，却得挨更重的烧伤。", [
      choice("carry_the_parts", "冒割伤拆袖箭零件", "获得旧物【袖箭扳指】，气血 -8", "拆卸时弹簧割伤手臂。你把可用零件组入袖箭扳指，避开巡兵带走。", [
        effect("gain_relic", 0, "sleeve_trigger"),
        effect("hp", -8)
      ]),
      choice("blow_the_row", "冒火炸箱，断后续补给", "气血 -10，随机升级 1 张牌，1 名宿敌阶数 -1", "操练单里的发力法记牢了，引线才点燃。爆燃灼开你的伤口，追兵下一批军械也毁在火里。", [
        effect("hp", -10),
        effect("upgrade_random_card"),
        effect("nemesis_shift", -1)
      ])
    ]),
    eventDef("act5_broken_tide_shrine", 5, "断潮神龛", "船搁在神龛下的浅滩。船夫请你搭手入潮，示范着卸力步法；歇手后能替你调息。旁边香柜夹在碎礁里，砸开能拿盘缠，却容易伤腿，也就顾不上推船求教了。", [
      choice("bleed_for_a_path", "忍伤推船，求教调息", "气血 -10，最大气血 +4，获得 1 张本流派招式", "你被船底擦伤，仍把船推入潮里。船夫教你卸力步法和调息，旧伤牵扯呼吸的毛病也轻了些。", [
        effect("hp", -10),
        effect("max_hp", 4),
        effect("gain_card", 0, "style")
      ]),
      choice("break_the_offering_box", "冒落石砸香柜取钱", "获得 35 大洋，最大气血 -4", "香柜砸开，大洋滚到手边。滑落的礁石伤了膝骨，这条腿往后很难再像从前一样发力。", [
        effect("gold", 35),
        effect("max_hp", -4)
      ])
    ]),
    eventDef("act5_last_letter", 5, "最后一封家书", "桥洞里藏着同门的家书、练招札记和亡命怀表。你可以留下读信、对照札记，再敷药歇脚；也可以带表赶接应，但近路要赤脚涉过满是碎木的浅滩。", [
      choice("read_then_burn", "读完家书，歇脚后焚信", "随机移除 1 张牌，最大气血 +4", "家书问新袄合不合身，没提催他回去。你读完信，按札记弃去一式冗招，敷药歇过脚，才烧掉写着姓名的纸页。", [
        effect("remove_random_card"),
        effect("max_hp", 4)
      ]),
      choice("strap_on_the_watch", "带上怀表赶路", "获得旧物【亡命怀表】，气血 -6", "怀表收好，信和札记留在原处。你没敷药便涉过浅滩，碎木划开脚掌；接应还在前头，表针一刻不停。", [
        effect("gain_relic", 0, "doomed_watch"),
        effect("hp", -6)
      ])
    ])
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nextSeed(seed) {
    return (seed * 1664525 + 1013904223) >>> 0;
  }

  function hashString(text) {
    var value = String(text || "");
    var hash = 2166136261;
    var i = 0;
    for (i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function pushUnique(list, value) {
    var nextList = Array.isArray(list) ? list.slice() : [];
    if (nextList.indexOf(value) === -1) {
      nextList.push(value);
    }
    return nextList;
  }

  function trimHistory(list) {
    var history = Array.isArray(list) ? list.slice() : [];
    if (history.length > HISTORY_LIMIT) {
      history = history.slice(history.length - HISTORY_LIMIT);
    }
    return history;
  }

  function getCurrentNodeId(state) {
    return state && state.map && state.map.currentNodeId ?
      (state.map.actNumber || 1) + ":" + state.map.currentNodeId : null;
  }

  function getActNumber(state) {
    return Math.max(1, Math.min(5, state && state.map ? Number(state.map.actNumber) || 1 : 1));
  }

  function ensureDeck(nextState) {
    if (!nextState.player.masterDeckNames || nextState.player.masterDeckNames.length === 0) {
      nextState.player.masterDeckNames = G.cards.getStarterDeck(nextState.player.chosenStyle || "blade");
    } else {
      nextState.player.masterDeckNames = nextState.player.masterDeckNames.slice();
    }
    nextState.player.deckSize = nextState.player.masterDeckNames.length;
    return nextState;
  }

  function ensureRuntimeState(nextState) {
    nextState.player = nextState.player || {};
    nextState.player.hp = typeof nextState.player.hp === "number" ? nextState.player.hp : 80;
    nextState.player.maxHp = typeof nextState.player.maxHp === "number" ? nextState.player.maxHp : 80;
    nextState.player.gold = typeof nextState.player.gold === "number" ? nextState.player.gold : 100;
    nextState.player.chosenStyle = nextState.player.chosenStyle || "blade";
    nextState = ensureDeck(nextState);
    nextState.nemesis = nextState.nemesis || {};
    nextState.nemesis.pool = Array.isArray(nextState.nemesis.pool) ? nextState.nemesis.pool.slice() : [];
    nextState.events = Object.assign({ seenIds: [], nextSeed: 1900, history: [] }, nextState.events || {});
    nextState.events.seenIds = Array.isArray(nextState.events.seenIds) ? nextState.events.seenIds.slice() : [];
    nextState.events.history = Array.isArray(nextState.events.history) ? nextState.events.history.slice() : [];
    nextState.events.nextSeed = (Number(nextState.events.nextSeed) || 1900) >>> 0;
    return nextState;
  }

  function choice(id, label, preview, resultText, effects) {
    return { id: id, label: label, preview: preview, resultText: resultText, effects: effects };
  }

  function eventDef(id, act, title, body, choices) {
    return { id: id, act: act, title: title, body: body, choices: choices };
  }

  function effect(type, amount, extra) {
    var result = { type: type };
    if (typeof amount !== "undefined") {
      result.amount = amount;
    }
    if (typeof extra === "string") {
      result.source = extra;
      result.relicId = extra;
    }
    return result;
  }

  function pullSeed(nextState, salt) {
    var mixed = (nextState.events.nextSeed ^ hashString(salt || "event")) >>> 0;
    nextState.events.nextSeed = nextSeed(mixed || 1900);
    return nextState.events.nextSeed;
  }

  function updateDeckSize(nextState) {
    nextState.player.deckSize = Array.isArray(nextState.player.masterDeckNames) ? nextState.player.masterDeckNames.length : 0;
    return nextState;
  }

  function pickRewardCard(nextState, source, salt) {
    var chosenStyle = nextState.player.chosenStyle || "blade";
    var built = G.cards.buildRewardOptions(chosenStyle, pullSeed(nextState, "card:" + source + ":" + salt));
    var options = built.options || [];
    var picked = null;
    nextState.events.nextSeed = built.nextSeed;
    if (source === "style") {
      picked = options.find(function (option) { return option.style === chosenStyle; });
    } else if (source === "offstyle") {
      picked = options.find(function (option) { return option.style !== chosenStyle; });
    } else {
      picked = options[0];
    }
    return picked || options[0] || null;
  }

  function applyHpDelta(nextState, amount) {
    var before = nextState.player.hp;
    nextState.player.hp = Math.max(1, Math.min(nextState.player.maxHp, nextState.player.hp + amount));
    if (nextState.player.hp === before) {
      return amount >= 0 ? "气血没有继续回上来" : "气血已被逼到极限";
    }
    return nextState.player.hp > before ?
      "恢复气血 " + Math.abs(nextState.player.hp - before) :
      "气血 -" + Math.abs(nextState.player.hp - before);
  }

  function applyMaxHpDelta(nextState, amount) {
    var beforeMax = nextState.player.maxHp;
    nextState.player.maxHp = Math.max(MIN_MAX_HP, nextState.player.maxHp + amount);
    nextState.player.hp = Math.max(1, Math.min(nextState.player.hp, nextState.player.maxHp));
    if (nextState.player.maxHp === beforeMax) {
      return amount >= 0 ? "最大气血已到当前上限" : "最大气血已压到当前下限";
    }
    return "最大气血 " + (nextState.player.maxHp > beforeMax ? "+" : "-") + Math.abs(nextState.player.maxHp - beforeMax);
  }

  function applyGoldDelta(nextState, amount) {
    var before = nextState.player.gold;
    nextState = amount >= 0 ? G.player.gainGold(nextState, amount) : G.player.spendGold(nextState, Math.abs(amount));
    return { state: nextState, summary: "大洋 " + (nextState.player.gold >= before ? "+" : "-") + Math.abs(nextState.player.gold - before) };
  }

  function applyGainCard(nextState, currentEffect, salt) {
    var picked = pickRewardCard(nextState, currentEffect.source || "reward", salt);
    if (!picked) {
      return { state: nextState, summary: "风里没有多余的招式落到你手里" };
    }
    nextState.player.masterDeckNames.push(picked.baseName || picked.name);
    if (G.journeyPreparation) G.journeyPreparation.recordGain(nextState, picked.baseName || picked.name);
    nextState = updateDeckSize(nextState);
    return { state: nextState, summary: "获得招式《" + picked.name + "》" };
  }

  function applyUpgradeRandomCard(nextState, salt) {
    var deckEntries = G.cards.buildDeckEntries(nextState.player.masterDeckNames).filter(function (entry) { return entry.canUpgrade; });
    var target = null;
    var upgraded = null;
    if (deckEntries.length === 0) {
      nextState = G.player.gainGold(nextState, 20);
      return { state: nextState, copyFallback: true, summary: "已无可再打磨的招式，改获 20 大洋" };
    }
    target = deckEntries[pullSeed(nextState, "upgrade:" + salt) % deckEntries.length];
    upgraded = G.cards.upgradeDeckCardAt(nextState.player.masterDeckNames, target.index);
    nextState.player.masterDeckNames = upgraded.deckNames;
    nextState = updateDeckSize(nextState);
    return { state: nextState, summary: "招式磨成《" + upgraded.upgradedName + "》" };
  }

  function applyRemoveRandomCard(nextState, salt) {
    var deck = nextState.player.masterDeckNames;
    var removed = null;
    if (!deck || deck.length <= 1) {
      nextState = G.player.gainGold(nextState, 20);
      return { state: nextState, copyFallback: true, summary: "牌组太薄，改获 20 大洋" };
    }
    removed = G.cards.removeDeckCardAt(deck, pullSeed(nextState, "remove:" + salt) % deck.length);
    nextState.player.masterDeckNames = removed.deckNames;
    nextState = updateDeckSize(nextState);
    return { state: nextState, summary: "失去招式《" + removed.removedName + "》" };
  }

  function applyGainRelic(nextState, relicId) {
    var relic = G.relics.getRelicById(relicId);
    if (!relic) {
      return { state: nextState, summary: "旧物线索断在了风里" };
    }
    if ((nextState.player.relics || []).indexOf(relicId) !== -1) {
      nextState = G.player.gainGold(nextState, 20);
      return { state: nextState, copyFallback: true, summary: "旧物《" + relic.name + "》已在身上，改获 20 大洋" };
    }
    nextState = G.player.addRelic(nextState, relicId);
    return { state: nextState, summary: "获得旧物《" + relic.name + "》" };
  }

  function applyNemesisShift(nextState, amount, salt, authoredReason) {
    var pool = nextState.nemesis.pool;
    var target = null;
    var beforeLevel = 0;
    var nextLevel = 0;
    var profile = null;
    if (!pool || pool.length === 0) {
      return { state: nextState, summary: "旧仇尚未追上来" };
    }
    target = pool[pullSeed(nextState, "nemesis:" + salt + ":" + amount) % pool.length];
    beforeLevel = Math.max(1, Math.min(5, Number(target.level) || 1));
    nextLevel = Math.max(1, Math.min(5, beforeLevel + amount));
    if (nextLevel === beforeLevel) {
      return { state: nextState, summary: "宿敌《" + target.name + "》的阶数未再变化" };
    }
    var eventId = nextState.event && nextState.event.eventId;
    var reasons = {
      act2_buried_flag: "旗号暴露了你的去向，追兵提前领到护具和军械补给。",
      act3_informer_confession: "密探交出了追兵的补给线，暗线趁其转移截下了行装和弹药。",
      act3_chapel_lantern: "祷房的动静传到驻军，追兵借到一批护具和军械补给。",
      act4_rail_spikes: "铁路被切断，追兵的行装和弹药滞在运输车上。",
      act4_telegraph_station: "你照密电截下补给，追兵的行装和弹药未能送到。",
      act4_payroll_ruts: "押饷队报上了你的行踪，邻营调出护具和军械支援追兵。",
      act5_arsenal_crate: "军火和行装毁在码头，追兵只能改用现有的装备。"
    };
    var fromStage = G.nemesis.getLevelProfile(beforeLevel).firearmStage;
    target.level = nextLevel;
    if (G.nemesis && typeof G.nemesis.getLevelProfile === "function") {
      profile = G.nemesis.getLevelProfile(nextLevel);
      target.title = profile.title;
      target.firearmStage = profile.firearmStage;
      target.firearmStep = 0;
    }
    target.lastPreparationChange = {
      eventId: eventId,
      eventTitle: nextState.event && nextState.event.title,
      fromLevel: beforeLevel,
      toLevel: nextLevel,
      fromStage: fromStage,
      toStage: target.firearmStage,
      reason: authoredReason || reasons[eventId] || (amount > 0 ? "追兵重新接上了护具和军械补给。" : "追兵的护具和军械补给遭到截断。")
    };
    var loadout = target.firearmStage === "none" ?
      (fromStage !== "none" ? "原枪缺弹，改用旧兵刃" : "旧兵刃迎战") :
      "可用" + G.nemesis.getFirearmLabel(target.firearmStage);
    return { state: nextState, summary: "宿敌《" + target.name + "》阶数 " + (nextLevel > beforeLevel ? "+1" : "-1") + "；" + loadout, narrative: authoredReason ? null : target.lastPreparationChange.reason };
  }

  function applyEffect(nextState, currentEffect, salt) {
    var goldResult = null;
    if (!currentEffect || !currentEffect.type) {
      return { state: nextState, summary: null };
    }
    if (currentEffect.type === "hp") {
      return { state: nextState, summary: applyHpDelta(nextState, Number(currentEffect.amount) || 0) };
    }
    if (currentEffect.type === "max_hp") {
      return { state: nextState, summary: applyMaxHpDelta(nextState, Number(currentEffect.amount) || 0) };
    }
    if (currentEffect.type === "gold") {
      goldResult = applyGoldDelta(nextState, Number(currentEffect.amount) || 0);
      return goldResult;
    }
    if (currentEffect.type === "gain_card") {
      return applyGainCard(nextState, currentEffect, salt);
    }
    if (currentEffect.type === "upgrade_random_card") {
      return applyUpgradeRandomCard(nextState, salt);
    }
    if (currentEffect.type === "remove_random_card") {
      return applyRemoveRandomCard(nextState, salt);
    }
    if (currentEffect.type === "gain_relic") {
      return applyGainRelic(nextState, currentEffect.relicId);
    }
    if (currentEffect.type === "nemesis_shift") {
      return applyNemesisShift(nextState, Number(currentEffect.amount) || 0, salt, currentEffect.reason);
    }
    return { state: nextState, summary: null };
  }

  function buildMapNote(eventState) {
    var headline = eventState && eventState.title ? "你从《" + eventState.title + "》里走出" : "你从奇遇里走出";
    var summary = Array.isArray(eventState.resultSummary) ? eventState.resultSummary.slice(0, 3) : [];
    return summary.length === 0 ? headline + "。" : headline + "：" + summary.join("；") + "。";
  }

  function pickDefinition(nextState, nodeId) {
    var later = G.eventConsequences && G.eventConsequences.pick(nextState, nodeId);
    if (later) return later;
    var actNumber = getActNumber(nextState);
    var candidates = definitions.filter(function (definition) { return definition.act === actNumber && nextState.events.seenIds.indexOf(definition.id) === -1; });
    if (candidates.length === 0) {
      candidates = definitions.filter(function (definition) { return definition.act === actNumber; });
    }
    if (candidates.length === 0) {
      candidates = definitions.slice();
    }
    return clone(candidates[pullSeed(nextState, "event:" + actNumber + ":" + nodeId + ":" + nextState.events.seenIds.length) % candidates.length]);
  }

  function isPreparedForCurrentNode(state) {
    var nodeId = getCurrentNodeId(state) || "manual_event";
    return !!state && !!state.events && Array.isArray(state.events.seenIds) && !!state.event && state.event.nodeId === nodeId && state.event.eventId && Array.isArray(state.event.choices);
  }

  function prepareSceneState(state) {
    var nextState = null;
    var definition = null;
    var nodeId = null;
    if (isPreparedForCurrentNode(state)) {
      // Only the .47 additions receive this editorial revision. Rebuild their
      // contextual copy, then match the already offered choice identities;
      // never replace saved effects, resources, seeds or committed receipts.
      if (state.event.mode === "choice" && G.journeyEvents?.art[state.event.eventId] && ![4, 6].includes(state.event.copyRevision)) {
        nextState = clone(state);
        var echo = nextState.event.consequence;
        definition = echo ? G.journeyEvents.build(nextState, echo.chain, echo.variant,
          G.eventConsequences.origin(nextState, echo.chain) || { id: "", choice: "" },
          G.eventConsequences.context(nextState)) : G.journeyEvents.ordinary.find(function (entry) { return entry.id === nextState.event.eventId; });
        if (definition) {
          nextState.event.body = definition.body;
          nextState.event.choices.forEach(function (entry) {
            var revised = definition.choices.find(function (choice) { return choice.id === entry.id; });
            if (revised) {
              entry.label = revised.label; entry.resultText = revised.resultText;
              if (revised.aftermath) entry.aftermath = revised.aftermath;
              if (revised.fallbackResultText) entry.fallbackResultText = revised.fallbackResultText;
            }
          });
          nextState.event.copyRevision = 6;
          return nextState;
        }
      }
      // Upgrade unresolved copy only; preserve committed results/history and
      // the save's exact effect arrays, RNG and resources.
      if (state.event.mode === "choice" && ![3, 5].includes(state.event.copyRevision) && !G.journeyEvents?.art[state.event.eventId]) {
        definition = definitions.find(function (entry) { return entry.id === state.event.eventId; });
        if (definition) {
          nextState = clone(state);
          nextState.event.body = definition.body;
          nextState.event.choices.forEach(function (entry) {
            var revised = definition.choices.find(function (choice) { return choice.id === entry.id; });
            if (revised) { entry.label = revised.label; entry.resultText = revised.resultText; }
          });
          nextState.event.copyRevision = 5;
          nextState.event.continueLabel = "继续赶路";
          return nextState;
        }
      }
      return state;
    }
    nextState = ensureRuntimeState(clone(state));
    nodeId = getCurrentNodeId(nextState) || "manual_event";
    definition = pickDefinition(nextState, nodeId);
    nextState.event = {
      nodeId: nodeId,
      actNumber: getActNumber(nextState),
      actTitle: nextState.map && nextState.map.actTitle ? nextState.map.actTitle : "乱世奇遇",
      eventId: definition.id,
      title: definition.title,
      body: definition.body,
      choices: clone(definition.choices),
      consequence: definition.consequence ? clone(definition.consequence) : null,
      copyRevision: G.journeyEvents?.art[definition.id] ? 6 : 5,
      mode: "choice",
      selectedChoiceId: null,
      selectedChoiceLabel: null,
      resultText: "",
      resultSummary: [],
      continueLabel: "继续赶路",
      mapNote: ""
    };
    nextState.scene = "event";
    return nextState;
  }

  function getChoicePreview(state, choiceId) {
    var currentChoice = state.event && state.event.choices.find(function (entry) { return entry.id === choiceId; });
    if (!currentChoice) return "";
    var preview = currentChoice.preview.replaceAll("境界", "阶数");
    // Resolve deterministic limits and reward fallbacks. Random targets stay unknown and
    // no event seed, player state or persistent record is consumed by reading.
    var projected = { player: { hp: state.player.hp, maxHp: state.player.maxHp } };
    var hasHpEffect = false;
    var hasMaxHpEffect = false;
    (currentChoice.effects || []).forEach(function (currentEffect) {
      var amount = Number(currentEffect.amount) || 0;
      if (currentEffect.type === "hp") {
        hasHpEffect = true;
        applyHpDelta(projected, amount);
      } else if (currentEffect.type === "max_hp") {
        hasMaxHpEffect = true;
        applyMaxHpDelta(projected, amount);
      }
    });
    var delta = projected.player.hp - state.player.hp;
    var value = delta > 0 ? "恢复 " + delta + " 气血" : delta < 0 ? "气血 -" + Math.abs(delta) : "气血不变";
    if (hasHpEffect) {
      preview = preview.replace(/恢复\s*\d+\s*气血|(?<!最大)气血\s*[+-]\s*\d+/, value);
    } else if (delta) {
      // A lower maximum can also reduce current HP; show that consequence.
      preview += "，" + value;
    }
    if (hasMaxHpEffect) {
      var change = projected.player.maxHp - state.player.maxHp;
      preview = preview.replace(/最大气血\s*[+-]\s*\d+/, change ? "最大气血 " + (change > 0 ? "+" : "-") + Math.abs(change) : "最大气血不变");
    }
    (currentChoice.effects || []).forEach(function (currentEffect) {
      if (currentEffect.type === "upgrade_random_card" && !G.cards.buildDeckEntries(state.player.masterDeckNames).some(function (entry) { return entry.canUpgrade; })) {
        preview = preview.replace("随机升级 1 张牌", "已无可精进招式，改获 20 大洋");
      } else if (currentEffect.type === "remove_random_card" && state.player.masterDeckNames.length <= 1) {
        preview = preview.replace("随机移除 1 张牌", "仅剩 1 张牌，改获 20 大洋");
      } else if (currentEffect.type === "gain_relic" && (state.player.relics || []).indexOf(currentEffect.relicId) !== -1) {
        preview = preview.replace(/获得旧物【[^】]+】/, "已持有此旧物，改获 20 大洋");
      } else if (currentEffect.type === "nemesis_shift") {
        var pool = state.nemesis && state.nemesis.pool || [];
        var direction = Number(currentEffect.amount) > 0 ? 1 : -1;
        var limited = !pool.length || pool.every(function (entry) { return direction > 0 ? entry.level >= 5 : entry.level <= 1; });
        preview = preview.replace(/1 名宿敌阶数 [+-]1/, !pool.length ? "暂无宿敌，阶数不变" : limited ? "宿敌已达" + (direction > 0 ? "最高" : "最低") + "阶，阶数不变" : "1 名宿敌阶数 " + (direction > 0 ? "+1（最高 5 阶）" : "-1（最低 1 阶）"));
      }
    });
    return preview;
  }

  // Alternative prose follows the already existing 20-gold conversion rule.
  // These lines must not claim that an unavailable upgrade/removal/relic occurred.
  var fallbackResults = {
    "act1_teahouse_poison:drink_anyway": "你护着拳师冲过巷口，臂上挨了一刀。他看过你的招式，已没有能指点的地方，便取出二十块大洋酬谢。",
    "act2_bandit_dice_bowl:smash_the_table": "你收下十五块大洋。札记里的诀窍已用不上，折作二十块大洋一并收下，余款就此两清。",
    "act3_bridge_performance:hide_the_edge": "老拳师看过你的招式，已无处可改，便赠你二十块大洋作盘缠。你随他调息歇脚，旧伤不再处处牵扯呼吸。",
    "act4_rail_spikes:help_the_workers": "轨钉松开时，你被撬杠砸伤。工人的借力法已不能帮你改招，他们便凑了二十块大洋酬谢。支线已断，运械车过不来了。",
    "act5_arsenal_crate:blow_the_row": "操练单已不能帮你改招，你收起箱内二十块大洋，点燃引线。爆燃灼开伤口，追兵下一批军械也毁在火里。",
    "act1_execution_notice:cut_the_rope": "箭擦过肩头，你将同门放下安葬，带走衣内札记。手中只剩最后一式，不能再弃；这次改得二十块大洋。",
    "act2_buried_flag:bury_it": "你埋好旧旗，在背风处敷药调息，旧伤松开一处。手中只剩最后一式，不能再弃；这次改得二十块大洋。",
    "act5_last_letter:read_then_burn": "信读完了，你在桥洞敷药歇息，再把写着姓名的纸页烧掉。手中只剩最后一式，不能再弃；这次改得二十块大洋。",
    "act1_river_shrine:take_the_blade": "你翻过龛沿，虎口被碎瓷划开，药包留给了仍坐在龛旁的人。身上已有同样的砍刀，这次旧物折作二十块大洋。",
    "act2_overturned_caravan:free_the_horse": "你拖伤员离车，受了马蹄一击，再替驮马解脱。身上已有血绷带，伤员改以二十块大洋酬谢。",
    "act3_chapel_lantern:snuff_and_take": "你熄灯摸开侧柜，又从巡哨的脚步声间退出。看守仍没醒。身上已有锈护心镜，这次旧物折作二十块大洋。",
    "act5_arsenal_crate:carry_the_parts": "拆卸时弹簧割伤手臂。身上已有袖箭扳指，这批零件折作二十块大洋。你收好所得，避开巡兵离开。",
    "act5_last_letter:strap_on_the_watch": "身上已有亡命怀表，这次旧物折作二十块大洋。你把信和札记留在原处，没敷药便涉过浅滩，碎木划开脚掌。接应还在前头，表针一刻不停。"
  };

  function applyChoice(state, choiceId) {
    var nextState = prepareSceneState(state);
    var currentChoice = null;
    var result = null;
    var summaries = [];
    var consequenceLines = [];
    var copyFallback = false;
    var i = 0;
    if (nextState.event.mode !== "choice") {
      return nextState;
    }
    for (i = 0; i < nextState.event.choices.length; i += 1) {
      if (nextState.event.choices[i].id === choiceId) {
        currentChoice = clone(nextState.event.choices[i]);
        break;
      }
    }
    if (!currentChoice) {
      return nextState;
    }
    for (i = 0; i < currentChoice.effects.length; i += 1) {
      if (nextState.event.consequence && currentChoice.effects[i].type === "nemesis_shift") currentChoice.effects[i].reason = currentChoice.resultText;
      result = applyEffect(nextState, currentChoice.effects[i], nextState.event.eventId + ":" + currentChoice.id + ":" + i);
      nextState = result.state;
      copyFallback = copyFallback || !!result.copyFallback;
      if (result.summary) {
        summaries.push(result.summary);
      }
      if (result.narrative) consequenceLines.push(result.narrative);
    }
    nextState.events.seenIds = pushUnique(nextState.events.seenIds, nextState.event.eventId);
    nextState.events.history = trimHistory(nextState.events.history.concat({
      eventId: nextState.event.eventId,
      title: nextState.event.title,
      choiceId: currentChoice.id,
      choiceLabel: currentChoice.label,
      actNumber: nextState.event.actNumber,
      summaries: summaries.slice()
    }));
    if (G.eventConsequences) G.eventConsequences.record(nextState, nextState.event, currentChoice);
    nextState.event.mode = "result";
    nextState.event.selectedChoiceId = currentChoice.id;
    nextState.event.selectedChoiceLabel = currentChoice.label;
    nextState.event.resultText = (copyFallback ? currentChoice.fallbackResultText || fallbackResults[nextState.event.eventId + ":" + currentChoice.id] || currentChoice.resultText : currentChoice.resultText) + consequenceLines.join("");
    nextState.event.resultSummary = summaries;
    nextState.event.mapNote = buildMapNote(nextState.event);
    return nextState;
  }

  function leaveScene(state) {
    var nextState = ensureRuntimeState(clone(state));
    nextState.map = nextState.map || {};
    nextState.map.note = nextState.event && nextState.event.mapNote ? nextState.event.mapNote : "你从奇遇里走出。";
    nextState.map.lastEventId = nextState.event ? nextState.event.eventId : null;
    nextState.map.lastEventChoice = nextState.event ? nextState.event.selectedChoiceLabel : null;
    nextState.scene = "map";
    if (G.scenes.map && typeof G.scenes.map.prepareState === "function") {
      nextState = G.scenes.map.prepareState(nextState);
    }
    return nextState;
  }

  if (G.journeyEvents) definitions = definitions.concat(clone(G.journeyEvents.ordinary));
  G.events.definitions = definitions;
  G.events.ensureState = ensureRuntimeState;
  G.events.prepareSceneState = prepareSceneState;
  G.events.applyChoice = applyChoice;
  G.events.getChoicePreview = getChoicePreview;
  G.events.leaveScene = leaveScene;
})();
