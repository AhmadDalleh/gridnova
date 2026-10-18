// Every illustrative assumption of the GridNova simulator (docs/simulator-model.md §1-§2).
// All values are FICTIONAL; the assumptions drawer (scene 07) lists straight from this file.

// ---- Inputs ------------------------------------------------------------------------------------
export const RANGES = {
  solarMw: { min: 0, max: 10, step: 0.5 },
  batteryMwh: { min: 0, max: 24, step: 1 },
};

export const PRESETS = {
  baseline: { solarMw: 0, batteryMwh: 0 },
  balanced: { solarMw: 4, batteryMwh: 8 },
  resilience: { solarMw: 6, batteryMwh: 16 },
};

// Initial simulator state held in the store (Balanced, normal day). `preset` is a UI label only.
export const DEFAULT_SIM = { solarMw: 4, batteryMwh: 8, dayType: 'normal', preset: 'balanced' };

// ---- Campus load and solar (24 hourly values, 00:00-23:00) --------------------------------------
// Normal-day campus load in MW; peak 10 MW at 15:00.
export const LOAD_MW = [
  4.2, 4.0, 3.9, 3.9, 4.0, 4.4, 5.2, 6.3, 7.4, 8.2, 8.8, 9.2,
  9.5, 9.7, 9.9, 10.0, 9.8, 9.3, 8.6, 7.6, 6.6, 5.7, 5.0, 4.5,
];

// Heatwave day: +10 % during the hot hours 10-19, +3 % otherwise.
export const HEATWAVE = { hotFactor: 1.1, otherFactor: 1.03, hotFrom: 10, hotTo: 19 };

// Fraction of installed solar capacity produced each hour on a clear day.
export const SOLAR_SHAPE = [
  0, 0, 0, 0, 0, 0, 0.05, 0.15, 0.32, 0.5, 0.66, 0.78,
  0.83, 0.82, 0.75, 0.62, 0.45, 0.26, 0.08, 0, 0, 0, 0, 0,
];

// ---- Battery --------------------------------------------------------------------------------------
export const BATTERY = {
  durationH: 2,          // power = energy / 2 h ...
  maxPowerMw: 6,         // ... capped at 6 MW
  usableFraction: 0.9,   // depth-of-discharge limit
  roundTrip: 0.9,        // applied when recharging
};

// ---- Economics ------------------------------------------------------------------------------------
export const ECON = {
  annualSolarFactor: 365 * 0.85,   // days x weather/availability factor
  tariffAedPerMwh: 300,            // value of grid energy avoided
  demandChargeAedPerMwMonth: 40_000,
  solarCapexAedPerMw: 3_000_000,
  batteryCapexAedPerMwh: 1_100_000,
  platformCapexAed: 1_500_000,     // only if solar > 0 or battery > 0
  omFraction: 0.015,               // per year, of capex
  criticalLoadMw: 2.5,             // for resilience hours
  cashflowYears: 10,
};

export const SEARCH_ITERATIONS = 60;   // binary-search steps; 2^-60 of the range is far below any display precision
