import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { Menu, Plus, Search, ShoppingBag, User, X } from 'lucide-react';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useNavTheme } from '../lib/nav-theme';
import { useShop } from '../lib/shop';
import { CATEGORIES, PRODUCTS } from '../data/products';
import { LAB_HREF } from '../lib/lab-href';
import { HOME_HREF, onHomeClick } from '../lib/home-href';
import { SHOP_HREF, shopHref } from '../lib/shop-href';
import { BULK_HREF, CONTACT_HREF } from '../lib/routes';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* 'Donuts' and 'Cupcakes' both pointed at #favorites - two labels, one
   destination, which is a menu that lies about how many places it can take
   you. They are one 'Products' entry now. */
const NAV_LINKS = [
  { href: SHOP_HREF, label: 'Products' },
  { href: LAB_HREF, label: 'Donut lab' },
  /* Was '#bulk', the homepage's teaser band. Bulk orders is a real page with
     the intake form on it, so the nav points at the thing rather than at an
     advert for the thing. */
  { href: BULK_HREF, label: 'Bulk orders' },
  { href: CONTACT_HREF, label: 'Contact' }
];

/**
 * Every nav entry is now a page of its own, so the active state is a lookup on
 * the pathname. It used to be a chain of ternaries that grew by one branch per
 * page, plus a section-spy for the entries that were still homepage anchors.
 * Nothing the nav points at lives on the homepage any more.
 */
const PATH_LABEL: Record<string, string> = Object.fromEntries(
  NAV_LINKS.map((l) => [l.href, l.label])
);

/** The four cheapest-to-reach crowd pleasers, pulled from the live catalogue. */
const BESTSELLERS = [
  'zap-donut-pink-blue-white-sprinkles',
  'boston-creme-donut-custard',
  'chocolate-glazed-donut',
  'challah-six-braid-friday-only'
]
  .map((id) => PRODUCTS.find((p) => p.id === id))
  .filter((p): p is (typeof PRODUCTS)[number] => Boolean(p));

