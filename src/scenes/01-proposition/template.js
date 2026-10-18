// Scene 01 markup. The Core itself is the global orb; this scene supplies its anchor, the rings around it
// and the three orbit labels. Positions are stage pixels: the Core sits centre-right at (1410, 540), 520 px wide.
export const CORE_CENTER = { x: 1410, y: 540 };
const RING_RADII = [340, 420, 500];
const LABELS = [                                  // on the first ring; angle in degrees, 0 = right, clockwise
  { text: 'Generate', angle: -52, color: 'var(--amber)' },
  { text: 'Store', angle: 22, color: 'var(--cyan)' },
  { text: 'Orchestrate', angle: 102, color: 'var(--text)' },
];

const ring = (r) =>
  `<div class="s1-ring" style="left:${CORE_CENTER.x - r}px; top:${CORE_CENTER.y - r}px; width:${2 * r}px; height:${2 * r}px"></div>`;

const label = ({ text, angle, color }) => {
  const rad = (angle * Math.PI) / 180;
  const x = CORE_CENTER.x + RING_RADII[0] * Math.cos(rad);
  const y = CORE_CENTER.y + RING_RADII[0] * Math.sin(rad);
  return `<span class="s1-label" style="left:${x.toFixed(0)}px; top:${y.toFixed(0)}px; color:${color}">${text}</span>`;
};

export function template() {
  return `
    <div class="s1-layer s1-grid" data-depth="0.3"></div>
    <div class="s1-layer s1-dots" data-depth="0.6"></div>
    <div class="s1-layer s1-rings" data-depth="0.8">${RING_RADII.map(ring).join('')}${LABELS.map(label).join('')}</div>

    <span class="tag s1-tag">Illustrative concept</span>
    <p class="eyebrow s1-eyebrow">A fictional microgrid proposal</p>
    <h1 class="s1-title">
      <span class="line" data-split>Energy,</span>
      <span class="line" data-split>in better</span>
      <span class="line"><span class="w-mask"><span class="w balance">balance.</span></span></span>
    </h1>
    <p class="s1-sub">A campus that can see the next peak coming — and choose what to do about it.</p>
    <button type="button" class="primary-btn s1-begin">Begin</button>

    <div class="s1-core-anchor" data-core-anchor style="left:${CORE_CENTER.x - 260}px; top:${CORE_CENTER.y - 260}px"></div>`;
}
