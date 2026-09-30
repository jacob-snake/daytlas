"use client";
import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { CommandPalette } from "@/components/command-palette";
import { Welcome } from "@/components/welcome";
import { PageHeading } from "@/components/page-heading";
import { DataError, HistoryLoading } from "@/components/data-state";
import { ScoreCard } from "@/components/dashboard/score-card";
import { SampleChart, SleepStages } from "@/components/day-detail/day-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOuraQuery, useOuraSession } from "@/lib/use-oura-query";
import { fetchDayDetail, fetchDayHeartRate } from "@/lib/oura/day-detail";
import {
  baseline,
  daytimeAverages,
  dayBounds,
  heartPoints,
  samplePoints,
} from "@/lib/day-detail";
import { mainSleepByDay } from "@/lib/oura/metrics";
import { isDay, localDay, parseDay, shiftDay } from "@/lib/dates";

const number = (n: number) =>
  (Number(n.toFixed(1)) || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
function Reading({
  label,
  value,
  unit,
  comparison,
  partial = false,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
  comparison: ReturnType<typeof baseline>;
  partial?: boolean;
}) {
  const valid = typeof value === "number" && Number.isFinite(value);
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/50 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">
        {valid ? number(value) : "—"}
        <span className="ml-1 text-sm font-medium text-muted-foreground">
          {unit}
        </span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {comparison.average !== null ? (
          <>
            {number(comparison.average)} {unit} · previous 30-day{" "}
            {partial ? "full-day " : ""}average
            {valid && (
              <>
                {" "}
                · {value - comparison.average > 0 ? "+" : ""}
                {number(value - comparison.average)} {unit}
              </>
            )}
          </>
        ) : (
          "Not enough history for a 30-day average"
        )}
        <br />
        {comparison.count}/30 days recorded · selected day excluded
      </p>
    </div>
  );
}
function Contributors({
  title,
  values,
}: {
  title: string;
  values?: Record<string, number | null>;
}) {
  if (!values || !Object.values(values).some((v) => v !== null)) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {Object.entries(values).map(([key, value]) => (
          <div key={key}>
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span className="capitalize">{key.replaceAll("_", " ")}</span>
              <span className="tabular-nums">
                {value ?? "—"}
                <span className="text-muted-foreground"> /100</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
export default function DayDetail() {
  const session = useOuraSession(),
    today = localDay();
  const [selected, setSelected] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0),
    [episode, setEpisode] = useState("");
  const end = selected ?? today;
  const load = useCallback(() => fetchDayDetail(end), [end]);
  const query = useOuraQuery(
    session && `${session}:day:${end}:${attempt}`,
    load,
  );
  const data = query.data;
  const latest = data
    ? [...data.sleep, ...data.readiness, ...data.activity, ...data.periods]
        .map((r) => r.day)
        .filter((d) => isDay(d) && d <= today)
        .sort()
        .at(-1)
    : null;
  const day = selected ?? latest ?? today;
  const loadHeart = useCallback(() => fetchDayHeartRate(day), [day]);
  const heart = useOuraQuery(
    session && data && `${session}:day-heart:${day}:${attempt}`,
    loadHeart,
  );
  const mainPeriods = useMemo(
    () => (data ? [...mainSleepByDay(data.periods).values()] : []),
    [data],
  );
  const periods = data?.periods.filter((p) => p.day === day) ?? [];
  const main = mainPeriods.find((p) => p.day === day);
  const night = periods.find((p) => p.id === episode) ?? main ?? periods[0];
  const sleep = data?.sleep.find((r) => r.day === day),
    readiness = data?.readiness.find((r) => r.day === day),
    activity = data?.activity.find((r) => r.day === day);
  const imported = session?.startsWith("import:");
  const partial = day === today;
  const bounds = dayBounds(day),
    dayHeart = heartPoints(heart.data?.rows ?? [], day),
    dayMeans = daytimeAverages(heart.data?.rows ?? []);
  const hrBaseline = baseline(mainPeriods, day, (p) => p.average_heart_rate),
    hrvBaseline = baseline(mainPeriods, day, (p) => p.average_hrv);
  const choose = (value: string) => {
    if (isDay(value) && value <= today) {
      setSelected(value);
      setEpisode("");
    }
  };
  if (!session) return <Welcome />;
  return (
    <main id="main-content" className="app-page">
      <AppHeader active="day" />
      <CommandPalette />
      <PageHeading
        title="A closer look at your day."
        description="Your night, recovery and activity — with context from the 30 days before."
      />
      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label
              htmlFor="detail-day"
              className="mb-2 block text-xs font-medium text-muted-foreground"
            >
              Day detail
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous day"
                onClick={() => choose(shiftDay(day, -1))}
              >
                <ChevronLeft />
              </Button>
              <Input
                id="detail-day"
                type="date"
                value={day}
                max={today}
                onChange={(e) => choose(e.target.value)}
                className="w-auto min-w-0"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next day"
                disabled={day >= today}
                onClick={() => choose(shiftDay(day, 1))}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSelected(null);
              setEpisode("");
              setAttempt((v) => v + 1);
            }}
          >
            Latest available
          </Button>
        </CardContent>
      </Card>
      {query.error ? (
        <DataError error={query.error} retry={() => setAttempt((v) => v + 1)} />
      ) : !data ? (
        <HistoryLoading />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">
              {format(parseDay(day), "EEEE, d MMMM yyyy")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {partial
                ? "Today so far · data may still update"
                : "Recorded day · missing data stays blank"}
            </p>
          </div>
          {data.failures > 0 && (
            <div role="status" className="text-sm">
              <p>
                Some daily collections could not be loaded. Available data is
                shown below.
              </p>
              <Button
                variant="outline"
                onClick={() => setAttempt((v) => v + 1)}
              >
                Retry missing data
              </Button>
            </div>
          )}
          <section
            aria-label="Selected day scores"
            className="grid gap-4 md:grid-cols-3"
          >
            {[
              {
                label: "Readiness",
                row: readiness,
                rows: data.readiness,
                color: "var(--chart-2)",
              },
              {
                label: "Sleep",
                row: sleep,
                rows: data.sleep,
                color: "var(--chart-1)",
              },
              {
                label: "Activity",
                row: activity,
                rows: data.activity,
                color: "var(--chart-3)",
              },
            ].map((s) => {
              const b = baseline<{ day: string; score: number | null }>(
                s.rows,
                day,
                (r) => r.score,
              );
              return (
                <ScoreCard
                  key={s.label}
                  label={s.label}
                  value={s.row?.score ?? null}
                  delta={
                    s.row?.score != null && b.average !== null
                      ? s.row.score - b.average
                      : null
                  }
                  neutral={partial && s.label === "Activity"}
                  color={s.color}
                  day={format(parseDay(day), "d MMM")}
                  comparison={`vs previous 30 days · ${b.count}/30 recorded${partial && s.label === "Activity" ? " · today incomplete" : ""}`}
                />
              );
            })}
          </section>
          <section aria-labelledby="night-title" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="night-title" className="text-2xl font-bold">
                  Last night
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sleep episodes assigned to this day by Oura. Times use this
                  device’s timezone.
                </p>
              </div>
              {periods.length > 1 && (
                <Select value={night?.id} onValueChange={setEpisode}>
                  <SelectTrigger aria-label="Sleep episode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.id === main?.id ? "Main sleep" : "Additional sleep"}{" "}
                        ·{" "}
                        {new Date(p.bedtime_start).toLocaleTimeString(
                          undefined,
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {night ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Reading
                    label="Total sleep"
                    value={
                      night.total_sleep_duration == null
                        ? null
                        : night.total_sleep_duration / 3600
                    }
                    unit="h"
                    comparison={baseline(mainPeriods, day, (p) =>
                      p.total_sleep_duration == null
                        ? null
                        : p.total_sleep_duration / 3600,
                    )}
                  />
                  <Reading
                    label="Average HRV"
                    value={night.average_hrv}
                    unit="ms"
                    comparison={hrvBaseline}
                  />
                  <Reading
                    label="Average resting heart rate"
                    value={night.average_heart_rate}
                    unit="bpm"
                    comparison={hrBaseline}
                  />
                  <Reading
                    label="Lowest resting heart rate"
                    value={night.lowest_heart_rate}
                    unit="bpm"
                    comparison={baseline(
                      mainPeriods,
                      day,
                      (p) => p.lowest_heart_rate,
                    )}
                  />
                </div>
                {night.id !== main?.id && (
                  <p className="text-sm text-muted-foreground">
                    Additional sleep selected. Baselines describe previous main
                    nights, which can differ from naps.
                  </p>
                )}
                <SleepStages period={night} />
                <div className="grid gap-5 lg:grid-cols-2">
                  <SampleChart
                    title="Overnight HRV"
                    points={samplePoints(
                      night.hrv,
                      Date.parse(night.bedtime_start),
                      Date.parse(night.bedtime_end),
                    )}
                    unit="ms"
                    color="var(--chart-4)"
                    average={hrvBaseline.average}
                  />
                  <SampleChart
                    title="Overnight heart rate"
                    points={samplePoints(
                      night.heart_rate,
                      Date.parse(night.bedtime_start),
                      Date.parse(night.bedtime_end),
                    )}
                    unit="bpm"
                    average={hrBaseline.average}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Reading
                    label="Sleep efficiency"
                    value={night.efficiency}
                    unit="%"
                    comparison={baseline(mainPeriods, day, (p) => p.efficiency)}
                  />
                  <Reading
                    label="Time to fall asleep"
                    value={night.latency == null ? null : night.latency / 60}
                    unit="min"
                    comparison={baseline(mainPeriods, day, (p) =>
                      p.latency == null ? null : p.latency / 60,
                    )}
                  />
                  <Reading
                    label="Breathing rate"
                    value={night.average_breath}
                    unit="/min"
                    comparison={baseline(
                      mainPeriods,
                      day,
                      (p) => p.average_breath,
                    )}
                  />
                </div>
              </>
            ) : (
              <Card>
                <CardContent>
                  No sleep period is available for this date.
                </CardContent>
              </Card>
            )}
            <Contributors
              title="Sleep contributors"
              values={sleep?.contributors}
            />
            <Contributors
              title="Readiness contributors"
              values={readiness?.contributors}
            />
            <Reading
              label="Temperature deviation"
              value={readiness?.temperature_deviation}
              unit="°C"
              comparison={baseline(
                data.readiness,
                day,
                (r) => r.temperature_deviation,
              )}
            />
          </section>
          <section aria-labelledby="activity-title" className="space-y-5">
            <div>
              <h2 id="activity-title" className="text-2xl font-bold">
                Daytime activity
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {partial
                  ? "Today so far is compared with previous full days. This is progress, not a final daily result."
                  : "Daily totals compared with the previous 30 calendar days."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Reading
                label="Steps"
                value={activity?.steps}
                unit="steps"
                comparison={baseline(data.activity, day, (r) => r.steps)}
                partial={partial}
              />
              <Reading
                label="Active energy"
                value={activity?.active_calories}
                unit="kcal"
                comparison={baseline(
                  data.activity,
                  day,
                  (r) => r.active_calories,
                )}
                partial={partial}
              />
              <Reading
                label="Total energy"
                value={activity?.total_calories}
                unit="kcal"
                comparison={baseline(
                  data.activity,
                  day,
                  (r) => r.total_calories,
                )}
                partial={partial}
              />
              <Reading
                label="Walking equivalency"
                value={
                  activity?.equivalent_walking_distance == null
                    ? null
                    : activity.equivalent_walking_distance / 1000
                }
                unit="km"
                comparison={baseline(data.activity, day, (r) =>
                  r.equivalent_walking_distance == null
                    ? null
                    : r.equivalent_walking_distance / 1000,
                )}
                partial={partial}
              />
            </div>
            {imported ? (
              <p className="text-sm text-muted-foreground">
                Intraday heart-rate samples are not included in this file
                import.
              </p>
            ) : heart.error ? (
              <DataError
                error={heart.error}
                retry={() => setAttempt((v) => v + 1)}
              />
            ) : heart.loading ? (
              <HistoryLoading />
            ) : (
              <>
                {heart.data?.partial && (
                  <p role="status" className="text-sm text-muted-foreground">
                    Some heart-rate history could not be loaded. Comparisons use
                    the available days.
                  </p>
                )}
                <SampleChart
                  title="Heart rate throughout the day"
                  points={dayHeart}
                  unit="bpm"
                  color="var(--chart-2)"
                  domain={[bounds.start, bounds.end]}
                />
                <Reading
                  label="Daytime resting heart rate"
                  value={dayMeans.find((r) => r.day === day)?.value}
                  unit="bpm"
                  comparison={baseline(dayMeans, day, (r) => r.value)}
                  partial={partial}
                />
                <p className="text-xs text-muted-foreground">
                  Daytime resting average uses awake/rest samples only; sleep
                  and workouts are excluded. Gaps longer than 15 minutes stay
                  visible. Sampling coverage can vary between days.
                </p>
              </>
            )}
            <SampleChart
              title="Activity intensity"
              points={samplePoints(
                activity?.met,
                bounds.start,
                Math.min(bounds.end, data.fetchedAt),
              )}
              unit="MET"
              color="var(--chart-3)"
              bars
              domain={[bounds.start, bounds.end]}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  { label: "Inactive", key: "sedentary_time" },
                  { label: "Low activity", key: "low_activity_time" },
                  { label: "Medium activity", key: "medium_activity_time" },
                  { label: "High activity", key: "high_activity_time" },
                ] as const
              ).map((r) => (
                <Reading
                  key={r.key}
                  label={r.label}
                  value={
                    activity?.[r.key] == null ? null : activity[r.key] / 60
                  }
                  unit="min"
                  comparison={baseline(data.activity, day, (a) =>
                    a[r.key] == null ? null : a[r.key] / 60,
                  )}
                  partial={partial}
                />
              ))}
            </div>
            <Contributors
              title="Activity contributors"
              values={activity?.contributors}
            />
          </section>
        </>
      )}
      <AppFooter />
    </main>
  );
}
