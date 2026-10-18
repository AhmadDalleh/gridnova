// Scene controller: owns WHICH scene is active and runs transitions. No scene-specific DOM code here.
//
// Rules that keep navigation safe (R25):
//  - one transition at a time; a request made during a transition is stored in `pending`, last one wins
//  - next()/prev() are relative to the DESTINATION (pending ?? inFlight ?? index), so rapid key presses accumulate
//  - try/finally releases `busy` even if a timeline throws
//  - while paused, GSAP's clock is stopped, so a transition is jumped to its end instead of hanging
export function createController({ scenes, transitions, store, core, onChange = () => {} }) {
  let index = -1;
  let busy = false;
  let pending = null;
  let inFlight = null;                       // target of the transition currently running
  let activeTl = null;

  const clamp = (n) => Math.max(0, Math.min(scenes.length - 1, n));
  const destination = () => pending ?? inFlight ?? index;

  // Opening frame / hash resume: no transition, the scene simply plays its entrance.
  async function start(target) {
    index = clamp(target);
    const scene = scenes[index];
    core.snapTo(scene);
    const tl = scene.enter(1);
    if (store.get().paused) tl.progress(1);
    await tl.then();
    scene.activate();
    commit();
  }

  function commit() {
    store.set({ sceneIndex: index });
    onChange(index);
  }

  async function goTo(target) {
    target = clamp(target);
    if (busy) {
      pending = target;
      // A frozen (paused) transition would never finish on its own: finish it so the queue can drain.
      if (store.get().paused) activeTl?.progress(1);
      return;
    }
    if (target === index) return;

    busy = true;
    inFlight = target;
    const from = scenes[index];
    const to = scenes[target];
    const dir = target > index ? 1 : -1;
    try {
      const run = transitions[`${index}>${target}`] ?? transitions.standard;
      activeTl = run({ from, to, dir, core, reduced: store.get().reducedMotion });
      if (store.get().paused) activeTl.progress(1);
      await activeTl.then();
      from.deactivate();
      index = target;
      to.activate();
      commit();
    } finally {
      busy = false;
      inFlight = null;
      activeTl = null;
      if (pending !== null) {
        const next = pending;
        pending = null;
        goTo(next);
      }
    }
  }

  return {
    start,
    goTo,
    next: () => goTo(destination() + 1),
    prev: () => goTo(destination() - 1),
    get index() { return index; },
    get busy() { return busy; },
  };
}
