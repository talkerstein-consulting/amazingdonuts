import { Minus, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Product } from '../data/products';
import { C } from './brand';
import { useBoxQty, useShop } from '../lib/shop';

/**
 * The add control on a product photo bed — the same knob on the homepage
 * teaser, in Shop all, and on the product attached to a review, so the three
 * cannot drift apart.
 *
 * Empty, it is the orange plus knob it has always been. Once the product is in
 * the box it becomes a stepper: minus, count, plus. This is a bulk-buy bakery —
 * people order a dozen donuts, not one — and before this the only way to go
 * from six back to five was to open the cart drawer and find the line. The
 * knob could add and nothing on the card could take away.
 *
 * It grows leftwards from the corner it already occupied (`right` is pinned,
 * `left` is not), so the plus never moves as the count changes. A stepper that
 * shifted its own plus under the cursor would punish the second tap of every
 * pair.
 *
 * Nothing here opens the cart drawer — not the first add and not the steps
 * after it. The knob turning into a stepper, on the tile, is the confirmation:
 * the drawer sliding over the grid buried the very thing it was confirming,
 * and it meant every add cost a dismissal before the next one. Items still
 * announce themselves through the header's cart count.
 */

/**
 * Two scales, because the control sits on two sizes of card.
 *
 * `md` is the catalogue knob: 34px, straddling the top-right corner of a photo
 * bed. `sm` is the review strip's, which is deliberately the smallest thing on
 * its card — a 44px disc there put a big orange target in direct competition
 * with the product name beside it, on a card whose job is to show what a
 * reviewer bought. Only the geometry differs; the behaviour is one
 * implementation.
 */
const SIZES = {
  md: { place: { top: -6, right: -6 } as CSSProperties, pill: 34, step: 30, icon: 19, stepIcon: 15 },
  sm: { place: { bottom: 10, right: 10 } as CSSProperties, pill: 28, step: 24, icon: 16, stepIcon: 13 }
} as const;

export default function AddControl({
  product,
  size = 'md'
}: {
  product: Product;
  size?: keyof typeof SIZES;
}) {
  const { add, setQty } = useShop();
  const qty = useBoxQty()[product.id] ?? 0;
  const s = SIZES[size];

  const face: CSSProperties = {
    position: 'absolute',
    zIndex: 2,
    ...s.place,
    height: s.pill,
    borderRadius: 99,
    border: 'none',
    background: C.orange,
    color: '#fff',
    boxShadow: size === 'md' ? '0 4px 12px rgba(14,62,105,.22)' : '0 2px 7px rgba(14,62,105,.2)'
  };

  const stepFace: CSSProperties = {
    width: s.step,
    height: s.step,
    display: 'grid',
    placeItems: 'center',
    border: 'none',
    borderRadius: 99,
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer'
  };

  if (!qty) {
    return (
      <button
        type="button"
        className="brand-press"
        onClick={() => add(product, 1, { openCart: false })}
        aria-label={
          product.id === 'twelve-custom-printed-donuts'
            ? 'Customize Twelve Custom Printed Donuts'
            : `Add ${product.name} to box`
        }
        style={{ ...face, width: s.pill, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
      >
        <Plus size={s.icon} strokeWidth={3} />
      </button>
    );
  }

  return (
    /* Not a button: it holds two of them. The count between them is plain
       text, so a screen reader reads "remove one, 3, add one" rather than
       announcing the number as a third control. */
    <div
      style={{ ...face, display: 'flex', alignItems: 'center', padding: '0 2px' }}
      role="group"
      aria-label={`${product.name}: ${qty} in your box`}
    >
      <button
        type="button"
        className="brand-press"
        onClick={() => setQty(product.id, qty - 1)}
        aria-label={qty === 1 ? `Remove ${product.name} from your box` : `Remove one ${product.name}`}
        style={stepFace}
      >
        <Minus size={s.stepIcon} strokeWidth={3.2} />
      </button>

      <span
        className="product-knob__qty"
        style={{ minWidth: 14, textAlign: 'center', fontSize: size === 'md' ? 14 : 13 }}
        aria-hidden="true"
      >
        {qty}
      </span>

      <button
        type="button"
        className="brand-press"
        onClick={() => setQty(product.id, qty + 1)}
        aria-label={`Add another ${product.name}`}
        style={stepFace}
      >
        <Plus size={s.stepIcon} strokeWidth={3.2} />
      </button>
    </div>
  );
}
