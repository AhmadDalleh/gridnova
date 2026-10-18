import { gsap } from 'gsap';
import './scene.css';
import { simulate } from '../../model/simulate.js';
import { PEAK_WINDOW } from '../../model/constants.js';
import { revealScene, hideScene } from '../../ui/reveal.js';
import { splitWords } from '../../ui/split.js';
import { countTo } from '../../ui/count-up.js';
import { fmtAed } from '../../ui/format.js';
import { pressureFigures } from './figures.js';
import { createCurveChart } from './chart.js';
import { template } from './template.js';

// Scene 02: the pressure. The curve and all four counters come from simulate({0, 0}), the "no GridNova" baseline.
//
//   enter()     quick frame reveal + title words rise (fits the standard transition budget)
//   activate()  the data choreography: the curve draws left to right with the clock, the peak window lights up
//               at 14:00, counters count up as the pen reaches them. It always starts here, whether we arrived by
//               transition A (the Core has just landed on the peak), by a standard transition, or by hash on load.
//   exit()      stops a running draw and fades out
const DRAW = 1.8;                                   // seconds for 00:00 -> 24:00
const hh = (h) => `${String(h).padStart(2, '0')}:00`;

let el;
let ctx;
let figures;
let chart;
let stats;                                          // [{ key, value, format, card, valueEl }]
let titleWords;
let scope;
let choreo;
let prepared = false;                               // enter() rewound the visuals; activate() plays them
const view = { hour: null, interactive: false };    // hover/focus readout (scene-local UI state)

const canAnimate = () => {
  const { paused, reducedMotion } = ctx.store.get();
  return !paused && !reducedMotion;
};

// ---- states -----------------------------------------------------------------------------------------------
function showFinal() {
  chart.setProgress(1);
  gsap.set(chart.band, { autoAlpha: 1, opacity: 1 });
  stats.forEach((s) => {
    gsap.set(s.card, { autoAlpha: 1, y: 0 });
    countTo(s.valueEl, s.value, { format: s.format, immediate: true });
  });
  gsap.set(titleWords, { yPercent: 0 });
  view.interactive = true;
  ctx.core.show();
}

function hideAll() {
  chart.setProgress(0);
  gsap.set(chart.band, { autoAlpha: 0 });
  stats.forEach((s) => {
    gsap.set(s.card, { autoAlpha: 0, y: 24 });
    countTo(s.valueEl, 0, { format: s.format, immediate: true });
  });
  view.interactive = false;
}

// ---- readout (hover / keyboard focus) ----------------------------------------------------------------------
function renderHover() {
  chart.setHover(view.hour);
  if (view.hour === null) return;
  const svg = chart.curve.ownerSVGElement;
  svg.setAttribute('aria-valuenow', String(view.hour));
  svg.setAttribute('aria-valuetext', `${hh(view.hour)}, ${chart.valueAt(view.hour).toFixed(1)} megawatts`);
}

function setHour(hour) {
  view.hour = hour;
  renderHover();
}

const onPointerMove = (e) => { if (view.interactive) setHour(chart.hourFromEvent(e)); };
const onPointerLeave = () => { if (document.activeElement !== chart.curve.ownerSVGElement) setHour(null); };
const onFocus = () => { if (view.interactive) setHour(view.hour ?? 15); };
const onBlur = () => setHour(null);

function onKeyDown(e) {
  if (!view.interactive) return;
  const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (step !== undefined) setHour(Math.min(24, Math.max(0, (view.hour ?? 15) + step)));
  else if (e.key === 'Home') setHour(0);
  else if (e.key === 'End') setHour(24);
  else if (e.key === 'Escape') e.currentTarget.blur();
  else return;
  e.preventDefault();
}

