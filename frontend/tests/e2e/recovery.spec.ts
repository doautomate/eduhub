import { test, expect } from "@playwright/test";

/**
 * T063 (US5): full account-recovery journey (start -> answer security question
 * -> reset password -> sign in with the new password).
 *
 * Requires the full stack running (docker compose -f docker-compose.dev.yml up)
 * per quickstart.md, with a pre-registered and OTP-verified test account whose
 * security question/answer are known to the test; not executed in this sandbox
 * (no live backend/browser).
 */
test("recovers account access via the security question and resets the password", async ({
  page,
}) => {
  // Assumes a verified fixture account already exists: recovery-fixture@example.com /
  // security question FIRST_PET / answer "Rex".
  const email = "recovery-fixture@example.com";

  await page.goto("/login");
  await page.getByRole("link", { name: /forgot password/i }).click();
  await expect(page).toHaveURL(/\/recover-account/);

  await page.getByLabel(/^email$/i).fill(email);
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByText(/first pet/i)).toBeVisible();

  await page.getByLabel(/^answer$/i).fill("Rex");
  await page.getByRole("button", { name: /submit answer/i }).click();

  const newPassword = "NewPassw0rd123!";
  await page.getByLabel(/new password/i).fill(newPassword);
  await page.getByRole("button", { name: /reset password/i }).click();
  await expect(page.getByRole("status")).toContainText(/password reset/i);

  await page.getByRole("button", { name: /go to login/i }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(newPassword);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL("/");
});

test("shows a lockout message after repeated wrong answers", async ({ page }) => {
  const email = "recovery-lockout-fixture@example.com";

  await page.goto("/recover-account");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByRole("button", { name: /continue/i }).click();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByLabel(/^answer$/i).fill("wrong-answer");
    await page.getByRole("button", { name: /submit answer/i }).click();
  }

  await expect(page.getByRole("alert")).toContainText(/locked/i);
});
