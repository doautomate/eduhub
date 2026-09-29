import { describe, expect, it } from "vitest";
import { screen, render } from "@testing-library/react";
import { Notes } from "../../../src/pages/Notes";

describe("Notes page", () => {
  it("renders the placeholder heading and coming-soon text", () => {
    render(<Notes />);
    expect(screen.getByRole("heading", { name: /chapter notes/i })).toBeInTheDocument();
    expect(screen.getByText(/coming soon\./i)).toBeInTheDocument();
  });
});
