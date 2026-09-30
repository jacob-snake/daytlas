"use client";
import { useMemo } from "react";
import { format } from "date-fns";
import { MetricDelta } from "@/components/ui/metric-delta";
import { Icon } from "@/components/icon";
import {
  Moon02Icon,
  HeartPulseIcon,
  WorkoutRunIcon,
} from "@hugeicons/core-free-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { metricInsight } from "@/lib/insights";
import { parseDay } from "@/lib/dates";
import type { DayRow } from "@/lib/oura/metrics";

const SUBJECTS = [
  {
    key: "readiness_score",
    label: "Readiness",
    icon: HeartPulseIcon,
    color: "var(--chart-2)",
  },
  {
    key: "sleep_score",
    label: "Sleep",
    icon: Moon02Icon,
    color: "var(--chart-1)",
  },
  {
    key: "activity_score",
    label: "Activity",
    icon: WorkoutRunIcon,
    color: "var(--chart-3)",
  },
] as const;
const HRV = [
  {
    key: "avg_hrv",
    label: "HRV",
    icon: HeartPulseIcon,
    color: "var(--chart-4)",
    unit: " ms",
  },
] as const;

export function InsightCards({
  rows,
  hrv = false,
}: {
  rows: DayRow[];
  hrv?: boolean;
}) {
  const insights = useMemo(
    () =>
      (hrv ? HRV : SUBJECTS).map((s) => ({
        s,
        i: metricInsight(rows, s.key, 30),
      })),
    [rows, hrv],
  );

  return (
    <section className={hrv ? "grid gap-4" : "grid gap-4 md:grid-cols-3"}>
      {insights.map(({ s, i }) => (
        <Card key={s.key}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span
                className="flex size-10 items-center justify-center rounded-xl"
                style={{
                  background: `color-mix(in oklab, ${s.color} 10%, transparent)`,
                  color: s.color,
                }}
              >
                <Icon icon={s.icon} className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold">{s.label}</h3>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </div>
            </div>
            <CardTitle className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-4xl tabular-nums">
              {i.current !== null ? i.current.toFixed(0) : "–"}
              {"unit" in s && (
                <span className="text-base font-medium text-muted-foreground">
                  {s.unit.trim()}
                </span>
              )}
              <MetricDelta
                value={i.deltaPrev}
                unit={"unit" in s ? s.unit : "pts"}
                polarity="direction"
              />
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              Average · change vs previous 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="divide-y divide-border/35">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 first:pt-0">
                <dt className="text-muted-foreground">
                  Vs this time last year
                </dt>
                <dd>
                  <MetricDelta
                    value={i.deltaLastYear}
                    unit={"unit" in s ? s.unit : "pts"}
                    polarity="direction"
                  />
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3">
                <dt className="text-muted-foreground">Highest recorded day</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {i.bestDay ? (
                    <>
                      {i.bestDay.value}
                      {"unit" in s ? s.unit : ""}
                      <span className="ml-2 font-medium text-muted-foreground">
                        {format(parseDay(i.bestDay.day), "d MMM")}
                      </span>
                    </>
                  ) : (
                    "No recorded days"
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
