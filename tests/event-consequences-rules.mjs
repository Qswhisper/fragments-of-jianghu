import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createVerificationOutput} from './verification-output.mjs';
const out=await createVerificationOutput('event-consequences-rules');
const report={scope:'Isolated production-rule fixtures; not natural gameplay or player saves',checks:[],distributions:[],passed:false};
try{
 const c={console};c.window=c;c.G={scenes:{}};const store=new Map();c.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};vm.createContext(c);
 for(const file of ['data/cards.js','data/relics.js','data/journey-events.js','data/events.js','systems/player.js','systems/nemesis.js','systems/storage.js','systems/journey-narrative.js','systems/event-consequences.js','systems/run-report.js'])vm.runInContext(await fs.readFile(new URL('../'+file,import.meta.url),'utf8'),c,{filename:file});
 const G=c.G,copy=v=>JSON.parse(JSON.stringify(v)),normalize=v=>JSON.parse(JSON.stringify(v));
 const base=(seed=1)=>({scene:'event',player:{hp:60,maxHp:80,gold:100,relics:[],chosenStyle:'blade',masterDeckNames:G.cards.getStarterDeck('blade')},map:{actNumber:1,currentNodeId:'node_2',routeSeed:seed,routeHistory:[{act:1,type:'event'}]},combat:{},nemesis:{pool:[{id:'n1',name:'追缉者',level:3,baseHP:100,baseAttack:10,history:[]}],nextId:2},events:{seenIds:[],nextSeed:1900,history:[]}});
 const fixture=(s,d)=>{s=copy(s);s.scene='event';s.event={nodeId:(s.map.actNumber||1)+':'+s.map.currentNodeId,actNumber:s.map.actNumber,eventId:d.id,title:d.title,body:d.body,choices:copy(d.choices),consequence:d.consequence||null,mode:'choice',copyRevision:3};return s;};
 const choose=(s,id,ch)=>{const d=G.events.definitions.find(d=>d.id===id);s=copy(s);s.map.actNumber=d.act;return G.events.applyChoice(fixture(s,d),ch);};
 const later=(s,a=3)=>{s=copy(s);s.map.actNumber=a;s.map.currentNodeId='node_6';s.map.routeHistory=Array.from({length:(a-1)*5+3},(_,i)=>({act:Math.floor(i/5)+1,type:'event'}));delete s.event;return s;};
 let s=choose(base(),'act1_child_in_embers','carry_out');
 assert.equal(G.eventConsequences.candidates(s,'early').length,0);
 const restored=copy(s);G.storage.saveRun(restored);assert.deepEqual(normalize(G.storage.loadRun().events),normalize(s.events));
 s=later(s,2);const offered=G.eventConsequences.candidates(s,'late');assert.ok(offered.some(x=>x.chain==='family'));assert.equal(G.eventConsequences.candidates(base(),'none').length,0);
 report.checks.push('Consequences wait until a later act and at least two selected route nodes; unknown people cannot appear; full save round trip retains facts');
 const same=copy(s);const first=G.eventConsequences.pick(s,'node_6');assert.deepEqual(normalize(G.eventConsequences.pick(same,'node_6')),normalize(first));
 const seedBefore=s.events.nextSeed;for(let i=0;i<10;i++)G.eventConsequences.pick(s,'node_6');assert.equal(s.events.nextSeed,seedBefore);
 if(first){let ready=G.events.prepareSceneState({...copy(s),event:null});assert.deepEqual(normalize(G.events.prepareSceneState(ready)),normalize(ready));}
 report.checks.push('Reload and repeated preparation keep the offered encounter; opportunity selection consumes neither event reward RNG nor combat RNG');
 // Two earlier choices combine to change a later option, rather than adding a score.
 let mixed=choose(base(),'act1_execution_notice','claim_the_bounty');mixed=choose(mixed,'act1_teahouse_poison','drink_anyway');mixed=later(mixed,3);
 const origin={id:'act1_teahouse_poison',choice:'drink_anyway',act:1};
 let def=G.journeyEvents.build(mixed,'school','divided',origin,G.eventConsequences.context(mixed));assert.equal(def.choices[1].id,'carry_sealed_note');
 const family=G.journeyEvents.build(mixed,'family','shelter',{id:'act1_child_in_embers',choice:'carry_out'},G.eventConsequences.context(mixed));
 mixed=G.events.applyChoice(fixture(mixed,family),'send_word');mixed=later(mixed,4);
 def=G.journeyEvents.build(mixed,'school','divided',origin,G.eventConsequences.context(mixed));assert.equal(def.choices[1].id,'ask_witness');assert.match(def.body,/火巷父亲/);
 let cargo=choose(base(),'act2_overturned_caravan','loot_the_silver');cargo=later(cargo,4);
 assert.equal(G.eventConsequences.variant(cargo,'transport','n'),'bargain');
 let d=G.journeyEvents.build(cargo,'transport','bargain',{id:'act2_overturned_caravan',choice:'loot_the_silver'},G.eventConsequences.context(cargo));assert.equal(d.choices[1].id,'draw_search');
 const info=G.journeyEvents.build(cargo,'informer','allies',{id:'act3_informer_confession',choice:'take_the_hit'},G.eventConsequences.context(cargo));
 cargo=G.events.applyChoice(fixture(cargo,info),'send_schedule');cargo=later(cargo,5);
 d=G.journeyEvents.build(cargo,'transport','bargain',{id:'act2_overturned_caravan',choice:'loot_the_silver'},G.eventConsequences.context(cargo));assert.equal(d.choices[1].id,'use_schedule');assert.match(d.body,/不抵从前/);
 report.checks.push('Family testimony changes the old-camp dispute; informer scheduling unlocks cooperation with previously harmed porters without erasing the grievance');
 const before=normalize(mixed.events.consequences);mixed.events.history=[];assert.deepEqual(normalize(G.eventConsequences.ensure(mixed)),before,'Long-term facts cannot disappear when display history is trimmed');
 const pending=fixture(base(),G.events.definitions[0]);delete pending.events.consequences;pending.event.copyRevision=3;assert.deepEqual(normalize(G.events.prepareSceneState(pending)),normalize(pending),'Pending old choices are untouched');
 const old=base();old.events.history=[{eventId:'act1_child_in_embers',choiceId:'carry_out',choiceLabel:'救孩子',title:'灶灰里的孩子',actNumber:1}];const resources=JSON.stringify(old.player),rng=old.events.nextSeed;G.eventConsequences.ensure(old);assert.equal(old.events.consequences.facts.act1_child_in_embers.choice,'carry_out');assert.equal(JSON.stringify(old.player),resources);assert.equal(old.events.nextSeed,rng);
 report.checks.push('Legacy history migrates only known choices; pending events retain their exact choices; long-lived facts survive trimmed display history');
 // Submit every authored branch using real effects, including one-card/full-upgrade limits.
 let count=0;
 for(const template of G.journeyEvents.definitions){const chain=template.consequence.chain,variant=template.consequence.variant;
   for(const ch of template.choices){for(const edge of [false,true]){
     let q=later(base(),template.act);if(edge)q.player.masterDeckNames=['劈砍+'];
     const b=G.journeyEvents.build(q,chain,variant,{id:'act1_teahouse_poison',choice:'drink_anyway'},G.eventConsequences.context(q));
     q=G.events.applyChoice(fixture(q,b),ch.id);assert.equal(q.event.selectedChoiceId,ch.id);assert.equal(q.events.consequences.count,1);
     assert.ok(q.player.hp>=1&&q.player.hp<=q.player.maxHp);const again=G.events.applyChoice(q,ch.id);assert.deepEqual(normalize(again),normalize(q));
     G.storage.savePersistentNemesis(q.nemesis);assert.equal(G.storage.loadPersistentNemesis().pool[0].level,q.nemesis.pool[0].level);
     if(ch.effects.some(e=>e.type==='upgrade_random_card')&&edge)assert.match(q.event.resultText,/二十块/);
     const r=G.runReport.build(q,'defeat');assert.ok(r.detailLines.includes(q.events.consequences.resolved[chain].line));assert.ok(r.consequenceSummary);
     assert.equal(G.eventConsequences.candidates(q,'same-act').length,0);count++;
   }}
 }
 report.checks.push(count+' authored branch/limit fixtures: effects, fallback copy, duplicate submission, persistent nemesis, report response and per-act cooldown');
 const totals=new Map(),variants=new Set();let absent=0;
 for(let seed=1;seed<=400;seed++){
   let q=choose(base(seed),'act1_child_in_embers','carry_out');q=choose(q,'act1_teahouse_poison','drink_anyway');q=choose(q,'act2_overturned_caravan','free_the_horse');q=choose(q,'act3_informer_confession','take_the_hit');
   let seen=0;
   for(let a=2;a<=5;a++){for(const node of ['node_2','node_6']){q=later(q,a);q.map.currentNodeId=node;q.map.routeHistory=q.map.routeHistory.slice(0,(a-1)*5+(node==='node_2'?1:3));const e=G.eventConsequences.pick(q,node);if(!e){absent++;continue;}seen++;variants.add(e.id);q=G.events.applyChoice(fixture(q,e),e.choices[seen%2].id);}}
   assert.ok(seen<=3);totals.set(seen,(totals.get(seen)||0)+1);
 }
 assert.ok(absent>0);assert.ok(totals.size>1);assert.ok(variants.size>=5);report.distributions={runs:400,totals:Object.fromEntries(totals),encounterVariants:[...variants],ordinaryOpportunities:absent};
 report.checks.push('400 fixed route-seed fixtures vary which people return and how many; at most three later encounters and one per act, with ordinary-event opportunities retained');
 report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1;}finally{await fs.writeFile(new URL('summary.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
