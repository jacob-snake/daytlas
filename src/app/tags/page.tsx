"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { TagIcon } from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { fetchAll, hasToken } from "@/lib/oura/client";
import { tagImpact } from "@/lib/analytics";
import { detectFirstDay, fetchWide, METRIC_BY_KEY, type DayRow } from "@/lib/oura/metrics";
import type { EnhancedTag } from "@/lib/oura/types";

const KEYS = ["avg_hrv", "avg_resting_hr", "sleep_score", "readiness_score", "total_sleep", "deep_sleep", "respiratory_rate"];

function tagName(t: EnhancedTag): string {
  return (t.custom_name ?? t.tag_type_code ?? "tag").replace(/^tag_generic_/, "").replaceAll("_", " ");
}

export function ImpactRow({ impact }: { impact: ReturnType<typeof tagImpact>[number] }) {
  const def = METRIC_BY_KEY[impact.key];
  const pct = (impact.delta / (Math.abs(impact.without) || 1)) * 100;
  const width = Math.min(100, Math.abs(pct) * 4);
  const negativeIsGood = ["avg_resting_hr", "respiratory_rate"].includes(impact.key);
  const good = negativeIsGood ? impact.delta < 0 : impact.delta > 0;
  return (
    <div className="grid grid-cols-[160px_1fr_auto] items-center gap-3 text-sm">
      <span>{def.label}</span>
      <div className="flex h-5 items-center">
        <div className="relative h-1.5 w-full rounded-full bg-muted">
          <div
            className="absolute top-0 h-1.5 rounded-full"
            style={{
              width: `${width}%`,
              left: pct < 0 ? `${50 - width / 2}%` : "50%",
              background: good ? "var(--chart-2)" : "var(--destructive)",
            }}
          />
          <div className="absolute left-1/2 top-[-3px] h-3 w-px bg-border" />
        </div>
      </div>
      <span className="tabular-nums" style={{ color: good ? "var(--chart-2)" : "var(--destructive)" }}>
        {impact.delta >= 0 ? "+" : ""}
        {impact.delta.toFixed(1)}
        {def.unit ? ` ${def.unit}` : ""}
      </span>
    </div>
  );
}

export default function TagLabPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [rows, setRows] = useState<DayRow[] | null>(null);
  const [tags, setTags] = useState<EnhancedTag[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAuthorized(hasToken()), []);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    detectFirstDay()
      .then((first) => {
        const today = new Date().toISOString().slice(0, 10);
        return Promise.all([
          fetchWide(first, today),
          fetchAll<EnhancedTag>("enhanced_tag", { start_date: first, end_date: today }),
        ]);
      })
      .then(([r, t]) => {
        if (cancelled) return;
        setRows(r);
        setTags(t);
      })
      .catch((e) => !cancelled && setError(String(e.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [authorized]);

  const tagGroups = useMemo(() => {
    const groups = new Map<string, Set<string>>();
    for (const t of tags ?? []) {
      const name = tagName(t);
      (groups.get(name) ?? groups.set(name, new Set()).get(name)!).add(t.start_day);
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

  if (authorized === false) return <Welcome />;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-10">
      <AppHeader active="tags" />
      <CommandPalette />

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load your data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!rows || !tags ? (
        <Skeleton className="h-[400px] rounded-xl" />
      ) : !tagGroups.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TagIcon weight="fill" />
            </EmptyMedia>
            <EmptyTitle>No tags yet</EmptyTitle>
            <EmptyDescription>
              Add tags in the Oura app (coffee, alcohol, late meal…) and come back — this page shows
              what they actually do to your body the next day.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Tag Lab</CardTitle>
              <CardDescription>
                Pick a tag to see how days after it differ from all your other days
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {tagGroups.map((g) => (
                <Badge
                  key={g.name}
                  variant={selected === g.name ? "default" : "outline"}
                  className="cursor-pointer select-none px-3 py-1.5 text-sm"
                  onClick={() => setSelected(g.name === selected ? null : g.name)}
                >
                  {g.name} × {g.count}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {selected && impacts && (
            <Card className="stagger-item">
              <CardHeader>
                <CardTitle className="capitalize">“{selected}” — the morning after</CardTitle>
                <CardDescription>
                  Days following a “{selected}” tag vs all other days
                  {impacts[0] && ` · based on ${impacts[0].n} tagged days`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {impacts.length ? (
                  impacts.map((i) => <ImpactRow key={i.key} impact={i} />)
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Fewer than 5 tagged days — still collecting. Keep tagging in the Oura app.
                  </p>
                )}
                <p className="pt-2 text-xs text-muted-foreground">
                  Correlation, not causation — but n is shown so you can judge for yourself.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
      <AppFooter />
    </main>
  );
}
