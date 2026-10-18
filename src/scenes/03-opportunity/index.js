import { gsap } from 'gsap';
import { setNow } from '../../ui/set-now.js';
import './scene.css';
import { simulate } from '../../model/simulate.js';
import { revealScene, hideScene } from '../../ui/reveal.js';
import { splitWords } from '../../ui/split.js';
import { canAnimate } from '../../ui/motion-state.js';
import { lerp } from '../../ui/lerp.js';
import { ZONES, zoneFigure } from './zones.js';
import { template } from './template.js';
import { createCampus, measureTops, CAMERA_FLAT, CAMERA_ISO } from './campus.js';

// Scene 03: the opportunity. An isometric campus built from CSS 3D; zones are selectable (state: store.ui.selectedZone).
//
//   enter()     quick frame reveal + title words (fits the standard transition budget). Arriving BACK from scene 04 by
//               the composed transition B, it instead pulls the camera out of the substation (reverse of the dive).
//   activate()  the camera move: the flat, far-away map tilts into perspective, the zones rise one after another,
//               zone names appear, outcome badges drop onto their zones, persona chips follow (about 3 s).
//   exit()      composed B: the camera dives into the substation (zoom about the Core) while the rest fades;
//               otherwise a standard fade. A running activate() is first snapped to its settled look.
const DIVE_ZOOM = 4.5;
const SUB = ZONES.find((z) => z.kind === 'battery');
const LIFT = 26;                                    // px a selected zone lifts

let el;
let ctx;
let n;                                              // cached nodes
let campus;
let titleWords;
let scope;
let unsubscribe;
let choreo;
let lastZone;
let prepared = false;                               // enter() rewound the visuals; activate() plays them
let peakMw;
const cam = { ...CAMERA_FLAT };                     // the camera numbers the choreography tweens

const frame = () => [n.head, n.card, n.personas];
const flyIn = () => [...n.chips, ...n.badges, ...n.personaItems, ...n.outcomes];

// ---- states -----------------------------------------------------------------------------------------------
function applyCamera(k) {
  Object.keys(cam).forEach((key) => { cam[key] = lerp(CAMERA_FLAT[key], CAMERA_ISO[key], k); });
  campus.setCamera(cam);
}

function settle() {                                 // the finished look; also the cleanup after an interrupted move
  applyCamera(1);
  ZONES.forEach((z) => setNow(campus.blocks.get(z.id), { '--h': `${z.rise}px` }));
  setNow([...frame(), ...flyIn()], { autoAlpha: 1, y: 0 });
  setNow(n.camera, { scale: 1 });
  setNow(el, { autoAlpha: 1, x: 0 });
  setNow(titleWords, { yPercent: 0 });
  ctx.core.show();
}

function rewind() {                                 // the start of the camera move
  applyCamera(0);
  ZONES.forEach((z) => setNow(campus.blocks.get(z.id), { '--h': '0px' }));
  setNow(flyIn(), { autoAlpha: 0 });
  setNow(n.badges, { y: -50 });
  setNow([...n.personaItems, ...n.outcomes], { y: 24 });
  setNow(n.camera, { scale: 1 });
  setNow(frame(), { autoAlpha: 1 });
}

// ---- render: state -> DOM ------------------------------------------------------------------------------------
function renderZone({ animate }) {
  const id = ctx.store.get().ui.selectedZone;
  const zone = ZONES.find((z) => z.id === id);
  n.chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.chip === id)));
  campus.setSelected(id);
  ZONES.forEach((z) => {
    const to = `${z.id === id ? LIFT : 0}px`;
    const blk = campus.blocks.get(z.id);
    if (animate) gsap.to(blk, { '--lift': to, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    else setNow(blk, { '--lift': to });
  });
  n.hint.hidden = Boolean(zone);
  n.body.hidden = !zone;
  if (!zone) return;
  const fig = zoneFigure(zone, ctx.store.get().sim, peakMw);
  n.card.dataset.kind = zone.kind;
  n.name.textContent = zone.name;
  n.label.textContent = fig.label;
  n.value.textContent = fig.value;
  n.note.textContent = fig.note;
  n.load.textContent = zone.load;
  n.flex.textContent = zone.flex;
  n.role.textContent = zone.role;
}

// ---- handlers: change state only ------------------------------------------------------------------------------
function select(id) {
  const { ui } = ctx.store.get();
  ctx.store.set({ ui: { ...ui, selectedZone: ui.selectedZone === id ? null : id } });
}
const onClick = (e) => {
  const target = e.target.closest('[data-chip], .blk');
  if (e.detail > 0) e.target.closest('button')?.blur();    // after a mouse click, arrow keys go back to scene navigation
  if (target) select(target.dataset.chip ?? target.dataset.zone);
};
const onKeyDown = (e) => {
  const current = ctx.store.get().ui.selectedZone;
  if (e.key === 'Escape' && current) select(current);
};
const onState = (state) => {
  if (state.ui.selectedZone === lastZone) return;
  lastZone = state.ui.selectedZone;
  renderZone({ animate: canAnimate(ctx.store) });
};

// ---- the camera move (activate) ----------------------------------------------------------------------------------
// 0.0  camera tilts, spins and zooms in (1.5 s)        0.9  zones rise one after another (0.7 s each, 0.12 s apart)
// 1.3  zone names appear                               2.0  outcome badges drop onto their zones; the Core pulses
// 2.4  persona chips rise
function playCamera() {
  const k = { v: 0 };
  choreo = gsap.timeline();
  choreo.to(k, { v: 1, duration: 1.5, ease: 'power3.inOut', onUpdate: () => applyCamera(k.v) }, 0);
  choreo.to(ZONES.map((z) => campus.blocks.get(z.id)), {
    '--h': (i) => `${ZONES[i].rise}px`, duration: 0.7, ease: 'back.out(1.4)', stagger: 0.12,
  }, 0.9);
  choreo.to(n.chips, { autoAlpha: 1, duration: 0.3, stagger: 0.05 }, 1.3);
  choreo.to(n.badges, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.18 }, 2.0);
  choreo.add(ctx.core.pulse(), 2.0);
  choreo.to(n.outcomes, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.12 }, 2.1);
  choreo.to(n.personaItems, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.1 }, 2.4);
}

