import { EXCLUSIONS, ECON } from '../../model/constants.js';
import { fmtAed } from '../../ui/format.js';

// Static markup of scene 08. Numbers are filled by index.js from the live simulator state.
export function template() {
  return `
    <header class="s8-head">
      <p class="eyebrow">08 · The business case <span class="tag">Illustrative</span></p>
      <h1 class="s8-title">Make value auditable.</h1>
    </header>
    <p class="s8-note">These figures update with your choices in scene 07. Economics use the normal day.</p>

    <div class="s8-cards">
      ${['capex', 'net', 'payback', 'peak'].map((k) => `
      <article class="s8-card" data-card="${k}" tabindex="0"><h3></h3><p class="s8-card-value">0</p></article>`).join('')}
    </div>

    <section class="s8-chart s8-wf" aria-label="Annual value waterfall"><h2>One year of value</h2><svg id="s8-wf" width="820" height="360"></svg></section>
    <section class="s8-chart s8-cf" aria-label="Ten-year cash flow"><h2>Ten-year cash flow</h2><svg id="s8-cf" width="820" height="360"></svg></section>

    <p class="s8-formula" aria-live="polite">Hover or focus a bar or a number to see its formula.</p>

    <p class="s8-assume" style="top:810px"><b>Assumptions:</b> energy AED ${ECON.tariffAedPerMwh}/MWh · demand charge ${fmtAed(ECON.demandChargeAedPerMwMonth)}/MW/month · solar ${fmtAed(ECON.solarCapexAedPerMw)}/MW · battery ${fmtAed(ECON.batteryCapexAedPerMwh)}/MWh · platform ${fmtAed(ECON.platformCapexAed)} · O&amp;M ${(ECON.omFraction * 100).toFixed(1)} % of capex</p>
    <p class="s8-assume" style="top:882px"><b>Not included:</b> ${EXCLUSIONS.join(' · ')}</p>

    <div class="s8-core-anchor" data-core-anchor></div>`;
}
