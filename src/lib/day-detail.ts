import { isDay, localDay, parseDay, shiftDay } from "./dates";
import type { PublicSample, SleepPeriod, HeartRateSample } from "./oura/types";

export type SamplePoint = { time: number; value: number | null };
export function samplePoints(
  sample?: PublicSample | null,
  start = -Infinity,
  end = Infinity,
): SamplePoint[] {
  if (
    !sample ||
    !Array.isArray(sample.items) ||
    !Number.isFinite(sample.interval) ||
    sample.interval <= 0
  )
    return [];
  const first = Date.parse(sample.timestamp);
  if (!Number.isFinite(first)) return [];
  return sample.items
    .map((value, i) => ({
      time: first + i * sample.interval * 1000,
      value:
        typeof value === "number" && Number.isFinite(value) && value >= 0
          ? value
          : null,
    }))
    .filter((p) => p.time >= start && p.time < end);
}
export function baseline<T extends { day: string }>(
  rows: T[],
  day: string,
  get: (row: T) => number | null | undefined,
) {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const value = get(row);
    if (
      isDay(row.day) &&
      row.day >= shiftDay(day, -30) &&
      row.day < day &&
      typeof value === "number" &&
      Number.isFinite(value)
    )
      byDay.set(row.day, value);
  }
  const values = [...byDay.values()];
  return {
    count: values.length,
    average:
      values.length >= 5
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
  };
}
export function sleepStages(period: SleepPeriod) {
  const source = period.sleep_phase_30_sec || period.sleep_phase_5_min || "";
  const interval = period.sleep_phase_30_sec ? 30000 : 300000;
  const start = Date.parse(period.bedtime_start),
    end = Date.parse(period.bedtime_end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return [];
  const result: { start: number; end: number; stage: number }[] = [];
  for (let i = 0; i < source.length && start + i * interval < end; i++) {
    const stage = Number(source[i]);
    if (![1, 2, 3, 4].includes(stage)) continue;
    const from = start + i * interval,
      to = Math.min(end, from + interval),
      last = result.at(-1);
    if (last && last.stage === stage && last.end === from) last.end = to;
    else result.push({ start: from, end: to, stage });
  }
  return result;
}
export function dayBounds(day: string) {
  return {
    start: parseDay(day).getTime(),
    end: parseDay(shiftDay(day, 1)).getTime(),
  };
}
/** Gaps over 15 minutes stay visible; duplicate instants are combined. */
export function heartPoints(
  rows: HeartRateSample[],
  day: string,
): SamplePoint[] {
  const { start, end } = dayBounds(day);
  const values = new Map<number, number[]>();
  for (const row of rows) {
    const time = Date.parse(row.timestamp);
    if (
      time < start ||
      time >= end ||
      !Number.isFinite(time) ||
      !Number.isFinite(row.bpm) ||
      row.bpm <= 0
    )
      continue;
    values.set(time, [...(values.get(time) ?? []), row.bpm]);
  }
  const result: SamplePoint[] = [];
  for (const [time, samples] of [...values].sort((a, b) => a[0] - b[0])) {
    const last = result.at(-1);
    if (last && time - last.time > 900000)
      result.push({ time: last.time + 1, value: null });
    result.push({
      time,
      value: samples.reduce((a, b) => a + b, 0) / samples.length,
    });
  }
  return result;
}
export function daytimeAverages(rows: HeartRateSample[]) {
  const days = new Map<string, Map<number, number>>();
  for (const row of rows) {
    const date = new Date(row.timestamp);
    if (
      !Number.isFinite(date.getTime()) ||
      !["awake", "rest"].includes(row.source) ||
      !Number.isFinite(row.bpm) ||
      row.bpm <= 0
    )
      continue;
    const day = localDay(date),
      values = days.get(day) ?? new Map<number, number>();
    values.set(date.getTime(), row.bpm);
    days.set(day, values);
  }
  return [...days].map(([day, values]) => ({
    day,
    value: [...values.values()].reduce((a, b) => a + b, 0) / values.size,
  }));
}

/** Nearest recorded instant, never across an explicit gap or >5 minutes away. */
export function sampleAtTime(points: readonly SamplePoint[], time: number) {
  if (
    !points.length ||
    !Number.isFinite(time) ||
    time < points[0].time ||
    time > points[points.length - 1].time
  )
    return null;
  let low = 0,
    high = points.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].time < time) low = mid + 1;
    else high = mid;
  }
  const after = points[low],
    before = points[Math.max(0, low - 1)];
  if (after.time === time) return after.value === null ? null : after;
  if (before.value === null || after.value === null) return null;
  const nearest = time - before.time <= after.time - time ? before : after;
  return Math.abs(nearest.time - time) <= 300000 ? nearest : null;
}
