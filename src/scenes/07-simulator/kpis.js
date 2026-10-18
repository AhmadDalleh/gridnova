import { countTo } from '../../ui/count-up.js';
import { fmtMw, fmtAed, fmtYears, fmtHours } from '../../ui/format.js';

// The five headline KPIs. Each card = a big number (counted up) + one short caption.
// Every value comes from the model result; nothing here is typed in.
const KPIS = [
  { key: 'peak', label: 'Peak grid import', value: (r) => r.peakAfterMw, format: fmtMw,
    sub: (r) => `−${r.peakReductionPct.toFixed(1)} % from ${r.peakBeforeMw.toFixed(2)} MW` },
  { key: 'value', label: 'Net annual value', value: (r) => r.netAnnualValue, format: fmtAed, sub: () => 'after O&M, normal day' },
  { key: 'capex', label: 'Capex', value: (r) => r.capex, format: fmtAed, sub: () => 'solar + battery + platform' },
  { key: 'payback', label: 'Simple payback', value: (r) => r.paybackYears, format: fmtYears, sub: () => 'capex ÷ net annual value' },
  { key: 'resilience', label: 'Resilience', value: (r) => r.resilienceHours, format: fmtHours, sub: () => 'of 2.5 MW critical load' },
];

export function kpiHtml() {
  return KPIS.map((k) => `
    <article class="kpi" data-kpi="${k.key}">
      <h3 class="kpi-label">${k.label}</h3>
      <p class="kpi-value">0</p>
      <p class="kpi-sub"></p>
    </article>`).join('');
}

export function createKpis(root) {
  const cards = KPIS.map((k) => {
    const card = root.querySelector(`[data-kpi="${k.key}"]`);
    return { ...k, card, valueEl: card.querySelector('.kpi-value'), subEl: card.querySelector('.kpi-sub') };
  });

  return {
    cards: cards.map((c) => c.card),

    /** Show zeros (start state for the entrance count-up). */
    zero() {
      cards.forEach((c) => countTo(c.valueEl, 0, { format: (n) => c.format(n), immediate: true }));
    },

    /** Point every KPI at the new result. Returns the tweens so an entrance timeline can place them. */
    update(result, { animate = true, duration = 0.6, delay = 0, stagger = 0 } = {}) {
      return cards.flatMap((c, i) => {
        c.subEl.textContent = c.sub(result);
        const to = c.value(result);
        if (to === null) {                                  // payback "n/a": nothing to count
          c.valueEl._countTween?.kill();
          c.valueEl._shown = 0;
          c.valueEl.textContent = c.format(null);
          return [];
        }
        const t = countTo(c.valueEl, to, { format: (n) => c.format(n), immediate: !animate, duration, delay: delay + i * stagger });
        return t ? [t] : [];
      });
    },

    kill() { cards.forEach((c) => c.valueEl._countTween?.kill()); },
  };
}
