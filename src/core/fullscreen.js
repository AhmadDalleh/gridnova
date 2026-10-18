// Fullscreen / presentation mode. Esc exits natively; the HUD button and F key toggle.
export const isFullscreen = () => Boolean(document.fullscreenElement);

export async function toggleFullscreen() {
  try {
    if (isFullscreen()) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Some embeds / browsers refuse; the button simply stays unpressed.
  }
}
