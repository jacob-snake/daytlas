"use client";

import { useCallback, useState } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ExportDialog } from "@/components/dashboard/export-dialog";
import { AppFooter } from "@/components/app-footer";
import { CommandPalette } from "@/components/command-palette";
import { PageHeading } from "@/components/page-heading";
import { Welcome } from "@/components/welcome";
import { DataError, HistoryLoading, NoData } from "@/components/data-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DayOrb } from "@/components/ui/day-orb";
import { useOuraQuery, useOuraSession } from "@/lib/use-oura-query";
import { detectFirstDay, fetchWide } from "@/lib/oura/metrics";
import { localDay } from "@/lib/dates";
import { profileSummary, sleepDuration } from "@/lib/profile-summary";
import { PreferencesCard } from "@/components/onboarding/preferences-card";
import { brand } from "@/lib/brand-config";

const monthLabel = (month: string) =>
  format(parseISO(`${month}-01`), "MMMM yyyy");
const dayLabel = (day: string | null) =>
  day ? format(parseISO(day), "d MMM yyyy") : "No available records";

export default function ProfilePage() {
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
  if (!session) return <Welcome />;
  const summary = rows ? profileSummary(rows, localDay()) : null;
  const current =
    summary?.months.find((month) => month.month === selected) ??
    summary?.months.at(-1);
  return (
    <main id="main-content" className="app-page">
      <AppHeader active="profile" />
      <CommandPalette />
      <PageHeading
        title="Your days, in perspective."
        description="A personal view of the history available in this browser."
      />
      <p className="text-sm text-muted-foreground">
        Your Oura connection or file import does not create a {brand.name}{" "}
        account. Your history and preferences stay in this browser.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Your account · Coming soon</CardTitle>
          <CardDescription>
            We’re preparing accounts for after the current free access period,
            before paid access begins. Your existing browser history stays
            yours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div>
            <h3 className="font-semibold">More personal setup</h3>
            <p className="mt-1 text-muted-foreground">
              Account preferences and more ways to tailor your experience are
              planned.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Weekly email digest · Coming soon</h3>
            <p className="mt-1 text-muted-foreground">
              An optional account benefit. You’ll choose whether to receive it
              here. No subscription is active.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">
              AI connections and AI chat · Coming soon
            </h3>
            <p className="mt-1 text-muted-foreground">
              MCP connections and conversations with AI are on the roadmap.
              Availability will be announced separately.
            </p>
          </div>
          <p className="text-muted-foreground">
            These features will arrive in stages; creating an account won’t
            enable them all at once. Cross-device health history is not
            available yet.
          </p>
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
          >
            About your account
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Download a copy of your records as CSV or JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <ExportDialog />
            <Link
              href="/connect#import"
              className="text-sm font-semibold underline underline-offset-4"
            >
              Import or update an Oura file
            </Link>
          </div>
        </CardContent>
      </Card>
      <PreferencesCard key={session} scope={session} rows={rows} />
      {error ? (
        <DataError error={error} />
      ) : !summary ? (
        <HistoryLoading />
      ) : !summary.records ? (
        <NoData title="Your story starts with the first available record" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Your months, at a glance</CardTitle>
              <CardDescription>
                The twelve months ending with your latest available record.
                Select a month to explore main sleep duration.
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
                      {month.count} recorded nights,{" "}
                      {sleepDuration(month.average)}
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
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Each circle represents a month. The outer ring shows recorded
                sleep durations as a share of calendar days (through today for
                the current month). Size and shading are decorative. An empty
                circle means no available sleep duration. Missing records are
                never counted as zero.
              </p>
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
          <Card>
            <CardHeader>
              <CardTitle>Connection and available history</CardTitle>
              <CardDescription>
                Record dates describe the data we can access, not when you
                joined Oura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Earliest available record
                  </dt>
                  <dd className="mt-1 text-xl">{dayLabel(summary.first)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Latest available record
                  </dt>
                  <dd className="mt-1 text-xl">{dayLabel(summary.latest)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Days with an available measurement
                  </dt>
                  <dd className="mt-1 text-xl">{summary.records}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Main sleep duration records
                  </dt>
                  <dd className="mt-1 text-xl">{summary.nights}</dd>
                </div>
              </dl>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                {session.startsWith("import:")
                  ? "This history is a file snapshot. Upload another complete Oura export to update it. Missing measurements stay empty."
                  : "The latest record date is not a live sync timestamp. Fresh Oura data depends on your ring syncing with the Oura mobile app. Available history can be limited by permissions or missing records."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <Link href="/app/year">Explore your year</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/privacy">Data and privacy</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      <AppFooter />
    </main>
  );
}
