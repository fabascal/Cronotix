/**
 * smoothScrollTo
 * ──────────────
 * JavaScript-driven smooth scroll — works regardless of OS/browser
 * "prefers-reduced-motion" or "smooth scroll" accessibility settings,
 * because it bypasses the CSS scroll-behavior mechanism entirely.
 *
 * @param targetY   Absolute Y position to scroll to (pixels from top)
 * @param duration  Animation duration in ms (default 620)
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function smoothScrollTo(targetY: number, duration = 620): void {
  const startY = window.scrollY;
  const distance = targetY - startY;

  // Skip animation for very short distances (already there)
  if (Math.abs(distance) < 4) return;

  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
