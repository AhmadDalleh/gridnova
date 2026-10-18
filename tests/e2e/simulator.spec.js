import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { SHOTS, guard, expectScene, open } from './helpers.js';
import { simulate } from '../../src/model/simulate.js';
import { fmtMw, fmtAed, fmtYears, fmtHours, glowFromReduction } from '../../src/ui/format.js';

// Scene 07 end to end: every number on screen must equal what the model returns for the same inputs.
let problems;
test.beforeEach(async ({ page, context }) => {
  problems = await guard(page, context);
});
test.afterEach(() => {
  expect(problems, problems.join('\n')).toEqual([]);
});

const kpi = (page, key) => page.locator(`[data-kpi="${key}"] .kpi-value`);

// KPIs count up, so assert with retries (toHaveText polls) until the final text appears.
async function expectKpis(page, inputs) {
  const r = simulate(inputs);
  await expect(kpi(page, 'peak')).toHaveText(fmtMw(r.peakAfterMw));
  await expect(kpi(page, 'value')).toHaveText(fmtAed(r.netAnnualValue));
  await expect(kpi(page, 'capex')).toHaveText(fmtAed(r.capex));
  await expect(kpi(page, 'payback')).toHaveText(fmtYears(r.paybackYears));
  await expect(kpi(page, 'resilience')).toHaveText(fmtHours(r.resilienceHours));
  await expect(page.locator('.peak-label')).toHaveText(`Peak after ${r.peakAfterMw.toFixed(2)} MW`);
  return r;
}

const BALANCED = { solarMw: 4, batteryMwh: 8 };
const pressed = (page, attr, value) => page.locator(`[${attr}="${value}"]`).getAttribute('aria-pressed');

async function openSimulator(page) {
  await open(page, '#/scene-7');
  await expectScene(page, 7);
}

test('opens on Balanced; KPIs, chart label and Core glow come from the model', async ({ page }) => {
  await openSimulator(page);
  const r = await expectKpis(page, BALANCED);
  await expect(page.locator('#in-solar')).toHaveValue('4');
  await expect(page.locator('#in-battery')).toHaveValue('8');
  expect(await pressed(page, 'data-preset', 'balanced')).toBe('true');
  expect(await pressed(page, 'data-day', 'normal')).toBe('true');
  await expect(page.locator('.scene[data-scene="simulator"] .tag').first()).toHaveText(/illustrative/i);
  await expect.poll(async () => Number(await page.locator('#core').evaluate((e) => e.style.getPropertyValue('--glow'))))
    .toBeCloseTo(glowFromReduction(r.peakReductionPct), 2);
});

test('slider keys change the numbers, not the scene; Escape releases the slider', async ({ page }) => {
  await openSimulator(page);
  await expectKpis(page, BALANCED);
  await page.focus('#in-solar');
  await page.keyboard.press('ArrowRight');                 // slider handles it: 4 -> 4.5 MW
  await expect(page.locator('#in-solar')).toHaveValue('4.5');
  await expectKpis(page, { solarMw: 4.5, batteryMwh: 8 });
  await expect(page.locator('#counter')).toHaveText('07 / 09');
  expect(await page.locator('[data-preset][aria-pressed="true"]').count()).toBe(0);   // custom size: no preset lit
  await page.keyboard.press('Escape');                     // releases the slider...
  await page.keyboard.press('ArrowLeft');                  // ...so the clicker keys navigate again
  await expectScene(page, 6);
});

test('both sliders and the heatwave toggle drive the model', async ({ page }) => {
  await openSimulator(page);
  await page.locator('#in-solar').fill('6');
  await page.locator('#in-battery').fill('16');
  const res = await expectKpis(page, { solarMw: 6, batteryMwh: 16 });
  expect(res.peakAfterMw).toBeCloseTo(5.39, 1);
  expect(await pressed(page, 'data-preset', 'resilience')).toBe('true');   // sizes match a preset, so it lights up

  await page.click('[data-day="heatwave"]');
  const hot = await expectKpis(page, { solarMw: 6, batteryMwh: 16, dayType: 'heatwave' });
  expect(hot.peakAfterMw).toBeGreaterThan(res.peakAfterMw);
  await expect(page.locator('#heat-note')).toBeVisible();
  await expect(kpi(page, 'capex')).toHaveText(fmtAed(res.capex));          // economics stay on the normal day
  await expect(kpi(page, 'payback')).toHaveText(fmtYears(res.paybackYears));

  await page.click('[data-day="normal"]');
  await expectKpis(page, { solarMw: 6, batteryMwh: 16 });
  await expect(page.locator('#heat-note')).toBeHidden();
});

