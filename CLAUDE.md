# CLAUDE.md — GridNova Interactive Executive Presentation

Ahmad's second e& take-home assessment: a **cinematic, interactive HTML pitch** for a fictional microgrid platform, presented to an executive investment committee. In the interview he must **present it live, explain the scene controller, animation sequencing, state lifecycle, simulator calculations and offline packaging, and modify it live**. Code he cannot explain is a failure. Optimize for *clear, intentional, explainable* motion and code.

## Source documents (read the relevant ones before each slice)
- `docs/storyboard.md` — the 9 scenes: purpose, content, visuals, motion, interaction, transitions
- `docs/simulator-model.md` — model formulas, constants, **reference values for tests**
- `docs/architecture.md` — stack, layout, stage, scene controller contract, store, motion manager, offline rules, testing, ZIP layout
- `docs/requirements.md` — requirement IDs R01–R33 from the assignment (update status per slice)
- `.claude/skills/gridnova-scene/SKILL.md` — workflow for building any slice
- `legacy/` — previous version (copy text and model ideas only; do not copy its compressed code style)

If docs disagree with each other or with a request, **stop and ask**; update the doc in the same commit as the decision.

## How to work with Ahmad (non-negotiable)
1. **One slice at a time** (see build order). Plan → wait for "go" → build → verify in a real browser → explain-back.
2. **Ask before adding any dependency** beyond the approved list below.
3. **Readable source:** formatted code, one scene per folder, files < ~250 lines, comments on choreography intent and non-obvious math. Never minify or compress source by hand.
4. **No fake interactivity:** every number on screen that the brief calls a KPI comes from `src/model/`; no hardcoded results, no videos, no pre-baked animations pretending to be live.
5. **Verify in the browser** (Playwright and/or the preview), from the **built** `dist/index.html` via `file://` with network blocked, before calling a slice done. Report what you actually checked; never claim a check you did not run.
6. Draft notes for `docs/ai-development-log.md` only when a slice had a meaningful iteration or you corrected an AI mistake; Ahmad writes the final entries himself.
7. If you notice a requirement at risk (R-ID), say so explicitly.

## Approved stack
Vite, vite-plugin-singlefile, GSAP (core + timelines; plugins only if Ahmad approves), @fontsource/space-grotesk, @fontsource/inter, Vitest, Playwright, a zip library for `scripts/package.mjs` (ask which). Vanilla JS only — no React/Vue/Three.js.

## Commands (keep updated)
```bash
npm install
npm run dev          # Vite dev server (development only)
npm run build        # → dist/index.html (single offline file)
npm test             # Vitest unit tests
npm run e2e          # Playwright: opens dist/index.html via file://, network blocked, screenshots
npm run package      # → release/GridNova_Submission.zip
```

## Conventions
- **Stage:** author everything at 1920×1080 stage pixels; never use `vw/vh` inside scenes.
- **Scenes** follow the contract in architecture.md §5 (`mount/enter/exit/activate/deactivate/reset`). Scenes never call each other; they talk through the store and `ctx.core`.
- **State vs DOM:** handlers change state → render functions update DOM. Simulator results are derived from `simulate(state.sim)`.
- **Motion:** all timelines via GSAP; all loops via `motion.loop()`; all listeners via `motion.listen()` (AbortController). Every loop must stop on pause, reduced motion and scene exit.
- **Reduced motion:** every scene must look complete with motion reduced (timelines jump to end).
- **Colour meaning is fixed:** amber = solar/value, cyan = storage/GridNova, coral = grid/peak/risk.
- **Copy:** short; numbers big; every scene with figures shows an `ILLUSTRATIVE` tag; currency AED; no real company names.
- **Accessibility:** controls are real `<button>`/`<input>` with labels, focus visible, keyboard operable.
- **Console clean.** No `console.log` left in committed code.

## Build order (one slice per session)
1. **Foundation:** Vite + singlefile build, stage scaling, controller with 9 placeholder scenes, nav (keys, buttons, progress, menu, hash resume), motion manager (pause/reduced), fullscreen, store, Core orb moving between placeholder anchors, fonts + preloader, Playwright offline `file://` test + screenshots. **Prove offline double-click works before any scene art.**
2. **Model:** `src/model/` + unit tests matching simulator-model.md §6.
3. **Scene 07 simulator** (UI, 24h chart, KPIs, presets, heatwave, assumptions drawer, state persistence).
4. **Scenes 01 + 02** + composed transition A.
5. **Scenes 03 + 04** + composed transition B (exploratory interactions).
6. **Scenes 05 + 06** (event stages + with/without; canvas particles + day/night).
7. **Scenes 08 + 09** + composed transition C (business case from live state, roadmap, ask, replay).
8. **Polish & QA:** continuity tuning, performance, reduced-motion pass, 1366×768 pass, console, README, licences, `npm run package`, final requirements audit.

## Definition of done (per slice)
1. Storyboard content and requirement IDs for the slice are met
2. Works from built `dist/index.html` via `file://` with network blocked (e2e green)
3. Pause, reduced motion, back-navigation and replay work for the slice's scenes
4. Unit/e2e tests added and passing; screenshots at 1920×1080 and 1366×768 updated
5. `docs/requirements.md` statuses updated
6. Explain-back delivered (see skill)
7. Conventional commit(s): `feat(scene-07): ...`, `test(model): ...`, `fix(nav): ...`

## Do not
- Put the assignment PDF in the repo or the ZIP
- Use CDNs, remote fonts, fetch, or module files in the output
- Auto-advance scenes or start sound automatically
- Add ornamental effects that don't explain anything
- Rewrite working scenes without being asked
