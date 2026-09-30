import { isDay, shiftDay } from "./dates";
import type { DailyCardiovascularAge } from "./oura/types";

export function cardiovascularAgeSummary(
  records: DailyCardiovascularAge[],
  today: string,
) {
  const byDay = new Map<string, number | null>();
  for (const record of records) {
    if (
      !isDay(record.day) ||
      record.day > today ||
      record.day < shiftDay(today, -364)
    )
      continue;
    const age = record.vascular_age;
    byDay.set(
      record.day,
      typeof age === "number" &&
        Number.isInteger(age) &&
        age >= 18 &&
        age <= 100
        ? age
        : null,
    );
  }
  const readings = [...byDay]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => ({ day, value }));
  const latest = readings.filter((row) => row.value !== null).at(-1);
  if (!latest) return null;
  const previous = readings.filter(
    (row) =>
      row.day < latest.day &&
      row.day >= shiftDay(latest.day, -30) &&
      row.value !== null,
  );
  const average =
    previous.length >= 5
      ? previous.reduce((sum, row) => sum + row.value!, 0) / previous.length
      : null;
  const chart = Array.from({ length: 90 }, (_, index) => {
    const day = shiftDay(latest.day, index - 89);
    return { day, value: byDay.get(day) ?? null };
  });
  return {
    latest: { day: latest.day, value: latest.value! },
    average,
    count: previous.length,
    chart,
  };
}
