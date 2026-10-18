// Tuning knobs for scene transitions (seconds). Edit here to retime them live.

// STANDARD transition. Budget for live presenting: enterDelay + enter <= 0.7 s total, core <= 0.6 s,
// all running in parallel.
export const STANDARD = {
  exit: 0.3,         // outgoing scene slides/fades away
  enterDelay: 0.1,   // incoming scene starts this long after the outgoing one begins leaving (max 0.15)
  enter: 0.45,       // incoming scene slides/fades in
  core: 0.6,         // Core orb travel to the new anchor, starts together with the exit
  reduced: 0.2,      // reduced motion: everything becomes a cross-fade this long
  slide: 40,         // px the scenes slide while fading
};

// Composed transitions may be longer than the standard budget. Each ends when the Core lands, because the
// incoming scene's activate() choreography starts right after (scene 02's curve starts drawing at the landing).
// A: 01 -> 02. Title words exit while the Core flies down to the peak point; scene 02's frame arrives behind it.
export const TRANSITION_A = {
  coreDelay: 0.1,    // Core leaves slightly after the title starts to exit
  core: 1.0,         // Core flight (ends at 1.1 s = the whole transition)
  enterDelay: 0.5,   // scene 02 frame + title; its enter() is 0.45 s, so it is in place before the Core lands
};
// A reversed: 02 -> 01. The Core flies back and grows while scene 01 rebuilds itself fully formed.
export const TRANSITION_A_BACK = {
  coreDelay: 0,
  core: 0.9,
  enterDelay: 0.15,
};
