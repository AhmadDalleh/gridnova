---
name: gridnova-scene
description: Step-by-step workflow for building or changing any part of the GridNova offline HTML presentation — a scene, a transition, the scene controller, navigation, the motion manager, the simulator model or UI, the Core orb, the build/packaging, or tests — ending with browser verification from file:// and an explain-back for Ahmad. Use this whenever the task touches a scene (01–09), choreography, an interaction, the simulator, offline packaging or presenter controls in this repository, even if phrased casually ("make the opening cooler", "fix the slider", "add the day/night toggle").
---

# GridNova slice workflow

A *slice* is one item of the build order in `CLAUDE.md`. Each must be small enough that Ahmad can present it, explain it and change it live. Read `CLAUDE.md` first. Content comes from `docs/storyboard.md`; numbers from `docs/simulator-model.md`; structure and contracts from `docs/architecture.md`. Patterns are in `references/` — open the one you need instead of inventing a new approach:
- `references/scene-patterns.md` — scene module skeleton, controller/transition, store, motion manager, Core orb
- `references/motion-recipes.md` — kinetic type, SVG path drawing, flows, camera/perspective, particles, count-ups, data morphing, reduced-motion handling
- `references/offline-checklist.md` — build config, file:// pitfalls, Playwright offline test

## Step 0 — Locate
Name the slice, its scenes, and the requirement IDs (R01–R33) it satisfies. Quote the storyboard lines for those scenes. Ask one precise question if something is ambiguous.

## Step 1 — Plan (show it, then wait for "go")
- Scenes / modules / files to create or change
- Choreography outline per scene: a timed beat list, e.g. `0.0 eyebrow in · 0.3 title words stagger 0.08 · 1.1 Core rings scale · 1.6 sub fades`
- Interaction(s): state they change, what re-renders
- Which motion technique(s) this slice demonstrates (R09)
- Reduced-motion and pause behaviour
- Tests to add (unit / e2e) and what screenshots will show
- New dependencies (needs approval) or "none"
Keep it to one or two commits.

## Step 2 — Build
- Follow the scene contract (`mount/enter/exit/activate/deactivate/reset`).
- State changes only in handlers; DOM updates only in render functions.
- Every timeline created in `mount` (paused) or built in `enter`; every loop through `ctx.motion.loop`; every listener through `ctx.motion.listen`.
- All figures from the model or from labelled constants; add the `ILLUSTRATIVE` tag where numbers appear.
- Comment the choreography intent at the top of each timeline.

## Step 3 — Verify for real
1. `npm test` (unit) green.
2. `npm run build`, then `npm run e2e` (opens `dist/index.html` via `file://`, network blocked): no console errors; navigate through the slice's scenes forward/back with keys; exercise each interaction; toggle pause and reduced motion; screenshots at 1920×1080 and 1366×768.
3. Stress: press → rapidly 10 times, then ← 10 times — no stuck or overlapping scenes.
4. Look at the screenshots yourself and report anything clipped, illegible or overlapping.
Report exactly which checks ran and their result. Never claim an unrun check.

## Step 4 — Update docs
`docs/requirements.md` statuses; storyboard if the agreed design changed; README controls if keys changed.

## Step 5 — Explain-back (always; this is Ahmad's interview prep)
```
### Slice: <name> (R-IDs)
**What changed:** files by area (1 line each)
**How it runs:** user action → handler → store → render / controller → exit timeline → enter timeline → activate
**Choreography:** the beat list as built (what moves, when, and why it supports the story)
**State lifecycle:** what state exists, where it lives, what survives navigation/replay
**Offline notes:** anything relevant to file:// for this slice
**How to present it (60 s):** what to say and click
**Likely interview questions:** 4–5 with short answers
**Live-change rehearsal:** one small change the panel might ask for (e.g. "make the title stagger slower", "change the battery capex") and exactly which file/line to edit
**AI log candidate:** draft facts if an AI mistake was found and fixed (else "none")
```

## Step 6 — Commit
Suggest conventional commit message(s). Commit and push only when Ahmad says so (or when the session prompt explicitly allows it).

## Guardrails
- The deliverable must open by double-click with no server: never introduce module files, fetch, CDNs or workers into the output.
- No auto-advance. No sound autoplay.
- Simulator numbers must match the reference table in simulator-model.md §6.
- If an effect costs time but explains nothing, propose removing it.
- Keep composed transitions reversible; backward navigation must never break.
