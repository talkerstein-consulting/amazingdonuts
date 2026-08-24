import Lenis from 'lenis';

/**
 * Site-wide inertia scrolling.
 *
 * Lenis in its default mode drives the document's own `scrollTop` rather than
 * transforming the body, which is the only reason it is safe here: the sticky
 * header, the Lanes scroll-stack, the nav-theme midpoint listeners and the
 * preloader's measured hand-off all read real scroll positions, and every one
 * of them keeps working untouched.
 *
 * Deliberate settings:
 *   syncTouch: false — native momentum on a phone is better than anything a
 *     library can synthesise, and smoothing touch adds a frame of lag to every
 *     drag. Wheel and keyboard get the easing; fingers do not.
 *   anchors: true — the header's `#favorites`-style links have to be eased too,
 *     or half the page's navigation ignores the smoothing.
 */
let lenis: Lenis | null = null;

/** Overlays lock the page by setting `body { overflow: hidden }`. */
const isLocked = () => document.body.style.overflow === 'hidden';

export function initSmoothScroll() {
  if (typeof window === 'undefined' || lenis) return;
  // Reduced motion means reduced motion: never init, so scrolling stays native.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    anchors: true
  });

  const raf = (time: number) => {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  /* Every overlay on the site — the mobile nav drawer, the auth modal — locks
     the page the same way, by setting body overflow. Watching that one
     declaration pauses Lenis for all of them at once, including any added
     later, instead of threading a stop/start call through each overlay's open
     state. Without it the wheel would keep easing the page along behind an
     open sheet, which native `overflow: hidden` prevents on its own. */
  const sync = () => (isLocked() ? lenis?.stop() : lenis?.start());
  new MutationObserver(sync).observe(document.body, {
    attributes: true,
    attributeFilter: ['style']
  });
  sync();
}

/** Programmatic scrolls, so they are eased like every other one. */
export function smoothScrollTo(target: number | string | HTMLElement, offset = 0) {
  if (lenis) lenis.scrollTo(target, { offset });
  else if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
  else {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: 'smooth' });
  }
}
