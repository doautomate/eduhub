import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "../../../../../src/shared/components/ui/alert";

describe("Alert", () => {
  it("renders with the default variant and role=alert", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Something happened.</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Heads up")).toHaveAttribute("data-slot", "alert-title");
    expect(screen.getByText("Something happened.")).toHaveAttribute(
      "data-slot",
      "alert-description",
    );
  });

  it("renders with the destructive variant", () => {
    render(<Alert variant="destructive">Danger</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Danger");
  });

  it("renders an AlertAction with the alert-action data-slot", () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
        <AlertAction data-testid="action">Retry</AlertAction>
      </Alert>,
    );
    expect(screen.getByTestId("action")).toHaveAttribute("data-slot", "alert-action");
  });
});
