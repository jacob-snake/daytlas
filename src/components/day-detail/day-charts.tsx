"use client";
import {
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  CartesianGrid,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartGrid } from "@/components/ui/chart-grid";
import { averageLineLabel } from "@/components/ui/average-line-label";
import { ChartActiveDot } from "@/components/ui/chart-active-dot";
import { useTimeCursor } from "./time-cursor";
import { sampleAtTime } from "@/lib/day-detail";
import { numericYAxis } from "@/lib/chart-presentation";
import { sleepStages, type SamplePoint } from "@/lib/day-detail";
import type { SleepPeriod } from "@/lib/oura/types";

export const clockLabel = (time: number) =>
  new Date(time).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
export function SampleChart({
  title,
  points,
  unit,
  color = "var(--chart-1)",
  average,
  domain,
  bars = false,
}: {
  title: string;
  points: SamplePoint[];
  unit: string;
  color?: string;
  average?: number | null;
  domain?: [number, number];
  bars?: boolean;
}) {
  const Plot = bars ? BarChart : LineChart;
  const { time, setTime } = useTimeCursor();
  const reading = time === null ? null : sampleAtTime(points, time);
  const within =
    time !== null && (!domain || (time >= domain[0] && time <= domain[1]));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{unit} · local time</p>
      </CardHeader>
      <CardContent>
        <p className="sr-only" data-testid="time-readout" aria-live="polite">
          {within
            ? `${clockLabel(time!)} · ${reading ? `${reading.value} ${unit}` : "No sample"}`
            : ""}
        </p>
        {points.some((p) => p.value !== null) ? (
          <ChartContainer
            config={{ value: { label: title, color } }}
            className="h-60 w-full aspect-auto"
            aria-label={`${title}, ${unit}. Use left and right arrow keys to browse samples.`}
            tabIndex={0}
            onBlur={() => setTime(null)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const current = points.findIndex((p) => p.time === time);
              const index =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? points.length - 1
                    : Math.max(
                        0,
                        Math.min(
                          points.length - 1,
                          current + (event.key === "ArrowRight" ? 1 : -1),
                        ),
                      );
              setTime(points[index].time);
            }}
          >
            <Plot
              data={points}
              accessibilityLayer={false}
              margin={{ top: 16, right: 12, bottom: 4 }}
              onMouseMove={(state) => {
                const next = Number(state.activeLabel);
                if (Number.isFinite(next) && state.activeLabel != null)
                  setTime(next);
              }}
              onMouseLeave={() => setTime(null)}
            >
              <ChartGrid />
              <CartesianGrid
                horizontal={false}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.1}
              />
              <XAxis
                dataKey="time"
                type="number"
                domain={domain ?? ["dataMin", "dataMax"]}
                ticks={
                  domain
                    ? Array.from(
                        { length: 7 },
                        (_, i) => domain[0] + (i * (domain[1] - domain[0])) / 6,
                      )
                    : undefined
                }
                tickFormatter={clockLabel}
                minTickGap={42}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                {...numericYAxis}
                domain={bars ? [0, "auto"] : ["auto", "auto"]}
              />
              {average != null && (
                <ReferenceLine
                  zIndex={600}
                  y={average}
                  ifOverflow="extendDomain"
                  stroke={color}
                  strokeOpacity={0.5}
                  strokeDasharray="4 4"
                  label={averageLineLabel(
                    average.toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    }),
                    color,
                    0,
                    1,
                  )}
                />
              )}
              {within && (
                <ReferenceLine
                  x={time!}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="3 3"
                />
              )}
              <ChartTooltip
                active={within}
                defaultIndex={reading ? points.indexOf(reading) : undefined}
                isAnimationActive={false}
                content={() =>
                  within ? (
                    <div
                      className="chart-tooltip-dark rounded-xl px-3 py-2 text-xs shadow-lg"
                      role="tooltip"
                    >
                      <p className="font-semibold">{clockLabel(time!)}</p>
                      <p className="mt-1 font-bold">
                        {reading
                          ? `${reading.value?.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`
                          : "No sample"}
                      </p>
                      {reading && reading.time !== time && (
                        <p className="mt-1">
                          Recorded at {clockLabel(reading.time)}
                        </p>
                      )}
                    </div>
                  ) : null
                }
              />
              {bars ? (
                <Bar dataKey="value" fill={color} isAnimationActive={false} />
              ) : (
                <Line
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={<ChartActiveDot />}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </Plot>
          </ChartContainer>
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            No sample series returned for this period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
export function SleepStages({ period }: { period: SleepPeriod }) {
  const { time, setTime } = useTimeCursor();
  const stages = sleepStages(period),
    start = Date.parse(period.bedtime_start),
    end = Date.parse(period.bedtime_end);
  const names = ["Deep", "Light", "REM", "Awake"];
  const colors = [
    "var(--chart-1)",
    "color-mix(in oklab, var(--chart-1) 60%, var(--background))",
    "var(--chart-4)",
    "var(--muted-foreground)",
  ];
  const x = (t: number) => (1000 * (t - start)) / (end - start);
  const y = (stage: number) => 28 + (4 - stage) * 52;
  const active = time !== null && time >= start && time < end;
  const segment = active
    ? stages.find((s) => s.start <= time && s.end > time)
    : undefined;
  const description = active
    ? `${clockLabel(time!)} · ${segment ? names[segment.stage - 1] : "No sample"}`
    : "Browse the night";
  const ticks = Array.from(
    { length: 7 },
    (_, i) => start + (i * (end - start)) / 6,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sleep stages</CardTitle>
        <p className="text-sm text-muted-foreground">
          {clockLabel(start)}–{clockLabel(end)} ·{" "}
          {period.sleep_phase_30_sec ? "30-second" : "5-minute"} estimates
        </p>
      </CardHeader>
      <CardContent>
        {stages.length ? (
          <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-3">
            <div className="relative h-[212px]" aria-hidden="true">
              {[4, 3, 2, 1].map((stage) => (
                <span
                  key={stage}
                  className="absolute left-0 -translate-y-1/2 text-xs text-muted-foreground"
                  style={{ top: y(stage) }}
                >
                  {names[stage - 1]}
                </span>
              ))}
            </div>
            <div
              className="relative h-[212px]"
              role="slider"
              tabIndex={0}
              aria-label="Sleep stage timeline"
              aria-valuemin={0}
              aria-valuemax={Math.ceil((end - start) / 60000)}
              aria-valuenow={active ? Math.floor((time! - start) / 60000) : 0}
              aria-valuetext={description}
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTime(
                  Math.min(
                    end - 1,
                    start +
                      Math.max(
                        0,
                        Math.min(1, (e.clientX - rect.left) / rect.width),
                      ) *
                        (end - start),
                  ),
                );
              }}
              onPointerLeave={() => setTime(null)}
              onBlur={() => setTime(null)}
              onKeyDown={(e) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                  return;
                e.preventDefault();
                setTime(
                  e.key === "Home"
                    ? start
                    : e.key === "End"
                      ? end - 1
                      : Math.max(
                          start,
                          Math.min(
                            end - 1,
                            (time ?? start) +
                              (e.key === "ArrowRight" ? 300000 : -300000),
                          ),
                        ),
                );
              }}
            >
              <svg
                viewBox="0 0 1000 212"
                preserveAspectRatio="none"
                className="h-full w-full overflow-visible"
                aria-hidden="true"
              >
                <g stroke="var(--muted-foreground)" pointerEvents="none">
                  {[4, 3, 2, 1].map((stage) => (
                    <line
                      key={stage}
                      x1="0"
                      x2="1000"
                      y1={y(stage)}
                      y2={y(stage)}
                      strokeOpacity=".13"
                    />
                  ))}
                  {ticks.map((t) => (
                    <line
                      key={t}
                      className="stage-clock-grid"
                      x1={x(t)}
                      x2={x(t)}
                      y1="8"
                      y2="204"
                      strokeOpacity=".1"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
                {stages.map((s, i) => (
                  <g key={s.start}>
                    {i > 0 && stages[i - 1].end === s.start && (
                      <path
                        d={`M${x(s.start)} ${y(stages[i - 1].stage)} V${y(s.stage)}`}
                        stroke="var(--chart-1)"
                        strokeOpacity=".4"
                        fill="none"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    <rect
                      className="sleep-phase-segment"
                      x={x(s.start)}
                      y={y(s.stage) - 14}
                      width={Math.max(0.25, x(s.end) - x(s.start))}
                      height="28"
                      rx="4"
                      fill={colors[s.stage - 1]}
                    />
                  </g>
                ))}
                {active && (
                  <line
                    x1={x(time!)}
                    x2={x(time!)}
                    y1="8"
                    y2="204"
                    stroke="var(--foreground)"
                    strokeDasharray="3 3"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
              {active && (
                <div
                  role="tooltip"
                  data-testid="stage-readout"
                  className="pointer-events-none absolute -top-2 z-10 max-w-[calc(100%-8px)] rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg"
                  style={{
                    left: `${Math.min(100, Math.max(0, x(time!) / 10))}%`,
                    transform: `translateX(${x(time!) > 700 ? "-100%" : x(time!) < 300 ? "0" : "-50%"}) translateY(-100%)`,
                  }}
                >
                  <p className="font-bold whitespace-nowrap">{description}</p>
                  {segment && (
                    <p className="mt-1 whitespace-nowrap">
                      {clockLabel(segment.start)}–{clockLabel(segment.end)} ·{" "}
                      {Number(
                        ((segment.end - segment.start) / 60000).toFixed(1),
                      )}{" "}
                      min
                    </p>
                  )}
                </div>
              )}
            </div>
            <div />
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              {ticks.map((t, i) => (
                <span key={t} className={i % 2 ? "hidden sm:inline" : ""}>
                  {clockLabel(t)}
                </span>
              ))}
            </div>
            <p className="sr-only" aria-live="polite">
              {description}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Sleep stages are not included in the data returned for this night.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
