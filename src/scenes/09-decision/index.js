import { gsap } from 'gsap';
import './scene.css';
import { revealScene, hideScene } from '../../ui/reveal.js';
import { splitWords } from '../../ui/split.js';
import { canAnimate } from '../../ui/motion-state.js';
import { setNow } from '../../ui/set-now.js';
import { svgEl } from '../../ui/svg.js';
import { DEFAULT_UI } from '../../model/constants.js';
import { PHASES, MILESTONES, RISKS, ASK, sizingLine } from './roadmap.js';

// Scene 09: roadmap and decision. State: store.ui.selectedPhase (detail panel). The ask shows the CURRENT simulator sizing.
//
//   enter()     quick frame reveal; sizing line re-read from the simulator
//   activate()  the timeline line draws (0.0, 1.0 s) · phases slide in along it (0.2, staggered) · milestones pop (0.9) ·
//               risks fade up (1.5) · the ask TYPES IN character by character (2.0, kinetic type) · buttons (3.6)
const LINE_W = 1290;
let el;
let ctx;
let n;
let titleWords;
let chars;
let scope;
let unsubscribe;
let choreo;
let last;
let prepared = false;
const ui = () => ctx.store.get().ui;

function render() {
  const id = ui().selectedPhase;
  last = id;
  const p = PHASES.find((x) => x.id === id);
  n.phases.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.phase === id)));
  n.hint.hidden = Boolean(p);
  n.body.hidden = !p;
  if (!p) return;
  n.dName.textContent = `Phase ${p.n} · ${p.name}`;
  n.dWhen.textContent = `${p.when} · ${p.cost}`;
  n.dScope.textContent = p.scope;
  n.dExit.textContent = p.exit;
  n.dRisk.textContent = p.risk;
}

function onClick(e) {
  if (e.detail > 0) e.target.closest('button')?.blur();     // after a mouse click, arrow keys go back to scene navigation
  const phase = e.target.closest('[data-phase]');
  if (phase) { ctx.store.set({ ui: { ...ui(), selectedPhase: ui().selectedPhase === phase.dataset.phase ? null : phase.dataset.phase } }); return; }
  if (e.target.closest('.s9-replay')) ctx.nav.replay();
  else if (e.target.closest('.s9-revisit')) ctx.nav.goTo(6);
}
const onKey = (e) => { if (e.key === 'Escape' && ui().selectedPhase) ctx.store.set({ ui: { ...ui(), selectedPhase: null } }); };
const onState = (s) => { if (s.ui.selectedPhase !== last) render(); };

// The ask: each character in its own span so it can be revealed one by one; the whole sentence stays the accessible name.
function splitChars(node, text) {
  node.setAttribute('aria-label', text);
  node.textContent = '';
  const out = [];
  text.split(' ').forEach((word, i) => {
    if (i) node.append(' ');
    const w = document.createElement('span');          // words never break in the middle: only the spaces between them can wrap
    w.className = 'word';
    [...word].forEach((c) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = c;
      w.append(s);
      out.push(s);
    });
    node.append(w);
  });
  return out;
}

function settle() {
  n.line.style.strokeDashoffset = '0';
  setNow([...n.phases, ...n.ms, ...n.risks, ...chars, n.sizing, n.btns], { autoAlpha: 1, x: 0, y: 0, scale: 1 });
  setNow(titleWords, { yPercent: 0 });
  setNow(el, { autoAlpha: 1, x: 0 });
  ctx.core.show();
}
function rewind() {
  n.line.style.strokeDashoffset = String(n.len);
  setNow(n.phases, { autoAlpha: 0, x: -40 });
  setNow(n.ms, { autoAlpha: 0, scale: 0.3, transformOrigin: '50% 50%' });
  setNow(n.risks, { autoAlpha: 0, y: 20 });
  setNow([...chars, n.sizing, n.btns], { autoAlpha: 0 });
}

