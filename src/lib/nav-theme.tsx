import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject
} from 'react';

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

/**
 * Hand the bar a colour while a section owns the middle of the screen.
 *
 * The test used to be "is this section directly under the header" (`top <= 0`),
 * which fires the swap the instant a band's first pixel slides beneath the bar
 * — the colour arrives while the section is still mostly off-screen, and on a
 * short band it arrives and leaves again in a few dozen pixels of scroll. The
 * viewport midpoint is the honest signal: the bar wears a section's colour once
 * that section is the thing you are actually looking at.
 *
 * Sections do not overlap vertically, so exactly one can straddle the midline
 * at a time and the provider's last-claim-wins rule never has to arbitrate.
 */
export function useNavClaimAtMidpoint(
  ref: RefObject<HTMLElement | null>,
  key: string,
  theme: NavTheme
) {
  const { claim, release } = useNavTheme();
  const { bg, fg } = theme;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const sync = () => {
      const rect = node.getBoundingClientRect();
      const mid = window.innerHeight / 2;
      if (rect.top <= mid && rect.bottom > mid) claim(key, { bg, fg });
      else release(key);
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      release(key);
    };
  }, [ref, key, bg, fg, claim, release]);
}
