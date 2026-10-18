import {
  RANGES, LOAD_MW, HEATWAVE, SOLAR_SHAPE, BATTERY, ECON, SEARCH_ITERATIONS,
} from './constants.js';

// Pure functions only (no DOM). See docs/simulator-model.md for the full explanation of every step.

const HOURS = 24;
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Clamp inputs to their ranges. Anything that is not a finite number becomes the minimum. */
export function clampInputs({ solarMw, batteryMwh, dayType } = {}) {
  const fix = (value, { min, max }) => {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : min;
    return clamp(n, min, max);
  };
  return {
    solarMw: fix(solarMw, RANGES.solarMw),
    batteryMwh: fix(batteryMwh, RANGES.batteryMwh),
    dayType: dayType === 'heatwave' ? 'heatwave' : 'normal',
  };
}

function loadProfile(dayType) {
  if (dayType !== 'heatwave') return [...LOAD_MW];
  return LOAD_MW.map((mw, h) => {
    const hot = h >= HEATWAVE.hotFrom && h <= HEATWAVE.hotTo;
    return mw * (hot ? HEATWAVE.hotFactor : HEATWAVE.otherFactor);
  });
}

/**
 * Binary search for the smallest x in [lo, hi] where ok(x) is true, assuming ok() is monotone
 * (false below some threshold, true above it). Each step halves the interval; 60 steps is exact enough.
 */
function lowestTrue(lo, hi, ok) {
  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * One design day of dispatch for already-clamped inputs (docs/simulator-model.md §3).
 * Returns the hourly series, the shave target T and the load/solar totals.
 */
export function dispatch({ solarMw, batteryMwh, dayType }) {
  const load = loadProfile(dayType);
  const solar = SOLAR_SHAPE.map((shape) => solarMw * shape);
  const net = load.map((l, h) => Math.max(l - solar[h], 0));
  const surplus = load.map((l, h) => Math.max(solar[h] - l, 0));   // no export credit
  const maxNet = Math.max(...net);

  const power = Math.min(batteryMwh / BATTERY.durationH, BATTERY.maxPowerMw);   // max charge/discharge MW
  const usable = BATTERY.usableFraction * batteryMwh;                            // MWh the battery may deliver
  const above = (T) => net.map((n) => Math.max(n - T, 0));                       // what the battery must supply
  const valley = (T) => net.map((n) => Math.min(Math.max(T - n, 0), power));     // room to recharge under T

  // Shave target T = the lowest grid-import level the battery can hold ALL day.
  // T is feasible when the battery has enough energy and power to cut everything above it,
  // AND the valleys below T are deep enough to recharge it without creating a new peak.
  // Feasibility only gets easier as T rises, so we can binary-search for the lowest feasible T.
  const feasible = (T) => {
    const discharge = above(T);
    const dischargeMwh = sum(discharge);
    if (dischargeMwh > usable) return false;                       // not enough energy
    if (maxNet - T > power) return false;                          // not enough power
    const rechargeNeeded = Math.max(dischargeMwh / BATTERY.roundTrip - sum(surplus), 0);
    return sum(valley(T)) >= rechargeNeeded;                       // can refill under the target
  };
  const T = batteryMwh === 0 ? maxNet : lowestTrue(0, maxNet, feasible);

  const discharge = above(T);

  // Recharge: solar surplus first, the rest from the grid by valley filling. Find the level L (<= T)
  // such that charging every hour that sits below L, up to L, adds exactly the energy still needed.
  const rest = Math.max(sum(discharge) / BATTERY.roundTrip - sum(surplus), 0);
  const chargeAt = (L) => net.map((n) => Math.min(Math.max(L - n, 0), power));
  const L = rest > 0 ? lowestTrue(0, T, (level) => sum(chargeAt(level)) >= rest) : 0;
  const gridCharge = rest > 0 ? chargeAt(L) : net.map(() => 0);

  const grid = net.map((n, h) => n - discharge[h] + gridCharge[h]);
  return { load, solar, net, discharge, gridCharge, grid, T, L };
}

/** Annual economics. Always fed the NORMAL-day dispatch: a heatwave is a stress view, not the annual average. */
export function economics({ solarMw, batteryMwh }, normal) {
  const peakReductionMw = Math.max(...normal.load) - Math.max(...normal.grid);
  const solarUsedDayMwh = sum(normal.solar.map((s, h) => Math.min(s, normal.load[h])));

  const annualSolarMwh = solarUsedDayMwh * ECON.annualSolarFactor;
  const energyValue = annualSolarMwh * ECON.tariffAedPerMwh;
  const demandValue = peakReductionMw * ECON.demandChargeAedPerMwMonth * 12;
  const platform = solarMw > 0 || batteryMwh > 0 ? ECON.platformCapexAed : 0;
  const capex = solarMw * ECON.solarCapexAedPerMw + batteryMwh * ECON.batteryCapexAedPerMwh + platform;
  const om = ECON.omFraction * capex;
  const netAnnualValue = energyValue + demandValue - om;
  const paybackYears = capex === 0 || netAnnualValue <= 0 ? null : capex / netAnnualValue;
  const resilienceHours = (BATTERY.usableFraction * batteryMwh) / ECON.criticalLoadMw;

  const cashflow = [-capex];
  for (let year = 1; year <= ECON.cashflowYears; year++) cashflow.push(cashflow[year - 1] + netAnnualValue);

  return { annualSolarMwh, energyValue, demandValue, capex, om, netAnnualValue, paybackYears, resilienceHours, cashflow };
}

/** The whole model: raw inputs in, everything the scenes display out. */
export function simulate(rawInputs) {
  const inputs = clampInputs(rawInputs);
  const shown = dispatch(inputs);                                  // the day on screen (normal or heatwave)
  const normal = inputs.dayType === 'normal' ? shown : dispatch({ ...inputs, dayType: 'normal' });

  const peakBeforeMw = Math.max(...shown.load);
  const peakAfterMw = Math.max(...shown.grid);
  const solarUsedDayMwh = sum(shown.solar.map((s, h) => Math.min(s, shown.load[h])));

  return {
    inputs,
    target: shown.T,
    series: {
      load: shown.load, solar: shown.solar, discharge: shown.discharge,
      gridCharge: shown.gridCharge, grid: shown.grid,
    },
    peakBeforeMw,
    peakAfterMw,
    peakReductionMw: peakBeforeMw - peakAfterMw,
    peakReductionPct: ((peakBeforeMw - peakAfterMw) / peakBeforeMw) * 100,   // percent, 0-100
    solarUsedDayMwh,
    renewableShare: solarUsedDayMwh / sum(shown.load),                       // fraction, 0-1
    ...economics(inputs, normal),
  };
}
