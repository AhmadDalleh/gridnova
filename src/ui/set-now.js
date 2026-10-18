import { gsap } from 'gsap';

// gsap.set() does NOT render while gsap.globalTimeline is paused (the Pause button): it waits for the next tick,
// so a scene that "jumps to its finished state" while paused would stay half-visible. Forcing progress(1) renders it now.
export const setNow = (targets, vars) => gsap.set(targets, vars).progress(1);
