import type { ReactNode } from 'react';
import type { Product } from '../data/products';
import { C, F, SQUIRCLE } from './brand';

/**
 * A product as a horizontal line: squircle thumbnail, name, price, and
 * whatever controls the place it sits in needs under them.
 *
 * This is the cart drawer's line item, lifted out so it can be used away from
 * the drawer. The review section had grown its own version of the same object
 * — a different thumbnail size, a different name scale, its own stylesheet
 * block — and the two had already drifted apart twice. There is one card now;
 * the drawer passes a stepper and a remove button as `children`, and the
 * review passes nothing.
 *
 * The card is only the contents. Whatever wraps it decides whether it is a
 * list item, a button, or a plain box, and carries `.cart__line` for the sand
 * bed and radius.
 */
export default function ProductLine({ product, children }: { product: Product; children?: ReactNode }) {
  return (
    <div className="cart__line-main">
      <span className="cart__thumb" style={{ clipPath: SQUIRCLE }}>
        <img
          src={product.img}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.14)' }}
        />
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: 14,
            lineHeight: 1.25,
            color: C.navy,
            /* Two lines maximum: the catalogue has names as long as "Petite
               Size Donut (Bulk Order Only)", and an unclamped one would set
               the height of every card in the column beside it. */
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {product.name}
        </p>
        <p style={{ margin: '4px 0 0', fontFamily: F.text, fontWeight: 700, fontSize: 13, color: C.price }}>
          {product.price}
        </p>

        {children}
      </div>
    </div>
  );
}
