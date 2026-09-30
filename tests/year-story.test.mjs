import test from "node:test";
import assert from "node:assert/strict";
import { yearStory } from "../src/lib/year-story.ts";

test("year story excludes future/out-of-year records and invalid sleep without replacing gaps with zero", () => {
  const s = yearStory(
    [
      { day: "2024-01-01", total_sleep: 7 },
      { day: "2024-01-02", total_sleep: 0 },
      { day: "2024-01-03", total_sleep: NaN },
      { day: "2024-01-04", total_sleep: 25 },
      { day: "2024-01-05", total_sleep: 8 },
      { day: "2023-12-31", total_sleep: 8 },
      { day: "2024-02-30", total_sleep: 8 },
    ],
    2024,
    "2024-01-04",
  );
  assert.equal(s.days.length, 4);
  assert.equal(s.count, 1);
  assert.equal(s.missing, 3);
  assert.equal(s.average, 7);
  assert.equal(s.latest, "2024-01-01");
});

test("year story counts leap days, deduplicates dates, and computes weekdays in UTC", () => {
  const rows = [
    { day: "2024-02-29", total_sleep: 6 },
    { day: "2024-02-29", total_sleep: 8 },
    { day: "2024-03-02", total_sleep: 10 },
  ];
  const s = yearStory(rows, 2024, "2025-01-01");
  assert.equal(s.days.length, 366);
  assert.equal(s.count, 2);
  assert.equal(s.average, 9);
  assert.deepEqual(s.weekdays, { count: 1, average: 8 });
  assert.deepEqual(s.weekends, { count: 1, average: 10 });
  assert.equal(s.longest.day, "2024-03-02");
  assert.deepEqual(s.quarters[1], { count: 0, average: null });
});

test("year story keeps quarters separate and ignores input order for record dates", () => {
  const s = yearStory(
    [
      { day: "2025-10-01", total_sleep: 9 },
      { day: "2025-07-01", total_sleep: 8 },
      { day: "2025-01-01", total_sleep: 6 },
      { day: "2025-04-01", total_sleep: 7 },
    ],
    2025,
    "2025-12-31",
  );
  assert.deepEqual(
    s.quarters.map((q) => q.average),
    [6, 7, 8, 9],
  );
  assert.equal(s.first, "2025-01-01");
  assert.equal(s.latest, "2025-10-01");
});

test("future and empty periods do not invent averages or missing elapsed days", () => {
  const future = yearStory([], 2027, "2026-09-24");
  assert.equal(future.days.length, 0);
  assert.equal(future.missing, 0);
  assert.equal(future.end, null);
  assert.equal(future.average, null);
  assert.equal(future.longest, null);
  assert.equal(yearStory([], 2026, "2026-01-01").missing, 1);
  assert.throws(() => yearStory([], NaN, "2026-01-01"), RangeError);
});
