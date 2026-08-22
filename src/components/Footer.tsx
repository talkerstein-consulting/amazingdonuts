import { useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { ArrowRight, Facebook, Instagram } from 'lucide-react';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useScrollSpin } from '../hooks/useScrollSpin';
import { useDonutLab } from '../lib/donut-lab';

const MENU_LINKS = [
  { label: 'Donuts', href: '#favorites' },
  { label: 'Custom', href: '#donut-lab' },
  { label: 'Cupcakes', href: '#favorites' },
  { label: 'Bulk orders', href: '#bulk' }
];

const COMPANY_LINKS = [
  { label: 'Our story', href: '#top' },
  { label: 'Careers', href: '#top' },
  { label: 'Franchise', href: '#top' },
  { label: 'Contact', href: '#top' }
];

/**
 * Opening hours as published on amazingdonuts.com
 * ("Sun: 8:00am-1:00pm  Mon-Thu: 7:30am - 4:00pm  Fri: 7:30am - 1:00pm").
 * Saturday is closed for Shabbat.
 */
const SCHEDULE = [
  { label: 'Sunday', hours: '8:00am – 1:00pm', days: [0] },
  { label: 'Mon – Thu', hours: '7:30am – 4:00pm', days: [1, 2, 3, 4] },
  { label: 'Friday', hours: '7:30am – 1:00pm', days: [5] },
  { label: 'Saturday', hours: 'Closed', days: [6] }
];

const CONTACT = {
  phone: '(416) 398-7546',
  phoneHref: 'tel:+14163987546',
  email: 'orders@amazingdonuts.com'
};

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } }
};
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const LINK_GROUPS = [
  { label: 'Menu', links: MENU_LINKS },
  { label: 'Company', links: COMPANY_LINKS }
];

