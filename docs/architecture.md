# GridNova — Architecture & Technical Decisions

## Contents
1. Stack and why
2. Repository layout
3. The stage (16:9 scaling)
4. Scene controller (the heart of the app)
5. Scene module contract
6. State store (simulator and UI state)
7. Motion manager (pause, reduced motion, cleanup)
8. The GridNova Core (cross-scene continuity)
9. Offline build & packaging (`file://` rules)
10. Testing
11. Deliverable ZIP layout

---

## 1. Stack and why

| Area | Choice | Why |
|---|---|---|
| Language | Vanilla JavaScript (ES modules in source), HTML5, CSS3 | Small surface, fully explainable; no framework lifecycle to defend |
| Build | **Vite** + **vite-plugin-singlefile** | Source stays modular and readable; the build inlines all JS/CSS/fonts into **one `index.html`** that runs from `file://` (ES module *files* are blocked under `file://` by CORS; one inline script is not) |
| Animation | **GSAP** (core + timelines; free licence, bundled from npm) | Timelines that can be paused, reversed, replayed and time-scaled — exactly the presenter controls the brief demands |
| Charts / diagrams | Hand-written **SVG** (+ small helper functions) | Path drawing, flows and morphing with full control; no chart library to explain |
| Particles | **Canvas 2D** + `requestAnimationFrame` | Distinct motion technique; cheap; easy to pause |
| Fonts | Space Grotesk + Inter via `@fontsource/*` (OFL), inlined as data URIs | No CDN; no font flash |
| Unit tests | **Vitest** | Model and controller logic |
| E2E / offline tests | **Playwright** (Chromium) opening `dist/index.html` via `file://` with network blocked | Proves the core rule: double-click works offline |

No React/Vue/Three.js. If a 3D effect is wanted, use CSS 3D transforms (scene 03). Any new dependency needs Ahmad's approval.

## 2. Repository layout

```
index.html                 dev entry (Vite) — stage markup + scene containers
src/
  main.js                  boot: preload fonts, create store, controller, UI; register scenes
  core/
    stage.js               16:9 scaling of the 1920×1080 stage
    controller.js          scene state machine (§4)
    nav.js                 buttons, keyboard, progress bar, scene menu, hash routing
    motion.js              pause / reduced motion / RAF registry (§7)
    store.js               tiny observable store (§6)
    core-orb.js            the persistent GridNova Core (§8)
    fullscreen.js
  model/
    constants.js           every illustrative assumption (docs/simulator-model.md §2)
    simulate.js            pure simulate() + economics()  — NO DOM
  scenes/
    01-proposition/  index.js  scene.css  (markup created in index.js or a template string)
    02-pressure/ … 09-decision/
  ui/                      reusable bits: count-up, svg-chart helpers, split-text, assumption-tag, tooltip
  styles/
    tokens.css  base.css  stage.css  nav.css
tests/
  unit/                    vitest: model, controller, store
  e2e/                     playwright: offline file:// run, navigation, simulator, screenshots
scripts/
  package.mjs              builds the deliverable ZIP (§11)
docs/                      specs (this folder), AI log, verification evidence
legacy/                    previous version (reference only, excluded from build)
```

Rules: one scene per folder; no file > ~250 lines; comments explain **choreography intent** ("Core lands on the peak at 0.8s so the curve can start drawing from it"), not syntax.

## 3. The stage (16:9 scaling)

All scenes are authored on a fixed **1920×1080** element `#stage`. `stage.js` computes `scale = min(innerWidth/1920, innerHeight/1080)` and applies `transform: scale(scale)` centred, letterboxing the rest. Result: identical composition at 1920×1080 and 1366×768 (scale 0.711), no reflow surprises, no clipped content. Minimum body text size on stage: 22 px (≈ 15.6 px at 1366×768). Re-scale on `resize` and `fullscreenchange`.

## 4. Scene controller

`controller.js` owns **which scene is active** and **transitions**. Pure logic + calls into scene modules; no scene-specific DOM code.

State: `{ index, status: 'idle' | 'transitioning', pending: number | null }`.

`goTo(target, { direction })`:
1. Clamp `target` to `0..scenes.length-1`; ignore if equal to `index`.
2. If `status === 'transitioning'`: store `pending = target` (last request wins) and return. This makes rapid key presses safe — no stuck transitions, no overlapping timelines.
3. `status = 'transitioning'`; build the transition: if the pair has a **composed transition** (`transitions.js` map, e.g. `'0>1'`), use it; otherwise the standard one. Backward moves use the composed transition's reverse or the standard one.
4. Sequence: `outgoing.exit(dir)` → returns a GSAP timeline/Promise; `incoming.enter(dir)` → timeline; the transition timeline coordinates both (they may overlap).
5. On complete: `outgoing.deactivate()` (stop loops, abort listeners), `index = target`, update hash `#/scene-N`, progress UI, `store.set({ sceneIndex })`, `status = 'idle'`; if `pending` is set, `goTo(pending)`.
6. In reduced-motion mode: transitions become 200 ms cross-fades; scene `enter()` jumps timelines to their end state (`tl.progress(1)`).

Navigation inputs (`nav.js`): ←/→, PageUp/PageDown (presentation clickers), Space, Home/End, number keys 1–9, `M` menu, `P` pause, `R` reduced motion, `F` fullscreen; on-screen Prev/Next, progress bar segments (clickable), scene menu with titles. Hash on load (`#/scene-7`) resumes that scene. Keys are ignored while focus is inside an input (sliders) except Escape.

