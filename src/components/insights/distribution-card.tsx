"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, ReferenceLine, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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
  count: { label: "All days", color: "var(--muted-foreground)" },
  recent: { label: "Last 30 days", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function DistributionCard({ rows }: { rows: DayRow[] }) {
  const [key, setKey] = useState("readiness_score");
  const def = METRIC_BY_KEY[key];
  const dist = useMemo(() => distribution(rows, key), [rows, key]);

  const data = useMemo(
    () =>
      dist?.counts.map((c) => ({
        label: `${c.x0.toFixed(0)}–${c.x1.toFixed(0)}`,
        mid: (c.x0 + c.x1) / 2,
        count: c.count - c.recent,
        recent: c.recent,
      })) ?? [],
    [dist]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Where do your last 30 days sit?</CardTitle>
          <CardDescription>
            Every day you&apos;ve ever tracked, as a distribution — orange is the last 30 days
          </CardDescription>
        </div>
        <Select value={key} onValueChange={setKey}>
          <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
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
            <ChartContainer config={config} className="h-[220px] w-full">
              <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }} barCategoryGap={2}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={40} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" stackId="a" fill="var(--muted)" radius={[0, 0, 3, 3]} />
                <Bar dataKey="recent" stackId="a" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
                {dist.recentMean !== null && (
                  <ReferenceLine
                    x={data.reduce(
                      (best, d) =>
                        Math.abs(d.mid - dist.recentMean!) < Math.abs((best?.mid ?? Infinity) - dist.recentMean!)
                          ? d
                          : best,
                      data[0]
                    )?.label}
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                )}
              </BarChart>
            </ChartContainer>
            <p className="mt-2 text-sm text-muted-foreground">
              {dist.total.toLocaleString()} tracked days · dashed line = your 30-day average{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {dist.recentMean?.toFixed(0)}
                {def.unit ? ` ${def.unit}` : ""}
              </span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
