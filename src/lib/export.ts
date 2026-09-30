import { fetchAll } from "./oura/client";
import { isDay } from "./dates";
import { mainSleepByDay } from "./oura/metrics";
import type {
  DailySleep,
  DailyReadiness,
  DailyActivity,
  SleepPeriod,
} from "./oura/types";

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

export type ExportRow = Record<string, string | number | null>;

interface ExportCollections {
  sleep: DailySleep[];
  readiness: DailyReadiness[];
  activity: DailyActivity[];
  periods: SleepPeriod[];
}

function validateOptions(opts: ExportOptions) {
  if (
    !isDay(opts.startDate) ||
    !isDay(opts.endDate) ||
    opts.startDate > opts.endDate
  ) {
    throw new Error("Choose a valid start and end date.");
  }
  if (!Object.values(opts.metrics).some(Boolean))
    throw new Error("Select at least one metric group.");
}

function dur(
  seconds: number | null,
  units: "hours" | "seconds",
): number | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return units === "hours" ? Math.round((seconds / 3600) * 100) / 100 : seconds;
}

export async function buildExport(opts: ExportOptions): Promise<ExportRow[]> {
  validateOptions(opts);
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

  return buildExportRows(opts, { sleep, readiness, activity, periods });
}

/** Pure construction for reliable tests and consistent main-sleep selection. */
export function buildExportRows(
  opts: ExportOptions,
  collections: ExportCollections,
): ExportRow[] {
  validateOptions(opts);
  const { sleep, readiness, activity, periods } = collections;
  const byDay = new Map<string, ExportRow>();
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
    for (const r of readiness)
      get(r.day).temperature_deviation_c = r.temperature_deviation;
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
    for (const p of mainSleepByDay(periods).values()) {
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

  // Include every selected column in every row; a missing value stays null,
  // never zero or an omitted field that shifts spreadsheet interpretation.
  const columns = ["day"];
  if (opts.metrics.scores)
    columns.push("sleep_score", "readiness_score", "activity_score");
  if (opts.metrics.temperature) columns.push("temperature_deviation_c");
  if (opts.metrics.steps) columns.push("steps", "active_calories");
  if (opts.metrics.sleepDetail) {
    const suffix = opts.units === "hours" ? "_h" : "_s";
    columns.push(
      "bedtime_start",
      "bedtime_end",
      ...["total_sleep", "deep_sleep", "rem_sleep", "light_sleep", "awake"].map(
        (c) => c + suffix,
      ),
      "sleep_efficiency_pct",
      "avg_hrv_ms",
      "avg_hr_bpm",
      "lowest_hr_bpm",
    );
  }
  return [...byDay.values()]
    .filter(
      (r) => isDay(r.day) && r.day >= opts.startDate && r.day <= opts.endDate,
    )
    .map((r) =>
      Object.fromEntries(
        columns.map((c) => [
          c,
          typeof r[c] === "number" && !Number.isFinite(r[c])
            ? null
            : (r[c] ?? null),
        ]),
      ),
    )
    .sort((a, b) => String(a.day).localeCompare(String(b.day)));
}

export function serializeExport(
  rows: ExportRow[],
  format: "csv" | "json",
): string {
  if (format === "json") return JSON.stringify(rows, null, 2);
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const escape = (v: string | number | null | undefined) => {
    let s =
      v == null || (typeof v === "number" && !Number.isFinite(v))
        ? ""
        : String(v);
    // Quoting alone does not stop spreadsheet formula execution. Protect text
    // cells and headers, while preserving legitimate negative numeric values.
    if (typeof v === "string" && (/^\s*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)))
      s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    cols.map(escape).join(","),
    ...rows.map((r) => cols.map((c) => escape(r[c])).join(",")),
  ].join("\r\n");
}

export function download(
  rows: ExportRow[],
  format: "csv" | "json",
  filename: string,
) {
  if (!rows.length)
    throw new Error("No records found for this date range and selection.");
  const content = serializeExport(rows, format);
  const blob = new Blob([format === "csv" ? `\uFEFF${content}` : content], {
    type:
      format === "json"
        ? "application/json;charset=utf-8"
        : "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // WebKit may begin consuming the URL after the click handler returns.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
