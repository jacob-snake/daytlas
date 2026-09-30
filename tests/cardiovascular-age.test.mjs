import test from "node:test";
import assert from "node:assert/strict";
import { cardiovascularAgeSummary } from "../src/lib/cardiovascular-age.ts";
import { shiftDay } from "../src/lib/dates.ts";

test("cardiovascular age uses calendar baseline excluding latest and preserves missing days", () => {
  const records = Array.from({ length: 5 }, (_, i) => ({
    day: shiftDay("2026-09-30", -(i + 1)),
    vascular_age: 40,
  }));
  records.push(
    { day: "2026-09-30", vascular_age: 35 },
    { day: "2026-08-01", vascular_age: 90 },
    { day: "2026-10-01", vascular_age: 20 },
  );
  const s = cardiovascularAgeSummary(records, "2026-09-30");
  assert.equal(s.latest.value, 35);
  assert.equal(s.average, 40);
  assert.equal(s.count, 5);
  assert.equal(s.chart.length, 90);
  assert.equal(s.chart.at(-7).value, null);
});

test("invalid and null ages are never replaced with zero or a derived score", () => {
  assert.equal(
    cardiovascularAgeSummary(
      [
        { day: "2026-09-30", vascular_age: null },
        { day: "bad", vascular_age: 40 },
        { day: "2026-09-20", vascular_age: 0 },
        { day: "2026-09-21", vascular_age: "40" },
      ],
      "2026-09-30",
    ),
    null,
  );
  const s = cardiovascularAgeSummary(
    [
      { day: "2026-09-29", vascular_age: 40 },
      { day: "2026-09-30", vascular_age: null },
    ],
    "2026-09-30",
  );
  assert.equal(s.latest.day, "2026-09-29");
  assert.equal(s.average, null);
});
