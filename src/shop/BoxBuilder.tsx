import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Minus, Plus, Shuffle } from 'lucide-react';
import { PRODUCTS, INTERNAL_PRODUCT_IDS, type Product } from '../data/products';
import { BrandButton } from '../components/brand';
import { restoreScroll } from '../lib/smooth-scroll';
import { useIsDesktop } from '../hooks/useIsDesktop';
import {
  BOX_PRODUCTS,
  boxMaxFor,
  BULK_PACK_SIZES,
  isSpecialOrder,
  NOT_A_BOX_FLAVOUR
} from '../lib/custom-order';
import { useShop, money, priceOf } from '../lib/shop';
import { flyToCart } from '../lib/fly-to-cart';
import { useCutoutScale } from '../lib/cutout-scale';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The box, built donut by donut.
 *
 * A product page that is a tool rather than a description: the box on the left
 * fills as the steppers on the right are pressed, so the thing being bought is
 * assembled in front of the person buying it. The catalogue sells donuts by the
 * piece and the product panel's "Box size" control can already say six of one
 * thing — what it cannot say is six different things, which is what anyone
 * actually walks out of a bakery with.
 *
 * The size is settled before this page opens: there is a grid tile for the half
 * dozen and another for the dozen, so the tray is whichever product was
 * clicked. It used to be one product that accepted either, which meant the
 * builder had to teach a rule — six or twelve, nothing between — and refuse
 * every count in between while it did. Now the only thing to do here is fill
 * the tray that is already on screen.
 *
 * Full screen, not the drawer every other product page here uses. A drawer
 * leaves a strip of catalogue behind it, which is right for looking something
 * up and wrong for a task: this one has two halves that have to be watched at
 * once, and it took the panel's 88vw and then asked the picker to live in half
 * of that.
 *
 * Full screen stops at the header, though. It sits BELOW the navbar and the
 * pickup band in z-order and pads itself clear of them, so the bag, the
 * account and the booked collection time stay where they are on every other
 * page — a builder that hid the header made the bag it adds to unreachable and
 * dropped the appointment the visitor had already made out of sight.
 */

/**
 * The two trays, and where a donut sits in each.
 *
 * The lidless artwork, which is what a box being filled actually looks like:
 * the lidded files drew an open lid standing up behind the tray, and at the
 * size this page uses that spent a third of the picture on cardboard, above the
 * only part anyone is watching.
 *
 * Slots are read off the art rather than invented. Both files print their rings
 * at x 218/372/528(/682) and y 280/439(/598), and both wrap the whole drawing
 * in `translate(-68 -120)` — so the effective centre of a ring is 68 left and
 * 120 up from the printed number, and these are those results as percentages of
 * each file's own viewBox (609 x 481 and 764 x 640). Snapping to them is what
 * makes a donut look like it is IN a slot rather than floating over one.
 *
 * Filled in reading order, which is how a box is actually packed.
 */
const TRAYS = {
  6: {
    art: '/img/donut-box-6-nolid.svg',
    ratio: 609 / 481,
    slots: [
      { x: 24.63, y: 33.26 },
      { x: 49.92, y: 33.26 },
      { x: 75.53, y: 33.26 },
      { x: 24.63, y: 66.32 },
      { x: 49.92, y: 66.32 },
      { x: 75.53, y: 66.32 }
    ]
  },
  12: {
    art: '/img/donut-box-12-nolid.svg',
    ratio: 764 / 640,
    slots: [
      { x: 19.63, y: 25.0 },
      { x: 39.79, y: 25.0 },
      { x: 60.21, y: 25.0 },
      { x: 80.37, y: 25.0 },
      { x: 19.63, y: 49.84 },
      { x: 39.79, y: 49.84 },
      { x: 60.21, y: 49.84 },
      { x: 80.37, y: 49.84 },
      { x: 19.63, y: 74.69 },
      { x: 39.79, y: 74.69 },
      { x: 60.21, y: 74.69 },
      { x: 80.37, y: 74.69 }
    ]
  }
} as const;

