import { expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Shared by every e2e spec: open the BUILT dist/index.html via file:// with the network blocked.
// GRIDNOVA_INDEX points the suite at another built file (the unzipped release) instead of dist/index.html.
export const URL_BASE = pathToFileURL(resolve(process.env.GRIDNOVA_INDEX ?? 'dist/index.html')).href;
export const SHOTS = resolve('docs/verification');
export const label = (n) => `${String(n).padStart(2, '0')} / 09`;

/** Offline context + collectors. Returns the `problems` array (console errors/warnings, page errors, network attempts). */
export async function guard(page, context) {
  const problems = [];
  await context.setOffline(true);
  await context.route(/^https?:/, (route) => route.abort());
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('request', (r) => { if (/^https?:/.test(r.url())) problems.push(`network request: ${r.url()}`); });
  return problems;
}

// Settled = counter shows the target AND exactly one scene is fully visible AND the Core is on its anchor.
export async function expectScene(page, n) {
  await expect(page.locator('#counter')).toHaveText(label(n));
  await page.waitForFunction(() => {
    const visible = [...document.querySelectorAll('.scene')].filter((s) => {
      const cs = getComputedStyle(s);
      return cs.visibility === 'visible' && Number(cs.opacity) > 0.5;
    });
    if (visible.length !== 1 || Number(getComputedStyle(visible[0]).opacity) <= 0.99 || document.getElementById('preloader')) return false;
    // The counter updates on the request, so "settled" also means the Core has arrived.
    const c = document.getElementById('core').getBoundingClientRect();
    const a = visible[0].querySelector('[data-core-anchor]').getBoundingClientRect();
    return Math.hypot(c.left + c.width / 2 - (a.left + a.width / 2), c.top + c.height / 2 - (a.top + a.height / 2)) < 3;
  });
}

export async function open(page, hash = '') {
  await page.goto(URL_BASE + hash);
  await expect(page.locator('#preloader')).toHaveCount(0);
}
