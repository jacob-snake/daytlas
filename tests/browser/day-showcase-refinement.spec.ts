import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [320, 390, 1195])
  test(`day calendar and floating controls keep working at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() =>
      localStorage.setItem("daytlas.mode", "demo"),
    );
    await page.goto("/app/day");
    await page.getByRole("button", { name: /Choose a date:/ }).click();
    const calendar = page.getByRole("dialog");
    await expect(calendar.getByRole("grid")).toBeVisible();
    await page.keyboard.press("Escape");
    const scores = page.getByRole("region", { name: "Selected day scores" });
    await expect(scores).not.toContainText("/30 recorded");
    await expect(
      scores.getByText("vs previous 30 days", { exact: true }),
    ).toHaveCount(3);
    await page
      .getByRole("heading", { name: "Daytime activity", exact: true })
      .scrollIntoViewIfNeeded();
    const floating = page.getByRole("group", { name: "Floating day controls" });
    await expect(floating).toBeVisible();
    const original = await page.locator("#detail-day").inputValue();
    await floating
      .getByRole("button", { name: "Previous day", exact: true })
      .click();
    await expect(page.locator("#detail-day")).not.toHaveValue(original);
    await floating.getByRole("button", { name: /Choose a date:/ }).click();
    await expect(calendar.getByRole("grid")).toBeVisible();
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
test("five product views and film preview remain usable with reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Explore Daytlas views" });
  await expect(tabs.getByRole("tab")).toHaveCount(5);
  for (const name of [
    "Day detail",
    "Overview",
    "Trends",
    "Your year",
    "Tag Lab",
  ]) {
    await tabs.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await expect(page.getByRole("tabpanel")).toContainText(
    "Get curious about your habits.",
  );
  const film = page.getByRole("region", { name: "Daytlas product film" });
  await film.scrollIntoViewIfNeeded();
  await expect(film.locator("video")).toHaveCount(0);
  await expect(
    film.getByRole("button", { name: "Play product film" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const report = await new AxeBuilder({ page }).analyze();
  expect(
    report.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
});

// Native media codecs differ by OS; Playwright recommends macOS WebKit for Safari video.
// https://playwright.dev/docs/browsers#webkit
// The real H.264 film is verified in Chromium CI and in both engines on macOS.
test("native product film opens with sound and closes with Escape", async ({
  page,
  browserName,
}) => {
  test.skip(
    process.platform === "linux" && browserName === "webkit",
    "Linux WebKit media decoder stalls; native Safari playback is covered on macOS.",
  );
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Play product film" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Daytlas · A little tour" });
  const video = dialog.locator("video");
  await expect(video).toHaveAttribute("controls", "");
  await expect
    .poll(() =>
      video.evaluate(
        (v: HTMLVideoElement) => !v.paused && !v.muted && v.currentTime > 0,
      ),
    )
    .toBe(true);
  const media = await video.elementHandle();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(await media!.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
