// "May this scene play its choreography right now?" Paused or reduced motion means: jump to the finished state.
export const canAnimate = (store) => {
  const { paused, reducedMotion } = store.get();
  return !paused && !reducedMotion;
};
