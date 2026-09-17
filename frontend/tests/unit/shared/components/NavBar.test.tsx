import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuthStore } from "../../../../src/shared/store/authStore";
import { NavBar } from "../../../../src/shared/components/NavBar";
import { mockFetchOnce } from "../../../mocks/authApi";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

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

function LoginButtonThenNavBar() {
  const { setSession } = useAuthStore();
  return (
    <>
      <button type="button" onClick={() => setSession("tok", { id: "1", email: "a@example.com" })}>
        simulate-login
      </button>
      <NavBar />
    </>
  );
}

describe("NavBar", () => {
  it("renders without a logout button when not authenticated", () => {
    renderWithQuery(<NavBar />);
    expect(screen.getByText(/fastapi app/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
  });

  it("logs out and navigates to /login when the logout button is clicked", async () => {
    mockFetchOnce(204, undefined);
    renderWithQuery(<LoginButtonThenNavBar />);

    fireEvent.click(screen.getByText("simulate-login"));
    const logoutButton = await screen.findByRole("button", { name: /log out/i });
    fireEvent.click(logoutButton);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true }));
  });
});
