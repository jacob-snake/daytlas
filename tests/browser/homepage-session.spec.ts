import { expect, test, type Page } from "@playwright/test";
import { brand } from "../../src/lib/brand-config";
import { getDemoCollection } from "../../src/lib/demo-data";

const syntheticSession = {
  "daytlas.token": "synthetic-homepage-access-token",
  "daytlas.refresh": "synthetic-homepage-refresh-token",
  "daytlas.expiresAt": "4070908800000",
  "daytlas.mode": "live",
  "daytlas.cacheScope": "synthetic-homepage-scope",
};

async function seedConnectedSession(page: Page) {
  await page.addInitScript((entries) => {
    // Seed once: a document navigation must not silently repair a lost session.
    if (sessionStorage.getItem("test.homepageSessionSeeded")) return;
    for (const [key, value] of Object.entries(entries))
      localStorage.setItem(key, value);
    localStorage.setItem(
      "daytlas.firstDay.v3.live:synthetic-homepage-scope",
      "2025-01-01",
    );
    sessionStorage.setItem("test.homepageSessionSeeded", "true");
  }, syntheticSession);
}

async function expectSessionPreserved(page: Page) {
  expect(
    await page.evaluate(
      (keys) =>
        Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])),
      Object.keys(syntheticSession),
    ),
  ).toEqual(syntheticSession);
}

async function expectHomepage(page: Page) {
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your days, in a bigger picture.",
  );
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toHaveCount(0);
}

async function mockConnectedData(page: Page) {
  const requests: { path: string; authorization: string | undefined }[] = [];
  const externalRequests: string[] = [];
  await page.route(/https?:\/\/(?:[^/]+\.)?ouraring\.com\//, (route) => {
    externalRequests.push(route.request().url());
    return route.abort();
  });
  await page.route("**/api/oura/**", (route) => {
    const url = new URL(route.request().url());
    requests.push({
      path: url.pathname,
      authorization: route.request().headers().authorization,
    });
    const endpoint = url.pathname.split("/").at(-1)!;
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
  return { requests, externalRequests };
}

test("connected homepage stays public, requests no Oura data, and reopens the same session", async ({
  page,
}) => {
  await seedConnectedSession(page);
  const { requests, externalRequests } = await mockConnectedData(page);
  await page.goto("/");
  await expectHomepage(page);
  await expect(
    page
      .getByRole("link", { name: "Open your dashboard", exact: true })
      .first(),
  ).toBeVisible();
  await expectSessionPreserved(page);
  expect(requests).toEqual([]);

  await page.reload();
  await expectHomepage(page);
  const openApp = page
    .getByRole("link", { name: "Open your dashboard", exact: true })
    .first();
  await expect(openApp).toBeVisible();
  expect(requests).toEqual([]);

  // Both explicit Website navigation and the brand return home without logout.
  for (const homeLink of [`${brand.name} — Back to website`]) {
    await openApp.click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(
      page.getByRole("heading", { name: "Your daily perspective." }),
    ).toBeVisible();
    await expect(
      page.getByText("Preparing your history.", { exact: false }),
    ).toHaveCount(0);
    await expectSessionPreserved(page);
    expect(requests.length).toBeGreaterThan(0);
    expect(
      requests.every(
        (r) => r.authorization === `Bearer ${syntheticSession["daytlas.token"]}`,
      ),
    ).toBe(true);
    const completedRequests = requests.length;
    await page.getByRole("link", { name: homeLink, exact: true }).click();
    await expectHomepage(page);
    await expect(openApp).toBeVisible();
    await expectSessionPreserved(page);
    expect(requests).toHaveLength(completedRequests);
  }
  expect(externalRequests).toEqual([]);
});

for (const width of [320, 390]) {
  test(`connected homepage and app navigation fit at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await seedConnectedSession(page);
    const { requests, externalRequests } = await mockConnectedData(page);
    await page.goto("/");
    await expectHomepage(page);
    const openApp = page
      .getByRole("link", { name: "Open your dashboard", exact: true })
      .first();
    await expect(openApp).toBeVisible();
    expect(requests).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.screenshot({
      path: testInfo.outputPath("connected-homepage.png"),
    });
    await openApp.click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(
      page.getByRole("heading", { name: "Your daily perspective." }),
    ).toBeVisible();
    await expect(
      page.getByText("Preparing your history.", { exact: false }),
    ).toHaveCount(0);
    const header = page.locator(".app-header");
    await expect(
      header.getByRole("link", {
        name: `${brand.name} — Back to website`,
        exact: true,
      }),
    ).toBeInViewport();
    await header.getByRole("button", { name: "Open navigation" }).click();
    const navigation = page.getByRole("dialog", { name: "Navigation" });
    for (const label of [
      "Day detail",
      "Overview",
      "Trends",
      "Your year",
      "Tag Lab",
    ])
      await expect(
        navigation.getByRole("link", { name: label, exact: true }),
      ).toBeInViewport();
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await header.screenshot({
      path: testInfo.outputPath("connected-app-header.png"),
    });
    await page.screenshot({ path: testInfo.outputPath("connected-app.png") });
    await expectSessionPreserved(page);
    expect(externalRequests).toEqual([]);
  });
}

test("demo enters /app and can visit the website then resume without a connection", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route(
    /\/api\/oura\/|https?:\/\/(?:[^/]+\.)?ouraring\.com\//,
    (route) => {
      requests.push(route.request().url());
      return route.abort();
    },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: /Explore the demo|See demo/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByText("All data is fictional.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: `${brand.name} — Back to website`, exact: true })
    .click();
  await expectHomepage(page);
  await page.reload();
  await expectHomepage(page);
  expect(await page.evaluate(() => localStorage.getItem("daytlas.mode"))).toBe(
    "demo",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("daytlas.token")),
  ).toBeNull();
  await page
    .getByRole("link", { name: "Open app", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  expect(requests).toEqual([]);
});

for (const [legacy, destination, heading] of [
  ["/trends", "/app/trends", "Follow your patterns."],
  ["/year", "/app/year", "Every day adds up."],
  ["/tags", "/app/tags", "Get curious about your habits."],
]) {
  test(`legacy ${legacy} redirects to ${destination}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
    await page.goto(legacy);
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(
      page.getByText("All data is fictional.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]'),
    ).toHaveAttribute("href", destination);
  });
}

test("command palette distinguishes the website from the app overview", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
  await page.goto("/app/trends");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("option", { name: "Overview", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await page
    .getByRole("option", { name: `${brand.name} website`, exact: true })
    .click();
  await expectHomepage(page);
  await expect(
    page.getByRole("link", { name: "Open app", exact: true }).first(),
  ).toBeVisible();
});
