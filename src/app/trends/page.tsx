"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays, subYears } from "date-fns";
import { Area, AreaChart, Brush, ReferenceLine, XAxis } from "recharts";
import { AlertCircle } from "lucide-react";
import { MoonIcon, HeartbeatIcon, PersonSimpleRunIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/date-range-picker";
import { CommandPalette } from "@/components/command-palette";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { TrendSection, type SectionDef } from "@/components/trends/trend-section";
import { hasToken, fetchAll } from "@/lib/oura/client";
import type { EnhancedTag } from "@/lib/oura/types";
import { aggregate, detectFirstDay, fetchWide, type DayRow, type Period } from "@/lib/oura/metrics";
import { Welcome } from "@/components/welcome";
import { cn } from "@/lib/utils";

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

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export default function TrendsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(iso(new Date()));
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

  const yearStarts = useMemo(() => {
    if (!aggregated) return [];
    const seen = new Set<string>();
    const starts: string[] = [];
    for (const r of aggregated) {
      const y = (r.day as string).slice(0, 4);
      if (!seen.has(y)) {
        seen.add(y);
        starts.push(r.day as string);
      }
    }
    return starts.slice(1); // no line at the very first point
  }, [aggregated]);

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

  const PRESETS = useMemo(
    () => [
      { label: "All data", start: firstDay },
      { label: "1 Y", start: iso(subYears(new Date(), 1)) },
      { label: "90 D", start: iso(subDays(new Date(), 90)) },
      { label: "30 D", start: iso(subDays(new Date(), 30)) },
    ],
    [firstDay]
  );

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

      {/* Sticky control bar: section anchors + range presets + picker + period */}
      <div className="sticky top-20 z-10 -mx-2 flex flex-wrap items-center gap-2 rounded-xl border bg-background/85 px-3 py-2 shadow-[var(--shadow-border)] backdrop-blur-xl">
        <nav className="flex items-center gap-1">
          {SECTIONS.map((s) => (
            <Button
              key={s.id}
              variant="ghost"
              size="sm"
              onClick={() =>
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              <s.icon weight="fill" className="size-4" style={{ color: s.color }} />
              <span className="hidden lg:inline">{s.title}</span>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant={startDate === p.start ? "secondary" : "ghost"}
                size="sm"
                className={cn(startDate === p.start && "font-semibold")}
                disabled={!p.start}
                onClick={() => p.start && setStartDate(p.start)}
              >
                {p.label}
              </Button>
            ))}
          </div>
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
            <Skeleton className="h-8 w-[220px]" />
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: "var(--chart-2)" }} />
              <span className="font-medium text-foreground">Readiness score</span>
            </span>
            <span>· {visibleLabel ?? "…"} — drag the handles, every chart below follows</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!aggregated ? (
            <Skeleton className="h-[150px] rounded-xl" />
          ) : (
            <ChartContainer config={overviewConfig} className="h-[170px] w-full">
              <AreaChart data={aggregated} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="day" hide />
                <Brush
                  dataKey="day"
                  height={160}
                  y={0}
                  stroke="var(--border)"
                  fill="var(--secondary)"
                  travellerWidth={14}
                  traveller={(props) => {
                    const { x, y, width, height } = props as {
                      x: number; y: number; width: number; height: number;
                    };
                    return (
                      <g>
                        <rect x={x} y={y} width={width} height={height} rx={7} fill="var(--foreground)" />
                        {[-3, 0, 3].map((o) => (
                          <line
                            key={o}
                            x1={x + width / 2 + o}
                            x2={x + width / 2 + o}
                            y1={y + height / 2 - 12}
                            y2={y + height / 2 + 12}
                            stroke="var(--background)"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                          />
                        ))}
                      </g>
                    );
                  }}
                  tickFormatter={() => ""}
                  onChange={(range) => {
                    if (range?.startIndex !== undefined && range?.endIndex !== undefined) {
                      setBrush({ start: range.startIndex, end: range.endIndex });
                    }
                  }}
                >
                  <AreaChart data={aggregated} margin={{ top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={72}
                      tickMargin={6}
                      tickFormatter={(d: string) => format(new Date(d), "MMM yy")}
                    />
                    {yearStarts.map((d) => (
                      <ReferenceLine key={d} x={d} stroke="var(--border)" strokeWidth={1} />
                    ))}
                    <Area
                      type="monotone"
                      dataKey="readiness_score"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      fill="url(#tl)"
                      dot={false}
                      connectNulls
                    />
                  </AreaChart>
                </Brush>
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {tagSummary.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 text-sm font-semibold">Tags in this range</p>
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
        SECTIONS.map((s) => (
          <div key={s.id} id={s.id} className="scroll-mt-36">
            <TrendSection section={s} data={visible} />
          </div>
        ))
      )}

      <AppFooter />
    </main>
  );
}
