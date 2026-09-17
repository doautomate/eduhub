import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { SearchableSelect } from "../../../../src/shared/components/SearchableSelect/SearchableSelect";

const OPTIONS = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
];

function ControlledSelect() {
  const [value, setValue] = useState("");
  return (
    <SearchableSelect
      id="country"
      label="Country"
      options={OPTIONS}
      value={value}
      onChange={setValue}
    />
  );
}

describe("SearchableSelect", () => {
  it("shows all options when focused with an empty query", () => {
    render(<ControlledSelect />);
    fireEvent.focus(screen.getByRole("combobox", { name: /country/i }));
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("filters options as the user types", () => {
    render(<ControlledSelect />);
    const input = screen.getByRole("combobox", { name: /country/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "uni" } });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("United States");
    expect(options[1]).toHaveTextContent("United Kingdom");
  });

  it("selects an option on click and calls onChange", () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        id="country"
        label="Country"
        options={OPTIONS}
        value=""
        onChange={onChange}
      />,
    );
    const input = screen.getByRole("combobox", { name: /country/i });
    fireEvent.focus(input);
    fireEvent.mouseDown(screen.getByRole("option", { name: "India" }));
    expect(onChange).toHaveBeenCalledWith("IN");
  });

  it("shows 'No matches' when the query matches nothing", () => {
    render(<ControlledSelect />);
    const input = screen.getByRole("combobox", { name: /country/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "zzzz" } });
    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });

  it("selects the sole remaining filtered option on Enter", () => {
    render(<ControlledSelect />);
    const input = screen.getByRole("combobox", { name: /country/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "india" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByDisplayValue("India")).toBeInTheDocument();
  });

  it("is disabled and shows no options when disabled prop is set", () => {
    render(
      <SearchableSelect
        id="state"
        label="State"
        options={OPTIONS}
        value=""
        onChange={vi.fn()}
        disabled
      />,
    );
    const input = screen.getByRole("combobox", { name: /state/i });
    expect(input).toBeDisabled();
    fireEvent.focus(input);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});
