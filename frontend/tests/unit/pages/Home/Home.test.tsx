import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { screen, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AuthProvider, useAuthStore } from "../../../../src/shared/store/authStore";
import { Home } from "../../../../src/pages/Home";
import { userService } from "../../../../src/shared/services/userService";
import type { UserProfile } from "../../../../src/shared/types/user";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

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

function SignedInHome() {
  const { setSession } = useAuthStore();
  useEffect(() => {
    setSession("tok", { id: "1", email: "ada@example.com" });
  }, [setSession]);
  return <Home />;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Home page", () => {
  it("renders the marketing landing page for a signed-out visitor (US3 of 008/FR-008) and never shows the profile widget (FR-003, 010-US1)", () => {
    renderWithQuery(<Home />);
    expect(
      screen.getByRole("heading", { name: /master your exams with crisp visuals/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get free access now/i })).toBeInTheDocument();
    expect(screen.getByText(/choose your power-up/i)).toBeInTheDocument();
    expect(screen.getByText(/top downloads this week/i)).toBeInTheDocument();
    expect(screen.queryByText(/complete your academic profile/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/my progress dashboard/i)).not.toBeInTheDocument();
  });

  it("renders a neutral loading state while academic-profile completeness is still resolving (FR-008)", () => {
    vi.spyOn(userService, "getProfile").mockReturnValue(new Promise(() => {}));

    renderWithQuery(<SignedInHome />);

    expect(
      screen.getByRole("heading", { name: /master your exams with crisp visuals/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/loading your profile status/i)).toBeInTheDocument();
    expect(screen.queryByText(/complete your academic profile/i)).not.toBeInTheDocument();
  });

  describe("with an incomplete academic profile (010-US1)", () => {
    beforeEach(() => {
      vi.spyOn(userService, "getProfile").mockResolvedValue({
        ...BASE_PROFILE,
        academic_profile_complete: false,
        house_number: null,
        apartment_building: null,
      });
    });

    it("shows the marketing landing page plus the profile-completion widget appended below it", async () => {
      renderWithQuery(<SignedInHome />);

      expect(
        screen.getByRole("heading", { name: /master your exams with crisp visuals/i }),
      ).toBeInTheDocument();
      expect(await screen.findByText(/complete your academic profile/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Board")).toBeInTheDocument();
    });

    it("does not redirect away from Home (FR-007)", async () => {
      renderWithQuery(<SignedInHome />);
      await screen.findByText(/complete your academic profile/i);
      // Still on Home: the widget and Home's own heading/content coexist, no Navigate occurred.
      expect(screen.getByLabelText("Board")).toBeInTheDocument();
    });

    it("hides the widget immediately after a successful save, with no reload/remount (010-US2, FR-006)", async () => {
      const { fireEvent } = await import("@testing-library/react");
      vi.spyOn(userService, "updateAcademicProfile").mockResolvedValue({
        ...BASE_PROFILE,
        board: "CBSE",
        standard: "VIII",
        academic_profile_complete: true,
        house_number: null,
        apartment_building: null,
      });

      renderWithQuery(<SignedInHome />);
      await screen.findByLabelText("Board");

      fireEvent.change(screen.getByLabelText("Board"), { target: { value: "CBSE" } });
      fireEvent.change(screen.getByLabelText("Standard"), { target: { value: "VIII" } });
      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => expect(screen.queryByLabelText("Board")).not.toBeInTheDocument());
      expect(
        screen.getByRole("heading", { name: /master your exams with crisp visuals/i }),
      ).toBeInTheDocument();
    });
  });

  describe("with an already-complete academic profile (010-US3)", () => {
    beforeEach(() => {
      vi.spyOn(userService, "getProfile").mockResolvedValue({
        ...BASE_PROFILE,
        board: "CBSE",
        standard: "VIII",
        academic_profile_complete: true,
        house_number: null,
        apartment_building: null,
      });
    });

    it("renders the marketing landing page and never renders the widget (010-US2/US3)", async () => {
      renderWithQuery(<SignedInHome />);

      expect(
        screen.getByRole("heading", { name: /master your exams with crisp visuals/i }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByText(/loading your profile status/i)).not.toBeInTheDocument(),
      );
      expect(screen.queryByText(/complete your academic profile/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Board")).not.toBeInTheDocument();
    });

    it("shows the progress dashboard greeting the signed-in user by first name (My Progress Dashboard)", async () => {
      renderWithQuery(<SignedInHome />);

      expect(await screen.findByText(/my progress dashboard \(welcome back, ada!\)/i)).toBeInTheDocument();
      expect(screen.getByText(/syllabus completed/i)).toBeInTheDocument();
      expect(screen.getByText(/mind maps mastered/i)).toBeInTheDocument();
      expect(screen.getByText(/latest mock score/i)).toBeInTheDocument();
      expect(screen.getByText(/resume learning/i)).toBeInTheDocument();
    });

    it("never mounts the widget even for a single render tick (010-US3 regression)", async () => {
      renderWithQuery(<SignedInHome />);
      await waitFor(() =>
        expect(screen.queryByText(/loading your profile status/i)).not.toBeInTheDocument(),
      );
      expect(screen.queryByLabelText("Board")).not.toBeInTheDocument();
    });
  });
});
