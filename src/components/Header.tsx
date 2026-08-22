import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { Menu, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useNavTheme } from '../lib/nav-theme';
import { useShop } from '../lib/shop';
import { PRODUCTS } from '../data/products';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const NAV_LINKS = [
  { href: '#favorites', label: 'Donuts' },
  { href: '#donut-lab', label: 'Custom' },
  { href: '#favorites', label: 'Cupcakes' },
  { href: '#bulk', label: 'Bulk orders' },
  { href: '#wild', label: 'Our story' }
];

/** The four cheapest-to-reach crowd pleasers, pulled from the live catalogue. */
const BESTSELLERS = [
  'zap-donut-pink-blue-white-sprinkles',
  'boston-creme-donut-custard',
  'chocolate-glazed-donut',
  'challah-six-braid-friday-only'
]
  .map((id) => PRODUCTS.find((p) => p.id === id))
  .filter((p): p is (typeof PRODUCTS)[number] => Boolean(p));

export default function Header() {
  const isDesktop = useIsDesktop();
  const { theme } = useNavTheme();
  const { openCart, count } = useShop();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

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
          height: 'clamp(60px,6.5vw,78px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20
        }}
      >
        <a href="#top" aria-label="Amazing Donuts" style={{ display: 'flex', alignItems: 'center' }}>
          {/* masked, not <img>, so the wordmark takes the bar's current colour */}
          <span role="img" aria-label="Amazing Donuts" className="nav-logo" style={{ height: 'clamp(20px,1.9vw,27px)', background: theme.fg }} />
        </a>

        {isDesktop && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 'clamp(18px,2.2vw,34px)' }} onMouseLeave={() => setHovered(null)}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onMouseEnter={() => setHovered(link.label)}
                style={{
                  position: 'relative',
                  fontFamily: 'var(--font-cta)',
                  fontWeight: 700,
                  fontSize: 'var(--type-label)',
                  letterSpacing: '.09em',
                  textTransform: 'uppercase',
                  color: hovered === link.label ? 'var(--pink)' : theme.fg,
                  paddingBottom: 4,
                  transition: 'color .2s ease'
                }}
              >
                {link.label}
                {hovered === link.label && (
                  <motion.span
                    layoutId="nav-underline"
                    style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: theme.fg }}
                    transition={{ duration: 0.25, ease: EASE }}
                  />
                )}
              </a>
            ))}
          </nav>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                <img src="/img/logo-amazing-donuts.svg" alt="Amazing Donuts" style={{ height: 22, width: 'auto' }} />
                <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="icon-btn" style={{ color: 'var(--cream)' }}>
                  <X size={24} />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  document.getElementById('favorites')?.scrollIntoView({ behavior: 'smooth' });
                }}
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
                  </motion.a>
                ))}
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
                      href="#favorites"
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
