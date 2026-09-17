import { describe, expect, it, afterEach, vi } from "vitest";
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithProviders } from "../../../test-utils";
import { Register } from "../../../../src/pages/Register";
import { AuthProvider, useAuthStore } from "../../../../src/shared/store/authStore";
import { mockFetchOnce } from "../../../mocks/authApi";
import { expectNoA11yViolations } from "../../support/a11y";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

afterEach(() => {
  vi.unstubAllGlobals();
  navigateMock.mockReset();
  sessionStorage.clear();
});

async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
  fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "new@example.com" } });
  fireEvent.change(screen.getByLabelText(/mobile number/i), {
    target: { value: "+15551234567" },
  });
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1990-01-01" } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Passw0rd1!" } });
  await selectCountryAndState();
  fireEvent.change(screen.getByLabelText(/pin\/postal code/i), { target: { value: "560001" } });
  fireEvent.change(screen.getByLabelText(/security question/i), {
    target: { value: "FIRST_PET" },
  });
  fireEvent.change(screen.getByLabelText(/security answer/i), { target: { value: "Rex" } });
}

async function selectCountryAndState() {
  const countryInput = screen.getByRole("combobox", { name: /^country$/i });
  fireEvent.focus(countryInput);
  fireEvent.change(countryInput, { target: { value: "India" } });
  const countryOption = await screen.findByRole("option", { name: "India" });
  fireEvent.mouseDown(countryOption);

  const stateInput = screen.getByRole("combobox", { name: /state\/province/i });
  fireEvent.focus(stateInput);
  fireEvent.change(stateInput, { target: { value: "Karnataka" } });
  const stateOption = await screen.findByRole("option", { name: "Karnataka" });
  fireEvent.mouseDown(stateOption);
}

describe("Register page", () => {
  it("navigates to the OTP verification screen after successful registration", async () => {
    mockFetchOnce(201, {
      id: "1",
      first_name: "Ada",
      last_name: "Lovelace",
      email: "new@example.com",
      mobile_number: "+15551234567",
      is_verified: false,
      created_at: "2026-01-01T00:00:00Z",
    });
    renderWithProviders(<Register />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        "/verify-otp",
        expect.objectContaining({
          state: { userId: "1", email: "new@example.com" },
        }),
      ),
    );
  });

  it("shows a duplicate-email error message", async () => {
    mockFetchOnce(409, { detail: "An account with this email already exists." });
    renderWithProviders(<Register />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i),
    );
  });

  it("shows a duplicate-mobile-number error message", async () => {
    mockFetchOnce(409, { detail: "An account with this mobile number already exists." });
    renderWithProviders(<Register />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/mobile number already exists/i),
    );
  });

  it("offers a link back to the login page", () => {
    renderWithProviders(<Register />);
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
  });

  it("shows a generic error message for a non-conflict failure (e.g. network/server error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    renderWithProviders(<Register />);

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/registration failed\. please try again\./i),
    );
  });

  it("blocks submission with an age-appropriate message when the date of birth is under the minimum age", async () => {
    renderWithProviders(<Register />);
    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/date of birth/i), {
      target: { value: new Date().toISOString().slice(0, 10) },
    });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/at least 13 years old/i),
    );
  });

  it("shows a live password strength indicator as the user types", () => {
    renderWithProviders(<Register />);
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "weak" } });
    expect(screen.getByTestId("password-strength-bar")).toHaveAttribute("data-strength", "weak");

    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Passw0rd123!" } });
    expect(screen.getByTestId("password-strength-bar")).toHaveAttribute("data-strength", "strong");
  });

  it("blocks submission with a weak-password message until the strength meter clears the minimum bar", async () => {
    renderWithProviders(<Register />);
    await fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/password is too weak/i),
    );
  });

  it("has no detectable accessibility violations on the expanded form", async () => {
    const { container } = renderWithProviders(<Register />);
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations in the dark theme (T038)", async () => {
    document.documentElement.dataset.theme = "dark";
    const { container } = renderWithProviders(<Register />);
    await expectNoA11yViolations(container);
    delete document.documentElement.dataset.theme;
  });

  it("renders the shared screen-shell/screen-card container classes with token-driven styling (US1)", () => {
    renderWithProviders(<Register />);
    const form = screen.getByRole("form", { name: /registration form/i });
    const card = form.closest(".screen-card");
    expect(card).toHaveClass("screen-card");
    expect(card?.parentElement).toHaveClass("screen-shell");
  });

  it("shows a distinct loading/disabled state on the submit button while a request is in flight (US2)", async () => {
    mockFetchOnce(409, { detail: "An account with this email already exists." });
    renderWithProviders(<Register />);
    await fillRequiredFields();
    const submitButton = screen.getByRole("button", { name: /register/i });
    fireEvent.click(submitButton);

    expect(submitButton).toHaveClass("is-loading");
    await waitFor(() => expect(submitButton).not.toHaveClass("is-loading"));
  });

  it("shows a distinct error-state class on invalid submission (US2)", async () => {
    mockFetchOnce(409, { detail: "An account with this email already exists." });
    renderWithProviders(<Register />);
    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveClass("state-message--error"));
  });

  it("redirects an already-authenticated visitor to the home page instead of showing the form", () => {
    function AuthedApp() {
      const { setSession } = useAuthStore();
      return (
        <>
          <button type="button" onClick={() => setSession("tok", { id: "1", email: "a@example.com" })}>
            simulate-login
          </button>
          <Register />
        </>
      );
    }

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/register"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AuthedApp />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText("simulate-login"));
    expect(screen.queryByRole("heading", { name: /create your account/i })).not.toBeInTheDocument();
  });
});
