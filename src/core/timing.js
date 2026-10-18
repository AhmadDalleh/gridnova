// Tuning knobs for the STANDARD transition (seconds). Edit here to retime every scene change at once.
// Budget for live presenting: enterDelay + enter <= 0.7 s total, core <= 0.6 s, all running in parallel.
// Composed transitions (A, B, C) define their own, longer timings in transitions.js.
export const STANDARD = {
  exit: 0.3,         // outgoing scene slides/fades away
  enterDelay: 0.1,   // incoming scene starts this long after the outgoing one begins leaving (max 0.15)
  enter: 0.45,       // incoming scene slides/fades in
  core: 0.6,         // Core orb travel to the new anchor, starts together with the exit
  reduced: 0.2,      // reduced motion: everything becomes a cross-fade this long
  slide: 40,         // px the scenes slide while fading
};
