import { describe, expect, it, afterEach, vi } from "vitest";
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithProviders } from "../../test-utils";
import { Login } from "../../../src/pages/Login";
import { AuthProvider, useAuthStore } from "../../../src/shared/store/authStore";
import { mockFetchOnce } from "../../mocks/authApi";
import { expectNoA11yViolations } from "../support/a11y";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Login page", () => {
  it("shows a generic error on invalid credentials", async () => {
    mockFetchOnce(401, { detail: "Invalid email or password." });
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong-pass1" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid email or password/i),
    );
  });

  it("shows the CAPTCHA widget when the server requires it", async () => {
    mockFetchOnce(428, { detail: "CAPTCHA verification required." });
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong-pass1" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(screen.getByTestId("captcha-widget")).toBeInTheDocument());
  });

  it("offers a link to the registration page", () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute("href", "/register");
  });

  it("shows a generic error message for a non-API failure (e.g. network error)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Passw0rd1" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/login failed\. please try again\./i),
    );
  });

  it("redirects an already-authenticated visitor to the home page instead of showing the form", () => {
    function AuthedApp() {
      const { setSession } = useAuthStore();
      return (
        <>
          <button type="button" onClick={() => setSession("tok", { id: "1", email: "a@example.com" })}>
            simulate-login
          </button>
          <Login />
        </>
      );
    }

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/login"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AuthedApp />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText("simulate-login"));
    expect(screen.queryByRole("heading", { name: /log in/i })).not.toBeInTheDocument();
  });

  it("shows a resend-code prompt when the account exists but is not yet email-verified", async () => {
    mockFetchOnce(403, { detail: { detail: "Email address not verified.", reason: "EMAIL_NOT_VERIFIED" } });
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Passw0rd1" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(screen.getByTestId("resend-otp-prompt")).toBeInTheDocument());
  });

  it("renders the shared screen-shell/screen-card container classes with token-driven styling (US1)", () => {
    renderWithProviders(<Login />);
    const form = screen.getByRole("form", { name: /login form/i });
    const card = form.closest(".screen-card");
    expect(card).toHaveClass("screen-card");
    expect(card?.parentElement).toHaveClass("screen-shell");
  });

  it("shows a distinct loading/disabled state on the submit button while a request is in flight (US2)", async () => {
    mockFetchOnce(401, { detail: "Invalid email or password." });
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong-pass1" } });
    const submitButton = screen.getByRole("button", { name: /log in/i });
    fireEvent.click(submitButton);

    expect(submitButton).toHaveClass("is-loading");
    await waitFor(() => expect(submitButton).not.toHaveClass("is-loading"));
  });

  it("shows a distinct error-state class on invalid submission (US2)", async () => {
    mockFetchOnce(401, { detail: "Invalid email or password." });
    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong-pass1" } });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveClass("state-message--error"));
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderWithProviders(<Login />);
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations in the dark theme (T038)", async () => {
    document.documentElement.dataset.theme = "dark";
    const { container } = renderWithProviders(<Login />);
    await expectNoA11yViolations(container);
    delete document.documentElement.dataset.theme;
  });
});
