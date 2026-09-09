import { CATEGORIES, type Category, type Product } from '../data/products';
import { tagFor } from '../data/product-tags';

/**
 * Searching the catalogue, in one place.
 *
 * There were two implementations: the header's dropdown filtered
 * `SHOP_PRODUCTS` on a raw substring, and the catalogue filtered the LIVE
 * product list word by word. So the suggestions under the field and the
 * results you landed on were answering slightly different questions — a query
 * could be offered a product it would then not match, and the suggestions
 * showed items the live catalogue had dropped.
 *
 * One matcher now, used by the header, the results page and the catalogue's
 * own `?q=` filter.
 */

/** Where a search lands. */
export const SEARCH_HREF = '/search/';

/** A link to the results for a query. */
export function searchHref(q: string) {
  const query = q.trim();
  return query ? `${SEARCH_HREF}?q=${encodeURIComponent(query)}` : SEARCH_HREF;
}

/**
 * The query off the URL, trimmed and length-capped — it goes straight into a
 * visible heading and the URL is user-editable.
 */
export function readSearchQuery(search = typeof window === 'undefined' ? '' : window.location.search) {
  return (new URLSearchParams(search).get('q') ?? '').trim().slice(0, 80);
}

/**
 * Every whitespace-separated word has to appear in the name or the category,
 * case-insensitively: "blue sprinkle" finds the blue sprinkle donut, and
 * "bread" finds the Breads counter's items even though nothing is literally
 * called bread.
 *
 * Deliberately not fuzzy. A bakery catalogue is sixty items with plain names;
 * edit-distance matching on a list this size mostly produces confident wrong
 * answers, and the empty state offers the bestsellers rather than a guess.
 */
export function matchesQuery(product: Product, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${product.name} ${product.category}`.toLowerCase();
  return words.every((word) => hay.includes(word));
}

/** The matching products, in catalogue order. */
export function searchProducts(products: Product[], query: string) {
  if (!query) return products;
  return products.filter((product) => matchesQuery(product, query));
}

/** Counters whose name matches, offered alongside the products. */
export function matchingCategories(query: string): Category[] {
  if (!query) return [];
  const term = query.toLowerCase();
  return CATEGORIES.filter((category) => category.toLowerCase().includes(term));
}

/**
 * What to offer when a search finds nothing.
 *
 * The bakery's own ranking rather than a guess: `tagFor` is the same editorial
 * list that puts "Best seller" and "Popular" badges on the tiles, so the
 * consolation row agrees with the rest of the site about what is worth buying.
 */
export function fallbackProducts(products: Product[], limit = 4) {
  const rank = (p: Product) => {
    const tag = tagFor(p.id);
    return tag === 'seller' ? 0 : tag === 'popular' ? 1 : 2;
  };
  return products
    .filter((p) => rank(p) < 2)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, limit);
}
