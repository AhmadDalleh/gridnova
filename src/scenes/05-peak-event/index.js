import { gsap } from 'gsap';
import './scene.css';
import { DEFAULT_UI } from '../../model/constants.js';
import { revealScene, hideScene } from '../../ui/reveal.js';
import { splitWords } from '../../ui/split.js';
import { canAnimate } from '../../ui/motion-state.js';
import { setNow } from '../../ui/set-now.js';
import { eventFigures, stageView, stageDetail, outcomeFor, miniState, STAGE_COUNT, CHART_HOURS } from './figures.js';
import { createEventChart } from './chart.js';
import { createMini } from './mini.js';
import { template } from './template.js';

// Scene 05: a peak event. State lives in store.ui.eventStage (1-5) and store.ui.eventMode ('with' | 'without').
// Everything on screen is derived from that pair plus two model runs (figures.js): handlers change state, render() draws it.
//
//   enter()     frame reveal; the stage and mode go back to 01 / With (every visit is the story from its start)
//   activate()  the chart's clock advances from 08:00 to 13:42 (stage 01), the stage rail and the side panel fade up
//   stage click the chart tweens to that stage's view (cursor, forecast, GridNova line); the mini diagram relights;
//               the Core pulses on each With-GridNova step
//   mode toggle the same afternoon replays from 08:00, so the difference is visible as it unfolds
//   Play        steps through stages 1-5, 1.8 s apart; any manual click stops it
const STEP_SECONDS = 1.8;
const START = { cursor: CHART_HOURS.from, forecast: 0, peakLabel: 0, grid: 0, heldLabel: 0, alarm: 0 };

let el;
let ctx;
let n;
let figures;
let chart;
let mini;
let titleWords;
let scope;
let unsubscribe;
let choreo;
let playTl;
let last;                                           // { stage, mode } last rendered
let replayNext = false;                             // the next render replays the afternoon from the start
let prepared = false;

const ui = () => ctx.store.get().ui;
const setUi = (patch) => ctx.store.set({ ui: { ...ui(), ...patch } });

// ---- render: state -> DOM ------------------------------------------------------------------------------------
function render({ animate }) {
  const { eventStage: stage, eventMode: mode } = ui();
  const view = stageView(stage, mode);
  const changed = last && last.stage !== stage;
  last = { stage, mode };

  n.stageBtns.forEach((b) => {
    const s = Number(b.dataset.stage);
    b.setAttribute('aria-pressed', String(s === stage));
    b.querySelector('.s5-stage-detail').textContent = stageDetail(s, mode, figures);
  });
  n.modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));

  const { cursor, forecast, peakLabel, grid, heldLabel, alarm } = view;
  const target = { cursor, forecast, peakLabel, grid, heldLabel, alarm };
  if (animate) {
    if (replayNext) chart.tweenTo(target, { duration: 1.8, from: START });
    else chart.tweenTo(target, { duration: 0.8 });
  } else chart.set(target);
  replayNext = false;

  mini.render(miniState(stage, mode));
  n.outcomeEl.dataset.outcome = mode;
  const o = outcomeFor(mode, figures);
  n.outcomeLabel.textContent = o.label;
  n.outcomeValue.textContent = o.value;
  n.outcomeCaption.textContent = o.caption;
  n.outcomeAvoided.textContent = o.avoided;
  if (animate) gsap.to(n.outcomeEl, { autoAlpha: view.outcome ? 1 : 0, duration: 0.4 });
  else setNow(n.outcomeEl, { autoAlpha: view.outcome ? 1 : 0 });

  if (animate && changed && mode === 'with') ctx.core.pulse();      // the Core beats on every dispatch-side step
}

// ---- handlers: change state only ------------------------------------------------------------------------------
function stopPlay() {
  playTl?.kill();
  playTl = null;
}
function play() {
  stopPlay();
  if (!canAnimate(ctx.store)) { setUi({ eventStage: STAGE_COUNT }); return; }    // paused / reduced: straight to the end
  setUi({ eventStage: 1 });
  playTl = gsap.timeline();
  for (let s = 2; s <= STAGE_COUNT; s++) playTl.call(() => setUi({ eventStage: s }), null, (s - 1) * STEP_SECONDS);
}
function onClick(e) {
  const stageBtn = e.target.closest('[data-stage]');
  const modeBtn = e.target.closest('[data-mode]');
  const playBtn = e.target.closest('#s5-play');
  if (e.detail > 0) e.target.closest('button')?.blur();           // after a mouse click, arrow keys go back to scene navigation
  if (stageBtn) { stopPlay(); setUi({ eventStage: Number(stageBtn.dataset.stage) }); }
  else if (modeBtn) { stopPlay(); replayNext = true; setUi({ eventMode: modeBtn.dataset.mode }); }
  else if (playBtn) play();
}
function onState(state) {
  const { eventStage, eventMode } = state.ui;
  if (last && last.stage === eventStage && last.mode === eventMode) return;
  render({ animate: canAnimate(ctx.store) });
}

