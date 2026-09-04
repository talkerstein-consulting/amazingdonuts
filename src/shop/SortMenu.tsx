import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * The grid's sort control.
 *
 * A drawn listbox rather than a native `<select>`. The native one was the right
 * call while this was a plain row of words — it is free, accessible and on a
 * phone it opens the platform's own wheel. It stops being the right call the
 * moment the options need icons: the contents of a native option list are the
 * OS's to draw, not ours, so a `<select>` can carry a glyph on its closed face
 * and nothing at all in the menu it opens. Everything else on this page that
 * offers a set of choices — the category chips, the tier row — is a pill with a
 * glyph in it, and the sort was the one control that could not join them.
 *
 * So: the same pill as a chip for the trigger, and a panel below it on the
 * brand's own ground, each row an icon, a label and a tick on the chosen one.
 *
 * What the native control gave us for free and is therefore rebuilt here:
 * roving focus on Up/Down (with Home/End), Enter and Space to choose, Escape to
 * close, a click anywhere outside to dismiss, focus returned to the trigger on
 * close, and `aria-activedescendant` so a screen reader follows the highlight
 * through a list it is not focused inside. Anything less is a div that looks
 * like a menu.
 */
export type SortOption<T extends string> = { id: T; label: string; icon: LucideIcon };

export default function SortMenu<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: SortOption<T>[];
  onChange: (next: T) => void;
}) {
  const [open, setOpen] = useState(false);
  /* Which row the keyboard is on, which is not the same as which is chosen —
     arrowing through the list must not re-sort the grid under it. */
  const [at, setAt] = useState(() => Math.max(0, options.findIndex((o) => o.id === value)));

  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const current = options.find((o) => o.id === value) ?? options[0];
  const Icon = current.icon;

  /* Opening starts the highlight on the chosen row, wherever it sits, and the
     list takes focus so the arrow keys reach it. */
  useEffect(() => {
    if (!open) return;
    setAt(Math.max(0, options.findIndex((o) => o.id === value)));
    list.current?.focus();
  }, [open, options, value]);

  /* Outside click and outside focus both close it. Pointerdown rather than
     click: a mousedown that starts outside and releases inside would otherwise
     leave the panel open under a cursor that has already left it. */
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('focusin', away);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('focusin', away);
    };
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  const choose = (id: T) => {
    onChange(id);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys: Record<string, () => number | void> = {
      ArrowDown: () => setAt((i) => (i + 1) % options.length),
      ArrowUp: () => setAt((i) => (i - 1 + options.length) % options.length),
      Home: () => setAt(0),
      End: () => setAt(options.length - 1),
      Enter: () => choose(options[at].id),
      ' ': () => choose(options[at].id),
      Escape: () => close(),
      Tab: () => close(false)
    };
    const run = keys[e.key];
    if (!run) return;
    /* Not on Tab: that one closes the panel and then lets the browser move on
       to whatever follows, which is what a dismissed menu should do. */
    if (e.key !== 'Tab') e.preventDefault();
    run();
  };

  return (
    <div className="shop-sort" ref={root}>
      <span className="shop-sort__label" id="shop-sort-label">
        Sort
      </span>

      <button
        type="button"
        ref={trigger}
        className={`shop-sort__trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="shop-sort-label shop-sort-value"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
        <span id="shop-sort-value" className="shop-sort__value">{current.label}</span>
        <ChevronDown size={15} strokeWidth={2.6} aria-hidden="true" className="shop-sort__chevron" />
      </button>

      {open && (
        <ul
          ref={list}
          className="shop-sort__menu"
          role="listbox"
          tabIndex={-1}
          aria-labelledby="shop-sort-label"
          aria-activedescendant={`shop-sort-opt-${options[at].id}`}
          onKeyDown={onKeyDown}
        >
          {options.map((o, i) => {
            const OptIcon = o.icon;
            const chosen = o.id === value;
            return (
              <li
                key={o.id}
                id={`shop-sort-opt-${o.id}`}
                role="option"
                aria-selected={chosen}
                className={`shop-sort__opt${i === at ? ' is-at' : ''}${chosen ? ' is-on' : ''}`}
                /* The row is the target, and a `<li role="option">` is not
                   focusable — the list holds focus and moves the highlight, so
                   the pointer only has to say which row it landed on. */
                onMouseEnter={() => setAt(i)}
                onClick={() => choose(o.id)}
              >
                <OptIcon size={16} strokeWidth={2.4} aria-hidden="true" className="shop-sort__optIcon" />
                <span className="shop-sort__optLabel">{o.label}</span>
                {chosen && <Check size={15} strokeWidth={3} aria-hidden="true" className="shop-sort__tick" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
