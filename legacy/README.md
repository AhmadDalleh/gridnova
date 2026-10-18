# GridNova — interactive executive proposal

GridNova is a fictional microgrid proposal built as a nine-scene, offline-first HTML presentation. All site, operating, financial, schedule and effort values are illustrative assumptions. The simulator is a simplified demonstration model, not an engineering design, forecast, quote or investment recommendation.

## Open and present

1. Extract `GridNova_Final_Submission.zip` to a local folder.
2. Open the extracted root `index.html` in a current Chrome or Edge browser. No server, installation or internet connection is required.
3. Navigate with the on-screen arrows or keyboard `←` / `→`. Use `Home` and `End` to jump to the opening and closing scene. Select a progress dot to jump directly to a scene.
4. On the system scene, select Solar, Battery, GridNova, Demand or Grid for component details. On the peak-event scene, select each stage. On the simulator scene, adjust solar and battery capacity or select Baseline, Balanced and Resilience.
5. Use Pause to stop looping animation, Motion to reduce it, and Present for browser fullscreen. `Escape` exits fullscreen. Select “Replay the story” on the final scene to return to the opening.

## Editable source

- `index.html` — scene content and semantic controls.
- `styles.css` — visual system, responsive layouts, transitions and motion preferences.
- `app.js` — navigation, interaction state, simulator calculations and rendering.
- `REQUIREMENTS_TRACEABILITY.md` — assignment-to-implementation map.
- `WORK_LOG.md` — phases, checks, results and limitations.
- `AI_DEVELOPMENT_LOG.md` — actual implementation iterations and verification notes.

## Simulator model

The calculator is in `app.js` (`calculate`). Inputs are solar capacity from 0 to 10 MW in 0.5 MW steps and battery energy from 0 to 24 MWh in 1 MWh steps. The demonstration assumes a 10 MW site peak, solar capacity factor of 18%, 78% of solar production treated as energy offset, battery discharge up to 4 MW over a four-hour nominal discharge, 250 peak days/year, and $120/MWh energy. It excludes demand charges, round-trip losses, degradation, operating and maintenance costs, incentives, taxes, financing, and residual value.

Peak grid reliance is `100 × (10 − solar peak contribution − battery peak contribution) ÷ 10`. Solar peak contribution is `min(4 MW, solar MW × 0.75)`. Battery peak contribution is `min(4 MW, battery MWh ÷ 4)`. Avoided annual energy is the simplified solar energy proxy plus `battery peak MW × 3 hours × 250 days`, bounded to the notional site's 30,000 MWh annual energy proxy. Indicative annual value is avoided energy × $120/MWh. Installed cost is solar MW × $850,000/MW plus battery MWh × $300,000/MWh. Simple payback is installed cost divided by indicative annual value; when value is zero, payback is displayed as unavailable.

These figures demonstrate how inputs feed visible outputs. They are fictional assumptions, not a validated microgrid model.

## Verification status

Node syntax, HTML/ID integrity, simulator boundary behavior and offline dependency source scans were run. A direct `file://` Chrome/Edge presentation run and viewport screenshots were not run: the available browser tool rejected the local-file protocol and prohibits alternate ways to open that URL. See `WORK_LOG.md` for exact evidence and remaining manual checks.