// ---- states ------------------------------------------------------------------------------------------------------
function settle() {
  setNow([n.rail, n.side, n.controls], { autoAlpha: 1, y: 0 });
  setNow(titleWords, { yPercent: 0 });
  setNow(el, { autoAlpha: 1, x: 0 });
  ctx.core.show();
}

export default {
  id: 'peak-event',
  title: 'A peak event',
  coreAnchor: '[data-core-anchor]',

  mount(root, context) {
    el = root;
    ctx = context;
    figures = eventFigures();
    el.innerHTML = template();
    const q = (s) => el.querySelector(s);
    chart = createEventChart(q('#s5-chart'), { without: figures.without, withG: figures.with, peakHour: figures.peakHour, heldHour: figures.heldHour });
    mini = createMini(q('#s5-mini'));
    n = {
      rail: q('.s5-rail'), side: q('.s5-side'), controls: q('.s5-controls'),
      stageBtns: [...el.querySelectorAll('[data-stage]')], modeBtns: [...el.querySelectorAll('[data-mode]')],
      outcomeEl: q('.s5-outcome'), outcomeLabel: q('.s5-outcome-label'), outcomeValue: q('.s5-outcome-value'),
      outcomeCaption: q('.s5-outcome-caption'), outcomeAvoided: q('.s5-outcome-avoided'),
    };
    titleWords = splitWords(q('.s5-title'));
  },

  enter(dir) {
    const { reducedMotion } = ctx.store.get();
    stopPlay();
    last = null;
    replayNext = false;
    setUi({ eventStage: DEFAULT_UI.eventStage, eventMode: DEFAULT_UI.eventMode });
    render({ animate: false });
    const animate = canAnimate(ctx.store);
    if (animate) {                                              // rewind: the chart's clock starts at 08:00
      chart.set(START);
      setNow([n.rail, n.side, n.controls], { autoAlpha: 0, y: 24 });
    } else settle();
    prepared = animate;
    const tl = revealScene(el, reducedMotion, dir);
    if (animate) tl.fromTo(titleWords, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: 'power3.out', stagger: 0.04 }, 0.05);
    return tl;
  },

  exit(dir) {
    stopPlay();
    chart.kill();
    if (choreo?.isActive() || prepared) { choreo?.kill(); settle(); render({ animate: false }); }
    choreo = null;
    prepared = false;
    return hideScene(el, ctx.store.get().reducedMotion, dir);
  },

  // 0.0 controls, rail and side panel fade up (staggered)   0.2 the chart's clock runs 08:00 -> 13:42 and stage 01 is on
  activate() {
    scope = ctx.motion.scope();
    scope.listen(el, 'click', onClick);
    unsubscribe = ctx.store.subscribe(onState);
    if (!prepared) return;
    prepared = false;
    if (!canAnimate(ctx.store)) { settle(); return; }
    choreo = gsap.timeline();
    choreo.to([n.controls, n.rail, n.side], { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.12 }, 0);
    choreo.add(() => {
      const view = stageView(ui().eventStage, ui().eventMode);
      chart.tweenTo({ cursor: view.cursor, forecast: view.forecast, peakLabel: view.peakLabel, grid: view.grid, heldLabel: view.heldLabel, alarm: view.alarm }, { duration: 1.4 });
    }, 0.2);
  },

  deactivate() {
    scope?.dispose();
    unsubscribe?.();
    stopPlay();
    choreo?.kill();
    choreo = null;
    chart.kill();
  },

  reset() {
    stopPlay();
    choreo?.kill();
    choreo = null;
    prepared = false;
    replayNext = false;
    setUi({ eventStage: DEFAULT_UI.eventStage, eventMode: DEFAULT_UI.eventMode });
  },
};
