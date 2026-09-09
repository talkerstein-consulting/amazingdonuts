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
 * The standalone pickup page.
 *
 * Nothing in the site links here any more. It was a gate between the homepage
 * and the catalogue — the Pick up lane card went to it, and it asked for a day
 * and a window before handing the visitor on to the shop. That question is now
 * asked at checkout, where there is an order to collect; the band across the
 * top of every shopping page is where a slot gets picked early if anyone wants
 * to.
 *
 * The page itself still builds and still works, because the path has been
 * live and may be bookmarked or printed on something. It is deliberately not
 * reachable from any navigation.
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
