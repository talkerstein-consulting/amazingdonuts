import { useEffect, useState } from 'react';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import { SquircleDefs } from '../components/brand';
import { NavThemeProvider } from '../lib/nav-theme';
import { ShopProvider } from '../lib/shop';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthModal from '../shop/AuthModal';
import CartDrawer from '../shop/CartDrawer';
import StableBuilder from '../donut-lab-stable/StableBuilder';
import { initSmoothScroll } from '../lib/smooth-scroll';

/**
 * The Donut Lab as a page of its own.
 *
 * The builder was designed to own a whole viewport and never scroll: its five
 * bands are sized so the stage — the only flexible one — absorbs whatever
 * height is left. Wrapping it in the site chrome would break that, so the
 * builder gets `100dvh` minus the header instead of the full viewport, and
 * keeps the guarantee. The footer then sits below the fold, which is the one
 * concession: you scroll to reach it, and the builder scrolls away as you do.
 *
 * The bar's height comes from `--nav-h` in index.css, which Header.tsx also
 * reads — if that were duplicated here instead, a drift would show up as
 * either a scrollbar on the builder band or a strip of cream under the CTA.
 */
export default function DonutLabPage() {
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(initSmoothScroll, []);

  return (
    <NavThemeProvider>
      <ShopProvider>
        <SquircleDefs />
        <div style={{ background: 'var(--cream)', color: 'var(--navy)' }}>
          <Header onSignIn={() => setAuthOpen(true)} />

          <main
            style={{
              // dvh, not vh: on mobile the collapsing URL bar would otherwise
              // hide the CTA at the bottom of the sheet.
              height: 'calc(100dvh - var(--nav-h))',
              minHeight: 520,
              overflow: 'hidden'
            }}
          >
            <StableBuilder />
          </main>

          {/* `ready` is the preloader hand-off flag on the homepage. There is
              no preloader here, so the footer starts in its settled state. */}
          <Footer ready />
        </div>

        <CartDrawer />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </ShopProvider>
    </NavThemeProvider>
  );
}
