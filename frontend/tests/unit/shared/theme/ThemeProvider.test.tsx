import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { createRoot } from "react-dom/client";
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

  it("still updates document.documentElement.dataset.theme when localStorage.setItem throws", () => {
    document.documentElement.dataset.theme = "light";
    const setItemSpy = vi
      .spyOn(window.localStorage.__proto__, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(() => fireEvent.click(screen.getByText("toggle"))).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");

    setItemSpy.mockRestore();
  });

  it("readAppliedTheme defaults to 'light' when document is unavailable (SSR-safety guard)", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const originalDocument = globalThis.document;
    try {
      // @ts-expect-error -- intentionally simulating a non-DOM (SSR) environment for this one render
      globalThis.document = undefined;
      act(() => {
        root.render(
          <ThemeProvider>
            <TestConsumer />
          </ThemeProvider>,
        );
      });
    } finally {
      globalThis.document = originalDocument;
    }
    expect(container.querySelector('[data-testid="current-theme"]')?.textContent).toBe("light");
    act(() => root.unmount());
    document.body.removeChild(container);
  });
});
