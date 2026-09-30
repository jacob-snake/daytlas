"use client";

import { format, parseISO } from "date-fns";
import { buildMetricSeries } from "@/lib/metric-series";
import { Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DayScores } from "@/lib/oura/queries";

// Different units → separate small multiples, never a shared axis.
const PANELS = [
  { key: "hrv", label: "HRV (avg, ms)", color: "var(--chart-4)" },
  { key: "resting_hr", label: "Lowest HR (bpm)", color: "var(--chart-5)" },
  {
    key: "temperature_deviation",
    label: "Temp deviation (°C)",
    color: "var(--chart-5)",
  },
  { key: "total_sleep_h", label: "Total sleep (h)", color: "var(--chart-1)" },
] as const;

export function VitalsPanels({
  data,
  days = 30,
}: {
  data: DayScores[];
  days?: number;
}) {
  const chart = buildMetricSeries(
    data,
    PANELS.map((p) => p.key),
  );
  return (
    <section aria-label="Your body over time" className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Your body over time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Last {days} days · values show the latest available reading for each
          metric.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PANELS.map((p) => {
          const config = {
            [p.key]: { label: p.label, color: p.color },
          } satisfies ChartConfig;
          const latest = [...data]
            .reverse()
            .find(
              (d) => typeof d[p.key] === "number" && Number.isFinite(d[p.key]),
            );
          return (
            <Card key={p.key}>
              <CardHeader>
                <CardDescription>{p.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {latest?.[p.key]?.toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  }) ?? "–"}
                </CardTitle>
                <p className="text-[13px] font-medium text-muted-foreground">
                  {latest
                    ? format(parseISO(latest.day), "d MMM yyyy")
                    : "No readings"}
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={config} className="h-[72px] w-full">
                  <LineChart
                    data={chart.data}
                    margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
                  >
                    <XAxis dataKey="day" hide />
                    <YAxis domain={["auto", "auto"]} hide />
                    <ChartTooltip
                      content={<ChartTooltipContent hideIndicator />}
                    />
                    {chart.gaps
                      .filter((gap) => gap.key === p.key)
                      .map((gap) => (
                        <ReferenceLine
                          key={gap.segment[0].x}
                          segment={gap.segment}
                          stroke={p.color}
                          strokeDasharray="3 4"
                          strokeOpacity={0.5}
                          strokeWidth={1.5}
                        />
                      ))}
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey={p.key}
                      stroke={p.color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
