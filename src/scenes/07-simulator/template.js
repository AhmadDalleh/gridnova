import { RANGES } from '../../model/constants.js';
import { kpiHtml } from './kpis.js';
import { drawerHtml } from './drawer.js';

const { solarMw, batteryMwh } = RANGES;

// Static markup only: all numbers are filled in by render() from the model result.
export function template() {
  return `
    <header class="s7-head">
      <p class="eyebrow">07 · Explore the design <span class="tag">Illustrative</span></p>
      <h1 class="s7-title">Size the system for your priorities.</h1>
    </header>

    <section class="s7-inputs" aria-label="Design inputs">
      <div class="field">
        <label for="in-solar">Solar capacity</label>
        <output id="out-solar" for="in-solar"></output>
        <input id="in-solar" type="range" min="${solarMw.min}" max="${solarMw.max}" step="${solarMw.step}">
      </div>
      <div class="field">
        <label for="in-battery">Battery energy</label>
        <output id="out-battery" for="in-battery"></output>
        <input id="in-battery" type="range" min="${batteryMwh.min}" max="${batteryMwh.max}" step="${batteryMwh.step}">
      </div>
      <div class="field">
        <span class="field-label" id="lbl-day">Day type</span>
        <div class="seg" role="group" aria-labelledby="lbl-day">
          <button type="button" data-day="normal">Normal</button>
          <button type="button" data-day="heatwave">Heatwave</button>
        </div>
      </div>
      <div class="field">
        <span class="field-label" id="lbl-preset">Presets</span>
        <div class="seg" role="group" aria-labelledby="lbl-preset">
          <button type="button" data-preset="baseline">Baseline</button>
          <button type="button" data-preset="balanced">Balanced</button>
          <button type="button" data-preset="resilience">Resilience</button>
        </div>
      </div>
      <button type="button" id="btn-assumptions" class="link-btn" aria-expanded="false" aria-controls="s7-drawer">Assumptions</button>
    </section>

    <section class="s7-chart" aria-label="24-hour dispatch chart">
      <svg id="s7-svg" role="img" aria-label="Hourly load, solar, battery and grid import over 24 hours"></svg>
      <ul class="legend">
        <li><i class="sw sw-solar"></i>Solar</li>
        <li><i class="sw sw-discharge"></i>Battery discharge</li>
        <li><i class="sw sw-grid"></i>Grid supply</li>
        <li><i class="sw sw-charge"></i>Grid recharging battery</li>
        <li><i class="sw sw-before"></i>Load, before</li>
        <li><i class="sw sw-after"></i>Grid import, after</li>
      </ul>
      <p class="heat-note" id="heat-note" hidden>Stress view: peak figures show the heatwave; value, capex and payback use a normal day.</p>
    </section>

    <section class="s7-kpis" aria-label="Results">${kpiHtml()}</section>

    <div class="s7-core-anchor" data-core-anchor></div>

    <aside class="s7-drawer" id="s7-drawer" role="dialog" aria-labelledby="drawer-title" hidden>${drawerHtml()}</aside>`;
}
