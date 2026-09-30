"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";
import { isDay, localDay, parseDay, shiftDay } from "@/lib/dates";

// The year as a ring — 365 days around a circle, a nod to the device itself.

const RAMP = [
  "#e7efff",
  "#bcd3fb",
  "#84adf5",
  "#4a80ec",
  "#2058d4",
  "#0d3695",
  "#071d55",
];
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
  const [hoverDay, setHover] = useState<string | null>(null);
  const def = METRIC_BY_KEY[metricKey];

  const { spokes, avg } = useMemo(() => {
    const today = localDay();
    const byDay = new Map(
      rows
        .filter(
          (r) => isDay(r.day) && r.day.startsWith(`${year}-`) && r.day <= today,
        )
        .map((r) => [
          r.day,
          typeof r[metricKey] === "number" && Number.isFinite(r[metricKey])
            ? (r[metricKey] as number)
            : null,
        ]),
    );
    const values = [...byDay.values()].filter(
      (v): v is number => typeof v === "number",
    );
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const daysInYear =
      (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;

    const spokes: {
      day: string;
      value: number | null;
      angle: number;
      fill: string;
      future: boolean;
    }[] = [];
    for (let doy = 0; doy < daysInYear; doy++) {
      const day = shiftDay(`${year}-01-01`, doy);
      const angle = (doy / daysInYear) * 2 * Math.PI - Math.PI / 2;
      const future = day > today;
      const value = future ? null : (byDay.get(day) ?? null);
      let fill = "var(--muted)";
      if (value !== null) {
        const t = max > min ? (value - min) / (max - min) : 0.5;
        fill = RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
      }
      spokes.push({ day, value, angle, fill, future });
    }
    return {
      spokes,
      avg: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
    };
  }, [rows, metricKey, year]);
  const hover = spokes.find((s) => s.day === hoverDay) ?? null;

  const pt = (angle: number, r: number) => [
    CX + r * Math.cos(angle),
    CX + r * Math.sin(angle),
  ];

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="[&_text]:font-medium w-full max-w-[480px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onMouseLeave={() => setHover(null)}
        tabIndex={0}
        role="img"
        aria-label={`${def.label} for ${year} as a ring, ${year} average ${avg !== null ? avg.toFixed(0) : "unknown"}. Use left and right arrow keys to browse days.`}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const idx = hover ? spokes.findIndex((s) => s.day === hover.day) : -1;
          const next =
            spokes[
              Math.max(
                0,
                Math.min(
                  spokes.length - 1,
                  idx + (e.key === "ArrowRight" ? 1 : -1),
                ),
              )
            ];
          if (next) setHover(next.day);
        }}
      >
        {spokes.map((s) => {
          const [x1, y1] = pt(s.angle, R_IN);
          const [x2, y2] = pt(
            s.angle,
            hover?.day === s.day ? R_OUT + 8 : R_OUT,
          );
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
              opacity={
                s.future ? 0.35 : hover && hover.day !== s.day ? 0.45 : 1
              }
              onMouseEnter={() => setHover(s.day)}
              style={{ transition: "opacity 200ms var(--ease-premium)" }}
            />
          );
        })}
        {Array.from({ length: 12 }, (_, m) => {
          const dayOffset =
            (Date.UTC(year, m, 1) - Date.UTC(year, 0, 1)) / 86400000;
          const angle = (dayOffset / spokes.length) * 2 * Math.PI - Math.PI / 2;
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
        <text
          x={CX}
          y={CX - 26}
          textAnchor="middle"
          fontSize={13}
          fill="var(--muted-foreground)"
        >
          {hover ? format(parseDay(hover.day), "EEE, d MMM") : def.label}
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
        <text
          x={CX}
          y={CX + 40}
          textAnchor="middle"
          fontSize={12}
          fill="var(--muted-foreground)"
        >
          {hover ? def.unit || "value" : `${year} average`}
        </text>
      </svg>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {hover
          ? `${format(parseDay(hover.day), "EEEE, d MMMM yyyy")}: ${hover.future ? "future day" : hover.value === null ? "no data" : `${hover.value} ${def.unit}`}`
          : `${def.label}: ${valuesDescription(avg, def.unit)} average in ${year}.`}
      </p>
    </div>
  );
}

function valuesDescription(value: number | null, unit: string) {
  return value === null ? "no recorded" : `${value.toFixed(1)} ${unit}`;
}
