import { gsap } from 'gsap';
import './scene.css';
import { PRESETS } from '../../model/constants.js';
import { matchPreset } from '../../model/presets.js';
import { glowFromReduction } from '../../ui/format.js';
import { revealScene, hideScene } from '../../ui/reveal.js';
import { template } from './template.js';
import { createChart, toShape, emptyShape } from './chart.js';
import { createKpis } from './kpis.js';

// Scene 07: the simulator. Pattern: handlers change store.sim -> render() reads selectSim() and updates the DOM.
// Inputs live in the store (they survive leaving and coming back); this file only keeps view state.
let el;
let ctx;
let n;                                   // cached DOM nodes
let chart;
let kpis;
let scope;
let unsubscribe;
let choreo;
let lastSim;
let entrancePrepared = false;            // enter() zeroed the visuals; activate() plays them up
const view = { drawerOpen: false, hoverHour: null };

const canAnimate = () => {
  const { paused, reducedMotion } = ctx.store.get();
  return !paused && !reducedMotion;
};
const hh = (h) => `${String(h).padStart(2, '0')}:00`;

// ---- render: state -> DOM -------------------------------------------------------------------------
function nextShape(result) {
  return toShape(result, glowFromReduction(result.peakReductionPct));
}

function renderControls(sim) {
  n.solar.value = sim.solarMw;
  n.battery.value = sim.batteryMwh;
  n.outSolar.textContent = `${sim.solarMw.toFixed(1)} MW`;
  n.outBattery.textContent = `${sim.batteryMwh} MWh`;
  n.solar.setAttribute('aria-valuetext', `${sim.solarMw.toFixed(1)} megawatts`);
  n.battery.setAttribute('aria-valuetext', `${sim.batteryMwh} megawatt hours`);
  n.dayBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.day === sim.dayType)));
  n.presetBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === sim.preset)));
  n.heat.hidden = sim.dayType !== 'heatwave';
}

function renderHover(result) {
  if (view.hoverHour === null) return chart.setHover(null);
  const h = view.hoverHour;
  const { load, grid } = result.series;
  return chart.setHover(h, `${hh(h)} · load ${load[h].toFixed(1)} · grid ${grid[h].toFixed(1)} MW`);
}

function renderDrawer() {
  n.drawer.hidden = !view.drawerOpen;
  n.drawerBtn.setAttribute('aria-expanded', String(view.drawerOpen));
}

function render({ animate }) {
  renderControls(ctx.store.get().sim);
  const result = ctx.selectSim();
  const tween = animate && canAnimate();
  if (tween) chart.morphTween(nextShape(result));          // chart morphs between results; replaces a running tween
  else chart.set(nextShape(result));
  kpis.update(result, { animate: tween });                 // KPI numbers count to their new values
  renderHover(result);
}

// ---- handlers: change state only --------------------------------------------------------------------
function setSim(patch) {
  ctx.store.set({ sim: { ...ctx.store.get().sim, ...patch } });
}

function onSlider() {
  const solarMw = Number(n.solar.value);
  const batteryMwh = Number(n.battery.value);
  setSim({ solarMw, batteryMwh, preset: matchPreset(solarMw, batteryMwh) });
}

function setDrawer(open, focus = false) {
  view.drawerOpen = open;
  renderDrawer();
  if (focus) (open ? n.closeBtn : n.drawerBtn).focus();
}

function onClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;
  const byKeyboard = e.detail === 0;
  if (btn.dataset.preset) setSim({ ...PRESETS[btn.dataset.preset], preset: btn.dataset.preset });
  else if (btn.dataset.day) setSim({ dayType: btn.dataset.day });
  else if (btn === n.drawerBtn) setDrawer(!view.drawerOpen, byKeyboard);
  else if (btn === n.closeBtn) setDrawer(false, byKeyboard);
  if (!byKeyboard) btn.blur();                // after a mouse click, arrow keys go back to scene navigation
}

function onKeyDown(e) {
  if (e.key !== 'Escape') return;
  if (view.drawerOpen) setDrawer(false, n.drawer.contains(document.activeElement));
  else if (el.contains(document.activeElement)) document.activeElement.blur();   // Esc releases a focused slider
}

