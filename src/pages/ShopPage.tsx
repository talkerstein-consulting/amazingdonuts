import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import { SquircleDefs } from '../components/brand';
import { NavThemeProvider } from '../lib/nav-theme';
import { ShopProvider, useShop } from '../lib/shop';
import { initSmoothScroll } from '../lib/smooth-scroll';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthModal from '../shop/AuthModal';
import CartDrawer from '../shop/CartDrawer';
import ProductPanel from '../shop/ProductPanel';
import ShopAll from '../shop/ShopAll';

/**
 * The catalogue as a page of its own: global navbar, banner, the card that
 * straddles the banner's bottom edge, the category chips, the grid, footer.
 *
 * It was a full-screen overlay with a bar of its own. The design asks for the
 * banner to sit *below the global navbar*, and an overlay cannot do that — it
 * covers the navbar by definition. So this is a third static HTML entry
 * alongside the homepage and the Lab, and the shared Header comes along for
 * free, with its own active state marking Products.
 *
 * The product drawer stays hash-routed (`#product/<id>`) so a product is still
 * a deep link, and closing it returns here rather than to the homepage.
 */
function ShopBody() {
  const { product } = useShop();

  return (
    <>
      <ShopAll />
      {/* The drawer slides over the grid it came from. */}
      <AnimatePresence>{product && <ProductPanel key={product.id} product={product} />}</AnimatePresence>
    </>
  );
}

export default function ShopPage() {
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
          <main>
            <ShopBody />
          </main>
          {/* `ready` is the homepage's preloader hand-off flag. There is no
              preloader here, so the footer starts settled. */}
          <Footer ready />
        </div>

        <CartDrawer />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </ShopProvider>
    </NavThemeProvider>
  );
}
