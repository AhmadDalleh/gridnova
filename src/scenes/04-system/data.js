import { ECON, BATTERY } from '../../model/constants.js';

// Scene 04 content: the five nodes, the power links (solid) and the control links (dashed).
// Coordinates are inside the 1200 x 760 diagram; the controller sits at the centre where the Core lands.
export const DIAGRAM = { width: 1200, height: 760, nodeRadius: 62, controllerRadius: 76 };

export const NODES = [
  { id: 'solar', name: 'Solar', verb: 'Generate', x: 250, y: 90, side: 'left', color: 'amber',
    icon: 'M-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M0 -22V-16 M0 16V22 M-22 0H-16 M16 0H22 M-15 -15l4 4 M11 11l4 4 M15 -15l-4 4 M-11 11l-4 4',
    input: 'Sunlight and a day-ahead panel forecast.',
    output: 'Power for the campus first, the battery second.',
    value: `Energy the campus does not buy: AED ${ECON.tariffAedPerMwh} per MWh avoided.`,
    decides: 'Solar is used first. It is curtailed only when neither the load nor the battery can take it.',
    live: (r) => `${r.inputs.solarMw.toFixed(1)} MW installed · ${Math.round(r.annualSolarMwh).toLocaleString('en-US')} MWh used per year` },
  { id: 'grid', name: 'Utility grid', verb: 'Import / export', x: 950, y: 90, side: 'right', color: 'coral',
    icon: 'M-16 24L0 -24L16 24 M-11 8H11 M-7 -6H7 M-22 -12H22',
    input: 'Whatever the campus asks for, up to the connection limit.',
    output: 'Energy at the tariff; a demand charge on the monthly peak.',
    value: 'A lower, steadier peak means a smaller demand charge.',
    decides: 'GridNova sets an import ceiling for the day and the other assets work to stay under it.',
    live: (r) => `Peak import ${r.peakAfterMw.toFixed(2)} MW (was ${r.peakBeforeMw.toFixed(2)} MW)` },
  { id: 'controller', name: 'GridNova controller', verb: 'Coordinate', x: 600, y: 340, side: 'below', color: 'cyan', icon: null,
    input: 'Meter readings, forecasts and tariffs.',
    output: 'Setpoints for the battery, the flexible loads and the grid ceiling.',
    value: 'Turns three separate assets into one decision.',
    decides: 'Forecast first, then the cheapest plan that keeps the peak under the ceiling. A person can always override.',
    live: (r) => `Peak ${r.peakBeforeMw.toFixed(2)} MW → ${r.peakAfterMw.toFixed(2)} MW (${r.peakReductionPct.toFixed(1)} % lower)` },
  { id: 'battery', name: 'Battery', verb: 'Shift', x: 250, y: 590, side: 'left', color: 'cyan',
    icon: 'M-22 -12H18V12H-22Z M18 -6H24V6H18 M-4 -8L-10 2H0L-6 8',
    input: 'Surplus solar, or cheap power from the overnight valley.',
    output: 'Discharge into the afternoon peak.',
    value: 'Flattens the peak that the demand charge is billed on.',
    decides: 'Finds the lowest import level it can hold all day, then recharges in the valleys without creating a new peak.',
    live: (r) => `${r.inputs.batteryMwh} MWh · up to ${Math.min(r.inputs.batteryMwh / BATTERY.durationH, BATTERY.maxPowerMw).toFixed(1)} MW` },
  { id: 'demand', name: 'Flexible demand', verb: 'Flex', x: 950, y: 340, side: 'right', color: 'amber',
    icon: 'M-24 22V-4H-6V22 M-6 22V-20H12V22 M12 22V2H26V22 M-30 22H30',
    input: 'Offers from EV charging and cooling to move in time.',
    output: 'Load moved out of the peak hours.',
    value: 'Shifts load without touching comfort or the critical labs.',
    decides: `Asks only for what the plan needs. The ${ECON.criticalLoadMw} MW critical load is never touched.`,
    live: () => `${ECON.criticalLoadMw} MW critical load protected first` },
];

// Power links carry energy (solid, dashes flow in the arrow direction); control links carry signals (dashed, pulses).
// `speed` is the dash speed in px/s: illustrative, it only shows which flows are bigger, not a model result.
export const LINKS = [
  { id: 'p-solar-battery', layer: 'power', from: 'solar', to: 'battery', label: 'charge', speed: 55 },
  { id: 'p-solar-demand', layer: 'power', from: 'solar', to: 'demand', label: 'serve', speed: 95 },
  { id: 'p-battery-demand', layer: 'power', from: 'battery', to: 'demand', label: 'discharge', speed: 75 },
  { id: 'p-grid-demand', layer: 'power', from: 'grid', to: 'demand', label: 'import', speed: 45 },
  { id: 'c-solar', layer: 'control', from: 'controller', to: 'solar', bend: 46 },
  { id: 'c-battery', layer: 'control', from: 'controller', to: 'battery', bend: 46 },
  { id: 'c-grid', layer: 'control', from: 'controller', to: 'grid', bend: 46 },
  { id: 'c-demand', layer: 'control', from: 'controller', to: 'demand', bend: 46 },
];

export const nodeById = (id) => NODES.find((n) => n.id === id);

/** Links that touch a node: used to decide what stays bright when a node is selected. */
export const linksOf = (nodeId) => LINKS.filter((l) => l.from === nodeId || l.to === nodeId);

/** Straight or curved SVG path from node `from` to node `to`, trimmed so it starts and ends at the node outlines. */
export function linkPath(link) {
  const a = nodeById(link.from);
  const b = nodeById(link.to);
  const ra = (a.id === 'controller' ? DIAGRAM.controllerRadius : DIAGRAM.nodeRadius) + 8;
  const rb = (b.id === 'controller' ? DIAGRAM.controllerRadius : DIAGRAM.nodeRadius) + 8;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  const sx = a.x + ux * ra;
  const sy = a.y + uy * ra;
  const ex = b.x - ux * rb;
  const ey = b.y - uy * rb;
  if (!link.bend) return `M${sx.toFixed(1)} ${sy.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}`;
  const cx = (sx + ex) / 2 - uy * link.bend;       // control point pushed sideways, so control lines never sit on power lines
  const cy = (sy + ey) / 2 + ux * link.bend;
  return `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
}
