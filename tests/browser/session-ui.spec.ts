import { expect, test } from "@playwright/test";
import { getDemoCollection } from "../../src/lib/demo-data";

test("a late response cannot replace the newly selected Trends range", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("woura.token", "synthetic-range-test");
    localStorage.setItem("woura.mode", "live");
    localStorage.setItem("woura.cacheScope", "range-test");
    localStorage.setItem("woura.firstDay.v3.live:range-test", "2025-01-01");
  });
  let releaseOld!: () => void;
  const heldResponse = new Promise<void>((resolve) => {
    releaseOld = resolve;
  });
  let announceOld!: () => void;
  const oldStarted = new Promise<void>((resolve) => {
    announceOld = resolve;
  });
  let heldCount = 0;
  await page.route("**/api/oura/**", async (route) => {
    const url = new URL(route.request().url());
    const start = url.searchParams.get("start_date")!;
    const end = url.searchParams.get("end_date")!;
    const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;
    const old = days > 80 && days < 100;
    if (old) {
      heldCount++;
      announceOld();
      await heldResponse;
    }
    const endpoint = url.pathname.split("/").at(-1)!;
    const data =
      endpoint === "enhanced_tag"
        ? [
            {
              id: "synthetic-range-tag",
              custom_name: old
                ? "Previous range marker"
                : days < 40
                  ? "Current range marker"
                  : "Initial range marker",
              start_day: end,
              end_day: null,
            },
          ]
        : getDemoCollection(endpoint, { start_date: start, end_date: end });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data, next_token: null }),
    });
    if (old) heldCount--;
  });
  try {
    await page.goto("/app/trends");
    await expect(page.getByText("Initial range marker × 1")).toBeVisible();
    await page.getByRole("button", { name: "90 D", exact: true }).click();
    await oldStarted;
    // Old data is hidden immediately, while range controls stay usable.
    await expect(page.locator("#sleep")).toHaveCount(0);
    await expect(page.getByText("Initial range marker × 1")).toHaveCount(0);
    await page.getByRole("button", { name: "30 D", exact: true }).click();
    await expect(page.getByText("Current range marker × 1")).toBeVisible();
    await expect(page.locator("#sleep")).toBeVisible();
    releaseOld();
    await expect.poll(() => heldCount).toBe(0);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await expect(page.getByText("Current range marker × 1")).toBeVisible();
    await expect(page.getByText("Previous range marker × 1")).toHaveCount(0);
  } finally {
    releaseOld();
  }
});

test("failed IndexedDB erasure closes the dashboard and offers a visible retry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Explore the demo|See demo/ }).first().click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("woura.token", "synthetic-wipe-test"),
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
    await page.evaluate(() => localStorage.getItem("woura.token")),
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
  await page.getByRole("button", { name: /Explore the demo|See demo/ }).first().click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  const second = await context.newPage();
  await second.goto("/app/trends");
  await expect(
    second.getByRole("heading", { name: "Follow your patterns." }),
  ).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("woura.mode"));
  await expect(second.getByRole("heading", { level: 1 })).toContainText(
    "bigger picture",
  );
  await expect(second.locator("#sleep")).toHaveCount(0);
});
