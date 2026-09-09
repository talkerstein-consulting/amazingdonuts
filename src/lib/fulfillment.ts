import { useEffect, useState } from 'react';

export type FulfillmentPreference = 'pickup' | 'delivery';

const KEY = 'amazing:fulfillment';
const SHOP_BANNER_KEY = 'amazing:shop-fulfillment';
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

/** Only the current hero-initiated shopping journey gets a banner. */
export function readShopFulfillmentChoice(): FulfillmentPreference | null {
  const choice = readFulfillmentChoice();
  try {
    return window.sessionStorage.getItem(SHOP_BANNER_KEY) === choice ? choice : null;
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
  try {
    window.sessionStorage.removeItem(SHOP_BANNER_KEY);
  } catch {
    // The banner stays hidden when session storage is unavailable.
  }
  window.dispatchEvent(new Event(FULFILLMENT_EVENT));
}

export function writeFulfillmentPreference(
  value: FulfillmentPreference,
  { showShopBanner = false }: { showShopBanner?: boolean } = {}
) {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Checkout still defaults to pickup when browser storage is unavailable.
  }
  try {
    if (showShopBanner) window.sessionStorage.setItem(SHOP_BANNER_KEY, value);
    else window.sessionStorage.removeItem(SHOP_BANNER_KEY);
  } catch {
    // Choosing fulfillment still works without a shop banner.
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
export function useFulfillmentChoice({ shopBannerOnly = false }: { shopBannerOnly?: boolean } = {}) {
  const [value, setValue] = useState<FulfillmentPreference | null>(() =>
    typeof window === 'undefined' ? null : shopBannerOnly ? readShopFulfillmentChoice() : readFulfillmentChoice()
  );

  useEffect(() => {
    const sync = () => setValue(shopBannerOnly ? readShopFulfillmentChoice() : readFulfillmentChoice());
    sync();
    window.addEventListener(FULFILLMENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FULFILLMENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [shopBannerOnly]);

  return value;
}
