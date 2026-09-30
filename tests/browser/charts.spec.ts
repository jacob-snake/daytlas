import { expect, test, type Locator, type Page } from "@playwright/test";

async function openDemo(page: Page, path: string) {
  // Explicit synthetic mode keeps these layout tests completely offline.
  await page.addInitScript(() => localStorage.setItem("woura.mode", "demo"));
  await page.goto(path);
  await expect(
    page.getByText("All data is fictional.", { exact: true }),
  ).toBeVisible();
}

async function expectSelectedMarkVisible(chart: Locator) {
  const selected = chart.locator('[data-selected="true"]');
  await expect(selected).toHaveCount(1);
  const bounds = await selected.evaluate((mark) => {
    const scroller = mark.closest("svg")!.parentElement!;
    const viewport = scroller.getBoundingClientRect();
    const rect = mark.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportLeft: viewport.left,
      viewportRight: viewport.left + scroller.clientWidth,
      scrollLeft: scroller.scrollLeft,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(bounds.viewportLeft - 1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportRight + 1);
  return bounds;
}

test("narrow Trends never overflows during the first chart measurement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addInitScript(() => {
    const state = window as typeof window & { chartOverflowWidths: number[] };
    state.chartOverflowWidths = [];
    const sample = () => {
      const width = document.documentElement?.scrollWidth ?? 0;
      if (width > innerWidth) state.chartOverflowWidths.push(width);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await openDemo(page, "/app/trends");
  await expect(
    page.locator('[data-slot="chart"] .recharts-line').first(),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { chartOverflowWidths: number[] })
          .chartOverflowWidths,
    ),
  ).toEqual([]);
});

for (const width of [320, 390]) {
  test(`expanded multi-series chart stays inside its dialog at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await openDemo(page, "/app/trends");
    const expand = page.getByRole("button", {
      name: "Expand Sleep Score to full screen",
      exact: true,
    });
    await expect(expand).toBeVisible();
    const panel = expand.locator('xpath=ancestor::*[@data-slot="card"]');
    for (const metric of ["Readiness Score", "Activity Score"]) {
      await panel
        .getByRole("combobox", {
          name: "Overlay metric on Sleep Score",
          exact: true,
        })
        .click();
      await page.getByRole("option", { name: metric, exact: true }).click();
    }
    await expand.click();
    const dialog = page.getByRole("dialog", {
      name: "Sleep Score",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".recharts-line")).toHaveCount(3);
    await expect
      .poll(() =>
        dialog.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const plot = element
            .querySelector('[data-slot="chart"]')!
            .getBoundingClientRect();
          const legend = element
            .querySelector(".recharts-legend-wrapper")!
            .getBoundingClientRect();
          return (
            element.scrollWidth <= element.clientWidth + 1 &&
            plot.left >= bounds.left &&
            plot.right <= bounds.right &&
            legend.left >= bounds.left &&
            legend.right <= bounds.right
          );
        }),
      )
      .toBe(true);
    for (const label of ["Sleep Score", "Readiness Score", "Activity Score"]) {
      await expect(
        dialog
          .locator(".recharts-legend-wrapper")
          .getByText(label, { exact: true }),
      ).toBeVisible();
    }
    const dialogBounds = await dialog.boundingBox();
    expect(dialogBounds!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(expand).toBeFocused();
  });
}

test("heatmap keyboard navigation keeps the selected day visible without moving the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page, "/app/year");
  const chart = page.getByRole("img", { name: /calendar heatmap/ });
  await expect(chart).toBeVisible();
  await chart.scrollIntoViewIfNeeded();
  await chart.focus();
  const pageY = await page.evaluate(() => scrollY);
  for (let step = 0; step < 35; step++) await page.keyboard.press("ArrowRight");
  const last = await expectSelectedMarkVisible(chart);
  expect(last.scrollLeft).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(pageY);
  await page.keyboard.press("Home");
  const first = await expectSelectedMarkVisible(chart);
  expect(first.scrollLeft).toBe(0);
  expect(await page.evaluate(() => scrollY)).toBe(pageY);
});

test("sleep barcode keyboard navigation reveals the selected night and returns to the first", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page, "/app/year");
  const chart = page.getByRole("img", { name: /Sleep rhythm barcode/ });
  await expect(chart).toBeVisible();
  await chart.scrollIntoViewIfNeeded();
  await chart.focus();
  const pageY = await page.evaluate(() => scrollY);
  await page.keyboard.press("End");
  expect((await expectSelectedMarkVisible(chart)).scrollLeft).toBeGreaterThan(
    0,
  );
  expect(await page.evaluate(() => scrollY)).toBe(pageY);
  await page.keyboard.press("Home");
  await expectSelectedMarkVisible(chart);
  expect(await page.evaluate(() => scrollY)).toBe(pageY);
});
