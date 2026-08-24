import { useEffect, useRef, useState } from 'react';
import { LOGO_W, LOGO_H, WORDMARK, LETTER_R, SKEL } from './wordmark';
import type { PreloadVariant } from '../lib/preload-session';
import './preloader.css';

/**
 * The rolling-donut preloader, ported from the 'Donut roll logo animation'
 * bundle.
 *
 * The original ran inside a 1920x1080 authoring stage with a timeline engine,
 * a scrubber and a video exporter. All of that is dropped: the animation was
 * already written as a pure function of authored time, so here it is driven
 * by one requestAnimationFrame loop and laid out in viewport units instead.
 *
 * What it does, in order:
 *   roll   — the donut rolls in from the left, dropping crumbs, while a white
 *            'pen' inks the wordmark's centreline and each letter fills just
 *            after the donut clears its right edge
 *   settle — the donut leaves; the finished wordmark holds, centred
 *   hand   — the wordmark flies to the real navbar logo's measured position
 *            and size while the navy field shrinks up into the navbar
 *
 * The hand-off is measured, not guessed: `navLogoRect()` reads the actual
 * header logo's box so the two line up exactly at the moment we unmount.
 *
 * That is the `first` variant, and it plays once per session. Come back to the
 * homepage later in the same session — from the Lab, say, which is a real
 * document load — and the `return` variant runs instead, and it is only the
 * slide: the finished wordmark and its panel wipe off to the right while the
 * page comes in from the left, half a second, no donut and no inking. The roll
 * is a first-impression piece and it has already been made.
 *
 * That wipe is why there are two callbacks. The navy panel leaves to the right
 * while the page slides in from the left — one rightward movement, not two
 * unrelated ones — so the page has to start moving while the panel is still on
 * screen. `onExit` starts the slide; `onDone` unmounts once the panel is gone.
 * Fading the panel out first and sliding afterwards would show the settled page
 * and then yank it sideways.
 */

/* --- timeline, in seconds ------------------------------------------------ */
const T_ROLL = 2.05; // donut crosses the stage, ink follows it
const T_HOLD = 0.42; // finished wordmark holds

/* The two CSS-driven moves, in ms because that is what a transition takes.
   HAND_MS was T_HAND: the flight into the navbar, now on the compositor.
   EXIT_MS matches `.site-slide-in` in index.css - the panel leaving and the
   page arriving are one movement, so they must take the same time. */
const HAND_MS = 720;
const EXIT_MS = 520;
/* The same curve the site uses for entrances, as a CSS easing. */
const EASE_CSS = 'cubic-bezier(.22, 1, .36, 1)';

/* --- the authored stage the geometry was drawn against ------------------- */
const STAGE_W = 1920;
const STAGE_H = 1080;
const LOGO_L = 240;
const LOGO_T = 458;
const SCALE = 1.0375;
const D_FROM = -320;
const D_TO = 2500;
const D_SIZE = 300;

const DOUGH = '#f2c184';
const WHITE = '#ffffff';
const ICING = '#1a95d6';

/* Crumb table from the bundle. Sizes are quartered from the original — the
   brief asked for small crumbs, and the originals were 9–19px on a 1920 stage. */
const CRUMB_X = [130, 190, 250, 312, 376, 440, 506, 574, 640, 710, 780, 850, 920, 990, 1060, 1130, 1202, 1276, 1350, 1426, 1500, 1580, 1660, 1740, 1820];
const CRUMB_DY = [8, 28, 0, 34, 12, 40, 4, 26, 14, 42, 2, 24, 10, 36, 16, 0, 30, 12, 38, 6, 26, 14, 34, 4, 28];
const CRUMB_W = [15, 9, 19, 11, 16, 10, 13, 18, 9, 14, 11, 17, 10, 13, 19, 9, 15, 11, 16, 10, 15, 12, 9, 14, 11];
const CRUMB_H = [13, 9, 15, 11, 12, 10, 12, 14, 9, 12, 11, 14, 10, 12, 15, 9, 12, 11, 13, 10, 12, 12, 9, 12, 10];
const CRUMB_C = [DOUGH, WHITE, DOUGH, ICING, WHITE, DOUGH, WHITE, ICING, DOUGH, WHITE, DOUGH, WHITE, ICING, DOUGH, WHITE, DOUGH, ICING, WHITE, DOUGH, WHITE, DOUGH, ICING, WHITE, DOUGH, WHITE];
const CRUMB_SCALE = 0.26;

