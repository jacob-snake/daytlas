import { format, subDays } from "date-fns";
import type { DayRow } from "./oura/metrics";

// Local, inspectable statistics — no AI, no server. Every insight in the UI
// traces back to a function in this file.

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function std(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base] + rest * ((sorted[base + 1] ?? sorted[base]) - sorted[base]);
}

const numeric = (rows: DayRow[], key: string) =>
  rows
    .map((r) => ({ day: r.day as string, v: r[key] }))
    .filter((r): r is { day: string; v: number } => typeof r.v === "number");

/** 1. Rolling baseline: per-day mean ± σ over the trailing `window` days. */
export function withBaseline(rows: DayRow[], key: string, window = 60) {
  const series = numeric(rows, key);
  const values = series.map((s) => s.v);
  return rows.map((r) => {
    const idx = series.findIndex((s) => s.day === (r.day as string));
    if (idx < 0) return { ...r, baseline: null, band_low: null, band_high: null };
    const slice = values.slice(Math.max(0, idx - window), idx);
    const m = mean(slice);
    const s = std(slice);
    return {
      ...r,
      baseline: m === null ? null : Math.round(m * 100) / 100,
      band_low: m !== null && s !== null ? Math.round((m - s) * 100) / 100 : null,
      band_high: m !== null && s !== null ? Math.round((m + s) * 100) / 100 : null,
    };
  });
}

/** 2. Slope data: this window vs the previous one, per metric. */
export interface SlopeRow {
  key: string;
  prev: number;
  cur: number;
  changePct: number;
  improved: boolean;
}

// For these metrics, DOWN is good.
const LOWER_IS_BETTER = new Set(["avg_resting_hr", "lowest_resting_hr", "sleep_latency", "inactive_time", "non_wear", "awake_time"]);

export function slopeComparison(rows: DayRow[], keys: string[], windowDays = 30): SlopeRow[] {
  const today = new Date();
  const curStart = iso(subDays(today, windowDays));
  const prevStart = iso(subDays(today, windowDays * 2));
  const out: SlopeRow[] = [];
  for (const key of keys) {
    const cur = mean(numeric(rows, key).filter((r) => r.day >= curStart).map((r) => r.v));
    const prev = mean(
      numeric(rows, key)
        .filter((r) => r.day >= prevStart && r.day < curStart)
        .map((r) => r.v)
    );
    if (cur === null || prev === null || prev === 0) continue;
    const changePct = ((cur - prev) / Math.abs(prev)) * 100;
    const improved = LOWER_IS_BETTER.has(key) ? changePct < 0 : changePct > 0;
    out.push({ key, prev, cur, changePct, improved });
  }
  return out.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
}

/** 4. Weekday stats: median + IQR per weekday (Mon..Sun). */
export function weekdayStats(rows: DayRow[], key: string) {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const { day, v } of numeric(rows, key)) {
    buckets[(new Date(day).getDay() + 6) % 7].push(v);
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

/** 5. Changepoints: days where the 30d mean shifts by more than 1σ. */
export interface Changepoint {
  key: string;
  day: string;
  before: number;
  after: number;
}

export function changepoints(rows: DayRow[], key: string, window = 30): Changepoint[] {
  const series = numeric(rows, key);
  if (series.length < window * 3) return [];
  const sd = std(series.map((s) => s.v));
  if (!sd) return [];
  const out: Changepoint[] = [];
  let lastHit = -Infinity;
  for (let i = window; i + window <= series.length; i += 7) {
    const before = mean(series.slice(i - window, i).map((s) => s.v))!;
    const after = mean(series.slice(i, i + window).map((s) => s.v))!;
    if (Math.abs(after - before) > sd && i - lastHit >= window) {
      out.push({ key, day: series[i].day, before, after });
      lastHit = i;
    }
  }
  return out.slice(-3); // most recent shifts only
}

/** 6. Streaks & records. */
export function streaksAndRecords(rows: DayRow[], key: string, threshold: number) {
  const series = numeric(rows, key);
  let best = 0;
  let current = 0;
  let run = 0;
  for (const { v } of series) {
    run = v >= threshold ? run + 1 : 0;
    best = Math.max(best, run);
  }
  for (let i = series.length - 1; i >= 0 && series[i].v >= threshold; i--) current++;
  const record = series.reduce(
    (r, s) => (r === null || s.v > r.v ? s : r),
    null as { day: string; v: number } | null
  );
  return { best, current, record, totalDays: series.length };
}

/** 7. Weekly report: biggest deviations of the last 7 days vs 60d baseline. */
export interface WeeklyDeviation {
  key: string;
  weekMean: number;
  baseMean: number;
  zScore: number;
}

export function weeklyDeviations(rows: DayRow[], keys: string[]): WeeklyDeviation[] {
  const weekStart = iso(subDays(new Date(), 7));
  const baseStart = iso(subDays(new Date(), 67));
  const out: WeeklyDeviation[] = [];
  for (const key of keys) {
    const week = numeric(rows, key).filter((r) => r.day >= weekStart).map((r) => r.v);
    const base = numeric(rows, key)
      .filter((r) => r.day >= baseStart && r.day < weekStart)
      .map((r) => r.v);
    const wm = mean(week);
    const bm = mean(base);
    const bs = std(base);
    if (wm === null || bm === null || !bs) continue;
    out.push({ key, weekMean: wm, baseMean: bm, zScore: (wm - bm) / bs });
  }
  return out.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

/** 3. Tag impact: next-day metric means on tag days vs all other days. */
export interface TagImpact {
  key: string;
  withTag: number;
  without: number;
  delta: number;
  n: number;
}

export function tagImpact(rows: DayRow[], tagDays: Set<string>, keys: string[]): TagImpact[] {
  const out: TagImpact[] = [];
  for (const key of keys) {
    const series = numeric(rows, key);
    const withVals: number[] = [];
    const withoutVals: number[] = [];
    for (const { day, v } of series) {
      // Effect shows up the NEXT day (tag evening → next morning's readings).
      const prevDay = iso(subDays(new Date(day), 1));
      (tagDays.has(prevDay) ? withVals : withoutVals).push(v);
    }
    const w = mean(withVals);
    const wo = mean(withoutVals);
    if (w === null || wo === null || withVals.length < 5) continue;
    out.push({ key, withTag: w, without: wo, delta: w - wo, n: withVals.length });
  }
  return out.sort((a, b) => Math.abs(b.delta / (b.without || 1)) - Math.abs(a.delta / (a.without || 1)));
}
