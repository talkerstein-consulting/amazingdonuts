import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { C, F } from './tokens';

export type BrandButtonVariant = 'primary' | 'outline' | 'signal';

const FILLS: Record<BrandButtonVariant, CSSProperties> = {
  // Dare Devil. One per screen.
  primary: { background: C.orange, color: '#fff', border: 'none' },
  outline: { background: 'transparent', color: C.navy, border: `2px solid ${C.navy}` },
  // Signal. Special order only.
  signal:  { background: C.blue, color: '#fff', border: 'none' }
};

type Props = {
  variant?: BrandButtonVariant;
  /** Stretch to the container — how the button sits inside a product card. */
  block?: boolean;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function BrandButton({
  variant = 'primary',
  block = false,
  children,
  style,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className="brand-press"
      {...rest}
      style={{
        cursor: 'pointer',
        height: 56,
        padding: block ? 0 : '0 32px',
        width: block ? '100%' : undefined,
        borderRadius: 999,
        fontFamily: F.display,
        // 18px, not 16 — the orange and blue fills only clear AA as large text.
        fontSize: 18,
        lineHeight: 1,
        fontWeight: 900,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        ...FILLS[variant],
        ...style
      }}
    >
      {children}
    </button>
  );
}

/** The quiet tertiary action — underlined in Signal, arrow on the end. */
export function BrandTextLink({
  children,
  href = '#',
  style
}: {
  children: ReactNode;
  href?: string;
  style?: CSSProperties;
}) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: C.navy,
        fontFamily: F.display,
        fontSize: 16,
        fontWeight: 900,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        borderBottom: `2px solid ${C.blue}`,
        ...style
      }}
    >
      {children}
      <ArrowRight size={18} strokeWidth={2.25} />
    </a>
  );
}
