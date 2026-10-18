import { gsap } from 'gsap';
import { setNow } from '../../ui/set-now.js';
import './scene.css';
import { revealScene, hideScene } from '../../ui/reveal.js';
import { splitWords } from '../../ui/split.js';
import { canAnimate } from '../../ui/motion-state.js';
import { template } from './template.js';
import { createDiagram } from './diagram.js';
import { nodeById } from './data.js';

// Scene 04: the system. Selection and layer live in the store (ui.selectedNode, ui.layer); render() reads them.
//
//   enter()     frame reveal (quick). Arriving by composed transition B the frame only fades in: the Core is
//               flying to the centre and becomes the controller node, so nothing should slide.
//   activate()  nodes pop in around the Core, then the links DRAW IN one by one (power amber, control cyan),
//               then flow starts: dashes travel along power links, pulses leave the controller along control links.
//   exit()      stops a running draw (snaps to the settled look first), then fades out.
let el;
let ctx;
let n;
let diagram;
let titleWords;
let scope;
let unsubscribe;
let stopLoop;
let choreo;
let last;                                   // last { selectedNode, layer } rendered
let prepared = false;

const nodeEls = () => diagram.nodes.filter((g) => g.dataset.node !== 'controller');
const rest = () => [...nodeEls(), n.panel, n.layers, n.legend];

function settle() {
  diagram.showLinks();
  setNow([...rest(), ...diagram.nodes], { autoAlpha: 1, scale: 1 });
  setNow(titleWords, { yPercent: 0 });
  setNow(el, { autoAlpha: 1, x: 0 });
  ctx.core.show();
}

function rewind() {
  diagram.hideLinks();
  setNow(nodeEls(), { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' });
  setNow([n.panel, n.layers, n.legend], { autoAlpha: 0 });
}

// ---- render: state -> DOM ------------------------------------------------------------------------------------
function render() {
  const { ui } = ctx.store.get();
  last = { selectedNode: ui.selectedNode, layer: ui.layer };
  diagram.setLayer(ui.layer);
  diagram.setSelected(ui.selectedNode);
  n.layerBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layer === ui.layer)));
  const node = ui.selectedNode && nodeById(ui.selectedNode);
  n.hint.hidden = Boolean(node);
  n.body.hidden = !node;
  if (!node) return;
  n.verb.textContent = node.verb;
  n.name.textContent = node.name;
  ['input', 'output', 'value', 'decides'].forEach((f) => { n.fields[f].textContent = node[f]; });
  n.live.textContent = node.live(ctx.selectSim());       // live figure from the simulator state, never typed in
}

// ---- handlers: change state only ------------------------------------------------------------------------------
function setUi(patch) {
  ctx.store.set({ ui: { ...ctx.store.get().ui, ...patch } });
}
function onClick(e) {
  const layerBtn = e.target.closest('[data-layer]');
  const node = e.target.closest('[data-node]');
  if (e.detail > 0) (layerBtn ?? node)?.blur();          // after a mouse click, arrow keys go back to scene navigation
  if (layerBtn) { setUi({ layer: layerBtn.dataset.layer }); return; }
  if (node) setUi({ selectedNode: ctx.store.get().ui.selectedNode === node.dataset.node ? null : node.dataset.node });
}
function onKeyDown(e) {
  const node = e.target.closest?.('[data-node]');
  if (node && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } else if (e.key === 'Escape' && ctx.store.get().ui.selectedNode) setUi({ selectedNode: null });
}
function onState(state) {
  if (state.ui.selectedNode !== last.selectedNode || state.ui.layer !== last.layer) render();
}

// ---- the choreography (activate) ----------------------------------------------------------------------------------
// 0.0  panel, layer toggle and legend fade in             0.0  outer nodes pop in, staggered 0.1 s
// 0.35 links draw in one after another (0.28 s each, overlapping), labels follow; each starts flowing when complete
// 2.0  Core pulses: the controller has "switched on" the loop
function play() {
  choreo = gsap.timeline();
  choreo.to([n.panel, n.layers, n.legend], { autoAlpha: 1, duration: 0.4 }, 0);
  choreo.to(nodeEls(), { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)', stagger: 0.1 }, 0);
  diagram.drawIn(choreo, 0.35);
  choreo.add(ctx.core.pulse(), 2.0);
}

export default {
  id: 'system',
  title: 'The system',
  coreAnchor: '[data-core-anchor]',

  mount(root, context) {
    el = root;
    ctx = context;
    el.innerHTML = template();
    const q = (s) => el.querySelector(s);
    diagram = createDiagram(q('.s4-svg'));
    n = {
      panel: q('.s4-panel'), layers: q('.s4-layers'), legend: q('.s4-legend'),
      layerBtns: [...el.querySelectorAll('[data-layer]')],
      hint: q('.s4-panel-hint'), body: q('.s4-panel-body'), verb: q('.s4-panel-verb'), name: q('.s4-panel-name'), live: q('.s4-panel-live'),
      fields: Object.fromEntries(['input', 'output', 'value', 'decides'].map((f) => [f, q(`[data-f="${f}"]`)])),
    };
    titleWords = splitWords(q('.s4-title'));
  },

  enter(dir, { composed = false } = {}) {
    const { reducedMotion } = ctx.store.get();
    render();
    const animate = canAnimate(ctx.store);
    if (animate) rewind();
    else settle();
    prepared = animate;
    setNow(diagram.nodes.find((g) => g.dataset.node === 'controller'), { autoAlpha: 1, scale: 1 });
    if (composed && !reducedMotion) {                    // transition B: the Core is the centrepiece, just fade the frame in
      setNow(el, { x: 0 });
      return gsap.timeline().fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power1.out' });
    }
    const tl = revealScene(el, reducedMotion, dir);
    if (animate) tl.fromTo(titleWords, { yPercent: 110 }, { yPercent: 0, duration: 0.3, ease: 'power3.out', stagger: 0.04 }, 0.05);
    return tl;
  },

  exit(dir) {
    if (choreo?.isActive() || prepared) { choreo?.kill(); settle(); }
    choreo = null;
    prepared = false;
    return hideScene(el, ctx.store.get().reducedMotion, dir);
  },

  activate() {
    scope = ctx.motion.scope();
    scope.listen(el, 'click', onClick);
    scope.listen(document, 'keydown', onKeyDown);
    unsubscribe = ctx.store.subscribe(onState);
    stopLoop = ctx.motion.loop((now, dt) => diagram.tick(now, dt));   // flow + pulses: stops on pause, reduced motion, hidden tab
    if (prepared) {
      prepared = false;
      if (canAnimate(ctx.store)) play();
      else settle();
    }
  },

  deactivate() {
    scope?.dispose();
    unsubscribe?.();
    stopLoop?.();
    choreo?.kill();
    choreo = null;
    diagram.stopPulses();
  },

  reset() {
    choreo?.kill();
    choreo = null;
    prepared = false;
    const { ui } = ctx.store.get();
    ctx.store.set({ ui: { ...ui, selectedNode: null, layer: 'both' } });
  },
};
