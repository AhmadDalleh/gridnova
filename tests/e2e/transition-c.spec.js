import { test, expect } from '@playwright/test';
import { guard, expectScene, open } from './helpers.js';
import { simulate } from '../../src/model/simulate.js';
import { businessFigures } from '../../src/scenes/08-business-case/figures.js';
import { fmtMw, fmtAed, fmtYears } from '../../src/ui/format.js';

// Composed transition C: the four KPI numbers of scene 07 fly into scene 08's cards, and back.
let problems;
test.beforeEach(async ({ page, context }) => { problems = await guard(page, context); });
test.afterEach(() => { expect(problems, problems.join('\n')).toEqual([]); });

const S8 = '.scene[data-scene="business-case"]';
const r = simulate({ solarMw: 4, batteryMwh: 8 });
const f = businessFigures(r);
const clones = (page) => page.evaluate(() => [...document.querySelectorAll('#stage > div[aria-hidden="true"]')].filter((d) => d.style.zIndex === '9').length);

async function expectCards(page) {
  for (const c of f.cards) await expect(page.locator(`${S8} [data-card="${c.key}"] .s8-card-value`)).toHaveText(c.format(c.value), { timeout: 5000 });
}
async function expectKpis(page) {
  await expect(page.locator('[data-kpi="capex"] .kpi-value')).toHaveText(fmtAed(r.capex));
  await expect(page.locator('[data-kpi="value"] .kpi-value')).toHaveText(fmtAed(r.netAnnualValue));
  await expect(page.locator('[data-kpi="payback"] .kpi-value')).toHaveText(fmtYears(r.paybackYears));
  await expect(page.locator('[data-kpi="peak"] .kpi-value')).toHaveText(fmtMw(r.peakAfterMw));
  for (const k of ['capex', 'value', 'payback', 'peak']) await expect(page.locator(`[data-kpi="${k}"] .kpi-value`)).toHaveCSS('opacity', '1');
}

test('transition C: four KPI clones fly from 07 to the 08 cards and land on the model values', async ({ page }) => {
  await open(page, '#/scene-7');
  await expectScene(page, 7);
  await expectKpis(page);
  await page.waitForTimeout(1800);                                               // KPI count-up finished
  const rows = await page.evaluate(() => new Promise((resolve) => {
    const out = [];
    const t0 = performance.now();
    const frame = () => {
      const cl = [...document.querySelectorAll('#stage > div[aria-hidden="true"]')].filter((d) => d.style.zIndex === '9');
      out.push({ t: performance.now() - t0, n: cl.length, x: cl[0] ? cl[0].getBoundingClientRect().left : null, srcOpacity: Number(getComputedStyle(document.querySelector('[data-kpi="capex"] .kpi-value')).opacity) });
      if (performance.now() - t0 < 2200) requestAnimationFrame(frame); else resolve(out);
    };
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    requestAnimationFrame(frame);
  }));
  const flying = rows.filter((x) => x.n === 4);
  expect(flying.length).toBeGreaterThan(10);                                     // four clones really fly
  expect(flying[0].t).toBeLessThan(300);
  expect(new Set(flying.map((x) => Math.round(x.x))).size).toBeGreaterThan(5);   // and they move
  expect(flying.at(-1).t).toBeLessThan(1700);
  expect(rows.at(-1).n).toBe(0);                                                 // clones removed on landing
  expect(flying[2].srcOpacity).toBe(0);                                          // the real source is hidden meanwhile
  await expectScene(page, 8);
  await expectCards(page);
  await expect(page.locator(`${S8} .s8-card-value`).first()).toHaveCSS('opacity', '1');
  await expect.poll(() => page.locator(`${S8} .s8-cash`).evaluate((p) => parseFloat(p.style.strokeDashoffset)), { timeout: 6000 }).toBe(0);
});

test('transition C reverses: the numbers fly back to 07 and 07 is the finished scene', async ({ page }) => {
  await open(page, '#/scene-7');
  await expectScene(page, 7);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 8);
  await expectCards(page);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 7);
  await expectKpis(page);
  await expect.poll(() => clones(page)).toBe(0);   // the flight ends a little after the scene looks settled
  await page.keyboard.press('ArrowRight');                                       // forward again works
  await expectScene(page, 8);
  await expectCards(page);
});

test('transition C: reduced motion = cross-fade, no clones; pause = jumps to the end', async ({ page }) => {
  await open(page, '#/scene-7');
  await expectScene(page, 7);
  await page.keyboard.press('r');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  await expect.poll(() => clones(page)).toBe(0);   // the flight ends a little after the scene looks settled
  await expectScene(page, 8);
  await expectCards(page);
  await page.keyboard.press('r');
  await page.keyboard.press('p');
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 7);
  await expectKpis(page);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 8);
  await expectCards(page);
  await expect.poll(() => clones(page)).toBe(0);   // the flight ends a little after the scene looks settled
  await page.keyboard.press('p');
});

test('transition C: interrupted by rapid keys and by a jump, it still ends clean', async ({ page }) => {
  await open(page, '#/scene-7');
  await expectScene(page, 7);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowLeft');                                        // reverse while flying
  await expectScene(page, 7);
  await expectKpis(page);
  for (let i = 0; i < 6; i++) await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
  await page.keyboard.press('8');
  await expectScene(page, 8);                                                    // a jump from 07-neighbour: composed or standard, both fine
  await expectCards(page);
  await page.keyboard.press('1');
  await expectScene(page, 1);
  await page.keyboard.press('8');                                                // standard jump into 08 (not from 07): normal entrance
  await expectScene(page, 8);
  await expectCards(page);
  await expect.poll(() => clones(page)).toBe(0);   // the flight ends a little after the scene looks settled
});