/** On phones the two link columns collapse into a tab pair to save vertical space. */
function LinkTabs() {
  const [tab, setTab] = useState(0);
  const group = LINK_GROUPS[tab];

  return (
    <div>
      <div role="tablist" aria-label="Footer links" style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {LINK_GROUPS.map((entry, i) => {
          const selected = i === tab;
          return (
            <button
              key={entry.label}
              type="button"
              role="tab"
              id={`footer-tab-${i}`}
              aria-selected={selected}
              aria-controls={`footer-panel-${i}`}
              onClick={() => setTab(i)}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 99,
                border: 'none',
                cursor: 'pointer',
                background: selected ? 'var(--navy)' : 'transparent',
                boxShadow: selected ? 'none' : 'inset 0 0 0 2px rgba(14,62,105,.2)',
                color: selected ? 'var(--cream)' : 'var(--navy)',
                fontFamily: 'var(--font-cta)',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                transition: 'background .2s ease, color .2s ease'
              }}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
      <ul
        role="tabpanel"
        id={`footer-panel-${tab}`}
        aria-labelledby={`footer-tab-${tab}`}
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}
      >
        {group.links.map((link) => (
          <li key={link.label}>
            <a href={link.href} style={{ display: 'flex', alignItems: 'center', minHeight: 44, fontFamily: 'var(--font-label)', fontSize: 15, color: 'var(--navy)' }}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  // Matches the hero donut: turns with the scroll rather than on a timer.
  const spin = useScrollSpin<HTMLImageElement>(150);
  const reduce = useReducedMotion();
  const isDesktop = useIsDesktop();

  return (
    <footer style={{ position: 'relative', background: 'var(--cream)' }}>
      {/* Only the top 40% of the donut clears the footer edge; the footer's own
          content sits above it. */}
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          zIndex: 0,
          display: 'flex',
          justifyContent: 'center',
          marginTop: 'clamp(-120px,-13vw,-56px)',
          marginBottom: 0,
          pointerEvents: 'none'
        }}
      >
        <div style={{ width: 'clamp(240px,38vw,360px)', aspectRatio: '5 / 2', overflow: 'hidden' }}>
          <img
            ref={spin}
            src="/img/gemini-generated-image-iehotziehotzieho-copy.png"
            alt=""
            style={{ width: '100%', height: 'auto', display: 'block', willChange: 'rotate' }}
          />
        </div>
      </div>

      <motion.div
        variants={container}
        initial={reduce ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        style={{ position: 'relative', zIndex: 2, maxWidth: 1240, margin: '0 auto', padding: '0 clamp(18px,4vw,40px) clamp(24px,3vw,44px)' }}
      >
        <motion.div
          variants={item}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 44,
            background: 'var(--navy)',
            padding: 'clamp(28px,3.4vw,52px)',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 'clamp(24px,3vw,48px)',
            ...(isDesktop ? null : { gridTemplateColumns: '1fr', gap: 24 })
          }}
          className="footer-grid"
        >
          <div>
            <h2
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 12,
                fontSize: 'var(--type-section)',
                lineHeight: 0.9,
                color: 'var(--cream)'
              }}
            >
              <span>Keep it</span>
              <span style={{ flexBasis: '100%' }}>Amazing</span>
            </h2>
            <p style={{ marginTop: 18, maxWidth: '38ch', fontSize: 'var(--type-body)', lineHeight: 1.4, color: 'rgba(251,247,239,.72)' }}>
              Fresh donuts, cupcakes and custom orders — get the drop on new flavors before anyone else.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              style={{
                marginTop: 24,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                maxWidth: 420,
                padding: 6,
                // Pill when the row fits; rounded box once input and button stack.
                borderRadius: isDesktop ? 99 : 24,
                background: 'rgba(251,247,239,.08)',
                border: '1px solid rgba(251,247,239,.18)'
              }}
            >
              <label htmlFor="footer-email" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
                Email
              </label>
              <input
                id="footer-email"
                type="email"
                placeholder="you@email.com"
                style={{
                  flex: '1 1 160px',
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--cream)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  padding: '10px 14px'
                }}
              />
              <button
                type="submit"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 99,
                  background: 'var(--orange)',
                  color: '#fff',
                  fontFamily: 'var(--font-cta)',
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  padding: '14px 20px',
                  border: 'none',
                  cursor: 'pointer',
                  flex: '1 1 auto',
                  justifyContent: 'center',
                  minHeight: 48
                }}
              >
                Sign up
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              ...(isDesktop
                ? { borderLeft: '1px solid rgba(251,247,239,.14)', paddingLeft: 'clamp(24px,3vw,40px)' }
                : { borderTop: '1px solid rgba(251,247,239,.14)', paddingTop: 8 })
            }}
          >
            <span
              style={{
                display: 'block',
                marginBottom: 10,
                fontFamily: 'var(--font-label)',
                fontSize: 13,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: 'rgba(251,247,239,.55)'
              }}
            >
              Hours
            </span>
            <dl style={{ margin: 0 }}>
              {SCHEDULE.map((row, i) => {
                const today = row.days.includes(new Date().getDay());
                const closed = row.hours === 'Closed';
                return (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      padding: '12px 0',
                      borderTop: i === 0 ? 'none' : '1px solid rgba(251,247,239,.12)'
                    }}
                  >
                    <dt
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: 'var(--font-label)',
                        fontSize: 13,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        color: today ? 'var(--cream)' : 'rgba(251,247,239,.55)'
                      }}
                    >
                      {today && (
                        <span
                          aria-label="Today"
                          style={{ width: 8, height: 8, borderRadius: 99, background: closed ? 'rgba(251,247,239,.4)' : 'var(--orange)' }}
                        />
                      )}
                      {row.label}
                    </dt>
                    <dd
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-cta)',
                        fontWeight: 700,
                        fontSize: 16,
                        color: closed ? 'rgba(251,247,239,.5)' : 'var(--cream)'
                      }}
                    >
                      {row.hours}
                    </dd>
                  </div>
                );
              })}
            </dl>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(251,247,239,.14)', display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
              <a href={CONTACT.phoneHref} style={{ fontFamily: 'var(--font-cta)', fontWeight: 700, fontSize: 15, color: 'var(--cream)' }}>
                {CONTACT.phone}
              </a>
              <a href={`mailto:${CONTACT.email}`} style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'rgba(251,247,239,.72)' }}>
                {CONTACT.email}
              </a>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} style={{
            marginTop: 40,
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'repeat(auto-fit, minmax(160px, 1fr))' : '1fr',
            gap: isDesktop ? 32 : 28
          }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: 'clamp(16px,3vw,24px) clamp(18px,4vw,28px)',
                borderRadius: 20,
                background: 'var(--navy)'
              }}
            >
              <img src="/img/logo-amazing-donuts.svg" alt="Amazing Donuts" style={{ width: '100%', height: 'auto' }} />
            </div>
            <p style={{ marginTop: 14, maxWidth: '26ch', fontSize: 15, lineHeight: 1.5, color: 'rgba(14,62,105,.65)' }}>
              Kosher donuts, cupcakes and baked goods, made fresh every day since 1997.
            </p>
          </div>
          {isDesktop ? (
            <>
          <nav aria-label="Menu">
            <span style={{ display: 'block', marginBottom: 14, fontFamily: 'var(--font-label)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(14,62,105,.5)' }}>
              Menu
            </span>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {MENU_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} style={{ fontFamily: 'var(--font-label)', fontSize: 15, color: 'var(--navy)' }}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Company">
            <span style={{ display: 'block', marginBottom: 14, fontFamily: 'var(--font-label)', fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(14,62,105,.5)' }}>
              Company
            </span>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} style={{ fontFamily: 'var(--font-label)', fontSize: 15, color: 'var(--navy)' }}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
            </>
          ) : (
            <LinkTabs />
          )}
        </motion.div>

        <motion.div
          variants={item}
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: '1px solid rgba(14,62,105,.12)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(14,62,105,.5)' }}>© 2026 Amazing Donuts</p>
          <div style={{ display: 'flex', gap: 4 }}>
            <a href="#wild" aria-label="Facebook" className="footer-icon-btn" style={{ color: 'var(--navy)' }}>
              <Facebook size={20} strokeWidth={2.2} />
            </a>
            <a href="#wild" aria-label="Instagram" className="footer-icon-btn" style={{ color: 'var(--navy)' }}>
              <Instagram size={20} strokeWidth={2.2} />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
}
