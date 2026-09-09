import { Badge, C, F, SQUIRCLE } from './brand';
import { tagFor } from '../data/product-tags';
import type { Product } from '../data/products';
import AddControl from './AddControl';

/**
 * One product, as the catalogue draws it: photo bed, add knob, tag, name,
 * price.
 *
 * Shared, because three places show a product tile and they have to be the
 * same object: the catalogue grid, the results page, and the row of
 * bestsellers a failed search falls back to. A visitor whose search found
 * nothing is the last person who should be handed a smaller, flatter
 * imitation of the thing they were looking for — and three copies of this
 * markup would have drifted the first time any of them was touched.
 *
 * Only the card. Whatever renders it decides whether it animates in: the
 * catalogue wraps it in a `motion.article` because the entry animation and the
 * layout projection belong to the grid, not to the tile.
 */
export default function ProductTile({
  product,
  onOpen,
  inBox
}: {
  product: Product;
  onOpen: (product: Product) => void;
  inBox: boolean;
}) {
  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => onOpen(product)}
          aria-label={`View ${product.name}`}
          style={{
            display: 'block',
            width: '100%',
            aspectRatio: '1',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            /* See the homepage grid: the bed carries the state,
               because a ring on a squircle-clipped element is clipped
               away with it. */
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
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              /* One scale for every product. The heart and the Star of
                 David used to be shrunk to 0.82 here and nowhere else,
                 so the same two donuts were a different size in this
                 grid than on the homepage, the panel, the bag line and
                 the search results â€” which reads as the products being
                 smaller rather than as the tiles being different. */
              transform: 'scale(1.18)'
            }}
          />
        </button>

        <AddControl product={product} />
      </div>

      <button
        type="button"
        onClick={() => onOpen(product)}
        style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
      >
        {/* Markup-wise the tag belongs to the text, not to the photo,
            and `.product-tag` is what decides where it is drawn: over
            the picture's top-left corner on a wide grid, and in the
            flow above the name on a phone â€” see the rule. It cannot be
            two elements, because a duplicated badge is read twice. */}
        {tagFor(product.id) && (
          <span className="product-tag">
            <Badge badge={tagFor(product.id)!} compact />
          </span>
        )}
        <h4
          style={{
            margin: 0,
            fontFamily: F.display,
            /* Up a tier from 14/400. Karla at 800 made every name shout
               and left the grid with no hierarchy in it, but 14 at
               Regular put the product's own name below its price in
               weight â€” the one thing on a tile that has to be read
               first was the quietest thing on it. */
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
        <span style={{ fontFamily: F.text, fontWeight: 500, fontSize: 14, color: C.price }}>{product.price}</span>
      </button>
    </>
  );
}
