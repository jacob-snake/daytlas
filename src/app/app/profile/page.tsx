"use client";
import { useCallback } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import {
  Sparkles,
  Mail,
  CalendarDays,
  Plug,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { CommandPalette } from "@/components/command-palette";
import { PageHeading } from "@/components/page-heading";
import { Welcome } from "@/components/welcome";
import { ExportDialog } from "@/components/dashboard/export-dialog";
import { PreferencesCard } from "@/components/onboarding/preferences-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataError, HistoryLoading } from "@/components/data-state";
import { useOuraSession, useOuraQuery } from "@/lib/use-oura-query";
import { detectFirstDay, fetchWide } from "@/lib/oura/metrics";
import { profileSummary } from "@/lib/profile-summary";
import { localDay } from "@/lib/dates";
const dayLabel = (day: string | null) =>
  day ? format(parseISO(day), "d MMM yyyy") : "No available records";
const features = [
  {
    icon: Sparkles,
    title: "LLM assistants",
    text: "Optional ways to explore questions about your history.",
  },
  {
    icon: Mail,
    title: "Personal digests",
    text: "Choose the topics and updates you want to receive.",
  },
  {
    icon: CalendarDays,
    title: "A richer year in review",
    text: "More ways to revisit your year and keep the moments that matter.",
  },
  {
    icon: Plug,
    title: "MCP connections",
    text: "Connect compatible tools and choose what you share.",
  },
];
export default function ProfilePage() {
  const session = useOuraSession();
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
  const imported = session.startsWith("import:");
  return (
    <main id="main-content" className="app-page">
      <AppHeader active="profile" />
      <CommandPalette />
      <PageHeading
        title="Your space. Your way."
        description="Manage your connection and shape how Daytlas fits into your days."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[285px_minmax(0,1fr)]">
        <aside
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1"
          aria-label="Connection and history"
        >
          <Card>
            <CardHeader>
              <CardTitle>Your connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="font-semibold">
                {session === "demo"
                  ? "Demo · fictional data"
                  : imported
                    ? "Oura file · this browser"
                    : "Oura · this browser"}
              </p>
              <p className="text-muted-foreground">
                Your history is stored in this browser. Connecting Oura does not
                create a Daytlas account.
              </p>
              <Button asChild variant="outline">
                <Link href="/connect">
                  Manage connection
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Your months belong together.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Explore your twelve-month view alongside the rest of your year.
              </p>
              <Button asChild variant="outline">
                <Link href="/app/year#your-months">
                  Explore your year
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Available history</CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <DataError error={error} />
              ) : !summary ? (
                <HistoryLoading />
              ) : (
                <dl className="space-y-4 text-sm">
                  {[
                    ["Earliest available record", dayLabel(summary.first)],
                    ["Latest available record", dayLabel(summary.latest)],
                    [
                      "Days with a measurement",
                      summary.records.toLocaleString(),
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-1 font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>
        </aside>
        <div className="min-w-0 space-y-6">
          <section
            aria-labelledby="premium-title"
            className="overflow-hidden rounded-[var(--ds-radius-card)] border border-border/60 bg-card shadow-[var(--ds-shadow)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-5 bg-[#eaf0fb] p-6 sm:p-8">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#48689b]">
                  Your next chapter
                </p>
                <h2
                  id="premium-title"
                  className="text-3xl font-bold tracking-tight text-[#18232b]"
                >
                  Daytlas Premium
                </h2>
                <p className="mt-3 font-semibold text-[#536b91]">
                  More context. On your terms.
                </p>
              </div>
              <span className="rounded-full bg-white/50 px-4 py-2 text-xs font-bold text-[#48689b]">
                Planned · late October 2026
              </span>
            </div>
            <div className="px-6 sm:px-8">
              {features.map(({ icon: FeatureIcon, title, text }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 border-b border-border/50 py-6 last:border-0"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eff3fb] text-[#48689b]">
                    <FeatureIcon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {text}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Lock className="size-3.5" />
                    <span className="hidden sm:inline">Coming soon</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="px-6 pb-6 text-xs leading-relaxed text-muted-foreground sm:px-8">
              Premium features are not available yet. They will arrive in
              stages; timing and pricing will be confirmed before launch. No
              subscription is active.
            </p>
          </section>
          <PreferencesCard key={session} scope={session} rows={rows} />
        </div>
      </div>
      <section
        className="flex flex-wrap items-center justify-between gap-5 border-t border-border/60 pt-6"
        aria-label="Your data"
      >
        <div>
          <h2 className="font-bold">Your data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep a copy. Update your history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ExportDialog />
          <Button asChild variant="ghost">
            <Link href="/connect#import">Import or update an Oura file</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/privacy">Data and privacy</Link>
          </Button>
        </div>
      </section>
      <AppFooter />
    </main>
  );
}
