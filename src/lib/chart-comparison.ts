import { CLOCK_METRICS, METRIC_BY_KEY, type DayRow } from "./oura/metrics";
import { pearson } from "./stats";

const PALETTE = [1, 3, 4, 2, 5].map((n) => `var(--chart-${n})`);

function categoryColor(key: string) {
  if (key === "readiness_score") return "var(--chart-2)";
  if (key === "activity_score" || METRIC_BY_KEY[key]?.group === "Activity")
    return "var(--chart-3)";
  if (key === "avg_hrv") return "var(--chart-4)";
  if (METRIC_BY_KEY[key]?.group === "Heart & Body") return "var(--chart-5)";
  return "var(--chart-1)";
}

/** One base + up to three overlays. Never reuse a color within a comparison. */
export function comparisonColors(keys: readonly string[]) {
  const colors: Record<string, string> = {};
  const used = new Set<string>();
  for (const key of new Set(keys)) {
    const preferred = categoryColor(key);
    const color = used.has(preferred)
      ? PALETTE.find((item) => !used.has(item))
      : preferred;
    if (!color)
      throw new Error("Too many chart series for the comparison palette");
    colors[key] = color;
    used.add(color);
  }
  return colors;
}

/** Only observations present in BOTH displayed series contribute; gaps aren't imputed. */
export function comparisonPairs(
  data: readonly DayRow[],
  keys: readonly string[],
) {
  return keys.flatMap((a, i) =>
    keys.slice(i + 1).map((b) => {
      if (CLOCK_METRICS.has(a) || CLOCK_METRICS.has(b))
        return { a, b, stat: null, reason: "Clock times wrap at midnight." };
      const pairs = data.flatMap((row): [number, number][] => {
        const x = row[a],
          y = row[b];
        return typeof x === "number" &&
          Number.isFinite(x) &&
          typeof y === "number" &&
          Number.isFinite(y)
          ? [[x, y]]
          : [];
      });
      const stat = pearson(pairs);
      return {
        a,
        b,
        stat,
        reason: stat
          ? null
          : pairs.length < 5
            ? "Needs at least 5 paired observations."
            : "Not enough variation to calculate r.",
      };
    }),
  );
}
