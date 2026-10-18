import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../../src/core/store.js';

describe('store', () => {
  it('merges patches and returns the new state', () => {
    const store = createStore({ a: 1, b: 2 });
    store.set({ b: 3 });
    expect(store.get()).toEqual({ a: 1, b: 3 });
  });

  it('does not share the initial object', () => {
    const initial = { sim: { solarMw: 4 } };
    const store = createStore(initial);
    initial.sim.solarMw = 99;
    expect(store.get().sim.solarMw).toBe(4);
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const store = createStore({ n: 0 });
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.set({ n: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ n: 1 });
    off();
    store.set({ n: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
