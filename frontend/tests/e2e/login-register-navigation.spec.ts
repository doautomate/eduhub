import { test, expect } from "@playwright/test";

/**
 * FR-008 (User Story 3): a visitor can move between /login and /register using the
 * in-page navigation links, without needing to know either URL directly.
 *
 * Requires the full stack running (docker compose -f docker-compose.dev.yml up)
 * per quickstart.md; not executed in this sandbox (no live backend/browser).
 */
test("visitor can navigate from login to register and back", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /register/i }).click();
  await expect(page).toHaveURL("/register");

  await page.getByRole("link", { name: /log in/i }).click();
  await expect(page).toHaveURL("/login");
});
