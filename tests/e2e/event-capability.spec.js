import { test, expect } from '@playwright/test';
import { guard, expectScene, open } from './helpers.js';
import { eventFigures, stageView, stageDetail, outcomeFor, miniState, hhmm } from '../../src/scenes/05-peak-event/figures.js';
import { CAPABILITIES } from '../../src/scenes/06-capability/template.js';

// Scenes 05 and 06 end to end, from the built file:// page with the network blocked.
let problems;
test.beforeEach(async ({ page, context }) => {
  problems = await guard(page, context);
});
test.afterEach(() => {
  expect(problems, problems.join('\n')).toEqual([]);
});

const S5 = '.scene[data-scene="peak-event"]';
const S6 = '.scene[data-scene="capability"]';
const f = eventFigures();
const stageBtn = (page, n) => page.locator(`${S5} [data-stage="${n}"]`);
const modeBtn = (page, m) => page.locator(`${S5} [data-mode="${m}"]`);
const clock = (page) => page.locator(`${S5} .s5-clock`);
const opacityOf = (page, sel) => page.locator(sel).first().evaluate((e) => Number(getComputedStyle(e).opacity));

/** Chart in its settled state for (stage, mode): clock, layers, markers and the outcome card all match stageView(). */
async function expectView(page, stage, mode) {
  const v = stageView(stage, mode);
  await expect(clock(page)).toHaveText(hhmm(v.cursor), { timeout: 6000 });
  await expect.poll(() => opacityOf(page, `${S5} .s5-grid`), { timeout: 6000 }).toBeCloseTo(v.grid, 1);
  await expect.poll(() => opacityOf(page, `${S5} .s5-held`), { timeout: 6000 }).toBeCloseTo(v.heldLabel, 1);
  await expect.poll(() => opacityOf(page, `${S5} .s5-outcome`), { timeout: 6000 }).toBeCloseTo(v.outcome ? 1 : 0, 1);
  await expect(page.locator(`${S5} .s5-peak`)).toHaveClass(v.alarm ? /is-alarm/ : /^(?!.*is-alarm).*$/);
  await expect(stageBtn(page, stage)).toHaveAttribute('aria-pressed', 'true');
}

// ---- scene 05 ---------------------------------------------------------------------------------------------------
test('scene 05 opens on stage 01 With GridNova; the chart clock runs to 13:42; stage texts come from the model', async ({ page }) => {
  await open(page, '#/scene-5');
  await expectScene(page, 5);
  await expect(clock(page)).toHaveText('13:42', { timeout: 5000 });
  for (let s = 1; s <= 5; s++) await expect(stageBtn(page, s).locator('.s5-stage-detail')).toHaveText(stageDetail(s, 'with', f));
  await expect(modeBtn(page, 'with')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`${S5} .tag`).first()).toHaveText(/illustrative/i);
  await expectView(page, 1, 'with');
});

test('scene 05: every stage shows its own view, and the outcome card is the model result', async ({ page }) => {
  await open(page, '#/scene-5');
  await expectScene(page, 5);
  for (const s of [3, 1, 5, 2, 4, 5]) {                                          // any order: the state is deterministic per stage
    await stageBtn(page, s).click();
    await expectView(page, s, 'with');
    await expect(page.locator(`${S5} .s5-peak`)).toHaveCSS('opacity', s >= 2 ? '1' : '0');
  }
  const o = outcomeFor('with', f);
  await expect(page.locator(`${S5} .s5-outcome-value`)).toHaveText(o.value);
  await expect(page.locator(`${S5} .s5-outcome-caption`)).toHaveText(o.caption);
  await expect(page.locator(`${S5} .s5-outcome-avoided`)).toHaveText(o.avoided);
  await expect(page.locator(`${S5} .s5-outcome-value`)).toHaveText('−32 %');
  await expect(page.locator(`${S5} .s5-peak text`)).toHaveText('11.0 MW');
  await expect(page.locator(`${S5} .s5-held text`)).toHaveText('7.5 MW');
});

