"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const GOOD = "var(--chart-2)";
const BAD = "var(--destructive)";

const W = 560;
const COL_L = 180;
const COL_R = W - 120;
const ROW_H = 34;

export function SlopeCard({ rows }: { rows: DayRow[] }) {
  const slopes = useMemo(() => slopeComparison(rows, KEYS, 30), [rows]);
  if (!slopes.length) return null;

  const H = slopes.length * ROW_H + 28;

  return (
    <Card>
      <CardHeader>
        <CardTitle>This month vs last</CardTitle>
        <CardDescription>
          Last 30 days against the 30 before — green means it moved in the right direction
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 480, maxWidth: 640 }}>
          <text x={COL_L} y={12} fontSize={11} fill="var(--muted-foreground)" textAnchor="middle">
            previous 30 days
          </text>
          <text x={COL_R} y={12} fontSize={11} fill="var(--muted-foreground)" textAnchor="middle">
            last 30 days
          </text>
          {slopes.map((s, i) => {
            const y = 28 + i * ROW_H + ROW_H / 2;
            const def = METRIC_BY_KEY[s.key];
            const color = s.improved ? GOOD : BAD;
            const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
            return (
              <g key={s.key}>
                <text x={0} y={y + 4} fontSize={12} fill="var(--foreground)">
                  {def.label}
                </text>
                <line x1={COL_L} y1={y} x2={COL_R} y2={y - 0.0001} stroke="var(--border)" strokeWidth={1} />
                <line
                  x1={COL_L}
                  y1={y}
                  x2={COL_R}
                  y2={y}
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.9}
                  transform={`rotate(${Math.max(-8, Math.min(8, -s.changePct / 3))} ${(COL_L + COL_R) / 2} ${y})`}
                />
                <circle cx={COL_L} cy={y} r={4} fill={color} />
                <circle cx={COL_R} cy={y} r={4} fill={color} />
                <text x={COL_L - 10} y={y + 4} fontSize={12} textAnchor="end" fill="var(--muted-foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmt(s.prev)}
                </text>
                <text x={COL_R + 10} y={y + 4} fontSize={12} fontWeight={600} fill="var(--foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmt(s.cur)}
                </text>
                <text x={W} y={y + 4} fontSize={11} textAnchor="end" fill={color} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {s.changePct >= 0 ? "+" : ""}
                  {s.changePct.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
