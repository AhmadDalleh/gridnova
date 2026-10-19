import { gsap } from 'gsap';
import { flyNumbers } from '../ui/fly.js';
import { STANDARD, TRANSITION_A, TRANSITION_A_BACK, TRANSITION_B, TRANSITION_B_BACK, TRANSITION_C } from './timing.js';

// A transition builds ONE timeline that coordinates the outgoing scene, the Core and the incoming scene.
// The controller plays it and waits for it. Composed transitions are keyed 'from>to' (scene indexes);
// anything without an entry uses `standard`.

// Choreography (all times from timing.js): outgoing scene leaves and the Core starts travelling at t=0;
// the incoming scene starts `enterDelay` later, so the two overlap instead of leaving a gap.
// Total = the longest layer = max(core 0.6, enterDelay + enter 0.55) = 0.6 s. Reduced motion: cross-fade only, everything starts together.
function standard({ from, to, dir, core, reduced }) {
  const tl = gsap.timeline();
  tl.add(from.exit(dir), 0);
  // Core is created BEFORE to.enter() so it measures the anchor before enter() sets any offset.
  tl.add(core.moveTo(to, reduced ? { duration: STANDARD.reduced, ease: 'none' } : { duration: STANDARD.core }), 0);
  tl.add(to.enter(dir), reduced ? 0 : STANDARD.enterDelay);
  return tl;
}

// Same three layers as `standard`, but the Core gets its own long flight (a hero move, not a tag-along).
// The scenes own what "exit" and "enter" look like (scene 01's exit is the title-word stagger), so this
// only decides WHEN things start. Reduced motion falls back to the plain cross-fade.
function composed(t) {
  return (args) => {
    if (args.reduced) return standard(args);
    const { from, to, dir, core } = args;
    const tl = gsap.timeline();
    // `{ composed: true }` tells a scene it is part of a composed transition (03 dives / pulls out, 04 and 08 skip their slide).
    tl.add(from.exit(dir, { composed: true }), 0);
    tl.add(core.moveTo(to, { duration: t.core }), t.coreDelay);
    tl.add(to.enter(dir, { composed: true }), t.enterDelay);
    return tl;
  };
}

// Composed transition with shared numbers: like `composed`, plus the numbers of from.flyPoints() flying to the matching
// elements of to.flyPoints(). The flight is built last, so both scenes are already in their start/end state when it measures.
function composedFly(t) {
  return (args) => {
    if (args.reduced) return standard(args);
    const { from, to, dir, core } = args;
    const tl = gsap.timeline();
    tl.add(from.exit(dir, { composed: true }), 0);
    tl.add(core.moveTo(to, { duration: t.core }), t.coreDelay);
    tl.add(to.enter(dir, { composed: true }), t.enterDelay);
    tl.add(flyNumbers(document.getElementById('stage'), from.flyPoints(), to.flyPoints(), { duration: t.fly }), t.flyDelay);
    return tl;
  };
}

export const transitions = {
  standard,
  '0>1': composed(TRANSITION_A),        // A: title exits, Core flies to the curve's peak, curve draws on landing
  '1>0': composed(TRANSITION_A_BACK),   // A reversed: Core returns to the hero, scene 01 rebuilds
  '2>3': composed(TRANSITION_B),         // B: camera dives into the substation, the Core becomes the controller node
  '3>2': composed(TRANSITION_B_BACK),    // B reversed: the diagram leaves, the camera pulls out of the substation
  '6>7': composedFly(TRANSITION_C),      // C: the KPI numbers of 07 fly into the cards of 08
  '7>6': composedFly(TRANSITION_C),      // C reversed: they fly back
};
