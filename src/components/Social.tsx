import { Suspense, lazy, useEffect, useRef } from 'react';
import { Instagram } from 'lucide-react';
import { BrandButton } from './brand';
import FacebookSolid from './FacebookSolid';
/* Deferred on purpose: this carousel pulls in @react-three/fiber and the whole
   of `three`, which is ~840kB of the bundle. Loading it on demand keeps that
   off the initial download — the section is well below the fold. */
const LenticularCarousel = lazy(() => import('./lenticular-carousel'));
import { useNavTheme } from '../lib/nav-theme';

/* LenticularCarousel takes {src, title, meta, alt}. */
const PHOTOS = [
  { src: '/img/social-1.jpg', title: 'Office run', meta: '@amazingdonuts', alt: 'Customer photo of a box of donuts' },
  { src: '/img/social-2.jpg', title: 'Sprinkle haul', meta: '@amazingdonuts', alt: 'Customer photo of sprinkle donuts' },
  { src: '/img/social-3.jpg', title: 'Review day', meta: '@amazingdonuts', alt: 'Customer reviewing a donut' },
  { src: '/img/social-4.jpg', title: 'Best in the 6', meta: '@amazingdonuts', alt: 'Customer holding a donut' },
  { src: '/img/social-5.jpg', title: 'Party pack', meta: '@amazingdonuts', alt: 'Customer photo of a party pack' }
];

const SOCIALS = [
  { label: 'Instagram', Icon: Instagram, href: '#wild', bg: 'var(--pink)', fg: 'var(--navy)' },
  { label: 'Facebook', Icon: FacebookSolid, href: '#wild', bg: 'var(--blue)', fg: 'var(--cream)' }
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
    <section id="wild" ref={sectionRef} className="section-band" style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(16px,2vw,26px) clamp(18px,4vw,40px) clamp(24px,3vw,48px)' }}>
      <div style={{ borderRadius: 44, background: 'var(--orange)', padding: 'clamp(26px,3vw,46px)' }}>
        <h2 className="wild-title" style={{ maxWidth: '15ch', fontSize: 'var(--type-section)', lineHeight: 0.92, color: 'var(--navy)' }}>
          Donuts in the wild.
        </h2>
        <p style={{ margin: '16px 0 clamp(18px,2.2vw,26px)', maxWidth: '56ch', fontSize: 'var(--type-body)', lineHeight: 1.4, color: 'var(--navy)' }}>
          The donuts are out there. See what our customers are celebrating, sharing, and making amazing.
        </p>

        {/* Straight under the copy, ahead of the gallery. */}
        <div className="wild-socials">
          {SOCIALS.map(({ label, Icon, href, bg, fg }) => (
            <BrandButton key={label} href={href} block className="wild-social" style={{ background: bg, color: fg }}>
              <span className="wild-social__label">
                <Icon size={22} strokeWidth={2.4} />
                {label}
              </span>
            </BrandButton>
          ))}
        </div>

        <div className="wild-gallery">
          <Suspense fallback={<div className="wild-gallery__loading" />}>
          <LenticularCarousel
            items={PHOTOS}
            /* Settings as specified. Cards are 1080x1920 source, so 9/16. */
            cardWidth={230}
            aspectRatio="9 / 16"
            gap={0}
            borderRadius={14}
            strips={23}
            sweep={0.6}
            refraction={0.32}
            ridge={0.5}
            foil={0.5}
            foilScale={8}
            scrim={0.85}
            tilt={14}
            travel={0.64}
            lift={40}
            perspective={1200}
            inactiveScale={0.9}
            inactiveDim={0.55}
            speed={1}
            trigger="hover"
            labelColor="#ffffff"
            showLabels
            showControls
            showDots
            loop={false}
            autoplay={false}
            enableDrag
            paused={false}
          />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
