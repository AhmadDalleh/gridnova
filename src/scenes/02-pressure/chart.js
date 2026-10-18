import { svgEl, linePath } from '../../ui/svg.js';
import { PEAK_WINDOW } from '../../model/constants.js';

// The 24-hour load curve of scene 02 (hand-written SVG, 1220 x 640 stage px, placed at SVG_POS on the stage).
// X is hours 0-24 (25 points: the day is cyclic, so 24:00 repeats the 00:00 value); Y is 0-12 MW like scene 07's chart.
export const SVG_POS = { left: 120, top: 230 };
const W = 1220;
const H = 640;
const PLOT = { x: 90, y: 50, w: 1100, h: 500 };
const MAX_MW = 12;
const xAt = (h) => PLOT.x + (h / 24) * PLOT.w;
const yAt = (mw) => PLOT.y + PLOT.h - (mw / MAX_MW) * PLOT.h;
const hh = (h) => `${String(Math.round(h)).padStart(2, '0')}:00`;
const SAMPLES = 480;

/** Stage-pixel centre of a point on the curve: where the Core lands as the peak marker. */
export const stagePoint = (hour, mw) => ({ x: SVG_POS.left + xAt(hour), y: SVG_POS.top + yAt(mw) });

export function createCurveChart(svg, load24) {
  const series = [...load24, load24[0]];                      // 25 values, 00:00 ... 24:00
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  for (const mw of [0, 3, 6, 9, 12]) {
    svgEl('line', { x1: PLOT.x, x2: PLOT.x + PLOT.w, y1: yAt(mw), y2: yAt(mw), class: 's2-grid-line' }, svg);
    svgEl('text', { x: PLOT.x - 14, y: yAt(mw) + 8, class: 's2-tick', 'text-anchor': 'end' }, svg).textContent = mw;
  }
  svgEl('text', { x: PLOT.x - 14, y: PLOT.y - 22, class: 's2-tick s2-unit', 'text-anchor': 'end' }, svg).textContent = 'MW';
  for (let h = 0; h <= 24; h += 3) {
    svgEl('text', { x: xAt(h), y: PLOT.y + PLOT.h + 38, class: 's2-tick', 'text-anchor': 'middle' }, svg).textContent = String(h).padStart(2, '0');
  }

  // Peak window band (14:00-17:00) sits behind the curve
  const band = svgEl('g', { class: 's2-band' }, svg);
  svgEl('rect', { x: xAt(PEAK_WINDOW.from), y: PLOT.y, width: xAt(PEAK_WINDOW.to) - xAt(PEAK_WINDOW.from), height: PLOT.h }, band);
  svgEl('text', { x: (xAt(PEAK_WINDOW.from) + xAt(PEAK_WINDOW.to)) / 2, y: PLOT.y - 14, 'text-anchor': 'middle' }, band)
    .textContent = `Peak window ${hh(PEAK_WINDOW.from)}–${hh(PEAK_WINDOW.to)}`;

  const xs = series.map((_, h) => xAt(h));
  const curve = svgEl('path', { class: 's2-curve', d: linePath(xs, series.map(yAt)) }, svg);
  const length = curve.getTotalLength();
  const pen = svgEl('circle', { r: 11, class: 's2-pen' }, svg);
  const clock = svgEl('text', { x: PLOT.x + 24, y: PLOT.y + 58, class: 's2-clock' }, svg);

  const hoverLine = svgEl('line', { y1: PLOT.y, y2: PLOT.y + PLOT.h, class: 's2-hover-line', visibility: 'hidden' }, svg);
  const hoverDot = svgEl('circle', { r: 10, class: 's2-hover-dot', visibility: 'hidden' }, svg);
  const hoverText = svgEl('text', { x: PLOT.x + PLOT.w - 10, y: PLOT.y + 58, class: 's2-hover-text', 'text-anchor': 'end' }, svg);

  // Path-length <-> hour table, so the clock and the peak-window beat follow the pen's real position on the curve.
  const sampleX = Array.from({ length: SAMPLES + 1 }, (_, i) => curve.getPointAtLength((i / SAMPLES) * length).x);
  const hourAt = (p) => ((sampleX[Math.round(p * SAMPLES)] - PLOT.x) / PLOT.w) * 24;

  return {
    /** Fraction of the draw at which the pen reaches `hour` (to time the band and counters). */
    frac(hour) {
      const x = xAt(hour);
      return Math.max(0, sampleX.findIndex((sx) => sx >= x)) / SAMPLES;
    },
    /** Draw the curve up to p (0-1): dash offset, pen position and the 00:00 -> 24:00 clock move together. */
    setProgress(p) {
      curve.style.strokeDasharray = String(length);
      curve.style.strokeDashoffset = String(length * (1 - p));
      const pt = curve.getPointAtLength(p * length);
      pen.setAttribute('cx', pt.x);
      pen.setAttribute('cy', pt.y);
      pen.style.opacity = p > 0 && p < 1 ? '1' : '0';
      clock.textContent = hh(hourAt(p));
    },
    band,
    curve,
    clock,

    hourFromEvent(e) {
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      return Math.min(24, Math.max(0, Math.round(((x - PLOT.x) / PLOT.w) * 24)));
    },
    valueAt: (hour) => series[hour],
    setHover(hour) {
      if (hour === null) {
        hoverLine.setAttribute('visibility', 'hidden');
        hoverDot.setAttribute('visibility', 'hidden');
        hoverText.textContent = '';
        return;
      }
      hoverLine.setAttribute('x1', xAt(hour));
      hoverLine.setAttribute('x2', xAt(hour));
      hoverDot.setAttribute('cx', xAt(hour));
      hoverDot.setAttribute('cy', yAt(series[hour]));
      hoverLine.setAttribute('visibility', 'visible');
      hoverDot.setAttribute('visibility', 'visible');
      hoverText.textContent = `${hh(hour)} · ${series[hour].toFixed(1)} MW`;
    },
  };
}
