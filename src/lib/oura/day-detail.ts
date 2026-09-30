import { fetchAll } from "./client";
import { dayBounds } from "../day-detail";
import { shiftDay } from "../dates";
import type {
  DailyActivity,
  DailyReadiness,
  DailySleep,
  HeartRateSample,
  SleepPeriod,
} from "./types";

export async function fetchDayDetail(end: string, fresh = false) {
  const range = { start_date: shiftDay(end, -60), end_date: end };
  const [sleep, readiness, activity, periods] = await Promise.allSettled([
    fetchAll<DailySleep>("daily_sleep", range, { fresh }),
    fetchAll<DailyReadiness>("daily_readiness", range, { fresh }),
    fetchAll<DailyActivity>("daily_activity", range, { fresh }),
    fetchAll<SleepPeriod>("sleep", range, { fresh }),
  ]);
  const data = <T>(result: PromiseSettledResult<T[]>) =>
    result.status === "fulfilled" ? result.value : [];
  const failures = [sleep, readiness, activity, periods].filter(
    (r) => r.status === "rejected",
  ).length;
  if (failures === 4 && sleep.status === "rejected") throw sleep.reason;
  return {
    sleep: data(sleep),
    readiness: data(readiness),
    activity: data(activity),
    periods: data(periods),
    failures,
    fetchedAt: Date.now(),
  };
}
/** Seven-day chunks respect the HR endpoint's bounded range and pagination. */
export async function fetchDayHeartRate(day: string) {
  const chunks = Array.from({ length: 5 }, (_, i) => {
    const first = shiftDay(day, -30 + i * 7),
      last = shiftDay(day, Math.min(0, -24 + i * 7));
    return {
      start_datetime: new Date(dayBounds(first).start).toISOString(),
      end_datetime: new Date(dayBounds(last).end - 1).toISOString(),
    };
  });
  const results = await Promise.allSettled(
    chunks.map((range) => fetchAll<HeartRateSample>("heartrate", range)),
  );
  if (results.every((r) => r.status === "rejected")) {
    const failure = results.find((r) => r.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }
  return {
    rows: results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
    partial: results.some((r) => r.status === "rejected"),
  };
}
