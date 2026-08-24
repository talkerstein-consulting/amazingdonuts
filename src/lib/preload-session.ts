/**
 * Has the full preloader already played in this browsing session?
 *
 * The inked-wordmark roll is a first-impression piece: it is worth ~2.5s the
 * first time you arrive and an obstacle every time after. Session storage is
 * the right scope — it survives navigating to `/donut-lab/` and back (which is
 * a real document load, there being no router), and resets when the tab closes,
 * so a returning visitor tomorrow gets the full opening again.
 */
const KEY = 'ad:preloaded';

export type PreloadVariant = 'first' | 'return';

export function preloadVariant(): PreloadVariant {
  try {
    return sessionStorage.getItem(KEY) ? 'return' : 'first';
  } catch {
    // Private-mode or blocked storage: treat every load as the first.
    return 'first';
  }
}

export function markPreloaded() {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* nothing to do — the animation simply plays again */
  }
}
