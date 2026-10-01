import { test, expect } from "@playwright/test";
test("Trends has plain grip strokes and explains actual comparison groups", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("daytlas.mode", "demo"));
  await page.goto("/app/trends");
  await expect(
    page.getByText(
      "Drag an edge or move the whole selection. Changes apply immediately.",
    ),
  ).toHaveCount(0);
  await expect(page.locator(".history-handle svg")).toHaveCount(2);
  const status = page
    .getByRole("status")
    .filter({ hasText: "Changes apply immediately" });
  await expect(status).toHaveCSS("text-align", "center");
  await page
    .getByRole("button", {
      name: "Newer readings vs older readings",
      exact: true,
    })
    .first()
    .hover();
  await expect(page.getByRole("tooltip")).toContainText("Older:");
  await expect(page.getByRole("tooltip")).toContainText("Newer:");
  await expect(page.getByRole("tooltip")).toContainText(
    "Missing days are excluded",
  );
});
