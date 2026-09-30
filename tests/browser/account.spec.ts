import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("unconfigured account is explicit and does not collect an email", async ({
  page,
}) => {
  await page.route("**/api/account", (route) =>
    route.fulfill({
      json: { enabled: false, preferences: false, account: null },
    }),
  );
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Account sign-in is being prepared" }),
  ).toBeVisible();
  await expect(page.getByLabel("Your email", { exact: true })).toHaveCount(0);
});

for (const width of [320, 390]) {
  test(`explicit email verification and account sign-out at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const mutations: Record<string, string>[] = [];
    let signedIn = false;
    let displayName = "";
    await page.addInitScript(() =>
      localStorage.setItem("daytlas.token", "synthetic-oura-connection"),
    );
    await page.route("**/api/account", async (route) => {
      const request = route.request();
      if (request.method() === "GET")
        return route.fulfill({
          json: {
            enabled: true,
            preferences: true,
            account: signedIn
              ? { email: "reader@example.test", displayName }
              : null,
          },
        });
      const input = request.postDataJSON();
      mutations.push(input);
      if (input.action === "verify_code") {
        if (input.code !== "654321")
          return route.fulfill({
            status: 400,
            json: { error: "invalid_code" },
          });
        signedIn = true;
      }
      if (input.action === "save_profile") displayName = input.displayName;
      if (input.action === "sign_out") signedIn = false;
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto("/account");
    await expect(page.getByLabel("Your email", { exact: true })).toBeVisible();
    expect(mutations).toEqual([]);
    await page
      .getByLabel("Your email", { exact: true })
      .fill("reader@example.test");
    await page
      .getByRole("button", { name: "Email me a code", exact: true })
      .click();
    await expect(
      page.getByLabel("Six-digit code", { exact: true }),
    ).toBeFocused();
    expect(mutations).toEqual([
      { action: "request_code", email: "reader@example.test" },
    ]);
    await page.getByLabel("Six-digit code", { exact: true }).fill("123456");
    await page
      .getByRole("button", { name: "Verify & sign in", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "invalid or has expired" }),
    ).toContainText("invalid or has expired");
    await page.getByLabel("Six-digit code", { exact: true }).fill("654321");
    await page
      .getByRole("button", { name: "Verify & sign in", exact: true })
      .click();
    await expect(
      page.getByText("Email verified", { exact: true }),
    ).toBeVisible();
    await page.getByLabel(/What should we call you/).fill("Reader");
    await page
      .getByRole("button", { name: "Save account name", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Hello, Reader." }),
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
      .getByRole("button", { name: "Sign out of this account", exact: true })
      .click();
    await expect(page.getByLabel("Your email", { exact: true })).toHaveValue(
      "",
    );
    expect(await page.evaluate(() => localStorage.getItem("daytlas.token"))).toBe(
      "synthetic-oura-connection",
    );
  });
}
