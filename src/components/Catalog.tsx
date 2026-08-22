import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { CATEGORIES, PRODUCTS, type Category, type Product } from '../data/products';
import { C, F, SQUIRCLE } from './brand';
import { useShop } from '../lib/shop';

/** One product inside an expanded category: squircle photo bed, name, price, add. */
function ProductThumb({ product }: { product: Product }) {
  const { add, openProduct } = useShop();

  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          background: C.canvas,
          clipPath: SQUIRCLE,
          overflow: 'hidden'
        }}
      >
        <img
          src={product.img}
          alt={product.name}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.2)' }}
        />
      </button>

        <button
          type="button"
          className="brand-press"
          onClick={() => add(product)}
          aria-label={`Add ${product.name} to box`}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            zIndex: 2,
            width: 34,
            height: 34,
            borderRadius: 99,
            border: 'none',
            background: C.orange,
            color: '#fff',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 4px 12px rgba(14,62,105,.22)'
          }}
        >
          <Plus size={19} strokeWidth={3} />
        </button>
      </div>

      <div style={{ minWidth: 0 }}>
        <h4
          style={{
            margin: 0,
            fontFamily: F.display,
            fontWeight: 800,
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
        <span style={{ fontFamily: F.text, fontWeight: 700, fontSize: 13, color: C.price }}>{product.price}</span>
      </div>
    </article>
  );
}

/** M · category row — the chip scale, opening onto its products.
    The open row shows three rows of the two-up grid and stops there; the rest
    of the category lives behind Shop all. */
const PREVIEW_LIMIT = 6;

function CategoryRow({
  category,
  products,
  open,
  onToggle,
  onShopAll
}: {
  category: Category;
  products: Product[];
  open: boolean;
  onToggle: () => void;
  onShopAll: () => void;
}) {
  const cover = products[0];
  const shown = products.slice(0, PREVIEW_LIMIT);
  const hidden = products.length - shown.length;

  return (
    <div style={{ borderRadius: 24, background: C.cream, overflow: 'hidden' }}>
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
        <span
          style={{
            flex: 'none',
            width: 72,
            height: 72,
            background: C.canvas,
            clipPath: SQUIRCLE,
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden'
          }}
        >
          {cover && <img src={cover.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.14)' }} />}
        </span>

        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          {/* The site's heading face, at the M card's heading size. */}
          <span
            style={{
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
          <span style={{ fontFamily: F.text, fontSize: 13, fontWeight: 700, letterSpacing: '.04em', color: C.mute }}>
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </span>
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
            {shown.map((product) => (
              <ProductThumb key={product.id} product={product} />
            ))}
          </div>

          {/* The row is a teaser, not the catalogue — the rest live in Shop all. */}
          {hidden > 0 && (
            <div style={{ padding: '0 12px 16px' }}>
              <button
                type="button"
                className="brand-press"
                onClick={onShopAll}
                style={{
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
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Catalog() {
  const { openShop } = useShop();
  const [query, setQuery] = useState('');
  const [openCategory, setOpenCategory] = useState<Category | null>(CATEGORIES[0]);

  const searching = query.trim().length > 0;

  const byCategory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(needle)) : PRODUCTS;
    return CATEGORIES.map((category) => ({
      category,
      products: pool.filter((p) => p.category === category)
    })).filter((group) => group.products.length > 0);
  }, [query]);

  return (
    <section
      id="favorites"
      style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(18px,2.4vw,32px) clamp(18px,4vw,40px) var(--gap-section-y)' }}
    >
      <h2 className="favorites-title" style={{ margin: '0 0 clamp(18px,2.4vw,28px)', maxWidth: '14ch', fontSize: 'var(--type-section)', lineHeight: 0.92, color: 'var(--navy)' }}>
        Everyone has a favorite
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {byCategory.map(({ category, products }) => (
          <CategoryRow
            key={category}
            category={category}
            products={products}
            // A search opens every matching category; otherwise one at a time.
            open={searching || openCategory === category}
            onToggle={() => setOpenCategory((current) => (current === category ? null : category))}
            onShopAll={openShop}
          />
        ))}

        {byCategory.length === 0 && (
          <p style={{ margin: 0, fontFamily: F.text, fontSize: 16, color: C.mute }}>
            Nothing matches that search. Try a flavour, or clear the box.
          </p>
        )}
      </div>
    </section>
  );
}
