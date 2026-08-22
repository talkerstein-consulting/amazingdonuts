import type { CSSProperties } from 'react';
import { C, F, SQUIRCLE } from './tokens';
import type { Donut } from './donuts';

type Props = {
  donut: Donut;
  selected?: boolean;
  onSelect?: (donut: Donut) => void;
  style?: CSSProperties;
};

/** M · Chip — the compact selectable row. Selection reads as a navy inset ring. */
export default function ProductChip({ donut, selected = false, onSelect, style }: Props) {
  return (
    <button
      type="button"
      className="brand-press brand-lift"
      aria-pressed={selected}
      onClick={() => onSelect?.(donut)}
      style={{
        cursor: 'pointer',
        textAlign: 'left',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 12,
        borderRadius: 24,
        background: C.cream,
        boxShadow: selected ? `inset 0 0 0 2px ${C.navy}` : 'none',
        ...style
      }}
    >
      <span
        style={{
          flex: 'none',
          width: 72,
          height: 72,
          background: C.canvas,
          clipPath: SQUIRCLE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <img alt="" src={donut.img} style={{ width: '96%', height: '96%', objectFit: 'contain' }} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 25, lineHeight: 1.1, color: C.navy }}>
          {donut.name}
        </span>
        <span style={{ fontFamily: F.text, fontSize: 14, fontWeight: 700, letterSpacing: '.04em', color: C.price }}>
          {donut.price}
        </span>
      </span>
    </button>
  );
}

/** The chip column, with selection managed by the caller. */
export function ProductChipList({
  donuts,
  selectedId,
  onSelect,
  gap = 12
}: {
  donuts: Donut[];
  selectedId?: string;
  onSelect?: (donut: Donut) => void;
  gap?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {donuts.map((d) => (
        <ProductChip key={d.id} donut={d} selected={d.id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}
