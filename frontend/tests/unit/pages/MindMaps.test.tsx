import { describe, expect, it } from "vitest";
import { screen, render } from "@testing-library/react";
import { MindMaps } from "../../../src/pages/MindMaps";

describe("MindMaps page", () => {
  it("renders the placeholder heading and coming-soon text", () => {
    render(<MindMaps />);
    expect(screen.getByRole("heading", { name: /mind maps/i })).toBeInTheDocument();
    expect(screen.getByText(/coming soon\./i)).toBeInTheDocument();
  });
});
