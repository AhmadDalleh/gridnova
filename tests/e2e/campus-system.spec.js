import { test, expect } from '@playwright/test';
import { guard, expectScene, open } from './helpers.js';
import { simulate } from '../../src/model/simulate.js';
import { ZONES, zoneFigure } from '../../src/scenes/03-opportunity/zones.js';
import { NODES, LINKS } from '../../src/scenes/04-system/data.js';

// Scenes 03 and 04 and composed transition B, end to end, from the built file:// page with the network blocked.
let problems;
test.beforeEach(async ({ page, context }) => {
  problems = await guard(page, context);
});
test.afterEach(() => {
  expect(problems, problems.join('\n')).toEqual([]);
});

const S3 = '.scene[data-scene="opportunity"]';
const S4 = '.scene[data-scene="system"]';
const BALANCED = { solarMw: 4, batteryMwh: 8 };
const peakMw = simulate({ solarMw: 0, batteryMwh: 0 }).peakBeforeMw;

/** Scene 03 finished: tilted plane, every zone risen to its full height, names, badges and personas visible. The camera move takes ~3 s, so this polls. */
async function expectFinal03(page) {
  const rise = Object.fromEntries(ZONES.map((z) => [z.id, z.rise]));
  await expect.poll(() => page.evaluate(([s3, rises]) => {
    const plane = document.querySelector(`${s3} .s3-plane`);
    const m = new DOMMatrix(getComputedStyle(plane).transform);
    const problems = [];
    if (!(Math.abs(m.m23) > 0.3 || Math.abs(m.m32) > 0.3)) problems.push('plane is flat');
    const scale = new DOMMatrix(getComputedStyle(document.querySelector(`${s3} .s3-camera`)).transform).a;
    if (Math.abs(scale - 1) > 0.01) problems.push(`camera scale ${scale.toFixed(2)}`);
    document.querySelectorAll(`${s3} .blk`).forEach((b) => {
      const h = parseFloat(getComputedStyle(b).getPropertyValue('--h'));
      if (Math.abs(h - rises[b.dataset.zone]) > 0.6) problems.push(`${b.dataset.zone} height ${h}`);
    });
    const faint = [...document.querySelectorAll(`${s3} .s3-chip, ${s3} .s3-badge, ${s3} .s3-persona, ${s3} .s3-outcome`)]
      .filter((e) => Number(getComputedStyle(e).opacity) < 0.99).length;
    if (faint) problems.push(`${faint} elements still fading in`);
    return problems.join('; ') || 'finished';
  }, [S3, rise]), { message: 'scene 03 settles on the finished look', timeout: 8000 }).toBe('finished');
}

/** Scene 04 finished: every link drawn and flowing, every node visible. */
async function expectFinal04(page) {
  await expect.poll(() => page.evaluate((s4) => [...document.querySelectorAll(`${s4} .s4-link`)]
    .filter((p) => parseFloat(p.style.strokeDasharray) > 100).length, S4), { message: 'every link has switched from "drawing" to "flowing"' }).toBe(0);
  await expect.poll(() => page.evaluate((s4) => [...document.querySelectorAll(`${s4} .s4-node, ${s4} .s4-panel`)]      // nodes fade through a 0.35 s CSS transition
    .filter((e) => Number(getComputedStyle(e).opacity) < 0.99 && !e.classList.contains('is-dim')).length, S4)).toBe(0);
}

const chip = (page, id) => page.locator(`${S3} [data-chip="${id}"]`);
const coreToAnchor = (page, scene) => page.evaluate((sel) => {
  const c = document.getElementById('core').getBoundingClientRect();
  const a = document.querySelector(`${sel} [data-core-anchor]`).getBoundingClientRect();
  return Math.hypot(c.left + c.width / 2 - (a.left + a.width / 2), c.top + c.height / 2 - (a.top + a.height / 2));
}, scene);

