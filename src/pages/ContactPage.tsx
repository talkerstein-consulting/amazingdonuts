import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import { SquircleDefs, BrandButton, C, F } from '../components/brand';
import { NavThemeProvider } from '../lib/nav-theme';
import { ShopProvider } from '../lib/shop';
import { initSmoothScroll } from '../lib/smooth-scroll';
import { MAP_QUERY, SHOP_ADDRESS } from '../lib/routes';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthModal from '../shop/AuthModal';
import CartDrawer from '../shop/CartDrawer';

/**
 * Contact: the details, a message form, and a map at the bottom.
 *
 * Two things worth knowing about the form. It has no backend — the site is
 * fully static, five HTML entries and no server — so submitting composes a
 * `mailto:` with the fields already filled in. That is a real send, rather
 * than a form that silently swallows what people type, which is what a POST to
 * nowhere would be.
 *
 * The map is an OpenStreetMap iframe, chosen because it needs no API key and
 * so has no key to leak or expire. Google's supported embed endpoint wants a
 * billed key; the directions button hands off to Google Maps instead, which
 * needs nothing.
 */

/** A ~1km box around the shop — close enough to read the cross-streets. */
const MAP_SRC =
  'https://www.openstreetmap.org/export/embed.html?bbox=-79.4360%2C43.7250%2C-79.4230%2C43.7330&layer=mapnik&marker=43.7290%2C-79.4295';

/* The same hours the footer publishes. Saturday is closed for Shabbat. */
const HOURS = [
  { label: 'Sunday', hours: '8:00am – 1:00pm' },
  { label: 'Mon – Thu', hours: '7:30am – 4:00pm' },
  { label: 'Friday', hours: '7:30am – 1:00pm' },
  { label: 'Saturday', hours: 'Closed' }
];

const fieldStyle: CSSProperties = {
  width: '100%',
  minHeight: 52,
  padding: '14px 16px',
  borderRadius: 16,
  border: 'none',
  boxShadow: 'inset 0 0 0 2px rgba(14,62,105,.20)',
  background: 'var(--cream)',
  fontFamily: 'var(--font-body)',
  fontSize: 16,
  color: C.navy
};

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 7,
  fontFamily: 'var(--font-cta)',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: C.navy
};

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span
        aria-hidden="true"
        style={{
          flex: 'none',
          width: 42,
          height: 42,
          borderRadius: 99,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--sand)',
          color: C.navy
        }}
      >
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            marginBottom: 2,
            fontFamily: 'var(--font-label)',
            fontSize: 12,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: 'rgba(14,62,105,.55)'
          }}
        >
          {label}
        </span>
        {children}
      </span>
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const body = ['From: ' + name, 'Email: ' + email, '', message].join('\n');
    /* encodeURIComponent rather than interpolating straight in: names and
       messages contain ampersands and newlines, which would truncate the
       mailto at the first one. */
    window.location.href =
      'mailto:' +
      SHOP_ADDRESS.email +
      '?subject=' +
      encodeURIComponent(subject || 'Website enquiry') +
      '&body=' +
      encodeURIComponent(body);
  };

  return (
    <form onSubmit={send} style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <label>
          <span style={labelStyle}>Your name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} autoComplete="name" />
        </label>
        <label>
          <span style={labelStyle}>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={fieldStyle}
            autoComplete="email"
          />
        </label>
      </div>

      <label>
        <span style={labelStyle}>Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Bulk order, custom donuts, something else"
          style={fieldStyle}
        />
      </label>

      <label>
        <span style={labelStyle}>Message</span>
        <textarea
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* No href, so BrandButton renders a real <button> — which is what a
            form submit needs. */}
        <BrandButton type="submit">
          Send it
        </BrandButton>
        <span style={{ fontFamily: F.text, fontSize: 13.5, color: 'rgba(14,62,105,.6)' }}>
          Opens your mail app, addressed to {SHOP_ADDRESS.email}.
        </span>
      </div>
    </form>
  );
}

