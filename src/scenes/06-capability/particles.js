// The particle field of scene 06, as pure logic (no DOM, no canvas): a fixed pool of particles that each follow one
// route (a polyline in stage pixels). The mode ('day' | 'night') only changes HOW MANY particles use each route.
// Illustrative mix, not model output: the capability story is conceptual, so the weights live here, labelled.
export const MAX_PARTICLES = 380;                     // brief: ~400 at most

export const COLORS = { amber: '#f3b957', cyan: '#46d7c1', coral: '#ee7e5f' };

// Where things sit on the 1920 x 1080 stage (template.js places the labelled shapes from the same numbers).
export const SHAPES = {
  solar: { x: 360, y: 310, w: 600, h: 36 },
  battery: { x: 510, y: 560, w: 300, h: 120 },
  buildings: { x: 330, y: 850, w: 660, h: 90 },
  grid: { x: 1120, y: 690, w: 130, h: 100 },
};

// Routes: a start, a few corners, an end. Each particle adds its own sideways `spread` so a route reads as a stream.
export const ROUTES = {
  solarToBattery: { color: 'amber', points: [[540, 350], [540, 556]], width: 240, dir: 'x' },
  solarToLoad: { color: 'amber', points: [[400, 350], [400, 846]], width: 50, dir: 'x' },
  solarToLoadRight: { color: 'amber', points: [[920, 350], [920, 846]], width: 50, dir: 'x' },
  batteryToLoad: { color: 'cyan', points: [[560, 684], [560, 846]], width: 110, dir: 'x' },
  batteryToLoadMid: { color: 'cyan', points: [[660, 684], [700, 846]], width: 110, dir: 'x' },
  batteryToLoadRight: { color: 'cyan', points: [[760, 684], [820, 846]], width: 110, dir: 'x' },
  gridToLoad: { color: 'coral', points: [[1120, 745], [1000, 745], [960, 846]], width: 40, dir: 'y' },
};

// Share of the pool on each route. Day: sun fills the battery and serves the buildings. Night: the battery serves
// the buildings and the grid trickle shrinks.
export const MIX = {
  day: { solarToBattery: 0.26, solarToLoad: 0.22, solarToLoadRight: 0.22, batteryToLoad: 0.02, batteryToLoadMid: 0.02, batteryToLoadRight: 0.02, gridToLoad: 0.24 },
  night: { solarToBattery: 0, solarToLoad: 0, solarToLoadRight: 0, batteryToLoad: 0.26, batteryToLoadMid: 0.26, batteryToLoadRight: 0.26, gridToLoad: 0.22 },
};

/** Position along a polyline at 0..1 of its total length. */
export function pointAt(points, t) {
  const lens = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let d = t * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] === 0 ? 0 : Math.min(1, d / lens[i]);
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * k, points[i][1] + (points[i + 1][1] - points[i][1]) * k];
    }
    d -= lens[i];
  }
  return points[0];
}

/** `random` is injectable so tests are deterministic. */
export function createField({ count = MAX_PARTICLES, random = Math.random, mode = 'day' } = {}) {
  const n = Math.min(count, MAX_PARTICLES);
  const names = Object.keys(ROUTES);
  const particles = Array.from({ length: n }, () => ({ route: names[0], t: random(), speed: 0.00022 + random() * 0.00022, spread: random() - 0.5, size: 2 + random() * 2.5 }));

  // Give every route its share of the pool (rounded, remainder to the biggest route). Existing t values are kept, so a
  // mode change redirects the stream instead of restarting it.
  function setMode(next) {
    mode = next;
    const mix = MIX[next];
    let i = 0;
    names.forEach((name) => {
      const share = Math.round(mix[name] * n);
      for (let k = 0; k < share && i < n; k++) particles[i++].route = name;
    });
    while (i < n) particles[i++].route = names.reduce((a, b) => (mix[b] > mix[a] ? b : a));
  }
  setMode(mode);

  return {
    particles,
    get mode() { return mode; },
    setMode,
    /** Advance every particle. dtMs is clamped so a long pause (hidden tab) never teleports them. */
    step(dtMs) {
      const dt = Math.min(dtMs, 50);
      particles.forEach((p) => {
        p.t += p.speed * dt;
        if (p.t >= 1) { p.t -= 1; p.spread = random() - 0.5; }
      });
    },
    /** [x, y, alpha] of a particle: it fades in and out at both ends of its route. */
    position(p) {
      const r = ROUTES[p.route];
      const [x, y] = pointAt(r.points, p.t);
      const off = p.spread * r.width;
      return [r.dir === 'x' ? x + off : x, r.dir === 'y' ? y + off : y, Math.sin(Math.PI * p.t)];
    },
    counts() {
      return particles.reduce((acc, p) => ({ ...acc, [p.route]: (acc[p.route] ?? 0) + 1 }), {});
    },
  };
}
