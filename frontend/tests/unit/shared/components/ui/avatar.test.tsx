import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Avatar,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "../../../../../src/shared/components/ui/avatar";

describe("Avatar", () => {
  it("renders the fallback content with the default size", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AB")).toBeInTheDocument();
    expect(screen.getByText("AB").parentElement).toHaveAttribute("data-size", "default");
  });

  it("applies the sm/lg size variants via data-size", () => {
    const { rerender } = render(
      <Avatar size="sm">
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("SM").parentElement).toHaveAttribute("data-size", "sm");

    rerender(
      <Avatar size="lg">
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("LG").parentElement).toHaveAttribute("data-size", "lg");
  });

  it("renders an AvatarBadge with the avatar-badge data-slot", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
        <AvatarBadge data-testid="badge" />
      </Avatar>,
    );
    expect(screen.getByTestId("badge")).toHaveAttribute("data-slot", "avatar-badge");
  });

  it("renders AvatarGroup and AvatarGroupCount with their data-slots", () => {
    render(
      <AvatarGroup data-testid="group">
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <AvatarGroupCount data-testid="count">+3</AvatarGroupCount>
      </AvatarGroup>,
    );
    expect(screen.getByTestId("group")).toHaveAttribute("data-slot", "avatar-group");
    expect(screen.getByTestId("count")).toHaveAttribute("data-slot", "avatar-group-count");
    expect(screen.getByTestId("count")).toHaveTextContent("+3");
  });
});
