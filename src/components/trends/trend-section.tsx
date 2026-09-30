"use client";
import { Icon } from "@/components/icon";
import { MetricDelta } from "@/components/ui/metric-delta";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { IconSvgElement } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import type { DayRow, Period } from "@/lib/oura/metrics";
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

export function TrendSection({
  section,
  data,
  period = "daily",
  rangeControls,
}: {
  section: SectionDef;
  data: DayRow[];
  period?: Period;
  rangeControls?: ReactNode;
}) {
  const [charts, setCharts] = useState<string[]>(section.defaults);
  const [compares, setCompares] = useState<Record<string, string[]>>({});
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const addChart = (event: Event) => {
      const key = (event as CustomEvent<string>).detail;
      if (!section.metrics.includes(key)) return;
      setCharts((current) =>
        current.includes(key) ? current : [...current, key],
      );
      sectionRef.current?.scrollIntoView({
        behavior: reducedMotion ? "instant" : "smooth",
        block: "start",
      });
    };
    window.addEventListener("woura:add-chart", addChart);
    return () => window.removeEventListener("woura:add-chart", addChart);
  }, [section.metrics, reducedMotion]);

  const summary = useMemo(() => {
    const vals = data
      .map((d) => d[section.headline])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
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
    <section
      ref={sectionRef}
      id={`trend-${section.id}`}
      className="scroll-mt-6 space-y-3 py-8 sm:py-12"
      aria-label={`${section.title} trends`}
    >
      <header className="flex flex-wrap items-center justify-between gap-6 border-t border-border/40 pt-8 pb-5">
        <div className="flex items-center gap-4">
          <span
            className="flex size-12 items-center justify-center rounded-2xl"
            style={{
              color: section.color,
              background: `color-mix(in oklab, ${section.color} 10%, transparent)`,
            }}
          >
            <Icon icon={section.icon} className="size-6" />
          </span>
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Your patterns
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              {section.title}
            </h2>
          </div>
        </div>
        {summary.avg !== null && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Average {headlineDef.label.toLowerCase()}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-3xl font-bold tabular-nums">
                {summary.avg.toFixed(0)}
                <span className="ms-1 text-sm font-medium text-muted-foreground">
                  {headlineDef.unit || "/ 100"}
                </span>
              </p>
              {summary.delta !== null && (
                <MetricDelta
                  value={summary.delta}
                  unit={headlineDef.unit || "pts"}
                  polarity="direction"
                />
              )}
            </div>
            {summary.delta !== null && (
              <p className="text-xs font-medium text-muted-foreground">
                Change · later vs earlier half
              </p>
            )}
          </div>
        )}
      </header>

      {!charts.length && (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          No charts selected. Use Add chart to explore a metric.
        </p>
      )}

      <AnimatePresence initial={false} mode="popLayout">
        {charts.map((key, i) => (
          <motion.div
            key={key}
            layout={!reducedMotion}
            initial={
              reducedMotion ? false : { opacity: 0, y: 12, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : -12,
              transition: { duration: reducedMotion ? 0 : 0.15 },
            }}
            transition={{
              type: "spring",
              duration: reducedMotion ? 0 : 0.3,
              bounce: 0,
            }}
            className="pb-0"
          >
            <MetricPanel
              metricKey={key}
              compareKeys={compares[key] ?? []}
              data={data}
              period={period}
              rangeControls={rangeControls}
              index={i}
              onRemove={() => setCharts((c) => c.filter((k) => k !== key))}
              onCompareAdd={(ck) =>
                setCompares((m) => ({
                  ...m,
                  [key]: [...new Set([...(m[key] ?? []), ck])].slice(0, 3),
                }))
              }
              onCompareRemove={(ck) =>
                setCompares((m) => ({
                  ...m,
                  [key]: (m[key] ?? []).filter((k) => k !== ck),
                }))
              }
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="pb-0">
        <Select
          value=""
          onValueChange={(k) =>
            setCharts((c) => (c.includes(k) ? c : [...c, k]))
          }
        >
          <SelectTrigger
            size="sm"
            className="add-trigger add-chart-trigger min-h-11 w-full justify-center"
            aria-label={`Add chart to ${section.title}`}
          >
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

      {charts.length >= 2 && (
        <CorrelationMatrixCard data={data} metricKeys={charts} />
      )}
    </section>
  );
}
