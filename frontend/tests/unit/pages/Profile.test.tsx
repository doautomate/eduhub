import { useEffect } from "react";
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthStore } from "../../../src/shared/store/authStore";
import { render } from "@testing-library/react";
import { Profile } from "../../../src/pages/Profile";
import { userService } from "../../../src/shared/services/userService";
import { ApiError } from "../../../src/shared/types/auth";
import { expectNoA11yViolations } from "../support/a11y";

beforeEach(() => {
  // Country/state options come from locationService's local curated fallback in
  // these tests - no real network call should ever be attempted.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network disabled in tests")));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function AuthedProfile() {
  const { setSession } = useAuthStore();
  useEffect(() => {
    setSession("tok", { id: "1", email: "ada@example.com" });
  }, [setSession]);
  return (
    <>
      <Profile />
      <LocationDisplay />
    </>
  );
}

function LocationDisplay() {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname}</span>;
}

async function switchTab(name: RegExp) {
  await userEvent.click(screen.getByRole("tab", { name }));
  await waitFor(() => expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true"));
}

function renderProfile() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AuthedProfile />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const BASE_PROFILE = {
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

describe("Profile page (User Story 5)", () => {
  it("shows a loading skeleton while the profile is being fetched", async () => {
    let resolveProfile: (value: typeof BASE_PROFILE) => void = () => {};
    vi.spyOn(userService, "getProfile").mockImplementation(
      () => new Promise((resolve) => { resolveProfile = resolve; }),
    );
    renderProfile();

    expect(screen.getByText(/loading your profile/i)).toBeInTheDocument();

    resolveProfile(BASE_PROFILE);
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
  });

  it("shows an error state when the profile fails to load", async () => {
    vi.spyOn(userService, "getProfile").mockRejectedValue(new Error("network error"));
    renderProfile();

    await waitFor(() =>
      expect(screen.getByText(/unable to load your profile/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/your profile is not available right now/i),
    ).toBeInTheDocument();
  });

  it("renders three tabs with Personal Details active by default, showing a read-only view with an Edit action (T023)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());

    expect(screen.getByRole("tab", { name: /personal details/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /academic profile/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: /address details/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("+15551234567")).toBeInTheDocument();
    expect(screen.queryByLabelText(/mobile number/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
  });

  it("reveals the editable mobile number field with Save changes/Cancel actions after clicking Edit on Personal Details", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    const mobileInput = screen.getByLabelText(/mobile number/i);
    expect(mobileInput).toHaveValue("+15551234567");
    expect(mobileInput).toBeEnabled();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeInTheDocument();
  });

  it("keeps an unsaved Personal Details edit intact after switching to another tab and back (T039)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: "+15559998888" },
    });

    await switchTab(/academic profile/i);
    await switchTab(/personal details/i);

    expect(screen.getByLabelText(/mobile number/i)).toHaveValue("+15559998888");
  });

  it("saves Address Details independently without affecting an unsaved Personal Details draft (T040)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    vi.spyOn(userService, "updateAddress").mockResolvedValue({
      ...BASE_PROFILE,
      pin_code: "94105",
    });
    const updatePersonalDetailsSpy = vi.spyOn(userService, "updatePersonalDetails");
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: "+15559998888" },
    });

    await switchTab(/address details/i);
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/pin\/postal code/i), {
      target: { value: "94105" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/updated successfully/i),
    );
    expect(updatePersonalDetailsSpy).not.toHaveBeenCalled();

    await switchTab(/personal details/i);
    expect(screen.getByLabelText(/mobile number/i)).toHaveValue("+15559998888");
  });

  it("displays the saved address fields once loaded", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    renderProfile();

    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    await switchTab(/address details/i);
    await waitFor(() => expect(screen.getByText("India")).toBeInTheDocument());
    expect(screen.getByText("Karnataka")).toBeInTheDocument();
    expect(screen.getByText("560001")).toBeInTheDocument();
  });

  it("resets the state/province select when the country changes", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    await switchTab(/address details/i);
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    const countryInput = screen.getByRole("combobox", { name: /^country$/i });
    fireEvent.focus(countryInput);
    fireEvent.change(countryInput, { target: { value: "United States" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "United States" }));

    expect(screen.queryByDisplayValue("Karnataka")).not.toBeInTheDocument();
  });

  it("saves an address update and shows a success message", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    vi.spyOn(userService, "updateAddress").mockResolvedValue({
      ...BASE_PROFILE,
      country: "US",
      state_province: "CA",
      pin_code: "94105",
    });
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    await switchTab(/address details/i);
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    const countryInput = screen.getByRole("combobox", { name: /^country$/i });
    fireEvent.focus(countryInput);
    fireEvent.change(countryInput, { target: { value: "United States" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "United States" }));

    const stateInput = screen.getByRole("combobox", { name: /state\/province/i });
    fireEvent.focus(stateInput);
    fireEvent.change(stateInput, { target: { value: "California" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "California" }));

    fireEvent.change(screen.getByLabelText(/pin\/postal code/i), {
      target: { value: "94105" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/updated successfully/i),
    );
  });

  it("shows a validation error when the state/province is cleared before saving", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    await switchTab(/address details/i);
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    const stateInput = screen.getByRole("combobox", { name: /state\/province/i });
    fireEvent.change(stateInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /country, state\/province, and pin\/postal code are required/i,
      ),
    );
  });

  it("shows a server-provided error message when the update fails", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    vi.spyOn(userService, "updateAddress").mockRejectedValue(
      new ApiError(422, "State/Province is required and must belong to the selected country."),
    );
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    await switchTab(/address details/i);
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/must belong to the selected country/i),
    );
  });

  it("renders the shared screen-shell/screen-card container classes with token-driven styling (US1)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());

    const card = screen.getByRole("heading", { name: /my profile/i }).closest(".screen-card");
    expect(card).toHaveClass("screen-card");
    expect(card?.parentElement).toHaveClass("screen-shell");
  });

  it("shows a distinct loading/disabled state and success-state class on save (US2/FR-005/FR-006)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    vi.spyOn(userService, "updateAddress").mockResolvedValue(BASE_PROFILE);
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    await switchTab(/address details/i);
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    const submitButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitButton);
    expect(submitButton).toHaveClass("is-loading");

    await waitFor(() => expect(screen.getByRole("status")).toHaveClass("state-message--success"));
  });

  it("has no detectable accessibility violations", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    const { container } = renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations in the dark theme (T038)", async () => {
    document.documentElement.dataset.theme = "dark";
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    const { container } = renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    await expectNoA11yViolations(container);
    delete document.documentElement.dataset.theme;
  });

  it("displays the saved Board and Standard as read-only values (US2)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue({
      ...BASE_PROFILE,
      board: "CBSE",
      standard: "VIII",
      academic_profile_complete: true,
      house_number: null,
      apartment_building: null,
    });
    renderProfile();

    expect(await screen.findByText("CBSE")).toBeInTheDocument();
    expect(screen.getByText("VIII")).toBeInTheDocument();
    expect(screen.queryByLabelText(/edit academic profile form/i)).not.toBeInTheDocument();
  });

  it("displays the 'Other' board free text instead of the enum value (US2)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue({
      ...BASE_PROFILE,
      board: "OTHER",
      board_other: "Cambridge Assessment",
      standard: "X",
      academic_profile_complete: true,
      house_number: null,
      apartment_building: null,
    });
    renderProfile();

    expect(await screen.findByText("Cambridge Assessment")).toBeInTheDocument();
  });

  it("pre-fills Board/Standard in Edit mode, saves on change, and reflects the new values (US3)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue({
      ...BASE_PROFILE,
      board: "CBSE",
      standard: "VIII",
      academic_profile_complete: true,
      house_number: null,
      apartment_building: null,
    });
    vi.spyOn(userService, "updateAcademicProfile").mockResolvedValue({
      ...BASE_PROFILE,
      board: "CBSE",
      standard: "IX",
      academic_profile_complete: true,
      house_number: null,
      apartment_building: null,
    });
    renderProfile();
    await screen.findByText("CBSE");
    await switchTab(/academic profile/i);

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    expect(screen.getByLabelText("Board")).toHaveValue("CBSE");
    expect(screen.getByLabelText("Standard")).toHaveValue("VIII");

    fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "IX" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(userService.updateAcademicProfile).toHaveBeenCalledWith("tok", {
        board: "CBSE",
        standard: "IX",
        boardOther: null,
      }),
    );
    expect(await screen.findByText("IX")).toBeInTheDocument();
  });

  it("discards an abandoned academic profile edit on Cancel (US3)", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue({
      ...BASE_PROFILE,
      board: "CBSE",
      standard: "VIII",
      academic_profile_complete: true,
      house_number: null,
      apartment_building: null,
    });
    const updateSpy = vi.spyOn(userService, "updateAcademicProfile");
    renderProfile();
    await screen.findByText("CBSE");
    await switchTab(/academic profile/i);

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "XI" } });
    const academicForm = screen.getByLabelText(/edit academic profile form/i);
    fireEvent.click(within(academicForm).getByRole("button", { name: /^cancel$/i }));

    expect(updateSpy).not.toHaveBeenCalled();
    expect(screen.getByText("VIII")).toBeInTheDocument();
    expect(screen.queryByText("XI")).not.toBeInTheDocument();
  });

  it("reverts unsaved address changes and returns to the read-only view on Cancel", async () => {
    vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
    const updateSpy = vi.spyOn(userService, "updateAddress");
    renderProfile();
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    await switchTab(/address details/i);
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    const countryInput = screen.getByRole("combobox", { name: /^country$/i });
    fireEvent.focus(countryInput);
    fireEvent.change(countryInput, { target: { value: "United States" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "United States" }));
    fireEvent.change(screen.getByLabelText(/pin\/postal code/i), {
      target: { value: "99999" },
    });

    const addressForm = screen.getByLabelText(/edit address form/i);
    fireEvent.click(within(addressForm).getByRole("button", { name: /^cancel$/i }));

    expect(updateSpy).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/edit address form/i)).not.toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
    expect(screen.getByText("560001")).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/");
  });
});
