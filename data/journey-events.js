/* Authored later encounters. Context changes both the people present and choices. */
(function () {
  'use strict';
  const fx = (type, amount, source) => ({type, amount, ...(source ? {source, relicId: source} : {})});
  const choice = (id, label, preview, resultText, effects, aftermath) => ({id, label, preview, resultText, effects, aftermath});
  const event = (chain, variant, title, body, choices) => ({id: 'echo_' + chain + '_' + variant, act: chain === 'informer' ? 4 : chain === 'transport' ? 3 : 2, title, body, choices, consequence: {chain, variant}});
  const definitions = [
    event('family', 'shelter', '灶房留灯', "火巷救下的孩子睡在灶房里。父亲认出你肩头的烧伤，把热水往灶边推了推。门外的脚夫正要赶路，肯替他捎信打听追兵的补给。你可以留下换药，也可托他们探路。", [
      choice('rest_inside', '借灶房换药歇脚', '恢复 12 气血', "孩子睡在隔墙。你换下血衣，天亮前离开。父亲把旧绷带烧了，门外泥地上却多了一串来问路的靴印。", [fx('hp', 12)], "火巷一家留你换过药，灶房外也落下了问路人的靴印。"),
      choice('send_word', '托父亲捎信探路', '1 名宿敌阶数 -1', "你没进屋。父亲托相熟的脚夫递信，暗线循路截断了追兵的军械车。脚夫把撕下的封条捎回来，纸角还沾着灶灰。", [fx('nemesis_shift', -1)], "火巷父亲替你递过信，沿路脚夫认得这份人情，暗线截了车。")
    ]),
    event('family', 'watched', '门前问话', "火巷救下的孩子还活着。父亲隔着门缝朝你摆手，街口巡兵正挨家盘问背人突围的伤客。你可以引开巡兵给他们腾出退路，也可趁巡兵敲门，绕去后窗取走他备下的盘缠。", [
      choice('draw_patrol', "引开巡兵，让一家先走", '气血 -8，获得 1 张本流派招式', "你敲响街尾的铁门，引走巡兵，肩上挨了一刀。父子俩从后巷脱身，父亲把护身札记送到了接应处。", [fx('hp', -8), fx('gain_card', 0, 'style')], "火巷父子借你引兵的空隙撤走，接应人收到了他留下的札记。"),
      choice('take_road_money', '绕后院取路费，独行', '获得 25 大洋', "你从后窗收下布包，银元在掌心碰出轻响。巡兵仍在前门问话，父亲应门的声音，直到转过街角才听不见。", [fx('gold', 25)], "你拿走火巷父亲备下的盘缠，巡兵仍在前门向他盘问伤客。")
    ]),
    event('family', 'distance', '隔门认人', "火巷的钱袋还系在你腰间。棚屋里，孩子的父亲认出了它，磨刀的手停了停：“活着总得糊口。”他肯出钱买追兵去向，也肯拿药请你带伤搬完棚料。门闩只卸了一半。", [
      choice('work_for_medicine', '搬棚料，换一次敷药', '气血 -6，最大气血 +3', "重木压开新伤。父亲替你洗净伤处，又清理了肋下一处旧创。药敷完，他收起碗，伸手去掩那道柴门。", [fx('hp', -6), fx('max_hp', 3)], "你替火巷父亲搬过棚料，他依约治了旧创，没留你过夜。"),
      choice('sell_route', "卖出追兵去向，换路费", '获得 20 大洋，1 名宿敌阶数 +1', "你说出追兵的落脚处，收下路费。父亲托人去讨失火的赔偿，追缉处也顺着这番问话，接上了你的踪迹。", [fx('gold', 20), fx('nemesis_shift', 1)], "磨刀人循你的消息找追兵讨赔偿，巡哨也顺着盘问咬上踪迹。")
    ]),
    event('school', 'fellowship', '旧招认人', "旧营的人认出你的起手，提起北城受过你照应的旧识。案上摊着校招札记，后屋备着伤药。有人让开院中的空地，等你拆一遍招式；也有人掀起后屋门帘，示意你先避过盘查。", [
      choice('practice_together', '对照旧谱，互校一招', '随机升级 1 张牌', "你们在院中压低脚步，拆出一处多余发力。临走，屋主把北城捎来的纸条折好，夹进了校招札记。", [fx('upgrade_random_card')], "旧营同门与你互校过招式，北城旧识的消息留在谱夹里。"),
      choice('take_cover', '借后屋避查，换药', '恢复 10 气血', "你在后屋换下裹伤布。同门在前厅摆开茶碗，替你挡过盘查。送你出门时，他低声提醒：“再来的人，未必都肯替你遮掩。”", [fx('hp', 10)], "旧营同门替你挡过盘查，屋门曾为你开过。")
    ]),
    event('school', 'divided', '门内两句话', "城门领赏的凭据摆在案上。有人要你把经过说清，有人已把凳子挪开。你可留下挨一顿拳脚，听旧识校正出手；也可接过封好的信和路费，站在门外把这趟差事应下。", [
      choice('answer_for_notice', '留下交代，承受责问', '气血 -8，随机升级 1 张牌', "拳脚落过，你才把话说完。一位旧识上前正了正你的出手；有人拂袖离席，案上的领赏凭据没人收走。", [fx('hp', -8), fx('upgrade_random_card')], "旧营听过你的交代，有人仍肯校招，有人起身离席。"),
      choice('carry_sealed_note', '收带信路费，离开', '获得 25 大洋', "你接过封好的信与路费，没有跨进门槛。收信人肯不肯与你来往，还要等他读完旧营写下的那几句话。", [fx('gold', 25)], "你带走了旧营的信和路费，门内的责问没有说开。")
    ]),
    event('school', 'closed', '茶棚后的旧识', "被你夺钱的拳师藏在茶棚后。同门横身拦住去路：“他还记着。”拳师肯拿校招笔记请你守后巷，街口的军需贩子也肯出钱买他的落脚处。窗缝里露着半页纸，街角有人等你开口。", [
      choice('guard_the_lane', '替拳师守巷，换笔记', '气血 -8，随机升级 1 张牌', "你挡住追来的搜兵，小臂受了刀伤。拳师从后窗递出笔记：“只算这次守巷。”你伸手接住，门闩没有再动。", [fx('hp', -8), fx('upgrade_random_card')], "你替拳师守巷换了笔记，他依约给了东西，门仍关着。"),
      choice('sell_his_location', '卖出拳师落脚处', '获得 30 大洋，1 名宿敌阶数 +1', "军需贩子数出银元，转身派人报营。搜兵添了护具和枪械，你的模样也被画进了这笔交易的报录。", [fx('gold', 30), fx('nemesis_shift', 1)], "拳师的藏身处被你卖给军需贩子，旧营关上了门。")
    ]),
    event('informer', 'allies', '口供后的来信', "你保下的密探藏在货棚。口供已递出去，他回不了旧营，又查到了运械时刻。棚外另有藏身处，须有人护送；脚夫也在等消息，准备把时刻送去截运。密探把护身札记压在膝上，等你开口。", [
      choice('move_him', '护送换藏处，取札记', '气血 -6，获得 1 张本流派招式', "转移时，一记追来的棍击落在肩背。密探进了新藏处，把护身札记递给你。搜兵按报录找去时，旧货棚已空了。", [fx('hp', -6), fx('gain_card', 0, 'style')], "密探换了藏处，把护身札记交给你，搜兵扑了个空。"),
      choice('send_schedule', '把运械时刻交给脚夫', '1 名宿敌阶数 -1', "密探口传时辰，脚夫记牢后疾步离开。暗线按点截翻了追兵的装具车，脚夫带回口信，定下了后半程交接的暗号。", [fx('nemesis_shift', -1)], "密探把时刻递给脚夫，暗线截下追兵装具，续上了接头。")
    ]),
    event('informer', 'tracked', '货棚外的脚步', "货棚外响起皮靴声。你保下的密探攥着运械时刻，朝后窗望了一眼。你可护他冲出搜捕，取走札记；也可掩护他混入脚夫队，把口供与你分路送走。门外的人已开始问话。", [
      choice('break_out_together', '带密探突围，取札记', '气血 -10，获得 1 张本流派招式', "你带密探翻出货棚，背上挨了一刀。札记保住了，追兵借着灯火，也看清了你们是一路人。", [fx('hp', -10), fx('gain_card', 0, 'style')], "你带密探强行突围换得札记，追兵也认准了你们是一路。"),
      choice('send_separately', '让脚夫分送口供', '1 名宿敌阶数 -1', "你留在棚前应付问话，密探混进脚夫队。时刻送到另一处接头点，暗线截下追兵行装，搜兵没再找到同路的线索。", [fx('nemesis_shift', -1)], "密探随脚夫分路递信，暗线截下行装，搜兵失去了同路线索。")
    ]),
    event('informer', 'receipt', '封口钱的来路', "买走密探的刀手没再露面，封口钱的兑票却追到军需铺。掌柜认出你的凭据，肯再买一条行踪。柜后压着兑票副页；若带伤夺走交给暗线，也许能查到付钱和经手补给的人。", [
      choice('take_receipt', '取兑票副页，交暗线', '气血 -8，1 名宿敌阶数 -1', "你从铺后夺走副页，肩上挨了一棍。暗线循兑票查到补给经手人，截下一车军械。交出去的密探，仍没有消息。", [fx('hp', -8), fx('nemesis_shift', -1)], "兑票副页帮暗线截下一车军械，交出去的密探仍无下落。"),
      choice('trade_again', '再卖一条行踪', '获得 35 大洋，1 名宿敌阶数 +1', "掌柜付钱，将你说的行踪夹进军需报录。追缉者据此调来甲械；他肯继续做生意，却从没答应替你保密。", [fx('gold', 35), fx('nemesis_shift', 1)], "你又卖给军需铺一条行踪，追兵据此调来了甲械。")
    ]),
    event('transport', 'crossing', '驮队过浅沟', "驿道上见过的人随驮队停在浅沟边，认出你便招了招手。水正往上漫，车轮陷在碎石里。领队肯出路费请你扶车，也肯拿护身札记换你去岸边望哨。来路上，巡兵的灯还没转过去。", [
      choice('push_cart', '扶车过沟，挣路费', '气血 -6，获得 30 大洋', "碎石卡住车轮，你顶着车辕推过浅沟，肩头旧伤渗出血来。领队照数付钱，点了点头，转身去照看后车。", [fx('hp', -6), fx('gold', 30)], "你与驮队合力推过浅沟，领队照数付了路费。"),
      choice('watch_bank', '替驮队望哨，取札记', '获得 1 张本流派招式', "你伏在石滩紧盯巡哨来路。驮队趁巡兵错身的空当渡过浅沟，将包好的札记搁在岩缝，调转车头扎进荒道。", [fx('gain_card', 0, 'style')], "驮队借你在岸边望哨避过巡兵，在石缝留下了护身札记。")
    ]),
    event('transport', 'bargain', '货棚算旧账', "水窖与翻车处的伤员，有人到了货棚，取水或银箱的事也传来了。领队把铺盖收远，只肯雇你搬货。他手里还有一页杂招，愿拿来请你引走查棚巡兵；门前已经有人停步。", [
      choice('work_for_pay', "搬货领工钱，各走各路", '气血 -6，获得 25 大洋', "麻包磨开伤口。领队数出工钱，等你收好便去招呼下一车货。铺盖仍收在伤员身边，没人让出歇脚的位置。", [fx('hp', -6), fx('gold', 25)], "货棚结清搬货工钱，伤员没有让出同宿的位置。"),
      choice('draw_search', '引开查棚人，换杂招', '气血 -8，获得 1 张异流派招式', "你踏响碎瓦，引巡兵追出货棚，肩背被刀口擦伤。领队把答应的杂招交给接应人，临走只朝你点了点头。", [fx('hp', -8), fx('gain_card', 0, 'offstyle')], "你引走了查棚巡兵，换到杂招，伤员对从前的事仍未释怀。")
    ]),
    event('transport', 'joined', '两路人在货棚', "驿道旧识在货棚认出你，另一队接应人也带来了消息。两边说起先前的相助，才知道这条路如何接到这里。药和绷带已经备下，追兵的运车也将经过；你可留下养伤，或带伤同他们去截运。", [
      choice('rest_with_caravan', '随驮队换药歇脚', '恢复 12 气血', "驮队替你洗净伤口，换下血绷带。接应人把消息送往下一站。这一夜你没有去截运，货棚里的灯陪你亮到天明。", [fx('hp', 12)], "两路旧识在货棚碰头，你借他们的伤药换布，歇回了气力。"),
      choice('cut_off_loadout', "合力截运，断追兵行装", '气血 -8，1 名宿敌阶数 -1', "你挡住押车兵，手臂受伤。驮队带走行装，接应人撤掉路标；两路人分头散去，追兵少了一批补给。", [fx('hp', -8), fx('nemesis_shift', -1)], "两路人循着旧交情合力截运，扣下了追兵的行装。")
    ])
  ];
  const ordinary = [
    {id:'act2_courier_names',act:2,title:'驿站捎信',body:"脚夫捆好逃难者的家信，准备往南走。若藏起姓名避查，就得有人替他走巡哨小路。铺主也肯出钱买寻亲名单，说能替人找家眷。脚夫按住信角：“交出去，谁再抄一份，我就管不着了。”",choices:[
      choice('carry_message',"藏名带信，替脚夫走小路",'气血 -6，获得 1 张本流派招式',"你替脚夫走过巡哨小路，臂上受了刀伤。他把护身札记留给你；往南的家信里，收信人也听说了你的名字。",[fx('hp',-6),fx('gain_card',0,'style')]),
      choice('show_names','把寻亲名单交给铺主','获得 30 大洋',"铺主付钱，把名单誊了两份。一份往南寄，一份交给查户口的差役。寻亲的人和盘查的人，都开始沿着姓名找路。",[fx('gold',30)])
    ]},
    {id:'act3_medicine_seal',act:3,title:'药箱封条',body:"驮队给野战医院运药，箱上封条却少了官印。领队等人搭手搬箱过哨，愿付工钱；箱角正抵着你未愈的伤处。军需牙人也看中了药和夹着的杂谱，钱袋已经解开，医院还在等这辆车。",choices:[
      choice('leave_for_porters',"护药过哨，取搬箱工钱",'气血 -6，获得 20 大洋',"箱角压开伤口，你仍随驮队过了哨卡。领队结清工钱，把封条重新按好：“南边工友问起来，我会提你。”",[fx('hp',-6),fx('gold',20)]),
      choice('sell_crate',"把药箱与杂谱卖给牙人",'获得 35 大洋，获得 1 张异流派招式',"牙人付钱留了药，把夹着的杂谱还给你。驮车空着往医院走去，车板轻了，这一批伤员却等不到原定的药。",[fx('gold',35),fx('gain_card',0,'offstyle')])
    ]}
  ];
  function build(s, chain, variant, origin, context) {
    const definition = JSON.parse(JSON.stringify(definitions.find(d => d.id === 'echo_' + chain + '_' + variant)));
    definition.act = s.map.actNumber;
    if (chain === 'school' && variant === 'fellowship') {
      const who = origin.id === 'act1_execution_notice' ? '你冒箭收殓的同门' : origin.id === 'act1_river_shrine' ? '受你引兵相助的拳师' : '受你护送的茶摊拳师';
      definition.body = '旧营有人提起' + who + "，也认出了你的起手。案上摊着校招札记，后屋备着伤药。有人让开院中空地，等你拆一遍招式；也有人掀起门帘，示意你先避过盘查。";
    }
    if (chain === 'school' && variant === 'divided' && context.familyHelp) {
      definition.body = "旧营拿着城门领赏凭据问你，火巷父亲却托脚夫带来你曾相助的消息。案上多了一份证言。你可留下交代，也可请脚夫作保，先帮同门截补给；有人把凭据折起，有人仍按着它。";
      definition.choices[1] = choice('ask_witness',"请脚夫作保，先截补给",'1 名宿敌阶数 -1',"脚夫作保说清了火巷旧事，同门咬牙压下凭据。众人按消息伏击截翻了追兵的装具车：“先办正事，往日的账后算。”",[fx('nemesis_shift',-1)],"火巷父亲的证言暂且压下了旧怨，同门截了补给，旧账未勾。");
    }
    if (chain === 'family' && variant === 'watched' && context.witness && context.harmedPorters) definition.body = "火巷救下的孩子还活着。父亲认出你，同行伤员却说起你取走水或银箱的事；脚夫把两边消息接到了一起。门前巡兵还在问话。你可引兵让他们撤走，或收下父亲备好的路费独行。";
    if (chain === 'transport' && variant === 'joined') {
      const link = context.informerRoute ? "被你保下的密探托脚夫送来运械时刻" : context.familyHelp ? "火巷父亲托人带来可通行的后巷路线" : "你在路上帮过的工友带来押车消息";
      definition.body = "驿道旧识在货棚认出了你，" + link + "。两路人这才接上了线。药和绷带已备下，追兵的运车也将经过；你可留下换药，或带伤同他们去截运。";
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
