import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PasswordStrengthMeter } from "../../../../src/pages/Register/PasswordStrengthMeter";
import { expectNoA11yViolations } from "../../support/a11y";

describe("PasswordStrengthMeter", () => {
  it("shows Weak for a short/low-diversity password", () => {
    render(createElement(PasswordStrengthMeter, { password: "weak" }));
    expect(screen.getByTestId("password-strength-bar")).toHaveAttribute("data-strength", "weak");
    expect(screen.getByRole("status")).toHaveTextContent(/weak/i);
  });

  it("shows Fair once length and two character classes are met", () => {
    render(createElement(PasswordStrengthMeter, { password: "abcdefgh1" }));
    expect(screen.getByTestId("password-strength-bar")).toHaveAttribute("data-strength", "fair");
    expect(screen.getByRole("status")).toHaveTextContent(/fair/i);
  });

  it("shows Strong for a long password with three or more character classes", () => {
    render(createElement(PasswordStrengthMeter, { password: "Abcdefgh123!" }));
    expect(screen.getByTestId("password-strength-bar")).toHaveAttribute("data-strength", "strong");
    expect(screen.getByRole("status")).toHaveTextContent(/strong/i);
  });

  it("announces strength changes via an ARIA live region", () => {
    const { rerender } = render(createElement(PasswordStrengthMeter, { password: "weak" }));
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");

    rerender(createElement(PasswordStrengthMeter, { password: "Abcdefgh123!" }));
    expect(screen.getByRole("status")).toHaveTextContent(/strong/i);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(createElement(PasswordStrengthMeter, { password: "Abcdefgh123!" }));
    await expectNoA11yViolations(container);
  });

  it("applies a distinct visual class per strength level (weak/fair/strong) (US2)", () => {
    const { rerender } = render(createElement(PasswordStrengthMeter, { password: "abc" }));
    expect(screen.getByTestId("password-strength-bar")).toHaveClass("password-strength-bar--weak");

    rerender(createElement(PasswordStrengthMeter, { password: "abcdefgh1" }));
    expect(screen.getByTestId("password-strength-bar")).toHaveClass("password-strength-bar--fair");

    rerender(createElement(PasswordStrengthMeter, { password: "Abcdefgh123!" }));
    expect(screen.getByTestId("password-strength-bar")).toHaveClass("password-strength-bar--strong");
  });
});
