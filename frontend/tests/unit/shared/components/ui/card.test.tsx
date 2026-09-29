import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "../../../../../src/shared/components/ui/card";

describe("Card", () => {
  it("renders all sub-components with their data-slots", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction data-testid="action">Action</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Title")).toHaveAttribute("data-slot", "card-title");
    expect(screen.getByText("Description")).toHaveAttribute("data-slot", "card-description");
    expect(screen.getByTestId("action")).toHaveAttribute("data-slot", "card-action");
    expect(screen.getByText("Body")).toHaveAttribute("data-slot", "card-content");
    expect(screen.getByText("Footer")).toHaveAttribute("data-slot", "card-footer");
    expect(screen.getByText("Title").closest('[data-slot="card-header"]')).toBeInTheDocument();
  });

  it("defaults to the 'default' size and supports the 'sm' size variant", () => {
    const { rerender } = render(<Card data-testid="card">content</Card>);
    expect(screen.getByTestId("card")).toHaveAttribute("data-size", "default");

    rerender(
      <Card data-testid="card" size="sm">
        content
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveAttribute("data-size", "sm");
  });
});
