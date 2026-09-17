import { test, expect } from "@playwright/test";

/**
 * T024/T041 (US2/US3, 013-profile-popover-management): the /profile page
 * presents three shadcn/ui Tabs - Personal Details (mobile number, editable),
 * Academic Profile, and Address Details (including house number/apartment) -
 * each independently saveable, and an unsaved edit in one tab survives
 * switching to another tab and back.
 *
 * Requires the full stack running (docker compose -f docker-compose.dev.yml
 * up) per quickstart.md, with a pre-seeded, verified test account; not
 * executed in this sandbox (no live backend/browser).
 */

test("edits the mobile number in Personal Details and the address in Address Details, each persisting independently", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("verified-user@example.com");
  await page.getByLabel(/password/i).fill("Passw0rd123!");
  await page.getByRole("button", { name: /log in/i }).click();

  await page.goto("/profile");
  await expect(page.getByRole("tab", { name: /personal details/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const newMobileNumber = `+1555${Date.now().toString().slice(-7)}`;
  await page.getByLabel(/mobile number/i).fill(newMobileNumber);
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("status")).toContainText(/updated successfully/i);

  await page.reload();
  await expect(page.getByLabel(/mobile number/i)).toHaveValue(newMobileNumber);

  await page.getByRole("tab", { name: /address details/i }).click();
  await page.getByLabel(/house number/i).fill("221B");
  await page.getByLabel(/apartment.*building/i).fill("Baker Street Mansions");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("status")).toContainText(/updated successfully/i);

  await page.reload();
  await page.getByRole("tab", { name: /address details/i }).click();
  await expect(page.getByLabel(/house number/i)).toHaveValue("221B");
  await expect(page.getByLabel(/apartment.*building/i)).toHaveValue("Baker Street Mansions");
});

// T039/T040/T041 (US3): an unsaved, in-progress edit in one tab is not lost
// when the user switches to another tab and back, and saving one tab's
// section does not save or discard another tab's unsaved draft.
test("an unsaved edit in one tab survives switching to another tab and back, and saves are isolated per tab", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("verified-user@example.com");
  await page.getByLabel(/password/i).fill("Passw0rd123!");
  await page.getByRole("button", { name: /log in/i }).click();

  await page.goto("/profile");

  const draftMobileNumber = `+1555${Date.now().toString().slice(-7)}`;
  await page.getByLabel(/mobile number/i).fill(draftMobileNumber);

  // Switch away without saving, then back - the draft must still be there.
  await page.getByRole("tab", { name: /academic profile/i }).click();
  await page.getByRole("tab", { name: /personal details/i }).click();
  await expect(page.getByLabel(/mobile number/i)).toHaveValue(draftMobileNumber);

  // Now switch to Address Details, make an unsaved edit there too, and save
  // only the Address Details tab - the Personal Details draft must remain
  // unsaved (and still present) since each tab saves independently.
  await page.getByRole("tab", { name: /address details/i }).click();
  await page.getByLabel(/pin\/postal code/i).fill("94105");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("status")).toContainText(/updated successfully/i);

  await page.getByRole("tab", { name: /personal details/i }).click();
  await expect(page.getByLabel(/mobile number/i)).toHaveValue(draftMobileNumber);
  // The Personal Details draft was never saved - a reload discards it.
  await page.reload();
  await expect(page.getByLabel(/mobile number/i)).not.toHaveValue(draftMobileNumber);
});
