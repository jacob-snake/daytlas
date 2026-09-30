"use client";
import { MetricDelta } from "@/components/ui/metric-delta";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { weeklyDeviations } from "@/lib/analytics";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

const KEYS = [
  "sleep_score",
  "readiness_score",
  "activity_score",
  "avg_hrv",
  "avg_resting_hr",
  "total_sleep",
  "steps",
  "respiratory_rate",
];

export function WeekReportCard({ rows }: { rows: DayRow[] }) {
  const devs = useMemo(() => weeklyDeviations(rows, KEYS).slice(0, 3), [rows]);
  if (!devs.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your week</CardTitle>
        <CardDescription>
          The latest recorded week compared with your preceding 60 days. Green
          means up, red means down — not a health rating.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-3 md:gap-0">
        {devs.map((d) => {
          const def = METRIC_BY_KEY[d.key];
          const digits = d.key === "steps" ? 0 : 1;
          const formatValue = (value: number) =>
            value.toLocaleString("en-US", {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
            });
          return (
            <div
              key={d.key}
              className="min-w-0 border-b border-border/35 pb-5 last:border-0 last:pb-0 md:border-r md:border-b-0 md:px-6 md:pb-0 md:first:pl-0 md:last:pr-0"
            >
              <p className="text-sm font-semibold">{def.label}</p>
              <p className="mt-3 font-heading text-3xl font-semibold tabular-nums">
                {formatValue(d.weekMean)}
                {def.unit && (
                  <span className="ml-1.5 text-base font-normal text-muted-foreground">
                    {def.unit}
                  </span>
                )}
              </p>
              <div className="mt-2">
                <MetricDelta
                  value={d.weekMean - d.baseMean}
                  unit={def.unit}
                  polarity="direction"
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Previous average{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatValue(d.baseMean)}
                  {def.unit ? ` ${def.unit}` : ""}
                </span>
              </p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {d.weekN} of 7 days · baseline {d.baselineN} of 60 days
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
