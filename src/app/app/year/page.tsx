"use client";

import { useCallback, useMemo, useState } from "react";
import { DataError, NoData } from "@/components/data-state";
import { PageHeading } from "@/components/page-heading";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { CommandPalette } from "@/components/command-palette";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Welcome } from "@/components/welcome";
import { MonthOverview } from "@/components/year/month-overview";
import { YearStory } from "@/components/year/year-story";
import { YearHeatmap } from "@/components/year/heatmap";
import { RingYear } from "@/components/year/ring-year";
import { SleepBarcode } from "@/components/year/sleep-barcode";
import { detectFirstDay, fetchWide, METRICS } from "@/lib/oura/metrics";
import { useOuraQuery, useOuraSession } from "@/lib/use-oura-query";
import { localDay } from "@/lib/dates";

const HEATMAP_METRICS = [
  "sleep_score",
  "readiness_score",
  "activity_score",
  "avg_hrv",
  "total_sleep",
  "steps",
];

export default function YearPage() {
  const session = useOuraSession();
  const [year, setYear] = useState(new Date().getFullYear());
  const [metricKey, setMetricKey] = useState("sleep_score");
  const loadYears = useCallback(async () => {
    const first = await detectFirstDay();
    const firstYear = Number(first.slice(0, 4));
    const now = new Date().getFullYear();
    return Array.from(
      { length: Math.max(1, now - firstYear + 1) },
      (_, i) => Math.min(firstYear, now) + i,
    );
  }, []);
  const loadYear = useCallback(() => {
    const today = localDay();
    const end = `${year}-12-31` < today ? `${year}-12-31` : today;
    return fetchWide(`${year}-01-01`, end);
  }, [year]);
  const yearsQuery = useOuraQuery(session && `${session}:years`, loadYears);
  const { data: rows, error } = useOuraQuery(
    session && `${session}:year:${year}`,
    loadYear,
  );
  const years = yearsQuery.data ?? [new Date().getFullYear()];

  const metricOptions = useMemo(
    () => METRICS.filter((m) => HEATMAP_METRICS.includes(m.key)),
    [],
  );

  if (!session) return <Welcome />;

  return (
    <main id="main-content" className="app-page">
      <AppHeader active="year" />
      <CommandPalette />
      <PageHeading
        title="Every day adds up."
        description="Step back and see your year in colour. Explore the seasons of your sleep, readiness and activity."
      />

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <Label>Year</Label>
          <SegmentedControl
            label="Year to display"
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="heatmap-metric">Calendar metric</Label>
          <Select value={metricKey} onValueChange={setMetricKey}>
            <SelectTrigger id="heatmap-metric" className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {(error || yearsQuery.error) && (
        <DataError error={(error || yearsQuery.error)!} />
      )}

      {error ? null : rows?.length === 0 ? (
        <NoData title="No readings for this year yet" />
      ) : !rows ? (
        <>
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </>
      ) : (
        <>
          <YearStory key={year} rows={rows} year={year} />
          <div className="stagger-item">
            <Card>
              <CardHeader>
                <CardTitle>A year in three rhythms</CardTitle>
                <CardDescription>
                  Every spoke is a day in {year}. Darker means higher within
                  each metric; grey means no reading. Explore with a pointer or
                  arrow keys.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-3">
                <RingYear rows={rows} metricKey="sleep_score" year={year} />
                <RingYear rows={rows} metricKey="readiness_score" year={year} />
                <RingYear rows={rows} metricKey="activity_score" year={year} />
              </CardContent>
            </Card>
          </div>

          <div className="stagger-item">
            <Card>
              <CardHeader>
                <CardTitle>Your year at a glance</CardTitle>
                <CardDescription>
                  Every day of {year} as one square
                </CardDescription>
              </CardHeader>
              <CardContent>
                <YearHeatmap rows={rows} metricKey={metricKey} year={year} />
              </CardContent>
            </Card>
          </div>

          <div className="stagger-item">
            <Card>
              <CardHeader>
                <CardTitle>Sleep rhythm</CardTitle>
                <CardDescription>
                  Your nights as a barcode — look for changes in bedtime and
                  wake-up time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SleepBarcode rows={rows} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
      <MonthOverview />
      <AppFooter />
    </main>
  );
}
