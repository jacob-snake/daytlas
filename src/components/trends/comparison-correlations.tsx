import { comparisonPairs } from "@/lib/chart-comparison";
import { METRIC_BY_KEY, type DayRow, type Period } from "@/lib/oura/metrics";

export function ComparisonCorrelations({
  data,
  metricKeys,
  colors,
  period,
}: {
  data: DayRow[];
  metricKeys: string[];
  colors: Record<string, string>;
  period: Period;
}) {
  const pairs = comparisonPairs(data, metricKeys);
  const observation = {
    daily: "days",
    weekly: "weeks",
    monthly: "months",
    quarterly: "quarters",
    yearly: "years",
  }[period];
  return (
    <section
      aria-label="Correlations between compared metrics"
      className="min-w-0 border-t border-border/60 pt-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-bold">Correlations</h3>
        <p className="text-xs text-muted-foreground">
          {period === "daily"
            ? "Daily readings"
            : `${period.charAt(0).toUpperCase() + period.slice(1)} averages`}{" "}
          · selected dates
        </p>
      </div>
      <dl className={`grid gap-2 ${pairs.length > 1 ? "sm:grid-cols-3" : ""}`}>
        {pairs.map(({ a, b, stat, reason }) => (
          <div
            key={`${a}-${b}`}
            className="flex min-w-0 items-center justify-between gap-4 rounded-2xl bg-secondary/50 p-3 sm:flex-wrap"
          >
            <dt className="min-w-0 space-y-1 text-xs font-medium">
              {[a, b].map((key) => (
                <span key={key} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: colors[key] }}
                  />
                  {METRIC_BY_KEY[key].label}
                </span>
              ))}
            </dt>
            <dd className="shrink-0 text-right sm:text-left">
              {stat ? (
                <>
                  <span className="whitespace-nowrap text-xl font-bold tabular-nums">
                    <span className="mr-1 text-xs font-medium text-muted-foreground">
                      r
                    </span>
                    {stat.r.toFixed(2)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {stat.n} paired {observation}
                  </span>
                </>
              ) : (
                <span className="block max-w-36 text-xs text-muted-foreground">
                  {reason}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="min-h-11 cursor-pointer py-3 font-medium">
          How to read correlations
        </summary>
        <p className="max-w-2xl pb-2 leading-relaxed">
          Pearson r: near +1, the metrics tend to rise together; near −1, they
          tend to move in opposite directions; near 0, no clear linear
          relationship. Missing values are excluded. Averages can appear more
          strongly related than daily readings. A relationship does not prove
          cause and effect.
        </p>
      </details>
    </section>
  );
}
