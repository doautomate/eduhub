import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../../../../../src/shared/components/ui/button";

describe("Button", () => {
  it("renders a native <button> by default", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("data-slot", "button");
  });

  it("renders its child element directly when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/somewhere">Go</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("data-slot", "button");
  });
});
