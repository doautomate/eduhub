import { test, expect } from "@playwright/test";

/**
 * TS-006 / FR-002: a user with a valid, active session who navigates directly to
 * /login is redirected to the home page without the login form being shown.
 * Also covers FR-009: an already-authenticated user navigating to /register is
 * redirected to the home page without the registration form being shown.
 *
 * Requires the full stack running (docker compose -f docker-compose.dev.yml up)
 * per quickstart.md; not executed in this sandbox (no live backend/browser).
 */
test("already-logged-in user visiting /login or /register redirects to home", async ({ page }) => {
  const email = `user-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel(/first name/i).fill("Ada");
  await page.getByLabel(/last name/i).fill("Lovelace");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/mobile number/i).fill(`+1555${Date.now().toString().slice(-7)}`);
  await page.getByLabel(/date of birth/i).fill("1990-01-01");
  await page.getByLabel(/^password$/i).fill("Passw0rd123!");
  await page.getByLabel(/security question/i).selectOption("FIRST_PET");
  await page.getByLabel(/security answer/i).fill("Rex");
  await page.getByRole("button", { name: /register/i }).click();
  await expect(page).toHaveURL(/\/verify-otp/);

  // In a live run, the OTP code is read from the dev mailbox/log sink here.
  await page.getByLabel(/verification code/i).fill("000000");
  await page.getByRole("button", { name: /^verify$/i }).click();
  await expect(page.getByRole("status")).toContainText(/verified/i);

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("Passw0rd123!");
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/login");
  await expect(page).toHaveURL("/");

  await page.goto("/register");
  await expect(page).toHaveURL("/");
});
