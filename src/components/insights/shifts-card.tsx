"use client";
import { Icon } from "@/components/icon";
import { ArrowDataTransferHorizontalIcon } from "@hugeicons/core-free-icons";

import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { changepoints } from "@/lib/analytics";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

const KEYS = ["avg_resting_hr", "avg_hrv", "sleep_score", "total_sleep"];

export function ShiftsCard({ rows }: { rows: DayRow[] }) {
  const shifts = useMemo(
    () =>
      KEYS.flatMap((k) => changepoints(rows, k))
        .sort((a, b) => b.day.localeCompare(a.day))
        .slice(0, 4),
    [rows]
  );
  if (!shifts.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shifts in your baseline</CardTitle>
        <CardDescription>
          Moments where a metric settled at a new level — new job? new habit? worth a note
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {shifts.map((s) => {
          const def = METRIC_BY_KEY[s.key];
          return (
            <div key={`${s.key}-${s.day}`} className="flex items-start gap-2">
              <Icon icon={ArrowDataTransferHorizontalIcon} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-pretty">
                Around <strong>{format(new Date(s.day), "d MMM yyyy")}</strong>, {def.label.toLowerCase()}{" "}
                moved from <span className="tabular-nums">{s.before.toFixed(1)}</span> to{" "}
                <span className="tabular-nums font-semibold">{s.after.toFixed(1)}</span>
                {def.unit ? ` ${def.unit}` : ""}.
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
