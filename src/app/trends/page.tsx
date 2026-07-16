"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Area, AreaChart, Brush, XAxis } from "recharts";
import { AlertCircle } from "lucide-react";
import { MoonIcon, HeartbeatIcon, PersonSimpleRunIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/date-range-picker";
import { CommandPalette } from "@/components/command-palette";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendSection, type SectionDef } from "@/components/trends/trend-section";
import { hasToken, fetchAll } from "@/lib/oura/client";
import type { EnhancedTag } from "@/lib/oura/types";
import { aggregate, detectFirstDay, fetchWide, type DayRow, type Period } from "@/lib/oura/metrics";
import { Welcome } from "@/components/welcome";

const SECTIONS: SectionDef[] = [
  {
    id: "sleep",
    title: "Sleep",
    icon: MoonIcon,
    color: "var(--chart-1)",
    headline: "sleep_score",
    metrics: [
      "sleep_score",
      "total_sleep",
      "time_in_bed",
      "deep_sleep",
      "light_sleep",
      "rem_sleep",
      "awake_time",
      "sleep_efficiency",
      "sleep_latency",
      "bedtime",
      "wakeup_time",
      "midpoint",
    ],
    defaults: ["sleep_score", "total_sleep"],
  },
  {
    id: "readiness",
    title: "Readiness & Heart",
    icon: HeartbeatIcon,
    color: "var(--chart-2)",
    headline: "readiness_score",
    metrics: [
      "readiness_score",
      "avg_hrv",
      "avg_resting_hr",
      "lowest_resting_hr",
      "respiratory_rate",
      "avg_spo2",
      "temp_deviation",
      "temp_trend_deviation",
    ],
    defaults: ["readiness_score", "avg_hrv"],
  },
  {
    id: "activity",
    title: "Activity",
    icon: PersonSimpleRunIcon,
    color: "var(--chart-3)",
    headline: "activity_score",
    metrics: [
      "activity_score",
      "steps",
      "activity_burn",
      "total_burn",
      "avg_met",
      "walking_equivalency",
      "high_activity",
      "medium_activity",
      "low_activity",
      "inactive_time",
      "resting_time",
      "non_wear",
    ],
    defaults: ["activity_score", "steps"],
  },
];

const overviewConfig = {
  readiness_score: { label: "Readiness", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function TrendsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [firstDay, setFirstDay] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("weekly");
  const [rows, setRows] = useState<DayRow[] | null>(null);
  const [tags, setTags] = useState<EnhancedTag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [brush, setBrush] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => setAuthorized(hasToken()), []);

  // Default range: from this user's very first Oura record (like Oura web).
  useEffect(() => {
    if (!authorized) return;
    detectFirstDay().then((d) => {
      setFirstDay(d);
      setStartDate((s) => s ?? d);
    });
  }, [authorized]);

  useEffect(() => {
    if (!authorized || !startDate) return;
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

  const visibleLabel = useMemo(() => {
    if (!visible?.length) return null;
    const f = (d: string) => format(new Date(d), "d MMM yyyy");
    return `${f(visible[0].day as string)} – ${f(visible[visible.length - 1].day as string)}`;
  }, [visible]);

  const tagSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tags) {
      const name = (t.custom_name ?? t.tag_type_code ?? "tag")
        .replace(/^tag_generic_/, "")
        .replaceAll("_", " ");
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [tags]);

  if (authorized === false) return <Welcome />;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-10">
      <AppHeader active="trends" />
      <CommandPalette />

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load your data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            {visibleLabel ?? "…"} — drag the handles to zoom, every chart below follows
          </CardDescription>
          <CardAction className="flex flex-wrap items-center gap-2">
            {startDate ? (
              <DateRangePicker
                allDataStart={firstDay ?? undefined}
                value={{ start: startDate, end: endDate }}
                onChange={(r) => {
                  setStartDate(r.start);
                  setEndDate(r.end);
                }}
              />
            ) : (
              <Skeleton className="h-8 w-[240px]" />
            )}
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="daily">Day</TabsTrigger>
                <TabsTrigger value="weekly">Week</TabsTrigger>
                <TabsTrigger value="monthly">Month</TabsTrigger>
                <TabsTrigger value="quarterly">Quarter</TabsTrigger>
                <TabsTrigger value="yearly">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          {!aggregated ? (
            <Skeleton className="h-[150px] rounded-xl" />
          ) : (
            <ChartContainer config={overviewConfig} className="h-[150px] w-full">
              <AreaChart data={aggregated} margin={{ left: 0, right: 0, top: 4 }}>
                <defs>
                  <linearGradient id="tl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={72}
                  tickFormatter={(d: string) => format(new Date(d), "MMM yy")}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) =>
                        format(new Date(payload?.[0]?.payload?.day), "d MMM yyyy")
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="readiness_score"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill="url(#tl)"
                  dot={false}
                  connectNulls
                />
                <Brush
                  dataKey="day"
                  height={30}
                  stroke="var(--border)"
                  fill="var(--secondary)"
                  travellerWidth={10}
                  traveller={(props) => {
                    const { x, y, width, height } = props as {
                      x: number; y: number; width: number; height: number;
                    };
                    return (
                      <g>
                        <rect x={x} y={y + 2} width={width} height={height - 4} rx={5} fill="var(--foreground)" />
                        <line
                          x1={x + width / 2} x2={x + width / 2}
                          y1={y + 9} y2={y + height - 9}
                          stroke="var(--background)" strokeWidth={1.5} strokeLinecap="round"
                        />
                      </g>
                    );
                  }}
                  tickFormatter={() => ""}
                  onChange={(range) => {
                    if (range?.startIndex !== undefined && range?.endIndex !== undefined) {
                      setBrush({ start: range.startIndex, end: range.endIndex });
                    }
                  }}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {tagSummary.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 text-sm font-medium">Tags in this range</p>
            <div className="flex flex-wrap gap-2">
              {tagSummary.map(([name, count]) => (
                <Badge key={name} variant="outline">
                  {name} × {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!visible ? (
        <>
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </>
      ) : (
        SECTIONS.map((s) => <TrendSection key={s.id} section={s} data={visible} />)
      )}

      <AppFooter />
    </main>
  );
}
