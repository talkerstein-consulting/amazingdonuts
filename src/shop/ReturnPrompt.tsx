import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { PRODUCTS, type Product } from '../data/products';
import { BrandButton } from '../components/brand';
import { useShop, money } from '../lib/shop';
import { flyToCart } from '../lib/fly-to-cart';
import { useFulfillmentChoice, type FulfillmentPreference } from '../lib/fulfillment';
import { formatPickup, usePickup } from '../lib/pickup';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Written by `ShopProvider` every time a product panel opens. */
const LAST_KEY = 'amazing-last-product';
/** Once a visit, whatever they do next. */
const SHOWN_KEY = 'amazing-return-prompt-shown';

/**
 * What they were in the middle of, offered back as they leave.
 *
 * The bag first, and the last product only if the bag is empty. It used to
 * offer the last product either way, which meant somebody leaving with six
 * donuts in the bag was shown one donut they had glanced at — the smallest
 * thing on screen instead of the order they had spent five minutes building.
 * A bag is also the offer that needs no persuading: it is already theirs, and
 * the action is to finish rather than to start.
 *
 * Two triggers, because the two platforms leave differently:
 *
 *   - the pointer crossing out of the top of the window, which on a desktop is
 *     someone reaching for the tab strip, the address bar or the close button.
 *     Only upwards — a pointer leaving through the sides or the bottom is
 *     someone reaching for a scrollbar or another window, and treating that as
 *     an exit fires the prompt at people who never left;
 *   - the tab being hidden, which is the only signal a phone gives. They see it
 *     on return rather than on leaving, which is the more useful half anyway.
 *
 * Guard rails, because an exit prompt is the easiest thing on a site to make
 * hateful. It fires once per visit and never again; it needs either a bag or a
 * product actually browsed, so a first-time visitor who has done neither is
 * never interrupted; it waits out the first few seconds, so an accidental
 * pointer flick on arrival is not an exit; and it stands down while any other
 * panel is open, since a modal over a modal is a trap.
 */
const DWELL_MS = 8000;

/**
 * What the prompt says about getting the order, per how they said they wanted
 * it — the one thing this panel knows that a generic "come back" does not.
 *
 * Three states, and they are genuinely different sentences rather than one
 * sentence with a word swapped:
 *
 *   - nothing chosen. The useful thing to say is that both ways exist and
 *     neither has been committed to, because the commonest reason to leave a
 *     full bag at this point is not knowing whether the bakery can get it to
 *     you at all;
 *   - pickup, with a slot. Name the slot. It is the strongest line available:
 *     the order is not hypothetical, it has a time on it;
 *   - pickup, no slot yet. The slot is the missing step, so say so;
 *   - delivery. Say delivery, and be honest that the fee and the minimum are
 *     settled at checkout rather than implying either is nil. Quoting figures
 *     here would mean hardcoding numbers the server owns.
 *
 * The old copy said "order by 4pm and you can collect it tomorrow" in every
 * case, which told somebody who had chosen delivery to come and collect.
 */
function fulfillmentLine(
  choice: FulfillmentPreference | null,
  slot: string
): string {
  if (choice === 'delivery') {
    return 'Out for local delivery — the fee and minimum are confirmed at checkout.';
  }
  if (choice === 'pickup') {
    /* The slot label ends in its own period — "9:00 a.m. – 9:30 a.m." — so
       adding a full stop after it gives "9:30 a.m..". Only add one if the
       label has not already supplied it. */
    if (slot) return `Boxed and waiting for you ${slot}${slot.endsWith('.') ? '' : '.'}`;
    return 'Pickup is set — choose a collection time at checkout.';
  }
  return 'Collect it in store or have it delivered locally — you choose at checkout.';
}

