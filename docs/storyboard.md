# GridNova — Storyboard

> Fictional proposal: **GridNova**, an intelligent microgrid platform (solar + batteries + demand orchestration) for a fictional university campus, **"Al Noor Technical Campus"** (invented). All numbers are **illustrative assumptions** and must be labelled as such on screen.
> Audience: a senior executive investment committee. Presented live by Ahmad, scene by scene, with narration.
> Canvas: fixed **1920×1080 stage**, scaled to fit the window (see `architecture.md`). All coordinates below are stage pixels.

## Contents
- Design language
- The persistent element: the GridNova Core
- Scene-by-scene storyboard (01–09)
- Transition plan (which transitions are "composed")
- Requirement coverage summary

---

## Design language

| Token | Value | Use |
|---|---|---|
| Background | `#071116` → `#0d1c22` radial | all scenes, dark "control room" |
| Text | `#edf5f3` primary, `#93aaa9` muted | |
| Solar / generation | amber `#f3b957` | solar, daytime, value |
| Storage / GridNova | cyan `#46d7c1` | battery, control, GridNova brand |
| Grid / risk | coral `#ee7e5f` | grid import, peaks, cost, risk |
| Display font | **Space Grotesk** (OFL, bundled locally) | titles, numbers |
| Body font | **Inter** (OFL, bundled locally) | copy, labels |
| Assumption tag | small uppercase pill `ILLUSTRATIVE` in muted outline | on every scene with numbers |

Rules: restrained colour (the three energy colours mean the same thing on every scene), one idea per scene, numbers big, words few, no bullet-heavy slides. Every motion must explain something.

## The persistent element: the GridNova Core

A glowing cyan **orb with an amber orbiting dot** (the "Core") lives in a fixed overlay layer above the scenes. It carries continuity across the story (requirement: cross-scene continuity):

| Scene | Core position / form |
|---|---|
| 01 | Large, centre-right; it **is** the hero visual |
| 02 | Shrinks and **becomes the marker on the load-curve peak** |
| 03 | Moves to the campus map's central substation (it "lands" on the campus) |
| 04 | Becomes the **GridNova controller node** at the centre of the system diagram |
| 05–06 | Small, top-right, pulses on each dispatch step |
| 07 | Sits beside the KPI; its glow intensity = **peak reduction %** (0–60 % mapped to a visible min–max glow) |
| 08–09 | Returns to large on the closing frame next to the decision ask |

Implementation: one element, moved with GSAP **Flip / FLIP-style** tweens to per-scene anchor elements (`data-core-anchor`). See `architecture.md`.

---

## Scene-by-scene

Each scene lists: **Purpose · Content · Visual · Motion · Interaction · Exit**. Copy in quotes is the on-screen text (can be refined, keep it short).

### 01 · The proposition (Cinematic opening)
- **Purpose:** fictional identity, vision, hook.
- **Content:** eyebrow "A FICTIONAL MICROGRID PROPOSAL"; title "Energy, / in better / balance."; sub "A campus that can see the next peak coming — and choose what to do about it."; three orbit labels GENERATE · STORE · ORCHESTRATE; tag ILLUSTRATIVE CONCEPT.
- **Visual:** dark depth field: 3 parallax layers (faint grid, slow particles, the Core with rings).
- **Motion:** (1) **kinetic typography** — title split into words/lines, staggered rise with masked reveal; the word "balance." draws as an outline stroke then fills; (2) Core reveal — rings scale in, amber dot starts orbiting; (3) subtle **mouse parallax** of the three layers (disabled in reduced motion).
- **Interaction:** "Begin" button → next scene; parallax on pointer move.
- **Exit → 02 (composed transition A):** title words slide out left; the Core shrinks and flies down to the future peak point of scene 02's load curve.

