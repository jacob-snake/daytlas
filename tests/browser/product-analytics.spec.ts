import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { ANALYTICS_CONSENT_KEY } from "../../src/lib/product-analytics";

type Captured = {
  body: Record<string, unknown>;
  headers: Record<string, string>;
};
async function intercept(context: BrowserContext) {
  const captured: Captured[] = [];
  await context.route("https://eu.i.posthog.com/**", async (route) => {
    if (route.request().method() === "POST")
      captured.push({
        body: route.request().postDataJSON(),
        headers: await route.request().allHeaders(),
      });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "POST, OPTIONS",
      },
      body: JSON.stringify({ status: 1 }),
    });
  });
  return captured;
}
async function requireEnabled(page: Page) {
  const banner = page.getByRole("complementary", {
    name: "Optional analytics",
  });
  const disabled = page.getByText(
    "Analytics is not enabled on this installation.",
  );
  // This suite is also safe against the default-disabled release build.
  await page.goto("/privacy");
  await expect(banner.or(disabled)).toBeVisible();
  test.skip(
    await disabled.isVisible(),
    "Enabled path requires a synthetic-key QA build; default release keeps analytics off.",
  );
  await page.goto("/");
  return page.getByRole("complementary", { name: "Optional analytics" });
}

test("privacy exposes analytics controls without contacting a processor", async ({
  page,
  context,
}) => {
  const captured = await intercept(context);
  await page.goto("/privacy#analytics-settings");
  await expect(
    page.getByRole("heading", { name: "Optional website and demo analytics" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Turn analytics off" }).click();
  await expect(
    page.getByText("Analytics is off. No further events will be sent."),
  ).toBeVisible();
  expect(captured).toEqual([]);
});

test("opt-in sends only authored UI data; decline and withdrawal stop capture across tabs", async ({
  page,
  context,
}) => {
  const captured = await intercept(context);
  const banner = await requireEnabled(page);
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  expect(captured).toHaveLength(0);
  await banner
    .getByRole("button", { name: "Decline analytics", exact: true })
    .click();
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  expect(captured).toHaveLength(0);
  await page.goto("/privacy#analytics-settings");
  await page
    .getByRole("button", { name: "Allow analytics", exact: true })
    .click();
  await page.goto("/?private_example=do-not-send#private-fragment");
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await expect.poll(() => captured.length).toBe(1);
  expect(captured[0].body.properties).toEqual({
    action: "how_it_works_opened",
    schema_version: 1,
    environment: "production",
    context: "website",
    $process_person_profile: false,
    $geoip_disable: true,
  });
  expect(captured[0].headers.referer).toBeUndefined();
  expect(JSON.stringify(captured[0].body)).not.toContain("private_example");
  const other = await context.newPage();
  await other.goto("/privacy#analytics-settings");
  await other.getByRole("button", { name: "Turn analytics off" }).click();
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await page.goto("/about");
  expect(captured).toHaveLength(1);
  await other.close();
});

test("returning allowed consent never instruments an Oura-connected session", async ({
  page,
  context,
}) => {
  const captured = await intercept(context);
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          choice: "allowed",
          at: Date.now() - 1000,
          revision: "synthetic-consent",
        }),
      );
      localStorage.setItem("woura.mode", "live");
      localStorage.setItem("woura.token", "synthetic-do-not-send-token");
    },
    { key: ANALYTICS_CONSENT_KEY },
  );
  await page.goto("/");
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await page.getByRole("link", { name: "The story", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  expect(captured).toEqual([]);
  await expect(
    page.getByRole("complementary", { name: "Optional analytics" }),
  ).toHaveCount(0);
});

test("storage failure cannot grant analytics consent", async ({
  page,
  context,
}) => {
  const captured = await intercept(context);
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("synthetic blocked storage");
      },
    });
  });
  await page.goto("/");
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Optional analytics" }),
  ).toHaveCount(0);
  expect(captured).toEqual([]);
});
