"use client";
import { Icon } from "@/components/icon";
import { ChartDownIcon, ChartUpIcon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";

export function ScoreCard({
  label,
  value,
  delta,
  color,
}: {
  label: string;
  value: number | null;
  delta: number | null;
  color: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: color }} />
          {label}
        </CardDescription>
        <CardTitle className="text-4xl font-semibold tabular-nums tracking-tight">
          {value ?? "–"}
        </CardTitle>
        {delta !== null && (
          <CardAction>
            <Badge variant="outline" className="tabular-nums">
              {delta >= 0 ? <Icon icon={ChartUpIcon} /> : <Icon icon={ChartDownIcon} />}
              {Math.abs(delta).toFixed(1)}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );
}
