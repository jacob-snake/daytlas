"use client";
import { useCallback, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { DayOrb } from "@/components/ui/day-orb";
import { useOuraSession, useOuraQuery } from "@/lib/use-oura-query";
import { detectFirstDay, fetchWide } from "@/lib/oura/metrics";
import { profileSummary, sleepDuration } from "@/lib/profile-summary";
import { localDay } from "@/lib/dates";
import { HistoryLoading, DataError } from "@/components/data-state";
const monthLabel = (month: string) =>
  format(parseISO(`${month}-01`), "MMMM yyyy");
export function MonthOverview() {
  const session = useOuraSession();
  const [selected, setSelected] = useState<string | null>(null);
  const load = useCallback(
    async () => fetchWide(await detectFirstDay(), localDay()),
    [],
  );
  const { data: rows, error } = useOuraQuery(
    session && `${session}:history`,
    load,
  );
  if (error) return <DataError error={error} />;
  if (!rows) return <HistoryLoading />;
  const summary = profileSummary(rows, localDay());
  const current =
    summary.months.find((m) => m.month === selected) ?? summary.months.at(-1);
  return (
    <section
      id="your-months"
      aria-label="Your recent twelve months"
      className="space-y-5 scroll-mt-28"
    >
      <Card>
        <CardHeader>
          <CardTitle>Your months, at a glance</CardTitle>
          <CardDescription>
            The twelve months ending with your latest available record. Select a
            month to explore main sleep duration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="grid grid-cols-3 gap-3 sm:grid-cols-6"
            aria-label="Choose a month"
          >
            {summary.months.map((month) => (
              <button
                key={month.month}
                type="button"
                aria-pressed={current?.month === month.month}
                onClick={() => setSelected(month.month)}
                className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-transparent p-3 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-border aria-pressed:bg-secondary"
              >
                <span
                  aria-hidden="true"
                  className="relative block size-14 shrink-0"
                >
                  <DayOrb
                    className="absolute left-2 top-2"
                    state={month.average === null ? "missing" : "recorded"}
                  />
                  <svg
                    viewBox="0 0 56 56"
                    className="absolute inset-0 size-full -rotate-90"
                    fill="none"
                  >
                    <circle
                      cx="28"
                      cy="28"
                      r="26"
                      stroke="var(--border)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="26"
                      pathLength="100"
                      stroke="var(--chart-1)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={`${(100 * month.count) / month.calendarDays} 100`}
                    />
                  </svg>
                </span>
                <span>{format(parseISO(`${month.month}-01`), "MMM")}</span>
                <span className="text-xs text-muted-foreground">
                  {month.month.slice(0, 4)}
                </span>
                <span className="sr-only">
                  {month.count} recorded nights, {sleepDuration(month.average)}
                </span>
              </button>
            ))}
          </div>
          {current && (
            <div
              className="mt-6 rounded-2xl bg-secondary p-5"
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="text-sm text-muted-foreground">
                {monthLabel(current.month)} · Average main sleep
              </p>
              <p className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
                {sleepDuration(current.average)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {current.count} recorded nights · {current.missing} calendar
                days without a duration record
                {current.month === localDay().slice(0, 7)
                  ? " through today"
                  : ""}
                .
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <section
        className="grid gap-5 md:grid-cols-2"
        aria-label="Patterns in your available history"
      >
        <Card>
          <CardHeader>
            <CardTitle>A little more time asleep</CardTitle>
            <CardDescription>
              Highest monthly average in this view
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-medium tracking-tight">
              {summary.longest
                ? monthLabel(summary.longest.month)
                : "More nights needed"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {summary.longest
                ? `${sleepDuration(summary.longest.average)} across ${summary.longest.count} recorded nights.`
                : "We need at least two months with seven duration records each to compare."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>A steadier sleep duration</CardTitle>
            <CardDescription>
              Lowest variation in recorded duration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-medium tracking-tight">
              {summary.steadiest
                ? monthLabel(summary.steadiest.month)
                : "Building the picture"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {summary.steadiest
                ? `${Math.round(summary.steadiest.deviation! * 60)} min standard deviation across ${summary.steadiest.count} recorded nights.`
                : "We need at least two months with seven duration records each to compare."}
            </p>
          </CardContent>
        </Card>
      </section>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Comparisons use available nights in the twelve months shown, with at
        least seven per eligible month. Coverage can differ. Longer or less
        variable sleep does not automatically mean better health.
      </p>
    </section>
  );
}
