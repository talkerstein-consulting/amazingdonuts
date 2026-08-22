import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Plus, ShoppingBag, X } from 'lucide-react';
import { CATEGORIES, PRODUCTS, type Category } from '../data/products';
import { C, F, SQUIRCLE } from '../components/brand';
import { useShop } from '../lib/shop';

/**
 * The full catalogue, on the ecommerce-2 frame: a filter rail beside a product
 * grid. The block's layout and motion are kept; its neutral styling is
 * replaced by the brand's, and the six placeholder appliances by the real 60
 * products.
 */
export default function ShopAll() {
  const { closeShop, openProduct, openCart, count, add } = useShop();
  const [openFilter, setOpenFilter] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const shown = useMemo(() => {
    const active = CATEGORIES.filter((c) => checked[c]);
    return active.length ? PRODUCTS.filter((p) => active.includes(p.category)) : PRODUCTS;
  }, [checked]);

  const countFor = (category: Category) => PRODUCTS.filter((p) => p.category === category).length;
  const anyChecked = CATEGORIES.some((c) => checked[c]);

  return (
    <div className="shop-overlay">
      <header className="shop-bar">
        <button type="button" onClick={closeShop} className="icon-btn" aria-label="Back to the site" style={{ color: 'var(--cream)' }}>
          <X size={24} />
        </button>
        <span className="shop-bar__title">Shop all</span>
        <button
          type="button"
          onClick={openCart}
          className="icon-btn"
          aria-label={`Box, ${count} ${count === 1 ? 'item' : 'items'}`}
          style={{ color: 'var(--cream)', position: 'relative' }}
        >
          <ShoppingBag size={24} strokeWidth={2} />
          {count > 0 && <span className="shop-badge">{count}</span>}
        </button>
      </header>

      <div className="shop-body">
        <div className="shop-layout">
          <aside className="shop-rail">
            <p style={{ margin: '0 0 14px', fontFamily: F.text, fontSize: 14, color: C.mute }}>
              {shown.length} of {PRODUCTS.length} items
            </p>

            <div style={{ borderTop: '1px solid rgba(14,62,105,.14)', paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setOpenFilter((v) => !v)}
                aria-expanded={openFilter}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  minHeight: 44,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-cta)',
                  fontWeight: 700,
                  fontSize: 'var(--type-label)',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: C.navy
                }}
              >
                Category
                <ChevronDown
                  size={16}
                  style={{ transition: 'transform .25s ease', transform: openFilter ? 'rotate(180deg)' : 'none' }}
                />
              </button>

              <AnimatePresence initial={false}>
                {openFilter && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column' }}>
                      {CATEGORIES.map((category) => (
                        <label
                          key={category}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            minHeight: 44,
                            cursor: 'pointer',
                            fontFamily: F.text,
                            fontSize: 15,
                            color: C.navy
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!checked[category]}
                            onChange={() => setChecked((c) => ({ ...c, [category]: !c[category] }))}
                            style={{ width: 18, height: 18, accentColor: C.navy }}
                          />
                          {category}
                          <span style={{ marginLeft: 'auto', fontSize: 13, color: C.mute }}>{countFor(category)}</span>
                        </label>
                      ))}

                      {anyChecked && (
                        <button
                          type="button"
                          onClick={() => setChecked({})}
                          style={{
                            alignSelf: 'flex-start',
                            marginTop: 6,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontFamily: F.text,
                            fontSize: 13,
                            color: C.mute,
                            textDecoration: 'underline'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>

          <div className="shop-grid">
            <AnimatePresence mode="popLayout">
              {shown.map((p, i) => (
                <motion.article
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{
                    layout: { type: 'spring', stiffness: 260, damping: 30 },
                    duration: 0.35,
                    // Capped so the tail of a 60-item grid is not left waiting.
                    delay: Math.min(i, 12) * 0.02
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => openProduct(p.id)}
                      aria-label={`View ${p.name}`}
                      style={{
                        display: 'block',
                        width: '100%',
                        aspectRatio: '1',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        background: C.canvas,
                        clipPath: SQUIRCLE,
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={p.img}
                        alt={p.name}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.18)' }}
                      />
                    </button>

                    <button
                      type="button"
                      className="brand-press"
                      onClick={() => add(p)}
                      aria-label={`Add ${p.name} to box`}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        zIndex: 2,
                        width: 34,
                        height: 34,
                        borderRadius: 99,
                        border: 'none',
                        background: C.orange,
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow: '0 4px 12px rgba(14,62,105,.22)'
                      }}
                    >
                      <Plus size={19} strokeWidth={3} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openProduct(p.id)}
                    style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontFamily: F.display,
                        fontWeight: 800,
                        fontSize: 14,
                        lineHeight: 1.2,
                        color: C.navy,
                        textTransform: 'none',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {p.name}
                    </h4>
                    <span style={{ fontFamily: F.text, fontWeight: 700, fontSize: 13, color: C.price }}>{p.price}</span>
                  </button>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
