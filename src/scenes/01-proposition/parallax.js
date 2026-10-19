import { gsap } from 'gsap';
import { setNow } from '../../ui/set-now.js';

// Three-layer mouse parallax: grid (depth 0.3), dots (0.6), rings (0.8), plus the Core (1.0).
// Deeper = closer = moves more, opposite to the pointer. quickTo reuses one tween per property, so
// pointermove can fire every frame without creating new tweens. Disabled in reduced motion.
const LAYER_PX = 40;      // max travel for depth 1.0 at the screen edge
const CORE_PERCENT = 12;  // the Core moves in xPercent/yPercent of its own size; these do not conflict with the flight's x/y

/**
 * Hard reset: stop the parallax motion of the layers and the Core and put them at rest. Safe to call at any time.
 * Only the parallax properties are killed on the Core: a transition may already have created the Core's flight
 * (x, y, width, height) before this scene's enter() runs, and that tween must survive.
 */
export function resetParallax(layers, coreEl) {
  gsap.killTweensOf(layers);
  gsap.killTweensOf(coreEl, 'xPercent,yPercent');
  setNow(layers, { x: 0, y: 0 });
  setNow(coreEl, { xPercent: 0, yPercent: 0 });
}

/**
 * Create the movers. Make one per activate() and drop it in deactivate(): quickTo tweens must not be killed and
 * reused, so a hard reset (resetParallax) is always followed by creating a new set.
 */
export function createParallax(layers, coreEl, store) {
  const opts = { duration: 0.8, ease: 'power3.out' };
  const movers = layers.map((el) => ({
    depth: Number(el.dataset.depth),
    x: gsap.quickTo(el, 'x', opts),
    y: gsap.quickTo(el, 'y', opts),
  }));
  const coreX = gsap.quickTo(coreEl, 'xPercent', opts);
  const coreY = gsap.quickTo(coreEl, 'yPercent', opts);

  return {
    move(e) {
      if (store.get().reducedMotion) return;
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      movers.forEach((m) => { m.x(-nx * LAYER_PX * m.depth); m.y(-ny * LAYER_PX * m.depth); });
      coreX(-nx * CORE_PERCENT);
      coreY(-ny * CORE_PERCENT);
    },
    /** Ease everything back to rest (used when the scene starts to leave). */
    release() {
      movers.forEach((m) => { m.x(0); m.y(0); });
      coreX(0);
      coreY(0);
    },
  };
}
