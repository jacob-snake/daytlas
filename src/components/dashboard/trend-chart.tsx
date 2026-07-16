"use client";

import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score trends</CardTitle>
        <CardDescription>Sleep, readiness and activity over time</CardDescription>
        <CardAction>
          <Tabs value={String(days)} onValueChange={(v) => onDaysChange(Number(v))}>
            <TabsList>
              {[
                { label: "30 d", days: 30 },
                { label: "90 d", days: 90 },
                { label: "1 y", days: 365 },
              ].map((r) => (
                <TabsTrigger key={r.days} value={String(r.days)}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[340px] w-full">
          <LineChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.35} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              minTickGap={48}
              tickMargin={8}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              }
            />
            <YAxis domain={[0, 100]} width={44} tickMargin={8} tickLine={false} axisLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    format(new Date(payload?.[0]?.payload?.day), "EEE, d MMM yyyy")
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {(["sleep", "readiness", "activity"] as const).map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
