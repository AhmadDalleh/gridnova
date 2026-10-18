import { describe, it, expect } from 'vitest';
import { simulate, clampInputs, dispatch } from '../../src/model/simulate.js';
import { DEFAULT_SIM, PRESETS, RANGES } from '../../src/model/constants.js';

const sum = (a) => a.reduce((x, y) => x + y, 0);

// docs/simulator-model.md §6. Tolerances: MW / years ±0.02, AED ±1 %, zeros exact.
// The table rounds percent to 0.1 and hours to 0.01, so those use ±0.05 and ±0.01.
const REFERENCE = [
  { name: 'Baseline', s: 0, b: 0, peakAfter: 10.0, pct: 0.0, solar: 0, energy: 0, demand: 0, capex: 0, net: 0, payback: null, hours: 0 },
  { name: 'Balanced', s: 4, b: 8, peakAfter: 6.57, pct: 34.3, solar: 7781, energy: 2334321, demand: 1648457, capex: 22300000, net: 3648278, payback: 6.11, hours: 2.88 },
  { name: 'Resilience', s: 6, b: 16, peakAfter: 5.39, pct: 46.1, solar: 11672, energy: 3501482, demand: 2212800, capex: 37100000, net: 5157782, payback: 7.19, hours: 5.76 },
  { name: 'Max', s: 10, b: 24, peakAfter: 4.36, pct: 56.4, solar: 19453, energy: 5835802, demand: 2706396, capex: 57900000, net: 7673699, payback: 7.55, hours: 8.64 },
  { name: 'Solar only', s: 10, b: 0, peakAfter: 7.8, pct: 22.0, solar: 19453, energy: 5835802, demand: 1056000, capex: 31500000, net: 6419302, payback: 4.91, hours: 0 },
  { name: 'Battery only', s: 0, b: 24, peakAfter: 7.2, pct: 28.0, solar: 0, energy: 0, demand: 1344000, capex: 27900000, net: 925500, payback: 30.15, hours: 8.64 },
];

// ±1 % relative, exact when the expected value is 0
function expectAed(actual, expected) {
  if (expected === 0) expect(actual).toBe(0);
  else expect(Math.abs(actual - expected) / expected).toBeLessThanOrEqual(0.01);
}

describe('reference values (§6)', () => {
  for (const row of REFERENCE) {
    it(`${row.name} (${row.s} MW, ${row.b} MWh)`, () => {
      const r = simulate({ solarMw: row.s, batteryMwh: row.b });
      expect(Math.abs(r.peakAfterMw - row.peakAfter)).toBeLessThanOrEqual(0.02);
      expect(Math.abs(r.peakReductionPct - row.pct)).toBeLessThanOrEqual(0.05);
      expectAed(r.annualSolarMwh, row.solar);
      expectAed(r.energyValue, row.energy);
      expectAed(r.demandValue, row.demand);
      expectAed(r.capex, row.capex);
      expectAed(r.netAnnualValue, row.net);
      if (row.payback === null) expect(r.paybackYears).toBeNull();
      else expect(Math.abs(r.paybackYears - row.payback)).toBeLessThanOrEqual(0.02);
      expect(Math.abs(r.resilienceHours - row.hours)).toBeLessThanOrEqual(0.01);
    });
  }

  it('Balanced on a heatwave day: peak 11.00 -> 7.48 MW', () => {
    const r = simulate({ solarMw: 4, batteryMwh: 8, dayType: 'heatwave' });
    expect(Math.abs(r.peakBeforeMw - 11.0)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(r.peakAfterMw - 7.48)).toBeLessThanOrEqual(0.02);
  });

  it('presets and defaults agree with the table', () => {
    expect(PRESETS.balanced).toEqual({ solarMw: 4, batteryMwh: 8 });
    expect(DEFAULT_SIM).toEqual({ solarMw: 4, batteryMwh: 8, dayType: 'normal', preset: 'balanced' });
  });
});

describe('heatwave is a stress view: economics stay on the normal day', () => {
  it('capex, value and payback do not change; peaks do', () => {
    const normal = simulate({ solarMw: 4, batteryMwh: 8, dayType: 'normal' });
    const hot = simulate({ solarMw: 4, batteryMwh: 8, dayType: 'heatwave' });
    for (const k of ['capex', 'om', 'energyValue', 'demandValue', 'netAnnualValue', 'paybackYears', 'annualSolarMwh', 'resilienceHours']) {
      expect(hot[k]).toBe(normal[k]);
    }
    expect(hot.cashflow).toEqual(normal.cashflow);
    expect(hot.peakAfterMw).toBeGreaterThan(normal.peakAfterMw);
  });
});

