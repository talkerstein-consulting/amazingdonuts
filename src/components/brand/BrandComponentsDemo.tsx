import { useState } from 'react';
import './brand.css';
import { C, F } from './tokens';
import SquircleDefs from './SquircleDefs';
import Badge, { BADGE_KEYS } from './Badge';
import BrandButton, { BrandTextLink } from './BrandButton';
import ProductCard from './ProductCard';
import { ProductChipList } from './ProductChip';
import { DONUTS } from './donuts';

const Label = ({ children }: { children: string }) => (
  <span
    style={{
      fontFamily: F.display,
      fontSize: 12,
      fontWeight: 900,
      lineHeight: 1.2,
      letterSpacing: '.16em',
      textTransform: 'uppercase',
      color: C.mute
    }}
  >
    {children}
  </span>
);

/**
 * The Components section of the Palette 03 specimen, rebuilt from the exported
 * pieces. Doubles as the visual check that they still match the design.
 */
export default function BrandComponentsDemo() {
  const [activeId, setActiveId] = useState('star');
  const hero = DONUTS.find((d) => d.id === activeId) ?? DONUTS[0];

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '64px 48px 128px',
        background: C.canvas,
        color: C.navy,
        fontFamily: F.text,
        display: 'flex',
        flexDirection: 'column',
        gap: 32
      }}
    >
      <SquircleDefs />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h2 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 49, lineHeight: 1.1, margin: 0, textTransform: 'none' }}>
          Components
        </h2>
        <Label>04</Label>
      </div>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, maxWidth: '64ch', color: C.body }}>
        Badges, buttons, and the product card recoloured. Tap a chip — the hero follows.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Label>Badges — merchandising solid, diet outlined</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {BADGE_KEYS.map((k) => (
            <Badge key={k} badge={k} />
          ))}
        </div>

        <Label>Buttons</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <BrandButton>Add to box</BrandButton>
          <BrandButton variant="outline">Customise</BrandButton>
          <BrandButton variant="signal">Special order</BrandButton>
          <BrandTextLink>See the box</BrandTextLink>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '390px 1fr', gap: 48, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Label>L · Detail</Label>
          <ProductCard donut={hero} width={390} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Label>M · Chips</Label>
          <ProductChipList
            donuts={DONUTS}
            selectedId={activeId}
            onSelect={(d) => setActiveId(d.id)}
          />
        </div>
      </div>
    </div>
  );
}
