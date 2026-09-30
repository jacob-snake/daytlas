import test from "node:test";
import assert from "node:assert/strict";
import { pearson } from "../src/lib/stats.ts";
import { localDay, parseDay, shiftDay, isDay } from "../src/lib/dates.ts";
import {
  weekdayStats,
  withBaseline,
  slopeComparison,
  streaksAndRecords,
  weeklyDeviations,
  tagImpact,
  tagDaysInRange,
  changepoints,
  mean,
  std,
} from "../src/lib/analytics.ts";
import { metricInsight, distribution } from "../src/lib/insights.ts";
import {
  aggregate,
  clockHours,
  mergeWide,
  mainSleepByDay,
} from "../src/lib/oura/metrics.ts";
import { buildExportRows, serializeExport } from "../src/lib/export.ts";

// All observations below are made-up, deterministic fixtures. No API requests.
const rows = (start, values, key = "sleep_score") =>
  values.map((value, i) => ({ day: shiftDay(start, i), [key]: value }));

test("Pearson uses only finite, paired observations and preserves the sample count", () => {
  assert.deepEqual(
    pearson([
      [1, 2],
      [2, 4],
      [3, 6],
      [4, 8],
      [5, 10],
      [undefined, 5],
      [6, null],
      [NaN, 7],
      [8, Infinity],
    ]),
    { r: 1, n: 5 },
  );
  assert.equal(
    pearson([
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
    ]),
    null,
  );
  assert.equal(
    pearson([
      [1, 2],
      [2, 3],
    ]),
    null,
  );
});

test("finite summaries ignore invalid values but retain zero", () => {
  assert.equal(mean([0, 2, NaN, Infinity]), 1);
  assert.equal(std([NaN, 3]), null);
  assert.equal(mean([NaN]), null);
});

