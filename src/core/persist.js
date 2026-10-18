import { clampInputs } from '../model/simulate.js';
import { matchPreset } from '../model/presets.js';

// Optional: keep the simulator inputs for the browser session (survives refresh / hash resume).
// Everything is in try/catch: storage can be blocked on file:// or in private windows, and is never required.
const KEY = 'gridnova.sim';

function sessionStore() {
  try { return window.sessionStorage; } catch { return null; }
}

export function loadSim(defaults, storage = sessionStore()) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { ...defaults };
    const inputs = clampInputs(JSON.parse(raw));          // never trust stored values: clamp like user input
    return { ...inputs, preset: matchPreset(inputs.solarMw, inputs.batteryMwh) };
  } catch {
    return { ...defaults };
  }
}

/** Save `store.sim` whenever it changes. Returns the unsubscribe function. */
export function persistSim(store, storage = sessionStore()) {
  let last = store.get().sim;
  return store.subscribe((state) => {
    if (state.sim === last) return;
    last = state.sim;
    try {
      const { solarMw, batteryMwh, dayType } = state.sim;
      storage?.setItem(KEY, JSON.stringify({ solarMw, batteryMwh, dayType }));
    } catch {
      // storage unavailable: carry on without persistence
    }
  });
}
