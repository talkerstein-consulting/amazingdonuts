import { ICING_ANSWERS, SPRINKLE_ANSWERS, type PetiteSwatch } from '../lib/petite-palette';
import type { Customization } from '../lib/custom-order';

/** The finish, as it is stored on a bag line. */
export type Finish = Extract<Customization, { kind: 'petite' }>;

export const EMPTY_FINISH: Finish = {
  kind: 'petite',
  icingId: '',
  icingName: '',
  sprinkleId: '',
  sprinkleName: ''
};

/** Read a stored finish back as the two swatches that made it. */
export const finishSwatches = (value?: Customization) => {
  const f = value?.kind === 'petite' ? value : null;
  return {
    icing: ICING_ANSWERS.find((s) => s.id === f?.icingId) ?? null,
    sprinkle: SPRINKLE_ANSWERS.find((s) => s.id === f?.sprinkleId) ?? null
  };
};

/**
 * How a made-to-order donut is finished — one icing, one sprinkle answer.
 *
 * One component for all three places it is asked: the product page, the bag
 * drawer's editor, and the checkout page's rescue of a line that was never
 * answered. The question is the same in all three, and three copies of a
 * swatch grid is three chances for the lists to drift apart — which is exactly
 * what happened to the printed dozen's sprinkles, drawn from a fourth list.
 *
 * `tone` is the only thing that varies: the drawer and the panel sit on Sand,
 * the checkout summary on Harbour. It maps to the `--fix-*` custom properties
 * those two surfaces already define — see the swatch styles in shop.css.
 */
export default function FinishPicker({
  value,
  onChange,
  units
}: {
  value?: Customization;
  onChange: (next: Finish) => void;
  /** "for these 150 donuts" — the pack's size, when there is one. */
  units?: number;
}) {
  const current: Finish = value?.kind === 'petite' ? value : EMPTY_FINISH;

  const group = (
    label: string,
    answers: PetiteSwatch[],
    chosenId: string,
    pick: (sw: PetiteSwatch) => void
  ) => (
    <div className="finish__group">
      <span className="finish__ask">{label}</span>
      <div className="finish__swatches" role="radiogroup" aria-label={label}>
        {answers.map((sw) => (
          <button
            key={sw.id}
            type="button"
            role="radio"
            aria-checked={chosenId === sw.id}
            title={sw.name}
            className={`checkout-fix__swatch${chosenId === sw.id ? ' is-on' : ''}`}
            onClick={() => pick(sw)}
          >
            {/* One dot for an icing, several for a sprinkle mix, none for the
                "none" answers — the palette says how many, so the same swatch
                draws all three cases. */}
            {sw.dots.length > 0 && (
              <span aria-hidden="true">
                {sw.dots.map((dot, i) => (
                  <i key={i} style={{ background: dot }} />
                ))}
              </span>
            )}
            {sw.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="finish">
      {group('Icing', ICING_ANSWERS, current.icingId, (sw) =>
        onChange({ ...current, icingId: sw.id, icingName: sw.name })
      )}
      {group(
        units ? `Sprinkles for these ${units} donuts` : 'Sprinkles',
        SPRINKLE_ANSWERS,
        current.sprinkleId,
        (sw) => onChange({ ...current, sprinkleId: sw.id, sprinkleName: sw.name })
      )}
    </div>
  );
}
