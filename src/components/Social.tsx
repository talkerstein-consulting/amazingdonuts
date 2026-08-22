import { useEffect, useRef } from 'react';
import { Facebook, Instagram } from 'lucide-react';
import TiltedTiles from './tilted-tiles';
import { useNavTheme } from '../lib/nav-theme';

const PHOTOS = ['/img/social-1.jpg', '/img/social-2.jpg', '/img/social-3.jpg', '/img/social-4.jpg', '/img/social-5.jpg'];

const SOCIALS = [
  { label: 'Instagram', Icon: Instagram, href: '#wild', bg: 'var(--pink)', fg: 'var(--blue)' },
  { label: 'Facebook', Icon: Facebook, href: '#wild', bg: 'var(--blue)', fg: 'var(--pink)' }
];

export default function Social() {
  const { claim, release } = useNavTheme();
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const sync = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top <= 0 && rect.bottom > 96) {
        claim('social', { bg: 'var(--orange)', fg: 'var(--navy)' });
      } else {
        release('social');
      }
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      release('social');
    };
  }, [claim, release]);

  return (
    <section id="wild" ref={sectionRef} style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(16px,2vw,26px) clamp(18px,4vw,40px) clamp(24px,3vw,48px)' }}>
      <div style={{ borderRadius: 44, background: 'var(--orange)', padding: 'clamp(26px,3vw,46px)' }}>
        <h2 className="wild-title" style={{ maxWidth: '15ch', fontSize: 'var(--type-section)', lineHeight: 0.92, color: 'var(--navy)' }}>
          Donuts in the wild.
        </h2>
        <p style={{ margin: '16px 0 clamp(22px,2.6vw,32px)', maxWidth: '56ch', fontSize: 'var(--type-body)', lineHeight: 1.4, color: 'var(--navy)' }}>
          The donuts are out there. See what our customers are celebrating, sharing, and making amazing.
        </p>

        <div style={{ height: 'clamp(300px,34vw,420px)', borderRadius: 20, overflow: 'hidden' }}>
          <TiltedTiles
            images={PHOTOS}
            columns={4}
            tilesPerColumn={5}
            tileAspect={0.78}
            rowGap={6}
            columnGap={6}
            borderRadius={12}
            rotateX={12}
            rotateY={-14}
            rotateZ={6}
            planeWidth={150}
            planeHeight={150}
            duration={26}
            alternate
            fadeTop={14}
            fadeBottom={14}
            parallax
          />
        </div>

        <p
          style={{
            margin: 'clamp(20px,2.4vw,30px) 0 clamp(12px,1.6vw,18px)',
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--type-body)',
            lineHeight: 1.4,
            color: 'var(--navy)'
          }}
        >
          Follow us on our socials
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {SOCIALS.map(({ label, Icon, href, bg, fg }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              style={{
                minHeight: 64,
                borderRadius: 24,
                background: bg,
                color: fg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform .18s ease'
              }}
              className="lift-card"
            >
              <Icon size={30} strokeWidth={2.4} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
