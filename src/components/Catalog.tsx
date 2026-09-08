import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { BOX_BUILDER_IDS, CATEGORIES, SHOP_PRODUCTS, type Category, type Product } from '../data/products';
import CollectionRail from '../shop/CollectionRail';
import BoxCard from './BoxCard';
import { tagFor } from '../data/product-tags';
import { Badge, C, F, SQUIRCLE } from './brand';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useBoxQty, useShop } from '../lib/shop';
import AddControl from './AddControl';
import { SHOP_HREF, shopHref } from '../lib/shop-href';
import { smoothScrollTo } from '../lib/smooth-scroll';

/** One product inside an expanded category: squircle photo bed, name, price, add. */
function ProductThumb({ product }: { product: Product }) {
  const { openProduct } = useShop();
  const tag = tagFor(product.id);
  /* Already in the box, and how many. The grid is the same grid whether the
     box is empty or holds nine things, and without this a visitor scrolling
     back through sixty products has no way to tell which ones they already
     picked short of opening the cart. */
  const inBox = useBoxQty()[product.id] ?? 0;

  return (
    <article
      className={BOX_BUILDER_IDS.has(product.id) ? 'product-wide' : undefined}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => openProduct(product.id)}
        aria-label={`View ${product.name}`}
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: '1',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          /* The bed carries the state, not a ring around it: the bed is
             clipped to a squircle, and a border or box-shadow on a clipped
             element is clipped away with it. */
          background: inBox ? C.navy : C.canvas,
          clipPath: SQUIRCLE,
          overflow: 'hidden',
          transition: 'background .2s ease'
        }}
      >
        <img
          src={product.img}
          alt={product.name}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.2)' }}
        />
      </button>

        <AddControl product={product} />
      </div>

      <div style={{ minWidth: 0 }}>
        {/* See `.product-tag`: over the picture's top-left on a wide grid, in
            the flow above the name on a phone. The add knob owns the photo's
            top-right corner, so the opposite one is free at any label length. */}
        {tag && (
          <span className="product-tag">
            <Badge badge={tag} compact />
          </span>
        )}
        <h4
          style={{
            margin: 0,
            fontFamily: F.display,
            /* Karla at 800 made every product name shout; the card's job is to be
               scanned, and a grid of extra-bold names has no hierarchy left in
               it. Regular weight, with size and colour doing the work. */
            fontWeight: 400,
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
          {product.name}
        </h4>
        <span style={{ fontFamily: F.text, fontWeight: 500, fontSize: 13, color: C.price }}>{product.price}</span>
      </div>
    </article>
  );
}

/** M · category row — the chip scale, opening onto its products.

    The open row shows exactly two full rows of the grid and stops there; the
    rest of the category lives behind Shop all. Two rows is a different number
    of products at each width — eight on desktop's four-up grid, four on the
    phone's two-up — so the limit has to be read at runtime rather than fixed.
    It was a flat 6, which left a ragged half-row at both widths. */
const PREVIEW_ROWS = 2;

