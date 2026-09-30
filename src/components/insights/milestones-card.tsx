"use client";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Moon, Heart, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { streaksAndRecords } from "@/lib/analytics";
import type { DayRow } from "@/lib/oura/metrics";

export function MilestonesCard({ rows }: { rows: DayRow[] }) {
  const stats = useMemo(
    () => ({
      sleep: streaksAndRecords(rows, "sleep_score", 85),
      readiness: streaksAndRecords(rows, "readiness_score", 85),
      hrv: streaksAndRecords(rows, "avg_hrv", -Infinity),
    }),
    [rows],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Sleep",
              icon: Moon,
              stats: stats.sleep,
              color: "var(--chart-1)",
            },
            {
              label: "Readiness",
              icon: Heart,
              stats: stats.readiness,
              color: "var(--chart-2)",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-muted/40 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <item.icon
                  className="size-4"
                  style={{ color: item.color }}
                  aria-hidden="true"
                />
                {item.label}
              </div>
              <p className="mt-3">
                <strong className="text-3xl tabular-nums">
                  {item.stats.current}
                </strong>{" "}
                <span className="text-sm text-muted-foreground">
                  {item.stats.current === 1 ? "day" : "days"}
                </span>
              </p>
              <p className="mt-1 text-[13px] font-medium text-muted-foreground">
                Scoring 85+ at latest reading
              </p>
              <p className="mt-3 text-sm">
                Longest streak{" "}
                <strong>
                  {item.stats.best} {item.stats.best === 1 ? "day" : "days"}
                </strong>
              </p>
            </div>
          ))}
        </div>
        {stats.hrv.record && (
          <div className="flex items-center gap-3 border-t border-border/40 pt-4">
            <Award
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Highest recorded HRV</p>
              <p className="text-[13px] text-muted-foreground">
                {format(parseISO(stats.hrv.record.day), "d MMM yyyy")}
              </p>
            </div>
            <strong className="text-xl tabular-nums">
              {stats.hrv.record.v.toFixed(0)}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                ms
              </span>
            </strong>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
