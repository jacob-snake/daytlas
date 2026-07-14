"use client";

import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { DayScores } from "@/lib/oura/queries";

// Different units → separate small multiples, never a shared axis.
const PANELS = [
  { key: "hrv", label: "HRV (avg, ms)", color: "var(--chart-4)" },
  { key: "resting_hr", label: "Lowest HR (bpm)", color: "var(--chart-5)" },
  { key: "temperature_deviation", label: "Temp deviation (°C)", color: "var(--chart-5)" },
  { key: "total_sleep_h", label: "Total sleep (h)", color: "var(--chart-1)" },
] as const;

export function VitalsPanels({ data }: { data: DayScores[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PANELS.map((p) => {
        const config = { [p.key]: { label: p.label, color: p.color } } satisfies ChartConfig;
        const latest = [...data].reverse().find((d) => d[p.key] !== null)?.[p.key];
        return (
          <Card key={p.key}>
            <CardHeader>
              <CardDescription>{p.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{latest ?? "–"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={config} className="h-[72px] w-full">
                <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                  <XAxis dataKey="day" hide />
                  <YAxis domain={["auto", "auto"]} hide />
                  <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                  <Area
                    type="monotone"
                    dataKey={p.key}
                    stroke={p.color}
                    fill={p.color}
                    fillOpacity={0.12}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
