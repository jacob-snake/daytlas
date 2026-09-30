import {
  hasLegacyConnection,
  migrateBrowserStorage,
  LEGACY_STORAGE_PREFIX,
  LEGACY_ANALYTICS_CONSENT,
} from "./brand-migration";
/** Deliberately independent from analytics.ts, which computes health statistics. */
export const ANALYTICS_CONSENT_KEY = "daytlas.analytics-consent.v1";
export const POSTHOG_EU_HOST = "https://eu.i.posthog.com";
const CONSENT_LIFETIME = 180 * 24 * 60 * 60 * 1000;
export type AnalyticsConsent = "unknown" | "allowed" | "declined";
export type ProductEvents = {
  website_interacted: {
    action: "demo_opened" | "story_opened" | "how_it_works_opened";
  };
  setup_step_viewed: { step: "history" | "goal" | "review" };
  setup_step_completed: { step: "history" | "goal" | "review" };
  setup_skipped: { step: "history" | "goal" | "review" };
  overview_interacted: { action: "open_detail" | "change_range" };
  settings_opened: { section: "goals" | "reports" };
  app_interacted: Record<string, never>;
};

type Configuration = { key: string; host: string };
export function productAnalyticsConfiguration(): Configuration | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "";
  // Enabling asserts the operator verified IP discard, retention and processor setup.
  if (
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED !== "true" ||
    !/^phc_[\w-]+$/.test(key) ||
    host !== POSTHOG_EU_HOST
  )
    return null;
  return { key, host };
}

function allowedProperties(event: string, properties: Record<string, unknown>) {
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  )
    return null;
  const { action, step, section } = properties;
  switch (event) {
    case "website_interacted":
      return ["demo_opened", "story_opened", "how_it_works_opened"].includes(
        typeof action === "string" ? action : "",
      )
        ? { action }
        : null;
    case "setup_step_viewed":
    case "setup_step_completed":
    case "setup_skipped":
      return step === "history" || step === "goal" || step === "review"
        ? { step }
        : null;
    case "overview_interacted":
      return action === "open_detail" || action === "change_range"
        ? { action }
        : null;
    case "settings_opened":
      return section === "goals" || section === "reports" ? { section } : null;
    case "app_interacted":
      return {};
    default:
      return null;
  }
}

type AnalyticsEnvironment = {
  storage: () => Pick<Storage, "getItem" | "setItem">;
  configuration: () => Configuration | null;
  pathname: () => string;
  fetch: typeof fetch;
  now: () => number;
  randomId: () => string;
};

