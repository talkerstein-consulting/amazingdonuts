import type { CSSProperties } from 'react';
import { F } from './brand';

/**
 * A kosher certification badge: the supplied mark beside its English label.
 *
 * The marks arrive as artwork only — the COR oval, פרווה and ישן — with no
 * Latin text, so the label is set in live Karla Bold rather than being baked
 * into the SVG as outlines (which is what the original badge artwork did, and
 * why it could not follow the brand's type).
 *
 * Brand system v5 is explicit about the artwork: it is white-only, must sit on
 * a solid Harbour surface, and must never be recoloured. An earlier pass
 * painted each mark as a CSS mask so it picked up the badge's `currentColor`
 * and matched the allergen pills exactly — which is precisely the recolouring
 * the spec forbids, so the marks are plain <img> again. The one call site (the
 * certification marquee) is a navy band, so the white artwork has the solid
 * Harbour ground it needs; anything new using this must supply one too.
 */
export type KosherKey = 'cor' | 'pareve' | 'yoshon';

const MARKS: Record<KosherKey, { src: string; ratio: number; label: string; alt: string }> = {
  // ratio = intrinsic width / height, so the box keeps each mark's shape.
  // v5 sets the COR label as live text — the mark carries no numeral of its own.
  cor: { src: '/badges/cor-mark.svg', ratio: 614 / 347, label: 'COR 483', alt: 'COR 483 certified' },
  pareve: { src: '/badges/pareve-mark.svg', ratio: 466 / 145, label: 'Pareve', alt: 'Pareve' },
  yoshon: { src: '/badges/yoshon-mark.svg', ratio: 275 / 202, label: 'Yoshon', alt: 'Yoshon' }
};

export default function KosherBadge({
  badge,
  markHeight = 19,
  style
}: {
  badge: KosherKey;
  markHeight?: number;
  style?: CSSProperties;
}) {
  const mark = MARKS[badge];

  return (
    <span
      role="img"
      aria-label={mark.alt}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 34,
        padding: '0 14px',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      <img
        src={mark.src}
        alt=""
        aria-hidden="true"
        style={{
          display: 'block',
          flex: 'none',
          height: markHeight,
          width: markHeight * mark.ratio
        }}
      />
      <span
        style={{
          fontFamily: F.text,
          fontWeight: 700,
          fontSize: 'var(--fs-label)',
          letterSpacing: '.08em',
          textTransform: 'uppercase'
        }}
      >
        {mark.label}
      </span>
    </span>
  );
}
