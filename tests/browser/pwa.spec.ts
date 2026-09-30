import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { brand } from "../../src/lib/brand-config";

test("installation metadata launches the app with valid home-screen icons", async ({
  page,
  request,
}) => {
  await page.goto("/install");
  const manifestLink = page.locator('link[rel="manifest"]');
  const manifestPath = await manifestLink.getAttribute("href");
  expect(manifestPath).toBeTruthy();
  const response = await request.get(manifestPath!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain(
    "application/manifest+json",
  );
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: "/app",
    name: brand.name,
    short_name: brand.name,
    start_url: "/app",
    scope: "/",
    display: "standalone",
  });
  expect(
    manifest.icons.map((icon: { purpose: string }) => icon.purpose),
  ).toContain("maskable");
  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok()).toBe(true);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
    const png = await iconResponse.body();
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    expect(`${width}x${height}`).toBe(icon.sizes);
  }
  await expect(
    page.locator('meta[name="mobile-web-app-capable"]'),
  ).toHaveAttribute("content", "yes");
  await expect(
    page.locator('meta[name="apple-mobile-web-app-title"]'),
  ).toHaveAttribute("content", brand.name);
  const applePath = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href");
  const appleResponse = await request.get(applePath!);
  const appleIcon = await appleResponse.body();
  expect(appleResponse.ok()).toBe(true);
  expect(appleIcon.readUInt32BE(16)).toBe(180);
  expect(appleIcon.readUInt32BE(20)).toBe(180);

  // A fresh install can enter the demo without inheriting another browser's storage.
  await page.goto(manifest.start_url);
  await page
    .getByRole("button", { name: /explore the demo/i })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  // Installation must not silently add a second cache for health data or tokens.
  expect(
    await page.evaluate(async () =>
      navigator.serviceWorker.getRegistrations().then((items) => items.length),
    ),
  ).toBe(0);
  expect(await page.evaluate(async () => caches.keys())).toEqual([]);
});

for (const width of [320, 390]) {
  test(`home-screen guidance works at ${width}px with honest connection limits`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/install");
    await expect(
      page.getByRole("heading", { name: "On iPhone or iPad" }),
    ).toBeVisible();
    await expect(
      page.getByText(/does not enable offline access/),
    ).toBeVisible();
    await expect(
      page.getByText(/do not transfer to the home-screen app/),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter(
        (item) => item.impact === "critical" || item.impact === "serious",
      ),
    ).toEqual([]);
    await page
      .getByRole("link", { name: `Open ${brand.name}`, exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/app$/);
  });
}
