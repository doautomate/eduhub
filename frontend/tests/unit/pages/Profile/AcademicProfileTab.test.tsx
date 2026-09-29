import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AcademicProfileTab } from "../../../../src/pages/Profile/AcademicProfileTab";
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

function renderTab(onSaved = vi.fn(), profile: UserProfile = BASE_PROFILE) {
  return { onSaved, ...render(
    <AcademicProfileTab accessToken="tok" profile={profile} onSaved={onSaved} />,
  ) };
}

describe("AcademicProfileTab", () => {
  it("renders the read-only view with 'Not set' placeholders when board/standard are unset", () => {
    renderTab();
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
  });

  it("reveals the editable form when Edit is clicked", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByLabelText("Board")).toBeInTheDocument();
  });

  it("reverts to the read-only view without saving on Cancel", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "CBSE" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByLabelText("Board")).not.toBeInTheDocument();
  });

  it("blocks submit with a required-field message when Board or Standard is empty", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /board and standard are both required/i,
    );
  });

  it("requires the free-text board name when Board is 'Other'", async () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "OTHER" } });
    fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "VIII" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /please tell us the name of your board/i,
    );
  });

  it("saves the academic profile and shows a success message", async () => {
    const onSaved = vi.fn();
    const updated = { ...BASE_PROFILE, board: "CBSE" as const, standard: "VIII" as const };
    vi.spyOn(userService, "updateAcademicProfile").mockResolvedValue(updated);
    renderTab(onSaved);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "CBSE" } });
    fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "VIII" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(userService.updateAcademicProfile).toHaveBeenCalledWith("tok", {
        board: "CBSE",
        standard: "VIII",
        boardOther: null,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(updated);
    expect(await screen.findByRole("status")).toHaveTextContent(/updated successfully/i);
  });

  it("shows the server error message when the save fails with an ApiError", async () => {
    vi.spyOn(userService, "updateAcademicProfile").mockRejectedValue(
      new ApiError(422, "Standard is invalid."),
    );
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "CBSE" } });
    fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "VIII" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Standard is invalid.");
  });

  it("shows a generic error message when the save fails with a non-ApiError", async () => {
    vi.spyOn(userService, "updateAcademicProfile").mockRejectedValue(new Error("boom"));
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "CBSE" } });
    fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "VIII" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /failed to update your academic profile\. please try again\./i,
    );
  });

  it("shows the board's free-text name in the read-only view when Board is 'Other'", () => {
    renderTab(vi.fn(), { ...BASE_PROFILE, board: "OTHER", board_other: "Cambridge" });
    expect(screen.getByText("Cambridge")).toBeInTheDocument();
  });
});
