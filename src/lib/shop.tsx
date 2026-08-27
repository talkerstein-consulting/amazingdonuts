import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRODUCTS, type Product } from '../data/products';
import { customizationFor, minimumQuantityFor, type Customization } from './custom-order';

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
export type CartLine = { product: Product; qty: number; customization?: Customization };

type Store = {
  product: Product | null;
  cartOpen: boolean;
  lines: CartLine[];
  count: number;
  subtotal: number;
  wishlist: string[];
  signedIn: boolean;
  openProduct: (id: string) => void;
  closeProduct: () => void;
  openCart: () => void;
  closeCart: () => void;
  add: (product: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  customize: (id: string, customization: Customization) => void;
  remove: (id: string) => void;
  clear: () => void;
  toggleWishlist: (id: string) => Promise<void>;
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
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('amazing-cart') || '[]') as { id: string; qty: number; customization?: Customization }[];
      return saved.flatMap(({ id, qty, customization }) => {
        const product = PRODUCTS.find((item) => item.id === id);
        return product && Number.isInteger(qty) && qty > 0 ? [{ product, qty:Math.max(qty,minimumQuantityFor(id)), customization:customization||customizationFor(id) }] : [];
      });
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('amazing-cart', JSON.stringify(lines.map(({ product, qty, customization }) => ({ id: product.id, qty, customization }))));
  }, [lines]);

  const loadWishlist = useCallback(async () => {
    try {
      const session = await fetch('/api/house/storefront/session').then((response) => response.json());
      const authenticated = Boolean(session.user);
      setSignedIn(authenticated);
      if (!authenticated) return setWishlist([]);
      const body = await fetch('/api/house/storefront/wishlist').then((response) => response.json());
      setWishlist(body.productIds || []);
    } catch { setSignedIn(false); }
  }, []);

  useEffect(() => {
    void loadWishlist();
    const changed = () => void loadWishlist();
    window.addEventListener('amazing:auth-changed', changed);
    return () => window.removeEventListener('amazing:auth-changed', changed);
  }, [loadWishlist]);

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
      qty=Math.max(qty,minimumQuantityFor(p.id));
      const at = prev.findIndex((l) => l.product.id === p.id);
      if (at === -1) return [...prev, { product: p, qty, customization:customizationFor(p.id) }];
      const next = [...prev];
      next[at] = { ...next[at], qty: next[at].qty + qty };
      return next;
    });
    setCartOpen(true);
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.product.id !== id) : prev.map((l) => (l.product.id === id ? { ...l, qty:Math.max(qty,minimumQuantityFor(id)) } : l))
    );
  }, []);

  const remove = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.product.id !== id)), []);
  const customize = useCallback((id: string, customization: Customization) => setLines(prev=>prev.map(line=>line.product.id===id?{...line,customization}:line)), []);
  const toggleWishlist = useCallback(async (id: string) => {
    if (!signedIn) {
      window.dispatchEvent(new CustomEvent('amazing:sign-in-requested'));
      return;
    }
    const removing = wishlist.includes(id);
    const response = await fetch(`/api/house/storefront/wishlist/${encodeURIComponent(id)}`, { method: removing ? 'DELETE' : 'PUT' });
    if (!response.ok) throw new Error('Wishlist could not be updated.');
    setWishlist((current) => removing ? current.filter((item) => item !== id) : [id, ...current.filter((item) => item !== id)]);
  }, [signedIn, wishlist]);

  const value = useMemo<Store>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + priceOf(l.product) * l.qty, 0);
    return {
      product,
      cartOpen,
      lines,
      count,
      subtotal,
      wishlist,
      signedIn,
      openProduct: (id: string) => go(`#product/${id}`),
      /* Always back to the page underneath: there is no catalogue route to
         return to any more, and on /shop/ clearing the hash leaves you on the
         catalogue anyway. */
      closeProduct: clearHash,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      add,
      setQty,
      customize,
      remove,
      clear: () => setLines([]),
      toggleWishlist
    };
  }, [product, cartOpen, lines, wishlist, signedIn, go, clearHash, add, setQty, customize, remove, toggleWishlist]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>');
  return ctx;
}
