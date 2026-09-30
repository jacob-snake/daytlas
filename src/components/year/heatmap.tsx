"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";
import { isDay, localDay, parseDay, shiftDay } from "@/lib/dates";
import { revealChartMark } from "@/lib/chart-navigation";
import {
  chartMarkAnchor,
  useChartWidth,
  YearChartTooltip,
} from "./chart-interaction";

// Sequential single-hue ramp (light → dark), monotonic lightness.
const RAMP = [
  "#e7efff",
  "#bcd3fb",
  "#84adf5",
  "#4a80ec",
  "#2058d4",
  "#0d3695",
  "#071d55",
];
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
  const [hoverDay, setHover] = useState<string | null>(null);
  const { ref: scrollerRef, width: availableWidth } = useChartWidth(53 * STEP);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const select = (day: string, mark: SVGRectElement | null) => {
    setHover(day);
    setAnchor(chartMarkAnchor(scrollerRef.current, mark));
  };
  const def = METRIC_BY_KEY[metricKey];

  const byDay = useMemo(
    () =>
      new Map(
        rows
          .filter(
            (r) =>
              isDay(r.day) &&
              r.day.startsWith(`${year}-`) &&
              r.day <= localDay(),
          )
          .map((r) => [
            r.day,
            typeof r[metricKey] === "number" && Number.isFinite(r[metricKey])
              ? (r[metricKey] as number)
              : null,
          ]),
      ),
    [rows, metricKey, year],
  );

  const { cells, weeks, domain } = useMemo(() => {
    const values = [...byDay.values()].filter(
      (v): v is number => typeof v === "number",
    );
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;

    const today = localDay();
    const firstWeekday = (new Date(Date.UTC(year, 0, 1)).getUTCDay() + 6) % 7;
    const dayCount =
      (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;

    const cells: {
      x: number;
      y: number;
      day: string;
      value: number | null;
      fill: string;
      future: boolean;
    }[] = [];
    for (let i = 0; i < dayCount; i++) {
      const day = shiftDay(`${year}-01-01`, i);
      const week = Math.floor((i + firstWeekday) / 7);
      const future = day > today;
      const value = future ? null : (byDay.get(day) ?? null);
      let fill = EMPTY;
      if (value !== null) {
        const t =
          min !== null && max !== null && max > min
            ? (value - min) / (max - min)
            : 0.5;
        fill = RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
      }
      cells.push({
        x: week * STEP,
        y: ((i + firstWeekday) % 7) * STEP,
        day,
        value,
        fill,
        future,
      });
    }
    const weeks = Math.ceil((dayCount + firstWeekday) / 7);
    return { cells, weeks, domain: { min, max } };
  }, [byDay, year]);
  const hover = cells.find((c) => c.day === hoverDay) ?? null;

  const width = Math.max(weeks * STEP, availableWidth);
  const step = width / weeks;
  const cell = step - GAP;
  const height = 7 * step;

  return (
    <div>
      <div className="mb-2 flex min-h-5 flex-col items-start justify-between gap-2 text-sm sm:flex-row sm:items-center">
        <span
          className="min-h-10 text-muted-foreground sm:min-h-5"
          aria-live="polite"
          aria-atomic="true"
        >
          {hover
            ? `${format(parseDay(hover.day), "EEE, d MMM yyyy")} — ${
                hover.future
                  ? "future day"
                  : hover.value !== null
                    ? `${hover.value}${def.unit && ` ${def.unit}`}`
                    : "no data"
              }`
            : `${def.label}, ${year}`}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {domain.min === null ? "No data" : Math.round(domain.min)}
          {RAMP.map((c) => (
            <span
              key={c}
              className="size-3 rounded-[3px]"
              style={{ background: c }}
            />
          ))}
          {domain.max === null ? "" : Math.round(domain.max)}
        </span>
      </div>
      <div className="relative">
        <div
          ref={scrollerRef}
          className="overflow-x-auto"
          onMouseLeave={() => {
            setHover(null);
            setAnchor(null);
          }}
          onScroll={() =>
            setAnchor(
              chartMarkAnchor(
                scrollerRef.current,
                scrollerRef.current?.querySelector('[data-selected="true"]') ??
                  null,
              ),
            )
          }
        >
          <svg
            viewBox={`0 0 ${width} ${height + 18}`}
            width={width}
            height={height + 18}
            onBlur={() => {
              setHover(null);
              setAnchor(null);
            }}
            tabIndex={0}
            role="img"
            aria-label={`${def.label} calendar heatmap for ${year}. Use arrow keys to browse days. ${domain.min === null || domain.max === null ? "No recorded data." : `Values from ${domain.min} to ${domain.max} ${def.unit}.`}`}
            className="[&_text]:font-medium rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setHover(null);
                setAnchor(null);
                return;
              }
              const deltas: Record<string, number> = {
                ArrowRight: 7,
                ArrowLeft: -7,
                ArrowDown: 1,
                ArrowUp: -1,
              };
              const delta = deltas[e.key];
              if (!delta && e.key !== "Home" && e.key !== "End") return;
              e.preventDefault();
              const idx = hover
                ? cells.findIndex((c) => c.day === hover.day)
                : -delta;
              const nextIndex =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? cells.length - 1
                    : idx + delta;
              const next =
                cells[Math.max(0, Math.min(cells.length - 1, nextIndex))];
              if (next) {
                const mark = e.currentTarget.querySelector<SVGRectElement>(
                  `[data-day="${next.day}"]`,
                );
                revealChartMark(scrollerRef.current, mark);
                select(next.day, mark);
              }
            }}
          >
            {cells.map((c) => (
              <rect
                key={c.day}
                data-day={c.day}
                data-selected={hover?.day === c.day || undefined}
                x={(c.x / STEP) * step}
                y={(c.y / STEP) * step}
                width={cell}
                height={cell}
                rx={3.5}
                fill={c.fill}
                stroke={hover?.day === c.day ? "var(--foreground)" : undefined}
                strokeWidth={hover?.day === c.day ? 1.5 : 0}
                opacity={
                  c.future ? 0.35 : hover && hover.day !== c.day ? 0.75 : 1
                }
                onMouseEnter={(e) => select(c.day, e.currentTarget)}
                onClick={(e) => select(c.day, e.currentTarget)}
              >
                <title>{`${c.day}: ${c.value ?? "–"}`}</title>
              </rect>
            ))}
            {Array.from({ length: 12 }, (_, m) => {
              const first = new Date(year, m, 1);
              const offset =
                (new Date(Date.UTC(year, 0, 1)).getUTCDay() + 6) % 7;
              const dayOffset =
                (Date.UTC(year, m, 1) - Date.UTC(year, 0, 1)) / 86400000;
              const week = Math.floor((dayOffset + offset) / 7);
              return (
                <text
                  key={m}
                  x={week * step}
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
        <YearChartTooltip anchor={anchor}>
          {hover && (
            <>
              <p className="text-xs opacity-70">
                {format(parseDay(hover.day), "EEE, d MMM yyyy")}
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {hover.future
                  ? "Future day"
                  : hover.value === null
                    ? "No reading"
                    : `${hover.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${def.unit || ""}`}
              </p>
              <p className="text-xs opacity-70">{def.label}</p>
            </>
          )}
        </YearChartTooltip>
      </div>
      <p className="mt-2 text-xs text-muted-foreground md:hidden">
        Scroll horizontally to explore every day.
      </p>
    </div>
  );
}
