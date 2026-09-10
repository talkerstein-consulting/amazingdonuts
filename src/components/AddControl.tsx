import { Minus, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Product } from '../data/products';
import { C } from './brand';
import { useBoxQty, useShop } from '../lib/shop';
import { customizationFor } from '../lib/custom-order';
import { flyToCart } from '../lib/fly-to-cart';

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
 * and it meant every add cost a dismissal before the next one. What connects
 * the tile to the header's count is the flight — the product arcs up to the
 * bag and the bag reacts, so the number changing in the far corner is
 * something you watched happen rather than something you have to go and
 * check.
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
  const { add, setQty, openProduct } = useShop();
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

  /* Anything that has to be specified opens its page instead of being added.

     It was only the boxes: an empty box is a line the counter cannot pack, so
     the knob opened the builder. But the same is true of every product that
     carries a customization — a letter cake with no letter, a printed dozen
     with no artwork, a petite tray with no colours. Adding those from a tile
     put a line in the bag that checkout then refused, and the visitor had to
     work out which one and go and finish it.

     `customizationFor` is the existing answer to "does this need specifying",
     so the rule follows the data rather than a list kept in step by hand: add a
     product to the customization system and its knob starts opening its page.

     These never become steppers either. A second press should ask the second
     donut's questions, not silently make two of the first. */
  const needsSpec = Boolean(customizationFor(product.id));

  if (product.available === false) return <span style={{ ...face, padding: '0 10px', display: 'grid', placeItems: 'center', background: C.navy, fontSize: 12 }}>Unavailable</span>;

  if (needsSpec) {
    return (
      <button
        type="button"
        className="brand-press"
        onClick={() => openProduct(product.id)}
        aria-label={`Choose options for ${product.name}`}
        style={{ ...face, width: s.pill, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
      >
        <Plus size={s.icon} strokeWidth={3} />
      </button>
    );
  }

  if (!qty) {
    return (
      <button
        type="button"
        className="brand-press"
        onClick={(event) => {
          add(product, 1, { openCart: false });
          /* The button itself is gone on the next tick — it becomes a stepper —
             so the flight is measured from the photo bed it sits on, which
             stays put and is what the donut appears to leave. */
          flyToCart(event.currentTarget.parentElement, product.img);
        }}
        aria-label={
          product.id === 'twelve-custom-printed-donuts'
            ? 'Customize Twelve Custom Printed Donuts'
            : `Add ${product.name} to bag`
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
       announcing the number as a third control.

       Dare Devil, like the plus it replaces. The knob is one control in two
       states — add, then adjust — and changing its colour on the first tap
       made it read as a different control appearing rather than the same one
       counting. The photo bed behind it carries the "in your bag" signal in
       Harbour; the knob stays the action. */
    <div
      style={{ ...face, display: 'flex', alignItems: 'center', padding: '0 2px' }}
      role="group"
      aria-label={`${product.name}: ${qty} in your bag`}
    >
      <button
        type="button"
        className="brand-press"
        onClick={() => setQty(product.id, qty - 1)}
        aria-label={qty === 1 ? `Remove ${product.name} from your bag` : `Remove one ${product.name}`}
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
        onClick={(event) => {
          setQty(product.id, qty + 1);
          flyToCart(event.currentTarget.closest('div')?.parentElement ?? null, product.img);
        }}
        aria-label={`Add another ${product.name}`}
        style={stepFace}
      >
        <Plus size={s.stepIcon} strokeWidth={3.2} />
      </button>
    </div>
  );
}
