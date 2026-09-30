"use client";

import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import type { DayRow } from "@/lib/oura/metrics";
import { isDay, localDay, parseDay } from "@/lib/dates";
import { revealChartMark } from "@/lib/chart-navigation";

// Each night = one thin vertical bar from bedtime to wake-up on a clock axis
// (18:00 → 14:00 next day). A year of nights reads like a barcode of rhythm.

const RAMP = [
  "#e7efff",
  "#bcd3fb",
  "#84adf5",
  "#4a80ec",
  "#2058d4",
  "#0d3695",
  "#071d55",
];

const Y_MIN = 18; // 18:00
const Y_MAX = 38; // 14:00 next day
const H = 320;

export function SleepBarcode({ rows }: { rows: DayRow[] }) {
  const [hoverDay, setHover] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const bars = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            isDay(r.day) &&
            r.day <= localDay() &&
            typeof r.bedtime === "number" &&
            Number.isFinite(r.bedtime) &&
            typeof r.wakeup_time === "number" &&
            Number.isFinite(r.wakeup_time),
        )
        .sort((a, b) => a.day.localeCompare(b.day))
        .map((r) => {
          const start = r.bedtime as number; // evening-shifted (25.5 = 1:30)
          let end = r.wakeup_time as number;
          while (end < start) end += 24;
          const score =
            typeof r.sleep_score === "number" && Number.isFinite(r.sleep_score)
              ? r.sleep_score
              : null;
          return { r, start, end, score };
        }),
    [rows],
  );

  const scores = bars
    .map((b) => b.score)
    .filter((s): s is number => s !== null);
  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 0;
  const hover = bars.find((b) => b.r.day === hoverDay)?.r ?? null;
  const yMin = Math.min(Y_MIN, ...bars.map((b) => Math.floor(b.start)));
  const yMax = Math.max(Y_MAX, ...bars.map((b) => Math.ceil(b.end)));
  const yFor = (clock: number) => ((clock - yMin) / (yMax - yMin)) * H;
  const ticks = Array.from(
    { length: Math.floor(yMax / 4) - Math.ceil(yMin / 4) + 1 },
    (_, i) => (Math.ceil(yMin / 4) + i) * 4,
  );

  const firstDay = bars[0]?.r.day;
  const dayIndex = (day: string) =>
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${firstDay}T00:00:00Z`)) /
    86400000;
  const W = bars.length ? (dayIndex(bars.at(-1)!.r.day) + 1) * 3 : 0;
  const clock = (v: number) => {
    const minutes = ((Math.round(v * 60) % 1440) + 1440) % 1440;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  };
  const monthMarkers: { day: string; x: number; label: string }[] = [];
  if (firstDay) {
    const cursor = new Date(`${firstDay.slice(0, 7)}-01T00:00:00Z`);
    const lastDay = bars.at(-1)!.r.day;
    while (cursor.toISOString().slice(0, 10) <= lastDay) {
      const day = cursor.toISOString().slice(0, 10);
      monthMarkers.push({
        day,
        x: 44 + Math.max(0, dayIndex(day)) * 3,
        label: format(parseDay(day), "MMM"),
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  if (!bars.length)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No sleep timing recorded for this period.
      </p>
    );

  return (
    <div>
      <div
        className="mb-2 min-h-16 text-sm text-muted-foreground sm:min-h-5"
        aria-live="polite"
        aria-atomic="true"
      >
        {hover
          ? `${format(parseDay(hover.day), "EEE, d MMM yyyy")} — bedtime ${clock(hover.bedtime as number)} → ${clock(hover.wakeup_time as number)} · ${hover.total_sleep ?? "–"} h asleep · score ${hover.sleep_score ?? "–"}`
          : "Main sleep, bedtime to wake-up. Darker = higher sleep score; gaps = missing dates."}
      </div>
      <div ref={scrollerRef} className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W + 44} ${H + 28}`}
          width="100%"
          style={{ minWidth: Math.min(W + 44, 1400) }}
          height={H + 28}
          onMouseLeave={() => setHover(null)}
          tabIndex={0}
          role="img"
          aria-label={`Sleep rhythm barcode: ${bars.length} nights, bedtime to wake-up on a clock axis. Use left and right arrow keys to browse nights.`}
          className="[&_text]:font-medium rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
              return;
            e.preventDefault();
            const idx = hover ? bars.findIndex((b) => b.r === hover) : -1;
            const nextIndex =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? bars.length - 1
                  : idx + (e.key === "ArrowRight" ? 1 : -1);
            const next =
              bars[Math.max(0, Math.min(bars.length - 1, nextIndex))];
            if (next) {
              setHover(next.r.day);
              revealChartMark(
                scrollerRef.current,
                e.currentTarget.querySelector<SVGRectElement>(
                  `[data-day="${next.r.day}"]`,
                ),
              );
            }
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={44}
                x2={W + 44}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="var(--border)"
                strokeDasharray="2 4"
              />
              <text
                x={0}
                y={yFor(t) + 3}
                fontSize={10}
                fill="var(--muted-foreground)"
              >
                {clock(t)}
              </text>
            </g>
          ))}
          {bars.map((b) => {
            let fill = "var(--muted)";
            if (b.score !== null) {
              const t = max > min ? (b.score - min) / (max - min) : 0.5;
              fill =
                RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
            }
            return (
              <rect
                key={b.r.day as string}
                data-day={b.r.day}
                data-selected={hover === b.r || undefined}
                x={44 + dayIndex(b.r.day) * 3}
                y={yFor(b.start)}
                width={2.2}
                height={Math.max(2, yFor(b.end) - yFor(b.start))}
                rx={1.1}
                fill={fill}
                opacity={hover && hover !== b.r ? 0.45 : 1}
                onMouseEnter={() => setHover(b.r.day)}
              />
            );
          })}
          {monthMarkers.map((month) => (
            <text
              key={month.day}
              x={month.x}
              y={H + 17}
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {month.label}
            </text>
          ))}
        </svg>
      </div>
      <p className="mt-2 text-xs text-muted-foreground md:hidden">
        Scroll horizontally to explore every day.
      </p>
    </div>
  );
}
