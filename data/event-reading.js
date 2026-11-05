/* Event reading layer. Pure presentation; effects/IDs/RNG stay in their original definitions. */
(function(){
 'use strict';
 const copy={
  "events": [
    {
      "id": "act1_child_in_embers",
      "body": "火梁下，孩子的哭声渐弱。父亲被搜兵挡在街口，护身札记攥皱了也递不进来。墙根落着钱袋，另一条退路尽是毒烟。火梁已开始往下沉。",
      "choices": [
        {
          "id": "carry_out",
          "label": "冒火背出孩子",
          "detail": "火梁随时塌下，父亲正攥着护身札记等在街口。"
        },
        {
          "id": "walk_away",
          "label": "拾钱袋，穿烟巷",
          "detail": "钱袋就在手边，但滚烫黑烟正往巷子里灌。"
        }
      ],
      "originalBody": "火梁下，孩子的哭声渐弱。父亲被搜兵挡在街口，护身札记攥皱了也递不进来。墙根落着钱袋，另一条退路尽是毒烟。火梁已开始往下沉。"
    },
    {
      "id": "act1_execution_notice",
      "body": "城门横木上吊着旧营同门，衣襟里露出半截校招札记。弓手守着尸身，差役在下面收旧营凭据、发赏银。你认得那本札记，往日拆招时他总夹在腰间。",
      "choices": [
        {
          "id": "cut_the_rope",
          "label": "冒箭收殓，取札记",
          "detail": "城头冷箭未收，他怀里的旧谱还露着半截。"
        },
        {
          "id": "claim_the_bounty",
          "label": "交同门凭据领赏",
          "detail": "差役手里有现银，但上前按印就得挨盘查。"
        }
      ],
      "originalBody": "城门横木上吊着旧营同门，衣襟里露出半截校招札记。弓手守着尸身，差役在下面收旧营凭据、发赏银。你认得那本札记，往日拆招时他总夹在腰间。"
    },
    {
      "id": "act1_teahouse_poison",
      "body": "拳师把茶盏放回桌上，压低声音：“搜兵盯上我了，劳你送过前巷。”巷口刀枪未收，他的钱绳和别派招谱还塞在桌下。你可护他过巷，也可掀桌夺走东西。",
      "choices": [
        {
          "id": "drink_anyway",
          "label": "护拳师过巷",
          "detail": "前巷已有搜兵拦路，他答应过后指点你发力。"
        },
        {
          "id": "flip_the_table",
          "label": "掀桌夺钱与杂招",
          "detail": "趁他负伤翻脸动手，桌下的钱绳和招谱都能拿走。"
        }
      ],
      "originalBody": "拳师把茶盏放回桌上，压低声音：“搜兵盯上我了，劳你送过前巷。”巷口刀枪未收，他的钱绳和别派招谱还塞在桌下。你可护他过巷，也可掀桌夺走东西。"
    },
    {
      "id": "act1_river_shrine",
      "body": "负伤拳师靠着河神龛，药包压在膝上，供刀还横在身旁。搜兵的脚步越来越近，他指指你的旧创：“引开他们，回来我替你治。”龛沿撒着碎瓷，抄刀就走也得伤手。",
      "choices": [
        {
          "id": "blood_oath",
          "label": "引开搜兵，换治伤",
          "detail": "把追兵引向别处，脱身后再回来让他清理旧创。"
        },
        {
          "id": "take_the_blade",
          "label": "翻龛取刀",
          "detail": "不理会他的请求，越过满是碎瓷的龛沿抄走砍刀。"
        }
      ],
      "originalBody": "负伤拳师靠着河神龛，药包压在膝上，供刀还横在身旁。搜兵的脚步越来越近，他指指你的旧创：“引开他们，回来我替你治。”龛沿撒着碎瓷，抄刀就走也得伤手。"
    },
    {
      "id": "act2_cinder_cistern",
      "body": "水窖里，伤兵接过水壶喝了一口，又捧给同伴。他们想留些水赶路，药包已摊在你脚边。你可留下水壶换药，也可夺回独饮；硬抢会牵动肋下旧创。",
      "choices": [
        {
          "id": "share_water",
          "label": "留下水，换药",
          "detail": "忍住干渴把水让出，让他们替你清理伤口。"
        },
        {
          "id": "drink_alone",
          "label": "夺回水壶，独饮",
          "detail": "趁他们力弱硬夺回来，撕扯间难保不扯裂旧伤。"
        }
      ],
      "originalBody": "水壶递过去，伤兵喝了一口，又捧给旁边的人。他们想留些水走余下的路，药包已摊在你脚边。你可留下水换药，也可夺回独饮；争抢会牵动肋下旧创。"
    },
    {
      "id": "act2_overturned_caravan",
      "body": "驿道边粮车翻进深沟，断辕压着护车伤员，受惊的驮马还在乱踢。伤员指着腰间浸药的绷带喊你搭救；断板另一头卡着只沉重银箱，车架眼看就要散塌。",
      "choices": [
        {
          "id": "free_the_horse",
          "label": "救伤员，替马解绳",
          "detail": "受惊驮马还在乱蹬，伤员愿拿浸药的绷带谢你。"
        },
        {
          "id": "loot_the_silver",
          "label": "拖走银箱",
          "detail": "趁车架彻底散塌前硬拽银箱，顾不上沟底伤员。"
        }
      ],
      "originalBody": "驿道边粮车翻进深沟，断辕压着护车伤员，受惊的驮马还在乱踢。伤员指着腰间浸药的绷带喊你搭救；断板另一头卡着只沉重银箱，车架眼看就要散塌。"
    },
    {
      "id": "act2_bandit_dice_bowl",
      "body": "整袋赌资赢下了，马匪却按着钱袋，要你割肉才认账。马匪另提了个价：分你一部分盘缠，再添一本擒拿札记，余下的钱就此两清。",
      "choices": [
        {
          "id": "bet_your_life",
          "label": "割肉换整袋赌资",
          "detail": "照赌桌规矩挨这一刀，逼马匪交出赢下的整袋赌资。"
        },
        {
          "id": "smash_the_table",
          "label": "收下盘缠与札记",
          "detail": "少拿些盘缠免去皮肉伤，收下那本擒拿札记就此两清。"
        }
      ],
      "originalBody": "五十块大洋赢下了，马匪却按着钱袋，要你割肉才认账。马匪另提了个价：十五块大洋，再加一本擒拿札记，余下的钱就此两清。"
    },
    {
      "id": "act2_buried_flag",
      "body": "旧旗裹着操练册，暗线药包藏在旗坑旁。埋旗歇脚，可舍去僵招、处理旧伤；扛旗带册能拾回本门招数，却会把行踪亮给追兵。",
      "choices": [
        {
          "id": "bury_it",
          "label": "埋旗歇脚，弃旧招",
          "detail": "掩埋旧营旗号，借背风处敷药，改掉手里僵招。"
        },
        {
          "id": "carry_it",
          "label": "扛旗带走操练册",
          "detail": "取回操练册里的老招，但旗影容易引来沿路追兵。"
        }
      ],
      "originalBody": "旧旗裹着操练册，暗线药包藏在旗坑旁。埋旗歇脚，可舍去僵招、处理旧伤；扛旗带册能拾回本门招数，却会把行踪亮给追兵。"
    },
    {
      "id": "act3_foreign_clinic",
      "body": "诊所肯为逃难者缝合新伤、取出旧创碎片。药柜里有值钱麻药，门房的杂门护院谱也挂在旁边；若抢走，就得冒铁棍翻窗，来不及治伤。",
      "choices": [
        {
          "id": "let_him_stitch",
          "label": "留下缝合，治旧创",
          "detail": "趁眼下安稳请医生取出碎片，把新旧伤一并处理。"
        },
        {
          "id": "grab_the_meds",
          "label": "夺药与杂谱，翻窗走",
          "detail": "麻药值钱、护院谱顺手，但门房提着铁棍守在窗边。"
        }
      ],
      "originalBody": "诊所肯为逃难者缝合新伤、取出旧创碎片。药柜里有值钱麻药，门房的杂门护院谱也挂在旁边；若抢走，就得冒铁棍翻窗，来不及治伤。"
    },
    {
      "id": "act3_bridge_performance",
      "body": "看客围着场子等你出手，几趟硬招便能挣下盘缠。桥阴的老拳师却朝你招手：“脚下虚了，先收势。”随他校招调息，就赶不上这场赏钱；继续演练，伤口还得硬撑。",
      "choices": [
        {
          "id": "perform_for_coins",
          "label": "忍伤卖艺挣盘缠",
          "detail": "看客已经掏出铜元大洋，只是几趟硬招会牵动伤口。"
        },
        {
          "id": "hide_the_edge",
          "label": "放弃赏钱，随师校招",
          "detail": "趁老拳师肯指点，到桥阴压稳步子、顺一顺气息。"
        }
      ],
      "originalBody": "看客围着场子等你出手，几趟硬招便能挣下盘缠。桥阴的老拳师却朝你招手：“脚下虚了，先收势。”随他校招调息，就赶不上这场赏钱；继续演练，伤口还得硬撑。"
    },
    {
      "id": "act3_informer_confession",
      "body": "断指密探把追兵补给去向和旧营护身谱塞向你，求你拦住街口刀手。刀手却亮出钱袋要你让开；他已认出你的脸，拿钱也未必能全身退开。",
      "choices": [
        {
          "id": "take_the_hit",
          "label": "挡刀救人，取口供",
          "detail": "迎住刀手护密探进巷，收下补给去向和护身谱。"
        },
        {
          "id": "push_him_out",
          "label": "交人拿钱，冒险脱身",
          "detail": "收钱让开通路，但刀手眼神不善，退身时得防反扑。"
        }
      ],
      "originalBody": "断指密探把追兵补给去向和旧营护身谱塞向你，求你拦住街口刀手。刀手却亮出钱袋要你让开；他已认出你的脸，拿钱也未必能全身退开。"
    },
    {
      "id": "act3_chapel_lantern",
      "body": "睡着的看守身旁，一只侧柜放着护心镜，另一只锁柜压着军需钱。巡哨将回：轻手取镜可无声离开，砸锁拿钱就会惊动追兵。",
      "choices": [
        {
          "id": "snuff_and_take",
          "label": "轻手取镜，悄然离开",
          "detail": "趁看守熟睡摸开侧柜，赶在巡哨折返前脱身。"
        },
        {
          "id": "overturn_the_altar",
          "label": "砸柜夺钱，惊动巡哨",
          "detail": "锁柜里压着军需现钱，但破锁声势必引来追兵。"
        }
      ],
      "originalBody": "睡着的看守身旁，一只侧柜放着护心镜，另一只锁柜压着军需钱。巡哨将回：轻手取镜可无声离开，砸锁拿钱就会惊动追兵。"
    },
    {
      "id": "act4_rail_spikes",
      "body": "工人正拆运械支线，老工匠喊你搭手，把撬杠递来：“肩别硬扛，借腰上的劲。”带伤出力会扯开伤口。军需队也在收钉包，肯付现钱，却要当面盘查身份。",
      "choices": [
        {
          "id": "help_the_workers",
          "label": "帮工人拆轨",
          "detail": "带伤搭手起出轨钉，截断运械支线，顺便学他借腰发力。"
        },
        {
          "id": "sell_to_quartermaster",
          "label": "向军需队卖钉包",
          "detail": "军需队给现钱痛快，但上前交货得应付押车兵盘查。"
        }
      ],
      "originalBody": "工人正拆运械支线，老工匠喊你搭手，把撬杠递来：“肩别硬扛，借腰上的劲。”带伤出力会扯开伤口。军需队也在收钉包，肯付现钱，却要当面盘查身份。"
    },
    {
      "id": "act4_telegraph_station",
      "body": "密电夹着补给时刻和杂门操练页，值夜兵的盘缠压在另一头。巡兵将回：抄密电能给暗线断供线索；若抢钱烧屋，就得冒着火险捞出那页散招。",
      "choices": [
        {
          "id": "intercept_wire",
          "label": "抄密电，交暗线断供",
          "detail": "抓紧记下补给时刻并带走夹页，赶在巡兵进门前离开。"
        },
        {
          "id": "burn_the_room",
          "label": "抢盘缠与散招，烧屋",
          "detail": "抄走盘缠和散招再放火毁迹，但冲出火场难免灼伤。"
        }
      ],
      "originalBody": "密电夹着补给时刻和杂门操练页，值夜兵的盘缠压在另一头。巡兵将回：抄密电能给暗线断供线索；若抢钱烧屋，就得冒着火险捞出那页散招。"
    },
    {
      "id": "act4_field_hospital",
      "body": "医院的担架排到了门外。医官卷着袖口喊人搭手，药盘里还放着吗啡。留下搬担架会扯伤，忙完能清创治旧患；偷药虽能压痛赶路，深伤却会继续拖重。",
      "choices": [
        {
          "id": "steal_morphine",
          "label": "偷药压痛，带深伤走",
          "detail": "趁乱摸走吗啡止痛赶路，只是深处旧伤会被生生压住。"
        },
        {
          "id": "leave_it_for_them",
          "label": "忍伤搬担架，换清创",
          "detail": "先忍痛帮医官安置伤员，等他腾出手替你彻底清创。"
        }
      ],
      "originalBody": "医院的担架排到了门外。医官卷着袖口喊人搭手，药盘里还放着吗啡。留下搬担架会扯伤，忙完能清创治旧患；偷药虽能压痛赶路，深伤却会继续拖重。"
    },
    {
      "id": "act4_payroll_ruts",
      "body": "押军饷车的少年兵停下来，领头的递出军医伤药和护身谱，只求放他们过去。后头追缉骑兵将至，另一个小兵攥着示警火筒。截下军饷能拿钱，也会招来追兵。",
      "choices": [
        {
          "id": "take_the_payroll",
          "label": "截饷拿钱，冒示警",
          "detail": "车上是整批军饷，但小兵手里的火筒随时会引来骑兵。"
        },
        {
          "id": "let_them_pass",
          "label": "放行换护身法与药",
          "detail": "收下他们递来的伤药与护身谱，趁骑兵未至各走各路。"
        }
      ],
      "originalBody": "押军饷车的少年兵停下来，领头的递出军医伤药和护身谱，只求放他们过去。后头追缉骑兵将至，另一个小兵攥着示警火筒。截下军饷能拿钱，也会招来追兵。"
    },
    {
      "id": "act5_refugee_boat",
      "body": "破船压得太低，孩子还挤不上舷。船夫喊你先帮着卸货，伸手指了指药包：“旧伤上船给你看，撑船卸力的法子也教你。”抢包袱和船位更快，舷边却翘着断钉。",
      "choices": [
        {
          "id": "lift_the_child",
          "label": "忍伤卸货，救孩子",
          "detail": "顶住拥挤先托孩子上船，船夫答应过后替你敷药指点。"
        },
        {
          "id": "steal_the_last_seat",
          "label": "夺包袱，抢上船",
          "detail": "抓过盘缠包袱直接翻舷，但落脚处全是翘起的断钉。"
        }
      ],
      "originalBody": "破船压得太低，孩子还挤不上舷。船夫喊你先帮着卸货，伸手指了指药包：“旧伤上船给你看，撑船卸力的法子也教你。”抢包袱和船位更快，舷边却翘着断钉。"
    },
    {
      "id": "act5_arsenal_crate",
      "body": "军械就要运给追兵。拆袖箭零件，须冒弹簧割手的险；留下记好操练单，再贴箱安引线，能断下一批补给，却得挨更重的烧伤。",
      "choices": [
        {
          "id": "carry_the_parts",
          "label": "冒割伤拆袖箭零件",
          "detail": "趁巡兵未觉拆走机括零件，但箱内弹簧崩得很紧。"
        },
        {
          "id": "blow_the_row",
          "label": "冒火炸箱，断后续补给",
          "detail": "记下操练单后贴箱点火，毁掉军械，但撤离时难避爆燃。"
        }
      ],
      "originalBody": "军械就要运给追兵。拆袖箭零件，须冒弹簧割手的险；留下记好操练单，再贴箱安引线，能断下一批补给，却得挨更重的烧伤。"
    },
    {
      "id": "act5_broken_tide_shrine",
      "body": "船搁在神龛下的浅滩。船夫请你搭手入潮，示范着卸力步法；歇手后能替你调息。旁边香柜夹在碎礁里，砸开能拿盘缠，却容易伤腿，也就顾不上推船求教了。",
      "choices": [
        {
          "id": "bleed_for_a_path",
          "label": "忍伤推船，求教调息",
          "detail": "下水顶着船底擦伤帮他入潮，再随他学步法、顺气息。"
        },
        {
          "id": "break_the_offering_box",
          "label": "冒落石砸香柜取钱",
          "detail": "香柜里有不少香火钱，但撬动碎礁很可能会砸伤腿脚。"
        }
      ],
      "originalBody": "船搁在神龛下的浅滩。船夫请你搭手入潮，示范着卸力步法；歇手后能替你调息。旁边香柜夹在碎礁里，砸开能拿盘缠，却容易伤腿，也就顾不上推船求教了。"
    },
    {
      "id": "act5_last_letter",
      "body": "桥洞里藏着同门的家书、练招札记和亡命怀表。你可以留下读信、对照札记，再敷药歇脚；也可以带表赶接应，但近路要赤脚涉过满是碎木的浅滩。",
      "choices": [
        {
          "id": "read_then_burn",
          "label": "读完家书，歇脚后焚信",
          "detail": "借桥洞敷药歇息，对照札记删去冗招，再替同门烧掉信页。"
        },
        {
          "id": "strap_on_the_watch",
          "label": "带上怀表赶路",
          "detail": "收好怀表抄近路去接应点，但浅滩水下全是尖利碎木。"
        }
      ],
      "originalBody": "桥洞里藏着同门的家书、练招札记和亡命怀表。你可以留下读信、对照札记，再敷药歇脚；也可以带表赶接应，但近路要赤脚涉过满是碎木的浅滩。"
    },
    {
      "id": "act2_courier_names",
      "body": "脚夫捆好逃难者的家信，准备往南走。若藏起姓名避查，就得有人替他蹚巡哨小路。铺主肯出钱买寻亲名单，脚夫却按住信角：“交出去，谁再抄一份，我就管不着了。”",
      "choices": [
        {
          "id": "carry_message",
          "label": "藏名带信，替脚夫走小路",
          "detail": "小路上有巡哨设卡，脚夫愿拿旧营护身谱谢你替他冒险。"
        },
        {
          "id": "show_names",
          "label": "把寻亲名单交给铺主",
          "detail": "铺主给的是现钱，但名单落进差役手里就难保寄信人平安。"
        }
      ],
      "originalBody": "脚夫捆好逃难者的家信，准备往南走。若藏起姓名避查，就得有人替他蹚巡哨小路。铺主肯出钱买寻亲名单，脚夫却按住信角：“交出去，谁再抄一份，我就管不着了。”"
    },
    {
      "id": "act3_medicine_seal",
      "body": "驮队给野战医院运药，箱上封条却少了官印。领队急着雇人搭手搬箱过哨；箱角正抵着你未愈的伤处。军需牙人只看中这箱药，解开钱袋等你点头，箱里夹着的杂谱肯留给你。",
      "choices": [
        {
          "id": "leave_for_porters",
          "label": "护药过哨，取搬箱工钱",
          "detail": "忍着箱角抵痛帮驮队过卡，只拿领队给的搬运工钱。"
        },
        {
          "id": "sell_crate",
          "label": "把药箱卖给牙人",
          "detail": "将整箱药脱手给牙人，留下夹带的杂谱，医院却断了药。"
        }
      ],
      "originalBody": "驮队给野战医院运药，箱上封条却少了官印。领队急着雇人搭手搬箱过哨；箱角正抵着你未愈的伤处。军需牙人也看中了药和夹着的杂谱，解开钱袋等你点头。"
    },
    {
      "id": "echo_family_shelter",
      "body": null,
      "choices": [
        {
          "id": "rest_inside",
          "label": "借灶房换药歇脚",
          "detail": "屋里备好了温水与伤药，趁天亮前把血衣换下。"
        },
        {
          "id": "send_word",
          "label": "托父亲捎信探路",
          "detail": "不进屋添乱，请门外相熟的脚夫替暗线打听追兵补给。"
        }
      ],
      "originalBody": "孩子在灶房里睡着，父亲认出你肩头的烧伤，把温水推来：“进屋洗洗伤。”门外相熟的脚夫正要动身，也能替他递信打听追兵补给。你可留下换药，或托他们探路。"
    },
    {
      "id": "echo_family_watched",
      "body": null,
      "choices": [
        {
          "id": "draw_patrol",
          "label": "引开巡兵，让一家先走",
          "detail": "去街尾弄出动静引走盘查，好让父子俩从后巷脱身。"
        },
        {
          "id": "take_road_money",
          "label": "绕后院取路费，独行",
          "detail": "从后窗拿走他备下的盘缠，留他在前门独自应付巡兵。"
        }
      ],
      "originalBody": "门开一线，孩子的父亲朝你摆手，目光停在你肩头。巡兵正盘问背人突围的伤客；他把盘缠搁在后窗。你可引开巡兵，让一家先走，也可收下盘缠独行。"
    },
    {
      "id": "echo_family_distance",
      "body": null,
      "choices": [
        {
          "id": "work_for_medicine",
          "label": "搬棚料，换一次敷药",
          "detail": "重木会压痛伤口，但搬完后他肯依约替你清理旧创。"
        },
        {
          "id": "sell_route",
          "label": "卖出追兵去向，换路费",
          "detail": "拿消息换他的路费，但他去讨赔偿时势必惊动巡哨。"
        }
      ],
      "originalBody": "火巷的钱袋还系在你腰间。孩子的父亲看了一眼，磨刀的手停了停：“活着总得糊口。”院里堆着棚料，搬完能敷药；他也肯出钱打听追兵落脚处，想去讨失火的赔偿。"
    },
    {
      "id": "echo_school_fellowship",
      "body": null,
      "choices": [
        {
          "id": "practice_together",
          "label": "对照旧谱，互校一招",
          "detail": "趁院里无人，对照案上札记把发力多余处拆改过来。"
        },
        {
          "id": "take_cover",
          "label": "借后屋避查，换药",
          "detail": "巡街的人快到了，先进后屋换药，由同门在前厅遮掩。"
        }
      ],
      "originalBody": "旧营的人认出你的起手，提起北城受过你照应的同门。案上摊着校招札记，后屋备着伤药。有人让开院中空地，想与你拆一遍旧招；也有人掀帘示意：“巡街的快到了，先进屋换药。”"
    },
    {
      "id": "echo_school_divided",
      "body": null,
      "choices": [
        {
          "id": "answer_for_notice",
          "label": "留下交代，承受责问",
          "detail": "进门挨过同门拳脚把话讲清，或许还有人肯指点旧招。"
        },
        {
          "id": "carry_sealed_note",
          "label": "收下路费，带信跑腿",
          "detail": "不跨门槛免受责问，接过封信与盘缠替旧营跑一趟。"
        }
      ],
      "originalBody": "城门领赏的凭据摊在案上，名字旁印着你的手印。有人要你进门受罚、把话讲清；也有人把封好的信和路费搁在门坎上，叫你拿钱替旧营跑腿，不必进屋。"
    },
    {
      "id": "echo_school_closed",
      "body": null,
      "choices": [
        {
          "id": "guard_the_lane",
          "label": "替拳师守巷，换笔记",
          "detail": "迎住追来的搜兵替他挡一阵，换后窗压着的那册笔记。"
        },
        {
          "id": "sell_his_location",
          "label": "卖出拳师落脚处",
          "detail": "军需贩子给钱痛快，但报营后搜兵也会记住你的模样。"
        }
      ],
      "originalBody": "被你夺钱的拳师藏在茶棚后。同门拦在巷口：“他还记着。”拳师把校招笔记压在后窗，只肯拿它请你守巷；街角的军需贩子也在打听他的下落，钱袋已经解开。"
    },
    {
      "id": "echo_informer_allies",
      "body": null,
      "choices": [
        {
          "id": "move_him",
          "label": "护送换藏处，取札记",
          "detail": "路上得防暗哨盘查，送到地方后他会把护身谱留给你。"
        },
        {
          "id": "send_schedule",
          "label": "把运械时刻交给脚夫",
          "detail": "先让棚外脚夫把时刻送去暗线，趁早截住追兵装具。"
        }
      ],
      "originalBody": "密探在货棚磨着一截炭条，记下新查到的运械时刻。他已回不了旧营，想换个藏处。你可护送他，收下护身札记；也可先让等在棚外的脚夫送出时刻，交暗线截运。"
    },
    {
      "id": "echo_informer_tracked",
      "body": null,
      "choices": [
        {
          "id": "break_out_together",
          "label": "带密探突围，取札记",
          "detail": "翻窗硬闯难免交手受伤，他手里的护身谱会交给你。"
        },
        {
          "id": "send_separately",
          "label": "让脚夫分送口供",
          "detail": "你留在棚前应付盘问，让他混入脚夫队把时刻送走。"
        }
      ],
      "originalBody": "货棚外响起皮靴声。密探攥着运械时刻和护身札记，望向后窗。你可带他突围，取走札记；也可留在棚前应付盘问，让他混入脚夫队，把时刻分路送走。"
    },
    {
      "id": "echo_informer_receipt",
      "body": null,
      "choices": [
        {
          "id": "take_receipt",
          "label": "取兑票副页，交暗线",
          "detail": "动手从铺后夺走副页，好让暗线顺藤截住军械。"
        },
        {
          "id": "trade_again",
          "label": "再卖一条行踪",
          "detail": "掌柜肯付现钱，但你报出的消息会立刻写进军需报录。"
        }
      ],
      "originalBody": "刀手没再露面。你拿钱袋里那张兑票找到军需铺，掌柜看了一眼，便从柜后抽出副页。他肯再买一条行踪；你也可夺走副页，交给暗线查补给的经手人。"
    },
    {
      "id": "echo_transport_crossing",
      "body": null,
      "choices": [
        {
          "id": "push_cart",
          "label": "扶车过沟，挣路费",
          "detail": "水已漫过车轴，顶车发力会扯动旧伤，但工钱照算。"
        },
        {
          "id": "watch_bank",
          "label": "替驮队望哨，取札记",
          "detail": "伏在石滩盯紧巡兵来路，驮队过沟后会留下护身札记。"
        }
      ],
      "originalBody": "驿道见过的驮队陷在浅沟里，领队认出你便招手：“搭手推车，工钱照算。伤重就到岸边替我们望哨，护身札记给你留着。”水已漫过车轴，巡兵的灯还没转过去。"
    },
    {
      "id": "echo_transport_bargain",
      "body": null,
      "choices": [
        {
          "id": "work_for_pay",
          "label": "搬货领工钱，各走各路",
          "detail": "麻包会磨开伤口，领完现钱就走，不指望他们留宿。"
        },
        {
          "id": "draw_search",
          "label": "引开查棚巡兵，换散招",
          "detail": "冒着受伤风险引走门外巡兵，换取领队手里那页散招。"
        }
      ],
      "originalBody": "水窖和翻车处的伤员有人到了货棚，先前的事也传开了。领队把铺盖往里收了收，只按件雇人搬货；门外巡兵忽然停步，他又摸出一页散招，看谁肯出去把人引开。"
    },
    {
      "id": "echo_transport_joined",
      "body": null,
      "choices": [
        {
          "id": "rest_with_caravan",
          "label": "随驮队换药歇脚",
          "detail": "热水和干净绷带已经备好，今夜只管洗净伤口养足力气。"
        },
        {
          "id": "cut_off_loadout",
          "label": "合力截运，断追兵行装",
          "detail": "带伤同两路旧识去拦押车兵，联手扣下追兵的补给。"
        }
      ],
      "originalBody": "驿道旧识在货棚认出你，另一队接应人也刚到。两边提起你先前的照应，把烧开的热水和干净绷带端上桌。夜里还有一趟追兵运车经过，你可留下歇脚，也可同他们去截车。"
    }
  ],
  "variants": [
    {
      "eventId": "echo_school_divided",
      "id": "ask_witness",
      "label": "请脚夫作保，先截补给",
      "detail": "借火巷证言暂压旧怨，随同门一道去伏击追兵装具车。"
    },
    {
      "eventId": "echo_transport_bargain",
      "id": "use_schedule",
      "label": "按口供截运，各取所需",
      "detail": "旧怨另算，带伤随货棚领队按密探时刻拦劫运车。"
    }
  ],
  "ending": {
    "passage4Body": "关口一破，工友便照报录核过车次，拔下转运支线的轨钉。撬棍落地，领头的人坐在枕木上，半晌才松开攥紧的手。\n“下一批军械过不来了。可渡口那些枪，还装着子弹。”你替他把道旁的灯吹熄，往江边走。南下只剩这道渡口，过了江，就能把原件交到接应人手里。",
    "act5Objective": "闯过渡口，将原件交予南方接应人，了结此番南下。",
    "act5GateTitle": "终局渡口",
    "act5GateDescription": "接应船就在封锁线外，闯过去交清原件，这趟南下之行便告终结。",
    "eventMapDescription": "路途偶遇，审看处境再定行止"
  }
};
 const byId=new Map(copy.events.map(e=>[e.id,e]));
 function describe(event){
  if(!event||event.mode!=='choice')return event;
  const entry=byId.get(event.eventId);
  if(!entry)return {...event,choices:event.choices.map(c=>({...c,detail:''}))};
  return {...event,body:entry.body&&event.body===entry.originalBody?entry.body:event.body,choices:event.choices.map(c=>{
   const item=entry.choices.find(v=>v.id===c.id)||copy.variants.find(v=>v.eventId===event.eventId&&v.id===c.id);
   return {...c,label:item?.label||c.label,detail:item?.detail||''};
  })};
 }
 const apply=G.events.applyChoice;
 G.events.applyChoice=function(state,id){
  const choosing=state.event?.mode==='choice',view=describe(state.event),choice=view?.choices.find(c=>c.id===id);
  const result=apply(state,id);
  if(choosing&&choice&&result.event?.mode==='result'){
   result.event.body=view.body;result.event.selectedChoiceLabel=choice.label;
   const entry=result.events?.history?.at(-1);if(entry?.eventId===result.event.eventId&&entry.choiceId===id)entry.choiceLabel=choice.label;
  }
  return result;
 };
 G.eventReading={describe,ending:copy.ending,revision:1};
})();
