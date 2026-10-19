import { test, expect } from '@playwright/test';
import { guard, expectScene, open } from './helpers.js';

// gsap.set() does not render while the global timeline is paused. With P on, every scene must still show its
// finished content when reached by navigation, forward and back.
let problems;
test.beforeEach(async ({ page, context }) => { problems = await guard(page, context); });
test.afterEach(() => { expect(problems, problems.join('\n')).toEqual([]); });

// A few elements per scene that the entrance choreography hides first; all must be fully opaque and visible.
const KEY = {
  1: ['.s1-begin', '.s1-sub', '.s1-ring', '.s1-label'],
  2: ['.s2-stat', '.s2-band'],
  3: ['.s3-chip', '.s3-badge', '.s3-persona', '.s3-card'],
  4: ['.s4-node', '.s4-panel', '.s4-layers'],
  5: ['.s5-rail', '.s5-side', '.s5-controls'],
  6: ['.s6-controls', '.s6-panels'],   // panels dim by design (inactive capability)
  7: ['.kpi'],
  8: ['.s8-card'],
  9: ['.s9-phase', '.s9-risk', '.s9-sizing', '.s9-ask-btns', '.s9-ask-text .ch'],
};

async function expectShown(page, n) {
  const bad = await page.evaluate(([i, sels]) => {
    const scene = [...document.querySelectorAll('.scene')][i - 1];
    const out = [];
    sels.forEach((sel) => scene.querySelectorAll(sel).forEach((e) => {
      const cs = getComputedStyle(e);
      if (Number(cs.opacity) < 0.99 || cs.visibility === 'hidden') out.push(`${sel}: opacity ${cs.opacity} ${cs.visibility}`);
    }));
    return out.slice(0, 5);
  }, [n, KEY[n]]);
  expect(bad, `scene ${n}`).toEqual([]);
}

test('Paused: walking 01 -> 09 and back, every scene shows its finished content at once', async ({ page }) => {
  await open(page);
  await expectScene(page, 1);
  await page.keyboard.press('p');
  for (let n = 2; n <= 9; n++) {
    await page.keyboard.press('ArrowRight');
    await expectScene(page, n);
    await expectShown(page, n);
  }
  for (let n = 8; n >= 1; n--) {
    await page.keyboard.press('ArrowLeft');
    await expectScene(page, n);
    await expectShown(page, n);
  }
  await page.keyboard.press('p');
});

test('Paused from the start, hash arrival on scenes 1-4 shows finished content', async ({ page }) => {
  await open(page, '#/scene-2');
  await expectScene(page, 2);
  await page.keyboard.press('p');
  await page.keyboard.press('ArrowLeft');
  await expectScene(page, 1);
  await expectShown(page, 1);
  await page.keyboard.press('3');
  await expectScene(page, 3);
  await expectShown(page, 3);
  await page.keyboard.press('ArrowRight');
  await expectScene(page, 4);
  await expectShown(page, 4);
});
