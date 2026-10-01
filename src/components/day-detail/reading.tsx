import { Card } from "@/components/ui/card";
import { MetricDelta } from "@/components/ui/metric-delta";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
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
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {valid && comparison.average !== null && (
          <MetricDelta
            value={value - comparison.average}
            unit={unit}
            polarity="neutral"
          />
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="min-h-8 rounded text-left text-sm text-muted-foreground decoration-dotted underline underline-offset-4"
              >
                {comparison.average !== null
                  ? `${number(comparison.average)} ${unit} avg`
                  : "Not enough history"}
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              Previous 30 calendar days{partial ? ", full-day readings" : ""}.{" "}
              {comparison.count}/30 days recorded; selected day excluded.
              {partial ? " Today is still in progress." : ""}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  );
}
