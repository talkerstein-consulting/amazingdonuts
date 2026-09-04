import { Suspense, lazy, useRef } from 'react';
import { Instagram } from 'lucide-react';
import { BrandButton } from './brand';
import FacebookSolid from './FacebookSolid';
/* Deferred on purpose: this carousel pulls in @react-three/fiber and the whole
   of `three`, which is ~840kB of the bundle. Loading it on demand keeps that
   off the initial download — the section is well below the fold. */
const LenticularCarousel = lazy(() => import('./lenticular-carousel'));
import { useNavClaimAtMidpoint } from '../lib/nav-theme';

/* LenticularCarousel takes {src, title, meta, alt}.
 *
 * Real reel covers from the shop's Instagram, converted from the supplied
 * JPGs to 540x960 WebP — 9:16, twice the 230px card, 53kB each against the
 * ~120kB originals. All 48 usable covers are in `public/img/reels/`; twelve
 * are wired up here.
 *
 * Twelve, not forty-eight, because this carousel is WebGL: it builds a
 * THREE texture per item up front, so every extra card is ~2MB of GPU memory
 * whether or not anyone scrolls to it. Swapping which twelve is a one-line
 * change; the other thirty-six are named reel-01…reel-48 in filename order.
 *
 * The picks lean product-forward, and the titles and alt text describe what is
 * actually in each frame rather than inventing a caption for it.
 */
const PHOTOS = [
  { src: '/img/reels/reel-29.webp', title: 'Chanuka box',      meta: '@amazingdonutsto', alt: 'Box of donuts with chocolate glaze and coloured sprinkles' },
  { src: '/img/reels/reel-02.webp', title: 'The classics',     meta: '@amazingdonutsto', alt: 'Open box of chocolate, pink and rainbow-sprinkle donuts' },
  { src: '/img/reels/reel-03.webp', title: 'Fresh glazed',     meta: '@amazingdonutsto', alt: 'Glazed ring donuts cooling on a wire rack' },
  { src: '/img/reels/reel-48.webp', title: 'Pink pomegranate', meta: '@amazingdonutsto', alt: 'Pink iced donuts topped with pomegranate seeds' },
  { src: '/img/reels/reel-34.webp', title: 'Dreidels and stars', meta: '@amazingdonutsto', alt: 'Chocolate-dipped dreidel and star of David cookies on a tray' },
  { src: '/img/reels/reel-19.webp', title: 'Blue and white',   meta: '@amazingdonutsto', alt: 'Donuts iced in blue and white with drizzle' },
  { src: '/img/reels/reel-07.webp', title: 'Strawberry cookies', meta: '@amazingdonutsto', alt: 'Tray of pink strawberry-shaped iced cookies' },
  { src: '/img/reels/reel-42.webp', title: 'White and sprinkles', meta: '@amazingdonutsto', alt: 'White-iced donuts scattered with rainbow sprinkles' },
  { src: '/img/reels/reel-25.webp', title: 'Morning batch',    meta: '@amazingdonutsto', alt: 'Tray of freshly glazed ring donuts' },
  { src: '/img/reels/reel-20.webp', title: 'Iced rounds',      meta: '@amazingdonutsto', alt: 'Rows of round cookies iced in red, green, yellow and blue' },
  { src: '/img/reels/reel-12.webp', title: 'Sprinkle haul',    meta: '@amazingdonutsto', alt: 'Box of assorted sprinkle and chocolate donuts' },
  { src: '/img/reels/reel-08.webp', title: 'Trays for the morning', meta: '@amazingdonutsto', alt: 'Racks of plain glazed donuts in the bakery' }
];

const SOCIALS = [
  { label: 'Instagram', Icon: Instagram, href: 'https://www.instagram.com/amazingdonutsto/', bg: 'var(--pink)', fg: 'var(--navy)' },
  { label: 'Facebook', Icon: FacebookSolid, href: 'https://www.facebook.com/amazingdonuts/', bg: 'var(--blue)', fg: 'var(--cream)' }
];

export default function Social() {
  const sectionRef = useRef<HTMLElement | null>(null);

  // Dare Devil orange, once the panel is what you are looking at.
  useNavClaimAtMidpoint(sectionRef, 'social', { bg: 'var(--orange)', fg: 'var(--navy)' });

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
            /* A new tab, and `noopener` with it: the destination must not get a
               handle on this window, and the visitor must not lose the page
               they were reading to reach a social profile. */
            <BrandButton key={label} href={href} target="_blank" rel="noopener noreferrer" block className="wild-social" style={{ background: bg, color: fg }}>
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
