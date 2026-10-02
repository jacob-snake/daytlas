import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("compact wearables and persistent navigation work at tablet width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 831, height: 1034 });
  await page.goto("/");
  const devices = page.locator("#wearables article");
  await devices.first().scrollIntoViewIfNeeded();
  const boxes = await devices.evaluateAll((items) =>
    items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  expect(boxes).toHaveLength(4);
  expect(
    Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)),
  ).toBeLessThan(2);
  for (const box of boxes)
    expect(Math.abs(box.width - box.height)).toBeLessThan(2);
  const header = page.locator(".landing-header");
  await expect(header).toHaveAttribute("data-scrolled", "true");
  expect((await header.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  await header.getByRole("link", { name: "How it works" }).click();
  await expect(
    page.getByRole("heading", { name: /Built for the curious/ }),
  ).toBeInViewport();
  await page
    .getByText("Where is my health data stored?", { exact: true })
    .click();
  await expect(page.getByText(/Your readings pass through/)).toBeVisible();
  const report = await new AxeBuilder({ page }).analyze();
  expect(
    report.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
});

test("sync sits outside navigation and cardiovascular explanation stays in app", async ({
  page,
}) => {
  await page.setViewportSize({ width: 831, height: 1034 });
  await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
  await page.goto("/app");
  const status = page.getByTestId("oura-sync-status");
  await expect(status).toBeVisible();
  expect(await status.evaluate((el) => el.closest("header") === null)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  const card = page.locator('[aria-label="Cardiovascular age"]');
  await expect(card).not.toContainText("Latest available");
  await expect(card).not.toContainText("latest day excluded");
  await card.getByRole("button", { name: "About cardiovascular age" }).click();
  await expect(page.getByText("What does this estimate mean?")).toBeVisible();
  await expect(
    page.getByText(/Oura estimates the age of your cardiovascular system/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("What does this estimate mean?"),
  ).not.toBeVisible();
  await expect(card.getByRole("link")).toHaveCount(0);
});
