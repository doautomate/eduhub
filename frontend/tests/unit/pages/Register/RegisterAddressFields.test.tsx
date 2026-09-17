import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../../test-utils";
import { Register } from "../../../../src/pages/Register";

beforeEach(() => {
  // Country/state options come from locationService's local curated fallback in
  // these tests - no real network call should ever be attempted.
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network disabled in tests")));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Register page - address fields (User Story 4)", () => {
  it("renders searchable country and state/province selects plus a pin code input", async () => {
    renderWithProviders(<Register />);
    expect(screen.getByRole("combobox", { name: /^country$/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /state\/province/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/pin\/postal code/i)).toBeInTheDocument();
  });

  it("filters country options as the user types", async () => {
    renderWithProviders(<Register />);
    const countryInput = screen.getByRole("combobox", { name: /^country$/i });
    fireEvent.focus(countryInput);
    await screen.findByRole("option", { name: "India" });
    fireEvent.change(countryInput, { target: { value: "united king" } });
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "United Kingdom" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "India" })).not.toBeInTheDocument();
    });
  });

  it("disables the state/province select until a country is chosen", () => {
    renderWithProviders(<Register />);
    expect(screen.getByRole("combobox", { name: /state\/province/i })).toBeDisabled();
  });

  it("resets the selected state/province when the country changes", async () => {
    renderWithProviders(<Register />);
    const countryInput = screen.getByRole("combobox", { name: /^country$/i });
    fireEvent.focus(countryInput);
    fireEvent.change(countryInput, { target: { value: "India" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "India" }));

    const stateInput = screen.getByRole("combobox", { name: /state\/province/i });
    fireEvent.focus(stateInput);
    fireEvent.change(stateInput, { target: { value: "Karnataka" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "Karnataka" }));
    expect(screen.getByDisplayValue("Karnataka")).toBeInTheDocument();

    // Changing the country must clear the now-mismatched state/province (FR-012).
    fireEvent.change(countryInput, { target: { value: "United States" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "United States" }));
    expect(screen.queryByDisplayValue("Karnataka")).not.toBeInTheDocument();
  });

  it("shows a validation message when submitting without country/state/pin", async () => {
    renderWithProviders(<Register />);
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: "+15551234567" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Passw0rd" } });

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /country, state\/province, and pin\/postal code are required/i,
      ),
    );
  });
});
