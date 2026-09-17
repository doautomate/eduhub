import { describe, expect, it } from "vitest";
import { screen, render } from "@testing-library/react";
import App from "../../../src/app/App";
import { ThemeProvider } from "../../../src/shared/theme/ThemeProvider";

describe("App", () => {
  it("renders the universal landing page at / for unauthenticated visitors", () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );
    // FR-008: "/" is reachable by both authenticated and unauthenticated visitors -
    // unauthenticated visitors see the general landing content, not a forced redirect.
    expect(
      screen.getByRole("heading", { name: /master your exams with crisp visuals/i }),
    ).toBeInTheDocument();
  });
});
