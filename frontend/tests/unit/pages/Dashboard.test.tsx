import { describe, expect, it } from "vitest";
import { screen, render } from "@testing-library/react";
import { Dashboard } from "../../../src/pages/Dashboard";

describe("Dashboard page", () => {
  it("renders the placeholder heading and coming-soon text", () => {
    render(<Dashboard />);
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/coming soon\./i)).toBeInTheDocument();
  });
});
