import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, isMobile: true });

for (const width of [320, 390]) {
  test(`date picker keeps two-digit days readable and usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
    await page.route("**/api/oura/**", (route) => route.abort());
    await page.goto("/app/trends");
    await expect(
      page.getByText("All data is fictional.", { exact: true }),
    ).toBeVisible();
    const trigger = page.getByRole("button", { name: "Calendar", exact: true });
    await trigger.tap();
    const popup = page.locator('[data-slot="popover-content"]');
    await expect(popup).toBeVisible();
    const days = popup.locator("button[data-day]");
    await expect(days.first()).toBeVisible();
    await popup.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    const geometry = await popup.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        right: bounds.right,
        width: innerWidth,
        overflowing: element.scrollWidth > element.clientWidth + 1,
        days: [
          ...element.querySelectorAll<HTMLButtonElement>("button[data-day]"),
        ].map((button) => {
          const range = document.createRange();
          range.selectNodeContents(button);
          const text = range.getBoundingClientRect();
          const target = button.getBoundingClientRect();
          return {
            text: button.textContent?.trim(),
            lines: range.getClientRects().length,
            textFits:
              text.left >= target.left - 1 &&
              text.right <= target.right + 1 &&
              text.top >= target.top - 1 &&
              text.bottom <= target.bottom + 1,
            inside:
              target.left >= bounds.left - 1 &&
              target.right <= bounds.right + 1,
            height: target.height,
          };
        }),
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width);
    expect(geometry.overflowing).toBe(false);
    const doubleDigits = geometry.days.filter((day) =>
      /^\d{2}$/.test(day.text ?? ""),
    );
    expect(doubleDigits.length).toBeGreaterThan(0);
    for (const day of doubleDigits) {
      expect(day.lines, day.text).toBe(1);
      expect(day.textFits, day.text).toBe(true);
      expect(day.inside, day.text).toBe(true);
      expect(day.height, day.text).toBeGreaterThanOrEqual(44);
    }
    const ten = days.filter({ hasText: /^10$/ }).first();
    await ten.tap();
    await expect(ten).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(days.filter({ hasText: /^11$/ }).first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("From", { exact: true })).toHaveValue(/-10$/);
    await expect(page.getByLabel("To", { exact: true })).toHaveValue(/-11$/);
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.getByRole("radio", { name: "30 days", exact: true }).tap();
    const expected = await page.evaluate(() => {
      const day = new Date();
      day.setDate(day.getDate() - 29);
      return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    });
    await expect(page.getByLabel("From", { exact: true })).toHaveValue(
      expected,
    );
  });
}

test("design system gallery fits a 320px touch viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/design-system");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(320);
});
