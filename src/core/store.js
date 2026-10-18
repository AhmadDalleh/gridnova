// Tiny observable store. Event handlers call set(); render functions subscribe and update the DOM.
export function createStore(initial) {
  let state = structuredClone(initial);
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      subs.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
