import { gsap } from 'gsap';
import { svgEl, linePath, areaPath } from '../../ui/svg.js';
import { lerpShape } from '../../ui/lerp.js';
import { GLOW_MIN } from '../../ui/format.js';

// 24-hour stacked chart, hand-written SVG (780 x 600 stage px). The y axis is fixed at 0-12 MW so the
// picture never rescales while a slider moves: only the shapes change.
//
// A "shape" is everything the chart draws, as plain numbers:
//   b1..b4  cumulative stack tops (solar | battery discharge | grid to load | grid to charge battery)
//   load    the "before" curve (campus load = grid import with no GridNova)
//   grid    the "after" curve (grid import with GridNova)
//   peak    max(grid), for the target line;  glow  the Core glow that goes with this result
// Morphing = interpolating two shapes, so areas, lines, label and Core glow always move together.
const W = 780;
const H = 600;
const PLOT = { x: 80, y: 44, w: 680, h: 450 };
const MAX_MW = 12;
const XS = Array.from({ length: 24 }, (_, h) => PLOT.x + (h / 23) * PLOT.w);
const yAt = (mw) => PLOT.y + PLOT.h - (mw / MAX_MW) * PLOT.h;
const ys = (arr) => arr.map(yAt);

export function toShape(result, glow) {
  const { solar, discharge, gridCharge, grid, load } = result.series;
  const b1 = solar.map((s, h) => Math.min(s, load[h]));
  const b2 = b1.map((v, h) => v + discharge[h]);
  const b3 = b2.map((v, h) => v + (grid[h] - gridCharge[h]));   // = load: solar + battery + grid cover the whole load
  const b4 = b3.map((v, h) => v + gridCharge[h]);               // grid energy that refills the battery sits on top
  return { b1, b2, b3, b4, load: [...load], grid: [...grid], peak: Math.max(...grid), glow };
}

export function emptyShape() {
  const z = () => new Array(24).fill(0);
  return { b1: z(), b2: z(), b3: z(), b4: z(), load: z(), grid: z(), peak: 0, glow: GLOW_MIN };
}

export function createChart(svg, { onFrame }) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `<defs><pattern id="hatch-charge" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="10" height="10" fill="var(--bg)" opacity="0.55"/><line x1="0" y1="0" x2="0" y2="10" stroke="var(--cyan)" stroke-width="4"/></pattern></defs>`;

  // static frame: gridlines + labels
  for (const mw of [0, 3, 6, 9, 12]) {
    svgEl('line', { x1: PLOT.x, x2: PLOT.x + PLOT.w, y1: yAt(mw), y2: yAt(mw), class: 'grid-line' }, svg);
    svgEl('text', { x: PLOT.x - 12, y: yAt(mw) + 8, class: 'tick', 'text-anchor': 'end' }, svg).textContent = mw;
  }
  svgEl('text', { x: PLOT.x - 12, y: PLOT.y - 24, class: 'tick unit', 'text-anchor': 'end' }, svg).textContent = 'MW';
  for (let h = 0; h < 24; h += 3) {
    svgEl('text', { x: XS[h], y: PLOT.y + PLOT.h + 36, class: 'tick', 'text-anchor': 'middle' }, svg).textContent = String(h).padStart(2, '0');
  }

  // data layers, bottom to top
  const area = (cls) => svgEl('path', { class: `area ${cls}` }, svg);
  const solarArea = area('a-solar');
  const dischargeArea = area('a-discharge');
  const gridArea = area('a-grid');
  const chargeArea = area('a-charge');
  const before = svgEl('path', { class: 'line-before' }, svg);
  const casing = svgEl('path', { class: 'line-casing' }, svg);
  const after = svgEl('path', { class: 'line-after' }, svg);
  const peakLine = svgEl('line', { x1: PLOT.x, x2: PLOT.x + PLOT.w, class: 'peak-line' }, svg);
  const peakLabel = svgEl('text', { x: PLOT.x + 10, class: 'peak-label' }, svg);   // left side: the night hours leave this area empty
  const hoverLine = svgEl('line', { y1: PLOT.y, y2: PLOT.y + PLOT.h, class: 'hover-line', visibility: 'hidden' }, svg);
  const hoverText = svgEl('text', { x: PLOT.x + 10, y: PLOT.y + 22, class: 'hover-text' }, svg);

  let shown = emptyShape();
  let tween = null;

  function draw(s) {
    shown = s;
    const base = new Array(24).fill(0);
    solarArea.setAttribute('d', areaPath(XS, ys(s.b1), ys(base)));
    dischargeArea.setAttribute('d', areaPath(XS, ys(s.b2), ys(s.b1)));
    gridArea.setAttribute('d', areaPath(XS, ys(s.b3), ys(s.b2)));
    chargeArea.setAttribute('d', areaPath(XS, ys(s.b4), ys(s.b3)));
    before.setAttribute('d', linePath(XS, ys(s.load)));
    const afterD = linePath(XS, ys(s.grid));
    casing.setAttribute('d', afterD);
    after.setAttribute('d', afterD);
    peakLine.setAttribute('y1', yAt(s.peak));
    peakLine.setAttribute('y2', yAt(s.peak));
    peakLabel.setAttribute('y', yAt(s.peak) - 10);
    peakLabel.textContent = `Peak after ${s.peak.toFixed(2)} MW`;
    onFrame(s);
  }

  return {
    /** Tween from what is on screen to `next`; a new call replaces the running tween (smooth slider dragging). */
    morphTween(next, { duration = 0.5, ease = 'power2.out' } = {}) {
      tween?.kill();
      const from = shown;
      const k = { v: 0 };
      tween = gsap.to(k, { v: 1, duration, ease, onUpdate: () => draw(lerpShape(from, next, k.v)), onComplete: () => draw(next) });
      return tween;
    },
    /** No animation (reduced motion, paused, first paint). */
    set(next) {
      tween?.kill();
      draw(next);
    },
    kill() { tween?.kill(); },

    hourFromEvent(e) {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      return Math.min(23, Math.max(0, Math.round(((x - PLOT.x) / PLOT.w) * 23)));
    },
    setHover(hour, text) {
      if (hour === null) {
        hoverLine.setAttribute('visibility', 'hidden');
        hoverText.textContent = '';
        return;
      }
      hoverLine.setAttribute('x1', XS[hour]);
      hoverLine.setAttribute('x2', XS[hour]);
      hoverLine.setAttribute('visibility', 'visible');
      hoverText.textContent = text;
    },
  };
}
