import { isDay, shiftDay } from "./dates";
import type { DayRow } from "./oura/metrics";

export function yearStory(rows: DayRow[], year: number, today: string) {
  if (!Number.isInteger(year) || year < 1900 || year > 9999 || !isDay(today)) {
    throw new RangeError("A valid year and reference day are required");
  }
  const start = `${year}-01-01`;
  const end = `${year}-12-31` < today ? `${year}-12-31` : today;
  const unique = new Map<string, number>();
  for (const row of rows) {
    if (!isDay(row.day) || row.day < start || row.day > end) continue;
    const hours = row.total_sleep;
    if (
      typeof hours === "number" &&
      Number.isFinite(hours) &&
      hours > 0 &&
      hours <= 24
    ) {
      unique.set(row.day, hours);
    }
  }
  const days: { day: string; hours: number | null }[] = [];
  for (let day = start; day <= end; day = shiftDay(day, 1)) {
    days.push({ day, hours: unique.get(day) ?? null });
  }
  const nights = days.filter(
    (d): d is { day: string; hours: number } => d.hours !== null,
  );
  const summary = (values: typeof nights) => ({
    count: values.length,
    average: values.length
      ? values.reduce((sum, d) => sum + d.hours, 0) / values.length
      : null,
  });
  const quarters = Array.from({ length: 4 }, (_, i) =>
    summary(
      nights.filter(
        (d) => Math.floor((Number(d.day.slice(5, 7)) - 1) / 3) === i,
      ),
    ),
  );
  const weekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();
  return {
    year,
    start,
    end: end >= start ? end : null,
    days,
    ...summary(nights),
    missing: days.length - nights.length,
    quarters,
    weekdays: summary(nights.filter((d) => ![0, 6].includes(weekday(d.day)))),
    weekends: summary(nights.filter((d) => [0, 6].includes(weekday(d.day)))),
    longest:
      [...nights].sort(
        (a, b) => b.hours - a.hours || a.day.localeCompare(b.day),
      )[0] ?? null,
    first: nights[0]?.day ?? null,
    latest: nights.at(-1)?.day ?? null,
  };
}
