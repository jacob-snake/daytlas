"use client";

import { AnalyticsConsentBanner } from "@/components/analytics-consent";
import { MotionConfig } from "motion/react";
import { migrateBrowserStorage } from "@/lib/brand-migration";
import { useEffect } from "react";

/** Global Motion config — respects the user's reduced-motion preference. */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      migrateBrowserStorage(window.localStorage);
    } catch {
      /* Optional storage. */
    }
    // A different tab may reconnect, enter demo, or erase this connection.
    // Refreshing only the access token must not interrupt an active session.
    const changed = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (
        event.key === null ||
        event.key === "daytlas.cacheScope" ||
        event.key === "daytlas.mode" ||
        (event.key === "daytlas.token" && !event.newValue)
      )
        window.location.reload();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <AnalyticsConsentBanner />
    </MotionConfig>
  );
}
