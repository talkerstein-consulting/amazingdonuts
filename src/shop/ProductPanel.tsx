import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronLeft, Minus, Plus } from 'lucide-react';
import { PRODUCTS, type Product } from '../data/products';
import { C, F, SQUIRCLE, Badge } from '../components/brand';
import { useShop, money, priceOf } from '../lib/shop';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The product page, on the ecommerce-1 frame — its big media pane, thumbnail
 * rail and stacked info cards — delivered as a cabinet slide over the
 * catalogue rather than as its own page.
 *
 * ecommerce-1 shows six views of one product; the catalogue has a single
 * cut-out per item, so the rail carries the product itself plus its
 * shelf-mates from the same category. Picking one swaps the product, which is
 * more use than five angles of the same donut would be.
 */
export default function ProductPanel({ product }: { product: Product }) {
  const { closeProduct, openProduct, add } = useShop();
  const [qty, setQty] = useState(1);
  const [openSection, setOpenSection] = useState<'details' | 'allergens' | ''>('details');

  // A fresh product resets the quantity — carrying 6 over is never intended.
  useEffect(() => setQty(1), [product.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeProduct();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeProduct]);

  const shelf = useMemo(
    () => [product, ...PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id)].slice(0, 6),
    [product]
  );

  const unit = priceOf(product);

  return (
    <motion.aside
      className="cabinet"
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
          <button type="button" onClick={closeProduct} className="cabinet__back">
            <ChevronLeft size={16} strokeWidth={2.5} />
            Back
          </button>

          <div className="cabinet__rail">
            {shelf.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openProduct(p.id)}
                aria-label={p.name}
                aria-current={p.id === product.id}
                className={`cabinet__thumb${p.id === product.id ? ' is-on' : ''}`}
              >
                <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.img
              key={product.id}
              src={product.img}
              alt={product.name}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.36, ease: EASE }}
              className="cabinet__hero"
            />
          </AnimatePresence>
        </div>

        {/* --- info column --- */}
        <div className="cabinet__info">
          <div className="cabinet__card">
            <span style={{ fontFamily: F.text, fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.mute }}>
              {product.category}
            </span>
            <h2
              style={{
                margin: '8px 0 0',
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
            <p style={{ margin: '12px 0 0', fontFamily: F.text, fontWeight: 700, fontSize: 20, color: C.price }}>{product.price}</p>

            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Badge badge="nut" />
              <Badge badge="dairy" />
            </div>
          </div>

          {/* quantity + add */}
          <div className="cabinet__card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ fontFamily: 'var(--font-cta)', fontWeight: 700, fontSize: 'var(--type-label)', letterSpacing: '.06em', textTransform: 'uppercase', color: C.navy }}>
                Quantity
              </span>
              <div className="cabinet__stepper">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer">
                  <Minus size={16} strokeWidth={2.6} />
                </button>
                <span aria-live="polite">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="One more">
                  <Plus size={16} strokeWidth={2.6} />
                </button>
              </div>
            </div>

            <button type="button" className="cabinet__add brand-press" onClick={() => add(product, qty)}>
              Add to the box — {money(unit * qty)}
            </button>
          </div>

          {/* collapsible sections, as the block has them */}
          {(
            [
              { id: 'details', title: 'Details', body: `Baked fresh the morning you collect it. ${product.name} is made in our own kitchen and sold by the piece.` },
              { id: 'allergens', title: 'Allergens & certification', body: 'Nut free and dairy free. COR certified, pareve and yoshon. Made in a kitchen that also handles wheat and eggs.' }
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
      </div>
    </motion.aside>
  );
}
