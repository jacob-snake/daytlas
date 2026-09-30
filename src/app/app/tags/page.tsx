"use client";
import { Icon } from "@/components/icon";
import { Tag01Icon } from "@hugeicons/core-free-icons";

import { useCallback, useMemo, useState } from "react";
import { DataError } from "@/components/data-state";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CommandPalette } from "@/components/command-palette";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Welcome } from "@/components/welcome";
import { fetchAll } from "@/lib/oura/client";
import { tagImpact, tagDaysInRange } from "@/lib/analytics";
import { detectFirstDay, fetchWide, METRIC_BY_KEY } from "@/lib/oura/metrics";
import type { EnhancedTag } from "@/lib/oura/types";
import { useOuraQuery, useOuraSession } from "@/lib/use-oura-query";
import { localDay } from "@/lib/dates";

const KEYS = [
  "avg_hrv",
  "avg_resting_hr",
  "sleep_score",
  "readiness_score",
  "total_sleep",
  "deep_sleep",
  "respiratory_rate",
];

function tagName(t: EnhancedTag): string {
  return (t.custom_name ?? t.tag_type_code ?? "tag")
    .replace(/^tag_generic_/, "")
    .replaceAll("_", " ");
}

export function ImpactRow({
  impact,
}: {
  impact: ReturnType<typeof tagImpact>[number];
}) {
  const def = METRIC_BY_KEY[impact.key];
  const pct = (impact.delta / (Math.abs(impact.without) || 1)) * 100;
  const width = Math.min(50, Math.abs(pct) * 2);
  const precision = def.unit === "h" ? 2 : 1;
  const factor = 10 ** precision;
  const displayDelta = Math.round(impact.delta * factor) / factor;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(36px,1fr)_4.5rem] items-center gap-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]">
      <span>{def.label}</span>
      <div className="flex h-5 items-center">
        <div className="relative h-1.5 w-full rounded-full bg-muted">
          <div
            className="absolute top-0 h-1.5 rounded-full"
            style={{
              width: `${width}%`,
              left: pct < 0 ? `${50 - width}%` : "50%",
              background: "var(--chart-1)",
            }}
          />
          <div className="absolute left-1/2 top-[-3px] h-3 w-px bg-border" />
        </div>
      </div>
      <span className="whitespace-nowrap text-right tabular-nums font-medium">
        {displayDelta > 0 ? "+" : ""}
        {displayDelta.toFixed(precision)}
        {def.unit ? ` ${def.unit}` : ""}
      </span>
    </div>
  );
}

export default function TagLabPage() {
  const session = useOuraSession();
  const [selected, setSelected] = useState<string | null>(null);
  const loadTags = useCallback(async () => {
    const first = await detectFirstDay();
    const today = localDay();
    const [rows, tags] = await Promise.all([
      fetchWide(first, today),
      fetchAll<EnhancedTag>("enhanced_tag", {
        start_date: first,
        end_date: today,
      }),
    ]);
    return { rows, tags };
  }, []);
  const { data, error } = useOuraQuery(session && `${session}:tags`, loadTags);
  const rows = data?.rows ?? null;
  const tags = data?.tags ?? null;

  const tagGroups = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    for (const t of tags ?? []) {
      const name = tagName(t);
      const days = groups.get(name) ?? new Set<string>();
      for (const day of tagDaysInRange([t])) days.add(day);
      groups.set(name, days);
    }
    return [...groups.entries()]
      .map(([name, days]) => ({ name, days, count: days.size }))
      .sort((a, b) => b.count - a.count);
  }, [tags]);

  const impacts = useMemo(() => {
    if (!rows || !selected) return null;
    const group = tagGroups.find((g) => g.name === selected);
    if (!group) return null;
    return tagImpact(rows, group.days, KEYS);
  }, [rows, selected, tagGroups]);

  if (!session) return <Welcome />;

  return (
    <main id="main-content" className="app-page">
      <AppHeader active="tags" />
      <CommandPalette />
      <PageHeading
        title="Get curious about your habits."
        description="Start with a tag. See how your recorded metrics differ on the days that follow."
      />

      {error && <DataError error={error} />}

      {error ? null : !rows || !tags ? (
        <Skeleton className="h-[400px] rounded-xl" />
      ) : !tagGroups.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon icon={Tag01Icon} />
            </EmptyMedia>
            <EmptyTitle>No tags yet</EmptyTitle>
            <EmptyDescription>
              Add tags in the Oura app (coffee, alcohol, late meal…) and come
              back — this page shows how your recorded metrics compare on the
              following day.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Choose a habit to explore</CardTitle>
              <CardDescription>
                Pick a tag to see how days after it differ from all your other
                days
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {tagGroups.map((g) => (
                <Button
                  key={g.name}
                  variant={selected === g.name ? "default" : "outline"}
                  aria-pressed={selected === g.name}
                  className="rounded-full px-4"
                  onClick={() =>
                    setSelected(g.name === selected ? null : g.name)
                  }
                >
                  {g.name} · {g.count} days
                </Button>
              ))}
            </CardContent>
          </Card>

          {!selected && (
            <div className="rounded-2xl bg-secondary/50 p-6 text-sm leading-relaxed text-muted-foreground">
              Choose a tag above to compare the following day with days that did
              not follow that tag. Each comparison shows its sample size.
            </div>
          )}
          {selected && impacts && (
            <Card className="stagger-item">
              <CardHeader>
                <CardTitle className="capitalize">
                  “{selected}” — the morning after
                </CardTitle>
                <CardDescription>
                  Days following a “{selected}” tag vs all other days
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {impacts.length ? (
                  impacts.map((i) => (
                    <div
                      key={i.key}
                      className="border-b border-border pb-3 last:border-0"
                    >
                      <ImpactRow impact={i} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {i.n} following-tag days · {i.nWithout} comparison days
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    We need at least 5 days with a reading in each comparison
                    group. Keep tagging and syncing in the Oura app.
                  </p>
                )}
                <p className="pt-2 text-xs text-muted-foreground">
                  These are unadjusted averages, not proof of cause or effect.
                  Sleep schedules, travel and other habits can also explain
                  differences.
                </p>
                {session === "demo" && (
                  <p className="text-xs text-muted-foreground">
                    Demo relationships are invented to illustrate this
                    comparison.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
      <AppFooter />
    </main>
  );
}
