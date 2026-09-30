"use client";
import {
  horizontalGrid,
  minorGridCoordinates,
  numericLabelWidth,
} from "@/lib/chart-presentation";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { weekdayStats } from "@/lib/analytics";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

const OPTIONS = [
  "total_sleep",
  "sleep_score",
  "avg_hrv",
  "bedtime",
  "steps",
  "readiness_score",
];

const H = 200;

export function WeekdayCard({ rows }: { rows: DayRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [pinnedDay, setPinnedDay] = useState<number | null>(null);
  const focusedDay = useRef<number | null>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setActiveDay(null);
        setPinnedDay(null);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const [W, setWidth] = useState(520);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.floor(entry.contentRect.width))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [key, setKey] = useState("total_sleep");
  const def = METRIC_BY_KEY[key];
  const stats = useMemo(() => weekdayStats(rows, key), [rows, key]);

  const vals = stats
    .flatMap((s) => [s.q1, s.q3])
    .filter((v): v is number => v !== null);

  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 1;
  const ticks = Array.from(new Set([min, (min + max) / 2, max]));
  const tickLabel = (v: number) =>
    v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const PAD = {
    l: Math.max(44, ...ticks.map((v) => numericLabelWidth(tickLabel(v)) + 12)),
    r: 8,
    t: 12,
    b: 24,
  };
  const y = (v: number) =>
    PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);
  const colW = (W - PAD.l - PAD.r) / 7;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Weekday profile</CardTitle>
          <CardDescription>
            Median and middle 50% of days, by day of week
          </CardDescription>
        </div>
        <Select
          value={key}
          onValueChange={(value) => {
            setKey(value);
            setActiveDay(null);
            setPinnedDay(null);
          }}
        >
          <SelectTrigger
            aria-label="Weekday profile metric"
            className="w-[190px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((k) => (
              <SelectItem key={k} value={k}>
                {METRIC_BY_KEY[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="relative w-full min-w-0">
          {!vals.length ? (
            <p className="py-12 text-sm text-muted-foreground">
              No recorded days for this metric yet.
            </p>
          ) : (
            <>
              <svg
                className="[&_text]:font-medium"
                role="img"
                aria-label={`${def.label}: median and middle 50 percent by weekday`}
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                height={H}
              >
                {minorGridCoordinates(ticks.map(y)).map((yy) => (
                  <line
                    key={`minor-${yy}`}
                    x1={PAD.l}
                    x2={W - PAD.r}
                    y1={yy}
                    y2={yy}
                    stroke={horizontalGrid.stroke}
                    strokeOpacity={0.055}
                  />
                ))}
                {ticks.map((v) => (
                  <g key={v}>
                    <line
                      x1={PAD.l}
                      x2={W - PAD.r}
                      y1={y(v)}
                      y2={y(v)}
                      stroke={horizontalGrid.stroke}
                      strokeOpacity={horizontalGrid.strokeOpacity}
                    />
                    <text
                      x={PAD.l - 6}
                      y={y(v) + 3}
                      fontSize={13}
                      textAnchor="end"
                      fill="var(--muted-foreground)"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {tickLabel(v)}
                    </text>
                  </g>
                ))}
                {stats.map((s, i) => {
                  const cx = PAD.l + i * colW + colW / 2;
                  const weekend = i >= 5;
                  const color = weekend ? "var(--chart-3)" : "var(--chart-1)";
                  if (s.median === null || s.q1 === null || s.q3 === null)
                    return null;
                  return (
                    <g key={s.weekday}>
                      <rect
                        x={cx - 7}
                        y={y(s.q3)}
                        width={14}
                        height={Math.max(2, y(s.q1) - y(s.q3))}
                        rx={4}
                        fill={color}
                        opacity={0.25}
                      />
                      <line
                        x1={cx - 9}
                        x2={cx + 9}
                        y1={y(s.median)}
                        y2={y(s.median)}
                        stroke={color}
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                      <text
                        x={cx}
                        y={H - 8}
                        fontSize={11}
                        textAnchor="middle"
                        fill="var(--muted-foreground)"
                      >
                        {s.weekday}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div role="group" aria-label={`${def.label} weekday details`}>
                {stats.map((s, i) =>
                  s.median !== null && s.q1 !== null && s.q3 !== null ? (
                    <button
                      key={s.weekday}
                      type="button"
                      aria-label={`${s.weekday}: show ${def.label.toLowerCase()} details`}
                      aria-describedby={activeDay === i ? tooltipId : undefined}
                      aria-pressed={pinnedDay === i}
                      className="absolute top-2 bottom-0 rounded-lg hover:bg-foreground/[0.025] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                      style={{ left: PAD.l + i * colW, width: colW }}
                      onMouseEnter={() => setActiveDay(i)}
                      onMouseLeave={() =>
                        setActiveDay(focusedDay.current ?? pinnedDay)
                      }
                      onFocus={() => {
                        focusedDay.current = i;
                        setActiveDay(i);
                      }}
                      onBlur={() => {
                        focusedDay.current = null;
                        setActiveDay(pinnedDay);
                      }}
                      onClick={() => {
                        const next = pinnedDay === i ? null : i;
                        setPinnedDay(next);
                        setActiveDay(next);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setPinnedDay(null);
                          setActiveDay(null);
                        }
                      }}
                    />
                  ) : null,
                )}
              </div>
              {activeDay !== null &&
                (() => {
                  const s = stats[activeDay];
                  const value = (v: number | null) =>
                    v === null
                      ? "—"
                      : `${v.toLocaleString("en-US", { maximumFractionDigits: 1 })}${def.unit ? ` ${def.unit}` : ""}`;
                  const left = Math.max(
                    0,
                    Math.min(
                      W - 232,
                      PAD.l + activeDay * colW + colW / 2 - 116,
                    ),
                  );
                  return (
                    <div
                      id={tooltipId}
                      role="tooltip"
                      className="pointer-events-none absolute top-0 z-10 w-[232px] max-w-full rounded-xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg"
                      style={{ left }}
                    >
                      <p className="font-semibold">
                        {s.weekday} · {def.label}
                      </p>
                      <dl className="mt-2 space-y-1 tabular-nums">
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Median</dt>
                          <dd className="font-semibold">{value(s.median)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">
                            Lower quartile (25%)
                          </dt>
                          <dd>{value(s.q1)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">
                            Upper quartile (75%)
                          </dt>
                          <dd>{value(s.q3)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">
                            Recorded days
                          </dt>
                          <dd>{s.n}</dd>
                        </div>
                      </dl>
                    </div>
                  );
                })()}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
