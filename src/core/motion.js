import { gsap } from 'gsap';

// Motion manager: the single place that decides whether anything may move.
//  - paused        -> GSAP's global timeline is paused and every loop() callback is skipped
//  - reducedMotion -> loops are skipped; transitions become short cross-fades (see transitions.js)
//  - document.hidden -> loops are skipped (the tab is not visible)
export function createMotion(store) {
  const loops = new Set();
  let raf = 0;
  let last = 0;

  const canAnimate = () => {
    const { paused, reducedMotion } = store.get();
    return !paused && !reducedMotion && !document.hidden;
  };

  function tick(now) {
    const dt = last ? now - last : 0;
    last = now;
    loops.forEach((fn) => fn(now, dt));
    if (loops.size) raf = requestAnimationFrame(tick);
    else raf = 0;
  }

  // Follow the OS setting live until the presenter toggles it by hand.
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', (e) => store.set({ reducedMotion: e.matches }));

  return {
    prefersReduced: mq.matches,

    /** Register a per-frame function. Returns stop(). It only runs while animation is allowed. */
    loop(fn) {
      const wrapped = (now, dt) => {
        if (canAnimate()) fn(now, dt);
      };
      loops.add(wrapped);
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
      return () => loops.delete(wrapped);
    },

    /** Scoped listeners: one AbortController per scene activation; dispose() removes them all. */
    scope() {
      const ac = new AbortController();
      return {
        listen: (target, type, handler, opts = {}) =>
          target.addEventListener(type, handler, { ...opts, signal: ac.signal }),
        dispose: () => ac.abort(),
      };
    },

    setPaused(paused) {
      store.set({ paused });
      gsap.globalTimeline.paused(paused);
    },

    setReduced(reducedMotion) {
      store.set({ reducedMotion });
    },
  };
}
