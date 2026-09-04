import { useEffect, useState } from 'react';

/**
 * The pickup appointment the visitor has chosen, and the counter hours it has
 * to fall inside.
 *
 * Choosing a pickup slot used to happen only at checkout, at the very end. The
 * "Pick up" lane card now asks for it up front and then sends the visitor to
 * the catalogue, so the choice has to outlive a full-page navigation — every
 * page here is a separate HTML entry, and there is no router or client-side
 * store spanning them. Hence `localStorage`, plus an event so a header already
 * on screen repaints without a reload.
 *
 * Counter hours live here rather than in `CheckoutPage.tsx`, which is where
 * they were: the pickup page and checkout both have to refuse the same closed
 * days, and two copies of a bakery's opening hours is a wrong-answer waiting
 * to happen the first time one of them changes.
 */

/** Minutes from midnight, by `Date#getDay()`. Saturday (6) is absent: closed. */
export const PICKUP_HOURS: Record<number, [number, number] | undefined> = {
  0: [8 * 60, 13 * 60],
  1: [7 * 60 + 30, 16 * 60],
  2: [7 * 60 + 30, 16 * 60],
  3: [7 * 60 + 30, 16 * 60],
  4: [7 * 60 + 30, 16 * 60],
  5: [7 * 60 + 30, 14 * 60]
};

/** The window length checkout quotes, and the one the slot list is cut into. */
export const SLOT_MINUTES = 30;

/** Long-form hours, one line per open day, for when the counter is shut. */
export const HOURS_LINES = [
  { days: 'Sun', hours: '8am – 1pm' },
  { days: 'Mon – Thu', hours: '7:30am – 4pm' },
  { days: 'Fri', hours: '7:30am – 2pm' },
  { days: 'Sat', hours: 'Closed' }
];

/**
 * Is the counter serving right now, and if not, when next.
 *
 * The bar says "Open now" or "Closed", and a closed bar has to say when to come
 * back — "Closed" on its own tells a visitor nothing they can act on. Read from
 * the visitor's own clock, which is the honest reading for a single-location
 * bakery whose customers are local; a visitor in another timezone sees their own
 * time, and the full hours are right there to check against.
 */
export function openState(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = PICKUP_HOURS[now.getDay()];

  if (today && minutes >= today[0] && minutes < today[1]) {
    return { open: true as const, until: timeLabel(today[1]) };
  }

  /* Later today if the counter has not opened yet, otherwise the next open
     day. Scanning forward rather than hard-coding "tomorrow" is what makes
     Friday afternoon say Sunday, since Saturday is shut. */
  if (today && minutes < today[0]) {
    return { open: false as const, nextDay: 'today' as const, nextAt: timeLabel(today[0]) };
  }

  const probe = new Date(now);
  for (let i = 1; i <= 7; i += 1) {
    probe.setDate(probe.getDate() + 1);
    const window = PICKUP_HOURS[probe.getDay()];
    if (window) {
      return {
        open: false as const,
        nextDay: i === 1 ? ('tomorrow' as const) : new Intl.DateTimeFormat('en-CA', { weekday: 'long' }).format(probe),
        nextAt: timeLabel(window[0])
      };
    }
  }

  /* Unreachable while any day has hours, but a week of scanning has to end
     somewhere rather than falling off the loop as undefined. */
  return { open: false as const, nextDay: '' as const, nextAt: '' };
}

export const HOURS_SUMMARY =
  'Sunday 8am–1pm · Monday–Thursday 7:30am–4pm · Friday 7:30am–2pm · Saturday closed.';

export type Pickup = { date: string; time: string };

const KEY = 'amazing:pickup';
/** Fires on the window whenever the stored slot changes, in this tab. */
export const PICKUP_EVENT = 'amazing:pickup-changed';

export const timeLabel = (minutes: number) =>
  new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)
  );

/** The bookable windows on one date, empty when the counter is closed. */
export function pickupSlots(date: string, interval = SLOT_MINUTES) {
  /* Noon, deliberately: a 'YYYY-MM-DD' string parses as UTC midnight, which is
     the previous day west of Greenwich — and the day of the week is the whole
     question being asked here. */
  const window = PICKUP_HOURS[new Date(`${date}T12:00:00`).getDay()];
  if (!window) return [];

  return Array.from({ length: Math.floor((window[1] - window[0]) / interval) }, (_, i) => {
    const start = window[0] + i * interval;
    return {
      value: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
      label: `${timeLabel(start)} – ${timeLabel(start + interval)}`
    };
  });
}

export const isClosed = (date: Date) => !PICKUP_HOURS[date.getDay()];

/** Today as 'YYYY-MM-DD' in the visitor's own zone, not UTC. */
export function localDate(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** The soonest open day, from `from` onward. */
export function firstOpenDate(from = new Date()) {
  const date = new Date(from);
  while (isClosed(date)) date.setDate(date.getDate() + 1);
  return localDate(date);
}

/** "Fri, 12 Sep · 9:00 – 9:30 AM", or '' if the slot no longer makes sense. */
export function formatPickup(pickup: Pickup | null) {
  if (!pickup) return '';
  const slot = pickupSlots(pickup.date).find((s) => s.value === pickup.time);
  if (!slot) return '';
  const day = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(`${pickup.date}T12:00:00`)
  );
  return `${day} · ${slot.label}`;
}

export function readPickup(): Pickup | null {
  /* Every read is guarded: the accessor itself throws in a browser set to block
     site data, and a slot from a past visit is stale rather than wrong — an
     appointment for last Tuesday must not survive into this session. */
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Pickup>;
    if (typeof value?.date !== 'string' || typeof value?.time !== 'string') return null;
    if (value.date < localDate()) return null;
    if (!pickupSlots(value.date).some((slot) => slot.value === value.time)) return null;
    return { date: value.date, time: value.time };
  } catch {
    return null;
  }
}

export function writePickup(pickup: Pickup) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pickup));
  } catch {
    /* A blocked store costs the visitor the header chip and nothing else — the
       pickup page still hands the slot on, and checkout still asks for one. */
  }
  window.dispatchEvent(new Event(PICKUP_EVENT));
}

export function clearPickup() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Nothing stored, nothing to clear. */
  }
  window.dispatchEvent(new Event(PICKUP_EVENT));
}

/** The stored slot, kept current as this tab and other tabs change it. */
export function usePickup() {
  const [pickup, setPickup] = useState<Pickup | null>(() =>
    typeof window === 'undefined' ? null : readPickup()
  );

  useEffect(() => {
    const sync = () => setPickup(readPickup());
    window.addEventListener(PICKUP_EVENT, sync);
    /* `storage` only fires in the *other* tabs, which is why the custom event
       above exists as well rather than instead. */
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PICKUP_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return pickup;
}
