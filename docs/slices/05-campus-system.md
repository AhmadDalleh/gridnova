# Slice 5: scenes 03 + 04 and composed transition B (R05, R07, R08, R09, R12, R15)

## What changed
- `src/scenes/03-opportunity/`: `zones.js` (zone data, outcomes, personas, `zoneFigure`), `campus.js` (the CSS 3D map and the camera), `template.js`, `scene.css`, `index.js` (lifecycle).
- `src/scenes/04-system/`: `data.js` (nodes, links, path maths), `diagram.js` (SVG diagram, draw-in, flow loop, dimming), `template.js`, `scene.css`, `index.js` (lifecycle).
- `src/core/transitions.js` + `timing.js`: transition B (`'2>3'`) and its reverse (`'3>2'`). Composed transitions now pass `{ composed: true }` to `exit()` and `enter()`.
- `src/model/constants.js`: `DEFAULT_UI`, the defaults of `store.ui` (selected zone / node, layer, event stage, ...). `main.js` puts it in the store and exposes `nav.replay`.
- `src/ui/set-now.js`: `gsap.set()` that also renders while Pause is on. `core-orb.js` `show()`/`hide()` use it.
- `src/core/nav.js`: keys are ignored on `[role="button"]` too (an SVG node focused with Tab must not change scene on Space).
- Tests: `tests/unit/campus-system.test.js`, `tests/e2e/campus-system.spec.js`.

## How it runs
- **Zone select:** click a name chip (or the 3D block) -> `select(id)` -> `store.set({ ui: { selectedZone } })` -> `onState` -> `renderZone()` updates chips, the lift (`--lift`) and the detail card. Click again or Escape clears it.
- **Node select / layer toggle (04):** same shape, with `ui.selectedNode` and `ui.layer`; `render()` calls `diagram.setSelected()` / `setLayer()` and fills the panel.
- **Navigation:** `controller.goTo(3)` -> `transitions['2>3']` builds one timeline: `03.exit(dir, {composed})` + `core.moveTo(04)` + `04.enter(dir, {composed})` -> controller waits -> `03.deactivate()`, `04.activate()` plays the link choreography.

## Choreography beats (as built)
Scene 03 `activate()` (about 3 s): `0.0` camera tilts 0 -> 58 deg, spins 0 -> -45 deg, zooms .62 -> .82 (one tween on a plain object, `applyCamera(k)` writes one `transform`) · `0.9` zones rise one by one (CSS variable `--h`, 0.12 s apart) · `1.3` zone names · `2.0` outcome badges drop onto zones + Core pulse · `2.1` outcome legend · `2.4` persona chips.
Scene 04 `activate()`: `0.0` outer nodes pop in around the Core · `0.35` links draw in one after another (control links first, then power; each switches from "drawing" to "flowing" when complete) · `2.0` Core pulse. A `motion.loop` moves dashes along power links (direction = arrow, speed illustrative) and control pulses leave the controller.
Transition B (1.25 s): `0.0` 03 UI fades, camera dives x4.5 about the substation, the Core stays on it · `0.45` Core flies to the controller position (0.8 s) · `0.8` scene 04 frame fades in (no slide: the Core is the centrepiece) · lands at 1.25 s, then 04's nodes and links start. Reverse: the diagram fades, the Core returns, 03 pulls out of the dive (0.9 s) already in its settled look.

## State lifecycle
- `store.ui` holds `selectedZone`, `selectedNode`, `layer`. It survives navigation (leave 03 with Research selected, come back from 04: still selected). `reset()` (Replay the story) restores the defaults. Simulator inputs (`store.sim`) are never touched.
- Everything derived is recomputed: card figures come from `zoneFigure(zone, store.sim, peak)`, the node panel's last line from `node.live(selectSim())`.
- Per activation: `ctx.motion.scope()` listeners, one `motion.loop` (04), one `store.subscribe`; all released in `deactivate()`.
- Interruptions: `exit()` kills a running `activate()` timeline and snaps to the settled look first. Arriving without B (hash, menu, back from 05) replays the full `activate()`.

## Offline notes
Pure CSS 3D and inline SVG: nothing to fetch. CSS variables tweened by GSAP (`--h`, `--lift`) need no plugin. Not applicable: fonts and files are as in slice 1.

## How to present it (60 s)
"The campus is a real 3D scene made of CSS boxes. Watch the camera tilt and the buildings rise. I click Research labs: critical load, 2.5 MW, never flexible. Substation and parking read my simulator sizing. Now I press next: the camera dives into the substation, the Core becomes the controller. One loop: solar, battery, grid, flexible demand, one controller. Amber dashes are power, cyan dots are control. I select the battery: the other links dim and the panel says how GridNova decides."

## Likely interview questions
1. *How is the 3D done?* A perspective container, a plane with `rotateX/rotateZ`, and boxes made of five faces; no WebGL. The camera is three numbers turned into one transform string.
2. *Why are the labels not in 3D?* Text on a tilted plane is blurry and not clickable; the chips are flat buttons placed from the measured top faces (`measureTops`).
3. *What happens if I press next during the camera move?* `exit()` kills the choreography and snaps to the settled look, then the dive runs.
4. *Where does selection state live?* In `store.ui`; handlers only call `setUi`; `renderZone`/`render` redraw.
5. *How do you animate a dash that is also the draw-in?* While drawing, `dasharray = length`; when complete it is switched to the flow pattern and the loop advances `dashoffset`.

## Live-change rehearsal
"Make the camera dive slower": `DIVE` time is the `duration: 1.0` in `03-opportunity/index.js` `exit()`, and `TRANSITION_B.core/enterDelay` in `core/timing.js` must stay in step. "Change the thermal plant's share": `share: 0.20` in `zones.js`.

## AI log candidate
`filter: drop-shadow` on the selected block flattened the CSS 3D box (a filter forces `transform-style: flat`); moved the glow to the top face. Also: `gsap.set` does not render while paused, which left scene 03 invisible after a paused back-navigation; fixed with `setNow` and a Playwright test.
