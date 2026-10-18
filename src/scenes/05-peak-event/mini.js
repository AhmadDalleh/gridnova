import { svgEl } from '../../ui/svg.js';
import { NODES, LINKS, linkPath, DIAGRAM } from '../04-system/data.js';

// The mini system diagram: the same nodes and links as scene 04 (shared data), drawn small. Each stage lights a
// different part of it (see miniState() in figures.js); CSS turns data-state into colour and thickness.
const SCALE = 0.34;
const PAD = { x: 50, y: 44 };
const SHIFT_Y = -40;                                        // scene 04 leaves room at the top for labels; the mini does not need it
const SHORT = { grid: 'Grid', demand: 'Demand', controller: 'GridNova' };

export function createMini(svg) {
  const w = Math.round(DIAGRAM.width * SCALE + PAD.x * 2);
  const h = Math.round((DIAGRAM.height + SHIFT_Y) * SCALE + PAD.y * 2 + 10);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(w));                       // shown 1:1, so the labels are really 22 px
  svg.setAttribute('height', String(h));
  const root = svgEl('g', { transform: `translate(${PAD.x} ${PAD.y}) scale(${SCALE})` }, svg);
  const links = Object.fromEntries(LINKS.map((l) => [l.id, svgEl('path', { d: linkPath(l), class: `s5-mini-link ${l.layer}`, 'data-link': l.id, 'data-state': 'off', transform: `translate(0 ${SHIFT_Y})` }, root)]));
  const nodes = Object.fromEntries(NODES.map((n) => {
    const g = svgEl('g', { class: `s5-mini-node ${n.color}`, transform: `translate(${n.x} ${n.y + SHIFT_Y})`, 'data-state': 'off' }, root);
    svgEl('circle', { r: n.id === 'controller' ? DIAGRAM.controllerRadius : DIAGRAM.nodeRadius }, g);
    return [n.id, g];
  }));
  // Names are drawn outside the scaled group, so they stay 22 px on the stage.
  NODES.forEach((n) => {
    const r = (n.id === 'controller' ? DIAGRAM.controllerRadius : DIAGRAM.nodeRadius) * SCALE;
    const above = n.y < 200;                                // top nodes (solar, grid) get their name above, the rest below
    const y = PAD.y + (n.y + SHIFT_Y) * SCALE + (above ? -r - 10 : r + 24);
    const t = svgEl('text', { x: PAD.x + n.x * SCALE, y, class: 's5-mini-label', 'text-anchor': 'middle' }, svg);
    t.textContent = SHORT[n.id] ?? n.name;
  });
  return {
    render(state) {
      Object.entries(state.links).forEach(([id, v]) => links[id].setAttribute('data-state', v));
      Object.entries(state.nodes).forEach(([id, v]) => nodes[id].setAttribute('data-state', v));
    },
  };
}
