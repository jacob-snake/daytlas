import { localDay } from "./dates";
import type { OuraRange } from "./oura/client";

/** Invented deterministic examples. Never derived from a person's health data. */
export const DEMO_START = "2025-01-01";
const sampleTag = (dayIndex: number) =>
  dayIndex % 7 === 0
    ? "Evening walk"
    : dayIndex % 5 === 0
      ? "Late meal"
      : dayIndex % 3 === 0
        ? "Reading before bed"
        : null;
export function getDemoCollection<T>(
  endpoint: string,
  range: OuraRange = {},
): T[] {
  if (endpoint === "ring_configuration")
    return [{ id: "demo-ring", set_up_at: DEMO_START }] as T[];
  const first = Date.parse(DEMO_START + "T00:00:00Z");
  const today = localDay();
  const last = Date.parse(today + "T00:00:00Z");
  const from =
    range.start_date ?? range.start_datetime?.slice(0, 10) ?? DEMO_START;
  const to = range.end_date ?? range.end_datetime?.slice(0, 10) ?? today;
  const records: unknown[] = [];
  const clamp = (n: number) => Math.max(55, Math.min(97, Math.round(n)));
  for (let stamp = first, i = 0; stamp <= last; stamp += 86400000, i++) {
    const day = new Date(stamp).toISOString().slice(0, 10);
    if (day < from || day > to) continue;
    const wave = Math.sin(i * 0.19) * 5 + Math.sin(i * 1.37) * 4;
    const trend = Math.sin(i / 85) * 3;
    // Deliberately invented associations make the comparison UI demonstrable.
    // These offsets are illustrative, not estimates of a habit's real effect.
    const previousTag = sampleTag(i - 1);
    const sampleOffset =
      previousTag === "Evening walk"
        ? 2.4
        : previousTag === "Late meal"
          ? -3.2
          : previousTag === "Reading before bed"
            ? 1.2
            : 0;
    const sleep = clamp(81 + wave + trend + sampleOffset);
    const readiness = clamp(
      80 + wave * 0.75 + Math.cos(i * 0.68) * 5 + trend + sampleOffset * 0.7,
    );
    const activity = clamp(83 + Math.sin(i * 0.61) * 10 + Math.cos(i / 9) * 3);
    const duration = Math.round(
      (7.35 + wave * 0.055 + sampleOffset * 0.08) * 3600,
    );
    const bedtime = new Date(
      stamp - 86400000 + (23.1 + Math.sin(i * 0.4) * 0.55) * 3600000,
    );
    const shared = { id: `demo-${endpoint}-${day}`, day };
    const steps = Math.round(7600 + Math.sin(i * 0.6) * 2900 + activity * 12);
    let value: unknown;
    switch (endpoint) {
      case "daily_sleep":
        value = {
          ...shared,
          score: sleep,
          timestamp: day + "T07:00:00+00:00",
          contributors: {
            deep_sleep: 85,
            efficiency: 91,
            latency: 88,
            rem_sleep: 83,
            restfulness: 82,
            timing: 90,
            total_sleep: sleep,
          },
        };
        break;
      case "daily_readiness":
        value = {
          ...shared,
          score: readiness,
          temperature_deviation: Math.round(Math.sin(i * 0.5) * 15) / 100,
          temperature_trend_deviation: Math.round(Math.sin(i / 12) * 8) / 100,
          contributors: {
            activity_balance: 84,
            body_temperature: 96,
            hrv_balance: readiness,
            previous_day_activity: activity,
            previous_night: sleep,
            recovery_index: 88,
            resting_heart_rate: 89,
            sleep_balance: 86,
          },
        };
        break;
      case "daily_activity":
        value = {
          ...shared,
          score: activity,
          steps,
          active_calories: Math.round(steps * 0.045),
          total_calories: Math.round(1850 + steps * 0.045),
          target_calories: 500,
          sedentary_time: 28800,
          resting_time: duration,
          non_wear_time: 1200,
          average_met_minutes: 1.5 + Math.sin(i) * 0.2,
          equivalent_walking_distance: steps * 0.7,
          high_activity_time: 900,
          medium_activity_time: 2500,
          low_activity_time: 6500,
        };
        break;
      case "sleep":
        value = {
          ...shared,
          type: "long_sleep",
          period: 0,
          bedtime_start: bedtime.toISOString(),
          bedtime_end: new Date(
            bedtime.getTime() + (duration + 1800) * 1000,
          ).toISOString(),
          total_sleep_duration: duration,
          deep_sleep_duration: Math.round(duration * 0.2),
          light_sleep_duration: Math.round(duration * 0.55),
          rem_sleep_duration: Math.round(duration * 0.25),
          awake_time: 1800,
          latency: 660,
          efficiency: 92,
          time_in_bed: duration + 1800,
          average_heart_rate: Math.round(56 - wave * 0.3 - sampleOffset * 0.5),
          lowest_heart_rate: Math.round(49 - wave * 0.25),
          average_hrv: Math.round(48 + wave * 1.1 + trend + sampleOffset * 1.7),
          average_breath: Math.round((14.5 + Math.sin(i) * 0.4) * 10) / 10,
          sleep_phase_5_min: null,
        };
        break;
      case "daily_spo2":
        value = {
          ...shared,
          spo2_percentage: { average: 97 + Math.round(Math.sin(i) + 1) / 2 },
          breathing_disturbance_index: 0,
        };
        break;
      case "daily_cardiovascular_age":
        value = {
          ...shared,
          vascular_age:
            i % 19 === 0 ? null : Math.round(37 + Math.sin(i / 36) - i / 600),
        };
        break;
      case "daily_stress":
        value = {
          ...shared,
          stress_high: 4500,
          recovery_high: 2400,
          day_summary: "normal",
        };
        break;
      case "enhanced_tag": {
        const tag = sampleTag(i);
        if (tag)
          value = {
            id: shared.id,
            custom_name: tag,
            tag_type_code: null,
            comment: null,
            start_day: day,
            end_day: null,
          };
        break;
      }
    }
    if (value) records.push(value);
  }
  return records as T[];
}
