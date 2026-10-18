import { test, expect } from '@playwright/test';
import { guard, expectScene, open } from './helpers.js';
import { simulate } from '../../src/model/simulate.js';
import { businessFigures } from '../../src/scenes/08-business-case/figures.js';
import { PHASES, ASK, sizingLine } from '../../src/scenes/09-decision/roadmap.js';
import { fmtYears } from '../../src/ui/format.js';

// Scenes 08 and 09 end to end, from the built file:// page with the network blocked.
let problems;
test.beforeEach(async ({ page, context }) => { problems = await guard(page, context); });
test.afterEach(() => { expect(problems, problems.join('\n')).toEqual([]); });

const S8 = '.scene[data-scene="business-case"]';
const S9 = '.scene[data-scene="decision"]';
const setSim = (page, solarMw, batteryMwh, dayType = 'normal') => page.evaluate(([s, b, d]) => window.__gridnova.store.set({ sim: { solarMw: s, batteryMwh: b, dayType: d, preset: 'custom' } }), [solarMw, batteryMwh, dayType]);

/** Cards and bar formulas equal what the model says for these inputs (cards count up, so this polls). */
async function expect08(page, inputs) {
  const f = businessFigures(simulate(inputs));
  for (const c of f.cards) await expect(page.locator(`${S8} [data-card="${c.key}"] .s8-card-value`)).toHaveText(c.format(c.value), { timeout: 6000 });
  const formulas = await page.locator(`${S8} .s8-bar`).evaluateAll((bars) => bars.map((b) => b.dataset.formula));
  expect(formulas).toEqual(f.bars.map((b) => b.formula));
  await expect.poll(() => page.locator(`${S8} .s8-cash`).evaluate((p) => parseFloat(p.style.strokeDashoffset)), { timeout: 6000 }).toBe(0);
}

test('scene 08 shows the live simulator state: numbers equal the model for three sizings', async ({ page }) => {
  await open(page, '?e2e#/scene-7');
  await expectScene(page, 7);
  for (const [s, b] of [[4, 8], [6, 16], [0, 0]]) {
    await setSim(page, s, b);
    await page.keyboard.press('ArrowRight');
    await expectScene(page, 8);
    await expect08(page, { solarMw: s, batteryMwh: b });
    await expect(page.locator(`${S8} .tag`).first()).toHaveText(/illustrative/i);
    await page.keyboard.press('ArrowLeft');
    await expectScene(page, 7);
  }
});

test('scene 08: payback marker and counter match the model; baseline has none', async ({ page }) => {
  await open(page, '?e2e#/scene-8');
  await expectScene(page, 8);
  await expect(page.locator(`${S8} .s8-pay text`)).toHaveText(fmtYears(simulate({ solarMw: 4, batteryMwh: 8 }).paybackYears), { timeout: 6000 });
  await setSim(page, 0, 0);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 9);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 8);
  await expect(page.locator(`${S8} .s8-pay`)).toBeHidden();
  await expect(page.locator(`${S8} [data-card="payback"] .s8-card-value`)).toHaveText('n/a', { timeout: 4000 });
});

test('scene 08: hover and focus show each formula; leaving restores the hint', async ({ page }) => {
  await open(page, '#/scene-8');
  await expectScene(page, 8);
  const f = businessFigures(simulate({ solarMw: 4, batteryMwh: 8 }));
  await page.waitForTimeout(3200);
  for (let i = 0; i < f.bars.length; i++) {
    await page.locator(`${S8} .s8-bar`).nth(i).hover();
    await expect(page.locator(`${S8} .s8-formula`)).toHaveText(f.bars[i].formula);
  }
  await page.locator(`${S8} [data-card="capex"]`).focus();
  await expect(page.locator(`${S8} .s8-formula`)).toHaveText(f.cards[0].formula);
  await page.mouse.move(5, 5);
  await page.locator(`${S8} [data-card="capex"]`).blur();
  await expect(page.locator(`${S8} .s8-formula`)).toHaveText(/Hover or focus/);
});

