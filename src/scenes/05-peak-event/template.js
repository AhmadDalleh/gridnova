import { STAGES } from './figures.js';

// Static markup of scene 05. Texts that come from the model (stage details, outcome card) are filled by index.js.
export function template() {
  return `
    <header class="s5-head">
      <p class="eyebrow">05 · A peak event <span class="tag">Illustrative</span></p>
      <h1 class="s5-title">See the peak. Change the response.</h1>
    </header>

    <div class="s5-controls">
      <div class="s5-toggle" role="group" aria-label="Scenario">
        <button type="button" data-mode="without" aria-pressed="false">Without GridNova</button>
        <button type="button" data-mode="with" aria-pressed="true">With GridNova</button>
      </div>
      <button type="button" class="s5-play" id="s5-play">Play the afternoon</button>
      <p class="s5-sizing">A fictional heatwave afternoon · Balanced design (4 MW solar, 8 MWh battery)</p>
    </div>

    <ol class="s5-rail" aria-label="Stages of the event">
      ${STAGES.map((s) => `
      <li><button type="button" class="s5-stage" data-stage="${s.n}" aria-pressed="false">
        <span class="s5-stage-n">0${s.n}</span><span class="s5-stage-name">${s.name}</span>
        <span class="s5-stage-detail"></span>
      </button></li>`).join('')}
    </ol>

    <section class="s5-chart" aria-label="Grid import during the heatwave afternoon">
      <svg id="s5-chart" width="1100" height="500" role="img" aria-label="Grid import in megawatts, 08:00 to 22:00"></svg>
    </section>

    <aside class="s5-side">
      <svg id="s5-mini" role="img" aria-label="System diagram, state of the current stage"></svg>
      <article class="s5-outcome" aria-live="polite">
        <h2 class="s5-outcome-label"></h2>
        <p class="s5-outcome-value"></p>
        <p class="s5-outcome-caption"></p>
        <p class="s5-outcome-avoided"></p>
      </article>
    </aside>

    <div class="s5-core-anchor" data-core-anchor></div>`;
}
