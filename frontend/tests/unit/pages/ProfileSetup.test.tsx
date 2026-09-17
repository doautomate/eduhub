import { useEffect } from "react";
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthStore } from "../../../src/shared/store/authStore";
import { render } from "@testing-library/react";
import { ProfileSetup } from "../../../src/pages/ProfileSetup";
import { userService } from "../../../src/shared/services/userService";
import { ApiError } from "../../../src/shared/types/auth";
import { expectNoA11yViolations } from "../support/a11y";

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

beforeEach(() => {
  vi.spyOn(userService, "getProfile").mockResolvedValue(BASE_PROFILE);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function AuthedProfileSetup() {
  const { setSession } = useAuthStore();
  useEffect(() => {
    setSession("tok", { id: "1", email: "ada@example.com" });
  }, [setSession]);
  return <ProfileSetup />;
}

function renderProfileSetup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AuthedProfileSetup />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProfileSetup page (User Story 1)", () => {
  it("has no accessibility violations", async () => {
    const { container } = renderProfileSetup();
    await screen.findByLabelText("Board");
    await expectNoA11yViolations(container);
  });

  it("blocks submit when Board or Standard is empty", async () => {
    renderProfileSetup();
    await screen.findByLabelText("Board");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Board and Standard are both required.",
    );
  });

  it("shows an 'Other' free-text input only when Board is Other, and requires it", async () => {
    renderProfileSetup();
    await screen.findByLabelText("Board");

    expect(screen.queryByLabelText(/please specify your board/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "OTHER" } });
    expect(screen.getByLabelText(/please specify your board/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "VIII" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please tell us the name of your Board.",
    );
  });

  it("submits valid Board+Standard and navigates to /profile", async () => {
    vi.spyOn(userService, "updateAcademicProfile").mockResolvedValue({
      ...BASE_PROFILE,
      board: "CBSE",
      standard: "VIII",
      academic_profile_complete: true,
      house_number: null,
      apartment_building: null,
    });
    renderProfileSetup();
    await screen.findByLabelText("Board");

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
  });

  it("shows the server error message when the save fails", async () => {
    vi.spyOn(userService, "updateAcademicProfile").mockRejectedValue(
      new ApiError(422, "Standard is invalid."),
    );
    renderProfileSetup();
    await screen.findByLabelText("Board");

    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "CBSE" } });
    fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "VIII" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Standard is invalid.");
  });
});
