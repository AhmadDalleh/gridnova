import { DIAGRAM } from './data.js';

// Static markup of scene 04. The SVG content is built by diagram.js; the Core lands on the controller node.
export function template() {
  return `
    <header class="s4-head">
      <p class="eyebrow">04 · The system <span class="tag">Illustrative</span></p>
      <h1 class="s4-title">One loop. Three levers.</h1>
    </header>

    <div class="s4-layers" role="group" aria-label="Layer">
      <button type="button" data-layer="power" aria-pressed="false">Power</button>
      <button type="button" data-layer="control" aria-pressed="false">Control</button>
      <button type="button" data-layer="both" aria-pressed="true">Both</button>
    </div>

    <svg class="s4-svg layer-both" width="${DIAGRAM.width}" height="${DIAGRAM.height}" role="group" aria-label="System diagram"></svg>

    <ul class="s4-legend" aria-label="Legend">
      <li><svg width="70" height="12"><line x1="0" y1="6" x2="70" y2="6" class="s4-key-power"/></svg> Power flow</li>
      <li><svg width="70" height="12"><line x1="0" y1="6" x2="70" y2="6" class="s4-key-control"/></svg> Control signal</li>
    </ul>

    <aside class="s4-panel" aria-live="polite" aria-label="Node details">
      <p class="s4-panel-hint">Select a node to see what goes in, what comes out and why.</p>
      <div class="s4-panel-body" hidden>
        <p class="s4-panel-verb"></p>
        <h2 class="s4-panel-name"></h2>
        <dl>
          <dt>Input</dt><dd data-f="input"></dd>
          <dt>Output</dt><dd data-f="output"></dd>
          <dt>Value</dt><dd data-f="value"></dd>
          <dt>How GridNova decides</dt><dd data-f="decides"></dd>
        </dl>
        <p class="s4-panel-live"></p>
      </div>
    </aside>

    <div class="s4-core-anchor" data-core-anchor></div>`;
}
