"use client";
import {
  FloatingDateRange,
  TrendsRangeControls,
} from "@/components/trends/floating-date-range";
import { SectionNavigation } from "@/components/trends/section-navigation";
import { HistoryTimeline } from "@/components/trends/history-timeline";
import { DateWindow } from "@/components/trends/date-window";
import {
  HeartPulseIcon,
  Moon02Icon,
  WorkoutRunIcon,
} from "@hugeicons/core-free-icons";

import { useCallback, useMemo, useState } from "react";
import { format, subDays, subYears } from "date-fns";
import { DataError, NoData } from "@/components/data-state";
import { PageHeading } from "@/components/page-heading";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { CardContent } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommandPalette } from "@/components/command-palette";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendSection,
  type SectionDef,
} from "@/components/trends/trend-section";
import {
  aggregate,
  detectFirstDay,
  fetchWide,
  type Period,
} from "@/lib/oura/metrics";
import { Welcome } from "@/components/welcome";
import { useOuraQuery, useOuraSession } from "@/lib/use-oura-query";

const SECTIONS: SectionDef[] = [
  {
    id: "readiness",
    title: "Readiness & Heart",
    icon: HeartPulseIcon,
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
    id: "sleep",
    title: "Sleep",
    icon: Moon02Icon,
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
    id: "activity",
    title: "Activity",
    icon: WorkoutRunIcon,
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

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export default function TrendsPage() {
  const session = useOuraSession();
  const [chosenStart, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(iso(new Date()));
  const [period, setPeriod] = useState<Period>("weekly");
  const firstDayQuery = useOuraQuery(
    session && `${session}:firstDay`,
    detectFirstDay,
  );
  const firstDay = firstDayQuery.data;
  const startDate = chosenStart ?? firstDay;
  const rangeKey =
    session && firstDay ? `${session}:trends:history:${firstDay}` : null;
  const loadRows = useCallback(
    () => fetchWide(firstDay!, iso(new Date())),
    [firstDay],
  );
  const rowsQuery = useOuraQuery(rangeKey, loadRows);
  const allRows = rowsQuery.data;
  const rows = useMemo(
    () =>
      allRows?.filter(
        (row) => (!startDate || row.day >= startDate) && row.day <= endDate,
      ) ?? null,
    [allRows, startDate, endDate],
  );
  const error = rowsQuery.error ?? (!chosenStart ? firstDayQuery.error : null);
  const aggregated = useMemo(
    () => (rows ? aggregate(rows, period) : null),
    [rows, period],
  );

  const visible = aggregated;

  const PRESETS = useMemo(
    () => [
      { label: "30 days", start: iso(subDays(new Date(), 29)) },
      { label: "90 days", start: iso(subDays(new Date(), 89)) },
      { label: "180 days", start: iso(subDays(new Date(), 179)) },
      { label: "1 year", start: iso(subYears(new Date(), 1)) },
      { label: "All data", start: firstDay },
    ],
    [firstDay],
  );

  const rangeControls = (location: string) => (
    <CardContent className="space-y-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          label="Date range"
          value={
            endDate === iso(new Date())
              ? (PRESETS.find((p) => p.start === startDate)?.label ?? "")
              : ""
          }
          onValueChange={(label) => {
            const preset = PRESETS.find((p) => p.label === label);
            if (preset?.start) {
              setStartDate(
                firstDay && preset.start < firstDay ? firstDay : preset.start,
              );
              setEndDate(iso(new Date()));
            }
          }}
          className="max-w-full flex-wrap [&_button]:px-3"
          options={PRESETS.map((p) => ({ value: p.label, label: p.label }))}
        />
        <div className="flex items-center gap-3">
          <label
            htmlFor={`trend-period-${location}`}
            className="text-sm font-medium text-muted-foreground"
          >
            View by
          </label>
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as Period)}
          >
            <SelectTrigger
              id={`trend-period-${location}`}
              className="min-w-32 rounded-xl"
              aria-label="Average readings by period"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {allRows && startDate && (
        <HistoryTimeline
          rows={allRows}
          start={startDate}
          end={endDate}
          onChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      )}
      <div className="border-t border-border/50 pt-4">
        {startDate ? (
          <DateWindow
            start={startDate}
            end={endDate}
            min={firstDay ?? undefined}
            max={iso(new Date())}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        ) : !error ? (
          <Skeleton className="h-20 w-full" />
        ) : null}
      </div>
    </CardContent>
  );

  const rangeSummary = startDate
    ? `${format(new Date(startDate + "T12:00:00"), startDate.slice(0, 4) === endDate.slice(0, 4) ? "d MMM" : "d MMM yy")}–${format(new Date(endDate + "T12:00:00"), "d MMM yy")}`
    : "Loading history";

  if (!session) return <Welcome />;

  return (
    <main id="main-content" className="app-page">
      <AppHeader active="trends" />
      <CommandPalette
        onAddChart={(key) =>
          window.dispatchEvent(
            new CustomEvent("woura:add-chart", { detail: key }),
          )
        }
      />

      <PageHeading
        title="Follow your patterns."
        description="Explore the history behind your scores. Pick a time frame, then add the metrics you’re curious about."
      />

      {error && <DataError error={error} />}

      <FloatingDateRange
        ready={!!startDate && !!allRows}
        period={period}
        onPeriodChange={setPeriod}
        summary={rangeSummary}
        editor={rangeControls("floating")}
      >
        {rangeControls("main")}
      </FloatingDateRange>

      <div className="relative">
        <SectionNavigation sections={SECTIONS} />
        <div className="min-w-0 space-y-8">
          {visible?.length === 0 && (
            <NoData title="No readings in this date range" />
          )}
          {!visible && !error ? (
            <>
              <Skeleton className="h-[300px] rounded-xl" />
              <Skeleton className="h-[300px] rounded-xl" />
            </>
          ) : (
            visible &&
            SECTIONS.map((s) => (
              <div key={s.id} id={s.id} className="scroll-mt-36">
                <TrendSection
                  section={s}
                  data={visible}
                  period={period}
                  rangeControls={
                    <TrendsRangeControls
                      summary={rangeSummary}
                      period={period}
                      onPeriodChange={setPeriod}
                      editor={rangeControls(`expanded-${s.id}`)}
                    />
                  }
                />
              </div>
            ))
          )}
        </div>
      </div>
      <AppFooter />
    </main>
  );
}
