import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../../../../../src/shared/components/ui/empty-state";

describe("EmptyState", () => {
  it("renders the title without an icon, description, or action when omitted", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders the icon, description, and action when provided", () => {
    render(
      <EmptyState
        title="No results"
        description="Try a different search."
        icon={<span data-testid="icon">icon</span>}
        action={<button type="button">Retry</button>}
      />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Try a different search.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