test('scene 05: Without GridNova replays the afternoon; the spike stays at 11.0 MW and turns into an alarm', async ({ page }) => {
  await open(page, '#/scene-5');
  await expectScene(page, 5);
  await stageBtn(page, 5).click();
  await expectView(page, 5, 'with');
  await modeBtn(page, 'without').click();
  await expect(modeBtn(page, 'without')).toHaveAttribute('aria-pressed', 'true');
  const early = await clock(page).textContent();                               // the afternoon restarts from 08:00 ...
  expect(early < '15:00').toBe(true);
  await expectView(page, 5, 'without');                                        // ... and plays through to the end
  const o = outcomeFor('without', f);
  await expect(page.locator(`${S5} .s5-outcome-value`)).toHaveText(o.value);
  await expect(page.locator(`${S5} .s5-outcome-avoided`)).toHaveText(o.avoided);
  await expect(page.locator(`${S5} .s5-outcome-value`)).toHaveText('11.0 MW');
  expect(await page.locator(`${S5} .s5-load`).evaluate((e) => parseFloat(e.style.strokeWidth))).toBeGreaterThan(8);   // alarm: thicker
  await modeBtn(page, 'with').click();
  await expectView(page, 5, 'with');
  for (let s = 1; s <= 5; s++) await expect(stageBtn(page, s).locator('.s5-stage-detail')).toHaveText(stageDetail(s, 'with', f));
});

test('scene 05: the mini system diagram shows the right parts for every stage and both modes', async ({ page }) => {
  await open(page, '#/scene-5');
  await expectScene(page, 5);
  for (const mode of ['with', 'without']) {
    await modeBtn(page, mode).click();
    for (let s = 1; s <= 5; s++) {
      await stageBtn(page, s).click();
      const expected = miniState(s, mode);
      await expect.poll(() => page.evaluate((S) => ({
        links: Object.fromEntries([...document.querySelectorAll(`${S} .s5-mini-link`)].map((p) => [p.dataset.link, p.dataset.state])),
        nodes: [...document.querySelectorAll(`${S} .s5-mini-node`)].map((g) => g.dataset.state),
      }), S5), { message: `${mode} / stage ${s}` }).toMatchObject({ links: expected.links });
    }
  }
});

test('scene 05: Play steps through the stages, a click stops it; with reduced motion it jumps to the end', async ({ page }) => {
  await open(page, '#/scene-5');
  await expectScene(page, 5);
  await page.click(`${S5} #s5-play`);
  await expect(stageBtn(page, 2)).toHaveAttribute('aria-pressed', 'true', { timeout: 4000 });
  await stageBtn(page, 4).click();                                              // a manual click stops the show
  await page.waitForTimeout(2300);
  await expect(stageBtn(page, 4)).toHaveAttribute('aria-pressed', 'true');
  await page.click(`${S5} #s5-play`);
  await expect(stageBtn(page, 5)).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 });
  await expectView(page, 5, 'with');
  await page.keyboard.press('r');
  await stageBtn(page, 1).click();
  await page.click(`${S5} #s5-play`);
  await expect(stageBtn(page, 5)).toHaveAttribute('aria-pressed', 'true', { timeout: 500 });
});

test('scene 05: while paused a stage change shows its final view at once', async ({ page }) => {
  await open(page, '#/scene-5');
  await expectScene(page, 5);
  await expectView(page, 1, 'with');
  await page.keyboard.press('p');
  await stageBtn(page, 3).click();
  await expect(clock(page)).toHaveText('16:00', { timeout: 300 });
  expect(await opacityOf(page, `${S5} .s5-grid`)).toBeCloseTo(1, 1);
  await page.keyboard.press('p');
});

test('scene 05: arrow keys navigate again after a mouse click', async ({ page }) => {
  await open(page, '#/scene-5');
  await expectScene(page, 5);
  await stageBtn(page, 2).click();
  await modeBtn(page, 'without').click();
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 6);
});

