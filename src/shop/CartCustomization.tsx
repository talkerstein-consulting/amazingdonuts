import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import {
  boxMaxFor,
  BULK_PACK_SIZES,
  customizationFor,
  type Customization
} from '../lib/custom-order';
import { PRINT_SPRINKLE_SWATCHES } from '../lib/petite-palette';
import { PRODUCTS } from '../data/products';
import { useShop } from '../lib/shop';
import FinishPicker, { EMPTY_FINISH, finishSwatches, type Finish } from './FinishPicker';
import GlyphPicker from './GlyphPicker';

/**
 * What a bag line was specified as — and, for the answers that are a control
 * rather than a builder, a way to change it here.
 *
 * The drawer used to be strictly read-only. The reasoning was sound as far as
 * it went: every spec is chosen on the product's own page, and a required
 * field on a bag row asks the question after the sale. But reading an answer
 * back and being unable to change it is its own trap — the only way to swap a
 * pink icing for a blue one was to remove the line, find the product again and
 * start over, and the drawer is exactly where you look at what you have chosen
 * and think better of it.
 *
 * So: stated by default, editable on request. `Edit` opens the same controls
 * the product page uses, `Save` writes them, `Cancel` puts back what was
 * there. Nothing is a live field — an edit is a thing you start and finish, so
 * a mis-tap on a swatch cannot silently change an order.
 *
 * Two kinds do not get inline controls, because their answer is not a control:
 * a printed dozen needs artwork uploaded and apportioned, and a box needs six
 * or twelve flavours picked off a tray. Both have a screen for that already,
 * and a smaller second copy of it inside a 380px drawer is where the two would
 * drift apart. Their Edit opens the real one.
 */
