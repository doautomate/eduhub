import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";

export interface ThemeContextValue {
  /** The currently active theme, already applied to <html data-theme="..."> */
  theme: ThemeMode;
  /** Flips light <-> dark, persists the new value, updates the DOM attribute */
  toggleTheme: () => void;
  /** Explicitly sets a theme (used by the toggle control; also usable by future settings UI) */
  setTheme: (theme: ThemeMode) => void;
}

export const THEME_STORAGE_KEY = "ui.theme-preference";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Reads the theme already applied to <html> by the no-FOUC inline bootstrap script in
 * index.html (research.md §3), rather than recomputing the resolution order here - this
 * avoids a duplicate decision/re-render and guarantees the hook never diverges from the DOM.
 */
function readAppliedTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }
  const applied = document.documentElement.dataset.theme;
  return applied === "dark" ? "dark" : "light";
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage can throw (e.g. private browsing quota) - theme still applies
    // to the DOM for this page view even if persistence silently fails.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readAppliedTheme);

  const setTheme = useCallback((next: ThemeMode) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ThemeMode = current === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
