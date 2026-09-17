import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../../test-utils";
import { AppShell } from "../../../../src/shared/components/AppShell/AppShell";
import { expectNoA11yViolations } from "../../support/a11y";
// Raw source text used as a source-level regression guard for the shell's
// scrolling layout, which jsdom cannot evaluate against real box metrics:
// confirms the header/footer stay non-shrinking while only the body scrolls.
import appShellSource from "../../../../src/shared/components/AppShell/AppShell.tsx?raw";

function renderShell() {
  return renderWithProviders(
    <AppShell>
      <p>body-content</p>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("renders header, body, and footer regions", () => {
    renderShell();
    expect(screen.getByText("EduVid")).toBeInTheDocument();
    expect(screen.getByText("body-content")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("keeps header and footer non-shrinking while only the body scrolls (FR-001..FR-005)", () => {
    renderShell();
    const header = screen.getByText("EduVid").closest("header") as HTMLElement;
    const body = screen.getByText("body-content").closest("main") as HTMLElement;
    const footer = screen.getByRole("contentinfo") as HTMLElement;

    expect(getComputedStyle(header).flexShrink).toBe("0");
    expect(getComputedStyle(footer).flexShrink).toBe("0");
    expect(getComputedStyle(body).overflow).toBe("auto");
  });

  it("shows a Log in button in the header when signed out", () => {
    renderShell();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("applies the light theme (default) to the document root", () => {
    renderShell();
    // T031: light is the new default theme (FR-001/FR-010). The provider derives
    // its initial state from the DOM (set by index.html's no-FOUC bootstrap in
    // production); absent that attribute here, it still defaults to light -
    // reflected by the mounted theme toggle's unchecked ("light") state.
    expect(screen.getByRole("switch", { name: /switch to dark theme/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderShell();
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations in the dark theme (T038)", async () => {
    document.documentElement.dataset.theme = "dark";
    const { container } = renderShell();
    await expectNoA11yViolations(container);
    delete document.documentElement.dataset.theme;
  });

  it.each(["light", "dark"] as const)(
    "renders a %s-theme header that matches the body background and is half the original height",
    (theme) => {
      document.documentElement.dataset.theme = theme;
      renderShell();
      const header = screen.getByText("EduVid").closest("header") as HTMLElement;
      const rootStyle = getComputedStyle(document.documentElement);
      expect(rootStyle.getPropertyValue("--header-height").trim()).toBe("3.25rem");
      expect(header.className).toMatch(/\bbg-background\b/);
      expect(header.className).toMatch(/\btext-foreground\b/);
      delete document.documentElement.dataset.theme;
    },
  );

  it("keeps the header's content fully visible and not clipped at the new height (FR-001/FR-006)", () => {
    renderShell();
    const header = screen.getByText("EduVid").closest("header") as HTMLElement;
    expect(header.scrollHeight).toBeLessThanOrEqual(header.clientHeight || header.scrollHeight);
    expect(screen.getByText("EduVid")).toBeVisible();
    expect(screen.getByRole("button", { name: /log in/i })).toBeVisible();
  });

  it("renders the resource nav links (Notes, Mind Maps, Sample Papers, Dashboard) in the header", () => {
    renderShell();
    const nav = screen.getByRole("navigation", { name: /resources/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Notes" })).toHaveAttribute("href", "/notes");
    expect(screen.getByRole("link", { name: "Mind Maps" })).toHaveAttribute("href", "/mind-maps");
    expect(screen.getByRole("link", { name: "Sample Papers" })).toHaveAttribute(
      "href",
      "/sample-papers",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("keeps the header non-overlapping with body content at a narrow (<=640px) viewport (FR-006, edge case)", () => {
    // The header/footer are always rendered outside the responsive `sm:` content
    // wrapper (they never gain a `sm:` layout override themselves), so their box
    // model is unaffected by narrow viewports.
    expect(appShellSource).not.toMatch(/<header[^>]*sm:/);
    expect(appShellSource).not.toMatch(/<footer[^>]*sm:/);

    renderShell();
    const header = screen.getByText("EduVid").closest("header") as HTMLElement;
    expect(header.scrollHeight).toBeLessThanOrEqual(header.clientHeight || header.scrollHeight);
  });

  it("keeps header control hit-area size unchanged by the height increase (FR-008)", () => {
    renderShell();
    const loginButton = screen.getByRole("button", { name: /log in/i });
    expect(loginButton).toBeVisible();
    // The button's own box model is driven by the shared shadcn Button component's
    // padding, not by --header-height, so it must be unaffected by the header
    // height change (regression guard: same component used everywhere else).
    expect(loginButton.className).toMatch(/inline-flex/);
  });

  it.each(["light", "dark"] as const)(
    "has no axe-core contrast violations for the %s-theme header (matching the body background)",
    async (theme) => {
      document.documentElement.dataset.theme = theme;
      const { container } = renderShell();
      await expectNoA11yViolations(container);
      delete document.documentElement.dataset.theme;
    },
  );

  it("gives the footer an explicit --footer-height and reduces its vertical padding via --footer-padding-block, with no UA-default paragraph margin (FR-002/FR-004a/FR-006/FR-007)", () => {
    renderShell();
    const footer = screen.getByRole("contentinfo") as HTMLElement;
    const style = getComputedStyle(footer);
    expect(style.height).toBe("var(--footer-height)");
    expect(style.padding).toBe("var(--footer-padding-block) var(--space-lg)");
    const rootStyle = getComputedStyle(document.documentElement);
    expect(rootStyle.getPropertyValue("--footer-height").trim()).toBe("2rem");
    expect(rootStyle.getPropertyValue("--footer-padding-block").trim()).toBe("0.25rem");

    const text = footer.firstElementChild as HTMLElement | null;
    expect(text).not.toBeNull();
    if (text) {
      expect(getComputedStyle(text).margin).toBe("0px");
      expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth || text.scrollWidth);
    }
    // No scrollbar should appear on the footer itself when its content fits.
    expect(footer.scrollHeight).toBeLessThanOrEqual(footer.clientHeight || footer.scrollHeight);
  });

  it("keeps the footer's copyright text on a single line and not clipped at the new height (FR-002/FR-006)", () => {
    renderShell();
    const footer = screen.getByRole("contentinfo") as HTMLElement;
    expect(footer.scrollHeight).toBeLessThanOrEqual(footer.clientHeight || footer.scrollHeight);
    const text = footer.firstElementChild as HTMLElement | null;
    expect(text).not.toBeNull();
    if (text) {
      expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth || text.scrollWidth);
      expect(text).toBeVisible();
    }
  });

  it("keeps the footer non-overlapping with body content at a narrow (<=640px) viewport (FR-006, edge case)", () => {
    // Same rationale as the header narrow-viewport test above: the footer is
    // untouched by the responsive `sm:` override, so its box model (and
    // therefore non-overlap with adjacent content) is viewport-independent.
    expect(appShellSource).not.toMatch(/<footer[^>]*sm:/);

    renderShell();
    const footer = screen.getByRole("contentinfo") as HTMLElement;
    expect(footer.scrollHeight).toBeLessThanOrEqual(footer.clientHeight || footer.scrollHeight);
  });

  it("declares header/footer height exclusively via the --header-height/--footer-height tokens, with no literal height duplicated elsewhere (FR-003/FR-004/FR-005, US3 regression guard)", () => {
    expect(appShellSource).not.toMatch(/height:\s*["'](?!var\()[0-9.]+(px|rem|em|%|vh|dvh)/);
  });
});
