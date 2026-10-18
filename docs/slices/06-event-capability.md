# Slice 6: scenes 05 + 06 (R05, R07, R09, R10, R12, R16)

## What changed
- `src/scenes/05-peak-event/`: `figures.js` (all numbers and the per-stage logic, pure), `chart.js` (the SVG chart with a tweened state), `mini.js` (mini system diagram built from scene 04's data), `template.js`, `scene.css`, `index.js`.
- `src/scenes/06-capability/`: `particles.js` (the particle pool and routes, pure), `template.js` (capability texts + markup), `scene.css`, `index.js` (canvas drawing, loop, toggle).
- `src/core/motion.js`: `motion.running()` (is a loop allowed to run right now?) so a scene can paint one static frame when it is not.
- Tests: `tests/unit/event-capability.test.js`, `tests/e2e/event-capability.spec.js`.

## How it runs
- **Scene 05:** click a stage / toggle / Play -> `setUi({ eventStage | eventMode })` -> `onState` -> `render()`: `stageView(stage, mode)` says what the chart shows, `chart.tweenTo()` animates the chart state, `miniState()` relights the mini diagram, `outcomeFor()` fills the card. The model is run twice at mount (`eventFigures()`): `simulate({4, 8, heatwave})` and `simulate({0, 0, heatwave})`. Nothing on this scene is typed in except the narrative 13:42 start time.
- **Scene 06:** click Day/Night -> `setUi({ dayNight })` -> `render()`: sets `data-mode` (CSS tints the sky, moves the sun to a moon), lights the capability panels, calls `field.setMode()` which re-assigns every particle's route according to the mix. `motion.loop` calls `field.step(dt)` and `draw()` every frame.

## Choreography beats (as built)
Scene 05 `activate()`: `0.0` controls, rail and side panel fade up (0.12 s apart) · `0.2` the chart's clock runs 08:00 -> 13:42 (1.4 s). Stage click: the chart tweens (0.8 s): the dashed forecast appears at 02, the cyan GridNova line and its band appear at 03, the day is drawn further at 04, held 7.5 MW marker + outcome card at 05; the Core pulses on each With step. Mode toggle: the same afternoon replays from 08:00 (1.8 s). Play: one stage every 1.8 s.
Scene 06 `activate()`: `0.0` toggle and three capability panels rise (0.12 s apart) · `0.0` the field fades in (`intensity` 0 -> 1, 1.2 s) while the loop runs.

## State lifecycle
- `store.ui.eventStage / eventMode / dayNight`. Scene 05 resets to stage 01 + With on every `enter()` (each visit tells the story from the start); scene 06 keeps Day/Night across navigation; Replay (`reset()`) restores the defaults. Simulator inputs are not used by 05 (fixed Balanced vs nothing) and not touched.
- Loop: started in `activate()`, stopped in `deactivate()`; skipped by the motion manager on pause, reduced motion and hidden tab; `step()` clamps dt to 50 ms so returning from a hidden tab never teleports particles. Paused/reduced: `render()` paints one static frame (`motion.running()` is false) whenever the mode changes.

## Offline notes
Canvas 2D only, no images, no cross-origin data, so the canvas is never tainted. If `getContext('2d')` returns null the scene still shows its shapes and panels.

## How to present it (60 s)
05: "Heatwave afternoon: load is climbing at 13:42. Detect, forecast, dispatch, shift, stabilize: the chart bends at each step. Peak import goes from 11.0 to 7.5 MW, minus 32 %, about AED 141k of demand charge avoided this month. Now Without GridNova: the same afternoon, the spike is bought in full." 06: "Three capabilities. Day: sun charges the battery and serves the campus. Night: the battery serves the campus and the grid trickle shrinks. Human-supervised, explainable."

## Likely interview questions
1. *Where do the scene 05 numbers come from?* Two `simulate()` runs; `eventFigures()` derives the rest (-32 % = (11.0 - 7.48) / 11.0; AED 141k = 3.52 MW x AED 40,000).
2. *How does the chart animate between stages?* One state object (`cursor`, layer opacities); GSAP tweens it; `render()` rewrites clip rectangles and opacities. No path is rebuilt.
3. *How do you keep 380 particles cheap?* A fixed pool, no allocation per frame, one `arc` per particle, no shadow blur; the loop is stopped when the scene is inactive.
4. *What does reduced motion do here?* No loop: one static frame, repainted on a mode change; chart changes jump instead of tween.
5. *Are the particle shares model output?* No: they are labelled conceptual constants in `particles.js` (`MIX`).

## Live-change rehearsal
"Show 600 particles": `MAX_PARTICLES` in `particles.js` (the unit test caps it at 400 on purpose: change the test and say why). "Slow the Play button": `STEP_SECONDS` in `05-peak-event/index.js`. "Change the heatwave sizing": `EVENT_SIZING` in `figures.js` (the card and chart follow).

## AI log candidate
Colour-classifying canvas pixels in the first e2e version called overlapping coral glows "amber" (additive blending saturates); switched to colour ratios and ignoring blown-out pixels. Also `gsap.set` while paused (see slice 5 note) mattered again here for the outcome card.
