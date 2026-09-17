import { test, expect } from "@playwright/test";

/**
 * US1: fixed app-shell chrome (header/left-panel/footer) with only the body
 * region scrolling (007-fixed-app-shell-layout, FR-001..FR-006). Requires the
 * full stack running (docker compose -f docker-compose.dev.yml up) per
 * quickstart.md; not executed in this sandbox (no live browser).
 */
test("keeps header, left panel, and footer stationary while the body scrolls vertically (desktop)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");

  const header = page.locator("header");
  const leftPanel = page.locator("nav");
  const footer = page.locator("footer");

  const headerBoxBefore = await header.boundingBox();
  const leftPanelBoxBefore = await leftPanel.boundingBox();
  const footerBoxBefore = await footer.boundingBox();

  await page.getByTestId("app-shell-body").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  await expect.poll(() => header.boundingBox()).toEqual(headerBoxBefore);
  await expect.poll(() => leftPanel.boundingBox()).toEqual(leftPanelBoxBefore);
  await expect.poll(() => footer.boundingBox()).toEqual(footerBoxBefore);
});

test("keeps header, left panel, and footer stationary while the body scrolls horizontally (desktop)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");

  const header = page.locator("header");
  const footer = page.locator("footer");

  const headerBoxBefore = await header.boundingBox();
  const footerBoxBefore = await footer.boundingBox();

  await page.getByTestId("app-shell-body").evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });

  await expect.poll(() => header.boundingBox()).toEqual(headerBoxBefore);
  await expect.poll(() => footer.boundingBox()).toEqual(footerBoxBefore);
});

test("keeps header and footer stationary on a narrow viewport while the merged content region scrolls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  const header = page.locator("header");
  const footer = page.locator("footer");

  const headerBoxBefore = await header.boundingBox();
  const footerBoxBefore = await footer.boundingBox();

  await page.getByTestId("app-shell-content").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  await expect.poll(() => header.boundingBox()).toEqual(headerBoxBefore);
  await expect.poll(() => footer.boundingBox()).toEqual(footerBoxBefore);
});

test("shows no scrollbar on the body when its content fits within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const overflowsVertically = await page.getByTestId("app-shell-body").evaluate(
    (el) => el.scrollHeight > el.clientHeight,
  );
  expect(overflowsVertically).toBe(false);
});
