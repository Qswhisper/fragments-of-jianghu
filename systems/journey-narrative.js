/* A finite pursuit case; replays retain gameplay records without inventing new evidence. */
(function () {
  'use strict';
  const number=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(1000000,Math.floor(Number(v)))):0;
  const facts=['原件取回','追缉报录确认','签押与经手人核验','截住后续军械','送交原件，撤走暗线'];
  const defaultChronicle=()=>({deliveries:0,attempts:0,lastOutcome:null,caseClosed:false,lastFailureAct:null,pendingDocument:null});
  function normalize(value){const c=value||{};return {deliveries:number(c.deliveries),attempts:number(c.attempts),lastOutcome:['victory','defeat'].includes(c.lastOutcome)?c.lastOutcome:null,caseClosed:c.caseClosed===true,lastFailureAct:c.lastFailureAct>=1&&c.lastFailureAct<=5?Math.floor(c.lastFailureAct):null,pendingDocument:c.lastOutcome==='defeat'?(['卖国密约','军械往来账','密约签押副本'].includes(c.pendingDocument)?c.pendingDocument:c.pendingDocument===undefined&&c.caseClosed!==true?legacyDocument(number(c.deliveries)+1):null):null};}
  const legacyDocument=index=>index===1?'卖国密约':index%2===0?'军械往来账':'密约签押副本';
  function ensure(s){
    s.chronicle=normalize(s.chronicle);
    if(!s.mission){
      // Existing active saves keep their exact combat/route/deck. Past acts
      // establish that the traveler has already collected the evidence.
      const act=s.map?.actNumber||s.combat?.actNumber||1;
      if(s.scene!=='title'||s.runReport?.active)s.chronicle.attempts=Math.max(1,s.chronicle.attempts);
      s.mission={index:s.chronicle.deliveries+1,attempt:Math.max(1,s.chronicle.attempts),retrieved:act>1||!!s.map?.clearedActs?.includes(1),resolved:false,outcome:null};
    }
    if(s.mission.schema!==2){
      const act=s.map?.actNumber||s.combat?.actNumber||1;
      s.mission.document=legacyDocument(s.mission.index||s.chronicle.deliveries+1);
      s.mission.progress=Math.max(s.mission.retrieved?1:0,Math.min(4,act-1));
      if(s.map?.completed&&s.mission.outcome==='victory')s.mission.progress=5;
      s.mission.replay=false;s.mission.schema=2;
    }
    s.mission.progress=Math.max(0,Math.min(5,number(s.mission.progress)));
    if(s.mission.retryFromAct===undefined)s.mission.retryFromAct=!s.mission.replay&&s.chronicle.lastOutcome==='defeat'?s.chronicle.lastFailureAct:null;
    return s;
  }
  function documentName(s){
    return s.mission?.document||legacyDocument(s.mission?.index||normalize(s.chronicle).deliveries+1);
  }
  function begin(s){
    s.chronicle=normalize(s.chronicle);s.chronicle.attempts+=1;
    const pending=s.chronicle.pendingDocument;
    const replay=s.chronicle.deliveries>0&&(!pending||s.chronicle.caseClosed&&pending==='卖国密约');
    s.mission={schema:2,index:s.chronicle.deliveries+1,attempt:s.chronicle.attempts,document:pending||'卖国密约',replay,retryFromAct:!replay&&s.chronicle.lastOutcome==='defeat'?s.chronicle.lastFailureAct:null,progress:0,retrieved:false,resolved:false,outcome:null};
    return s;
  }
  function crossGate(s,act){ensure(s);if(act===1)s.mission.retrieved=true;if(act>=1&&act<=4)s.mission.progress=Math.max(s.mission.progress,act);return s;}
  function finish(s,outcome){
    ensure(s);
    if(s.mission.resolved)return s;
    // The completed map is the delivery boundary, not an ordinary victory.
    if(outcome==='victory'&&!s.map?.completed)return s;
    s.mission.resolved=true;s.mission.outcome=outcome;s.chronicle.lastOutcome=outcome;
    if(outcome==='victory'){
      s.mission.retrieved=true;
      s.mission.progress=5;s.chronicle.caseClosed=true;
      s.chronicle.pendingDocument=null;
      s.chronicle.deliveries=Math.max(s.chronicle.deliveries,s.mission.index);
    }else {s.chronicle.lastFailureAct=Math.max(1,Math.min(5,s.map?.actNumber||s.combat?.actNumber||1));s.chronicle.pendingDocument=documentName(s);}
    return s;
  }
  function arrival(s,stage){
    if(stage==='alley')return "墙根缺口后，溃兵横刀堵住泥巷。\n“留下钱，还是留下命？”\n城里有人等你，身后追兵已近。\n先闯过眼前这条路。";
    const c=normalize(s.chronicle),name=documentName(s);
    const lead=s.mission?.replay?(c.lastOutcome==='defeat'?'此案已结。伤已养好，重走这趟南下。':'此案已结。再行一局，重走这趟南下。'):c.lastOutcome==='defeat'?"伤已养好。暗线保住了证据，追兵也重新封了路。":"清末。你是朝廷弃置的死士，认得密约上的签押。";
    return lead+'\n今夜进城，取回《'+name+"》。\n穿过五道封锁，送交南方革命党核验。\n追兵要夺卷封口。你先从缺口入城。";
  }
  function stage(s,act=s.map?.actNumber||s.combat?.actNumber||1){
    const name=documentName(s);
    if(act===2&&s.mission?.retryFromAct>2)return "旧报录还记得，封锁和运械去向却可能变了。带卷走过驿道，再查一遍。";
    if(act===4&&s.mission?.retryFromAct===5)return "养伤这些日子，追兵修好了铁路断口，又筹来军械。封锁重设，还得南下截住这一批。";
    return [
      '取回《'+name+'》原件，查明谁在出卖暗线；签押必须由你带往南方核验。',
      "带卷穿过焦土驿道，追查报录去向。败退者已报上你的招式，补来的军械也要经过这条路。",
      "到津门核对签押，查出军械经手人。租界包探拿钱报信，桥口的枪手等着替这桩交易封口。",
      "沿铁路南下，截住报录所记的下一批军械。断了补给，追兵手里已有的枪仍能开火。",
      '越过最后一道封锁，把原件与经手人名单交给革命党接应人，核验后撤走暴露的暗线。'
    ][Math.max(1,Math.min(5,act))-1];
  }
  function transition(s,act,brief=false){
    if(brief)return [
      "暗线递来原件，哪些联络点泄露了，终于有了凭据。天亮后，你带卷走上驿道。",
      "驿站报录写得清楚：败退者报上招式，运械车沿路补枪。数日后，你抵达津门。",
      "津门暗线认出了签押，也认出了运械经手人。你收好名单，沿铁路向南。",
      "工友拆去支线轨钉，下一批军械过不来了。追兵手里的枪却还在，渡口仍须突围。",
      "原件和名单验过，暴露的暗线已撤离。这次追缉案，到此结束。"
    ][act-1];
    return [
      '城内暗线趁守军败退，将《'+documentName(s)+"》交到你手里。哪些联络点已泄露，都在卷中；天亮后，你带卷走上驿道。",
      "夺来的驿站报录上，追缉处令守军截人，败退者报上你的招式，运械车随后补枪。你带卷赶路，数日后抵达津门。",
      "津门暗线认出了原件上的签押和运械经手人。包探拿钱报信，军营照报录封路；你收好名单，沿铁路向南。",
      "报录交到工友手里。关口一破，他们便拆去转运支线轨钉，截住下一批军械。追兵手里的枪仍在，渡口还得闯。",
      '你乘暗线小船过江，将《'+documentName(s)+"》和名单交给革命党接应人。签押验过，暴露的联络点开始撤离。"
    ][act-1];
  }
  function outcome(s,win){
    const name=documentName(s);
    if(win)return '《'+name+"》已验明，暴露的暗线也已撤走。追兵的后续军械没能送到，这趟差事到此了结。";
    const act=Math.max(1,Math.min(5,s.map?.actNumber||s.combat?.actNumber||1));
    const rescue=["溃兵争路时，暗线把脱力的你拖出了泥巷。","驿道接应人将你藏进撤离的伤兵车队。","桥口换岗时，津门暗线带你躲进码头藏身处。",'铁路工友用运伤车将你带离封锁线。','渡口接应人借小船把你从岸边带走。'][act-1];
    return rescue+'伤重撤回藏身处。'+(s.mission?.retrieved?"残卷已藏进暗线的转移点，接应人退回北方隐匿。等伤养好，再去取回。":"证据还在城内，由暗线守着。养好伤，再去取。");
  }
  const preparation="武艺没有忘，带哪些招式上路，却要看这次的伤势、器械和补给。前次的旧物与余款，有些散失在路上，有些用来养伤和接应。出发时的一百大洋，是暗线重新筹来的盘缠。";
  const setting="清末，二十世纪初。这一趟从京城，经津门租界、北洋军营，走到南下渡口，辗转数日乃至数周。清廷布下密探，调动地方守军，以沿路军械补给支撑追缉。";
  function purpose(s){return "官员私售军械、出卖暗线，都在原件上留下了签押。你曾经手密押，能向南方接应人对出验真暗语；抄本和口传都不能代替这份原件。北方联络点已暴露，暗线只能帮你藏件转运，过封锁、送核验仍须你来。追缉处下令夺卷封口，地方守军照令截人；租界包探拿钱报信，军营照运械账供枪。"+(s.mission?.replay?'本局重走这次追缉案，旧仇与战绩作为玩法记录沿用。':'');}
  const healthMeaning='气血表示你还能撑多久，受伤和疲劳都会消耗它。重伤会留下旧患，治疗和调息可提高气血上限。气血归零表示失去战斗能力；有接应的人仍可能获救。';
  function task(s){
    const name=documentName(s);
    if(s.mission?.resolved&&s.mission.outcome==='victory')return '此案已结：《'+name+'》已交付验真，暴露的暗线已撤离。';
    if(s.mission?.resolved&&s.mission.outcome==='defeat')return '此行败退：《'+name+'》仍由暗线保管，尚未交付；养伤后再护送南下。';
    return '此行任务：'+(s.mission?.retrieved?'护住《'+name+'》原件，继续南下':'取回《'+name+'》，穿过五道封锁')+'，交给南方革命党。';
  }
  const progressSummary=s=>facts.slice(0,Math.min(5,s.mission?.progress||0));
  G.journeyNarrative={defaultChronicle,normalize,ensure,begin,crossGate,finish,documentName,arrival,stage,transition,outcome,preparation,setting,purpose,healthMeaning,task,progressSummary};
})();
