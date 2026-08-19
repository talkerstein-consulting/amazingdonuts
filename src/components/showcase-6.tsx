"use client";

/**
 * React Bits Pro `showcase-6`, rebuilt for Amazing Donuts.
 *
 * Kept from the block: the tilted card strip, the straighten-and-lift hover,
 * the staggered entrance, the header/side-note split.
 * Changed: it now runs every donut in the case as a scroll-snapped slider with
 * left/right navigation, and a card opens the product cabinet instead of a link.
 * Shadows removed — the system has none; cards read by colour instead.
 */

import { motion, type Variants } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cutouts, FAMILIES } from "../lib/catalogue.js";

const headerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (tilt: number) => ({
    opacity: 1,
    y: 0,
    rotate: tilt,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
  })
};

export function Showcase6({ onOpen }: { onOpen?: (p: any) => void }) {
  const items = cutouts();
  const rail = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  const readEnds = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEnds({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    });
  }, []);

  useEffect(() => {
    readEnds();
    const el = rail.current;
    el?.addEventListener("scroll", readEnds, { passive: true });
    window.addEventListener("resize", readEnds);
    return () => {
      el?.removeEventListener("scroll", readEnds);
      window.removeEventListener("resize", readEnds);
    };
  }, [readEnds]);

  const nudge = (dir: number) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="section section--sun" id="flavours">
      <div className="wrap">
        <motion.div
          variants={headerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="slider__head"
        >
          <motion.div variants={fadeUp}>
            <p className="eyebrow">Every donut in the case</p>
            <h2 className="display">Slide through the lot. Open any one.</h2>
          </motion.div>

          <motion.div variants={fadeUp} className="slider__nav">
            <span className="slider__count">{items.length} things</span>
            <button
              type="button"
              className="railbtn"
              aria-label="Scroll left"
              disabled={ends.start}
              onClick={() => nudge(-1)}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className="railbtn"
              aria-label="Scroll right"
              disabled={ends.end}
              onClick={() => nudge(1)}
            >
              <ChevronRight />
            </button>
          </motion.div>
        </motion.div>
      </div>

      <div className="slider" ref={rail}>
        {items.map((p, i) => {
          const tilt = i % 2 ? 2.5 : -2.5;
          return (
            <motion.button
              key={p.id}
              type="button"
              custom={tilt}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              whileHover={{ rotate: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="slidecard"
              data-family={FAMILIES[i % 3]}
              aria-label={`Open ${p.name}`}
              onClick={() => onOpen?.(p)}
            >
              <span className="slidecard__ground" />
              <span className="slidecard__art">
                <img src={"/" + p.img} alt="" loading="lazy" draggable={false} />
              </span>
              <span className="slidecard__foot">
                <span className="slidecard__name">{p.name}</span>
                <span className="slidecard__price">{p.price}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export default Showcase6;
