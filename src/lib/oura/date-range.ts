import { isDay, shiftDay } from "../dates";
import type { OuraRange } from "./client";

// The UI uses inclusive calendar days. Timestamp-backed collections otherwise
// stop at midnight at the start of end_date, omitting that day's activity.
const TIMESTAMP_COLLECTIONS = new Set([
  "daily_activity",
  "sleep",
  "workout",
  "session",
]);

export function collectionRange(endpoint: string, range: OuraRange): OuraRange {
  return TIMESTAMP_COLLECTIONS.has(endpoint) &&
    range.end_date &&
    isDay(range.end_date)
    ? { ...range, end_date: shiftDay(range.end_date, 1) }
    : range;
}

export function inCalendarRange(row: unknown, range: OuraRange) {
  if (
    !row ||
    typeof row !== "object" ||
    !("day" in row) ||
    typeof row.day !== "string"
  )
    return true;
  return (
    (!range.start_date ||
      !isDay(range.start_date) ||
      row.day >= range.start_date) &&
    (!range.end_date || !isDay(range.end_date) || row.day <= range.end_date)
  );
}
