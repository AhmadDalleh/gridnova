import { gsap } from 'gsap';
import './scene.css';
import { DEFAULT_UI } from '../../model/constants.js';
import { revealScene, hideScene } from '../../ui/reveal.js';
import { splitWords } from '../../ui/split.js';
import { canAnimate } from '../../ui/motion-state.js';
import { setNow } from '../../ui/set-now.js';
import { createField, COLORS, ROUTES } from './particles.js';
import { template, CAPABILITIES } from './template.js';

// Scene 06: capability showcase. A canvas particle field (pool of <= 380 particles, see particles.js) driven by
// motion.loop(), and a Day / Night toggle whose state lives in store.ui.dayNight.
//
//   enter()     frame reveal (quick)
//   activate()  panels rise one by one, the field fades in (intensity 0 -> 1 over 1.2 s) and the loop starts
//   toggle      handler sets ui.dayNight -> render() redirects the particle mix, tints the sky, lights the panels
//   loop        step(dt) + draw(); it only runs while motion is allowed. Paused or reduced motion: ONE static frame,
//               redrawn when the mode changes. The loop is stopped in deactivate(), so a hidden scene costs nothing.
let el;
let ctx;
let n;
let canvas;
let g2d;
let field;
let titleWords;
let scope;
let unsubscribe;
let stopLoop;
let choreo;
let lastMode;
let prepared = false;
const fade = { intensity: 1 };                      // 0 = field invisible, 1 = full; tweened by the entrance

const ui = () => ctx.store.get().ui;

// ---- drawing ---------------------------------------------------------------------------------------------------
function draw() {
  if (!g2d) return;                                  // canvas unavailable: the labelled shapes and panels still tell the story
  g2d.clearRect(0, 0, canvas.width, canvas.height);
  g2d.globalCompositeOperation = 'lighter';          // overlapping particles add up to a glow
  field.particles.forEach((p) => {
    const [x, y, a] = field.position(p);
    g2d.globalAlpha = a * fade.intensity * 0.9;
    g2d.fillStyle = COLORS[ROUTES[p.route].color];
    g2d.beginPath();
    g2d.arc(x, y, p.size, 0, Math.PI * 2);
    g2d.fill();
  });
  g2d.globalAlpha = 1;
}

// ---- render: state -> DOM ------------------------------------------------------------------------------------
function render({ animate }) {
  const mode = ui().dayNight;
  const changed = lastMode !== undefined && lastMode !== mode;
  lastMode = mode;
  el.dataset.mode = mode;
  n.modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  CAPABILITIES.forEach((c, i) => {
    n.panels[i].classList.toggle('is-active', c.active.includes(mode));
    n.states[i].textContent = c[mode];
  });
  field.setMode(mode);
  if (!ctx.motion.running()) draw();                 // no loop is drawing for us: paint the new mix once
  if (animate && changed) ctx.core.pulse();
}

// ---- handlers: change state only -------------------------------------------------------------------------------
function onClick(e) {
  const btn = e.target.closest('[data-mode]');
  if (!btn) return;
  if (e.detail > 0) btn.blur();                      // after a mouse click, arrow keys go back to scene navigation
  ctx.store.set({ ui: { ...ui(), dayNight: btn.dataset.mode } });
}
function onState(state) {
  if (state.ui.dayNight !== lastMode) render({ animate: canAnimate(ctx.store) });
}

function settle() {
  fade.intensity = 1;
  setNow([...n.panels, n.controls], { autoAlpha: 1, y: 0 });
  setNow(titleWords, { yPercent: 0 });
  setNow(el, { autoAlpha: 1, x: 0 });
  ctx.core.show();
}

export default {
  id: 'capability',
  title: 'Capability showcase',
  coreAnchor: '[data-core-anchor]',

  mount(root, context) {
    el = root;
    ctx = context;
    el.innerHTML = template();
    const q = (s) => el.querySelector(s);
    canvas = q('#s6-canvas');
    g2d = canvas.getContext('2d');
    field = createField({ mode: DEFAULT_UI.dayNight });
    n = {
      controls: q('.s6-controls'),
      modeBtns: [...el.querySelectorAll('[data-mode]')],
      panels: [...el.querySelectorAll('.s6-panel')],
      states: [...el.querySelectorAll('.s6-panel-state')],
    };
    titleWords = splitWords(q('.s6-title'));
    draw();
  },

  enter(dir) {
    const { reducedMotion } = ctx.store.get();
    lastMode = undefined;
    render({ animate: false });
    const animate = canAnimate(ctx.store);
    if (animate) {
      fade.intensity = 0;
      setNow([...n.panels, n.controls], { autoAlpha: 0, y: 24 });
    } else settle();
    prepared = animate;
    const tl = revealScene(el, reducedMotion, dir);
    if (animate) tl.fromTo(titleWords, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: 'power3.out', stagger: 0.04 }, 0.05);
    return tl;
  },

  exit(dir) {
    if (choreo?.isActive() || prepared) { choreo?.kill(); settle(); draw(); }    // interrupted entrance: snap to the settled look
    choreo = null;
    prepared = false;
    return hideScene(el, ctx.store.get().reducedMotion, dir);
  },

  // 0.0 toggle and the three panels rise (0.12 s apart)   0.0 the field fades in over 1.2 s while the loop runs
  activate() {
    scope = ctx.motion.scope();
    scope.listen(el, 'click', onClick);
    unsubscribe = ctx.store.subscribe(onState);
    stopLoop = ctx.motion.loop((now, dt) => { field.step(dt); draw(); });
    if (prepared) {
      prepared = false;
      if (canAnimate(ctx.store)) {
        choreo = gsap.timeline();
        choreo.to([n.controls, ...n.panels], { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.12 }, 0);
        choreo.to(fade, { intensity: 1, duration: 1.2, ease: 'power1.inOut' }, 0);
      } else settle();
    }
    draw();
  },

  deactivate() {
    scope?.dispose();
    unsubscribe?.();
    stopLoop?.();
    stopLoop = null;
    choreo?.kill();
    choreo = null;
  },

  reset() {
    choreo?.kill();
    choreo = null;
    prepared = false;
    const current = ui();
    if (current.dayNight !== DEFAULT_UI.dayNight) ctx.store.set({ ui: { ...current, dayNight: DEFAULT_UI.dayNight } });
  },
};
