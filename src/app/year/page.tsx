"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { CommandPalette } from "@/components/command-palette";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Welcome } from "@/components/welcome";
import { YearHeatmap } from "@/components/year/heatmap";
import { RingYear } from "@/components/year/ring-year";
import { SleepBarcode } from "@/components/year/sleep-barcode";
import { hasToken } from "@/lib/oura/client";
import { detectFirstDay, fetchWide, METRICS, type DayRow } from "@/lib/oura/metrics";

const HEATMAP_METRICS = ["sleep_score", "readiness_score", "activity_score", "avg_hrv", "total_sleep", "steps"];

export default function YearPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [metricKey, setMetricKey] = useState("sleep_score");
  const [rows, setRows] = useState<DayRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAuthorized(hasToken()), []);

  useEffect(() => {
    if (!authorized) return;
    detectFirstDay().then((first) => {
      const firstYear = Number(first.slice(0, 4));
      const now = new Date().getFullYear();
      setYears(Array.from({ length: now - firstYear + 1 }, (_, i) => firstYear + i));
    });
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    const end = `${year}-12-31` < today ? `${year}-12-31` : today;
    fetchWide(`${year}-01-01`, end)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(String(e.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [authorized, year]);

  const metricOptions = useMemo(
    () => METRICS.filter((m) => HEATMAP_METRICS.includes(m.key)),
    []
  );

  if (authorized === false) return <Welcome />;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <AppHeader active="year" />
      <CommandPalette />

      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Tabs value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <TabsList>
              {years.map((y) => (
                <TabsTrigger key={y} value={String(y)}>
                  {y}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-1.5">
          <Label>Heatmap metric</Label>
          <Select value={metricKey} onValueChange={setMetricKey}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load your data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!rows ? (
        <>
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </>
      ) : (
        <>
          <div className="stagger-item">
            <Card>
              <CardHeader>
                <CardTitle>The rings</CardTitle>
                <CardDescription>
                  {year} wrapped around a circle — every spoke is one day, faint grey is yet to come
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
                <CardDescription>Every day of {year} as one square</CardDescription>
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
                  Your nights as a barcode — spot weekend drift, holidays and jetlag instantly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SleepBarcode rows={rows} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
      <AppFooter />
    </main>
  );
}
