import { Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  Building2,
  Cake,
  CalendarClock,
  Cookie,
  Dessert,
  Donut,
  GraduationCap,
  MessageSquare,
  MoreHorizontal,
  PartyPopper,
  Printer,
  Store,
  Truck,
  UserRound,
  Users,
  Wheat,
  X,
  type LucideIcon
} from 'lucide-react';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import { SquircleDefs, BrandButton, C, F } from '../components/brand';
import { formatNorthAmericanPhone } from '../lib/phone';
import { NavThemeProvider } from '../lib/nav-theme';
import { ShopProvider } from '../lib/shop';
import { initSmoothScroll } from '../lib/smooth-scroll';
import { SHOP_ADDRESS } from '../lib/routes';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthModal from '../shop/AuthModal';
import CartDrawer from '../shop/CartDrawer';
import BrandDatePicker, { localDateValue } from '../components/BrandDatePicker';

/* The same carousel the homepage uses, and deferred the same way: it pulls in
   @react-three/fiber and the whole of `three`, and it sits well below the fold
   on both pages. Reusing it also means the photographs get their labels and
   their alt text back - it takes {src, title, meta, alt} per item, where the
   reel gallery took bare URLs and could describe nothing. */
const LenticularCarousel = lazy(() => import('../components/lenticular-carousel'));

/** Bulk ordering guidance, proof of past work, and an email-first intake form. */

/**
 * UGC from `Reel covers/`, already converted to WebP for the homepage carousel.
 *
 * These are the volume shots — boxes, trays, cases, a corporate pickup, a
 * school run — and none of them is in the homepage's twelve, so the two
 * galleries do not read as the same photographs twice. (An earlier pass had
 * reel-02 in here, which *is* on the homepage; reel-31 replaced it.)
 *
 * Titles and alt text describe what is in each frame rather than captioning it,
 * because these are the page's evidence for a claim the prose makes.
 */
const UGC = [
  { src: '/img/reels/reel-18.webp', title: 'Office pickup',   meta: '@amazingdonutsto', alt: 'Two customers carrying Amazing Donuts bags in an office lobby' },
  { src: '/img/reels/reel-14.webp', title: 'The spread',      meta: '@amazingdonutsto', alt: 'Overhead spread of glazed and chocolate-drizzled donuts' },
  { src: '/img/reels/reel-16.webp', title: 'Party plates',    meta: '@amazingdonutsto', alt: 'Sprinkled donuts served on plates at a party' },
  { src: '/img/reels/reel-33.webp', title: 'Trays on trays',  meta: '@amazingdonutsto', alt: 'Trays of sprinkled donuts stacked in the bakery case' },
  { src: '/img/reels/reel-27.webp', title: 'School run',      meta: '@amazingdonutsto', alt: 'A group of children outside holding donuts' },
  { src: '/img/reels/reel-41.webp', title: 'By the tray',     meta: '@amazingdonutsto', alt: 'A large tray of pastries with one being lifted out' },
  { src: '/img/reels/reel-10.webp', title: 'Two glazes',      meta: '@amazingdonutsto', alt: 'Chocolate and vanilla glazed donuts arranged on a tray' },
  { src: '/img/reels/reel-13.webp', title: 'The case',        meta: '@amazingdonutsto', alt: 'Cupcakes and donuts filling the bakery display case' },
  { src: '/img/reels/reel-31.webp', title: 'Sofganiyot',      meta: '@amazingdonutsto', alt: 'A tray of powdered sofganiyot' }
];

/* --- form plumbing ------------------------------------------------------- */
/* Each answer carries its own glyph, so a group is scannable before it is
   read. Head counts are the exception and stay bare: there is no honest icon
   for "25 - 60", and a made-up one would be decoration pretending to be
   information. */
const ORDER_TYPES: [string, LucideIcon][] = [
  ['Corporate / office', Building2],
  ['Simcha', PartyPopper],
  ['School or shul', GraduationCap],
  ['Something else', MoreHorizontal]
];
const HEAD_COUNTS = ['Under 25', '25 – 60', '60 – 150', '150+'] as const;
const PRODUCTS: [string, LucideIcon][] = [
  ['Donuts', Donut],
  // Lucide has no muffin; Dessert is the nearest true shape. Same call the
  // catalogue's collection chips make.
  ['Muffins', Dessert],
  ['Cupcakes', Cake],
  ['Cookies', Cookie],
  ['Breads / challah', Wheat],
  ['Custom printed', Printer]
];
const FULFILMENT: [string, LucideIcon][] = [
  ['Delivery', Truck],
  ['Pickup', Store]
];

