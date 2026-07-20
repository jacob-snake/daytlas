"use client";
import { Icon } from "@/components/icon";
import { ArrowExpandIcon, Cancel01Icon } from "@hugeicons/core-free-icons";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { mean, std, withBaseline } from "@/lib/analytics";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY, METRICS } from "@/lib/oura/metrics";

const PANEL_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** z-score a series so metrics with different units share one axis. */
function zSeries(data: DayRow[], key: string): (number | null)[] {
  const vals = data.map((d) => d[key]).filter((v): v is number => typeof v === "number");
  const m = mean(vals);
  const s = std(vals);
  return data.map((d) => {
    const v = d[key];
    if (typeof v !== "number" || m === null || !s) return null;
    return Math.round(((v - m) / s) * 100) / 100;
  });
}

export function MetricPanel({
  metricKey,
  compareKeys,
  data,
  index,
  onRemove,
  onCompareAdd,
  onCompareRemove,
}: {
  metricKey: string;
  /** Extra metrics overlaid in the same chart (z-score normalized). */
  compareKeys: string[];
  data: DayRow[];
  index: number;
  onRemove: () => void;
  onCompareAdd: (key: string) => void;
  onCompareRemove: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const def = METRIC_BY_KEY[metricKey];
  const baseColor = PANEL_COLORS[index % PANEL_COLORS.length];
  const comparing = compareKeys.length > 0;

  const allKeys = [metricKey, ...compareKeys];
  const config = Object.fromEntries(
    allKeys.map((k, i) => [
      k,
      { label: METRIC_BY_KEY[k].label, color: i === 0 ? baseColor : PANEL_COLORS[(index + i + 1) % PANEL_COLORS.length] },
    ])
  ) satisfies ChartConfig;

  const chartData = useMemo(() => {
    if (!comparing) {
      return withBaseline(data, metricKey, Math.min(60, Math.max(8, Math.floor(data.length / 4))));
    }
    const zs = allKeys.map((k) => zSeries(data, k));
    return data.map((d, i) => ({
      day: d.day,
      ...Object.fromEntries(allKeys.map((k, ki) => [k, zs[ki][i]])),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, metricKey, comparing, compareKeys.join(",")]);

  const renderChart = (heightClass: string) => (
    <ChartContainer config={config} className={`${heightClass} w-full`}>

          <ComposedChart data={chartData} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.35} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              minTickGap={48}
              tickMargin={8}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })
              }
            />
            <YAxis domain={["auto", "auto"]} width={44} tickMargin={8} tickLine={false} axisLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    format(new Date(payload?.[0]?.payload?.day), "EEE, d MMM yyyy")
                  }
                />
              }
            />
            {comparing && <ChartLegend content={<ChartLegendContent />} />}
            {!comparing && (
              <>
                <Area
                  type="monotone"
                  dataKey={(d: { band_low: number | null; band_high: number | null }) =>
                    d.band_low !== null && d.band_high !== null ? [d.band_low, d.band_high] : [null, null]
                  }
                  stroke="none"
                  fill={baseColor}
                  fillOpacity={0.09}
                  connectNulls
                  tooltipType="none"
                  legendType="none"
                  activeDot={false}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke={baseColor}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  dot={false}
                  connectNulls
                  tooltipType="none"
                  legendType="none"
                />
              </>
            )}
            {allKeys.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={config[k].color}
                strokeWidth={2.2}
                dot={false}
                connectNulls
              />
            ))}
          </ComposedChart>
    </ChartContainer>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {def.label}{" "}
          {def.unit && !comparing && <span className="font-normal text-muted-foreground">({def.unit})</span>}
        </CardTitle>
        <CardAction className="flex items-center gap-1.5">
          <Select value="" onValueChange={onCompareAdd}>
            <SelectTrigger size="sm" className="add-trigger w-[185px]">
              <SelectValue placeholder="＋ Combine with…" />
            </SelectTrigger>
            <SelectContent>
              {METRICS.filter((m) => !allKeys.includes(m.key)).map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(true)}
            aria-label={`Expand ${def.label} to full screen`}
          >
            <Icon icon={ArrowExpandIcon} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${def.label}`}>
            <Icon icon={Cancel01Icon} />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {renderChart("h-[220px]")}
        {comparing ? (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Normalized (z-scores) so different units share one axis.</span>
            {compareKeys.map((k) => (
              <Button key={k} variant="outline" size="xs" onClick={() => onCompareRemove(k)}>
                {METRIC_BY_KEY[k].label} <Icon icon={Cancel01Icon} className="size-3" />
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Shaded band = your usual range; dashed line = your rolling average.
          </p>
        )}
      </CardContent>
<Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{def.label}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Select value="" onValueChange={onCompareAdd}>
              <SelectTrigger size="sm" className="add-trigger w-[170px]">
                <SelectValue placeholder="＋ Combine with…" />
              </SelectTrigger>
              <SelectContent>
                {METRICS.filter((m) => !allKeys.includes(m.key)).map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {compareKeys.map((k) => (
              <Button key={k} variant="outline" size="xs" onClick={() => onCompareRemove(k)}>
                {METRIC_BY_KEY[k].label} <Icon icon={Cancel01Icon} className="size-3" />
              </Button>
            ))}
          </div>
          {renderChart("h-[68vh]")}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
