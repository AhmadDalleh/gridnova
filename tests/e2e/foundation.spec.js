import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

// Opens the BUILT dist/index.html via file:// with every http(s) request aborted and the context offline.
const URL_BASE = pathToFileURL(resolve('dist/index.html')).href;
const SHOTS = resolve('docs/verification');

let problems;      // console errors/warnings, page errors, attempted network requests

test.beforeEach(async ({ page, context }) => {
  problems = [];
  await context.setOffline(true);
  await context.route(/^https?:/, (route) => route.abort());
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('request', (r) => { if (/^https?:/.test(r.url())) problems.push(`network request: ${r.url()}`); });
});

test.afterEach(() => {
  expect(problems, problems.join('\n')).toEqual([]);
});

const counter = (page) => page.locator('#counter');
const label = (n) => `${String(n).padStart(2, '0')} / 09`;

// Settled = counter shows the target AND exactly one scene is fully visible AND the Core is on its anchor.
async function expectScene(page, n) {
  await expect(counter(page)).toHaveText(label(n));
  await page.waitForFunction(() => {
    const visible = [...document.querySelectorAll('.scene')].filter((s) => {
      const cs = getComputedStyle(s);
      return cs.visibility === 'visible' && Number(cs.opacity) > 0.5;
    });
    if (visible.length !== 1 || Number(getComputedStyle(visible[0]).opacity) <= 0.99 || document.getElementById('preloader')) return false;
    // The counter now updates on the request, so "settled" also means the Core has arrived.
    const c = document.getElementById('core').getBoundingClientRect();
    const a = visible[0].querySelector('[data-core-anchor]').getBoundingClientRect();
    return Math.hypot(c.left + c.width / 2 - (a.left + a.width / 2), c.top + c.height / 2 - (a.top + a.height / 2)) < 3;
  });
}

async function open(page, hash = '') {
  await page.goto(URL_BASE + hash);
  await expect(page.locator('#preloader')).toHaveCount(0);
}

test('loads offline with a clean console and scene 1 visible', async ({ page }) => {
  await open(page);
  await expectScene(page, 1);
  await expect(page.locator('.scene[data-scene="proposition"] .ph-title')).toHaveText('The proposition');
  const fontsOk = await page.evaluate(() => ['500 1em "Space Grotesk"', '700 1em "Space Grotesk"', '400 1em Inter', '600 1em Inter'].every((f) => document.fonts.check(f)));
  expect(fontsOk).toBe(true);
});

test('keyboard walks all 9 scenes forward and back; the Core follows each anchor', async ({ page }) => {
  await open(page);
  const coreAtAnchor = async () => page.evaluate(() => {
    const c = document.getElementById('core').getBoundingClientRect();
    const a = [...document.querySelectorAll('.scene')].find((s) => getComputedStyle(s).visibility === 'visible').querySelector('[data-core-anchor]').getBoundingClientRect();
    return Math.hypot(c.left + c.width / 2 - (a.left + a.width / 2), c.top + c.height / 2 - (a.top + a.height / 2));
  });
  for (let n = 2; n <= 9; n++) {
    await page.keyboard.press('ArrowRight');
    await expectScene(page, n);
    expect(await coreAtAnchor()).toBeLessThan(3);
  }
  await page.keyboard.press('ArrowRight');              // past the end: stays on 9
  await expectScene(page, 9);
  for (let n = 8; n >= 1; n--) {
    await page.keyboard.press('ArrowLeft');
    await expectScene(page, n);
    expect(await coreAtAnchor()).toBeLessThan(3);
  }
  await page.keyboard.press('End');
  await expectScene(page, 9);
  await page.keyboard.press('Home');
  await expectScene(page, 1);
  await page.keyboard.press('5');
  await expectScene(page, 5);
  await page.keyboard.press('PageDown');
  await expectScene(page, 6);
  await page.keyboard.press('PageUp');
  await expectScene(page, 5);
  await page.keyboard.press(' ');
  await expectScene(page, 6);
});

test('hash resumes a scene and follows navigation', async ({ page }) => {
  await open(page, '#/scene-7');
  await expectScene(page, 7);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 6);
  expect(page.url()).toContain('#/scene-6');
});

test('stress: 10x Right then 10x Left leaves no stuck or overlapping scene', async ({ page }) => {
  await open(page);
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await expectScene(page, 9);
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
  await expectScene(page, 1);
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');   // still responsive afterwards
  await expectScene(page, 5);
});

