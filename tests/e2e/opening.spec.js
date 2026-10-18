import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { SHOTS, guard, expectScene, open } from './helpers.js';
import { simulate } from '../../src/model/simulate.js';
import { pressureFigures } from '../../src/scenes/02-pressure/figures.js';
import { fmtAed } from '../../src/ui/format.js';

// Scenes 01 and 02 and composed transition A, end to end, from the built file:// page with the network blocked.
let problems;
test.beforeEach(async ({ page, context }) => {
  problems = await guard(page, context);
});
test.afterEach(() => {
  expect(problems, problems.join('\n')).toEqual([]);
});

const S1 = '.scene[data-scene="proposition"]';
const S2 = '.scene[data-scene="pressure"]';
const CYAN = 'rgb(70, 215, 193)';
const figures = pressureFigures(simulate({ solarMw: 0, batteryMwh: 0 }));

// ---- state checks -------------------------------------------------------------------------------------------
/** Scene 01 finished: balance filled, words in their masks, rings/labels/Begin visible, Core settled and big. */
async function expectFinal01(page) {
  await expect(page.locator(`${S1} .balance`)).toHaveCSS('color', CYAN);
  await expect(page.locator(`${S1} .s1-begin`)).toHaveCSS('opacity', '1');
  await expect(page.locator(`${S1} .s1-sub`)).toHaveCSS('opacity', '1');
  for (const ring of await page.locator(`${S1} .s1-ring`).all()) await expect(ring).toHaveCSS('opacity', '1');
  for (const label of await page.locator(`${S1} .s1-label`).all()) await expect(label).toHaveCSS('opacity', '1');
  const off = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} .w`)].map((w) => {
    const a = w.getBoundingClientRect();
    const b = w.parentElement.getBoundingClientRect();
    return Math.hypot(a.left - b.left, a.top - b.top);
  }), S1);
  off.forEach((d) => expect(d).toBeLessThan(2));                               // every word sits exactly in its mask
  const core = () => page.evaluate(() => {
    const body = getComputedStyle(document.querySelector('#core .core-body'));
    const stage = Number(document.getElementById('stage').dataset.scale);
    return { opacity: Number(body.opacity), scale: new DOMMatrix(body.transform).a, width: document.getElementById('core').getBoundingClientRect().width / stage };
  });
  // The Core's size eases in a moment after its centre has arrived, so poll until it has settled.
  await expect.poll(async () => (await core()).width, { message: 'Core is the 520 stage-px hero' }).toBeGreaterThan(480);
  const settled = await core();
  expect(settled.opacity).toBe(1);
  expect(settled.scale).toBeCloseTo(1, 2);
}

/** Scene 02 finished: clock 24:00, curve fully drawn, band visible, counters equal the model, Core is the small peak marker. */
async function expectFinal02(page) {
  await expect(page.locator(`${S2} .s2-clock`)).toHaveText('24:00');
  await expect(page.locator(`${S2} .s2-curve`)).toHaveCSS('stroke-dashoffset', '0px');
  await expect(page.locator(`${S2} .s2-band`)).toHaveCSS('opacity', '1');
  await expect(page.locator(`${S2} [data-stat="window"] .s2-stat-value`)).toHaveText(`${figures.windowHours} h`);
  await expect(page.locator(`${S2} [data-stat="peak"] .s2-stat-value`)).toHaveText(`${Math.round(figures.peakMw)} MW`);
  await expect(page.locator(`${S2} [data-stat="share"] .s2-stat-value`)).toHaveText(`${Math.round(figures.gridSharePct)} %`);
  await expect(page.locator(`${S2} [data-stat="demand"] .s2-stat-value`)).toHaveText(fmtAed(figures.demandChargeAed));
  const w = await page.locator('#core').evaluate((e) => e.getBoundingClientRect().width / Number(document.getElementById('stage').dataset.scale));
  expect(w).toBeGreaterThan(50);
  expect(w).toBeLessThan(64);
}

const balanceAlpha = (page) => page.evaluate((sel) => {
  const m = getComputedStyle(document.querySelector(`${sel} .balance`)).color.match(/[\d.]+/g);
  return m.length > 3 ? Number(m[3]) : 1;
}, S1);

// ---- scene 01 -------------------------------------------------------------------------------------------------
test('scene 01: the opening plays (outline first, then fill) and ends on the finished frame; Begin goes to 02', async ({ page }) => {
  await open(page);
  await expectScene(page, 1);
  await expect(page.locator(`${S1} h1`)).toHaveText(/Energy,\s+in better\s+balance\./);
  await expect(page.locator(`${S1} .eyebrow`)).toHaveText(/a fictional microgrid proposal/i);
  await expect(page.locator(`${S1} .tag`)).toHaveText(/illustrative concept/i);
  await expect(page.locator(`${S1} .s1-label`)).toHaveText(['Generate', 'Store', 'Orchestrate']);
  await page.waitForFunction((sel) => {
    const m = getComputedStyle(document.querySelector(`${sel} .balance`)).color.match(/[\d.]+/g);
    return m.length > 3 && Number(m[3]) < 0.5;                                  // still the outline: fill is not in yet
  }, S1, { timeout: 2000 });
  await expectFinal01(page);
  await page.click(`${S1} .s1-begin`);
  await expectScene(page, 2);
});

test('scene 01: mouse parallax moves the layers and the Core; reduced motion turns it off', async ({ page }) => {
  await open(page);
  await expectFinal01(page);
  const reading = () => page.evaluate((sel) => ({
    rings: new DOMMatrix(getComputedStyle(document.querySelector(`${sel} .s1-layer[data-depth="0.8"]`)).transform).e,
    grid: new DOMMatrix(getComputedStyle(document.querySelector(`${sel} .s1-layer[data-depth="0.3"]`)).transform).e,
    core: getComputedStyle(document.getElementById('core')).transform,
  }), S1);
  await page.mouse.move(40, 40);
  await page.waitForTimeout(1100);
  const a = await reading();
  await page.mouse.move(1880, 1040);
  await page.waitForTimeout(1100);
  const b = await reading();
  expect(Math.abs(b.rings - a.rings)).toBeGreaterThan(20);                      // deeper layer travels farther...
  expect(Math.abs(b.grid - a.grid)).toBeGreaterThan(5);
  expect(Math.abs(b.rings - a.rings)).toBeGreaterThan(Math.abs(b.grid - a.grid));   // ...than the shallow one
  expect(b.core).not.toBe(a.core);

  await page.keyboard.press('r');                                               // reduced motion: layers ease home and stay there
  await page.mouse.move(40, 40);
  await page.waitForTimeout(1100);
  const c = await reading();
  await page.mouse.move(1880, 1040);
  await page.waitForTimeout(1100);
  expect(await reading()).toEqual(c);
});

test('minimum font size: every text on scenes 01 and 02 is at least 22 px', async ({ page }) => {
  await open(page);
  await expectFinal01(page);
  const small = (sel) => page.evaluate((s) => [...document.querySelector(s).querySelectorAll('*')]
    .filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()))
    .map((n) => ({ text: n.textContent.trim().slice(0, 30), px: parseFloat(getComputedStyle(n).fontSize) }))
    .filter((x) => x.px < 22), sel);
  expect(await small(S1)).toEqual([]);
  expect(await small(S2)).toEqual([]);
});

// ---- scene 02 -------------------------------------------------------------------------------------------------
test('scene 02 via transition A: counters equal the model, clock reaches 24:00, Core is the peak marker', async ({ page }) => {
  await open(page);
  await expectFinal01(page);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 2);
  await expectFinal02(page);
  await expect(page.locator(`${S2} h1`)).toHaveText('Demand peaks. Control lags.');
  await expect(page.locator(`${S2} .tag`)).toHaveText(/illustrative/i);
  expect(figures).toMatchObject({ peakMw: 10, gridSharePct: 100, windowHours: 3, demandChargeAed: 4_800_000 });
});

test('scene 02: hover and keyboard readout (arrows move the hour, not the scene; Escape releases)', async ({ page }) => {
  await open(page, '#/scene-2');
  await expectScene(page, 2);
  await expectFinal02(page);
  const box = await page.locator('#s2-chart').boundingBox();
  await page.mouse.move(box.x + box.width * (90 + 1100 * (15 / 24)) / 1220, box.y + box.height * 0.5);
  await expect(page.locator(`${S2} .s2-hover-text`)).toHaveText('15:00 · 10.0 MW');
  await page.mouse.move(5, 5);
  await expect(page.locator(`${S2} .s2-hover-text`)).toHaveText('');

  await page.focus('#s2-chart');
  await expect(page.locator(`${S2} .s2-hover-text`)).toHaveText('15:00 · 10.0 MW');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator(`${S2} .s2-hover-text`)).toHaveText(`14:00 · ${simulate({}).series.load[14].toFixed(1)} MW`);
  await page.keyboard.press('Home');
  await expect(page.locator(`${S2} .s2-hover-text`)).toHaveText('00:00 · 4.2 MW');
  await expect(page.locator('#counter')).toHaveText('02 / 09');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowRight');                                      // focus released: the key navigates again
  await expectScene(page, 3);
});

// ---- transition A ---------------------------------------------------------------------------------------------
test('transition A: title exits, Core flies to the peak, the curve starts drawing when it lands', async ({ page }) => {
  await open(page);
  await expectFinal01(page);
  const rows = await page.evaluate(([s1, s2]) => new Promise((resolve) => {
    const core = document.getElementById('core');
    const curve = document.querySelector(`${s2} .s2-curve`);
    const anchor = document.querySelector(`${s2} [data-core-anchor]`);
    const word = document.querySelector(`${s1} .w`);
    const L = curve.getTotalLength();
    const center = (el) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
    const out = [];
    const t0 = performance.now();
    const frame = () => {
      const t = performance.now() - t0;
      const [cx, cy] = center(core);
      const [ax, ay] = center(anchor);
      const off = parseFloat(curve.style.strokeDashoffset);
      out.push({ t, dist: Math.hypot(cx - ax, cy - ay), width: core.getBoundingClientRect().width, drawn: Number.isNaN(off) ? 0 : 1 - off / L, wordX: word.getBoundingClientRect().left });
      if (t < 3600) requestAnimationFrame(frame); else resolve(out);
    };
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    requestAnimationFrame(frame);
  }), [S1, S2]);

  expect(rows[0].width).toBeGreaterThan(450);                                   // starts as the 520 px hero
  const last = rows.at(-1);
  expect(last.width).toBeGreaterThan(50);
  expect(last.width).toBeLessThan(64);                                          // ends as the 56 px marker
  const landing = rows.find((r) => r.dist < 3);
  expect(landing.t).toBeLessThan(1400);                                         // composed transition A is ~1.1 s
  const started = rows.find((r) => r.drawn > 0.02);
  expect(started.t).toBeGreaterThan(landing.t - 80);                            // the curve does NOT start before the Core lands...
  expect(started.t).toBeLessThan(landing.t + 400);                              // ...and starts right after it
  rows.filter((r) => r.dist > 3).forEach((r) => expect(r.drawn).toBeLessThanOrEqual(0.02));
  expect(last.drawn).toBeGreaterThan(0.99);                                     // and finishes the whole curve
  const early = rows.find((r) => r.t > 300);
  expect(early.wordX).toBeLessThan(rows[0].wordX - 20);                         // title words are sliding out left
  console.log(`transition A: Core landed at ${Math.round(landing.t)} ms, curve started at ${Math.round(started.t)} ms`);
});

test('transition A reverses cleanly: 02 -> 01 restores the finished scene, no replayed opening', async ({ page }) => {
  await open(page);
  await expectFinal01(page);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 2);
  await expectFinal02(page);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 1);
  expect(await balanceAlpha(page)).toBe(1);                                     // never drops back to the outline
  await expectFinal01(page);
  await page.keyboard.press('ArrowRight');                                      // and forward again works
  await expectScene(page, 2);
  await expectFinal02(page);
});

test('transition A with reduced motion: short cross-fade, finished states at once', async ({ page }) => {
  await open(page);
  await expectFinal01(page);
  await page.keyboard.press('r');
  const t0 = Date.now();
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 2);
  await expectFinal02(page);
  expect(Date.now() - t0).toBeLessThan(1500);
  await expect(page.locator(`${S2} .s2-clock`)).toHaveText('24:00', { timeout: 300 });   // no draw to wait for
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 1);
  await expectFinal01(page);
});

// ---- the three edge cases ------------------------------------------------------------------------------------
// Begin only fades in at 2.1 s, so it is clicked at the first moment it is clickable: the opening is still
// finishing (the tag and Begin are still fading in). The arrow key leaves at ~1 s, with "balance." still an outline.
for (const [name, leave] of [
  ['ArrowRight at ~1 s', async (page) => {
    await page.waitForTimeout(1000);
    expect(await balanceAlpha(page)).toBeLessThan(1);
    await page.keyboard.press('ArrowRight');
  }],
  ['the Begin button as soon as it appears', async (page) => {
    await page.waitForFunction((sel) => Number(getComputedStyle(document.querySelector(`${sel} .s1-begin`)).opacity) > 0.3, S1);
    expect(Number(await page.locator(`${S1} .s1-begin`).evaluate((e) => getComputedStyle(e).opacity))).toBeLessThan(1);   // still fading in
    await page.click(`${S1} .s1-begin`, { force: true });
  }],
]) {
  test(`edge 2: leaving scene 01 mid-opening (${name}) kills the opening cleanly; transition A still runs`, async ({ page }) => {
    await open(page);
    await expectScene(page, 1);
    await leave(page);
    await expectScene(page, 2);
    await expectFinal02(page);                                                  // A completed: Core on the peak, curve fully drawn
    await page.keyboard.press('ArrowLeft');                                     // nothing half-finished is left behind
    await expectScene(page, 1);
    await expectFinal01(page);
    expect(await balanceAlpha(page)).toBe(1);
  });
}

test('edge 3a: hash #/scene-2 on load places the Core on the peak and the curve still draws in activate()', async ({ page }) => {
  await open(page, '#/scene-2');
  await expectScene(page, 2);
  await page.waitForFunction((sel) => {                                         // we catch it mid-draw: it is animating, not static
    const c = document.querySelector(`${sel} .s2-curve`);
    const L = c.getTotalLength();
    const drawn = 1 - parseFloat(c.style.strokeDashoffset) / L;
    return drawn > 0.05 && drawn < 0.95;
  }, S2, { timeout: 4000 });
  await expectFinal02(page);
});

test('edge 3b: menu jump to scene 02 draws the curve and lands the Core on the peak', async ({ page }) => {
  await open(page, '#/scene-5');
  await expectScene(page, 5);
  await page.keyboard.press('m');
  await page.locator('#menu-list button').nth(1).click();
  await expectScene(page, 2);
  await expectFinal02(page);
});

test('edge 3c: back from scene 03 to 02 draws the curve again', async ({ page }) => {
  await open(page, '#/scene-3');
  await expectScene(page, 3);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 2);
  await page.waitForFunction((sel) => {
    const c = document.querySelector(`${sel} .s2-curve`);
    const drawn = 1 - parseFloat(c.style.strokeDashoffset) / c.getTotalLength();
    return drawn > 0.05 && drawn < 0.95;
  }, S2, { timeout: 4000 });
  await expectFinal02(page);
});

// ---- edge 1: replay -------------------------------------------------------------------------------------------
test('edge 1: reset()/replay restores the first-load state, so the full opening plays again', async ({ page }) => {
  await open(page, '?e2e');
  await expectFinal01(page);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 2);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 3);

  await page.evaluate(() => window.__gridnova.controller.replay());             // what "Replay the story" will call
  await expectScene(page, 1);
  await page.waitForFunction((sel) => {                                         // the opening is playing again: balance is an outline
    const m = getComputedStyle(document.querySelector(`${sel} .balance`)).color.match(/[\d.]+/g);
    return m.length > 3 && Number(m[3]) < 0.5;
  }, S1, { timeout: 2000 });
  await expectFinal01(page);

  // replay while already on scene 01 plays the opening in place
  await page.evaluate(() => window.__gridnova.controller.replay());
  await page.waitForFunction((sel) => {
    const m = getComputedStyle(document.querySelector(`${sel} .balance`)).color.match(/[\d.]+/g);
    return m.length > 3 && Number(m[3]) < 0.5;
  }, S1, { timeout: 2000 });
  await expectFinal01(page);
  await page.keyboard.press('ArrowRight');                                      // and the story still runs afterwards
  await expectScene(page, 2);
  await expectFinal02(page);
});

// ---- stress ----------------------------------------------------------------------------------------------------
test('stress: 20 alternating -> <- presses between 01 and 02 end clean on scene 01', async ({ page }) => {
  await open(page);
  await expectScene(page, 1);
  for (let i = 0; i < 20; i++) await page.keyboard.press(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
  await expectScene(page, 1);
  await expectFinal01(page);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 2);
  await expectFinal02(page);
});

test('stress: 10x -> then 10x <- through the whole deck returns to a finished scene 01', async ({ page }) => {
  await open(page);
  await expectScene(page, 1);
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await expectScene(page, 9);
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
  await expectScene(page, 1);
  await expectFinal01(page);
});

test('pause during transition A, then navigate: jumps cleanly; unpausing and replaying A works', async ({ page }) => {
  await open(page);
  await expectFinal01(page);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.press('p');
  await page.keyboard.press('ArrowLeft');                                       // frozen transition is finished, queue drains to 01
  await expectScene(page, 1);
  await page.keyboard.press('p');
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 2);
  await expectFinal02(page);
});

// ---- screenshots -----------------------------------------------------------------------------------------------
test('screenshots: scenes 01 and 02 at 1920x1080 and 1366x768, plus a mid-flight frame of transition A', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'screenshots are committed from the Chromium run only');
  mkdirSync(SHOTS, { recursive: true });
  for (const [w, h] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('about:blank');
    await open(page);
    await expectFinal01(page);
    await page.mouse.move(w - 5, 5);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/slice4-${w}x${h}-scene-01.png` });
    if (w === 1920) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SHOTS}/slice4-${w}x${h}-transition-A-mid.png` });
    } else {
      await page.keyboard.press('ArrowRight');
    }
    await expectScene(page, 2);
    await expectFinal02(page);
    await page.mouse.move(w - 5, 5);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/slice4-${w}x${h}-scene-02.png` });
  }
});
