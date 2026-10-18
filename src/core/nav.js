import { isFullscreen, toggleFullscreen } from './fullscreen.js';

// Presenter navigation. Pattern: handlers change state (store / controller / menu flag),
// render() reads that state and updates the DOM. Nothing else touches the HUD.
const NAV_KEYS = new Set([' ', 'ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', 'Home', 'End', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
const IDLE_MS = 3000;

export function createNav({ controller, store, motion, scenes }) {
  const $ = (id) => document.getElementById(id);
  const hud = $('hud');
  const menu = $('menu');
  const ui = { menuOpen: false };               // nav-local UI state (the store holds app state)
  let idleTimer = 0;

  const pad = (n) => String(n + 1).padStart(2, '0');

  // ---- build the progress segments and the menu list once -------------------------------------
  const segments = scenes.map((scene, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Go to scene ${i + 1}: ${scene.title}`);
    b.addEventListener('click', () => controller.goTo(i));
    li.append(b);
    $('progress').append(li);
    return b;
  });
  const items = scenes.map((scene, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = pad(i);
    const label = document.createElement('span');
    label.textContent = scene.title;
    b.append(num, label);
    b.addEventListener('click', () => { closeMenu(); controller.goTo(i); });
    li.append(b);
    $('menu-list').append(li);
    return b;
  });

  // ---- render: state -> DOM --------------------------------------------------------------------
  function render() {
    const { sceneIndex, paused, reducedMotion } = store.get();
    $('counter').textContent = `${pad(sceneIndex)} / ${pad(scenes.length - 1)}`;
    [...segments, ...items].forEach((b, k) => {
      if (k % scenes.length === sceneIndex) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    $('btn-pause').setAttribute('aria-pressed', String(paused));
    $('btn-reduced').setAttribute('aria-pressed', String(reducedMotion));
    $('btn-fullscreen').setAttribute('aria-pressed', String(isFullscreen()));
    $('chip-paused').hidden = !paused;
    $('chip-reduced').hidden = !reducedMotion;
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    menu.hidden = !ui.menuOpen;
    $('btn-menu').setAttribute('aria-expanded', String(ui.menuOpen));
  }

  // ---- handlers: change state only -------------------------------------------------------------
  function openMenu() {
    ui.menuOpen = true;
    render();
    items[store.get().sceneIndex].focus();
  }
  function closeMenu() {
    ui.menuOpen = false;
    render();
    document.activeElement?.blur();             // keep arrow/space keys live for the clicker afterwards
  }
  const toggleMenu = () => (ui.menuOpen ? closeMenu() : openMenu());
  const togglePause = () => motion.setPaused(!store.get().paused);
  const toggleReduced = () => motion.setReduced(!store.get().reducedMotion);

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;       // never hijack browser shortcuts (Ctrl+R etc.)
    if (e.key === 'Escape') {
      if (ui.menuOpen) { e.preventDefault(); closeMenu(); }
      return;
    }
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;

    // Navigation keys are ignored on buttons / inside the menu: Space or Enter on a focused button must
    // activate that button only, never ALSO change scene.
    const navKey = NAV_KEYS.has(e.key);
    if (navKey && (ui.menuOpen || e.target.closest('button, a, [role="dialog"], [role="slider"]'))) return;

    const key = e.key.toLowerCase();
    if (navKey) {
      e.preventDefault();
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') controller.next();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') controller.prev();
      else if (e.key === 'Home') controller.goTo(0);
      else if (e.key === 'End') controller.goTo(scenes.length - 1);
      else controller.goTo(Number(e.key) - 1);
    } else if (key === 'm') toggleMenu();
    else if (key === 'p') togglePause();
    else if (key === 'r') toggleReduced();
    else if (key === 'f') toggleFullscreen();
  }

  // ---- wiring ----------------------------------------------------------------------------------
  $('btn-prev').addEventListener('click', () => controller.prev());
  $('btn-next').addEventListener('click', () => controller.next());
  $('btn-menu').addEventListener('click', toggleMenu);
  $('btn-pause').addEventListener('click', togglePause);
  $('btn-reduced').addEventListener('click', toggleReduced);
  $('btn-fullscreen').addEventListener('click', toggleFullscreen);
  menu.addEventListener('click', (e) => { if (e.target === menu) closeMenu(); });
  // After a MOUSE click, drop focus so the clicker/arrow keys keep working. Keyboard activation (detail 0) keeps focus.
  hud.addEventListener('click', (e) => { if (e.detail > 0) e.target.closest('button')?.blur(); });
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('fullscreenchange', render);
  addEventListener('hashchange', () => {
    const n = parseHash();
    if (n !== null) controller.goTo(n);
  });
  store.subscribe(render);

  // HUD auto-hides after 3 s of inactivity and returns on mouse move / focus / key press (R26).
  function wake() {
    hud.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!ui.menuOpen && !hud.contains(document.activeElement)) hud.classList.add('is-idle');
    }, IDLE_MS);
  }
  ['pointermove', 'pointerdown', 'keydown', 'focusin'].forEach((t) => document.addEventListener(t, wake));
  wake();
  render();
}

/** '#/scene-7' -> 6, anything else -> null. */
export function parseHash(hash = location.hash) {
  const m = /^#\/scene-(\d+)$/.exec(hash);
  return m ? Number(m[1]) - 1 : null;
}
