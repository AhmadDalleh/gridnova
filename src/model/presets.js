import { PRESETS } from './constants.js';

/** Name of the preset whose sizes equal these inputs, or 'custom'. Used by sliders, persistence and tests. */
export function matchPreset(solarMw, batteryMwh) {
  const hit = Object.entries(PRESETS).find(([, p]) => p.solarMw === solarMw && p.batteryMwh === batteryMwh);
  return hit ? hit[0] : 'custom';
}
