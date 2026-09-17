import { describe, expect, it } from "vitest";
import { screen, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../../src/shared/store/authStore";
import { ThemeProvider } from "../../../src/shared/theme/ThemeProvider";
import { AppRoutes } from "../../../src/app/routes";

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("AppRoutes", () => {
  it("renders the registration page at /register", () => {
    renderAt("/register");
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
  });

  it("renders the login page at /login", () => {
    renderAt("/login");
    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
  });

  it("renders the 404 page for an unknown path", () => {
    renderAt("/does-not-exist");
    expect(screen.getByRole("heading", { name: /404 - page not found/i })).toBeInTheDocument();
  });

  it("renders the universal landing page at / for unauthenticated visitors (US3, FR-008)", () => {
    renderAt("/");
    expect(
      screen.getByRole("heading", { name: /master your exams with crisp visuals/i }),
    ).toBeInTheDocument();
  });
});
