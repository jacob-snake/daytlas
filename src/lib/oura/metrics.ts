import { isDay, localDay, shiftDay } from "../dates";
import { fetchAll, getCacheScope, getMode } from "./client";
import type {
  DailySleep,
  DailyReadiness,
  DailyActivity,
  DailySpo2,
  SleepPeriod,
} from "./types";

// Wide per-day table covering every metric Oura on the Web offered.

export interface DayRow {
  day: string;
  [metric: string]: string | number | null;
}

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  group: "Scores" | "Sleep" | "Heart & Body" | "Activity";
}

export const METRICS: MetricDef[] = [
  { key: "sleep_score", label: "Sleep Score", unit: "", group: "Scores" },
  {
    key: "readiness_score",
    label: "Readiness Score",
    unit: "",
    group: "Scores",
  },
  { key: "activity_score", label: "Activity Score", unit: "", group: "Scores" },
  { key: "total_sleep", label: "Total Sleep", unit: "h", group: "Sleep" },
  { key: "time_in_bed", label: "Time in Bed", unit: "h", group: "Sleep" },
  { key: "deep_sleep", label: "Deep Sleep Time", unit: "h", group: "Sleep" },
  { key: "light_sleep", label: "Light Sleep Time", unit: "h", group: "Sleep" },
  { key: "rem_sleep", label: "REM Sleep Time", unit: "h", group: "Sleep" },
  { key: "awake_time", label: "Awake Time", unit: "h", group: "Sleep" },
  {
    key: "sleep_efficiency",
    label: "Sleep Efficiency",
    unit: "%",
    group: "Sleep",
  },
  { key: "sleep_latency", label: "Sleep Latency", unit: "min", group: "Sleep" },
  { key: "bedtime", label: "Bedtime", unit: "h", group: "Sleep" },
  { key: "wakeup_time", label: "Wake-up Time", unit: "h", group: "Sleep" },
  { key: "midpoint", label: "Midpoint", unit: "h", group: "Sleep" },
  { key: "avg_hrv", label: "Average HRV", unit: "ms", group: "Heart & Body" },
  {
    key: "avg_resting_hr",
    label: "Average Resting HR",
    unit: "bpm",
    group: "Heart & Body",
  },
  {
    key: "lowest_resting_hr",
    label: "Lowest Resting HR",
    unit: "bpm",
    group: "Heart & Body",
  },
  {
    key: "respiratory_rate",
    label: "Respiratory Rate",
    unit: "/min",
    group: "Heart & Body",
  },
  {
    key: "avg_spo2",
    label: "Average Oxygen Saturation",
    unit: "%",
    group: "Heart & Body",
  },
  {
    key: "temp_deviation",
    label: "Temperature Deviation",
    unit: "°C",
    group: "Heart & Body",
  },
  {
    key: "temp_trend_deviation",
    label: "Temperature Trend Deviation",
    unit: "°C",
    group: "Heart & Body",
  },
  { key: "steps", label: "Steps", unit: "", group: "Activity" },
  {
    key: "activity_burn",
    label: "Activity Burn",
    unit: "kcal",
    group: "Activity",
  },
  { key: "total_burn", label: "Total Burn", unit: "kcal", group: "Activity" },
  { key: "avg_met", label: "Average MET", unit: "", group: "Activity" },
  {
    key: "walking_equivalency",
    label: "Walking Equivalency",
    unit: "km",
    group: "Activity",
  },
  {
    key: "high_activity",
    label: "High Activity",
    unit: "h",
    group: "Activity",
  },
  {
    key: "medium_activity",
    label: "Medium Activity",
    unit: "h",
    group: "Activity",
  },
  { key: "low_activity", label: "Low Activity", unit: "h", group: "Activity" },
  {
    key: "inactive_time",
    label: "Inactive Time",
    unit: "h",
    group: "Activity",
  },
  { key: "resting_time", label: "Resting Time", unit: "h", group: "Activity" },
  { key: "non_wear", label: "Non-wear Time", unit: "h", group: "Activity" },
];

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m]));

const h = (sec: number | null | undefined) =>
  typeof sec !== "number" || !Number.isFinite(sec)
    ? null
    : Math.round((sec / 3600) * 100) / 100;

/** The clock recorded in the timestamp, preserved when viewing in another timezone. */
export function clockHours(iso: string, shiftEvening: boolean): number | null {
  const clock = /T(\d{2}):(\d{2})/.exec(iso);
  if (!clock || !Number.isFinite(Date.parse(iso))) return null;
  let v = Number(clock[1]) + Number(clock[2]) / 60;
  if (Number(clock[1]) > 23 || Number(clock[2]) > 59) return null;
  if (shiftEvening && v < 12) v += 24; // 1:30 am bedtime → 25.5 so averages behave
  return Math.round(v * 100) / 100;
}

