import { useState } from 'react';

/* What the cake can be cut as. Explicit lists rather than a char range, so a
   shape the bakery cannot make is removed by deleting it from one. */
const NUMBERS = '0123456789'.split('');
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * One digit or one letter, for the letter/number cake.
 *
 * Shared by the bag drawer's editor and the checkout page's rescue of a line
 * that was never answered — the same question in two places, and two copies of
 * a mode toggle plus a 26-option select is two things to keep in step.
 */
export default function GlyphPicker({
  value,
  onChange
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  /* Which list is showing is state, not a reading of the answer. Derived from
     the answer it could not be changed while there was no answer — and no
     answer is exactly the case this exists for, so the Letter button would
     have done nothing on the only line that needs it. */
  const [mode, setMode] = useState<'number' | 'letter'>(() =>
    /[A-Z]/i.test(value) ? 'letter' : 'number'
  );
  const options = mode === 'letter' ? LETTERS : NUMBERS;

  return (
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
              /* Switching lists drops the answer rather than carrying a digit
                 into the letters. The line goes back to unanswered, which is
                 honest — it is. */
              onChange('');
            }}
          >
            {option === 'number' ? 'Number' : 'Letter'}
          </button>
        ))}
      </div>

      <select
        className="checkout-fix__select"
        aria-label={mode === 'letter' ? 'Which letter' : 'Which number'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose&hellip;</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
