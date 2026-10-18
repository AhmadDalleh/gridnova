import { test, expect } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// Static check of the BUILT file: nothing in it may point outside itself (R19, R20).
// The single inline <script type="module"> that vite-plugin-singlefile emits is allowed; external references are not.
const dist = resolve('dist/index.html');
const html = readFileSync(dist, 'utf8');

// Strings (not network requests) that libraries embed: XML namespace ids, and the docs link inside GSAP's warning text.
const HARMLESS_URL = /^(https?:\/\/www\.w3\.org\/|https:\/\/gsap\.com$)/;

test('dist/index.html has no external references', () => {
  const problems = [];

  // <script src="..."> (module or not) and <link href="..."> that is not a data: URI
  for (const m of html.matchAll(/<script\b[^>]*\ssrc\s*=/gi)) problems.push(`external script: ${m[0]}`);
  for (const m of html.matchAll(/<link\b[^>]*\shref\s*=\s*["']?(?!data:)[^"'\s>]*/gi)) problems.push(`link href: ${m[0]}`);

  // Network-capable APIs
  for (const needle of ['fetch(', 'import(', 'new Worker(', 'new SharedWorker(', 'XMLHttpRequest', '@import', 'importScripts(']) {
    if (html.includes(needle)) problems.push(`forbidden API: ${needle}`);
  }

  // Absolute URLs (allow only the harmless strings above)
  for (const m of html.matchAll(/https?:\/\/[^\s"'`)\\<>]+/g)) {
    if (!HARMLESS_URL.test(m[0])) problems.push(`absolute URL: ${m[0]}`);
  }

  // CSS url() must be data: URIs (fonts are inlined)
  for (const m of html.matchAll(/url\(\s*["']?(?!data:|#)([^)"']+)/g)) problems.push(`css url(): ${m[1].slice(0, 80)}`);

  expect(problems, problems.join('\n')).toEqual([]);
});

test('fonts are inlined as data URIs and the file stays small', () => {
  const fontFaces = html.match(/@font-face/g) ?? [];
  expect(fontFaces.length).toBe(4);                              // Space Grotesk 500/700, Inter 400/600
  expect(html.match(/data:font\/woff2;base64,/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  const bytes = statSync(dist).size;
  console.log(`dist/index.html = ${(bytes / 1024).toFixed(1)} KB`);
  expect(bytes).toBeLessThan(5 * 1024 * 1024);
});
