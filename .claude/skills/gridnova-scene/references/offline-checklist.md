# Offline (`file://`) checklist

## Why it matters
Browsers treat `file://` pages as a unique/opaque origin. Under it: `<script type="module" src="x.js">` fails (CORS), `fetch('data.json')` fails, web workers from files fail, and some font/texture loads fail. A single self-contained `index.html` avoids all of it.

## Vite config
```js
// vite.config.js
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,   // inline fonts/images as data URIs
    cssCodeSplit: false,
    sourcemap: false,
  },
});
```
Fonts: `import '@fontsource/space-grotesk/500.css'` etc. in `main.js` (only the weights used). Preloader waits for `document.fonts.ready` (with a 1.5 s safety timeout) before showing scene 01.

## Output checks (automate in e2e or a node script)
- `dist/` contains only `index.html` (and nothing it references).
- `index.html` contains no `http://` / `https://` (except inside licence comments), no `fetch(`, no `import(`, no `new Worker(`, no `<script src=`, no `<link href=` to files.
- Size reported in the slice summary.

## Playwright offline test (sketch)
```js
// tests/e2e/offline.spec.js
import { test, expect } from '@playwright/test';
import path from 'node:path';
const url = 'file://' + path.resolve('dist/index.html');

test.beforeEach(async ({ context }) => {
  await context.route(/^https?:\/\//, (r) => r.abort());     // no network at all
});

for (const vp of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
  test(`all scenes render offline at ${vp.width}x${vp.height}`, async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize(vp);
    await page.goto(url);
    for (let i = 1; i <= 9; i++) {
      await expect(page.locator('#progress')).toHaveAttribute('data-scene', String(i));
      await page.waitForTimeout(2600);                         // let the entrance finish
      await page.screenshot({ path: `docs/verification/${vp.width}x${vp.height}-scene-${i}.png` });
      if (i < 9) await page.keyboard.press('ArrowRight');
    }
    expect(errors).toEqual([]);
  });
}
```
Also test: rapid ArrowRight ×10 then ArrowLeft ×10 ends on a valid scene with exactly one visible scene; `#/scene-7` resumes scene 7; simulator slider change updates KPI to the model value; values persist after leaving and returning.

## Manual final check (Ahmad)
1. `npm run package`, copy the ZIP to another folder, extract.
2. Turn Wi-Fi **off**.
3. Double-click `index.html` in **Chrome**, then **Edge**.
4. Present all 9 scenes with the keyboard/clicker, fullscreen on/off, pause, reduced motion, simulator, replay.
5. Open DevTools console: no errors.
