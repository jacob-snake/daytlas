"use client";
import { Icon } from "@/components/icon";
import { ChartDownIcon, ChartUpIcon } from "@hugeicons/core-free-icons";

import { useMemo, useState } from "react";
import type { IconSvgElement } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricPanel } from "./metric-panel";
import { CorrelationMatrixCard } from "./correlation-matrix";
import { mean } from "@/lib/analytics";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

export interface SectionDef {
  id: string;
  title: string;
  icon: IconSvgElement;
  color: string;
  headline: string; // metric that summarizes the section
  metrics: string[]; // all metrics belonging to the section
  defaults: string[];
}

export function TrendSection({ section, data }: { section: SectionDef; data: DayRow[] }) {
  const [charts, setCharts] = useState<string[]>(section.defaults);
  const [compares, setCompares] = useState<Record<string, string[]>>({});

  const summary = useMemo(() => {
    const vals = data
      .map((d) => d[section.headline])
      .filter((v): v is number => typeof v === "number");
    const avg = mean(vals);
    const half = Math.floor(vals.length / 2);
    const first = mean(vals.slice(0, half));
    const second = mean(vals.slice(half));
    return {
      avg,
      delta: first !== null && second !== null ? second - first : null,
    };
  }, [data, section.headline]);

  const headlineDef = METRIC_BY_KEY[section.headline];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in oklab, ${section.color} 14%, transparent)` }}
        >
          <Icon icon={section.icon} className="size-5" style={{ color: section.color }} />
        </span>
        <h2 className="text-xl font-bold tracking-tight">{section.title}</h2>
        {summary.avg !== null && (
          <Badge variant="secondary" className="tabular-nums text-sm">
            {headlineDef.label} avg {summary.avg.toFixed(0)}
            {headlineDef.unit ? ` ${headlineDef.unit}` : ""}
          </Badge>
        )}
        {summary.delta !== null && Math.abs(summary.delta) >= 0.05 && (
          <Badge variant="outline" className="tabular-nums text-sm">
            {summary.delta > 0 ? (
              <Icon icon={ChartUpIcon} className="size-4" style={{ color: "var(--chart-2)" }} />
            ) : (
              <Icon icon={ChartDownIcon} className="size-4 text-destructive" />
            )}
            <span className="font-semibold" style={{ color: summary.delta > 0 ? "var(--chart-2)" : "var(--destructive)" }}>
              {Math.abs(summary.delta).toFixed(1)}
            </span>
            across this range
          </Badge>
        )}
        <div className="ml-auto">
          <Select value="" onValueChange={(k) => setCharts((c) => (c.includes(k) ? c : [...c, k]))}>
            <SelectTrigger size="sm" className="add-trigger w-[180px]">
              <SelectValue placeholder="＋ Add chart" />
            </SelectTrigger>
            <SelectContent>
              {section.metrics.map((k) => (
                <SelectItem key={k} value={k} disabled={charts.includes(k)}>
                  {METRIC_BY_KEY[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {charts.map((key, i) => (
          <motion.div
            key={key}
            layout
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: { duration: 0.15, ease: "easeIn" } }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="pb-4"
          >
            <MetricPanel
              metricKey={key}
              compareKeys={compares[key] ?? []}
              data={data}
              index={i}
              onRemove={() => setCharts((c) => c.filter((k) => k !== key))}
              onCompareAdd={(ck) =>
                setCompares((m) => ({ ...m, [key]: [...(m[key] ?? []), ck].slice(0, 3) }))
              }
              onCompareRemove={(ck) =>
                setCompares((m) => ({ ...m, [key]: (m[key] ?? []).filter((k) => k !== ck) }))
              }
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {charts.length >= 2 && <CorrelationMatrixCard data={data} metricKeys={charts} />}
    </section>
  );
}
