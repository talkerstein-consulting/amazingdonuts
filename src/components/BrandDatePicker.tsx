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
};

export default function BrandDatePicker({
  value,
  min,
  onChange,
  emptyLabel = 'Choose a date',
  ariaLabel = 'Choose a date',
  disabledDay
}: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  const earliest = new Date(`${min}T12:00:00`);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  return (
    <div className="brand-date" ref={wrap}>
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
      {open && (
        <div className="brand-date__panel" role="dialog" aria-label={ariaLabel}>
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected || earliest}
            onSelect={day => {
              if (!day) return;
              onChange(localDateValue(day));
              setOpen(false);
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
