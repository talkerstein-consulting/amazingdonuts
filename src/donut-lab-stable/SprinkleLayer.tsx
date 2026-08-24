import { useEffect, useRef } from 'react';
import { jitter, type Sprinkle } from './builder-data';

/**
 * The sprinkle mask, fetched as SVG text and recoloured per selection.
 *
 * It has to be inline SVG rather than a `background-image`: every mark gets
 * wrapped in its own `<g>` so it can drop in on its own delay. A CSS
 * background could be tinted, but it could not stagger.
 *
 * Fetched text is cached per URL on a module-level map — the mask is the same
 * file for every colour of a given base, so switching palettes must not
 * re-fetch, and must not re-run the drop from a network round trip.
 */
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function loadSvg(src: string): Promise<string> {
  const hit = cache.get(src);
  if (hit !== undefined) return Promise.resolve(hit);

  let pending = inflight.get(src);
  if (!pending) {
    pending = fetch(src)
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '')
      .then((text) => {
        cache.set(src, text);
        inflight.delete(src);
        return text;
      });
    inflight.set(src, pending);
  }
  return pending;
}

export default function SprinkleLayer({
  src,
  sprinkle,
  animate = true
}: {
  src: string | null;
  sprinkle: Sprinkle;
  /** Option-tile previews render static — only the stage replays the drop. */
  animate?: boolean;
}) {
  const host = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    if (!src || sprinkle.bare || sprinkle.colors.length === 0) {
      el.replaceChildren();
      return;
    }

    // Guards against a slow fetch resolving after the selection moved on.
    let live = true;

    loadSvg(src).then((text) => {
      if (!live || !el || !text) return;

      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return;

      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%');

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      /* Only shapes that are actually drawn.
         Two of the twelve masks — cookie_2in and cookie_large — arrive from the
         design tool wrapped in `<g clip-path="url(#clip0…)">` with the clip's
         own full-canvas <rect> sitting in <defs>. That rect matches the
         selector like any other, so it used to get pulled into a <g> along with
         the real marks. A <g> is not a legal clipPath child, so the clip region
         resolved to nothing and clipped the whole sprinkle layer away: cookies
         silently had no sprinkles while every other shape worked.
         Anything under defs/clipPath/mask/pattern/symbol is machinery, not a
         mark. Walked by nodeName rather than `closest()` because the parsed
         document is XML, where selector matching is case-sensitive and
         `clipPath` is easy to get wrong. */
      const isMachinery = (el: Element) => {
        for (let p = el.parentNode; p && p !== svg; p = p.parentNode) {
          const name = (p as Element).nodeName;
          if (
            name === 'defs' ||
            name === 'clipPath' ||
            name === 'mask' ||
            name === 'pattern' ||
            name === 'symbol'
          ) {
            return true;
          }
        }
        return false;
      };

      const marks = Array.from(svg.querySelectorAll('rect, circle, ellipse, path')).filter(
        (mark) => !isMachinery(mark)
      );

      marks.forEach((mark, i) => {
        const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
        mark.parentNode?.insertBefore(g, mark);
        g.appendChild(mark);
        mark.setAttribute('fill', sprinkle.colors[i % sprinkle.colors.length]);
        if (animate && !reduced) {
          // Index gives the sweep, jitter breaks up the mechanical march.
          const delay = (i * 5 + jitter(i) * 200).toFixed(0);
          g.setAttribute('style', `animation:bldDrop 360ms cubic-bezier(.2,.8,.3,1) ${delay}ms both`);
        }
      });

      el.replaceChildren(svg);
    });

    return () => {
      live = false;
    };
  }, [src, sprinkle, animate]);

  return <span ref={host} style={{ position: 'absolute', inset: 0 }} aria-hidden="true" />;
}
