import { Card } from "@/components/ui/card";
import { MetricDelta } from "@/components/ui/metric-delta";
import type { baseline } from "@/lib/day-detail";
const number = (n: number) =>
  (Number(n.toFixed(1)) || 0).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
/** Day readings share Overview's card, numeric hierarchy and delta component. */
export function Reading({
  label,
  value,
  unit,
  comparison,
  partial = false,
}: {
  label: string;
  value: number | null | undefined;
  unit: string;
  comparison: ReturnType<typeof baseline>;
  partial?: boolean;
}) {
  const valid = typeof value === "number" && Number.isFinite(value);
  return (
    <Card className="min-w-0 gap-0 p-6">
      <h3 className="text-sm font-bold">{label}</h3>
      <p className="mt-5 text-4xl font-bold tracking-tight tabular-nums">
        {valid ? number(value) : "—"}
        <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">
          {unit}
        </span>
      </p>
      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        {valid && comparison.average !== null && (
          <MetricDelta
            value={value - comparison.average}
            unit={unit}
            polarity="direction"
            className="shrink-0"
          />
        )}
        <span className="font-medium">
          {comparison.average !== null
            ? "vs previous 30 days"
            : "Not enough history"}
        </span>
        {partial && (
          <span className="sr-only">
            Today so far compared with previous full days.
          </span>
        )}
      </div>
    </Card>
  );
}
