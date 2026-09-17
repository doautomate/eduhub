import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ThemeProvider } from "../../../../src/shared/theme/ThemeProvider";
import { useTheme } from "../../../../src/shared/theme/useTheme";

function TestConsumer() {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <p data-testid="current-theme">{theme}</p>
      <button type="button" onClick={toggleTheme}>
        toggle
      </button>
      <button type="button" onClick={() => setTheme("dark")}>
        set-dark
      </button>
    </div>
  );
}

function resetDom() {
  delete document.documentElement.dataset.theme;
  window.localStorage.clear();
}

afterEach(() => {
  cleanup();
  resetDom();
  vi.unstubAllGlobals();
});

describe("ThemeProvider / useTheme", () => {
  it("reads the theme already applied to <html> by the no-FOUC bootstrap script on mount", () => {
    document.documentElement.dataset.theme = "dark";
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
  });

  it("defaults to light when no data-theme attribute is present", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
  });

  it("toggleTheme flips the theme, updates the DOM attribute, and persists to localStorage", () => {
    document.documentElement.dataset.theme = "light";
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("toggle"));

    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("ui.theme-preference")).toBe("dark");
  });

  it("setTheme explicitly sets a theme and persists it", () => {
    document.documentElement.dataset.theme = "light";
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByText("set-dark"));

    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    expect(window.localStorage.getItem("ui.theme-preference")).toBe("dark");
  });

  it("throws a clear error when useTheme() is used outside a ThemeProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(/useTheme\(\) must be used within a <ThemeProvider>/);
    consoleError.mockRestore();
  });
});
