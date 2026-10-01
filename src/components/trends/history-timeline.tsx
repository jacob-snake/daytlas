"use client";
import {
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { buildMetricSeries } from "@/lib/metric-series";
import {
  calendarBoundaries,
  calendarGridStyle,
  minorGridCoordinates,
} from "@/lib/chart-presentation";
import {
  dayNumber,
  dayString,
  moveDateWindow,
  snapToQuarter,
} from "@/lib/date-selection";
import { parseDay } from "@/lib/dates";
import type { DayRow } from "@/lib/oura/metrics";

type Part = "start" | "end" | "window";
export function HistoryTimeline({
  rows,
  start,
  end,
  onChange,
}: {
  rows: DayRow[];
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const id = useId();
  const plot = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    part: Part;
    x: number;
    start: number;
    end: number;
    snapped: number | null;
    hapticAt: number;
  } | null>(null);
  const [snapped, setSnapped] = useState<string | null>(null);
  const [, transition] = useTransition();
  const [local, setLocal] = useState<[string, string] | null>(null);
  const model = useMemo(() => {
    const data = buildMetricSeries(rows, ["readiness_score"]).data;
    const min = dayNumber(data[0]?.day ?? "1970-01-01");
    const max = dayNumber(data.at(-1)?.day ?? "1970-01-01");
    const span = Math.max(1, max - min);
    const values = data.map((d) =>
      typeof d.readiness_score === "number" ? d.readiness_score : null,
    );
    const smooth = values.map((v, i) => {
      if (v === null) return null;
      const window = values
        .slice(Math.max(0, i - 6), i + 1)
        .filter((v): v is number => v !== null);
      return window.reduce((sum, v) => sum + v, 0) / window.length;
    });
    const observed = values.filter((value): value is number => value !== null);
    const low = observed.length ? Math.min(...observed) - 3 : 0;
    const high = observed.length ? Math.max(...observed) + 3 : 100;
    const path = (values: (number | null)[]) => {
      let open = false;
      return values
        .map((v, i) => {
          if (v === null) {
            open = false;
            return "";
          }
          const point = `${open ? "L" : "M"}${(((dayNumber(data[i].day) - min) / span) * 1000).toFixed(2)},${(146 - ((v - low) / (high - low)) * 132).toFixed(2)}`;
          open = true;
          return point;
        })
        .join(" ");
    };
    return {
      min,
      max,
      span,
      data,
      raw: path(values),
      smooth: path(smooth),
      boundaries: calendarBoundaries(dayString(min), dayString(max)),
    };
  }, [rows]);
  if (model.data.length < 2) return null;
  const from = Math.max(
    model.min,
    Math.min(model.max, dayNumber(local?.[0] ?? start)),
  );
  const to = Math.max(from, Math.min(model.max, dayNumber(local?.[1] ?? end)));
  const percent = (day: number) => ((day - model.min) / model.span) * 100;
  const publish = (a: number, b: number) => {
    setLocal([dayString(a), dayString(b)]);
    transition(() => onChange(dayString(a), dayString(b)));
  };
  const begin = (event: PointerEvent<HTMLButtonElement>, part: Part) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      part,
      x: event.clientX,
      start: from,
      end: to,
      snapped: null,
      hapticAt: 0,
    };
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || !plot.current) return;
    const width = plot.current.getBoundingClientRect().width;
    const delta = Math.round(
      ((event.clientX - current.x) / width) * model.span,
    );
    let a = current.start,
      b = current.end;
    let target: number | null = null;
    if (current.part === "window")
      [a, b] = moveDateWindow(a, b, delta, model.min, model.max);
    else {
      const raw = Math.max(
        current.part === "start" ? model.min : a,
        Math.min(
          current.part === "start" ? b : model.max,
          (current.part === "start" ? a : b) + delta,
        ),
      );
      target = event.altKey
        ? null
        : snapToQuarter(raw, current.part, model.min, model.max, width);
      // Never cross the other handle even when it is close to a boundary.
      if (
        target !== null &&
        (current.part === "start" ? target > b : target < a)
      )
        target = null;
      if (current.part === "start") a = target ?? raw;
      else b = target ?? raw;
    }
    if (target !== current.snapped) {
      setSnapped(target === null ? null : dayString(target));
      if (
        target !== null &&
        event.pointerType === "touch" &&
        typeof navigator.vibrate === "function" &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches &&
        Date.now() - current.hapticAt > 180
      ) {
        navigator.vibrate(8);
        current.hapticAt = Date.now();
      }
      current.snapped = target;
    }
    publish(a, b);
  };
  const finish = () => {
    if (local) onChange(local[0], local[1]);
    drag.current = null;
    setSnapped(null);
    setLocal(null);
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, part: Part) => {
    const delta = ["ArrowLeft", "ArrowDown"].includes(event.key)
      ? -1
      : ["ArrowRight", "ArrowUp"].includes(event.key)
        ? 1
        : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    let a = from,
      b = to;
    const step = delta * (event.shiftKey ? 7 : 1);
    if (part === "window")
      [a, b] = moveDateWindow(
        a,
        b,
        event.key === "Home"
          ? model.min - a
          : event.key === "End"
            ? model.max - b
            : step,
        model.min,
        model.max,
      );
    else if (part === "start")
      a =
        event.key === "Home"
          ? model.min
          : event.key === "End"
            ? b
            : Math.max(model.min, Math.min(b, a + step));
    else
      b =
        event.key === "End"
          ? model.max
          : event.key === "Home"
            ? a
            : Math.max(a, Math.min(model.max, b + step));
    onChange(dayString(a), dayString(b));
  };
  const fmt = (day: string) =>
    parseDay(day).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return (
    <div className="history-timeline" aria-label="History timeline">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-[13px] font-medium">
        <span>
          Readiness{" "}
          <span className="text-muted-foreground">· full history</span>
        </span>
        <span className="text-muted-foreground">
          Daily readings ·{" "}
          <span className="text-[var(--chart-2)]">7-day average</span>
        </span>
      </div>
      <div className="history-timeline-surface">
        <div ref={plot} className="history-timeline-plot">
          <svg
            viewBox="0 0 1000 160"
            preserveAspectRatio="none"
            role="img"
            aria-label="Readiness history, daily readings and seven-day average"
          >
            <defs>
              <clipPath id={id}>
                <rect width="1000" height="160" rx="8" />
              </clipPath>
            </defs>
            <g clipPath={`url(#${id})`}>
              {minorGridCoordinates([30, 65, 100, 135]).map((y) => (
                <line
                  key={`minor-${y}`}
                  x1="0"
                  x2="1000"
                  y1={y}
                  y2={y}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.055}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {[30, 65, 100, 135].map((score) => (
                <line
                  key={score}
                  x1="0"
                  x2="1000"
                  y1={score}
                  y2={score}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {model.boundaries.map(({ day, kind }) => (
                <line
                  key={day}
                  x1={percent(dayNumber(day)) * 10}
                  x2={percent(dayNumber(day)) * 10}
                  y1="0"
                  y2="160"
                  stroke="var(--muted-foreground)"
                  {...calendarGridStyle[kind]}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                d={model.raw}
                fill="none"
                stroke="var(--chart-2)"
                strokeOpacity=".2"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={model.smooth}
                fill="none"
                stroke="var(--chart-2)"
                strokeWidth="1.8"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>
          <button
            type="button"
            className="history-window"
            aria-label={`Move selected period, ${fmt(dayString(from))} to ${fmt(dayString(to))}. Arrow keys move by a day, Shift by a week.`}
            style={{
              left: `${percent(from)}%`,
              width: `${Math.max(0.15, percent(to) - percent(from))}%`,
            }}
            onPointerDown={(e) => begin(e, "window")}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={finish}
            onKeyDown={(e) => keyboard(e, "window")}
          />
          {(["start", "end"] as const).map((part) => (
            <button
              key={part}
              type="button"
              role="slider"
              className={`history-handle history-handle-${part}`}
              aria-label={part === "start" ? "Start date" : "End date"}
              aria-valuemin={part === "start" ? model.min : from}
              aria-valuemax={part === "end" ? model.max : to}
              aria-valuenow={part === "start" ? from : to}
              aria-valuetext={fmt(dayString(part === "start" ? from : to))}
              style={{ left: `${percent(part === "start" ? from : to)}%` }}
              onPointerDown={(e) => begin(e, part)}
              onPointerMove={move}
              onPointerUp={finish}
              onPointerCancel={finish}
              onKeyDown={(e) => keyboard(e, part)}
            >
              <span aria-hidden="true">
                <svg
                  width="10"
                  height="14"
                  viewBox="0 0 12 20"
                  style={{ width: 10, height: 14, flexShrink: 0 }}
                  fill="none"
                >
                  <path
                    d="M3 2v16M9 2v16"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between gap-2 text-xs font-medium text-muted-foreground">
          <span>{fmt(dayString(model.min))}</span>
          <span>{fmt(dayString(model.max))}</span>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {snapped ? `Quarter boundary · ${fmt(snapped)}` : ""}
      </p>
    </div>
  );
}
