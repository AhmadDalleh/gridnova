import { gsap } from 'gsap';
import { STANDARD } from '../core/timing.js';

// The standard scene frame reveal/hide used by every scene's enter()/exit(): slide + fade within the
// standard transition budget (src/core/timing.js). Reduced motion = pure cross-fade.
export function revealScene(el, reduced, dir) {
  return gsap.timeline().fromTo(
    el,
    { autoAlpha: 0, x: reduced ? 0 : STANDARD.slide * dir },
    { autoAlpha: 1, x: 0, duration: reduced ? STANDARD.reduced : STANDARD.enter, ease: 'power2.out' },
  );
}

export function hideScene(el, reduced, dir) {
  return gsap.to(el, {
    autoAlpha: 0, x: reduced ? 0 : -STANDARD.slide * dir,
    duration: reduced ? STANDARD.reduced : STANDARD.exit, ease: 'power2.in',
  });
}
