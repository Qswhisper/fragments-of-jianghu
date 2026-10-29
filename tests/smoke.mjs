import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import {createVerificationOutput} from './verification-output.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing ${name} value`);
  return args[index + 1];
}
const entry = path.resolve(root, option('--entry', 'index.html'));
const output = fileURLToPath(await createVerificationOutput('smoke',option('--output',undefined)));
await fs.mkdir(output, { recursive: true });
let browser;
let channel = 'chrome';
try {
  browser = await chromium.launch({channel, headless: true, args: ['--mute-audio']});
} catch (error) {
  if (!/not found|doesn't exist|ENOENT/i.test(error.message)) throw error;
  channel = 'msedge';
  browser = await chromium.launch({channel, headless: true, args: ['--mute-audio']});
}
const errors = [];
const checks = [];
const summary = { channel, entry, checks, errors, limitations: [
  'Opening fight only; not a full campaign or balance evaluation.',
  'Side scenes use isolated state fixtures; their complete interactions are not verified.'
] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', error => errors.push(error.stack));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => {
    // Scene switches and reload cancel in-flight audio streams normally.
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
    errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  await page.goto(pathToFileURL(entry).href);
  await page.waitForFunction(() => window.G?.main && window.render_game_to_text);
  const state = () => page.evaluate(() => G.main.getState());
  const settle = () => page.evaluate(() => advanceTime(1200));
  const capture = async name => {
    await settle();
    await page.screenshot({ path: path.join(output, `${name}.png`) });
  };
  const click = async (x, y) => { await page.mouse.click(x, y, { delay: 50 }); await settle(); };
  const begin = async index => {
    await page.evaluate(() => { G.storage.clearAll(); reset_game_state(); });
    await click(1060, 214);
    assert.equal((await state()).title.mode, 'styles');
    await click(610, 200 + index * 72);
    await click(1040, 619);
    assert.equal((await state()).scene, 'combat');
  };
  await capture('02-restored-title');
  summary.content = await page.evaluate(() => ({
    cards: Object.keys(G.cards.definitions).length,
    relics: Object.keys(G.relics.definitions).length,
    events: G.events.definitions.length,
    enemies: Object.keys(G.enemies.definitions).length,
    encounters: Object.keys(G.enemies.encounters).length,
    acts: G.enemies.getActCount()
  }));
  for (const [index, style] of ['blade', 'iron', 'dirty', 'combo'].entries()) {
    await begin(index);
    const before = await state();
    assert.equal(before.player.chosenStyle, style);
    assert.equal(before.combat.hand.length, 5);
    await click(1060, 600);
    const after = await state();
    assert.equal(after.combat.turn, before.combat.turn + 1);
    assert.equal(after.player.energy, after.player.maxEnergy);
    assert.equal(after.combat.hand.length, 5);
    checks.push(`${style}: UI start, enemy turn, energy refill and draw`);
  }
  await begin(0);
  await capture('04-combat');
  const playNamed = async name => {
    const point = await page.evaluate(name => {
      const s = G.main.getState();
      const card = s.combat.hand.find(card => card.name === name);
      const box = G.scenes.combat.getHandLayoutBoxes(s).find(box => box.cardId === card.id);
      return { x: box.hitX + box.hitWidth / 2, y: box.hitY + box.hitHeight / 2 };
    }, name);
    await click(point.x, point.y);
    assert.ok((await state()).combat.selectedCardId, 'Card click should select a card');
    await click(1000, 260);
    await settle();
  };
  await playNamed('抹脖子');
  let s = await state();
  assert.equal(s.player.energy, 2, s.combat.lastAction);
  assert.equal(s.combat.enemies[0].hp, 16);
  assert.equal(s.combat.enemies[0].debuffs.flaw, 3);
  checks.push('UI card targeting: damage, flaw and energy');
  const saved = JSON.stringify({ player: s.player, hand: s.combat.hand, enemies: s.combat.enemies, turn: s.combat.turn });
  await page.reload();
  await page.waitForFunction(() => window.G?.main);
  await click(1060, 306);
  s = await state();
  assert.equal(s.scene, 'combat');
  assert.equal(JSON.stringify({ player: s.player, hand: s.combat.hand, enemies: s.combat.enemies, turn: s.combat.turn }), saved);
  checks.push('Reload and UI continue preserve combat state');
  await playNamed('抹脖子');
  await playNamed('舍身一刀');
  await page.waitForFunction(() => G.main.getState().scene === 'reward');
  s = await state();
  assert.equal(s.player.gold, 120);
  await capture('05-reward');
  await click(1100, 600);
  assert.equal((await state()).scene, 'map');
  checks.push('Unmodified opening fight -> victory -> reward -> map via UI');
  await capture('06-map');
  const mapState = await state();
  for (const scene of ['shop', 'rest', 'event']) {
    await page.evaluate(({ base, scene }) => {
      base.scene = scene;
      base[scene] = null;
      replace_game_state(G.scenes[scene].prepareState(base));
    }, { base: mapState, scene });
    assert.equal((await state()).scene, scene);
    await capture(`fixture-${scene}`);
    checks.push(`${scene}: fixture preparation and rendering`);
    if (scene === 'rest') {
      await click(1000, 350);
      assert.equal((await state()).rest.mode, 'upgrade');
      await capture('fixture-rest-upgrade');
      const point = await page.evaluate(() => {
        const shared = G.scenes.restShared;
        const box = shared.getUpgradeStackBoxes(shared.buildUpgradeStacks(G.main.getState().rest.deckEntries), shared.getLayout())[0];
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
      await click(point.x, point.y);
      const upgraded = await state();
      assert.equal(upgraded.scene, 'map');
      assert.notDeepEqual(upgraded.player.masterDeckNames, mapState.player.masterDeckNames);
      checks.push('Rest fixture: UI upgrade selection changes deck and returns to map');
    }
  }
  await page.evaluate(base => replace_game_state(G.runReport.enter(base, 'defeat')), mapState);
  assert.equal((await state()).title.mode, 'report');
  await capture('fixture-report');
  checks.push('Run report: fixture preparation and rendering');
  await page.setViewportSize({ width: 960, height: 540 });
  const box = await page.locator('#game-canvas').boundingBox();
  assert.ok(box.width <= 960 && box.height <= 540);
  checks.push('Canvas fits 960x540 viewport');
  assert.deepEqual(errors, []);
  summary.passed = true;
} catch (error) {
  summary.passed = false;
  summary.failure = error.stack;
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
}
