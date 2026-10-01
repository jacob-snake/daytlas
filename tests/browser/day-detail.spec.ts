import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { getDemoCollection } from "../../src/lib/demo-data";

test("daily view preserves Overview and exposes night series, baselines and partial-day context", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
  await page.goto("/app/day");
  await expect(
    page.getByRole("heading", { name: "A closer look at your day." }),
  ).toBeVisible();
  await expect(page.getByText("Sleep stages", { exact: true })).toBeVisible();
  await expect(page.getByText("Overnight HRV", { exact: true })).toBeVisible();
  await expect(
    page
      .locator("#day-sleep")
      .getByText("vs previous 30 days", { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.locator("#day-sleep").getByRole("button", { name: /avg$/ }),
  ).toHaveCount(0);
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
    localStorage.setItem("daytlas.mode", "live");
    localStorage.setItem("daytlas.token", "synthetic-day-test");
    localStorage.setItem("daytlas.cacheScope", "day-test");
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

test("expired daily connection offers reconnection rather than retrying unavailable credentials", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("daytlas.mode", "live");
    localStorage.setItem("daytlas.token", "synthetic-expired-day");
  });
  await page.route("**/api/oura/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Expired session" }),
    }),
  );
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Reconnect required" }),
    }),
  );
  await page.goto("/app/day");
  await expect(
    page.getByRole("link", { name: "Review connection" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your connection needs refreshing", { exact: true }),
  ).toBeVisible();
});

test("inclusive activity range retrieves today's totals and explicit refresh bypasses cached values", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("daytlas.mode", "live");
    localStorage.setItem("daytlas.token", "synthetic-range-test");
    localStorage.setItem("daytlas.cacheScope", "inclusive-range-test");
  });
  let steps = 4321;
  let requests = 0;
  await page.route("**/api/oura/**", (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split("/").at(-1)!;
    const end = url.searchParams.get("end_date") ?? "";
    let data =
      endpoint === "heartrate"
        ? []
        : getDemoCollection<{ day: string; steps?: number }>(endpoint, {
            start_date: url.searchParams.get("start_date") ?? undefined,
            end_date: end || undefined,
          });
    if (endpoint === "daily_activity") {
      requests++;
      data = data
        .filter((row) => row.day < end)
        .map((row) => ({ ...row, steps }));
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data, next_token: null }),
    });
  });
  await page.goto("/app/day");
  const activity = page.getByRole("region", { name: "Daytime activity" });
  await expect(activity.getByText(/4.?321/).first()).toBeVisible();
  steps = 5678;
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(activity.getByText(/5.?678/).first()).toBeVisible();
  expect(requests).toBe(2);
});

test("day sections, category colors and shared night cursor work with keyboard and pointer", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
  await page.goto("/app/day");
  await expect(
    page.getByRole("navigation", { name: "Day sections" }),
  ).toBeVisible();
  await expect(
    page.locator("#day-readiness").getByText("Readiness contributors"),
  ).toBeVisible();
  await expect(
    page.locator("#day-sleep").getByText("Readiness contributors"),
  ).toHaveCount(0);
  const chart = page.locator('[tabindex="0"][aria-label^="Overnight HRV,"]');
  await chart.focus();
  await chart.press("ArrowRight");
  const readouts = page.locator('#day-sleep [data-testid="time-readout"]');
  await expect(readouts.first()).toHaveClass(/sr-only/);
  await expect(readouts.first()).not.toBeEmpty();
  await expect(readouts.last()).not.toBeEmpty();
  await expect(chart.getByRole("tooltip")).toBeVisible();
  expect((await readouts.first().innerText()).split(" · ")[0]).toBe(
    (await readouts.last().innerText()).split(" · ")[0],
  );
  await expect(page.locator("#day-sleep .chart-average-label")).toHaveCount(2);
  await expect(
    page.locator("#day-sleep .chart-grid-major").first(),
  ).toHaveAttribute("stroke-opacity", "0.13");
  const stage = page.getByRole("slider", { name: "Sleep stage timeline" });
  await stage.press("Home");
  await stage.press("ArrowRight");
  await expect(page.getByTestId("stage-readout")).toContainText(
    /Deep|Light|REM|Awake|No sample/,
  );
  const plot = chart.locator(".recharts-surface");
  const box = await plot.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.5);
  await expect(readouts.first()).not.toBeEmpty();
  expect((await readouts.first().innerText()).split(" · ")[0]).toBe(
    (await readouts.last().innerText()).split(" · ")[0],
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("link", { name: "Your profile", exact: true }),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Today selects the actual current day when newest available records are older", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("daytlas.mode", "live");
    localStorage.setItem("daytlas.token", "synthetic-missing-today");
  });
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  await page.route("**/api/oura/**", (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split("/").at(-1)!;
    const rows =
      endpoint === "heartrate"
        ? []
        : getDemoCollection<{ day: string }>(endpoint, {
            start_date: url.searchParams.get("start_date") ?? undefined,
            end_date: url.searchParams.get("end_date") ?? undefined,
          }).filter((row) => row.day < today);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: rows, next_token: null }),
    });
  });
  await page.goto("/app/day");
  await expect(
    page.getByText("Recorded day · missing data stays blank"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator("#detail-day")).toHaveValue(today);
  await expect(
    page.getByText("No sleep period is available for this date."),
  ).toBeVisible();
});

test("day detail maintains accessible controls at mobile and desktop widths", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
  await page.goto("/app/day");
  await expect(page.getByText("Sleep stages", { exact: true })).toBeVisible();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
});

test("selected orb strip chooses real dates and Night Contour exposes thick phases and clock tooltip", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
  await page.goto("/app/day");
  const strip = page.getByRole("group", { name: "Choose a day" });
  await expect(strip.getByRole("button")).toHaveCount(11);
  const original = await page.locator("#detail-day").inputValue();
  await strip.getByRole("button").nth(8).click();
  await expect(page.locator("#detail-day")).not.toHaveValue(original);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator("#detail-day")).toHaveValue(original);
  const phases = page.locator(".sleep-phase-segment");
  await expect(phases.first()).toHaveAttribute("height", "28");
  await expect(page.locator(".stage-clock-grid")).toHaveCount(7);
  const timeline = page.getByRole("slider", { name: "Sleep stage timeline" });
  await timeline.press("Home");
  await expect(page.getByTestId("stage-readout")).toContainText("min");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(strip.locator("button:visible")).toHaveCount(7);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
