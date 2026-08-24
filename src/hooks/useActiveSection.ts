import { useEffect, useState } from 'react';

/**
 * Which of the given section ids currently owns the reading line.
 *
 * The nav needs an active state, and "active" has to mean the same thing the
 * reader thinks it means: the section they are looking at, not the one whose
 * first pixel has crossed some edge. The line sits at 35% of the viewport
 * height - below the header, above centre - which is roughly where the eye
 * sits while scrolling. It is the same reasoning as the header's colour
 * claims, which use the midpoint; this one is higher because a nav label
 * should light up slightly before the section is dead centre.
 *
 * Returns null when no section owns the line - above the first one, or in a
 * gap between two - so the nav can show nothing rather than a stale guess.
 */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  // Joined, not the array itself: a fresh array literal on every render would
  // otherwise re-run the effect on every render.
  const key = ids.join(',');

  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (!list.length) return;

    const sync = () => {
      const line = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) {
          current = id;
          break;
        }
      }
      setActive((prev) => (prev === current ? prev : current));
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [key]);

  return active;
}