// ---- scene 03 ---------------------------------------------------------------------------------------------------
test('scene 03: the camera move ends on the tilted campus; the Core sits on the substation', async ({ page }) => {
  await open(page, '#/scene-2');
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 3);
  // The camera move is still running when the scene has settled (activate() plays it): the plane is not tilted yet or still turning.
  await expectFinal03(page);
  const w = await page.locator('#core').evaluate((e) => e.getBoundingClientRect().width / Number(document.getElementById('stage').dataset.scale));
  expect(w).toBeGreaterThan(58);
  expect(w).toBeLessThan(70);
  await expect(page.locator(`${S3} .tag`).first()).toHaveText(/illustrative/i);
});

test('scene 03: selecting a zone lifts it and the card shows the model figure; selecting again clears it', async ({ page }) => {
  await open(page, '?e2e#/scene-3');
  await expectScene(page, 3);
  await expectFinal03(page);
  await expect(page.locator(`${S3} .s3-card-hint`)).toBeVisible();
  for (const z of ZONES) {
    await chip(page, z.id).click();
    const fig = zoneFigure(z, BALANCED, peakMw);
    await expect(page.locator(`${S3} .s3-card-name`)).toHaveText(z.name);
    await expect(page.locator(`${S3} .s3-card-value`)).toHaveText(fig.value);
    await expect(page.locator(`${S3} .s3-card-note`)).toHaveText(fig.note);
    await expect(chip(page, z.id)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`${S3} .blk[data-zone="${z.id}"]`)).toHaveCSS('--lift', '26px');
    expect(await page.locator(`${S3} [aria-pressed="true"].s3-chip`).count()).toBe(1);
  }
  await chip(page, 'substation').click();                                     // second click on the selected zone clears it
  await expect(page.locator(`${S3} .s3-card-hint`)).toBeVisible();
  await expect(page.locator(`${S3} .blk[data-zone="substation"]`)).toHaveCSS('--lift', '0px');
});

test('scene 03: zones can be clicked on the 3D map itself, and Escape clears the selection', async ({ page }) => {
  await open(page, '#/scene-3');
  await expectScene(page, 3);
  await expectFinal03(page);
  // Click the left corner of the EV depot's top face (away from its name chip, which sits in the middle).
  const box = await page.locator(`${S3} .blk[data-zone="ev"] .top`).boundingBox();
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await expect(page.locator(`${S3} .s3-card-name`)).toHaveText('EV fleet depot');
  await page.keyboard.press('Escape');
  await expect(page.locator(`${S3} .s3-card-hint`)).toBeVisible();
});

test('scene 03: solar and substation figures follow the simulator inputs from scene 07', async ({ page }) => {
  await open(page, '?e2e#/scene-3');
  await expectScene(page, 3);
  await page.evaluate(() => window.__gridnova.store.set({ sim: { solarMw: 6, batteryMwh: 16, dayType: 'normal', preset: 'resilience' } }));
  await chip(page, 'parking').click();
  await expect(page.locator(`${S3} .s3-card-value`)).toHaveText('6.0 MW');
  await chip(page, 'substation').click();
  await expect(page.locator(`${S3} .s3-card-value`)).toHaveText('16 MWh');
});

test('scene 03: after a mouse click the arrow keys navigate again', async ({ page }) => {
  await open(page, '#/scene-3');
  await expectScene(page, 3);
  await chip(page, 'thermal').click();
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
});