test('scene 05 edge cases: interrupted entrance, return visit, back from 06, replay', async ({ page }) => {
  await open(page, '?e2e#/scene-4');
  await expectScene(page, 4);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);                                                // the clock is still running
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 6);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 5);
  await expectView(page, 1, 'with');                                             // every visit starts at stage 01, With GridNova
  await stageBtn(page, 4).click();
  await modeBtn(page, 'without').click();
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 6);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 5);
  await expectView(page, 1, 'with');
  await stageBtn(page, 3).click();
  await page.evaluate(() => window.__gridnova.controller.replay());
  await expectScene(page, 1);
  expect(await page.evaluate(() => window.__gridnova.store.get().ui)).toMatchObject({ eventStage: 1, eventMode: 'with', dayNight: 'day' });
});

// ---- scene 06 ---------------------------------------------------------------------------------------------------
/** Count lit canvas pixels by particle colour (amber / cyan / coral). Sampled every 3 px. */
const pixels = (page) => page.evaluate(() => {
  const c = document.getElementById('s6-canvas');
  const copy = document.createElement('canvas');                                 // read a copy: avoids the browser's "multiple readbacks" warning on the real canvas
  copy.width = c.width;
  copy.height = c.height;
  const cx = copy.getContext('2d', { willReadFrequently: true });
  cx.drawImage(c, 0, 0);
  const d = cx.getImageData(0, 0, c.width, c.height).data;
  const out = { amber: 0, cyan: 0, coral: 0, sum: 0 };
  for (let y = 0; y < c.height; y += 3) {
    for (let x = 0; x < c.width; x += 3) {
      const i = (y * c.width + x) * 4;
      const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      if (a < 30) continue;
      out.sum += r + g * 3 + b * 7 + a;
      // Classify by colour ratios (amber g/r 0.76, coral 0.53, cyan b > r). Overlapping glows blow out towards white: those match nothing.
      if (b > r && b > 120) out.cyan++;
      else if (r >= 150 && g / r > 0.68 && g / r < 0.85 && b / r < 0.5) out.amber++;
      else if (r >= 150 && g / r < 0.62 && b / r < 0.55) out.coral++;
    }
  }
  return out;
});
const dayBtn = (page, m) => page.locator(`${S6} [data-mode="${m}"]`);

async function expectPanels(page, mode) {
  for (const c of CAPABILITIES) {
    const panel = page.locator(`${S6} [data-cap="${c.id}"]`);
    await expect(panel).toHaveClass(c.active.includes(mode) ? /is-active/ : /^(?!.*is-active).*$/);
    await expect(panel.locator('.s6-panel-state')).toHaveText(c[mode]);
  }
  await expect(page.locator(S6)).toHaveAttribute('data-mode', mode);
  await expect(dayBtn(page, mode)).toHaveAttribute('aria-pressed', 'true');
}

test('scene 06 Day: amber particles from the sun dominate; Forecast and Orchestrate are lit', async ({ page }) => {
  await open(page, '#/scene-6');
  await expectScene(page, 6);
  await page.waitForTimeout(1800);                                               // the field fades in over 1.2 s
  const p = await pixels(page);
  expect(p.amber).toBeGreaterThan(150);
  expect(p.amber).toBeGreaterThan(p.cyan * 4);
  expect(p.coral).toBeGreaterThan(20);                                           // a grid stream exists
  await expectPanels(page, 'day');
  await expect(page.locator(`${S6} .tag`).first()).toHaveText(/illustrative/i);
  await expect(page.locator(`${S6} .s6-statement`)).toHaveText('Human-supervised. Explainable decisions.');
});

test('scene 06 Night: the battery (cyan) takes over, amber disappears, Orchestrate and Learn are lit; the choice survives leaving', async ({ page }) => {
  await open(page, '#/scene-6');
  await expectScene(page, 6);
  await page.waitForTimeout(1500);
  const day = await pixels(page);
  await dayBtn(page, 'night').click();
  await expectPanels(page, 'night');
  await expect.poll(async () => (await pixels(page)).amber).toBe(0);
  const night = await pixels(page);
  expect(night.cyan).toBeGreaterThan(night.coral * 2);
  expect(night.cyan).toBeGreaterThan(day.cyan * 3);
  await page.keyboard.press('ArrowRight');                                       // arrow keys work after the mouse click
  await expectScene(page, 7);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 6);
  await expectPanels(page, 'night');                                             // the choice persisted
  await dayBtn(page, 'day').click();
  await expectPanels(page, 'day');
  await expect.poll(async () => (await pixels(page)).cyan * 4).toBeLessThan((await pixels(page)).amber);
});

