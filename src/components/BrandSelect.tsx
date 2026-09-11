import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './brand-time-picker.css';
import './brand-select.css';

type Option = { value: string; label: string };

export default function BrandSelect({
  value,
  options,
  onChange,
  ariaLabel
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    optionButtons.current[selectedIndex]?.focus();
    optionButtons.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    const close = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open, selectedIndex]);

  const closeAndFocus = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const moveFocus = (index: number) => {
    const next = Math.min(options.length - 1, Math.max(0, index));
    optionButtons.current[next]?.focus();
    optionButtons.current[next]?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <div className="brand-time brand-select" ref={wrap}>
      <button
        ref={trigger}
        type="button"
        className="brand-time__trigger brand-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(current => !current)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{selected?.label}</span>
        <ChevronDown className="brand-time__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="brand-time__panel brand-select__panel" id={listId} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                ref={element => { optionButtons.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={active}
                className={active ? 'is-selected' : ''}
                onClick={() => {
                  onChange(option.value);
                  closeAndFocus();
                }}
                onKeyDown={event => {
                  if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(index + 1); }
                  if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(index - 1); }
                  if (event.key === 'Home') { event.preventDefault(); moveFocus(0); }
                  if (event.key === 'End') { event.preventDefault(); moveFocus(options.length - 1); }
                  if (event.key === 'Escape') { event.preventDefault(); closeAndFocus(); }
                }}
              >
                <span>{option.label}</span>
                {active && <Check aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
