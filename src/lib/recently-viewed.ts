/**
 * What this visitor has looked at, most recent first.
 *
 * `localStorage`, for the same reason `amazing-last-product` beside it is:
 * the homepage, the catalogue and the Lab are three separate documents here,
 * so a history kept in React state would reset every time someone crossed
 * between them — which is exactly the journey the row exists to describe.
 *
 * Ids, not products. The catalogue is re-priced from Square on every load and
 * items come and go; storing a snapshot of a product would show yesterday's
 * price under today's name. Ids are resolved against the live list at render,
 * and anything that no longer exists simply drops out of the row.
 */
const KEY = 'amazing-recently-viewed';

/** Kept, not shown. The row displays a handful; the tail is what survives the
 *  current product and the odd delisted item being filtered out of it. */
const LIMIT = 12;

/** Reads the history, tolerating anything that is not the array we wrote. */
export function readRecentlyViewed(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    /* Private mode, or something else wrote to the key. No history, no row. */
    return [];
  }
}

/**
 * Records a view, moving an id already in the list to the front rather than
 * repeating it — the row is "what you looked at", not "what you looked at and
 * how many times".
 */
export function recordProductView(id: string) {
  try {
    const next = [id, ...readRecentlyViewed().filter((item) => item !== id)].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Storage unavailable or full. The row never appears, which is fine — it
       is a convenience, and nothing else depends on it. */
  }
}
