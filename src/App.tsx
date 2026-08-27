import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import './components/brand/brand.css';
import './shop/shop.css';
import { SquircleDefs } from './components/brand';
import { NavThemeProvider } from './lib/nav-theme';
import { ShopProvider, useShop } from './lib/shop';
import Preloader from './preloader/Preloader';
import { markPreloaded, preloadVariant } from './lib/preload-session';
import { initSmoothScroll } from './lib/smooth-scroll';
import ProductPanel from './shop/ProductPanel';
import CartDrawer from './shop/CartDrawer';
import AuthModal from './shop/AuthModal';
import Header from './components/Header';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import Lanes from './components/Lanes';
import Catalog from './components/Catalog';
import Features from './components/Features';
import Social from './components/Social';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';

function Site({ ready, slideIn }: { ready: boolean; slideIn: boolean }) {
  const { product } = useShop();
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(() => {
    const requestSignIn = () => setAuthOpen(true);
    window.addEventListener('amazing:sign-in-requested', requestSignIn);
    return () => window.removeEventListener('amazing:sign-in-requested', requestSignIn);
  }, []);

  return (
    <>
      <div
        className={slideIn ? 'site-slide-in' : undefined}
        style={{ maxWidth: '100%', margin: '0 auto', background: 'var(--cream)', color: 'var(--navy)' }}
      >
        <Header onSignIn={() => setAuthOpen(true)} />
        <Hero ready={ready} />
        <Marquee />
        <Lanes />
        <Catalog />
        <Features />
        <Social />
        <Testimonials />
        <Footer ready={ready} />
      </div>
      {/* The product cabinet slides over the catalogue it came from. */}
      <AnimatePresence>{product && <ProductPanel key={product.id} product={product} />}</AnimatePresence>
      <CartDrawer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

export default function App() {
  // The preloader owns the first moment. The site — and so the header — is
  // already mounted underneath it, because the hand-off measures the real
  // logo's box in order to land on it.
  const [loading, setLoading] = useState(true);

  /* Read once, in the initialiser, and never again: the flag is written on
     mount, so anything reading it later would see 'return' on the very load
     that is still playing the full opening. */
  const [variant] = useState(preloadVariant);
  /* The return variant's navy panel wipes right while the page slides in from
     the left. Both start on `onExit`, one movement; `onDone` then unmounts. */
  const [sliding, setSliding] = useState(false);
  /* Stable identities. The preloader no longer restarts if these change, but a
     frame loop should not be handed a moving target either way. */
  const onExit = useCallback(() => setSliding(true), []);
  const onDone = useCallback(() => setLoading(false), []);
  useEffect(markPreloaded, []);
  useEffect(initSmoothScroll, []);

  return (
    <NavThemeProvider>
      <ShopProvider>
        <SquircleDefs />
        {/* `ready` flips when the preloader has handed the wordmark to the bar. */}
        <Site ready={!loading} slideIn={sliding} />
        {loading && (
          <Preloader variant={variant} onExit={onExit} onDone={onDone} />
        )}
      </ShopProvider>
    </NavThemeProvider>
  );
}