/** The lead time the first feature card promises, in days. One source. */
const LEAD_DAYS = 3;

const field: CSSProperties = {
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

const legend: CSSProperties = {
  display: 'block',
  marginBottom: 9,
  fontFamily: 'var(--font-cta)',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: C.navy
};

/** A pill that behaves like a radio or a checkbox, depending who renders it. */
function Choice({
  name,
  value,
  type,
  checked,
  onChange,
  Icon
}: {
  name: string;
  value: string;
  type: 'radio' | 'checkbox';
  checked: boolean;
  onChange: () => void;
  Icon?: LucideIcon;
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        padding: '0 16px',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        fontFamily: F.text,
        fontSize: 15,
        /* Bubblegum for the chosen one, a hairline for the rest: the same
           chip language the navbar and the catalogue already use. */
        background: checked ? 'var(--pink)' : 'transparent',
        boxShadow: checked ? 'none' : 'inset 0 0 0 1.5px rgba(14,62,105,.24)',
        color: C.navy,
        transition: 'background .18s ease, box-shadow .18s ease'
      }}
    >
      {/* The real control, kept for keyboard and screen readers rather than
          reimplemented with divs and aria. */}
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      {Icon && <Icon size={16} strokeWidth={2.2} aria-hidden="true" style={{ flex: 'none' }} />}
      {value}
    </label>
  );
}

