import { isDay, localDay, shiftDay } from "./dates";
import type { DayRow } from "./oura/metrics";
import type { EnhancedTag } from "./oura/types";

// Descriptive statistics, calculated locally. These are observations about a
// person's records, not diagnoses, significance tests, or causal estimates.

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export function mean(xs: number[]): number | null {
  const values = xs.filter(finite);
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}

export function std(xs: number[]): number | null {
  const values = xs.filter(finite);
  if (values.length < 2) return null;
  const m = mean(values)!;
  return Math.sqrt(
    values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1),
  );
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  return (
    sorted[base] +
    (pos - base) * ((sorted[base + 1] ?? sorted[base]) - sorted[base])
  );
}

/** One finite observation per recorded calendar day, in chronological order. */
export function numericDays(rows: DayRow[], key: string) {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const value = row[key];
    if (isDay(row.day) && finite(value)) byDay.set(row.day, value);
  }
  return [...byDay]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, v }));
}

/** Mean ± sample SD over prior calendar days, excluding the current day. */
export function withBaseline(rows: DayRow[], key: string, window = 60) {
  const series = numericDays(rows, key);
  const byDay = new Map<
    string,
    {
      baseline: number | null;
      band_low: number | null;
      band_high: number | null;
    }
  >();
  let left = 0;
  for (let i = 0; i < series.length && window >= 1; i++) {
    const start = shiftDay(series[i].day, -window);
    while (left < i && series[left].day < start) left++;
    const slice = series.slice(left, i).map((s) => s.v);
    const m = mean(slice);
    const s = std(slice);
    byDay.set(series[i].day, {
      baseline: m === null ? null : Math.round(m * 100) / 100,
      band_low:
        m !== null && s !== null ? Math.round((m - s) * 100) / 100 : null,
      band_high:
        m !== null && s !== null ? Math.round((m + s) * 100) / 100 : null,
    });
  }
  return rows.map((r) => ({
    ...r,
    ...((finite(r[key]) ? byDay.get(r.day) : null) ?? {
      baseline: null,
      band_low: null,
      band_high: null,
    }),
  }));
}

export interface SlopeRow {
  key: string;
  prev: number;
  cur: number;
  changePct: number;
  /** Kept for consumers; score direction is not a health recommendation. */
  improved: boolean;
  currentN: number;
  previousN: number;
}

const LOWER_IS_BETTER = new Set([
  "avg_resting_hr",
  "lowest_resting_hr",
  "sleep_latency",
  "inactive_time",
  "non_wear",
  "awake_time",
]);

/** Two equally sized, disjoint calendar windows ending today (inclusive). */
export function slopeComparison(
  rows: DayRow[],
  keys: string[],
  windowDays = 30,
  today = localDay(),
): SlopeRow[] {
  if (!Number.isInteger(windowDays) || windowDays < 1) return [];
  const curStart = shiftDay(today, 1 - windowDays);
  const prevStart = shiftDay(today, 1 - windowDays * 2);
  const minDays = Math.ceil(windowDays / 2);
  const out: SlopeRow[] = [];
  for (const key of keys) {
    const series = numericDays(rows, key);
    const current = series
      .filter((r) => r.day >= curStart && r.day <= today)
      .map((r) => r.v);
    const previous = series
      .filter((r) => r.day >= prevStart && r.day < curStart)
      .map((r) => r.v);
    if (current.length < minDays || previous.length < minDays) continue;
    const cur = mean(current)!;
    const prev = mean(previous)!;
    if (prev === 0) continue;
    const changePct = ((cur - prev) / Math.abs(prev)) * 100;
    out.push({
      key,
      prev,
      cur,
      changePct,
      improved: LOWER_IS_BETTER.has(key) ? changePct < 0 : changePct > 0,
      currentN: current.length,
      previousN: previous.length,
    });
  }
  return out.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
}

/** Median and interquartile range, Monday through Sunday. */
export function weekdayStats(rows: DayRow[], key: string) {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const { day, v } of numericDays(rows, key)) {
    buckets[(new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7].push(v);
  }
  return buckets.map((b, i) => {
    const sorted = [...b].sort((x, y) => x - y);
    return {
      weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      n: b.length,
      median: sorted.length ? quantile(sorted, 0.5) : null,
      q1: sorted.length ? quantile(sorted, 0.25) : null,
      q3: sorted.length ? quantile(sorted, 0.75) : null,
    };
  });
}

export interface Changepoint {
  key: string;
  day: string;
  before: number;
  after: number;
}

