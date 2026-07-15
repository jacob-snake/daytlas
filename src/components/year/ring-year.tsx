"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

// The year as a ring — 365 days around a circle, a nod to the device itself.

const RAMP = ["#e3ecf9", "#b9d0f0", "#87aee3", "#4f83d2", "#2a63c9", "#1a4694"];
const SIZE = 480;
const CX = SIZE / 2;
const R_IN = 132;
const R_OUT = 208;

export function RingYear({
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

  const { spokes, avg } = useMemo(() => {
    const byDay = new Map(rows.map((r) => [r.day as string, r[metricKey] as number | null]));
    const values = [...byDay.values()].filter((v): v is number => typeof v === "number");
    const min = Math.min(...values);
    const max = Math.max(...values);
    const daysInYear = (new Date(year, 11, 31).getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1;

    const spokes: { day: string; value: number | null; angle: number; fill: string }[] = [];
    const end = new Date(Math.min(new Date(year, 11, 31).getTime(), Date.now()));
    for (let d = new Date(year, 0, 1); d <= end; d.setDate(d.getDate() + 1)) {
      const day = format(d, "yyyy-MM-dd");
      const doy = (d.getTime() - new Date(year, 0, 1).getTime()) / 86400000;
      const angle = (doy / daysInYear) * 2 * Math.PI - Math.PI / 2;
      const value = byDay.get(day) ?? null;
      let fill = "var(--muted)";
      if (value !== null && max > min) {
        const t = (value - min) / (max - min);
        fill = RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
      }
      spokes.push({ day, value, angle, fill });
    }
    return {
      spokes,
      avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  }, [rows, metricKey, year]);

  const pt = (angle: number, r: number) => [CX + r * Math.cos(angle), CX + r * Math.sin(angle)];

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[480px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onMouseLeave={() => setHover(null)}
        tabIndex={0}
        role="img"
        aria-label={`${def.label} for ${year} as a ring, ${year} average ${avg !== null ? avg.toFixed(0) : "unknown"}. Use left and right arrow keys to browse days.`}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const idx = hover ? spokes.findIndex((s) => s.day === hover.day) : 0;
          const next = spokes[Math.max(0, Math.min(spokes.length - 1, idx + (e.key === "ArrowRight" ? 1 : -1)))];
          if (next) setHover({ day: next.day, value: next.value });
        }}
      >
        {spokes.map((s) => {
          const [x1, y1] = pt(s.angle, R_IN);
          const [x2, y2] = pt(s.angle, hover?.day === s.day ? R_OUT + 8 : R_OUT);
          return (
            <line
              key={s.day}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={s.fill}
              strokeWidth={2.4}
              strokeLinecap="round"
              opacity={hover && hover.day !== s.day ? 0.45 : 1}
              onMouseEnter={() => setHover({ day: s.day, value: s.value })}
              style={{ transition: "opacity 200ms var(--ease-premium)" }}
            />
          );
        })}
        {Array.from({ length: 12 }, (_, m) => {
          const angle = (m / 12) * 2 * Math.PI - Math.PI / 2;
          const [x, y] = pt(angle, R_OUT + 22);
          return (
            <text
              key={m}
              x={x}
              y={y}
              fontSize={11}
              fill="var(--muted-foreground)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {format(new Date(year, m, 1), "MMM")}
            </text>
          );
        })}
        <text x={CX} y={CX - 26} textAnchor="middle" fontSize={13} fill="var(--muted-foreground)">
          {hover ? format(new Date(hover.day), "EEE, d MMM") : def.label}
        </text>
        <text
          x={CX}
          y={CX + 16}
          textAnchor="middle"
          fontSize={44}
          fontWeight={700}
          fill="var(--foreground)"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {hover ? (hover.value ?? "–") : avg !== null ? avg.toFixed(0) : "–"}
        </text>
        <text x={CX} y={CX + 40} textAnchor="middle" fontSize={12} fill="var(--muted-foreground)">
          {hover ? (def.unit || "value") : `${year} average`}
        </text>
      </svg>
    </div>
  );
}
