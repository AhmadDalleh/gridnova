import { gsap } from 'gsap';
import './scene.css';
import { revealScene, hideScene } from '../../ui/reveal.js';
import { splitWords } from '../../ui/split.js';
import { canAnimate } from '../../ui/motion-state.js';
import { setNow } from '../../ui/set-now.js';
import { countTo } from '../../ui/count-up.js';
import { svgEl, linePath } from '../../ui/svg.js';
import { fmtAed, fmtYears } from '../../ui/format.js';
import { businessFigures, cashFigures } from './figures.js';
import { template } from './template.js';

// Scene 08: the business case, drawn from the LIVE simulator state (selectSim()) every time the scene is entered.
// No state of its own except which bar/card is hovered (the formula bar). Handlers: hover/focus -> showFormula().
//
//   enter()     quick frame reveal; data is re-read from the simulator and rewound to zero
//   activate()  cards fade up and count up (0.0) · waterfall bars grow one after another (0.5 + 0.5 s each) ·
//               the cash-flow line draws (0.6, 1.2 s) · the payback marker drops in with its counter (1.9)
const HINT = 'Hover or focus a bar or a number to see its formula.';
const WF = { w: 820, top: 30, base: 300, barW: 140, gap: 40, left: 70 };
const CF = { left: 80, right: 790, top: 30, base: 300 };

let el;
let ctx;
let n;
let fig;                                            // businessFigures() of the current result
let cash;
let titleWords;
let scope;
let choreo;
let prepared = false;
let cardsLanded = false;                            // transition C already delivered the card numbers
const wf = { bars: [], k: [] };                     // per-bar progress 0..1
const cf = { line: null, len: 0, zero: null, pay: null, payText: null, payCircle: null, ticks: null };
const kAll = (v) => Object.fromEntries(fig.bars.map((_, i) => [i, v]));   // plain object: gsap would treat an array as a list of targets
const countersOn = () => [...n.cards.map((c) => c.value)];

// ---- waterfall ---------------------------------------------------------------------------------------------------
const wy = (v) => WF.base - (v / fig.top) * (WF.base - WF.top);
function renderBars() {
  fig.bars.forEach((b, i) => {
    const k = wf.k[i];
    const end = b.from + (b.to - b.from) * k;          // the bar grows from its start edge towards its end value
    const y1 = wy(Math.max(b.from, end));
    const y2 = wy(Math.min(b.from, end));
    const g = wf.bars[i];
    g.rect.setAttribute('y', y1.toFixed(1));
    g.rect.setAttribute('height', Math.max(y2 - y1, 0).toFixed(1));
    g.val.setAttribute('y', (y1 - 10).toFixed(1));
    g.val.style.opacity = String(k);
  });
}

function buildWaterfall() {
  const svg = n.wfSvg;
  svg.replaceChildren();
  svgEl('line', { x1: 40, x2: WF.w, y1: WF.base, y2: WF.base, class: 's8-axis' }, svg);
  wf.bars = fig.bars.map((b, i) => {
    const x = WF.left + i * (WF.barW + WF.gap);
    const g = svgEl('g', { class: `s8-bar ${b.kind}`, tabindex: 0, 'data-formula': b.formula, role: 'img', 'aria-label': `${b.label}: ${fmtAed(Math.abs(b.to - b.from))}. ${b.formula}` }, svg);
    const rect = svgEl('rect', { x, width: WF.barW, rx: 6 }, g);
    const val = svgEl('text', { x: x + WF.barW / 2, class: 's8-val' }, g);
    val.textContent = `${b.kind === 'coral' ? '−' : ''}${fmtAed(Math.abs(b.to - b.from))}`;
    svgEl('text', { x: x + WF.barW / 2, y: WF.base + 30, class: 's8-txt', 'text-anchor': 'middle' }, svg).textContent = b.label;
    return { rect, val };
  });
}

