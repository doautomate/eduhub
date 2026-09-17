import { test, expect } from "@playwright/test";

/**
 * T047 (US4): full register -> OTP verify -> sign in journey.
 *
 * Requires the full stack running (docker compose -f docker-compose.dev.yml up)
 * per quickstart.md, with a mailbox/log sink to read the issued OTP code from
 * (see quickstart.md for the dev-environment OTP capture mechanism); not
 * executed in this sandbox (no live backend/browser).
 */
test("register, verify the OTP code, and sign in", async ({ page }) => {
  const email = `otp-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel(/first name/i).fill("Ada");
  await page.getByLabel(/last name/i).fill("Lovelace");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/mobile number/i).fill(`+1555${Date.now().toString().slice(-7)}`);
  await page.getByLabel(/date of birth/i).fill("1992-06-15");
  await page.getByLabel(/^password$/i).fill("Passw0rd123!");
  await page.getByLabel(/security question/i).selectOption("FIRST_PET");
  await page.getByLabel(/security answer/i).fill("Rex");
  await page.getByRole("button", { name: /register/i }).click();
  await expect(page).toHaveURL(/\/verify-otp/);

  // In a live run, the code is read from the dev mailbox/log sink here.
  const otpCode = "000000";
  await page.getByLabel(/verification code/i).fill(otpCode);
  await page.getByRole("button", { name: /^verify$/i }).click();
  await expect(page.getByRole("status")).toContainText(/verified/i);

  await page.getByRole("button", { name: /go to login/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("Passw0rd123!");
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL("/");
});

test("requests a new code via resend after entering an incorrect one", async ({ page }) => {
  const email = `otp-resend-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel(/first name/i).fill("Ada");
  await page.getByLabel(/last name/i).fill("Lovelace");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/mobile number/i).fill(`+1555${Date.now().toString().slice(-7)}`);
  await page.getByLabel(/date of birth/i).fill("1992-06-15");
  await page.getByLabel(/^password$/i).fill("Passw0rd123!");
  await page.getByLabel(/security question/i).selectOption("FIRST_PET");
  await page.getByLabel(/security answer/i).fill("Rex");
  await page.getByRole("button", { name: /register/i }).click();
  await expect(page).toHaveURL(/\/verify-otp/);

  await page.getByLabel(/verification code/i).fill("999999");
  await page.getByRole("button", { name: /^verify$/i }).click();
  await expect(page.getByTestId("attempts-remaining")).toBeVisible();

  await page.getByTestId("resend-code-button").click();
  await expect(page.getByRole("status")).toContainText(/new verification code/i);
});
