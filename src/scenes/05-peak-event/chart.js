import { gsap } from 'gsap';
import { svgEl, linePath, areaPath } from '../../ui/svg.js';
import { lerp } from '../../ui/lerp.js';
import { CHART_HOURS, hhmm } from './figures.js';

// The mini chart of grid import on the heatwave afternoon (hours 8-22, 0-12 MW).
// The chart holds ONE small state object (how far the day is drawn + layer opacities). render() turns it into SVG;
// tweenTo() animates the state, so a stage change "bends" the lines instead of redrawing them.
const W = 1100;
const H = 500;
const M = { l: 80, r: 24, t: 30, b: 56 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const Y_MAX = 12;
const X = (h) => M.l + ((h - CHART_HOURS.from) / (CHART_HOURS.to - CHART_HOURS.from)) * PW;
const Y = (mw) => M.t + (1 - mw / Y_MAX) * PH;

export function createEventChart(svg, { without, withG, peakHour, heldHour }) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const hours = Array.from({ length: CHART_HOURS.to - CHART_HOURS.from + 1 }, (_, i) => CHART_HOURS.from + i);
  const xs = hours.map(X);
  const loadYs = hours.map((h) => Y(without.series.load[h]));
  const gridYs = hours.map((h) => Y(withG.series.grid[h]));

  // clip A = what has been "lived" so far (left of the cursor); clip B = the not-yet-lived forecast (right of it)
  const defs = svgEl('defs', {}, svg);
  const clipA = svgEl('rect', { x: 0, y: 0, height: H, width: 0 }, svgEl('clipPath', { id: 's5-clip-a' }, defs));
  const clipB = svgEl('rect', { x: 0, y: 0, height: H, width: W }, svgEl('clipPath', { id: 's5-clip-b' }, defs));

  const axes = svgEl('g', { class: 's5-axes' }, svg);
  for (let mw = 0; mw <= Y_MAX; mw += 3) {
    svgEl('line', { x1: M.l, x2: W - M.r, y1: Y(mw), y2: Y(mw), class: 's5-grid-line' }, axes);
    svgEl('text', { x: M.l - 14, y: Y(mw) + 8, class: 's5-tick', 'text-anchor': 'end' }, axes).textContent = String(mw);
  }
  svgEl('text', { x: M.l - 14, y: M.t - 26, class: 's5-tick s5-unit', 'text-anchor': 'end' }, axes).textContent = 'MW';
  hours.filter((h) => h % 2 === 0).forEach((h) => {
    svgEl('text', { x: X(h), y: H - 16, class: 's5-tick', 'text-anchor': 'middle' }, axes).textContent = `${String(h).padStart(2, '0')}:00`;
  });

  const gap = svgEl('path', { d: areaPath(xs, loadYs, gridYs), class: 's5-gap', 'clip-path': 'url(#s5-clip-a)' }, svg);
  const forecast = svgEl('path', { d: linePath(xs, loadYs), class: 's5-line s5-forecast', 'clip-path': 'url(#s5-clip-b)' }, svg);
  const load = svgEl('path', { d: linePath(xs, loadYs), class: 's5-line s5-load', 'clip-path': 'url(#s5-clip-a)' }, svg);
  const grid = svgEl('path', { d: linePath(xs, gridYs), class: 's5-line s5-grid', 'clip-path': 'url(#s5-clip-a)' }, svg);

  const cursorLine = svgEl('line', { y1: M.t, y2: H - M.b, class: 's5-cursor' }, svg);
  const cursorText = svgEl('text', { y: H - M.b - 14, class: 's5-clock', 'text-anchor': 'middle' }, svg);

  const marker = (hour, mw, cls) => {
    const g = svgEl('g', { class: `s5-marker ${cls}` }, svg);
    svgEl('circle', { cx: X(hour), cy: Y(mw), r: 9 }, g);
    const t = svgEl('text', { x: X(hour), y: Y(mw) - 22, 'text-anchor': 'middle' }, g);
    return { g, text: t };
  };
  const peak = marker(peakHour, without.series.load[peakHour], 's5-peak');
  const held = marker(heldHour, withG.series.grid[heldHour], 's5-held');
  peak.text.textContent = `${without.peakAfterMw.toFixed(1)} MW`;
  held.text.textContent = `${withG.peakAfterMw.toFixed(1)} MW`;

  // The animated state. Every value is a number so gsap can tween it.
  const s = { cursor: CHART_HOURS.from, forecast: 0, peakLabel: 0, grid: 0, heldLabel: 0, alarm: 0 };
  let tween = null;

  function render() {
    const cx = X(s.cursor);
    clipA.setAttribute('width', cx.toFixed(1));
    clipB.setAttribute('x', cx.toFixed(1));
    clipB.setAttribute('width', (W - cx).toFixed(1));
    cursorLine.setAttribute('x1', cx.toFixed(1));
    cursorLine.setAttribute('x2', cx.toFixed(1));
    cursorText.setAttribute('x', cx.toFixed(1));
    cursorText.textContent = hhmm(s.cursor);
    forecast.style.opacity = String(s.forecast);
    gap.style.opacity = String(s.grid);
    grid.style.opacity = String(s.grid);
    load.style.opacity = String(1 - 0.6 * s.grid);                 // with GridNova the original load fades to a reference line
    load.style.strokeWidth = String(lerp(6, 9, s.alarm));
    peak.g.style.opacity = String(s.peakLabel * (s.cursor >= peakHour || s.forecast > 0 ? 1 : 0));
    peak.g.classList.toggle('is-alarm', s.alarm > 0.5);
    held.g.style.opacity = String(s.heldLabel);
  }
  render();

  return {
    set(target) { tween?.kill(); Object.assign(s, target); render(); },
    /** Tween the state to `target`. `from` (optional) first jumps part of it back, which replays the afternoon. */
    tweenTo(target, { duration = 0.8, from } = {}) {
      tween?.kill();
      if (from) Object.assign(s, from);
      tween = gsap.to(s, { ...target, duration, ease: 'power2.inOut', onUpdate: render, onComplete: () => { tween = null; } });
      return tween;
    },
    kill() { tween?.kill(); tween = null; },
    state: s,
  };
}
