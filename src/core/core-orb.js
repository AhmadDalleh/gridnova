import { gsap } from 'gsap';

// The persistent GridNova Core (R08): ONE element above all scenes, moved to each scene's anchor.
// Position is read from layout offsets (offsetLeft/Top), not getBoundingClientRect, so it is immune to
// the stage scale and to any enter/exit transform still sitting on the scene element.
function anchorBox(sceneEl, selector) {
  const anchor = sceneEl.querySelector(selector);
  if (!anchor) return null;
  let x = 0;
  let y = 0;
  for (let n = anchor; n && n !== sceneEl; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y, size: anchor.offsetWidth };
}

export function createCore(stageEl, motion) {
  const orb = stageEl.querySelector('#core');
  const orbit = orb.querySelector('.core-orbit');

  // The amber dot orbits through the motion manager, so it stops on pause / reduced motion / hidden tab.
  let angle = 0;
  motion.loop((now, dt) => {
    angle = (angle + dt * 0.04) % 360;
    orbit.style.transform = `rotate(${angle}deg)`;
  });

  return {
    /** Jump (no animation) to a scene's anchor: used for the first scene and hash resume. */
    snapTo(scene) {
      const box = anchorBox(scene.el, scene.coreAnchor);
      if (box) gsap.set(orb, { x: box.x, y: box.y, width: box.size, height: box.size });
    },
    /** Tween to a scene's anchor. Returns a tween so transitions can place it on their timeline. */
    moveTo(scene, vars = {}) {
      const box = anchorBox(scene.el, scene.coreAnchor);
      if (!box) return gsap.timeline();
      return gsap.to(orb, {
        x: box.x, y: box.y, width: box.size, height: box.size,
        duration: 0.9, ease: 'power3.inOut', ...vars,
      });
    },
    pulse: () => gsap.fromTo(orb, { scale: 1 }, { scale: 1.15, yoyo: true, repeat: 1, duration: 0.25 }),
    setGlow: (value) => orb.style.setProperty('--glow', String(value)),
  };
}
