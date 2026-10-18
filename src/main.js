import { gsap } from 'gsap';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/stage.css';
import './styles/nav.css';

import { createStore } from './core/store.js';
import { createMotion } from './core/motion.js';
import { fitStage } from './core/stage.js';
import { createCore } from './core/core-orb.js';
import { createController } from './core/controller.js';
import { transitions } from './core/transitions.js';
import { createNav, parseHash } from './core/nav.js';
import { DEFAULT_SIM } from './model/constants.js';

import proposition from './scenes/01-proposition/index.js';
import pressure from './scenes/02-pressure/index.js';
import opportunity from './scenes/03-opportunity/index.js';
import system from './scenes/04-system/index.js';
import peakEvent from './scenes/05-peak-event/index.js';
import capability from './scenes/06-capability/index.js';
import simulator from './scenes/07-simulator/index.js';
import businessCase from './scenes/08-business-case/index.js';
import decision from './scenes/09-decision/index.js';

const sceneModules = [proposition, pressure, opportunity, system, peakEvent, capability, simulator, businessCase, decision];

// Fonts are inlined as data URIs, but the browser still decodes them lazily.
// Load every weight we use up-front so no scene ever shows a fallback font (R24). Never blocks > 3 s.
async function waitForFonts() {
  const faces = ['500 1em "Space Grotesk"', '700 1em "Space Grotesk"', '400 1em Inter', '600 1em Inter'];
  const loaded = Promise.all(faces.map((f) => document.fonts.load(f))).then(() => document.fonts.ready);
  await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 3000))]);
}

async function boot() {
  const stageEl = document.getElementById('stage');
  const scenesEl = document.getElementById('scenes');

  // `sim` holds only the simulator INPUTS; results are derived with createSimSelector(store), never stored.
  const store = createStore({
    sceneIndex: 0,
    paused: false,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    sim: { ...DEFAULT_SIM },
  });
  const motion = createMotion(store);
  fitStage(stageEl);
  const core = createCore(stageEl, motion);

  // Mount every scene once into its own container; the controller only ever shows/hides containers.
  const scenes = sceneModules.map((module) => {
    const root = document.createElement('section');
    root.className = 'scene';
    root.dataset.scene = module.id;
    scenesEl.append(root);
    module.mount(root, { store, motion, core });
    return { ...module, el: root };
  });

  await waitForFonts();

  const controller = createController({
    scenes,
    transitions,
    store,
    core,
    // Keep the URL in sync so a refresh (or a pasted link) resumes the same scene.
    onChange: (i) => history.replaceState(null, '', `#/scene-${i + 1}`),
  });
  createNav({ controller, store, motion, scenes });

  const hashIndex = parseHash();
  await controller.start(hashIndex ?? 0);

  const preloader = document.getElementById('preloader');
  gsap.to(preloader, { autoAlpha: 0, duration: store.get().reducedMotion ? 0 : 0.4, onComplete: () => preloader.remove() });
}

boot();
