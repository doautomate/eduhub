import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomeProfileWidget } from "../../../../src/pages/Home/HomeProfileWidget";
import { userService } from "../../../../src/shared/services/userService";
import { ApiError } from "../../../../src/shared/types/auth";
import { expectNoA11yViolations } from "../../support/a11y";

function renderWidget() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HomeProfileWidget accessToken="tok" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HomeProfileWidget (US1)", () => {
  it("has no accessibility violations", async () => {
    const { container } = renderWidget();
    await screen.findByLabelText("Board");
    await expectNoA11yViolations(container);
  });

  it("renders the shared Board/Standard fields inline", async () => {
    renderWidget();
    expect(await screen.findByLabelText("Board")).toBeInTheDocument();
    expect(screen.getByLabelText("Standard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("blocks submit when Board or Standard is empty", async () => {
    renderWidget();
    await screen.findByLabelText("Board");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Board and Standard are both required.",
    );
  });

  it("shows an 'Other' free-text input only when Board is Other, and requires it", async () => {
    renderWidget();
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

  describe("on valid submit", () => {
    beforeEach(() => {
      vi.spyOn(userService, "updateAcademicProfile").mockResolvedValue({
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
        board: "CBSE",
        board_other: null,
        standard: "VIII",
        academic_profile_complete: true,
        house_number: null,
        apartment_building: null,
      });
    });

    it("calls userService.updateAcademicProfile with the entered values, without navigating away", async () => {
      renderWidget();
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

    it("writes the PATCH response into the shared session query cache synchronously (US2, FR-006)", async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <HomeProfileWidget accessToken="tok" />
        </QueryClientProvider>,
      );
      await screen.findByLabelText("Board");

      fireEvent.change(screen.getByLabelText("Board"), { target: { value: "CBSE" } });
      fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "VIII" } });
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        const cached = queryClient.getQueryData(["session", "tok"]) as
          | { academic_profile_complete: boolean }
          | undefined;
        expect(cached?.academic_profile_complete).toBe(true);
      });
    });
  });

  it("shows the server error message when the save fails", async () => {
    vi.spyOn(userService, "updateAcademicProfile").mockRejectedValue(
      new ApiError(422, "Standard is invalid."),
    );
    renderWidget();
    await screen.findByLabelText("Board");

    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "CBSE" } });
    fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "VIII" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Standard is invalid.");
  });

  it("re-appears with a fresh empty form after an abandoned edit (FR-009 — verified via remount, since the widget itself holds no persisted dismiss state)", async () => {
    const { unmount } = renderWidget();
    await screen.findByLabelText("Board");
    fireEvent.change(screen.getByLabelText("Board"), { target: { value: "CBSE" } });
    unmount();

    renderWidget();
    expect(await screen.findByLabelText("Board")).toHaveValue("");
  });
});
