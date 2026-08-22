import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** The hash the Lab lives at, so it is linkable and the back button closes it. */
const HASH = '#donut-lab';

type Store = { isOpen: boolean; open: () => void; close: () => void };

const DonutLabContext = createContext<Store>({ isOpen: false, open: () => {}, close: () => {} });

export function DonutLabProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(() => window.location.hash === HASH);

  // The hash is the source of truth, so deep links and Back/Forward both work.
  useEffect(() => {
    const sync = () => setIsOpen(window.location.hash === HASH);
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const open = useCallback(() => {
    if (window.location.hash !== HASH) window.location.hash = HASH;
    else setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    // Drop the hash without leaving an extra history entry to walk back through.
    if (window.location.hash === HASH) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setIsOpen(false);
  }, []);

  const value = useMemo<Store>(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return <DonutLabContext.Provider value={value}>{children}</DonutLabContext.Provider>;
}

export const useDonutLab = () => useContext(DonutLabContext);
