/**
 * The Google review aggregate.
 *
 * Lifted out of `Testimonials.tsx` because it is now claimed in two places —
 * the trust band under the hero and the full reviews section far below it — and
 * a rating that disagrees with itself down the page is worse than no rating.
 *
 * 4.3 out of 5 across 81 Google reviews of Amazing Donuts, 3499 Bathurst St,
 * Toronto, read on 24 August 2026 off aggregators that mirror Google
 * (wanderlog.com and restaurantguru.com) rather than off Google itself.
 *
 * Reviews move, so this is a snapshot: it needs a re-check at launch and
 * periodically after, or it becomes a stale claim. Both figures being here
 * means that re-check is one edit rather than a hunt.
 */
export const RATING = { score: '4.3', of: '5', count: 81 };

/** Where the full quotes live, for the condensed band to point at. */
export const REVIEWS_ANCHOR = '#regulars';
