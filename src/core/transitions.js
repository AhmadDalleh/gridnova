import { gsap } from 'gsap';

// A transition builds ONE timeline that coordinates the outgoing scene, the Core and the incoming scene.
// The controller plays it and waits for it. Composed transitions (A, B, C) are added to this map later,
// keyed 'from>to' (e.g. '0>1'); anything without an entry uses `standard`.
export const transitions = {
  // Choreography: outgoing scene slides away while fading; the Core starts travelling at the same moment;
  // the incoming scene arrives 0.15s later so the two overlap instead of leaving a black gap.
  // Reduced motion: scenes only cross-fade (no slide) and the Core moves in 0.2s.
  standard({ from, to, dir, core, reduced }) {
    const tl = gsap.timeline();
    tl.add(from.exit(dir), 0);
    // Core is created BEFORE to.enter() so it measures the anchor before enter() sets any offset.
    tl.add(core.moveTo(to, reduced ? { duration: 0.2, ease: 'none' } : {}), 0);
    tl.add(to.enter(dir), reduced ? 0 : 0.15);
    return tl;
  },
};
