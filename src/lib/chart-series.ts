/** Chart-only geometry: missing dates stay null and are never observations. */
export const SCORE_KEYS = ["sleep", "readiness", "activity"] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];
export type ScoreRow = { day: string } & Record<ScoreKey, number | null>;
export type ScoreGap = [{ x: string; y: number }, { x: string; y: number }];

const DAY_MS = 86_400_000;
const observed = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function buildScoreSeries(rows: readonly ScoreRow[]) {
  const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day));
  const byDay = new Map(sorted.map((row) => [row.day, row]));
  const data: ScoreRow[] = [];
  if (sorted.length) {
    const first = Date.parse(`${sorted[0].day}T00:00:00Z`);
    const last = Date.parse(`${sorted[sorted.length - 1].day}T00:00:00Z`);
    for (let time = first; time <= last; time += DAY_MS) {
      const day = new Date(time).toISOString().slice(0, 10);
      const row = byDay.get(day);
      data.push({
        day,
        sleep: observed(row?.sleep) ? row.sleep : null,
        readiness: observed(row?.readiness) ? row.readiness : null,
        activity: observed(row?.activity) ? row.activity : null,
      });
    }
  }
  const series = SCORE_KEYS.map((key) => {
    let sum = 0;
    let count = 0;
    let previousIndex: number | null = null;
    const gaps: ScoreGap[] = [];
    data.forEach((row, index) => {
      const value = row[key];
      if (!observed(value)) return;
      sum += value;
      count += 1;
      if (previousIndex !== null && index - previousIndex > 1) {
        gaps.push([
          { x: data[previousIndex].day, y: data[previousIndex][key]! },
          { x: row.day, y: value },
        ]);
      }
      previousIndex = index;
    });
    return { key, average: count ? sum / count : null, count, gaps };
  });
  const values = data
    .flatMap((row) => SCORE_KEYS.map((key) => row[key]))
    .filter(observed);
  const domain: [number, number] = values.length
    ? [
        Math.max(0, Math.floor(Math.min(...values) - 10)),
        Math.max(100, Math.ceil(Math.max(...values))),
      ]
    : [0, 100];
  return { data, series, domain };
}