function Row({
  label,
  Icon,
  children
}: {
  label: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
      {/* The icon lives inside the legend so it is part of the group's label
          rather than a floating decoration beside it. */}
      <legend style={{ ...legend, display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon size={17} strokeWidth={2.3} aria-hidden="true" />
        {label}
      </legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{children}</div>
    </fieldset>
  );
}

/** The same label treatment for the plain fields, which are not fieldsets. */
function FieldLabel({ label, Icon }: { label: string; Icon: LucideIcon }) {
  return (
    <span style={{ ...legend, display: 'flex', alignItems: 'center', gap: 9 }}>
      <Icon size={17} strokeWidth={2.3} aria-hidden="true" />
      {label}
    </span>
  );
}

function IntakeForm() {
  const reduceMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [orderType, setOrderType] = useState<string>('');
  const [headCount, setHeadCount] = useState<string>('');
  const [products, setProducts] = useState<string[]>([]);
  const [fulfilment, setFulfilment] = useState<string>('');
  const [date, setDate] = useState('');
  const [organization, setOrganization] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const closeSuccess = () => {
    setSubmitState('idle');
    setSubmitMessage('');
  };

  useEffect(() => {
    if (submitState !== 'sent') return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && closeSuccess();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [submitState]);

  /* Surface short lead times while the customer can still add context. */
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const tooSoon = useMemo(() => {
    if (!date) return false;
    const chosen = new Date(date + 'T00:00:00');
    const days = Math.round((chosen.getTime() - today.getTime()) / 86_400_000);
    return days < LEAD_DAYS;
  }, [date, today]);

  /** Earliest date the picker will accept — the same LEAD_DAYS, enforced. */
  const minDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + LEAD_DAYS);
    return localDateValue(d);
  }, [today]);

  const toggleProduct = (p: string) =>
    setProducts((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!date) {
      setSubmitState('error');
      setSubmitMessage('Choose the date you need the order.');
      return;
    }
    setSubmitState('sending');
    setSubmitMessage('');
    try {
      const response = await fetch('/api/house/public/bulk-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug: 'amazing-donuts', organizationName: organization, organizationType: orderType,
          contactName: name, email, phone, headCount, neededFor: date, fulfillment: fulfilment,
          products, notes, website: ''
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || 'We could not send your request.');
      setSubmitState('sent');
      setSubmitMessage('Request received. Our team will review it and contact you with the next step.');
      form.reset();
      setOrderType(''); setHeadCount(''); setProducts([]); setFulfilment(''); setDate('');
      setOrganization(''); setName(''); setEmail(''); setPhone(''); setNotes('');
    } catch (error) {
      setSubmitState('error');
      setSubmitMessage(error instanceof Error ? error.message : 'We could not send your request.');
    }
  };

  return (
    <form onSubmit={send} style={{ display: 'grid', gap: 26 }}>
      <Row label="What is it for?" Icon={PartyPopper}>
        {ORDER_TYPES.map(([t, Icon]) => (
          <Choice
            key={t}
            name="orderType"
            value={t}
            type="radio"
            checked={orderType === t}
            onChange={() => setOrderType(t)}
            Icon={Icon}
          />
        ))}
      </Row>

      <Row label="How many people?" Icon={Users}>
        {HEAD_COUNTS.map((h) => (
          <Choice
            key={h}
            name="headCount"
            value={h}
            type="radio"
            checked={headCount === h}
            onChange={() => setHeadCount(h)}
          />
        ))}
      </Row>

      <Row label="What are you after?" Icon={Donut}>
        {PRODUCTS.map(([p, Icon]) => (
          <Choice
            key={p}
            name="products"
            value={p}
            type="checkbox"
            checked={products.includes(p)}
            onChange={() => toggleProduct(p)}
            Icon={Icon}
          />
        ))}
      </Row>

      <Row label="Delivery or pickup?" Icon={Truck}>
        {FULFILMENT.map(([f, Icon]) => (
          <Choice
            key={f}
            name="fulfilment"
            value={f}
            type="radio"
            checked={fulfilment === f}
            onChange={() => setFulfilment(f)}
            Icon={Icon}
          />
        ))}
      </Row>

      <div>
        <FieldLabel label="When do you need it?" Icon={CalendarClock} />
        <BrandDatePicker value={date} min={minDate} onChange={setDate} ariaLabel="Choose the date for your bulk order" />

        {tooSoon && (
          <p
            role="status"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              margin: '12px 0 0',
              maxWidth: '52ch',
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255,104,50,.12)',
              boxShadow: 'inset 0 0 0 1.5px rgba(255,104,50,.45)',
              fontFamily: F.text,
              fontSize: 14.5,
              lineHeight: 1.45,
              color: C.navy
            }}
          >
            <AlertTriangle size={17} strokeWidth={2.3} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
            <span>
              That is inside our {LEAD_DAYS}-day window. Send this anyway and email{' '}
              <a href={`mailto:${SHOP_ADDRESS.email}`} style={{ fontWeight: 700, color: C.navy }}>
                {SHOP_ADDRESS.email}
              </a>{' '}
              with anything time-sensitive so the bakery team can review it quickly.
            </span>
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <label>
          <FieldLabel label="Organization or event" Icon={Building2} />
          <input required value={organization} onChange={(e) => setOrganization(e.target.value)} style={field} autoComplete="organization" />
        </label>
        <label>
          <FieldLabel label="Your name" Icon={UserRound} />
          <input required value={name} onChange={(e) => setName(e.target.value)} style={field} autoComplete="name" />
        </label>
        <label>
          <span style={legend}>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field}
            autoComplete="email"
          />
        </label>
        <label>
          <span style={legend}>Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatNorthAmericanPhone(e.target.value))}
            style={field}
            autoComplete="tel"
          />
        </label>
      </div>

      <label>
        <FieldLabel label="Anything else" Icon={MessageSquare} />
        <textarea
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Allergies, logos, colours, delivery window, budget"
          style={{ ...field, resize: 'vertical', lineHeight: 1.5 }}
        />
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <BrandButton type="submit" disabled={submitState === 'sending'}>{submitState === 'sending' ? 'Sending...' : 'Send the enquiry'}</BrandButton>
        <span role="status" style={{ fontFamily: F.text, fontSize: 13.5, color: submitState === 'error' ? '#9d2424' : 'rgba(14,62,105,.7)' }}>
          {submitState === 'error' ? submitMessage : 'Your request goes directly to the bakery team for review.'}
        </span>
      </div>

      <AnimatePresence>
        {submitState === 'sent' && (
          <motion.div
            className="bulk-success-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => event.target === event.currentTarget && closeSuccess()}
          >
            <motion.section
              className="bulk-success-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="bulk-success-title"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: .94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: .97 }}
              transition={{ duration: reduceMotion ? .15 : .45, ease: [0.22, 1, 0.36, 1] }}
            >
              <button ref={closeButtonRef} className="bulk-success-close" type="button" onClick={closeSuccess} aria-label="Close confirmation">
                <X size={22} strokeWidth={2.4} />
              </button>
              <motion.img
                className="bulk-success-donut"
                src="/img/roll-donut.png"
                alt=""
                initial={reduceMotion ? false : { x: -180, rotate: -160, scale: .7 }}
                animate={reduceMotion ? undefined : { x: 0, rotate: 0, scale: 1 }}
                transition={{ duration: .85, delay: .08, ease: [0.22, 1, 0.36, 1] }}
              />
              <p>Enquiry received</p>
              <h2 id="bulk-success-title">That was amazing.</h2>
              <span>Our bakery team has your request and will reply by email with the next step.</span>
              <BrandButton type="button" onClick={closeSuccess}>Done</BrandButton>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

export default function BulkOrdersPage() {
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(initSmoothScroll, []);

  return (
    <NavThemeProvider>
      <ShopProvider>
        <SquircleDefs />
        <div style={{ background: 'var(--cream)', color: 'var(--navy)' }}>
          <Header onSignIn={() => setAuthOpen(true)} />

          <main style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(24px,4vw,56px) clamp(18px,4vw,40px)' }}>
            {/* The homepage's headline treatment, to the letter: --type-hero,
                0.82 leading, the same negative tracking, and a cut-out donut
                sitting mid-line between the words. The h1 is a flex row, so the
                line break is `flexBasis: 100%` rather than a <br> — see Hero. */}
            <h1
              className="hero-title"
              style={{
                margin: 0,
                fontSize: 'var(--type-hero)',
                lineHeight: 0.82,
                letterSpacing: '-.015em',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 'clamp(10px,1.2vw,20px)',
                textWrap: 'balance'
              }}
            >
              <span>Big orders,</span>
              <span style={{ flexBasis: '100%' }}>made straightforward.</span>
            </h1>
            <p
              style={{
                margin: '18px auto clamp(30px,3.6vw,52px)',
                maxWidth: '56ch',
                fontSize: 'var(--type-body)',
                lineHeight: 1.45,
                textAlign: 'center',
                color: 'rgba(14,62,105,.72)'
              }}
            >
              Planning for an office, school, simcha or community event? Share the date, guest count and what you
              have in mind. We’ll recommend the right mix and follow up with a clear quote.
            </p>

            {/* --- intake --- */}
            <section
              aria-label="Bulk order enquiry"
              style={{
                marginTop: 'clamp(26px,3vw,44px)',
                padding: 'clamp(22px,2.8vw,40px)',
                borderRadius: 32,
                background: 'var(--sand)'
              }}
            >
              <h2
                style={{
                  margin: '0 0 6px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(28px,3.2vw,40px)',
                  lineHeight: 1
                }}
              >
                Tell us about it
              </h2>
              <p
                style={{
                  margin: '0 0 clamp(22px,2.6vw,32px)',
                  maxWidth: '52ch',
                  fontFamily: F.text,
                  fontSize: 15.5,
                  lineHeight: 1.5,
                  color: 'rgba(14,62,105,.72)'
                }}
              >
                Four questions and a date. Enough for us to prepare a clear quote and reply by email.
              </p>
              <IntakeForm />
            </section>

            {/* --- UGC --- */}
            <section aria-label="Customer photos" style={{ marginTop: 'clamp(34px,4vw,60px)' }}>
              <h2
                style={{
                  margin: '0 0 16px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(26px,3vw,38px)',
                  lineHeight: 1
                }}
              >
                Out in the world
              </h2>
              {/* The reel gallery from the kit, which is what these frames were
                  shot for. The previous pass put them in a plain row styled with
                  `.sb-rail` — a class that lives in the Donut Lab's stylesheet,
                  which this page does not import, so the row had no flex, no
                  horizontal scroll and no width constraint and the six images
                  stacked full-bleed down the page. That was the breakage. */}
              {/* `.wild-gallery` is the homepage's own wrapper, reused: it
                  carries the height the carousel needs and the radius that
                  rounds the edge-to-edge card strip. Its negative inline margin
                  is tuned to the homepage panel's padding, so that one part is
                  overridden here. */}
              <div className="wild-gallery" style={{ marginInline: 0 }}>
                <Suspense fallback={<div className="wild-gallery__loading" />}>
                  <LenticularCarousel
                    items={UGC}
                    /* Identical settings to Social, so the two galleries are
                       recognisably the same object in two places. */
                    cardWidth={230}
                    aspectRatio="9 / 16"
                    gap={0}
                    borderRadius={14}
                    strips={23}
                    sweep={0.6}
                    refraction={0.32}
                    ridge={0.5}
                    foil={0.5}
                    foilScale={8}
                    scrim={0.85}
                    tilt={14}
                    travel={0.64}
                    lift={40}
                    perspective={1200}
                    inactiveScale={0.9}
                    inactiveDim={0.55}
                    speed={1}
                    trigger="hover"
                    labelColor="#ffffff"
                    showLabels
                    showControls
                    showDots
                    loop={false}
                    autoplay={false}
                    enableDrag
                    paused={false}
                  />
                </Suspense>
              </div>
            </section>

          </main>

          <Footer ready />
        </div>

        <CartDrawer />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </ShopProvider>
    </NavThemeProvider>
  );
}
