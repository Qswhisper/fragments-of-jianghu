/* Short, saved chapter handoffs. Reading never consumes route or combat RNG. */
(function () {
  'use strict';
  const chapters = [
    {title:'城根交卷',body:'城根铺子里，老陈解开油布，把原件推过桌面。签押下列着几个熟悉的联络点，他替其中两家递过信。\n“天亮我就去西山。你带卷走驿道，到了南边，让他们先撤人。”茶还温着，门外已响起巡哨的铜锣。',button:'收好原件动身',art:'assets/journey/chapters-20261030/chen-handoff.png'},
    {title:'驿站报录',body:'接应人摊开从驿站截下的报录。先前败退者报上了你的路数，追缉处的批令压在后面：沿路添兵，运械补枪。\n夹页记着津门的货栈和经手签押。你把它夹入原件，得先找到认得这些签押的人。',button:'循报录往津门',art:'assets/journey/chapters-20261030/post-report.png'},
    {title:'津门验押',body:'津门掌柜把原件与旧账并排摊开，逐个核对签押，抄下军械经手人的名字：“这几笔，我见他们结过账。”\n收纸时，他带来一句口信：老陈已在西山煤窑落脚，人平安。你把名单折好，沿铁路向南。',button:'带名单向南',art:'assets/journey/chapters-20261030/tianjin-verification.png'},
    {title:'支线拆轨',body:'关口一破，工友便照报录核过车次，拔下转运支线的轨钉。撬棍落地，领头的人坐在枕木上，半晌才松开攥紧的手。\n“下一批军械过不来了。可渡口那些枪，还装着子弹。”你替他把道旁的灯吹熄，往江边走。',button:'赶往南下渡口',art:'assets/journey/events-20261028/act4_rail_spikes.png'},
    {title:'残卷送达',body:'南方接应人逐页核过原件和名单，又与你对完暗语，才把撤走暗线的口信送上船。\n他递来煤窑捎出的便条。老陈写着：“这里给工钱，饭也管够。你那边办完，就歇歇。”你认得那笔迹，把纸折好收下。',button:'查看本局结算',art:'assets/journey/story-20261002/report-victory-v2.png'}
  ];
  const active = s => s?.scene==='map' && s.map?.passage?.schema===1 && Number.isInteger(s.map.passage.act) && s.map.passage.act>=1 && s.map.passage.act<=5;
  function describe(s) {
    if(!active(s))return null;
    const act=s.map.passage.act,entry={...chapters[act-1],act};
    if(s.mission?.storyRevision===1&&s.mission.retryFromAct){
      if(act===1){entry.body='接应人解开存放在转移点的油布包，把原件递来：“老陈托人送回来的。他还在西山，叫你养好伤再走。”\n你重新核过封皮下的签押。暗线把驿道上的新路口记在纸边；追兵已重设封锁，这趟仍得带卷南下。';entry.art=chapters[1].art;}
      if(act===3)entry.body=entry.body.replace('已在西山煤窑落脚','仍在西山煤窑做工');
    }
    // Old active saves never acquired the new personal connection on opening.
    if(s.mission?.storyRevision!==1){
      if(act===1)entry.body='城根铺子里，接应人解开油布，把《'+G.journeyNarrative.documentName(s)+'》原件交到你手里。签押下列着已经泄露的联络点。\n“北城不能待了。你带卷走驿道，到了南边，让他们先撤人。”门外巡哨敲起铜锣，你贴身收好原件。';
      if(act===3)entry.body='津门掌柜把原件与旧账并排摊开，逐个核对签押，抄下军械经手人的名字：“这几笔，我见他们结过账。”\n他收起印谱，掩好窗。租界包探已经报了信，铁路沿线仍在封路；你把名单折好，继续向南。';
      if(act===5)entry.body='南方接应人逐页核过《'+G.journeyNarrative.documentName(s)+'》原件和名单，又与你对完暗语，才把撤走暗线的口信送上船。\n天色渐亮，船家解开缆绳。你把空下来的油布叠好。这趟差事，到这里交清了。';
    }
    return entry;
  }
  function open(s,act){
    if((s.mission?.readPassages||[]).includes(act))return s;
    s.map.passage={schema:1,act};return s;
  }
  function finish(s){
    if(!active(s))return s;
    const next=JSON.parse(JSON.stringify(s)),act=next.map.passage.act;
    next.map.passage=null;
    next.mission.readPassages=[...new Set([...(next.mission.readPassages||[]),act])];
    return act===5?G.runReport.enter(next,'victory'):next;
  }
  const begin=G.journeyNarrative.begin,arrival=G.journeyNarrative.arrival;
  G.journeyNarrative.begin=function(s){begin(s);s.mission.storyRevision=1;return s;};
  G.journeyNarrative.arrival=function(s,stage){
    if(stage!=='gate'||s.mission?.storyRevision!==1||s.mission.replay||s.chronicle?.lastOutcome==='defeat')return arrival(s,stage);
    return '清末。你是朝廷弃置的死士，认得密约上的签押。\n旧营清洗那夜，文书老陈从后门放走你。今夜，他在城里等你取《'+G.journeyNarrative.documentName(s)+'》。\n穿过五道封锁，把原件送交南方革命党。追兵要夺卷封口，你得先找到老陈。';
  };
  G.journeyPassage={active,describe,open,finish};
})();
