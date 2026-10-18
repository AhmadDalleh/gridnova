// Number formatting for the scenes. Currency is AED; every figure shown on screen goes through here.
export const fmtMw = (n) => `${n.toFixed(2)} MW`;
export const fmtHours = (n) => `${n.toFixed(1)} h`;
export const fmtYears = (n) => (n === null ? 'n/a' : `${n.toFixed(1)} yrs`);   // payback is null when it never pays back

export function fmtAed(n) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `AED ${(n / 1e6).toFixed(2)} M`;
  if (abs >= 1e3) return `AED ${Math.round(n / 1e3)} k`;
  return `AED ${Math.round(n)}`;
}

// Core glow follows the headline KPI: peak reduction 0-60 % maps to a visible glow range.
export const GLOW_MIN = 0.25;
export const GLOW_MAX = 1;
export function glowFromReduction(pct) {
  const t = Math.min(1, Math.max(0, pct / 60));
  return GLOW_MIN + (GLOW_MAX - GLOW_MIN) * t;
}
