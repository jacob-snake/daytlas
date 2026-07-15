"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { withBaseline } from "@/lib/analytics";
import { format } from "date-fns";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { DayRow } from "@/lib/oura/metrics";
import { METRIC_BY_KEY } from "@/lib/oura/metrics";

const PANEL_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function MetricPanel({
  metricKey,
  data,
  index,
  onRemove,
}: {
  metricKey: string;
  data: DayRow[];
  index: number;
  onRemove: () => void;
}) {
  const def = METRIC_BY_KEY[metricKey];
  const color = PANEL_COLORS[index % PANEL_COLORS.length];
  const config = { [metricKey]: { label: def.label, color } } satisfies ChartConfig;

  // ±1σ band around the trailing baseline — "is this normal for me?"
  const banded = useMemo(
    () => withBaseline(data, metricKey, Math.min(60, Math.max(8, Math.floor(data.length / 4)))),
    [data, metricKey]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle>
          {def.label} {def.unit && <span className="text-muted-foreground">({def.unit})</span>}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${def.label}`}>
          <X />
        </Button>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[200px] w-full">
          <ComposedChart data={banded} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.35} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              minTickGap={48}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })
              }
            />
            <YAxis domain={["auto", "auto"]} width={40} tickLine={false} axisLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    format(new Date(payload?.[0]?.payload?.day), "EEE, d MMM yyyy")
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey={(d: { band_low: number | null; band_high: number | null }) =>
                d.band_low !== null && d.band_high !== null ? [d.band_low, d.band_high] : [null, null]
              }
              stroke="none"
              fill={color}
              fillOpacity={0.09}
              connectNulls
              tooltipType="none"
              legendType="none"
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke={color}
              strokeWidth={1}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              dot={false}
              connectNulls
              tooltipType="none"
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey={metricKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ChartContainer>
        <p className="mt-1 text-xs text-muted-foreground">
          Shaded band = your usual range; dashed line = your rolling average. Points outside the
          band are genuinely unusual for you.
        </p>
      </CardContent>
    </Card>
  );
}