export default function ContactPage() {
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(initSmoothScroll, []);

  return (
    <NavThemeProvider>
      <ShopProvider>
        <SquircleDefs />
        <div style={{ background: 'var(--cream)', color: 'var(--navy)' }}>
          <Header onSignIn={() => setAuthOpen(true)} />

          <main style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(24px,4vw,56px) clamp(18px,4vw,40px)' }}>
            <h1 style={{ margin: 0, fontSize: 'var(--type-section)', lineHeight: 0.92, maxWidth: '16ch' }}>
              Come say hello.
            </h1>
            <p
              style={{
                margin: '18px 0 clamp(28px,3.4vw,48px)',
                maxWidth: '54ch',
                fontSize: 'var(--type-body)',
                lineHeight: 1.45,
                color: 'rgba(14,62,105,.72)'
              }}
            >
              We are on Bathurst, north of Lawrence. Call for same-day orders, email for anything that needs
              planning, or walk in and point at whatever looks good.
            </p>

            <div
              style={{
                display: 'grid',
                gap: 'clamp(28px,4vw,56px)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                alignItems: 'start'
              }}
            >
              <div style={{ display: 'grid', gap: 22 }}>
                <Detail icon={<MapPin size={20} strokeWidth={2.2} />} label="Address">
                  <span style={{ fontFamily: F.text, fontSize: 16, lineHeight: 1.4, color: C.navy }}>
                    {SHOP_ADDRESS.street}
                    <br />
                    {SHOP_ADDRESS.city}
                  </span>
                </Detail>

                <Detail icon={<Phone size={20} strokeWidth={2.2} />} label="Phone">
                  <a
                    href={SHOP_ADDRESS.phoneHref}
                    style={{ fontFamily: 'var(--font-cta)', fontWeight: 700, fontSize: 16, color: C.navy }}
                  >
                    {SHOP_ADDRESS.phone}
                  </a>
                </Detail>

                <Detail icon={<Mail size={20} strokeWidth={2.2} />} label="Email">
                  <a href={'mailto:' + SHOP_ADDRESS.email} style={{ fontFamily: F.text, fontSize: 16, color: C.navy }}>
                    {SHOP_ADDRESS.email}
                  </a>
                </Detail>

                <Detail icon={<Clock size={20} strokeWidth={2.2} />} label="Hours">
                  <span style={{ display: 'grid', gap: 4 }}>
                    {HOURS.map((h) => (
                      <span
                        key={h.label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 18,
                          maxWidth: 280,
                          fontFamily: F.text,
                          fontSize: 15,
                          color: h.hours === 'Closed' ? 'rgba(14,62,105,.55)' : C.navy
                        }}
                      >
                        <span>{h.label}</span>
                        <span>{h.hours}</span>
                      </span>
                    ))}
                  </span>
                </Detail>
              </div>

              <div style={{ padding: 'clamp(20px,2.4vw,32px)', borderRadius: 28, background: 'var(--sand)' }}>
                <h2
                  style={{
                    margin: '0 0 18px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 400,
                    fontSize: 30,
                    lineHeight: 1
                  }}
                >
                  Send a message
                </h2>
                <ContactForm />
              </div>
            </div>
          </main>

          {/* The map sits at the bottom, where it answers "how do I get there"
              rather than competing with the details for the top of the page. */}
          <section
            aria-label="Where to find us"
            style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(18px,4vw,40px) clamp(28px,4vw,56px)' }}
          >
            <div style={{ borderRadius: 28, overflow: 'hidden', background: 'var(--sand)' }}>
              <iframe
                title="Map showing Amazing Donuts at 3499 Bathurst Street, Toronto"
                src={MAP_SRC}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ display: 'block', width: '100%', height: 'clamp(280px, 42vw, 460px)', border: 0 }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                  padding: 'clamp(16px,2vw,24px)'
                }}
              >
                <span style={{ fontFamily: F.text, fontSize: 15.5, color: C.navy }}>
                  {SHOP_ADDRESS.street}, {SHOP_ADDRESS.city}
                </span>
                <BrandButton
                  href={'https://www.google.com/maps/dir/?api=1&destination=' + MAP_QUERY}
                  variant="outline"
                >
                  Get directions
                </BrandButton>
              </div>
            </div>
          </section>

          <Footer ready />
        </div>

        <CartDrawer />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </ShopProvider>
    </NavThemeProvider>
  );
}
