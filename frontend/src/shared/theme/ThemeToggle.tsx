import { useTheme } from "./useTheme";
import { cn } from "@/shared/utils/cn";

/**
 * Visible light/dark toggle control (US4, contracts/theme-context-api.md). A single
 * accessible switch mounted in the header - keyboard-operable, with aria-checked bound
 * to the current theme and a visible label so sighted and screen-reader users alike can
 * tell which theme is currently active.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm leading-none transition-colors",
        "border-border/60 text-foreground hover:border-primary/60 hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <span className="text-base" aria-hidden="true">
        {isDark ? "🌙" : "☀️"}
      </span>
      <span>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}

export default ThemeToggle;
