import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RecoverAccount } from "../../../src/pages/RecoverAccount";
import { authService } from "../../../src/shared/services/authService";
import { ApiError } from "../../../src/shared/types/auth";
import { expectNoA11yViolations } from "../support/a11y";

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RecoverAccount />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RecoverAccount page", () => {
  it("reveals the security question after starting recovery for a known email", async () => {
    vi.spyOn(authService, "startRecovery").mockResolvedValue({
      user_id: "user-1",
      question_text: "What was the name of your first pet?",
    });
    renderPage();

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(screen.getByText(/what was the name of your first pet/i)).toBeInTheDocument(),
    );
  });

  it("shows a wrong-answer message without disclosing account details", async () => {
    vi.spyOn(authService, "startRecovery").mockResolvedValue({
      user_id: "user-1",
      question_text: "What was the name of your first pet?",
    });
    vi.spyOn(authService, "answerRecovery").mockRejectedValue(
      new ApiError(401, "Incorrect answer."),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByLabelText(/^answer$/i);

    fireEvent.change(screen.getByLabelText(/^answer$/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/incorrect answer/i));
  });

  it("shows a lockout message after repeated failures", async () => {
    vi.spyOn(authService, "startRecovery").mockResolvedValue({
      user_id: "user-1",
      question_text: "What was the name of your first pet?",
    });
    vi.spyOn(authService, "answerRecovery").mockRejectedValue(new ApiError(423, "Locked."));
    renderPage();

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByLabelText(/^answer$/i);

    fireEvent.change(screen.getByLabelText(/^answer$/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/temporarily locked/i),
    );
  });

  it("shows the reset-password form after a correct answer, and completes the reset", async () => {
    vi.spyOn(authService, "startRecovery").mockResolvedValue({
      user_id: "user-1",
      question_text: "What was the name of your first pet?",
    });
    vi.spyOn(authService, "answerRecovery").mockResolvedValue({ reset_token: "reset-tok" });
    vi.spyOn(authService, "resetPassword").mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByLabelText(/^answer$/i);

    fireEvent.change(screen.getByLabelText(/^answer$/i), { target: { value: "Rex" } });
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await screen.findByLabelText(/new password/i);
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "NewPassw0rd1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/password reset/i));
  });

  it("has no detectable accessibility violations on the start step", async () => {
    const { container } = renderPage();
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations in the dark theme (T038)", async () => {
    document.documentElement.dataset.theme = "dark";
    const { container } = renderPage();
    await expectNoA11yViolations(container);
    delete document.documentElement.dataset.theme;
  });

  it("renders the shared screen-shell/screen-card container classes with token-driven styling (US1)", () => {
    renderPage();
    const card = screen.getByRole("heading", { name: /recover your account/i }).closest(".screen-card");
    expect(card).toHaveClass("screen-card");
    expect(card?.parentElement).toHaveClass("screen-shell");
  });

  it("shows a distinct loading/disabled state on the submit button while a request is in flight (US2)", async () => {
    vi.spyOn(authService, "startRecovery").mockResolvedValue({
      user_id: "user-1",
      question_text: "What was the name of your first pet?",
    });
    renderPage();

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "a@example.com" } });
    const submitButton = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(submitButton);

    expect(submitButton).toHaveClass("is-loading");
    await waitFor(() =>
      expect(screen.getByText(/what was the name of your first pet/i)).toBeInTheDocument(),
    );
  });

  it("shows a distinct success-state class once the password reset completes (US2/FR-005)", async () => {
    vi.spyOn(authService, "startRecovery").mockResolvedValue({
      user_id: "user-1",
      question_text: "What was the name of your first pet?",
    });
    vi.spyOn(authService, "answerRecovery").mockResolvedValue({ reset_token: "reset-tok" });
    vi.spyOn(authService, "resetPassword").mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByLabelText(/^answer$/i);

    fireEvent.change(screen.getByLabelText(/^answer$/i), { target: { value: "Rex" } });
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await screen.findByLabelText(/new password/i);
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "NewPassw0rd1!" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveClass("state-message--success"));
  });
});
