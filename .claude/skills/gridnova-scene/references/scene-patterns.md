# Scene & core patterns

## Contents
1. Store
2. Motion manager
3. Scene module skeleton
4. Controller with pending-request queue
5. Composed transition
6. Core orb FLIP move
7. Stage scaling

---

## 1. Store
```js
// src/core/store.js — tiny observable store. Handlers call set(); renderers subscribe.
export function createStore(initial) {
  let state = structuredClone(initial);
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      subs.forEach((fn) => fn(state));
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
```
Nested updates: `store.set({ sim: { ...store.get().sim, solarMw: 6 } })`.

## 2. Motion manager
```js
// src/core/motion.js
import { gsap } from 'gsap';

export function createMotion(store) {
  const loops = new Set();
  let raf = 0;

  function tick(t) {
    loops.forEach((fn) => fn(t));
    raf = loops.size ? requestAnimationFrame(tick) : 0;
  }
  const canAnimate = () => !store.get().paused && !store.get().reducedMotion && !document.hidden;

  return {
    /** Register a per-frame function. Returns stop(). Loops only run while animation is allowed. */
    loop(fn) {
      const wrapped = (t) => canAnimate() && fn(t);
      loops.add(wrapped);
      if (!raf) raf = requestAnimationFrame(tick);
      return () => loops.delete(wrapped);
    },
    /** Scoped listeners: one AbortController per scene activation. */
    scope() {
      const ac = new AbortController();
      return {
        listen: (target, type, handler, opts = {}) => target.addEventListener(type, handler, { ...opts, signal: ac.signal }),
        dispose: () => ac.abort(),
      };
    },
    setPaused(p) { store.set({ paused: p }); p ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume(); },
    setReduced(r) { store.set({ reducedMotion: r }); },
  };
}
```

## 3. Scene module skeleton
```js
// src/scenes/02-pressure/index.js
import { gsap } from 'gsap';
import { simulate } from '../../model/simulate.js';
import { drawPath } from '../../ui/svg.js';
import './scene.css';

let el, ctx, tlIn, scope, stopLoop;
const view = { hoverHour: null };          // scene-local UI state

export default {
  id: 'pressure', title: 'The pressure', coreAnchor: '[data-core-anchor="peak"]',

  mount(root, context) {
    ctx = context;
    el = root;
    el.innerHTML = template(simulate({ solarMw: 0, batteryMwh: 0, dayType: 'normal' }));
    // Choreography: curve draws with the clock (0→24h) so the peak "arrives" at 1.6s,
    // when the Core lands on it; counters start only after the peak band appears.
    tlIn = gsap.timeline({ paused: true })
      .from(el.querySelector('.title'), { y: 24, autoAlpha: 0, duration: 0.6 })
      .add(drawPath(el.querySelector('.load-curve'), 2.0), 0.3)
      .from(el.querySelector('.peak-band'), { autoAlpha: 0, duration: 0.4 }, 1.6);
  },

  enter() {
    if (ctx.store.get().reducedMotion) { tlIn.progress(1); return tlIn; }
    return tlIn.restart();
  },
  exit() { return gsap.to(el, { autoAlpha: 0, duration: 0.35 }); },

  activate() {
    scope = ctx.motion.scope();
    scope.listen(el.querySelector('.chart'), 'pointermove', onHover);
  },
  deactivate() { scope?.dispose(); stopLoop?.(); },
  reset() { tlIn.progress(0).pause(); view.hoverHour = null; render(); },
};

function onHover(e) { view.hoverHour = hourFromEvent(e); render(); }   // handler → state
function render() { /* state → DOM only */ }
```

## 4. Controller with pending-request queue
```js
// src/core/controller.js — no scene-specific DOM here.
export function createController({ scenes, transitions, store, core }) {
  let index = 0, busy = false, pending = null;

  async function goTo(target) {
    target = Math.max(0, Math.min(scenes.length - 1, target));
    if (target === index) return;
    if (busy) { pending = target; return; }            // last request wins; never overlap timelines
    busy = true;
    const from = scenes[index], to = scenes[target];
    const dir = target > index ? 1 : -1;
    const key = `${index}>${target}`;
    const run = transitions[key] ?? transitions.standard;
    try {
      await run({ from, to, dir, core, reduced: store.get().reducedMotion });
      from.deactivate();
      index = target;
      to.activate();
      store.set({ sceneIndex: index });
      history.replaceState(null, '', `#/scene-${index + 1}`);
    } finally {
      busy = false;
      if (pending !== null) { const p = pending; pending = null; goTo(p); }
    }
  }
  return { goTo, next: () => goTo(index + 1), prev: () => goTo(index - 1), get index() { return index; } };
}
```
Note the `try/finally`: even if a timeline throws, `busy` is released, so navigation can't get stuck.

## 5. Composed transition
```js
// src/core/transitions.js
import { gsap } from 'gsap';
export const transitions = {
  standard: ({ from, to, dir, reduced }) => {
    const tl = gsap.timeline();
    tl.add(from.exit(dir)).add(() => to.show(), '<0.15').add(to.enter(dir), '<');
    if (reduced) tl.timeScale(4);
    return tl.then();
  },
  // A: 01 → 02 — title exits, Core flies to the peak point, curve draws from the Core.
  '0>1': ({ from, to, core, reduced }) => {
    const tl = gsap.timeline();
    tl.add(from.exit(1))
      .add(() => to.show(), 0.2)
      .add(core.moveTo(to.coreAnchor, { duration: 0.9, ease: 'power3.inOut' }), 0.2)
      .add(to.enter(1), 0.7);
    if (reduced) tl.progress(1);
    return tl.then();
  },
};
```
(`to.show()` = make the scene container visible before its entrance; part of the contract helpers in the controller.)

## 6. Core orb FLIP move
```js
// src/core/core-orb.js — the persistent element (R08)
export function createCore(stageEl, getScale) {
  const orb = stageEl.querySelector('#core');
  return {
    moveTo(selector, vars = {}) {
      const target = stageEl.querySelector(`.scene.is-visible ${selector}`);
      if (!target) return gsap.timeline();
      const s = getScale(), r = target.getBoundingClientRect(), st = stageEl.getBoundingClientRect();
      const x = (r.left - st.left) / s, y = (r.top - st.top) / s, size = r.width / s;   // stage px
      return gsap.to(orb, { x, y, width: size, height: size, duration: 0.8, ease: 'power2.inOut', ...vars });
    },
    pulse: () => gsap.fromTo(orb, { scale: 1 }, { scale: 1.15, yoyo: true, repeat: 1, duration: 0.25 }),
    setGlow: (v) => orb.style.setProperty('--glow', String(v)),
  };
}
```

## 7. Stage scaling
```js
// src/core/stage.js
export function fitStage(stage) {
  const apply = () => {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
    stage.dataset.scale = s;
  };
  addEventListener('resize', apply);
  document.addEventListener('fullscreenchange', apply);
  apply();
  return () => Number(stage.dataset.scale);
}
```
CSS: `#stage { position:absolute; left:50%; top:50%; width:1920px; height:1080px; transform-origin:center; }`.