test('scene 08: reduced motion and pause show final values at once', async ({ page }) => {
  await open(page, '?e2e#/scene-7');
  await expectScene(page, 7);
  await page.keyboard.press('r');
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 8);
  await expect(page.locator(`${S8} [data-card="net"] .s8-card-value`)).toHaveText('AED 3.65 M', { timeout: 300 });
  await page.keyboard.press('r');
  await page.keyboard.press('p');
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 9);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 8);
  await expect(page.locator(`${S8} [data-card="net"] .s8-card-value`)).toHaveText('AED 3.65 M', { timeout: 300 });
  await page.keyboard.press('p');
});

test('scene 09: phases are selectable, the ask types in with the live sizing, buttons work', async ({ page }) => {
  await open(page, '?e2e#/scene-8');
  await expectScene(page, 8);
  await setSim(page, 6, 16);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 9);
  await expect(page.locator(`${S9} .s9-ask-text`)).toHaveAttribute('aria-label', ASK.text);
  await expect.poll(() => page.locator(`${S9} .s9-ask-text .ch`).evaluateAll((cs) => cs.filter((c) => getComputedStyle(c).opacity === '1').length), { timeout: 8000 }).toBe(ASK.text.replace(/ /g, '').length);
  await expect(page.locator(`${S9} .s9-sizing`)).toHaveText(sizingLine({ solarMw: 6, batteryMwh: 16 }));
  await expect(page.locator(`${S9} .s9-hint`)).toBeVisible();
  for (const p of PHASES) {
    await page.locator(`${S9} [data-phase="${p.id}"]`).click();
    await expect(page.locator(`${S9} .s9-body h2`)).toHaveText(`Phase ${p.n} · ${p.name}`);
    await expect(page.locator(`${S9} .s9-scope`)).toHaveText(p.scope);
    await expect(page.locator(`${S9} .s9-exit`)).toHaveText(p.exit);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator(`${S9} .s9-hint`)).toBeVisible();
  await page.click(`${S9} .s9-revisit`);
  await expectScene(page, 7);
  await expect(page.locator('#in-solar')).toHaveValue('6');                      // simulator state kept
  await page.keyboard.press('End');
  await expectScene(page, 9);
  await page.waitForTimeout(500);
  await page.click(`${S9} .s9-replay`);
  await expectScene(page, 1);
  expect(await page.evaluate(() => window.__gridnova.store.get().sim.solarMw)).toBe(6);   // Replay keeps simulator choices
  expect(await page.evaluate(() => window.__gridnova.store.get().ui.selectedPhase)).toBeNull();
});

test('scene 09 edge cases: hash arrival, interrupted entrance, reduced motion, Core is large', async ({ page }) => {
  await open(page, '#/scene-9');
  await expectScene(page, 9);
  await expect.poll(() => page.locator(`${S9} .s9-replay`).evaluate((e) => getComputedStyle(e.parentElement).opacity), { timeout: 8000 }).toBe('1');
  const w = await page.locator('#core').evaluate((e) => e.getBoundingClientRect().width / Number(document.getElementById('stage').dataset.scale));
  expect(w).toBeGreaterThan(150);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 8);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.press('ArrowLeft');                                        // leave mid type-in
  await expectScene(page, 8);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 9);
  await page.keyboard.press('r');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 9);
  await expect(page.locator(`${S9} .s9-ask-text .ch`).last()).toHaveCSS('opacity', '1', { timeout: 600 });
});

test('scenes 08 and 09: text is at least 22 px; stress through 07-09', async ({ page }) => {
  await open(page, '#/scene-8');
  await expectScene(page, 8);
  const small = (sel) => page.evaluate((s) => [...document.querySelector(s).querySelectorAll('*')]
    .filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()))
    .map((n) => ({ text: n.textContent.trim().slice(0, 30), px: parseFloat(getComputedStyle(n).fontSize) }))
    .filter((x) => x.px < 22), sel);
  expect(await small(S8)).toEqual([]);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 9);
  expect(await small(S9)).toEqual([]);
  for (let i = 0; i < 10; i++) await page.keyboard.press(i % 2 ? 'ArrowRight' : 'ArrowLeft');
  await page.keyboard.press('8');
  await expectScene(page, 8);
  await expect(page.locator(`${S8} [data-card="net"] .s8-card-value`)).toHaveText('AED 3.65 M', { timeout: 5000 });
});
