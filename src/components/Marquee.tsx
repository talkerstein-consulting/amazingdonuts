import LogoLoop from './LogoLoop';
import { Badge } from './brand';
import type { BadgeKey } from './brand';

/**
 * The certification bar.
 *
 * Two kinds of claim ride the loop: the three allergen-free ones, drawn from
 * the brand badge set and forced to the outline treatment so a claim never
 * reads as a promotion; and the three kosher certifications, which arrive as
 * finished artwork (pill, stroke and lettering already drawn) and so go in
 * as images.
 */
const ALLERGEN: BadgeKey[] = ['nut', 'dairy', 'sesame'];

const KOSHER = [
  { src: '/badges/cor.svg', alt: 'COR certified' },
  { src: '/badges/pareve.svg', alt: 'Pareve' },
  { src: '/badges/yoshon.svg', alt: 'Yoshon' }
];

/* Interleaved rather than grouped, so a single pass of the loop always shows
   a mix instead of three of one kind then three of the other. */
const LOGOS = ALLERGEN.flatMap((key, i) => [
  {
    node: (
      <Badge
        badge={key}
        forceOutline
        style={{ color: 'var(--cream)', boxShadow: 'inset 0 0 0 2px rgba(251,247,239,.55)', whiteSpace: 'nowrap' }}
      />
    ),
    ariaLabel: key
  },
  KOSHER[i]
]);

export default function Marquee() {
  return (
    <section
      className="marquee"
      aria-label="Certifications"
      style={{
        position: 'relative',
        zIndex: 4,
        background: 'var(--navy)',
        display: 'flex',
        alignItems: 'center',
        paddingTop: 'clamp(12px,1.4vw,18px)',
        paddingBottom: 'clamp(12px,1.4vw,18px)',
        overflow: 'hidden'
      }}
    >
      <LogoLoop
        logos={LOGOS}
        speed={60}
        logoHeight={34}
        gap={20}
        fadeOut
        fadeOutColor="#0e3e69"
        pauseOnHover
        ariaLabel="Certifications"
        style={{ width: '100%' }}
      />
    </section>
  );
}
