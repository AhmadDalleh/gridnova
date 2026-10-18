import { SHAPES } from './particles.js';

// The three capabilities (conceptual). `day` / `night` say what the capability is doing in each state, and
// `active` lists the states in which it is the one acting (the panel lights up).
export const CAPABILITIES = [
  { id: 'forecast', name: 'Forecast', text: 'Reads weather, calendar and load history to see the peak hours ahead.',
    day: 'Now: tracking sun and heat to size the afternoon.', night: 'Resting: tomorrow’s forecast waits for the morning.', active: ['day'] },
  { id: 'orchestrate', name: 'Orchestrate', text: 'Chooses when the battery, flexible loads and grid act, inside set limits.',
    day: 'Now: sun fills the battery and serves the campus.', night: 'Now: the battery serves the campus; the grid trickle shrinks.', active: ['day', 'night'] },
  { id: 'learn', name: 'Learn', text: 'Compares every plan with what happened and tunes the next one.',
    day: 'Resting: the day is still being recorded.', night: 'Now: reviewing the day to improve tomorrow’s plan.', active: ['night'] },
];

const box = (s) => `left:${s.x}px; top:${s.y}px; width:${s.w}px; height:${s.h}px`;

// Static markup of scene 06. The labelled shapes use the same coordinates as the particle routes (particles.js).
export function template() {
  return `
    <div class="s6-sky" aria-hidden="true"><div class="s6-sky-day"></div><div class="s6-sky-night"></div><div class="s6-orb"></div></div>

    <header class="s6-head">
      <p class="eyebrow">06 · Capability <span class="tag">Illustrative</span> <span class="tag">Conceptual</span></p>
      <h1 class="s6-title">Forecast. Orchestrate. Learn.</h1>
      <p class="s6-statement">Human-supervised. Explainable decisions.</p>
    </header>

    <div class="s6-controls">
      <div class="s6-toggle" role="group" aria-label="Time of day">
        <button type="button" data-mode="day" aria-pressed="true">Day</button>
        <button type="button" data-mode="night" aria-pressed="false">Night</button>
      </div>
      <ul class="s6-legend" aria-label="Legend">
        <li><i style="background:var(--amber)"></i>Solar</li>
        <li><i style="background:var(--cyan)"></i>Battery</li>
        <li><i style="background:var(--coral)"></i>Grid</li>
      </ul>
    </div>

    <div class="s6-shape s6-solar" style="${box(SHAPES.solar)}"><span>Solar</span></div>
    <div class="s6-shape s6-battery" style="${box(SHAPES.battery)}"><span>Battery</span></div>
    <div class="s6-shape s6-buildings" style="${box(SHAPES.buildings)}" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b><b></b></div>
    <p class="s6-label" style="left:${SHAPES.buildings.x + SHAPES.buildings.w + 20}px; top:${SHAPES.buildings.y + 30}px">Campus</p>
    <div class="s6-shape s6-grid" style="${box(SHAPES.grid)}" aria-hidden="true"></div>
    <p class="s6-label" style="left:${SHAPES.grid.x}px; top:${SHAPES.grid.y + SHAPES.grid.h + 8}px">Utility grid</p>

    <canvas id="s6-canvas" width="1920" height="1080" aria-hidden="true"></canvas>

    <ol class="s6-panels" aria-label="Capabilities">
      ${CAPABILITIES.map((c) => `
      <li class="s6-panel" data-cap="${c.id}">
        <h2>${c.name}</h2>
        <p class="s6-panel-text">${c.text}</p>
        <p class="s6-panel-state"></p>
      </li>`).join('')}
    </ol>

    <div class="s6-core-anchor" data-core-anchor></div>`;
}
