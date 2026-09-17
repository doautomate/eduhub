import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthStore } from "../../../../src/shared/store/authStore";
import { ProfilePopover } from "../../../../src/shared/components/AppShell/ProfilePopover";
import { authService } from "../../../../src/shared/services/authService";
import { userService } from "../../../../src/shared/services/userService";

/**
 * T010 (US1): standalone unit tests for `ProfilePopover` in isolation from
 * `HeaderIdentityControl` - renders the five identity fields from
 * `useAuth().profile`, exposes "Manage Profile"/"Logout" separated by
 * `role="separator"` elements, and closes on outside-click/Escape without
 * calling `logout()` or navigating.
 */

const VERIFIED_PROFILE = {
  id: "1",
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  mobile_number: "+15551234567",
  country: "IN",
  state_province: "KA",
  pin_code: "560001",
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  board: "CBSE" as const,
  board_other: null,
  standard: "X" as const,
  academic_profile_complete: true,
  house_number: null,
  apartment_building: null,
};

function SignedInHarness() {
  const { setSession } = useAuthStore();
  return (
    <>
      <button type="button" onClick={() => setSession("tok", { id: "1", email: "ada@example.com" })}>
        simulate-login
      </button>
      <ProfilePopover initials="AL" />
      <LocationDisplay />
    </>
  );
}

function LocationDisplay() {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname}</span>;
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(userService, "getProfile").mockResolvedValue(VERIFIED_PROFILE);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProfilePopover", () => {
  it("renders all five identity fields from useAuth().profile with separators before each section", async () => {
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));

    fireEvent.click(await screen.findByTestId("header-profile-avatar"));

    expect(screen.getByTestId("profile-popover-full-name")).toHaveTextContent("Ada Lovelace");
    expect(screen.getByTestId("profile-popover-email")).toHaveTextContent("ada@example.com");
    expect(screen.getByTestId("profile-popover-mobile-number")).toHaveTextContent("+15551234567");
    expect(screen.getByTestId("profile-popover-standard-board")).toHaveTextContent("X");
    expect(screen.getByTestId("profile-popover-standard-board")).toHaveTextContent("CBSE");

    const separators = screen.getAllByRole("separator");
    expect(separators).toHaveLength(2);

    const manageProfileButton = screen.getByTestId("profile-popover-manage-profile");
    const logoutButton = screen.getByTestId("profile-popover-logout");
    // First separator precedes "Manage Profile"; second precedes "Logout".
    expect(
      separators[0].compareDocumentPosition(manageProfileButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      separators[1].compareDocumentPosition(logoutButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("closes on Escape without calling logout or navigating away", async () => {
    const logoutSpy = vi.spyOn(authService, "logout").mockResolvedValue(undefined);
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));

    fireEvent.click(await screen.findByTestId("header-profile-avatar"));
    expect(screen.getByTestId("profile-popover")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("profile-popover")).not.toBeInTheDocument());

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/");
  }, 45000);

  it("closes on an outside click without calling logout or navigating away", async () => {
    const logoutSpy = vi.spyOn(authService, "logout").mockResolvedValue(undefined);
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));

    fireEvent.click(await screen.findByTestId("header-profile-avatar"));
    expect(screen.getByTestId("profile-popover")).toBeInTheDocument();

    // Radix's dismissable layer attaches its outside-pointerdown listener in a
    // setTimeout(0) after opening, so let that macrotask flush before firing.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByTestId("profile-popover")).not.toBeInTheDocument());

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/");
  }, 45000);
});
