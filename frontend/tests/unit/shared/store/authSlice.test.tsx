import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuthStore } from "../../../../src/shared/store/authStore";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("authSlice", () => {
  it("starts unauthenticated with no token or user", () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("becomes authenticated after setSession and clears on clearSession", () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper });

    act(() => {
      result.current.setSession("token-abc", { id: "1", email: "a@example.com" });
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe("token-abc");
    expect(result.current.user).toEqual({ id: "1", email: "a@example.com" });

    act(() => {
      result.current.clearSession();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("keeps the existing user when setSession is called without a user argument", () => {
    const { result } = renderHook(() => useAuthStore(), { wrapper });

    act(() => {
      result.current.setSession("token-1", { id: "1", email: "a@example.com" });
    });
    act(() => {
      result.current.setSession("token-2");
    });

    expect(result.current.accessToken).toBe("token-2");
    expect(result.current.user).toEqual({ id: "1", email: "a@example.com" });
  });

  it("throws when useAuthStore is used outside an AuthProvider", () => {
    // Suppress the expected React error boundary console output for this negative test.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuthStore())).toThrow(
      "useAuthStore must be used within an AuthProvider",
    );
    spy.mockRestore();
  });
});
