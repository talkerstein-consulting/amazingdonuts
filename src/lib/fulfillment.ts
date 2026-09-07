import { useEffect, useState } from 'react';

export type FulfillmentPreference = 'pickup' | 'delivery';

const KEY = 'amazing:fulfillment';
export const FULFILLMENT_EVENT = 'amazing:fulfillment-changed';

export function readFulfillmentPreference(): FulfillmentPreference {
  try {
    return window.localStorage.getItem(KEY) === 'delivery' ? 'delivery' : 'pickup';
  } catch {
    return 'pickup';
  }
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
