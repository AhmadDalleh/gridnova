import { describe, it, expect } from 'vitest';
import { gsap } from 'gsap';
import { transitions } from '../../src/core/transitions.js';
import { STANDARD, TRANSITION_A, TRANSITION_A_BACK } from '../../src/core/timing.js';

// Fake scenes/Core with the same durations the real ones use, so we can check the choreography maths
// and the call order without a browser.
function fakes(order = []) {
  const scene = (name) => ({
    exit: (dir, reduced) => { order.push(`${name}.exit`); return gsap.to({}, { duration: 0.3 }); },
    enter: () => { order.push(`${name}.enter`); return gsap.timeline().to({}, { duration: 0.45 }); },
  });
  const core = { moveTo: (to, vars) => { order.push('core.moveTo'); return gsap.to({}, { duration: vars.duration ?? 0.9 }); } };
  return { from: scene('from'), to: scene('to'), core };
}
const run = (key, extra = {}) => {
  const order = [];
  const f = fakes(order);
  const tl = (transitions[key] ?? transitions.standard)({ ...f, dir: 1, reduced: false, ...extra });
  return { tl, order };
};

describe('transitions', () => {
  it('standard stays within the live-presenting budget (<= 0.7 s)', () => {
    const { tl } = run('standard');
    expect(tl.duration()).toBeCloseTo(Math.max(STANDARD.core, STANDARD.enterDelay + STANDARD.enter), 5);   // the longest layer wins
    expect(tl.duration()).toBeLessThanOrEqual(0.7);
  });

  it('A (01 -> 02) ends when the Core lands, and the incoming frame is in place before that', () => {
    const { tl } = run('0>1');
    const landing = TRANSITION_A.coreDelay + TRANSITION_A.core;
    expect(tl.duration()).toBeCloseTo(landing, 5);
    expect(TRANSITION_A.enterDelay + 0.45).toBeLessThanOrEqual(landing);
  });

  it('the Core move is created before the incoming scene enters (it measures the anchor first)', () => {
    for (const key of ['standard', '0>1', '1>0']) {
      const { order } = run(key);
      expect(order.indexOf('core.moveTo'), key).toBeLessThan(order.indexOf('to.enter'));
    }
  });

  it('A has a reverse (02 -> 01) that also ends when the Core lands', () => {
    expect(transitions['1>0']).toBeTypeOf('function');
    const { tl } = run('1>0', { dir: -1 });
    expect(tl.duration()).toBeCloseTo(TRANSITION_A_BACK.coreDelay + TRANSITION_A_BACK.core, 5);
  });

  it('reduced motion turns A and its reverse into the short standard cross-fade', () => {
    for (const key of ['0>1', '1>0']) {
      const { tl } = run(key, { reduced: true });
      expect(tl.duration(), key).toBeLessThanOrEqual(0.45);   // exit/enter fakes are fixed; the Core is 0.2 s
      const core = run(key, { reduced: true });
      expect(core.order).toContain('core.moveTo');
    }
  });
});
