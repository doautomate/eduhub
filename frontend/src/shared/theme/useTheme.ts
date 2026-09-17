import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "./ThemeProvider";

/**
 * Consumer hook for the theme context (contracts/theme-context-api.md). Throws a clear
 * error if used outside a <ThemeProvider> - fail-fast, not a silent default, per
 * constitution I (no implicit/untyped fallbacks).
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme() must be used within a <ThemeProvider>");
  }
  return context;
}

export default useTheme;
