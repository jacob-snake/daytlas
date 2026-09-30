import { fetchAll } from "./client";
import type {
  DailySleep,
  DailyReadiness,
  DailyActivity,
  SleepPeriod,
} from "./types";
import { localDay, shiftDay } from "../dates";
import { mainSleepByDay } from "./metrics";

export interface DayScores {
  day: string;
  sleep: number | null;
  readiness: number | null;
  activity: number | null;
  temperature_deviation: number | null;
  resting_hr: number | null;
  steps: number | null;
  hrv: number | null;
  total_sleep_h: number | null;
}

function isoDaysAgo(days: number): string {
  return shiftDay(localDay(), -days);
}

/** Fetch the three daily score collections and merge them per day. */
export async function fetchDayScores(days: number): Promise<DayScores[]> {
  const range = {
    start_date: isoDaysAgo(Math.max(0, days - 1)),
    end_date: isoDaysAgo(0),
  };
  const [sleep, readiness, activity, periods] = await Promise.all([
    fetchAll<DailySleep>("daily_sleep", range),
    fetchAll<DailyReadiness>("daily_readiness", range),
    fetchAll<DailyActivity>("daily_activity", range),
    fetchAll<SleepPeriod>("sleep", range),
  ]);

  const byDay = new Map<string, DayScores>();
  const get = (day: string) => {
    let row = byDay.get(day);
    if (!row) {
      row = {
        day,
        sleep: null,
        readiness: null,
        activity: null,
        temperature_deviation: null,
        resting_hr: null,
        steps: null,
        hrv: null,
        total_sleep_h: null,
      };
      byDay.set(day, row);
    }
    return row;
  };

  for (const s of sleep) get(s.day).sleep = s.score;
  for (const r of readiness) {
    const row = get(r.day);
    row.readiness = r.score;
    row.temperature_deviation = r.temperature_deviation;
  }
  for (const a of activity) {
    const row = get(a.day);
    row.activity = a.score;
    row.steps = a.steps;
  }

  // Take the longest (main) sleep period per day for vitals.
  const mainByDay = mainSleepByDay(periods);
  for (const [day, p] of mainByDay) {
    const row = get(day);
    row.hrv = p.average_hrv;
    row.resting_hr = p.lowest_heart_rate;
    row.total_sleep_h =
      p.total_sleep_duration == null
        ? null
        : Math.round((p.total_sleep_duration / 3600) * 100) / 100;
  }

  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}
