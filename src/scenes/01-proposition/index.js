import { gsap } from 'gsap';
import './scene.css';
import { revealScene, hideScene } from '../../ui/reveal.js';
import { splitWords } from '../../ui/split.js';
import { template } from './template.js';
import { createDots } from './dots.js';
import { createParallax, resetParallax } from './parallax.js';

// Scene 01: the cinematic opening.
//
// Lifecycle (see architecture.md section 5):
//   enter()      quick frame reveal. On the FIRST visit (or after reset()) everything else is hidden here...
//   activate()   ...and the full opening choreography plays (about 2.5 s). Parallax + dots start.
//   exit()       the cinematic exit: title words slide out left. Always starts from the settled look, so an
//                opening that is still running when we leave is killed cleanly and nothing half-finished remains.
//   reset()      "Replay the story": the next enter() is treated as a first visit again.
//
// Arriving BACK (e.g. from scene 02) never replays the opening: enter() rebuilds the finished scene in ~0.6 s.
const CYAN_CLEAR = 'rgba(70, 215, 193, 0)';
const CYAN = 'rgb(70, 215, 193)';
const OUTLINE_HIDDEN = 'inset(-10px 100% -10px -10px)';   // negative insets keep the 3 px stroke from being clipped

let el;
let ctx;
let nodes;                          // cached DOM groups
let dots;
let parallax;                       // created in activate(), dropped in deactivate()
let scope;
let stopDots;
let choreo;
let needsOpening = true;            // true until the opening has been shown (and again after reset())
let openingPending = false;         // enter() hid everything; activate() must play it

const canAnimate = () => {
  const { paused, reducedMotion } = ctx.store.get();
  return !paused && !reducedMotion;
};

/** Layers and Core back at rest, and the quickTo movers dropped (a new set is made on the next activate). */
function restParallax() {
  parallax = null;
  resetParallax(nodes.layers, ctx.core.el);
}

// ---- states -----------------------------------------------------------------------------------------------
/** Everything at its finished look. */
function showFinal() {
  const { fades, words, balance, rings, labels } = nodes;
  gsap.set(fades, { autoAlpha: 1, y: 0 });
  gsap.set(words, { xPercent: 0, yPercent: 0 });
  gsap.set(balance, { xPercent: 0, yPercent: 0, clipPath: 'none', color: CYAN });
  gsap.set(rings, { scale: 1, autoAlpha: 1 });
  gsap.set(labels, { autoAlpha: 1 });
  ctx.core.show();
}

/** Everything hidden, ready for the opening choreography. */
function hideAll() {
  const { fades, words, balance, rings, labels } = nodes;
  gsap.set(fades, { autoAlpha: 0, y: 16 });
  gsap.set(words, { xPercent: 0, yPercent: 110 });
  gsap.set(balance, { xPercent: 0, yPercent: 0, clipPath: OUTLINE_HIDDEN, color: CYAN_CLEAR });
  gsap.set(rings, { scale: 0.6, autoAlpha: 0 });
  gsap.set(labels, { autoAlpha: 0 });
  ctx.core.hide();
}

