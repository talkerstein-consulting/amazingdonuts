import { useEffect, useRef, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import './brand-date-picker.css';

export const localDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type Props = {
  value: string;
  min: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  ariaLabel?: string;
  disabledDay?: (date: Date) => boolean;
  /** Draw the calendar in the flow instead of behind a trigger.

      A popover is right where the date is one field among many and the page
      cannot afford a calendar's height. On a form that asks one question at a
      time the date IS the question, and a trigger there is a tap that only
      reveals the thing the visitor came to that step for. */
  inline?: boolean;
};

export default function BrandDatePicker({
  value,
  min,
  onChange,
  emptyLabel = 'Choose a date',
  ariaLabel = 'Choose a date',
  disabledDay,
  inline = false
}: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const shown = inline || open;
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  const earliest = new Date(`${min}T12:00:00`);

  useEffect(() => {
    /* Nothing to dismiss when the calendar is the page's own content. */
    if (inline || !open) return;
    const close = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open, inline]);

  return (
    <div className={`brand-date${inline ? ' brand-date--inline' : ''}`} ref={wrap}>
      {!inline && (
      <button
        type="button"
        className="brand-date__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <CalendarClock aria-hidden="true" />
        <span>{selected ? new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(selected) : emptyLabel}</span>
      </button>
      )}
      {shown && (
        <div className="brand-date__panel" role="dialog" aria-label={ariaLabel}>
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected || earliest}
            onSelect={day => {
              if (!day) return;
              onChange(localDateValue(day));
              if (!inline) setOpen(false);
            }}
            disabled={disabledDay ? [{ before: earliest }, disabledDay] : { before: earliest }}
            showOutsideDays
            fixedWeeks
          />
          <p>Available from {new Intl.DateTimeFormat('en-CA', { month: 'long', day: 'numeric' }).format(earliest)}</p>
        </div>
      )}
    </div>
  );
}
