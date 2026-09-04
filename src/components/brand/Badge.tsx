import type { CSSProperties } from 'react';
import {
  Flame,
  Heart,
  PartyPopper,
  Award,
  CalendarCheck,
  NutOff,
  MilkOff,
  WheatOff,
  BadgeCheck,
  Leaf,
  Wheat
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { C, F } from './tokens';

export type BadgeKey =
  | 'seller'
  | 'popular'
  | 'party'
  | 'classic'
  | 'special'
  | 'nut'
  | 'dairy'
  | 'sesame'
  | 'cor'
  | 'pareve'
  | 'yoshon';

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
  /* The softer sibling of Best Seller, and deliberately a different fill
     rather than a different word on the same pill: the two appear in the same
     grid, and two navy pills would need reading to be told apart. Bubblegum is
     light, so the label goes navy — same pairing Party Pack uses. */
  popular: { label: 'Popular',       Icon: Heart,         bg: C.pink, fg: C.navy },
  party:   { label: 'Party Pack',    Icon: PartyPopper,   bg: C.pink, fg: C.navy },
  classic: { label: 'Classic',       Icon: Award,         bg: C.navy, fg: C.canvas },
  special: { label: 'Special Order', Icon: CalendarCheck, bg: C.blue, fg: '#fff', large: true },
  nut:     { label: 'Nut Free',      Icon: NutOff,        outline: true },
  dairy:   { label: 'Dairy Free',    Icon: MilkOff,       outline: true },
  sesame:  { label: 'Sesame Free',   Icon: WheatOff,      outline: true },
  /* Certification, as icon-and-label pills.
     These are NOT the supplied COR/פרווה/ישן artwork — that artwork is
     white-only and may never be recoloured, so it cannot appear on a light
     surface or as an outline. `KosherBadge` still renders the real marks
     wherever there is a solid Harbour ground to put them on. Yoshon takes the
     wheat glyph because yoshon is a claim about the grain harvest. */
  cor:     { label: 'COR 483',       Icon: BadgeCheck,    outline: true },
  pareve:  { label: 'Pareve',        Icon: Leaf,          outline: true },
  yoshon:  { label: 'Yoshon',        Icon: Wheat,         outline: true }
};

export const BADGE_KEYS = Object.keys(BADGES) as BadgeKey[];

type Props = {
  badge: BadgeKey;
  /** Force every badge to the outline treatment, ignoring its merchandising fill. */
  forceOutline?: boolean;
  /** Half-height pill for places where the badges are supporting detail rather
      than the point of the block — the catalogue's banner card, say. */
  compact?: boolean;
  style?: CSSProperties;
};

export default function Badge({ badge, forceOutline = false, compact = false, style }: Props) {
  const spec = BADGES[badge];
  const outline = forceOutline || spec.outline;
  const { Icon } = spec;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 5 : 8,
        height: compact ? 25 : 34,
        padding: compact ? '0 9px' : '0 14px',
        borderRadius: 'var(--radius-pill)',
        // v5 badge type: Karla 700 at 13px. Special Order steps up to 14px —
        // its Signal fill sits in the 3:1–4:1 band, which needs the
        // large-text contrast threshold to pass.
        fontFamily: F.display,
        fontWeight: 700,
        fontSize: compact ? 10 : spec.large ? 14 : 'var(--fs-label)',
        letterSpacing: compact ? '.06em' : '.08em',
        textTransform: 'uppercase',
        ...(outline
          ? {
              background: 'transparent',
              color: C.navy,
              /* A 2px ring around a 25px pill reads as a blob; the compact
                 outline thins to match its smaller type. */
              boxShadow: `inset 0 0 0 ${compact ? 1.5 : 2}px ${C.navy}`
            }
          : { background: spec.bg, color: spec.fg }),
        ...style
      }}
    >
      <Icon size={compact ? 12 : 16} strokeWidth={2.25} />
      {spec.label}
    </span>
  );
}

/** Convenience wrapper for the wrapping badge rows used on cards and specimens. */
export function BadgeRow({
  badges,
  forceOutline = false,
  compact = false,
  gap = 12
}: {
  badges: BadgeKey[];
  forceOutline?: boolean;
  compact?: boolean;
  gap?: number;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap }}>
      {badges.map((b) => (
        <Badge key={b} badge={b} forceOutline={forceOutline} compact={compact} />
      ))}
    </div>
  );
}
