import { motion } from 'motion/react';
import ReviewScore from './ReviewScore';
import { BrandButton } from './brand';
import { useScrollSpin } from '../hooks/useScrollSpin';
import { SHOP_HREF } from '../lib/shop-href';
import { writeFulfillmentPreference } from '../lib/fulfillment';
import { clearPickup } from '../lib/pickup';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* The photo slides in from -38% of its own width. A disc rolling that far turns
   travel / radius radians — 0.38w over w/2 is ~0.76rad, ~44deg — so it starts
   back at -44deg and unwinds to level as it lands. */
const ROLL_IN = { degrees: -44, duration: 950 };

/**
 * The hero, as a split: everything you read on the left, the donut on the right.
 *
 * It used to be a centred column — headline, lede, review score and two lane
 * cards all stacked down the middle, with the donut underneath the lot. That
 * put the one decision the homepage needs ("delivery or pickup?") below a
 * full column of centred text, and gave the donut a whole band of its own that
 * pushed the choice further down still. A centred column also has no strong
 * left edge, so the headline, the lede and the buttons each began at a
 * different x and the eye had to find the start of every line.
 *
 * Left-aligned copy against art on the right is the ordinary shape for this
 * because it works: one reading edge from the headline straight down to the
 * buttons, and the picture doing its job beside the words rather than after
 * them. Everything above the fold, on a laptop and on a phone.
 *
 * The lane cards are gone with it. They were cards — a coloured tile each,
 * with donuts fanning out of the top on hover — which is a lot of furniture
 * for what is really two buttons, and the fan meant each one owned a chunk of
 * vertical space it did not otherwise need. Two plain CTAs say the same thing
 * in a quarter of the room, and they are the site's own button, so they look
 * like every other action on the site instead of like a component that only
 * exists here.
 */
export default function Hero({ ready }: { ready: boolean }) {
  // Turns with the scroll, but only once the preloader has handed the wordmark
  // to the navbar — nothing should be moving behind the loading screen.
  const spin = useScrollSpin<HTMLImageElement>(150, ready, ROLL_IN);

  /* Both buttons go to the catalogue and record how the order is being
     collected on the way — which is what the band across the top of every
     shopping page then reports, and what checkout defaults to. Delivery drops
     any pickup slot on file, because a booked collection time is not a thing a
     delivery order has. */
  const choose = (mode: 'delivery' | 'pickup') => () => {
    writeFulfillmentPreference(mode);
    if (mode === 'delivery') clearPickup();
  };

  return (
    <section
      id="top"
      className="hero hero--split"
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        /* No bottom padding: the donut hangs out of the section on a negative
           margin and the trust band crosses it. */
        padding: 'clamp(12px,1.4vw,18px) clamp(16px,4vw,40px) 0'
      }}
    >
      <div className="hero__copy">
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {/* Two lines, broken deliberately rather than wrapped: the donut
              opens the second one, so where the break falls is part of the
              composition and not something to leave to the container width. */}
          <span className="hero-title__line">Made with care,</span>
          <span className="hero-title__line">
            <img
              src="/img/heart-shape-donut-1.png"
              alt="Heart-shaped donut"
              className="hero-title__donut"
            />
            since &rsquo;97.
          </span>
        </motion.h1>

        <motion.p
          className="hero-lede"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        >
          {/* Says what is actually for sale. The old line, "Hand-cut, decorated
              and ready whenever the craving shows up", described the care but
              named none of the five counters, so a first-time visitor could not
              tell this was a full kosher bakery rather than a donut cart. */}
          Kosher donuts, donut cakes, muffins, cupcakes, cookies and fresh
          challah. Hand-cut and decorated in-store, for delivery, pick-up or by
          the box.
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
        >
          {/* Delivery leads on fill, pickup follows on outline. Two filled
              buttons side by side is two primary actions, which is none — the
              pair still has to say which one the bakery expects most people to
              take, and it is the one that does not require leaving the house. */}
          <BrandButton href={SHOP_HREF} onClick={choose('delivery')}>
            Order delivery
          </BrandButton>
          <BrandButton href={SHOP_HREF} variant="outline" onClick={choose('pickup')}>
            Book a pickup
          </BrandButton>
        </motion.div>

        {/* Under the buttons, not above them: it is evidence for the choice
            rather than a third thing to press, and evidence reads better after
            the thing it supports than in front of it. */}
        <motion.div
          className="hero__proof"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.26, ease: EASE }}
        >
          <ReviewScore count />
        </motion.div>
      </div>

      {/* Plain wrapper, deliberately untransformed: motion leaves a transform
          on the animated element, which would trap anything absolute inside it
          in its own stacking context and let the sticky header paint over it. */}
      <div className="hero__art">
        {/* The photo runs long on purpose. `.hero-photo`'s negative bottom
            margin pulls the next section up over it, so the trust band's
            rotating certification loop crosses the donut and the rest is
            covered — the donut is cut by the moving text rather than ending on
            an edge of its own. */}
        <motion.div
          initial={{ opacity: 0, x: '-12%' }}
          animate={ready ? { opacity: 1, x: '0%' } : { opacity: 0, x: '-12%' }}
          transition={{ duration: 0.95, ease: EASE }}
        >
          <div className="hero-photo">
            <img
              ref={spin}
              src="/img/gemini-generated-image-iehotziehotzieho-copy.png"
              alt="Blue glazed donut with white sprinkles"
              style={{ width: '100%', height: 'auto', willChange: 'rotate' }}
            />

            {/* Anchored to the donut, not the section, so it travels with the
                photo at every width and through the entrance animation. Not
                spun by `useScrollSpin` either — that ref is on the donut alone,
                so the glaze turns under a seal that stays upright. */}
            <img
              src="/img/badge-socials.svg"
              alt="Proudly Canadian made"
              className="hero-seal"
              loading="lazy"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
