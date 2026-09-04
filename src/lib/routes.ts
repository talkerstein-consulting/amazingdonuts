/**
 * The site's smaller standalone pages.
 *
 * Grouped in one module rather than getting a file each like `lab-href.ts` and
 * `shop-href.ts`: those two carry logic (the Lab's single constant is pointed
 * at from five places, the catalogue builds filtered query strings), while
 * these are two plain paths that only the footer nav references. A file per
 * constant would be more files than facts.
 *
 * Each is a static HTML entry — see `vite.config.ts`. The site has no router.
 */
export const CONTACT_HREF = '/contact/';
export const CAREERS_HREF = '/careers/';
export const BULK_HREF = '/bulk-orders/';

/**
 * The pickup gate, asked before the catalogue rather than at checkout.
 *
 * Pointed at by the Pick up lane card and by the header's slot chip, which is
 * how a chosen slot is edited — two references, so it is a constant like the
 * others rather than a literal in each.
 */
export const PICKUP_HREF = '/pickup/';

/**
 * The shop, as published on amazingdonuts.com and confirmed against the Google
 * listing. Used by the contact page for the map and the directions link.
 */
export const SHOP_ADDRESS = {
  street: '3499 Bathurst Street',
  city: 'Toronto, ON',
  country: 'Canada',
  phone: '(416) 398-7546',
  phoneHref: 'tel:+14163987546',
  email: 'orders@amazingdonuts.com'
};

/** One place to keep the map's framing, since two links share the query. */
export const MAP_QUERY = encodeURIComponent('Amazing Donuts, 3499 Bathurst St, Toronto, ON');
