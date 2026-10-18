import { describe, it, expect } from 'vitest';
import { businessFigures, cashFigures } from '../../src/scenes/08-business-case/figures.js';
import { PHASES, MILESTONES, ASK, sizingLine } from '../../src/scenes/09-decision/roadmap.js';
import { simulate } from '../../src/model/simulate.js';

describe('scene 08 figures follow the simulator state', () => {
  const r = simulate({ solarMw: 4, batteryMwh: 8 });
  const f = businessFigures(r);

  it('cards equal the model reference values for Balanced', () => {
    const v = Object.fromEntries(f.cards.map((c) => [c.key, c.value]));
    expect(v.capex).toBe(22_300_000);
    expect(v.net).toBeCloseTo(3_648_278, -3);
    expect(v.payback).toBeCloseTo(6.11, 2);
    expect(v.peak).toBeCloseTo(3.43, 2);
  });

  it('waterfall: energy + demand - O&M = net, bars chain end to start', () => {
    const [e, d, om, net] = f.bars;
    expect(e.from).toBe(0);
    expect(d.from).toBe(e.to);
    expect(om.from).toBe(d.to);
    expect(om.to).toBeCloseTo(net.to, 6);
    expect(net.to).toBeCloseTo(r.netAnnualValue, 6);
  });

  it('formulas quote the real inputs', () => {
    expect(f.bars[1].formula).toBe('Demand charge value = peak reduction 3.43 MW × AED 40,000 × 12 = AED 1.65 M');
    expect(f.cards[0].formula).toContain('Solar 4.0 MW');
    expect(f.cards[2].formula).toContain('6.11 years');
  });

  it('baseline: nothing installed gives zeros, n/a payback and no marker', () => {
    const b = simulate({ solarMw: 0, batteryMwh: 0 });
    const g = businessFigures(b);
    expect(g.cards[0].value).toBe(0);
    expect(g.cards[2].value).toBeNull();
    expect(g.top).toBe(1);
    expect(cashFigures(b).paybackYears).toBeNull();
  });

  it('economics use the normal day even when the simulator shows a heatwave', () => {
    const h = businessFigures(simulate({ solarMw: 4, batteryMwh: 8, dayType: 'heatwave' }));
    expect(h.cards.map((c) => c.value)).toEqual(f.cards.map((c) => c.value));
  });

  it('cash flow: starts at -capex, payback marker only if within 10 years', () => {
    const c = cashFigures(r);
    expect(c.values).toHaveLength(11);
    expect(c.values[0]).toBe(-22_300_000);
    expect(c.paybackYears).toBeCloseTo(6.11, 2);
    expect(cashFigures(simulate({ solarMw: 0, batteryMwh: 24 })).paybackYears).toBeNull();
  });
});

describe('scene 09 roadmap', () => {
  it('has the three storyboard phases, milestones in order and the AED 330k ask', () => {
    expect(PHASES.map((p) => p.id)).toEqual(['discover', 'pilot', 'scale']);
    expect(MILESTONES.map((m) => m.at)).toEqual([...MILESTONES.map((m) => m.at)].sort((a, b) => a - b));
    expect(ASK.text).toContain('AED 330k');
    expect(ASK.text).toContain('Q2');
  });
  it('sizing line comes from the simulator inputs', () => {
    expect(sizingLine({ solarMw: 6, batteryMwh: 16 })).toBe('Pilot sizing carried from your scenario: 6 MW solar · 16 MWh battery');
  });
});
