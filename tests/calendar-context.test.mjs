import test from "node:test";
import assert from "node:assert/strict";
import { averageClock } from "../src/lib/clock-average.ts";
import {
  collectionRange,
  inCalendarRange,
} from "../src/lib/oura/date-range.ts";

test("clock averages cross midnight and preserve local clock semantics", () => {
  const midnight = averageClock([23.5, 0.5]);
  assert(Math.min(midnight, 24 - midnight) < 1e-8);
  assert.equal(averageClock([7, 9]), 8);
  assert.equal(averageClock([]), null);
  assert.equal(averageClock([0, 12]), null);
});

test("inclusive calendar ranges handle leap days and year boundaries", () => {
  for (const endpoint of ["daily_activity", "sleep", "workout", "session"]) {
    assert.equal(
      collectionRange(endpoint, { end_date: "2024-02-29" }).end_date,
      "2024-03-01",
    );
    assert.equal(
      collectionRange(endpoint, { end_date: "2026-12-31" }).end_date,
      "2027-01-01",
    );
  }
  assert.equal(
    collectionRange("daily_sleep", { end_date: "2026-09-30" }).end_date,
    "2026-09-30",
  );
  assert.deepEqual(
    collectionRange("heartrate", { end_datetime: "2026-09-30T12:00:00Z" }),
    { end_datetime: "2026-09-30T12:00:00Z" },
  );
  assert(inCalendarRange({ day: "2026-09-30" }, { end_date: "2026-09-30" }));
  assert(!inCalendarRange({ day: "2026-10-01" }, { end_date: "2026-09-30" }));
});