describe('clamping', () => {
  it('clamps to range and turns non-numbers into the minimum', () => {
    expect(clampInputs({ solarMw: -5, batteryMwh: 99 })).toMatchObject({ solarMw: 0, batteryMwh: RANGES.batteryMwh.max });
    expect(clampInputs({ solarMw: 99, batteryMwh: -1 })).toMatchObject({ solarMw: RANGES.solarMw.max, batteryMwh: 0 });
    expect(clampInputs({ solarMw: 'abc', batteryMwh: NaN })).toMatchObject({ solarMw: 0, batteryMwh: 0 });
    expect(clampInputs({ solarMw: Infinity, batteryMwh: undefined })).toMatchObject({ solarMw: 0, batteryMwh: 0 });
    expect(clampInputs({ dayType: 'blizzard' }).dayType).toBe('normal');
    expect(clampInputs().solarMw).toBe(0);
  });

  it('simulate() clamps before computing', () => {
    expect(simulate({ solarMw: 99, batteryMwh: 99 }).capex).toBe(simulate({ solarMw: 10, batteryMwh: 24 }).capex);
    expect(simulate({ solarMw: 'abc', batteryMwh: 'x' }).peakAfterMw).toBe(10);
  });
});

describe('payback null rules', () => {
  it('is null when capex is 0 (nothing built)', () => {
    expect(simulate({ solarMw: 0, batteryMwh: 0 }).paybackYears).toBeNull();
  });
  it('platform capex applies as soon as anything is built', () => {
    expect(simulate({ solarMw: 0.5, batteryMwh: 0 }).capex).toBe(0.5 * 3_000_000 + 1_500_000);
  });
});

describe('cashflow', () => {
  it('starts at -capex and adds net annual value each year for 10 years', () => {
    const r = simulate({ solarMw: 4, batteryMwh: 8 });
    expect(r.cashflow).toHaveLength(11);
    expect(r.cashflow[0]).toBe(-r.capex);
    expect(r.cashflow[10]).toBeCloseTo(-r.capex + 10 * r.netAnnualValue, 3);
  });
});

// Invariants over every slider position (steps from §1) and both day types.
describe('invariants over the whole input grid', () => {
  const cases = [];
  for (let s = 0; s <= 10; s += 0.5) {
    for (let b = 0; b <= 24; b += 1) {
      for (const dayType of ['normal', 'heatwave']) cases.push({ solarMw: s, batteryMwh: b, dayType });
    }
  }

  it('every output is finite (payback may be null)', () => {
    for (const c of cases) {
      const r = simulate(c);
      const numbers = [r.target, r.peakBeforeMw, r.peakAfterMw, r.peakReductionMw, r.peakReductionPct, r.solarUsedDayMwh,
        r.renewableShare, r.annualSolarMwh, r.energyValue, r.demandValue, r.capex, r.om, r.netAnnualValue, r.resilienceHours,
        ...r.cashflow, ...Object.values(r.series).flat()];
      numbers.forEach((n) => expect(Number.isFinite(n), JSON.stringify(c)).toBe(true));
      expect(r.paybackYears === null || Number.isFinite(r.paybackYears)).toBe(true);
    }
  });

  it('grid[h] >= 0 and max(grid) <= T + 1e-6', () => {
    for (const c of cases) {
      const r = simulate(c);
      r.series.grid.forEach((g) => expect(g, JSON.stringify(c)).toBeGreaterThanOrEqual(0));
      expect(Math.max(...r.series.grid), JSON.stringify(c)).toBeLessThanOrEqual(r.target + 1e-6);
    }
  });

  it('energy balance: sum(grid) = sum(net) - sum(discharge) + sum(gridCharge)', () => {
    for (const c of cases) {
      const d = dispatch(clampInputs(c));
      expect(sum(d.grid)).toBeCloseTo(sum(d.net) - sum(d.discharge) + sum(d.gridCharge), 9);
    }
  });

  it('the battery ends the day as full as it started (recharge covers discharge / 0.9)', () => {
    for (const c of cases) {
      const d = dispatch(clampInputs(c));
      const surplus = d.solar.reduce((a, s, h) => a + Math.max(s - d.load[h], 0), 0);
      const recharged = sum(d.gridCharge) + surplus;
      expect(recharged, JSON.stringify(c)).toBeGreaterThanOrEqual(sum(d.discharge) / 0.9 - 1e-6);
    }
  });

  it('guard: valley-fill level L never exceeds T, and charge/discharge respect battery power', () => {
    for (const c of cases) {
      const clean = clampInputs(c);
      const d = dispatch(clean);
      const power = Math.min(clean.batteryMwh / 2, 6);
      expect(d.L).toBeLessThanOrEqual(d.T + 1e-9);
      d.discharge.forEach((x) => expect(x).toBeLessThanOrEqual(power + 1e-6));
      d.gridCharge.forEach((x) => expect(x).toBeLessThanOrEqual(power + 1e-6));
      expect(sum(d.discharge)).toBeLessThanOrEqual(0.9 * clean.batteryMwh + 1e-6);
    }
  });

  it('more equipment never raises the peak', () => {
    for (let b = 1; b <= 24; b++) {
      expect(simulate({ solarMw: 4, batteryMwh: b }).peakAfterMw).toBeLessThanOrEqual(simulate({ solarMw: 4, batteryMwh: b - 1 }).peakAfterMw + 1e-9);
    }
  });
});
