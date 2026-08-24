import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { C, F, SQUIRCLE } from '../components/brand';
import { useShop, money } from '../lib/shop';
import { SHOP_HREF } from '../lib/shop-href';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The box, on the ecommerce-11 frame: line items with steppers, a running
 * summary and the checkout action pinned to the foot — as a drawer, so adding
 * something never takes you off what you were browsing.
 */
export default function CartDrawer() {
  const { cartOpen, closeCart, lines, count, subtotal, setQty, remove } = useShop();

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartOpen, closeCart]);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            className="cart-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCart}
          />
          <motion.aside
            className="cart"
            role="dialog"
            aria-modal="true"
            aria-label="Your box"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.38, ease: EASE }}
          >
            <header className="cart__bar">
              <span className="cart__title">
                Your box
                {count > 0 && <span className="cart__count">{count}</span>}
              </span>
              <button type="button" onClick={closeCart} className="icon-btn" aria-label="Close the box" style={{ color: 'var(--cream)' }}>
                <X size={24} />
              </button>
            </header>

            <div className="cart__body" data-lenis-prevent>
              {lines.length === 0 ? (
                <div className="cart__empty">
                  <span className="cart__emptyIcon">
                    <ShoppingBag size={28} strokeWidth={2} />
                  </span>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'var(--fs-swatch)', textTransform: 'uppercase', color: C.navy }}>
                    Nothing in the box yet
                  </p>
                  <p style={{ margin: 0, fontFamily: F.text, fontSize: 15, color: 'rgba(14,62,105,.7)' }}>
                    Pick a few and they will show up here.
                  </p>
                  {/* Also `openShop()` until now, so an empty basket's only
                      call to action closed the drawer and did nothing else. */}
                  <a href={SHOP_HREF} className="cart__checkout brand-press" onClick={closeCart}>
                    Shop all donuts
                  </a>
                </div>
              ) : (
                <ul className="cart__lines">
                  {lines.map(({ product, qty }) => (
                    <li key={product.id} className="cart__line">
                      <span className="cart__thumb" style={{ clipPath: SQUIRCLE }}>
                        <img src={product.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.14)' }} />
                      </span>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: F.display,
                            fontWeight: 800,
                            fontSize: 14,
                            lineHeight: 1.25,
                            color: C.navy,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {product.name}
                        </p>
                        <p style={{ margin: '4px 0 8px', fontFamily: F.text, fontWeight: 700, fontSize: 13, color: C.price }}>
                          {product.price}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="cart__stepper">
                            <button type="button" onClick={() => setQty(product.id, qty - 1)} aria-label={`One fewer ${product.name}`}>
                              <Minus size={14} strokeWidth={2.6} />
                            </button>
                            <span>{qty}</span>
                            <button type="button" onClick={() => setQty(product.id, qty + 1)} aria-label={`One more ${product.name}`}>
                              <Plus size={14} strokeWidth={2.6} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(product.id)}
                            aria-label={`Remove ${product.name}`}
                            className="cart__remove"
                          >
                            <Trash2 size={16} strokeWidth={2.2} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {lines.length > 0 && (
              <footer className="cart__foot">
                <div className="cart__row">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <p className="cart__note">Tax and pickup details are settled at checkout.</p>
                <button type="button" className="cart__checkout brand-press">
                  Checkout — {money(subtotal)}
                </button>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
