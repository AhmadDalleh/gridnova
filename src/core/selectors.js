import { simulate } from '../model/simulate.js';

// Memoised derived state: simulator results are computed from store.sim, never stored.
// Only the three model inputs form the cache key, so changing the preset label (UI only) never recomputes.
export function createSimSelector(store) {
  let key = null;
  let result = null;
  return function selectSim() {
    const { solarMw, batteryMwh, dayType } = store.get().sim;
    const next = `${solarMw}|${batteryMwh}|${dayType}`;
    if (next !== key) {
      result = simulate({ solarMw, batteryMwh, dayType });
      key = next;
    }
    return result;
  };
}
