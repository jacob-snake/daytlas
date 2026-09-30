"use client";
import { ChartActiveDot } from "@/components/ui/chart-active-dot";
import { ChartGrid } from "@/components/ui/chart-grid";
import { numericYAxis } from "@/lib/chart-presentation";
import { averageLineLabel } from "@/components/ui/average-line-label";
import { Icon } from "@/components/icon";
import { ArrowExpandIcon, Cancel01Icon } from "@hugeicons/core-free-icons";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildMetricSeries } from "@/lib/metric-series";
import { withBaseline } from "@/lib/analytics";
import { parseDay } from "@/lib/dates";
import type { DayRow, Period } from "@/lib/oura/metrics";
import { CLOCK_METRICS, METRIC_BY_KEY, METRICS } from "@/lib/oura/metrics";
import { comparisonColors } from "@/lib/chart-comparison";
import { ComparisonCorrelations } from "./comparison-correlations";
import { ResizableChart } from "./resizable-chart";

function comparisonUnit(key: string): string {
  if (CLOCK_METRICS.has(key)) return key;
  if (METRIC_BY_KEY[key].group === "Scores") return "score";
  return METRIC_BY_KEY[key].unit || key;
}

export function MetricPanel({
  metricKey,
  compareKeys,
  data,
  period = "daily",
  rangeControls,
  onRemove,
  onCompareAdd,
  onCompareRemove,
}: {
  metricKey: string;
  /** Up to three overlays across at most two labeled unit axes. */
  compareKeys: string[];
  data: DayRow[];
  period?: Period;
  rangeControls?: ReactNode;
  index: number;
  onRemove: () => void;
  onCompareAdd: (key: string) => void;
  onCompareRemove: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeChart, setActiveChart] = useState<string | null>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const def = METRIC_BY_KEY[metricKey];
  const compatibleKeys = compareKeys.filter((key) => METRIC_BY_KEY[key]);
  const comparing = compatibleKeys.length > 0;
  const clockMetric = CLOCK_METRICS.has(metricKey);
  const showBaseline = !comparing && period === "daily" && !clockMetric;
  const allKeys = [metricKey, ...compatibleKeys];
  const colors = comparisonColors(allKeys);
  const baseColor = colors[metricKey];
  const units = [...new Set(allKeys.map(comparisonUnit))];
  const secondaryKey = compatibleKeys.find(
    (key) => comparisonUnit(key) !== comparisonUnit(metricKey),
  );
  const axisFor = (key: string) =>
    comparisonUnit(key) === comparisonUnit(metricKey) ? "primary" : "secondary";
  const overlayOptions =
    compatibleKeys.length >= 3
      ? []
      : METRICS.filter(
          (m) =>
            !allKeys.includes(m.key) &&
            (units.length < 2 || units.includes(comparisonUnit(m.key))),
        );
  const config = Object.fromEntries(
    allKeys.map((k) => [
      k,
      { label: METRIC_BY_KEY[k].label, color: colors[k] },
    ]),
  ) satisfies ChartConfig;

  const chartData = useMemo(() => {
    const dense = buildMetricSeries(data, [metricKey], period).data;
    return showBaseline ? withBaseline(dense, metricKey, 60) : dense;
  }, [data, metricKey, showBaseline, period]);

  const gaps = buildMetricSeries(data, allKeys, period).gaps;
  const averages = allKeys.flatMap((key) => {
    const values = data
      .map((row) => row[key])
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );
    if (!values.length) return [];
    let value = values.reduce((sum, item) => sum + item, 0) / values.length;
    if (CLOCK_METRICS.has(key)) {
      const sin = values.reduce(
        (sum, item) => sum + Math.sin((item * Math.PI) / 12),
        0,
      );
      const cos = values.reduce(
        (sum, item) => sum + Math.cos((item * Math.PI) / 12),
        0,
      );
      if (Math.hypot(sin, cos) / values.length < 1e-6) return [];
      value = ((Math.atan2(sin, cos) * 12) / Math.PI + 24) % 24;
      if (key === "bedtime" && value < 12) value += 24;
    }
    const minutes = Math.round(value * 60) % (24 * 60);
    const label = CLOCK_METRICS.has(key)
      ? `${Math.floor(minutes / 60)
          .toString()
          .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`
      : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return [{ key, value, label }];
  });

  const renderChart = (heightClass: string, height?: number) => (
    <div
      tabIndex={0}
      aria-label={`${def.label} chart. Average lines show the displayed periods. Focus or touch to emphasize them.`}
      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onPointerEnter={() => setActiveChart(heightClass)}
      onPointerLeave={() => setActiveChart(null)}
      onPointerDown={() => setActiveChart(heightClass)}
      onFocus={() => setActiveChart(heightClass)}
      onBlur={() => setActiveChart(null)}
    >
      <ChartContainer
        config={config}
        className={`${heightClass} w-full min-w-0 aspect-auto`}
        style={height === undefined ? undefined : { height }}
      >
        <ComposedChart
          key={period}
          syncId="trends-date"
          syncMethod="value"
          data={chartData}
          margin={{ left: 8, right: 12, top: 8 }}
        >
          <ChartGrid yAxisId="primary" days={chartData.map((row) => row.day)} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            minTickGap={48}
            tickMargin={8}
            tickFormatter={(d: string) =>
              parseDay(d).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "2-digit",
              })
            }
          />
          <YAxis
            {...numericYAxis}
            yAxisId="primary"
            domain={["auto", "auto"]}
            tickMargin={8}
            tickLine={false}
            axisLine={false}
          />
          {secondaryKey && (
            <YAxis
              {...numericYAxis}
              yAxisId="secondary"
              orientation="right"
              domain={["auto", "auto"]}
              tickLine={false}
              axisLine={false}
              stroke={config[secondaryKey].color}
            />
          )}
          <ChartTooltip
            isAnimationActive={false}
            content={
              <ChartTooltipContent
                className="chart-tooltip-dark"
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.day
                    ? format(
                        parseDay(payload[0].payload.day),
                        "EEE, d MMM yyyy",
                      )
                    : ""
                }
              />
            }
          />
          {comparing && <ChartLegend content={<ChartLegendContent />} />}
          {showBaseline && (
            <>
              <Area
                yAxisId="primary"
                isAnimationActive={false}
                type="monotone"
                dataKey={(d: {
                  band_low: number | null;
                  band_high: number | null;
                }) =>
                  d.band_low !== null && d.band_high !== null
                    ? [d.band_low, d.band_high]
                    : [null, null]
                }
                stroke="none"
                fill={baseColor}
                fillOpacity={0.09}
                connectNulls={false}
                tooltipType="none"
                legendType="none"
                activeDot={false}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="baseline"
                yAxisId="primary"
                stroke={baseColor}
                strokeWidth={1}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                dot={false}
                connectNulls={false}
                tooltipType="none"
                legendType="none"
              />
            </>
          )}
          {averages.map(({ key, value, label }, index) => (
            <ReferenceLine
              key={`average-${key}`}
              zIndex={600}
              yAxisId={axisFor(key)}
              y={value}
              stroke={config[key].color}
              strokeOpacity={activeChart === heightClass ? 0.95 : 0.8}
              strokeWidth={1.8}
              strokeDasharray="3 4"
              label={averageLineLabel(
                label,
                config[key].color,
                index,
                averages.length,
                averages.reduce(
                  (longest, item) =>
                    item.label.length > longest.length ? item.label : longest,
                  "",
                ),
                averages.map((item) => ({
                  value: item.value,
                  axisId: axisFor(item.key),
                })),
              )}
            />
          ))}
          {gaps.map(({ key, segment }) => (
            <ReferenceLine
              key={`${key}-${segment[0].x}`}
              yAxisId={axisFor(key)}
              segment={segment}
              stroke={config[key].color}
              strokeDasharray="3 4"
              strokeOpacity={0.5}
              strokeWidth={1.5}
            />
          ))}
          {allKeys.map((k, i) => (
            <Line
              isAnimationActive={false}
              key={k}
              yAxisId={axisFor(k)}
              type="monotone"
              dataKey={k}
              stroke={config[k].color}
              strokeWidth={2.2}
              strokeDasharray={i === 0 ? undefined : i === 1 ? "6 3" : "2 3"}
              dot={false}
              activeDot={<ChartActiveDot />}
              connectNulls={false}
            />
          ))}
        </ComposedChart>
      </ChartContainer>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">
          {def.label}{" "}
          {def.unit && (
            <span className="text-base font-medium text-muted-foreground">
              ({def.unit})
            </span>
          )}
        </CardTitle>
        <CardAction className="flex items-center gap-1.5">
          {overlayOptions.length > 0 && (
            <Select value="" onValueChange={onCompareAdd}>
              <SelectTrigger
                size="sm"
                className="add-trigger w-auto min-w-max shrink-0 whitespace-nowrap"
                aria-label={`Overlay metric on ${def.label}`}
              >
                <SelectValue placeholder="＋ Overlay metric" />
              </SelectTrigger>
              <SelectContent>
                {overlayOptions.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            ref={expandButtonRef}
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(true)}
            aria-label={`Expand ${def.label} to full screen`}
          >
            <Icon icon={ArrowExpandIcon} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={`Remove ${def.label}`}
          >
            <Icon icon={Cancel01Icon} />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ResizableChart label={def.label}>
          {(height) => renderChart("h-[220px]", height)}
        </ResizableChart>
        {comparing ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {secondaryKey
                ? `Left: ${def.label} (${def.unit || "score"}). Right: ${METRIC_BY_KEY[secondaryKey].label} (${METRIC_BY_KEY[secondaryKey].unit || "score"}). Different scales; compare timing, not line heights.`
                : "Shared units on one axis."}
            </span>
            {compareKeys.map((k) => (
              <Button
                key={k}
                variant="outline"
                size="xs"
                onClick={() => onCompareRemove(k)}
              >
                {METRIC_BY_KEY[k].label}{" "}
                <Icon icon={Cancel01Icon} className="size-3" />
              </Button>
            ))}
          </div>
        ) : showBaseline || clockMetric ? (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {showBaseline
              ? "Dashed line: prior 60-day mean within this selection. Band: ±1 standard deviation, not a clinical range."
              : "Local clock time as recorded. After-midnight bedtimes continue beyond 24; grouped periods use a circular mean."}
          </p>
        ) : null}
        {comparing && (
          <div className="mt-4">
            <ComparisonCorrelations
              data={chartData}
              metricKeys={allKeys}
              colors={colors}
              period={period}
            />
          </div>
        )}
      </CardContent>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className="max-h-[92dvh] min-w-0 w-[95vw] grid-cols-[minmax(0,1fr)] overflow-y-auto overscroll-contain sm:max-w-[95vw]"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            expandButtonRef.current?.focus({ preventScroll: true });
          }}
        >
          <DialogHeader className="min-w-0 pr-8">
            <DialogTitle className="text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">
              {def.label}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Expanded chart. Different units use separately labeled axes. Use
              Escape to return to Trends.
            </DialogDescription>
          </DialogHeader>
          {rangeControls && (
            <div className="sticky top-0 z-20 -mx-1 rounded-2xl bg-popover p-1">
              {rangeControls}
              <p className="mt-2 text-[13px] text-muted-foreground">
                Applies to all Trends charts.
              </p>
            </div>
          )}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {overlayOptions.length > 0 && (
              <Select value="" onValueChange={onCompareAdd}>
                <SelectTrigger
                  size="sm"
                  className="add-trigger w-auto min-w-max shrink-0 whitespace-nowrap"
                  aria-label={`Overlay metric on ${def.label}`}
                >
                  <SelectValue placeholder="＋ Overlay metric" />
                </SelectTrigger>
                <SelectContent>
                  {overlayOptions.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {compareKeys.map((k) => (
              <Button
                key={k}
                variant="outline"
                size="xs"
                onClick={() => onCompareRemove(k)}
              >
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: colors[k] }}
                />
                {METRIC_BY_KEY[k].label}{" "}
                <Icon icon={Cancel01Icon} className="size-3" />
              </Button>
            ))}
          </div>
          {data.length ? (
            renderChart(
              comparing
                ? "h-[min(40dvh,420px)] min-h-[220px]"
                : "h-[min(60dvh,640px)] min-h-[240px]",
            )
          ) : (
            <p
              role="status"
              className="py-16 text-center text-muted-foreground"
            >
              No readings in this date range. Choose another date range above.
            </p>
          )}
          {comparing && (
            <ComparisonCorrelations
              data={chartData}
              metricKeys={allKeys}
              colors={colors}
              period={period}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
