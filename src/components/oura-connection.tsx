"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { OuraImportPanel } from "@/components/oura-import";
import { DemoButton } from "@/components/demo-button";

export function OuraConnection() {
  const [state, setState] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable");
        const result = await response.json();
        setState(result.oura === true ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("unavailable");
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <>
      <div aria-live="polite" aria-busy={state === "loading"}>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
          {state === "ready"
            ? "Your days, connected."
            : state === "loading"
              ? "Checking your connection…"
              : "Oura connection is not available yet."}
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
          {state === "ready"
            ? "Connect your Oura. No extra account needed."
            : state === "loading"
              ? "Checking whether Oura is ready to connect."
              : "You can explore the app with sample data while the connection is unavailable. No account is needed."}
        </p>
      </div>
      {state === "ready" && (
        <ul className="mt-7 space-y-4 text-sm font-medium leading-relaxed">
          {[
            "Sign in securely on Oura’s official website.",
            "Choose which records to share.",
            "History and analysis stay in your browser.",
          ].map((text) => (
            <li key={text} className="flex items-start gap-3">
              <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              {text}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex flex-col gap-3">
        {state === "ready" ? (
          <Button asChild size="lg" className="w-full">
            <a href="/api/auth/login">Connect with Oura</a>
          </Button>
        ) : (
          <DemoButton />
        )}
        {state === "unavailable" && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setState("loading");
              setAttempt(attempt + 1);
            }}
          >
            Check again
          </Button>
        )}
        <Button asChild size="lg" variant="ghost">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
      <OuraImportPanel />
      <p className="mt-6 text-sm text-muted-foreground">
        {state === "ready"
          ? "Data passes through our server to reach your browser. We do not keep a server-side health database. Disconnect anytime in your profile. "
          : "Exploring the demo does not access your Oura records. "}
        <Link href="/privacy" className="underline underline-offset-4">
          How your data is handled
        </Link>
      </p>
    </>
  );
}
