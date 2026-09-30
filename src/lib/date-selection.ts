import { calendarBoundaries } from "./chart-presentation";
import { shiftDay } from "./dates";
export const DAY_MS = 86_400_000;
export const dayNumber = (day: string) =>
  Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
export const dayString = (day: number) =>
  new Date(day * DAY_MS).toISOString().slice(0, 10);
export const inclusiveDays = (start: string, end: string) =>
  dayNumber(end) - dayNumber(start) + 1;

/** Calendar days, not recorded observations: missing data cannot change the range. */
export function moveDateWindow(
  start: number,
  end: number,
  delta: number,
  min: number,
  max: number,
): [number, number] {
  const bounded = Math.max(min - start, Math.min(max - end, delta));
  return [start + bounded, end + bounded];
}

/** At most 3 CSS px AND 3 days. Keyboard and direct date entry bypass this. */
export function snapToQuarter(
  day: number,
  edge: "start" | "end",
  min: number,
  max: number,
  width: number,
) {
  const targets = calendarBoundaries(
    dayString(min),
    shiftDay(dayString(max), 1),
  )
    .map(({ day }) => dayNumber(day) - (edge === "end" ? 1 : 0))
    .filter((day) => day >= min && day <= max);
  const tolerance = Math.min(3, (3 * (max - min)) / Math.max(1, width));
  const nearest = targets.sort(
    (a, b) => Math.abs(a - day) - Math.abs(b - day),
  )[0];
  return nearest !== undefined && Math.abs(nearest - day) <= tolerance
    ? nearest
    : null;
}
