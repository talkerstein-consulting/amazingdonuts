import type { CSSProperties } from 'react';
import { Flame, PartyPopper, Award, CalendarCheck, NutOff, MilkOff, WheatOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { C, F } from './tokens';

export type BadgeKey = 'seller' | 'party' | 'classic' | 'special' | 'nut' | 'dairy' | 'sesame';

type Spec = {
  label: string;
  Icon: LucideIcon;
  bg?: string;
  fg?: string;
  /** Diet badges read as outlines so merchandising keeps the solid fills. */
  outline?: boolean;
  /** Fills in the 3:1–4:1 band need the large-text threshold. */
  large?: boolean;
};

export const BADGES: Record<BadgeKey, Spec> = {
  seller:  { label: 'Best Seller',   Icon: Flame,         bg: C.navy, fg: C.canvas },
  party:   { label: 'Party Pack',    Icon: PartyPopper,   bg: C.pink, fg: C.navy },
  classic: { label: 'Classic',       Icon: Award,         bg: C.navy, fg: C.canvas },
  special: { label: 'Special Order', Icon: CalendarCheck, bg: C.blue, fg: '#fff', large: true },
  nut:     { label: 'Nut Free',      Icon: NutOff,        outline: true },
  dairy:   { label: 'Dairy Free',    Icon: MilkOff,       outline: true },
  sesame:  { label: 'Sesame Free',   Icon: WheatOff,      outline: true }
};

export const BADGE_KEYS = Object.keys(BADGES) as BadgeKey[];

type Props = {
  badge: BadgeKey;
  /** Force every badge to the outline treatment, ignoring its merchandising fill. */
  forceOutline?: boolean;
  style?: CSSProperties;
};

export default function Badge({ badge, forceOutline = false, style }: Props) {
  const spec = BADGES[badge];
  const outline = forceOutline || spec.outline;
  const { Icon } = spec;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 34,
        padding: '0 14px',
        borderRadius: 999,
        fontFamily: F.display,
        fontWeight: 800,
        fontSize: spec.large ? 14 : 12,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        ...(outline
          ? { background: 'transparent', color: C.navy, boxShadow: `inset 0 0 0 2px ${C.navy}` }
          : { background: spec.bg, color: spec.fg }),
        ...style
      }}
    >
      <Icon size={16} strokeWidth={2.25} />
      {spec.label}
    </span>
  );
}

/** Convenience wrapper for the wrapping badge rows used on cards and specimens. */
export function BadgeRow({
  badges,
  forceOutline = false,
  gap = 12
}: {
  badges: BadgeKey[];
  forceOutline?: boolean;
  gap?: number;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap }}>
      {badges.map((b) => (
        <Badge key={b} badge={b} forceOutline={forceOutline} />
      ))}
    </div>
  );
}
