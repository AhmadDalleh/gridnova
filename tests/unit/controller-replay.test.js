import { describe, it, expect } from 'vitest';
import { createController } from '../../src/core/controller.js';
import { createStore } from '../../src/core/store.js';

function setup() {
  const log = [];
  const scenes = Array.from({ length: 4 }, (_, i) => ({
    id: `s${i}`,
    enter: () => { log.push(`enter${i}`); return { progress() {}, then: () => Promise.resolve() }; },
    activate: () => log.push(`activate${i}`),
    deactivate: () => log.push(`deactivate${i}`),
    reset: () => log.push(`reset${i}`),
  }));
  const transitions = { standard: () => ({ progress() {}, then: () => Promise.resolve() }) };
  const store = createStore({ sceneIndex: 0, paused: false, reducedMotion: false });
  const core = { snapTo() {} };
  return { controller: createController({ scenes, transitions, store, core }), log };
}

describe('replay', () => {
  it('from another scene: resets the other scenes first, the scene on screen after it has left, and lands on 01', async () => {
    const { controller, log } = setup();
    await controller.start(0);
    await controller.goTo(2);
    log.length = 0;
    await controller.replay();
    expect(controller.index).toBe(0);
    const firstTransition = log.indexOf('deactivate2');
    expect(log.indexOf('reset0')).toBeLessThan(firstTransition);       // 01 is reset before it is re-entered
    expect(log.indexOf('reset1')).toBeLessThan(firstTransition);
    expect(log.indexOf('reset3')).toBeLessThan(firstTransition);
    expect(log.lastIndexOf('reset2')).toBeGreaterThan(firstTransition); // the scene we left is reset after it left
    expect(log.filter((e) => e === 'reset2')).toHaveLength(1);
  });

  it('on scene 01: re-plays the opening in place (deactivate, reset, enter, activate)', async () => {
    const { controller, log } = setup();
    await controller.start(0);
    log.length = 0;
    await controller.replay();
    expect(log).toContain('reset0');
    expect(log.indexOf('reset0')).toBeLessThan(log.indexOf('enter0'));
    expect(log.indexOf('enter0')).toBeLessThan(log.indexOf('activate0'));
    expect(controller.index).toBe(0);
  });
});
