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
 * Honours prefers-reduced-motion by staying still.
 */
export function useScrollSpin<T extends HTMLElement = HTMLElement>(degrees = 120) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;

    const paint = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const view = window.innerHeight || 1;
      // 0 → element's top at the viewport bottom; 1 → its bottom past the top.
      const travel = view + rect.height;
      const progress = Math.min(1, Math.max(0, (view - rect.top) / travel));
      node.style.rotate = `${(progress * degrees).toFixed(2)}deg`;
    };

    // Coalesce scroll/resize bursts into one write per frame.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [degrees]);

  return ref;
}
