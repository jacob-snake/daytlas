import test from "node:test";
import assert from "node:assert/strict";
import { buildMetricSeries } from "../src/lib/metric-series.ts";
test("daily gaps preserve nulls and zero; only internal gaps are bridged", () => {
  const result = buildMetricSeries(
    [
      { day: "2026-09-01", value: null },
      { day: "2026-09-02", value: 0 },
      { day: "2026-09-05", value: 7 },
      { day: "2026-09-06", value: null },
    ],
    ["value"],
  );
  assert.equal(result.data.length, 6);
  assert.equal(result.data[2].value, null);
  assert.deepEqual(result.gaps, [
    {
      key: "value",
      segment: [
        { x: "2026-09-02", y: 0 },
        { x: "2026-09-05", y: 7 },
      ],
    },
  ]);
});
test("grouped periods bridge absent buckets without inventing daily values", () => {
  const result = buildMetricSeries(
    [
      { day: "2026-01-01", v: 2 },
      { day: "2026-03-01", v: 4 },
    ],
    ["v"],
    "monthly",
  );
  assert.equal(result.data[1].day, "2026-02-01");
  assert.equal(result.gaps.length, 1);
  assert.deepEqual(buildMetricSeries([], ["v"]).gaps, []);
});