export default function Header({ onSignIn }: { onSignIn: () => void }) {
  const isDesktop = useIsDesktop();
  const { theme } = useNavTheme();
  const { openCart, count } = useShop();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  /* Controlled, because the whole point is to carry the text somewhere. It was
     uncontrolled, and the submit handler had nothing to read. */
  const [query, setQuery] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  /* The active state, straight off the pathname. */
  const activeLabel = PATH_LABEL[window.location.pathname] ?? null;
  /* Hover wins while the pointer is down the bar, and the marker falls back to
     the active section the moment it leaves. One shared `layoutId` means it
     slides between the two rather than blinking out and in. */
  const marked = hovered ?? activeLabel;
  const searchTerm = query.trim().toLowerCase();
  const productSuggestions = searchTerm ? PRODUCTS.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(searchTerm)).slice(0, 4) : [];
  const categorySuggestions = searchTerm ? CATEGORIES.filter((category) => category.toLowerCase().includes(searchTerm)).slice(0, 2) : [];

  const closeSearch = () => setSearchOpen(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();

    /* An empty submit used to navigate to a bare `/shop/`, which threw the
       typed text away and — on the catalogue itself, where the URL was already
       `/shop/` — was indistinguishable from a page refresh. That is the "it
       just refreshes" bug: it never searched anything, because nothing ever
       read the field.
       Empty now means stay put and keep the cursor where it is. */
    if (!q) {
      searchRef.current?.focus();
      return;
    }

    setSearchOpen(false);
    setOpen(false);
    // `?q=` is read back by the catalogue, so the results are a shareable URL.
    window.location.href = shopHref({ q });
  };

  // Focus follows the expansion, or the field is open and nobody can type in it.
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSearchOpen(false);
    /* Closing on the field's own blur was the glitch. Blur fires before click,
       so pressing the icon to submit — or the X to dismiss — collapsed the
       container out from under the pointer and the click landed on nothing, or
       worse, on the collapsed button, which reopened it. An outside pointerdown
       is the same intent without the race. */
    const onDown = (e: PointerEvent) => {
      if (!searchFormRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (isDesktop) setOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    fetch('/api/house/storefront/session').then(r => r.json()).then(body => setSignedIn(Boolean(body.user))).catch(() => {});
    const changed = () => setSignedIn(true);
    window.addEventListener('amazing:auth-changed', changed);
    return () => window.removeEventListener('amazing:auth-changed', changed);
  }, []);

  const drawerStagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: shouldReduceMotion ? 0 : 0.15 } }
  };
  const drawerItem: Variants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: theme.bg,
        color: theme.fg,
        transition: 'background .45s ease, color .45s ease'
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 clamp(18px,4vw,40px)',
          height: 'var(--nav-h)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20
        }}
      >
        <a href={HOME_HREF} onClick={onHomeClick} aria-label="Amazing Donuts, home" style={{ display: 'flex', alignItems: 'center' }}>
          {/* masked, not <img>, so the wordmark takes the bar's current colour */}
          <span role="img" aria-label="Amazing Donuts" className="nav-logo" style={{ height: 'clamp(20px,1.9vw,27px)', background: theme.fg }} />
        </a>

        {isDesktop && (
          <motion.nav
            /* The field needs the room, and squeezing the links to find it
               would reflow the whole bar mid-animation. They step aside. */
            animate={{ opacity: searchOpen ? 0 : 1 }}
            transition={{ duration: 0.18, ease: EASE }}
            aria-hidden={searchOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              /* Tighter than before: each label now carries 14px of its own
                 padding for the chip to fill. */
              gap: 'clamp(2px,0.6vw,10px)',
              pointerEvents: searchOpen ? 'none' : 'auto'
            }}
            onMouseLeave={() => setHovered(null)}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onMouseEnter={() => setHovered(link.label)}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  /* The chip needs a box to fill, so the label carries its own
                     padding rather than sitting on a baseline. */
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--font-cta)',
                  fontWeight: 700,
                  fontSize: 'var(--type-label)',
                  letterSpacing: '.09em',
                  textTransform: 'uppercase',
                  /* Bubblegum is light, so type on the chip goes navy. Off the
                     chip it stays whatever the bar is currently wearing. */
                  color: marked === link.label ? 'var(--navy)' : theme.fg,
                  transition: 'color .2s ease'
                }}
              >
                {marked === link.label && (
                  <motion.span
                    layoutId="nav-marker"
                    aria-hidden="true"
                    /* One element with one layoutId, so moving between links is
                       the chip sliding across the bar rather than one fading
                       out and another in. */
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--pink)'
                    }}
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                )}
                {/* Above the chip, or the fill would cover the word. */}
                <span style={{ position: 'relative', zIndex: 1 }}>{link.label}</span>
              </a>
            ))}

          </motion.nav>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
          {/* Search and Log in are desktop-only up here. On a phone the bar
              has room for the logo, the box and the menu button, and that is
              all - both of these live in the drawer instead.

              Three states, and the browser owns the movement between them.
              This was a `motion.form` animating `width`, which meant a style
              write per frame from the main thread - the jank. `width` cannot go
              on the compositor whoever drives it, but a CSS transition is at
              least the browser's own timeline rather than a rAF loop competing
              with everything else on the page. Hover is a `:hover` rule for the
              same reason: no state, no re-render, nothing to get out of sync. */}
          {isDesktop && (
          <form
            ref={searchFormRef}
            onSubmit={submitSearch}
            className={`nav-search${searchOpen ? ' is-open' : ''}`}
            style={{
              width: searchOpen ? 300 : 44,
              boxShadow: searchOpen ? `inset 0 0 0 1px ${theme.fg}` : 'none'
            }}
          >
            <button
              type={searchOpen ? 'submit' : 'button'}
              onClick={() => {
                if (!searchOpen) setSearchOpen(true);
              }}
              aria-label={searchOpen ? 'Search' : 'Open search'}
              aria-expanded={searchOpen}
              className="icon-btn nav-search__icon"
              style={{ flex: 'none', width: 44, height: 44, color: theme.fg }}
            >
              <Search size={21} strokeWidth={2.3} />
            </button>
            <input
              ref={searchRef}
              type="search"
              placeholder="What are you craving?"
              aria-label="Search the menu"
              aria-hidden={!searchOpen}
              tabIndex={searchOpen ? 0 : -1}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: theme.fg,
                opacity: searchOpen ? 1 : 0,
                transition: 'opacity .2s ease'
              }}
            />
            {searchOpen && searchTerm && (productSuggestions.length > 0 || categorySuggestions.length > 0) && (
              <div className="nav-search__suggestions" role="listbox" aria-label="Search suggestions">
                {categorySuggestions.map((category) => (
                  <a key={category} href={shopHref({ category })}>
                    <Search size={16} /> <span>Shop all <strong>{category}</strong></span>
                  </a>
                ))}
                {productSuggestions.map((product) => (
                  <a key={product.id} href={`/shop/#product/${product.id}`}>
                    <img src={product.img} alt="" /> <span><strong>{product.name}</strong><small>{product.category}</small></span>
                  </a>
                ))}
                <button type="submit"><Search size={16} /> See all results for “{query.trim()}”</button>
              </div>
            )}
            {searchOpen && (
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="icon-btn"
                style={{ flex: 'none', width: 38, height: 38, color: theme.fg }}
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            )}
          </form>
          )}

          {/* Log in, as an icon rather than the labelled button it used to be. */}
          {isDesktop && (
            <button
              type="button"
              onClick={() => signedIn ? window.location.assign('/account/') : onSignIn()}
              aria-label={signedIn ? 'My account' : 'Log in'}
              title={signedIn ? 'My account' : 'Log in'}
              className="icon-btn"
              style={{ color: theme.fg }}
            >
              <User size={22} strokeWidth={2.2} />
            </button>
          )}

          <button
            type="button"
            onClick={openCart}
            aria-label={`Box, ${count} ${count === 1 ? 'item' : 'items'}`}
            className="icon-btn"
            style={{ color: theme.fg, position: 'relative' }}
          >
            <ShoppingBag size={24} strokeWidth={2} />
            {count > 0 && <span className="shop-badge">{count}</span>}
          </button>
          {!isDesktop && (
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="icon-btn"
              style={{ color: theme.fg }}
            >
              <Menu size={26} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 65, background: 'rgba(14,62,105,.5)' }}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              data-lenis-prevent
              initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
              animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.45, ease: EASE }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 70,
                background: 'var(--navy)',
                padding: '20px clamp(18px,4vw,40px) 28px',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(251,247,239,.18)', paddingBottom: 18 }}>
                <a
                  href={HOME_HREF}
                  onClick={(e) => {
                    setOpen(false);
                    onHomeClick(e);
                  }}
                  aria-label="Amazing Donuts, home"
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <img src="/img/logo-amazing-donuts.svg" alt="Amazing Donuts" style={{ height: 22, width: 'auto' }} />
                </a>
                <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="icon-btn" style={{ color: 'var(--cream)' }}>
                  <X size={24} />
                </button>
              </div>
              {/* A phone searches from here, so the field is open on arrival
                  rather than hiding behind a press - there is nothing to save
                  room for in a full-height sheet. */}
              <form
                onSubmit={submitSearch}
                style={{
                  marginTop: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 52,
                  padding: '0 16px',
                  borderRadius: 99,
                  background: 'rgba(251,247,239,.08)',
                  border: '1px solid rgba(251,247,239,.22)'
                }}
              >
                <Search size={18} strokeWidth={2.25} style={{ flex: 'none', color: 'rgba(251,247,239,.7)' }} />
                <input
                  type="search"
                  placeholder="What are you craving?"
                  aria-label="Search the menu"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontFamily: 'var(--font-body)',
                    fontSize: 16,
                    color: 'var(--cream)'
                  }}
                />
              </form>

              <motion.nav initial="hidden" animate="visible" variants={drawerStagger} style={{ marginTop: 24, display: 'flex', flexDirection: 'column' }}>
                {NAV_LINKS.map((link) => (
                  <motion.a
                    key={link.label}
                    variants={drawerItem}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    style={{
                      minHeight: 56,
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: '1px solid rgba(251,247,239,.12)',
                      fontFamily: 'var(--font-cta)',
                      fontWeight: 700,
                      fontSize: 22,
                      letterSpacing: '.04em',
                      textTransform: 'uppercase',
                      color: 'var(--cream)'
                    }}
                  >
                    {link.label}
                    {/* Same active state as the bar, since the drawer is the
                        bar on a phone. A dot, not an underline: these rows are
                        already separated by rules. */}
                    {marked === link.label && (
                      <span
                        aria-hidden="true"
                        style={{
                          marginLeft: 10,
                          width: 7,
                          height: 7,
                          borderRadius: 99,
                          background: 'var(--pink)'
                        }}
                      />
                    )}
                  </motion.a>
                ))}

                <motion.button
                  variants={drawerItem}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSignIn();
                  }}
                  style={{
                    minHeight: 56,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(251,247,239,.12)',
                    fontFamily: 'var(--font-cta)',
                    fontWeight: 700,
                    fontSize: 22,
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                    color: 'var(--cream)'
                  }}
                >
                  <User size={20} strokeWidth={2.4} />
                  Log in
                </motion.button>
              </motion.nav>

              <div style={{ marginTop: 28 }}>
                <span
                  style={{
                    display: 'block',
                    marginBottom: 14,
                    fontFamily: 'var(--font-label)',
                    fontSize: 13,
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: 'rgba(251,247,239,.55)'
                  }}
                >
                  Bestsellers
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                  {BESTSELLERS.map((product) => (
                    <a
                      key={product.id}
                      href={SHOP_HREF}
                      onClick={() => setOpen(false)}
                      style={{ display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--cream)' }}
                    >
                      <span
                        style={{
                          aspectRatio: '1',
                          background: 'rgba(251,247,239,.08)',
                          clipPath: 'url(#squircle-clip)',
                          display: 'grid',
                          placeItems: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        <img
                          src={product.img}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.16)' }}
                        />
                      </span>
                      <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontFamily: 'var(--font-cta)',
                              fontWeight: 700,
                              fontSize: 13,
                              lineHeight: 1.2,
                              color: 'var(--cream)'
                            }}
                          >
                            {product.name}
                          </span>
                          <span style={{ display: 'block', fontFamily: 'var(--font-cta)', fontWeight: 700, fontSize: 12, color: 'var(--pink)' }}>
                            {product.price}
                          </span>
                        </span>
                        <span
                          style={{
                            flex: 'none',
                            width: 28,
                            height: 28,
                            borderRadius: 99,
                            border: '2px solid rgba(251,247,239,.6)',
                            display: 'grid',
                            placeItems: 'center'
                          }}
                        >
                          <Plus size={14} strokeWidth={2.6} />
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
