/**
 * Where the logo goes.
 *
 * There is no router — the Lab is a second static HTML entry — so "home" has
 * to be a real URL, not a hash. `#top` only worked while the homepage was the
 * only page: on `/donut-lab/` it left you exactly where you were.
 */
import { smoothScrollTo } from './smooth-scroll';

export const HOME_HREF = '/';

/** True when the document currently being viewed *is* the homepage. */
export function isHomePage() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/index\.html$/, '');
  return path === '/' || path === '';
}

/**
 * Click handler for a logo pointing at `HOME_HREF`. On the homepage a full
 * navigation would reload the document — and so replay the preloader — for
 * what the user means as "take me back to the top", so scroll instead. The
 * href stays a real link, which keeps middle-click and open-in-new-tab honest.
 */
export function onHomeClick(e: React.MouseEvent<HTMLAnchorElement>) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  if (!isHomePage()) return;
  e.preventDefault();
  smoothScrollTo(0);
}
