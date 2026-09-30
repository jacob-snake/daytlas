"use client";
import { ChartActiveDot } from "@/components/ui/chart-active-dot";
import { ChartGrid } from "@/components/ui/chart-grid";
import { numericYAxis } from "@/lib/chart-presentation";

import { averageLineLabel } from "@/components/ui/average-line-label";
import { format, parseISO } from "date-fns";
import { Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { useMemo, useState } from "react";
import { buildScoreSeries } from "@/lib/chart-series";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DayScores } from "@/lib/oura/queries";

const config = {
  sleep: { label: "Sleep", color: "var(--chart-1)" },
  readiness: { label: "Readiness", color: "var(--chart-2)" },
  activity: { label: "Activity", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function TrendChart({
  data,
  days,
  onDaysChange,
}: {
  data: DayScores[];
  days: number;
  onDaysChange: (days: number) => void;
}) {
  const chart = useMemo(() => buildScoreSeries(data), [data]);
  const [active, setActive] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score trends</CardTitle>
        <CardDescription>
          Readiness, sleep and activity over time
        </CardDescription>
        <CardAction>
          <SegmentedControl
            label="Score trend range"
            value={String(days)}
            onValueChange={(v) => onDaysChange(Number(v))}
            options={[
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
              { value: "365", label: "1 year" },
            ]}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div
          tabIndex={0}
          aria-label="Score trends. Hover or focus to show period averages."
          onPointerEnter={() => setActive(true)}
          onPointerLeave={() => setActive(false)}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          className="min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChartContainer config={config} className="h-[340px] w-full">
            <LineChart
              data={chart.data}
              margin={{ left: 8, right: 12, top: 8 }}
            >
              <ChartGrid days={chart.data.map((row) => row.day)} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                minTickGap={48}
                tickMargin={8}
                tickFormatter={(d: string) =>
                  parseISO(d).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                {...numericYAxis}
                domain={chart.domain}
                allowDataOverflow={false}
                tickMargin={8}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      format(
                        parseISO(payload?.[0]?.payload?.day),
                        "EEE, d MMM yyyy",
                      )
                    }
                  />
                }
              />
              <ChartLegend
                itemSorter={(item) =>
                  ["readiness", "sleep", "activity"].indexOf(
                    String(item.dataKey),
                  )
                }
                content={<ChartLegendContent />}
              />
              {chart.series.map(
                ({ key, average }, index) =>
                  active &&
                  average !== null && (
                    <ReferenceLine
                      key={`${key}-average`}
                      zIndex={600}
                      y={average}
                      stroke={`var(--color-${key})`}
                      strokeDasharray="6 5"
                      strokeOpacity={active ? 0.85 : 0.5}
                      strokeWidth={1.8}
                      label={averageLineLabel(
                        average.toFixed(1),
                        `var(--color-${key})`,
                        index,
                        chart.series.length,
                        chart.series.reduce(
                          (longest, item) =>
                            (item.average?.toFixed(1).length ?? 0) >
                            longest.length
                              ? item.average!.toFixed(1)
                              : longest,
                          "",
                        ),
                        chart.series.map((item) => ({
                          value: item.average ?? 0,
                          axisId: 0,
                        })),
                      )}
                    />
                  ),
              )}
              {chart.series.flatMap(({ key, gaps }) =>
                gaps.map((segment) => (
                  <ReferenceLine
                    key={`${key}-gap-${segment[0].x}`}
                    segment={segment}
                    stroke={`var(--color-${key})`}
                    strokeDasharray="1 5"
                    strokeLinecap="round"
                    strokeOpacity={0.35}
                    strokeWidth={2}
                  />
                )),
              )}
              {(["readiness", "sleep", "activity"] as const).map((key) => (
                <Line
                  isAnimationActive={false}
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={<ChartActiveDot />}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
