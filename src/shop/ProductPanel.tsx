import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  ChefHat,
  ChevronDown,
  Heart,
  Link2,
  FileImage,
  Minus,
  Plus,
  Share2,
  Truck,
  X
} from 'lucide-react';
import { SHOP_PRODUCTS, type Product } from '../data/products';
import { tagFor } from '../data/product-tags';
import { C, F, BadgeRow, BrandButton } from '../components/brand';
import { useShop, money, priceOf } from '../lib/shop';
import { PRINT_SPRINKLE_SWATCHES } from '../lib/petite-palette';
import {
  BOX_PRODUCTS,
  BULK_PACK_SIZES,
  GLYPH_PRODUCTS,
  imageDataUrl,
  minimumQuantityFor,
  FINISH_PRODUCTS,
  PRINT_PRODUCTS,
  type Artwork,
  type Customization
} from '../lib/custom-order';
import FinishPicker, { EMPTY_FINISH, type Finish } from './FinishPicker';
import BoxBuilder from './BoxBuilder';
import { flyManyToCart, flyToCart } from '../lib/fly-to-cart';
import { readRecentlyViewed } from '../lib/recently-viewed';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* What the letter cake can be cut as. Explicit lists rather than a char range,
   so a shape the bakery cannot make is removed by deleting it from one. */
type GlyphMode = 'number' | 'letter';
const NUMBERS = '0123456789'.split('');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Pieces sold singly can be bought by the box; a made-up pack has its own price. */
const PACKS = [
  { id: 'single', label: 'Single', pieces: 1, note: 'One piece' },
  { id: 'half', label: 'Half dozen', pieces: 6, note: '6 pieces' },
  { id: 'dozen', label: 'Dozen', pieces: 12, note: '12 pieces' }
] as const;

/**
 * Two claims the bakery can stand behind on any given day.
 *
 * Neither of these used to be. "Prepared this morning / Every order is
 * prepared the day you collect it" described a daily bake, and the bakery does
 * not run one — it produces to demand, weekly in slow stretches. On a product
 * page that is an advertised freshness guarantee nobody can honour, which is
 * the kind of sentence a customer quotes back at you. It says who makes it and
 * where instead, which is true every day of the week.
 *
 * "Same-day pickup" was wrong for a plainer reason: checkout refuses same-day.
 * The earliest slot the counter offers is tomorrow — see `PickupBanner` — so
 * the product page was promising a collection time the order form declines.
 */
const REASSURANCE = [
  { Icon: ChefHat, title: 'Made in our own kitchen', body: 'Mixed, proofed and finished by hand in Toronto.' },
  { Icon: Truck, title: 'Pickup or delivery', body: 'Next-day pickup, or local delivery to your door.' }
];

/**
 * The product page, on the ecommerce-1 frame — its big media pane, thumbnail
 * rail and stacked info cards — delivered as a cabinet slide over whatever it
 * was opened from.
 *
 * ecommerce-1 shows six views of one product and a thumbnail rail to pick
 * between them. The rail here is driven by `secondary` in `products.ts`, and
 * it appears only for products that have a second view — never as crops of the
 * one photograph, which is three thumbnails of a picture you can already see.
 *
 * Every catalogue product but the round challah has two: the cut-out on
 * transparency the grid uses, and the studio original on its white ground. The
 * white-ground shots are photographs of a whole object rather than a shape to
 * float on the pane, so they fill the frame (`--photo`) instead of sitting
 * inside its padding.
 */
/**
 * The cabinet proper. Not the default export: a box the visitor fills is a
 * different page with the same job, and which one opens is decided below.
 */