// ---- scene 04 ---------------------------------------------------------------------------------------------------
test('scene 04: selecting a node dims unrelated links; the panel shows the live model figure', async ({ page }) => {
  await open(page, '?e2e#/scene-4');
  await expectScene(page, 4);
  await expectFinal04(page);
  const r = simulate(BALANCED);
  for (const node of NODES) {
    await page.locator(`${S4} [data-node="${node.id}"] .s4-node-ring`).click();
    await expect(page.locator(`${S4} .s4-panel-name`)).toHaveText(node.name);
    await expect(page.locator(`${S4} .s4-panel-live`)).toHaveText(node.live(r));
    await expect(page.locator(`${S4} [data-f="decides"]`)).toHaveText(node.decides);
    const touching = new Set(LINKS.filter((l) => l.from === node.id || l.to === node.id).map((l) => l.id));
    for (const l of LINKS) {
      const cls = await page.locator(`${S4} [data-link="${l.id}"]`).getAttribute('class');
      expect(cls.includes('is-dim'), `${node.id} / ${l.id}`).toBe(!touching.has(l.id));
    }
  }
  await page.locator(`${S4} [data-node="${NODES.at(-1).id}"] .s4-node-ring`).click();   // select the same node again: clears
  await expect(page.locator(`${S4} .s4-panel-hint`)).toBeVisible();
  expect(await page.locator(`${S4} .s4-link.is-dim`).count()).toBe(0);
});

test('scene 04: the panel follows the simulator (Resilience sizing) and nodes work from the keyboard', async ({ page }) => {
  await open(page, '?e2e#/scene-4');
  await expectScene(page, 4);
  await page.evaluate(() => window.__gridnova.store.set({ sim: { solarMw: 6, batteryMwh: 16, dayType: 'normal', preset: 'resilience' } }));
  await page.locator(`${S4} [data-node="battery"]`).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`${S4} .s4-panel-live`)).toHaveText(NODES.find((n) => n.id === 'battery').live(simulate({ solarMw: 6, batteryMwh: 16 })));
  await page.keyboard.press(' ');                                              // Space on a node toggles it: it must NOT change scene
  await expect(page.locator(`${S4} .s4-panel-hint`)).toBeVisible();
  await expect(page.locator('#counter')).toHaveText('04 / 09');
  await page.locator(`${S4} [data-node="solar"]`).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');                                         // Escape clears it
  await expect(page.locator(`${S4} .s4-panel-hint`)).toBeVisible();
});

