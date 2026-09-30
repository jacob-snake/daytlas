import { test, expect } from "@playwright/test";

for (const width of [320, 390, 1440]) {
  test(`annual story keeps its height and controls stable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page
      .getByRole("button", { name: /Explore the demo|See demo/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/app$/);
    await page.goto("/app/year");
    const story = page.getByTestId("year-story");
    await expect(story).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const initial = await story.boundingBox();
    const next = story.getByRole("button", { name: "Next", exact: true });
    const firstControlY = await next.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    for (let i = 0; i < 5; i++) {
      await story
        .getByRole("button", { name: new RegExp(`^Chapter ${i + 1}:`) })
        .click();
      await expect(story.getByRole("heading")).toHaveCount(1);
      const bounds = await story.boundingBox();
      expect(Math.abs(bounds!.height - initial!.height)).toBeLessThan(1);
      const controlY = await story
        .getByRole("button", {
          name: i === 4 ? "Start again" : "Next",
          exact: true,
        })
        .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      expect(Math.abs(controlY - firstControlY)).toBeLessThan(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await story.getByRole("button", { name: "Start again" }).click();
    await expect(
      story.getByRole("button", { name: "Back", exact: true }),
    ).toBeDisabled();
    await expect(
      story.getByRole("button", { name: /^Chapter 1:/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });
}
