import { Fragment } from 'react';
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
  /** Diet and certification marks carry no container at all — icon and label
      only, separated by dots when they sit in a row. Merchandising keeps the
      solid fills, which is what the distinction is for. */
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
              /* No ring and no ground. Six ringed pills in a row read as six
                 buttons, and none of them is pressable — they are a list of
                 facts about the donut. Stripped to icon and label they read as
                 one, and `BadgeRow` sets the dots between them. The horizontal
                 padding goes with the ring: with nothing drawn around the
                 label, padding is just a wider gap. */
              background: 'transparent',
              color: C.navy,
              paddingLeft: 0,
              paddingRight: 0
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

/** The separator between two container-less badges. Never between a badge and
    a filled merchandising pill — the pill draws its own edge, so a dot beside
    it is a second divider for the same seam. */
export function BadgeDot({ style }: { style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        opacity: 0.45,
        fontFamily: F.display,
        fontWeight: 700,
        lineHeight: 1,
        ...style
      }}
    >
      &middot;
    </span>
  );
}

/** Convenience wrapper for the wrapping badge rows used on cards and specimens.

    Dots go between adjacent container-less badges only, which is why this walks
    the list rather than using a CSS `:not(:last-child)::after` rule: whether a
    seam gets a dot depends on BOTH badges either side of it. */
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
  const bare = (key: BadgeKey) => forceOutline || Boolean(BADGES[key].outline);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap }}>
      {badges.map((b, i) => (
        <Fragment key={b}>
          {i > 0 && bare(b) && bare(badges[i - 1]) && <BadgeDot />}
          <Badge badge={b} forceOutline={forceOutline} compact={compact} />
        </Fragment>
      ))}
    </div>
  );
}
