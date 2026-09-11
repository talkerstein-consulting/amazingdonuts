import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BOX_BUILDER_IDS, CATEGORIES, INTERNAL_PRODUCT_IDS, type Category, type Product } from '../data/products';
import CollectionRail from '../shop/CollectionRail';
import BoxCard from './BoxCard';
import { tagFor } from '../data/product-tags';
import { Badge, BrandButton, C, F, SQUIRCLE } from './brand';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useBoxQty, useShop } from '../lib/shop';
import AddControl from './AddControl';
import { SHOP_HREF, shopHref } from '../lib/shop-href';
import { smoothScrollTo } from '../lib/smooth-scroll';
import { COMPACT_CATEGORY_BAR_HEIGHT, useStickyCategoryBar } from '../hooks/useStickyCategoryBar';

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
      className={`product-tile${BOX_BUILDER_IDS.has(product.id) ? ' product-wide' : ''}`}
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

      <div className="product-tile__meta">
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
            /* The shared tile step: substantial enough to anchor the price row
               without competing with the category heading above it. */
            fontWeight: 700,
            fontSize: 16,
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
        <span className="product-tile__price" style={{ fontFamily: F.text, fontWeight: 700, fontSize: 14, color: C.price }}>{product.price}</span>
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
      /* The add knob deliberately straddles its photo bed by 6px. Keep the
         section overflow visible so the last tile receives the same complete
         control as every other tile; the panel's own background still follows
         its rounded corners without clipping its children. */
      style={{ borderRadius: 24, background: C.cream, overflow: 'visible' }}
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
              <BrandButton
                href={shopHref({ category })}
                variant="outline"
                block
                style={{
                  textDecoration: 'none',
                  fontSize: 15,
                  minHeight: 52
                }}
              >
                Shop all {category}
                <span style={{ opacity: 0.6, marginLeft: 8 }}>+{hidden} more</span>
              </BrandButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Catalog() {
  const { products } = useShop();
  const [collapsed, setCollapsed] = useState<Set<Category>>(() => new Set());
  const [active, setActive] = useState<Category | null>(null);
  const columns = useIsDesktop() ? 4 : 2;
  const bar = useStickyCategoryBar();

  const byCategory = useMemo(() => CATEGORIES.map((category) => ({
    category,
    products: products.filter((product) => product.category === category && !BOX_BUILDER_IDS.has(product.id) && !INTERNAL_PRODUCT_IDS.has(product.id))
  })).filter((group) => group.products.length > 0), [products]);
  const boxes = useMemo(() => products.filter((product) => BOX_BUILDER_IDS.has(product.id)), [products]);

  const jumpTo = (category: Category | null) => {
    if (!category) {
      window.location.href = SHOP_HREF;
      return;
    }
    setActive(category);
    setCollapsed((current) => {
      const next = new Set(current);
      next.delete(category);
      return next;
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const row = document.getElementById(`home-${category.toLowerCase()}`);
      // Lenis and native scrolling both honor the measured scroll-margin-top.
      if (row) smoothScrollTo(row);
    }));
  };

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const viewportTop = bar.stuck
        ? (bar.inner.current?.getBoundingClientRect().bottom ?? bar.stickyTop + COMPACT_CATEGORY_BAR_HEIGHT) + 16
        : bar.stickyTop;
      let current: Category | null = null;
      let preceding: Category | null = null;
      let largestVisible = 0;
      // Follow the section being read, even before its heading reaches the bar.
      for (const { category } of byCategory) {
        const row = document.getElementById(`home-${category.toLowerCase()}`);
        if (!row) continue;
        const bounds = row.getBoundingClientRect();
        if (bounds.top <= viewportTop) preceding = category;
        const visible = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, viewportTop));
        if (visible > largestVisible) {
          current = category;
          largestVisible = visible;
        }
      }
      setActive(current ?? preceding);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    byCategory.forEach(({ category }) => {
      const row = document.getElementById(`home-${category.toLowerCase()}`);
      if (row) observer.observe(row);
    });
    if (bar.inner.current) observer.observe(bar.inner.current);
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [byCategory, bar.stickyTop, bar.stuck]);

  return (
    <section
      id="favorites"
      className="section-band"
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: 'clamp(18px,2.4vw,32px) clamp(18px,4vw,40px) var(--gap-section-y)',
        ['--home-category-offset' as string]: `${bar.stickyTop + COMPACT_CATEGORY_BAR_HEIGHT + 16}px`
      }}
    >
      {boxes.length > 0 && (
        <div className="home-boxes">
          {boxes.map((product) => <BoxCard key={product.id} product={product} />)}
        </div>
      )}
      <h2 className="favorites-title" style={{ margin: '0 0 clamp(18px,2.4vw,28px)', maxWidth: '14ch', fontSize: 'var(--type-section)', lineHeight: 0.92, color: 'var(--navy)' }}>
        Everyone has a favourite
      </h2>
      <div ref={bar.sentinel} className="category-bar-sentinel" aria-hidden="true" />
      <div className={`category-bar home-rail${bar.stuck ? ' is-stuck' : ''}`} style={bar.style}>
        <div className="category-bar__inner home-rail__inner" ref={bar.inner}>
          <CollectionRail active={active} onPick={jumpTo} compact={bar.stuck} showAll={false} />
        </div>
      </div>
      <div className="home-categories">
        {byCategory.map(({ category, products: categoryProducts }) => (
          <CategoryRow
            key={category}
            category={category}
            products={categoryProducts}
            columns={columns}
            open={!collapsed.has(category)}
            onToggle={() => setCollapsed((current) => {
              const next = new Set(current);
              if (next.has(category)) next.delete(category);
              else next.add(category);
              return next;
            })}
          />
        ))}
      </div>
    </section>
  );
}
