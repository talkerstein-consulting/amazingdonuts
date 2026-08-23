import { motion, type Variants } from 'motion/react';
import { BrandButton, C, F } from './brand';

/**
 * "Loved by our regulars", on the social-proof-14 frame: a sticky rail of
 * heading and copy beside two columns of quote cards.
 *
 * Two things the block ships that are deliberately not here — avatars and a
 * star rating. We have names but no headshots, and no review data at all, so
 * stock faces and an invented "4.9 across 2,400 reviews" would both be
 * fabrications. The quotes stand on their own.
 */
const QUOTES = [
  { quote: 'The custom donut wall stole the whole party. Everyone asked where we got it.', name: 'Rivka G.', role: 'Bat mitzvah order' },
  { quote: 'Fresh every single morning — the sprinkle donuts disappear before I get to the office.', name: 'Marcus L.', role: 'Regular, Classic lane' },
  { quote: 'Bulk order for 60 people, zero stress, and the box was gone in ten minutes.', name: 'Sophia P.', role: 'Office manager' },
  { quote: 'They matched our logo perfectly on the custom donuts. Tasted as good as they looked.', name: 'David C.', role: 'Donut Lab customer' },
  { quote: 'Kosher, fresh, and actually exciting flavors — the marble muffins are unreal.', name: 'Emma R.', role: 'Weekly regular' },
  { quote: 'Ordered the challah for Friday and it was gone before Shabbat started.', name: 'Tyler J.', role: 'Bread lane' }
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

function QuoteCard({ q, featured }: { q: (typeof QUOTES)[number]; featured: boolean }) {
  return (
    <motion.article variants={card} className="regulars-card">
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
            No survey, no incentive — just what people tell us at the counter and send us after a party.
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
