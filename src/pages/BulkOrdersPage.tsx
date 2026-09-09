import { Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Cake,
  CalendarClock,
  Cookie,
  Dessert,
  Donut,
  GraduationCap,
  Check,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
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
import { SHOP_PRODUCTS, type Category, type Product } from '../data/products';
import { tagFor } from '../data/product-tags';
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

/**
 * The catalogue counter each bulk option stands for, and the product that
 * shows its face.
 *
 * The question used to be six icon pills. A pill is the right size for "what is
 * it for", where the answer is a word — but this question is asking what the
 * bakery should make, and an outline donut glyph is a poor stand-in for a
 * counter of real ones. So the options are the shop's own collection cards: a
 * cut-out of a product from that counter on a bed, its name beside it. The
 * visitor is picking from the same six things the shop shows, drawn the same
 * way.
 *
 * The face is derived, never a hardcoded id — `products.ts` is generated from
 * the scrape and a fixed id would quietly become a broken image the next time
 * it is regenerated. Best Seller first, then Popular, then the run's first.
 * "Custom printed" has no counter of its own, so it takes the printed dozen,
 * which is the product it means.
 */
const BULK_FACE_CATEGORY: Record<string, Category | null> = {
  Donuts: 'Donuts',
  Muffins: 'Muffins',
  Cupcakes: 'Cupcakes',
  Cookies: 'Cookies',
  'Breads / challah': 'Breads',
  'Custom printed': null
};

const bulkFace = (label: string): Product | undefined => {
  if (label === 'Custom printed') {
    return SHOP_PRODUCTS.find((p) => p.id === 'twelve-custom-printed-donuts');
  }
  const category = BULK_FACE_CATEGORY[label];
  const scope = SHOP_PRODUCTS.filter((p) => p.category === category);
  const rank = (p: Product) => {
    const tag = tagFor(p.id);
    return tag === 'seller' ? 0 : tag === 'popular' ? 1 : 2;
  };
  return [...scope].sort((a, b) => rank(a) - rank(b))[0];
};
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

  /* --- one question at a time ------------------------------------------
     The intake was eight blocks stacked on one page. Every one of them is a
     small question, and a wall of small questions reads as a long form: the
     visitor sizes up the whole thing before answering any of it. Asked one at
     a time it is the same eight answers, but the only thing on screen is the
     one being given — which is how the Donut Lab's builder already works on
     this site, so the pattern is the site's own.

     `STEPS` is the order and the rules. `done` decides whether the step can be
     left, so Next is refused rather than the form failing at the end; `auto` is
     set on the single-answer steps, which advance on the tap that answers them
     because a Next after a radio is a second tap for nothing. The multi-select,
     the date and the two typing steps keep their Next. */
  const STEPS = [
    { id: 'type', auto: true, done: () => Boolean(orderType) },
    { id: 'people', auto: true, done: () => Boolean(headCount) },
    { id: 'products', auto: false, done: () => products.length > 0 },
    { id: 'fulfilment', auto: true, done: () => Boolean(fulfilment) },
    { id: 'date', auto: false, done: () => Boolean(date) },
    /* One field per question. These were a single "contact" step holding four
       inputs, which is the old stacked form in miniature — and it was the only
       step that could fail on three counts at once, so its one error line had
       to name all three and left the visitor to work out which was missing. */
    { id: 'organization', auto: false, done: () => Boolean(organization.trim()) },
    { id: 'name', auto: false, done: () => Boolean(name.trim()) },
    { id: 'email', auto: false, done: () => /.+@.+\..+/.test(email) },
    /* Optional, and says so: a phone number is how the bakery reaches you
       faster, not something the enquiry needs to be sent. */
    { id: 'phone', auto: false, done: () => true },
    { id: 'notes', auto: false, done: () => true }
  ] as const;

  /* One line per step, because "please answer this" is not an instruction —
     it has to name the answer that is missing. A single fallback message put
     "fill in the organization, your name and an email" under "Delivery or
     pickup?", which is worse than saying nothing. */
  const NUDGE: Record<string, string> = {
    type: 'Pick the one that fits best.',
    people: 'Roughly how many people is fine — pick the nearest.',
    products: 'Pick at least one — you can choose several.',
    fulfilment: 'Choose delivery or pickup.',
    date: 'Choose the date you need the order.',
    organization: 'Tell us who the order is for.',
    name: 'Who should we reply to?',
    email: 'We need an email address to send the quote to.',
    phone: '',
    notes: ''
  };

  const [stepIndex, setStepIndex] = useState(0);
  const [dir, setDir] = useState(1);
  /* Set when Next is pressed on an unanswered step, cleared as soon as it is
     answered — so the message appears in reply to the press rather than
     scolding the visitor for a question they have not reached yet. */
  const [nudged, setNudged] = useState(false);
  const step = STEPS[stepIndex];
  const stepDone = step.done();
  const lastStep = stepIndex === STEPS.length - 1;

  useEffect(() => {
    if (stepDone) setNudged(false);
  }, [stepDone]);

  const goNext = () => {
    if (!stepDone) return setNudged(true);
    setDir(1);
    setStepIndex((n) => Math.min(STEPS.length - 1, n + 1));
  };
  const goBack = () => {
    setDir(-1);
    setNudged(false);
    setStepIndex((n) => Math.max(0, n - 1));
  };
  /* A single-answer step advances itself, but only forward and only from the
     step being answered — picking a different answer on a step you have come
     BACK to should change the answer, not fling you forward again. */
  const answered = (index: number) => {
    if (index === stepIndex && STEPS[index].auto && index < STEPS.length - 1) {
      window.setTimeout(() => {
        setDir(1);
        setStepIndex((n) => (n === index ? n + 1 : n));
      }, 260);
    }
  };


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
      /* Back to question one with the answers, or the confirmed enquiry leaves
         the visitor looking at an empty "Anything else" box. */
      setStepIndex(0); setDir(1); setNudged(false);
    } catch (error) {
      setSubmitState('error');
      setSubmitMessage(error instanceof Error ? error.message : 'We could not send your request.');
    }
  };

  return (
    <form onSubmit={send} style={{ display: 'grid', gap: 22 }}>
      {/* Where you are, and how much is left. A stepped form without this is a
          corridor with no end in sight — the count is the promise that this is
          seven short questions and not seventy. */}
      <div className="bulk-progress">
        <span className="bulk-progress__count">
          Question {stepIndex + 1} of {STEPS.length}
        </span>
        <span className="bulk-progress__track" aria-hidden="true">
          <span
            className="bulk-progress__fill"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </span>
      </div>

      {/* One question on screen at a time. `mode="wait"` so the outgoing answer
          is gone before the next arrives — two questions crossfading over each
          other is two questions to read. */}
      <div className="bulk-step">
          {/* A keyed plain div, not an AnimatePresence pair.

              `mode="wait"` holds the outgoing question until its exit resolves,
              and on this form the exits do not always resolve: a radio answers
              and advances on its own 260ms timer, so a quick run through the
              first questions changes the key while the previous exit is still
              in flight. Twice that left the counter reading "Question 6 of 7"
              over the date picker, and once it wedged there for good.

              There is nothing to coordinate here — the old question is simply
              gone — so the key remounts the div and a CSS keyframe slides the
              new one in. No exit to lose, and the direction rides on a data
              attribute so Back still comes from the left. */}
          <div key={step.id} className="bulk-step__panel" data-dir={dir >= 0 ? 'fwd' : 'back'}>
            {step.id === 'type' && (
              <Row label="What is it for?" Icon={PartyPopper}>
                {ORDER_TYPES.map(([t, Icon]) => (
                  <Choice
                    key={t}
                    name="orderType"
                    value={t}
                    type="radio"
                    checked={orderType === t}
                    onChange={() => { setOrderType(t); answered(0); }}
                    Icon={Icon}
                  />
                ))}
              </Row>
            )}

            {step.id === 'people' && (
              <Row label="How many people?" Icon={Users}>
                {HEAD_COUNTS.map((h) => (
                  <Choice
                    key={h}
                    name="headCount"
                    value={h}
                    type="radio"
                    checked={headCount === h}
                    onChange={() => { setHeadCount(h); answered(1); }}
                  />
                ))}
              </Row>
            )}

            {step.id === 'products' && (
              <fieldset style={{ border: 0, margin: 0, padding: 0 }} aria-label="What are you after?">
                {/* `FieldLabel`, not a `<legend>`: a legend is forced to
                    `display: block` inside a fieldset in Chrome whatever the
                    style says, which put the icon on its own line and killed
                    the `margin-left: auto` holding the hint apart from the
                    question. The fieldset keeps the grouping; `aria-label`
                    keeps the name. */}
                <span className="bulk-picks__head">
                  <FieldLabel label="What are you after?" Icon={Donut} />
                  <span className="bulk-picks__hint">Choose as many as you like</span>
                </span>

                {/* The shop's own collection cards, as checkboxes. A grid, not
                    the shop's scrolling rail: nothing here is being filtered
                    down, so all six should be readable at once rather than
                    swiped past. */}
                <div className="bulk-picks">
                  {PRODUCTS.map(([pr, Icon]) => {
                    const face = bulkFace(pr);
                    const on = products.includes(pr);
                    return (
                      <label key={pr} className={`collection-card bulk-pick${on ? ' is-on' : ''}`}>
                        <input
                          type="checkbox"
                          name="products"
                          value={pr}
                          checked={on}
                          onChange={() => toggleProduct(pr)}
                          className="bulk-pick__input"
                        />
                        <span className="collection-card__bed">
                          {face ? (
                            <img src={face.img} alt="" loading="lazy" />
                          ) : (
                            <Icon size={26} strokeWidth={2.2} aria-hidden="true" />
                          )}
                        </span>
                        <span className="collection-card__text">
                          <span className="collection-card__name">{pr}</span>
                        </span>
                        {/* The tick is the state, drawn where the eye already
                            is once a card has been chosen. */}
                        <span className="bulk-pick__tick" aria-hidden="true">
                          <Check size={14} strokeWidth={3.2} />
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {step.id === 'fulfilment' && (
              <Row label="Delivery or pickup?" Icon={Truck}>
                {FULFILMENT.map(([f, Icon]) => (
                  <Choice
                    key={f}
                    name="fulfilment"
                    value={f}
                    type="radio"
                    checked={fulfilment === f}
                    onChange={() => { setFulfilment(f); answered(3); }}
                    Icon={Icon}
                  />
                ))}
              </Row>
            )}

            {step.id === 'date' && (
              <div>
                <FieldLabel label="When do you need it?" Icon={CalendarClock} />
                <BrandDatePicker value={date} min={minDate} onChange={setDate} ariaLabel="Choose the date for your bulk order" inline />

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
            )}

            {step.id === 'organization' && (
              <label className="bulk-field">
                <FieldLabel label="Organization or event" Icon={Building2} />
                <input value={organization} onChange={(e) => setOrganization(e.target.value)} style={field} autoComplete="organization" autoFocus />
              </label>
            )}

            {step.id === 'name' && (
              <label className="bulk-field">
                <FieldLabel label="Your name" Icon={UserRound} />
                <input value={name} onChange={(e) => setName(e.target.value)} style={field} autoComplete="name" autoFocus />
              </label>
            )}

            {step.id === 'email' && (
              <label className="bulk-field">
                <FieldLabel label="Email" Icon={Mail} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={field}
                  autoComplete="email"
                  autoFocus
                />
                <span className="bulk-field__note">This is where the quote goes.</span>
              </label>
            )}

            {step.id === 'phone' && (
              <label className="bulk-field">
                <FieldLabel label="Phone" Icon={Phone} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatNorthAmericanPhone(e.target.value))}
                  style={field}
                  autoComplete="tel"
                  autoFocus
                />
                <span className="bulk-field__note">Optional — only if a call would be quicker than an email.</span>
              </label>
            )}

            {step.id === 'notes' && (
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
            )}
          </div>
      </div>

      {/* Said in reply to a press, not in advance: the step's own question is
          the instruction, and a requirement stated before anyone has tried to
          leave is a telling-off for nothing. */}
      {/* Always rendered, so it holds its line whether or not it has something
          to say — see the note in index.css. */}
      <p role="alert" className="bulk-step__nudge">
        {nudged && !stepDone ? NUDGE[step.id] : ''}
      </p>

      {/* Back on the left, the way on at the right, facing each other across
          the row: the two directions out of a step, placed where each one
          goes. Both were stacked at the left before, which put the retreat
          first in the reading order and left the whole right half empty. */}
      <div className="bulk-nav">
        <span className="bulk-nav__backSlot">
          {stepIndex > 0 && (
            /* The site's standard back control — the same pill the product
               panel, the box builder and the bag all use. It was an underlined
               link here, which was a fourth way of saying "back" on a site that
               already has one. */
            <button type="button" className="cabinet__back bulk-nav__back" onClick={goBack}>
              <ArrowLeft size={18} strokeWidth={2.6} aria-hidden="true" />
              Back
            </button>
          )}
        </span>

        {lastStep ? (
          <BrandButton type="submit" className="bulk-nav__next" disabled={submitState === 'sending'}>
            {submitState === 'sending' ? 'Sending...' : 'Send the enquiry'}
          </BrandButton>
        ) : (
          <BrandButton type="button" onClick={goNext} className="bulk-nav__next">
            Next
          </BrandButton>
        )}
      </div>

      {/* Only on the last question. Sending is the end of the sequence, and a
          submit sitting under question one invites a half-answered enquiry the
          bakery then has to chase. The error line stays visible wherever the
          send failed from. */}
      {/* The send button lives in the nav row with Back — this is only what it
          promises, and whatever went wrong. */}
      {(lastStep || submitState === 'error') && (
        <span role="status" style={{ fontFamily: F.text, fontSize: 13.5, color: submitState === 'error' ? '#9d2424' : 'rgba(14,62,105,.7)' }}>
          {submitState === 'error' ? submitMessage : 'Your request goes directly to the bakery team for review.'}
        </span>
      )}

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
                margin: '18px 0 clamp(30px,3.6vw,52px)',
                maxWidth: '56ch',
                fontSize: 'var(--type-body)',
                lineHeight: 1.45,
                /* Left, like the heading above it. Centred, four lines of body
                   copy give the eye a new starting x on every line — fine for
                   a one-line strapline, tiring for a paragraph that is asking
                   the reader to supply a date, a guest count and a plan. */
                textAlign: 'left',
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
                Ten short questions, one at a time. Enough for us to prepare a clear quote and reply by email.
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
