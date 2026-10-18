import { gsap } from 'gsap';
import { STANDARD } from '../core/timing.js';

// Placeholder scene factory (slice 1 only). Each real scene replaces its own folder's index.js later.
// It implements the full scene contract so the controller is exercised exactly as it will be with real art.
export function createPlaceholderScene({ number, id, title, anchor }) {
  let el;
  let ctx;

  return {
    id,
    title,
    coreAnchor: '[data-core-anchor]',

    mount(root, context) {
      el = root;
      ctx = context;
      el.innerHTML = `
        <div class="ph-number">${String(number).padStart(2, '0')}</div>
        <h1 class="ph-title"></h1>
        <div class="ph-tag">Placeholder scene</div>
        <div class="ph-anchor" data-core-anchor
             style="left:${anchor.x}px; top:${anchor.y}px; width:${anchor.size}px; height:${anchor.size}px"></div>`;
      el.querySelector('.ph-title').textContent = title;   // textContent: titles may contain '&'
    },

    // Choreography: scene slides in from the travel direction while fading (crossfade only if reduced).
    enter(dir) {
      const reduced = ctx.store.get().reducedMotion;
      return gsap.timeline().fromTo(
        el,
        { autoAlpha: 0, x: reduced ? 0 : STANDARD.slide * dir },
        { autoAlpha: 1, x: 0, duration: reduced ? STANDARD.reduced : STANDARD.enter, ease: 'power2.out' },
      );
    },
    exit(dir) {
      const reduced = ctx.store.get().reducedMotion;
      return gsap.to(el, { autoAlpha: 0, x: reduced ? 0 : -STANDARD.slide * dir, duration: reduced ? STANDARD.reduced : STANDARD.exit, ease: 'power2.in' });
    },

    activate() {},     // real scenes start loops / listeners here, through ctx.motion
    deactivate() {},   // ...and stop them here
    reset() {},
  };
}
