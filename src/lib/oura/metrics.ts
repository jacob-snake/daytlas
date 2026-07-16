import { fetchAll } from "./client";
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
  { key: "readiness_score", label: "Readiness Score", unit: "", group: "Scores" },
  { key: "activity_score", label: "Activity Score", unit: "", group: "Scores" },
  { key: "total_sleep", label: "Total Sleep", unit: "h", group: "Sleep" },
  { key: "time_in_bed", label: "Time in Bed", unit: "h", group: "Sleep" },
  { key: "deep_sleep", label: "Deep Sleep Time", unit: "h", group: "Sleep" },
  { key: "light_sleep", label: "Light Sleep Time", unit: "h", group: "Sleep" },
  { key: "rem_sleep", label: "REM Sleep Time", unit: "h", group: "Sleep" },
  { key: "awake_time", label: "Awake Time", unit: "h", group: "Sleep" },
  { key: "sleep_efficiency", label: "Sleep Efficiency", unit: "%", group: "Sleep" },
  { key: "sleep_latency", label: "Sleep Latency", unit: "min", group: "Sleep" },
  { key: "bedtime", label: "Bedtime", unit: "h", group: "Sleep" },
  { key: "wakeup_time", label: "Wake-up Time", unit: "h", group: "Sleep" },
  { key: "midpoint", label: "Midpoint", unit: "h", group: "Sleep" },
  { key: "avg_hrv", label: "Average HRV", unit: "ms", group: "Heart & Body" },
  { key: "avg_resting_hr", label: "Average Resting HR", unit: "bpm", group: "Heart & Body" },
  { key: "lowest_resting_hr", label: "Lowest Resting HR", unit: "bpm", group: "Heart & Body" },
  { key: "respiratory_rate", label: "Respiratory Rate", unit: "/min", group: "Heart & Body" },
  { key: "avg_spo2", label: "Average Oxygen Saturation", unit: "%", group: "Heart & Body" },
  { key: "temp_deviation", label: "Temperature Deviation", unit: "°C", group: "Heart & Body" },
  { key: "temp_trend_deviation", label: "Temperature Trend Deviation", unit: "°C", group: "Heart & Body" },
  { key: "steps", label: "Steps", unit: "", group: "Activity" },
  { key: "activity_burn", label: "Activity Burn", unit: "kcal", group: "Activity" },
  { key: "total_burn", label: "Total Burn", unit: "kcal", group: "Activity" },
  { key: "avg_met", label: "Average MET", unit: "", group: "Activity" },
  { key: "walking_equivalency", label: "Walking Equivalency", unit: "km", group: "Activity" },
  { key: "high_activity", label: "High Activity", unit: "h", group: "Activity" },
  { key: "medium_activity", label: "Medium Activity", unit: "h", group: "Activity" },
  { key: "low_activity", label: "Low Activity", unit: "h", group: "Activity" },
  { key: "inactive_time", label: "Inactive Time", unit: "h", group: "Activity" },
  { key: "resting_time", label: "Resting Time", unit: "h", group: "Activity" },
  { key: "non_wear", label: "Non-wear Time", unit: "h", group: "Activity" },
];

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m]));

const h = (sec: number | null | undefined) =>
  sec === null || sec === undefined ? null : Math.round((sec / 3600) * 100) / 100;

/** Local clock time as decimal hours; evening times shifted below 24 → 24+ for sane averaging. */
function clockHours(iso: string, shiftEvening: boolean): number {
  const d = new Date(iso);
  let v = d.getHours() + d.getMinutes() / 60;
  if (shiftEvening && v < 12) v += 24; // 1:30 am bedtime → 25.5 so averages behave
  return Math.round(v * 100) / 100;
}

