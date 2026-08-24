import { useEffect, useState } from 'react';
import { Clock3, MapPin } from 'lucide-react';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import { SquircleDefs, BrandButton, C, F } from '../components/brand';
import { NavThemeProvider } from '../lib/nav-theme';
import { ShopProvider } from '../lib/shop';
import { initSmoothScroll } from '../lib/smooth-scroll';
import { CONTACT_HREF, SHOP_ADDRESS } from '../lib/routes';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthModal from '../shop/AuthModal';
import CartDrawer from '../shop/CartDrawer';

/**
 * Careers.
 *
 * ⚠ PLACEHOLDER CONTENT ⚠
 *
 * Every role below is invented. The brief was to build the page with dummy
 * copy, and none of this came from the bakery: not the titles, not the shifts,
 * not the responsibilities. Nothing here is a real vacancy.
 *
 * Before this page is linked publicly, either replace ROLES with the actual
 * openings or delete the listings and leave the speculative-application note —
 * a real business page advertising invented jobs will attract real applicants
 * for jobs that do not exist. That is why there is no salary on any card and no
 * closing date: made-up pay and deadlines are the details that would do the
 * most damage if they shipped.
 *
 * The apply button is a mailto rather than an ATS integration, matching the
 * contact page — the site is static and has no backend to receive a CV.
 */
type Role = {
  id: string;
  title: string;
  type: string;
  shift: string;
  blurb: string;
  doing: string[];
};

/** PLACEHOLDER — see the note above. Not real vacancies. */
const ROLES: Role[] = [
  {
    id: 'baker',
    title: 'Overnight Baker',
    type: 'Full time',
    shift: 'Sun – Thu, 11pm – 7am',
    blurb:
      'The first shift of the day, and the reason the cases are full at opening. You mix, proof, fry and glaze.',
    doing: [
      'Run the fryer and the proofer through the overnight production list',
      'Mix doughs and batters to the shop recipes',
      'Hand the morning over to the decorating team, stocked and on time'
    ]
  },
  {
    id: 'decorator',
    title: 'Decorator',
    type: 'Full time',
    shift: 'Mon – Fri, 6am – 2pm',
    blurb:
      'Icing, sprinkles, printed toppers and the custom orders. Steady hands and an eye for a straight line.',
    doing: [
      'Ice and finish the daily run across donuts, cupcakes and cookies',
      'Build custom and printed orders against the order sheet',
      'Keep the cases looking like the photographs'
    ]
  },
  {
    id: 'counter',
    title: 'Counter & Orders',
    type: 'Part time',
    shift: 'Flexible, weekday mornings',
    blurb:
      'The person customers actually meet. Serving, boxing, taking phone orders and knowing what is left.',
    doing: [
      'Serve walk-ins and box orders for pickup',
      'Take phone and email orders onto the day sheet',
      'Keep the counter and the cases tidy through the rush'
    ]
  },
  {
    id: 'driver',
    title: 'Delivery Driver',
    type: 'Part time',
    shift: 'Early mornings, own vehicle',
    blurb: 'Bulk and corporate orders across the city, arriving intact and when they were promised.',
    doing: [
      'Run the morning delivery list across Toronto',
      'Check each order against its sheet before it leaves',
      'Be the face of the bakery at the door'
    ]
  }
];

function RoleCard({ role }: { role: Role }) {
  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 'clamp(20px,2.2vw,30px)',
        borderRadius: 28,
        background: 'var(--sand)'
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 28,
            padding: '0 11px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--pink)',
            color: C.navy,
            fontFamily: 'var(--font-cta)',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '.1em',
            textTransform: 'uppercase'
          }}
        >
          {role.type}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: F.text,
            fontSize: 13.5,
            color: 'rgba(14,62,105,.68)'
          }}
        >
          <Clock3 size={14} strokeWidth={2.2} aria-hidden="true" />
          {role.shift}
        </span>
      </div>

      <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 30, lineHeight: 1 }}>
        {role.title}
      </h3>

      <p style={{ margin: 0, fontFamily: F.text, fontSize: 15.5, lineHeight: 1.5, color: 'rgba(14,62,105,.78)' }}>
        {role.blurb}
      </p>

      <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 7 }}>
        {role.doing.map((line) => (
          <li key={line} style={{ fontFamily: F.text, fontSize: 15, lineHeight: 1.45, color: C.navy }}>
            {line}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 4 }}>
        <BrandButton
          href={
            'mailto:' +
            SHOP_ADDRESS.email +
            '?subject=' +
            encodeURIComponent('Application: ' + role.title)
          }
          variant="outline"
        >
          Apply for this
        </BrandButton>
      </div>
    </article>
  );
}

export default function CareersPage() {
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(initSmoothScroll, []);

  return (
    <NavThemeProvider>
      <ShopProvider>
        <SquircleDefs />
        <div style={{ background: 'var(--cream)', color: 'var(--navy)' }}>
          <Header onSignIn={() => setAuthOpen(true)} />

          <main style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(24px,4vw,56px) clamp(18px,4vw,40px)' }}>
            <h1 style={{ margin: 0, fontSize: 'var(--type-section)', lineHeight: 0.92, maxWidth: '18ch' }}>
              Work where the donuts are.
            </h1>
            <p
              style={{
                margin: '18px 0 0',
                maxWidth: '56ch',
                fontSize: 'var(--type-body)',
                lineHeight: 1.45,
                color: 'rgba(14,62,105,.72)'
              }}
            >
              Small team, early mornings, and a kitchen that has been running on Bathurst since 1997. No experience
              required for the counter; for the kitchen, tell us what you have made.
            </p>

            <p
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                margin: '20px 0 clamp(28px,3.4vw,44px)',
                fontFamily: F.text,
                fontSize: 15,
                color: 'rgba(14,62,105,.66)'
              }}
            >
              <MapPin size={16} strokeWidth={2.2} aria-hidden="true" />
              {SHOP_ADDRESS.street}, {SHOP_ADDRESS.city} — every role is on site
            </p>

            <div
              style={{
                display: 'grid',
                gap: 'clamp(16px,2vw,24px)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                alignItems: 'start'
              }}
            >
              {ROLES.map((role) => (
                <RoleCard key={role.id} role={role} />
              ))}
            </div>

            {/* The catch-all, for the far more common case of someone good
                turning up when nothing is posted. */}
            <div
              style={{
                marginTop: 'clamp(28px,3.4vw,48px)',
                padding: 'clamp(22px,2.6vw,36px)',
                borderRadius: 28,
                background: 'var(--navy)',
                color: 'var(--cream)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    margin: '0 0 8px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 400,
                    fontSize: 30,
                    lineHeight: 1,
                    color: 'var(--cream)'
                  }}
                >
                  Nothing here fits?
                </h2>
                <p
                  style={{
                    margin: 0,
                    maxWidth: '46ch',
                    fontFamily: F.text,
                    fontSize: 15.5,
                    lineHeight: 1.5,
                    color: 'rgba(251,247,239,.76)'
                  }}
                >
                  Send us a note anyway. Openings come up with little notice, and we keep the good ones on file.
                </p>
              </div>
              <BrandButton href={CONTACT_HREF}>Get in touch</BrandButton>
            </div>
          </main>

          <Footer ready />
        </div>

        <CartDrawer />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </ShopProvider>
    </NavThemeProvider>
  );
}
