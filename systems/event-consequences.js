/* Run-local people and facts. No morality score and no shared combat/event RNG. */
(function () {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const hash = value => {
    let result = 2166136261;
    for (const char of String(value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  };
  const act = s => Math.max(1, Math.min(5, s.map?.actNumber || 1));
  const step = s => s.map?.routeHistory?.length || (act(s) - 1) * 5 + (s.map?.visitedNodeIds?.length || 0);
  const roots = {
    family: ['act1_child_in_embers'],
    school: ['act1_teahouse_poison', 'act1_execution_notice', 'act1_river_shrine'],
    transport: ['act2_overturned_caravan', 'act2_cinder_cistern', 'act2_courier_names'],
    informer: ['act3_informer_confession']
  };
  function ensure(s) {
    s.events = s.events || {seenIds: [], nextSeed: 1900, history: []};
    if (s.events.consequences?.schema === 1) return s.events.consequences;
    const state = {schema: 1, seed: hash('people-v1:' + (s.map?.routeSeed || s.events.nextSeed || 1900) + ':' + (s.mission?.attempt || 1)), facts: {}, resolved: {}, count: 0, lastAct: 0, lastStep: -10};
    // Only reconstruct witnessed choices. Pending scenes, effects and RNG stay intact.
    for (const entry of s.events.history || []) {
      if (entry.eventId && entry.choiceId) state.facts[entry.eventId] = {choice: entry.choiceId, act: entry.actNumber || 1, step: Math.max(0, ((entry.actNumber || 1) - 1) * 5)};
    }
    s.events.consequences = state;
    return state;
  }
  const has = (s, id, choice) => ensure(s).facts[id]?.choice === choice;
  const first = (s, chain) => roots[chain].map(id => ({id, ...ensure(s).facts[id]})).filter(f => f.choice && !(f.id === 'act1_river_shrine' && f.choice === 'take_the_blade')).sort((a, b) => a.act - b.act || a.step - b.step)[0];
  function context(s) {
    const f = (id, choice) => has(s, id, choice);
    const recent = (s.map?.routeHistory || []).slice(-3);
    const noise = Number(f('act2_buried_flag', 'carry_it')) + Number(f('act3_chapel_lantern', 'overturn_the_altar')) + Number(f('act4_payroll_ruts', 'take_the_payroll')) + Number(f('act2_courier_names', 'show_names'));
    const shelter = f('echo_family_shelter', 'rest_inside') || f('echo_school_fellowship', 'take_cover');
    const diversion = f('echo_family_watched', 'draw_patrol') || f('echo_informer_tracked', 'send_separately');
    return {
      pressure: Math.max(0, noise + Number(shelter) - Number(diversion)) > 0 || recent.some(n => n.type === 'nemesis'),
      witness: f('act2_courier_names', 'carry_message') || f('echo_family_shelter', 'send_word'),
      familyHelp: f('echo_family_watched', 'draw_patrol') || f('echo_family_shelter', 'send_word'),
      informerRoute: f('echo_informer_allies', 'send_schedule') || f('echo_informer_tracked', 'send_separately'),
      supplies: f('act4_rail_spikes', 'help_the_workers') || f('act4_telegraph_station', 'intercept_wire') || f('act3_medicine_seal', 'leave_for_porters'),
      harmedPorters: f('act2_overturned_caravan', 'loot_the_silver') || f('act2_cinder_cistern', 'drink_alone'),
      soldMedicine: f('act3_medicine_seal', 'sell_crate'),
      namedComrade: f('act1_execution_notice', 'claim_the_bounty'),
      robbedTeacher: f('act1_teahouse_poison', 'flip_the_table')
    };
  }
  function variant(s, chain, nodeId) {
    const c = context(s), source = first(s, chain);
    const patrol = c.pressure || hash(ensure(s).seed + ':patrol:' + chain + ':' + nodeId) % 4 === 0;
    if (chain === 'family') return source.choice === 'walk_away' ? 'distance' : patrol || c.witness && c.harmedPorters ? 'watched' : 'shelter';
    if (chain === 'school') return c.robbedTeacher ? 'closed' : c.namedComrade ? 'divided' : 'fellowship';
    if (chain === 'informer') return source.choice === 'push_him_out' ? 'receipt' : patrol ? 'tracked' : 'allies';
    return c.harmedPorters || c.soldMedicine ? 'bargain' : c.informerRoute || c.familyHelp || c.supplies ? 'joined' : 'crossing';
  }
  function candidates(s, nodeId) {
    const state = ensure(s);
    if (state.count >= 3 || state.lastAct === act(s) || step(s) - state.lastStep < 3) return [];
    return Object.keys(roots).filter(chain => {
      const origin = first(s, chain);
      return origin && !state.resolved[chain] && act(s) > origin.act && step(s) - origin.step >= 2;
    }).map(chain => ({chain, variant: variant(s, chain, nodeId), age: act(s) - first(s, chain).act}));
  }
  function pick(s, nodeId) {
    const options = candidates(s, nodeId), state = ensure(s);
    if (!options.length) return null;
    // Opportunities depend on the visited route; there is no guaranteed repayment.
    const roll = hash(state.seed + ':opportunity:' + act(s) + ':' + nodeId);
    if (roll % 100 >= (act(s) >= 4 ? 76 : 62)) return null;
    const weighted = options.flatMap(option => Array.from({length: option.age + 1}, () => option));
    const chosen = weighted[hash(state.seed + ':person:' + act(s) + ':' + nodeId) % weighted.length];
    return G.journeyEvents.build(s, chosen.chain, chosen.variant, first(s, chosen.chain), context(s));
  }
  function record(s, event, choice) {
    const state = ensure(s);
    if (!state.facts[event.eventId]) state.facts[event.eventId] = {choice: choice.id, act: event.actNumber, step: step(s)};
    if (event.consequence && !state.resolved[event.consequence.chain]) {
      state.resolved[event.consequence.chain] = {eventId: event.eventId, choice: choice.id, title: event.title, line: choice.aftermath || choice.resultText, act: event.actNumber};
      state.count += 1; state.lastAct = event.actNumber; state.lastStep = step(s);
    }
  }
  function epilogue(s) {
    const state = ensure(s);
    return Object.values(state.resolved).map(entry => entry.line);
  }
  function notes(s) {
    const state = ensure(s), lines = Object.values(state.resolved).map(entry => '《' + entry.title + '》：' + entry.line);
    for (const chain of Object.keys(roots)) {
      const source = first(s, chain);
      if (!source || state.resolved[chain]) continue;
      const entry = (s.events.history || []).find(h => h.eventId === source.id);
      if (entry) lines.push('《' + entry.title + '》：' + entry.choiceLabel + '。此后尚未重逢。');
    }
    return lines;
  }
  G.eventConsequences = {ensure, record, pick, candidates, context, variant, epilogue, notes, origin: first};
})();
