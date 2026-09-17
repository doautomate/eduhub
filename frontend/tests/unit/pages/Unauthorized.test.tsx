import { describe, expect, it } from "vitest";
import { screen, render } from "@testing-library/react";
import { Unauthorized } from "../../../src/pages/Unauthorized";

describe("Unauthorized page", () => {
  it("renders a prompt to log in", () => {
    render(<Unauthorized />);
    expect(screen.getByRole("heading", { name: /please log in to continue/i })).toBeInTheDocument();
  });
});