test('nav keys are ignored on buttons; Space activates the button only', async ({ page }) => {
  await open(page);
  await page.focus('#btn-next');
  await page.keyboard.press(' ');                         // native button click: exactly one step
  await expectScene(page, 2);
  await page.keyboard.press('ArrowRight');                // focus is on a button: ignored
  await page.keyboard.press('End');
  await page.keyboard.press('4');
  await page.waitForTimeout(900);
  await expectScene(page, 2);
  // After a mouse click focus is dropped, so the clicker keys work again.
  await page.click('#btn-next');
  await expectScene(page, 3);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
});

test('menu: opens with M, ignores nav keys, Escape closes, items navigate', async ({ page }) => {
  await open(page);
  await page.keyboard.press('m');
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#menu-list button')).toHaveCount(9);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('3');
  await page.waitForTimeout(900);
  await expectScene(page, 1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeHidden();
  await page.keyboard.press('ArrowRight');                // keys live again after Escape
  await expectScene(page, 2);
  await page.click('#btn-menu');
  await page.locator('#menu-list button').nth(4).click();
  await expect(page.locator('#menu')).toBeHidden();
  await expectScene(page, 5);
  await page.click('#progress li:nth-child(8) button');   // progress segments navigate too
  await expectScene(page, 8);
});

test('pause and reduced motion stop the Core orbit loop; navigation still works', async ({ page }) => {
  await open(page);
  const orbit = () => page.locator('.core-orbit').evaluate((e) => e.style.transform);
  const a = await orbit();
  await page.waitForTimeout(250);
  expect(await orbit()).not.toBe(a);                      // running

  await page.keyboard.press('p');
  await expect(page.locator('#chip-paused')).toBeVisible();
  const b = await orbit();
  await page.waitForTimeout(250);
  expect(await orbit()).toBe(b);                          // frozen
  await page.keyboard.press('ArrowRight');                // paused navigation jumps instead of hanging
  await expectScene(page, 2);
  await page.keyboard.press('p');
  await expect(page.locator('#chip-paused')).toBeHidden();

  await page.keyboard.press('r');
  await expect(page.locator('#chip-reduced')).toBeVisible();
  const c = await orbit();
  await page.waitForTimeout(250);
  expect(await orbit()).toBe(c);
  await page.keyboard.press('ArrowRight');                // reduced: short cross-fade
  await expectScene(page, 3);
  await page.keyboard.press('r');
  await expect(page.locator('#chip-reduced')).toBeHidden();
});

test('Next updates progress at once and a standard transition finishes in under 0.8 s', async ({ page }) => {
  await open(page);
  await expectScene(page, 1);
  // Measured inside the page (no Playwright round-trips): click Next, then time until the new scene is
  // fully opaque, the old one hidden and the Core sits on the new anchor.
  const r = await page.evaluate(() => new Promise((resolve) => {
    const t0 = performance.now();
    document.getElementById('btn-next').click();
    const immediate = {
      counter: document.getElementById('counter').textContent,
      hash: location.hash,
      current: document.querySelectorAll('#progress [aria-current="step"]').length,
      second: document.querySelector('#progress li:nth-child(2) button').getAttribute('aria-current'),
    };
    const next = document.querySelector('.scene[data-scene="pressure"]');
    const center = (el) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
    const done = () => {
      const [cx, cy] = center(document.getElementById('core'));
      const [ax, ay] = center(next.querySelector('[data-core-anchor]'));
      return Number(getComputedStyle(next).opacity) > 0.99 && Math.hypot(cx - ax, cy - ay) < 3;
    };
    const poll = () => (done() ? resolve({ ms: performance.now() - t0, immediate }) : requestAnimationFrame(poll));
    poll();
  }));
  expect(r.immediate).toEqual({ counter: '02 / 09', hash: '#/scene-2', current: 1, second: 'step' });
  expect(r.ms).toBeLessThan(800);
  console.log(`standard transition: ${Math.round(r.ms)} ms`);
});

test('no auto-advance', async ({ page }) => {
  await open(page);
  await page.waitForTimeout(3500);
  await expectScene(page, 1);
});

test('screenshots of all 9 scenes at 1920x1080 and 1366x768', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'screenshots are committed from the Chromium run only');
  mkdirSync(SHOTS, { recursive: true });
  for (const [w, h] of [[1920, 1080], [1366, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    await open(page);
    const scale = await page.locator('#stage').evaluate((e) => Number(e.dataset.scale));
    expect(scale).toBeCloseTo(Math.min(w / 1920, h / 1080), 3);
    const box = await page.locator('#stage').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(w + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(h + 1);
    for (let n = 1; n <= 9; n++) {
      if (n > 1) await page.keyboard.press('ArrowRight');
      await expectScene(page, n);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${SHOTS}/slice1-${w}x${h}-scene-${String(n).padStart(2, '0')}.png` });
    }
  }
});
