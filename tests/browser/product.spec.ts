import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function demo(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: /Explore the demo|See demo/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  await expect(
    page.getByText("Preparing your history.", { exact: false }),
  ).toHaveCount(0);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("unavailable connection offers the app demo without developer setup", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("nonce-");
  expect(response?.headers()["content-security-policy"]).not.toContain(
    "unsafe-eval",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your days, in a bigger picture.",
  );
  await page
    .getByRole("link", { name: "Connect with Oura", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Oura connection is not available yet.",
    }),
  ).toBeVisible();
  await expect(page.locator('a[href="/setup"], pre, code')).toHaveCount(0);
  await page.getByRole("link", { name: "Back to home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/setup");
  await expect(page).toHaveURL(/\/connect$/);
  await page.getByRole("button", { name: /Explore the demo|See demo/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
});

test("demo covers all main views without sending a health API request", async ({
  page,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/oura") || r.url().includes("api.ouraring"))
      requests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await demo(page);
  for (const [label, heading] of [
    ["Day detail", "A closer look at your day."],
    ["Trends", "Follow your patterns."],
    ["Your year", "Every day adds up."],
    ["Tag Lab", "Get curious about your habits."],
  ]) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(
      page.getByText("All data is fictional.", { exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: /Evening walk/ }).click();
  await expect(page.getByText(/following-tag days/).first()).toBeVisible();
  await page.getByRole("button", { name: "Exit demo", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "bigger picture",
  );
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("export downloads real synthetic rows in both supported formats", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/app/profile");
  for (const format of ["csv", "json"]) {
    await page.getByRole("button", { name: "Export", exact: true }).click();
    if (format === "json") {
      await page.getByRole("combobox", { name: "Format", exact: true }).click();
      await page.getByRole("option", { name: "JSON", exact: true }).click();
    }
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const text = Buffer.concat(chunks).toString();
    if (format === "json") expect(JSON.parse(text).length).toBeGreaterThan(20);
    else {
      expect(text).toContain("sleep_score");
      expect(text.split("\n").length).toBeGreaterThan(20);
    }
  }
});

test("trends respond to period changes and command-palette chart additions", async ({
  page,
}) => {
  await demo(page);
  await page.getByRole("link", { name: "Trends", exact: true }).click();
  const period = page.getByRole("combobox", {
    name: "Average readings by period",
  });
  await period.click();
  await page.getByRole("option", { name: "Monthly", exact: true }).click();
  await expect(period).toHaveText("Monthly");
  await expect(page.locator("#trend-sleep")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await page
    .getByPlaceholder("Search pages, metrics, actions…")
    .fill("Deep Sleep Time");
  await page.getByRole("option", { name: /Deep Sleep Time/ }).click();
  await expect(
    page.getByText("Deep Sleep Time", { exact: true }).first(),
  ).toBeVisible();
  await noOverflow(page);
});

test("synthetic authentication failure has a recovery action", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("daytlas.token", "synthetic-test-token");
    localStorage.setItem("daytlas.mode", "live");
  });
  await page.route("**/api/oura/**", (r) =>
    r.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Expired session" }),
    }),
  );
  await page.route("**/api/auth/refresh", (r) =>
    r.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Reconnect required" }),
    }),
  );
  await page.goto("/app");
  await expect(
    page.getByRole("link", { name: "Review connection" }).first(),
  ).toBeVisible();
});

test("disconnect clears only Daytlas credentials and returns to the landing page", async ({
  page,
}) => {
  await demo(page);
  await page.evaluate(() => {
    localStorage.setItem("daytlas.token", "synthetic-token");
    localStorage.setItem("unrelated-setting", "preserved");
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Disconnect & clear local data" })
    .click();
  await page
    .getByRole("button", { name: "Disconnect & clear", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "bigger picture",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("daytlas.token")),
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("unrelated-setting")),
  ).toBe("preserved");
});

for (const width of [320, 390, 768, 1440]) {
  test(`core views fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await noOverflow(page);
    await demo(page);
    await noOverflow(page);
    for (const path of [
      "/app/day",
      "/app/trends",
      "/app/year",
      "/app/tags",
      "/privacy",
      "/terms",
      "/connect",
      "/setup",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await noOverflow(page);
    }
  });
}

for (const path of [
  "/",
  "/app",
  "/app/day",
  "/app/trends",
  "/app/year",
  "/app/tags",
  "/privacy",
  "/connect",
]) {
  test(`${path} has no serious or critical automated accessibility violations`, async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
    await expect(
      page.getByText("Preparing your history.", { exact: false }),
    ).toHaveCount(0);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations
        .filter((v) => ["serious", "critical"].includes(v.impact ?? ""))
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      `${path}: ${JSON.stringify(results.violations)}`,
    ).toEqual([]);
  });
}
