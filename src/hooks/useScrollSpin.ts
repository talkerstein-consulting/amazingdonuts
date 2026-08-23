import { useEffect, useRef } from 'react';

/**
 * Spins an element as it travels through the viewport.
 *
 * The angle comes from scroll position rather than a timer, so the donut only
 * turns while the page is actually moving and lands back on the same angle if
 * you scroll back up.
 *
 * `degrees` is the whole sweep, spread across the element's on-screen travel:
 * 0deg as it enters from the bottom, the full value as it leaves past the top.
 * Progress is clamped to that window — without it the angle keeps growing for
 * as long as the page is tall, and a donut near the top of a long page ends up
 * several thousand degrees round.
 *
 * `intro` adds a one-off roll when the element is first enabled: the angle
 * starts there and unwinds to zero, so an element that also slides in appears
 * to roll rather than skate. It is summed with the scroll angle by the same
 * writer — two owners of `style.rotate` would fight for the property.
 *
 * Honours prefers-reduced-motion by staying still.
 */
export function useScrollSpin<T extends HTMLElement = HTMLElement>(
  degrees = 120,
  enabled = true,
  intro?: { degrees: number; duration: number }
) {
  const ref = useRef<T | null>(null);
  // Depended on as primitives, so passing a fresh object literal each render
  // does not re-run the effect and restart the roll.
  const introDegrees = intro?.degrees ?? 0;
  const introDuration = intro?.duration ?? 0;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Held until the caller says the page is ready — the donuts should not be
    // turning behind the preloader, only once the wordmark has landed in the bar.
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let introFrame = 0;
    let introAngle = introDegrees;

    const scrollAngle = () => {
      const rect = node.getBoundingClientRect();
      const view = window.innerHeight || 1;
      // 0 → element's top at the viewport bottom; 1 → its bottom past the top.
      const travel = view + rect.height;
      const progress = Math.min(1, Math.max(0, (view - rect.top) / travel));
      return progress * degrees;
    };

    const paint = () => {
      frame = 0;
      node.style.rotate = `${(scrollAngle() + introAngle).toFixed(2)}deg`;
    };

    // Coalesce scroll/resize bursts into one write per frame.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    };

    paint();

    // The intro roll, unwound on its own clock. Same easing as the slide it
    // accompanies, so the turn and the travel finish together.
    if (introDegrees && introDuration > 0) {
      const start = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / introDuration);
        introAngle = introDegrees * (1 - ease(t));
        paint();
        if (t < 1) introFrame = requestAnimationFrame(step);
      };
      introFrame = requestAnimationFrame(step);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (introFrame) cancelAnimationFrame(introFrame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [degrees, enabled, introDegrees, introDuration]);

  return ref;
}
