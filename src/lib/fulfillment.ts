import { useEffect, useState } from 'react';

export type FulfillmentPreference = 'pickup' | 'delivery';

const KEY = 'amazing:fulfillment';
export const FULFILLMENT_EVENT = 'amazing:fulfillment-changed';

export function readFulfillmentPreference(): FulfillmentPreference {
  return readFulfillmentChoice() ?? 'pickup';
}

/**
 * The choice as actually made, or `null` if it never was.
 *
 * `readFulfillmentPreference` answers "what should checkout default to", and
 * so has to answer something — pickup. That is the wrong question for anything
 * that reports the choice back to the visitor: a band reading "Delivery" or
 * "Pickup" on a first visit would be stating a decision nobody has taken.
 */
export function readFulfillmentChoice(): FulfillmentPreference | null {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === 'delivery' || stored === 'pickup' ? stored : null;
  } catch {
    return null;
  }
}

/** Drops the choice, so the band comes off and checkout goes back to its default. */
export function clearFulfillmentPreference() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Nothing stored, nothing to clear. */
  }
  window.dispatchEvent(new Event(FULFILLMENT_EVENT));
}

export function writeFulfillmentPreference(value: FulfillmentPreference) {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Checkout still defaults to pickup when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(FULFILLMENT_EVENT));
}

export function useFulfillmentPreference() {
  const [value, setValue] = useState<FulfillmentPreference>(() =>
    typeof window === 'undefined' ? 'pickup' : readFulfillmentPreference()
  );

  useEffect(() => {
    const sync = () => setValue(readFulfillmentPreference());
    window.addEventListener(FULFILLMENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FULFILLMENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return value;
}

/** The same, but distinguishing "not chosen" — see `readFulfillmentChoice`. */
export function useFulfillmentChoice() {
  const [value, setValue] = useState<FulfillmentPreference | null>(() =>
    typeof window === 'undefined' ? null : readFulfillmentChoice()
  );

  useEffect(() => {
    const sync = () => setValue(readFulfillmentChoice());
    window.addEventListener(FULFILLMENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FULFILLMENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return value;
}
