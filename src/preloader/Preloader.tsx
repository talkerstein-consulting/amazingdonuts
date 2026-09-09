import { useEffect, useRef, useState } from 'react';
import { LOGO_W, LOGO_H, WORDMARK } from './wordmark';
import type { PreloadVariant } from '../lib/preload-session';
import './preloader.css';

/**
 * The preloader: the wordmark's letters pop in one at a time, then the whole
 * thing is handed to the navbar as the blue field slides up off the page.
 *
 * It was a rolling donut that inked a centreline while each letter filled in
 * behind it — thirteen letters, a crumb trail, and a pen path, all driven per
 * frame from an authored 1920x1080 timeline ported out of an animation bundle.
 *
 * Two things were wrong with that. It was slow: two and a half seconds before
 * the site appeared, every visit, spent on a set-piece rather than on the
 * bakery. And it was fragile in the one place it had to be robust — a wall
 * clock read per frame does not run slowly when the main thread is busy, it
 * SKIPS, and the first load is the busiest the main thread ever is. Measured
 * on this page it got six frames in 2.5 seconds, so the roll played as three
 * stills and the ink jumped in chunks.
 *
 * The pop is a CSS animation per letter with a staggered delay. Nothing is
 * driven per frame at all, which means the browser runs it off the main thread
 * and a slow load costs it nothing — the thing that broke the roll cannot
 * happen here. Thirteen letters at a 52ms stagger is under a second, and the
 * hand-off follows immediately.
 *
 * What survives unchanged is the hand-off, because it was always the good
 * part: the wordmark flies to the real header logo's MEASURED box while the
 * blue field scales up into the navbar, so the loading screen becomes the bar
 * rather than being replaced by it. `navLogoRect()` reads the live element, so
 * the two line up exactly at the moment we unmount.
 *
 * That is the `first` variant, and it plays once per session. Come back to the
 * homepage later in the same session — from the Lab, say, which is a real
 * document load — and the `return` variant runs instead: the finished wordmark
 * and its panel wipe off to the right while the page comes in from the left,
 * half a second, no popping. The opening is a first-impression piece and it
 * has already been made.
 *
 * That wipe is why there are two callbacks. The panel leaves to the right
 * while the page slides in from the left — one rightward movement, not two
 * unrelated ones — so the page has to start moving while the panel is still on
 * screen. `onExit` starts the slide; `onDone` unmounts once the panel is gone.
 */

/* --- the pop, in ms ------------------------------------------------------
   POP_MS is one letter's own animation; POP_STEP is the gap between two
   letters starting. The stagger is what makes it read as letters arriving
   one by one rather than a word fading up, and 52ms is the point where it
   still feels like one gesture — much slower and the last letters are a
   separate event, much faster and it is a single flash. */
const POP_MS = 460;
const POP_STEP = 52;
/* Everything has landed, plus a beat to read the finished wordmark. */
const POP_TOTAL = POP_STEP * (WORDMARK.length - 1) + POP_MS + 260;

/* The two CSS-driven moves, in ms because that is what a transition takes.
   HAND_MS is the flight into the navbar. EXIT_MS matches `.site-slide-in` in
   index.css — the panel leaving and the page arriving are one movement, so
   they must take the same time. */
const HAND_MS = 720;
const EXIT_MS = 520;
/* The same curve the site uses for entrances, as a CSS easing. */
const EASE_CSS = 'cubic-bezier(.22, 1, .36, 1)';

/* --- the authored stage the wordmark was drawn against -------------------
   Only the wordmark's own placement survives; the donut's travel, its size and
   the crumb table are gone with the roll. */
const STAGE_H = 1080;
const LOGO_L = 240;
const LOGO_T = 458;
const SCALE = 1.0375;

const WHITE = '#ffffff';

/** The live header logo's box, so the hand-off lands exactly on it. */
function navLogoRect() {
  const el = document.querySelector('.nav-logo');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 ? r : null;
}

