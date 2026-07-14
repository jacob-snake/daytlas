"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Flame, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { streaksAndRecords } from "@/lib/analytics";
import type { DayRow } from "@/lib/oura/metrics";

export function MilestonesCard({ rows }: { rows: DayRow[] }) {
  const stats = useMemo(() => {
    return {
      sleep: streaksAndRecords(rows, "sleep_score", 85),
      readiness: streaksAndRecords(rows, "readiness_score", 85),
      hrv: streaksAndRecords(rows, "avg_hrv", -Infinity),
    };
  }, [rows]);

  const nights = stats.sleep.totalDays;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
        <CardDescription>
          <span className="tabular-nums">{nights.toLocaleString()}</span> nights tracked and counting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Flame className="size-4" style={{ color: "var(--chart-3)" }} />
          <span>
            Sleep ≥ 85 streak: <strong className="tabular-nums">{stats.sleep.current}</strong> days now
            {stats.sleep.best > stats.sleep.current && (
              <span className="text-muted-foreground"> · best ever {stats.sleep.best}</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="size-4" style={{ color: "var(--chart-2)" }} />
          <span>
            Readiness ≥ 85 streak: <strong className="tabular-nums">{stats.readiness.current}</strong> days now
            {stats.readiness.best > stats.readiness.current && (
              <span className="text-muted-foreground"> · best ever {stats.readiness.best}</span>
            )}
          </span>
        </div>
        {stats.hrv.record && (
          <div className="flex items-center gap-2">
            <Trophy className="size-4" style={{ color: "var(--chart-4)" }} />
            <span>
              HRV record: <strong className="tabular-nums">{stats.hrv.record.v.toFixed(0)} ms</strong>{" "}
              <Badge variant="outline">{format(new Date(stats.hrv.record.day), "d MMM yyyy")}</Badge>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