export default function CartCustomization({
  productId,
  qty,
  value
}: {
  productId: string;
  qty: number;
  value?: Customization;
  onChange?: (next: Customization) => void;
}) {
  const { customize, openProduct, closeCart } = useShop();

  /* The two kinds whose editor is a screen of its own. The drawer closes on the
     way: the builder is full-screen and the panel covers most of it, so leaving
     the drawer open behind them stacks two surfaces that both claim to be where
     the editing happens. */
  const openEditor = (id: string) => {
    closeCart();
    openProduct(id);
  };
  const customization = value || customizationFor(productId);

  /* `null` is "not editing". A draft rather than writing straight through, so
     Cancel has something to go back to. */
  const [draft, setDraft] = useState<Customization | null>(null);

  if (!customization) return null;

  const head = (title: string, note: string, onEdit?: () => void) => (
    <div className="cart-custom__head">
      <strong>{title}</strong>
      <span className="cart-custom__note">{note}</span>
      {onEdit && (
        <button type="button" className="cart-custom__edit" onClick={onEdit}>
          <Pencil size={13} strokeWidth={2.4} aria-hidden="true" />
          Edit
        </button>
      )}
    </div>
  );

  /* Save and Cancel, shared by both editable kinds. Save is disabled until the
     draft is a complete answer — a half-finished edit written back would turn
     a good line into one checkout refuses. */
  const actions = (ready: boolean) => (
    <div className="cart-custom__actions">
      <button
        type="button"
        className="cart-custom__save"
        disabled={!ready}
        onClick={() => {
          if (draft) customize(productId, draft);
          setDraft(null);
        }}
      >
        <Check size={14} strokeWidth={3} aria-hidden="true" />
        Save
      </button>
      <button type="button" className="cart-custom__cancel" onClick={() => setDraft(null)}>
        <X size={14} strokeWidth={2.6} aria-hidden="true" />
        Cancel
      </button>
    </div>
  );

  /* --- the box: chosen in the builder, shown here ------------------------ */
  if (customization.kind === 'box') {
    return (
      <div className="cart-custom">
        {head(
          'In this box',
          `${customization.donuts.length}/${boxMaxFor(productId) || customization.donuts.length}`,
          () => openEditor(productId)
        )}
        <ul className="cart-box-list">
          {customization.donuts.map((id, index) => {
            const donut = PRODUCTS.find((item) => item.id === id);
            return donut ? (
              <li key={`${id}-${index}`}>
                <img src={donut.img} alt="" />
                <span>{donut.name}</span>
              </li>
            ) : null;
          })}
        </ul>
      </div>
    );
  }

  /* --- the lab's build: made by the builder, unrepeatable here ----------- */
  if (customization.kind === 'lab') {
    return (
      <div className="cart-custom">
        {head(
          'Your build',
          `${customization.elements.length} element${customization.elements.length === 1 ? '' : 's'}`
        )}
        <ul className="cart-spec">
          {customization.elements.map((el) => (
            <li key={el.label}>
              <span>{el.label}</span>
              <strong>{el.value}</strong>
              <b>{el.price ? `+$${el.price.toFixed(2)}` : '—'}</b>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  /* --- the finish: two answers, both editable here ----------------------- */
  if (customization.kind === 'petite') {
    const pack = BULK_PACK_SIZES.get(productId);
    const units = pack ? pack * qty : qty;
    const editing = draft?.kind === 'petite';

    if (editing) {
      const d = draft as Finish;
      return (
        <div className="cart-custom is-editing">
          {head('Finish', `${units} donut${units === 1 ? '' : 's'}`)}
          <FinishPicker value={d} onChange={setDraft} />
          {actions(Boolean(d.icingId) && Boolean(d.sprinkleId))}
        </div>
      );
    }

    const { icing, sprinkle } = finishSwatches(customization);
    const row = (label: string, sw: ReturnType<typeof finishSwatches>['icing']) => (
      <li>
        <span>{label}</span>
        <strong>{sw ? sw.name : 'Not chosen'}</strong>
        <b className="cart-spec__dots">
          {sw?.dots.map((d, i) => (
            <i key={i} style={{ background: d }} />
          ))}
        </b>
      </li>
    );

    return (
      <div className="cart-custom">
        {head('Finish', `${units} donut${units === 1 ? '' : 's'}`, () =>
          setDraft(customization.icingId ? customization : EMPTY_FINISH)
        )}
        <ul className="cart-spec">
          {row('Icing', icing)}
          {row('Sprinkles', sprinkle)}
        </ul>
      </div>
    );
  }

  /* --- the cake's shape -------------------------------------------------- */
  if (customization.kind === 'glyph') {
    const editing = draft?.kind === 'glyph';

    if (editing) {
      const glyph = (draft as { kind: 'glyph'; glyph: string }).glyph;
      return (
        <div className="cart-custom is-editing">
          {head('Cut as', glyph ? '1 cake' : 'Choose one')}
          <GlyphPicker value={glyph} onChange={(next) => setDraft({ kind: 'glyph', glyph: next })} />
          {actions(glyph.trim().length > 0)}
        </div>
      );
    }

    return (
      <div className="cart-custom">
        {head(
          'Cut as',
          `${customization.glyph.length} ${customization.glyph.length === 1 ? 'cake' : 'cakes'}`,
          () => setDraft(customization)
        )}
        <p className="cart-glyph-value">{customization.glyph || '—'}</p>
      </div>
    );
  }

  /* --- the printed dozen: the artwork is the answer, and it lives there --- */
  const sprinkle = PRINT_SPRINKLE_SWATCHES.find((sw) => sw.id === customization.sprinkleId);
  const assigned = customization.artworks.reduce((sum, art) => sum + art.count, 0);
  return (
    <div className="cart-custom">
      {head('Your print', `${assigned}/${qty} dozen`, () => openEditor(productId))}
      <ul className="cart-spec">
        <li>
          <span>Icing</span>
          <strong>{customization.icingFlavour || '—'}</strong>
          <b />
        </li>
        <li>
          <span>Sprinkles</span>
          <strong>{customization.sprinkleColours || 'None'}</strong>
          <b className="cart-spec__dots">
            {sprinkle?.dots.map((d, i) => (
              <i key={i} style={{ background: d }} />
            ))}
          </b>
        </li>
      </ul>
      <ul className="cart-box-list cart-box-list--art">
        {customization.artworks.map((art, index) => (
          <li key={art.key}>
            <img src={art.dataUrl} alt="" />
            <span>
              Design {index + 1} · {art.count} dozen
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
