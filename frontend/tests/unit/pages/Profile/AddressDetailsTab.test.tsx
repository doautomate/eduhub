import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddressDetailsTab } from "../../../../src/pages/Profile/AddressDetailsTab";
import { userService } from "../../../../src/shared/services/userService";
import { locationService } from "../../../../src/shared/services/locationService";
import { ApiError } from "../../../../src/shared/types/auth";
import type { UserProfile } from "../../../../src/shared/types/user";

const BASE_PROFILE: UserProfile = {
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
  house_number: "12",
  apartment_building: "Sunrise Apts",
};

afterEach(() => {
  vi.restoreAllMocks();
});

function stubLocationService() {
  vi.spyOn(locationService, "getCountries").mockResolvedValue([
    { code: "IN", name: "India", states: [{ code: "KA", name: "Karnataka" }] },
  ]);
  vi.spyOn(locationService, "getStates").mockResolvedValue([
    { code: "KA", name: "Karnataka" },
  ]);
}

function renderTab(onSaved = vi.fn(), profile: UserProfile = BASE_PROFILE) {
  return { onSaved, ...render(
    <AddressDetailsTab accessToken="tok" profile={profile} onSaved={onSaved} />,
  ) };
}

describe("AddressDetailsTab", () => {
  it("renders the read-only view with resolved country/state labels", async () => {
    stubLocationService();
    renderTab();
    expect(await screen.findByText("India")).toBeInTheDocument();
    expect(await screen.findByText("Karnataka")).toBeInTheDocument();
    expect(screen.getByText("560001")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Sunrise Apts")).toBeInTheDocument();
  });

  it("shows 'Not set' placeholders when address fields are empty", () => {
    stubLocationService();
    renderTab(vi.fn(), {
      ...BASE_PROFILE,
      country: "",
      state_province: "",
      pin_code: "",
      house_number: null,
      apartment_building: null,
    });
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
  });

  it("reveals the editable form when Edit is clicked", async () => {
    stubLocationService();
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(await screen.findByLabelText(/pin\/postal code/i)).toHaveValue("560001");
  });

  it("reverts to the read-only view without saving on Cancel", async () => {
    stubLocationService();
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(await screen.findByLabelText(/pin\/postal code/i), {
      target: { value: "999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByLabelText(/pin\/postal code/i)).not.toBeInTheDocument();
    expect(screen.getByText("560001")).toBeInTheDocument();
  });

  it("blocks submit with a required-field message when country/state/pin are missing", async () => {
    stubLocationService();
    renderTab(vi.fn(), { ...BASE_PROFILE, country: "", state_province: "", pin_code: "" });
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /country, state\/province, and pin\/postal code are required/i,
    );
  });

  it("saves the address and shows a success message", async () => {
    stubLocationService();
    const onSaved = vi.fn();
    const updated = { ...BASE_PROFILE, pin_code: "560002" };
    vi.spyOn(userService, "updateAddress").mockResolvedValue(updated);
    renderTab(onSaved);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(await screen.findByLabelText(/pin\/postal code/i), {
      target: { value: "560002" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(userService.updateAddress).toHaveBeenCalledWith("tok", {
        country: "IN",
        stateProvince: "KA",
        pinCode: "560002",
        houseNumber: "12",
        apartmentBuilding: "Sunrise Apts",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(updated);
    expect(await screen.findByRole("status")).toHaveTextContent(/updated successfully/i);
  });

  it("shows the server error message when the save fails with an ApiError", async () => {
    stubLocationService();
    vi.spyOn(userService, "updateAddress").mockRejectedValue(
      new ApiError(422, "Pin code is invalid."),
    );
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Pin code is invalid.");
  });

  it("shows a generic error message when the save fails with a non-ApiError", async () => {
    stubLocationService();
    vi.spyOn(userService, "updateAddress").mockRejectedValue(new Error("boom"));
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /failed to update your address\. please try again\./i,
    );
  });

  it("resets the state/province when the country changes", async () => {
    stubLocationService();
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    await screen.findByLabelText(/pin\/postal code/i);

    const countryInput = screen.getByRole("combobox", { name: /^country$/i });
    fireEvent.focus(countryInput);
    fireEvent.change(countryInput, { target: { value: "India" } });
    const option = await screen.findByRole("option", { name: "India" });
    fireEvent.mouseDown(option);

    const stateInput = screen.getByRole("combobox", { name: /state\/province/i }) as HTMLInputElement;
    expect(stateInput.value).toBe("");
  });
});