test('scene 04: Power / Control / Both fades the other layer', async ({ page }) => {
  await open(page, '#/scene-4');
  await expectScene(page, 4);
  await expectFinal04(page);
  const opacity = (sel) => page.locator(sel).first().evaluate((e) => Number(getComputedStyle(e).opacity));
  await page.click(`${S4} [data-layer="power"]`);
  await expect.poll(() => opacity(`${S4} .s4-link.control`)).toBeLessThan(0.1);
  expect(await opacity(`${S4} .s4-link.power`)).toBeGreaterThan(0.9);
  await expect(page.locator(`${S4} [data-layer="power"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.click(`${S4} [data-layer="control"]`);
  await expect.poll(() => opacity(`${S4} .s4-link.power`)).toBeLessThan(0.1);
  expect(await opacity(`${S4} .s4-link.control`)).toBeGreaterThan(0.9);
  await page.click(`${S4} [data-layer="both"]`);
  await expect.poll(() => opacity(`${S4} .s4-link.power`)).toBeGreaterThan(0.9);
  await expect.poll(() => opacity(`${S4} .s4-link.control`)).toBeGreaterThan(0.9);
  await page.keyboard.press('ArrowLeft');                                      // mouse click released the focus: keys navigate again
  await expectScene(page, 3);
});

test('scene 04: dashes flow along power links, and stop on pause and on reduced motion', async ({ page }) => {
  await open(page, '#/scene-4');
  await expectScene(page, 4);
  await expectFinal04(page);
  const offset = () => page.locator(`${S4} [data-link="p-solar-demand"]`).evaluate((p) => parseFloat(p.style.strokeDashoffset));
  const a = await offset();
  await page.waitForTimeout(400);
  const b = await offset();
  expect(b).toBeLessThan(a - 5);                                               // offset decreases = dashes move along the arrow
  await page.keyboard.press('p');
  const frozen = await offset();
  await page.waitForTimeout(400);
  expect(await offset()).toBe(frozen);
  await page.keyboard.press('p');
  await page.keyboard.press('r');
  const still = await offset();
  await page.waitForTimeout(400);
  expect(await offset()).toBe(still);
});

test('scenes 03 and 04: every text is at least 22 px', async ({ page }) => {
  await open(page, '?e2e#/scene-3');
  await expectScene(page, 3);
  await chip(page, 'academic').click();
  const small = (sel) => page.evaluate((s) => [...document.querySelector(s).querySelectorAll('*')]
    .filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()))
    .map((n) => ({ text: n.textContent.trim().slice(0, 30), px: parseFloat(getComputedStyle(n).fontSize) }))
    .filter((x) => x.px < 22), sel);
  expect(await small(S3)).toEqual([]);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
  await page.locator(`${S4} [data-node="grid"] .s4-node-ring`).click();
  expect(await small(S4)).toEqual([]);
});

// ---- transition B -----------------------------------------------------------------------------------------------
test('transition B: the camera dives into the substation, the Core becomes the controller node, links draw on landing', async ({ page }) => {
  await open(page, '#/scene-3');
  await expectScene(page, 3);
  await expectFinal03(page);
  const rows = await page.evaluate(([s3, s4]) => new Promise((resolve) => {
    const core = document.getElementById('core');
    const camera = document.querySelector(`${s3} .s3-camera`);
    const from = document.querySelector(`${s3} [data-core-anchor]`);
    const to = document.querySelector(`${s4} [data-core-anchor]`);
    const link = document.querySelector(`${s4} [data-link="c-solar"]`);          // the first link to draw
    const center = (el) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
    const out = [];
    const t0 = performance.now();
    const frame = () => {
      const t = performance.now() - t0;
      const [cx, cy] = center(core);
      const [fx, fy] = center(from);
      const [tx, ty] = center(to);
      const dash = parseFloat(link.style.strokeDashoffset);
      out.push({
        t, toDist: Math.hypot(cx - tx, cy - ty), fromDist: Math.hypot(cx - fx, cy - fy),
        zoom: new DOMMatrix(getComputedStyle(camera).transform).a, s4: Number(getComputedStyle(document.querySelector(s4)).opacity),
        drawing: link.style.strokeDasharray && parseFloat(link.style.strokeDasharray) > 100 && dash < parseFloat(link.style.strokeDasharray) - 1,
      });
      if (t < 3800) requestAnimationFrame(frame); else resolve(out);
    };
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    requestAnimationFrame(frame);
  }), [S3, S4]);

  const peakZoom = Math.max(...rows.map((r) => r.zoom));
  expect(peakZoom).toBeGreaterThan(3);                                          // the camera really dives in
  rows.filter((r) => r.t < 350).forEach((r) => expect(r.fromDist, 'Core stays on the substation at first').toBeLessThan(15));
  const landing = rows.find((r) => r.toDist < 3);
  expect(landing.t).toBeGreaterThan(900);
  expect(landing.t).toBeLessThan(1700);
  const started = rows.find((r) => r.drawing);
  expect(started.t).toBeGreaterThan(landing.t - 80);                            // links do NOT start before the Core lands...
  expect(started.t).toBeLessThan(landing.t + 800);                              // ...and start right after (the transition ends a little after the Core's last pixels, then 0.35 s of node pop-in)
  expect(rows.find((r) => r.t > 300).s4).toBeLessThan(0.5);                     // scene 04 is still faint while 03 dives
  console.log(`transition B: peak zoom ${peakZoom.toFixed(1)}, Core landed at ${Math.round(landing.t)} ms, links started at ${Math.round(started.t)} ms`);
  await expectScene(page, 4);
  await expectFinal04(page);
});

test('transition B reverses: 04 -> 03 pulls the camera out, the selection survives, forward again works', async ({ page }) => {
  await open(page, '#/scene-3');
  await expectScene(page, 3);
  await expectFinal03(page);
  await chip(page, 'research').click();
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
  await expectFinal04(page);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 3);
  await expectFinal03(page);                                                    // pulled out: not replayed from flat
  await expect(page.locator(`${S3} .s3-card-name`)).toHaveText('Research labs');
  expect(await coreToAnchor(page, S3)).toBeLessThan(3);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
  await expectFinal04(page);
});

test('transition B with reduced motion: short cross-fade, finished states at once', async ({ page }) => {
  await open(page, '#/scene-3');
  await expectScene(page, 3);
  await page.keyboard.press('r');
  const t0 = Date.now();
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
  expect(Date.now() - t0).toBeLessThan(1500);
  await expectFinal04(page);
  await expect(page.locator(`${S4} [data-link="c-grid"]`)).toHaveCSS('opacity', '1');
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 3);
  await expectFinal03(page);
});

// ---- edge cases -------------------------------------------------------------------------------------------------
test('edge: leaving scene 03 mid camera move still runs transition B and ends clean in both scenes', async ({ page }) => {
  await open(page, '#/scene-2');
  await expectScene(page, 2);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1500);                                              // the camera is mid-tilt, zones still rising
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
  await expectFinal04(page);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 3);
  await expectFinal03(page);                                                    // the interrupted move was snapped to its settled look
});

test('edge: arriving at 04 without transition B (hash, menu jump, back from 05) still draws the links and lands the Core', async ({ page }) => {
  await open(page, '#/scene-4');
  await expectScene(page, 4);
  await page.waitForFunction((s4) => [...document.querySelectorAll(`${s4} .s4-link`)].some((p) => parseFloat(p.style.strokeDasharray) > 100), S4, { timeout: 4000 });
  await expectFinal04(page);
  expect(await coreToAnchor(page, S4)).toBeLessThan(3);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 5);
  await page.keyboard.press('ArrowLeft');                                       // back from 05: standard transition, links draw again
  await expectScene(page, 4);
  await page.waitForFunction((s4) => [...document.querySelectorAll(`${s4} .s4-link`)].some((p) => parseFloat(p.style.strokeDasharray) > 100), S4, { timeout: 4000 });
  await expectFinal04(page);
  await page.keyboard.press('1');                                               // and a standard jump to 03 (not composed) plays the camera move
  await expectScene(page, 1);
  await page.keyboard.press('3');
  await expectScene(page, 3);
  await expectFinal03(page);
});

test('edge: reset()/replay clears the selections in 03 and 04', async ({ page }) => {
  await open(page, '?e2e#/scene-3');
  await expectScene(page, 3);
  await chip(page, 'ev').click();
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
  await page.locator(`${S4} [data-node="grid"] .s4-node-ring`).click();
  await page.click(`${S4} [data-layer="power"]`);
  await page.evaluate(() => window.__gridnova.controller.replay());
  await expectScene(page, 1);
  expect(await page.evaluate(() => window.__gridnova.store.get().ui)).toMatchObject({ selectedZone: null, selectedNode: null, layer: 'both' });
  await page.keyboard.press('3');
  await expectScene(page, 3);
  await expect(page.locator(`${S3} .s3-card-hint`)).toBeVisible();
});

test('pause during transition B, then navigate: the frozen transition jumps to its end cleanly', async ({ page }) => {
  await open(page, '#/scene-3');
  await expectScene(page, 3);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.press('p');
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 3);
  await expectFinal03(page);
  await page.keyboard.press('ArrowRight');                                      // while paused: finished states at once
  await expectScene(page, 4);
  await expectFinal04(page);
  await page.keyboard.press('p');
});

test('stress: 10x -> and 10x <- through scenes 03 and 04 ends on a finished scene 03', async ({ page }) => {
  await open(page, '#/scene-2');
  await expectScene(page, 2);
  for (let i = 0; i < 10; i++) await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
  await page.keyboard.press('2');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
  await expectFinal04(page);
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 3);
  await expectFinal03(page);
});
