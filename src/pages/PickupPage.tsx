import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Clock, Store } from 'lucide-react';
import '../index.css';
import '../components/brand/brand.css';
import '../shop/shop.css';
import './pickup.css';
import { BrandButton, SquircleDefs } from '../components/brand';
import BrandDatePicker from '../components/BrandDatePicker';
import { NavThemeProvider } from '../lib/nav-theme';
import { ShopProvider, useShop } from '../lib/shop';
import { initSmoothScroll } from '../lib/smooth-scroll';
import { SHOP_HREF } from '../lib/shop-href';
import { SHOP_ADDRESS } from '../lib/routes';
import {
  HOURS_SUMMARY,
  SLOT_MINUTES,
  firstOpenDate,
  isClosed,
  pickupSlots,
  readPickup,
  writePickup
} from '../lib/pickup';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthModal from '../shop/AuthModal';
import CartDrawer from '../shop/CartDrawer';
import ProductPanel from '../shop/ProductPanel';

/**
 * "When would you like to pick up?" — the gate the Pick up lane card opens.
 *
 * It sits between the homepage and the catalogue on purpose. Asking for the
 * slot first means the whole shop is browsed against a known collection time,
 * so the lead-time rules that used to surface at checkout (custom printing
 * needs a week) can be enforced while there is still time to change the order,
 * rather than after the box is full.
 *
 * The choice is stored, not submitted: there is no order yet, and nothing here
 * needs an account. Checkout re-asks and pre-fills from the same store, so a
 * visitor who lands there directly is never blocked by having skipped this.
 */
function Pickup() {
  /* Tomorrow at the earliest, and the first open day from there — the bakery
     does not take same-day pickups, which is the rule checkout already
     applies. Computed once: `new Date()` in a render body would give a
     different floor on every re-render. */
  const earliest = useMemo(() => firstOpenDate(new Date(Date.now() + 86400000)), []);

  /* A slot already chosen is the starting point, so arriving here from the
     header chip is an edit rather than a fresh choice. */
  const stored = useMemo(() => (typeof window === 'undefined' ? null : readPickup()), []);
  const [date, setDate] = useState(() => (stored && stored.date >= earliest ? stored.date : earliest));
  const [time, setTime] = useState(() => stored?.time ?? '');

  const slots = pickupSlots(date);

  /* A date change can leave the held time on a day that never had it — Sunday
     closes at 1pm, Monday runs to 4pm. Fall back to the first window rather
     than carrying an hour the counter is shut. */
  useEffect(() => {
    if (slots.length && !slots.some((slot) => slot.value === time)) setTime(slots[0].value);
  }, [slots, time]);

  const ready = Boolean(date && time && slots.some((slot) => slot.value === time));

  const start = () => {
    if (!ready) return;
    writePickup({ date, time });
    window.location.assign(SHOP_HREF);
  };

  return (
    <main className="pickup-page">
      <div className="pickup-card">
        <span className="pickup-eyebrow">
          <Store size={15} strokeWidth={2.4} aria-hidden="true" /> Pick up in store
        </span>

        <h1 className="pickup-title">When are you collecting?</h1>

        <p className="pickup-lede">
          Pick a day and a window and we will have the box boxed and waiting at{' '}
          {SHOP_ADDRESS.street}. You can change it any time before you check out.
        </p>

        <div className="pickup-fields">
          <label className="pickup-field">
            <span className="pickup-field__label">Date</span>
            <BrandDatePicker
              value={date}
              min={earliest}
              onChange={setDate}
              ariaLabel="Choose a pickup date"
              /* Saturday, and any other day the counter is shut, is not
                 selectable rather than selectable-then-rejected. */
              disabledDay={isClosed}
            />
          </label>

          <label className="pickup-field">
            <span className="pickup-field__label">Time window</span>
            <div className="pickup-select">
              <Clock size={17} strokeWidth={2.3} aria-hidden="true" />
              <select
                value={time}
                onChange={(event) => setTime(event.target.value)}
                disabled={!slots.length}
                aria-label="Choose a pickup time window"
              >
                {slots.length ? (
                  slots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))
                ) : (
                  <option value="">Closed that day</option>
                )}
              </select>
            </div>
          </label>
        </div>

        <p className="pickup-hours">
          {HOURS_SUMMARY} Windows are {SLOT_MINUTES} minutes long.
        </p>

        <BrandButton block onClick={start} disabled={!ready}>
          Order now
        </BrandButton>

        {/* An out, for someone who followed the card by mistake. The catalogue
            works perfectly well with no slot chosen. */}
        <a className="pickup-skip" href={SHOP_HREF}>
          Skip for now and just browse
        </a>
      </div>
    </main>
  );
}

/** The drawer and cart come along so the bar's box button still works here. */
function PickupBody() {
  const { product } = useShop();
  return (
    <>
      <Pickup />
      <AnimatePresence>{product && <ProductPanel key={product.id} product={product} />}</AnimatePresence>
    </>
  );
}

export default function PickupPage() {
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(initSmoothScroll, []);
  useEffect(() => {
    const requestSignIn = () => setAuthOpen(true);
    window.addEventListener('amazing:sign-in-requested', requestSignIn);
    return () => window.removeEventListener('amazing:sign-in-requested', requestSignIn);
  }, []);

  return (
    <NavThemeProvider>
      <ShopProvider>
        <SquircleDefs />
        <div style={{ background: 'var(--cream)', color: 'var(--navy)' }}>
          <Header onSignIn={() => setAuthOpen(true)} />
          <PickupBody />
          {/* `ready` is the homepage's preloader hand-off flag; there is no
              preloader here, so the footer is live from the first paint. */}
          <Footer ready />
        </div>
        <CartDrawer />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </ShopProvider>
    </NavThemeProvider>
  );
}