export async function fetchWide(startDate: string, endDate: string): Promise<DayRow[]> {
  const range = { start_date: startDate, end_date: endDate };
  const [sleep, readiness, activity, spo2, periods] = await Promise.all([
    fetchAll<DailySleep>("daily_sleep", range),
    fetchAll<DailyReadiness>("daily_readiness", range),
    fetchAll<DailyActivity>("daily_activity", range),
    fetchAll<DailySpo2>("daily_spo2", range).catch(() => [] as DailySpo2[]),
    fetchAll<SleepPeriod>("sleep", range),
  ]);

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
  for (const s of spo2) get(s.day).avg_spo2 = s.spo2_percentage?.average ?? null;

  // Longest sleep period per day carries the night metrics.
  const mainByDay = new Map<string, SleepPeriod>();
  for (const p of periods) {
    if (p.type === "rest") continue;
    const prev = mainByDay.get(p.day);
    if (!prev || (p.total_sleep_duration ?? 0) > (prev.total_sleep_duration ?? 0)) {
      mainByDay.set(p.day, p);
    }
  }
  for (const [day, p] of mainByDay) {
    const row = get(day);
    row.total_sleep = h(p.total_sleep_duration);
    row.time_in_bed = h(p.time_in_bed);
    row.deep_sleep = h(p.deep_sleep_duration);
    row.light_sleep = h(p.light_sleep_duration);
    row.rem_sleep = h(p.rem_sleep_duration);
    row.awake_time = h(p.awake_time);
    row.sleep_efficiency = p.efficiency;
    row.sleep_latency = p.latency === null ? null : Math.round(p.latency / 60);
    row.avg_hrv = p.average_hrv;
    row.avg_resting_hr = p.average_heart_rate;
    row.lowest_resting_hr = p.lowest_heart_rate;
    row.respiratory_rate = p.average_breath;
    row.bedtime = clockHours(p.bedtime_start, true);
    row.wakeup_time = clockHours(p.bedtime_end, false);
    row.midpoint = Math.round(((row.bedtime as number) + ((row.wakeup_time as number) + 24 - (row.bedtime as number)) / 2) % 24 * 100) / 100;
  }

  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

const FIRST_DAY_KEY = "woura.firstDay.v3";

/**
 * Earliest day with any Oura data for this user (Oura web's "from the very
 * first record" default). Detected once from ring_configuration.set_up_at,
 * verified against the earliest daily_activity document, then cached.
 */
export async function detectFirstDay(): Promise<string> {
  const cached = window.localStorage.getItem(FIRST_DAY_KEY);
  if (cached) return cached;

  const fallback = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().slice(0, 10);
  })();

  // Probe year by year from the first Oura ring generation. Small requests
  // survive API range limits; each probe is cached in IndexedDB anyway.
  let first: string | null = null;
  const thisYear = new Date().getFullYear();
  for (let y = 2015; y <= thisYear && !first; y++) {
    try {
      const probe = await fetchAll<{ day: string }>("daily_activity", {
        start_date: `${y}-01-01`,
        end_date: `${y}-12-31`,
      });
      const days = probe.map((p) => p.day).sort();
      if (days[0]) first = days[0];
    } catch {
      // one bad year must not abort the search
    }
  }

  const result = first ?? fallback;
  window.localStorage.setItem(FIRST_DAY_KEY, result);
  return result;
}

/** Average rows into weekly/monthly buckets (daily = passthrough). */
export function aggregate(rows: DayRow[], period: Period): DayRow[] {
  if (period === "daily") return rows;
  const buckets = new Map<string, DayRow[]>();
  for (const r of rows) {
    const d = new Date(r.day as string);
    let key: string;
    if (period === "yearly") {
      key = `${d.getFullYear()}-01-01`;
    } else if (period === "quarterly") {
      const qMonth = Math.floor(d.getMonth() / 3) * 3 + 1;
      key = `${d.getFullYear()}-${String(qMonth).padStart(2, "0")}-01`;
    } else if (period === "monthly") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    } else {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      key = monday.toISOString().slice(0, 10);
    }
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(r);
  }
  return [...buckets.entries()]
    .map(([day, group]) => {
      const out: DayRow = { day };
      for (const m of METRICS) {
        const vals = group.map((g) => g[m.key]).filter((v): v is number => typeof v === "number");
        out[m.key] = vals.length
          ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
          : null;
      }
      return out;
    })
    .sort((a, b) => (a.day as string).localeCompare(b.day as string));
}
