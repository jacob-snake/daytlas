import { test } from "node:test";
import assert from "node:assert/strict";
import {
  baseline,
  samplePoints,
  sleepStages,
  heartPoints,
  dayBounds,
  daytimeAverages,
} from "../src/lib/day-detail.ts";
test("30 calendar days exclude selected day, invalid dates, duplicates and non-finite values", () => {
  const rows = [
    ...Array.from({ length: 30 }, (_, i) => ({
      day: `2026-09-${String(i + 1).padStart(2, "0")}`,
      v: 10,
    })),
    { day: "2026-10-01", v: 900 },
    { day: "2026-08-31", v: 900 },
    { day: "2026-09-99", v: 900 },
    { day: "2026-09-01", v: 10 },
    { day: "2026-09-02", v: NaN },
  ];
  assert.deepEqual(
    baseline(rows, "2026-10-01", (r) => r.v),
    { count: 30, average: 10 },
  );
  assert.equal(
    baseline(rows.slice(0, 4), "2026-10-01", (r) => r.v).average,
    null,
  );
});
test("sample intervals are seconds, missing values stay gaps and bounds are exclusive", () => {
  const start = Date.parse("2026-09-30T00:00:00Z");
  assert.deepEqual(
    samplePoints(
      {
        timestamp: "2026-09-30T00:00:00Z",
        interval: 300,
        items: [50, null, NaN, 70],
      },
      start,
      start + 900000,
    ),
    [
      { time: start, value: 50 },
      { time: start + 300000, value: null },
      { time: start + 600000, value: null },
    ],
  );
  assert.deepEqual(
    samplePoints({ timestamp: "bad", interval: 300, items: [1] }),
    [],
  );
  assert.deepEqual(
    samplePoints({ timestamp: "2026-09-30", interval: 0, items: [1] }),
    [],
  );
});
test("sleep phases prefer 30 seconds and preserve unknown-sample gaps", () => {
  const start = Date.parse("2026-09-29T22:00:00Z");
  const period = {
    bedtime_start: new Date(start).toISOString(),
    bedtime_end: new Date(start + 105000).toISOString(),
    sleep_phase_30_sec: "1103",
    sleep_phase_5_min: "4444",
  };
  assert.deepEqual(sleepStages(period), [
    { start, end: start + 60000, stage: 1 },
    { start: start + 90000, end: start + 105000, stage: 3 },
  ]);
});
test("heart-rate deduplication, day bounds and missing intervals", () => {
  const { start, end } = dayBounds("2026-09-30");
  const rows = [
    { timestamp: new Date(start).toISOString(), bpm: 60, source: "awake" },
    { timestamp: new Date(start).toISOString(), bpm: 80, source: "awake" },
    {
      timestamp: new Date(start + 3600000).toISOString(),
      bpm: 65,
      source: "sleep",
    },
    { timestamp: new Date(end).toISOString(), bpm: 99, source: "awake" },
  ];
  assert.deepEqual(
    heartPoints(rows, "2026-09-30").map((p) => p.value),
    [70, null, 65],
  );
  assert.equal(
    daytimeAverages(rows).find((d) => d.day === "2026-09-30").value,
    80,
  );
});

test("shared time cursor uses timestamps, preserves null gaps and rejects distant samples", async () => {
  const { sampleAtTime } = await import("../src/lib/day-detail.ts");
  const points = [
    { time: 0, value: 60 },
    { time: 300000, value: 70 },
    { time: 600000, value: null },
    { time: 900000, value: 80 },
  ];
  assert.equal(sampleAtTime(points, 290000)?.value, 70);
  assert.equal(sampleAtTime(points, 450000), null);
  assert.equal(sampleAtTime(points, 700000), null);
  assert.equal(sampleAtTime(points, 900000)?.value, 80);
  assert.equal(sampleAtTime(points, -1), null);
  assert.equal(sampleAtTime(points, 1000000), null);
  assert.equal(
    sampleAtTime(
      [
        { time: 0, value: 1 },
        { time: 1200000, value: 2 },
      ],
      600000,
    ),
    null,
  );
});
