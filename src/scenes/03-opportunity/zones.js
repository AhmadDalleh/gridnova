import { ECON } from '../../model/constants.js';

// Scene 03 content. Zone loads are ILLUSTRATIVE shares of the campus peak, so the MW shown on the detail card is
// `share x peak` where the peak comes from the model (scene 02's 10 MW). Solar and battery zones read the simulator
// inputs from the store instead, so the card always matches scene 07.
// Plane coordinates: a 900 x 900 ground plane, origin top-left, before the camera tilts it.
export const ZONES = [
  { id: 'academic', name: 'Academic core', kind: 'load', share: 0.30, x: 40, y: 40, w: 210, h: 210, rise: 120,
    load: 'Teaching, offices, libraries', flex: 'Low: occupied hours are fixed',
    role: 'The biggest daytime load. Its afternoon cooling drives the campus peak.' },
  { id: 'research', name: 'Research labs', kind: 'load', share: ECON.criticalLoadMw / 10, x: 345, y: 40, w: 210, h: 210, rise: 90,
    load: 'Critical: must never lose power', flex: 'None: protected first',
    role: 'The load the battery protects during an outage. It sets the resilience hours.' },
  { id: 'thermal', name: 'Thermal plant', kind: 'load', share: 0.20, x: 650, y: 40, w: 210, h: 210, rise: 80,
    load: 'Chillers and cooling water', flex: 'High: can pre-cool before the peak',
    role: 'Thermal storage is flexible: cooling can move a few hours without anyone noticing.' },
  { id: 'ev', name: 'EV fleet depot', kind: 'load', share: 0.15, x: 40, y: 650, w: 210, h: 210, rise: 44,
    load: 'Campus shuttles and service vehicles', flex: 'High: charging can wait for the valley',
    role: 'Charging is shifted to the night valley, so it never adds to the afternoon peak.' },
  { id: 'parking', name: 'Parking canopies', kind: 'solar', x: 345, y: 650, w: 515, h: 210, rise: 22,
    load: 'Generation: solar canopies', flex: 'Follows the sun',
    role: 'Shade for cars and the campus solar plant, using land that is already paved.' },
  { id: 'substation', name: 'Substation', kind: 'battery', x: 390, y: 390, w: 120, h: 120, rise: 60,
    load: 'Grid connection and battery', flex: 'The coordination point',
    role: 'Where GridNova sits: it sees every meter and commands the battery.' },
];

// Outcome badges sit on a zone each. Wording follows the storyboard.
export const OUTCOMES = [
  { n: '01', text: 'Lower peak import', zone: 'ev' },
  { n: '02', text: 'Longer islanding window', zone: 'research' },
  { n: '03', text: 'More predictable cost', zone: 'academic' },
];

export const PERSONAS = [
  { who: 'Facilities Director', gain: 'Sees the peak coming and has a plan for it.' },
  { who: 'CFO', gain: 'A demand charge that stops being a surprise.' },
  { who: 'Sustainability Lead', gain: 'More of the campus’s own sun, actually used.' },
];

/** The "illustrative MW" line of the detail card. Load zones use their share of the modelled peak. */
export function zoneFigure(zone, sim, peakMw) {
  if (zone.kind === 'solar') return { label: 'Solar capacity', value: `${sim.solarMw.toFixed(1)} MW`, note: 'from your scenario in scene 07' };
  if (zone.kind === 'battery') return { label: 'Battery', value: `${sim.batteryMwh} MWh`, note: 'from your scenario in scene 07' };
  return { label: 'Illustrative load', value: `${(zone.share * peakMw).toFixed(1)} MW`, note: `${Math.round(zone.share * 100)} % of the ${peakMw.toFixed(0)} MW peak` };
}
