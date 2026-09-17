import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../../../src/shared/store/authStore";
import { useAuth } from "../../../../src/shared/hooks/useAuth";
import { authService } from "../../../../src/shared/services/authService";
import { userService } from "../../../../src/shared/services/userService";

vi.mock("../../../../src/shared/services/authService", () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(authService.register).mockReset();
  vi.mocked(authService.login).mockReset();
  vi.mocked(authService.logout).mockReset();
  vi.spyOn(userService, "getProfile").mockResolvedValue({
    id: "1",
    first_name: "Test",
    last_name: "User",
    email: "a@example.com",
    mobile_number: "+15550100001",
    country: "IN",
    state_province: "KA",
    pin_code: "560001",
    is_verified: true,
    created_at: "2026-01-01T00:00:00Z",
    board: null,
    board_other: null,
    standard: null,
    academic_profile_complete: false,
    house_number: null,
    apartment_building: null,
  });
});

describe("useAuth", () => {
  it("delegates register to authService", async () => {
    vi.mocked(authService.register).mockResolvedValue({
      id: "1",
      first_name: "Test",
      last_name: "User",
      email: "a@example.com",
      mobile_number: "+15550100001",
      country: "IN",
      state_province: "KA",
      pin_code: "560001",
      is_verified: false,
      created_at: "2026-01-01T00:00:00Z",
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register({
        firstName: "Test",
        lastName: "User",
        email: "a@example.com",
        mobileNumber: "+15550100001",
        password: "Passw0rd1",
        country: "IN",
        stateProvince: "KA",
        pinCode: "560001",
        dateOfBirth: "2000-01-01",
        securityQuestionCode: "FIRST_PET",
        securityAnswer: "Rex",
      });
    });

    expect(authService.register).toHaveBeenCalledWith({
      firstName: "Test",
      lastName: "User",
      email: "a@example.com",
      mobileNumber: "+15550100001",
      password: "Passw0rd1",
      country: "IN",
      stateProvince: "KA",
      pinCode: "560001",
      dateOfBirth: "2000-01-01",
      securityQuestionCode: "FIRST_PET",
      securityAnswer: "Rex",
    });
  });

  it("logs in, stores the session, and reports authenticated state", async () => {
    vi.mocked(authService.login).mockResolvedValue({ accessToken: "tok-123", expiresIn: 900 });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: "a@example.com", password: "Passw0rd1" });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe("tok-123");

    await waitFor(() => expect(result.current.isVerified).toBe(true));
  });

  it("logs out and clears the session", async () => {
    vi.mocked(authService.login).mockResolvedValue({ accessToken: "tok-123", expiresIn: 900 });
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ email: "a@example.com", password: "Passw0rd1" });
    });
    await act(async () => {
      await result.current.logout();
    });

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });
});
