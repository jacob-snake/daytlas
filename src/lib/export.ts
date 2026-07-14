import { fetchAll } from "./oura/client";
import type { DailySleep, DailyReadiness, DailyActivity, SleepPeriod } from "./oura/types";

export interface ExportOptions {
  startDate: string;
  endDate: string;
  metrics: {
    scores: boolean;
    sleepDetail: boolean;
    temperature: boolean;
    steps: boolean;
  };
  format: "csv" | "json";
  /** Durations in hours (human) or raw seconds (as Oura returns them). */
  units: "hours" | "seconds";
}

type Row = Record<string, string | number | null>;

function dur(seconds: number | null, units: "hours" | "seconds"): number | null {
  if (seconds === null) return null;
  return units === "hours" ? Math.round((seconds / 3600) * 100) / 100 : seconds;
}

export async function buildExport(opts: ExportOptions): Promise<Row[]> {
  const range = { start_date: opts.startDate, end_date: opts.endDate };
  const [sleep, readiness, activity, periods] = await Promise.all([
    opts.metrics.scores ? fetchAll<DailySleep>("daily_sleep", range) : [],
    opts.metrics.scores || opts.metrics.temperature
      ? fetchAll<DailyReadiness>("daily_readiness", range)
      : [],
    opts.metrics.scores || opts.metrics.steps
      ? fetchAll<DailyActivity>("daily_activity", range)
      : [],
    opts.metrics.sleepDetail ? fetchAll<SleepPeriod>("sleep", range) : [],
  ]);

  const byDay = new Map<string, Row>();
  const get = (day: string) => {
    let r = byDay.get(day);
    if (!r) {
      r = { day };
      byDay.set(day, r);
    }
    return r;
  };

  if (opts.metrics.scores) {
    for (const s of sleep) get(s.day).sleep_score = s.score;
    for (const r of readiness) get(r.day).readiness_score = r.score;
    for (const a of activity) get(a.day).activity_score = a.score;
  }
  if (opts.metrics.temperature) {
    for (const r of readiness) get(r.day).temperature_deviation_c = r.temperature_deviation;
  }
  if (opts.metrics.steps) {
    for (const a of activity) {
      const row = get(a.day);
      row.steps = a.steps;
      row.active_calories = a.active_calories;
    }
  }
  if (opts.metrics.sleepDetail) {
    const u = opts.units;
    const suffix = u === "hours" ? "_h" : "_s";
    for (const p of periods.filter((p) => p.type !== "rest")) {
      const row = get(p.day);
      row.bedtime_start = p.bedtime_start;
      row.bedtime_end = p.bedtime_end;
      row[`total_sleep${suffix}`] = dur(p.total_sleep_duration, u);
      row[`deep_sleep${suffix}`] = dur(p.deep_sleep_duration, u);
      row[`rem_sleep${suffix}`] = dur(p.rem_sleep_duration, u);
      row[`light_sleep${suffix}`] = dur(p.light_sleep_duration, u);
      row[`awake${suffix}`] = dur(p.awake_time, u);
      row.sleep_efficiency_pct = p.efficiency;
      row.avg_hrv_ms = p.average_hrv;
      row.avg_hr_bpm = p.average_heart_rate;
      row.lowest_hr_bpm = p.lowest_heart_rate;
    }
  }

  return [...byDay.values()].sort((a, b) => String(a.day).localeCompare(String(b.day)));
}

export function download(rows: Row[], format: "csv" | "json", filename: string) {
  let blob: Blob;
  if (format === "json") {
    blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  } else {
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const escape = (v: string | number | null) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c] ?? null)).join(","))];
    blob = new Blob([lines.join("\n")], { type: "text/csv" });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
