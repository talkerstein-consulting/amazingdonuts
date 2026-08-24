import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronDown,
  Heart,
  Link2,
  Minus,
  Plus,
  Sunrise,
  Truck,
  X
} from 'lucide-react';
import { PRODUCTS, type Product } from '../data/products';
import { C, F, BadgeRow } from '../components/brand';
import { useShop, money, priceOf } from '../lib/shop';
import { minimumQuantityFor, PRINT_PRODUCTS } from '../lib/custom-order';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Pieces sold singly can be bought by the box; a made-up pack has its own price. */
const PACKS = [
  { id: 'single', label: 'Single', pieces: 1, note: 'One piece' },
  { id: 'half', label: 'Half dozen', pieces: 6, note: '6 pieces' },
  { id: 'dozen', label: 'Dozen', pieces: 12, note: '12 pieces' }
] as const;

/** Framings of the single product photo. See the note on `views` below. */
const VIEWS = [
  { id: 'full', label: 'Full view', scale: 1, position: '50% 50%' },
  { id: 'top', label: 'Top detail', scale: 1.85, position: '50% 30%' },
  { id: 'base', label: 'Side detail', scale: 1.85, position: '50% 72%' }
] as const;

const REASSURANCE = [
  { Icon: Sunrise, title: 'Baked this morning', body: 'Every order is made the day you collect it.' },
  { Icon: Truck, title: 'Pickup or delivery', body: 'Same-day pickup, next-day local delivery.' }
];

/**
 * The product page, on the ecommerce-1 frame — its big media pane, thumbnail
 * rail and stacked info cards — delivered as a cabinet slide over whatever it
 * was opened from.
 *
 * ecommerce-1 shows six views of one product; the catalogue has a single
 * cut-out per item, so the rail carries the product itself plus its
 * shelf-mates from the same category. Picking one swaps the product, which is
 * more use than five angles of the same donut would be.
 */
export default function ProductPanel({ product }: { product: Product }) {
  const { closeProduct, openProduct, add } = useShop();
  const [qty, setQty] = useState(1);
  const [pack, setPack] = useState<(typeof PACKS)[number]['id']>('single');
  const [openSection, setOpenSection] = useState<'details' | 'allergens' | 'delivery' | ''>('details');
  const [view, setView] = useState(0);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);

  const unit = priceOf(product);
  const requiresPrintLeadTime = PRINT_PRODUCTS.has(product.id);
  const minimumQuantity = minimumQuantityFor(product.id);
  // A boxed item is already a set quantity; only by-the-piece stock takes packs.
  const byThePiece = unit > 0 && unit < 10;
  const pieces = byThePiece ? PACKS.find((p) => p.id === pack)!.pieces : 1;

  // A fresh product resets the picker — carrying a dozen over is never intended.
  useEffect(() => {
    setQty(minimumQuantityFor(product.id));
    setPack('single');
    setView(0);
    setAdded(false);
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

  /* The rail is this product, not its shelf-mates.
     It used to list five other donuts, which made the thumbnails read as a
     picker — click one and the whole panel swapped to a different item, which
     is not what a thumbnail rail anywhere else on the web does.

     The catalogue ships exactly one photograph per product (25 files for 25
     donuts), so there are no second and third angles to show. These are
     framings of that one photograph: the whole cut-out, then two closer crops.
     Real detail views of the real product — but crops, not separate shots. If
     the bakery ever shoots additional angles, this becomes a per-product list
     in `products.ts` and the crops go away. */
  const views = VIEWS;

  // Something from a different counter, so the row is a suggestion rather than
  // a repeat of the thumbnail rail.
  const pairsWith = useMemo(
    () => PRODUCTS.filter((p) => p.category !== product.category).slice(0, 4),
    [product]
  );

  const total = unit * pieces * qty;

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/#product/${product.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
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
        <div className="cabinet__media">
          <div className="cabinet__mediaTools">
            <button
              type="button"
              onClick={() => setSaved((s) => !s)}
              aria-pressed={saved}
              aria-label={saved ? 'Saved to favourites' : 'Save to favourites'}
              className={`cabinet__iconBtn${saved ? ' is-on' : ''}`}
            >
              <Heart size={17} strokeWidth={2.4} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button type="button" onClick={copyLink} aria-label="Copy link to this product" className="cabinet__iconBtn">
              {copied ? <Check size={17} strokeWidth={2.6} /> : <Link2 size={17} strokeWidth={2.4} />}
            </button>
          </div>

          <div className="cabinet__rail">
            {views.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(i)}
                aria-label={`${product.name} — ${v.label}`}
                aria-current={i === view}
                className={`cabinet__thumb${i === view ? ' is-on' : ''}`}
              >
                <img
                  src={product.img}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: v.position,
                    transform: `scale(${v.scale})`
                  }}
                />
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.img
              /* Keyed on the view too, so picking a crop crossfades exactly the
                 way switching product does. */
              key={`${product.id}-${views[view].id}`}
              src={product.img}
              alt={product.name}
              initial={{ opacity: 0, scale: views[view].scale * 1.03 }}
              animate={{ opacity: 1, scale: views[view].scale }}
              exit={{ opacity: 0, scale: views[view].scale * 0.98 }}
              transition={{ duration: 0.36, ease: EASE }}
              style={{ objectPosition: views[view].position }}
              className="cabinet__hero"
            />
          </AnimatePresence>
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
                {byThePiece ? 'per piece' : 'per box'}
              </span>
            </div>

            <p style={{ margin: '14px 0 0', fontFamily: F.text, fontSize: 15, lineHeight: 1.55, color: C.body }}>
              Baked fresh the morning you collect it, in our own kitchen, and sold {byThePiece ? 'by the piece' : 'as a box'}.
            </p>

            <div style={{ marginTop: 18 }}>
              <BadgeRow badges={['nut', 'dairy', 'sesame']} gap={8} />
            </div>
          </div>

          {/* pack size, quantity + add */}
          <div className="cabinet__card">
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span className="cabinet__label" style={{ marginBottom: 0 }}>
                Quantity
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

            <button
              type="button"
              className={`cabinet__add brand-press${added ? ' is-added' : ''}`}
              onClick={() => {
                add(product, pieces * qty);
                setAdded(true);
              }}
            >
              {added ? (
                <>
                  <Check size={18} strokeWidth={3} style={{ marginRight: 8 }} />
                  Added to the box
                </>
              ) : (
                <>Add to the box — {money(total)}</>
              )}
            </button>

            <p className="cabinet__fineprint">
              {requiresPrintLeadTime ? `${qty} dozen units · one week's notice required` : `${pieces * qty} ${pieces * qty === 1 ? 'piece' : 'pieces'} · order by 4pm for next-day collection`}
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
                  : 'Same-day pickup from the store when ordered before 4pm. Next-day local delivery across the city.'
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
      </div>

      <button type="button" onClick={closeProduct} aria-label="Close" className="cabinet__close">
        <X size={18} strokeWidth={2.6} />
      </button>
    </motion.aside>
    </>
  );
}
