"use client";
import { MetricMarker } from "@/components/ui/metric-marker";
import { MetricDelta } from "@/components/ui/metric-delta";
import { Card } from "@/components/ui/card";
export function ScoreCard({
  label,
  value,
  delta,
  color,
  values = [],
  day,
}: {
  label: string;
  value: number | null;
  delta: number | null;
  color: string;
  values?: number[];
  day?: string;
}) {
  const points = values
    .map(
      (v, i) =>
        `${(i * 120) / Math.max(1, values.length - 1)},${52 - (v - 40) * 0.7}`,
    )
    .join(" ");
  return (
    <Card className="relative gap-0 p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MetricMarker color={color} />
          {label}
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {day ?? "No reading"}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-[56px] font-bold leading-none tracking-[-0.065em] tabular-nums">
          {value ?? "—"}
          <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">
            /100
          </span>
        </p>
        {values.length > 1 && (
          <svg viewBox="0 0 120 56" className="h-14 w-28" aria-hidden="true">
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-muted-foreground">
        {delta !== null ? (
          <>
            <MetricDelta value={delta} unit="pts" polarity="higher" />
            <span className="font-medium">vs previous 7 days</span>
          </>
        ) : (
          "Waiting for enough recent readings"
        )}
      </p>
    </Card>
  );
}
