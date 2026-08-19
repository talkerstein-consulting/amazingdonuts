"use client";

/**
 * React Bits Pro `features-12`, rebuilt for Amazing Donuts.
 *
 * Kept from the block: the eyebrow → statement → three tall cards rhythm, the
 * staggered entrance, the icon-above / copy-below card structure.
 * Changed: brand families instead of neutrals, the wedge ground under each
 * card, and the lucide icons animate on hover instead of the card taking a
 * shadow — the system has no shadows.
 */

import { motion, type Variants } from "motion/react";
import { Cake, PartyPopper, Wheat } from "lucide-react";

const cards = [
  {
    icon: PartyPopper,
    family: "sky",
    rank: "Holds up perfectly",
    statement: "It is somebody's birthday.",
    description:
      "Twenty-eight years of birthdays, and nobody has once asked us to justify the box. Add lettering or a printed photo and it becomes the whole party.",
    spin: { rotate: [0, -14, 10, 0], scale: [1, 1.12, 1.06, 1] }
  },
  {
    icon: Cake,
    family: "magenta",
    rank: "Holds up well",
    statement: "The team had a rough week.",
    description:
      "Forty-five dollars of printed donuts has rescued more Monday meetings than any offsite we have heard about. It arrives, and the room changes.",
    spin: { rotate: [0, 8, -8, 0], y: [0, -6, 0, 0] }
  },
  {
    icon: Wheat,
    family: "sunshine",
    rank: "Not an excuse — a duty",
    statement: "It is Friday and there is challah.",
    description:
      "Six-braid, baked Friday only, $9. It is out of the oven in the morning and gone by early afternoon, every single week.",
    spin: { rotate: [0, -10, 10, 0], scale: [1, 1.1, 1, 1] }
  }
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } }
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

export function Features12() {
  return (
    <section className="section section--sky" id="reasons">
      <div className="wrap">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.div variants={fadeUp} className="section__head">
            <p className="eyebrow">Occasions, reviewed</p>
            <h2 className="display">Reasons to buy a dozen, ranked by how well they hold up.</h2>
          </motion.div>

          <motion.div variants={container} className="excuses">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.article
                  key={card.statement}
                  variants={fadeUp}
                  whileHover="hover"
                  className="excuse excuse--tall"
                  data-family={card.family}
                >
                  <span className="excuse__ground" />
                  <motion.span
                    className="excuse__icon"
                    variants={{ hover: card.spin }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Icon strokeWidth={1.75} />
                  </motion.span>
                  <div className="excuse__foot">
                    <span className="excuse__no">{card.rank}</span>
                    <h3>{card.statement}</h3>
                    <p>{card.description}</p>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Features12;
