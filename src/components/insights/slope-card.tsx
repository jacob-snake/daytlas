"use client";

import { Icon } from "@/components/icon";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { MetricDelta } from "@/components/ui/metric-delta";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { slopeComparison } from "@/lib/analytics";
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
  "deep_sleep",
];

export function SlopeCard({ rows }: { rows: DayRow[] }) {
  const slopes = useMemo(() => slopeComparison(rows, KEYS, 30), [rows]);
  if (!slopes.length) return null;
  const fmt = (v: number) =>
    v.toLocaleString("en-US", {
      maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1,
    });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">
          This month vs last
        </CardTitle>
        <CardDescription>
          Previous 30 days → last 30 days. Colour shows direction, not a health
          rating.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-10 md:grid-cols-2">
          {slopes.map((s) => {
            const def = METRIC_BY_KEY[s.key];
            return (
              <div
                key={s.key}
                className="grid items-center gap-2 border-b border-border/40 py-4"
              >
                <dt className="font-semibold text-sm">{def.label}</dt>
                <dd className="flex flex-wrap items-center gap-2 tabular-nums text-xl font-semibold">
                  <span
                    className="text-muted-foreground"
                    aria-label="Previous 30 days"
                  >
                    {fmt(s.prev)}
                  </span>
                  <Icon
                    icon={ArrowRight02Icon}
                    className="size-4 text-muted-foreground"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                  <strong
                    aria-label="Last 30 days"
                    className="text-xl font-semibold"
                  >
                    {fmt(s.cur)}
                  </strong>
                  <span className="text-sm text-muted-foreground">
                    {def.unit}
                  </span>
                  <MetricDelta
                    value={s.changePct}
                    unit="%"
                    polarity="direction"
                    className="ml-1"
                  />
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
