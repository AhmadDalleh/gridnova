import { describe, it, expect } from 'vitest';
import { eventFigures, stageView, stageDetail, outcomeFor, miniState, hhmm, STAGES, STAGE_COUNT, DETECT_HOUR } from '../../src/scenes/05-peak-event/figures.js';
import { createField, pointAt, MAX_PARTICLES, MIX, ROUTES } from '../../src/scenes/06-capability/particles.js';
import { CAPABILITIES } from '../../src/scenes/06-capability/template.js';
import { simulate } from '../../src/model/simulate.js';
import { LINKS, NODES } from '../../src/scenes/04-system/data.js';

// A tiny seeded generator, so particle tests are deterministic.
function seeded(seed = 7) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

describe('scene 05 figures (all from the model)', () => {
  const f = eventFigures();

  it('are the two reference heatwave runs of docs/simulator-model.md section 6', () => {
    expect(f.with).toEqual(simulate({ solarMw: 4, batteryMwh: 8, dayType: 'heatwave' }));
    expect(f.without).toEqual(simulate({ solarMw: 0, batteryMwh: 0, dayType: 'heatwave' }));
    expect(f.peakWithoutMw).toBeCloseTo(11.0, 2);
    expect(f.peakWithMw).toBeCloseTo(7.48, 2);
  });

  it('derive the storyboard outcome: -32 % peak import, about AED 141k demand charge avoided', () => {
    expect(f.reductionPct).toBeCloseTo(32, 1);
    expect(f.avoidedAed).toBeGreaterThan(140_000);
    expect(f.avoidedAed).toBeLessThan(142_000);
    expect(f.withoutChargeAed).toBeCloseTo(440_000, -2);
    expect(f.batteryPowerMw).toBe(4);
    expect(f.peakHour).toBe(15);
  });

  it('formats the detect time as 13:42', () => {
    expect(hhmm(DETECT_HOUR)).toBe('13:42');
    expect(hhmm(8)).toBe('08:00');
    expect(hhmm(22)).toBe('22:00');
  });

  it('describes each stage with model numbers, differently for With and Without in stages 3-5', () => {
    expect(stageDetail(1, 'with', f)).toBe(`13:42 · load climbing, ${f.loadAtDetect.toFixed(1)} MW`);
    expect(stageDetail(2, 'with', f)).toBe('Heatwave peak ≈ 11.0 MW at 15:00');
    expect(stageDetail(3, 'with', f)).toBe('Battery discharges up to 4.0 MW');
    expect(stageDetail(3, 'without', f)).toMatch(/nothing to dispatch/);
    expect(stageDetail(5, 'with', f)).toBe('Grid import held at 7.5 MW');
    expect(stageDetail(5, 'without', f)).toBe('Grid import hits 11.0 MW');
    expect(STAGES).toHaveLength(STAGE_COUNT);
  });

  it('stage views: the day is drawn further at each stage, GridNova layers only exist With GridNova', () => {
    const cursors = [1, 2, 3, 4, 5].map((s) => stageView(s, 'with').cursor);
    expect(cursors).toEqual([...cursors].sort((a, b) => a - b));
    expect(stageView(2, 'with').forecast).toBe(1);
    expect(stageView(3, 'with').forecast).toBe(0);
    expect(stageView(2, 'with').grid).toBe(0);
    expect(stageView(3, 'with').grid).toBe(1);
    expect(stageView(3, 'without').grid).toBe(0);
    expect(stageView(3, 'without').alarm).toBe(1);
    expect(stageView(3, 'with').alarm).toBe(0);
    expect(stageView(5, 'with').heldLabel).toBe(1);
    expect(stageView(5, 'without').heldLabel).toBe(0);
    expect([1, 2, 3, 4, 5].filter((s) => stageView(s, 'with').outcome)).toEqual([5]);
  });

  it('outcome card: With = -32 % and AED 141 k avoided, Without = the full 11.0 MW and its demand charge', () => {
    expect(outcomeFor('with', f)).toMatchObject({ value: '−32 %', caption: '7.5 MW instead of 11.0 MW', avoided: 'Demand charge avoided ≈ AED 141 k this month' });
    expect(outcomeFor('without', f)).toMatchObject({ value: '11.0 MW', avoided: 'Demand charge this month ≈ AED 440 k' });
  });

  it('mini diagram: Without GridNova only the grid link is alive; With, the stages light the right parts', () => {
    for (let s = 1; s <= 5; s++) {
      const m = miniState(s, 'without');
      expect(Object.entries(m.links).filter(([, v]) => v !== 'off').map(([k]) => k)).toEqual(['p-grid-demand']);
      expect(m.nodes.battery).toBe('off');
      expect(m.nodes.controller).toBe('off');
    }
    expect(miniState(2, 'with').nodes.controller).toBe('hot');
    expect(miniState(3, 'with').links['p-battery-demand']).toBe('hot');
    expect(miniState(3, 'with').nodes.battery).toBe('hot');
    expect(miniState(4, 'with').nodes.demand).toBe('hot');
    expect(miniState(5, 'with').links['p-grid-demand']).toBe('calm');
    expect(miniState(1, 'with').links['p-battery-demand']).toBe('off');
    for (const mode of ['with', 'without']) {
      const m = miniState(3, mode);
      expect(Object.keys(m.links).sort()).toEqual(LINKS.map((l) => l.id).sort());
      expect(Object.keys(m.nodes).sort()).toEqual(NODES.map((n) => n.id).sort());
    }
  });
});

