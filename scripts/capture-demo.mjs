import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Use a fresh browser and generated data only. This never reuses a user's profile.
const origin = new URL(process.argv[2] ?? "http://localhost:3012");
if (!["localhost", "127.0.0.1"].includes(origin.hostname)) {
  throw new Error("Capture requires a local production preview.");
}
const output = fileURLToPath(
  new URL("../docs/launch/screenshots/", import.meta.url),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const blocked = [];
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin.origin || url.pathname.startsWith("/api/")) {
      blocked.push(`${url.origin}${url.pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  async function capture(name, fullPage = false) {
    await page.evaluate(() => document.fonts.ready);
    await page.locator("h1").waitFor();
    await page
      .getByText("Preparing your history.", { exact: false })
      .waitFor({ state: "hidden" });
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `${output}/${name}.png`,
      fullPage,
      animations: "disabled",
    });
    console.log(`Saved ${name}.png`);
  }
  await page.goto(origin.href);
  await capture("landing-desktop", true);
  await page.getByRole("button", { name: "Explore the demo" }).first().click();
  await page
    .getByRole("heading", { name: "Your daily perspective." })
    .waitFor();
  await capture("overview-desktop");
  for (const route of ["trends", "year", "tags"]) {
    await page.goto(new URL(route, origin).href);
    if (route === "tags")
      await page.getByRole("button", { name: /Evening walk/ }).click();
    await capture(`${route}-desktop`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL("trends", origin).href);
  await capture("trends-mobile");
  await page.goto(origin.href);
  await capture("overview-mobile");
  await page.getByRole("button", { name: "Exit demo", exact: true }).click();
  await page.getByRole("heading", { name: /Your days/ }).waitFor();
  await capture("landing-mobile");
  if (blocked.length || errors.length) {
    throw new Error(JSON.stringify({ blocked, errors }));
  }
} finally {
  await browser.close();
}
