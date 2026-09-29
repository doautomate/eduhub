import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "../../../../../src/shared/components/ui/popover";

describe("Popover", () => {
  it("reveals its content when the trigger is activated", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>,
    );

    expect(screen.queryByText("Body")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Open"));

    expect(await screen.findByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Body")).toHaveAttribute("data-slot", "popover-content");
  });

  it("applies a custom className and non-default align/sideOffset to the content", async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="custom-popover" align="start" sideOffset={12}>
          Body
        </PopoverContent>
      </Popover>,
    );

    const content = await screen.findByText("Body");
    expect(content).toHaveClass("custom-popover");
  });

  it("renders PopoverAnchor with the popover-anchor data-slot", () => {
    render(
      <Popover>
        <PopoverAnchor data-testid="anchor">anchor</PopoverAnchor>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>,
    );

    expect(screen.getByTestId("anchor")).toHaveAttribute("data-slot", "popover-anchor");
  });
});