test('scene 06: the loop moves the particles, and stops on pause, reduced motion and when the scene is left', async ({ page }) => {
  await open(page, '#/scene-6');
  await expectScene(page, 6);
  await page.waitForTimeout(1500);
  const a = await pixels(page);
  await page.waitForTimeout(250);
  expect((await pixels(page)).sum).not.toBe(a.sum);                              // moving
  await page.keyboard.press('p');
  const frozen = (await pixels(page)).sum;
  await page.waitForTimeout(300);
  expect((await pixels(page)).sum).toBe(frozen);                                 // paused: one still frame
  await page.keyboard.press('p');
  await page.keyboard.press('r');
  const still = (await pixels(page)).sum;
  await page.waitForTimeout(300);
  expect((await pixels(page)).sum).toBe(still);                                  // reduced motion: static
  await page.keyboard.press('r');
  await page.waitForTimeout(250);
  const running = (await pixels(page)).sum;
  await page.waitForTimeout(250);
  expect((await pixels(page)).sum).not.toBe(running);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 7);
  await page.waitForTimeout(900);                                                // deactivate() runs when the transition ends (a little after the scene looks done)
  const left = (await pixels(page)).sum;                                         // the scene is hidden: its loop has been stopped
  await page.waitForTimeout(300);
  expect((await pixels(page)).sum).toBe(left);
});

test('scene 06: while paused or reduced, the toggle repaints one static frame in the new mode', async ({ page }) => {
  await open(page, '#/scene-6');
  await expectScene(page, 6);
  await page.waitForTimeout(1500);
  await page.keyboard.press('p');
  await dayBtn(page, 'night').click();
  await expect.poll(async () => (await pixels(page)).amber).toBe(0);
  expect((await pixels(page)).cyan).toBeGreaterThan(100);
  await expectPanels(page, 'night');
  await page.keyboard.press('p');
});

test('scene 06 edge cases: interrupted entrance, hash arrival, back from 07, replay', async ({ page }) => {
  await open(page, '?e2e#/scene-5');
  await expectScene(page, 5);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);                                                // the field is still fading in
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 7);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 6);
  await page.waitForTimeout(1800);
  expect((await pixels(page)).amber).toBeGreaterThan(150);                       // field fully back
  await expectPanels(page, 'day');
  await dayBtn(page, 'night').click();
  await page.evaluate(() => window.__gridnova.controller.replay());
  await expectScene(page, 1);
  expect(await page.evaluate(() => window.__gridnova.store.get().ui.dayNight)).toBe('day');
});

test('scenes 05 and 06: every text is at least 22 px', async ({ page }) => {
  await open(page, '#/scene-5');
  await expectScene(page, 5);
  const small = (sel) => page.evaluate((s) => [...document.querySelector(s).querySelectorAll('*')]
    .filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()))
    .map((n) => ({ text: n.textContent.trim().slice(0, 30), px: parseFloat(getComputedStyle(n).fontSize) }))
    .filter((x) => x.px < 22), sel);
  await stageBtn(page, 5).click();
  expect(await small(S5)).toEqual([]);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 6);
  expect(await small(S6)).toEqual([]);
});

test('stress: 10x -> then 10x <- across scenes 05 and 06 ends on finished scenes', async ({ page }) => {
  await open(page, '#/scene-4');
  await expectScene(page, 4);
  for (let i = 0; i < 10; i++) await page.keyboard.press(i % 3 === 2 ? 'ArrowLeft' : 'ArrowRight');
  await page.keyboard.press('5');
  await expectScene(page, 5);
  await expectView(page, 1, 'with');
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 6);
  await page.waitForTimeout(1800);
  expect((await pixels(page)).amber).toBeGreaterThan(150);
});
