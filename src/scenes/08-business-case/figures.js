import { ECON, LOAD_MW } from '../../model/constants.js';
import { fmtAed, fmtMw, fmtYears } from '../../ui/format.js';

// Scene 08 logic, pure. Everything derives from one simulate() result (the live simulator state).
// Economics always use the NORMAL day, so the demand-charge MW is demandValue / (charge x 12), not the heatwave peak.
export function businessFigures(r) {
  const { solarMw, batteryMwh } = r.inputs;
  const reductionMw = r.demandValue / (ECON.demandChargeAedPerMwMonth * 12);
  const platform = solarMw > 0 || batteryMwh > 0 ? ECON.platformCapexAed : 0;

  const cards = [
    { key: 'capex', label: 'Capex', value: r.capex, format: fmtAed,
      formula: `Solar ${solarMw.toFixed(1)} MW × ${fmtAed(ECON.solarCapexAedPerMw)} + battery ${batteryMwh} MWh × ${fmtAed(ECON.batteryCapexAedPerMwh)} + platform ${fmtAed(platform)} = ${fmtAed(r.capex)}` },
    { key: 'net', label: 'Net annual value', value: r.netAnnualValue, format: fmtAed,
      formula: `Energy ${fmtAed(r.energyValue)} + demand charge ${fmtAed(r.demandValue)} − O&M ${fmtAed(r.om)} = ${fmtAed(r.netAnnualValue)}` },
    { key: 'payback', label: 'Simple payback', value: r.paybackYears, format: fmtYears,
      formula: r.paybackYears === null ? 'Capex ÷ net annual value: n/a (nothing installed, or no net value)' : `Capex ${fmtAed(r.capex)} ÷ net annual value ${fmtAed(r.netAnnualValue)} = ${r.paybackYears.toFixed(2)} years` },
    { key: 'peak', label: 'Peak reduction', value: reductionMw, format: fmtMw,
      formula: `Normal-day peak ${Math.max(...LOAD_MW).toFixed(2)} MW → ${(Math.max(...LOAD_MW) - reductionMw).toFixed(2)} MW: ${reductionMw.toFixed(2)} MW avoided` },
  ];

  // Waterfall of ONE year: energy value and demand-charge value stack up, O&M steps down, the total is the net value.
  const bars = [
    { key: 'energy', label: 'Energy value', from: 0, to: r.energyValue, kind: 'amber',
      formula: `Solar energy used ${Math.round(r.annualSolarMwh).toLocaleString('en-US')} MWh × AED ${ECON.tariffAedPerMwh} = ${fmtAed(r.energyValue)}` },
    { key: 'demand', label: 'Demand charge', from: r.energyValue, to: r.energyValue + r.demandValue, kind: 'cyan',
      formula: `Demand charge value = peak reduction ${reductionMw.toFixed(2)} MW × AED ${ECON.demandChargeAedPerMwMonth.toLocaleString('en-US')} × 12 = ${fmtAed(r.demandValue)}` },
    { key: 'om', label: 'O&M', from: r.energyValue + r.demandValue, to: r.energyValue + r.demandValue - r.om, kind: 'coral',
      formula: `O&M = ${(ECON.omFraction * 100).toFixed(1)} % × capex ${fmtAed(r.capex)} = ${fmtAed(r.om)} per year` },
    { key: 'net', label: 'Net annual', from: 0, to: r.netAnnualValue, kind: 'total',
      formula: `Net annual value = energy + demand charge − O&M = ${fmtAed(r.netAnnualValue)}` },
  ];
  return { cards, bars, reductionMw, top: Math.max(r.energyValue + r.demandValue, 1) };
}

/** Cumulative cash flow points for years 0..10, plus where the line crosses zero (null if it never does within 10 years). */
export function cashFigures(r) {
  const min = Math.min(...r.cashflow, 0);
  const max = Math.max(...r.cashflow, 1);
  return { values: r.cashflow, min, max, paybackYears: r.paybackYears !== null && r.paybackYears <= ECON.cashflowYears ? r.paybackYears : null };
}
