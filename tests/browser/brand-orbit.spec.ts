import { test, expect } from "@playwright/test";

test("Orbit rests between cycles and stops when motion is reduced", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  test.setTimeout(45000);
  await page.goto("/");
  const logo = page.locator("header .brand-orbit").first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("data-orbit-state", "rest");
  await expect(logo).toHaveAttribute("data-orbit-state", "playing", {
    timeout: 10000,
  });
  await expect(logo.locator("[data-orb]")).toHaveCount(19);
  await expect(logo.locator(".brand-orbit-static")).toBeHidden();
  await expect(logo).toHaveAttribute("data-orbit-state", "rest", {
    timeout: 6000,
  });
  await expect(logo.locator(".brand-orbit-static")).toBeVisible();
  await page.waitForTimeout(10000);
  await expect(logo).toHaveAttribute("data-orbit-state", "rest");
  await expect(logo).toHaveAttribute("data-orbit-state", "playing", {
    timeout: 4000,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(logo).toHaveAttribute("data-orbit-state", "rest");
  await page.waitForTimeout(5000);
  await expect(logo).toHaveAttribute("data-orbit-state", "rest");
});

test("offscreen logo stops and reduced-motion users keep the original artwork", async ({
  page,
}) => {
  await page.goto("/");
  const logo = page.locator("header .brand-orbit").first();
  await expect(logo.locator(".brand-orbit-static")).toBeVisible();
  await expect(logo.locator(".brand-orbit-motion")).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(logo).toHaveAttribute("data-orbit-state", "playing", {
    timeout: 10000,
  });
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(logo).toHaveAttribute("data-orbit-state", "rest");
});

test("full logo fits narrow homepage and app headers", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ["/", "/app"]) {
    await page.goto(route);
    await expect(page.locator("header .brand-orbit").first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  }
});
