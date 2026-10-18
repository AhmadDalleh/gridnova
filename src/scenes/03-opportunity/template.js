import { ZONES, OUTCOMES, PERSONAS } from './zones.js';

// Static markup of scene 03. Zone chips and badges are positioned by index.js after measuring the 3D map.
export function template() {
  return `
    <header class="s3-head">
      <p class="eyebrow">03 · The opportunity <span class="tag">Illustrative</span></p>
      <h1 class="s3-title">Turn the campus into a coordinated asset.</h1>
    </header>

    <div class="s3-camera">
      <div class="s3-rig"><div class="s3-plane"></div></div>
      <div class="s3-labels">
        ${ZONES.map((z) => `<button type="button" class="s3-chip" data-chip="${z.id}" data-kind="${z.kind}" aria-pressed="false">${z.name}</button>`).join('')}
      </div>
      <div class="s3-badges">
        ${OUTCOMES.map((o) => `<div class="s3-badge" data-badge="${o.zone}" aria-hidden="true">${o.n}</div>`).join('')}
      </div>
    </div>

    <ol class="s3-outcomes" aria-label="Outcomes">
      ${OUTCOMES.map((o) => `<li class="s3-outcome"><b>${o.n}</b>${o.text}</li>`).join('')}
    </ol>

    <aside class="s3-card" aria-live="polite" aria-label="Zone details">
      <p class="s3-card-hint">Select a zone on the map.</p>
      <div class="s3-card-body" hidden>
        <h2 class="s3-card-name"></h2>
        <p class="s3-card-label"></p>
        <p class="s3-card-value"></p>
        <p class="s3-card-note"></p>
        <dl class="s3-card-list">
          <dt>Load</dt><dd class="s3-card-load"></dd>
          <dt>Flexibility</dt><dd class="s3-card-flex"></dd>
          <dt>Role</dt><dd class="s3-card-role"></dd>
        </dl>
      </div>
    </aside>

    <ul class="s3-personas" aria-label="Who gains">
      ${PERSONAS.map((p) => `<li class="s3-persona"><b>${p.who}</b><span>${p.gain}</span></li>`).join('')}
    </ul>

    <div class="s3-core-anchor" data-core-anchor></div>`;
}
