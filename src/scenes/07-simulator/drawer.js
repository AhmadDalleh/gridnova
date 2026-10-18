import {
  RANGES, LOAD_MW, HEATWAVE, SOLAR_SHAPE, BATTERY, ECON, EXCLUSIONS,
} from '../../model/constants.js';

// Assumptions drawer: every constant is read from model/constants.js, so what the audience sees
// is always what the simulator actually uses.
const aed = (n) => `AED ${n.toLocaleString('en-US')}`;
const peakHour = (arr) => arr.indexOf(Math.max(...arr));
const hh = (h) => `${String(h).padStart(2, '0')}:00`;

function sections() {
  const loadPeak = Math.max(...LOAD_MW);
  const sunPeak = Math.max(...SOLAR_SHAPE);
  return [
    ['Inputs', [
      ['Solar capacity', `${RANGES.solarMw.min}–${RANGES.solarMw.max} MW, step ${RANGES.solarMw.step}`],
      ['Battery energy', `${RANGES.batteryMwh.min}–${RANGES.batteryMwh.max} MWh, step ${RANGES.batteryMwh.step}`],
    ]],
    ['Campus load and solar', [
      ['Normal-day peak', `${loadPeak} MW at ${hh(peakHour(LOAD_MW))}`],
      ['Heatwave day', `+${Math.round((HEATWAVE.hotFactor - 1) * 100)} % from ${hh(HEATWAVE.hotFrom)} to ${hh(HEATWAVE.hotTo + 1)}, +${Math.round((HEATWAVE.otherFactor - 1) * 100)} % otherwise`],
      ['Solar output (clear day)', `peaks at ${Math.round(sunPeak * 100)} % of capacity at ${hh(peakHour(SOLAR_SHAPE))}`],
      ['Annual solar factor', `365 days × ${(ECON.annualSolarFactor / 365).toFixed(2)}`],
    ]],
    ['Battery', [
      ['Power', `energy ÷ ${BATTERY.durationH} h, max ${BATTERY.maxPowerMw} MW`],
      ['Usable energy', `${Math.round(BATTERY.usableFraction * 100)} % of capacity`],
      ['Round-trip efficiency', `${Math.round(BATTERY.roundTrip * 100)} %, applied when recharging`],
    ]],
    ['Economics', [
      ['Energy tariff', `${aed(ECON.tariffAedPerMwh)} / MWh`],
      ['Demand charge', `${aed(ECON.demandChargeAedPerMwMonth)} / MW / month`],
      ['Solar capex', `AED ${ECON.solarCapexAedPerMw / 1e6} M / MW`],
      ['Battery capex', `AED ${ECON.batteryCapexAedPerMwh / 1e6} M / MWh`],
      ['Platform capex', `AED ${ECON.platformCapexAed / 1e6} M, once anything is built`],
      ['O&M', `${(ECON.omFraction * 100).toFixed(1)} % of capex per year`],
      ['Critical load', `${ECON.criticalLoadMw} MW (resilience hours)`],
    ]],
  ];
}

export function drawerHtml() {
  const body = sections().map(([title, rows]) => `
    <h3>${title}</h3>
    <dl>${rows.map(([k, v]) => `<div class="row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`).join('');
  return `
    <div class="drawer-head">
      <h2 id="drawer-title">Assumptions <span class="tag">Illustrative</span></h2>
      <button type="button" id="btn-drawer-close" aria-label="Close assumptions">Close</button>
    </div>
    <div class="drawer-body" tabindex="0">
      <p class="drawer-note">Fictional, simplified demonstration model. Value, capex and payback always use a normal day.</p>
      ${body}
      <h3>Not modelled</h3>
      <ul>${EXCLUSIONS.map((e) => `<li>${e}</li>`).join('')}</ul>
    </div>`;
}
