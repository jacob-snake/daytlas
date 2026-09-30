import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 1440]) {
  test(`optional setup saves and edits a device goal at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("woura.mode", "demo"));
    await page.route("**/api/oura/**", (route) => route.abort());
    await page.goto("/app/onboarding");
    await expect(
      page.getByRole("heading", { name: "Start with your own picture." }),
    ).toBeVisible();
    await expect(
      page.getByText("Recorded days", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explore without setup" }),
    ).toHaveAttribute("href", "/app");
    await page.getByRole("button", { name: "Continue to your goal" }).click();
    await page
      .getByRole("radio", { name: /Choose a sleep-duration goal/ })
      .check();
    await page.getByLabel("Your target, in hours").fill("3");
    await page.getByRole("button", { name: "Review your choices" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Enter a duration" }),
    ).toBeVisible();
    await page.getByLabel("Your target, in hours").fill("7.5");
    await page.getByRole("button", { name: "Review your choices" }).click();
    await expect(page.getByText("7h 30m", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save my setup" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Your setup is saved" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "See your profile" }).click();
    await expect(
      page.getByText("Your goal and preferences", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Weekly email digest · Coming soon" }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText("7h 30m", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Edit your setup" }).click();
    await page.getByRole("button", { name: "Continue to your goal" }).click();
    await expect(page.getByLabel("Your target, in hours")).toHaveValue("7.5");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const report = await new AxeBuilder({ page }).analyze();
    expect(
      report.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  });
}

test("setup without goal stays optional and local reset needs explicit action", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("woura.mode", "demo"));
  await page.goto("/app/onboarding");
  await page.getByRole("button", { name: "Continue to your goal" }).click();
  await page.getByRole("button", { name: "Review your choices" }).click();
  await page.getByRole("button", { name: "Save my setup" }).click();
  await page.getByRole("link", { name: "See your profile" }).click();
  await expect(page.getByText("No active goal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset local setup" }).click();
  await page.getByRole("button", { name: "Keep setup" }).click();
  await expect(page.getByText("No active goal", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset local setup" }).click();
  await page.getByRole("button", { name: "Remove local setup" }).click();
  await expect(
    page.getByRole("link", { name: "Personalise your view" }),
  ).toBeVisible();
});

test("failed persistence never claims setup was saved", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("woura.mode", "demo");
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("woura.preferences."))
        throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.goto("/app/onboarding");
  await page.getByRole("button", { name: "Continue to your goal" }).click();
  await page.getByRole("button", { name: "Review your choices" }).click();
  await page.getByRole("button", { name: "Save my setup" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Your setup could not be saved" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "See your profile" }),
  ).toHaveCount(0);
});
