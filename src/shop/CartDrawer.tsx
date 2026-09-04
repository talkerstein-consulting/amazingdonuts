import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { C, F, SQUIRCLE } from '../components/brand';
import { useShop, money } from '../lib/shop';
import { SHOP_HREF } from '../lib/shop-href';
import { customizationComplete, minimumQuantityFor } from '../lib/custom-order';
import ProductLine from '../components/ProductLine';
import CartCustomization from './CartCustomization';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The box, on the ecommerce-11 frame: line items with steppers, a running
 * summary and the checkout action pinned to the foot — as a drawer, so adding
 * something never takes you off what you were browsing.
 */
export default function CartDrawer() {
  const { cartOpen, closeCart, lines, count, subtotal, setQty, customize, remove } = useShop();
  const customReady=lines.every(line=>customizationComplete(line.product.id,line.qty,line.customization));

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
                  {lines.map(({ product, qty, customization }) => (
                    <li key={product.id} className="cart__line">
                      <ProductLine product={product}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                          <div className="cart__stepper">
                            <button type="button" disabled={qty<=minimumQuantityFor(product.id)} onClick={() => setQty(product.id, qty - 1)} aria-label={`One fewer ${product.name}`}>
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
                      </ProductLine>
                      <CartCustomization productId={product.id} qty={qty} value={customization} onChange={next=>customize(product.id,next)}/>
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
                <button type="button" className="cart__continue" onClick={closeCart}>Continue shopping</button>
                <a href={customReady?"/checkout/":"#"} aria-disabled={!customReady} className={`cart__checkout brand-press${customReady?'':' is-disabled'}`} onClick={event=>{if(!customReady)event.preventDefault();else closeCart()}}>
                  {customReady?`Checkout — ${money(subtotal)}`:'Finish custom items'}
                </a>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
