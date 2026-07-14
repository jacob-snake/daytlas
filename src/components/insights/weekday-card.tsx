"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { weekdayStats } from "@/lib/analytics";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

const OPTIONS = ["total_sleep", "sleep_score", "avg_hrv", "bedtime", "steps", "readiness_score"];

const W = 520;
const H = 200;
const PAD = { l: 44, r: 8, t: 12, b: 24 };

export function WeekdayCard({ rows }: { rows: DayRow[] }) {
  const [key, setKey] = useState("total_sleep");
  const def = METRIC_BY_KEY[key];
  const stats = useMemo(() => weekdayStats(rows, key), [rows, key]);

  const vals = stats.flatMap((s) => [s.q1, s.q3]).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);
  const colW = (W - PAD.l - PAD.r) / 7;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Weekday profile</CardTitle>
          <CardDescription>Median and middle 50% of days, by day of week</CardDescription>
        </div>
        <Select value={key} onValueChange={setKey}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OPTIONS.map((k) => (
              <SelectItem key={k} value={k}>
                {METRIC_BY_KEY[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 620 }}>
          {[min, (min + max) / 2, max].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="2 4" />
              <text x={PAD.l - 6} y={y(v) + 3} fontSize={10} textAnchor="end" fill="var(--muted-foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          {stats.map((s, i) => {
            const cx = PAD.l + i * colW + colW / 2;
            const weekend = i >= 5;
            const color = weekend ? "var(--chart-3)" : "var(--chart-1)";
            if (s.median === null || s.q1 === null || s.q3 === null) return null;
            return (
              <g key={s.weekday}>
                <rect
                  x={cx - 7}
                  y={y(s.q3)}
                  width={14}
                  height={Math.max(2, y(s.q1) - y(s.q3))}
                  rx={4}
                  fill={color}
                  opacity={0.25}
                />
                <line x1={cx - 9} x2={cx + 9} y1={y(s.median)} y2={y(s.median)} stroke={color} strokeWidth={3} strokeLinecap="round" />
                <text x={cx} y={H - 8} fontSize={11} textAnchor="middle" fill="var(--muted-foreground)">
                  {s.weekday}
                </text>
                <title>{`${s.weekday}: median ${s.median.toFixed(1)} (n=${s.n})`}</title>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 text-xs text-muted-foreground">
          {def.label}
          {def.unit ? ` (${def.unit})` : ""} · weekends in orange
        </p>
      </CardContent>
    </Card>
  );
}
