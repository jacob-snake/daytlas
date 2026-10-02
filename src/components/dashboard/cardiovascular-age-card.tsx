"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartGrid } from "@/components/ui/chart-grid";
import { numericYAxis } from "@/lib/chart-presentation";
import { cardiovascularAgeSummary } from "@/lib/cardiovascular-age";
import { fetchAll, getMode } from "@/lib/oura/client";
import type { DailyCardiovascularAge } from "@/lib/oura/types";
import { useOuraQuery } from "@/lib/use-oura-query";
import { localDay, parseDay, shiftDay } from "@/lib/dates";

export function CardiovascularAgeCard({ session }: { session: string }) {
  const [attempt, setAttempt] = useState(0);
  const today = localDay();
  const imported = session.startsWith("import:");
  const load = useCallback(
    () =>
      getMode() === "import"
        ? Promise.resolve([])
        : fetchAll<DailyCardiovascularAge>("daily_cardiovascular_age", {
            start_date: shiftDay(today, -364),
            end_date: today,
          }),
    [today],
  );
  const { data, error, loading } = useOuraQuery(
    `${session}:cardiovascular-age:${today}:${attempt}`,
    load,
  );
  const summary = useMemo(
    () => (data ? cardiovascularAgeSummary(data, today) : null),
    [data, today],
  );
  return (
    <Card aria-label="Cardiovascular age">
      <CardHeader>
        <p className="text-xs font-medium text-muted-foreground">
          Heart health
        </p>
        <CardTitle className="text-xl sm:text-2xl">
          Cardiovascular age
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton
            className="h-52 rounded-xl"
            aria-label="Loading cardiovascular age"
          />
        ) : error ? (
          <div role="status" className="space-y-3 text-sm">
            <p>Cardiovascular age could not be loaded. {error}</p>
            {/Heart health|expired|permission/i.test(error) ? (
              <Button asChild variant="outline" size="sm">
                <a href="/api/auth/login">Reconnect with Oura</a>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Try again
              </Button>
            )}
          </div>
        ) : !summary ? (
          <p className="text-sm text-muted-foreground">
            {imported
              ? "Cardiovascular age is not included in this file import. Connect Oura to check for readings."
              : "Oura has not returned a cardiovascular age reading for the past year. Availability depends on your ring, membership and recorded nights."}
          </p>
        ) : (
          <div className="grid min-w-0 items-center gap-6 sm:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.7fr)]">
            <div>
              <p className="mt-2 text-5xl font-bold tracking-tight tabular-nums">
                {summary.latest.value}{" "}
                <span className="ml-2 text-base font-medium text-muted-foreground">
                  years
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Oura estimate
              </p>
              <div className="mt-5 border-t border-border/60 pt-4 text-sm">
                {summary.average !== null ? (
                  <>
                    <p className="font-semibold tabular-nums">
                      {summary.average.toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })}{" "}
                      years{" "}
                      <span className="font-normal text-muted-foreground">
                        · previous 30-day average
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Not enough earlier readings for a 30-day comparison (
                    {summary.count} of 30 days).
                  </p>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <ChartContainer
                config={{
                  value: {
                    label: "Cardiovascular age",
                    color: "var(--chart-2)",
                  },
                }}
                className="h-52 w-full aspect-auto"
                aria-label="Cardiovascular age over 90 days, in years"
              >
                <LineChart
                  data={summary.chart}
                  margin={{ top: 12, right: 12, left: 0 }}
                >
                  <ChartGrid days={summary.chart.map((row) => row.day)} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                    tickFormatter={(day) => format(parseDay(day), "d MMM")}
                  />
                  <YAxis
                    {...numericYAxis}
                    domain={([min, max]: readonly [number, number]) => [
                      Math.max(0, Math.floor(min) - 1),
                      Math.ceil(max) + 1,
                    ]}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    isAnimationActive={false}
                    content={
                      <ChartTooltipContent
                        className="chart-tooltip-dark"
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.day
                            ? format(
                                parseDay(payload[0].payload.day),
                                "d MMM yyyy",
                              )
                            : ""
                        }
                      />
                    }
                  />
                  <Line
                    dataKey="value"
                    type="monotone"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
              <p className="mt-2 text-xs text-muted-foreground">
                90 days ending{" "}
                {format(parseDay(summary.latest.day), "d MMM yyyy")} · years
              </p>
            </div>
          </div>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-5 -ml-3">
              <Info className="size-4" aria-hidden="true" />
              About cardiovascular age
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-80 max-w-[calc(100vw-2rem)] p-4 leading-relaxed"
          >
            <p className="font-semibold">What does this estimate mean?</p>
            <p>
              Oura estimates the age of your cardiovascular system from the
              shape of your pulse signal and estimated pulse wave velocity. It
              can be compared with your actual age.
            </p>
            <p className="text-muted-foreground">
              Look at the trend over time: changes can take weeks to appear.
              This is an estimate, not a medical diagnosis.
            </p>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}
