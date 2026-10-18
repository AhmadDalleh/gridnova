import { describe, it, expect } from 'vitest';
import { fmtAed, fmtYears, fmtMw, fmtHours, glowFromReduction, GLOW_MIN, GLOW_MAX } from '../../src/ui/format.js';
import { lerp, lerpShape } from '../../src/ui/lerp.js';
import { matchPreset } from '../../src/model/presets.js';
import { loadSim, persistSim } from '../../src/core/persist.js';
import { createStore } from '../../src/core/store.js';
import { DEFAULT_SIM } from '../../src/model/constants.js';

describe('format', () => {
  it('formats AED, MW, hours and payback', () => {
    expect(fmtAed(22_300_000)).toBe('AED 22.30 M');
    expect(fmtAed(925_500)).toBe('AED 926 k');
    expect(fmtAed(0)).toBe('AED 0');
    expect(fmtMw(6.5657)).toBe('6.57 MW');
    expect(fmtHours(2.88)).toBe('2.9 h');
    expect(fmtYears(6.11)).toBe('6.1 yrs');
    expect(fmtYears(null)).toBe('n/a');
  });

  it('maps peak reduction 0-60 % onto the glow range and clamps outside it', () => {
    expect(glowFromReduction(0)).toBe(GLOW_MIN);
    expect(glowFromReduction(60)).toBe(GLOW_MAX);
    expect(glowFromReduction(30)).toBeCloseTo((GLOW_MIN + GLOW_MAX) / 2, 9);
    expect(glowFromReduction(-5)).toBe(GLOW_MIN);
    expect(glowFromReduction(80)).toBe(GLOW_MAX);
  });
});

describe('lerp', () => {
  it('interpolates numbers and whole shapes', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    const a = { xs: [0, 10], peak: 4 };
    const b = { xs: [10, 20], peak: 8 };
    expect(lerpShape(a, b, 0)).toEqual(a);
    expect(lerpShape(a, b, 1)).toEqual(b);
    expect(lerpShape(a, b, 0.5)).toEqual({ xs: [5, 15], peak: 6 });
  });
});

describe('matchPreset', () => {
  it('names a preset by its sizes, otherwise custom', () => {
    expect(matchPreset(0, 0)).toBe('baseline');
    expect(matchPreset(4, 8)).toBe('balanced');
    expect(matchPreset(6, 16)).toBe('resilience');
    expect(matchPreset(4.5, 8)).toBe('custom');
  });
});

describe('persistence', () => {
  const fakeStorage = () => {
    const data = new Map();
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), data };
  };

  it('saves sim changes and restores them (with a recomputed preset label)', () => {
    const storage = fakeStorage();
    const store = createStore({ paused: false, sim: { ...DEFAULT_SIM } });
    persistSim(store, storage);
    store.set({ paused: true });                          // unrelated: nothing saved
    expect(storage.data.size).toBe(0);
    store.set({ sim: { ...store.get().sim, solarMw: 6, batteryMwh: 16, dayType: 'heatwave', preset: 'resilience' } });
    expect(loadSim(DEFAULT_SIM, storage)).toEqual({ solarMw: 6, batteryMwh: 16, dayType: 'heatwave', preset: 'resilience' });
  });

  it('falls back to defaults for empty, corrupt or out-of-range storage, and when storage throws', () => {
    expect(loadSim(DEFAULT_SIM, fakeStorage())).toEqual(DEFAULT_SIM);
    const bad = fakeStorage();
    bad.setItem('gridnova.sim', '{not json');
    expect(loadSim(DEFAULT_SIM, bad)).toEqual(DEFAULT_SIM);
    const wild = fakeStorage();
    wild.setItem('gridnova.sim', JSON.stringify({ solarMw: 99, batteryMwh: 'x', dayType: 'blizzard' }));
    expect(loadSim(DEFAULT_SIM, wild)).toMatchObject({ solarMw: 10, batteryMwh: 0, dayType: 'normal', preset: 'custom' });
    const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    expect(loadSim(DEFAULT_SIM, throwing)).toEqual(DEFAULT_SIM);
    const store = createStore({ sim: { ...DEFAULT_SIM } });
    persistSim(store, throwing);
    expect(() => store.set({ sim: { ...DEFAULT_SIM, solarMw: 2 } })).not.toThrow();
  });
});
