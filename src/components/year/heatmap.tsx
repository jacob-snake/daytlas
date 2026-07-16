"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

// Sequential single-hue ramp (light → dark), monotonic lightness.
const RAMP = ["#e7efff", "#bcd3fb", "#84adf5", "#4a80ec", "#2058d4", "#0d3695", "#071d55"];
const EMPTY = "var(--muted)";

const CELL = 14;
const GAP = 3;
const STEP = CELL + GAP;

export function YearHeatmap({
  rows,
  metricKey,
  year,
}: {
  rows: DayRow[];
  metricKey: string;
  year: number;
}) {
  const [hover, setHover] = useState<{ day: string; value: number | null } | null>(null);
  const def = METRIC_BY_KEY[metricKey];

  const byDay = useMemo(
    () => new Map(rows.map((r) => [r.day as string, r[metricKey] as number | null])),
    [rows, metricKey]
  );

  const { cells, weeks, domain } = useMemo(() => {
    const values = rows
      .map((r) => r[metricKey])
      .filter((v): v is number => typeof v === "number");
    const min = Math.min(...values);
    const max = Math.max(...values);

    const start = new Date(year, 0, 1);
    const end = new Date(Math.min(new Date(year, 11, 31).getTime(), Date.now()));
    const startCol = new Date(start);
    startCol.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back to Monday

    const cells: { x: number; y: number; day: string; value: number | null; fill: string }[] = [];
    for (let d = new Date(startCol), i = 0; d <= end; d.setDate(d.getDate() + 1), i++) {
      if (d < start) continue;
      const day = format(d, "yyyy-MM-dd");
      const week = Math.floor((d.getTime() - startCol.getTime()) / (7 * 86400000));
      const value = byDay.get(day) ?? null;
      let fill = EMPTY;
      if (value !== null && max > min) {
        const t = (value - min) / (max - min);
        fill = RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
      }
      cells.push({ x: week * STEP, y: ((d.getDay() + 6) % 7) * STEP, day, value, fill });
    }
    const weeks = Math.ceil(((end.getTime() - startCol.getTime()) / 86400000 + 1) / 7);
    return { cells, weeks, domain: { min, max } };
  }, [rows, byDay, metricKey, year]);

  const width = weeks * STEP;
  const height = 7 * STEP;

  return (
    <div>
      <div className="mb-2 flex h-5 items-center justify-between text-sm">
        <span className="text-muted-foreground" aria-live="polite">
          {hover
            ? `${format(new Date(hover.day), "EEE, d MMM yyyy")} — ${
                hover.value !== null ? `${hover.value}${def.unit && ` ${def.unit}`}` : "no data"
              }`
            : `${def.label}, ${year}`}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {Math.round(domain.min)}
          {RAMP.map((c) => (
            <span key={c} className="size-3 rounded-[3px]" style={{ background: c }} />
          ))}
          {Math.round(domain.max)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height + 18}`}
          width={width}
          height={height + 18}
          onMouseLeave={() => setHover(null)}
          tabIndex={0}
          role="img"
          aria-label={`${def.label} calendar heatmap for ${year}. Use arrow keys to browse days; values from ${Math.round(domain.min)} to ${Math.round(domain.max)}.`}
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(e) => {
            const deltas: Record<string, number> = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1 };
            const delta = deltas[e.key];
            if (!delta) return;
            e.preventDefault();
            const idx = hover ? cells.findIndex((c) => c.day === hover.day) : 0;
            const next = cells[Math.max(0, Math.min(cells.length - 1, idx + delta))];
            if (next) setHover({ day: next.day, value: next.value });
          }}
        >
          {["Mon", "Wed", "Fri", "Sun"].map((d, i) => (
            <text
              key={d}
              x={-6}
              y={[0, 2, 4, 6][i] * STEP + CELL - 3}
              fontSize={9}
              fill="var(--muted-foreground)"
              textAnchor="end"
            />
          ))}
          {cells.map((c) => (
            <rect
              key={c.day}
              x={c.x}
              y={c.y}
              width={CELL}
              height={CELL}
              rx={3.5}
              fill={c.fill}
              opacity={hover && hover.day !== c.day ? 0.75 : 1}
              onMouseEnter={() => setHover({ day: c.day, value: c.value })}
            >
              <title>{`${c.day}: ${c.value ?? "–"}`}</title>
            </rect>
          ))}
          {Array.from({ length: 12 }, (_, m) => {
            const first = new Date(year, m, 1);
            if (first > new Date()) return null;
            const startCol = new Date(year, 0, 1);
            startCol.setDate(startCol.getDate() - ((startCol.getDay() + 6) % 7));
            const week = Math.floor((first.getTime() - startCol.getTime()) / (7 * 86400000));
            return (
              <text
                key={m}
                x={week * STEP}
                y={height + 13}
                fontSize={10}
                fill="var(--muted-foreground)"
              >
                {format(first, "MMM")}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
