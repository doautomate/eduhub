import { test, expect } from "@playwright/test";

/**
 * US4: theme toggle behavior. Requires the full stack running
 * (docker compose -f docker-compose.dev.yml up) per quickstart.md; not executed
 * in this sandbox (no live backend/browser).
 */
test("resolves to the OS-preference default when no theme is saved yet", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("falls back to light when no saved preference and no OS preference is available", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "no-preference" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("switches instantly with no page reload when the toggle is activated", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("switch", { name: /switch to dark theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("persists the toggled choice across a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("switch", { name: /switch to dark theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("scopes the stored preference to the device/browser context (a fresh context does not inherit it)", async ({
  browser,
}) => {
  const contextA = await browser.newContext({ colorScheme: "light" });
  const pageA = await contextA.newPage();
  await pageA.goto("/");
  await pageA.getByRole("switch", { name: /switch to dark theme/i }).click();
  await expect(pageA.locator("html")).toHaveAttribute("data-theme", "dark");
  await contextA.close();

  const contextB = await browser.newContext({ colorScheme: "light" });
  const pageB = await contextB.newPage();
  await pageB.goto("/");
  await expect(pageB.locator("html")).toHaveAttribute("data-theme", "light");
  await contextB.close();
});
