import { useCallback, useRef, useState } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, MouseEvent, ReactNode } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { C, F } from './tokens';
import './brand-button.css';

export type BrandButtonVariant = 'primary' | 'outline' | 'signal';

const FILLS: Record<BrandButtonVariant, CSSProperties> = {
  // Dare Devil. One per screen.
  primary: { background: C.orange, color: '#fff' },
  outline: { background: 'transparent', color: C.navy, boxShadow: `inset 0 0 0 2px ${C.navy}` },
  // Signal. Special order only.
  signal:  { background: C.blue, color: '#fff' }
};

/* The five palette colours the burst draws from. */
const SPRINKLE_COLOURS = [C.pink, C.orange, C.blue, C.cream, C.navy];

type Sprinkle = { id: number; style: CSSProperties };

let seq = 0;

/**
 * Builds one burst: 16 sprinkles on a radial, each jittered off its spoke so
 * the ring does not read as a mechanical star.
 */
function makeBurst(): Sprinkle[] {
  return Array.from({ length: 16 }, (_, i) => {
    // Even spokes, ±0.25rad of scatter — enough to break the grid, not enough
    // to leave gaps in the ring.
    const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const travel = 34 + Math.random() * 30;
    return {
      id: seq++,
      style: {
        width: 7 + Math.random() * 5,
        background: SPRINKLE_COLOURS[i % SPRINKLE_COLOURS.length],
        '--dx': `${Math.cos(angle) * travel}px`,
        '--dy': `${Math.sin(angle) * travel}px`,
        '--rot': `${(angle * 180) / Math.PI}deg`,
        '--dur': `${620 + Math.random() * 180}ms`
      } as CSSProperties
    };
  });
}

const REDUCED = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Props = {
  variant?: BrandButtonVariant;
  /** Stretch to the container — how the button sits inside a product card. */
  block?: boolean;
  /** Renders an <a> instead of a <button>, so navigation stays a real link. */
  href?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> &
  Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'> & {
    onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  };

export default function BrandButton({
  variant = 'primary',
  block = false,
  href,
  children,
  style,
  className,
  onClick,
  ...rest
}: Props) {
  const [burst, setBurst] = useState<Sprinkle[]>([]);
  const [popping, setPopping] = useState(false);
  const timers = useRef<number[]>([]);

  const fire = useCallback(
    (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
      onClick?.(e);
      if (REDUCED()) return;

      setBurst(makeBurst());
      setPopping(true);
      // Torn down rather than left in the tree — a card of these would
      // otherwise accumulate a few hundred dead nodes over a session.
      timers.current.push(
        window.setTimeout(() => setPopping(false), 420),
        window.setTimeout(() => setBurst([]), 900)
      );
    },
    [onClick]
  );

  const inner = (
    <>
      {children}

      <span className={`bbtn__knob${popping ? ' bbtn__knob--pop' : ''}`} aria-hidden="true">
        <span className="bbtn__track">
          <span className="bbtn__cell">
            <ChevronRight size={20} strokeWidth={2.5} />
          </span>
          <span className="bbtn__cell">
            <ChevronRight size={20} strokeWidth={2.5} />
          </span>
        </span>
      </span>

      {burst.length > 0 && (
        <span className="bbtn__burst" aria-hidden="true">
          {burst.map((s) => (
            <i key={s.id} className="bbtn__sprinkle" style={s.style} />
          ))}
        </span>
      )}
    </>
  );

  const shared = {
    className: `bbtn brand-press${block ? ' bbtn--block' : ''}${className ? ` ${className}` : ''}`,
    onClick: fire,
    style: { ...FILLS[variant], ...style }
  };

  if (href) {
    const { target, rel } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} target={target} rel={rel} {...shared}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} {...shared}>
      {inner}
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
        fontWeight: 800,
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
