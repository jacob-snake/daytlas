import { subDays, subYears, format } from "date-fns";
import type { DayRow } from "./oura/metrics";

// Turns raw history into "how am I doing lately vs what's normal for me".

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function windowValues(rows: DayRow[], key: string, start: string, end: string): number[] {
  return rows
    .filter((r) => (r.day as string) >= start && (r.day as string) <= end)
    .map((r) => r[key])
    .filter((v): v is number => typeof v === "number");
}

export interface MetricInsight {
  key: string;
  /** Mean over the last `windowDays`. */
  current: number | null;
  /** vs the window immediately before. */
  deltaPrev: number | null;
  /** vs the same window one year ago (null if no data back then). */
  deltaLastYear: number | null;
  /** 0–100: where the current window mean sits among all rolling windows. */
  percentile: number | null;
  /** Best single day in the current window. */
  bestDay: { day: string; value: number } | null;
}

export function metricInsight(rows: DayRow[], key: string, windowDays = 30): MetricInsight {
  const today = new Date();
  const curStart = iso(subDays(today, windowDays));
  const prevStart = iso(subDays(today, windowDays * 2));
  const lyEnd = iso(subYears(today, 1));
  const lyStart = iso(subDays(subYears(today, 1), windowDays));

  const cur = windowValues(rows, key, curStart, iso(today));
  const prev = windowValues(rows, key, prevStart, curStart);
  const lastYear = windowValues(rows, key, lyStart, lyEnd);

  const current = mean(cur);
  const prevMean = mean(prev);
  const lyMean = mean(lastYear);

  // Rolling windows across full history for the percentile.
  const daily = rows
    .map((r) => ({ day: r.day as string, v: r[key] }))
    .filter((r): r is { day: string; v: number } => typeof r.v === "number");
  const windows: number[] = [];
  for (let i = 0; i + windowDays <= daily.length; i += Math.max(7, Math.floor(windowDays / 4))) {
    const m = mean(daily.slice(i, i + windowDays).map((d) => d.v));
    if (m !== null) windows.push(m);
  }
  let percentile: number | null = null;
  if (current !== null && windows.length >= 4) {
    percentile = Math.round((windows.filter((w) => w <= current).length / windows.length) * 100);
  }

  let bestDay: MetricInsight["bestDay"] = null;
  for (const d of daily.filter((d) => d.day >= curStart)) {
    if (!bestDay || d.v > bestDay.value) bestDay = { day: d.day, value: d.v };
  }

  return {
    key,
    current,
    deltaPrev: current !== null && prevMean !== null ? current - prevMean : null,
    deltaLastYear: current !== null && lyMean !== null ? current - lyMean : null,
    percentile,
    bestDay,
  };
}

/** Histogram of all daily values + where the recent window sits. */
export function distribution(rows: DayRow[], key: string, bins = 24, windowDays = 30) {
  const values = rows
    .map((r) => r[key])
    .filter((v): v is number => typeof v === "number");
  if (values.length < 10) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min) / bins || 1;
  const counts = Array.from({ length: bins }, (_, i) => ({
    x0: min + i * step,
    x1: min + (i + 1) * step,
    count: 0,
    recent: 0,
  }));
  const curStart = iso(subDays(new Date(), windowDays));
  for (const r of rows) {
    const v = r[key];
    if (typeof v !== "number") continue;
    const idx = Math.min(bins - 1, Math.floor((v - min) / step));
    counts[idx].count++;
    if ((r.day as string) >= curStart) counts[idx].recent++;
  }
  const recentMean = mean(windowValues(rows, key, curStart, iso(new Date())));
  return { counts, min, max, recentMean, total: values.length };
}
