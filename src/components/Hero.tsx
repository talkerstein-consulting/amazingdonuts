import { motion } from 'motion/react';
import { BrandButton } from './brand';
import ReviewScore from './ReviewScore';
import { useScrollSpin } from '../hooks/useScrollSpin';
import { SHOP_HREF } from '../lib/shop-href';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* The photo slides in from -38% of its own width. A disc rolling that far turns
   travel / radius radians — 0.38w over w/2 is ~0.76rad, ~44deg — so it starts
   back at -44deg and unwinds to level as it lands. */
const ROLL_IN = { degrees: -44, duration: 950 };

export default function Hero({ ready }: { ready: boolean }) {
  // Turns with the scroll, but only once the preloader has handed the wordmark
  // to the navbar — nothing should be moving behind the loading screen.
  const spin = useScrollSpin<HTMLImageElement>(150, ready, ROLL_IN);

  return (
    <section id="top" className="hero" style={{ maxWidth: 1240, margin: '0 auto', /* No bottom padding: the donut hangs out of the section on a
        negative margin and the trust band crosses it. */
      padding: 'clamp(12px,1.4vw,18px) clamp(16px,4vw,40px) 0' }}>
      <motion.h1
        className="hero-title"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{
          fontSize: 'var(--type-hero)',
          // Tighter than the v5 display step so the two lines close up.
          lineHeight: 0.82,
          letterSpacing: '-.015em',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'clamp(10px,1.2vw,20px)',
          textWrap: 'balance'
        }}
      >
        {/* The heart donut sits mid-line, so the break lands after it: two
            lines, the second short. It is inline in a flex row, which is why
            the break cannot be done with a <br>. */}
        <span>Made with care,</span>
        <img src="/img/heart-shape-donut-1.png" alt="Heart-shaped donut" style={{ height: 'clamp(0.62em,8vw,1em)', width: 'auto' }} />
        <span>since '97.</span>
      </motion.h1>

      <motion.p
        className="hero-lede"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        style={{
          margin: 'clamp(10px,1.2vw,16px) 0 0',
          /* Wider than the old 34ch: the lede now names the counters, and the
             list needs the room to sit on two lines rather than four. */
          maxWidth: '46ch',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--type-body)',
          lineHeight: 1.45,
          color: 'rgba(14,62,105,.75)'
        }}
      >
        {/* Says what is actually for sale. The old line, "Hand-cut, decorated
            and ready whenever the craving shows up", described the care but
            named none of the five counters, so a first-time visitor could not
            tell this was a full kosher bakery rather than a donut cart.

            Two plain sentences, no dashes: the counters, then how they are
            made and collected. */}
        Kosher donuts, donut cakes, muffins, cupcakes, cookies and fresh
        challah. Hand-cut and decorated in-store, for delivery, pick-up or by
        the box.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
        className="hero-ctas"
        style={{ marginTop: 'clamp(14px,1.6vw,20px)', display: 'flex', flexWrap: 'wrap', gap: 12 }}
      >
        {/* The page's single Dare Devil moment, and now the only hero action:
            the Lab's "Make your own" is still reachable from the bar and from
            its own lane card, and two peers here split the one thing the hero
            is for. Names no counter, so it opens the whole catalogue. */}
        <BrandButton href={SHOP_HREF}>Shop donuts</BrandButton>

        {/* Beside the button, not below the fold. It is not a second action —
            no fill, no ring — so it supports the press rather than competing
            for it. */}
        <ReviewScore />
      </motion.div>

      {/* Plain wrapper, deliberately untransformed: motion leaves a transform
          on the animated element, which would trap anything absolute inside it
          in its own stacking context and let the sticky header paint over it. */}
      <div style={{ position: 'relative', marginTop: 'clamp(2px,0.6vw,10px)' }}>
        {/* The photo runs long on purpose. `.hero-photo`'s negative bottom
            margin pulls the next section up over it, so the trust band's
            rotating certification loop crosses the donut and the rest is
            covered — the donut is cut by the moving text rather than ending on
            an edge of its own. It rolls in from the left on load, landing
            where it sits at rest, and `useScrollSpin` turns it with the page
            from then on. */}
        <motion.div
          initial={{ opacity: 0, x: '-38%' }}
          animate={ready ? { opacity: 1, x: '0%' } : { opacity: 0, x: '-38%' }}
          transition={{ duration: 0.95, ease: EASE }}
        >
          <div className="hero-photo">
            <img
              ref={spin}
              src="/img/gemini-generated-image-iehotziehotzieho-copy.png"
              alt="Blue glazed donut with white sprinkles"
              style={{ width: '100%', height: 'auto', willChange: 'rotate' }}
            />

            {/* Inside the photo box, not the section.

                Positioned against the section it looked right at one width and
                wrong at every other: the donut is narrower than the section,
                centred, and slides in from the left on load, so a seal
                anchored to the section's edge drifted off the glaze and
                collided with the review score. In here it is anchored to the
                donut itself and travels with it, whatever the width and
                whatever the entrance animation is doing.

                Not spun by `useScrollSpin` either — that ref is on the donut
                alone, so the glaze turns under a seal that stays upright. */}
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
