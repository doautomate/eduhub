import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { Toaster } from "../../../../../src/shared/components/ui/sonner";

// jsdom doesn't implement window.matchMedia; sonner's Toaster uses it to detect the
// OS color-scheme preference on mount.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Toaster (sonner)", () => {
  it("renders without throwing and mounts the sonner notifications region", () => {
    const { container } = render(<Toaster />);
    expect(container.querySelector('[aria-label*="Notifications"]')).toBeInTheDocument();
  });

  it("passes through additional props such as position", () => {
    const { container } = render(<Toaster position="top-center" />);
    expect(container.querySelector('[aria-label*="Notifications"]')).toBeInTheDocument();
  });
});
