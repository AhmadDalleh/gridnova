import { stagePoint } from './chart.js';

const CORE_SIZE = 56;   // the Core shrinks to this size and becomes the marker on the peak

// Static markup. Numbers are filled in by index.js from the model; the Core anchor sits exactly on the curve's peak.
export function template(peakHour, peakMw, stats) {
  const p = stagePoint(peakHour, peakMw);
  return `
    <header class="s2-head">
      <p class="eyebrow">02 · The pressure <span class="tag">Illustrative</span></p>
      <h1 class="s2-title">Demand peaks. Control lags.</h1>
    </header>

    <section class="s2-chart" aria-label="Campus load over 24 hours">
      <svg id="s2-chart" tabindex="0" role="slider" aria-label="Campus load by hour. Use left and right arrows."
           aria-valuemin="0" aria-valuemax="24" aria-valuenow="15"></svg>
    </section>

    <section class="s2-stats" aria-label="Baseline figures">
      ${stats.map((s) => `
      <article class="s2-stat" data-stat="${s.key}">
        <h3 class="s2-stat-label">${s.label}</h3>
        <p class="s2-stat-value">0</p>
        <p class="s2-stat-sub">${s.sub}</p>
      </article>`).join('')}
    </section>

    <p class="s2-note">Fictional campus. Illustrative assumptions.</p>

    <div class="s2-core-anchor" data-core-anchor
         style="left:${p.x - CORE_SIZE / 2}px; top:${p.y - CORE_SIZE / 2}px; width:${CORE_SIZE}px; height:${CORE_SIZE}px"></div>`;
}
