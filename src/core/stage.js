// Scales the fixed 1920x1080 stage to fit the window (letterboxed, centred).
// Same composition at 1920x1080 and 1366x768 (scale 0.711); scenes never use vw/vh.
const STAGE_W = 1920;
const STAGE_H = 1080;

export function fitStage(stage) {
  const apply = () => {
    const scale = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    stage.dataset.scale = String(scale);
  };
  addEventListener('resize', apply);
  document.addEventListener('fullscreenchange', apply);
  apply();
}
