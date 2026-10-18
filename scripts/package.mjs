// Builds the deliverable: release/GridNova_Submission.zip
//   GridNova_Submission/index.html   the built single file (double-click this)
//   GridNova_Submission/README.md    controls, scene list, how to rebuild
//   GridNova_Submission/source/      editable source (no node_modules, dist, release, legacy, PDFs, tests output)
// No zip dependency: the archive is written by the system `tar` (bsdtar on Windows 10+/macOS), `-a` picks the zip format
// from the .zip extension. Run `npm run package` (it builds first).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('.');
const out = join(root, 'release');
const stage = join(out, 'GridNova_Submission');
const zip = join(out, 'GridNova_Submission.zip');

execFileSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
rmSync(out, { recursive: true, force: true });
mkdirSync(join(stage, 'source'), { recursive: true });

cpSync(join(root, 'dist', 'index.html'), join(stage, 'index.html'));

// Editable source. Allow-list, so nothing unexpected (node_modules, dist, legacy, PDFs, .env) can slip in.
const SOURCE = ['src', 'tests', 'docs', 'scripts', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'playwright.config.js'];
for (const item of SOURCE) {
  if (existsSync(join(root, item))) cpSync(join(root, item), join(stage, 'source', item), { recursive: true, filter: (p) => !/\.pdf$/i.test(p) });
}

writeFileSync(join(stage, 'README.md'), `# GridNova: interactive executive presentation

A fictional microgrid proposal for the fictional "Al Noor Technical Campus". All figures are illustrative assumptions.

## Run it
Double-click \`index.html\`. It works offline from \`file://\`: no server, no install, no internet. Use Chrome or Edge, ideally fullscreen (F).

## Controls
| Key | Action |
|---|---|
| Right, PageDown, Space | next scene |
| Left, PageUp | previous scene |
| Home / End | first / last scene |
| 1-9 | jump to a scene |
| M | scene menu |
| P | pause all motion |
| R | reduced motion |
| F | fullscreen |
| Esc | close menu / drawer / selection |

The bar at the bottom (auto-hides, returns on mouse move) has the same controls. The URL hash (\`#/scene-7\`) resumes a scene.

## Scenes
1. The proposition: cinematic opening
2. The pressure: the 24 h load curve and what it costs
3. The opportunity: isometric campus, selectable zones
4. The system: layered diagram, select a node, Power / Control / Both
5. A peak event: five stages, With / Without GridNova
6. Capability showcase: particle field, Day / Night
7. Explore the design: simulator (solar, battery, normal / heatwave, presets, assumptions drawer)
8. The business case: built from your simulator choices; hover a bar for its formula
9. Roadmap and decision: phases, risks, the ask, Replay / Revisit

## Model
Simplified, explainable demonstration model, not an engineering design. Constants and formulas: \`source/docs/simulator-model.md\` and \`source/src/model/\`.

## Rebuild from source
\`\`\`
cd source
npm install
npm run build      # writes dist/index.html
npm test           # unit tests
npm run e2e        # Playwright offline test (needs: npx playwright install chromium)
\`\`\`
`);

// On Windows use the system bsdtar explicitly: a GNU tar earlier on PATH (Git Bash) cannot write zip files.
const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', zip, '-C', out, 'GridNova_Submission'], { stdio: 'inherit' });
console.log(`wrote ${zip}`);
