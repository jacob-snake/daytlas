import test from "node:test";
import assert from "node:assert/strict";
import { buildScoreSeries } from "../src/lib/chart-series.ts";
const row = (day, sleep, readiness = null, activity = null) => ({
  day,
  sleep,
  readiness,
  activity,
});

test("averages use only finite observed values including zero", () => {
  const { series } = buildScoreSeries([
    row("2026-01-01", 0, 50),
    row("2026-01-02", null, 70),
    row("2026-01-03", 100, NaN),
    row("2026-01-04", Infinity),
  ]);
  assert.equal(series[0].average, 50);
  assert.equal(series[0].count, 2);
  assert.equal(series[1].average, 60);
  assert.equal(series[2].average, null);
});

test("bridges only internal gaps and preserves null observations for tooltips", () => {
  const rows = [
    row("2026-01-01", null),
    row("2026-01-02", 0),
    row("2026-01-03", null),
    row("2026-01-04", 80),
    row("2026-01-05", null),
  ];
  const { data, series } = buildScoreSeries(rows);
  assert.deepEqual(series[0].gaps, [
    [
      { x: "2026-01-02", y: 0 },
      { x: "2026-01-04", y: 80 },
    ],
  ]);
  assert.deepEqual(data, rows);
  assert.equal(series[0].average, 40);
});

test("absent calendar days create real gaps rather than continuous measured lines", () => {
  const rows = [row("2026-02-03", 90), row("2026-01-31", 60)];
  const { data, series } = buildScoreSeries(rows);
  assert.equal(data.length, 4);
  assert.equal(data[1].day, "2026-02-01");
  assert.equal(data[1].sleep, null);
  assert.equal(series[0].gaps.length, 1);
  assert.equal(series[0].average, 75);
  assert.equal(rows[0].day, "2026-02-03", "input order is not mutated");
});

test("adjacent observations, lone observations and empty series never fabricate bridges", () => {
  assert.equal(
    buildScoreSeries([row("2026-01-01", 70), row("2026-01-02", 80)]).series[0]
      .gaps.length,
    0,
  );
  assert.equal(
    buildScoreSeries([row("2026-01-01", 70)]).series[0].gaps.length,
    0,
  );
  assert.deepEqual(buildScoreSeries([]).data, []);
  assert.equal(buildScoreSeries([]).series[0].average, null);
});

test("score axis starts ten below smallest observation with zero floor", () => {
  assert.deepEqual(
    buildScoreSeries([row("2026-01-01", 82, 73, 99)]).domain,
    [63, 100],
  );
  assert.deepEqual(
    buildScoreSeries([row("2026-01-01", 4, null, 91)]).domain,
    [0, 100],
  );
  assert.deepEqual(
    buildScoreSeries([row("2026-01-01", 0, 90, 100)]).domain,
    [0, 100],
  );
  assert.deepEqual(buildScoreSeries([]).domain, [0, 100]);
  assert.deepEqual(
    buildScoreSeries([row("2026-01-01", NaN, Infinity)]).domain,
    [0, 100],
  );
});

test("fractional and unexpectedly high observed values are never cropped", () => {
  assert.deepEqual(
    buildScoreSeries([row("2026-01-01", 75.6, 100.4)]).domain,
    [65, 101],
  );
});