// ---- the opening (about 2.5 s) ----------------------------------------------------------------------------
// 0.0 eyebrow rises                     0.2 title words rise out of their masks, stagger 0.08
// 0.5 Core scales in, rings follow      0.9 "balance." outline is drawn left to right (0.9 s)
// 1.5 orbit labels, stagger 0.12        1.8 the outline fills with cyan (0.4 s)
// 1.9 sub line   2.1 Begin   2.2 ILLUSTRATIVE tag
function playOpening() {
  const { eyebrow, tag, sub, begin, words, balance, rings, labels } = nodes;
  const rise = { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' };
  choreo = gsap.timeline();
  choreo
    .to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0)
    .to(nodes.titleWords, { yPercent: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, 0.2)
    .add(ctx.core.reveal(), 0.5)
    .to(rings, { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'power2.out', stagger: 0.15 }, 0.5)
    .to(balance, { clipPath: 'inset(-10px 0% -10px -10px)', duration: 0.9, ease: 'power1.inOut' }, 0.9)
    .to(labels, { autoAlpha: 1, duration: 0.4, stagger: 0.12 }, 1.5)
    .to(balance, { color: CYAN, duration: 0.4 }, 1.8)
    .set(balance, { clipPath: 'none' }, 1.8)
    .to(sub, rise, 1.9)
    .to(begin, { ...rise, duration: 0.4 }, 2.1)
    .to(tag, { autoAlpha: 1, y: 0, duration: 0.4 }, 2.2);
  return choreo;
}

// ---- lifecycle --------------------------------------------------------------------------------------------
export default {
  id: 'proposition',
  title: 'The proposition',
  coreAnchor: '[data-core-anchor]',

  mount(root, context) {
    el = root;
    ctx = context;
    el.innerHTML = template();
    const q = (sel) => el.querySelector(sel);
    const qa = (sel) => [...el.querySelectorAll(sel)];
    const titleWords = qa('[data-split]').flatMap(splitWords);
    const balance = q('.balance');
    nodes = {
      eyebrow: q('.s1-eyebrow'), tag: q('.s1-tag'), sub: q('.s1-sub'), begin: q('.s1-begin'),
      fades: [q('.s1-eyebrow'), q('.s1-tag'), q('.s1-sub'), q('.s1-begin')],
      titleWords, balance, words: [...titleWords, balance],
      rings: qa('.s1-ring'), labels: qa('.s1-label'), layers: qa('.s1-layer'),
    };
    dots = createDots(q('.s1-dots'));
  },

  enter(dir) {
    const { paused, reducedMotion } = ctx.store.get();
    restParallax();
    openingPending = false;

    if (needsOpening && !paused && !reducedMotion) {
      hideAll();                                      // first visit: activate() plays the opening
      openingPending = true;
      return revealScene(el, false, dir);
    }

    needsOpening = false;                             // reduced/paused first visit: just show the finished scene
    showFinal();
    const tl = revealScene(el, reducedMotion, dir);
    if (!reducedMotion && !paused) {
      // Arriving back: the title words slide in from the left (the exit, reversed); nothing else replays.
      const { words, fades, labels, rings } = nodes;
      tl.fromTo(words, { xPercent: -120 }, { xPercent: 0, duration: 0.4, ease: 'power3.out', stagger: 0.06 }, 0)
        .fromTo([...fades, ...labels], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, stagger: 0.03 }, 0.1)
        .fromTo(rings, { scale: 0.85, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, stagger: 0.05 }, 0.1);
    }
    return tl;
  },

  // Cinematic exit (0.6 s): title words slide out left in a stagger, the rest fades, then the scene hides.
  exit(dir) {
    choreo?.kill();                                   // an opening still running is stopped here...
    choreo = null;
    openingPending = false;
    needsOpening = false;                             // ...and counts as seen
    parallax?.release();
    if (ctx.store.get().reducedMotion) return hideScene(el, true, dir);

    showFinal();                                      // ...so the exit always starts from the settled look
    const { words, fades, labels, rings } = nodes;
    return gsap.timeline()
      .to(words, { xPercent: -120, duration: 0.35, ease: 'power2.in', stagger: 0.05 }, 0)
      .to([...fades, ...labels, ...rings], { autoAlpha: 0, duration: 0.3 }, 0.05)
      .to(el, { autoAlpha: 0, duration: 0.15 }, 0.45);
  },

  activate() {
    scope = ctx.motion.scope();
    parallax = createParallax(nodes.layers, ctx.core.el, ctx.store);
    scope.listen(document, 'pointermove', (e) => parallax.move(e));
    scope.listen(nodes.begin, 'click', () => ctx.nav.next());
    stopDots = dots.start(ctx.motion);

    if (openingPending) {
      openingPending = false;
      needsOpening = false;
      if (canAnimate()) playOpening();
      else showFinal();                               // paused/reduced since enter(): show the finished scene at once
    }
  },

  deactivate() {
    scope?.dispose();
    stopDots?.();
    choreo?.kill();
    choreo = null;
    restParallax();
  },

  // "Replay the story": the next time scene 01 is entered it is a first visit again, full opening included.
  reset() {
    choreo?.kill();
    choreo = null;
    openingPending = false;
    needsOpening = true;
    restParallax();
  },
};
