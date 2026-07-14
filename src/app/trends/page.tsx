"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Brush, XAxis } from "recharts";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { MetricPanel } from "@/components/trends/metric-panel";
import { CorrelationMatrixCard } from "@/components/trends/correlation-matrix";
import { hasToken } from "@/lib/oura/client";
import { fetchAll } from "@/lib/oura/client";
import type { EnhancedTag } from "@/lib/oura/types";
import { aggregate, fetchWide, METRICS, type DayRow, type Period } from "@/lib/oura/metrics";
import { Welcome } from "@/components/welcome";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const overviewConfig = {
  readiness_score: { label: "Readiness", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function TrendsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [startDate, setStartDate] = useState(isoDaysAgo(365));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const [period, setPeriod] = useState<Period>("weekly");
  const [rows, setRows] = useState<DayRow[] | null>(null);
  const [tags, setTags] = useState<EnhancedTag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [charts, setCharts] = useState<string[]>(["readiness_score", "avg_hrv"]);
  const [brush, setBrush] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => setAuthorized(hasToken()), []);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    setBrush(null);
    fetchWide(startDate, endDate)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(String(e.message ?? e)));
    fetchAll<EnhancedTag>("enhanced_tag", { start_date: startDate, end_date: endDate })
      .then((t) => !cancelled && setTags(t))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authorized, startDate, endDate]);

  const aggregated = useMemo(() => (rows ? aggregate(rows, period) : null), [rows, period]);

  const visible = useMemo(() => {
    if (!aggregated) return null;
    if (!brush) return aggregated;
    return aggregated.slice(brush.start, brush.end + 1);
  }, [aggregated, brush]);

  const tagSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tags) {
      const name = t.custom_name ?? t.tag_type_code ?? "tag";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [tags]);

  if (authorized === false) return <Welcome />;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <AppHeader active="trends" />

      <section className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Period</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Add chart</Label>
          <Select
            value=""
            onValueChange={(key) => setCharts((c) => (c.includes(key) ? c : [...c, key]))}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Add Chart" />
            </SelectTrigger>
            <SelectContent>
              {(["Scores", "Sleep", "Heart & Body", "Activity"] as const).map((group) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {METRICS.filter((m) => m.group === group).map((m) => (
                    <SelectItem key={m.key} value={m.key} disabled={charts.includes(m.key)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load your data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!aggregated ? (
        <Skeleton className="h-[160px] rounded-xl" />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <p className="mb-1 text-sm text-muted-foreground">
              Timeline — drag to zoom, charts below follow
            </p>
            <ChartContainer config={overviewConfig} className="h-[140px] w-full">
              <AreaChart data={aggregated} margin={{ left: 0, right: 0, top: 4 }}>
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={64}
                  tickFormatter={(d: string) =>
                    new Date(d).toLocaleDateString(undefined, { month: "short", year: "2-digit" })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="readiness_score"
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Brush
                  dataKey="day"
                  height={24}
                  stroke="var(--muted-foreground)"
                  fill="transparent"
                  travellerWidth={8}
                  tickFormatter={() => ""}
                  onChange={(range) => {
                    if (range?.startIndex !== undefined && range?.endIndex !== undefined) {
                      setBrush({ start: range.startIndex, end: range.endIndex });
                    }
                  }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {tagSummary.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 text-sm text-muted-foreground">
              Tags from {startDate} to {endDate}
            </p>
            <div className="flex flex-wrap gap-2">
              {tagSummary.map(([name, count]) => (
                <Badge key={name} variant="outline">
                  {name.replace(/^tag_generic_/, "").replaceAll("_", " ")} × {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {visible &&
        charts.map((key, i) => (
          <MetricPanel
            key={key}
            metricKey={key}
            data={visible}
            index={i}
            onRemove={() => setCharts((c) => c.filter((k) => k !== key))}
          />
        ))}

      {visible && charts.length >= 2 && (
        <CorrelationMatrixCard data={visible} metricKeys={charts} />
      )}
    </main>
  );
}
