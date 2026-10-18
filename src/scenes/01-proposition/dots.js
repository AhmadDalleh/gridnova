// The "slow particles" depth layer. Subtle on purpose: it only exists to give the mouse parallax something to read as depth.
// ~36 small dots drift upward through motion.loop(), so they stop on pause / reduced motion / hidden tab.
const W = 1920;
const H = 1080;

// Tiny seeded generator: the same dot field every time (deterministic, nothing random to explain).
function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

export function createDots(layer, count = 36) {
  const rand = rng(7);
  const dots = Array.from({ length: count }, () => {
    const el = document.createElement('span');
    const size = 3 + rand() * 3;
    el.className = 's1-dot';
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.opacity = String(0.12 + rand() * 0.25);
    layer.append(el);
    return { el, x: rand() * W, y: rand() * H, speed: 0.005 + rand() * 0.008 };   // px per ms: 5-13 px/s
  });
  const place = (d) => { d.el.style.transform = `translate3d(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px, 0)`; };
  dots.forEach(place);

  return {
    /** Start drifting. Returns stop(). */
    start(motion) {
      return motion.loop((now, dt) => {
        for (const d of dots) {
          d.y -= d.speed * dt;
          if (d.y < -10) d.y += H + 20;     // wrap from the top back to the bottom
          place(d);
        }
      });
    },
  };
}