function CategoryRow({
  category,
  products,
  columns,
  open,
  onToggle
}: {
  category: Category;
  products: Product[];
  columns: number;
  open: boolean;
  onToggle: () => void;
}) {
  /* Two full rows, counted in CELLS rather than in products — the two
     build-your-own boxes take two columns each, so slicing to a product count
     overfills the teaser and leaves the ragged half-row the count was written
     to avoid. Take products until the next one would not fit. */
  const shown = useMemo(() => {
    const budget = columns * PREVIEW_ROWS;
    let used = 0;
    return products.filter((product) => {
      const cells = BOX_BUILDER_IDS.has(product.id) ? 2 : 1;
      if (used + cells > budget) return false;
      used += cells;
      return true;
    });
  }, [products, columns]);
  const hidden = products.length - shown.length;

  return (
    /* Anchored, so the category rail above can jump to it. `scroll-margin-top`
       is what keeps the row's own heading out from under the sticky navbar and
       the pickup/delivery band — the same allowance the shop grid's counter
       dividers make. */
    <div
      id={`home-${category.toLowerCase()}`}
      className="home-category"
      style={{ borderRadius: 24, background: C.cream, overflow: 'hidden' }}
    >
      <button
        type="button"
        className="brand-press"
        aria-expanded={open}
        onClick={onToggle}
        style={{
          width: '100%',
          cursor: 'pointer',
          textAlign: 'left',
          border: 'none',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 12
        }}
      >
        {/* The name, and nothing else. It used to lead with a 72px cut-out of
            the category's first product and carry an item count under it —
            a picture of one donut standing in for a whole category, above a
            number nobody is shopping by, and the grid of the real products is
            already directly below. */}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 'clamp(28px,6vw,40px)',
            lineHeight: 1,
            textTransform: 'uppercase',
            color: C.navy
          }}
        >
          {category}
        </span>

        <ChevronDown
          size={22}
          strokeWidth={2.4}
          style={{ flex: 'none', color: C.navy, transition: 'transform .25s ease', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <>
          <div
            className="product-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, padding: '4px 12px 16px' }}
          >
            {shown.map((product) =>
              BOX_BUILDER_IDS.has(product.id) ? (
                <BoxCard key={product.id} product={product} />
              ) : (
                <ProductThumb key={product.id} product={product} />
              )
            )}
          </div>

          {/* The row is a teaser, not the catalogue — the rest live in Shop all. */}
          {hidden > 0 && (
            <div style={{ padding: '0 12px 16px' }}>
              {/* An anchor, and one that names its own collection.
                  This was a button calling `openShop()`, which set the `#shop`
                  hash — the route of the catalogue *overlay*, retired when
                  /shop/ became a real page. The hash landed on the homepage,
                  matched nothing, and the button appeared to do nothing. */}
              <a
                href={shopHref({ category })}
                className="brand-press"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  minHeight: 52,
                  border: 'none',
                  borderRadius: 99,
                  background: 'transparent',
                  boxShadow: `inset 0 0 0 2px ${C.navy}`,
                  color: C.navy,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-cta)',
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase'
                }}
              >
                Shop all {category}
                <span style={{ opacity: 0.6 }}>+{hidden} more</span>
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Catalog() {
  const [query, setQuery] = useState('');
  /* Every counter is open on arrival, and the set tracks what has been closed
     rather than what is open. It used to hold a single `openCategory`, which
     made the section an accordion: four of the five categories were collapsed
     to a 72px strip, so the homepage showed one row of product and asked for a
     click before it showed any more. Closing one is still possible — the
     chevron is unchanged — it is just no longer the default. */
  const [collapsed, setCollapsed] = useState<Set<Category>>(() => new Set());
  /* Two rows of the grid, and the grid is four-up from 900px and two-up below
     — the same breakpoint `.product-grid` uses in `index.css`. */
  const columns = useIsDesktop() ? 4 : 2;

  const searching = query.trim().length > 0;

  /* Scroll to a category's row, opening it first.

     Through `smoothScrollTo` rather than `scrollIntoView`: Lenis owns the
     scroll position on a pointer device, and a native smooth scroll fights it —
     the two ease against each other and the page stops a long way short. The
     helper hands the job to Lenis when it is running and falls back to
     `scrollIntoView` when it is not, which is every touch device.

     Lenis does not honour `scroll-margin-top`, so the allowance for the sticky
     navbar and the pickup/delivery band is passed as an offset and measured
     rather than assumed — the band is only there once a fulfillment choice has
     been made. `.home-category`'s own scroll-margin covers the fallback path.

     Two frames of delay: the row has to be expanded before its final position
     is known, and React's paint lands after the state change. Without the wait
     the jump measures a collapsed row and stops short of it. */
  const jumpTo = (category: Category | null) => {
    if (!category) {
      window.location.href = SHOP_HREF;
      return;
    }
    setCollapsed((current) => {
      const next = new Set(current);
      next.delete(category);
      return next;
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const row = document.getElementById(`home-${category.toLowerCase()}`);
        if (!row) return;
        const chrome = ['header', '.pickup-banner']
          .map((sel) => document.querySelector(sel)?.getBoundingClientRect().bottom ?? 0)
          .reduce((lowest, bottom) => Math.max(lowest, bottom), 0);
        smoothScrollTo(row, -(chrome + 16));
      })
    );
  };

  const byCategory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle ? SHOP_PRODUCTS.filter((p) => p.name.toLowerCase().includes(needle)) : SHOP_PRODUCTS;
    return CATEGORIES.map((category) => ({
      category,
      products: pool.filter((p) => p.category === category)
    })).filter((group) => group.products.length > 0);
  }, [query]);

  return (
    <section
      id="favorites"
      className="section-band"
      style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(18px,2.4vw,32px) clamp(18px,4vw,40px) var(--gap-section-y)' }}
    >
      <h2 className="favorites-title" style={{ margin: '0 0 clamp(18px,2.4vw,28px)', maxWidth: '14ch', fontSize: 'var(--type-section)', lineHeight: 0.92, color: 'var(--navy)' }}>
        Everyone has a favourite
      </h2>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 52,
          padding: '0 18px',
          borderRadius: 99,
          background: C.cream,
          boxShadow: 'inset 0 0 0 2px rgba(14,62,105,.12)',
          marginBottom: 'clamp(16px,2vw,24px)'
        }}
      >
        <Search size={18} strokeWidth={2.25} style={{ flex: 'none', color: C.mute }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you craving?"
          aria-label="Search the menu"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: F.text,
            fontSize: 16,
            color: C.navy
          }}
        />
      </label>

      {/* The same category tabs the catalogue page carries, under the search.
          Search and category are the two ways in, and the homepage offered only
          the first — the sections below are collapsible but you have to scroll
          past all of them to find the one you want.

          On this page they scroll rather than navigate. Every category already
          has a section a few hundred pixels down, so sending somebody to
          another page to see something that is on this one is a page load spent
          to move a scrollbar. It expands the row on the way, since jumping to a
          collapsed heading would land on the one thing that shows nothing.

          `active` is always null: nothing here is filtered, the rail is a set
          of jumps. Shop all is the exception and stays a link — it means the
          whole catalogue, which is a different page and 62 products this band
          only teases. */}
      <CollectionRail active={null} onPick={jumpTo} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {byCategory.map(({ category, products }) => (
          <CategoryRow
            key={category}
            category={category}
            products={products}
            columns={columns}
            // A search force-opens every matching category, whatever was closed.
            open={searching || !collapsed.has(category)}
            onToggle={() =>
              setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(category)) next.delete(category);
                else next.add(category);
                return next;
              })
            }
          />
        ))}

        {byCategory.length === 0 && (
          <p style={{ margin: 0, fontFamily: F.text, fontSize: 16, color: C.mute }}>
            Nothing matches that search. Try a flavour, or clear the search.
          </p>
        )}
      </div>
    </section>
  );
}
