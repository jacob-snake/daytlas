"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const RANGES = [
  { label: "30 d", days: 30 },
  { label: "90 d", days: 90 },
  { label: "1 y", days: 365 },
];

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.days} value={String(r.days)}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ExportDialog />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load your data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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

      {history ? (
        <div className="stagger-item">
          <InsightCards rows={history} />
        </div>
      ) : (
        <Skeleton className="h-44 rounded-xl" />
      )}

      <div className="stagger-item">
        {data ? <TrendChart data={data} /> : <Skeleton className="h-[420px] rounded-xl" />}
      </div>

      {history && (
        <div className="stagger-item">
          <DistributionCard rows={history} />
        </div>
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
    </main>
  );
}
