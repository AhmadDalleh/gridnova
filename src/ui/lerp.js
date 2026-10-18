// Interpolation for data morphing: tween a whole result between two states, not point by point by hand.
export const lerp = (a, b, k) => a + (b - a) * k;

/** `a` and `b` are objects whose values are numbers or equal-length number arrays. */
export function lerpShape(a, b, k) {
  const out = {};
  for (const key of Object.keys(b)) {
    out[key] = Array.isArray(b[key]) ? b[key].map((v, i) => lerp(a[key][i], v, k)) : lerp(a[key], b[key], k);
  }
  return out;
}