/** One main sleep per day, used consistently by charts and exports. */
export function mainSleepByDay(
  periods: SleepPeriod[],
): Map<string, SleepPeriod> {
  const main = new Map<string, SleepPeriod>();
  const duration = (p: SleepPeriod) =>
    p.total_sleep_duration ?? p.time_in_bed ?? 0;
  for (const p of periods) {
    if (p.type === "rest" || !isDay(p.day)) continue;
    const prev = main.get(p.day);
    if (
      !prev ||
      duration(p) > duration(prev) ||
      (duration(p) === duration(prev) && p.bedtime_start < prev.bedtime_start)
    ) {
      main.set(p.day, p);
    }
  }
  return main;
}

export async function fetchWide(
  startDate: string,
  endDate: string,
): Promise<DayRow[]> {
  const range = { start_date: startDate, end_date: endDate };
  const [sleep, readiness, activity, spo2, periods] = await Promise.all([
    fetchAll<DailySleep>("daily_sleep", range),
    fetchAll<DailyReadiness>("daily_readiness", range),
    fetchAll<DailyActivity>("daily_activity", range),
    fetchAll<DailySpo2>("daily_spo2", range).catch(() => [] as DailySpo2[]),
    fetchAll<SleepPeriod>("sleep", range),
  ]);

  return mergeWide(
    { sleep, readiness, activity, spo2, periods },
    startDate,
    endDate,
  );
}

/** Pure merge makes unit/date handling testable without requesting health data. */
export function mergeWide(
  collections: {
    sleep: DailySleep[];
    readiness: DailyReadiness[];
    activity: DailyActivity[];
    spo2: DailySpo2[];
    periods: SleepPeriod[];
  },
  startDate = "0000-01-01",
  endDate = "9999-12-31",
): DayRow[] {
  const { sleep, readiness, activity, spo2, periods } = collections;
  const byDay = new Map<string, DayRow>();
  const get = (day: string) => {
    let r = byDay.get(day);
    if (!r) {
      r = { day };
      byDay.set(day, r);
    }
    return r;
  };

  for (const s of sleep) get(s.day).sleep_score = s.score;
  for (const r of readiness) {
    const row = get(r.day);
    row.readiness_score = r.score;
    row.temp_deviation = r.temperature_deviation;
    row.temp_trend_deviation = r.temperature_trend_deviation;
  }
  for (const a of activity) {
    const row = get(a.day);
    row.activity_score = a.score;
    row.steps = a.steps;
    row.activity_burn = a.active_calories;
    row.total_burn = a.total_calories;
    row.avg_met = a.average_met_minutes;
    row.walking_equivalency =
      a.equivalent_walking_distance == null
        ? null
        : Math.round((a.equivalent_walking_distance / 1000) * 100) / 100;
    row.high_activity = h(a.high_activity_time);
    row.medium_activity = h(a.medium_activity_time);
    row.low_activity = h(a.low_activity_time);
    row.inactive_time = h(a.sedentary_time);
    row.resting_time = h(a.resting_time);
    row.non_wear = h(a.non_wear_time);
  }
  for (const s of spo2)
    get(s.day).avg_spo2 = s.spo2_percentage?.average ?? null;

  // Longest sleep period per day carries the night metrics.
  const mainByDay = mainSleepByDay(periods);
  for (const [day, p] of mainByDay) {
    const row = get(day);
    row.total_sleep = h(p.total_sleep_duration);
    row.time_in_bed = h(p.time_in_bed);
    row.deep_sleep = h(p.deep_sleep_duration);
    row.light_sleep = h(p.light_sleep_duration);
    row.rem_sleep = h(p.rem_sleep_duration);
    row.awake_time = h(p.awake_time);
    row.sleep_efficiency = p.efficiency;
    row.sleep_latency = p.latency == null ? null : Math.round(p.latency / 60);
    row.avg_hrv = p.average_hrv;
    row.avg_resting_hr = p.average_heart_rate;
    row.lowest_resting_hr = p.lowest_heart_rate;
    row.respiratory_rate = p.average_breath;
    row.bedtime = clockHours(p.bedtime_start, true);
    row.wakeup_time = clockHours(p.bedtime_end, false);
    const start = clockHours(p.bedtime_start, false);
    const end = clockHours(p.bedtime_end, false);
    const nights =
      (Date.parse(`${p.bedtime_end.slice(0, 10)}T00:00:00Z`) -
        Date.parse(`${p.bedtime_start.slice(0, 10)}T00:00:00Z`)) /
      86_400_000;
    row.midpoint =
      start === null || end === null || !Number.isFinite(nights)
        ? null
        : Math.round(((start + (end + nights * 24 - start) / 2) % 24) * 100) /
          100;
  }

  return [...byDay.values()]
    .filter((r) => isDay(r.day) && r.day >= startDate && r.day <= endDate)
    .map(
      (r) =>
        Object.fromEntries(
          Object.entries(r).map(([key, value]) => [
            key,
            key === "day"
              ? value
              : typeof value === "number" && Number.isFinite(value)
                ? value
                : null,
          ]),
        ) as DayRow,
    )
    .sort((a, b) => a.day.localeCompare(b.day));
}

