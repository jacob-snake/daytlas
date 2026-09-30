import { test, expect } from "@playwright/test";
import { getDemoCollection } from "../../src/lib/demo-data";

test("daily view preserves Overview and exposes night series, baselines and partial-day context", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("woura.mode", "demo"));
  await page.goto("/app/day");
  await expect(
    page.getByRole("heading", { name: "A closer look at your day." }),
  ).toBeVisible();
  await expect(page.getByText("Sleep stages", { exact: true })).toBeVisible();
  await expect(page.getByText("Overnight HRV", { exact: true })).toBeVisible();
  await expect(
    page
      .getByText("30/30 days recorded · selected day excluded", {
        exact: false,
      })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByText("Today so far is compared", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Heart rate throughout the day", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Previous day", exact: true }).click();
  await expect(
    page.getByText("Recorded day · missing data stays blank"),
  ).toBeVisible();
  await expect(
    page.getByText("Today so far is compared", { exact: false }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByText("Cardiovascular age", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The longer view", exact: true }),
  ).toBeVisible();
});

test("live day detail requests heart-rate chunks and retains night data when optional heart-rate access fails", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("woura.mode", "live");
    localStorage.setItem("woura.token", "synthetic-day-test");
    localStorage.setItem("woura.cacheScope", "day-test");
  });
  const heartRequests: URL[] = [];
  await page.route("**/api/oura/**", (route) => {
    const url = new URL(route.request().url()),
      endpoint = url.pathname.split("/").at(-1)!;
    if (endpoint === "heartrate") {
      heartRequests.push(url);
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "Heart rate permission unavailable" }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: getDemoCollection(endpoint, {
          start_date: url.searchParams.get("start_date") ?? undefined,
          end_date: url.searchParams.get("end_date") ?? undefined,
        }),
        next_token: null,
      }),
    });
  });
  await page.goto("/app/day");
  await expect(
    page.getByRole("link", { name: "Review connection" }),
  ).toBeVisible();
  await expect(page.getByText("Sleep stages", { exact: true })).toBeVisible();
  expect(heartRequests).toHaveLength(5);
  for (const url of heartRequests) {
    const start = Date.parse(url.searchParams.get("start_datetime")!),
      end = Date.parse(url.searchParams.get("end_datetime")!);
    expect(end - start).toBeGreaterThan(0);
    expect(end - start).toBeLessThan(8 * 86400000);
  }
});
