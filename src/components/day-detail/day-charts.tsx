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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
        <div
          className="mb-2 min-h-7 text-sm tabular-nums"
          data-testid="time-readout"
        >
          {within && (
            <span className="rounded-full bg-foreground px-3 py-1 text-background">
              {clockLabel(time!)} ·{" "}
              {reading
                ? `${reading.value?.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}${reading.time !== time ? ` at ${clockLabel(reading.time)}` : ""}`
                : "No sample"}
            </span>
          )}
        </div>
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
                isAnimationActive={false}
                content={
                  <ChartTooltipContent
                    className="chart-tooltip-dark"
                    formatter={(value) => (
                      <span className="font-bold tabular-nums">
                        {Number(value).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}{" "}
                        {unit}
                      </span>
                    )}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.time
                        ? clockLabel(payload[0].payload.time)
                        : ""
                    }
                  />
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
          <div>
            <div
              className="mb-3 min-h-6 text-sm tabular-nums"
              data-testid="stage-readout"
            >
              {time !== null && time >= start && time <= end
                ? `${clockLabel(time)} · ${names[(stages.find((s) => s.start <= time && s.end > time)?.stage ?? 0) - 1] ?? "No sample"}`
                : " "}
            </div>
            <div className="space-y-1.5">
              {[4, 3, 2, 1].map((stage) => (
                <div
                  key={stage}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3"
                >
                  <span className="text-xs text-muted-foreground">
                    {names[stage - 1]}
                  </span>
                  <div
                    className="relative h-6 bg-secondary/30"
                    role="slider"
                    tabIndex={0}
                    aria-label={`${names[stage - 1]} timeline`}
                    aria-valuemin={0}
                    aria-valuemax={Math.round((end - start) / 60000)}
                    aria-valuenow={Math.max(
                      0,
                      Math.round(((time ?? start) - start) / 60000),
                    )}
                    aria-valuetext={
                      time === null ? "Browse the night" : clockLabel(time)
                    }
                    onPointerMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTime(
                        start +
                          Math.max(
                            0,
                            Math.min(1, (e.clientX - rect.left) / rect.width),
                          ) *
                            (end - start),
                      );
                    }}
                    onPointerLeave={() => setTime(null)}
                    onBlur={() => setTime(null)}
                    onKeyDown={(e) => {
                      if (
                        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                          e.key,
                        )
                      )
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
                    {time !== null && time >= start && time <= end && (
                      <span
                        className="pointer-events-none absolute z-10 inset-y-0 border-l border-foreground"
                        style={{
                          left: `${(100 * (time - start)) / (end - start)}%`,
                        }}
                      />
                    )}
                    {stages
                      .filter((s) => s.stage === stage)
                      .map((s) => (
                        <span
                          key={s.start}
                          aria-hidden="true"
                          className="absolute inset-y-0"
                          style={{
                            left: `${(100 * (s.start - start)) / (end - start)}%`,
                            width: `${(100 * (s.end - s.start)) / (end - start)}%`,
                            background: colors[stage - 1],
                          }}
                        />
                      ))}
                    <span className="sr-only">
                      {Math.round(
                        stages
                          .filter((s) => s.stage === stage)
                          .reduce((sum, s) => sum + s.end - s.start, 0) / 60000,
                      )}{" "}
                      minutes recorded
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 ml-[4.25rem] flex justify-between text-xs text-muted-foreground">
              <span>{clockLabel(start)}</span>
              <span>{clockLabel((start + end) / 2)}</span>
              <span>{clockLabel(end)}</span>
            </div>
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
