import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { VerifyOtp } from "../../../src/pages/VerifyOtp";
import { authService } from "../../../src/shared/services/authService";
import { ApiError } from "../../../src/shared/types/auth";
import { expectNoA11yViolations } from "../support/a11y";

function renderAt(userId: string | undefined, email = "a@example.com") {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: "/verify-otp", state: userId ? { userId, email } : null }]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/verify-otp" element={<VerifyOtp />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("VerifyOtp page", () => {
  it("verifies the correct code and shows a success message", async () => {
    vi.spyOn(authService, "verifyOtp").mockResolvedValue(undefined);
    renderAt("user-1");

    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/verified/i));
  });

  it("shows the remaining attempts on a wrong code", async () => {
    vi.spyOn(authService, "verifyOtp").mockRejectedValue(
      new ApiError(400, "Incorrect or expired verification code.", { attempts_remaining: 2 }),
    );
    renderAt("user-1");

    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    await waitFor(() => expect(screen.getByTestId("attempts-remaining")).toHaveTextContent("2"));
  });

  it("shows a cooldown message when resend is rate-limited", async () => {
    vi.spyOn(authService, "resendOtp").mockRejectedValue(
      new ApiError(429, "Please wait before requesting another code.", { retryAfterSeconds: 45 }),
    );
    renderAt("user-1");

    fireEvent.click(screen.getByTestId("resend-code-button"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/wait before requesting/i),
    );
    expect(screen.getByTestId("resend-code-button")).toBeDisabled();
  });

  it("supports entering the code via keyboard only", async () => {
    vi.spyOn(authService, "verifyOtp").mockResolvedValue(undefined);
    renderAt("user-1");

    const input = screen.getByLabelText(/verification code/i);
    input.focus();
    fireEvent.change(input, { target: { value: "654321" } });
    fireEvent.keyDown(screen.getByRole("button", { name: /^verify$/i }), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/verified/i));
  });

  it("shows a fallback message when no account id is available on this device", () => {
    renderAt(undefined);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't find your registration/i);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderAt("user-1");
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations in the dark theme (T038)", async () => {
    document.documentElement.dataset.theme = "dark";
    const { container } = renderAt("user-1");
    await expectNoA11yViolations(container);
    delete document.documentElement.dataset.theme;
  });

  it("renders the shared screen-shell/screen-card container classes with token-driven styling (US1)", () => {
    renderAt("user-1");
    const form = screen.getByRole("form", { name: /verify email form/i });
    const card = form.closest(".screen-card");
    expect(card).toHaveClass("screen-card");
    expect(card?.parentElement).toHaveClass("screen-shell");
  });

  it("shows a distinct loading/disabled state on the submit button while a request is in flight (US2)", async () => {
    vi.spyOn(authService, "verifyOtp").mockResolvedValue(undefined);
    renderAt("user-1");

    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: "123456" } });
    const submitButton = screen.getByRole("button", { name: /^verify$/i });
    fireEvent.click(submitButton);

    expect(submitButton).toHaveClass("is-loading");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/verified/i));
  });

  it("shows a distinct success-state class once verified (US2/FR-005)", async () => {
    vi.spyOn(authService, "verifyOtp").mockResolvedValue(undefined);
    renderAt("user-1");

    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveClass("state-message--success"));
  });
});
