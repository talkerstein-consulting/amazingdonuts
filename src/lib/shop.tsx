import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRODUCTS, type Product } from '../data/products';

/**
 * The storefront's client state: which view is showing, which product is open,
 * and what's in the box.
 *
 * The product panel is hash-driven for the same reason the Donut Lab is a page —
 * deep links and the Back button both work without pulling in a router.
 *   #product/<id>    → that product's panel slid over whatever is underneath
 * The cart is a drawer rather than a route, so it stays out of the hash.
 *
 * `#shop` used to be a route here, for the catalogue overlay. The catalogue is
 * `/shop/`, a real page, so the route and its `openShop`/`shopOpen` members are
 * gone — anything still calling them was setting a hash that matched nothing.
 */
export type CartLine = { product: Product; qty: number };

type Store = {
  product: Product | null;
  cartOpen: boolean;
  lines: CartLine[];
  count: number;
  subtotal: number;
  openProduct: (id: string) => void;
  closeProduct: () => void;
  openCart: () => void;
  closeCart: () => void;
  add: (product: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const ShopContext = createContext<Store | null>(null);

/** Prices in the catalogue are strings like "$2.00". */
export const priceOf = (p: Product) => Number(p.price.replace(/[^0-9.]/g, '')) || 0;
export const money = (n: number) => `$${n.toFixed(2)}`;

/** The panel opens over whatever page it was opened from. */
const readHash = () => {
  const h = window.location.hash;
  return { productId: h.startsWith('#product/') ? h.slice('#product/'.length) : null };
};

export function ShopProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(readHash);
  const [cartOpen, setCartOpen] = useState(false);
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('amazing-cart') || '[]') as { id: string; qty: number }[];
      return saved.flatMap(({ id, qty }) => {
        const product = PRODUCTS.find((item) => item.id === id);
        return product && Number.isInteger(qty) && qty > 0 ? [{ product, qty }] : [];
      });
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('amazing-cart', JSON.stringify(lines.map(({ product, qty }) => ({ id: product.id, qty }))));
  }, [lines]);

  useEffect(() => {
    const sync = () => setRoute(readHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const go = useCallback((hash: string) => {
    if (window.location.hash === hash) setRoute(readHash());
    else window.location.hash = hash;
  }, []);

  const clearHash = useCallback(() => {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    setRoute({ productId: null });
  }, []);

  const product = useMemo(
    () => (route.productId ? PRODUCTS.find((p) => p.id === route.productId) ?? null : null),
    [route.productId]
  );

  const add = useCallback((p: Product, qty = 1) => {
    setLines((prev) => {
      const at = prev.findIndex((l) => l.product.id === p.id);
      if (at === -1) return [...prev, { product: p, qty }];
      const next = [...prev];
      next[at] = { ...next[at], qty: next[at].qty + qty };
      return next;
    });
    setCartOpen(true);
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.product.id !== id) : prev.map((l) => (l.product.id === id ? { ...l, qty } : l))
    );
  }, []);

  const remove = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.product.id !== id)), []);

  const value = useMemo<Store>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + priceOf(l.product) * l.qty, 0);
    return {
      product,
      cartOpen,
      lines,
      count,
      subtotal,
      openProduct: (id: string) => go(`#product/${id}`),
      /* Always back to the page underneath: there is no catalogue route to
         return to any more, and on /shop/ clearing the hash leaves you on the
         catalogue anyway. */
      closeProduct: clearHash,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      add,
      setQty,
      remove,
      clear: () => setLines([])
    };
  }, [product, cartOpen, lines, go, clearHash, add, setQty, remove]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>');
  return ctx;
}
