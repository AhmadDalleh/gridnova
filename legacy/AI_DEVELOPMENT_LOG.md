# AI development log — GridNova

This log records the actual assignment prompt and implementation/refinement work performed in this session. Verification claims refer only to checks executed here.

## Iteration 1 — source requirements to scene plan
- **Goal:** Convert the four-page assignment into a traceable executive narrative and implementable checklist.
- **Prompt / approach actually used:** The user supplied a detailed implementation brief requiring full PDF reading, exact page references, nine scenes, traceability, autonomous phases and completion. I extracted all four PDF pages with `pypdf`, read the handoff docs, and mapped requirements to user stories and concrete feature/test methods.
- **Initial output / issue observed:** The PDF extractor emitted replacement glyphs for a few symbols in the motion bullets. That did not obscure requirement content but made raw extraction imperfect.
- **Refinement made:** Used the full extracted page text in context and recorded the glyph limitation while citing page locations in the traceability map.
- **Independent verification:** PASS — the bundled reader reported four pages, and the printed text for pages 1–4 was reviewed before authoring `REQUIREMENTS_TRACEABILITY.md`.

## Iteration 2 — simulator and visible outputs
- **Goal:** Make design choices change actual illustrative outputs.
- **Prompt / approach actually used:** Implement the assignment’s bounded-input, computed-KPI/chart requirement with a deterministic, documented model separated into `calculate()` and `renderModel()` in `app.js`.
- **Initial output / issue observed:** The HTML contained starter display values for the KPI and economics. Those values could be stale if treated as authoritative before JavaScript initialized.
- **Refinement made:** `renderModel()` is called during initialization and updates peak reliance, all energy mix bars, annual savings, payback, capex, resilience and the business-case scene from the same calculation.
- **Independent verification:** PASS — extracted and ran the actual `calculate()` function with zero, balanced default, maximum and out-of-range inputs in Node. Results stayed bounded and finite, except intentionally null payback when savings are zero. Node syntax and HTML element-reference checks also passed.

## Iteration 3 — motion and offline reliability
- **Goal:** Make the story feel composed while keeping runtime independent of network access.
- **Prompt / approach actually used:** Build local CSS/SVG motion and scan for external URLs, imports and fetch patterns; provide transitions with different crops/transforms plus the persistent energy motif.
- **Initial output / issue observed:** The first authored stylesheet included an empty `@import url('')` line. It served no purpose and was an unnecessary import-shaped offline hazard.
- **Refinement made:** Removed the empty import, retained system font stacks, and added wipe, rise, focus, split and orbit scene entrance choreography.
- **Independent verification:** PASS — source scan reported no remote URLs, CSS imports, `fetch()`, ES-module declarations or dynamic imports in runtime files. Browser execution was blocked by the computer-use URL policy, so direct-file/offline rendering remains NOT RUN.

## Actual weakness in an AI-generated implementation choice
- **Suggestion and context:** The initial AI-authored CSS included an empty `@import url('')` line.
- **Why it was weak:** It was dead CSS and created an unnecessary import-shaped dependency signal in a deliverable whose primary constraint is offline operation.
- **Correction:** Removed it; typography uses local system font stacks and no remote font assets.
- **Evidence it is corrected:** PASS — the runtime source dependency scan returned no `@import` or external URL matches.

## Verification summary

| Check | Result | Evidence |
|---|---|---|
| JavaScript syntax | PASS | Bundled Node `--check app.js` exited successfully. |
| HTML structure and scene count | PASS | Python `HTMLParser`: 9 scenes, 46 unique IDs, no duplicate IDs. |
| Static JavaScript-to-HTML IDs | PASS | All literal `$('<id>')` lookups resolve in the parsed HTML. |
| Simulator edge values | PASS | Actual function run for zero, default, maximum and out-of-range values. |
| External runtime dependency scan | PASS | No URLs, `@import`, `fetch()`, ES modules or dynamic imports. |
| ZIP root structure | PASS | `zipfile` listing confirmed eight root entries: `index.html`, CSS/JS, README, traceability/work/AI logs, and the original PDF. No nested folder. |
| Chrome/Edge direct `file://` | NOT RUN | Tool policy blocked file URLs; alternate routes prohibited. |
| Offline/disconnected internet | NOT RUN | Requires manual Chrome/Edge test. |
| 1920×1080 / 1366×768 / narrow layout | NOT RUN | Requires browser visual inspection. |
| Keyboard, controls, animation, console | NOT RUN | Requires browser interaction. |

## Interview explanation notes
- **Scene controller:** `currentScene` is the navigation index; `setScene()` toggles scene visibility, progress, button state and a composed entrance mode. No timer advances scenes.
- **Motion:** CSS keyframes animate kinetic text, SVG path dashes, orbit and floating capability nodes, chart bars and scene entrance clips/transforms. Pause and reduced-motion classes control loops and transitions.
- **Interactive state:** Solar, battery and scenario are ordinary in-memory variables. Changing scenes does not reset them; a preset intentionally updates both inputs.
- **Calculation:** `calculate()` clamps its inputs, returns peak mix, avoided-energy proxy, savings, capex, payback and resilience. `renderModel()` formats those values into the simulator and business case.
- **Offline packaging:** Root HTML references only local `styles.css` and `app.js`; SVG artwork is inline and no remote runtime resource is used.
