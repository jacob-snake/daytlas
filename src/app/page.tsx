"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { Welcome } from "@/components/welcome";
import { CommandPalette } from "@/components/command-palette";
import { ScoreCard } from "@/components/dashboard/score-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { ExportDialog } from "@/components/dashboard/export-dialog";
import { VitalsPanels } from "@/components/dashboard/vitals-panels";
import { CorrelationCard } from "@/components/dashboard/correlation-card";
import { hasToken } from "@/lib/oura/client";
import { fetchDayScores, type DayScores } from "@/lib/oura/queries";
import { detectFirstDay, fetchWide, type DayRow } from "@/lib/oura/metrics";
import { InsightCards } from "@/components/insights/insight-cards";
import { DistributionCard } from "@/components/insights/distribution-card";
import { SlopeCard } from "@/components/insights/slope-card";
import { WeekReportCard } from "@/components/insights/week-report-card";
import { MilestonesCard } from "@/components/insights/milestones-card";
import { WeekdayCard } from "@/components/insights/weekday-card";
import { ShiftsCard } from "@/components/insights/shifts-card";
import { AppFooter } from "@/components/app-footer";
import { OnboardingCard } from "@/components/onboarding-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function latestAndDelta(data: DayScores[], key: "sleep" | "readiness" | "activity") {
  const withValue = data.filter((d) => d[key] !== null);
  if (!withValue.length) return { value: null, delta: null };
  const latest = withValue[withValue.length - 1][key]!;
  const prev7 = withValue.slice(-8, -1).map((d) => d[key]!);
  const avg = prev7.length ? prev7.reduce((a, b) => a + b, 0) / prev7.length : null;
  return { value: latest, delta: avg === null ? null : latest - avg };
}

export default function Dashboard() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [days, setDays] = useState(90);
  const [data, setData] = useState<DayScores[] | null>(null);
  const [history, setHistory] = useState<DayRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAuthorized(hasToken()), []);

  // Full history feeds the insight/percentile computations (IndexedDB-cached).
  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    detectFirstDay()
      .then((first) => fetchWide(first, new Date().toISOString().slice(0, 10)))
      .then((r) => !cancelled && setHistory(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    setData(null);
    setError(null);
    fetchDayScores(days)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(String(e.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [authorized, days]);

  if (authorized === null) return null;
  if (!authorized) return <Welcome />;

  const sleep = data ? latestAndDelta(data, "sleep") : null;
  const readiness = data ? latestAndDelta(data, "readiness") : null;
  const activity = data ? latestAndDelta(data, "activity") : null;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <AppHeader active="dashboard" />
      <CommandPalette />

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load your data</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {error.includes("401") ? "Your Oura session expired." : error}
            {error.includes("401") && (
              <Button asChild size="sm" variant="outline">
                <a href="/api/auth/login">Sign in again</a>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <OnboardingCard />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today</h2>
        <ExportDialog />
      </div>

      <section className="stagger-item grid gap-4 md:grid-cols-3">
        {data ? (
          <>
            <ScoreCard label="Sleep" value={sleep!.value} delta={sleep!.delta} color="var(--chart-1)" />
            <ScoreCard label="Readiness" value={readiness!.value} delta={readiness!.delta} color="var(--chart-2)" />
            <ScoreCard label="Activity" value={activity!.value} delta={activity!.delta} color="var(--chart-3)" />
          </>
        ) : (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        )}
      </section>

      <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        How you compare
      </h2>

      {history ? (
        <div className="stagger-item">
          <InsightCards rows={history} />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border p-4 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Fetching your entire history for the first time — this happens once, then it&apos;s cached
          on this device.
        </div>
      )}

      <div className="stagger-item">
        {data ? (
          <TrendChart data={data} days={days} onDaysChange={setDays} />
        ) : (
          <Skeleton className="h-[420px] rounded-xl" />
        )}
      </div>

      {history && (
        <div className="stagger-item">
          <DistributionCard rows={history} />
        </div>
      )}

      {history && (
        <div className="stagger-item grid gap-4 lg:grid-cols-2">
          <SlopeCard rows={history} />
          <div className="space-y-4">
            <WeekReportCard rows={history} />
            <MilestonesCard rows={history} />
          </div>
        </div>
      )}

      {history && (
        <>
          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your patterns
          </h2>
          <div className="stagger-item grid gap-4 lg:grid-cols-2">
            <WeekdayCard rows={history} />
            <ShiftsCard rows={history} />
          </div>
        </>
      )}

      {data && (
        <div className="stagger-item">
          <VitalsPanels data={data} />
        </div>
      )}

      {data && (
        <div className="stagger-item">
          <CorrelationCard data={data} />
        </div>
      )}

      <AppFooter />
    </main>
  );
}
