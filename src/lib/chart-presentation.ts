/** Recharts measures formatted labels, including five digits and separators. */
export const numericYAxis = {
  width: "auto",
  tickCount: 5,
  tickMargin: 8,
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 13, fontWeight: 500 },
  tickFormatter: (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 2 }),
} as const;

export const horizontalGrid = {
  vertical: false,
  syncWithTicks: true,
  stroke: "var(--muted-foreground)",
  strokeOpacity: 0.13,
} as const;

/** Conservative space for tabular numeric SVG labels, including grouping. */
export function numericLabelWidth(label: string, fontSize = 13) {
  return Math.ceil(label.length * fontSize * 0.66);
}

/** Pack labels in each horizontal column without covering one another. */
export function averageBadgePositions(
  desired: number[],
  columns: number,
  top: number,
  bottom: number,
) {
  const positions = [...desired];
  const stride = 28;
  for (let column = 0; column < columns; column++) {
    const items = desired
      .map((y, index) => ({ y, index }))
      .filter((item) => item.index % columns === column)
      .sort((a, b) => a.y - b.y);
    let previous = top - stride;
    for (const item of items) {
      positions[item.index] = Math.max(top, item.y, previous + stride);
      previous = positions[item.index];
    }
    // Shift overflowing labels upward, keeping the same order and separation.
    let next = bottom + stride;
    for (const item of items.reverse()) {
      positions[item.index] = Math.min(positions[item.index], next - stride);
      next = positions[item.index];
    }
  }
  return positions;
}

/** Two quiet subdivisions between each pair of labelled grid lines. */
export function minorGridCoordinates(major: readonly number[]) {
  const sorted = [...new Set(major)].sort((a, b) => a - b);
  return sorted
    .slice(1)
    .flatMap((end, i) => [
      sorted[i] + (end - sorted[i]) / 3,
      sorted[i] + (2 * (end - sorted[i])) / 3,
    ]);
}

export const calendarGridStyle = {
  year: { strokeWidth: 1.6, strokeOpacity: 0.34 },
  quarter: { strokeWidth: 1, strokeOpacity: 0.16 },
} as const;

/** Calendar boundaries, at midnight Jan/Apr/Jul/Oct 1, independent of DST. */
export function calendarBoundaries(start: string, end: string) {
  if (!start || !end || start > end) return [];
  const result: { day: string; kind: "year" | "quarter" }[] = [];
  for (
    let year = Number(start.slice(0, 4));
    year <= Number(end.slice(0, 4));
    year++
  ) {
    for (const month of ["01", "04", "07", "10"]) {
      const day = `${year}-${month}-01`;
      if (day >= start && day <= end)
        result.push({ day, kind: month === "01" ? "year" : "quarter" });
    }
  }
  return result;
}
