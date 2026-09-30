import { test } from "node:test";
import assert from "node:assert/strict";
import {
  migrateBrowserStorage,
  hasLegacyConnection,
} from "../src/lib/brand-migration.ts";

function storage(initial, failAt) {
  const data = { ...initial };
  Object.defineProperties(data, {
    getItem: { value: (key) => data[key] ?? null },
    setItem: {
      value: (key, value) => {
        if (key === failAt) throw new Error("quota");
        data[key] = String(value);
      },
    },
    removeItem: {
      value: (key) => {
        delete data[key];
      },
    },
  });
  return data;
}
test("brand migration preserves session, scope, settings, and declined analytics choice", () => {
  const s = storage({
    "woura.token": "synthetic-old",
    "woura.refresh": "synthetic-refresh",
    "woura.cacheScope": "old-scope",
    "woura.mode": "live",
    "woura.preferences": "saved",
    "mebyday.analytics-consent.v1": "declined",
    unrelated: "keep",
  });
  assert.equal(hasLegacyConnection(s), true);
  assert.equal(migrateBrowserStorage(s), true);
  assert.equal(s["daytlas.token"], "synthetic-old");
  assert.equal(s["daytlas.refresh"], "synthetic-refresh");
  assert.equal(s["daytlas.cacheScope"], "old-scope");
  assert.equal(s["daytlas.preferences"], "saved");
  assert.equal(s["daytlas.analytics-consent.v1"], "declined");
  assert.equal(hasLegacyConnection(s), false);
  assert.equal(s.unrelated, "keep");
  assert.equal(migrateBrowserStorage(s), true);
});
test("a current connection wins as a whole, without inheriting another account's refresh or imports", () => {
  const s = storage({
    "daytlas.token": "synthetic-current",
    "woura.token": "synthetic-old",
    "woura.refresh": "synthetic-old-refresh",
    "woura.importRevision": "old-import",
    "woura.mode": "import",
  });
  migrateBrowserStorage(s);
  assert.equal(s["daytlas.token"], "synthetic-current");
  for (const field of ["refresh", "importRevision", "mode"])
    assert.equal(s[`daytlas.${field}`], undefined);
});
test("storage write failure rolls back the attempted copy and retains the complete original", () => {
  const s = storage(
    { "woura.token": "synthetic-old", "woura.refresh": "synthetic-refresh" },
    "daytlas.refresh",
  );
  assert.equal(migrateBrowserStorage(s), false);
  assert.equal(s["woura.token"], "synthetic-old");
  assert.equal(s["woura.refresh"], "synthetic-refresh");
  assert.equal(s["daytlas.token"], undefined);
  assert.equal(s["daytlas.brand-migration.v1"], undefined);
});
test("migration never replaces a newer analytics choice", () => {
  const s = storage({
    "mebyday.analytics-consent.v1": "allowed",
    "daytlas.analytics-consent.v1": "declined",
  });
  migrateBrowserStorage(s);
  assert.equal(s["daytlas.analytics-consent.v1"], "declined");
});
