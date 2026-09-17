import type { ReactNode } from "react";
import "../../../styles/app-shell-tokens.css";
import { Header } from "./Header";
import { Footer } from "./Footer";

/**
 * App shell composing header + body + footer (FR-001..FR-005). Wraps every
 * route so the branded shell is always present. Only the body region
 * scrolls — header/footer are non-shrinking (see the explicit flexShrink
 * styles in each region) so the shell's own layout owns scrolling instead of
 * the document (`overflow: hidden` on html/body/#root, set globally in
 * `styles/tailwind.css`).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <Header />
      <main
        data-testid="app-shell-content"
        className="min-w-0 flex-1 overflow-y-auto bg-background p-8"
        style={{ overflow: "auto" }}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default AppShell;
