import test from "node:test";
import assert from "node:assert/strict";
import {
  createProductAnalytics,
  ANALYTICS_CONSENT_KEY,
  POSTHOG_EU_HOST,
  productAnalyticsConfiguration,
} from "../src/lib/product-analytics.ts";
import { proxy } from "../src/proxy.ts";
import { NextRequest } from "next/server";

function fixture() {
  const values = new Map();
  const calls = [];
  const state = {
    unavailable: false,
    configured: true,
    path: "/",
    clock: 1800000000000,
    sequence: 0,
  };
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const runtime = createProductAnalytics({
    storage: () => {
      if (state.unavailable) throw Error("storage blocked");
      return storage;
    },
    configuration: () =>
      state.configured
        ? { key: "phc_synthetic_test", host: POSTHOG_EU_HOST }
        : null,
    pathname: () => state.path,
    now: () => state.clock,
    randomId: () => `synthetic-random-${++state.sequence}`,
    fetch: (url, options) => {
      calls.push({ url, options, payload: JSON.parse(options.body) });
      return Promise.resolve({ ok: true });
    },
  });
  return { runtime, state, calls, values };
}

const action = { action: "story_opened" };
test("analytics is silent before choice, after decline, and without configuration", () => {
  const { runtime, calls, state } = fixture();
  assert.equal(runtime.track("website_interacted", action), false);
  runtime.setConsent("declined");
  assert.equal(runtime.track("website_interacted", action), false);
  runtime.setConsent("allowed");
  state.configured = false;
  assert.equal(runtime.track("website_interacted", action), false);
  assert.equal(calls.length, 0);
});
test("outbound payload only includes finite interface properties and processing controls", () => {
  const { runtime, calls } = fixture();
  runtime.setConsent("allowed");
  runtime.track("website_interacted", {
    ...action,
    email: "private@example.test",
    score: 91,
    environment: "caller-cannot-set-this",
    $current_url: "https://example.test/?code=secret",
    $set: { name: "private" },
    token: "secret",
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].payload.properties, {
    action: "story_opened",
    schema_version: 1,
    environment:
      process.env.NODE_ENV === "production" ? "production" : "development",
    context: "website",
    $process_person_profile: false,
    $geoip_disable: true,
  });
  assert.deepEqual(Object.keys(calls[0].payload).sort(), [
    "api_key",
    "distinct_id",
    "event",
    "properties",
    "timestamp",
  ]);
  assert.equal(calls[0].url, "https://eu.i.posthog.com/i/v0/e/");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.referrerPolicy, "no-referrer");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.keepalive, undefined);
  assert(!JSON.stringify(calls[0]).includes("private@example.test"));
});
test("unknown events, values, object coercion and wrong route contexts cannot send", () => {
  const { runtime, calls, state, values } = fixture();
  runtime.setConsent("allowed");
  for (const [event, props] of [
    ["$identify", {}],
    ["website_interacted", { action: "arbitrary" }],
    ["website_interacted", { action: { toString: () => "story_opened" } }],
    ["setup_step_completed", { step: "goal" }],
    ["website_interacted", null],
  ])
    assert.equal(runtime.track(event, props), false);
  state.path = "/api/auth/callback";
  assert.equal(runtime.track("website_interacted", action), false);
  state.path = "/app/onboarding";
  assert.equal(runtime.track("setup_step_completed", { step: "goal" }), false);
  values.set("woura.mode", "demo");
  assert.equal(
    runtime.track("setup_step_completed", { step: "goal", target: 8 }),
    true,
  );
  assert.deepEqual(calls[0].payload.properties, {
    step: "goal",
    schema_version: 1,
    environment:
      process.env.NODE_ENV === "production" ? "production" : "development",
    context: "demo",
    $process_person_profile: false,
    $geoip_disable: true,
  });
  assert.equal(runtime.track("website_interacted", action), false);
  assert.equal(calls.length, 1);
});
test("any Oura credentials or live/sandbox mode block capture, even on homepage", () => {
  for (const [key, value] of [
    ["woura.token", "synthetic"],
    ["woura.refresh", "synthetic"],
    ["woura.mode", "live"],
    ["woura.mode", "sandbox"],
  ]) {
    const { runtime, values, calls, state } = fixture();
    runtime.setConsent("allowed");
    values.set(key, value);
    assert.equal(runtime.track("website_interacted", action), false);
    state.path = "/app";
    assert.equal(runtime.track("app_interacted", {}), false);
    assert.equal(calls.length, 0);
  }
});
test("withdrawal aborts in-flight work, clears identity and never uploads a backlog", () => {
  const { runtime, calls } = fixture();
  runtime.setConsent("allowed");
  runtime.track("website_interacted", action);
  const firstId = calls[0].payload.distinct_id;
  runtime.setConsent("declined");
  assert.equal(calls[0].options.signal.aborted, true);
  assert.equal(runtime.track("website_interacted", action), false);
  runtime.setConsent("allowed");
  assert.equal(calls.length, 1);
  runtime.track("website_interacted", action);
  assert.notEqual(calls[1].payload.distinct_id, firstId);
});
test("capture re-reads shared consent before dispatch, before storage event delivery", () => {
  const { runtime, calls, values } = fixture();
  runtime.setConsent("allowed");
  runtime.track("website_interacted", action);
  const record = JSON.parse(values.get(ANALYTICS_CONSENT_KEY));
  record.choice = "declined";
  values.set(ANALYTICS_CONSENT_KEY, JSON.stringify(record));
  assert.equal(runtime.track("website_interacted", action), false);
  assert.equal(calls[0].options.signal.aborted, true);
  assert.equal(calls.length, 1);
});
test("blocked storage and expired/malformed/future consent fail closed", () => {
  const { runtime, state, values, calls } = fixture();
  state.unavailable = true;
  assert.equal(runtime.setConsent("allowed"), false);
  assert.equal(runtime.track("website_interacted", action), false);
  state.unavailable = false;
  runtime.setConsent("allowed");
  state.unavailable = true;
  assert.equal(runtime.setConsent("declined"), false);
  state.unavailable = false;
  assert.equal(runtime.track("website_interacted", action), false);
  runtime.setConsent("allowed");
  state.clock += 181 * 24 * 60 * 60 * 1000;
  assert.equal(runtime.track("website_interacted", action), false);
  for (const invalid of [
    "broken",
    JSON.stringify({
      version: 1,
      choice: "allowed",
      revision: "x",
      at: state.clock + 1000,
    }),
  ]) {
    values.set(ANALYTICS_CONSENT_KEY, invalid);
    assert.equal(runtime.track("website_interacted", action), false);
  }
  assert.equal(calls.length, 0);
});
test("broadcast withdrawal wins even when old stored opt-in survives storage failure", () => {
  const { runtime, calls } = fixture();
  runtime.setConsent("allowed");
  runtime.track("website_interacted", action);
  runtime.refresh(true);
  assert.equal(runtime.getConsent(), "declined");
  assert.equal(runtime.track("website_interacted", action), false);
  assert.equal(calls[0].options.signal.aborted, true);
});
test("configuration and CSP permit only explicitly enabled exact EU ingestion", () => {
  const keys = [
    "NEXT_PUBLIC_POSTHOG_ENABLED",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
  ];
  const saved = keys.map((key) => process.env[key]);
  try {
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED = "true";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_synthetic_test";
    for (const host of [
      "https://evil.test",
      "https://eu.i.posthog.com.evil.test",
      "https://us.i.posthog.com",
      "https://eu.i.posthog.com/path",
    ]) {
      process.env.NEXT_PUBLIC_POSTHOG_HOST = host;
      assert.equal(productAnalyticsConfiguration(), null);
    }
    process.env.NEXT_PUBLIC_POSTHOG_HOST = POSTHOG_EU_HOST;
    assert.equal(productAnalyticsConfiguration().host, POSTHOG_EU_HOST);
    assert(
      proxy(new NextRequest("http://localhost/"))
        .headers.get("Content-Security-Policy")
        .includes("connect-src 'self' https://eu.i.posthog.com"),
    );
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED = "false";
    assert.equal(productAnalyticsConfiguration(), null);
    assert(
      !proxy(new NextRequest("http://localhost/"))
        .headers.get("Content-Security-Policy")
        .includes("posthog.com"),
    );
  } finally {
    keys.forEach((key, i) =>
      saved[i] === undefined
        ? delete process.env[key]
        : (process.env[key] = saved[i]),
    );
  }
});

test("environment is selected from the runtime, never caller-supplied fields", () => {
  const saved = process.env.NODE_ENV;
  try {
    for (const [runtimeEnvironment, expected] of [
      ["production", "production"],
      ["development", "development"],
      ["test", "development"],
    ]) {
      process.env.NODE_ENV = runtimeEnvironment;
      const { runtime, calls } = fixture();
      runtime.setConsent("allowed");
      runtime.track("website_interacted", {
        action: "story_opened",
        environment: "forged",
      });
      assert.equal(calls[0].payload.properties.environment, expected);
    }
  } finally {
    if (saved === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved;
  }
});
