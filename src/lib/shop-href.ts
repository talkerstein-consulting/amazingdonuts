import { CATEGORIES, type Category } from '../data/products';

/** Mirrors the catalogue's donut tiers. */
export type ShopTier = 'classic' | 'special';

/**
 * Where the catalogue lives.
 *
 * `Shop all` used to be a full-screen overlay opened from the bar, so the nav
 * pointed at `#favorites` — the homepage's four-item teaser — and the real
 * catalogue had no URL at all. It is now a third static HTML entry (see
 * `vite.config.ts`), so "Products" is an ordinary link and the catalogue is
 * linkable, back-button-able and indexable.
 *
 * Kept as a constant for the same reason as `LAB_HREF`: more than one
 * component points at it, and a stray literal would drift.
 */
export const SHOP_HREF = '/shop/';

/**
 * A link into the catalogue, optionally landing on one collection.
 *
 * The homepage's lane cards and footer menu name a specific counter — "Shop
 * classics", "Cupcakes" — and used to point at `#favorites`, the four-item
 * teaser, which answered none of them. The catalogue reads these back on load
 * so those links arrive already filtered.
 *
 * Query string rather than a hash: the hash is spoken for by the smooth-scroll
 * anchor handling, and a filtered catalogue is a distinct page worth its own
 * shareable URL.
 */
export function shopHref(opts: { category?: Category; tier?: ShopTier; q?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.category) params.set('c', opts.category);
  if (opts.tier) params.set('t', opts.tier);
  if (opts.q) params.set('q', opts.q);
  const q = params.toString();
  return q ? `${SHOP_HREF}?${q}` : SHOP_HREF;
}

/** What the catalogue should open showing, read back off the URL. */
export function readShopParams(
  search = typeof window === 'undefined' ? '' : window.location.search
): { category: Category | null; tier: ShopTier | null; query: string } {
  const params = new URLSearchParams(search);
  const c = params.get('c');
  const t = params.get('t');
  return {
    /* Validated against the real list — a junk `?c=` must fall back to
       everything rather than filtering the grid down to nothing. */
    category: CATEGORIES.includes(c as Category) ? (c as Category) : null,
    tier: t === 'classic' || t === 'special' ? t : null,
    /* Trimmed and length-capped: it goes straight into a visible heading, and
       the URL is user-editable. */
    query: (params.get('q') ?? '').trim().slice(0, 80)
  };
}
