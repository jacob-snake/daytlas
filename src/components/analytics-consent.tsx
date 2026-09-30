"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  analyticsEligible,
  getAnalyticsConsent,
  productAnalyticsConfiguration,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "@/lib/product-analytics";

const serverSnapshot = () => "unknown" as const;
const subscribeHydration = () => () => {};
const readySnapshot = () => true;
const notReadySnapshot = () => false;

function useConsent() {
  const consent = useSyncExternalStore(
    subscribeAnalyticsConsent,
    getAnalyticsConsent,
    serverSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribeHydration,
    readySnapshot,
    notReadySnapshot,
  );
  return { consent, ready };
}

export function AnalyticsConsentBanner() {
  const { consent, ready } = useConsent();
  usePathname(); // Re-evaluate eligibility after client-side navigation.
  const [error, setError] = useState(false);
  if (
    !ready ||
    !productAnalyticsConfiguration() ||
    !analyticsEligible() ||
    consent !== "unknown"
  )
    return null;
  function choose(choice: "allowed" | "declined") {
    const saved = setAnalyticsConsent(choice);
    setError(!saved);
  }
  return (
    <aside
      aria-label="Optional analytics"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-3xl border border-border bg-background p-5 shadow-lg sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <p className="font-semibold tracking-tight">
        Help us improve the website and demo?
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        With your permission, PostHog receives selected interface actions and a
        random identifier. We exclude your Oura-connected session, health data,
        URLs and screen recordings. The service receives your network address
        when a request is sent. Your choice does not affect access.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => choose("declined")}>
          Decline analytics
        </Button>
        <Button variant="outline" size="sm" onClick={() => choose("allowed")}>
          Allow analytics
        </Button>
        <Link
          href="/privacy#analytics-settings"
          className="inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-4"
        >
          Details and settings
        </Link>
      </div>
      {error && (
        <p role="status" className="mt-2 text-sm">
          We could not save your choice. Analytics stays off in this tab.
        </p>
      )}
    </aside>
  );
}

export function AnalyticsPreferences() {
  const { consent, ready } = useConsent();
  const [message, setMessage] = useState("");
  const configured = !!productAnalyticsConfiguration();
  function choose(choice: "allowed" | "declined") {
    const saved = setAnalyticsConsent(choice);
    setMessage(
      saved
        ? choice === "allowed"
          ? "Saved. Only eligible website and demo actions can be measured."
          : "Analytics is off. No further events will be sent."
        : "Your choice could not be saved. Analytics is off in this tab; clear this site's storage to remove any earlier saved permission.",
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-5">
      <p className="font-medium">
        {!configured
          ? "Analytics is not enabled on this installation."
          : ready && consent === "allowed"
            ? "Your analytics choice: allowed."
            : "Your analytics choice: off."}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        You can change your choice at any time. Withdrawal stops future capture
        and clears this tab’s analytics identifier. It cannot recall requests
        already delivered.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!configured || !ready || consent === "allowed"}
          onClick={() => choose("allowed")}
        >
          Allow analytics
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!ready}
          onClick={() => choose("declined")}
        >
          Turn analytics off
        </Button>
      </div>
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
    </div>
  );
}
