import { expect, test } from "@playwright/test";

test("existing imported history survives the Daytlas rename, reload, and explicit erasure", async ({
  page,
}) => {
  let unexpectedNetwork = 0;
  await page.route("**/api/oura/**", async (route) => {
    unexpectedNetwork++;
    await route.abort();
  });
  await page.goto("/");
  const history = {
    version: 1,
    importedAt: "2026-01-02T12:00:00Z",
    days: 1,
    firstDay: "2026-01-01",
    lastDay: "2026-01-01",
    warnings: [],
    collections: { daily_sleep: [{ day: "2026-01-01", score: 82 }] },
  };
  await page.evaluate(async (data) => {
    localStorage.clear();
    localStorage.setItem("woura.mode", "import");
    localStorage.setItem("woura.importRevision", "synthetic-original");
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("woura", 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore("api-cache", { keyPath: "key" });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("api-cache", "readwrite");
        tx.objectStore("api-cache").put({
          key: "imported-history",
          storedAt: 1,
          data,
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, history);
  await page.goto("/app");
  await expect(
    page.getByText("Imported history is no longer in this browser."),
  ).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("daytlas.mode")))
    .toBe("import");
  const readImports = () =>
    page.evaluate(async () => {
      const result: Record<string, unknown> = {};
      for (const name of ["daytlas", "woura"]) {
        result[name] = await new Promise((resolve, reject) => {
          const req = indexedDB.open(name, 1);
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction("api-cache");
            const get = tx.objectStore("api-cache").get("imported-history");
            tx.oncomplete = () => {
              db.close();
              resolve(get.result?.data ?? null);
            };
            tx.onerror = () => reject(tx.error);
          };
          req.onerror = () => reject(req.error);
        });
      }
      return result;
    });
  await expect.poll(async () => (await readImports()).daytlas).toEqual(history);
  await page.reload();
  await expect.poll(async () => (await readImports()).daytlas).toEqual(history);
  expect(unexpectedNetwork).toBe(0);
  await page
    .getByRole("button", { name: "Disconnect & clear local data" })
    .click();
  await page
    .getByRole("button", { name: "Disconnect & clear", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  expect(await readImports()).toEqual({ daytlas: null, woura: null });
  await page.reload();
  expect(await readImports()).toEqual({ daytlas: null, woura: null });
});
