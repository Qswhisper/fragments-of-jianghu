import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

import {createVerificationOutput} from './verification-output.mjs';
const output = await createVerificationOutput('input');
await fs.mkdir(output, { recursive: true });
let browser;
try { browser = await chromium.launch({channel: 'chrome', headless: true, args: ['--mute-audio']}); }
catch (error) {
  if (!/not found|doesn't exist|ENOENT/i.test(error.message)) throw error;
  browser = await chromium.launch({channel: 'msedge', headless: true, args: ['--mute-audio']});
}
const checks = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(new URL('../index.html', import.meta.url).href);
  await page.waitForFunction(() => window.G?.main);
  const settle = () => page.evaluate(() => advanceTime(400));
  const state = () => page.evaluate(() => G.main.getState());
  const click = async (x, y, options = {}) => { await page.mouse.click(x, y, { delay: 60, ...options }); await settle(); };
  await page.evaluate(() => { G.storage.clearAll(); reset_game_state(); });
  await click(1060, 214); await click(1040, 619);
  const opening = await state();
  const reset = async () => { await page.mouse.move(640, 80); await page.evaluate(s => replace_game_state(s), opening); await settle(); };
  const cardPoint = name => page.evaluate(name => {
    const s = G.main.getState();
    const card = s.combat.hand.find(c => c.name === name);
    const box = G.scenes.combat.getHandLayoutBoxes(s).find(b => b.cardId === card.id);
    return { id: card.id, x: box.centerX, y: box.centerY };
  }, name);
  const startDrag = async name => {
    const p = await cardPoint(name);
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await settle();
    await page.mouse.move(640, 420, { steps: 5 }); await settle();
  };
  const drop = async (x, y) => { await page.mouse.move(x, y, { steps: 6 }); await settle(); await page.mouse.up(); await settle(); };
  let p = await cardPoint('抹脖子');
  await page.mouse.move(p.x, p.y); await settle();
  assert.equal((await state()).combat.inspectCardId, null);
  await page.evaluate(() => advanceTime(1050));
  assert.equal((await state()).combat.inspectCardId, p.id);
  assert.equal((await state()).combat.selectedCardId, null);
  assert.equal((await state()).player.energy, 3);
  await page.screenshot({ path: new URL('hover.png', output).pathname.replace(/^\//, '') });
  await page.mouse.move(640, 80); await settle();
  assert.equal((await state()).combat.inspectCardId, null);
  checks.push('Hover waits over one second before reading without selecting or spending; leaving closes preview');
  for (const method of ['right', 'Escape']) {
    await click(p.x, p.y);
    assert.equal((await state()).combat.selectedCardId, p.id);
    if (method === 'right') await click(650, 90, { button: 'right' });
    else { await page.keyboard.press('Escape'); await settle(); }
    assert.equal((await state()).combat.selectedCardId, null);
    assert.equal((await state()).player.energy, 3);
    checks.push(`${method} cancels selection without playing`);
  }
  await reset(); await startDrag('抹脖子'); await drop(1000, 260);
  assert.equal((await state()).player.energy, 2);
  assert.equal((await state()).combat.enemies[0].hp, 16);
  assert.equal((await state()).combat.hand.length, 4);
  checks.push('Attack drag applies damage and cost exactly once');
  for (const point of [[250, 300], [640, 80]]) {
    await reset(); await startDrag('抹脖子'); await drop(...point);
    assert.equal((await state()).player.energy, 3);
    assert.equal((await state()).combat.hand.length, 5);
  }
  checks.push('Invalid attack drops on self or empty space do not spend');
  for (const cancel of ['Escape', 'right', 'blur', 'pointercancel']) {
    await reset(); await startDrag('抹脖子');
    if (cancel === 'Escape') await page.keyboard.press('Escape');
    else if (cancel === 'right') { await page.mouse.move(1000, 260); await page.mouse.click(1000, 260, { button: 'right' }); }
    else await page.evaluate(kind => {
      if (kind === 'blur') window.dispatchEvent(new Event('blur'));
      else G.main.getCanvas().dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
    }, cancel);
    await settle(); await drop(1000, 260);
    assert.equal((await state()).player.energy, 3);
    assert.equal((await state()).combat.enemies[0].hp, 25);
    checks.push(`${cancel} interrupts a drag; releasing over enemy cannot play`);
  }
  for (const method of ['click', 'drag']) {
    await reset(); p = await cardPoint('招架');
    if (method === 'click') { await click(p.x, p.y); await click(250, 300); }
    else { await startDrag('招架'); await drop(250, 300); }
    const s = await state();
    assert.equal(s.player.block, 5);
    assert.equal(s.player.energy, 2);
    assert.equal(s.combat.enemies[0].hp, 25);
    assert.equal(s.combat.lastTargetId, 'player');
    checks.push(`Self-defense ${method}: block and cost, no enemy damage`);
  }
  await reset(); p = await cardPoint('招架'); await click(p.x, p.y); await click(1000, 260);
  assert.equal((await state()).player.energy, 3);
  assert.equal((await state()).player.block, 0);
  checks.push('Self-only card rejects enemy target');
  await reset(); p = await cardPoint('抹脖子');
  await page.mouse.move(p.x - 35, p.y); await page.mouse.down(); await settle();
  await page.mouse.move(p.x - 30, p.y); await settle(); await page.mouse.up(); await settle();
  assert.equal((await state()).combat.selectedCardId, p.id);
  checks.push('Small off-center pointer movement stays a click');
  await page.mouse.move(1000, 260); await settle();
  await page.screenshot({ path: new URL('target.png', output).pathname.replace(/^\//, '') });
  await reset();
  await page.evaluate(() => { const s = G.main.getState(); s.player.energy = 0; replace_game_state(G.deck.refreshHandPlayability(s)); });
  await startDrag('抹脖子'); await drop(1000, 260);
  assert.equal((await state()).combat.hand.length, 5);
  assert.equal((await state()).combat.enemies[0].hp, 25);
  checks.push('No-energy drag cannot play');
  await reset();
  await page.evaluate(() => {
    const s = G.main.getState();
    s.combat.enemies.push({ ...structuredClone(s.combat.enemies[0]), id: 'second-target' });
    replace_game_state(s);
  });
  const target = await page.evaluate(() => {
    const b = G.scenes.combat.getEnemyLayoutBoxes(G.main.getState()).find(b => b.enemy.id === 'second-target');
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  await startDrag('抹脖子'); await drop(target.x, target.y);
  const multiple = await state();
  assert.equal(multiple.combat.enemies[0].hp, 25);
  assert.equal(multiple.combat.enemies[1].hp, 16);
  checks.push('Two-enemy fixture: drag damages only the selected enemy');
  await reset(); p = await cardPoint('抹脖子');
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await settle();
  await page.mouse.move(640, 420); await settle();
  await page.mouse.move(p.x, p.y); await page.mouse.up(); await settle();
  assert.equal((await state()).combat.selectedCardId, null);
  assert.equal((await state()).player.energy, 3);
  checks.push('Dragging back onto hand does not synthesize a selection click');
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL('summary.json', output), JSON.stringify({ passed: true, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} finally { await browser.close(); }
