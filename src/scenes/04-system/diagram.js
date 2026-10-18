import { setNow } from '../../ui/set-now.js';
import { svgEl } from '../../ui/svg.js';
import { DIAGRAM, NODES, LINKS, linkPath, linksOf, nodeById } from './data.js';

const FLOW_DASH = '16 14';           // power link: the dashes that travel along it
const CONTROL_DASH = '4 12';         // control link: a finer dotted line, signals ride on it as pulses
const PULSE_PERIOD = 2.6;            // seconds for one control pulse to travel from the controller to a node

// The layered diagram: control links (dashed) under power links (solid-looking flowing dashes) under the nodes.
// Pattern: index.js changes state, then calls setLayer / setSelected here to re-render. This file never reads the store.
export function createDiagram(svg) {
  svg.setAttribute('viewBox', `0 0 ${DIAGRAM.width} ${DIAGRAM.height}`);
  const linkLayer = svgEl('g', { class: 's4-links' }, svg);
  const pulseLayer = svgEl('g', { class: 's4-pulses' }, svg);
  const nodeLayer = svgEl('g', { class: 's4-nodes' }, svg);

  const links = [...LINKS].sort((a, b) => (a.layer === 'control' ? -1 : 1) - (b.layer === 'control' ? -1 : 1)).map((def) => {
    const d = linkPath(def);
    const path = svgEl('path', { d, class: `s4-link ${def.layer}`, 'data-link': def.id }, linkLayer);
    const len = path.getTotalLength();
    const group = { def, path, len, flowing: false, offset: 0, label: null, pulse: null };
    if (def.label) {
      const mid = path.getPointAtLength(len * 0.32);       // near the source end, away from the busy middle
      group.label = svgEl('text', { x: mid.x + 14, y: mid.y - 12, class: 's4-link-label' }, linkLayer);
      group.label.textContent = def.label;
    }
    if (def.layer === 'control') group.pulse = svgEl('circle', { r: 7, class: 's4-pulse', opacity: 0 }, pulseLayer);
    return group;
  });

  const nodes = NODES.map((def) => {
    const r = def.id === 'controller' ? DIAGRAM.controllerRadius : DIAGRAM.nodeRadius;
    const g = svgEl('g', {
      class: `s4-node ${def.color}`, 'data-node': def.id, tabindex: 0, role: 'button', 'aria-pressed': 'false',
      'aria-label': `${def.name}: ${def.verb}. Press Enter for details.`, transform: `translate(${def.x} ${def.y})`,
    }, nodeLayer);
    svgEl('circle', { r, class: 's4-node-ring' }, g);
    if (def.icon) svgEl('path', { d: def.icon, class: 's4-icon' }, g);
    // Label placement: beside the node, on the side where no link leaves it (the controller's name goes below).
    const side = { left: { x: -(r + 18), anchor: 'end' }, right: { x: r + 18, anchor: 'start' }, below: { x: 0, anchor: 'middle' } }[def.side];
    const below = def.side === 'below';
    const name = svgEl('text', { x: side.x, y: below ? r + 34 : -2, class: 's4-node-name', 'text-anchor': side.anchor }, g);
    name.textContent = def.name;
    const verb = svgEl('text', { x: side.x, y: below ? -(r + 14) : 28, class: 's4-node-verb', 'text-anchor': side.anchor }, g);
    verb.textContent = def.verb;
    return { def, g };
  });

  const byId = (id) => links.find((l) => l.def.id === id);

  return {
    links,
    nodes: nodes.map((n) => n.g),

    /** Appends the draw-in of every link to `tl`, one after another starting at `at`. Flow starts when a link is complete. */
    drawIn(tl, at, { each = 0.28, overlap = 0.12 } = {}) {
      links.forEach((l, i) => {
        l.path.style.strokeDasharray = `${l.len}`;
        tl.fromTo(l.path, { strokeDashoffset: l.len }, {
          strokeDashoffset: 0, duration: each, ease: 'power1.inOut', onComplete: () => this.startFlow(l),
        }, at + i * (each - overlap));
        if (l.label) tl.fromTo(l.label, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, at + i * (each - overlap) + each);
      });
    },

    /** Before the draw-in: links invisible and not flowing. */
    hideLinks() {
      links.forEach((l) => {
        l.flowing = false;
        l.path.style.strokeDasharray = `${l.len}`;
        l.path.style.strokeDashoffset = `${l.len}`;
        if (l.label) setNow(l.label, { autoAlpha: 0 });
        l.pulse?.setAttribute('opacity', '0');
      });
    },

    /** The settled look: every link drawn and flowing (the dashes sit still until the loop moves them). */
    showLinks() {
      links.forEach((l) => {
        this.startFlow(l);
        if (l.label) setNow(l.label, { autoAlpha: 1 });
      });
    },

    startFlow(l) {
      l.flowing = true;
      l.path.style.strokeDasharray = l.def.layer === 'power' ? FLOW_DASH : CONTROL_DASH;
      l.path.style.strokeDashoffset = `${l.offset}`;
    },

    /** One animation frame of the flow (called from motion.loop, so it is already paused with everything else). */
    tick(now, dt) {
      links.forEach((l) => {
        if (!l.flowing) return;
        if (l.def.layer === 'power') {
          l.offset -= (l.def.speed * dt) / 1000;                // dashes advance in the arrow direction
          l.path.style.strokeDashoffset = l.offset.toFixed(2);
        } else if (l.pulse) {
          const t = ((now / 1000) / PULSE_PERIOD + LINKS.indexOf(l.def) * 0.23) % 1;
          const p = l.path.getPointAtLength(t * l.len);
          l.pulse.setAttribute('cx', p.x.toFixed(1));
          l.pulse.setAttribute('cy', p.y.toFixed(1));
          l.pulse.setAttribute('opacity', String(Math.sin(Math.PI * t).toFixed(2)));
        }
      });
    },

    stopPulses() { links.forEach((l) => l.pulse?.setAttribute('opacity', '0')); },

    /** Power / Control / Both. CSS does the fading from this class. */
    setLayer(layer) {
      svg.classList.remove('layer-power', 'layer-control', 'layer-both');
      svg.classList.add(`layer-${layer}`);
    },

    /** Focus a node: unrelated links and nodes dim. `null` clears it. */
    setSelected(id) {
      const related = id ? new Set(linksOf(id).map((l) => l.id)) : null;
      const neighbours = new Set(id ? linksOf(id).flatMap((l) => [l.from, l.to]) : []);
      svg.classList.toggle('has-selection', Boolean(id));
      links.forEach((l) => {
        const on = !related || related.has(l.def.id);
        l.path.classList.toggle('is-dim', !on);
        l.label?.classList.toggle('is-dim', !on);
      });
      nodes.forEach(({ def, g }) => {
        g.setAttribute('aria-pressed', String(def.id === id));
        g.classList.toggle('is-selected', def.id === id);
        g.classList.toggle('is-dim', Boolean(id) && def.id !== id && !neighbours.has(def.id));
      });
    },

    byId,
    node: (id) => nodeById(id),
  };
}
