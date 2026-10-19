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

// B: 03 -> 04. Scene 03's camera dives into the substation (1.0 s) with the Core sitting on it; once the picture is
// mostly white-out the Core travels to the diagram's centre and becomes the controller node, scene 04's frame fades in
// behind it. Ends when the Core lands; scene 04 then draws its links (activate).
export const TRANSITION_B = {
  coreDelay: 0.45,   // the Core stays on the substation for the first part of the dive
  core: 0.8,         // ends at 1.25 s = the whole transition
  enterDelay: 0.8,   // scene 04's frame (0.45 s) is in place when the Core lands
};
// B reversed: 04 -> 03. The diagram leaves, the Core returns to the substation while the camera pulls out.
export const TRANSITION_B_BACK = {
  coreDelay: 0,
  core: 0.8,
  enterDelay: 0.2,   // scene 03's pull-out takes 0.9 s, so it ends with the Core's landing at 1.1 s
};

// C: 07 -> 08 (and back). The four KPI numbers detach from scene 07 and fly into scene 08's cards while 07 fades out
// and 08 fades in behind them; the Core travels at the same time. Ends when the numbers land.
export const TRANSITION_C = {
  coreDelay: 0,
  core: 0.9,
  enterDelay: 0.35,  // 08's frame (0.45 s) is in place before the numbers land
  flyDelay: 0.1,     // the numbers leave a moment after the scene starts to fade
  fly: 0.9,          // each number's flight; the four are staggered 0.08 s, so the last lands at 1.3 s = the whole transition
};
