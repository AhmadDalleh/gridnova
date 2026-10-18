import { gsap } from 'gsap';

// Tween a number shown in `node` toward `to`. Retargeting mid-count starts from what is currently shown,
// so dragging a slider never makes a KPI jump. Returns the tween (or null when set immediately).
export function countTo(node, to, { duration = 0.9, delay = 0, format, immediate = false }) {
  node._countTween?.kill();
  if (immediate || duration <= 0) {
    node._shown = to;
    node.textContent = format(to);
    return null;
  }
  const state = { v: node._shown ?? 0 };
  node.textContent = format(state.v);
  node._countTween = gsap.to(state, {
    v: to, duration, delay, ease: 'power2.out',
    onUpdate: () => { node._shown = state.v; node.textContent = format(state.v); },
    onComplete: () => { node._shown = to; node.textContent = format(to); },
  });
  return node._countTween;
}
