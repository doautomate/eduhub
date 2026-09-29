import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PersonalDetailsTab } from "../../../../src/pages/Profile/PersonalDetailsTab";
import { userService } from "../../../../src/shared/services/userService";
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
  house_number: null,
  apartment_building: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

function renderTab(onSaved = vi.fn()) {
  return { onSaved, ...render(
    <PersonalDetailsTab accessToken="tok" profile={BASE_PROFILE} onSaved={onSaved} />,
  ) };
}

describe("PersonalDetailsTab", () => {
  it("renders the read-only view with name, email, and mobile number", () => {
    renderTab();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("+15551234567")).toBeInTheDocument();
  });

  it("reveals the editable form when Edit is clicked", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByLabelText(/mobile number/i)).toHaveValue("+15551234567");
  });

  it("reverts to the read-only view without saving on Cancel", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: "+15559999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByLabelText(/mobile number/i)).not.toBeInTheDocument();
    expect(screen.getByText("+15551234567")).toBeInTheDocument();
  });

  it("blocks submit with a required-field message when the mobile number is blank", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/mobile number is required/i);
  });

  it("saves the trimmed mobile number and shows a success message", async () => {
    const onSaved = vi.fn();
    const updated = { ...BASE_PROFILE, mobile_number: "+15559999999" };
    vi.spyOn(userService, "updatePersonalDetails").mockResolvedValue(updated);
    renderTab(onSaved);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: "  +15559999999  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(userService.updatePersonalDetails).toHaveBeenCalledWith("tok", {
        mobileNumber: "+15559999999",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(updated);
    expect(await screen.findByRole("status")).toHaveTextContent(/updated successfully/i);
  });

  it("shows the server error message when the save fails with an ApiError", async () => {
    vi.spyOn(userService, "updatePersonalDetails").mockRejectedValue(
      new ApiError(422, "Mobile number is already in use."),
    );
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: "+15559999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Mobile number is already in use.");
  });

  it("shows a generic error message when the save fails with a non-ApiError", async () => {
    vi.spyOn(userService, "updatePersonalDetails").mockRejectedValue(new Error("boom"));
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: "+15559999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /failed to update your mobile number\. please try again\./i,
    );
  });
});
