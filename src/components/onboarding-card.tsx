"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const KEY = "woura.onboarded";

const STEPS = [
  { href: "/", title: "Dashboard", text: "how you're doing lately vs your own history" },
  { href: "/trends", title: "Trends", text: "any metric over your entire timeline, with correlations" },
  { href: "/tags", title: "Tag Lab", text: "what your habits actually do to your body the next day" },
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
    <Card className="stagger-item border-dashed">
      <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-4">
        <div className="space-y-1.5 text-sm">
          <p className="font-medium">Welcome — three places worth knowing:</p>
          <ul className="space-y-1 text-muted-foreground">
            {STEPS.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="font-medium text-foreground underline-offset-2 hover:underline">
                  {s.title}
                </Link>{" "}
                — {s.text}
              </li>
            ))}
          </ul>
        </div>
        <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Dismiss welcome tips">
          <X />
        </Button>
      </CardContent>
    </Card>
  );
}