/**
 * One donut's place in the tray.
 *
 * Its own component only so it can hold a hook: the cut-outs are framed
 * inconsistently — a round donut fills about half its file, a twist cluster
 * nearly two thirds — so six of them in equal boxes come out visibly different
 * sizes. `useCutoutScale` measures each file once and returns the factor that
 * brings them all to the same painted width, which is what six of the same
 * object in one box has to look like.
 *
 * The node stays mounted whether or not there is a donut in it, so one arriving
 * does not restart the whole tray's transitions.
 */
function BoxSlot({
  slot,
  donut
}: {
  slot: { x: number; y: number };
  donut: Product | undefined;
}) {
  const scale = useCutoutScale(donut?.img);

  return (
    <span
      className={`boxer__slot${donut ? ' is-filled' : ''}`}
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
    >
      {donut && (
        <img src={donut.img} alt="" style={{ transform: `scale(${scale})` }} />
      )}
    </span>
  );
}

export default function BoxBuilder({ product }: { product: Product }) {
  const { closeProduct, add, lines, products } = useShop();
  const counts = BOX_PRODUCTS.get(product.id) ?? [6, 12];
  const max = boxMaxFor(product.id);
  /* One id per donut, in the order they were added — the order IS the
     placement, so removing the third donut shuffles the rest forward and the
     box repacks itself the way a real one would.

     Seeded from the bag when this box is already in it. The drawer's Edit
     opens this screen, and opening it empty made Edit mean "start again": six
     flavours already chosen were thrown away by the act of going to look at
     them. Read once, in the initialiser — later changes to the line are this
     screen's own doing and must not reset what is being edited under the
     visitor's hands. */
  const [chosen, setChosen] = useState<string[]>(() => {
    const line = lines.find((l) => l.product.id === product.id);
    return line?.customization?.kind === 'box' ? [...line.customization.donuts] : [];
  });

  /* How far down the page furniture reaches. Measured rather than assumed: the
     navbar's height is a clamp and the pickup band is only there for a visitor
     who booked a slot, so the number is different on two otherwise identical
     screens. Re-read on resize, since the navbar's clamp is width-based. */
  const [chromeH, setChromeH] = useState(0);

  /* Where the page was when the builder was opened, so closing it puts the
     visitor back on the card they clicked rather than wherever the page has
     drifted to.

     It does drift: the builder is a fixed overlay and the body is never locked
     behind it, so Lenis keeps easing the page along under the surface as the
     flavour list is scrolled. Measured at 1374 on open and 1600 on close from
     one pass through a half dozen — a quarter of a screen, which on the
     homepage is enough to lose the card entirely. */
  const originScroll = useRef(0);
  useEffect(() => {
    originScroll.current = window.scrollY;
  }, []);

  /* Where "Pick for me" is rendered. Two columns means the heading row has a
     whole empty half beside it, and the shuffle reads better there — level
     with "Select 6 flavours", which is the instruction it is the shortcut for.
     Stacked there is no such room: the heading owns its line, so the button
     stays at the foot beside the total.

     One button either way rather than two hidden by media query — a second
     copy is a second thing in the tab order saying the same thing. */
  const isDesktop = useIsDesktop();

  /* The way out. Only Back calls it: adding a box leaves the builder open on a
     cleared tray, so leaving is always the visitor's own move. */
  const leave = () => {
    closeProduct();
    /* After the close, so the restore is not undone by whatever the surface's
       own teardown does to the scroll position on its way out. */
    requestAnimationFrame(() => restoreScroll(originScroll.current));
  };

  useEffect(() => {
    /* The pickup/delivery band is hidden for as long as the builder is open —
       see `.no-fulfillment-band` in index.css. It is page-level state about an order that
       has not been placed yet, and this surface covers the whole viewport: on a
       phone the band cost a line of the screen that the flavour list needed,
       and its own sentence was truncated in the strip it was reduced to.
       Nothing here changes it, and the shop it belongs to is one Back away.

       The class goes on before the measure below, so the header is the only
       chrome the padding has to clear. */
    document.body.classList.add('no-fulfillment-band');
    const measure = () => {
      const parts = ['header', '.pickup-banner']
        .map((sel) => document.querySelector(sel)?.getBoundingClientRect().bottom ?? 0)
        .filter((bottom) => bottom > 0);
      setChromeH(parts.length ? Math.max(...parts) : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      document.body.classList.remove('no-fulfillment-band');
      window.removeEventListener('resize', measure);
    };
  }, []);

  /* What can go in: single donuts at counter prices. The custom-printed dozen
     and the $75 letter cake are donuts by category and are not things that go
     into a box of flavours, and the price line is what separates them — the
     same $5 line the grid's Classic/Special filter draws.

     Use the live catalogue and the box's Square modifier choices, excluding
     internal rows and other boxes: a box is not a flavour.

     `NOT_A_BOX_FLAVOUR` and `BULK_PACK_SIZES` carry the two that every test above
     lets through — the made-to-order Customizable Donut, and petite donuts,
     which cannot be bought one at a time. See the note on that set.

     `isSpecialOrder` takes out the rest of the made-to-order lines, which the
     price test never could: the Star of David is a $3.00 donut like any other
     and sat in the list looking like one, but it is not on the shelf and a box
     containing it is not a box you collect. */
  const options = useMemo(
    () =>
      products.filter(
        (p) =>
          !INTERNAL_PRODUCT_IDS.has(p.id) && p.available !== false &&
          (product.boxFlavours === undefined || product.boxFlavours.includes(p.name)) &&
          p.category === 'Donuts' &&
          p.id !== product.id &&
          !BOX_PRODUCTS.has(p.id) &&
          !NOT_A_BOX_FLAVOUR.has(p.id) &&
          !isSpecialOrder(p.name) &&
          !BULK_PACK_SIZES.has(p.id) &&
          priceOf(p) > 0 &&
          priceOf(p) <= 5
      ),
    [product.id, product.boxFlavours, products]
  );

  /* The product decides the tray, so there is nothing to switch. */
  const tray = max > 6 ? TRAYS[12] : TRAYS[6];

  const countOf = (id: string) => chosen.filter((item) => item === id).length;
  const atMax = chosen.length >= max;
  /* A part-filled tray is not something the counter can pack, so the only
     buyable state is a full one. */
  const packable = product.available !== false && counts.includes(chosen.length) && chosen.every(id => options.some(option => option.id === id));
  const remaining = Math.max(0, max - chosen.length);

  const addOne = (id: string) =>
    setChosen((current) => (current.length >= max ? current : [...current, id]));

  const removeOne = (id: string) =>
    setChosen((current) => {
      /* The LAST of that donut, not the first: the box fills front to back, so
         taking one away should undo the most recent placement rather than
         reshuffling every donut behind it. */
      const at = current.lastIndexOf(id);
      return at === -1 ? current : [...current.slice(0, at), ...current.slice(at + 1)];
    });

  /* Fills the tray. */
  const pickForMe = () =>
    setChosen(
      Array.from(
        { length: max },
        () => options[Math.floor(Math.random() * options.length)]?.id ?? options[0].id
      )
    );

  const shuffleButton = (
    /* Underlined text, not a second knob. It is the way out of choosing rather
       than a rival to the purchase — and it is the answer to the one honest
       objection to a builder like this, which is that deciding six times is
       work. */
    <button type="button" className="boxer__shuffle" onClick={pickForMe} disabled={!options.length}>
      <Shuffle size={15} strokeWidth={2.6} aria-hidden="true" />
      Pick for me
    </button>
  );

  // Each tray's price is refreshed from its own Square catalog item.
  const price = priceOf(product);

  const addToBag = (event: React.MouseEvent<HTMLElement>) => {
    if (!packable) return;
    add(product, 1, { openCart: false, customization: { kind: 'box', donuts: chosen } });
    /* Geometry is read synchronously here, so the flight is already launched
       from the button's real position by the time the surface closes over it. */
    flyToCart(event.currentTarget, tray.art);
    /* Cleared, and the builder stays open on the empty tray. Closing it on the
       visitor's behalf takes the decision away from them — a second box is a
       normal thing to want, and the bag knob in the header has already caught
       the donut that just flew into it. Back is how you leave. */
    setChosen([]);
  };

  return (
    <motion.aside
      className="boxer"
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      /* Up from the bottom rather than in from the right: it covers the whole
         viewport, and a full-screen surface sliding sideways reads as the page
         itself being pushed off. */
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.34, ease: EASE }}
      style={{ paddingTop: chromeH }}
    >
      {/* The same back control the product panel uses — same pill, same word,
          same corner. This page had a bespoke one. */}
      <button type="button" onClick={leave} className="cabinet__back boxer__back">
        <ArrowLeft size={18} strokeWidth={2.6} aria-hidden="true" />
        Back
      </button>

      <div className="boxer__inner">
        {/* --- the box --- */}
        <div className="boxer__stage">
          <div className="boxer__art" style={{ aspectRatio: tray.ratio }}>
            <img src={tray.art} alt="An open donut box" className="boxer__box" />

            {/* One node per slot of the tray on screen. An empty slot is simply
                not painted — the nodes stay mounted so a donut arriving does
                not restart the whole row's transitions. */}
            {tray.slots.map((slot, i) => (
              <BoxSlot key={i} slot={slot} donut={PRODUCTS.find((p) => p.id === chosen[i])} />
            ))}
          </div>
        </div>

        {/* --- what goes in it --- */}
        {/* A list, not a grid of cards. Twenty donuts as tiles is the shop grid
            again, at a smaller size, inside the page you opened FROM the shop
            grid — and it made the one control that matters here, the stepper,
            the smallest thing on each card. A row puts the name, the price and
            the stepper on one line, so a donut is read and its count set
            without the eye leaving that line. */}
        <div className="boxer__picker">
          {/* The page's only heading, and it states what there is to do. The
              numbered orange discs that used to label the two halves are gone:
              two steps is not a sequence, and the box beside the list is not a
              step at all — it is the result. */}
          <div className="boxer__pickerHead">
            <div>
              <h1 className="boxer__heading">Select {max} flavours</h1>
              <p className="boxer__progress" aria-live="polite">
                {chosen.length} of {max} chosen
                {remaining > 0 && ` · ${remaining} to go`}
                {!packable && remaining === 0 && ' · Update unavailable flavours'}
              </p>
            </div>
            {isDesktop && shuffleButton}
          </div>

          <ul className="boxer__list">
            {options.map((donut) => {
              const count = countOf(donut.id);
              return (
                <li key={donut.id} className={`boxer__row${count ? ' is-in' : ''}`}>
                  {/* The row is the add. Twenty rows with the only live target
                      a 28px plus at the far right meant twenty precise taps to
                      fill a box of twelve; the whole row is a target now, and
                      the stepper stays for taking one back out and for anyone
                      who reaches for it. Stretched over the row with an
                      ::after rather than by wrapping it, so the stepper's own
                      buttons are not nested inside a button. */}
                  <button
                    type="button"
                    className="boxer__rowAdd"
                    onClick={() => addOne(donut.id)}
                    disabled={atMax}
                    aria-label={`Put one ${donut.name} in the box`}
                  />

                  <span className="boxer__rowBed">
                    <img src={donut.img} alt="" loading="lazy" />
                  </span>

                  <span className="boxer__rowText">
                    <strong>{donut.name}</strong>
                    <span>{donut.price}</span>
                  </span>

                  <span className="boxer__stepper" role="group" aria-label={`${donut.name} in the box`}>
                    <button
                      type="button"
                      onClick={() => removeOne(donut.id)}
                      disabled={!count}
                      aria-label={`Take out one ${donut.name}`}
                    >
                      <Minus size={14} strokeWidth={3} />
                    </button>
                    <span aria-live="off">{count}</span>
                    <button
                      type="button"
                      onClick={() => addOne(donut.id)}
                      disabled={atMax}
                      aria-label={`Put one ${donut.name} in the box`}
                    >
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Under the list, at every width. The price depends on how many are
              in, and what decides that is the list — so the total and the
              action belong at the end of it rather than in a panel beside the
              box, which is where they were and which meant looking away from
              the thing being changed to see what it now cost. */}
          <div className="boxer__foot">
            <p className="boxer__price">
              {money(price)} <span>for {max}</span>
            </p>

            <BrandButton
              className="boxer__add"
              onClick={addToBag}
              disabled={!packable}
              style={packable ? undefined : { opacity: 0.45, pointerEvents: 'none' }}
            >
              {packable ? 'Add to bag' : remaining > 0 ? `Choose ${remaining} more` : 'Update flavours'}
            </BrandButton>

            {!isDesktop && shuffleButton}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
