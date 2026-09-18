import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ChevronDown, Gift, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { Product } from '../data/products';
import { BrandButton, C, F, SQUIRCLE } from '../components/brand';
import { useShop, money, priceOf, lineKeyOf } from '../lib/shop';
import { SHOP_HREF } from '../lib/shop-href';
import { customizationComplete, customizationFor, minimumQuantityFor, PRINT_PRODUCTS } from '../lib/custom-order';
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
  const { cartOpen, openCart, closeCart, product: activeProduct, lines, count, subtotal, setQty, customize, remove, wishlist, products, signedIn, openProduct, add } = useShop();
  const [removedProduct, setRemovedProduct] = useState<Product | null>(null);
  const [lastAdded, setLastAdded] = useState('');
  const [buyAgainNames, setBuyAgainNames] = useState<string[]>([]);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(200);
  const [promoDraft, setPromoDraft] = useState(() => localStorage.getItem('amazing-promo-code') || '');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const applyPromo = async () => {
    const code = promoDraft.trim().toUpperCase();
    if (!code) { localStorage.removeItem('amazing-promo-code'); setPromoMessage('Promo code removed.'); return; }
    setPromoBusy(true);
    try {
      const response = await fetch('/api/house/public/storefront/promo-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || 'This promo code is unavailable.');
      localStorage.setItem('amazing-promo-code', code);
      setPromoMessage(`${code} will be applied to your order at checkout.`);
    } catch (error) { localStorage.removeItem('amazing-promo-code'); setPromoMessage(error instanceof Error ? error.message : 'This promo code is unavailable.'); }
    finally { setPromoBusy(false); }
  };
  const amountToFreeDelivery = Math.max(0, (freeDeliveryThreshold ?? 0) - subtotal);
  const savedProducts = signedIn ? wishlist.map(id => products.find(p => p.id === id)).filter((p): p is Product => Boolean(p)).slice(0, 3) : [];
  const buyAgainProducts = buyAgainNames.map(name => products.find(p => p.name.toLowerCase() === name)).filter((p): p is Product => p != null && !wishlist.includes(p.id)).slice(0, 3);
  const removeLine = (key: string, product: Product) => { setRemovedProduct(product); remove(key); };
  const customReady=lines.every(line=>customizationComplete(line.product.id,line.qty,line.customization));
  /* Counted, not just tested: the button points at what is ringed, and "the
     highlighted item" is a lie when two of them are. */
  const blockedCount=lines.filter(line=>!customizationComplete(line.product.id,line.qty,line.customization)).length;

  useEffect(() => {
    let timeout: number | undefined;
    const onAdded = (event: Event) => {
      const { name, qty } = (event as CustomEvent<{name: string; qty: number}>).detail;
      setLastAdded(`${name}${qty > 1 ? ` × ${qty}` : ''} added`);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setLastAdded(''), 5000);
    };
    window.addEventListener('amazing:bag-added', onAdded);
    return () => { window.removeEventListener('amazing:bag-added', onAdded); window.clearTimeout(timeout); };
  }, []);

  useEffect(() => {
    fetch('/api/house/storefront/config').then(response => response.ok ? response.json() : null).then(body => {
      const threshold = Number(body?.delivery?.freeThreshold) / 100;
      setFreeDeliveryThreshold(Number.isFinite(threshold) && threshold > 0 ? threshold : 200);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartOpen, closeCart]);

  useEffect(() => {
    if (!cartOpen || !signedIn) return;
    let live = true;
    fetch('/api/house/storefront/orders', { credentials: 'include' }).then(response => response.ok ? response.json() : { orders: [] }).then(body => {
      if (!live) return;
      const names: string[] = (body.orders || []).flatMap((order: { line_items?: { name?: string }[] }) => order.line_items || []).map((line: { name?: string }) => String(line.name || '').toLowerCase()).filter(Boolean);
      setBuyAgainNames([...new Set(names)]);
    }).catch(() => {});
    return () => { live = false; };
  }, [cartOpen, signedIn]);

  return (
    <>
    {count > 0 && !cartOpen && !activeProduct && !window.location.pathname.startsWith('/checkout') && (
      <div className="bag-checkout-bar"><div><strong>Your bag</strong><span>{count} {count === 1 ? 'item' : 'items'} · {money(subtotal)}</span></div><span className="bag-checkout-bar__recent" aria-live="polite">{lastAdded}</span><BrandButton href={customReady ? '/checkout/' : '#'} onClick={event => { if (!customReady) { event.preventDefault(); openCart(); } }} className="bag-checkout-bar__cta">{customReady ? 'Checkout' : 'Review your bag'}</BrandButton></div>
    )}
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
              {lines.length > 0 && <section className={`cart__deliveryProgress${amountToFreeDelivery === 0 ? ' is-complete' : ''}`} aria-label="Free delivery progress"><div><Gift size={19} /><strong>{amountToFreeDelivery === 0 ? 'Free delivery unlocked' : `${money(amountToFreeDelivery)} away from free delivery`}</strong></div><progress value={Math.min(subtotal, freeDeliveryThreshold)} max={freeDeliveryThreshold} /></section>}
              {lines.length > 0 && <div className="promo-code cart__promo"><label htmlFor="cart-promo">Promo code</label><div><input id="cart-promo" value={promoDraft} onChange={event => setPromoDraft(event.target.value)} maxLength={40} autoComplete="off" /><button type="button" disabled={promoBusy} onClick={() => void applyPromo()}>{promoBusy ? 'Checking...' : 'Apply'}</button></div>{promoMessage && <small role="status">{promoMessage}</small>}</div>}
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
                  <BrandButton href={SHOP_HREF} block className="cart__checkout" onClick={closeCart}>
                    Shop all donuts
                  </BrandButton>
                </div>
              ) : (
                <ul className="cart__lines">
                  {lines.map((line) => {
                  const { product, qty, customization } = line;
                  /* Not the product id. One product can be several rows — the
                     letter cake is one per character — and every control below
                     has to name THIS row rather than the first one sharing its
                     product. See `lineKeyOf`. */
                  const key = lineKeyOf(line);
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
                    <li key={key} className={`cart__line${blocked?' cart__line--attention':''}`}>
                      <ProductLine product={product} onOpen={() => { closeCart(); openProduct(product.id); }}>
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
                            <button type="button" disabled={qty <= minimumQuantityFor(product.id) && qty !== 1} onClick={() => qty === 1 ? removeLine(key, product) : setQty(key, qty - 1)} aria-label={qty === 1 ? `Remove ${product.name}` : `One fewer ${product.name}`}>
                              {qty === 1 ? <Trash2 size={14} strokeWidth={2.4} /> : <Minus size={14} strokeWidth={2.6} />}
                            </button>
                            <span>{qty}</span>
                            <button type="button" onClick={() => setQty(key, qty + 1)} aria-label={`One more ${product.name}`}>
                              <Plus size={14} strokeWidth={2.6} />
                            </button>
                          </div>
                          )}
                          {qty !== 1 && <button
                            type="button"
                            onClick={() => removeLine(key, product)}
                            aria-label={`Remove ${product.name}`}
                            className="cart__remove"
                          >
                            <Trash2 size={16} strokeWidth={2.2} />
                          </button>}
                        </div>
                      </ProductLine>
                      {(customization || customizationFor(product.id)) && <details className="cart__itemDetails" open>
                        <summary>Item details <ChevronDown size={16} aria-hidden="true" /></summary>
                        <CartCustomization productId={product.id} qty={qty} value={customization} onChange={next=>customize(key,next)}/>
                      </details>}
                      {blocked&&<CheckoutFix productId={product.id} qty={qty} value={customization} onChange={next=>customize(key,next)}/>}
                    </li>
                  );
                  })}
                </ul>
              )}
              {removedProduct && <p className="cart__removed" role="status"><a href={`/shop/#product/${removedProduct.id}`} onClick={closeCart}>{removedProduct.name}</a> was removed from bag.</p>}
              {savedProducts.length > 0 && <section className="cart__suggestions"><h3>Saved products</h3>{savedProducts.map(p => <div className="cart__suggestion" key={p.id}><button type="button" onClick={() => { closeCart(); openProduct(p.id); }}><img src={p.img} alt="" /><span>{p.name}<small>{money(priceOf(p))}</small></span></button><button type="button" aria-label={customizationFor(p.id) ? `Choose options for ${p.name}` : `Add ${p.name} to bag`} onClick={() => { if (customizationFor(p.id)) { closeCart(); openProduct(p.id); } else add(p, 1, { openCart: false }); }}><Plus size={18} /></button></div>)}</section>}
              {buyAgainProducts.length > 0 && <section className="cart__suggestions"><h3>Buy again</h3>{buyAgainProducts.map(p => <div className="cart__suggestion" key={p.id}><button type="button" onClick={() => { closeCart(); openProduct(p.id); }}><img src={p.img} alt="" /><span>{p.name}<small>{money(priceOf(p))}</small></span></button><button type="button" aria-label={`View ${p.name}`} onClick={() => { closeCart(); openProduct(p.id); }}><Plus size={18} /></button></div>)}</section>}
            </div>

            {lines.length > 0 && (
              <footer className="cart__foot">
                <div className="cart__row">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <p className="cart__note">Tax and pickup details are settled at checkout.</p>
                <BrandButton href={customReady?"/checkout/":"#"} block aria-disabled={!customReady} className={`cart__checkout${customReady?'':' is-disabled'}`} onClick={event=>{if(!customReady)event.preventDefault();else closeCart()}}>
                  {customReady?'Checkout':`Finish the highlighted item${blockedCount===1?'':'s'}`}
                </BrandButton>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
