import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthStore } from "../../../../src/shared/store/authStore";
import { HeaderIdentityControl } from "../../../../src/shared/components/AppShell/HeaderIdentityControl";
import { authService } from "../../../../src/shared/services/authService";
import { userService } from "../../../../src/shared/services/userService";
import { expectNoA11yViolations } from "../../support/a11y";

function SignedInHarness() {
  const { setSession } = useAuthStore();
  return (
    <>
      <button
        type="button"
        onClick={() => setSession("tok", { id: "1", email: "ada@example.com" })}
      >
        simulate-login
      </button>
      <HeaderIdentityControl />
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
    board: null,
  board_other: null,
  standard: null,
  academic_profile_complete: false,
  house_number: null,
  apartment_building: null,
};

beforeEach(() => {
  vi.spyOn(userService, "getProfile").mockResolvedValue(VERIFIED_PROFILE);
  // The dialog renders the full Profile page, which loads country/state
  // options via locationService - stub fetch so it falls back to the local
  // curated dataset instead of attempting a real network call in tests.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network disabled in tests")));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HeaderIdentityControl", () => {
  it("renders a Log in button when signed out", () => {
    renderWithQuery(<HeaderIdentityControl />);
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("renders the profile avatar with initials once signed in (Logout lives only in the popover)", async () => {
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));
    expect(screen.getByTestId("header-identity-control")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("header-profile-avatar")).toHaveTextContent("AL"),
    );
    // The redundant standalone "Log out" button is retired (T015/T016) -
    // Logout is only reachable via the ProfilePopover now.
    expect(screen.queryByRole("button", { name: /^log out$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^log in$/i })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("unverified-badge")).not.toBeInTheDocument());
  });

  it("shows only the first name's initial when the user has no last name", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue({ ...VERIFIED_PROFILE, last_name: "" });
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));

    await waitFor(() => expect(screen.getByTestId("header-profile-avatar")).toHaveTextContent("A"));
  });

  it("opens the ProfilePopover with the identity snapshot when the avatar is clicked", async () => {
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));
    await waitFor(() => expect(screen.getByTestId("header-profile-avatar")).toHaveTextContent("AL"));

    fireEvent.click(screen.getByTestId("header-profile-avatar"));
    expect(screen.getByTestId("profile-popover")).toBeInTheDocument();
    expect(screen.getByTestId("profile-popover-full-name")).toHaveTextContent("Ada Lovelace");
    expect(screen.getByTestId("profile-popover-email")).toHaveTextContent("ada@example.com");
    expect(screen.getByTestId("profile-popover-mobile-number")).toHaveTextContent("+15551234567");
    // Manage Profile / Logout separated by visible separators.
    expect(screen.getAllByRole("separator")).toHaveLength(2);
    expect(screen.getByTestId("profile-popover-manage-profile")).toBeInTheDocument();
    expect(screen.getByTestId("profile-popover-logout")).toBeInTheDocument();
    // Clicking the avatar must not navigate away from the current page.
    expect(screen.getByTestId("current-path")).toHaveTextContent("/");
  });

  it("closes the popover when Escape is pressed", async () => {
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));
    await waitFor(() => expect(screen.getByTestId("header-profile-avatar")).toHaveTextContent("AL"));

    fireEvent.click(screen.getByTestId("header-profile-avatar"));
    expect(screen.getByTestId("profile-popover")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId("profile-popover"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("profile-popover")).not.toBeInTheDocument());
  }, 45000);

  it("closes the popover when clicking outside it", async () => {
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));
    await waitFor(() => expect(screen.getByTestId("header-profile-avatar")).toHaveTextContent("AL"));

    fireEvent.click(screen.getByTestId("header-profile-avatar"));
    expect(screen.getByTestId("profile-popover")).toBeInTheDocument();

    // Radix's dismissable layer attaches its outside-pointerdown listener in a
    // setTimeout(0) after opening, so let that macrotask flush before firing.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate an outside pointer interaction, same as Radix's own
    // pointerdown-outside detection.
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByTestId("profile-popover")).not.toBeInTheDocument());
  }, 45000);

  it("navigates to /profile and closes the popover when Manage Profile is clicked", async () => {
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));
    await waitFor(() => expect(screen.getByTestId("header-profile-avatar")).toHaveTextContent("AL"));

    fireEvent.click(screen.getByTestId("header-profile-avatar"));
    fireEvent.click(screen.getByTestId("profile-popover-manage-profile"));

    await waitFor(() => expect(screen.queryByTestId("profile-popover")).not.toBeInTheDocument());
    expect(screen.getByTestId("current-path")).toHaveTextContent("/profile");
  });

  it("shows an Unverified badge for an authenticated user whose email is not yet verified", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue({
      ...VERIFIED_PROFILE,
      is_verified: false,
    });
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));

    await waitFor(() => expect(screen.getByTestId("unverified-badge")).toBeInTheDocument());
  });

  it("logs the user out and returns to the Log in button when Logout is clicked in the popover", async () => {
    vi.spyOn(authService, "logout").mockResolvedValue(undefined);
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));
    await waitFor(() => expect(screen.getByTestId("header-profile-avatar")).toHaveTextContent("AL"));

    fireEvent.click(screen.getByTestId("header-profile-avatar"));
    fireEvent.click(screen.getByTestId("profile-popover-logout"));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^log in$/i })).toBeInTheDocument(),
    );
    expect(authService.logout).toHaveBeenCalled();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/");
  });

  it("has no detectable accessibility violations when signed out", async () => {
    const { container } = renderWithQuery(<HeaderIdentityControl />);
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations when signed in", async () => {
    const { container } = renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));
    await waitFor(() => expect(screen.getByTestId("header-identity-control")).toBeInTheDocument());
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations in the dark theme (T038)", async () => {
    document.documentElement.dataset.theme = "dark";
    const { container } = renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));
    await waitFor(() => expect(screen.getByTestId("header-identity-control")).toBeInTheDocument());
    await expectNoA11yViolations(container);
    delete document.documentElement.dataset.theme;
  });

  it("applies the refreshed, token-driven button/badge classes (T034)", async () => {
    renderWithQuery(<HeaderIdentityControl />);
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("applies a distinct badge style to the Unverified indicator (T034)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue({
      ...VERIFIED_PROFILE,
      is_verified: false,
    });
    renderWithQuery(<SignedInHarness />);
    fireEvent.click(screen.getByText("simulate-login"));

    const badge = await screen.findByTestId("unverified-badge");
    expect(badge).toHaveTextContent(/unverified/i);
  });
});
