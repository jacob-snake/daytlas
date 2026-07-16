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

const W = 640;
const LABEL_W = 160;
const VAL_W = 56;
const X1 = LABEL_W + VAL_W; // left dot
const X2 = X1 + 240; // right dot — deliberately short line
const ROW_H = 52;
const SLOPE_MAX = 20; // px of vertical rise/fall inside a row

export function SlopeCard({ rows }: { rows: DayRow[] }) {
  const slopes = useMemo(() => slopeComparison(rows, KEYS, 30), [rows]);
  if (!slopes.length) return null;

  const H = slopes.length * ROW_H + 30;
  const fmt = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

  return (
    <Card>
      <CardHeader>
        <CardTitle>This month vs last</CardTitle>
        <CardDescription>
          Last 30 days against the 30 before — green moved in the right direction
        </CardDescription>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label={`This month vs last: ${slopes
            .map((s) => `${METRIC_BY_KEY[s.key].label} ${s.changePct >= 0 ? "up" : "down"} ${Math.abs(s.changePct).toFixed(1)} percent`)
            .join(", ")}.`}
        >
          <text x={X1} y={13} fontSize={12} fontWeight={600} fill="var(--muted-foreground)" textAnchor="middle">
            previous 30 days
          </text>
          <text x={X2} y={13} fontSize={12} fontWeight={600} fill="var(--muted-foreground)" textAnchor="middle">
            last 30 days
          </text>
          {slopes.map((s, i) => {
            const yMid = 26 + i * ROW_H + ROW_H / 2;
            const rise = Math.max(-SLOPE_MAX, Math.min(SLOPE_MAX, s.changePct * 4));
            const y1 = yMid + rise / 2;
            const y2 = yMid - rise / 2;
            const color = s.improved ? GOOD : BAD;
            const def = METRIC_BY_KEY[s.key];
            return (
              <g key={s.key}>
                <text x={0} y={yMid + 5} fontSize={14} fontWeight={600} fill="var(--foreground)">
                  {def.label.length > 18 ? `${def.label.slice(0, 17)}…` : def.label}
                </text>
                <text
                  x={X1 - 12}
                  y={y1 + 5}
                  fontSize={14}
                  textAnchor="end"
                  fill="var(--muted-foreground)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmt(s.prev)}
                </text>
                <line x1={X1} y1={y1} x2={X2} y2={y2} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
                <circle cx={X1} cy={y1} r={6} fill={color} />
                <circle cx={X2} cy={y2} r={6} fill={color} />
                <text
                  x={X2 + 12}
                  y={y2 + 5}
                  fontSize={16}
                  fontWeight={700}
                  fill="var(--foreground)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmt(s.cur)}
                </text>
                <text
                  x={X2 + 76}
                  y={y2 + 6}
                  fontSize={17}
                  fontWeight={800}
                  fill={color}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
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