// ---- cash flow ---------------------------------------------------------------------------------------------------
function buildCash() {
  const svg = n.cfSvg;
  svg.replaceChildren();
  const x = (yr) => CF.left + (yr / 10) * (CF.right - CF.left);
  const y = (v) => CF.base - ((v - cash.min) / (cash.max - cash.min)) * (CF.base - CF.top);
  svgEl('line', { x1: CF.left, x2: CF.right, y1: y(0), y2: y(0), class: 's8-zero' }, svg);
  [0, 5, 10].forEach((yr) => { svgEl('text', { x: x(yr), y: CF.base + 36, class: 's8-txt', 'text-anchor': 'middle' }, svg).textContent = `Y${yr}`; });
  svgEl('text', { x: CF.left - 10, y: y(0) + 8, class: 's8-txt', 'text-anchor': 'end' }, svg).textContent = '0';
  const xs = cash.values.map((_, yr) => x(yr));
  cf.line = svgEl('path', { d: linePath(xs, cash.values.map(y)), class: 's8-cash' }, svg);
  cf.len = cf.line.getTotalLength();
  cf.line.style.strokeDasharray = String(cf.len);
  cf.pay = svgEl('g', { class: 's8-pay' }, svg);
  cf.payCircle = svgEl('circle', { cx: cash.paybackYears === null ? 0 : x(cash.paybackYears), cy: y(0), r: 12 }, cf.pay);
  cf.payText = svgEl('text', { x: cash.paybackYears === null ? 0 : x(cash.paybackYears), y: y(0) - 26 }, cf.pay);
  cf.pay.style.display = cash.paybackYears === null ? 'none' : '';
  cf.pay.setAttribute('tabindex', '0');
  cf.pay.setAttribute('data-formula', fig.cards.find((c) => c.key === 'payback').formula);
  svgEl('text', { x: CF.left + 10, y: CF.top + 6, class: 's8-txt' }, svg).textContent = cash.paybackYears === null ? 'No payback within 10 years' : '';
}

// ---- states ------------------------------------------------------------------------------------------------------
function load() {
  const r = ctx.selectSim();
  fig = businessFigures(r);
  cash = cashFigures(r);
  n.cards.forEach((c, i) => { c.el.querySelector('h3').textContent = fig.cards[i].label; c.el.dataset.formula = fig.cards[i].formula; c.value.dataset.target = String(fig.cards[i].value); });
  wf.k = kAll(0);
  buildWaterfall();
  buildCash();
}
function showFinal() {
  n.cards.forEach((c, i) => { const v = fig.cards[i].value; c.value.textContent = fig.cards[i].format(v); });
  setNow(n.cards.map((c) => c.el), { autoAlpha: 1, y: 0 });
  wf.k = kAll(1);
  renderBars();
  cf.line.style.strokeDashoffset = '0';
  cf.payText.textContent = fmtYears(cash.paybackYears);
  setNow(cf.pay, { autoAlpha: 1, y: 0 });
  setNow(titleWords, { yPercent: 0 });
  setNow(el, { autoAlpha: 1, x: 0 });
  ctx.core.show();
}
function showStart() {
  n.cards.forEach((c, i) => countTo(c.value, 0, { format: fig.cards[i].format, immediate: true }));
  n.cards.forEach((c, i) => { if (fig.cards[i].value === null) c.value.textContent = fig.cards[i].format(null); });
  setNow(n.cards.map((c) => c.el), { autoAlpha: 0, y: 24 });
  wf.k = kAll(0);
  renderBars();
  cf.line.style.strokeDashoffset = String(cf.len);
  setNow(cf.pay, { autoAlpha: 0 });
}

// ---- formula bar (hover / focus) -----------------------------------------------------------------------------------
const showFormula = (e) => {
  const t = e.target.closest?.('[data-formula]');
  if (t) n.formula.textContent = t.dataset.formula;
};
const hideFormula = (e) => {
  if (e.relatedTarget?.closest?.('[data-formula]')) return;
  n.formula.textContent = HINT;
};

