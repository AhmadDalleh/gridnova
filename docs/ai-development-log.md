# AI Development Log - GridNova

Required by the brief (section 4.3): at least 3 meaningful AI prompt iterations (goal, prompt/approach, original output issue, refinement, independent verification) and at least 1 real technical or design weakness in an AI suggestion that I found and corrected. Written by me. Tool: Claude Code.

## Prompt strategy
- I wrote the specs first (storyboard, simulator model, architecture, requirement IDs R01-R33); Claude Code built one slice at a time from them.
- Each slice: plan, my review and corrections, build, verify from the built file:// page with network blocked, then an explain-back so I can present and modify it.
- The simulator model has reference values computed independently before implementation; unit tests must match them.
- I review motion by presenting it myself, not only by reading code or test results.

## Version history
- v1 (legacy/): first version - single compressed HTML/CSS/JS, CSS-only motion, never browser-tested. Kept for reference.
- v2: modular rebuild (this repository): Vite single-file build, GSAP timelines, scene controller, pure tested model.

---

### #1 - Offline build integrity (slice 1, 18 Oct 2026)
- **Goal:** index.html must work by double-click under file://, with no server and no internet.
- **Prompt / approach:** Vite + vite-plugin-singlefile build, plus an automated check that the output contains no external references.
- **Original output issue:** the AI's planned check would have rejected the inline `<script type="module">` that the single-file build legitimately produces (inline modules work under file://; only module files are blocked).
- **My refinement:** I made the rule precise: allow inline scripts and data: URIs; fail only on external src/href, http(s)://, fetch(, import( and workers. The corrected check then found a real `fetch(` from Vite's module-preload polyfill, which was disabled (`build.modulePreload: false`).
- **Independent verification:** grep test on dist/index.html; Playwright opens dist/index.html via file:// with all http(s) requests blocked (Chromium and Edge); I opened the built file myself with Wi-Fi off.
- **AI weakness found?** Yes - an over-broad check that would have pushed the build in the wrong direction, and a hidden network call in the bundle.

### #2 - Transition latency for live presenting (slice 1, 18 Oct 2026)
- **Goal:** a presenter's click must respond immediately.
- **Prompt / approach:** standard transition with the Core orb moving between scene anchors.
- **Original output issue:** all tests passed, but when I presented it myself, Next felt slow: exit, Core flight and entrance ran one after another (over 1 s), and the progress bar only updated at the end.
- **My refinement:** progress, scene number and hash update on the request; exit and entrance overlap; standard transition at most 0.7 s with the Core in parallel; all timings centralised in src/core/timing.js so I can tune them live.
- **Independent verification:** new tests check the progress updates in the same tick and the transition completes in under 0.8 s (about 0.5 s measured on Chromium and Edge); I re-tested by clicking through.
- **AI weakness found?** Yes - technically correct but not designed for a live presenter; only found by using it.

### #3 - Simulator model with independent reference values (slice 2, 18 Oct 2026)
- **Goal:** simulator KPIs that are explainable and provably correct.
- **Prompt / approach:** I specified the model (hourly peak shaving with a binary-search shave target and valley-fill recharge, economics on a normal day) and its reference values in docs/simulator-model.md; the AI implemented it as pure functions with no DOM.
- **Original output issue:** none in the model; all 6 reference cases matched on the first run. The value of this iteration was the method: an independent reference that would have exposed a wrong implementation.
- **My refinement:** asked for invariant tests too (grid never negative, grid never above the shave target, energy balance) over all 1,050 input combinations.
- **Independent verification:** 34 unit tests; I changed the battery capex constant to confirm the tests fail, then reverted it.
- **AI weakness found?** No.

### #4 - Paused-state rendering bug (slices 6-7, 19 Oct 2026)
- **Goal:** Pause must never break navigation during a live presentation.
- **Original output issue:** AI-generated scene code used `gsap.set()` to make elements visible. While the presentation is paused, GSAP's global timeline does not render those sets, so scene 03 stayed invisible after navigating with Pause on. No earlier test covered "navigate while paused".
- **My refinement:** introduced `setNow()` (immediate, pause-independent styling) and replaced `gsap.set` in scenes 01, 02 and 07, the parallax helper and the Core orb.
- **Independent verification:** new e2e test (tests/e2e/paused.spec.js) presses P, walks all 9 scenes forward and back, and asserts key elements are visible.
- **AI weakness found?** Yes - a latent bug that would only appear live in front of an audience.

### Other AI mistakes caught during the build
- **Lost key presses:** next()/prev() counted from the old scene instead of the in-flight target, so rapid presses were lost. Caught by a unit test; fixed by counting from the pending target.
- **Core stuck at the wrong size:** a parallax cleanup killed every tween on the Core, including the flight the transition had just started, so navigating back left the orb at 56 px. Caught by a size assertion (a centre-only check had hidden it).
- **Flaky test on my machine:** an e2e test passed in the AI's environment but failed on my Edge because it used a fixed wait; changed to condition-based waiting without loosening the check.
- **.gitignore overwritten:** an AI edit dropped *.pdf and .env from .gitignore, which could have committed the confidential assignment brief; restored immediately.