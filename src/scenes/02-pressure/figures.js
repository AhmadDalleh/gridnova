import { PEAK_WINDOW, ECON } from '../../model/constants.js';

// The four baseline counters of scene 02, all derived from the model result for "no solar, no battery".
// The only non-computed input is the narrative peak window (PEAK_WINDOW, labelled in the assumptions drawer).
export function pressureFigures(baseline) {
  const load = baseline.series.load;
  return {
    peakMw: baseline.peakBeforeMw,
    peakHour: load.indexOf(Math.max(...load)),
    gridSharePct: (baseline.peakAfterMw / baseline.peakBeforeMw) * 100,   // share of the peak bought from the grid
    windowHours: PEAK_WINDOW.to - PEAK_WINDOW.from,
    demandChargeAed: baseline.peakBeforeMw * ECON.demandChargeAedPerMwMonth * 12,
  };
}
