import { isDay, shiftDay } from "./dates";
import type { DayRow } from "./oura/metrics";

export function profileSummary(rows: DayRow[], today: string) {
  const unique = new Map<string, DayRow>();
  for (const row of rows) {
    if (isDay(row.day) && row.day <= today) unique.set(row.day, row);
  }
  const records = [...unique.values()]
    .filter((row) =>
      Object.entries(row).some(
        ([key, value]) =>
          key !== "day" && typeof value === "number" && Number.isFinite(value),
      ),
    )
    .sort((a, b) => a.day.localeCompare(b.day));
  const nights = records.filter(
    (row) =>
      typeof row.total_sleep === "number" &&
      Number.isFinite(row.total_sleep) &&
      row.total_sleep > 0 &&
      row.total_sleep <= 24,
  );
  const latest = records.at(-1)?.day ?? null;
  const endMonth = (latest ?? today).slice(0, 7);
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(`${endMonth}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - 11 + index);
    const month = date.toISOString().slice(0, 7);
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const end = shiftDay(next.toISOString().slice(0, 10), -1);
    const through = end < today ? end : today;
    const calendarDays = Number(through.slice(8, 10));
    const values = nights
      .filter((row) => row.day.startsWith(month))
      .map((row) => row.total_sleep as number);
    const average = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
    const deviation =
      average === null
        ? null
        : Math.sqrt(
            values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
              values.length,
          );
    return {
      month,
      count: values.length,
      calendarDays,
      missing: calendarDays - values.length,
      average,
      deviation,
    };
  });
  const candidates = months.filter((month) => month.count >= 7);
  const eligible = candidates.length >= 2 ? candidates : [];
  const longest =
    [...eligible].sort((a, b) => b.average! - a.average!)[0] ?? null;
  const steadiest =
    [...eligible].sort((a, b) => a.deviation! - b.deviation!)[0] ?? null;
  return {
    records: records.length,
    nights: nights.length,
    first: records[0]?.day ?? null,
    latest,
    months,
    longest,
    steadiest,
  };
}

export function sleepDuration(hours: number | null) {
  if (hours === null) return "No sleep records";
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}
