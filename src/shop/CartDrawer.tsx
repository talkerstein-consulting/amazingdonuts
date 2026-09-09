import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { C, F, SQUIRCLE } from '../components/brand';
import { useShop, money } from '../lib/shop';
import { SHOP_HREF } from '../lib/shop-href';
import { customizationComplete, minimumQuantityFor, PRINT_PRODUCTS } from '../lib/custom-order';
import ProductLine from '../components/ProductLine';
import CartCustomization from './CartCustomization';
import CheckoutFix from './CheckoutFix';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The box, on the ecommerce-11 frame: line items with steppers, a running
 * summary and the checkout action pinned to the foot — as a drawer, so adding
 * something never takes you off what you were browsing.
 */
export default function CartDrawer() {
  const { cartOpen, closeCart, lines, count, subtotal, setQty, customize, remove } = useShop();
  const customReady=lines.every(line=>customizationComplete(line.product.id,line.qty,line.customization));
  /* Counted, not just tested: the button points at what is ringed, and "the
     highlighted item" is a lie when two of them are. */
  const blockedCount=lines.filter(line=>!customizationComplete(line.product.id,line.qty,line.customization)).length;

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
            aria-label="Your bag"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.38, ease: EASE }}
          >
            {/* Back rather than a cross, and on the left where a back control
                belongs — the same treatment the product panel takes. Closing
                the box returns you to what you were browsing, which is what the
                word says and what a cross in a corner does not. It also stands
                also what "Continue shopping" used to say in the foot — that
                button is gone, because two controls that both just close the
                drawer, in different words, is one of them too many, and the one
                beside Checkout was competing with the only action in the bag
                that matters. */}
            <header className="cart__bar">
              <button type="button" onClick={closeCart} className="cart__back">
                <ArrowLeft size={18} strokeWidth={2.6} aria-hidden="true" />
                Back
              </button>
              <span className="cart__title">
                Your bag
                {count > 0 && <span className="cart__count">{count}</span>}
              </span>
            </header>

            <div className="cart__body" data-lenis-prevent>
              {lines.length === 0 ? (
                <div className="cart__empty">
                  <span className="cart__emptyIcon">
                    <ShoppingBag size={28} strokeWidth={2} />
                  </span>
                  <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'var(--fs-swatch)', textTransform: 'uppercase', color: C.navy }}>
                    Nothing in the bag yet
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
                  {lines.map(({ product, qty, customization }) => {
                  /* The line that is stopping checkout, marked where the
                     customer already is. The footer button knew one of these
                     existed and said "Finish custom items" — which named
                     neither the item nor the question, in a drawer that could
                     hold six of them. The ring says which, and the question
                     underneath it is answerable in place.

                     This is the one exception to the drawer reading a spec
                     back rather than asking for it — see `CartCustomization`.
                     A required field on a finished line asks after the sale; a
                     question on an UNfinished one is the only thing standing
                     between the customer and the order. */
                  const blocked=!customizationComplete(product.id,qty,customization);
                  return (
                    <li key={product.id} className={`cart__line${blocked?' cart__line--attention':''}`}>
                      <ProductLine product={product}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                          {/* A printed line has no stepper. The artwork covers a
                              stated number of dozens, chosen on the product page
                              against the quantity set there, so nudging the
                              count here would leave designs that no longer add
                              up — and the spec is read-only in the bag now, so
                              there would be nothing to fix it with. The count
                              stands; the row can still be removed. */}
                          {PRINT_PRODUCTS.has(product.id) ? (
                            <span className="cart__fixedQty">{qty} dozen</span>
                          ) : (
                          <div className="cart__stepper">
                            <button type="button" disabled={qty<=minimumQuantityFor(product.id)} onClick={() => setQty(product.id, qty - 1)} aria-label={`One fewer ${product.name}`}>
                              <Minus size={14} strokeWidth={2.6} />
                            </button>
                            <span>{qty}</span>
                            <button type="button" onClick={() => setQty(product.id, qty + 1)} aria-label={`One more ${product.name}`}>
                              <Plus size={14} strokeWidth={2.6} />
                            </button>
                          </div>
                          )}
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
                      {blocked&&<CheckoutFix productId={product.id} qty={qty} value={customization} onChange={next=>customize(product.id,next)}/>}
                    </li>
                  );
                  })}
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
                <a href={customReady?"/checkout/":"#"} aria-disabled={!customReady} className={`cart__checkout brand-press${customReady?'':' is-disabled'}`} onClick={event=>{if(!customReady)event.preventDefault();else closeCart()}}>
                  {customReady?`Checkout — ${money(subtotal)}`:`Finish the highlighted item${blockedCount===1?'':'s'}`}
                </a>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
