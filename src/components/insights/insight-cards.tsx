"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { metricInsight } from "@/lib/insights";
import type { DayRow } from "@/lib/oura/metrics";

const SUBJECTS = [
  { key: "sleep_score", label: "Sleep", color: "var(--chart-1)" },
  { key: "readiness_score", label: "Readiness", color: "var(--chart-2)" },
  { key: "avg_hrv", label: "HRV", color: "var(--chart-4)", unit: " ms" },
] as const;

function DeltaBadge({ delta, unit }: { delta: number | null; unit?: string }) {
  if (delta === null) return null;
  const up = delta >= 0;
  return (
    <Badge variant="outline" className="tabular-nums">
      {up ? <TrendingUp /> : <TrendingDown />}
      {up ? "+" : "−"}
      {Math.abs(delta).toFixed(1)}
      {unit ?? ""}
    </Badge>
  );
}

function story(percentile: number | null): string | null {
  if (percentile === null) return null;
  if (percentile >= 90) return "One of your best stretches ever.";
  if (percentile >= 70) return "Better than most of your history.";
  if (percentile >= 40) return "A typical stretch for you.";
  if (percentile >= 15) return "Below your usual level.";
  return "One of your rougher patches — be kind to yourself.";
}

export function InsightCards({ rows }: { rows: DayRow[] }) {
  const insights = useMemo(
    () => SUBJECTS.map((s) => ({ s, i: metricInsight(rows, s.key, 30) })),
    [rows]
  );

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {insights.map(({ s, i }) => (
        <Card key={s.key}>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label} — last 30 days
            </CardDescription>
            <CardTitle className="flex items-baseline gap-3 text-3xl tabular-nums">
              {i.current !== null ? i.current.toFixed(0) : "–"}
              <span className="flex gap-1.5">
                <DeltaBadge delta={i.deltaPrev} unit={"unit" in s ? s.unit : undefined} />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm text-muted-foreground">
            {i.percentile !== null && (
              <p className="flex items-center gap-1.5 text-foreground">
                <Sparkles className="size-3.5" style={{ color: s.color }} />
                {story(i.percentile)}{" "}
                <span className="text-muted-foreground">(top {100 - i.percentile}%)</span>
              </p>
            )}
            {i.deltaLastYear !== null && (
              <p>
                {i.deltaLastYear >= 0 ? "Up" : "Down"}{" "}
                <span className="tabular-nums">{Math.abs(i.deltaLastYear).toFixed(1)}</span> vs this
                time last year.
              </p>
            )}
            {i.bestDay && (
              <p>
                Best day: {format(new Date(i.bestDay.day), "d MMM")} (
                <span className="tabular-nums">{i.bestDay.value}</span>).
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
