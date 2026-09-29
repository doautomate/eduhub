import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "../../../../../src/shared/components/ui/textarea";

describe("Textarea", () => {
  it("renders a textarea element with data-slot=\"textarea\"", () => {
    render(<Textarea placeholder="Notes" />);
    const textarea = screen.getByPlaceholderText("Notes");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("data-slot", "textarea");
  });

  it("merges a custom className with the default styling classes", () => {
    render(<Textarea placeholder="Notes" className="custom-class" />);
    expect(screen.getByPlaceholderText("Notes")).toHaveClass("custom-class");
  });

  it("passes through other props such as disabled and value", () => {
    render(<Textarea placeholder="Notes" disabled value="hello" onChange={() => {}} />);
    const textarea = screen.getByPlaceholderText("Notes");
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveValue("hello");
  });
});
