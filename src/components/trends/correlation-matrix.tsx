"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";
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
          a === b
            ? null
            : pearson(data.map((d) => [d[a] as number | null, d[b] as number | null]))
        )
      ),
    [data, metricKeys]
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
          <p className="mb-3 text-sm">
            Strongest: <span className="font-medium">{METRIC_BY_KEY[strongest.a].label}</span> ×{" "}
            <span className="font-medium">{METRIC_BY_KEY[strongest.b].label}</span>{" "}
            <span className="font-mono tabular-nums">r = {strongest.r.toFixed(2)}</span>
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th />
                {metricKeys.map((k) => (
                  <th key={k} className="p-1 text-left text-xs font-medium text-muted-foreground">
                    {METRIC_BY_KEY[k].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricKeys.map((a, i) => (
                <tr key={a}>
                  <th className="p-1 text-left text-xs font-medium text-muted-foreground">
                    {METRIC_BY_KEY[a].label}
                  </th>
                  {metricKeys.map((b, j) => {
                    const s = matrix[i][j];
                    return (
                      <td
                        key={b}
                        className="rounded-md p-2 text-center font-mono text-xs tabular-nums"
                        style={s ? { background: cellColor(s.r) } : undefined}
                        title={s ? `${s.n} days` : undefined}
                      >
                        {i === j ? "—" : s ? s.r.toFixed(2) : "·"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Pearson r over the timeline selection. Blue = positive, red = negative. Correlation is not causation.
        </p>
      </CardContent>
    </Card>
  );
}