test('presets: Baseline shows n/a payback, Balanced heatwave peaks at 7.48 MW', async ({ page }) => {
  await openSimulator(page);
  await page.click('[data-preset="baseline"]');
  await expectKpis(page, { solarMw: 0, batteryMwh: 0 });
  await expect(kpi(page, 'payback')).toHaveText('n/a');
  await page.click('[data-preset="balanced"]');
  await page.click('[data-day="heatwave"]');
  await expect(kpi(page, 'peak')).toHaveText('7.48 MW');
  await expect(page.locator('.peak-label')).toHaveText('Peak after 7.48 MW');
});

test('state survives leaving and returning, and a page reload', async ({ page }) => {
  await openSimulator(page);
  await page.click('[data-preset="resilience"]');
  await page.click('[data-day="heatwave"]');
  const inputs = { solarMw: 6, batteryMwh: 16, dayType: 'heatwave' };
  await expectKpis(page, inputs);

  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 6);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 7);
  await expect(page.locator('#in-solar')).toHaveValue('6');
  await expect(page.locator('#in-battery')).toHaveValue('16');
  expect(await pressed(page, 'data-day', 'heatwave')).toBe('true');
  await expectKpis(page, inputs);

  await page.reload();                                       // sessionStorage restores the inputs
  await expect(page.locator('#preloader')).toHaveCount(0);
  await expectScene(page, 7);
  await expectKpis(page, inputs);
});

test('assumptions drawer lists the model constants and closes with Escape', async ({ page }) => {
  await openSimulator(page);
  await page.click('#btn-assumptions');
  await expect(page.locator('#s7-drawer')).toBeVisible();
  await expect(page.locator('.drawer-body .row')).toHaveCount(16);
  const text = await page.locator('#s7-drawer').innerText();
  for (const s of ['AED 300 / MWh', 'AED 40,000 / MW / month', 'AED 3 M / MW', 'AED 1.1 M / MWh', '1.5 % of capex', '2.5 MW', 'Battery degradation', 'Illustrative']) {
    expect(text.toLowerCase()).toContain(s.toLowerCase());
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#s7-drawer')).toBeHidden();
});

test('hover reads out the hour', async ({ page }) => {
  await openSimulator(page);
  await expectKpis(page, BALANCED);
  const box = await page.locator('#s7-svg').boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.3);
  await expect(page.locator('.hover-text')).toContainText('load');
  await page.mouse.move(5, 5);
  await expect(page.locator('.hover-text')).toHaveText('');
});

test('reduced motion and pause: final values at once, sliders still live', async ({ page }) => {
  await open(page, '#/scene-6');
  await expectScene(page, 6);
  await page.keyboard.press('r');
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 7);
  const r = simulate(BALANCED);
  // no count-up: the final text is there as soon as the scene is settled
  await expect(kpi(page, 'peak')).toHaveText(fmtMw(r.peakAfterMw), { timeout: 300 });
  await page.keyboard.press('r');

  await page.keyboard.press('p');                           // paused: GSAP is frozen, numbers must still follow input
  await page.locator('#in-solar').fill('10');
  await expectKpis(page, { solarMw: 10, batteryMwh: 8 });
  await page.keyboard.press('Escape');
  await page.keyboard.press('p');
});

test('stress: 30 rapid slider changes end on the right numbers, console clean', async ({ page }) => {
  await openSimulator(page);
  await expectKpis(page, BALANCED);
  for (let i = 0; i < 30; i++) {
    await page.locator('#in-solar').fill(String((i % 21) * 0.5));
    await page.locator('#in-battery').fill(String((i * 5) % 25));
  }
  const last = { solarMw: (29 % 21) * 0.5, batteryMwh: (29 * 5) % 25 };
  await expectKpis(page, last);
  await expect(page.locator('#counter')).toHaveText('07 / 09');
});

test('screenshots: simulator at 1920x1080 and 1366x768 (Balanced, Heatwave, drawer)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'screenshots are committed from the Chromium run only');
  mkdirSync(SHOTS, { recursive: true });
  for (const [w, h] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('about:blank');                          // a hash-only goto would reuse the open page
    await openSimulator(page);
    await page.click('[data-preset="balanced"]');
    await expectKpis(page, BALANCED);
    await page.waitForTimeout(700);                          // let the count-up and morph finish
    await page.mouse.move(w - 5, 5);
    await page.screenshot({ path: `${SHOTS}/slice3-${w}x${h}-simulator-balanced.png` });
    if (w === 1920) {
      await page.click('[data-day="heatwave"]');
      await expectKpis(page, { ...BALANCED, dayType: 'heatwave' });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${SHOTS}/slice3-${w}x${h}-simulator-heatwave.png` });
      await page.click('[data-day="normal"]');
      await expectKpis(page, BALANCED);
      await page.waitForTimeout(700);                        // let the morph settle before the evidence shot
      await page.click('#btn-assumptions');
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SHOTS}/slice3-${w}x${h}-simulator-drawer.png` });
    }
  }
});
