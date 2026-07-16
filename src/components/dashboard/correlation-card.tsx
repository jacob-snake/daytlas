"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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
  { key: "temperature_deviation", label: "Temp deviation (°C)", color: "var(--chart-5)" },
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
    [data, xKey, yKey]
  );
  const stat = useMemo(() => pearson(data.map((d) => [d[xKey], d[yKey]])), [data, xKey, yKey]);

  const config = { y: { label: y.label, color: y.color } } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Correlation</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={xKey} onValueChange={(v) => setXKey(v as MetricKey)}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
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
        <p className="mb-2 text-sm">
          {stat ? (
            <>
              <span className="font-mono font-semibold tabular-nums">r = {stat.r.toFixed(2)}</span>{" "}
              <span className="text-muted-foreground">
                — {describe(stat.r)} {stat.r >= 0 ? "positive" : "negative"} relationship over {stat.n} days
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Not enough overlapping data to compute r.</span>
          )}
        </p>
        <p className="mb-2 text-xs text-muted-foreground">
          r measures how tightly two metrics move together: +1 = perfectly together, −1 = perfectly
          opposite, 0 = no relationship.
        </p>
        <ChartContainer config={config} className="h-[280px] w-full">
          <ScatterChart margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid strokeOpacity={0.35} />
            <XAxis
              type="number"
              dataKey="x"
              name={x.label}
              domain={["auto", "auto"]}
              tickLine={false}
              axisLine={false}
              label={{ value: x.label, position: "insideBottom", offset: -4, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={y.label}
              domain={["auto", "auto"]}
              width={44}
              tickMargin={8}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideIndicator labelKey="day" />}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Scatter data={points} fill={y.color} fillOpacity={0.75} />
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
