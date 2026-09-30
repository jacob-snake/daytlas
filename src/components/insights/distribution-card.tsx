"use client";
import { ChartGrid } from "@/components/ui/chart-grid";
import { numericYAxis } from "@/lib/chart-presentation";

import { useMemo, useState } from "react";
import { Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { distribution } from "@/lib/insights";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

const OPTIONS = [
  "sleep_score",
  "readiness_score",
  "activity_score",
  "avg_hrv",
  "total_sleep",
  "avg_resting_hr",
];

const config = {
  count: {
    label: "Earlier days",
    color: "color-mix(in oklab, var(--muted-foreground) 30%, var(--card))",
  },
  recent: { label: "Last 30 days", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function DistributionCard({ rows }: { rows: DayRow[] }) {
  const [key, setKey] = useState("readiness_score");
  const def = METRIC_BY_KEY[key];
  const dist = useMemo(() => distribution(rows, key, 12), [rows, key]);

  const recentTotal =
    dist?.counts.reduce((sum, bin) => sum + bin.recent, 0) ?? 0;
  const earlierTotal = (dist?.total ?? 0) - recentTotal;
  const formatValue = (value: number) =>
    key === "total_sleep"
      ? `${Math.floor(Math.round(value * 60) / 60)}:${String(Math.round(value * 60) % 60).padStart(2, "0")}`
      : Math.round(value).toLocaleString();
  const data =
    dist?.counts.map((bin, index) => ({
      label: String(index),
      range: `${formatValue(bin.x0)}–${formatValue(bin.x1)}`,
      tick: formatValue((bin.x0 + bin.x1) / 2),
      mid: (bin.x0 + bin.x1) / 2,
      count: earlierTotal ? ((bin.count - bin.recent) / earlierTotal) * 100 : 0,
      recent: recentTotal ? (bin.recent / recentTotal) * 100 : 0,
    })) ?? [];
  const maxPercent = Math.max(0, ...data.flatMap((d) => [d.count, d.recent]));
  const tickStep = maxPercent <= 25 ? 5 : 10;
  const yMax = Math.max(tickStep, Math.ceil(maxPercent / tickStep) * tickStep);
  const yTicks = Array.from(
    { length: yMax / tickStep + 1 },
    (_, i) => i * tickStep,
  );
  const peak = dist ? Math.max(...dist.counts.map((bin) => bin.recent)) : 0;
  const peaks = data.filter(
    (_, index) => dist?.counts[index].recent === peak && peak > 0,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Where do your last 30 days sit?</CardTitle>
          <CardDescription>
            Share of recorded days in each range · both periods use the same
            scale
          </CardDescription>
        </div>
        <Select value={key} onValueChange={setKey}>
          <SelectTrigger aria-label="Distribution metric" className="w-[210px]">
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
        {!dist ? (
          <p className="text-sm text-muted-foreground">Not enough data yet.</p>
        ) : (
          <>
            <div className="mb-5 grid gap-5 border-b border-border/35 pb-5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">
                  {peaks.length > 1
                    ? "Most frequent ranges"
                    : "Most frequent range"}
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {peaks.length
                    ? peaks.map((bin) => bin.range).join(" · ")
                    : "No recent readings"}
                  {peaks.length && def.unit && key !== "total_sleep"
                    ? ` ${def.unit}`
                    : ""}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {peak > 0
                    ? `${peak} of ${recentTotal} recent days${peaks.length > 1 ? " in each range" : ""}`
                    : "Choose another metric or return after your next reading."}
                </p>
              </div>
              {dist.recentMean !== null && (
                <div>
                  <p className="text-[13px] text-muted-foreground">
                    Average · last 30 days
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatValue(dist.recentMean)}
                    {def.unit && key !== "total_sleep" ? ` ${def.unit}` : ""}
                  </p>
                </div>
              )}
            </div>
            <ChartContainer config={config} className="h-[220px] w-full">
              <BarChart
                data={data}
                margin={{ left: 8, right: 8, top: 8 }}
                barCategoryGap={2}
              >
                <ChartGrid />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  fontSize={13}
                  tickFormatter={(label) => data[Number(label)]?.tick ?? ""}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <YAxis
                  {...numericYAxis}
                  domain={[0, yMax]}
                  ticks={yTicks}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) =>
                        data[Number(label)]?.range ?? label
                      }
                      formatter={(value, name) => (
                        <span>
                          {name === "recent" ? "Last 30 days" : "Earlier days"}:{" "}
                          {Number(value).toFixed(1)}%
                        </span>
                      )}
                    />
                  }
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="count"
                  fill={config.count.color}
                  radius={[0, 0, 3, 3]}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="recent"
                  fill="var(--chart-1)"
                  radius={[3, 3, 0, 0]}
                />
                {dist.recentMean !== null && (
                  <ReferenceLine
                    x={
                      data.reduce(
                        (best, d) =>
                          Math.abs(d.mid - dist.recentMean!) <
                          Math.abs((best?.mid ?? Infinity) - dist.recentMean!)
                            ? d
                            : best,
                        data[0],
                      )?.label
                    }
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                )}
              </BarChart>
            </ChartContainer>
            <p className="mt-2 text-center text-[13px] font-medium text-muted-foreground">
              {earlierTotal.toLocaleString()} earlier days · {recentTotal}{" "}
              recent days
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
