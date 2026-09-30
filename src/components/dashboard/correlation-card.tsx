"use client";
import { ChartGrid } from "@/components/ui/chart-grid";
import { numericYAxis } from "@/lib/chart-presentation";

import { useMemo, useState } from "react";
import { Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DayScores } from "@/lib/oura/queries";
import { pearson } from "@/lib/stats";

const METRICS = [
  { key: "sleep", label: "Sleep score", color: "var(--chart-1)" },
  { key: "readiness", label: "Readiness score", color: "var(--chart-2)" },
  { key: "activity", label: "Activity score", color: "var(--chart-3)" },
  { key: "hrv", label: "HRV (ms)", color: "var(--chart-4)" },
  { key: "resting_hr", label: "Lowest HR (bpm)", color: "var(--chart-5)" },
  {
    key: "temperature_deviation",
    label: "Temp deviation (°C)",
    color: "var(--chart-5)",
  },
  { key: "total_sleep_h", label: "Total sleep (h)", color: "var(--chart-1)" },
  { key: "steps", label: "Steps", color: "var(--chart-3)" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

function describe(r: number): string {
  const a = Math.abs(r);
  if (a >= 0.7) return "strong";
  if (a >= 0.4) return "moderate";
  if (a >= 0.2) return "weak";
  return "negligible";
}

export function CorrelationCard({ data }: { data: DayScores[] }) {
  const [xKey, setXKey] = useState<MetricKey>("hrv");
  const [yKey, setYKey] = useState<MetricKey>("readiness");

  const x = METRICS.find((m) => m.key === xKey)!;
  const y = METRICS.find((m) => m.key === yKey)!;

  const points = useMemo(
    () =>
      data
        .filter((d) => d[xKey] !== null && d[yKey] !== null)
        .map((d) => ({ x: d[xKey], y: d[yKey], day: d.day })),
    [data, xKey, yKey],
  );
  const stat = useMemo(
    () => pearson(data.map((d) => [d[xKey], d[yKey]])),
    [data, xKey, yKey],
  );

  const config = {
    y: { label: y.label, color: y.color },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>How your metrics move together</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={xKey} onValueChange={(v) => setXKey(v as MetricKey)}>
            <SelectTrigger
              aria-label="Horizontal axis metric"
              className="h-10 w-[180px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.key} value={m.key} disabled={m.key === yKey}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">vs</span>
          <Select value={yKey} onValueChange={(v) => setYKey(v as MetricKey)}>
            <SelectTrigger
              aria-label="Vertical axis metric"
              className="h-10 w-[180px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.key} value={m.key} disabled={m.key === xKey}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-5 rounded-2xl bg-secondary/60 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Relationship
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">
              {stat ? stat.r.toFixed(2) : "—"}
              <span className="ms-2 text-sm text-muted-foreground">r</span>
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold">
              {stat
                ? Math.abs(stat.r) < 0.2
                  ? "No clear linear pattern"
                  : stat.r > 0
                    ? "They tend to rise together"
                    : "They tend to move in opposite directions"
                : "Not enough paired readings"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {stat
                ? `${describe(stat.r)} relationship · ${stat.n} paired days. Each dot is one day.`
                : "Try another pair of metrics or a longer date range."}
            </p>
          </div>
        </div>
        <p className="mb-3 text-sm font-semibold" style={{ color: y.color }}>
          {y.label} <span className="font-normal text-muted-foreground">↑</span>
        </p>
        <ChartContainer config={config} className="h-[280px] w-full">
          <ScatterChart margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
            <ChartGrid />
            <XAxis
              type="number"
              dataKey="x"
              name={x.label}
              domain={["auto", "auto"]}
              tickLine={false}
              axisLine={false}
              height={52}
              tickMargin={8}
              label={{
                value: x.label,
                position: "insideBottom",
                offset: 0,
                fontSize: 12,
                fill: "var(--muted-foreground)",
              }}
            />
            <YAxis
              {...numericYAxis}
              type="number"
              dataKey="y"
              name={y.label}
              domain={["auto", "auto"]}
              tickMargin={8}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideIndicator labelKey="day" />}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Scatter
              isAnimationActive={false}
              data={points}
              fill={y.color}
              fillOpacity={0.65}
              stroke={y.color}
              strokeWidth={1}
              activeShape={{ fillOpacity: 1, strokeWidth: 2 }}
            />
          </ScatterChart>
        </ChartContainer>
        <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm text-muted-foreground">
          <span>
            −1 Opposite <span className="mx-3">·</span> 0 No linear pattern{" "}
            <span className="mx-3">·</span> +1 Together
          </span>
          <span className="font-medium">
            A relationship does not prove cause and effect.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
