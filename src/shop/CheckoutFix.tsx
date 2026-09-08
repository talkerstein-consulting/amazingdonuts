import { useState } from 'react';
import {
  BOX_PRODUCTS,
  BULK_PACK_SIZES,
  GLYPH_PRODUCTS,
  PETITE_TYPES,
  PRINT_PRODUCTS,
  type Customization
} from '../lib/custom-order';
import { swatchesFor } from '../lib/petite-palette';
import { SHOP_HREF } from '../lib/shop-href';

/* Same two lists the product page cuts from — explicit, not a char range, so a
   shape the bakery cannot make is removed by deleting it from one. */
const NUMBERS = '0123456789'.split('');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * The one thing a blocked line is missing, asked on the checkout page.
 *
 * Everything customised is specified on its product page, and a bag line reads
 * that back rather than re-asking it — see `CartCustomization`, which is
 * deliberately read-only, because a required field on a bag row asks after the
 * sale. This is the exception, and only the exception: a line that is NOT
 * answered, at the point where the unanswered question is the reason the order
 * cannot be placed.
 *
 * Before this, checkout's only response to an unfinished line was to disable
 * the button and say "Finish custom items in your cart" — which named neither
 * the item nor the question, and pointed at a bag that could not answer it
 * either. The way out was to work out which line it meant, leave checkout,
 * find the product, and start over. A letter cake could reach this state from
 * an ordinary add, so it was not a corner case: the product page did not
 * require a shape before adding one. That is fixed at the source as well.
 *
 * Two of the four kinds are answered here, and two are not:
 *
 *   glyph, petite — one question each, one control each. Asked and done.
 *
 *   print, box    — the answer is a builder. A printed dozen needs artwork
 *                   uploaded and apportioned across its dozens; a box needs
 *                   six or twelve flavours picked off a tray. Rebuilding
 *                   either inside a summary row would be a second, smaller
 *                   version of a screen that already exists, and the smaller
 *                   version is where the two drift apart. They get a labelled
 *                   way back to the real one instead. Neither is reachable
 *                   from an ordinary add — both pages refuse an unfinished
 *                   line — so this is the stale-bag path, not the everyday
 *                   one.
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
  const glyphValue = value?.kind === 'glyph' ? value.glyph : '';
  /* Which list is showing is state, not a reading of the answer.
     Derived from the answer it could not be changed while there was no answer
     — and no answer is exactly the state this component exists for, so the
     Letter button would have done nothing on the only line that needs it.
     Seeded from the answer for the case where there is one. */
  const [mode, setMode] = useState<'number' | 'letter'>(() =>
    /[A-Z]/i.test(glyphValue) ? 'letter' : 'number'
  );

  if (GLYPH_PRODUCTS.has(productId)) {
    const options = mode === 'letter' ? LETTERS : NUMBERS;

    return (
      <div className="checkout-fix">
        <p className="checkout-fix__ask">Which shape should this cake be cut as?</p>
        <div className="checkout-fix__row">
          <div className="checkout-fix__modes" role="radiogroup" aria-label="Number or letter">
            {(['number', 'letter'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={mode === option}
                className={`checkout-fix__mode${mode === option ? ' is-on' : ''}`}
                onClick={() => {
                  if (option === mode) return;
                  setMode(option);
                  /* Switching lists drops the answer rather than carrying a
                     digit into the letters. The line goes back to unanswered,
                     which is honest — it is. */
                  onChange({ kind: 'glyph', glyph: '' });
                }}
              >
                {option === 'number' ? 'Number' : 'Letter'}
              </button>
            ))}
          </div>

          <select
            className="checkout-fix__select"
            aria-label={mode === 'letter' ? 'Which letter' : 'Which number'}
            value={glyphValue}
            onChange={(event) => onChange({ kind: 'glyph', glyph: event.target.value })}
          >
            <option value="">Choose&hellip;</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  const packSize = BULK_PACK_SIZES.get(productId);
  if (packSize) {
    const current = value?.kind === 'petite' ? value : null;
    const type = PETITE_TYPES.find((t) => t.id === current?.type) ?? PETITE_TYPES[0];
    const swatches = swatchesFor(type.palette ?? null);

    return (
      <div className="checkout-fix">
        <p className="checkout-fix__ask">
          Which {type.asks} for these {qty * packSize} donuts?
        </p>
        <div className="checkout-fix__swatches" role="radiogroup" aria-label={`Which ${type.asks}`}>
          {swatches.map((sw) => (
            <button
              key={sw.id}
              type="button"
              role="radio"
              aria-checked={current?.colourId === sw.id}
              title={sw.name}
              className={`checkout-fix__swatch${current?.colourId === sw.id ? ' is-on' : ''}`}
              onClick={() =>
                onChange({ kind: 'petite', type: type.id, colourId: sw.id, colours: sw.name })
              }
            >
              {/* One dot for an icing, several for a sprinkle mix — the palette
                  says how many, so the same swatch draws both. */}
              <span aria-hidden="true">
                {sw.dots.map((dot, i) => (
                  <i key={i} style={{ background: dot }} />
                ))}
              </span>
              {sw.name}
            </button>
          ))}
        </div>
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
