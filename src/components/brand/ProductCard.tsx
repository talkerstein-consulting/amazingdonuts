import type { CSSProperties } from 'react';
import { C, F, SQUIRCLE } from './tokens';
import { BadgeRow } from './Badge';
import BrandButton from './BrandButton';
import type { Donut } from './donuts';

type Props = {
  donut: Donut;
  /** Label on the primary action. */
  cta?: string;
  onAdd?: (donut: Donut) => void;
  /** The specimen pins this to 390px; leave unset to fill the grid cell. */
  width?: number | string;
  style?: CSSProperties;
};

/** L · Detail — the large product card. */
export default function ProductCard({
  donut,
  cta = 'Add to box',
  onAdd,
  width,
  style
}: Props) {
  return (
    <div
      style={{
        width,
        background: C.cream,
        borderRadius: 32,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        ...style
      }}
    >
      <div
        style={{
          aspectRatio: '1',
          background: C.canvas,
          clipPath: SQUIRCLE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <img
          alt={donut.name}
          src={donut.img}
          style={{ width: '98%', height: '98%', objectFit: 'contain' }}
        />
      </div>

      <BadgeRow badges={donut.badges} gap={8} />

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 31, lineHeight: 1.15 }}>
          {donut.name}
        </span>
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 25, lineHeight: 1.2, color: C.price }}>
          {donut.price}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: F.text,
          fontSize: 16,
          lineHeight: 1.6,
          color: C.body,
          // Holds the card height steady as blurbs of different lengths swap in.
          minHeight: '3.2em'
        }}
      >
        {donut.blurb}
      </p>

      <BrandButton block onClick={() => onAdd?.(donut)}>
        {cta}
      </BrandButton>
    </div>
  );
}