const CRUMBS = CRUMB_X.map((x, i) => ({
  x,
  y: 636 + CRUMB_DY[i],
  w: Math.max(3, Math.round(CRUMB_W[i] * CRUMB_SCALE)),
  h: Math.max(3, Math.round(CRUMB_H[i] * CRUMB_SCALE)),
  c: CRUMB_C[i]
}));

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutBack = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

/** Ramp from 0 to 1 across [start, end] in seconds. */
const ramp = (t: number, start: number, end: number) => clamp01((t - start) / Math.max(1e-6, end - start));

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
  const stageWrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const donutRef = useRef<HTMLImageElement | null>(null);
  const crumbRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const fillRefs = useRef<(SVGPathElement | null)[]>([]);
  const penRef = useRef<SVGPathElement | null>(null);
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
    // Reduced motion: no roll, no flight - just get out of the way.
    if (reduced) {
      const t = setTimeout(() => onDoneRef.current(), 260);
      return () => clearTimeout(t);
    }

    /* Fit, not cover. The wordmark is 1388 units wide on a 1920 stage, so a
       cover-fit pushes it off both edges of a portrait phone. Scale so the
       wordmark spans ~86% of the viewport instead, then place the stage so the
       wordmark is centred - the donut rolls along the stage's mid-line, which
       is the same line the wordmark sits on. */
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
       The return load: no roll, no inking. The finished wordmark and its navy
       panel are on screen for a moment and then wipe off to the right while
       the page slides in from the left - one rightward movement, started in
       the same frame by `onExit`.
       --------------------------------------------------------------------- */
    if (isReturn) {
      // Nothing gets inked here, so the wordmark has to start finished.
      fillRefs.current.forEach((n) => n?.setAttribute('fill-opacity', '1'));
      if (penRef.current) penRef.current.style.strokeDashoffset = '0';
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
       The first load: the roll and the inking are driven per frame - they are
       a function of authored time and there is no way around that. The
       hand-off is NOT: it is handed to the compositor as CSS transitions.

       That split is the whole point. Driving the flight per frame meant
       driving it with the main thread, and the main thread on a first page
       load is the busiest it will ever be - parsing, mounting the site
       underneath, decoding art, loading fonts. Measured here, the loop got SIX
       frames in 2.5 seconds: t = 0, 0.01, 0.03, 1.99, 4.01. A wall-clock
       timeline does not run slowly when it is starved of frames, it skips - so
       the wordmark jumped from mid-screen to the navbar in a single frame and
       the field never collapsed at all. A transform transition runs on the
       compositor and does not care how busy the main thread is.
       --------------------------------------------------------------------- */
    let raf = 0;
    /* The clock starts on the first painted frame, not here. If the tab is
       backgrounded or the first paint is slow, rAF does not fire for a while -
       measuring from effect time would mean the first callback already arrives
       past the end of the timeline and the whole animation is skipped. */
    let t0 = 0;
    let timer = 0;
    let handed = false;

    const onResize = () => {
      view = fit();
    };
    window.addEventListener('resize', onResize);

    /** The wordmark flies to the real navbar logo; the field folds into the bar. */
    const handOff = () => {
      if (handed) return;
      handed = true;
      cancelAnimationFrame(raf);

      // The crumb trail and the donut have no part in the hand-off.
      if (stageWrapRef.current) {
        stageWrapRef.current.style.transition = 'opacity 260ms linear';
        stageWrapRef.current.style.opacity = '0';
      }

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
        /* scaleY, not height: height is a layout property, and animating it
           would put the collapse back on the main thread that this whole
           change exists to get off. The field is a plain navy rectangle, so
           scaling it is visually identical to shortening it. */
        fieldRef.current.style.transformOrigin = 'top center';
        fieldRef.current.style.transition = `transform ${HAND_MS}ms ${EASE_CSS}`;
        fieldRef.current.style.transform = `scaleY(${navBarHeight() / window.innerHeight})`;
      }

      timer = window.setTimeout(finish, HAND_MS);
    };

    const frame = (now: number) => {
      if (t0 === 0) t0 = now;
      const t = (now - t0) / 1000;

      /* ---- 1. the roll ------------------------------------------------- */
      const rollP = ramp(t, 0, T_ROLL);
      const cx = lerp(D_FROM, D_TO, rollP);
      const spin = ((cx - D_FROM) / (Math.PI * D_SIZE)) * 360;

      if (stageRef.current) {
        const { s, ox, oy } = view;
        // One transform for crumbs and donut alike; both keep stage coordinates.
        stageRef.current.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) scale(${s.toFixed(4)})`;
      }

      if (donutRef.current) {
        donutRef.current.style.transform =
          `translateX(${(cx - D_SIZE / 2).toFixed(1)}px) rotate(${spin.toFixed(1)}deg)`;
        // Gone by the time the wordmark starts moving.
        donutRef.current.style.opacity = (1 - ramp(t, T_ROLL - 0.12, T_ROLL + 0.16)).toFixed(3);
      }

      /* ---- 2. crumbs drop as the donut passes -------------------------- */
      CRUMBS.forEach((c, i) => {
        const node = crumbRefs.current[i];
        if (!node) return;
        const t0c = ((c.x - D_FROM) / (D_TO - D_FROM)) * T_ROLL;
        const p = easeOutBack(ramp(t, t0c, t0c + 0.22));
        node.style.opacity = clamp01(p * 2).toFixed(3);
        node.style.transform = `scale(${Math.max(0, p).toFixed(3)})`;
      });

      /* ---- 3. the pen inks the centreline, letters fill behind it ------- */
      const xLogo = (cx - LOGO_L) / SCALE - 6;
      let i = 0;
      while (i < SKEL.n && SKEL.xs[i + 1] <= xLogo) i++;
      const inked = SKEL.xs[0] > xLogo ? 0 : clamp01((i + 1) / SKEL.n);
      if (penRef.current) penRef.current.style.strokeDashoffset = String(1 - inked);

      LETTER_R.forEach((rx, k) => {
        const node = fillRefs.current[k];
        if (!node) return;
        const tx = ((LOGO_L + rx * SCALE - D_FROM) / (D_TO - D_FROM)) * T_ROLL;
        node.setAttribute('fill-opacity', easeOutQuad(ramp(t, tx - 0.02, tx + 0.14)).toFixed(3));
      });

      placeLogo();

      /* ---- 4. hand over ------------------------------------------------ */
      if (t >= T_ROLL + T_HOLD) {
        handOff();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
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

      {/* crumbs + the rolling donut, in authored stage coordinates. Not
          rendered on a return load: there is no roll, so there is nothing for
          them to do and no reason to fetch the donut. */}
      {!isReturn && (
      <div ref={stageWrapRef} className="pre__stageWrap">
        <div ref={stageRef} className="pre__stage" style={{ width: STAGE_W, height: STAGE_H }}>
          {CRUMBS.map((c, i) => (
            <span
              key={i}
              ref={(n) => {
                crumbRefs.current[i] = n;
              }}
              className="pre__crumb"
              style={{
                left: c.x,
                top: c.y,
                width: c.w,
                height: c.h,
                borderRadius: Math.max(1, Math.round(c.w / 3)),
                background: c.c,
                opacity: 0
              }}
            />
          ))}
          <img
            ref={donutRef}
            className="pre__donut"
            src="/img/roll-donut.png"
            alt=""
            draggable={false}
            style={{ top: STAGE_H / 2 - D_SIZE / 2, width: D_SIZE, height: D_SIZE }}
          />
        </div>
      </div>
      )}

      {/* the wordmark — inked either way, then flown into the navbar on the
          first load and faded in place on the way back */}
      <div ref={logoRef} className="pre__logo">
        <svg viewBox={`0 0 ${LOGO_W} ${LOGO_H}`} width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <clipPath id="pre-wordmark">
              {WORDMARK.map((d, k) => (
                <path key={k} d={d} />
              ))}
            </clipPath>
          </defs>

          {WORDMARK.map((d, k) => (
            <path
              key={`f${k}`}
              ref={(n) => {
                fillRefs.current[k] = n;
              }}
              d={d}
              fill={WHITE}
              fillOpacity={0}
            />
          ))}

          <g clipPath="url(#pre-wordmark)">
            <path
              ref={penRef}
              d={SKEL.d}
              fill="none"
              stroke={WHITE}
              strokeWidth={44}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
