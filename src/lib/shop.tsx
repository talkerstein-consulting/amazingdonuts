import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRODUCTS, type Product } from '../data/products';
import { customizationFor, minimumQuantityFor, PRINT_PRODUCTS, type Customization } from './custom-order';
import { recordProductView } from './recently-viewed';

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

/**
 * What makes a bag row its own row.
 *
 * The bag was keyed on the product id alone, which is right for everything the
 * bakery sells off a shelf and wrong for the letter cake: spelling "OMG" is
 * three adds of one product, and one row per product collapsed them into a
 * single line whose glyph was whichever letter went in last. The customer saw
 * one cake, was charged for one cake, and the bakery was told to cut a "G".
 *
 * So a glyph line is identified by its character too. Every other line keys on
 * the product id exactly as before, which is why `setQty`, `remove` and
 * `customize` still take an id from every call site that has only ever had
 * one.
 */
export const lineKeyOf = (line: { product: Product; customization?: Customization }) =>
  line.customization?.kind === 'glyph' && line.customization.glyph
    ? `${line.product.id}::${line.customization.glyph}`
    : line.product.id;

type Store = {
  products: Product[];
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
  /* `customization` is set as the line is created rather than written over it
     by a following `customize` call. Two steps could not tell a new glyph line
     from an existing one — `add` had already merged into the wrong row by the
     time the character arrived. */
  add: (product: Product, qty?: number, opts?: { openCart?: boolean; customization?: Customization }) => void;
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
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
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

  useEffect(() => {
    let active = true;
    fetch('/api/house/storefront/catalog', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Square catalog is unavailable.');
      return response.json();
    }).then(body => {
      if (!active) return;
      const live = new Map((body.products || []).map((item: { name:string;price:number }) => [item.name.toLowerCase(), item]));
      const next = PRODUCTS.map(product => {
        const match = live.get(product.name.toLowerCase()) as { price:number;boxFlavours?:string[] } | undefined;
        return match ? { ...product, price: money(match.price / 100), boxFlavours: match.boxFlavours } : product;
      });
      setProducts(next);
      setLines(current => current.map(line => ({ ...line, product: next.find(item => item.id === line.product.id) || line.product })));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

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

  /* The bag does NOT open when the flying donut lands in it.

     It used to. A `CART_LANDED` listener here opened the drawer after every
     flight, which quietly overrode `add`'s own `openCart: false` — the flag
     six call sites pass precisely to keep the drawer shut. The letter cake is
     where that showed: spelling a word is one add per letter, and the drawer
     came over the picker on every single one.

     The flight is the confirmation. Where an add needs the drawer as well, the
     caller says so by leaving `openCart` at its default. */

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
    () => (route.productId ? products.find((p) => p.id === route.productId) ?? null : null),
    [route.productId, products]
  );

  /* The last thing they opened, kept for `ReturnPrompt`, and the running
     history the product page's "Recently viewed" row reads.
     `localStorage`, not state: the point of both is to survive the visitor
     leaving, and the prompt that reads it may well be on a different page of
     the site by the time it does — the shop, the Lab and the homepage are three
     separate documents here.

     Recorded here rather than in the panel because this is the one place that
     knows a product was opened, however it was opened — a tile, a deep link, a
     back button, or one recommendation leading to the next. */
  useEffect(() => {
    if (!product) return;
    try {
      localStorage.setItem('amazing-last-product', product.id);
    } catch {
      /* Private mode, or storage full. The prompt simply never fires. */
    }
    recordProductView(product.id);
  }, [product]);

  const add = useCallback((p: Product, qty = 1, { openCart = true, customization }: { openCart?: boolean; customization?: Customization } = {}) => {
    setLines((prev) => {
      qty=Math.max(qty,minimumQuantityFor(p.id));
      const spec = customization ?? customizationFor(p.id);
      const key = lineKeyOf({ product: p, customization: spec });
      const at = prev.findIndex((l) => lineKeyOf(l) === key);
      if (at === -1) return [...prev, { product: p, qty, customization: spec }];
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

  /* These three take either a line key or a bare product id. A product that
     can only ever be one row is both, so the call sites that predate keys are
     untouched; the bag drawer and the checkout pass `lineKeyOf(line)`, which
     is the only way to name one letter of a spelled word. */
  const hits = (line: CartLine, key: string) => lineKeyOf(line) === key || line.product.id === key;

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => !hits(l, key)) : prev.map((l) => (hits(l, key) ? { ...l, qty:Math.max(qty,minimumQuantityFor(l.product.id)) } : l))
    );
  }, []);

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => !hits(l, key))), []);
  const customize = useCallback((key: string, customization: Customization) => setLines(prev=>prev.map(line=>hits(line,key)?{...line,customization}:line)), []);
  const toggleWishlist = useCallback(async (id: string) => {
    if (!signedIn) {
      window.dispatchEvent(new CustomEvent('amazing:sign-in-requested'));
      return;
    }
    const removing = wishlist.includes(id);
    /* Paint first, then confirm. The heart is the whole feedback for this
       control, so it has to answer the tap - but it must not keep a filled
       state the server never stored, which is how a save looks taken and is
       gone on the next load. A rejected write puts it back. */
    setWishlist((current) => removing ? current.filter((item) => item !== id) : [id, ...current.filter((item) => item !== id)]);
    try {
      const response = await fetch(`/api/house/storefront/wishlist/${encodeURIComponent(id)}`, { method: removing ? 'DELETE' : 'PUT' });
      if (!response.ok) throw new Error('Wishlist could not be updated.');
    } catch {
      setWishlist((current) => removing ? [id, ...current.filter((item) => item !== id)] : current.filter((item) => item !== id));
    }
  }, [signedIn, wishlist]);

  const value = useMemo<Store>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + unitPriceOf(l) * l.qty, 0);
    return {
      products,
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
  }, [products, product, cartOpen, lines, wishlist, signedIn, go, clearHash, add, setQty, customize, remove, toggleWishlist]);

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
