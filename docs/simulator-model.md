# GridNova Simulator Model (illustrative)

> A **simplified, explainable demonstration model**, not an engineering design, forecast or quote. Every constant is a fictional assumption and must be shown in the simulator's assumptions drawer.
> Implemented as **pure functions** in `src/model/` (no DOM). Unit-tested against the reference values in §6.

## 1. Inputs

| Input | Range | Step | Default (Balanced) |
|---|---|---|---|
| `solarMw` — solar PV capacity | 0–10 MW | 0.5 | 4 |
| `batteryMwh` — battery energy capacity | 0–24 MWh | 1 | 8 |
| `dayType` | `'normal'` \| `'heatwave'` | — | `'normal'` |

Presets: **Baseline** (0, 0) · **Balanced** (4, 8) · **Resilience** (6, 16). Inputs are clamped to their ranges; non-numbers become the minimum.

## 2. Constants (all illustrative)

| Name | Value | Meaning |
|---|---|---|
| `LOAD_MW[24]` | `[4.2,4.0,3.9,3.9,4.0,4.4,5.2,6.3,7.4,8.2,8.8,9.2,9.5,9.7,9.9,10.0,9.8,9.3,8.6,7.6,6.6,5.7,5.0,4.5]` | campus load per hour 00:00–23:00, normal day, peak 10 MW at 15:00 |
| Heatwave factor | ×1.10 for hours 10–19, ×1.03 otherwise | heatwave day load |
| `SOLAR_SHAPE[24]` | 0 except h6 .05, h7 .15, h8 .32, h9 .50, h10 .66, h11 .78, h12 .83, h13 .82, h14 .75, h15 .62, h16 .45, h17 .26, h18 .08 | fraction of capacity, clear day |
| Battery duration | 2 h → power `P = min(batteryMwh / 2, 6)` MW | max charge/discharge power |
| Usable energy | `0.9 × batteryMwh` | depth-of-discharge limit |
| Round-trip efficiency | 0.9 (applied when recharging) | |
| Annual solar factor | `365 × 0.85` | days × weather/availability factor |
| Energy tariff | AED 300 / MWh | value of grid energy avoided |
| Demand charge | AED 40,000 per MW per month | billed on monthly peak grid import |
| Solar capex | AED 3.0M per MW | |
| Battery capex | AED 1.1M per MWh | |
| Platform capex | AED 1.5M fixed (only if solar > 0 or battery > 0) | GridNova controls, metering, integration |
| O&M | 1.5 % of capex per year | |
| Critical load | 2.5 MW | for resilience hours |

## 3. Hourly dispatch (one design day)

For each hour `h` (0–23):
1. `load[h]` = `LOAD_MW[h]` (× heatwave factor if heatwave).
2. `solar[h]` = `solarMw × SOLAR_SHAPE[h]`.
3. `net[h]` = `max(load[h] − solar[h], 0)`; `surplus[h]` = `max(solar[h] − load[h], 0)` (no export credit).
4. **Shave target `T`** — the lowest grid import level the battery can hold for the whole day, found by **binary search** on `[0, max(net)]` (60 iterations). `T` is feasible when:
   - energy above `T`: `Σ max(net[h] − T, 0) ≤ usable`, and
   - power above `T`: `max(net) − T ≤ P`, and
   - the battery can be **recharged without exceeding `T`**: valley capacity `Σ min(max(T − net[h], 0), P) ≥ max(Σdischarge / 0.9 − Σsurplus, 0)`.
   If `batteryMwh = 0`, `T = max(net)`.
5. `discharge[h]` = `max(net[h] − T, 0)`.
6. **Recharge**: needed = `Σdischarge / 0.9`. Solar surplus covers first; the rest is charged from the grid by **valley filling**: find level `L ≤ T` (binary search) so that `Σ min(max(L − net[h], 0), P) = rest`; `gridCharge[h] = min(max(L − net[h], 0), P)`.
7. `grid[h]` = `net[h] − discharge[h] + gridCharge[h]`.

Why this design (explainable in the interview): peak shaving sets the demand charge; the battery must end the day as full as it started (cyclic), and recharging must never create a *new* peak — so charging happens in the valleys under the same target.

## 4. Outputs

| Output | Formula |
|---|---|
| `peakBeforeMw` | `max(load)` |
| `peakAfterMw` | `max(grid)` |
| `peakReductionMw` / `%` | `peakBefore − peakAfter`; ÷ `peakBefore` |
| `solarUsedDayMwh` | `Σ min(solar[h], load[h])` |
| `renewableShare` | `solarUsedDayMwh / Σ load` |
| `annualSolarMwh` | `solarUsedDayMwh × 365 × 0.85` |
| `energyValue` | `annualSolarMwh × 300` |
| `demandValue` | `peakReductionMw × 40,000 × 12` |
| `capex` | `solarMw × 3.0M + batteryMwh × 1.1M + platform` |
| `om` | `0.015 × capex` |
| `netAnnualValue` | `energyValue + demandValue − om` |
| `paybackYears` | `capex / netAnnualValue`; **`null`** if capex = 0 or net ≤ 0 (show "n/a") |
| `resilienceHours` | `0.9 × batteryMwh / 2.5` |
| `cashflow[0..10]` | year 0: `−capex`; year n: previous + `netAnnualValue` |
| hourly series | `load, solar, discharge, gridCharge, grid` (for the chart) |

**Economics always use the normal day** (a heatwave is a stress view, not the annual average). The heatwave toggle changes the chart and the peak KPIs only; the business case labels this.

## 5. Explicit exclusions (show on screen)
Battery degradation, round-trip losses in the annual value, export revenue, financing, incentives, taxes, inflation, residual value, demand-response revenue, chiller/EV flexibility (scene 05 narrative only).

## 6. Reference values (unit tests must match, tolerance ±0.02 for MW/years, ±1 % for AED)

| Case | peakAfter MW | reduction % | annualSolar MWh | energyValue | demandValue | capex | net/yr | payback y | resilience h |
|---|---|---|---|---|---|---|---|---|---|
| (0, 0) Baseline | 10.00 | 0.0 | 0 | 0 | 0 | 0 | 0 | null | 0 |
| (4, 8) Balanced | 6.57 | 34.3 | 7,781 | 2,334,321 | 1,648,457 | 22,300,000 | 3,648,278 | 6.11 | 2.88 |
| (6, 16) Resilience | 5.39 | 46.1 | 11,672 | 3,501,482 | 2,212,800 | 37,100,000 | 5,157,782 | 7.19 | 5.76 |
| (10, 24) max | 4.36 | 56.4 | 19,453 | 5,835,802 | 2,706,396 | 57,900,000 | 7,673,699 | 7.55 | 8.64 |
| (10, 0) solar only | 7.80 | 22.0 | 19,453 | 5,835,802 | 1,056,000 | 31,500,000 | 6,419,302 | 4.91 | 0 |
| (0, 24) battery only | 7.20 | 28.0 | 0 | 0 | 1,344,000 | 27,900,000 | 925,500 | 30.15 | 8.64 |
| (4, 8) heatwave | peakBefore 11.00 → peakAfter 7.48 | | | | | | | | |

Talking points these numbers support: solar alone moves the peak to the evening (7.8 MW at 18–19h) — that is why storage matters; battery alone has a poor payback; Balanced gives the best payback with a meaningful peak cut.

Additional tests: clamping (−5 → 0, 99 → max, "abc" → 0); every output finite; `grid[h] ≥ 0`; `max(grid) ≤ T + 1e-6`; energy balance `Σ grid = Σ net − Σ discharge + Σ gridCharge`.
