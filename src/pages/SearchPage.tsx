import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import { SquircleDefs } from '../components/brand';
import { NavThemeProvider } from '../lib/nav-theme';
import { ShopProvider, useShop, useBoxQty } from '../lib/shop';
import { initSmoothScroll } from '../lib/smooth-scroll';
import Header from '../components/Header';
import PickupBanner from '../components/PickupBanner';
import Footer from '../components/Footer';
import AuthModal from '../shop/AuthModal';
import CartDrawer from '../shop/CartDrawer';
import ProductPanel from '../shop/ProductPanel';
import ProductTile from '../components/ProductTile';
import { INTERNAL_PRODUCT_IDS, type Product } from '../data/products';
import { shopHref } from '../lib/shop-href';
import {
  fallbackProducts,
  matchingCategories,
  readSearchQuery,
  searchHref,
  searchProducts
} from '../lib/search';

/**
 * Results, as a page of their own.
 *
 * Searching used to land on `/shop/?q=`: the whole catalogue page — banner,
 * category rail, filter drawer, counter dividers — with the grid quietly
 * filtered down and one line of text saying why. That is a filtered catalogue,
 * not a set of results. The apparatus of browsing sixty products sat above an
 * answer to a question, the pinned rail offered counters that were no longer
 * reachable from anything on screen, and the words the visitor actually typed
 * were the smallest text on the page.
 *
 * This page has one job. The query is the heading, the count is under it, and
 * the results are the only grid on it.
 *
 * `?q=` on the catalogue still works — an old link, or someone editing the URL
 * — and both read the same matcher, so the two can never disagree about what a
 * word means. See `lib/search`.
 */