### 02 · The pressure (The problem)
- **Purpose:** current pain, scale, urgency — data-led.
- **Content:** "Demand peaks. Control lags."; 24-hour campus load curve (illustrative, peak ~10 MW at 15:00); counters (all from the model's baseline: no solar, no battery): **10 MW** illustrative peak · **100 %** of the peak bought from the grid in real time · **3 h** peak exposure window (14:00–17:00) · **AED 4.8M/yr** illustrative demand charges (10 MW × AED 40,000 × 12). Note: "Fictional campus. Illustrative assumptions."
- **Visual:** large SVG chart, coral peak window band 14:00–17:00.
- **Motion:** **SVG path drawing** of the load curve (left→right, synced with a clock readout 00:00→24:00); peak band pulses once; numbers **count up** when their annotation appears.
- **Interaction:** hover/focus on the curve shows the hour + MW (tooltip).
- **Exit:** curve fades to 20 % and stays as the ghost "before" line used again in scene 07.

### 03 · The opportunity
- **Purpose:** target users, benefits, measurable outcomes — spatial, not bullets.
- **Content:** "Turn the campus into a coordinated asset." Isometric campus map with zones: Academic core, Research labs (critical load), Thermal plant (flexible), EV fleet depot (flexible), Parking canopies (solar), Substation. Three outcome badges anchored on the map: **01 Lower peak import · 02 Longer islanding window · 03 More predictable cost**. Users: Facilities Director, CFO, Sustainability Lead (shown as three small persona chips with one-line "what they gain").
- **Visual:** **distinctive treatment #1** — campus drawn in SVG, shown in **CSS 3D perspective** (tilted plane, `perspective` + `rotateX`), with depth shadows.
- **Motion:** **camera move** — map starts flat and zoomed out, tilts into perspective while zones rise in sequence (coordinated choreography); outcome badges drop onto their zones.
- **Interaction (exploratory):** select a zone → it lifts, glows, and a side card explains its role (load type, flexibility, illustrative MW).
- **Exit → 04 (composed transition B):** camera **dives into the substation**; map fades while the Core (sitting on the substation) becomes the centre node of scene 04's diagram.

### 04 · The system (architecture)
- **Purpose:** solution architecture and key capabilities.
- **Content:** "One loop. Three levers." Nodes: **Solar (generate) · Battery (shift) · GridNova controller (coordinate) · Flexible demand (flex) · Utility grid (import/export)**; legend: power flow (solid), control signal (dashed).
- **Visual:** layered SVG diagram: power layer and control layer.
- **Motion:** links **draw in** one by one; then continuous **flow animation** along links (dash offset) — direction and speed show what flows where; control signals pulse from the controller.
- **Interaction (exploratory, required):** select a node (click / Enter) → node focuses, unrelated links dim, a detail panel shows Input · Output · Value · "How GridNova decides". Layer toggle: Power / Control / Both.
- **Exit:** diagram shrinks to a mini-map that stays in the corner of scene 05.

### 05 · A peak event (use case)
- **Purpose:** trigger → business outcome sequence.
- **Content:** "See the peak. Change the response." A fictional heatwave afternoon. Five stages: **01 Detect** (13:42 load climbing) → **02 Forecast** (heatwave peak predicted ~15:00, **11.0 MW**) → **03 Dispatch** (battery discharges up to 4 MW) → **04 Shift** (EV charging and chiller pre-cool moved, narrative only) → **05 Stabilize** (grid import held at **~7.5 MW**). Outcome card: "Peak import −32 % · illustrative demand-charge avoided ≈ AED 141k this month". **These numbers must be computed by the model** (`simulate({solarMw:4, batteryMwh:8, dayType:'heatwave'})`), never typed by hand; the values here are what the reference model produces.
- **Visual:** stage rail + live mini-chart of grid import + the mini system diagram from 04 changing state per stage.
- **Motion:** each stage advances a timeline segment; the chart line bends down; the Core pulses on dispatch.
- **Interaction (scenario comparison, required):** toggle **Without GridNova / With GridNova** → the same afternoon replays: without = peak spikes to 11.0 MW, alarm colour; with = shaved peak. Stage buttons selectable in any order (state changes are deterministic per stage).
- **Exit:** standard.

### 06 · Capability showcase (operating model)
- **Purpose:** differentiating technology: Forecast · Orchestrate · Learn.
- **Content:** three capability panels + the statement "Human-supervised. Explainable decisions." Capability claims marked conceptual.
- **Visual:** **distinctive treatment #2** — full-bleed **canvas particle energy field**: particles flow from solar (top) → battery (centre) → buildings (bottom), coloured by source.
- **Motion:** **particle system** (canvas 2D, requestAnimationFrame, capped count, paused when scene inactive or motion paused).
- **Interaction (controlled comparison):** **Day / Night** toggle — day: amber particles from solar charge the battery and serve load; night: cyan particles flow out of the battery, coral particles from the grid shrink. Capability panels highlight which capability acts in each state.
- **Exit:** particles fade; background holds.

### 07 · Explore the design (simulator — required)
- **Purpose:** executive changes decision variables and sees impact live.
- **Content:** "Size the system for your priorities."
  - Inputs: **Solar capacity** slider 0–10 MW (0.5 step) · **Battery energy** slider 0–24 MWh (1 step) · **Day type** toggle Normal / Heatwave · presets **Baseline / Balanced / Resilience**.
  - Outputs (KPIs): peak grid import (MW) and peak reduction %, annual indicative value (AED), capex (AED), simple payback (years), resilience hours for critical load.
  - Chart: **24-hour stacked chart** computed live: load line, solar, battery discharge, battery charge, grid import; plus the ghost "before" curve from scene 02.
  - Assumptions drawer: every constant from `simulator-model.md`, labelled illustrative.
- **Visual:** dashboard composition; KPI numbers large.
- **Motion:** chart morphs smoothly between results (tween the data arrays, not redraw jumps); KPI numbers tween to new values; Core glow = peak reduction % (headline KPI; 0–60 % mapped to min–max glow).
- **Interaction:** sliders (keyboard accessible), toggle, presets; state **persists** when navigating away and back.
- **Exit → 08 (composed transition C):** the four KPI numbers detach and **fly into** their positions in scene 08's business-case chart.

### 08 · The business case
- **Purpose:** investment, costs, savings, value, assumptions — transparent.
- **Content:** "Make value auditable." Uses the **current simulator state** (not fixed numbers):
  - Waterfall: capex (solar + battery + platform) → annual value (energy + demand charge) → O&M → net annual value.
  - 10-year cumulative cash-flow line crossing zero at the payback year (marker).
  - Assumptions table (illustrative) + exclusions: degradation, financing, incentives, taxes, residual value.
  - "These figures update with your choices in scene 07."
- **Motion:** bars grow in sequence (waterfall choreography), cash-flow line draws, payback marker drops in with a counter.
- **Interaction:** hover/focus a bar → shows its formula and inputs ("Demand charge value = peak reduction 3.2 MW × AED 40,000 × 12").
- **Exit:** standard.

### 09 · Roadmap & decision
- **Purpose:** phases, milestones, risks, explicit ask.
- **Content:** "Start with a bounded decision." Timeline: **Phase 1 Discover (6 weeks, illustrative AED 330k)** · **Phase 2 Pilot design & build (6 months)** · **Phase 3 Scale (gated)**; milestones on the line; risks with mitigations (site data quality, interconnection approval, battery supply lead time); **The ask:** "Approve Phase 1 discovery and pilot design: AED 330k, decision gate in Q2." + the sizing currently chosen in the simulator ("Pilot sizing carried from your scenario: 4 MW solar · 8 MWh battery").
- **Motion:** timeline **draws**, phases slide in along it; milestones pop; final frame: the Core returns large; the ask types in (kinetic typography).
- **Interaction:** select a phase/milestone → detail (scope, exit criteria, risk). Buttons: **Replay the story** (→ scene 01, resets animations but keeps simulator choices) and **Revisit the simulator**.

---

## Transition plan

| Transition | Type | Composition |
|---|---|---|
| **A** 01 → 02 | composed | title words exit in stagger; Core flies to the peak point; curve begins drawing as Core lands |
| **B** 03 → 04 | composed | camera dive into the substation; map dissolves; Core becomes controller node; links start drawing |
| **C** 07 → 08 | composed | KPI numbers detach and fly to their positions in the waterfall |
| all others | standard | outgoing scene: fade + slight scale down (0.98) + blur; incoming: fade + rise 24px |
| Backward navigation | | every transition has a reverse (timelines `reverse()` or a mirrored standard transition); never a stuck state |

## Requirement coverage summary

- Kinetic typography: 01 (title), 02 (count-ups), 09 (the ask).
- Animated system visualization: 04 (diagram flows), 05 (event chart).
- Cross-scene continuity: the Core (01→02→03→04→07→09) and the ghost load curve (02→07).
- Motion techniques (≥3 distinct): SVG path drawing (02, 04, 08, 09) · camera/perspective/parallax (01, 03) · canvas particle system (06) · coordinated choreography (03, 08) · data morphing (07).
- Distinctive scenes (≥2): 03 isometric 3D campus · 06 particle energy field (· 07 live dashboard).
- Simulator: 07 (2 sliders + toggle + presets, live chart + KPIs).
- Exploratory interaction: 03 zones, 04 nodes (+ 08 bars, 09 phases).
- Controlled comparison: 05 with/without GridNova, 06 day/night, 07 normal/heatwave.