export default {
  id: 'business-case',
  title: 'The business case',
  coreAnchor: '[data-core-anchor]',

  mount(root, context) {
    el = root;
    ctx = context;
    el.innerHTML = template();
    const q = (s) => el.querySelector(s);
    n = {
      cards: [...el.querySelectorAll('.s8-card')].map((c) => ({ el: c, value: c.querySelector('.s8-card-value') })),
      wfSvg: q('#s8-wf'), cfSvg: q('#s8-cf'), formula: q('.s8-formula'),
    };
    titleWords = splitWords(q('.s8-title'));
    load();
  },

  enter(dir, { composed = false } = {}) {
    const { reducedMotion } = ctx.store.get();
    load();                                           // always the current simulator state
    n.formula.textContent = HINT;
    const animate = canAnimate(ctx.store);
    if (animate) showStart(); else showFinal();
    prepared = animate;
    cardsLanded = false;
    if (composed && !reducedMotion) {                 // transition C: the KPI numbers fly into the cards; the rest fades in
      cardsLanded = true;
      n.cards.forEach((c, i) => { c.value.textContent = fig.cards[i].format(fig.cards[i].value); });
      setNow(n.cards.map((c) => c.el), { autoAlpha: 1, y: 0 });
      setNow(el, { x: 0 });
      const tl = gsap.timeline().fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power1.out' });
      return tl.fromTo(titleWords, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: 'power3.out', stagger: 0.04 }, 0.05);
    }
    const tl = revealScene(el, reducedMotion, dir);
    if (animate) tl.fromTo(titleWords, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: 'power3.out', stagger: 0.04 }, 0.05);
    return tl;
  },

  /** The card numbers that receive the KPI numbers flying in from scene 07 (and fly back to it). */
  flyPoints() {
    return n.cards.map((c) => c.value);
  },

  exit(dir, { composed = false } = {}) {
    if (choreo?.isActive() || prepared) { choreo?.kill(); countersOn().forEach((c) => c._countTween?.kill()); showFinal(); }
    choreo = null;
    prepared = false;
    if (composed) return gsap.to(el, { autoAlpha: 0, duration: 0.45, delay: 0.45, ease: 'power1.in' });
    return hideScene(el, ctx.store.get().reducedMotion, dir);
  },

  activate() {
    scope = ctx.motion.scope();
    ['pointerover', 'focusin'].forEach((t) => scope.listen(el, t, showFormula));
    ['pointerout', 'focusout'].forEach((t) => scope.listen(el, t, hideFormula));
    if (!prepared) return;
    prepared = false;
    if (!canAnimate(ctx.store)) { showFinal(); return; }
    choreo = gsap.timeline();
    if (!cardsLanded) choreo.to(n.cards.map((c) => c.el), { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.08 }, 0);
    n.cards.forEach((c, i) => {
      if (cardsLanded) return;
      if (fig.cards[i].value === null) c.value.textContent = fig.cards[i].format(null);        // payback "n/a": nothing to count
      else choreo.add(countTo(c.value, fig.cards[i].value, { format: fig.cards[i].format, duration: 0.9 }), 0.05 + i * 0.08);
    });
    fig.bars.forEach((_, i) => choreo.to(wf.k, { [i]: 1, duration: 0.5, ease: 'power2.out', onUpdate: renderBars }, 0.5 + i * 0.5));
    const draw = { v: cf.len };
    choreo.to(draw, { v: 0, duration: 1.2, ease: 'power1.inOut', onUpdate: () => { cf.line.style.strokeDashoffset = String(draw.v); } }, 0.6);
    const pay = { v: 0 };
    choreo.fromTo(cf.pay, { autoAlpha: 0, y: -40 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'bounce.out' }, 1.9);
    if (cash.paybackYears !== null) choreo.to(pay, { v: cash.paybackYears, duration: 0.8, onUpdate: () => { cf.payText.textContent = fmtYears(pay.v); } }, 1.9);
    choreo.add(ctx.core.pulse(), 1.9);
  },

  deactivate() {
    scope?.dispose();
    choreo?.kill();
    choreo = null;
  },

  reset() {
    choreo?.kill();
    choreo = null;
    prepared = false;
  },
};