function SearchBody({ onQueryChange }: { onQueryChange: (q: string) => void }) {
  const { openProduct, products: catalogProducts } = useShop();
  const boxQty = useBoxQty();
  const open = (product: Product) => openProduct(product.id);

  /* Read in the lazy initialiser rather than an effect, so the results are the
     first paint instead of a flash of something else being filtered. */
  const [query, setQuery] = useState(() => readSearchQuery());
  /* What the field holds, which is not the same thing. Typing should not re-run
     the search on every keystroke and rewrite the heading under the cursor;
     submitting is what turns a draft into a query. */
  const [draft, setDraft] = useState(query);
  const fieldRef = useRef<HTMLInputElement | null>(null);

  const products = useMemo(
    () => catalogProducts.filter((product) => !INTERNAL_PRODUCT_IDS.has(product.id)),
    [catalogProducts]
  );

  const results = useMemo(() => (query ? searchProducts(products, query) : []), [products, query]);
  const categories = useMemo(() => matchingCategories(query), [query]);
  const fallback = useMemo(() => fallbackProducts(products), [products]);

  useEffect(() => {
    onQueryChange(query);
  }, [query, onQueryChange]);

  /* The Back button has to work. Each search is a real history entry — most of
     the point of results having a URL — so a pop puts the page back to whatever
     the URL now says. */
  useEffect(() => {
    const sync = () => {
      const next = readSearchQuery();
      setQuery(next);
      setDraft(next);
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next) {
      fieldRef.current?.focus();
      return;
    }
    setQuery(next);
    /* `pushState`, not a navigation: this is already the right document, and
       reloading it to change one word would throw away the bag drawer, the
       session and the scroll position. */
    window.history.pushState(null, '', searchHref(next));
  };

  return (
    <div className="shop-page search-page">
      <section className="search-head">
        <form className="search-field" onSubmit={submit} role="search">
          <Search size={20} strokeWidth={2.4} aria-hidden="true" className="search-field__icon" />
          <input
            ref={fieldRef}
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What are you craving?"
            aria-label="Search the menu"
            enterKeyHint="search"
            autoComplete="off"
          />
          {/* Explicit, because the clear affordance a `search` input gets for
              free is Chrome-only and disappears the moment the field is not
              focused. */}
          {draft && (
            <button
              type="button"
              className="search-field__clear"
              aria-label="Clear the search"
              onClick={() => {
                setDraft('');
                fieldRef.current?.focus();
              }}
            >
              <X size={17} strokeWidth={2.6} />
            </button>
          )}
          <button type="submit" className="search-field__go">
            Search
          </button>
        </form>

        {query ? (
          <>
            <h1 className="search-title">
              Results for <span>&ldquo;{query}&rdquo;</span>
            </h1>
            <p className="search-count">
              {results.length === 0
                ? 'No products match'
                : `${results.length} ${results.length === 1 ? 'product' : 'products'}`}
            </p>
          </>
        ) : (
          /* `/search/` with no query is a real state — a bookmark, or the field
             submitted empty — and it should ask the question rather than report
             zero results for a search nobody made. */
          <>
            <h1 className="search-title">Search the menu</h1>
            <p className="search-count">
              Donuts, muffins, cupcakes, cookies and challah — by name or by flavour.
            </p>
          </>
        )}

        {/* A counter whose NAME matches is an answer the product grid cannot
            give: someone searching "cookies" wants the counter, not the handful
            of products with the word in them. Above the results rather than
            mixed into them, because it is a different kind of thing to press. */}
        {categories.length > 0 && (
          <div className="search-counters">
            {categories.map((category) => (
              <a key={category} href={shopHref({ category })} className="search-counter">
                Shop all <strong>{category}</strong>
              </a>
            ))}
          </div>
        )}
      </section>

      {query && results.length > 0 && (
        <div className="shop-grid search-grid">
          {results.map((product) => (
            <article key={product.id} className="search-tile">
              <ProductTile product={product} onOpen={open} inBox={Boolean(boxQty[product.id])} />
            </article>
          ))}
        </div>
      )}

      {/* Nothing matched, or nothing was asked. Either way the page owes the
          visitor something to buy rather than an empty screen — the same
          bestseller row the catalogue falls back to, from the same list. */}
      {(!query || results.length === 0) && fallback.length > 0 && (
        <section className="search-empty">
          <h2 className="search-empty__title">
            {query ? 'Most people order these' : 'Or start with a bestseller'}
          </h2>
          <div className="shop-grid search-grid">
            {fallback.map((product) => (
              <article key={product.id} className="search-tile">
                <ProductTile product={product} onOpen={open} inBox={Boolean(boxQty[product.id])} />
              </article>
            ))}
          </div>
          <a href={shopHref()} className="search-empty__all">
            Browse the whole menu
          </a>
        </section>
      )}
    </div>
  );
}

function SearchShell() {
  const { product } = useShop();
  /* The title follows the query, so a tab among many says which search it is
     and the history entry reads as something rather than as "Search". */
  const setTitle = useCallback((q: string) => {
    document.title = q ? `${q} · Search · Amazing Donuts` : 'Search · Amazing Donuts';
  }, []);

  return (
    <>
      <SearchBody onQueryChange={setTitle} />
      {/* A result opens its product over the results, exactly as a tile does on
          the catalogue — so closing it returns you to your search rather than
          to the top of the shop. */}
      <AnimatePresence>{product && <ProductPanel key={product.id} product={product} />}</AnimatePresence>
    </>
  );
}

export default function SearchPage() {
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(initSmoothScroll, []);
  useEffect(() => {
    const requestSignIn = () => setAuthOpen(true);
    window.addEventListener('amazing:sign-in-requested', requestSignIn);
    return () => window.removeEventListener('amazing:sign-in-requested', requestSignIn);
  }, []);

  return (
    <NavThemeProvider>
      <ShopProvider>
        <SquircleDefs />
        <div style={{ background: 'var(--cream)', color: 'var(--navy)' }}>
          <Header onSignIn={() => setAuthOpen(true)} />
          <PickupBanner />
          <main>
            <SearchShell />
          </main>
          <Footer ready />
        </div>

        <CartDrawer />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </ShopProvider>
    </NavThemeProvider>
  );
}
