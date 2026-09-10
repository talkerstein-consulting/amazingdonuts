import { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { ChevronDown, Star } from 'lucide-react';
import { C, F } from './brand';
import { PRODUCTS, type Product } from '../data/products';
import { RATING } from '../data/reviews';
import ProductLine from './ProductLine';
import GoogleG from './GoogleG';
import { useShop } from '../lib/shop';
import { useIsDesktop } from '../hooks/useIsDesktop';

/**
 * "Loved by our regulars", on the social-proof-14 frame: a sticky rail of
 * heading and copy beside two columns of quote cards.
 *
 * These are real Google reviews of Amazing Donuts, 3499 Bathurst St, Toronto,
 * transcribed on 24 August 2026. The aggregate they summarise lives in
 * `data/reviews.ts`, which the trust band under the hero quotes as well.
 *
 * One caveat worth keeping with the data: the text was read off aggregators
 * that mirror Google (wanderlog.com and restaurantguru.com), not off Google
 * itself, and names appear as those pages show them ("Sharon I", "AMANDEEP S").
 * Before launch someone should confirm each quote against the live Google
 * listing and correct any transcription drift.
 *
 * Longer reviews are elided with an ellipsis; nothing is paraphrased, and no
 * quote here was written by us. That is why the earlier placeholder set was
 * marked as invented — it was.
 */

/**
 * Each review now carries the thing it is a review *of*.
 *
 * `product` is the catalogue id of the item the quote actually names, so the
 * pairing is editorial rather than decorative — Sharon's Bar Mitzvah donuts
 * are the custom-printed dozen, Hernan's Friday challah is the six-braid, and
 * so on. The one review that names no item (Brian's) gets no card, which is
 * why the field is optional: inventing a pairing there would put words in his
 * mouth, and the layout handles a card-less quote.
 *
 * Ids are resolved against PRODUCTS at module load. A rename in the catalogue
 * drops the strip rather than breaking the review, which is the right failure
 * for a homepage — the quote is the content, the product is the offer.
 */
const QUOTES: {
  quote: string;
  name: string;
  role: string;
  stars: number;
  product?: string;
}[] = [
  { quote: 'We ordered custom donuts for our son’s Bar Mitzvah and they looked and tasted amazing.', name: 'Sharon I', role: 'Google review', stars: 5, product: 'twelve-custom-printed-donuts' },
  { quote: 'The glaze was smooth and flavourful, and you can really taste the quality ingredients. Definitely coming back.', name: 'Amandeep S', role: 'Google review', stars: 5, product: 'chocolate-glazed-donut' },
  { quote: 'Got a donut cake for my nephew’s b’day and he loved it… their donuts are koshered good and staff was nice, so therefore a hidden gem.', name: 'Ken N', role: 'Google review', stars: 4, product: 'donut-cake-14-inch' },
  { quote: 'I had driven by here numerous times before work and finally I stopped in… The donuts were so good! The service was amazing.', name: 'Brian P', role: 'Google review', stars: 5 },
  { quote: 'We got challah and donuts a few times here. Very good, Friday mornings it’s a rush.', name: 'Hernan Garcia', role: 'Google review', stars: 5, product: 'challah-six-braid-friday-only' },
  { quote: 'Amazing fresh kosher donuts!', name: 'Y M', role: 'Google review', stars: 5, product: 'hava-nagilla-donut-blue-white-sprinkles' }
];

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

const COLUMNS = [QUOTES.filter((_, i) => i % 2 === 0), QUOTES.filter((_, i) => i % 2 === 1)];

/* How many reviews a phone shows before it asks.

   Six of these is a long way to scroll past on one column. Each card is a
   quote, an attribution and the product it names — comfortably 300px — so the
   section ran the better part of three screens on a phone, between the
   homepage's catalogue and everything under it. Three is enough to establish
   that the reviews are real and varied; the rest are a tap away for anyone who
   wants them, and nobody who does not want them has to scroll through them.

   Two columns can afford all six, which is why this only applies below the
   width where the second column appears — see `.regulars-cols`. */
const PHONE_PREVIEW = 3;

const rail: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};
const column: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } }
};
const card: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5`} style={{ display: 'inline-flex', gap: 2, marginBottom: 12 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          /* Filled to the score, outlined past it: a four-star review should
             not be dressed up as a five.
             Navy, not Dare Devil orange — thirty stars would be thirty hero
             moments, and the brand allows one per screen. */
          style={{ color: i < n ? C.navy : 'rgba(14,62,105,.28)' }}
          fill={i < n ? C.navy : 'none'}
        />
      ))}
    </span>
  );
}

/**
 * The reviewed item, attached to the foot of its review.
 *
 * The cart drawer's line item, unchanged — same `ProductLine`, same sand bed,
 * same 74px squircle thumbnail, same name and price scale. It used to be a
 * card of its own: a 112px photograph, a display name at up to 38px, its own
 * add knob, and a block of stylesheet to hold it together. That made the offer
 * under a quote louder than the quote, and it was a second version of an
 * object the site already had.
 *
 * No stepper and no remove button. Those belong to a line in the box, where
 * quantity is the thing being edited. Here the card is a pointer at the
 * product — the whole of it opens the panel, and the panel is where adding
 * happens.
 */
function AttachedProduct({ product }: { product: Product }) {
  const { openProduct } = useShop();

  return (
    <button
      type="button"
      onClick={() => openProduct(product.id)}
      aria-label={`View ${product.name}`}
      className="cart__line regulars-product"
    >
      <ProductLine product={product} />
    </button>
  );
}

/**
 * A card the button revealed is a plain element. Only the ones already on the
 * page when it scrolls into view are animated.
 *
 * The column staggers its children through `variants` and a one-shot
 * `whileInView`. That covers the cards present when the section scrolls past,
 * and nothing else: `once: true` takes the viewport listener away when it
 * fires, leaving the container with no `animate` prop, so anything mounted
 * afterwards resolves the `hidden` variant it inherits and sits at zero
 * opacity. Pressing "Read 3 more reviews" added three cards to the DOM,
 * invisible, and made the page taller.
 *
 * Giving those cards their own entrance animation fixes the symptom and keeps
 * the cause: their visibility still depends on an animation actually running.
 * It does not, everywhere — a throttled background tab, a device that drops
 * the frame, a motion library that errors — and the failure mode is content
 * that is present, styled, and unreadable. Reviews are the content; an
 * entrance is decoration.
 *
 * So a revealed card carries no `initial` and no opacity to recover from. It
 * is visible because it is in the DOM. The reader asked for these by pressing
 * a button, which is its own transition — they do not need to be introduced.
 */
function QuoteCard({
  q,
  featured,
  revealed = false
}: {
  q: (typeof QUOTES)[number];
  featured: boolean;
  revealed?: boolean;
}) {
  const product = q.product ? BY_ID.get(q.product) : undefined;

  const Card = revealed ? 'article' : motion.article;

  return (
    <Card {...(revealed ? {} : { variants: card })} className="regulars-card">
      <Stars n={q.stars} />
      <p
        style={{
          margin: 0,
          fontFamily: F.text,
          fontSize: featured ? 18 : 16,
          fontWeight: featured ? 500 : 400,
          lineHeight: 1.5,
          color: featured ? C.navy : 'rgba(14,62,105,.78)'
        }}
      >
        &ldquo;{q.quote}&rdquo;
      </p>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(14,62,105,.14)' }}>
        <p style={{ margin: 0, fontFamily: 'var(--font-cta)', fontWeight: 700, fontSize: 14, color: C.navy }}>{q.name}</p>
        <p style={{ margin: '2px 0 0', fontFamily: F.text, fontSize: 13, color: 'rgba(14,62,105,.6)' }}>{q.role}</p>
      </div>

      {/* Below the attribution, not above it: the review has to be read and
          credited before the thing it reviews is offered, or the strip reads
          as an ad with a quote attached rather than the reverse. */}
      {product && <AttachedProduct product={product} />}
    </Card>
  );
}

export default function Testimonials() {
  /* 640px is where the second column appears — see `.regulars-cols`. Below it
     the section is one stack, which is the case the cap exists for. */
  const twoUp = useIsDesktop(640);
  const [expanded, setExpanded] = useState(false);

  return (
    /* Named, because the trust band's rating links down to the quotes it
       summarises. */
    <section id="regulars" className="section-band regulars-band" style={{ background: 'var(--cream)', padding: 'clamp(28px,3.4vw,52px) 0 clamp(20px,2.6vw,40px)' }}>
      {/* Full width above the columns, so it carries the same weight as
          "Donuts in the wild." — inside the 4/12 rail it could not. The
          wrapper carries the same container width as the grid below, so the
          two stay left-aligned. */}
      <div className="regulars-head">
        <h2 className="regulars-title">Loved by our regulars</h2>
      </div>

      <div className="regulars-grid">
        <motion.div
          variants={rail}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="regulars-rail"
        >
          <p className="regulars-lede">
            No survey, no incentive — just what people have written about us on Google.
          </p>

          {/* The aggregate, stated plainly with its source, because a rating
              with no provenance is worth nothing. */}
          <p
            style={{
              /* Set well below the lede rather than tucked under it: the
                 aggregate is its own claim, not a trailing clause. */
              margin: 'clamp(20px, 2.4vw, 34px) 0 0',
              fontFamily: F.text,
              fontSize: 15,
              color: 'rgba(14,62,105,.7)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap'
            }}
          >
            {/* The mark attributes the aggregate to Google at a glance; the
                words after it still say so for anyone who cannot see it. */}
            <GoogleG size={18} />
            <span>
              <strong style={{ fontFamily: 'var(--font-cta)', fontWeight: 700, color: C.navy }}>
                {RATING.score} out of {RATING.of}
              </strong>{' '}
              across {RATING.count} Google reviews
            </span>
          </p>

          {/* The Proudly Canadian seal used to sit here, small and on its own
              below the CTA. It now rides the trust band under the hero, next to
              the rating and the certifications, where all three read as one
              signal instead of three unrelated marks. */}
        </motion.div>

        {/* One column on a phone, and only the first few of it.

            Two columns is the design; below 640px they stack, and stacked they
            are six full-height cards in a row. So the narrow layout is its own
            branch rather than the wide one squeezed: a single flat list in
            editorial order — which the interleaved columns lose once they
            stack — capped at `PHONE_PREVIEW`, with the rest behind a button.

            Not a carousel. A swipe rail hides how many there are and makes the
            sixth review as much work as the second; a count on a button says
            exactly what pressing it gets you. */}
        {twoUp ? (
          <div className="regulars-cols">
            {COLUMNS.map((col, ci) => (
              <motion.div
                key={ci}
                variants={column}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px,1.6vw,22px)' }}
              >
                {col.map((q, i) => (
                  <QuoteCard key={q.name} q={q} featured={ci === 0 && i === 0} />
                ))}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="regulars-cols">
            <motion.div
              variants={column}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px,1.6vw,22px)' }}
            >
              {(expanded ? QUOTES : QUOTES.slice(0, PHONE_PREVIEW)).map((q, i) => (
                <QuoteCard
                  key={q.name}
                  q={q}
                  featured={i === 0}
                  revealed={i >= PHONE_PREVIEW}
                />
              ))}

              {!expanded && QUOTES.length > PHONE_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="regulars-more brand-press"
                >
                  {/* The number, not "Show more": it is the difference between
                      a control whose cost is known and one that might go on
                      forever. */}
                  Read {QUOTES.length - PHONE_PREVIEW} more reviews
                  <ChevronDown size={17} strokeWidth={2.6} aria-hidden="true" />
                </button>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}
