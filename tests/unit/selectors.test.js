import { describe, it, expect } from 'vitest';
import { createStore } from '../../src/core/store.js';
import { createSimSelector } from '../../src/core/selectors.js';
import { DEFAULT_SIM } from '../../src/model/constants.js';

describe('sim selector', () => {
  const make = () => {
    const store = createStore({ sim: { ...DEFAULT_SIM } });
    return { store, selectSim: createSimSelector(store) };
  };
  const update = (store, patch) => store.set({ sim: { ...store.get().sim, ...patch } });

  it('starts from the Balanced defaults', () => {
    const { selectSim } = make();
    const r = selectSim();
    expect(r.inputs).toEqual({ solarMw: 4, batteryMwh: 8, dayType: 'normal' });
    expect(r.capex).toBe(22_300_000);
  });

  it('returns the SAME object while the inputs are unchanged (memoised)', () => {
    const { store, selectSim } = make();
    const first = selectSim();
    expect(selectSim()).toBe(first);
    store.set({ paused: true });                       // unrelated state change
    update(store, { preset: 'custom' });               // label only, not a model input
    expect(selectSim()).toBe(first);
  });

  it('recomputes when a model input changes', () => {
    const { store, selectSim } = make();
    const first = selectSim();
    update(store, { solarMw: 6 });
    const second = selectSim();
    expect(second).not.toBe(first);
    expect(second.inputs.solarMw).toBe(6);
    update(store, { dayType: 'heatwave' });
    expect(selectSim().peakBeforeMw).toBeCloseTo(11, 9);
  });
});
