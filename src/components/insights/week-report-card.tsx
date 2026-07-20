"use client";
import { Icon } from "@/components/icon";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { weeklyDeviations } from "@/lib/analytics";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

const KEYS = ["sleep_score", "readiness_score", "activity_score", "avg_hrv", "avg_resting_hr", "total_sleep", "steps", "respiratory_rate"];

function sentence(d: { key: string; weekMean: number; baseMean: number; zScore: number }) {
  const def = METRIC_BY_KEY[d.key];
  const dir = d.zScore > 0 ? "above" : "below";
  const strength = Math.abs(d.zScore) > 2 ? "well " : Math.abs(d.zScore) > 1 ? "clearly " : "slightly ";
  return `${def.label} averaged ${d.weekMean.toFixed(1)}${def.unit ? ` ${def.unit}` : ""} — ${strength}${dir} your usual ${d.baseMean.toFixed(1)}.`;
}

export function WeekReportCard({ rows }: { rows: DayRow[] }) {
  const devs = useMemo(() => weeklyDeviations(rows, KEYS).slice(0, 3), [rows]);
  if (!devs.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your week</CardTitle>
        <CardDescription>The three things that stood out in the last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {devs.map((d) => (
          <div key={d.key} className="flex items-start gap-2 text-sm">
            {d.zScore > 0 ? (
              <Icon icon={ArrowUp01Icon} className="mt-0.5 size-4 shrink-0" style={{ color: "var(--chart-2)" }} />
            ) : (
              <Icon icon={ArrowDown01Icon} className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <p className="text-pretty">{sentence(d)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
