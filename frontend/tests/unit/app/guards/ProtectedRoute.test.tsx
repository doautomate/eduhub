import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "../../../../src/app/guards/ProtectedRoute";
import { useAuth } from "../../../../src/shared/hooks/useAuth";

vi.mock("../../../../src/shared/hooks/useAuth");

function ProtectedHome() {
  return <div>protected-home</div>;
}

function LoginStub() {
  return <div>login-page</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ProtectedHome />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.mocked(useAuth).mockReset();
});

describe("ProtectedRoute", () => {
  it("redirects to /login when the user is not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      accessToken: null,
      user: null,
      profile: undefined,
      isVerified: false,
      academicProfileComplete: undefined,
      isProfileLoading: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderAt("/");
    expect(screen.getByText("login-page")).toBeInTheDocument();
    expect(screen.queryByText("protected-home")).not.toBeInTheDocument();
  });

  it("renders the protected content once the user is authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      accessToken: "tok",
      user: { id: "1", email: "a@example.com" },
      profile: undefined,
      isVerified: true,
      academicProfileComplete: undefined,
      isProfileLoading: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderAt("/");
    expect(screen.getByText("protected-home")).toBeInTheDocument();
    expect(screen.queryByText("login-page")).not.toBeInTheDocument();
  });
});
