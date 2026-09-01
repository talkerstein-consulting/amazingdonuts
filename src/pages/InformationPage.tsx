import { useEffect, useState } from 'react';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import { SquircleDefs } from '../components/brand';
import { NavThemeProvider } from '../lib/nav-theme';
import { ShopProvider } from '../lib/shop';
import { initSmoothScroll } from '../lib/smooth-scroll';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthModal from '../shop/AuthModal';
import CartDrawer from '../shop/CartDrawer';

type Page = { eyebrow: string; title: string; intro: string; sections: { title: string; body: string }[] };

const PAGES: Record<string, Page> = {
  '/allergy-free/': {
    eyebrow: 'Menu & certification',
    title: 'Allergies & Kashruth',
    intro: 'Review allergen guidance and kosher certification together before placing an order.',
    sections: [
      { title: 'Available options', body: 'Selected products are marked nut free, dairy free or sesame free in the shop. Use those product badges as your starting point.' },
      { title: 'Shared kitchen', body: 'Our products are prepared in a working bakery that handles common allergens. Please email orders@amazingdonuts.com before ordering if cross-contact is a concern.' },
      { title: 'COR 483', body: 'Our certification is displayed throughout the site and on the bakery information provided with your order.' },
      { title: 'Pareve & Yoshon', body: 'Pareve and yoshon information is shown with the relevant products. Email orders@amazingdonuts.com if you need confirmation for a specific order.' }
    ]
  },
  '/privacy-policy/': {
    eyebrow: 'Your information',
    title: 'Privacy policy',
    intro: 'We collect only the information needed to run the website, fulfil orders and support customer accounts.',
    sections: [
      { title: 'Information we use', body: 'Account, contact, order and payment-related information is used to provide the services you request, communicate about orders and maintain your account.' },
      { title: 'Payments and security', body: 'Card details are handled by Square and are not stored directly on this website. We may retain order and account records when required for operations, security or legal obligations.' },
      { title: 'Questions', body: 'Contact orders@amazingdonuts.com with privacy questions or requests concerning your personal information.' }
    ]
  },
  '/shipping-returns/': {
    eyebrow: 'Order information',
    title: 'Shipping & returns',
    intro: 'Fresh food has a short journey and a firm schedule. Review the details before checkout.',
    sections: [
      { title: 'Pickup and delivery', body: 'Available dates, pickup windows, delivery fees and minimums are confirmed during checkout before payment.' },
      { title: 'Food returns', body: 'Food items are final sale. If something is wrong with an order, contact the bakery promptly so the team can review it with you.' },
      { title: 'Custom and scheduled orders', body: 'Lead times vary for printed, custom and bulk orders. The date accepted by the bakery is the date that governs the order.' }
    ]
  }
};

export default function InformationPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const page = PAGES[window.location.pathname] || PAGES['/shipping-returns/'];
  useEffect(initSmoothScroll, []);

  return <NavThemeProvider><ShopProvider><SquircleDefs />
    <div style={{ background: 'var(--cream)', color: 'var(--navy)' }}>
      <Header onSignIn={() => setAuthOpen(true)} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(32px,6vw,80px) clamp(18px,4vw,40px)' }}>
        <p style={{ margin: '0 0 12px', fontFamily: 'var(--font-label)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--pink-strong)' }}>{page.eyebrow}</p>
        <h1 style={{ margin: 0, fontSize: 'var(--type-section)', lineHeight: .92 }}>{page.title}</h1>
        <p style={{ margin: '20px 0 clamp(32px,5vw,56px)', maxWidth: '58ch', fontSize: 'var(--type-body)', lineHeight: 1.5, color: 'rgba(14,62,105,.72)' }}>{page.intro}</p>
        <div style={{ display: 'grid', gap: 1, background: 'rgba(14,62,105,.14)', border: '1px solid rgba(14,62,105,.14)' }}>
          {page.sections.map(section => <section key={section.title} style={{ padding: 'clamp(22px,3vw,34px)', background: 'var(--cream)' }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(24px,3vw,34px)' }}>{section.title}</h2>
            <p style={{ margin: '10px 0 0', maxWidth: '68ch', fontSize: 'var(--type-body)', lineHeight: 1.55, color: 'rgba(14,62,105,.75)' }}>{section.body}</p>
          </section>)}
        </div>
      </main>
      <Footer ready />
    </div>
    <CartDrawer /><AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
  </ShopProvider></NavThemeProvider>;
}
