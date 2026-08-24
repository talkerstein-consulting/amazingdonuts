import { useRef } from 'react';
import { BrandButton } from './brand';
import { useNavClaimAtMidpoint } from '../lib/nav-theme';
import { LAB_HREF } from '../lib/lab-href';
import { BULK_HREF } from '../lib/routes';
import { shopHref } from '../lib/shop-href';

/**
 * The petite lineup. Trimmed WebP copies of the catalogue cut-outs, in
 * `public/img/petite/` — each original was a square canvas with the donut
 * filling only 46–51% of its height, so a row of them was mostly padding.
 */
const PETITE = [
  { src: '/img/petite/candy-donut-round-sprinkles.webp', alt: 'Petite donut with rainbow sprinkles' },
  { src: '/img/petite/zap-donut-pink-blue-white-sprinkles.webp', alt: 'Petite donut with pink, blue and white sprinkles' },
  { src: '/img/petite/chocolate-glazed-donut.webp', alt: 'Petite chocolate glazed donut' },
  { src: '/img/petite/hava-nagilla-donut-blue-white-sprinkles.webp', alt: 'Petite donut with blue and white sprinkles' },
  { src: '/img/petite/carnival-donut-pink-blue-yellow-sprinkles.webp', alt: 'Petite donut with pink, blue and yellow sprinkles' }
];

export default function Features() {
  const sectionRef = useRef<HTMLElement | null>(null);

  // The bar goes Bubblegum while the custom-orders cards own the middle of the screen.
  useNavClaimAtMidpoint(sectionRef, 'features', { bg: 'var(--pink)', fg: 'var(--navy)' });

  return (
    <section
      ref={sectionRef}
      className="section-band features-band"
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: 'clamp(24px,3vw,48px) clamp(18px,4vw,40px)',
        display: 'grid',
        /* Two cards, then a banner across both. Named so the banner can span
           the row explicitly rather than relying on auto-fit to run out. */
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,420px), 1fr))',
        gap: 'clamp(16px,2vw,26px)'
      }}
    >
      <article
        id="lab"
        className="lab-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 44,
          background: '#f5c4c8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: 'clamp(24px,3vw,44px)',
          paddingBottom: 0,
          gap: 'clamp(14px,1.8vw,20px)'
        }}
      >
        <h2 className="lab-title" style={{ margin: 0, lineHeight: 0.9, color: 'var(--navy)' }}>
          You dream it, we make it.
        </h2>

        <p className="lab-card__copy" style={{ margin: 0, fontSize: 'var(--type-body)', lineHeight: 1.45, color: 'var(--navy)' }}>
          Custom donuts and cookies made for birthdays, brands, parties, and very important inside jokes.
        </p>

        {/* Custom orders is this section's hero moment — Dare Devil, full width. */}
        <BrandButton
          href={LAB_HREF}
          className="lab-cta"
          block
          style={{ marginTop: 'clamp(6px,1vw,12px)' }}
        >
          Try the donut lab
        </BrandButton>

        {/* Enlarged, centred, and clipped by the card's bottom edge. */}
        <img
          src="/img/babka.png"
          alt="Pink glazed donut with a custom birthday topper"
          className="lab-card__photo"
        />
      </article>

      {/* Slot two, where the bulk card used to be. Petite donuts, aimed at the
          customer who is counting something — the appeal is "you can still have
          the whole taste", not "this is diet food", which is the one claim a
          bakery should never make about a donut. */}
      <article
        id="petite"
        className="bulk-card"
        style={{
          position: 'relative',
          borderRadius: 44,
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(26px,3vw,44px)',
          /* Harbour blue rather than the bulk card's amber: this is a different
             proposition and reads as one. */
          background: 'var(--blue)'
        }}
      >
        <h2 className="feature-title bulk-title" style={{ lineHeight: 0.9, color: 'var(--cream)' }}>
          Watching your figure?
        </h2>
        <p
          style={{
            margin: '18px 0 0',
            maxWidth: '32ch',
            fontSize: 'var(--type-body)',
            lineHeight: 1.4,
            color: 'rgba(251,247,239,.88)'
          }}
        >
          Get a full taste with our petite donuts. Same icing, same sprinkles, two bites — so you can have one
          without making it a decision.
        </p>

        {/* A lineup rather than one hero donut: five in a row says "small, and
            there are lots of them", which is the whole proposition. The art is
            trimmed to its alpha bounds — the catalogue cut-outs are square
            canvases roughly half transparent, and untrimmed they sat in a row
            as five small donuts with big uneven gaps between them. */}
        <div className="petite-row">
          {PETITE.map((d) => (
            <img key={d.src} src={d.src} alt={d.alt} loading="lazy" />
          ))}
        </div>

        <BrandButton href={shopHref({ tier: 'classic' })} variant="outline" block style={{ marginTop: 'auto' }}>
          Shop petite
        </BrandButton>

        {/* The petite badge belongs on this card now, not on the bulk one. */}
        <img src="/img/badge-petite-donuts.svg" alt="Petite donuts, party pack available" className="bulk-badge" />
      </article>

      {/* Bulk, moved out of the right-hand slot and laid across the full width
          under both cards. A horizontal band suits it better than a card ever
          did: the copy is one line and the subject is a wide box of donuts, and
          it now points at the real bulk-orders page rather than at itself. */}
      <article id="bulk" className="bulk-banner">
        <div className="bulk-banner__copy">
          <h2 className="feature-title bulk-banner__title">Got a lot of people?</h2>
          <p className="bulk-banner__note">
            We&rsquo;ve got a lot of donuts too. Offices, schools, events, parties and celebrations.
          </p>
          <BrandButton href={BULK_HREF} variant="outline" className="bulk-banner__cta">
            Order bulk
          </BrandButton>
        </div>

        <img src="/img/bulk-donut-box.png" alt="Open box of assorted donuts" className="bulk-banner__photo" />
      </article>

    </section>
  );
}
