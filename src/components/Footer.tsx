import { useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Facebook, Instagram } from 'lucide-react';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useScrollSpin } from '../hooks/useScrollSpin';
import { Badge } from './brand';
import type { BadgeKey } from './brand';
import KosherBadge from './KosherBadge';
import { HOME_HREF, onHomeClick } from '../lib/home-href';
import { BULK_HREF, CAREERS_HREF, CONTACT_HREF } from '../lib/routes';
import type { KosherKey } from './KosherBadge';
import { LAB_HREF } from '../lib/lab-href';
import { shopHref } from '../lib/shop-href';
import CurvedInput from './CurvedInput';
import { useCareersVisibility } from '../hooks/useCareersVisibility';

/* Donuts and Cupcakes both pointed at '#favorites', so two differently
   labelled links went to the same homepage teaser and neither of them to the
   counter it named. Each one now opens the catalogue on its own collection. */
const MENU_LINKS = [
  { label: 'Donuts', href: shopHref({ category: 'Donuts' }) },
  { label: 'Donut lab', href: LAB_HREF },
  { label: 'Cupcakes', href: shopHref({ category: 'Cupcakes' }) },
  { label: 'Bulk orders', href: BULK_HREF }
];

/* Franchise is gone rather than pointed somewhere: there is no franchise
   programme, and a nav item is a promise that something exists behind it. All
   three used to point at `#top`, which on any page but the homepage went
   nowhere at all. */
const COMPANY_LINKS = [
  { label: 'Contact', href: CONTACT_HREF },
  { label: 'Allergies & Kashruth', href: '/allergy-free/' },
  { label: 'Privacy policy', href: '/privacy-policy/' },
  { label: 'Shipping & returns', href: '/shipping-returns/' }
];

/**
 * Opening hours as published on amazingdonuts.com
 * ("Sun: 8:00am-1:00pm  Mon-Thu: 7:30am - 4:00pm  Fri: 7:30am - 2:00pm").
 * Saturday is closed for Shabbat.
 */
const SCHEDULE = [
  { label: 'Sunday', hours: '8:00am – 1:00pm', days: [0] },
  { label: 'Mon – Thu', hours: '7:30am – 4:00pm', days: [1, 2, 3, 4] },
  { label: 'Friday', hours: '7:30am – 2:00pm', days: [5] },
  { label: 'Saturday', hours: 'Closed', days: [6] }
];

const CONTACT = {
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

/** On phones the two link columns collapse into a tab pair to save vertical space. */
function LinkTabs({ companyLinks }: { companyLinks: typeof COMPANY_LINKS }) {
  const groups = [
    { label: 'Menu', links: MENU_LINKS },
    { label: 'Information', links: companyLinks }
  ];
  const [tab, setTab] = useState(0);
  const group = groups[tab];

  return (
    <div>
      <div role="tablist" aria-label="Footer links" style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {groups.map((entry, i) => {
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

const ALLERGEN: BadgeKey[] = ['nut', 'dairy', 'sesame'];
const KOSHER: KosherKey[] = ['cor', 'pareve', 'yoshon'];

/* Matches the certification bar's pill exactly. */
const FOOTER_PILL = {
  color: 'var(--cream)',
  boxShadow: 'inset 0 0 0 2px rgba(251,247,239,.55)',
  whiteSpace: 'nowrap'
} as const;

export default function Footer({ ready }: { ready: boolean }) {
  // Matches the hero donut: turns with the scroll, and only after the
  // preloader has handed the wordmark to the navbar.
  const spin = useScrollSpin<HTMLImageElement>(150, ready);
  const reduce = useReducedMotion();
  const isDesktop = useIsDesktop();
  const careersVisible = useCareersVisibility();
  const companyLinks = careersVisible
    ? [{ label: 'Careers', href: CAREERS_HREF }, ...COMPANY_LINKS]
    : COMPANY_LINKS;

  return (
    <footer style={{ position: 'relative', background: 'var(--cream)' }}>
      {/* Says what the field is for before asking for the address. */}
      <div className="footer-signup-intro">
        <h2 className="footer-signup-title">First dibs on the good stuff</h2>
        <p className="footer-signup-lede">
          New flavours, seasonal boxes and the odd Friday-only bake — in your inbox before they hit the case.
        </p>
      </div>

      {/* The signup arcs over the donut below it, following its dome. */}
      <div className="footer-signup">
        <CurvedInput
          placeholder="Your email for first dibs"
          buttonText="Notify me"
          bend={58}
          height={62}
          cornerRadius={20}
          borderWidth={2}
          fontSize={15}
          backgroundColor="#fbf7ef"
          textColor="#0e3e69"
          placeholderColor="rgba(14,62,105,.5)"
          borderColor="#0e3e69"
          buttonColor="#ff6832"
          buttonTextColor="#ffffff"
          shadowColor="#0e3e69"
          shadowSize="sm"
          onSubmit={() => {}}
        />
      </div>

      {/* A taller slice than before (5:2 showed only the top 40% and the navy
          panel then covered most of that) so the donut actually reads. */}
      <div aria-hidden="true" className="footer-donut">
        <div style={{ width: 'clamp(260px,40vw,380px)', aspectRatio: '5 / 3.4', overflow: 'hidden' }}>
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
            <h2 className="footer-keep" style={{ margin: 0, fontSize: 'var(--type-section)', lineHeight: 0.9, color: 'var(--cream)' }}>
              Keep it amazing
            </h2>
            <p style={{ marginTop: 18, maxWidth: '38ch', fontSize: 'var(--type-body)', lineHeight: 1.4, color: 'rgba(251,247,239,.72)' }}>
              Donuts, cupcakes and custom orders — get the drop on new flavours before anyone else.
            </p>

            {/* Same pills as the certification bar. The kosher marks are
                white-only artwork and need a solid Harbour ground, which this
                panel gives them. */}
            <div className="footer-badges">
              {ALLERGEN.map((key) => (
                <Badge key={key} badge={key} forceOutline style={FOOTER_PILL} />
              ))}
              {KOSHER.map((key) => (
                <KosherBadge key={key} badge={key} style={FOOTER_PILL} />
              ))}
            </div>
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

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(251,247,239,.14)' }}>
              <a href={`mailto:${CONTACT.email}`} style={{ fontFamily: 'var(--font-cta)', fontWeight: 700, fontSize: 15, color: 'var(--cream)' }}>
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
              <a href={HOME_HREF} onClick={onHomeClick} aria-label="Amazing Donuts, home" style={{ display: 'block', width: '100%' }}>
                <img src="/img/logo-amazing-donuts.svg" alt="Amazing Donuts" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </a>
            </div>
            <p style={{ marginTop: 14, maxWidth: '26ch', fontSize: 15, lineHeight: 1.5, color: 'rgba(14,62,105,.65)' }}>
              Kosher donuts, cupcakes and baked goods, made in Toronto since 1997.
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
              {companyLinks.map((link) => (
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
            <LinkTabs companyLinks={companyLinks} />
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
            <a href="https://www.facebook.com/amazingdonuts/" target="_blank" rel="noopener noreferrer" aria-label="Amazing Donuts on Facebook" className="footer-icon-btn" style={{ color: 'var(--navy)' }}>
              <Facebook size={20} strokeWidth={2.2} />
            </a>
            <a href="https://www.instagram.com/amazingdonutsto/" target="_blank" rel="noopener noreferrer" aria-label="Amazing Donuts on Instagram" className="footer-icon-btn" style={{ color: 'var(--navy)' }}>
              <Instagram size={20} strokeWidth={2.2} />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
}
