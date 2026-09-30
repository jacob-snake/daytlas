"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useLocalPreferences } from "./use-local-preferences";
import { goalProgress, targetForDay } from "@/lib/onboarding";
import { localDay } from "@/lib/dates";
import { trackProductEvent } from "@/lib/product-analytics";
import { sleepDuration } from "@/lib/profile-summary";
import type { DayRow } from "@/lib/oura/metrics";

export function PreferencesCard({
  scope,
  rows,
}: {
  scope: string;
  rows: DayRow[] | null;
}) {
  const { preferences, clear } = useLocalPreferences(scope);
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const latest = preferences.goals.at(-1);
  const today = localDay();
  const target = targetForDay(preferences, today);
  const progress = rows ? goalProgress(rows, preferences, today) : null;
  return (
    <Card id="preferences" className="scroll-mt-56 sm:scroll-mt-28">
      <CardHeader>
        <CardDescription>Your pace, your choice</CardDescription>
        <CardTitle>
          {preferences.completed
            ? "Your goal and preferences"
            : "Make room for a personal goal"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {preferences.completed
            ? "Your choices are saved only in this browser, separately for demo and connected data. They do not create an account or sync across devices."
            : "Explore first. When you’re ready, choose a sleep-duration goal and see how your recorded nights compare. Setup is optional."}
        </p>
        {latest && (
          <div className="rounded-2xl bg-secondary p-5">
            <p className="text-sm text-muted-foreground">
              {latest.effectiveDay > today
                ? `From ${latest.effectiveDay}`
                : "Your chosen sleep duration"}
            </p>
            <p className="mt-2 text-3xl font-medium tracking-tight">
              {latest.targetMinutes === null
                ? "No active goal"
                : sleepDuration(latest.targetMinutes / 60)}
            </p>
            {latest.effectiveDay > today && (
              <p className="mt-2 text-sm text-muted-foreground">
                Today:{" "}
                {target === null
                  ? "no active goal"
                  : sleepDuration(target / 60)}
                . Earlier results keep their original target.
              </p>
            )}
            {progress && progress.eligible > 0 && (
              <p className="mt-3 text-sm leading-relaxed">
                Last seven days: {progress.met} of {progress.recorded} recorded
                nights met the goal in effect that day. {progress.missing}{" "}
                {progress.missing === 1 ? "day has" : "days have"} no duration
                record. Days before your first goal are excluded.
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link
              href="/app/onboarding"
              onClick={() =>
                trackProductEvent("settings_opened", { section: "goals" })
              }
            >
              {preferences.completed
                ? "Edit your setup"
                : "Personalise your view"}
            </Link>
          </Button>
          {preferences.completed && (
            <Button variant="secondary" onClick={() => setConfirmClear(true)}>
              Reset local setup
            </Button>
          )}
        </div>
        {confirmClear && (
          <div className="rounded-2xl border border-border p-4 space-y-3">
            <p className="text-sm">
              Remove this browser’s saved goal history and setup? Your Oura
              connection and recorded data remain available.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="destructive"
                onClick={() => {
                  try {
                    clear();
                    setMessage("Local setup removed.");
                    setConfirmClear(false);
                  } catch {
                    setMessage(
                      "Could not remove your setup. Check your browser’s storage settings and try again.",
                    );
                  }
                }}
              >
                Remove local setup
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmClear(false)}
              >
                Keep setup
              </Button>
            </div>
          </div>
        )}
        <p role="status" className="text-sm">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}