/** The header's own height, so the navy field can shrink into it. */
function navBarHeight() {
  const el = document.querySelector('header');
  const h = el?.getBoundingClientRect().height;
  return h && h > 0 ? h : 64;
}

export default function Preloader({
  onDone,
  onExit,
  variant = 'first'
}: {
  onDone: () => void;
  /** `return` variant only: the panel has started leaving, so start the slide. */
  onExit?: () => void;
  variant?: PreloadVariant;
}) {
  const isReturn = variant === 'return';
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(false);
  const exitRef = useRef(false);

  /* The callbacks are held in refs, and the animation effect deliberately does
     NOT depend on them.
     `onExit` sets state in the parent, which re-renders it, which hands this
     component freshly-created `onExit`/`onDone` props. With those in the
     dependency list the effect tore down mid-wipe — cancelling the frame loop
     and restarting it with `t0` back at 0 — so the whole roll played a second
     time before the preloader would finally leave. The timeline must be driven
     only by what actually changes it: the variant, and reduced motion. */
  const onDoneRef = useRef(onDone);
  const onExitRef = useRef(onExit);
  onDoneRef.current = onDone;
  onExitRef.current = onExit;

  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    // Reduced motion: no popping, no flight - just get out of the way.
    if (reduced) {
      const t = setTimeout(() => onDoneRef.current(), 260);
      return () => clearTimeout(t);
    }

    /* Fit, not cover. The wordmark is 1388 units wide on a 1920 stage, so a
       cover-fit pushes it off both edges of a portrait phone. Scale so the
       wordmark spans as much of the viewport as a guaranteed gutter allows,
       then centre it. */
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const logoW = LOGO_W * SCALE;
      /* Size off a guaranteed gutter rather than a bare percentage, so the
         wordmark provably clears both edges on any width - and is otherwise as
         large as it can be, which is what keeps it legible on a phone where
         this one-line wordmark is only ~37px tall. */
      const gutter = Math.min(48, Math.max(16, vw * 0.05));
      const s = Math.min((vw - gutter * 2) / logoW, vh / STAGE_H, 1);
      return {
        s,
        ox: (vw - logoW * s) / 2 - LOGO_L * s,
        oy: vh / 2 - (STAGE_H / 2) * s
      };
    };
    let view = fit();

    /** Park the wordmark, unscaled, where the stage puts it. */
    const placeLogo = () => {
      if (!logoRef.current) return;
      const { s, ox, oy } = view;
      logoRef.current.style.transform =
        `translate(${(ox + LOGO_L * s).toFixed(1)}px, ${(oy + LOGO_T * s).toFixed(1)}px) scale(1)`;
      logoRef.current.style.width = `${(LOGO_W * SCALE * s).toFixed(1)}px`;
      logoRef.current.style.height = `${(LOGO_H * SCALE * s).toFixed(1)}px`;
    };

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current();
    };

    /* ---------------------------------------------------------------------
       The return load: no popping. The finished wordmark and its navy
       panel are on screen for a moment and then wipe off to the right while
       the page slides in from the left - one rightward movement, started in
       the same frame by `onExit`.
       --------------------------------------------------------------------- */
    if (isReturn) {
      /* Nothing pops here — see the `is-static` class on the letters, which is
         what stops the animation running. */
      placeLogo();

      let timer = 0;
      /* One frame of settle before the wipe: set the start and end values in
         the same frame and the transition has nothing to interpolate from. */
      const raf = requestAnimationFrame(() => {
        exitRef.current = true;
        onExitRef.current?.();

        const move = `transform ${EXIT_MS}ms ${EASE_CSS}`;
        const off = window.innerWidth;
        if (fieldRef.current) {
          fieldRef.current.style.transition = move;
          fieldRef.current.style.transform = `translateX(${off}px)`;
        }
        if (logoRef.current) {
          const { s, ox, oy } = view;
          logoRef.current.style.transition = move;
          logoRef.current.style.transform =
            `translate(${(ox + LOGO_L * s + off).toFixed(1)}px, ${(oy + LOGO_T * s).toFixed(1)}px) scale(1)`;
        }
        timer = window.setTimeout(finish, EXIT_MS);
      });

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }

    /* ---------------------------------------------------------------------
       The first load. Nothing here drives the animation: the letters are
       popping on their own, in CSS, off the main thread. All this does is
       wait for them to finish and then start the hand-off — which is itself
       two CSS transitions, for the same reason.

       That is the whole design. The main thread on a first page load is the
       busiest it will ever be — parsing, mounting the site underneath,
       decoding art, loading fonts — and anything driven per frame against it
       does not slow down, it skips. The compositor does not care.
       --------------------------------------------------------------------- */
    let timer = 0;
    let handed = false;

    const onResize = () => {
      view = fit();
      if (!handed) placeLogo();
    };
    window.addEventListener('resize', onResize);

    /** The wordmark flies to the real navbar logo; the field slides up into it. */
    const handOff = () => {
      if (handed) return;
      handed = true;

      const { s } = view;
      const fromW = LOGO_W * SCALE * s;
      const target = navLogoRect();

      if (logoRef.current && target) {
        /* Scale, not resize: transform-origin is the element's top-left, so
           translating to the target and scaling by this ratio lands the
           wordmark exactly on the real one. */
        const k = target.width / fromW;
        logoRef.current.style.transition = `transform ${HAND_MS}ms ${EASE_CSS}`;
        logoRef.current.style.transform =
          `translate(${target.left.toFixed(1)}px, ${target.top.toFixed(1)}px) scale(${k.toFixed(4)})`;
      }

      if (fieldRef.current) {
        /* scaleY from the top, not height: height is a layout property, and
           animating it would put the move back on the main thread this whole
           design exists to stay off. Anchored at the top, a plain blue
           rectangle shortening is exactly the blue sliding up off the page and
           coming to rest as the navbar. */
        fieldRef.current.style.transformOrigin = 'top center';
        fieldRef.current.style.transition = `transform ${HAND_MS}ms ${EASE_CSS}`;
        fieldRef.current.style.transform = `scaleY(${navBarHeight() / window.innerHeight})`;
      }

      timer = window.setTimeout(finish, HAND_MS);
    };

    placeLogo();
    /* One timer, not a loop. The letters are already going; this is only the
       moment they are done. */
    const start = window.setTimeout(handOff, POP_TOTAL);

    return () => {
      clearTimeout(start);
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [isReturn, reduced]);

  if (reduced) {
    return (
      <div className="pre" aria-hidden="true">
        <div className="pre__field" style={{ height: '100vh' }} />
      </div>
    );
  }

  return (
    <div className="pre" role="status" aria-label="Loading Amazing Donuts">
      {/* the navy field — becomes the navbar */}
      <div ref={fieldRef} className="pre__field" style={{ height: '100vh' }} />

      {/* The wordmark. Each letter is its own path with its own animation
          delay; `is-static` skips the whole thing on a return load, where the
          word is simply already there. */}
      <div ref={logoRef} className="pre__logo">
        <svg
          viewBox={`0 0 ${LOGO_W} ${LOGO_H}`}
          width="100%"
          height="100%"
          style={{ overflow: 'visible', display: 'block' }}
        >
          {WORDMARK.map((d, k) => (
            <path
              key={k}
              d={d}
              fill={WHITE}
              className={`pre__letter${isReturn ? ' is-static' : ''}`}
              /* Each letter's delay is its place in the word. `backwards` on
                 the animation is what holds it invisible until its turn —
                 without it every letter paints at full size for the first
                 frame and the whole word flashes before the pop begins. */
              style={isReturn ? undefined : { animationDelay: `${k * POP_STEP}ms` }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
