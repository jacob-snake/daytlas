"use client";
import { useCallback, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { AppHeader } from "@/components/app-header";
import { Welcome } from "@/components/welcome";
import { CommandPalette } from "@/components/command-palette";
import { ScoreCard } from "@/components/dashboard/score-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { VitalsPanels } from "@/components/dashboard/vitals-panels";
import { CardiovascularAgeCard } from "@/components/dashboard/cardiovascular-age-card";
import { CorrelationCard } from "@/components/dashboard/correlation-card";
import { fetchDayScores, type DayScores } from "@/lib/oura/queries";
import { detectFirstDay, fetchWide } from "@/lib/oura/metrics";
import { InsightCards } from "@/components/insights/insight-cards";
import { DistributionCard } from "@/components/insights/distribution-card";
import { SlopeCard } from "@/components/insights/slope-card";
import { WeekReportCard } from "@/components/insights/week-report-card";
import { MilestonesCard } from "@/components/insights/milestones-card";
import { WeekdayCard } from "@/components/insights/weekday-card";
import { ShiftsCard } from "@/components/insights/shifts-card";
import { AppFooter } from "@/components/app-footer";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading } from "@/components/page-heading";
import { DataError, HistoryLoading, NoData } from "@/components/data-state";
import { localDay, shiftDay } from "@/lib/dates";
import { useOuraQuery, useOuraSession } from "@/lib/use-oura-query";

function latestScore(
  data: DayScores[],
  key: "sleep" | "readiness" | "activity",
) {
  const valid = data.filter(
    (d) => typeof d[key] === "number" && Number.isFinite(d[key]),
  );
  const latest = valid.at(-1);
  if (!latest) return { value: null, delta: null, values: [] };
  const previous = valid.filter(
    (d) => d.day < latest.day && d.day >= shiftDay(latest.day, -7),
  );
  const average = previous.length
    ? previous.reduce((sum, d) => sum + d[key]!, 0) / previous.length
    : null;
  return {
    value: latest[key],
    delta: average === null ? null : latest[key]! - average,
    values: valid.slice(-20).map((d) => d[key]!),
    day: format(parseISO(latest.day), "d MMM"),
  };
}
export default function Dashboard() {
  const session = useOuraSession();
  const [days, setDays] = useState(30);
  const loadHistory = useCallback(
    async () => fetchWide(await detectFirstDay(), localDay()),
    [],
  );
  const loadScores = useCallback(() => fetchDayScores(365), []);
  const { data: history, error: historyError } = useOuraQuery(
    session && `${session}:history`,
    loadHistory,
  );
  const { data: yearScores, error } = useOuraQuery(
    session && `${session}:scores:365`,
    loadScores,
  );
  const data = useMemo(
    () =>
      yearScores?.filter(
        (row) => row.day >= format(subDays(new Date(), days - 1), "yyyy-MM-dd"),
      ) ?? null,
    [yearScores, days],
  );
  if (!session) return <Welcome />;
  return (
    <main id="main-content" className="app-page">
      <AppHeader active="dashboard" />
      <CommandPalette />
      <PageHeading
        title="Your daily perspective."
        description="A moment to check in. A little context from the days before."
      />
      {error && <DataError error={error} />}
      {data?.length === 0 ? (
        <NoData />
      ) : (
        <section
          aria-label="Latest available scores"
          className="grid gap-4 md:grid-cols-3"
        >
          {data
            ? (
                [
                  {
                    key: "readiness",
                    label: "Readiness",
                    color: "var(--chart-2)",
                  },
                  { key: "sleep", label: "Sleep", color: "var(--chart-1)" },
                  {
                    key: "activity",
                    label: "Activity",
                    color: "var(--chart-3)",
                  },
                ] as const
              ).map((s) => (
                <ScoreCard
                  key={s.key}
                  label={s.label}
                  color={s.color}
                  {...latestScore(data, s.key)}
                />
              ))
            : !error &&
              [1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-3xl" />
              ))}
        </section>
      )}
      <CardiovascularAgeCard session={session} />
      <div className="pt-5">
        <h2 className="text-2xl font-bold tracking-[-0.035em]">
          The longer view
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Recent weeks in the context of your own recorded history.
        </p>
      </div>
      {historyError ? (
        <DataError error={historyError} />
      ) : !history ? (
        <HistoryLoading />
      ) : history.length > 0 ? (
        <>
          <InsightCards rows={history} />
          {data && data.length > 0 && (
            <TrendChart data={data} days={days} onDaysChange={setDays} />
          )}

          <WeekReportCard rows={history} />
          <div className="grid gap-5 lg:grid-cols-2">
            <InsightCards rows={history} hrv />
            <WeekdayCard rows={history} />
          </div>
          <section
            aria-label="More patterns in your history"
            className="space-y-6"
          >
            <div className="pt-5">
              <h2 className="text-2xl font-bold tracking-tight">
                More of your story
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Distributions, changes and personal milestones.
              </p>
            </div>
            <div className="space-y-5">
              <DistributionCard rows={history} />
              <SlopeCard rows={history} />
              <div className="grid gap-5 lg:grid-cols-2">
                <ShiftsCard rows={history} />
                <MilestonesCard rows={history} />
              </div>
              {data && (
                <>
                  <VitalsPanels data={data} days={days} />
                  <CorrelationCard data={data} />
                </>
              )}
            </div>
          </section>
        </>
      ) : (
        <NoData />
      )}
      <AppFooter />
    </main>
  );
}
