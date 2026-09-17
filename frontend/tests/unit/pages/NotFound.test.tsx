import { describe, expect, it } from "vitest";
import { screen, render } from "@testing-library/react";
import { NotFound } from "../../../src/pages/NotFound";

describe("NotFound page", () => {
  it("renders a 404 message", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: /404 - page not found/i })).toBeInTheDocument();
  });
});