## 5. Scene module contract

Each `scenes/NN-name/index.js` exports:

```js
export default {
  id: 'pressure', title: 'The pressure', coreAnchor: '[data-core-anchor]',
  mount(root, ctx) {},      // once: build DOM, cache nodes, create (paused) timelines. ctx = { store, motion, core, selectSim }
  enter(direction) {},      // returns a GSAP timeline: a QUICK reveal of the scene frame (must fit the standard transition budget, src/core/timing.js)
  exit(direction) {},       // returns a timeline for leaving (may be very short)
  activate() {},            // after enter: play the meaningful choreography (chart draws, count-ups, ~2 s), start loops, add listeners via ctx.motion.scope()
  deactivate() {},          // after exit: stop loops, abort listeners; keep state
  reset() {},               // used by "Replay the story": timelines back to start, interaction UI to defaults (NOT simulator state)
};
```

**Entrance rule (timing):** the controller awaits `enter()`, so it must stay within the standard transition budget (`timing.js`, <= 0.7 s). Anything longer (chart drawing, count-ups, staggered cards) is a timeline built in `activate()` and killed in `deactivate()`; it never blocks navigation. When paused or in reduced motion, `activate()` jumps that timeline to its end state (a paused global clock would otherwise leave the scene half-drawn).

Separation of **state** from **DOM effects**: interactive state lives in the store (or in a small per-scene state object); render functions read state and update the DOM. Event handlers only change state. This is what you explain when asked about "lifecycle of interactive state".

## 6. State store

`store.js`: `createStore(initial)` → `{ get(), set(partial), subscribe(fn) → unsubscribe }`. Single global store holds:
```js
{ sceneIndex, paused, reducedMotion, sim: { solarMw: 4, batteryMwh: 8, dayType: 'normal', preset: 'balanced' },
  ui: { selectedZone, selectedNode, layer, eventStage, eventMode, dayNight, selectedPhase } }
```
Simulator results are **derived**: `simulate(store.get().sim)` (memoised on input). Scenes 05, 07, 08, 09 read the same results, so numbers are always consistent. Optional: persist `sim` in `sessionStorage` in try/catch (works on `file://` in Chrome/Edge; never required).

## 7. Motion manager

`motion.js` provides:
- `paused` — `gsap.globalTimeline.pause()/resume()` + stops every registered RAF loop. Paused state is visible (button state + small "Paused" chip).
- `reducedMotion` — initial value from `matchMedia('(prefers-reduced-motion: reduce)')`, toggleable; listeners update live. Effects: no parallax, particles static (single frame), looping flows stopped, transitions become cross-fades, count-ups jump to final values.
- `loop(fn)` → registers a RAF loop that auto-stops when paused/reduced/scene inactive; returns a stop function.
- `listen(target, type, handler)` → adds listeners through a per-scene `AbortController`; `deactivate()` aborts them (clean event cleanup).
- Visibility: pause loops on `document.hidden`.

## 8. The GridNova Core

`core-orb.js` renders one element in an overlay layer above the scenes. On every scene change it reads the incoming scene's `coreAnchor` element, measures it (`getBoundingClientRect` → stage coordinates, divided by the stage scale) and tweens the Core to that position/size (FLIP). Scenes can call `core.pulse()` or `core.setGlow(0..1)`. In composed transitions the Core's tween is part of the transition timeline.

## 9. Offline build & packaging — `file://` rules

Must hold for the built `dist/index.html`:
- No `<script type="module" src=…>` or any external file reference: everything inlined (vite-plugin-singlefile, `build.assetsInlineLimit` very large, `cssCodeSplit: false`).
- No `fetch`, XHR, dynamic `import()`, Web Workers from files, or `http(s)://` URLs anywhere in the output (a test greps for them).
- Fonts: imported from `@fontsource` → inlined as data URIs; `font-display: block` + wait for `document.fonts.ready` behind a short preloader (no flash).
- Images (if any): SVG inline or data URIs. Keep total size < 5 MB.
- Canvas: no cross-origin images (no tainting).
- Storage access wrapped in try/catch.
- Console must be clean (no errors, no warnings from our code).

## 10. Testing

- **Unit (Vitest):** `simulate()` reference values (simulator-model.md §6) and invariants; controller: rapid `goTo` calls never overlap, pending wins, bounds, reverse; store subscribe/unsubscribe.
- **E2E (Playwright, Chromium, and Edge channel if installed):** `npm run build` then open `file:///<abs>/dist/index.html` with all `http(s)` requests aborted. Checks: no console errors; navigate all 9 scenes forward and back with keys; hash resume; simulator: set sliders → KPI text changes and equals model output; leave and return → values kept; pause and reduced-motion toggles; screenshots of every scene at **1920×1080** and **1366×768** saved to `docs/verification/` (committed as evidence).
- **Manual:** presenter rehearsal checklist in `docs/verification/manual-checklist.md` (offline with Wi-Fi off, Chrome and Edge, fullscreen, clicker keys).

## 11. Deliverable ZIP layout

`npm run package` → `release/GridNova_Submission.zip`:
```
GridNova_Submission/
  index.html                  ← the built single file (double-click this)
  README.md                   ← how to present + controls + model summary
  source/                     ← editable source: src/, index.html (dev), styles, tests, docs/, package.json, vite.config.js, build notes
```
Excluded: `node_modules`, `dist` (already copied as index.html), `release`, `legacy`, the assignment PDF, any `.env`.