function Cabinet({ product }: { product: Product }) {
  const { closeProduct, openProduct, add, wishlist, toggleWishlist } = useShop();
  const [qty, setQty] = useState(1);
  const [pack, setPack] = useState<(typeof PACKS)[number]['id']>('single');
  const [openSection, setOpenSection] = useState<'details' | 'allergens' | 'delivery' | ''>('details');
  /* One character, and which list it came from. Only meaningful for the letter
     and number cake — see `isGlyph`. */
  const [glyphMode, setGlyphMode] = useState<GlyphMode>('number');
  const [glyph, setGlyph] = useState('1');
  /* The petite tray's finish, and the colours it asks for. Only meaningful for
     a bulk-only product - see `bulkMinimum`. */
  /* The finish, as the two answers it now is — see `FinishPicker`. */
  const [finish, setFinish] = useState<Finish>(EMPTY_FINISH);
  /* The printed dozen's spec: what the print is laid onto, what goes over it,
     and the artwork itself. Only meaningful for a print product — see
     `isPrint`. It lives here rather than on the cart line, like every other
     product's choices: a required field on a bag row asks the question after
     the sale, and this one can fail — a file too big, a design that covers
     more dozens than were ordered — which is not something to discover in a
     checkout. */
  const [printIcing, setPrintIcing] = useState<'' | 'Chocolate' | 'Vanilla'>('');
  const [printSprinkle, setPrintSprinkle] = useState('');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artError, setArtError] = useState('');
  const saved = wishlist.includes(product.id);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  /* The buy bar shows exactly when the real CTA is not on screen.
     Measured before this existed: on a phone the inline "Add to the box" sat
     187px below the fold (bottom at 999 in an 812 viewport), because the single
     column stacks the 4:5 media pane above the info cards. On a wide window it
     is already visible at 615-673, so a bar there would be a duplicate of a
     button you can see.
     Hence an observer rather than a width media query: a 1440x600 window is
     wide enough to keep the two-column layout and still short enough to push
     the CTA under, and a breakpoint would miss that. */
  const cabRef = useRef<HTMLElement | null>(null);
  const addRef = useRef<HTMLDivElement | null>(null);
  /* Where each add's flight starts. The photograph for the two buttons that
     buy the product on show, and the strip itself for the bundle. */
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const bundleRef = useRef<HTMLElement | null>(null);
  const [ctaOnScreen, setCtaOnScreen] = useState(true);

  /* Which view of the product is on the pane. `views[0]` is always the
     catalogue cut-out, so index 0 is the state every product starts in and the
     only state a product without a `secondary` list can be in. */
  const views = useMemo(() => [product.img, ...(product.secondary ?? [])], [product]);
  const [view, setView] = useState(0);
  /* Reset with the product: the cabinet is reused across products, so view 1
     of a donut would otherwise carry into the next one — which has its own
     second photograph, or none at all. */
  useEffect(() => setView(0), [product.id]);
  const shown = views[view] ?? product.img;

  /* A new product opens at the top of the panel. The cabinet is one scroll
     container reused across products, so without this, picking something from
     "Goes well with" kept the previous product's scroll position and dropped
     you into the middle of the new one — measured at 700px down, well past the
     photograph and the price. */
  useEffect(() => {
    cabRef.current?.scrollTo({ top: 0 });
  }, [product.id]);

  useEffect(() => {
    const el = addRef.current;
    const root = cabRef.current;
    if (!el || !root) return;
    /* Root is the cabinet, not the viewport: the cabinet is its own scroll
       container, so "off screen" here means scrolled out of the panel. */
    const io = new IntersectionObserver(([entry]) => setCtaOnScreen(entry.isIntersecting), {
      root,
      threshold: 0
    });
    io.observe(el);
    return () => io.disconnect();
  }, [product.id]);

  const unit = priceOf(product);
  const requiresPrintLeadTime = PRINT_PRODUCTS.has(product.id);
  const isGlyph = GLYPH_PRODUCTS.has(product.id);
  /* Bulk-only, and the smallest order it takes. Petite donuts are priced per
     donut with a 75 minimum, so the stepper counts donuts and simply starts
     there — see `BULK_PACK_SIZES`. How many donuts are in one pack, or
     undefined for everything that is not sold in packs. */
  const packSize = BULK_PACK_SIZES.get(product.id);
  /* Finished to order — the petite tray and the Customizable Donut ask the
     same two questions. Neither has a default: "no sprinkles" is a real answer
     the kitchen needs told, and an unanswered question is not the same thing. */
  const isFinish = FINISH_PRODUCTS.has(product.id);
  const petiteReady = !isFinish || (Boolean(finish.icingId) && Boolean(finish.sprinkleId));

  /* The printed dozen, and whether it is answered.

     `assigned` is how many of the ordered dozens the uploaded designs account
     for. A design covers up to four dozen — the bakery's own limit on one print
     run — so several designs split one order, and the line is only ready when
     every dozen has a design against it. Sprinkles are the one optional answer:
     the print is the decoration, so "No sprinkles" is a choice rather than a
     blank. */
  const isPrint = PRINT_PRODUCTS.has(product.id);
  const printSprinkleChoice = PRINT_SPRINKLE_SWATCHES.find((sw) => sw.id === printSprinkle);
  const assigned = artworks.reduce((sum, art) => sum + art.count, 0);
  const remaining = Math.max(0, qty - assigned);
  const printReady =
    !isPrint || (Boolean(printIcing) && Boolean(printSprinkleChoice) && artworks.length > 0 && remaining === 0);
  /* A cake with no shape is not an order. The gate was missing entirely: the
     glyph starts empty and nothing required one, so an ordinary add put a line
     in the bag that `customizationComplete` rejects — and checkout then refused
     to proceed over an item whose question had never been asked out loud. */
  const glyphReady = !isGlyph || glyph.trim().length > 0;

  /* Every gate behind one name, so the two add buttons and the label they share
     each ask one question. */
  const ready = petiteReady && printReady && glyphReady;

  const addArtwork = async (file?: File) => {
    if (!file) return;
    setArtError('');
    try {
      const dataUrl = await imageDataUrl(file);
      setArtworks((list) => [
        ...list,
        { key: crypto.randomUUID(), name: file.name, dataUrl, count: Math.min(4, remaining) }
      ]);
    } catch (error) {
      setArtError(error instanceof Error ? error.message : 'That file could not be read.');
    }
  };
  const setArtworkCount = (key: string, next: number) =>
    setArtworks((list) =>
      list.map((art) =>
        art.key === key ? { ...art, count: Math.max(1, Math.min(4, art.count + remaining, next || 1)) } : art
      )
    );
  const removeArtwork = (key: string) => setArtworks((list) => list.filter((art) => art.key !== key));

  /* The chosen character, written onto the line as the `glyph` customization
     checkout already sends the bakery. Called from both add buttons, so the
     shape travels whichever one is pressed. */
  const addToBag = () => {
    if (!ready) return;
    /* The spec goes in WITH the line, not onto it afterwards. Two steps worked
       for as long as a product could only be one row: `add` merged into the
       existing line, then `customize` wrote the answer over it. Spelling a
       word broke both halves — every letter merged into the first letter's row
       and then overwrote its character, so "OMG" was one cake reading "G".
       Passed here, the character is part of what `add` matches on, so each
       letter is its own row. See `lineKeyOf`. */
    const spec: Customization | undefined = isPrint
      ? {
          kind: 'print',
          icingFlavour: printIcing,
          sprinkleId: printSprinkle,
          /* The mix's own name, which is what the counter reads; the id is how
             the bag line finds its swatch again to draw the dots. */
          sprinkleColours: printSprinkleChoice?.name ?? '',
          artworks
        }
      : isGlyph
        ? { kind: 'glyph', glyph }
        : isFinish
          ? finish
          : undefined;
    /* Never opens the bag. The flying donut is the confirmation, and a drawer
       over the picker is what made spelling a word out of single letters
       unusable. */
    add(product, pieces * qty, { openCart: false, customization: spec });
    setAdded(true);
  };

  const minimumQuantity = minimumQuantityFor(product.id);
  // A boxed item is already a set quantity; only by-the-piece stock takes packs.
  /* A bulk line has no box size. Petite donuts are cheap enough per unit to
     look like a by-the-piece product, but they are sold by the donut against a
     75 minimum — a Single / Half dozen / Dozen pair on that card offers a
     choice the order cannot honour, and contradicts the "75 minimum · bulk
     order" sitting directly under it. */
  const byThePiece = unit > 0 && unit < 10 && !packSize;
  const pieces = byThePiece ? PACKS.find((p) => p.id === pack)!.pieces : 1;

  // A fresh product resets the picker — carrying a dozen over is never intended.
  useEffect(() => {
    setQty(minimumQuantityFor(product.id));
    setPack('single');
    setAdded(false);
    /* The cabinet is one component reused across products, so a previous
       print's designs and colours would otherwise follow you onto the next
       one. */
    setPrintIcing('');
    setPrintSprinkle('');
    setArtworks([]);
    setArtError('');
  }, [product.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeProduct();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeProduct]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(t);
  }, [added]);

  /**
   * The two things to buy with this one.
   *
   * There is no order history to mine, so "frequently" is inferred from what
   * the bakery already says moves: the hand-set Best Seller and Popular tags,
   * which are the same ranking the grid's "Most popular" sort uses. Anything
   * untagged is not a candidate — a bundle of three arbitrary items is not a
   * recommendation, it is filler.
   *
   * Two constraints beyond the ranking, and both are what make the strip an
   * add-on rather than three separate purchases stapled together:
   *
   *   - a different counter from the product being viewed, so the bundle is a
   *     donut and a challah rather than three donuts the visitor is already
   *     choosing between;
   *   - under $10, so the total stays an impulse. The $75 letter cake is a
   *     best seller and belongs nowhere near an "add all three" button.
   *
   * If real basket data ever lands, this becomes a lookup and the heuristic
   * goes — the section's copy is already honest either way.
   */
  const bundle = useMemo(() => {
    const rank = (p: Product) => {
      const tag = tagFor(p.id);
      return tag === 'seller' ? 0 : tag === 'popular' ? 1 : 2;
    };
    return SHOP_PRODUCTS.filter(
      (p) => p.category !== product.category && priceOf(p) > 0 && priceOf(p) < 10 && rank(p) < 2
    )
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 2);
  }, [product]);

  /**
   * What this visitor looked at before this, most recent first.
   *
   * Snapshotted once per product rather than read live. The shop context
   * records a view the moment the panel opens (see `recordProductView`), so a
   * live read would put the product you are looking at at the top of its own
   * "recently viewed" and reshuffle the row underneath you as you moved from
   * one recommendation to the next. Keyed on `product.id`, the row is the
   * history as it stood when you arrived — which is what the words mean.
   *
   * The current product is filtered out regardless of that ordering, so it
   * does not matter whether the write lands before or after this read.
   *
   * Resolved against `SHOP_PRODUCTS` at render: an id whose product has since
   * left the catalogue drops out rather than rendering a hole. Four, to match
   * the row above it.
   */
  const recentlyViewed = useMemo(() => {
    const byId = new Map(SHOP_PRODUCTS.map((p) => [p.id, p]));
    return readRecentlyViewed()
      .filter((id) => id !== product.id)
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, 4);
    /* `product.id`, not `product`: a re-priced catalogue replaces the object
       every time Square answers, and re-snapshotting on that would undo the
       whole point of taking a snapshot. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Something from a different counter, and never one of the two already shown
  // in the bundle directly above it.
  const pairsWith = useMemo(() => {
    const inBundle = new Set(bundle.map((p) => p.id));
    return SHOP_PRODUCTS.filter((p) => p.category !== product.category && !inBundle.has(p.id)).slice(0, 4);
  }, [product, bundle]);

  const bundleTotal = unit + bundle.reduce((n, p) => n + priceOf(p), 0);

  const addBundle = () => {
    add(product, pieces * qty, { openCart: false });
    bundle.forEach((p) => add(p, minimumQuantityFor(p.id), { openCart: false }));
    setAdded(true);
    /* Three donuts, staggered — one per thing that just went in. Fired on the
       same frame they would be three copies on one arc landing as a single
       thick-outlined donut, which is why `flyManyToCart` spaces them. */
    flyManyToCart(bundleRef.current, [product, ...bundle].map((p) => p.img));
  };

  const total = unit * pieces * qty;

  /* Signed out, `toggleWishlist` raises the sign-in modal rather than saving —
     see `lib/shop`. Signed in, it writes through to the account's wishlist. The
     catch is not optional: the call reaches the network, and a bare `void` on a
     rejected promise is an unhandled rejection in the console. */
  const saveToggle = () => {
    void toggleWishlist(product.id).catch(() => {});
  };

  /* The product's own deep link — the hash route the panel is opened by, so
     what gets shared reopens on this product rather than on the catalogue. */
  const shareUrl =
    typeof window === 'undefined' ? '' : `${window.location.origin}/shop/#product/${product.id}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  /* The platform's share sheet where there is one, and the clipboard where
     there is not. `navigator.share` rejects on dismissal as well as on failure,
     which is not an error worth reporting — a visitor who closed the sheet has
     not had anything go wrong. */
  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: product.name, url: shareUrl });
        return;
      } catch {
        return;
      }
    }
    await copyLink();
  };

  return (
    <>
      {/* Clicking off the cabinet closes it, matching the box's scrim and the
          Escape key above. Its own element rather than a handler on the page,
          so the dimming and the hit area are the same thing. */}
      <motion.div
        className="cabinet-scrim"
        onClick={closeProduct}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.42, ease: EASE }}
      />

    <motion.aside
      ref={cabRef}
      className="cabinet"
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.42, ease: EASE }}
    >
      <div className="cabinet__inner">
        {/* --- media pane --- */}
        <div className="cabinet__media" ref={mediaRef}>
          {/* Share, on the media's own corner. The favourite is not here — it
              belongs beside the buy action, which is where it is; these three
              send the product to someone else, which is a different job from
              keeping it for yourself. */}
          {/* One share button, not a row of named networks.

              It was Facebook, Instagram and WhatsApp side by side. Naming
              platforms dates: Facebook is Meta's now, the set is wrong the day
              the bakery cares about a fourth one, and on a phone all three were
              a worse version of the sheet the operating system already draws —
              which lists every app the visitor actually has, in their order,
              including the ones we would never have thought to hard-code.

              So: the platform's share sheet where there is one, and a copied
              link where there is not. Desktop Safari and Chrome both have
              `navigator.share` now; the clipboard is the fallback, and it says
              so by turning into a tick. */}
          <div className="cabinet__mediaTools">
            <button
              type="button"
              onClick={shareNative}
              aria-label={`Share ${product.name}`}
              className="cabinet__iconBtn"
            >
              {copied ? <Check size={18} strokeWidth={2.6} /> : <Share2 size={18} strokeWidth={2.2} />}
            </button>

            <button type="button" onClick={copyLink} aria-label="Copy link to this product" className="cabinet__iconBtn">
              {copied ? <Check size={17} strokeWidth={2.6} /> : <Link2 size={17} strokeWidth={2.4} />}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.img
              /* Keyed on the product, not the view: the crossfade belongs to
                 arriving at a new product. A thumbnail is a tap on a control
                 the visitor is looking at, and `mode="wait"` would make it sit
                 through an exit before the picture it asked for appeared. The
                 src swap is immediate. */
              key={product.id}
              src={shown}
              alt={product.name}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.36, ease: EASE }}
              className={`cabinet__hero${view === 0 ? '' : ' cabinet__hero--photo'}`}
            />
          </AnimatePresence>

          {/* One view is not a choice, so the rail is absent rather than
              disabled for products with a single photograph. */}
          {views.length > 1 && (
            <div className="cabinet__rail" role="tablist" aria-label={`${product.name} photographs`}>
              {views.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  role="tab"
                  aria-selected={index === view}
                  aria-label={`View ${index + 1} of ${views.length}`}
                  className={`cabinet__thumb${index === view ? ' is-active' : ''}`}
                  onClick={() => setView(index)}
                >
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* --- info column --- */}
        <div className="cabinet__info">
          <div className="cabinet__card">
            <nav className="cabinet__crumbs" aria-label="Breadcrumb">
              <span>Shop</span>
              <span aria-hidden="true">/</span>
              <span>{product.category}</span>
            </nav>

            <h2
              style={{
                margin: '10px 0 0',
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: 'clamp(var(--fs-swatch), 3.4vw, var(--fs-h2alt))',
                lineHeight: 0.95,
                textTransform: 'uppercase',
                color: C.navy
              }}
            >
              {product.name}
            </h2>

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <p style={{ margin: 0, fontFamily: F.text, fontWeight: 700, fontSize: 22, color: C.price }}>
                {product.price}
              </p>
              <span style={{ fontFamily: F.text, fontSize: 14, color: C.mute }}>
                {packSize ? `per ${packSize}` : byThePiece ? 'per piece' : 'per box'}
              </span>
            </div>

            <p style={{ margin: '14px 0 0', fontFamily: F.text, fontSize: 15, lineHeight: 1.55, color: C.body }}>
              Prepared and finished in our own kitchen, and sold{' '}
              {packSize
                ? `in packs of ${packSize}, at $${(unit / packSize).toFixed(2)} a donut`
                : byThePiece
                  ? 'by the piece'
                  : 'as a box'}
              .
            </p>

            <div style={{ marginTop: 18 }}>
              <BadgeRow badges={['nut', 'dairy', 'sesame']} gap={8} />
            </div>
          </div>

          {/* pack size, quantity + add */}
          <div className="cabinet__card">
            {/* The shape, for the letter and number cake. One character, from
                a list of what the bakery can actually cut — it used to be a
                120-character textarea on the cart line, which asked the
                question after the sale and accepted things nobody can bake.

                Built out of the panel's own controls: the same segmented pair
                the box size uses, and a select. It sits above Box size because
                on this product there is no box size — the cake is a single
                item — so it is the first choice to make. */}
            {/* How this donut is finished: one icing, one sprinkle answer.

                It used to be a single "Donut type" — Sprinkle, Glazed, or
                Coloured icing — which forced two icings and a topping through
                one control, so a coloured icing WITH sprinkles could not be
                ordered at all. Asked separately they compose. Same component
                as the bag drawer's editor and the checkout page's rescue, so
                the three cannot drift. */}
            {isFinish && (
              <div className="cabinet__spec">
                <FinishPicker value={finish} onChange={setFinish} units={packSize ? packSize * qty : undefined} />
              </div>
            )}

            {/* The printed dozen, answered here rather than on the cart line.

                Every other product on this panel is specified before it is
                bought — the box is filled, the cake's shape is cut, the petite
                tray's colours are picked — and this one was the exception:
                icing, sprinkles and the artwork were all asked for on the bag
                row, after the sale. Which meant the one choice that can
                actually fail (a file that will not read, designs covering more
                dozens than were ordered) failed in the checkout.

                Same controls as the petite tray, for the same reason: the two
                icings the bakery prints onto as a segmented pair, and the lab's
                own sprinkle mixes as swatches. */}
            {isPrint && (
              <div className="cabinet__spec">
                <span className="cabinet__label">Icing</span>
                <div className="cabinet__packs" role="radiogroup" aria-label="Icing">
                  {(['Chocolate', 'Vanilla'] as const).map((flavour) => (
                    <button
                      key={flavour}
                      type="button"
                      role="radio"
                      aria-checked={printIcing === flavour}
                      onClick={() => setPrintIcing(flavour)}
                      className={`cabinet__pack${printIcing === flavour ? ' is-on' : ''}`}
                    >
                      <strong>{flavour}</strong>
                    </button>
                  ))}
                </div>

                {/* "No sprinkles" is on this list on purpose. The print is the
                    decoration, so declining sprinkles is a real answer — and
                    one worth making out loud rather than by leaving a field
                    blank and hoping the counter reads it the same way. */}
                <div className="cabinet__swatches">
                  <span className="cabinet__label">Which sprinkles?</span>
                  <div role="radiogroup" aria-label="Which sprinkles">
                    {PRINT_SPRINKLE_SWATCHES.map((sw) => (
                      <button
                        key={sw.id}
                        type="button"
                        role="radio"
                        aria-checked={printSprinkle === sw.id}
                        title={sw.name}
                        onClick={() => setPrintSprinkle(sw.id)}
                        className={`cabinet__swatch${printSprinkle === sw.id ? ' is-on' : ''}`}
                      >
                        <span aria-hidden="true">
                          {sw.dots.map((dot, i) => (
                            <i key={i} style={{ background: dot }} />
                          ))}
                        </span>
                        {sw.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* The artwork, and how much of the order each design covers.
                    One design prints up to four dozen, so a larger order is
                    several designs — and the count beside the label is what
                    says whether the order is accounted for yet. */}
                <div className="cabinet__art">
                  <span className="cabinet__label">
                    Print artwork
                    <span className="cabinet__trayCount">
                      {assigned}/{qty} dozen assigned
                    </span>
                  </span>

                  {artworks.map((art, index) => (
                    <div className="cabinet__artRow" key={art.key}>
                      <img src={art.dataUrl} alt="" />
                      <span className="cabinet__artName">
                        <strong>Design {index + 1}</strong>
                        <small>{art.name}</small>
                      </span>
                      <label className="cabinet__artCount">
                        <span>Dozens</span>
                        <input
                          type="number"
                          min={1}
                          max={Math.min(4, art.count + remaining)}
                          value={art.count}
                          onChange={(event) => setArtworkCount(art.key, Number(event.target.value))}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeArtwork(art.key)}
                        aria-label={`Remove ${art.name}`}
                      >
                        <X size={16} strokeWidth={2.6} />
                      </button>
                    </div>
                  ))}

                  {remaining > 0 && (
                    <label className="cabinet__artDrop">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          void addArtwork(event.target.files?.[0]);
                          event.currentTarget.value = '';
                        }}
                      />
                      <FileImage size={20} strokeWidth={2.2} />
                      <span>
                        <strong>{artworks.length ? 'Add another design' : 'Choose print file'}</strong>
                        <small>
                          This design covers {Math.min(4, remaining)} dozen
                          {Math.min(4, remaining) === 1 ? '' : 's'}
                        </small>
                      </span>
                      <Plus size={18} strokeWidth={2.6} />
                    </label>
                  )}

                  {remaining === 0 && artworks.length > 0 && (
                    <small className="cabinet__artReady">All {qty} dozen are covered.</small>
                  )}
                  {artError && <small className="cabinet__artError">{artError}</small>}
                </div>
              </div>
            )}

            {isGlyph && (
              <div className="cabinet__spec">
                <span className="cabinet__label">Cut as</span>
                <div className="cabinet__packs" role="radiogroup" aria-label="Letter or number">
                  {(['number', 'letter'] as GlyphMode[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={glyphMode === option}
                      onClick={() => {
                        setGlyphMode(option);
                        /* A "2" is not a letter: switching kind has to move the
                           value onto the new list, or the select shows an
                           option it does not offer. */
                        setGlyph(option === 'number' ? '1' : 'A');
                      }}
                      className={`cabinet__pack${glyphMode === option ? ' is-on' : ''}`}
                    >
                      <strong>{option === 'number' ? 'Number' : 'Letter'}</strong>
                    </button>
                  ))}
                </div>

                <div className="cabinet__glyphPick">
                  <select
                    aria-label={glyphMode === 'number' ? 'Which number' : 'Which letter'}
                    value={glyph}
                    onChange={(event) => setGlyph(event.target.value)}
                  >
                    {(glyphMode === 'number' ? NUMBERS : LETTERS).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span aria-hidden="true">{glyph}</span>
                </div>
              </div>
            )}

            {byThePiece && (
              <div style={{ marginBottom: 20 }}>
                <span className="cabinet__label">Box size</span>
                <div className="cabinet__packs" role="radiogroup" aria-label="Box size">
                  {PACKS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={pack === p.id}
                      onClick={() => setPack(p.id)}
                      className={`cabinet__pack${pack === p.id ? ' is-on' : ''}`}
                    >
                      <strong>{p.label}</strong>
                      <span>{money(unit * p.pieces)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* A fixed tray keeps the stepper — one tray or two is a real
                choice — and states how many donuts are in one beside the label,
                so the count is never mistaken for the quantity. The tray's own
                75 used to seed the quantity, which put a single tray in the bag
                as 75 lines at the tray price. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span className="cabinet__label" style={{ marginBottom: 0 }}>
                {packSize ? 'Packs' : 'Quantity'}
                {packSize && (
                  <span className="cabinet__trayCount">{packSize} donuts each · bulk order</span>
                )}
              </span>
              <div className="cabinet__stepper">
                <button type="button" disabled={qty<=minimumQuantity} onClick={() => setQty((q) => Math.max(minimumQuantity, q - 1))} aria-label="One fewer">
                  <Minus size={16} strokeWidth={2.6} />
                </button>
                <span aria-live="polite">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="One more">
                  <Plus size={16} strokeWidth={2.6} />
                </button>
              </div>
            </div>

            {/* The same pair as the sticky bar, in the same order. The bar is
                only on screen while this button is not, so without a heart
                here the favourite would be unreachable on any window tall
                enough to keep the CTA in view — which is most of them. Add is
                already duplicated between the two for exactly this reason. */}
            <div ref={addRef} className="cabinet__addAnchor">
              <button
                type="button"
                onClick={saveToggle}
                aria-pressed={saved}
                aria-label={saved ? 'Saved to favourites' : 'Save to favourites'}
                className={`cabinet__save${saved ? ' is-on' : ''}`}
              >
                <Heart size={19} strokeWidth={2.4} fill={saved ? 'currentColor' : 'none'} />
              </button>

              <BrandButton
                block
                className="cabinet__brandAdd"
                style={
                  added
                    ? { background: C.navy }
                    : ready
                      ? undefined
                      : { opacity: 0.45, pointerEvents: 'none' }
                }
                onClick={() => {
                  addToBag();
                  flyToCart(mediaRef.current, product.img);
                }}
              >
                {added ? (
                  <>
                    <Check size={18} strokeWidth={3} />
                    Added to bag
                  </>
                ) : !ready ? (
                  <>{isPrint ? 'Finish your design' : 'Choose your colours'}</>
                ) : (
                  /* No price on the knob. It is the third place the same
                     number appears on this card — the price is at the top and
                     the piece count is in the fine print below — and at a
                     dozen of anything the label wrapped to two lines, which
                     changed the button's height as the quantity changed. */
                  <>Add to bag</>
                )}
              </BrandButton>
            </div>

            <p className="cabinet__fineprint">
              {requiresPrintLeadTime
                ? `${qty} dozen units · one week's notice required`
                : packSize
                  /* The listing's own condition, verbatim in substance: this
                     size is only sold in bulk. It said nothing about a lead
                     time, so nothing here claims one. */
                  ? `${qty * packSize} donuts · this size is bulk order only`
                  : `${pieces * qty} ${pieces * qty === 1 ? 'piece' : 'pieces'} · order by 4pm for next-day collection`}
            </p>
          </div>

          {/* reassurance strip */}
          <div className="cabinet__card cabinet__card--flush">
            <ul className="cabinet__promises">
              {REASSURANCE.map(({ Icon, title, body }) => (
                <li key={title}>
                  <Icon size={18} strokeWidth={2.2} />
                  <div>
                    <strong>{title}</strong>
                    <span>{requiresPrintLeadTime && title === 'Pickup or delivery' ? "Please allow a minimum of one week's notice." : body}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* collapsible sections, as the block has them */}
          {(
            [
              {
                id: 'details',
                title: 'Details',
                body: `${product.name} is mixed, proofed and finished by hand in our own kitchen. Best eaten the day you collect it; keep it in the box, out of the fridge.`
              },
              {
                id: 'allergens',
                title: 'Allergens & certification',
                body: 'Nut free, dairy free and sesame free. COR certified, pareve and yoshon. Made in a kitchen that also handles wheat and eggs.'
              },
              {
                id: 'delivery',
                title: 'Pickup & delivery',
                body: requiresPrintLeadTime
                  ? "Custom-printed orders require a minimum of one week's notice. Choose pickup or local delivery during checkout."
                  : 'Pickup and local delivery are available during the store hours shown at checkout.'
              }
            ] as const
          ).map((section) => (
            <div key={section.id} className="cabinet__card cabinet__card--flush">
              <button
                type="button"
                onClick={() => setOpenSection((cur) => (cur === section.id ? '' : section.id))}
                aria-expanded={openSection === section.id}
                className="cabinet__sectionBtn"
              >
                {section.title}
                <ChevronDown size={16} style={{ transition: 'transform .25s ease', transform: openSection === section.id ? 'rotate(180deg)' : 'none' }} />
              </button>
              <AnimatePresence initial={false}>
                {openSection === section.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p style={{ margin: '10px 0 0', fontFamily: F.text, fontSize: 15, lineHeight: 1.5, color: 'rgba(14,62,105,.72)' }}>
                      {section.body}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* --- goes well with --- */}
        <section className="cabinet__pairs">
          <h3 className="cabinet__pairsTitle">Goes well with</h3>
          <div className="cabinet__pairsGrid">
            {pairsWith.map((p) => (
              <button key={p.id} type="button" onClick={() => openProduct(p.id)} className="cabinet__pairCard">
                <span className="cabinet__pairBed">
                  <img src={p.img} alt="" loading="lazy" />
                </span>
                <strong>{p.name}</strong>
                <span className="cabinet__pairPrice">{p.price}</span>
              </button>
            ))}
          </div>
        </section>
      {/* --- frequently bought together --- */}
      {/* Below "Goes well with", and doing a different job: that row is four
          things to look at, this is one thing to buy. The distinction is the
          button — a browse row that added to the box would be a trap, and a
          bundle you have to assemble tile by tile is not a bundle. */}
      {bundle.length === 2 && (
        <section className="cabinet__bundle" ref={bundleRef}>
          <h3 className="cabinet__pairsTitle">Frequently bought together</h3>

          <div className="cabinet__bundleRow">
            {[product, ...bundle].map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 && (
                  <span className="cabinet__bundlePlus" aria-hidden="true">
                    <Plus size={16} strokeWidth={3} />
                  </span>
                )}
                {/* The product being viewed is not a link to itself. */}
                {i === 0 ? (
                  <span className="cabinet__bundleItem">
                    <span className="cabinet__pairBed">
                      <img src={p.img} alt="" loading="lazy" />
                    </span>
                    <strong>{p.name}</strong>
                    <span className="cabinet__pairPrice">{p.price}</span>
                    <span className="cabinet__bundleThis">This item</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openProduct(p.id)}
                    className="cabinet__bundleItem cabinet__bundleItem--link"
                  >
                    <span className="cabinet__pairBed">
                      <img src={p.img} alt="" loading="lazy" />
                    </span>
                    <strong>{p.name}</strong>
                    <span className="cabinet__pairPrice">{p.price}</span>
                  </button>
                )}
              </Fragment>
            ))}
          </div>

          <div className="cabinet__bundleFoot">
            <span className="cabinet__bundleTotal">
              Three for <strong>{money(bundleTotal)}</strong>
            </span>
            <BrandButton variant="outline" className="cabinet__bundleAdd" onClick={addBundle}>
              Add all three
            </BrandButton>
          </div>
        </section>
      )}

      {/* --- recently viewed ---

          Last of the three rows, and last on purpose. "Goes well with" and the
          bundle are the bakery making a case for something new; this is the
          visitor's own trail back to what they were already considering. It
          belongs after the pitch, as the way out of the page rather than
          another thing to look at on it — someone who has opened four donuts
          deciding between them should not have to use the back button four
          times to compare them.

          Absent on a first visit, which is correct: a "recently viewed" row
          with nothing in it is a heading apologising for itself. */}
      {recentlyViewed.length > 0 && (
        <section className="cabinet__pairs">
          <h3 className="cabinet__pairsTitle">Recently viewed</h3>
          <div className="cabinet__pairsGrid">
            {recentlyViewed.map((p) => (
              <button key={p.id} type="button" onClick={() => openProduct(p.id)} className="cabinet__pairCard">
                <span className="cabinet__pairBed">
                  <img src={p.img} alt="" loading="lazy" />
                </span>
                <strong>{p.name}</strong>
                <span className="cabinet__pairPrice">{p.price}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      </div>

      {/* Sticky buy bar. Last child of the scroll container and
          `position: sticky; bottom: 0`, so it sits on the fold rather than
          being a second fixed layer to keep aligned with the panel.
          Same action and the same running total as the inline button — it is
          the same purchase, not a shortcut past the box-size and quantity
          choices above it. */}
      <div className={`cabinet__buybar${ctaOnScreen ? '' : ' is-shown'}`} aria-hidden={ctaOnScreen}>
        <span className="cabinet__buybarMeta">
          <span className="cabinet__buybarName">{product.name}</span>
          <span className="cabinet__buybarTotal">
            {money(total)}
            <span className="cabinet__buybarPieces">
              {' '}
              · {pieces * qty} {pieces * qty === 1 ? 'piece' : 'pieces'}
            </span>
          </span>
        </span>
        {/* Favourite, then add — the two things you can do with a product you
            have decided about, kept together at the end of the bar rather than
            split by the running total. On a phone the total is not there at
            all, so the pair is the whole bar.

            It used to float over the top-right of the photograph, which is the
            part of the panel that scrolls away first: the moment the bar
            appeared, the only way to save something was to scroll back up to
            the picture. */}
        <button
          type="button"
          onClick={saveToggle}
          aria-pressed={saved}
          aria-label={saved ? 'Saved to favourites' : 'Save to favourites'}
          tabIndex={ctaOnScreen ? -1 : 0}
          className={`cabinet__buybarSave${saved ? ' is-on' : ''}`}
        >
          <Heart size={19} strokeWidth={2.4} fill={saved ? 'currentColor' : 'none'} />
        </button>

        <BrandButton
          className="cabinet__buybarButton"
          /* Same gate as the inline button, and it has to be here too: the bar
             is the only Add on screen once the card has scrolled past, and
             `addToBag` refuses an unfinished petite line silently — so without
             this the bar reads as live and pressing it does nothing at all. */
          style={
            added
              ? { background: C.navy }
              : ready
                ? undefined
                : { opacity: 0.45, pointerEvents: 'none' }
          }
          /* Not focusable while hidden, or a keyboard user tabs into a button
             that is translated off the bottom of the panel. */
          tabIndex={ctaOnScreen ? -1 : 0}
          onClick={(event) => {
            addToBag();
            /* From the bar, not the photograph: by the time this button is on
               screen the photograph has been scrolled off the top of the panel,
               and a donut launching from above the fold is a donut nobody
               sees. */
            flyToCart(event.currentTarget, product.img);
          }}
        >
          {added ? (
            <>
              <Check size={18} strokeWidth={3} style={{ marginRight: 8 }} />
              Added
            </>
          ) : !ready ? (
            <>{isPrint ? 'Finish your design' : 'Choose your colours'}</>
          ) : (
            <>Add to bag</>
          )}
        </BrandButton>
      </div>

      {/* Labelled "Back", not a bare cross. The panel is a product page over
          the catalogue it was opened from, and closing it returns to exactly
          that — which is what a visitor arriving on a deep link needs told,
          since there is no page behind them to infer it from. The word is
          worth the width: a cross in a corner is the one control on this panel
          nobody can be sure about until they press it. */}
      <button type="button" onClick={closeProduct} className="cabinet__back">
        <ArrowLeft size={18} strokeWidth={2.6} aria-hidden="true" />
        Back
      </button>
    </motion.aside>
    </>
  );
}

/**
 * Which product page opens.
 *
 * Split here rather than inside the cabinet, so no layout carries another's
 * hooks — the two builders need almost none of the twelve above.
 */
export default function ProductPanel({ product }: { product: Product }) {
  /* No scrim on the box builder: it covers the viewport, so there is nothing
     behind it to dim and nothing to click past it.

     The letter cake is NOT split out. It briefly had a full-screen page of its
     own, which bought a big preview and lost everything else the panel carries
     — the price, the quantity, the allergens, the pickup and delivery lines,
     "goes well with". One dropdown does not need its own page; it needs to be
     one more control on the page that already exists. */
  return BOX_PRODUCTS.has(product.id) ? (
    <BoxBuilder product={product} />
  ) : (
    <Cabinet product={product} />
  );
}