/** Descriptive candidate shifts, not statistically significant change points. */
export function changepoints(
  rows: DayRow[],
  key: string,
  window = 30,
): Changepoint[] {
  if (!Number.isInteger(window) || window < 2) return [];
  const series = numericDays(rows, key);
  if (series.length < window * 2) return [];
  const sd = std(series.map((s) => s.v));
  if (!sd) return [];
  const out: Changepoint[] = [];
  let lastCheck = "";
  let lastHit = "";
  for (const { day } of series) {
    if (lastCheck && day < shiftDay(lastCheck, 7)) continue;
    lastCheck = day;
    const start = shiftDay(day, -window);
    const end = shiftDay(day, window);
    const beforeValues = series
      .filter((s) => s.day >= start && s.day < day)
      .map((s) => s.v);
    const afterValues = series
      .filter((s) => s.day >= day && s.day < end)
      .map((s) => s.v);
    // Avoid sparse patches or incomplete trailing windows masquerading as shifts.
    if (
      beforeValues.length < Math.ceil(window * 0.8) ||
      afterValues.length < Math.ceil(window * 0.8)
    )
      continue;
    const before = mean(beforeValues)!;
    const after = mean(afterValues)!;
    if (
      Math.abs(after - before) > sd &&
      (!lastHit || day >= shiftDay(lastHit, window))
    ) {
      out.push({ key, day, before, after });
      lastHit = day;
    }
  }
  return out.slice(-3);
}

/** A missing calendar day breaks a streak; old history cannot be a current run. */
export function streaksAndRecords(
  rows: DayRow[],
  key: string,
  threshold: number,
  today = localDay(),
) {
  const series = numericDays(rows, key).filter((s) => s.day <= today);
  let best = 0;
  let run = 0;
  let previousDay: string | null = null;
  for (const { day, v } of series) {
    if (previousDay && day !== shiftDay(previousDay, 1)) run = 0;
    run = v >= threshold ? run + 1 : 0;
    best = Math.max(best, run);
    previousDay = day;
  }
  const latest = series.at(-1);
  const current = latest && latest.day >= shiftDay(today, -1) ? run : 0;
  const record = series.reduce(
    (r, s) => (r === null || s.v > r.v ? s : r),
    null as { day: string; v: number } | null,
  );
  return { best, current, record, totalDays: series.length };
}

export interface WeeklyDeviation {
  key: string;
  weekMean: number;
  baseMean: number;
  zScore: number;
  weekN: number;
  baselineN: number;
}

/** Last seven calendar days vs the prior 60; SD is daily variability, not standard error. */
export function weeklyDeviations(
  rows: DayRow[],
  keys: string[],
  today = localDay(),
): WeeklyDeviation[] {
  const weekStart = shiftDay(today, -6);
  const baseStart = shiftDay(weekStart, -60);
  const out: WeeklyDeviation[] = [];
  for (const key of keys) {
    const series = numericDays(rows, key);
    const week = series
      .filter((r) => r.day >= weekStart && r.day <= today)
      .map((r) => r.v);
    const base = series
      .filter((r) => r.day >= baseStart && r.day < weekStart)
      .map((r) => r.v);
    if (week.length < 4 || base.length < 30) continue;
    const wm = mean(week)!;
    const bm = mean(base)!;
    const bs = std(base);
    if (!bs) continue;
    out.push({
      key,
      weekMean: wm,
      baseMean: bm,
      zScore: (wm - bm) / bs,
      weekN: week.length,
      baselineN: base.length,
    });
  }
  return out.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

/** Expand inclusive multi-day tags. No health values leave the browser. */
export function tagDaysInRange(
  tags: Pick<EnhancedTag, "start_day" | "end_day">[],
  endLimit = localDay(),
): Set<string> {
  const days = new Set<string>();
  for (const tag of tags) {
    if (!isDay(tag.start_day)) continue;
    const end = isDay(tag.end_day) ? tag.end_day : tag.start_day;
    const limit = end < endLimit ? end : endLimit;
    for (let day = tag.start_day; day <= limit; day = shiftDay(day, 1))
      days.add(day);
  }
  return days;
}

export interface TagImpact {
  key: string;
  withTag: number;
  without: number;
  delta: number;
  n: number;
  nWithout: number;
}

/** Unadjusted next-day associations; untagged days do not prove the habit was absent. */
export function tagImpact(
  rows: DayRow[],
  tagDays: Set<string>,
  keys: string[],
): TagImpact[] {
  const out: TagImpact[] = [];
  for (const key of keys) {
    const withVals: number[] = [];
    const withoutVals: number[] = [];
    for (const { day, v } of numericDays(rows, key)) {
      (tagDays.has(shiftDay(day, -1)) ? withVals : withoutVals).push(v);
    }
    if (withVals.length < 5 || withoutVals.length < 5) continue;
    const w = mean(withVals)!;
    const wo = mean(withoutVals)!;
    out.push({
      key,
      withTag: w,
      without: wo,
      delta: w - wo,
      n: withVals.length,
      nWithout: withoutVals.length,
    });
  }
  return out.sort(
    (a, b) =>
      Math.abs(b.delta / (b.without || 1)) -
      Math.abs(a.delta / (a.without || 1)),
  );
}