// ---- the data choreography (about 2.5 s) ---------------------------------------------------------------------
// 0.0            curve draws (1.8 s, linear) with the pen and the 00:00 -> 24:00 clock
// pen at 14:00   peak window fades in and pulses once; the "3 h" counter appears and counts up
// pen at 15:00   the Core (the peak marker) pulses; "10 MW" and "100 %" appear and count up
// 1.8 (24:00)    the demand-charge counter appears and counts up (0.7 s)
function playDraw() {
  const progress = { p: 0 };
  const at = (hour) => DRAW * chart.frac(hour);
  const showStat = (key, t) => {
    const s = stats.find((x) => x.key === key);
    choreo.fromTo(s.card, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, t);
    choreo.add(countTo(s.valueEl, s.value, { format: s.format, duration: 0.7 }), t);
  };

  choreo = gsap.timeline();
  choreo.to(progress, {
    p: 1, duration: DRAW, ease: 'none',
    onUpdate: () => chart.setProgress(progress.p),
    onComplete: () => { view.interactive = true; },
  }, 0);

  const t14 = at(PEAK_WINDOW.from);
  const t15 = at(figures.peakHour);
  choreo
    .fromTo(chart.band, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t14)
    .to(chart.band, { opacity: 0.45, duration: 0.25, yoyo: true, repeat: 1, ease: 'sine.inOut' }, t14 + 0.3);   // the pulse
  showStat('window', t14);
  choreo.add(ctx.core.pulse(), t15);
  showStat('peak', t15);
  showStat('share', t15 + 0.15);
  showStat('demand', DRAW);
}

// ---- lifecycle --------------------------------------------------------------------------------------------
export default {
  id: 'pressure',
  title: 'The pressure',
  coreAnchor: '[data-core-anchor]',

  mount(root, context) {
    el = root;
    ctx = context;
    const baseline = simulate({ solarMw: 0, batteryMwh: 0 });       // the "before": no solar, no battery
    figures = pressureFigures(baseline);
    const defs = [
      { key: 'window', label: 'Peak exposure', value: figures.windowHours, format: (n) => `${Math.round(n)} h`, sub: `${hh(PEAK_WINDOW.from)}–${hh(PEAK_WINDOW.to)}` },
      { key: 'peak', label: 'Illustrative peak', value: figures.peakMw, format: (n) => `${Math.round(n)} MW`, sub: `campus load at ${hh(figures.peakHour)}` },
      { key: 'share', label: 'Bought from the grid', value: figures.gridSharePct, format: (n) => `${Math.round(n)} %`, sub: 'of the peak, in real time' },
      { key: 'demand', label: 'Demand charges', value: figures.demandChargeAed, format: fmtAed, sub: 'per year, illustrative' },
    ];
    el.innerHTML = template(figures.peakHour, figures.peakMw, defs);
    chart = createCurveChart(el.querySelector('#s2-chart'), baseline.series.load);
    stats = defs.map((d) => {
      const card = el.querySelector(`[data-stat="${d.key}"]`);
      return { ...d, card, valueEl: card.querySelector('.s2-stat-value') };
    });
    titleWords = splitWords(el.querySelector('.s2-title'));
  },

  enter(dir) {
    const { reducedMotion } = ctx.store.get();
    view.hour = null;
    chart.setHover(null);
    const animate = canAnimate();
    if (animate) hideAll();
    else showFinal();
    prepared = animate;
    const tl = revealScene(el, reducedMotion, dir);
    if (animate) {
      // Title words rise inside the frame reveal (0.47 s), so transition A has the frame in place before the Core lands.
      tl.fromTo(titleWords, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: 'power3.out', stagger: 0.04 }, 0.05);
    }
    return tl;
  },

  exit(dir) {
    choreo?.kill();                                  // leave mid-draw: stop cleanly (enter() rewinds everything next time)
    choreo = null;
    prepared = false;
    ctx.core.show();                                 // a pulse cut short must not leave the Core swollen
    return hideScene(el, ctx.store.get().reducedMotion, dir);
  },

  activate() {
    const svg = chart.curve.ownerSVGElement;
    scope = ctx.motion.scope();
    scope.listen(svg, 'pointermove', onPointerMove);
    scope.listen(svg, 'pointerleave', onPointerLeave);
    scope.listen(svg, 'focus', onFocus);
    scope.listen(svg, 'blur', onBlur);
    scope.listen(svg, 'keydown', onKeyDown);

    if (prepared) {
      prepared = false;
      if (canAnimate()) playDraw();
      else showFinal();                              // paused/reduced since enter(): finished state at once
    }
  },

  deactivate() {
    scope?.dispose();
    choreo?.kill();
    choreo = null;
    view.hour = null;
    chart.setHover(null);
  },

  reset() {
    choreo?.kill();
    choreo = null;
    prepared = false;
    view.hour = null;
  },
};