/** Dependency injection makes the privacy boundary testable without any real traffic. */
export function createProductAnalytics(environment: AnalyticsEnvironment) {
  let forcedOff = false;
  let identity: { consentRevision: string; id: string } | undefined;
  const requests = new Set<AbortController>();
  const listeners = new Set<() => void>();
  function stop() {
    for (const controller of requests) controller.abort();
    requests.clear();
    identity = undefined;
  }
  function record() {
    try {
      const value = JSON.parse(
        environment.storage().getItem(ANALYTICS_CONSENT_KEY) ?? "null",
      );
      if (
        !value ||
        value.version !== 1 ||
        !["allowed", "declined"].includes(value.choice) ||
        typeof value.revision !== "string" ||
        typeof value.at !== "number" ||
        value.at > environment.now() ||
        environment.now() - value.at > CONSENT_LIFETIME
      )
        return null;
      return value as {
        choice: "allowed" | "declined";
        at: number;
        revision: string;
      };
    } catch {
      return null;
    }
  }
  function getConsent(): AnalyticsConsent {
    if (forcedOff) return "declined";
    return record()?.choice ?? "unknown";
  }
  function scope(): "website" | "demo" | null {
    try {
      const storage = environment.storage();
      // Deny any live/sandbox connection, even on public routes or with stale demo mode.
      if (
        hasLegacyConnection(storage) ||
        storage.getItem("daytlas.token") ||
        storage.getItem("daytlas.refresh") ||
        storage.getItem("daytlas.importRevision")
      )
        return null;
      const mode = storage.getItem("daytlas.mode");
      if (mode && mode !== "demo") return null;
      const path = environment.pathname();
      if (["/", "/about", "/privacy", "/terms"].includes(path))
        return "website";
      return mode === "demo" && (path === "/app" || path.startsWith("/app/"))
        ? "demo"
        : null;
    } catch {
      return null;
    }
  }
  function refresh(withdraw = false) {
    if (withdraw) forcedOff = true;
    if (getConsent() !== "allowed" || !scope()) stop();
    for (const listener of listeners) listener();
  }
  function setConsent(choice: "allowed" | "declined") {
    stop();
    // Withdrawal wins even when storage becomes unavailable.
    forcedOff = true;
    let saved = false;
    try {
      const value = {
        version: 1,
        choice,
        at: environment.now(),
        revision: environment.randomId(),
      };
      environment
        .storage()
        .setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(value));
      saved = record()?.revision === value.revision;
      if (saved && choice === "allowed") forcedOff = false;
    } catch {
      /* No memory-only opt-in when persistence cannot be verified. */
    }
    refresh();
    return saved;
  }
  function track(event: string, properties: Record<string, unknown> = {}) {
    const configuration = environment.configuration();
    const currentScope = scope();
    const consent = record();
    if (
      !configuration ||
      forcedOff ||
      consent?.choice !== "allowed" ||
      !currentScope
    ) {
      stop();
      return false;
    }
    if ((event === "website_interacted") !== (currentScope === "website"))
      return false;
    let approved;
    try {
      approved = allowedProperties(event, properties);
    } catch {
      return false;
    }
    if (!approved) return false;
    if (identity?.consentRevision !== consent.revision) {
      try {
        identity = {
          consentRevision: consent.revision,
          id: environment.randomId(),
        };
      } catch {
        return false;
      }
    }
    const payload = {
      api_key: configuration.key,
      event,
      distinct_id: identity.id,
      timestamp: new Date(environment.now()).toISOString(),
      properties: {
        ...approved,
        schema_version: 1,
        environment:
          process.env.NODE_ENV === "production" ? "production" : "development",
        context: currentScope,
        $process_person_profile: false,
        $geoip_disable: true,
      },
    };
    const controller = new AbortController();
    requests.add(controller);
    // No queue, retries, beacon, keepalive, cookies, URL/referrer or SDK enrichment.
    void environment
      .fetch(`${configuration.host}/i/v0/e/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
      })
      .catch(() => {})
      .finally(() => requests.delete(controller));
    return true;
  }
  return {
    getConsent,
    setConsent,
    track,
    refresh,
    stop,
    isEligible: () => !!scope(),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let client: ReturnType<typeof createProductAnalytics> | undefined;
let channel: BroadcastChannel | undefined;
function browserClient() {
  if (typeof window === "undefined") return null;
  if (!client) {
    client = createProductAnalytics({
      storage: () => {
        migrateBrowserStorage(window.localStorage);
        return window.localStorage;
      },
      configuration: productAnalyticsConfiguration,
      pathname: () => window.location.pathname,
      fetch: (...args) => window.fetch(...args),
      now: () => Date.now(),
      randomId: () => crypto.randomUUID(),
    });
    window.addEventListener("storage", (event) => {
      if (
        event.key === null ||
        event.key === ANALYTICS_CONSENT_KEY ||
        event.key.startsWith("daytlas.") ||
        event.key.startsWith(LEGACY_STORAGE_PREFIX) ||
        event.key === LEGACY_ANALYTICS_CONSENT
      )
        client?.refresh();
    });
    window.addEventListener("pagehide", () => client?.stop());
    window.addEventListener("daytlas:session", () => client?.refresh());
    try {
      channel = new BroadcastChannel("daytlas.analytics-consent.v1");
      channel.onmessage = (event) => {
        if (event.data === "withdraw") client?.refresh(true);
      };
    } catch {
      /* Storage events and pre-send reads still enforce stored choices. */
    }
  }
  return client;
}
export const getAnalyticsConsent = () =>
  browserClient()?.getConsent() ?? "unknown";
export const analyticsEligible = () => browserClient()?.isEligible() ?? false;
export const subscribeAnalyticsConsent = (listener: () => void) =>
  browserClient()?.subscribe(listener) ?? (() => {});
export function setAnalyticsConsent(choice: "allowed" | "declined") {
  const saved = browserClient()?.setConsent(choice) ?? false;
  if (choice === "declined") {
    try {
      channel?.postMessage("withdraw");
    } catch {}
  }
  return saved;
}
export function trackProductEvent<E extends keyof ProductEvents>(
  event: E,
  properties: ProductEvents[E],
) {
  return browserClient()?.track(event, properties) ?? false;
}
