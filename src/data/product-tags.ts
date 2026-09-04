/**
 * Which products carry a merchandising tag, and which tag.
 *
 * Kept beside the catalogue rather than inside it: `products.ts` is generated
 * from the scraped `catalog.csv` and gets regenerated, so a hand-picked
 * editorial field added there would be lost on the next scrape. This file is
 * hand-maintained by definition.
 *
 * Two tags only. "Best seller" is a claim about sales and belongs to the short
 * list the bakery actually leads with; "Popular" is the softer one for things
 * that move well without topping the list. A third tier would make every tag
 * mean less, and a tag on everything is a tag on nothing — most of the 60-odd
 * items here deliberately carry none.
 */
import type { BadgeKey } from '../components/brand';

/** The four the bakery leads with. Also what the header's drawer promotes. */
export const BEST_SELLERS = [
  'zap-donut-pink-blue-white-sprinkles',
  'boston-creme-donut-custard',
  'chocolate-glazed-donut',
  'challah-six-braid-friday-only'
] as const;

const POPULAR = [
  'rainbow-donut-sprinkles',
  'hava-nagilla-donut-blue-white-sprinkles',
  'twelve-custom-printed-donuts',
  'donut-cake-14-inch',
  'jelly-filled-donut',
  'blueberry-muffin',
  'vanilla-cupcake',
  'chocolate-chip-jumbo-cookie'
] as const;

/* Both tags resolve to keys in the brand badge set, so a tag is rendered by
   the same `Badge` component as every certification pill and cannot drift into
   a second visual language. */
export const PRODUCT_TAGS: Record<string, BadgeKey> = {
  ...Object.fromEntries(BEST_SELLERS.map((id) => [id, 'seller' as BadgeKey])),
  ...Object.fromEntries(POPULAR.map((id) => [id, 'popular' as BadgeKey]))
};

export const tagFor = (id: string): BadgeKey | undefined => PRODUCT_TAGS[id];
