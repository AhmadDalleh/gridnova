import { describe, it, expect } from 'vitest';
import { ZONES, OUTCOMES, zoneFigure } from '../../src/scenes/03-opportunity/zones.js';
import { CAMERA_FLAT, CAMERA_ISO, PLANE } from '../../src/scenes/03-opportunity/campus.js';
import { NODES, LINKS, DIAGRAM, linkPath, linksOf, nodeById } from '../../src/scenes/04-system/data.js';
import { simulate } from '../../src/model/simulate.js';
import { ECON } from '../../src/model/constants.js';

describe('scene 03 zones', () => {
  it('has the six storyboard zones with unique ids, all inside the ground plane', () => {
    expect(ZONES.map((z) => z.id)).toEqual(['academic', 'research', 'thermal', 'ev', 'parking', 'substation']);
    ZONES.forEach((z) => {
      expect(z.x).toBeGreaterThanOrEqual(0);
      expect(z.y).toBeGreaterThanOrEqual(0);
      expect(z.x + z.w).toBeLessThanOrEqual(PLANE);
      expect(z.y + z.h).toBeLessThanOrEqual(PLANE);
    });
  });

  it('zone footprints never overlap', () => {
    for (const a of ZONES) {
      for (const b of ZONES) {
        if (a === b) continue;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.id} vs ${b.id}`).toBe(true);
      }
    }
  });

  it('load shares add up to at most 100 % and the research lab is the modelled critical load', () => {
    const shares = ZONES.filter((z) => z.kind === 'load').map((z) => z.share);
    expect(shares.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1);
    expect(ZONES.find((z) => z.id === 'research').share * 10).toBeCloseTo(ECON.criticalLoadMw, 9);
  });

  it('every outcome badge sits on an existing zone', () => {
    expect(OUTCOMES).toHaveLength(3);
    OUTCOMES.forEach((o) => expect(ZONES.some((z) => z.id === o.zone)).toBe(true));
  });

  it('load zones show share x the modelled peak; solar and battery zones read the simulator inputs', () => {
    const peak = simulate({ solarMw: 0, batteryMwh: 0 }).peakBeforeMw;
    const sim = { solarMw: 6, batteryMwh: 16 };
    expect(zoneFigure(ZONES.find((z) => z.id === 'academic'), sim, peak).value).toBe('3.0 MW');
    expect(zoneFigure(ZONES.find((z) => z.id === 'parking'), sim, peak).value).toBe('6.0 MW');
    expect(zoneFigure(ZONES.find((z) => z.id === 'substation'), sim, peak).value).toBe('16 MWh');
  });

  it('the camera ends tilted and zoomed in compared with where it starts', () => {
    expect(CAMERA_FLAT.tilt).toBe(0);
    expect(CAMERA_ISO.tilt).toBeGreaterThan(CAMERA_FLAT.tilt);
    expect(CAMERA_ISO.zoom).toBeGreaterThan(CAMERA_FLAT.zoom);
  });
});

describe('scene 04 diagram data', () => {
  it('has the five storyboard nodes and the controller at the centre where the Core lands', () => {
    expect(NODES.map((n) => n.id).sort()).toEqual(['battery', 'controller', 'demand', 'grid', 'solar']);
    const c = nodeById('controller');
    expect([c.x, c.y]).toEqual([DIAGRAM.width / 2, 340]);
  });

  it('every link connects two existing nodes; control links all start at the controller', () => {
    LINKS.forEach((l) => {
      expect(nodeById(l.from), l.id).toBeTruthy();
      expect(nodeById(l.to), l.id).toBeTruthy();
      if (l.layer === 'control') expect(l.from).toBe('controller');
    });
    expect(new Set(LINKS.map((l) => l.id)).size).toBe(LINKS.length);
  });

  it('every non-controller node is reached by one control link and has at least one power link', () => {
    NODES.filter((n) => n.id !== 'controller').forEach((n) => {
      expect(LINKS.filter((l) => l.layer === 'control' && l.to === n.id)).toHaveLength(1);
      expect(LINKS.filter((l) => l.layer === 'power' && (l.from === n.id || l.to === n.id)).length).toBeGreaterThan(0);
    });
  });

  it('linksOf(controller) is exactly the control layer', () => {
    expect(linksOf('controller').map((l) => l.id).sort()).toEqual(LINKS.filter((l) => l.layer === 'control').map((l) => l.id).sort());
  });

  it('link paths start and end on the node outlines, not at their centres', () => {
    const l = LINKS.find((x) => x.id === 'p-solar-demand');
    const [, sx, sy, ex, ey] = /M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+)/.exec(linkPath(l)).map(Number);
    const a = nodeById('solar');
    const b = nodeById('demand');
    expect(Math.hypot(sx - a.x, sy - a.y)).toBeGreaterThan(DIAGRAM.nodeRadius);
    expect(Math.hypot(ex - b.x, ey - b.y)).toBeGreaterThan(DIAGRAM.nodeRadius);
  });

  it('node detail text is complete and the live figure comes from the model result', () => {
    const r = simulate({ solarMw: 4, batteryMwh: 8 });
    NODES.forEach((n) => {
      ['input', 'output', 'value', 'decides'].forEach((f) => expect(n[f].length, `${n.id}.${f}`).toBeGreaterThan(10));
    });
    expect(nodeById('controller').live(r)).toContain('6.57 MW');
    expect(nodeById('battery').live(r)).toBe('8 MWh · up to 4.0 MW');
  });
});
