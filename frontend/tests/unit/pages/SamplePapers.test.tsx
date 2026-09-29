import { describe, expect, it } from "vitest";
import { screen, render } from "@testing-library/react";
import { SamplePapers } from "../../../src/pages/SamplePapers";

describe("SamplePapers page", () => {
  it("renders the placeholder heading and coming-soon text", () => {
    render(<SamplePapers />);
    expect(screen.getByRole("heading", { name: /sample papers/i })).toBeInTheDocument();
    expect(screen.getByText(/coming soon\./i)).toBeInTheDocument();
  });
});
