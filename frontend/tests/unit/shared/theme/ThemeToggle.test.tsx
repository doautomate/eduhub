import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ThemeProvider } from "../../../../src/shared/theme/ThemeProvider";
import { ThemeToggle } from "../../../../src/shared/theme/ThemeToggle";
import { expectNoA11yViolations } from "../../support/a11y";

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("ThemeToggle (US4)", () => {
  it("reflects the current theme via role=switch and aria-checked", () => {
    document.documentElement.dataset.theme = "light";
    renderToggle();
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAccessibleName(/switch to dark theme/i);
  });

  it("reflects aria-checked=true and an updated label when the active theme is dark", () => {
    document.documentElement.dataset.theme = "dark";
    renderToggle();
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).toHaveAccessibleName(/switch to light theme/i);
  });

  it("is keyboard-operable and toggles the theme on activation", () => {
    document.documentElement.dataset.theme = "light";
    renderToggle();
    const toggle = screen.getByRole("switch");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("has no detectable accessibility violations in the light theme", async () => {
    document.documentElement.dataset.theme = "light";
    const { container } = renderToggle();
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations in the dark theme", async () => {
    document.documentElement.dataset.theme = "dark";
    const { container } = renderToggle();
    await expectNoA11yViolations(container);
  });
});