function onHover(e) {
  view.hoverHour = chart.hourFromEvent(e);
  renderHover(ctx.selectSim());
}

function onLeave() {
  view.hoverHour = null;
  chart.setHover(null);
}

function onState(state) {
  if (state.sim === lastSim) return;          // only simulator inputs matter here
  lastSim = state.sim;
  render({ animate: true });
}

// ---- entrance choreography (runs from activate, never blocks navigation) ------------------------------
// 0.0 chart rises from the baseline (areas, lines, peak label and Core glow morph together, 1.0 s)
// 0.3 KPI cards fade up, staggered 0.08 s, each number counting up from 0 (0.9 s)  ->  done by ~1.6 s
function playEntrance() {
  const result = ctx.selectSim();
  choreo = gsap.timeline();
  choreo.add(chart.morphTween(nextShape(result), { duration: 1.0 }), 0);
  choreo.fromTo(kpis.cards, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.08 }, 0.3);
  kpis.update(result, { animate: true, duration: 0.9, delay: 0.3, stagger: 0.08 });
}

export default {
  id: 'simulator',
  title: 'Explore the design',
  coreAnchor: '[data-core-anchor]',

  mount(root, context) {
    el = root;
    ctx = context;
    el.innerHTML = template();
    const q = (sel) => el.querySelector(sel);
    n = {
      solar: q('#in-solar'), battery: q('#in-battery'), outSolar: q('#out-solar'), outBattery: q('#out-battery'),
      dayBtns: [...el.querySelectorAll('[data-day]')], presetBtns: [...el.querySelectorAll('[data-preset]')],
      heat: q('#heat-note'), svg: q('#s7-svg'),
      drawer: q('#s7-drawer'), drawerBtn: q('#btn-assumptions'), closeBtn: q('#btn-drawer-close'),
    };
    chart = createChart(n.svg, { onFrame: (shape) => ctx.core.setGlow(shape.glow) });
    kpis = createKpis(el);
  },

  // Quick reveal of the frame only (fits the standard transition budget). The data animates in activate().
  enter(dir) {
    const { paused, reducedMotion } = ctx.store.get();
    view.hoverHour = null;
    setDrawer(false);
    lastSim = ctx.store.get().sim;
    render({ animate: false });                              // start from the final, correct state
    entrancePrepared = !paused && !reducedMotion;
    if (entrancePrepared) {                                  // then rewind the visuals so activate() can play them up
      chart.set(emptyShape());
      kpis.zero();
      gsap.set(kpis.cards, { autoAlpha: 0, y: 24 });
    } else {
      gsap.set(kpis.cards, { autoAlpha: 1, y: 0 });
    }
    return revealScene(el, reducedMotion, dir);
  },

  exit(dir) {
    return hideScene(el, ctx.store.get().reducedMotion, dir);
  },

  activate() {
    scope = ctx.motion.scope();
    scope.listen(n.solar, 'input', onSlider);
    scope.listen(n.battery, 'input', onSlider);
    scope.listen(el, 'click', onClick);
    scope.listen(document, 'keydown', onKeyDown);
    scope.listen(n.svg, 'pointermove', onHover);
    scope.listen(n.svg, 'pointerleave', onLeave);
    unsubscribe = ctx.store.subscribe(onState);
    lastSim = ctx.store.get().sim;

    if (entrancePrepared) {
      entrancePrepared = false;
      if (canAnimate()) playEntrance();
      else {                                                 // paused / reduced since enter(): show the final state at once
        render({ animate: false });
        gsap.set(kpis.cards, { autoAlpha: 1, y: 0 });
      }
    }
  },

  deactivate() {
    scope?.dispose();
    unsubscribe?.();
    choreo?.kill();
    chart.kill();
    kpis.kill();
    view.hoverHour = null;
    setDrawer(false);
    ctx.core.setGlow(0.7);                                   // hand the Core back to the default glow
  },

  // "Replay the story": visuals and view state back to the start. Simulator inputs are NOT touched.
  reset() {
    choreo?.kill();
    chart.set(emptyShape());
    kpis.zero();
    view.hoverHour = null;
    setDrawer(false);
  },
};
