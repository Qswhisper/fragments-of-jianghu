/* Authored later encounters. Context changes both the people present and choices. */
(function () {
  'use strict';
  const fx = (type, amount, source) => ({type, amount, ...(source ? {source, relicId: source} : {})});
  const choice = (id, label, preview, resultText, effects, aftermath) => ({id, label, preview, resultText, effects, aftermath});
  const event = (chain, variant, title, body, choices) => ({id: 'echo_' + chain + '_' + variant, act: chain === 'informer' ? 4 : chain === 'transport' ? 3 : 2, title, body, choices, consequence: {chain, variant}});
  const definitions = [
    event('family', 'shelter', '灶房留灯', "孩子在灶房里睡着，父亲认出你肩头的烧伤，把温水推来：“进屋洗洗伤。”门外相熟的脚夫正要动身，也能替他递信打听追兵补给。你可留下换药，或托他们探路。", [
      choice('rest_inside', '借灶房换药歇脚', '恢复 12 气血', "孩子翻了个身，父亲便放轻了舀水的声音。你换下血衣，天亮前离开；门外泥地上留着来问路的靴印。", [fx('hp', 12)], "火巷一家留你换过药，灶房外也落下了问路人的靴印。"),
      choice('send_word', '托父亲捎信探路', '1 名宿敌阶数 -1', "你没进屋。父亲托相熟的脚夫递信，暗线循路截断了追兵的军械车。脚夫把撕下的封条捎回来，纸角还沾着灶灰。", [fx('nemesis_shift', -1)], "火巷父亲替你递过信，沿路脚夫认得这份人情，暗线截了车。")
    ]),
    event('family', 'watched', '门前问话', "门开一线，孩子的父亲朝你摆手，目光停在你肩头。巡兵正盘问背人突围的伤客；他把盘缠搁在后窗。你可引开巡兵，让一家先走，也可收下盘缠独行。", [
      choice('draw_patrol', "引开巡兵，让一家先走", '气血 -8，获得 1 张本流派招式', "你敲响街尾铁门引开巡兵，突围时受了伤。父子俩从后巷脱身，把原本留给你的护身谱托在了接应处。", [fx('hp', -8), fx('gain_card', 0, 'style')], "火巷父子借你引兵的空隙撤走，接应人收到了他留下的旧谱。"),
      choice('take_road_money', '绕后院取路费，独行', '获得 25 大洋', "你从后窗收下布包，银元在掌心碰出轻响。巡兵仍在前门问话，父亲应门的声音，直到转过街角才听不见。", [fx('gold', 25)], "你拿走火巷父亲备下的盘缠，巡兵仍在前门向他盘问伤客。")
    ]),
    event('family', 'distance', '隔门认人', "火巷的钱袋还系在你腰间。孩子的父亲看了一眼，磨刀的手停了停：“活着总得糊口。”院里堆着棚料，搬完能敷药；他也肯出钱打听追兵落脚处，想去讨失火的赔偿。", [
      choice('work_for_medicine', '搬棚料，换一次敷药', '气血 -6，最大气血 +3', "重木压开新伤。父亲替你洗净伤处，又清理了深处旧创。药敷完，他收起药碗，伸手掩上了柴门。", [fx('hp', -6), fx('max_hp', 3)], "你替火巷父亲搬过棚料，他依约治了旧创，没留你过夜。"),
      choice('sell_route', "卖出追兵去向，换路费", '获得 20 大洋，1 名宿敌阶数 +1', "你说出追兵的落脚处，收下路费。父亲托人去讨失火的赔偿，追缉处也顺着这番问话，接上了你的踪迹。", [fx('gold', 20), fx('nemesis_shift', 1)], "磨刀人循你的消息找追兵讨赔偿，巡哨也顺着盘问咬上踪迹。")
    ]),
    event('school', 'fellowship', '旧招认人', "旧营的人认出你的起手，提起北城受过你照应的同门。案上摊着校招札记，后屋备着伤药。有人让开院中空地，想与你拆一遍旧招；也有人掀帘示意：“巡街的快到了，先进屋换药。”", [
      choice('practice_together', '对照旧谱，互校一招', '随机升级 1 张牌', "你们在院中压低脚步，拆出一处多余发力。临走，屋主把北城捎来的纸条折好，夹进了校招札记。", [fx('upgrade_random_card')], "旧营同门与你互校过招式，北城旧识的消息留在谱夹里。"),
      choice('take_cover', '借后屋避查，换药', '恢复 10 气血', "你在后屋换下裹伤布。同门在前厅摆开茶碗，替你挡过盘查。送你出门时，他低声提醒：“再来的人，未必都肯替你遮掩。”", [fx('hp', 10)], "旧营同门替你挡过盘查，屋门曾为你开过。")
    ]),
    event('school', 'divided', '门内两句话', "城门领赏的凭据摊在案上，名字旁印着你的手印。有人要你进门受罚、把话讲清；也有人把封好的信和路费搁在门坎上，叫你拿钱替旧营跑腿，不必进屋。", [
      choice('answer_for_notice', '留下交代，承受责问', '气血 -8，随机升级 1 张牌', "拳脚落过，你才把话说完。一位旧识上前正了正你的发力；有人拂袖离席，案上的领赏凭据没人收走。", [fx('hp', -8), fx('upgrade_random_card')], "旧营听过你的交代，有人仍肯指点，有人起身离席。"),
      choice('carry_sealed_note', '收带信路费，离开', '获得 25 大洋', "你接过封好的信与路费，没有跨进门槛。收信人肯不肯与你来往，还要等他读完旧营写下的那几句话。", [fx('gold', 25)], "你带走了旧营的信和路费，门内的责问没有说开。")
    ]),
    event('school', 'closed', '茶棚后的旧识', "被你夺钱的拳师藏在茶棚后。同门拦在巷口：“他还记着。”拳师把校招笔记压在后窗，只肯拿它请你守巷；街角的军需贩子也在打听他的下落，钱袋已经解开。", [
      choice('guard_the_lane', '替拳师守巷，换笔记', '气血 -8，随机升级 1 张牌', "你挡住追来的搜兵，小臂受了刀伤。拳师从后窗递出笔记：“只算这次守巷。”你伸手接住，门闩没有再动。", [fx('hp', -8), fx('upgrade_random_card')], "你替拳师拦下搜兵，他推出来那册旧谱，门仍关着。"),
      choice('sell_his_location', '卖出拳师落脚处', '获得 30 大洋，1 名宿敌阶数 +1', "军需贩子数出银元，转身派人报营。搜兵添了护具和枪械，你的模样也被画进了这笔交易的报录。", [fx('gold', 30), fx('nemesis_shift', 1)], "拳师的藏身处被你卖给军需贩子，旧营关上了门。")
    ]),
    event('informer', 'allies', '口供后的来信', "密探在货棚磨着一截炭条，记下新查到的运械时刻。他已回不了旧营，想换个藏处。你可护送他，收下护身札记；也可先让等在棚外的脚夫送出时刻，交暗线截运。", [
      choice('move_him', '护送换藏处，取札记', '气血 -6，获得 1 张本流派招式', "转移时撞见暗哨，你掩护他受了伤。密探进了新藏处，把护身谱留给你；搜兵扑向旧货棚时已空了。", [fx('hp', -6), fx('gain_card', 0, 'style')], "密探换了藏处，留给你那册护身谱，搜兵扑了个空。"),
      choice('send_schedule', '把运械时刻交给脚夫', '1 名宿敌阶数 -1', "密探口传时辰，脚夫记牢后疾步离开。暗线按点截翻了追兵的装具车，脚夫带回口信，定下了后半程交接的暗号。", [fx('nemesis_shift', -1)], "密探把时刻递给脚夫，暗线截下追兵装具，续上了接头。")
    ]),
    event('informer', 'tracked', '货棚外的脚步', "货棚外响起皮靴声。密探攥着运械时刻和护身札记，望向后窗。你可带他突围，取走札记；也可留在棚前应付盘问，让他混入脚夫队，把时刻分路送走。", [
      choice('break_out_together', '带密探突围，取札记', '气血 -10，获得 1 张本流派招式', "你带密探翻窗突围，交手时受了伤。护身谱递到了你手里，追兵借着灯火，也认准了你们是一路人。", [fx('hp', -10), fx('gain_card', 0, 'style')], "你带密探翻窗突围，收下护身谱，追兵也认准了你们是一路。"),
      choice('send_separately', '让脚夫分送口供', '1 名宿敌阶数 -1', "你留在棚前应付问话，密探混进脚夫队。时刻送到另一处接头点，暗线截下追兵行装，搜兵没再找到同路的线索。", [fx('nemesis_shift', -1)], "密探随脚夫分路递信，暗线截下行装，搜兵失去了同路线索。")
    ]),
    event('informer', 'receipt', '封口钱的来路', "刀手没再露面。你拿钱袋里那张兑票找到军需铺，掌柜看了一眼，便从柜后抽出副页。他肯再买一条行踪；你也可夺走副页，交给暗线查补给的经手人。", [
      choice('take_receipt', '取兑票副页，交暗线', '气血 -8，1 名宿敌阶数 -1', "你从铺后夺走副页，混战中受了伤。暗线循兑票查到补给经手人，截下一车军械。交出去的密探，仍没有消息。", [fx('hp', -8), fx('nemesis_shift', -1)], "兑票副页帮暗线截下一车军械，交出去的密探仍无下落。"),
      choice('trade_again', '再卖一条行踪', '获得 35 大洋，1 名宿敌阶数 +1', "掌柜付钱，将你说的行踪夹进军需报录。追缉者据此调来甲械；他肯继续做生意，却从没答应替你保密。", [fx('gold', 35), fx('nemesis_shift', 1)], "你又卖给军需铺一条行踪，追兵据此调来了甲械。")
    ]),
    event('transport', 'crossing', '驮队过浅沟', "驿道见过的驮队陷在浅沟里，领队认出你便招手：“搭手推车，工钱照算。伤重就到岸边替我们望哨，护身札记给你留着。”水已漫过车轴，巡兵的灯还没转过去。", [
      choice('push_cart', '扶车过沟，挣路费', '气血 -6，获得 30 大洋', "碎石卡住车轮，你顶着车辕推过浅沟，旧伤又渗出血。领队照数付钱，拍了拍车辕，转身去照看后车。", [fx('hp', -6), fx('gold', 30)], "你与驮队合力推过浅沟，领队照数付了路费。"),
      choice('watch_bank', '替驮队望哨，取札记', '获得 1 张本流派招式', "你伏在石滩盯紧巡哨来路。驮队趁巡兵错身的空当渡过浅沟，把油布包好的旧谱搁在岩缝，转入荒道。", [fx('gain_card', 0, 'style')], "驮队借你在岸边望哨避过巡兵，在石缝留下了旧谱。")
    ]),
    event('transport', 'bargain', '货棚算旧账', "水窖和翻车处的伤员有人到了货棚，先前的事也传开了。领队把铺盖往里收了收，只按件雇人搬货；门外巡兵忽然停步，他又摸出一页散招，看谁肯出去把人引开。", [
      choice('work_for_pay', "搬货领工钱，各走各路", '气血 -6，获得 25 大洋', "麻包磨开伤口。领队数出工钱，等你收好便去招呼下一车货。铺盖仍收在伤员身边，没人让出歇脚的位置。", [fx('hp', -6), fx('gold', 25)], "货棚结清搬货工钱，伤员没有让出同宿的位置。"),
      choice('draw_search', '引开查棚人，换杂招', '气血 -8，获得 1 张异流派招式', "你踏响碎瓦引走巡兵，脱身时受了伤。领队把那页散招留在接应处，临走只朝你点了点头。", [fx('hp', -8), fx('gain_card', 0, 'offstyle')], "你引走了查棚巡兵，拿到了散招，伤员对从前的事仍未释怀。")
    ]),
    event('transport', 'joined', '两路人在货棚', "驿道旧识在货棚认出你，另一队接应人也刚到。两边提起你先前的照应，把烧开的热水和干净绷带端上桌。夜里还有一趟追兵运车经过，你可留下歇脚，也可同他们去截车。", [
      choice('rest_with_caravan', '随驮队换药歇脚', '恢复 12 气血', "驮队替你洗净伤口，换下血绷带。接应人把消息送往下一站。这一夜你没有去截运，货棚里的灯陪你亮到天明。", [fx('hp', 12)], "两路旧识在货棚碰头，你借他们的伤药换布，歇回了气力。"),
      choice('cut_off_loadout', "合力截运，断追兵行装", '气血 -8，1 名宿敌阶数 -1', "你拦下押车兵，交手时扯动了伤处。驮队搬走行装，接应人撤掉路标；两路人分头散去，追兵少了一批补给。", [fx('hp', -8), fx('nemesis_shift', -1)], "两路人循着旧交情合力截运，扣下了追兵的行装。")
    ])
  ];
  const ordinary = [
    {id:'act2_courier_names',act:2,title:'驿站捎信',body:"脚夫捆好逃难者的家信，准备往南走。若藏起姓名避查，就得有人替他蹚巡哨小路。铺主肯出钱买寻亲名单，脚夫却按住信角：“交出去，谁再抄一份，我就管不着了。”",choices:[
      choice('carry_message',"藏名带信，替脚夫走小路",'气血 -6，获得 1 张本流派招式',"你替脚夫蹚过巡哨小路，过卡时受了伤。他留下一册旧营护身谱；往南的家信里，收信人也听说了你的名字。",[fx('hp',-6),fx('gain_card',0,'style')]),
      choice('show_names','把寻亲名单交给铺主','获得 30 大洋',"铺主付钱，把名单誊了两份。一份往南寄，一份交给查户口的差役。寻亲的人和盘查的人，都开始沿着姓名找路。",[fx('gold',30)])
    ]},
    {id:'act3_medicine_seal',act:3,title:'药箱封条',body:"驮队给野战医院运药，箱上封条却少了官印。领队急着雇人搭手搬箱过哨；箱角正抵着你未愈的伤处。军需牙人也看中了药和夹着的杂谱，解开钱袋等你点头。",choices:[
      choice('leave_for_porters',"护药过哨，取搬箱工钱",'气血 -6，获得 20 大洋',"箱角压开伤口，你仍随驮队过了哨卡。领队结清工钱，把封条重新按好：“南边工友问起来，我会提你。”",[fx('hp',-6),fx('gold',20)]),
      choice('sell_crate',"把药箱与杂谱卖给牙人",'获得 35 大洋，获得 1 张异流派招式',"牙人付钱留了药，把夹着的杂谱塞给你。驮车空着往医院走去，车板轻了，这一批伤员却等不到原定的药。",[fx('gold',35),fx('gain_card',0,'offstyle')])
    ]}
  ];
  function transportRecall(origin) {
    if (origin.id === 'act2_cinder_cistern') return '水窖里那位伤兵把水壶递了过来，嘴唇上的裂口已结了痂。';
    if (origin.id === 'act2_overturned_caravan') return '有人看见你身上那截血绷带，隔着驮车叫了一声。是驿道上被压住的伤员。';
    return '驿站见过的人认出你，朝驮队招了招手。';
  }
  function build(s, chain, variant, origin, context) {
    const definition = JSON.parse(JSON.stringify(definitions.find(d => d.id === 'echo_' + chain + '_' + variant)));
    definition.act = s.map.actNumber;
    if (chain === 'school' && variant === 'fellowship') {
      const meeting = origin.id === 'act1_execution_notice' ? '北城的消息先到了旧营。听说你收下了城门上的尸身，屋里有人起身，把你让进院中。' : origin.id === 'act1_river_shrine' ? '旧营有人提起河龛旁的拳师。听你说搜兵已经走远，他才把挡在门口的凳子挪开。' : '旧营的人认出你的起手，说茶摊那位拳师捎过话来，问你路上可还顺当。';
      definition.body = meeting + '案上摊着校招札记，后屋备着伤药。你可对照拆招，也可借后屋避过盘查。';
    }
    if (chain === 'school' && variant === 'divided' && context.familyHelp) {
      definition.body = "旧营拿着城门领赏凭据问你，火巷父亲却托脚夫带来你曾相助的消息。案上多了一份证言。你可留下交代，也可请脚夫作保，先帮同门截补给；有人把凭据折起，有人仍按着它。";
      definition.choices[1] = choice('ask_witness',"请脚夫作保，先截补给",'1 名宿敌阶数 -1',"脚夫作保说清了火巷旧事，同门咬牙压下凭据。众人按消息伏击截翻了追兵的装具车：“先办正事，往日的账后算。”",[fx('nemesis_shift',-1)],"火巷父亲的证言暂且压下了旧怨，同门截了补给，旧账未勾。");
    }
    if (chain === 'family' && variant === 'watched' && context.witness && context.harmedPorters) definition.body = "火巷救下的孩子还活着。父亲认出你，同行伤员却说起你取走水或银箱的事；脚夫把两边消息接到了一起。门前巡兵还在问话。你可引兵让他们撤走，或收下父亲备好的路费独行。";
    if (chain === 'transport' && variant === 'crossing') {
      definition.body = transportRecall(origin) + '水正往上漫，车轮陷在碎石里。领队肯出路费请你扶车，也肯拿护身札记换你去岸边望哨。来路上，巡兵的灯还没转过去。';
    }
    if (chain === 'transport' && variant === 'joined') {
      const link = context.informerRoute ? "被你保下的密探托脚夫送来运械时刻" : context.familyHelp ? "火巷父亲托人带来可通行的后巷路线" : "你在路上帮过的工友带来押车消息";
      definition.body = transportRecall(origin) + link + "。两路人这才接上了线。药和绷带已备下，追兵的运车也将经过；你可留下换药，或带伤同他们去截运。";
    }
    if (chain === 'transport' && variant === 'bargain' && context.informerRoute) {
      definition.body = "货棚伤员记得取水或银箱的事，把铺盖收远。密探托脚夫送来运械时刻，领队低头看了两遍，肯雇你搬货，也肯与你照时刻截运。伤员没接话；这笔合作不抵从前的账。";
      definition.choices[1] = choice('use_schedule',"照口供截运，各取所需",'气血 -8，1 名宿敌阶数 -1',"你挡住押车兵，肩上受伤。货棚领队收走物资，暗线扣下行装。分路前，领队与你核完所得，伤员没有过来送行。",[fx('hp',-8),fx('nemesis_shift',-1)],"密探的时刻让你与货棚合力截运，伤员仍未释怀。");
    }
    if (chain === 'transport' && variant === 'bargain' && context.soldMedicine) {
      definition.body = "医院的空车回到货棚，领队知道你卖了药箱，把铺盖收远。他仍肯按价雇你搬货。" + (context.informerRoute ? "脚夫送来密探查到的运械时刻，他低头看过，也肯与你截运；伤员仍在等药。" : "他也肯拿一页杂招换你引开查棚巡兵。工钱和招谱摆在眼前，医院等的药却没有回来。");
      definition.choices[1].aftermath = context.informerRoute ? "密探的消息让双方联手截了车，倒卖药箱的旧怨仍没解开。" : "你引开巡兵换得一纸杂招，野战医院断药的旧账仍有人记着。";
    }
    for (const c of definition.choices) {
      if (c.effects.some(e => e.type === 'upgrade_random_card')) c.fallbackResultText = "你做完约定的事。手中招式已无可精进，对方改以二十块大洋结清。";
    }
    return definition;
  }
  // One source image per encounter, selected by identity rather than the act in
  // which a delayed encounter happens. Images remain lazy-loaded by the renderer.
  const artRoot = 'assets/journey/art-refresh-20261013/';
  const darkArt = new Set(['echo_family_shelter','echo_family_watched','echo_family_distance','echo_school_fellowship','echo_informer_allies']);
  const revisedArt = new Set(['act3_medicine_seal','echo_transport_bargain']);
  const art = Object.fromEntries([...definitions, ...ordinary].map(d => [d.id, artRoot + d.id + (revisedArt.has(d.id) ? '-r2' : darkArt.has(d.id) ? '-dark' : '') + '.png']));
  // Keep faces/actions clear of the heading wash and make the warning discreet.
  for (const id of ['echo_family_shelter', 'echo_family_watched']) art[id] = 'assets/journey/art-feedback-20261014/' + id + '.png';
  // Audited at both desktop and phone scale: keep faces/actions below the
  // existing title wash, and business choices visibly unresolved.
  for (const id of ['act2_courier_names','act3_medicine_seal','echo_family_distance','echo_school_closed','echo_transport_bargain','echo_transport_joined']) art[id] = 'assets/journey/scenes-feedback-20261014/' + id + '.png';
  G.journeyEvents = {ordinary, definitions, build, art};
})();