export type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export const CLOCK_METRICS = new Set(["bedtime", "wakeup_time", "midpoint"]);

/** Circular mean: 23:00 and 01:00 average to midnight, never noon. */
function meanClock(values: number[], shiftEvening: boolean): number | null {
  const sin = values.reduce(
    (sum, v) => sum + Math.sin((v / 24) * 2 * Math.PI),
    0,
  );
  const cos = values.reduce(
    (sum, v) => sum + Math.cos((v / 24) * 2 * Math.PI),
    0,
  );
  if (Math.hypot(sin, cos) < 1e-8) return null;
  let value = ((Math.atan2(sin, cos) / (2 * Math.PI)) * 24 + 24) % 24;
  if (shiftEvening && value < 12) value += 24;
  return Math.round(value * 100) / 100;
}

const FIRST_DAY_KEY = "daytlas.firstDay.v3";

/**
 * Earliest activity record, scoped to the current connection. Demo is wholly
 * local; a failed history probe must not be saved as a definitive start date.
 */
export async function detectFirstDay(): Promise<string> {
  if (getMode() === "demo") return "2025-01-01";
  if (getMode() === "import") {
    const { importedData } = await import("@/lib/idb-cache");
    const data = await importedData<import("./import-file").OuraImport>();
    if (!data)
      throw new Error("Import your Oura file again to restore this history.");
    return data.firstDay;
  }
  const scope = getCacheScope();
  const key = `${FIRST_DAY_KEY}.${scope}`;
  const cached = window.localStorage.getItem(key);
  if (isDay(cached)) return cached;

  const fallback = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return localDay(d);
  })();

  // Probe year by year from the first Oura ring generation. Small requests
  // survive API range limits; each probe is cached in IndexedDB anyway.
  let first: string | null = null;
  let complete = true;
  const thisYear = new Date().getFullYear();
  for (let y = 2015; y <= thisYear && !first; y++) {
    try {
      const probe = await fetchAll<{ day: string }>("daily_activity", {
        start_date: `${y}-01-01`,
        end_date: `${y}-12-31`,
      });
      const days = probe.map((p) => p.day).sort();
      if (days[0]) first = days[0];
    } catch (error) {
      // A disconnected or expired session is actionable, not empty history.
      if (
        error instanceof Error &&
        "status" in error &&
        (error.status === 401 || error.status === 403)
      )
        throw error;
      complete = false;
    }
  }

  const result = first ?? fallback;
  if (first && complete && scope === getCacheScope())
    window.localStorage.setItem(key, result);
  return result;
}

/** Average rows into weekly/monthly buckets (daily = passthrough). */
export function aggregate(rows: DayRow[], period: Period): DayRow[] {
  if (period === "daily") return rows;
  const buckets = new Map<string, DayRow[]>();
  for (const r of rows) {
    if (!isDay(r.day)) continue;
    const d = new Date(`${r.day}T00:00:00Z`);
    let key: string;
    if (period === "yearly") {
      key = `${d.getUTCFullYear()}-01-01`;
    } else if (period === "quarterly") {
      const qMonth = Math.floor(d.getUTCMonth() / 3) * 3 + 1;
      key = `${d.getUTCFullYear()}-${String(qMonth).padStart(2, "0")}-01`;
    } else if (period === "monthly") {
      key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    } else {
      key = shiftDay(r.day, -((d.getUTCDay() + 6) % 7));
    }
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(r);
  }
  return [...buckets.entries()]
    .map(([day, group]) => {
      const out: DayRow = { day };
      for (const m of METRICS) {
        const vals = group
          .map((g) => g[m.key])
          .filter(
            (v): v is number => typeof v === "number" && Number.isFinite(v),
          );
        out[m.key] = !vals.length
          ? null
          : CLOCK_METRICS.has(m.key)
            ? meanClock(vals, m.key === "bedtime")
            : Math.round(
                (vals.reduce((a, b) => a + b, 0) / vals.length) * 100,
              ) / 100;
      }
      return out;
    })
    .sort((a, b) => (a.day as string).localeCompare(b.day as string));
}
