import {
  BOX_PRODUCTS,
  BULK_PACK_SIZES,
  FINISH_PRODUCTS,
  GLYPH_PRODUCTS,
  PRINT_PRODUCTS,
  type Customization
} from '../lib/custom-order';
import { SHOP_HREF } from '../lib/shop-href';
import FinishPicker from './FinishPicker';
import GlyphPicker from './GlyphPicker';

/**
 * The one thing a blocked line is missing, asked on the checkout page.
 *
 * Everything customised is specified on its product page, and the bag reads it
 * back — see `CartCustomization`, which now also lets the answerable ones be
 * changed in place. This is the last resort: a line that is NOT answered, at
 * the point where the unanswered question is the reason the order cannot be
 * placed.
 *
 * Before this, checkout's only response was a disabled button reading "Finish
 * custom items in your cart", which named neither the item nor the question.
 *
 * The controls are the same components the drawer and the product page use —
 * `FinishPicker`, `GlyphPicker` — so a question cannot be worded one way here
 * and another way there. Print and box get a labelled way to their builder
 * instead: a printed dozen needs artwork uploaded and apportioned across its
 * dozens, a box needs six flavours picked off a tray, and a smaller second
 * copy of either inside a summary row is where the two would drift apart.
 */
export default function CheckoutFix({
  productId,
  qty,
  value,
  onChange
}: {
  productId: string;
  qty: number;
  value?: Customization;
  onChange: (next: Customization) => void;
}) {
  if (GLYPH_PRODUCTS.has(productId)) {
    return (
      <div className="checkout-fix">
        <p className="checkout-fix__ask">Which shape should this cake be cut as?</p>
        <GlyphPicker
          value={value?.kind === 'glyph' ? value.glyph : ''}
          onChange={(glyph) => onChange({ kind: 'glyph', glyph })}
        />
      </div>
    );
  }

  if (FINISH_PRODUCTS.has(productId)) {
    const pack = BULK_PACK_SIZES.get(productId);
    return (
      <div className="checkout-fix">
        <p className="checkout-fix__ask">How should these be finished?</p>
        <FinishPicker value={value} onChange={onChange} units={pack ? pack * qty : undefined} />
      </div>
    );
  }

  /* The two that need their builder. Named precisely — "finish custom items"
     is the message that made the old checkout useless. */
  const isPrint = PRINT_PRODUCTS.has(productId);
  const isBox = BOX_PRODUCTS.has(productId);
  if (!isPrint && !isBox) return null;

  return (
    <div className="checkout-fix">
      <p className="checkout-fix__ask">
        {isPrint
          ? 'This dozen needs its icing and artwork before it can be baked.'
          : 'This box needs its flavours picked before it can be packed.'}
      </p>
      <a className="checkout-fix__link" href={`${SHOP_HREF}#product/${productId}`}>
        {isPrint ? 'Upload the artwork' : 'Fill the box'}
      </a>
    </div>
  );
}
