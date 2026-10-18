# Slice 7: scenes 08 + 09 (R03, R05, R06, R15, R31)

**Scope decision (deadline):** composed transition C (07 -> 08, KPI numbers flying into the waterfall) was NOT built; 07 -> 08 uses the standard transition. R05 still has A and B as composed transitions. Open item for slice 8 if time allows: a generic `flyNumbers(sources, targets)` helper plus `'6>7'` / `'7>6'` entries in `transitions.js`; scene 08 already has the target numbers (the four cards).

## What changed
- `src/scenes/08-business-case/`: `figures.js` (cards, waterfall bars, cash flow, formulas: pure), `template.js`, `scene.css`, `index.js`.
- `src/scenes/09-decision/`: `roadmap.js` (phases, milestones, risks, the ask, sizing line), `scene.css`, `index.js`.
- Tests: `tests/unit/business-decision.test.js`, `tests/e2e/business-decision.spec.js`.

## How it runs
- **08:** `enter()` calls `load()`: `selectSim()` -> `businessFigures()` / `cashFigures()` -> rebuilds the SVGs for the CURRENT simulator state. Hover/focus on any element with `data-formula` writes that formula into the formula bar.
- **09:** click a phase -> `store.ui.selectedPhase` -> `render()` fills the detail panel. Replay -> `nav.replay()` (controller.replay: every scene `reset()`, back to 01, simulator inputs untouched). Revisit -> `nav.goTo(6)`.

## Choreography beats
08 `activate()`: `0.0` four number cards fade up and count up · `0.5, 1.0, 1.5, 2.0` waterfall bars grow one after another (each from its start edge) · `0.6` cash-flow line draws (1.2 s) · `1.9` payback marker drops in (bounce) and its counter runs to the payback years.
09 `activate()`: `0.0` timeline line draws (1.0 s) · `0.2` phases slide in (0.2 s apart) · `0.9` milestones pop · `1.5` risks · `2.0` the ask types in, one character every 0.02 s (kinetic type; words never break) · then the sizing line and the two buttons. The Core is large next to the ask.

## State lifecycle
08 has no state of its own (everything derived from `store.sim`; economics always use the normal day). 09: `ui.selectedPhase` only; `reset()` clears it. Leaving mid type-in kills the timeline and snaps to the finished look.

## Offline notes
Nothing to fetch; pure SVG/DOM. Packaging is covered in `scripts/package.mjs`.

## How to present it (60 s)
"Everything here comes from the sizing I chose. Capex, net annual value, payback, peak reduction. Hover the demand-charge bar: 3.43 MW times AED 40,000 times 12. The cash line crosses zero at 6.1 years. Then the ask: approve Phase 1, AED 330k, gate in Q2, carrying the sizing from the simulator. Replay or revisit."

## Likely interview questions
1. *Where do the scene 08 numbers come from?* `simulate(store.sim)`; `businessFigures()` only arranges them.
2. *Why is demand-charge MW not the heatwave peak?* Economics use the normal day; MW = demandValue / (40,000 x 12).
3. *How is the waterfall animated?* One progress number per bar; `renderBars()` rewrites each rect from its start edge.
4. *What does Replay keep?* The simulator inputs (they live in the store, not in scenes).
5. *Why is there no composed transition C?* Cut for the deadline; standard transition used, documented here.

## Live-change rehearsal
"Change the ask to AED 400k": `ASK` in `roadmap.js` (the text and the Phase 1 cost label). "Add an exclusion": `EXCLUSIONS` in `model/constants.js` (shown here and in the drawer).

## AI log candidate
Tweening a JS array with gsap treats it as a list of targets: bar progress uses a plain object instead.
