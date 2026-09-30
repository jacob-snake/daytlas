import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 1440]) {
  test(`shared controls stay usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/design-system#components");
    const select = page.getByRole("combobox", { name: "Môj zámer" });
    await select.click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    await expect(
      page.getByRole("option", { name: /E-mailové prehľady/ }),
    ).toBeDisabled();
    // Radix hides background controls from the accessibility tree while open.
    const triggerBounds = await page.locator("#ds-intention").boundingBox();
    const menuBounds = await menu.boundingBox();
    expect(Math.abs(menuBounds!.width - triggerBounds!.width)).toBeLessThan(2);
    expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
    expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(width);
    await expect(
      page.getByRole("option", { name: "Pravidelne si pozrieť svoje dni" }),
    ).toBeFocused();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("option", { name: "Sledovať vlastný spánkový cieľ" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(select).toContainText("Sledovať vlastný spánkový cieľ");
    await expect(select).toBeFocused();
    await select.press("Enter");
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(select).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Použiť v ukážke" }),
    ).toHaveCSS("font-weight", "700");

    await page.getByRole("button", { name: "Upraviť cieľ" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", { name: "Close", exact: true });
    await dialog.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    const button = await close.boundingBox();
    const icon = await close.locator("svg").boundingBox();
    expect(
      Math.abs(button!.x + button!.width / 2 - icon!.x - icon!.width / 2),
    ).toBeLessThan(1);
    expect(
      Math.abs(button!.y + button!.height / 2 - icon!.y - icon!.height / 2),
    ).toBeLessThan(1);
    const report = await new AxeBuilder({ page }).analyze();
    expect(
      report.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    await close.click();
    await expect(dialog).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
