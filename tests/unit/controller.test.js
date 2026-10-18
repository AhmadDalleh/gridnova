import { describe, it, expect } from 'vitest';
import { createController } from '../../src/core/controller.js';
import { createStore } from '../../src/core/store.js';

// Fake transition: stays "running" until the test calls finish(), and records overlap.
function setup({ paused = false, throwOnce = false } = {}) {
  const log = { running: 0, maxRunning: 0, runs: [], deactivated: [], activated: [] };
  const pendingFinish = [];
  let shouldThrow = throwOnce;

  const scenes = Array.from({ length: 5 }, (_, i) => ({
    id: `s${i}`,
    coreAnchor: '',
    enter: () => ({ progress() {}, then: () => Promise.resolve() }),
    activate: () => log.activated.push(i),
    deactivate: () => log.deactivated.push(i),
  }));

  const transitions = {
    standard({ dir }) {
      if (shouldThrow) { shouldThrow = false; throw new Error('boom'); }
      log.running++;
      log.maxRunning = Math.max(log.maxRunning, log.running);
      log.runs.push(dir);
      let done;
      const promise = new Promise((resolve) => { done = () => { log.running--; resolve(); }; });
      pendingFinish.push(done);
      return { progress: (p) => { if (p === 1) done(); }, then: () => promise };
    },
  };

  const store = createStore({ sceneIndex: 0, paused, reducedMotion: false });
  const core = { snapTo() {}, moveTo() {} };
  const controller = createController({ scenes, transitions, store, core });
  const finish = async () => { pendingFinish.shift()?.(); await new Promise((r) => setTimeout(r, 0)); };
  return { controller, store, log, finish };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('controller', () => {
  it('moves to a scene, updates the store, activates/deactivates', async () => {
    const { controller, store, log, finish } = setup();
    await controller.start(0);
    controller.goTo(2);
    await finish();
    expect(controller.index).toBe(2);
    expect(store.get().sceneIndex).toBe(2);
    expect(log.deactivated).toEqual([0]);
    expect(log.activated).toEqual([0, 2]);
  });

  it('clamps to the valid range and ignores the current scene', async () => {
    const { controller, log } = setup();
    await controller.start(0);
    controller.goTo(0);
    controller.goTo(-5);
    expect(log.runs).toHaveLength(0);
    controller.goTo(99);
    await tick();
    expect(log.runs).toHaveLength(1);
  });

  it('rapid requests never overlap and the last one wins', async () => {
    const { controller, log, finish } = setup();
    await controller.start(0);
    controller.goTo(1);
    controller.goTo(2);
    controller.goTo(3);
    controller.goTo(4);
    await finish();               // first transition (0 -> 1) ends, pending 4 starts
    await finish();               // 1 -> 4 ends
    expect(controller.index).toBe(4);
    expect(log.maxRunning).toBe(1);
    expect(log.runs).toHaveLength(2);
  });

  it('next/prev accumulate relative to the destination during a transition', async () => {
    const { controller, finish } = setup();
    await controller.start(0);
    controller.next();            // 0 -> 1 (running)
    controller.next();            // pending 2
    controller.next();            // pending 3
    await finish();
    await finish();
    expect(controller.index).toBe(3);
    controller.prev();
    controller.prev();
    await finish();
    await finish();
    expect(controller.index).toBe(1);
  });

  it('returning to the origin while busy ends on the origin', async () => {
    const { controller, finish } = setup();
    await controller.start(0);
    controller.goTo(1);
    controller.goTo(0);           // pending equals the scene we are leaving
    await finish();
    await finish();
    expect(controller.index).toBe(0);
  });

  it('releases busy even if a transition throws', async () => {
    const { controller, log, finish } = setup({ throwOnce: true });
    await controller.start(0);
    await expect(controller.goTo(1)).rejects.toThrow('boom');
    expect(controller.busy).toBe(false);
    controller.goTo(1);
    await finish();
    expect(controller.index).toBe(1);
    expect(log.runs).toHaveLength(1);
  });

  it('while paused, a busy transition is jumped to its end so the queue drains', async () => {
    const { controller, store } = setup({ paused: true });
    await controller.start(0);
    controller.goTo(1);           // paused: finishes itself via progress(1)
    controller.goTo(3);
    await tick();
    await tick();
    expect(controller.index).toBe(3);
    expect(store.get().sceneIndex).toBe(3);
  });
});
