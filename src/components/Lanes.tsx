import { useCallback, useEffect, useRef, useState } from 'react';
import ScrollStack from './scroll-stack';
import Button from './Button';
import { useDonutLab } from '../lib/donut-lab';
import { useNavTheme } from '../lib/nav-theme';
import { SQUIRCLE } from './brand';

const LANES = [
  {
    bg: 'var(--pink)',
    text: 'var(--navy)',
    title: 'Classic',
    copy: 'Glazed. Chocolate. Sprinkles. The legendary standard.',
    copyWidth: '22ch',
    image: '/img/hava-nagilla-donut-blue-white-sprinkles-1.png',
    alt: 'Pink glazed donut with blue and white sprinkles',
    href: '#favorites',
    cta: 'Shop classics',
    border: 'var(--navy)',
    hover: { background: 'var(--navy)', color: 'var(--pink)' }
  },
  {
    bg: 'var(--blue)',
    text: 'var(--sand)',
    title: 'Special',
    copy: 'Basically, bring your appetite. Vivid frostings & sprinkles galore.',
    copyWidth: '24ch',
    image: '/img/donut-cake-14-inch-1.png',
    alt: 'Cake donut with rainbow sprinkles',
    href: '#favorites',
    cta: 'Shop special',
    border: 'var(--sand)',
    hover: { background: 'var(--sand)', color: 'var(--blue)' }
  },
  {
    bg: 'var(--orange)',
    text: 'var(--navy)',
    title: 'Custom',
    copy: 'Your logo. Your message. Your very own donut.',
    copyWidth: '22ch',
    image: '/img/customizable-donut-1.png',
    alt: 'Donut with custom printed topper',
    href: '#donut-lab',
    cta: 'Try the donut lab',
    border: 'var(--navy)',
    hover: { background: 'var(--navy)', color: 'var(--orange)' }
  }
];

function LaneCard({ lane }: { lane: (typeof LANES)[number] }) {
  const { open: openLab } = useDonutLab();

  return (
    <article
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 44,
        background: lane.bg,
        padding: 'clamp(24px,3.4vw,48px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 'clamp(14px,2vw,22px)',
        height: '100%',
        width: '100%'
      }}
    >
      {/* Square squircle bed, as large as the card's free height allows. */}
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          aspectRatio: '1',
          maxWidth: '100%',
          // The card's own colour, ten percent darker.
          background: `color-mix(in srgb, ${lane.bg} 90%, #000)`,
          clipPath: SQUIRCLE,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden'
        }}
      >
        <img
          src={lane.image}
          alt={lane.alt}
          style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.3)' }}
        />
      </div>

      <h2 style={{ margin: 0, fontSize: 'var(--type-card-title)', lineHeight: 0.95, color: lane.text }}>{lane.title}</h2>

      <p style={{ margin: 0, maxWidth: lane.copyWidth, fontSize: 'var(--type-body)', lineHeight: 1.35, color: lane.text }}>
        {lane.copy}
      </p>

      <Button
        href={lane.href}
        onClick={
          lane.href === '#donut-lab'
            ? (e) => {
                e.preventDefault();
                openLab();
              }
            : undefined
        }
        style={{ border: `1.5px solid ${lane.border}`, color: lane.border, padding: '0 32px', minHeight: 60, width: '100%' }}
        hoverStyle={lane.hover}
      >
        {lane.cta}
      </Button>
    </article>
  );
}

export default function Lanes() {
  const { claim, release } = useNavTheme();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);

  // The bar wears the colour of whichever lane card is in focus, but only
  // while the stack is actually the thing sitting under the header.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const sync = () => {
      const rect = node.getBoundingClientRect();
      const underHeader = rect.top <= 0 && rect.bottom > 96;
      if (underHeader) {
        const lane = LANES[active];
        claim('lanes', { bg: lane.bg, fg: lane.text });
      } else {
        release('lanes');
      }
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      release('lanes');
    };
  }, [active, claim, release]);

  const onIndexChange = useCallback((index: number) => setActive(index), []);

  return (
    <section id="lanes" ref={sectionRef} style={{ position: 'relative', zIndex: 4, background: 'var(--cream)' }}>
      <h2
        className="lanes-title"
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(24px,3.4vw,44px) clamp(18px,4vw,40px) clamp(4px,0.8vw,12px)',
          fontSize: 'var(--type-section)',
          lineHeight: 0.92,
          letterSpacing: '-.015em',
          textWrap: 'balance'
        }}
      >
        Pick your kind of amazing.
      </h2>

      <ScrollStack onIndexChange={onIndexChange} variant="stack" cardWidth={860} cardHeight={0.72} borderRadius={44} scrollLength={0.7} peek={64} scaleStep={0.04} blur={0} dim={0.12} showProgress={false} showCounter={false}>
        {LANES.map((lane) => (
          <LaneCard key={lane.title} lane={lane} />
        ))}
      </ScrollStack>
    </section>
  );
}
