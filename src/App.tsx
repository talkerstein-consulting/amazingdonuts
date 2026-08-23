import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import './components/brand/brand.css';
import './shop/shop.css';
import { SquircleDefs } from './components/brand';
import { NavThemeProvider } from './lib/nav-theme';
import { DonutLabProvider, useDonutLab } from './lib/donut-lab';
import { ShopProvider, useShop } from './lib/shop';
import DonutLab from './donut-lab/DonutLab';
import Preloader from './preloader/Preloader';
import ShopAll from './shop/ShopAll';
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

function Site({ ready }: { ready: boolean }) {
  const { isOpen: labOpen, close: closeLab } = useDonutLab();
  const { shopOpen, product } = useShop();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <div style={{ maxWidth: '100%', margin: '0 auto', background: 'var(--cream)', color: 'var(--navy)' }}>
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
      {shopOpen && <ShopAll />}
      {/* The product cabinet slides over the catalogue it came from. */}
      <AnimatePresence>{product && <ProductPanel key={product.id} product={product} />}</AnimatePresence>
      <CartDrawer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {labOpen && <DonutLab onClose={closeLab} />}
    </>
  );
}

export default function App() {
  // The preloader owns the first moment. The site — and so the header — is
  // already mounted underneath it, because the hand-off measures the real
  // logo's box in order to land on it.
  const [loading, setLoading] = useState(true);

  return (
    <NavThemeProvider>
      <ShopProvider>
        <DonutLabProvider>
          <SquircleDefs />
          {/* `ready` flips when the preloader has handed the wordmark to the bar. */}
          <Site ready={!loading} />
          {loading && <Preloader onDone={() => setLoading(false)} />}
        </DonutLabProvider>
      </ShopProvider>
    </NavThemeProvider>
  );
}
