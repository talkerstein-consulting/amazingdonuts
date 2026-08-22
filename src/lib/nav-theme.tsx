import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type NavTheme = { bg: string; fg: string };

/** The bar's resting look — navy, as everywhere else on the site. */
export const DEFAULT_NAV_THEME: NavTheme = { bg: 'var(--navy)', fg: 'var(--cream)' };

type Store = {
  theme: NavTheme;
  /** Claim the bar for a section. Later claims win; releasing restores the default. */
  claim: (key: string, theme: NavTheme) => void;
  release: (key: string) => void;
};

const NavThemeContext = createContext<Store>({
  theme: DEFAULT_NAV_THEME,
  claim: () => {},
  release: () => {}
});

export function NavThemeProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<Record<string, NavTheme>>({});

  const claim = useCallback((key: string, theme: NavTheme) => {
    setClaims((prev) => {
      const current = prev[key];
      if (current && current.bg === theme.bg && current.fg === theme.fg) return prev;
      return { ...prev, [key]: theme };
    });
  }, []);

  const release = useCallback((key: string) => {
    setClaims((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const value = useMemo<Store>(() => {
    const keys = Object.keys(claims);
    return { theme: keys.length ? claims[keys[keys.length - 1]] : DEFAULT_NAV_THEME, claim, release };
  }, [claims, claim, release]);

  return <NavThemeContext.Provider value={value}>{children}</NavThemeContext.Provider>;
}

export const useNavTheme = () => useContext(NavThemeContext);