export default {
  id: 'decision',
  title: 'Roadmap & decision',
  coreAnchor: '[data-core-anchor]',

  mount(root, context) {
    el = root;
    ctx = context;
    const total = PHASES.reduce((a, p) => a + p.width, 0);
    el.innerHTML = `
      <header class="s9-head"><p class="eyebrow">09 · Roadmap &amp; decision <span class="tag">Illustrative</span></p>
        <h1 class="s9-title">Start with a bounded decision.</h1></header>
      <section class="s9-timeline" aria-label="Roadmap">
        <div class="s9-phases">${PHASES.map((p) => `<button type="button" class="s9-phase" data-phase="${p.id}" aria-pressed="false" style="width:${(p.width / total) * LINE_W}px"><b>${p.n} · ${p.name}</b><span>${p.when}</span><em>${p.cost}</em></button>`).join('')}</div>
        <svg class="s9-line" width="${LINE_W}" height="90"></svg>
      </section>
      <aside class="s9-detail" aria-live="polite"><p class="s9-hint">Select a phase to see its scope, exit criteria and main risk.</p>
        <div class="s9-body" hidden><h2></h2><p class="s9-when"></p><dl><dt>Scope</dt><dd class="s9-scope"></dd><dt>Exit criteria</dt><dd class="s9-exit"></dd><dt>Main risk</dt><dd class="s9-risk-d"></dd></dl></div></aside>
      <ul class="s9-risks" aria-label="Risks and mitigations">${RISKS.map((r) => `<li class="s9-risk"><b>${r.name}</b>${r.fix}</li>`).join('')}</ul>
      <section class="s9-ask"><p class="s9-ask-label">The ask</p><p class="s9-ask-text"></p><p class="s9-sizing"></p>
        <div class="s9-ask-btns"><button type="button" class="s9-replay">Replay the story</button><button type="button" class="s9-revisit">Revisit the simulator</button></div></section>
      <div class="s9-core-anchor" data-core-anchor></div>`;
    const q = (s) => el.querySelector(s);
    const svg = q('.s9-line');
    const line = svgEl('path', { d: `M4 20 H${LINE_W - 4}`, class: 's9-line-path' }, svg);
    const ms = MILESTONES.map((m) => {
      const g = svgEl('g', { class: 's9-ms', transform: `translate(${4 + m.at * (LINE_W - 8)} 20)` }, svg);
      svgEl('circle', { r: 11 }, g);
      const anchor = m.at === 0 ? 'start' : m.at === 1 ? 'end' : 'middle';
      svgEl('text', { y: 50, 'text-anchor': anchor }, g).textContent = m.label;
      return g;
    });
    chars = splitChars(q('.s9-ask-text'), ASK.text);
    n = {
      phases: [...el.querySelectorAll('.s9-phase')], line, len: line.getTotalLength(), ms, risks: [...el.querySelectorAll('.s9-risk')],
      sizing: q('.s9-sizing'), btns: q('.s9-ask-btns'), hint: q('.s9-hint'), body: q('.s9-body'),
      dName: q('.s9-body h2'), dWhen: q('.s9-when'), dScope: q('.s9-scope'), dExit: q('.s9-exit'), dRisk: q('.s9-risk-d'),
    };
    line.style.strokeDasharray = String(n.len);
    titleWords = splitWords(q('.s9-title'));
  },

  enter(dir) {
    const { reducedMotion } = ctx.store.get();
    n.sizing.textContent = sizingLine(ctx.store.get().sim);
    render();
    const animate = canAnimate(ctx.store);
    if (animate) rewind(); else settle();
    prepared = animate;
    const tl = revealScene(el, reducedMotion, dir);
    if (animate) tl.fromTo(titleWords, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: 'power3.out', stagger: 0.04 }, 0.05);
    return tl;
  },

  exit(dir) {
    if (choreo?.isActive() || prepared) { choreo?.kill(); settle(); }
    choreo = null;
    prepared = false;
    return hideScene(el, ctx.store.get().reducedMotion, dir);
  },

  activate() {
    scope = ctx.motion.scope();
    scope.listen(el, 'click', onClick);
    scope.listen(document, 'keydown', onKey);
    unsubscribe = ctx.store.subscribe(onState);
    if (!prepared) return;
    prepared = false;
    if (!canAnimate(ctx.store)) { settle(); return; }
    const draw = { v: n.len };
    choreo = gsap.timeline();
    choreo.to(draw, { v: 0, duration: 1.0, ease: 'power1.inOut', onUpdate: () => { n.line.style.strokeDashoffset = String(draw.v); } }, 0);
    choreo.to(n.phases, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power2.out', stagger: 0.2 }, 0.2);
    choreo.to(n.ms, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(3)', stagger: 0.12 }, 0.9);
    choreo.to(n.risks, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.1 }, 1.5);
    choreo.to(chars, { autoAlpha: 1, duration: 0.05, stagger: 0.02 }, 2.0);
    choreo.to([n.sizing, n.btns], { autoAlpha: 1, duration: 0.4, stagger: 0.15 }, 2.0 + chars.length * 0.02);
    choreo.add(ctx.core.pulse(), 2.0);
  },

  deactivate() {
    scope?.dispose();
    unsubscribe?.();
    choreo?.kill();
    choreo = null;
  },

  reset() {
    choreo?.kill();
    choreo = null;
    prepared = false;
    if (ui().selectedPhase) ctx.store.set({ ui: { ...ui(), selectedPhase: DEFAULT_UI.selectedPhase } });
  },
};
