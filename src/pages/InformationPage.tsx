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

type Page = { eyebrow: string; title: string; intro: string; sourceHref?: string; sections: { title: string; body: string }[] };

const PAGES: Record<string, Page> = {
  '/allergy-free/': {
    eyebrow: 'Bakery information',
    title: 'Allergy free',
    intro: 'Amazing Donuts has been a peanut-free, tree-nut-free and sesame-free bakery since 1997.',
    sections: [
      { title: 'Ingredients and handling', body: 'We pay close attention to ingredient sourcing and bakery handling. Product badges identify additional qualities such as dairy free where applicable.' },
      { title: 'Before you order', body: 'For a specific allergy or an ingredient question, contact orders@amazingdonuts.com before placing your order. Our team can confirm the current product details.' }
    ]
  },
  '/kashruth/': {
    eyebrow: 'Bakery information',
    title: 'Kashruth',
    intro: 'Amazing Donuts is certified kosher by the COR Kashrus Council of Canada.',
    sections: [
      { title: 'Made on site', body: 'Our baked goods are prepared in our Toronto bakery under COR supervision.' },
      { title: 'Pareve, Pas Yisroel and Kemach Yoshon', body: 'These are the bakery-wide standards stated by Amazing Donuts. Contact orders@amazingdonuts.com for confirmation about a specific product or order.' }
    ]
  },
  '/privacy-policy/': {
    eyebrow: 'Your information',
    title: 'Privacy policy',
    intro: 'We collect only the information needed to run the website, fulfil orders and support customer accounts.',
    sections: [
      { title: 'Information we use', body: 'Account, contact, order and payment-related information is used to provide the services you request, communicate about orders and maintain your account.' },
      { title: 'Bag reminders for returning customers', body: 'If you purchased from us within the past two years, we may save your email address and bag items to send one reminder after at least 24 hours of inactivity. We do not send it if you complete the order or unsubscribe. Bag item details are cleared after a reminder, completed order, unsubscribe or 30 days. Each reminder includes an unsubscribe link. We do not email first-time abandoned carts.' },
      { title: 'Payments and security', body: 'Card details are handled by Square and are not stored directly on this website. We may retain order and account records when required for operations, security or legal obligations.' },
      { title: 'Questions', body: 'Contact orders@amazingdonuts.com with privacy questions or requests concerning your personal information.' }
    ]
  },
  '/privacy-policy-terms/': {
    eyebrow: 'Your information',
    title: 'Privacy policy & terms',
    intro: 'How we use your information and the terms that apply when ordering online.',
    sourceHref: 'https://amazingdonuts.com/privacy-policy-terms/',
    sections: [
      { title: 'Information and payments', body: 'We use the contact, account and order details you provide to process purchases and support your account. Square handles card payments; this website does not store card numbers.' },
      { title: 'Cookies and usage data', body: 'The full policy describes the website data and cookie categories used to operate, measure and improve the service, including essential and analytics technologies.' },
      { title: 'Your information', body: 'The full policy explains data retention, sharing with service providers, security, deletion requests and how to contact the bakery about your privacy rights.' },
      { title: 'Ordering', body: 'Prices, discounts, taxes, delivery availability and the final total are confirmed at checkout. Food purchases are final sale. If there is a problem with an order, please contact the bakery promptly.' },
      { title: 'Email and contact', body: 'Order messages and eligible bag reminders may be sent to your email address. Reminder emails include an unsubscribe link. For privacy or order questions, contact orders@amazingdonuts.com.' }
    ]
  },
  '/shipping-returns/': {
    eyebrow: 'Order information',
    title: 'Shipping & returns',
    intro: 'Fresh food has a short journey and a firm schedule. Review the details before checkout.',
    sections: [
      { title: 'Pickup and delivery', body: 'Local pickup and delivery are available for eligible orders. Delivery is free on orders over $200. Available dates, windows, fees and minimums are confirmed during checkout before payment.' },
      { title: 'Food returns', body: 'Food items are final sale. If something is wrong with an order, contact the bakery promptly so the team can review it with you.' },
      { title: 'Custom and scheduled orders', body: 'Lead times vary for printed, custom and bulk orders. The date accepted by the bakery is the date that governs the order. We do not offer international shipping through this checkout.' }
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
        {page.sourceHref && <p style={{ margin: '24px 0 0' }}><a href={page.sourceHref} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--navy)', fontWeight: 700, textDecoration: 'underline' }}>Read the full privacy policy and terms</a></p>}
      </main>
      <Footer ready />
    </div>
    <CartDrawer /><AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
  </ShopProvider></NavThemeProvider>;
}
