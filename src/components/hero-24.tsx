"use client";

/**
 * React Bits Pro `hero-24`, rebuilt for Amazing Donuts.
 *
 * Kept from the block: the full-height section, the staggered entrance, the
 * badge → headline → lede → buttons → footer-row rhythm.
 * Swapped: the NeuroNoise shader background is now the bakery photograph, the
 * buttons are brand wedges, the headline keeps its rolling last line, and the
 * partner-logo row is the sprinkle button.
 *
 * To use a different photograph, replace public/assets/hero/hero-donuts.jpg.
 */

import { motion, useReducedMotion, type Variants } from "motion/react";
import { useState } from "react";
import Wedge from "./Wedge.jsx";
import Roller from "./Roller.jsx";
import SprinkleButton from "./SprinkleButton.jsx";
import { useOpenNow } from "../hooks/useOpenNow.js";

/* The CTAs sit inside .hero24__fade's solid zone (see home.css), which is
   var(--white) — not the photo. The bite must match that exactly, not a
   guess at the photo's colour, or the "missing bite" reads as a smudge. */
const HERO_CTA_GROUND = "var(--white)";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } }
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
};

const headline: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } }
};

export function Hero24() {
  const reduceMotion = useReducedMotion();
  const now = useOpenNow();
  const [loaded, setLoaded] = useState(false);

  return (
    <section
      id="top"
      className="hero24"
    >
      {/* Full bleed and never cropped: the photograph carries its own empty
          left third, and the copy sits in it. */}
      <picture className="hero24__photo">
        <source srcSet="/assets/hero/hero.webp" type="image/webp" />
        <img
          src="/assets/hero/hero.jpg"
          alt="Heart, star of David, rainbow sprinkle and chocolate glazed donuts, scattered with sprinkles"
          onLoad={() => setLoaded(true)}
          data-loaded={loaded}
        />
      </picture>

      {/* Fades the photo into the page ground, starting exactly where the
          copy column ends — not a blanket scrim, just enough to kill the
          seam between text and photograph. */}
      <span className="hero24__fade" aria-hidden="true" />

      <div className="hero24__in">
        <motion.div
          variants={container}
          initial={reduceMotion ? "show" : "hidden"}
          animate="show"
          className="hero24__copy"
        >
          <motion.div variants={item}>
            <span className="chip" data-family={now.family}>
              <i className="chip__dot" />
              <span className="chip__text">{now.label}</span>
            </span>
            <span className="now__msg" style={{ marginLeft: 14 }}>
              {now.message}
            </span>
          </motion.div>

          <motion.h1 variants={headline} className="display" style={{ marginTop: 26 }}>
            Nut-free donuts
            <br />
            that taste like <Roller />
          </motion.h1>

          <motion.p variants={item} className="lede" style={{ marginTop: 22 }}>
            No tree nuts, no peanuts, no sesame — not in a recipe, not on a shelf, not in the
            building. Kosher pareve under COR&nbsp;483 since 1997. Sixty things in the case, and
            most of the donuts are $2.
          </motion.p>

          <motion.div variants={item} className="hero__cta" style={{ marginTop: 34 }}>
            <Wedge label="Build a Dozen" href="#build" family="sky" biteBg={HERO_CTA_GROUND} />
            <Wedge label="Let the Machine Decide" href="#machine" family="magenta" biteBg={HERO_CTA_GROUND} />
          </motion.div>

          <motion.div variants={item} style={{ marginTop: 40 }}>
            <SprinkleButton />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero24;
