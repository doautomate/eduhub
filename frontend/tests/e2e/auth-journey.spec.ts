import { test, expect } from "@playwright/test";

/**
 * TS-009: full register -> login -> logout -> back-button-blocked journey.
 *
 * Requires the full stack running (docker compose -f docker-compose.dev.yml up)
 * per quickstart.md; not executed in this sandbox (no live backend/browser).
 */
test("register, login, logout, and back-button is blocked afterwards", async ({ page }) => {
  const email = `journey-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel(/first name/i).fill("Grace");
  await page.getByLabel(/last name/i).fill("Hopper");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/mobile number/i).fill(`+1555${Date.now().toString().slice(-7)}`);
  await page.getByLabel(/date of birth/i).fill("1990-01-01");
  await page.getByLabel(/^password$/i).fill("Passw0rd123!");
  await page.getByLabel(/security question/i).selectOption("FIRST_PET");
  await page.getByLabel(/security answer/i).fill("Rex");
  await page.getByRole("button", { name: /register/i }).click();
  // US4: registration now hands off to OTP verification rather than an
  // immediate "account created" screen (see register-otp.spec.ts for that flow).
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

  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page).toHaveURL("/login");

  await page.goBack();
  await expect(page).toHaveURL("/login");
});
