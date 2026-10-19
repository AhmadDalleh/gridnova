import { gsap } from 'gsap';
import { setNow } from './set-now.js';

// Shared-element flight for numbers (composed transition C). For each pair, a clone of the source number is
// created above the scenes at the source's position and flown to the target's position and size, while the real
// source is hidden for the flight. At the end the clones are removed and the real targets are shown.
// Positions are measured NOW (when the timeline is built), in stage pixels, so the stage scale does not matter.
// The text changes half-way if source and target differ (the 07 "peak import" KPI becomes 08's "peak reduction").
export function flyNumbers(stageEl, sources, targets, { duration = 1 } = {}) {
  const tl = gsap.timeline();
  const box = stageEl.getBoundingClientRect();
  const scale = box.width / 1920;
  const at = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - box.left) / scale, y: (r.top - box.top) / scale }; };

  const clones = sources.map((src, i) => {
    const dst = targets[i];
    const cs = getComputedStyle(src);
    const ct = getComputedStyle(dst);
    const from = at(src);
    const to = at(dst);
    const clone = document.createElement('div');
    clone.textContent = src.textContent;
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      position: 'absolute', left: '0', top: '0', zIndex: '9', pointerEvents: 'none', whiteSpace: 'nowrap', transformOrigin: '0 0',
      fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight, color: cs.color, fontVariantNumeric: 'tabular-nums',
    });
    stageEl.append(clone);
    setNow(clone, { x: from.x, y: from.y });
    setNow([src, dst], { autoAlpha: 0 });
    const k = parseFloat(ct.fontSize) / parseFloat(cs.fontSize);
    tl.to(clone, { x: to.x, y: to.y, scale: k, color: ct.color, duration, ease: 'power3.inOut' }, i * 0.08);
    tl.add(() => { clone.textContent = dst.textContent; }, i * 0.08 + duration / 2);
    return { clone, src, dst };
  });

  tl.add(() => {                                           // landed: real numbers back, clones gone
    clones.forEach(({ clone, src, dst }) => { clone.remove(); setNow([src, dst], { autoAlpha: 1 }); });
  });
  return tl;
}
