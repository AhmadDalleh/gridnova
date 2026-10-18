import { gsap } from 'gsap';
import { STANDARD } from './timing.js';

// A transition builds ONE timeline that coordinates the outgoing scene, the Core and the incoming scene.
// The controller plays it and waits for it. Composed transitions (A, B, C) are added to this map later,
// keyed 'from>to' (e.g. '0>1'); anything without an entry uses `standard`.
export const transitions = {
  // Choreography (all times from timing.js): outgoing scene leaves and the Core starts travelling at t=0;
  // the incoming scene starts `enterDelay` later, so the two overlap instead of leaving a gap.
  // Total = enterDelay + enter (0.55 s). Reduced motion: cross-fade only, everything starts together.
  standard({ from, to, dir, core, reduced }) {
    const tl = gsap.timeline();
    tl.add(from.exit(dir), 0);
    // Core is created BEFORE to.enter() so it measures the anchor before enter() sets any offset.
    tl.add(core.moveTo(to, reduced ? { duration: STANDARD.reduced, ease: 'none' } : { duration: STANDARD.core }), 0);
    tl.add(to.enter(dir), reduced ? 0 : STANDARD.enterDelay);
    return tl;
  },
};
