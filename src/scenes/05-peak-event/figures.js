import { simulate } from '../../model/simulate.js';
import { ECON, BATTERY } from '../../model/constants.js';
import { LINKS, NODES } from '../04-system/data.js';
import { fmtAed } from '../../ui/format.js';

// Scene 05 logic, all pure (no DOM) so it can be unit-tested. Every number comes from two model runs:
//   with    = simulate({ solarMw: 4, batteryMwh: 8, dayType: 'heatwave' })   the Balanced design on the hot afternoon
//   without = simulate({ solarMw: 0, batteryMwh: 0, dayType: 'heatwave' })   the same afternoon with nothing installed
export const EVENT_SIZING = { solarMw: 4, batteryMwh: 8 };
export const STAGE_COUNT = 5;
export const DETECT_HOUR = 13 + 42 / 60;                 // 13:42, the moment the story starts (narrative, labelled on screen)
export const CHART_HOURS = { from: 8, to: 22 };          // the afternoon window shown on the chart
const lerp = (a, b, k) => a + (b - a) * k;
const argmax = (xs) => xs.indexOf(Math.max(...xs));

export function eventFigures() {
  const withG = simulate({ ...EVENT_SIZING, dayType: 'heatwave' });
  const without = simulate({ solarMw: 0, batteryMwh: 0, dayType: 'heatwave' });
  const peakHour = argmax(without.series.load);
  const reductionMw = without.peakAfterMw - withG.peakAfterMw;
  return {
    with: withG,
    without,
    peakHour,
    heldHour: argmax(withG.series.grid),
    loadAtDetect: lerp(without.series.load[13], without.series.load[14], (DETECT_HOUR - 13)),
    peakWithoutMw: without.peakAfterMw,
    peakWithMw: withG.peakAfterMw,
    reductionPct: (reductionMw / without.peakAfterMw) * 100,
    dispatchMw: Math.max(...withG.series.discharge),
    batteryPowerMw: Math.min(EVENT_SIZING.batteryMwh / BATTERY.durationH, BATTERY.maxPowerMw),
    avoidedAed: reductionMw * ECON.demandChargeAedPerMwMonth,           // monthly demand charge avoided
    withoutChargeAed: without.peakAfterMw * ECON.demandChargeAedPerMwMonth,
  };
}

export const hhmm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60 + 1e-6)).padStart(2, '0')}`;

export const STAGES = [
  { n: 1, name: 'Detect' },
  { n: 2, name: 'Forecast' },
  { n: 3, name: 'Dispatch' },
  { n: 4, name: 'Shift' },
  { n: 5, name: 'Stabilize' },
];

/** The one-line detail under each stage button. Stages 3-5 differ between the two modes. */
export function stageDetail(stage, mode, f) {
  const withG = mode === 'with';
  switch (stage) {
    case 1: return `${hhmm(DETECT_HOUR)} · load climbing, ${f.loadAtDetect.toFixed(1)} MW`;
    case 2: return `Heatwave peak ≈ ${f.peakWithoutMw.toFixed(1)} MW at ${hhmm(f.peakHour)}`;
    case 3: return withG ? `Battery discharges up to ${f.batteryPowerMw.toFixed(1)} MW` : 'No battery: nothing to dispatch';
    case 4: return withG ? 'EV charging and cooling move (narrative)' : 'Loads stay put (narrative)';
    default: return withG ? `Grid import held at ${f.peakWithMw.toFixed(1)} MW` : `Grid import hits ${f.peakWithoutMw.toFixed(1)} MW`;
  }
}

/** What the chart shows at a stage: how far the day has been drawn, and which layers are on (0 or 1, tweened by the chart). */
export function stageView(stage, mode) {
  const withG = mode === 'with';
  return {
    cursor: [DETECT_HOUR, DETECT_HOUR, 16, 17, CHART_HOURS.to][stage - 1],
    forecast: stage === 2 ? 1 : 0,                      // dashed forecast of the rest of the afternoon
    peakLabel: stage >= 2 ? 1 : 0,                      // the 11.0 MW marker
    grid: withG && stage >= 3 ? 1 : 0,                  // GridNova's grid-import line and the band it removes
    heldLabel: withG && stage >= 5 ? 1 : 0,             // the held peak
    alarm: !withG && stage >= 3 ? 1 : 0,                // without GridNova the spike turns into an alarm
    outcome: stage === 5,
  };
}

/** The outcome card (stage 5). */
export function outcomeFor(mode, f) {
  if (mode === 'with') {
    return { value: `−${f.reductionPct.toFixed(0)} %`, label: 'Peak import', caption: `${f.peakWithMw.toFixed(1)} MW instead of ${f.peakWithoutMw.toFixed(1)} MW`, avoided: `Demand charge avoided ≈ ${fmtAed(f.avoidedAed)} this month` };
  }
  return { value: `${f.peakWithoutMw.toFixed(1)} MW`, label: 'Peak import', caption: 'Nothing shaved: the whole spike is bought', avoided: `Demand charge this month ≈ ${fmtAed(f.withoutChargeAed)}` };
}

/**
 * State of the mini system diagram: 'off' | 'on' | 'hot' | 'calm' for every link and node.
 * Without GridNova there is nothing installed, so only the grid link is alive.
 */
export function miniState(stage, mode) {
  const links = Object.fromEntries(LINKS.map((l) => [l.id, 'off']));
  const nodes = Object.fromEntries(NODES.map((n) => [n.id, 'off']));
  const set = (state, ids, target) => ids.forEach((id) => { target[id] = state; });
  if (mode === 'without') {
    set('hot', ['p-grid-demand'], links);
    set('on', ['grid', 'demand'], nodes);
    return { links, nodes };
  }
  set('on', ['grid', 'demand', 'solar', 'controller'], nodes);
  set('on', ['p-grid-demand', 'p-solar-demand', 'c-demand'], links);
  if (stage === 2) { nodes.controller = 'hot'; set('on', ['c-solar', 'c-battery', 'c-grid'], links); }
  if (stage >= 3) { nodes.battery = stage === 3 ? 'hot' : 'on'; links['p-battery-demand'] = stage === 3 ? 'hot' : 'on'; links['c-battery'] = stage === 3 ? 'hot' : 'on'; }
  if (stage === 4) { nodes.demand = 'hot'; links['c-demand'] = 'hot'; }
  if (stage === 5) { links['p-grid-demand'] = 'calm'; }
  return { links, nodes };
}
