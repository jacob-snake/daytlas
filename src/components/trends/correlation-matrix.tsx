"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DayRow } from "@/lib/oura/metrics";
import { CLOCK_METRICS, METRIC_BY_KEY } from "@/lib/oura/metrics";
import { pearson } from "@/lib/stats";

// Diverging color for r: cool negative ↔ neutral ↔ warm positive.
function cellColor(r: number): string {
  const a = Math.min(Math.abs(r), 1) * 0.55;
  return r >= 0 ? `rgba(57, 135, 229, ${a})` : `rgba(230, 103, 103, ${a})`;
}

export function CorrelationMatrixCard({
  data,
  metricKeys,
}: {
  data: DayRow[];
  metricKeys: string[];
}) {
  const matrix = useMemo(
    () =>
      metricKeys.map((a) =>
        metricKeys.map((b) =>
          a === b || CLOCK_METRICS.has(a) || CLOCK_METRICS.has(b)
            ? null
            : pearson(
                data.map((d) => [d[a] as number | null, d[b] as number | null]),
              ),
        ),
      ),
    [data, metricKeys],
  );

  const strongest = useMemo(() => {
    let best: { a: string; b: string; r: number } | null = null;
    for (let i = 0; i < metricKeys.length; i++) {
      for (let j = i + 1; j < metricKeys.length; j++) {
        const s = matrix[i][j];
        if (s && (!best || Math.abs(s.r) > Math.abs(best.r))) {
          best = { a: metricKeys[i], b: metricKeys[j], r: s.r };
        }
      }
    }
    return best;
  }, [matrix, metricKeys]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correlations across selected charts</CardTitle>
      </CardHeader>
      <CardContent>
        {strongest && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Strongest relationship
            </span>
            <Badge variant="secondary">
              {METRIC_BY_KEY[strongest.a].label}
            </Badge>
            <span className="text-muted-foreground">×</span>
            <Badge variant="secondary">
              {METRIC_BY_KEY[strongest.b].label}
            </Badge>
            <Badge
              className="tabular-nums"
              style={{
                background: cellColor(strongest.r),
                color: "var(--foreground)",
              }}
            >
              r = {strongest.r.toFixed(2)}
            </Badge>
          </div>
        )}
        <div className="grid min-w-0 gap-5">
          <div className="min-w-0 overflow-x-auto">
            <Table aria-label="Correlation matrix" className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <span className="sr-only">Metric</span>
                  </TableHead>
                  {metricKeys.map((k) => (
                    <TableHead key={k} className="min-w-24 text-center text-sm">
                      {METRIC_BY_KEY[k].label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {metricKeys.map((a, i) => (
                  <TableRow key={a} className="border-0 hover:bg-transparent">
                    <TableHead className="pr-4 text-sm whitespace-nowrap">
                      {METRIC_BY_KEY[a].label}
                    </TableHead>
                    {metricKeys.map((b, j) => {
                      const s = matrix[i][j];
                      return (
                        <TableCell
                          key={b}
                          className="p-1 text-center"
                          title={s ? `${s.n} paired observations` : undefined}
                        >
                          {i === j ? (
                            <span className="text-muted-foreground">—</span>
                          ) : s ? (
                            <span
                              className="inline-flex min-w-14 justify-center rounded-lg px-2.5 py-1.5 font-sans text-sm font-semibold tabular-nums"
                              style={{ background: cellColor(s.r) }}
                            >
                              {s.r.toFixed(2)}
                              <span className="sr-only">
                                {" "}
                                from {s.n} paired observations
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">·</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <details className="group/correlation-help border-t border-border/60 pt-1">
            <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <Info className="size-4" aria-hidden="true" />
              How to read this
              <ChevronDown
                className="size-4 transition-transform group-open/correlation-help:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <div className="max-w-2xl pb-2 pt-2 text-sm leading-relaxed text-muted-foreground">
              <ul className="space-y-2">
                <li>
                  <strong className="text-foreground">Near +1:</strong> the
                  metrics tend to rise together.
                </li>
                <li>
                  <strong className="text-foreground">Near −1:</strong> they
                  tend to move in opposite directions.
                </li>
                <li>
                  <strong className="text-foreground">Near 0:</strong> no clear
                  linear relationship.
                </li>
              </ul>
              <p className="mt-4 font-semibold text-foreground">
                A relationship does not prove cause and effect.
              </p>
              <div className="mt-4">
                <h3 className="font-semibold text-foreground">
                  About the calculation
                </h3>
                <p className="pt-2 text-muted-foreground">
                  Pearson r uses paired observations in this view. Weekly or
                  monthly averages can appear more strongly related than daily
                  readings. Clock-time metrics are excluded because midnight
                  wraps around.
                </p>
              </div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
