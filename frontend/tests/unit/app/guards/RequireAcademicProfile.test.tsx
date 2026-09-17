import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireAcademicProfile } from "../../../../src/app/guards/RequireAcademicProfile";
import { useAuth } from "../../../../src/shared/hooks/useAuth";

vi.mock("../../../../src/shared/hooks/useAuth");

function Gated() {
  return <div>gated-content</div>;
}

function SetupStub() {
  return <div>profile-setup-page</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/profile"
          element={
            <RequireAcademicProfile>
              <Gated />
            </RequireAcademicProfile>
          }
        />
        <Route
          path="/profile/setup"
          element={
            <RequireAcademicProfile>
              <SetupStub />
            </RequireAcademicProfile>
          }
        />
        <Route path="/" element={<div>home-page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockAuth(overrides: { academicProfileComplete?: boolean; isProfileLoading?: boolean }) {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    accessToken: "tok",
    user: { id: "1", email: "a@example.com" },
    profile: undefined,
    isVerified: true,
    academicProfileComplete: overrides.academicProfileComplete,
    isProfileLoading: overrides.isProfileLoading ?? false,
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  });
}

afterEach(() => {
  vi.mocked(useAuth).mockReset();
});

describe("RequireAcademicProfile", () => {
  it("redirects to /profile/setup when the academic profile is incomplete", () => {
    mockAuth({ academicProfileComplete: false });
    renderAt("/profile");
    expect(screen.getByText("profile-setup-page")).toBeInTheDocument();
    expect(screen.queryByText("gated-content")).not.toBeInTheDocument();
  });

  it("renders the gated content once the academic profile is complete", () => {
    mockAuth({ academicProfileComplete: true });
    renderAt("/profile");
    expect(screen.getByText("gated-content")).toBeInTheDocument();
    expect(screen.queryByText("profile-setup-page")).not.toBeInTheDocument();
  });

  it("renders children (not a redirect) while the profile is still loading", () => {
    mockAuth({ academicProfileComplete: undefined, isProfileLoading: true });
    renderAt("/profile");
    expect(screen.getByText("gated-content")).toBeInTheDocument();
    expect(screen.queryByText("profile-setup-page")).not.toBeInTheDocument();
  });

  it("redirects /profile/setup to / once the academic profile is already complete", () => {
    mockAuth({ academicProfileComplete: true });
    renderAt("/profile/setup");
    expect(screen.getByText("home-page")).toBeInTheDocument();
    expect(screen.queryByText("profile-setup-page")).not.toBeInTheDocument();
  });

  it("renders the setup page itself when the profile is incomplete", () => {
    mockAuth({ academicProfileComplete: false });
    renderAt("/profile/setup");
    expect(screen.getByText("profile-setup-page")).toBeInTheDocument();
  });
});
