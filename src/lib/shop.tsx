import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRODUCTS, type Product } from '../data/products';
import { customizationFor, minimumQuantityFor, PRINT_PRODUCTS, type Customization } from './custom-order';
import { CART_LANDED } from './fly-to-cart';

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
  /* `openCart` is what a caller says when the add is its own confirmation.
     The cart drawer opening is how a link or a detail panel confirms an item
     landed in the box; a grid tile confirms it in place, by turning its plus
     into a stepper, and covering that with the drawer is what stopped anyone
     from seeing it happen. */
  add: (product: Product, qty?: number, opts?: { openCart?: boolean }) => void;
  setQty: (id: string, qty: number) => void;
  customize: (id: string, customization: Customization) => void;
  remove: (id: string) => void;
  clear: () => void;
  toggleWishlist: (id: string) => Promise<void>;
};

const ShopContext = createContext<Store | null>(null);

/** Prices in the catalogue are strings like "$2.00". */
export const priceOf = (p: Product) => Number(p.price.replace(/[^0-9.]/g, '')) || 0;

/**
 * What one unit of a line costs, customization included.
 *
 * A Donut Lab donut is priced from its parts: the catalogue price is the empty
 * shape and each chosen element adds to it, so the bag's arithmetic has to read
 * the line rather than the product. Every other line is just its product's own
 * price, which is what `priceOf` already answers.
 */
export const unitPriceOf = (line: { product: Product; customization?: Customization }) =>
  priceOf(line.product) +
  (line.customization?.kind === 'lab'
    ? line.customization.elements.reduce((sum, el) => sum + el.price, 0)
    : 0);
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
        /* `icingFlavor` was renamed `icingFlavour`. A bag saved before that
           still carries the old key, and a print line whose icing reads empty
           is one checkout refuses to take — with nothing in the cart to fix it,
           since the spec is read back there rather than asked for. So the old
           spelling is accepted on the way in and written back in the new one. */
        const migrated: Customization | undefined =
          customization && customization.kind === 'print' && !customization.icingFlavour
            ? {
                ...customization,
                icingFlavour:
                  (customization as { icingFlavor?: 'Chocolate' | 'Vanilla' }).icingFlavor ?? ''
              }
            : customization;
        return product && Number.isInteger(qty) && qty > 0 ? [{ product, qty:Math.max(qty,minimumQuantityFor(id)), customization:migrated||customizationFor(id) }] : [];
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

  /* The bag opens when the flying donut lands in it.

     Every add already animated a donut into the bag button, and the bag then
     did nothing — the flight said where the thing went and stopped there, so
     the next step was always the visitor finding and pressing the bag
     themselves. Opening it on arrival makes the animation the transition into
     the drawer rather than a flourish beside it.

     Driven by an event because `flyToCart` is a plain module with no access to
     this context and is called from six places — see `CART_LANDED`, which
     fires once, after the LAST donut of a batch. */
  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener(CART_LANDED, open);
    return () => window.removeEventListener(CART_LANDED, open);
  }, []);

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

  /* The last thing they opened, kept for `ReturnPrompt`.
     `localStorage`, not state: the point of it is to survive the visitor
     leaving, and the prompt that reads it may well be on a different page of
     the site by the time it does — the shop, the Lab and the homepage are three
     separate documents here. */
  useEffect(() => {
    if (!product) return;
    try {
      localStorage.setItem('amazing-last-product', product.id);
    } catch {
      /* Private mode, or storage full. The prompt simply never fires. */
    }
  }, [product]);

  const add = useCallback((p: Product, qty = 1, { openCart = true }: { openCart?: boolean } = {}) => {
    setLines((prev) => {
      qty=Math.max(qty,minimumQuantityFor(p.id));
      const at = prev.findIndex((l) => l.product.id === p.id);
      if (at === -1) return [...prev, { product: p, qty, customization:customizationFor(p.id) }];
      const next = [...prev];
      /* A printed line REPLACES rather than accumulates. The artwork covers a
         stated number of dozens, and it is chosen on the product page against
         the quantity set there — so adding a second print of the same product
         used to leave one line at the summed quantity with designs covering
         only part of it. That line can never be completed now that the cart
         reads the spec back rather than asking for it, so the second visit to
         the page is the order, not an addition to one. */
      next[at] = PRINT_PRODUCTS.has(p.id)
        ? { ...next[at], qty }
        : { ...next[at], qty: next[at].qty + qty };
      return next;
    });
    if (openCart) setCartOpen(true);
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
    const subtotal = lines.reduce((n, l) => n + unitPriceOf(l) * l.qty, 0);
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

/**
 * How many of each product are in the box, by product id.
 *
 * Every product grid on the site marks what the visitor has already added, and
 * each of them would otherwise scan `lines` once per tile — sixty tiles, sixty
 * scans, on every cart change. One map, built once per change.
 *
 * A product with a customization can appear on more than one line (two custom
 * dozens with different artwork are two lines), so the quantities add up
 * rather than the last one winning.
 */
export function useBoxQty(): Record<string, number> {
  const { lines } = useShop();
  return useMemo(() => {
    const by: Record<string, number> = {};
    for (const line of lines) by[line.product.id] = (by[line.product.id] ?? 0) + line.qty;
    return by;
  }, [lines]);
}
