import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Everything that changes what the grid holds, in one pinned control.
 *
 * It replaces a toolbar and two chip rows: a scrolling row of category pills, a
 * sort dropdown beside it, and a second row of tier pills that appeared only
 * while Donuts was up. Three separate controls for one question — "show me
 * these, in this order" — and all three scrolled away with the page, so past
 * the first screen of a sixty-item grid the only way to change the filter was
 * to scroll back to the top and find it again.
 *
 * The cart was the only thing on this page that stayed reachable. The filter is
 * the other half of shopping a catalogue this long, so it is pinned the same
 * way, and it opens the same kind of drawer the cart does — from the right, the
 * edge its own button sits against, so the panel arrives from where it was
 * pressed. The cart uses that edge too; the two are never open at once.
 *
 * The drawer itself is identical at every width — the old row had a phone
 * treatment (horizontal scroll) that behaved differently from its desktop one
 * and had to be kept in sync. Only the button moves: bottom right on a phone,
 * under the thumb; top right on a desktop, where the pointer already is and
 * where a floating pill over the bottom of a long grid reads as a cookie
 * banner. Both corners are ones nothing else claims.
 *
 * The desktop corner is not a fixed offset from the navbar: the
 * pickup/delivery band sticks directly under the bar when a choice has been
 * made, and a pin measured from the bar alone landed on top of it. ShopAll
 * measures where the furniture actually ends and passes it in.
 */
export type SortOption<T extends string> = { id: T; label: string; icon: LucideIcon };

/** One choice in a group: what it says, and how many products it would leave. */
export type FilterOption<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * One row of the drawer.
 *
 * Radio semantics, not a button: each group is a single choice out of a set,
 * and `aria-checked` is what says which. The tick is the only state marker —
 * there is no fill and no ring, because six filled rows in a column read as six
 * separate controls rather than one list with one answer in it.
 */
function Row({
  label,
  Icon,
  count,
  checked,
  onSelect
}: {
  label: string;
  Icon?: LucideIcon;
  count?: number;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`filter-row${checked ? ' is-on' : ''}`}
    >
      {Icon && <Icon size={17} strokeWidth={2.25} aria-hidden="true" className="filter-row__icon" />}
      <span className="filter-row__label">{label}</span>
      {count !== undefined && <span className="filter-row__count">{count}</span>}
      {/* Always in the layout, only painted when chosen: a tick that appears
          and disappears shifts every label in the column by its own width. */}
      <Check
        size={17}
        strokeWidth={3}
        aria-hidden="true"
        className="filter-row__tick"
        style={{ opacity: checked ? 1 : 0 }}
      />
    </button>
  );
}

function Group<T extends string>({
  title,
  options,
  value,
  onChange
}: {
  title: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <section className="filter-group" role="radiogroup" aria-label={title}>
      <h3 className="filter-group__title">{title}</h3>
      {options.map((option) => (
        <Row
          key={option.id}
          label={option.label}
          Icon={option.icon}
          count={option.count}
          checked={value === option.id}
          onSelect={() => onChange(option.id)}
        />
      ))}
    </section>
  );
}

/**
 * The pinned button. Sits opposite the cart's side of the screen and carries
 * the number of filters currently narrowing the grid — sort is not counted,
 * because there is no such thing as an unsorted grid and a permanent "1" on the
 * badge would say nothing.
 */
export function FilterButton({
  active,
  shown,
  top,
  onClick
}: {
  active: number;
  shown: boolean;
  /** Bottom edge of the page furniture, measured in ShopAll. */
  top: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      /* Inert as well as invisible while it is away, or it takes taps through
         the banner and a keyboard visitor tabs onto a button they cannot see. */
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      className={`filter-pin${shown ? ' is-shown' : ''}`}
      aria-label="Filter and sort"
      /* A custom property rather than `top` directly: the phone treatment
         anchors this to the bottom of the viewport, and an inline `top` would
         beat the media query that does it. Only the desktop rule reads it. */
      style={{ ['--pin-top' as string]: `${top + 18}px` }}
    >
      <SlidersHorizontal size={18} strokeWidth={2.5} aria-hidden="true" />
      <span className="filter-pin__label">Filter</span>
      {active > 0 && <span className="filter-pin__badge">{active}</span>}
    </button>
  );
}

export default function FilterDrawer<
  S extends string,
  C extends string,
  T extends string,
  F extends string
>({
  open,
  onClose,
  sorts,
  sort,
  onSort,
  categories,
  category,
  onCategory,
  tiers,
  tier,
  onTier,
  flavours,
  flavour,
  onFlavour,
  showing,
  onClear,
  canClear
}: {
  open: boolean;
  onClose: () => void;
  sorts: SortOption<S>[];
  sort: S;
  onSort: (next: S) => void;
  categories: FilterOption<C>[];
  category: C;
  onCategory: (next: C) => void;
  tiers: FilterOption<T>[];
  tier: T;
  onTier: (next: T) => void;
  flavours: FilterOption<F>[];
  flavour: F;
  onFlavour: (next: F) => void;
  showing: number;
  onClear: () => void;
  canClear: boolean;
}) {
  const panel = useRef<HTMLElement | null>(null);

  /* Escape closes it, and opening moves focus inside — without that, a keyboard
     visitor opens a drawer and their focus is still on the button behind it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="filter-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panel}
            tabIndex={-1}
            className="filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Filter and sort"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.38, ease: EASE }}
          >
            <header className="filter-drawer__bar">
              <span className="filter-drawer__title">Filter &amp; sort</span>
              <button
                type="button"
                onClick={onClose}
                className="icon-btn"
                aria-label="Close filters"
                style={{ color: 'var(--cream)' }}
              >
                <X size={24} />
              </button>
            </header>

            <div className="filter-drawer__body">
              {/* Categories first. It is the group that decides what the grid is
                  a list OF; sort only decides the order of whatever that turns
                  out to be, so it reads as the second question even when it is
                  the one changed more often. */}
              <Group title="Categories" options={categories} value={category} onChange={onCategory} />
              <Group title="Sort by" options={sorts} value={sort} onChange={onSort} />
              {/* Flavour above Kind, and directly under Categories, because it
                  is the second thing anyone knows about what they came for —
                  "a chocolate something" is a far commoner shape of intent than
                  "something in the cheaper half". Kind is the tiebreak once the
                  other two have done the narrowing, so it reads last. */}
              <Group title="Flavour" options={flavours} value={flavour} onChange={onFlavour} />
              {/* Classic and Special were a row of their own that only existed
                  while Donuts was picked. In here they are a filter like any
                  other and apply across every category — the split is a price
                  line, and every category has one. */}
              <Group title="Kind" options={tiers} value={tier} onChange={onTier} />
            </div>

            <footer className="filter-drawer__foot">
              <button
                type="button"
                onClick={onClear}
                className="filter-clear"
                disabled={!canClear}
              >
                Clear
              </button>
              <button type="button" onClick={onClose} className="filter-apply">
                Show {showing} {showing === 1 ? 'item' : 'items'}
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