// ---- lifecycle -------------------------------------------------------------------------------------------------
export default {
  id: 'opportunity',
  title: 'The opportunity',
  coreAnchor: '[data-core-anchor]',

  mount(root, context) {
    el = root;
    ctx = context;
    peakMw = simulate({ solarMw: 0, batteryMwh: 0 }).peakBeforeMw;
    el.innerHTML = template();
    const q = (s) => el.querySelector(s);
    campus = createCampus(q('.s3-rig'));

    // Measure the map in its FINAL pose (tilted, risen) to place the flat 2D chips, badges and Core anchor on it.
    campus.setCamera(CAMERA_ISO);
    ZONES.forEach((z) => campus.setRise(z.id, 1));
    const tops = measureTops(document.getElementById('stage'), campus);
    n = {
      head: q('.s3-head'), camera: q('.s3-camera'), card: q('.s3-card'), personas: q('.s3-personas'),
      chips: [...el.querySelectorAll('.s3-chip')], badges: [...el.querySelectorAll('.s3-badge')],
      personaItems: [...el.querySelectorAll('.s3-persona')], outcomes: [...el.querySelectorAll('.s3-outcome')],
      hint: q('.s3-card-hint'), body: q('.s3-card-body'), name: q('.s3-card-name'), label: q('.s3-card-label'),
      value: q('.s3-card-value'), note: q('.s3-card-note'), load: q('.s3-card-load'), flex: q('.s3-card-flex'), role: q('.s3-card-role'),
    };
    n.chips.forEach((c) => {
      const p = tops[c.dataset.chip];
      c.style.left = `${p.x}px`;
      c.style.top = `${p.y + (c.dataset.chip === SUB.id ? 58 : 0)}px`;   // the substation's name sits below the Core
    });
    setNow(n.badges, { xPercent: -50, yPercent: -100 });           // anchored by their bottom centre; gsap owns the transform
    n.badges.forEach((b) => {
      const p = tops[b.dataset.badge];
      b.style.left = `${p.x}px`;
      b.style.top = `${p.y - 30}px`;
    });
    const sub = tops[SUB.id];
    const anchor = q('.s3-core-anchor');
    anchor.style.left = `${sub.x - 32}px`;
    anchor.style.top = `${sub.y - 32}px`;
    n.camera.style.transformOrigin = `${sub.x}px ${sub.y}px`;        // the dive zooms about the substation
    titleWords = splitWords(q('.s3-title'));
    ZONES.forEach((z) => campus.setRise(z.id, 0));
    applyCamera(0);
  },

  enter(dir, { composed = false } = {}) {
    const { reducedMotion } = ctx.store.get();
    lastZone = ctx.store.get().ui.selectedZone;
    renderZone({ animate: false });
    if (composed && dir < 0 && !reducedMotion) {      // back from 04: pull the camera out of the substation
      settle();
      prepared = false;
      setNow(n.camera, { scale: DIVE_ZOOM });
      setNow(el, { autoAlpha: 0 });
      return gsap.timeline()
        .to(n.camera, { scale: 1, duration: 0.9, ease: 'power2.out' }, 0)
        .to(el, { autoAlpha: 1, duration: 0.5 }, 0);
    }
    const animate = canAnimate(ctx.store);
    if (animate) rewind();
    else settle();
    prepared = animate;
    const tl = revealScene(el, reducedMotion, dir);
    if (animate) tl.fromTo(titleWords, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: 'power3.out', stagger: 0.04 }, 0.05);
    return tl;
  },

  exit(dir, { composed = false } = {}) {
    if (choreo?.isActive() || prepared) { choreo?.kill(); settle(); }    // interrupted: snap to the settled look first
    choreo = null;
    prepared = false;
    if (composed && dir > 0) {                          // transition B: dive into the substation
      return gsap.timeline()
        .to([n.head, n.card, n.personas, n.chips, n.badges, n.outcomes], { autoAlpha: 0, duration: 0.35 }, 0)
        .to(n.camera, { scale: DIVE_ZOOM, duration: 1.0, ease: 'power2.in' }, 0)
        .to(el, { autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, 0.55);
    }
    return hideScene(el, ctx.store.get().reducedMotion, dir);
  },

  activate() {
    scope = ctx.motion.scope();
    scope.listen(el, 'click', onClick);
    scope.listen(document, 'keydown', onKeyDown);
    unsubscribe = ctx.store.subscribe(onState);
    if (prepared) {
      prepared = false;
      if (canAnimate(ctx.store)) playCamera();
      else settle();                                   // paused / reduced since enter()
    }
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
    const { ui } = ctx.store.get();
    if (ui.selectedZone) ctx.store.set({ ui: { ...ui, selectedZone: null } });
  },
};