describe('scene 06 particle field', () => {
  it('never exceeds the particle cap, even if asked for more', () => {
    expect(MAX_PARTICLES).toBeLessThanOrEqual(400);
    expect(createField({ count: 5000, random: seeded() }).particles.length).toBe(MAX_PARTICLES);
    expect(createField({ count: 50, random: seeded() }).particles.length).toBe(50);
  });

  it('mixes sum to 1 and every mix route exists', () => {
    for (const mix of Object.values(MIX)) {
      expect(Object.values(mix).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      Object.keys(mix).forEach((r) => expect(ROUTES[r], r).toBeTruthy());
    }
  });

  it('day: amber from the sun dominates; night: no amber at all, the battery (cyan) dominates, the grid trickle shrinks', () => {
    const f = createField({ random: seeded(), mode: 'day' });
    const share = (colors) => Object.entries(f.counts()).filter(([r]) => colors.includes(ROUTES[r].color)).reduce((a, [, c]) => a + c, 0) / f.particles.length;
    expect(share(['amber'])).toBeGreaterThan(0.6);
    expect(share(['cyan'])).toBeLessThan(0.1);
    const dayGrid = share(['coral']);
    f.setMode('night');
    expect(share(['amber'])).toBe(0);
    expect(share(['cyan'])).toBeGreaterThan(0.7);
    expect(share(['coral'])).toBeLessThan(dayGrid);
    expect(f.particles.length).toBe(MAX_PARTICLES);
  });

  it('changing the mode redirects particles without restarting them', () => {
    const f = createField({ random: seeded() });
    const before = f.particles.map((p) => p.t);
    f.setMode('night');
    expect(f.particles.map((p) => p.t)).toEqual(before);
  });

  it('step moves particles along their route and wraps at the end; a long pause is clamped', () => {
    const f = createField({ count: 10, random: seeded() });
    const p = f.particles[0];
    p.t = 0.5;
    const before = p.t;
    f.step(16);
    expect(p.t).toBeGreaterThan(before);
    p.t = 0.9999;
    f.step(50);
    expect(p.t).toBeLessThan(0.5);
    p.t = 0.1;
    f.step(60_000);                                            // a hidden tab for a minute
    expect(p.t - 0.1).toBeLessThan(0.03);
  });

  it('positions stay on the stage and fade to nothing at both route ends', () => {
    const f = createField({ random: seeded(), mode: 'day' });
    for (let i = 0; i < 100; i++) {
      f.step(16);
      f.particles.forEach((p) => {
        const [x, y, a] = f.position(p);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(1920);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(1080);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(1);
      });
    }
    const p = f.particles[0];
    p.t = 0;
    expect(f.position(p)[2]).toBeCloseTo(0, 9);
  });

  it('pointAt follows a polyline by length', () => {
    expect(pointAt([[0, 0], [100, 0]], 0.5)).toEqual([50, 0]);
    expect(pointAt([[0, 0], [100, 0], [100, 100]], 0.75)).toEqual([100, 50]);
    expect(pointAt([[0, 0], [100, 0]], 1)).toEqual([100, 0]);
  });
});

describe('scene 06 capabilities', () => {
  it('Orchestrate acts all day and all night; Forecast by day; Learn at night', () => {
    const acts = (id) => CAPABILITIES.find((c) => c.id === id).active;
    expect(acts('orchestrate')).toEqual(['day', 'night']);
    expect(acts('forecast')).toEqual(['day']);
    expect(acts('learn')).toEqual(['night']);
    CAPABILITIES.forEach((c) => { expect(c.day.length).toBeGreaterThan(10); expect(c.night.length).toBeGreaterThan(10); });
  });
});
