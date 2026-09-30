"use client";
import {
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{unit} · local time</p>
      </CardHeader>
      <CardContent>
        {points.some((p) => p.value !== null) ? (
          <ChartContainer
            config={{ value: { label: title, color } }}
            className="h-60 w-full aspect-auto"
            aria-label={`${title}, ${unit}`}
          >
            <Plot data={points} margin={{ top: 16, right: 12, bottom: 4 }}>
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
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                />
              )}
              <ChartTooltip
                isAnimationActive={false}
                content={
                  <ChartTooltipContent
                    className="chart-tooltip-dark"
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
        {average != null && (
          <p className="mt-3 text-xs text-muted-foreground">
            Dashed line: previous 30-day average ·{" "}
            {average.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
            {unit}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
export function SleepStages({ period }: { period: SleepPeriod }) {
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
          <div className="space-y-3">
            {[4, 3, 2, 1].map((stage) => (
              <div
                key={stage}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3"
              >
                <span className="text-xs text-muted-foreground">
                  {names[stage - 1]}
                </span>
                <div className="relative h-9 rounded bg-secondary/50">
                  {stages
                    .filter((s) => s.stage === stage)
                    .map((s) => (
                      <span
                        key={s.start}
                        aria-hidden="true"
                        className="absolute inset-y-0 rounded-sm"
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
        ) : (
          <p className="text-muted-foreground">
            Sleep stages are not included in the data returned for this night.
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Gaps indicate unavailable samples. These are Oura’s sleep-stage
          estimates.
        </p>
      </CardContent>
    </Card>
  );
}
