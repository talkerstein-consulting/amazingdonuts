import { motion } from 'motion/react';
import ReviewScore from './ReviewScore';
import { BrandButton } from './brand';
import { useScrollSpin } from '../hooks/useScrollSpin';
import { SHOP_HREF } from '../lib/shop-href';
import { writeFulfillmentPreference } from '../lib/fulfillment';
import { clearPickup } from '../lib/pickup';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* Each donut rolls in from its own side and unwinds to level as it lands, then
   turns with the scroll from there. Mirrored signs, so they counter-rotate:
   two discs turning the same way read as one image being rotated, which is
   what a single-donut hero looked like and what this composition is not. */
const ROLL_PINK = { degrees: -38, duration: 980 };
const ROLL_BLUE = { degrees: 34, duration: 980 };

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
  // Turn with the scroll, but only once the preloader has handed the wordmark
  // to the navbar — nothing should be moving behind the loading screen. One
  // hook per donut: the ref is per-element, and the two want opposite spins.
  const spinPink = useScrollSpin<HTMLImageElement>(-130, ready, ROLL_PINK);
  const spinBlue = useScrollSpin<HTMLImageElement>(115, ready, ROLL_BLUE);

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
          {/* One word each on a phone, the full phrase above it.

              Side by side in two columns, "Order delivery" and "Book a pickup"
              are the wrong length for the space — they wrapped to two lines,
              and the verbs are the half carrying no information anyway. Both
              buttons go to the same catalogue; what differs is delivery or
              pickup, so on a phone that is all they say. The <span>s are
              swapped by CSS rather than by measuring the viewport in JS, so
              there is no flash of the wrong label on first paint. */}
          <BrandButton href={SHOP_HREF} onClick={choose('delivery')}>
            <span className="cta-long">Order delivery</span>
            <span className="cta-short">Delivery</span>
          </BrandButton>
          <BrandButton href={SHOP_HREF} variant="outline" onClick={choose('pickup')}>
            <span className="cta-long">Book a pickup</span>
            <span className="cta-short">Pickup</span>
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

      {/* Two donuts, overlapped, with the seal over the pair.

          One donut was one product; two are a range, and the pair says
          something the single glazed ring could not — that these are decorated
          by hand, in more than one finish. They overlap the way two donuts do
          when someone sets them down together, blue in front and low, pink
          behind and high, each turned a little off square. Nothing here is
          centred on anything else: a composition of two objects that share a
          centre line reads as a diagram.

          Plain wrappers, deliberately untransformed around the seal: motion
          leaves a transform on the animated element, and a transform makes a
          stacking context the absolutely-positioned seal could not escape. */}
      <div className="hero__art">
        <div className="hero-duo">
          <motion.div
            className="hero-duo__slot hero-duo__slot--pink"
            initial={{ opacity: 0, y: 26, x: '-6%' }}
            animate={ready ? { opacity: 1, y: 0, x: '0%' } : { opacity: 0, y: 26, x: '-6%' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <img
              ref={spinPink}
              src="/img/hero-donut-pink.webp"
              alt="Donut with white icing and pink sprinkles"
              /* The hero is the largest thing on the first screen, so it is the
                 LCP candidate: fetched eagerly and at high priority rather than
                 lazily, which is the opposite of what every other image on the
                 page wants. */
              fetchPriority="high"
              decoding="async"
            />
          </motion.div>

          <motion.div
            className="hero-duo__slot hero-duo__slot--blue"
            initial={{ opacity: 0, y: 34, x: '8%' }}
            animate={ready ? { opacity: 1, y: 0, x: '0%' } : { opacity: 0, y: 34, x: '8%' }}
            /* A beat behind the pink one, so the two arrive as a pair being
               set down rather than as one object splitting in half. */
            transition={{ duration: 0.9, delay: 0.12, ease: EASE }}
          >
            <img
              ref={spinBlue}
              src="/img/hero-donut-blue.webp"
              alt="Donut with white icing and blue sprinkles"
              fetchPriority="high"
              decoding="async"
            />
          </motion.div>

          {/* Over the pair, not on either one. It is a mark about the bakery,
              not about a flavour, so it sits on the composition — and outside
              both motion wrappers, or it would be trapped in one donut's
              transform and travel with it. */}
          <img
            src="/img/badge-socials.svg"
            alt="Proudly Canadian made"
            className="hero-duo__seal"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