test("calendar dates and buckets do not drift across DST or browser timezones", () => {
  const original = process.env.TZ;
  try {
    for (const timezone of [
      "America/Los_Angeles",
      "Europe/Prague",
      "Pacific/Auckland",
    ]) {
      process.env.TZ = timezone;
      assert.equal(localDay(parseDay("2026-03-09")), "2026-03-09");
      assert.equal(shiftDay("2026-03-09", -1), "2026-03-08");
      assert.equal(shiftDay("2024-03-01", -1), "2024-02-29");
      assert.equal(
        weekdayStats([{ day: "2026-03-09", steps: 1 }], "steps")[0].n,
        1,
      );
      assert.equal(
        aggregate([{ day: "2026-03-09", steps: 1 }], "weekly")[0].day,
        "2026-03-09",
      );
      assert.equal(
        aggregate([{ day: "2026-04-01", steps: 1 }], "quarterly")[0].day,
        "2026-04-01",
      );
      assert.equal(
        aggregate([{ day: "2026-01-01", steps: 1 }], "yearly")[0].day,
        "2026-01-01",
      );
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
  assert.equal(isDay("2026-02-30"), false);
  assert.equal(isDay("2024-02-29"), true);
});

test("baseline uses prior calendar days rather than bridging a long missing interval", () => {
  const data = [
    { day: "2026-01-01", steps: 1000 },
    { day: "2026-03-01", steps: 10 },
    { day: "2026-03-02", steps: 20 },
  ];
  const result = withBaseline(data.reverse(), "steps", 7);
  assert.equal(result.find((r) => r.day === "2026-03-01").baseline, null);
  assert.equal(result.find((r) => r.day === "2026-03-02").baseline, 10);
});

test("clock-time aggregation averages across midnight and leaves opposing clocks undefined", () => {
  const data = [
    { day: "2026-03-02", bedtime: 23, wakeup_time: 23 },
    { day: "2026-03-03", bedtime: 25, wakeup_time: 1 },
  ];
  const result = aggregate(data, "weekly")[0];
  assert.equal(result.bedtime, 24);
  assert.equal(result.wakeup_time, 0);
  assert.equal(
    aggregate(
      [
        { day: "2026-03-02", midpoint: 6 },
        { day: "2026-03-03", midpoint: 18 },
      ],
      "weekly",
    )[0].midpoint,
    null,
  );
});

test("candidate baseline shifts require enough adjacent calendar coverage", () => {
  const dense = rows("2026-01-01", [
    ...Array(60).fill(10),
    ...Array(60).fill(30),
  ]);
  assert.ok(changepoints(dense, "sleep_score").length > 0);
  const sparse = dense.map((r, i) => ({
    ...r,
    day: shiftDay("2024-01-01", i * 7),
  }));
  assert.deepEqual(changepoints(sparse, "sleep_score"), []);
});

test("streaks break at gaps, sort input, and expire when the latest data is old", () => {
  const data = [
    { day: "2026-03-06", sleep_score: 90 },
    { day: "2026-03-01", sleep_score: 90 },
    { day: "2026-03-02", sleep_score: 90 },
    { day: "2026-03-05", sleep_score: 90 },
  ];
  assert.equal(
    streaksAndRecords(data, "sleep_score", 85, "2026-03-06").best,
    2,
  );
  assert.equal(
    streaksAndRecords(data, "sleep_score", 85, "2026-03-06").current,
    2,
  );
  assert.equal(
    streaksAndRecords(data, "sleep_score", 85, "2026-03-09").current,
    0,
  );
});

test("current and previous windows have exactly equal calendar widths and no overlap", () => {
  const data = rows("2026-03-01", [10, 10, 20, 20, 1000]);
  const insight = metricInsight(data, "sleep_score", 2, "2026-03-04");
  assert.equal(insight.current, 20);
  assert.equal(insight.deltaPrev, 10);
  assert.equal(insight.currentN, 2);
  assert.equal(insight.bestDay.value, 20);
  const slope = slopeComparison(data, ["sleep_score"], 2, "2026-03-04")[0];
  assert.equal(slope.cur, 20);
  assert.equal(slope.prev, 10);
});

test("constant history has the 50th percentile; sparse histories do not imply a rank", () => {
  const data = rows("2026-01-01", Array(100).fill(80));
  assert.equal(
    metricInsight(data, "sleep_score", 30, "2026-04-10").percentile,
    50,
  );
  const sparse = data.filter((_, i) => i % 7 === 0);
  assert.equal(
    metricInsight(sparse, "sleep_score", 30, "2026-04-10").percentile,
    null,
  );
});

test("weekly deviation contains seven recent days, excludes future data and reports coverage", () => {
  const data = rows(
    "2026-01-01",
    Array.from({ length: 60 }, (_, i) => 10 + (i % 2)),
  );
  data.push(...rows("2026-03-02", Array(7).fill(20)), {
    day: "2026-03-09",
    sleep_score: 1000,
  });
  const result = weeklyDeviations(data, ["sleep_score"], "2026-03-08")[0];
  assert.equal(result.weekN, 7);
  assert.equal(result.baselineN, 60);
  assert.equal(result.weekMean, 20);
  assert.equal(
    weeklyDeviations(data.slice(-9), ["sleep_score"], "2026-03-08").length,
    0,
  );
});

test("tag comparison pairs previous calendar date and requires both sample sizes", () => {
  const tagged = new Set([
    "2026-03-01",
    "2026-03-03",
    "2026-03-05",
    "2026-03-07",
    "2026-03-09",
  ]);
  const data = rows(
    "2026-03-01",
    [10, 20, 10, 20, 10, 20, 10, 20, 10, 20],
    "avg_hrv",
  );
  const result = tagImpact(data, tagged, ["avg_hrv"])[0];
  assert.deepEqual(
    { n: result.n, nWithout: result.nWithout, delta: result.delta },
    { n: 5, nWithout: 5, delta: 10 },
  );
  assert.equal(tagImpact(data.slice(1), tagged, ["avg_hrv"]).length, 0);
  assert.deepEqual(
    [
      ...tagDaysInRange(
        [{ start_day: "2026-03-07", end_day: "2026-03-09" }],
        "2026-03-10",
      ),
    ],
    ["2026-03-07", "2026-03-08", "2026-03-09"],
  );
});

test("histograms ignore invalid values and future records without crashing", () => {
  const data = rows("2026-03-01", [...Array(10).fill(20), NaN, Infinity, 999]);
  const result = distribution(data, "sleep_score", 5, 2, "2026-03-10");
  assert.equal(result.total, 10);
  assert.equal(
    result.counts.reduce((n, b) => n + b.recent, 0),
    2,
  );
  assert.equal(distribution(data, "sleep_score", 0), null);
});

const night = {
  id: "synthetic-night",
  day: "2026-03-09",
  period: 0,
  type: "long_sleep",
  bedtime_start: "2026-03-08T23:30:00+02:00",
  bedtime_end: "2026-03-09T07:30:00+02:00",
  total_sleep_duration: 25200,
  deep_sleep_duration: 3600,
  light_sleep_duration: 16200,
  rem_sleep_duration: 5400,
  awake_time: 3600,
  latency: 600,
  efficiency: 88,
  time_in_bed: 28800,
  average_heart_rate: 55,
  lowest_heart_rate: 50,
  average_hrv: 42,
  average_breath: 14,
  sleep_phase_5_min: null,
};
const nap = {
  ...night,
  id: "synthetic-nap",
  type: "short_sleep",
  total_sleep_duration: 1800,
  bedtime_start: "2026-03-09T13:00:00+02:00",
  bedtime_end: "2026-03-09T13:30:00+02:00",
};
const opts = {
  startDate: "2026-03-01",
  endDate: "2026-03-10",
  metrics: {
    scores: true,
    sleepDetail: true,
    temperature: false,
    steps: false,
  },
  units: "hours",
  format: "csv",
};
const collections = {
  sleep: [],
  readiness: [],
  activity: [],
  periods: [night, nap],
  spo2: [],
};

test("exports and wide metrics select the same main sleep independent of API ordering", () => {
  assert.equal(mainSleepByDay([night, nap]).get(night.day).id, night.id);
  assert.equal(mainSleepByDay([nap, night]).get(night.day).id, night.id);
  const exported = buildExportRows(opts, collections)[0];
  const wide = mergeWide(collections)[0];
  assert.equal(exported.total_sleep_h, 7);
  assert.equal(wide.total_sleep, exported.total_sleep_h);
  assert.equal(exported.sleep_score, null);
  assert.equal(exported.bedtime_start, night.bedtime_start);
  assert.equal(
    buildExportRows({ ...opts, units: "seconds" }, collections)[0]
      .total_sleep_s,
    25200,
  );
});

test("recorded clocks preserve the original timezone and daytime sleep midpoint", () => {
  assert.equal(clockHours(night.bedtime_start, true), 23.5);
  assert.equal(clockHours("2026-03-09T01:30:00-08:00", true), 25.5);
  assert.equal(clockHours("invalid", false), null);
  assert.equal(mergeWide(collections)[0].midpoint, 3.5);
  assert.equal(
    mergeWide({ ...collections, periods: [nap] })[0].midpoint,
    13.25,
  );
});

test("export range and fields are explicit; records outside the requested dates stay out", () => {
  assert.equal(
    buildExportRows({ ...opts, startDate: "2026-03-10" }, collections).length,
    0,
  );
  assert.throws(
    () => buildExportRows({ ...opts, startDate: "2026-03-11" }, collections),
    /valid/,
  );
  assert.throws(
    () =>
      buildExportRows(
        {
          ...opts,
          metrics: {
            scores: false,
            sleepDetail: false,
            temperature: false,
            steps: false,
          },
        },
        collections,
      ),
    /Select/,
  );
});

test("CSV quotes carriage returns and prevents formula execution while retaining negative numbers", () => {
  const csv = serializeExport(
    [
      {
        day: "2026-03-09",
        text: '=HYPERLINK("bad")',
        temperature: -0.4,
        note: "one\rtwo",
      },
    ],
    "csv",
  );
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes(",-0.4,"));
  assert.ok(csv.includes('"one\rtwo"'));
  assert.ok(serializeExport([{ name: "  +cmd" }], "csv").includes("'  +cmd"));
});
