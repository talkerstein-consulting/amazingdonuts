import { motion, type Variants } from 'motion/react';
import { Star } from 'lucide-react';
import { BrandButton, C, F } from './brand';

/**
 * "Loved by our regulars", on the social-proof-14 frame: a sticky rail of
 * heading and copy beside two columns of quote cards.
 *
 * These are real Google reviews of Amazing Donuts, 3499 Bathurst St, Toronto,
 * transcribed on 24 August 2026. The aggregate — 4.3 out of 5 across 81
 * Google reviews — is quoted from the same sources.
 *
 * Two caveats worth keeping with the data:
 *   - The text was read off aggregators that mirror Google (wanderlog.com and
 *     restaurantguru.com), not off Google itself, and names appear as those
 *     pages show them ("Sharon I", "AMANDEEP S"). Before launch someone should
 *     confirm each quote against the live Google listing and correct any
 *     transcription drift.
 *   - Reviews move. The 4.3/81 figure is a snapshot, so it needs a re-check at
 *     launch and periodically after, or it becomes a stale claim.
 *
 * Longer reviews are elided with an ellipsis; nothing is paraphrased, and no
 * quote here was written by us. That is why the earlier placeholder set was
 * marked as invented — it was.
 */
const RATING = { score: '4.3', of: '5', count: 81 };

const QUOTES = [
  { quote: 'We ordered custom donuts for our son’s Bar Mitzvah and they looked and tasted amazing.', name: 'Sharon I', role: 'Google review', stars: 5 },
  { quote: 'The glaze was smooth and flavourful, and you can really taste the quality ingredients. Definitely coming back.', name: 'Amandeep S', role: 'Google review', stars: 5 },
  { quote: 'Got a donut cake for my nephew’s b’day and he loved it… their donuts are koshered good and staff was nice, so therefore a hidden gem.', name: 'Ken N', role: 'Google review', stars: 4 },
  { quote: 'I had driven by here numerous times before work and finally I stopped in… The donuts were so good! The service was amazing.', name: 'Brian P', role: 'Google review', stars: 5 },
  { quote: 'We got challah and donuts a few times here. Very good, Friday mornings it’s a rush.', name: 'Hernan Garcia', role: 'Google review', stars: 5 },
  { quote: 'Amazing fresh kosher donuts!', name: 'Y M', role: 'Google review', stars: 5 }
];

const COLUMNS = [QUOTES.filter((_, i) => i % 2 === 0), QUOTES.filter((_, i) => i % 2 === 1)];

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

function QuoteCard({ q, featured }: { q: (typeof QUOTES)[number]; featured: boolean }) {
  return (
    <motion.article variants={card} className="regulars-card">
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
    </motion.article>
  );
}

export default function Testimonials() {
  return (
    <section className="section-band regulars-band" style={{ background: 'var(--cream)', padding: 'clamp(28px,3.4vw,52px) 0 clamp(20px,2.6vw,40px)' }}>
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
              margin: '0 0 22px',
              fontFamily: F.text,
              fontSize: 15,
              color: 'rgba(14,62,105,.7)'
            }}
          >
            <strong style={{ fontFamily: 'var(--font-cta)', fontWeight: 700, color: C.navy }}>
              {RATING.score} out of {RATING.of}
            </strong>{' '}
            across {RATING.count} Google reviews
          </p>
          <BrandButton href="#wild" variant="outline" className="regulars-cta">
            See more on our socials
          </BrandButton>

          {/* Under the rail's CTA. */}
          <img src="/img/badge-socials.svg" alt="Proudly Canadian" className="regulars-badge" />
        </motion.div>

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
      </div>
    </section>
  );
}
