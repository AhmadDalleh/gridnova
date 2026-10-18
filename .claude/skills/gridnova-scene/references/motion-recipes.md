# Motion recipes (each one is a distinct technique for R09)

Every recipe must: work with `reducedMotion` (jump to end state), stop when paused or the scene exits, and explain something in the story.

## 1. Kinetic typography (split words, masked rise)
```js
// ui/split.js — wraps each word in a mask span; no plugin needed.
export function splitWords(node) {
  const words = node.textContent.trim().split(/\s+/);
  node.innerHTML = words.map((w) => `<span class="w-mask"><span class="w">${w}</span></span>`).join(' ');
  return node.querySelectorAll('.w');
}
// .w-mask { display:inline-block; overflow:hidden } .w { display:inline-block }
gsap.from(splitWords(title), { yPercent: 110, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
```
Meaning, not decoration: stagger follows reading order; the key word ("balance.") gets its own beat.

## 2. SVG path drawing
```js
// ui/svg.js
export function drawPath(path, duration = 1.5, ease = 'none') {
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  return gsap.to(path, { strokeDashoffset: 0, duration, ease });
}
```
Sync with a clock label by tweening an object `{ h: 0 }` to `{ h: 24 }` on the same timeline and rendering `h` in `onUpdate`.

## 3. Flow along links (system diagram)
CSS for continuous flow, toggled by class so pause/reduced can stop it:
```css
.link.flow { stroke-dasharray: 6 14; animation: flow 1.2s linear infinite; }
.link.flow.reverse { animation-direction: reverse; }
@keyframes flow { to { stroke-dashoffset: -20; } }
.paused .link.flow, .reduced .link.flow { animation-play-state: paused; }
```
Direction = energy direction; speed (animation-duration) = power magnitude.

## 4. Camera / perspective / parallax
```css
.campus-viewport { perspective: 1600px; }
.campus-plane { transform-style: preserve-3d; transform: rotateX(55deg) rotateZ(-35deg); }
.zone { transform: translateZ(var(--h, 0px)); }
```
```js
gsap.fromTo(plane, { rotateX: 0, rotateZ: 0, scale: 0.8 }, { rotateX: 55, rotateZ: -35, scale: 1, duration: 1.4, ease: 'power2.inOut' });
// camera dive (transition B): scale up toward the substation's transform-origin, fade map, hand off to scene 04.
```
Mouse parallax (scene 01): layers move `x = (pointerX − 0.5) × depth × 30px` via `gsap.quickTo` — disabled when reduced.

## 5. Canvas particle system (scene 06)
```js
// fixed pool, no allocation per frame
const N = 600; const p = Array.from({ length: N }, () => spawn());
function frame() {
  ctx2d.clearRect(0, 0, W, H);
  for (const q of p) {
    q.t += q.speed;                         // progress along its route 0..1
    if (q.t >= 1) Object.assign(q, spawn());
    const { x, y } = pointOnRoute(q.route, q.t);   // routes depend on day/night state
    ctx2d.fillStyle = q.color; ctx2d.fillRect(x, y, 2, 2);
  }
}
const stop = ctx.motion.loop(frame);       // stops on pause / reduced / exit
```
Day/night only changes the **route table and colours**; particles re-spawn into new routes (visible, smooth change). Reduced motion: draw one static frame with arrows. Size the canvas at stage resolution (1920×1080) × `devicePixelRatio` capped at 2.

## 6. Count-up numbers
```js
export function countTo(node, to, { duration = 1, format = (n) => n.toFixed(0) } = {}) {
  const o = { v: Number(node.dataset.value ?? 0) };
  return gsap.to(o, { v: to, duration, ease: 'power2.out',
    onUpdate: () => { node.textContent = format(o.v); }, onComplete: () => { node.dataset.value = to; } });
}
```

## 7. Data morphing (simulator chart)
Keep the previous series; tween each point toward the new series and re-render the SVG path each update:
```js
const cur = { k: 0 };
gsap.to(cur, { k: 1, duration: 0.5, ease: 'power2.out', overwrite: true,
  onUpdate: () => renderSeries(lerpSeries(prev, next, cur.k)) });
```
`overwrite: true` makes dragging a slider smooth (new tween replaces the old one).

## 8. Choreography checklist
- One focal motion at a time; secondary elements follow 0.1–0.2 s later.
- Entrance ≤ 2.5 s total; the presenter is talking over it.
- Nothing loops in the focal area unless it carries meaning (flows, particles) and it obeys Pause.
- Exits are quick (0.3–0.5 s); entrances carry the meaning.
