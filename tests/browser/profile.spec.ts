import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 1440]) {
  test(`profile uses available history and works at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("woura.mode", "demo"));
    await page.route("**/api/oura/**", (route) => route.abort());
    await page.goto("/app/profile");
    await expect(
      page.getByText("All data is fictional.", { exact: true }),
    ).toBeVisible();
    const months = page.locator("button[aria-pressed]");
    await expect(months).toHaveCount(12);
    await months.first().click();
    await expect(months.first()).toHaveAttribute("aria-pressed", "true");
    await months.last().focus();
    await page.keyboard.press("Enter");
    await expect(months.last()).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText("Earliest available record", { exact: true }),
    ).toBeVisible();
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
    await page.getByRole("link", { name: /— Back to website/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your days",
    );
  });
}
