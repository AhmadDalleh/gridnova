# Requirements Checklist (from Candidate Assignment 2)

Source of truth: the assignment PDF (keep it outside the repo / out of the deliverable). Each requirement has an ID used in commits, tests and the final audit. Status is updated at the end of each slice.

| ID | Requirement (PDF section) | Where | Verified by | Status |
|---|---|---|---|---|
| R01 | Fictional proposal; all facts fictional and labelled illustrative assumptions; no confidential data; no implied endorsement by real organizations (§1, §2, §3.2) | all scenes, assumptions drawer | copy review; every numeric scene shows `ILLUSTRATIVE` tag | ☐ |
| R02 | 8–10 distinct, art-directed scenes forming a complete executive story (§2) | scenes 01–09 | storyboard walkthrough | ☐ |
| R03 | Scene purposes 01–09 covered (opening, problem, opportunity, system, use case, capability, simulator, business case, roadmap & decision with explicit ask) (§2) | storyboard | walkthrough | ☐ |
| R04 | Not a static card deck / converted PPT / video (§2 creative direction) | all | review | ☐ |
| R05 | Every scene enters/exits smoothly; ≥3 composed transitions beyond a full-screen fade (§3.1) | transitions A, B, C | e2e + rehearsal | ☐ |
| R06 | Kinetic typography reinforcing the narrative (§3.1) | 01, 02, 09 | rehearsal | ☐ |
| R07 | ≥1 coherent animated system visualization (§3.1) | 04, 05 | rehearsal | ☐ |
| R08 | Cross-scene continuity: element persists/transforms between scenes (§3.1) | GridNova Core; ghost load curve 02→07 | rehearsal | ☐ |
| R09 | ≥3 distinct motion techniques (§3.1) | SVG path drawing, camera/perspective/parallax, canvas particles, choreography, data morphing | code walkthrough | ◐ slice 3: data morphing + count-up |
| R10 | Paced for live narration; replay/revisit; no disruptive auto-advance; pause or reduced-motion for looping visuals (§3.1) | motion.js, nav | e2e: no auto-advance; toggles | ◐ slice 1, 3 (pause/reduced in scene 07) |
| R11 | Consistent design language, typography, restrained colour (§3.2) | tokens.css | review | ☐ |
| R12 | ≥2 scenes with distinctive visual treatment (§3.2) | 03 isometric campus, 06 particle field | review | ☐ |
| R13 | Effects explain something; no ornamental time-wasting (§3.2) | all | review | ☐ |
| R14 | Simulator: ≥2 inputs change visible numbers/space; ≥1 KPI or chart updates via real client-side logic (§3.3) | 07 | unit + e2e | ✅ slice 3 (unit + e2e) |
| R15 | Exploratory interaction: select hotspot/component/layer/milestone for detail (§3.3) | 03 zones, 04 nodes, 09 phases | e2e | ☐ |
| R16 | Controlled comparison: before/after, day/night, normal/incident… with visible outcome (§3.3) | 05 with/without, 06 day/night, 07 normal/heatwave | e2e | ◐ slice 3: normal/heatwave; 05 and 06 pending |
| R17 | Presenter navigation: next/prev, keyboard, visible progress/location, return to opening, resume a scene (§3.3) | nav.js, hash | e2e | ◐ slice 1 |
| R18 | Simulator calculation, assumptions and visual state explainable (§3.3) | simulator-model.md, assumptions drawer | walkthrough | ◐ slice 3 built; walkthrough pending |
| R19 | Works by double-clicking `index.html` under `file://`, no server/login/install/internet (§4.1) | build | e2e offline + manual Wi-Fi-off | ◐ slice 1 |
| R20 | All dependencies bundled; no CDN/API/fetch at runtime (§4.1) | build | grep test on dist | ◐ slice 1 |
| R21 | Libraries licence-compliant (§4.1) | `docs/licenses.md` | review | ☐ |
| R22 | Viewer needs no npm/server/scripts (§4.1) | ZIP layout | manual | ☐ |
| R23 | 16:9 canvas; graceful at 1920×1080 and 1366×768; no illegible/clipped content (§4.2) | stage.js | screenshots | ◐ slice 1 |
| R24 | Preloading; no white flashes or pop-in between scenes (§4.2) | preloader, fonts | rehearsal | ◐ slice 1 |
| R25 | Smooth, controllable, recoverable: no stuck transitions, broken back-nav, runaway loops, lost simulator state (§4.2) | controller, motion | unit + e2e stress (rapid keys) | ◐ slice 1 |
| R26 | Fullscreen/presentation mode with intuitive exit; controls not permanently hidden (§4.2) | fullscreen.js, auto-hiding nav that reappears on mouse move/focus | manual | ◐ slice 1 |
| R27 | Clean console, event cleanup, reasonable load speed, graceful fallback if effects unavailable (§4.2) | motion.js, canvas fallback | e2e console check | ◐ slice 1 |
| R28 | Readable source modules, comments on complex choreography, scene state separate from DOM effects (§4.2) | src/ | code review | ☐ |
| R29 | AI dev log: ≥3 meaningful iterations (goal, prompt, issue, refinement, verification) (§4.3) | docs/ai-development-log.md | Ahmad writes | ☐ |
| R30 | ≥1 real weakness in an AI suggestion and how it was corrected (§4.3) | AI log | Ahmad writes | ☐ |
| R31 | Ahmad can explain scene controller, sequencing, interactive state lifecycle, calculations, offline packaging, and modify live (§4.3) | slice explain-backs | rehearsal | ☐ |
| R32 | Deliverable ZIP: clean folder, `index.html` at root, all local dependencies (§5) | scripts/package.mjs | unzip + double-click test | ☐ |
| R33 | Editable source included; build notes if bundled (§5) | `source/` in ZIP | review | ☐ |
