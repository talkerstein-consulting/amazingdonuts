import { useEffect, useRef } from 'react';
import Button from './Button';
import { useNavTheme } from '../lib/nav-theme';
import { useDonutLab } from '../lib/donut-lab';

export default function Features() {
  const { claim, release } = useNavTheme();
  const { open: openLab } = useDonutLab();
  const sectionRef = useRef<HTMLElement | null>(null);

  // The bar goes Bubblegum while the custom-orders cards are on screen.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const sync = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top <= 0 && rect.bottom > 96) {
        claim('features', { bg: 'var(--pink)', fg: 'var(--navy)' });
      } else {
        release('features');
      }
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      release('features');
    };
  }, [claim, release]);

  return (
    <section
      ref={sectionRef}
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: 'clamp(24px,3vw,48px) clamp(18px,4vw,40px)',
        display: 'grid',
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

        <Button
          href="#donut-lab"
          className="lab-cta"
          onClick={(e) => {
            e.preventDefault();
            openLab();
          }}
          style={{
            marginTop: 'clamp(6px,1vw,12px)',
            minHeight: 60,
            padding: '0 28px',
            whiteSpace: 'nowrap',
            background: 'var(--cream)',
            color: 'var(--navy)'
          }}
          hoverStyle={{ transform: 'translateY(-2px)', background: '#fff' }}
        >
          Try the donut lab
        </Button>

        {/* Enlarged, centred, and clipped by the card's bottom edge. */}
        <img
          src="/img/babka.png"
          alt="Pink glazed donut with a custom birthday topper"
          className="lab-card__photo"
        />
      </article>

      <article
        id="bulk"
        className="bulk-card"
        style={{
          position: 'relative',
          borderRadius: 44,
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(26px,3vw,44px)',
          background: '#f7c55e'
        }}
      >
        <h2 className="feature-title" style={{ maxWidth: '12ch', lineHeight: 0.9, color: 'var(--navy)' }}>
          Got a lot of people?
        </h2>
        <p style={{ margin: '18px 0 0', maxWidth: '32ch', fontSize: 'var(--type-body)', lineHeight: 1.4, color: 'var(--navy)' }}>
          We've got a lot of donuts too. Perfect for offices, schools, events, parties, and celebrations.
        </p>

        {/* The cut-out box is the card's subject at every width. */}
        <img src="/img/bulk-donut-box.png" alt="Open box of assorted donuts" className="bulk-card__photo" />

        <Button
          href="#bulk"
          style={{ marginTop: 'auto', alignSelf: 'stretch', background: 'var(--cream)', color: 'var(--navy)', padding: '19px 24px' }}
          hoverStyle={{ transform: 'translateY(-2px)', background: '#fff' }}
        >
          Order bulk
        </Button>

        {/* Straddles the card's top edge — the card deliberately does not clip. */}
        <img src="/img/badge-petite-donuts.svg" alt="Petite donuts, party pack available" className="bulk-badge" />
      </article>

    </section>
  );
}
