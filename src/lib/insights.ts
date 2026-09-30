import { subYears } from "date-fns";
import { mean, numericDays } from "./analytics";
import { isDay, localDay, parseDay, shiftDay } from "./dates";
import type { DayRow } from "./oura/metrics";

// Compare calendar windows of a person's own recorded history.

export interface MetricInsight {
  key: string;
  /** Mean of available measurements over exactly `windowDays` calendar days. */
  current: number | null;
  deltaPrev: number | null;
  deltaLastYear: number | null;
  /** 0–100 midrank among well-covered historical windows, not a health rating. */
  percentile: number | null;
  /** Highest single value in the current window. */
  bestDay: { day: string; value: number } | null;
  currentN: number;
  previousN: number;
  historicalWindows: number;
}

export function metricInsight(
  rows: DayRow[],
  key: string,
  windowDays = 30,
  today = localDay(),
): MetricInsight {
  const result: MetricInsight = {
    key,
    current: null,
    deltaPrev: null,
    deltaLastYear: null,
    percentile: null,
    bestDay: null,
    currentN: 0,
    previousN: 0,
    historicalWindows: 0,
  };
  if (!isDay(today) || !Number.isInteger(windowDays) || windowDays < 1)
    return result;
  const curStart = shiftDay(today, 1 - windowDays);
  const prevStart = shiftDay(curStart, -windowDays);
  const prevEnd = shiftDay(curStart, -1);
  const lyEnd = localDay(subYears(parseDay(today), 1));
  const lyStart = shiftDay(lyEnd, 1 - windowDays);
  const daily = numericDays(rows, key).filter((d) => d.day <= today);
  const values = (start: string, end: string) =>
    daily.filter((r) => r.day >= start && r.day <= end).map((r) => r.v);
  const cur = values(curStart, today);
  const prev = values(prevStart, prevEnd);
  const lastYear = values(lyStart, lyEnd);
  result.current = mean(cur);
  result.currentN = cur.length;
  result.previousN = prev.length;
  const minimum = Math.ceil(windowDays / 2);
  if (cur.length >= minimum) {
    if (prev.length >= minimum)
      result.deltaPrev = result.current! - mean(prev)!;
    if (lastYear.length >= minimum)
      result.deltaLastYear = result.current! - mean(lastYear)!;
  }

  // Use dated windows, not N observations that can span months of missing data.
  // Exclude the current period from its own reference distribution.
  const windows: number[] = [];
  const minCoverage = Math.ceil(windowDays * 0.8);
  const first = daily[0]?.day;
  if (first && cur.length >= minCoverage) {
    for (
      let end = shiftDay(first, windowDays - 1);
      end < curStart;
      end = shiftDay(end, 7)
    ) {
      const window = values(shiftDay(end, 1 - windowDays), end);
      if (window.length >= minCoverage) windows.push(mean(window)!);
    }
  }
  result.historicalWindows = windows.length;
  if (result.current !== null && windows.length >= 4) {
    // Midrank makes a constant history typical (50th percentile), not "top 0%".
    const lower = windows.filter((w) => w < result.current! - 1e-9).length;
    const equal = windows.filter(
      (w) => Math.abs(w - result.current!) <= 1e-9,
    ).length;
    result.percentile = Math.round(
      ((lower + equal / 2) / windows.length) * 100,
    );
  }

  for (const d of daily.filter((d) => d.day >= curStart)) {
    if (!result.bestDay || d.v > result.bestDay.value)
      result.bestDay = { day: d.day, value: d.v };
  }
  return result;
}

/** Histogram of recorded daily values, with an exactly dated recent window. */
export function distribution(
  rows: DayRow[],
  key: string,
  bins = 24,
  windowDays = 30,
  today = localDay(),
) {
  if (
    !Number.isInteger(bins) ||
    bins < 1 ||
    bins > 1000 ||
    !Number.isInteger(windowDays) ||
    windowDays < 1
  )
    return null;
  const daily = numericDays(rows, key).filter((d) => d.day <= today);
  const values = daily.map((d) => d.v);
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
  const curStart = shiftDay(today, 1 - windowDays);
  for (const { day, v } of daily) {
    const idx = Math.max(0, Math.min(bins - 1, Math.floor((v - min) / step)));
    counts[idx].count++;
    if (day >= curStart) counts[idx].recent++;
  }
  const recentMean = mean(
    daily.filter((r) => r.day >= curStart).map((r) => r.v),
  );
  return { counts, min, max, recentMean, total: values.length };
}
