// Scene 09 content (storyboard). The AED 330k Phase 1 budget is the explicit, labelled ask of the proposal (illustrative).
export const ASK = { amountAed: 330_000, text: 'Approve Phase 1 discovery and pilot design: AED 330k, decision gate in Q2.' };

export const PHASES = [
  { id: 'discover', n: 1, name: 'Discover', when: '6 weeks', cost: 'AED 330k (illustrative)', width: 330,
    scope: 'Meter and site data, load and solar study, interconnection screening, pilot sizing.',
    exit: 'Signed-off sizing, a priced pilot design and a go / no-go paper for the gate.',
    risk: 'Site data quality: gaps in meter history.' },
  { id: 'pilot', n: 2, name: 'Pilot design & build', when: '6 months', cost: 'Budget set at the gate', width: 560,
    scope: 'Detailed design, procurement, installation and commissioning of the pilot, with human supervision.',
    exit: 'Pilot live; a full month of measured peak import against the forecast.',
    risk: 'Interconnection approval and battery supply lead time.' },
  { id: 'scale', n: 3, name: 'Scale', when: 'Gated', cost: 'Gated on pilot results', width: 400,
    scope: 'Extend to the remaining zones and sites only if the pilot beats its targets.',
    exit: 'Gate review of pilot evidence; scale budget approved separately.',
    risk: 'Benefits at scale differ from the pilot.' },
];

export const MILESTONES = [
  { at: 0.00, label: 'Kick-off' },
  { at: 0.25, label: 'Discovery report' },
  { at: 0.38, label: 'Gate 1 (Q2)' },
  { at: 0.72, label: 'Pilot live' },
  { at: 1.00, label: 'Scale gate' },
];

export const RISKS = [
  { name: 'Site data quality', fix: 'Discovery audits meters before any design.' },
  { name: 'Interconnection approval', fix: 'Utility screening starts in week 1.' },
  { name: 'Battery supply lead time', fix: 'Order slot reserved at the gate; two suppliers.' },
];

/** The sizing line of the ask, from the simulator state. */
export const sizingLine = (sim) => `Pilot sizing carried from your scenario: ${sim.solarMw} MW solar · ${sim.batteryMwh} MWh battery`;