export default function ReturnPrompt() {
  const { openProduct, openCart, add, lines, count, subtotal, product: openPanel, cartOpen } =
    useShop();
  const [saved, setSaved] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  /* How they said they wanted it, and the booked slot if there is one — the
     two things `fulfillmentLine` needs to say something specific. */
  const choice = useFulfillmentChoice();
  const pickup = usePickup();
  const slotLabel = formatPickup(pickup);
  /* Read once and held here, so the triggers below stay synchronous — they run
     on pointer and visibility events, which must not do storage work. */
  const armed = useRef(false);

  /* The bag wins whenever there is one. Read at fire time rather than captured
     on mount: somebody can add a donut during the dwell, and the prompt should
     offer what is in the bag when they leave, not what was in it eight seconds
     after they arrived. */
  const hasBag = lines.length > 0;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SHOWN_KEY)) return;
      const id = localStorage.getItem(LAST_KEY);
      setSaved(id ? PRODUCTS.find((p) => p.id === id) ?? null : null);
    } catch {
      /* No storage: the bag can still be offered, since that is React state. */
    }
    const timer = setTimeout(() => setReady(true), DWELL_MS);
    return () => clearTimeout(timer);
  }, []);

  /* Armed once the dwell is out AND there is something worth offering. Both
     are checked here rather than in the trigger so the trigger stays cheap. */
  useEffect(() => {
    let shown = false;
    try {
      shown = Boolean(sessionStorage.getItem(SHOWN_KEY));
    } catch {
      /* Treat unreadable storage as "not yet shown". */
    }
    armed.current = ready && !shown && (hasBag || Boolean(saved));
  }, [ready, hasBag, saved]);

  const fire = useCallback(() => {
    if (!armed.current) return;
    armed.current = false;
    try {
      sessionStorage.setItem(SHOWN_KEY, '1');
    } catch {
      /* Nothing to do — worst case it offers again next page. */
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    /* Anything else on screen wins. The panel and the bag are things the
       visitor opened; this is not. */
    if (openPanel || cartOpen) return;

    const onOut = (event: MouseEvent) => {
      // `relatedTarget` is null only when the pointer has left the document.
      if (event.clientY <= 0 && !event.relatedTarget) fire();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') fire();
    };

    document.addEventListener('mouseout', onOut);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [fire, openPanel, cartOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!hasBag && !saved) return null;

  /* Up to three thumbnails and a count for the rest: the picture is there to
     be recognised, not itemised — the bag itself lists everything, and it is
     one press away. */
  const shown = lines.slice(0, 3);
  const extra = count - shown.reduce((n, l) => n + l.qty, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="return-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="return-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-prompt-title"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.34, ease: EASE }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="return-prompt__close"
              aria-label="No thanks"
            >
              <X size={18} strokeWidth={2.6} />
            </button>

            <div className="return-prompt__bed" ref={cardRef}>
              {hasBag ? (
                /* The bag's own contents, overlapped like a handful rather than
                   laid out in a row: it is one thing — their order — not three
                   products to choose between. */
                <span className="return-prompt__stack">
                  {shown.map((line, i) => (
                    <img
                      key={line.product.id}
                      src={line.product.img}
                      alt=""
                      loading="lazy"
                      style={{ zIndex: shown.length - i }}
                    />
                  ))}
                  {extra > 0 && <span className="return-prompt__more">+{extra}</span>}
                </span>
              ) : (
                <img src={saved!.img} alt="" loading="lazy" />
              )}
            </div>

            <div className="return-prompt__body">
              <p className="return-prompt__eyebrow">Before you go</p>

              {hasBag ? (
                <>
                  <h2 id="return-prompt-title" className="return-prompt__title">
                    Your bag is still here
                  </h2>
                  <p className="return-prompt__copy">
                    {count} {count === 1 ? 'item' : 'items'}, {money(subtotal)}.{' '}
                    {fulfillmentLine(choice, slotLabel)}
                  </p>

                  <div className="return-prompt__actions">
                    {/* Straight to the bag rather than to checkout: the bag is
                        where the order is reviewed, and it has the checkout
                        button on it. Skipping it would be rushing somebody who
                        was already halfway out the door. */}
                    <BrandButton
                      onClick={() => {
                        setOpen(false);
                        openCart();
                      }}
                    >
                      Back to my bag
                    </BrandButton>
                    <button
                      type="button"
                      className="return-prompt__secondary"
                      onClick={() => setOpen(false)}
                    >
                      Keep looking
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 id="return-prompt-title" className="return-prompt__title">
                    Still thinking about the {saved!.name.toLowerCase()}?
                  </h2>
                  <p className="return-prompt__copy">
                    It is {saved!.price}, and it is still here.{' '}
                    {fulfillmentLine(choice, slotLabel)}
                  </p>

                  <div className="return-prompt__actions">
                    <BrandButton
                      onClick={() => {
                        add(saved!, 1, { openCart: false });
                        flyToCart(cardRef.current, saved!.img);
                        setOpen(false);
                      }}
                    >
                      Add to bag
                    </BrandButton>
                    <button
                      type="button"
                      className="return-prompt__secondary"
                      onClick={() => {
                        setOpen(false);
                        openProduct(saved!.id);
                      }}
                    >
                      Have another look
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
