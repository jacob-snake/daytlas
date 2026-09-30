import test from "node:test";
import assert from "node:assert/strict";
import { profileSummary, sleepDuration } from "../src/lib/profile-summary.ts";
test("profile ignores invalid, future and all-missing records; deduplicates dates", () => {
  const result = profileSummary(
    [
      { day: "2024-02-01", total_sleep: 7 },
      { day: "2024-02-01", total_sleep: 8 },
      { day: "2024-02-02", total_sleep: null },
      { day: "2024-02-03", steps: 0 },
      { day: "2024-02-30", total_sleep: 9 },
      { day: "2024-03-01", total_sleep: 9 },
    ],
    "2024-02-10",
  );
  assert.equal(result.records, 2);
  assert.equal(result.nights, 1);
  assert.equal(result.first, "2024-02-01");
  assert.equal(result.latest, "2024-02-03");
  assert.equal(result.months.at(-1).average, 8);
  assert.equal(result.months.at(-1).missing, 9);
  assert.equal(result.longest, null);
});
test("profile handles leap February, empty months and real monthly variability", () => {
  const rows = Array.from({ length: 7 }, (_, i) => ({
    day: `2024-02-0${i + 1}`,
    total_sleep: 8,
  }));
  rows.push(
    ...Array.from({ length: 7 }, (_, i) => ({
      day: `2024-01-0${i + 1}`,
      total_sleep: i % 2 ? 9 : 7,
    })),
  );
  const result = profileSummary(rows, "2024-03-01");
  assert.equal(result.months.at(-1).calendarDays, 29);
  assert.equal(result.months.at(-1).missing, 22);
  assert.equal(result.steadiest.month, "2024-02");
  assert.equal(result.steadiest.deviation, 0);
  assert.equal(result.months[0].average, null);
  assert.equal(profileSummary([], "2024-03-01").first, null);
  assert.equal(sleepDuration(7.999), "8h 00m");
});

test("a single eligible month is not a comparative discovery", () => {
  const rows = Array.from({ length: 7 }, (_, i) => ({
    day: `2024-02-0${i + 1}`,
    total_sleep: 8,
  }));
  const result = profileSummary(rows, "2024-02-20");
  assert.equal(result.longest, null);
  assert.equal(result.steadiest, null);
});
