import { expect, test } from "@playwright/test";
import { getDemoCollection } from "../../src/lib/demo-data";

test("a late history response respects the most recently selected Trends range", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("daytlas.token", "synthetic-range-test");
    localStorage.setItem("daytlas.mode", "live");
    localStorage.setItem("daytlas.cacheScope", "range-test");
    localStorage.setItem("daytlas.firstDay.v3.live:range-test", "2025-01-01");
  });
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = false;
  await page.route("**/api/oura/**", async (route) => {
    const url = new URL(route.request().url()),
      endpoint = url.pathname.split("/").at(-1)!;
    if (endpoint === "daily_sleep") {
      started = true;
      await held;
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 29);
    const first = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    const data = getDemoCollection<Record<string, unknown>>(endpoint, {
      start_date: url.searchParams.get("start_date")!,
      end_date: url.searchParams.get("end_date")!,
    }).map((row) =>
      endpoint === "daily_sleep"
        ? { ...row, score: String(row.day) >= first ? 41 : 93 }
        : row,
    );
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data, next_token: null }),
    });
  });
  try {
    await page.goto("/app/trends");
    await expect.poll(() => started).toBe(true);
    await page.getByRole("radio", { name: "90 days", exact: true }).click();
    await page.getByRole("radio", { name: "30 days", exact: true }).click();
    await expect(page.locator("#trend-sleep")).toHaveCount(0);
    release();
    await expect(
      page.locator("#trend-sleep").getByText("41", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "30 days", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      page.locator("#trend-sleep").getByText("93", { exact: true }),
    ).toHaveCount(0);
  } finally {
    release();
  }
});

test("failed IndexedDB erasure closes the dashboard and offers a visible retry", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Explore the demo|See demo/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("daytlas.token", "synthetic-wipe-test"),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Disconnect & clear local data" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Disconnect & clear local data" })
    .click();
  await page.evaluate(() => {
    // Keep a stable global fake. A method patched on WebKit's native
    // IDBFactory wrapper can disappear between browser actions.
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
        open() {
          sessionStorage.setItem("test.indexedDBFailure", "invoked");
          const request = {
            error: new DOMException("Synthetic storage denial", "UnknownError"),
            onerror: null as null | (() => void),
          };
          setTimeout(() => request.onerror?.(), 0);
          return request;
        },
      },
    });
  });
  await page
    .getByRole("button", { name: "Disconnect & clear", exact: true })
    .click();
  await expect(page).toHaveURL(/\?clear=failed$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("test.indexedDBFailure")),
  ).toBe("invoked");
  await expect(
    page.getByText("Local data could not be fully cleared", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("daytlas.token")),
  ).toBeNull();
  await page
    .getByRole("button", { name: "Retry clearing local data", exact: true })
    .click();
  await expect(page).not.toHaveURL(/clear=failed/);
  await expect(
    page.getByText("Local data could not be fully cleared", { exact: true }),
  ).toHaveCount(0);
});

test("disconnecting another tab removes the open dashboard", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Explore the demo|See demo/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  const second = await context.newPage();
  await second.goto("/app/trends");
  await expect(
    second.getByRole("heading", { name: "Follow your patterns." }),
  ).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("daytlas.mode"));
  await expect(second.getByRole("heading", { level: 1 })).toContainText(
    "bigger picture",
  );
  await expect(second.locator("#trend-sleep")).toHaveCount(0);
});
