"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function TrendChart({ data }: { data: DayScores[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score trends</CardTitle>
        <CardDescription>Sleep, readiness and activity over time</CardDescription>
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
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              }
            />
            <YAxis domain={[0, 100]} width={32} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
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
