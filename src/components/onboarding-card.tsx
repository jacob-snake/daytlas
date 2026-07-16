"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { ChartLineUpIcon, GaugeIcon, FlaskIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const KEY = "woura.onboarded";

const STEPS = [
  {
    href: "/",
    title: "Dashboard",
    text: "How you're doing lately vs your own history",
    icon: GaugeIcon,
    color: "var(--chart-1)",
  },
  {
    href: "/trends",
    title: "Trends",
    text: "Any metric over your entire timeline, with correlations",
    icon: ChartLineUpIcon,
    color: "var(--chart-2)",
  },
  {
    href: "/tags",
    title: "Tag Lab",
    text: "What your habits actually do to your body the next day",
    icon: FlaskIcon,
    color: "var(--chart-4)",
  },
];

export function OnboardingCard() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!window.localStorage.getItem(KEY)), []);
  if (!show) return null;

  const dismiss = () => {
    window.localStorage.setItem(KEY, "1");
    setShow(false);
  };

  return (
    <Card className="stagger-item relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={dismiss}
        aria-label="Dismiss welcome tips"
        className="absolute top-3 right-3"
      >
        <X />
      </Button>
      <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
        {STEPS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `color-mix(in oklab, ${s.color} 14%, transparent)` }}
            >
              <s.icon weight="fill" className="size-5" style={{ color: s.color }} />
            </span>
            <span>
              <span className="block font-bold">{s.title}</span>
              <span className="block text-sm text-muted-foreground text-pretty">{s.text}</span>
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
