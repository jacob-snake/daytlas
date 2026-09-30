import type { Period } from "@/lib/oura/metrics";

/** Densify calendar periods without fabricating measurements, then bridge only internal gaps. */
export function buildMetricSeries<T extends { day: string }>(
  rows: readonly T[],
  keys: readonly string[],
  period: Period = "daily",
) {
  const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day));
  const byDay = new Map(sorted.map((row) => [row.day, row]));
  const data: T[] = [];
  if (sorted.length) {
    const cursor = new Date(`${sorted[0].day}T00:00:00Z`);
    const last = sorted[sorted.length - 1].day;
    while (cursor.toISOString().slice(0, 10) <= last) {
      const day = cursor.toISOString().slice(0, 10);
      data.push(
        byDay.get(day) ??
          (Object.fromEntries([
            ["day", day],
            ...keys.map((key) => [key, null]),
          ]) as T),
      );
      if (period === "daily" || period === "weekly")
        cursor.setUTCDate(cursor.getUTCDate() + (period === "daily" ? 1 : 7));
      else
        cursor.setUTCMonth(
          cursor.getUTCMonth() +
            (period === "monthly" ? 1 : period === "quarterly" ? 3 : 12),
        );
    }
  }
  const gaps = keys.flatMap((key) => {
    let previous: { index: number; day: string; value: number } | null = null;
    const result: {
      key: string;
      segment: [{ x: string; y: number }, { x: string; y: number }];
    }[] = [];
    data.forEach((row, index) => {
      const value = row[key as keyof T];
      if (typeof value !== "number" || !Number.isFinite(value)) return;
      if (previous && index - previous.index > 1)
        result.push({
          key,
          segment: [
            { x: previous.day, y: previous.value },
            { x: row.day, y: value },
          ],
        });
      previous = { index, day: row.day, value };
    });
    return result;
  });
  return { data, gaps };
}
