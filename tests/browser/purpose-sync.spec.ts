import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 886, 1440]) {
  test(`purpose and real product photos fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#a-wider-view");
    await expect(
      page.getByRole("heading", {
        name: "A different view. A shared purpose.",
      }),
    ).toBeVisible();
    const devices = page.locator("#wearables");
    await devices.scrollIntoViewIfNeeded();
    await expect(devices.getByText("Coming soon", { exact: true })).toHaveCount(
      3,
    );
    for (const image of await devices.locator("img").all()) {
      await expect(image).toBeVisible();
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const report = await new AxeBuilder({ page })
      .include("#a-wider-view")
      .include("#wearables")
      .analyze();
    expect(
      report.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
  });
}

test("sync is truthful for cache, refresh, partial failure and recovery", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("daytlas.mode", "live");
    localStorage.setItem("daytlas.token", "synthetic-test-only");
    localStorage.setItem("daytlas.cacheScope", "synthetic-sync-test");
  });
  let requests = 0;
  let fail = false;
  await page.route("**/api/oura/**", async (route) => {
    requests++;
    const requestFails =
      fail && route.request().url().includes("daily_readiness");
    await route.fulfill({
      status: requestFails ? 500 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        requestFails ? { error: "Synthetic failure" } : { data: [] },
      ),
    });
  });
  await page.goto("/app/day");
  await page.waitForLoadState("networkidle");
  // Heart-rate history starts after the day query; wait for both cache writes
  // before taking the timestamp that a cached reload must preserve.
  await expect(
    page.getByText("Heart rate throughout the day", { exact: true }),
  ).toBeVisible();
  const status = page.getByTestId("oura-sync-status");
  await expect(status).toContainText(/Ring data synced/);
  const stamp = await page.evaluate(() =>
    localStorage.getItem("daytlas.sync:live:synthetic-sync-test"),
  );
  const initialRequests = requests;
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByText("Heart rate throughout the day", { exact: true }),
  ).toBeVisible();
  await expect(status).toContainText(/Ring data synced/);
  await expect(
    page.getByRole("heading", { name: "Readiness & Heart" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("daytlas.sync:live:synthetic-sync-test"),
    ),
  ).toBe(stamp);
  expect(requests).toBe(initialRequests);
  fail = true;
  await status.getByRole("button", { name: "Refresh data from Oura" }).click();
  await expect(status).toContainText("Update incomplete");
  expect(requests).toBeGreaterThan(initialRequests);
  fail = false;
  await status.getByRole("button", { name: "Refresh data from Oura" }).click();
  await expect(status).toContainText(/Ring data synced/);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect(status).toBeVisible();
  // WebKit can acknowledge the viewport before responsive charts finish resizing.
  // Keep the real overflow check, but wait for the resulting layout to settle.
  await expect
    .poll(() =>
      page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ viewport: 320, document: 320 });
});

test("demo never claims a ring was synced", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
  await page.goto("/app/day");
  await expect(page.getByTestId("oura-sync-status")).toHaveText("Demo data");
  await expect(
    page.getByRole("button", { name: "Refresh data from Oura" }),
  ).toHaveCount(0);
});
