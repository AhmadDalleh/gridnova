// GridNova demo model and presentation controller. No network requests or module loading.
(() => {
  'use strict';
  const scenes = [...document.querySelectorAll('.scene')];
  const reducedPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let currentScene = -1;
  let solar = 4;
  let battery = 8;
  let scenario = 'balanced';
  const $ = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const currencyK = (n) => '$' + Math.round(n / 1000) + 'k';

  // Illustrative only: 10 MW site peak, annual energy proxy 30,000 MWh,
  // 120 USD/MWh energy, 250 peak days, 75% solar coincidence and battery
  // discharge = min(capacity/4h, 4 MW) at peak. No demand charge or losses.
  // Annual value uses avoided MWh × assumed rate; simple payback is capex/value.
  function calculate(solarMw, batteryMwh, preset) {
    const s = clamp(Number(solarMw) || 0, 0, 10);
    const b = clamp(Number(batteryMwh) || 0, 0, 24);
    const solarAtPeak = Math.min(4, s * 0.75);
    const batteryAtPeak = Math.min(4, b / 4);
    const gridAtPeak = clamp(10 - solarAtPeak - batteryAtPeak, 0, 10);
    const annualSolar = s * 0.18 * 8760 * 0.78;
    const annualBattery = batteryAtPeak * 3 * 250;
    const avoidedMwh = clamp(annualSolar + annualBattery, 0, 30000);
    const rate = 120;
    const savings = avoidedMwh * rate;
    const capex = s * 850000 + b * 300000;
    const payback = savings > 0 ? capex / savings : null;
    const reserve = b * 0.8;
    const resilienceHours = b > 0 ? reserve / 2.5 : 0;
    return { solarMw:s, batteryMwh:b, solarAtPeak, batteryAtPeak, gridAtPeak, reliance:gridAtPeak*10, avoidedMwh, savings, capex, payback, resilienceHours, preset };
  }

  function renderModel() {
    const result = calculate(solar, battery, scenario);
    $('solarValue').textContent = solar.toFixed(1) + ' MW';
    $('batteryValue').textContent = battery.toFixed(0) + ' MWh';
    $('relianceKpi').innerHTML = Math.round(result.reliance) + '<span>%</span>';
    $('solarMix').textContent = result.solarAtPeak.toFixed(1);
    $('batteryMix').textContent = result.batteryAtPeak.toFixed(1);
    $('gridMix').textContent = result.gridAtPeak.toFixed(1);
    $('solarBar').style.setProperty('--width', (result.solarAtPeak * 10) + '%');
    $('batteryBar').style.setProperty('--width', (result.batteryAtPeak * 10) + '%');
    $('gridBar').style.setProperty('--width', (result.gridAtPeak * 10) + '%');
    $('savingsKpi').textContent = currencyK(result.savings);
    $('paybackKpi').textContent = result.payback === null ? '—' : result.payback.toFixed(1) + ' yrs';
    $('capexKpi').textContent = '$' + (result.capex / 1000000).toFixed(1) + 'M';
    $('resilienceKpi').textContent = result.resilienceHours.toFixed(1) + ' h';
    $('scenarioCaption').textContent = scenario[0].toUpperCase() + scenario.slice(1) + ' design · indicative';
    $('caseEnergy').textContent = Math.round(result.avoidedMwh).toLocaleString('en-US') + ' MWh / yr';
    $('caseSavings').textContent = currencyK(result.savings);
    $('caseCapex').textContent = '$' + (result.capex / 1000000).toFixed(1) + 'M';
    $('paybackMarker').style.left = clamp((result.payback || 10) * 10, 0, 100) + '%';
    document.querySelectorAll('.scenario-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.scenario === scenario));
  }

  function setScene(index, replay = false) {
    const next = clamp(index, 0, scenes.length - 1);
    if (next === currentScene && !replay) return;
    scenes[currentScene]?.classList.remove('active');
    currentScene = next;
    // Four transition choreographies give major story turns a composed entrance.
    const entrances = ['hero','wipe','rise','focus','split','orbit','wipe','focus','rise'];
    scenes[currentScene].dataset.enter = entrances[currentScene];
    scenes[currentScene].classList.add('active');
    $('chapter').innerHTML = 'INVESTMENT BRIEF <span>·</span> ' + String(currentScene + 1).padStart(2, '0') + ' / 09';
    $('progress').style.width = ((currentScene + 1) / scenes.length * 100) + '%';
    document.querySelectorAll('.scene-jumps button').forEach((button, i) => {
      button.classList.toggle('active', i === currentScene);
      button.setAttribute('aria-current', i === currentScene ? 'step' : 'false');
    });
    $('prevBtn').disabled = currentScene === 0;
    $('nextBtn').disabled = currentScene === scenes.length - 1;
    document.querySelectorAll('.persistent-orbit').forEach(el => el.style.transform = `translate(${(currentScene % 3 - 1) * 8}px, ${(currentScene % 2) * 9}px) scale(${1 + currentScene * .018})`);
    if (replay) {
      scenes[currentScene].classList.remove('active');
      void scenes[currentScene].offsetWidth;
      scenes[currentScene].classList.add('active');
    }
  }

  const jumpHost = $('sceneJumps');
  scenes.forEach((scene, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.title = `Go to scene ${index + 1}: ${scene.dataset.title}`;
    button.setAttribute('aria-label', button.title); button.addEventListener('click', () => setScene(index));
    jumpHost.append(button);
  });
  $('prevBtn').addEventListener('click', () => setScene(currentScene - 1));
  $('nextBtn').addEventListener('click', () => setScene(currentScene + 1));
  $('replayBtn').addEventListener('click', () => setScene(0, true));
  document.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => setScene(Number(btn.dataset.goto))));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = event.target?.tagName?.toLowerCase();
    if (['input','textarea','select'].includes(tag) || event.target?.isContentEditable) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') setScene(currentScene + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') setScene(currentScene - 1);
    else if (event.key === 'Home') setScene(0);
    else if (event.key === 'End') setScene(scenes.length - 1);
    else if (event.key.toLowerCase() === 'p') $('pauseBtn').click();
    else if (event.key === 'Escape' && document.fullscreenElement) document.exitFullscreen?.();
  });
  $('pauseBtn').addEventListener('click', event => {
    const paused = document.body.classList.toggle('paused');
    event.currentTarget.setAttribute('aria-pressed', String(paused));
    event.currentTarget.title = paused ? 'Resume motion' : 'Pause motion';
    event.currentTarget.querySelector('span').textContent = paused ? 'Resume' : 'Pause';
  });
  $('motionBtn').addEventListener('click', event => {
    const reduced = document.body.classList.toggle('reduced-motion');
    event.currentTarget.setAttribute('aria-pressed', String(reduced));
  });
  reducedPreference.addEventListener?.('change', event => document.body.classList.toggle('reduced-motion', event.matches));
  if (reducedPreference.matches) document.body.classList.add('reduced-motion');
  $('fullscreenBtn').addEventListener('click', async () => {
    try { if (!document.fullscreenElement) await $('deck').requestFullscreen?.(); else await document.exitFullscreen?.(); }
    catch (_) { $('fullscreenBtn').title = 'Fullscreen is unavailable in this browser'; }
  });
  $('solarSlider').addEventListener('input', event => { solar = clamp(parseFloat(event.target.value), 0, 10); renderModel(); });
  $('batterySlider').addEventListener('input', event => { battery = clamp(parseFloat(event.target.value), 0, 24); renderModel(); });
  document.querySelectorAll('.scenario-btn').forEach(button => button.addEventListener('click', () => {
    scenario = button.dataset.scenario;
    const presets = { baseline:[2,4], balanced:[4,8], resilience:[7,16] };
    [solar,battery] = presets[scenario];
    $('solarSlider').value = solar; $('batterySlider').value = battery; renderModel();
  }));
  const nodes = {
    solar:['SOLAR','Generate where the site has room.','Illustrative rooftop and canopy PV feeds the local bus first; surplus can charge storage or serve flexible demand.','Sunlight','Local power','Less import'],
    battery:['BATTERY','Move energy across the peak.','A notional battery charges from available local generation and discharges when the site approaches its peak window.','Stored energy','Dispatch power','Peak support'],
    control:['GRIDNOVA CONTROL','Coordinate around the site objective.','A proposed control layer forecasts conditions and recommends a sequence for human-supervised site operations.','Telemetry','Dispatch plan','Coordinated action'],
    demand:['FLEXIBLE DEMAND','Shift what can safely move.','Thermal pre-cooling and scheduled charging are conceptual examples; operating constraints remain with site owners.','Load schedule','Flex window','Lower peak'],
    grid:['UTILITY GRID','Keep a clear boundary with supply.','The site remains grid connected in this concept. Any islanding capability depends on engineering, protection and approvals.','Utility supply','Site bus','Resilience option']
  };
  document.querySelectorAll('.node').forEach(button => button.addEventListener('click', () => {
    const data = nodes[button.dataset.node];
    document.querySelectorAll('.node').forEach(node => node.classList.toggle('selected', node === button));
    $('nodeDetail').innerHTML = `<span class="detail-kicker">SELECTED COMPONENT · ${data[0]}</span><h3>${data[1]}</h3><p>${data[2]}</p><div><span>INPUT <b>${data[3]}</b></span><span>OUTPUT <b>${data[4]}</b></span><span>VALUE <b>${data[5]}</b></span></div>`;
  }));
  const eventStages = [
    ['13:42','DETECTING','Signal anomaly detected. Campus demand is rising.'],
    ['13:48','FORECASTING','Local generation is easing; a short peak window is likely.'],
    ['14:00','DISPATCHING','Battery response is scheduled within its illustrative limit.'],
    ['14:06','SHIFTING','Flexible load is moved inside operator-approved constraints.'],
    ['14:20','STABILIZED','Illustrative grid import settles below the unmanaged peak.']
  ];
  const eventVisual = document.querySelector('.event-visual');
  document.querySelectorAll('.event-step').forEach(button => button.addEventListener('click', () => {
    const i = Number(button.dataset.step); const stage = eventStages[i];
    document.querySelectorAll('.event-step').forEach((step, j) => step.classList.toggle('active', j === i));
    eventVisual.dataset.step = i; $('eventTime').textContent = stage[0]; $('eventState').textContent = stage[1]; $('eventAction').textContent = stage[2];
  }));
  renderModel(); setScene(0);
})();
