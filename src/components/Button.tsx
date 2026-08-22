import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useState } from 'react';

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  /** Kept an <a> so the href stays a real, shareable link even when handled here. */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function Button({ href, children, className, style, hoverStyle, onClick }: Props) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '18px 34px',
        borderRadius: 99,
        fontFamily: 'var(--font-cta)',
        fontWeight: 700,
        fontSize: 'var(--type-cta)',
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        transition: 'transform .18s ease, filter .18s ease, background .18s ease, color .18s ease',
        ...style,
        ...(hovered ? hoverStyle : null)
      }}
    >
      {children}
    </a>
  );
}
