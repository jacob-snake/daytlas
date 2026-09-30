"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { CommandPalette } from "@/components/command-palette";
import { Welcome } from "@/components/welcome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { DataError, HistoryLoading } from "@/components/data-state";
import { useOuraQuery, useOuraSession } from "@/lib/use-oura-query";
import { detectFirstDay, fetchWide, type DayRow } from "@/lib/oura/metrics";
import { localDay } from "@/lib/dates";
import { profileSummary, sleepDuration } from "@/lib/profile-summary";
import { updateGoal, validTarget } from "@/lib/onboarding";
import { trackProductEvent } from "@/lib/product-analytics";
import { useLocalPreferences } from "@/components/onboarding/use-local-preferences";

export default function OnboardingPage() {
  const session = useOuraSession();
  const load = useCallback(
    async () => fetchWide(await detectFirstDay(), localDay()),
    [],
  );
  const { data: rows, error } = useOuraQuery(
    session && `${session}:history`,
    load,
  );
  if (!session) return <Welcome />;
  return <Setup key={session} scope={session} rows={rows} error={error} />;
}

function Setup({
  scope,
  rows,
  error,
}: {
  scope: string;
  rows: DayRow[] | null;
  error: string | null;
}) {
  const { preferences, save } = useLocalPreferences(scope);
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<"none" | "duration" | null>(null);
  const [hours, setHours] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const stepName = (["history", "goal", "review"] as const)[step];
  useEffect(() => {
    trackProductEvent("setup_step_viewed", { step: stepName });
  }, [stepName]);
  const latest = preferences.goals.at(-1);
  const selected = choice ?? (latest?.targetMinutes ? "duration" : "none");
  const duration =
    hours ?? (latest?.targetMinutes ? String(latest.targetMinutes / 60) : "");
  const minutes = Number(duration) * 60;
  const valid =
    selected === "none" || (duration.trim() !== "" && validTarget(minutes));
  const summary = rows ? profileSummary(rows, localDay()) : null;
  function go(next: number) {
    setStep(next);
    setMessage("");
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start" });
    });
  }
  return (
    <main id="main-content" className="app-page">
      <AppHeader active="profile" />
      <CommandPalette />
      <div className="mx-auto w-full max-w-3xl space-y-6 py-3 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Optional setup · About a minute
          </p>
          <Button asChild variant="ghost">
            <Link
              href="/app"
              onClick={() =>
                trackProductEvent("setup_skipped", { step: stepName })
              }
            >
              Explore without setup
            </Link>
          </Button>
        </div>
        <ol
          className="grid grid-cols-3 gap-3 text-xs sm:text-sm"
          aria-label="Setup progress"
        >
          {["Your history", "Your goal", "Your choices"].map((label, index) => (
            <li
              key={label}
              aria-current={step === index ? "step" : undefined}
              className={`border-t-2 pt-3 ${step === index ? "border-foreground text-foreground" : "border-border text-muted-foreground"}`}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        <h1
          ref={heading}
          tabIndex={-1}
          className="scroll-mt-56 text-3xl font-medium tracking-tight outline-none sm:scroll-mt-28 sm:text-5xl"
        >
          {saved
            ? "A little more personal."
            : [
                "Start with your own picture.",
                "What would you like to aim for?",
                "Your choices, at a glance.",
              ][step]}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {scope === "demo"
            ? "You’re using fictional demo data. These choices belong to the demo only."
            : "Your Oura connection works without creating a separate account."}{" "}
          Your setup stays in this browser.
        </p>
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>The history available to you</CardTitle>
              <CardDescription>
                Record dates describe what we can access, not when you joined
                Oura.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {error ? (
                <DataError error={error} />
              ) : !summary ? (
                <HistoryLoading />
              ) : summary.records === 0 ? (
                <p>
                  No records yet. You can still choose a goal. New data depends
                  on syncing your ring with the Oura app.
                </p>
              ) : (
                <>
                  <dl className="grid grid-cols-2 gap-5">
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Recorded days
                      </dt>
                      <dd className="mt-2 text-4xl tracking-tight tabular-nums">
                        {summary.records}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Sleep duration records
                      </dt>
                      <dd className="mt-2 text-4xl tracking-tight tabular-nums">
                        {summary.nights}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        First available
                      </dt>
                      <dd className="mt-2">{summary.first}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        Latest available
                      </dt>
                      <dd className="mt-2">{summary.latest}</dd>
                    </div>
                  </dl>
                  <p className="text-sm text-muted-foreground">
                    The latest record date is not a live sync timestamp. Missing
                    records are never counted as zero.
                  </p>
                </>
              )}
              <Button
                onClick={() => {
                  trackProductEvent("setup_step_completed", {
                    step: "history",
                  });
                  go(1);
                }}
              >
                Continue to your goal
              </Button>
            </CardContent>
          </Card>
        )}
        {step === 1 && (
          <Card>
            <CardContent className="space-y-6 pt-6">
              <fieldset className="space-y-3">
                <legend className="mb-3 font-medium">
                  Choose your starting point
                </legend>
                {[
                  {
                    value: "none",
                    title: "Explore without a goal",
                    detail:
                      "Get to know your patterns first. Add a goal whenever you’re ready.",
                  },
                  {
                    value: "duration",
                    title: "Choose a sleep-duration goal",
                    detail:
                      "Compare recorded main sleep with a duration you choose.",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 has-[:checked]:bg-secondary"
                  >
                    <input
                      className="mt-1 size-5 shrink-0 accent-current"
                      type="radio"
                      name="goal"
                      value={option.value}
                      checked={selected === option.value}
                      onChange={() =>
                        setChoice(option.value as "none" | "duration")
                      }
                    />
                    <span>
                      <span className="block font-medium">{option.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        {option.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {selected === "duration" && (
                <div className="space-y-3">
                  <Label htmlFor="sleep-goal">Your target, in hours</Label>
                  <Input
                    id="sleep-goal"
                    className="max-w-52"
                    type="number"
                    inputMode="decimal"
                    min="4"
                    max="12"
                    step="0.25"
                    placeholder="For example, 7.5"
                    value={duration}
                    onChange={(event) => setHours(event.target.value)}
                    aria-describedby="goal-help"
                    aria-invalid={!!message}
                  />
                  <p
                    id="goal-help"
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    Choose 4–12 hours in 15-minute steps. This is a personal
                    reference, not a medical recommendation. Longer sleep is not
                    automatically better.
                  </p>
                </div>
              )}
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => go(0)}>
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (!valid) {
                      setMessage(
                        "Enter a duration from 4 to 12 hours in 15-minute steps.",
                      );
                      return;
                    }
                    trackProductEvent("setup_step_completed", { step: "goal" });
                    go(2);
                  }}
                >
                  Review your choices
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === 2 && (
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="rounded-2xl bg-secondary p-5">
                <p className="text-sm text-muted-foreground">
                  Your starting point
                </p>
                <p className="mt-2 text-3xl font-medium tracking-tight">
                  {selected === "duration"
                    ? sleepDuration(minutes / 60)
                    : "Explore at your own pace"}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {saved
                    ? `Saved from ${latest?.effectiveDay}. Previous days keep their original target.`
                    : latest
                      ? "Goal changes start tomorrow. Previous days retain the target that applied at the time."
                      : "Your first goal starts today. Earlier nights are not judged against a new target."}
                </p>
              </div>
              <div>
                <h2 className="font-medium">Email stays off</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Account sign-in and scheduled email delivery are not available
                  yet. Nothing will be emailed, and no marketing subscription is
                  created. You can review your progress in your profile.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Saved choices are available only on this browser and device.
                Clear them at any time in your profile. Disconnecting and
                clearing local data removes them too.
              </p>
              <p
                role={saved ? "status" : "alert"}
                className={`text-sm ${saved ? "" : "text-destructive"}`}
              >
                {message}
              </p>
              {saved ? (
                <Button asChild>
                  <Link href="/app/profile#preferences">See your profile</Link>
                </Button>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => go(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      try {
                        save(
                          updateGoal(
                            preferences,
                            selected === "duration" ? minutes : null,
                            localDay(),
                          ),
                        );
                        trackProductEvent("setup_step_completed", {
                          step: "review",
                        });
                        setSaved(true);
                        setMessage("Your setup is saved in this browser.");
                        requestAnimationFrame(() => {
                          heading.current?.focus({ preventScroll: true });
                          heading.current?.scrollIntoView({ block: "start" });
                        });
                      } catch {
                        setMessage(
                          "Your setup could not be saved. Check your browser’s storage settings and try again.",
                        );
                      }
                    }}
                  >
                    Save my setup
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <AppFooter />
    </main>
  );
}
