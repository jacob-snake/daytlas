"use client";
import { Icon } from "@/components/icon";
import {
  ChartLineData01Icon,
  CircleIcon,
  DashboardSpeed01Icon,
  FlaskConicalIcon,
} from "@hugeicons/core-free-icons";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    href: "/app",
    title: "Dashboard",
    text: "How you're doing lately vs your own history",
    icon: DashboardSpeed01Icon,
    color: "var(--chart-1)",
  },
  {
    href: "/app/trends",
    title: "Trends",
    text: "Any metric over your entire timeline, with correlations",
    icon: ChartLineData01Icon,
    color: "var(--chart-2)",
  },
  {
    href: "/app/year",
    title: "Year",
    text: "Your whole year as rings, heatmap and sleep barcode",
    icon: CircleIcon,
    color: "var(--chart-3)",
  },
  {
    href: "/app/tags",
    title: "Tag Lab",
    text: "What your habits actually do to your body the next day",
    icon: FlaskConicalIcon,
    color: "var(--chart-4)",
  },
];

export function OnboardingCard({ current }: { current?: string }) {
  return (
    <Card className="stagger-item">
      <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.filter((s) => s.href !== current).map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: `color-mix(in oklab, ${s.color} 14%, transparent)`,
              }}
            >
              <Icon
                icon={s.icon}
                className="size-5"
                style={{ color: s.color }}
              />
            </span>
            <span>
              <span className="block font-bold">{s.title}</span>
              <span className="block text-sm text-muted-foreground text-pretty">
                {s.text}
              </span>
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
