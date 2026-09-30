"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand } from "@/lib/brand-config";

type Snapshot = {
  enabled: boolean;
  preferences: boolean;
  account: { email: string; displayName: string } | null;
};
const messages: Record<string, string> = {
  disabled:
    "Account sign-in is not available yet. You can keep using the demo or your Oura connection.",
  invalid_email: "Enter a valid email address.",
  invalid_code:
    "That code is invalid or has expired. Check the latest email or request a new code.",
  rate_limited: "Please wait a minute before trying again.",
  sign_in_required: "Your session has ended. Sign in again to save changes.",
};
const unavailable = "We could not reach your account. Please try again.";

async function loadAccount(signal?: AbortSignal): Promise<Snapshot> {
  const response = await fetch("/api/account", {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) throw new Error(unavailable);
  return response.json();
}

export function AccountPanel() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  async function refresh(signal?: AbortSignal) {
    const result = await loadAccount(signal);
    setSnapshot(result);
    setDisplayName(result.account?.displayName ?? "");
    return result;
  }
  useEffect(() => {
    const controller = new AbortController();
    loadAccount(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSnapshot(result);
        setDisplayName(result.account?.displayName ?? "");
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(unavailable);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (sent) codeInput.current?.focus();
  }, [sent]);

  async function perform(action: string, values: Record<string, string> = {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...values }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 429) setCooldown(60);
        if (response.status === 401) await refresh();
        setError(messages[result.error] ?? unavailable);
        return;
      }
      if (action === "request_code") {
        setSent(true);
        setCooldown(60);
        setCode("");
        setNotice(
          "If this address can receive a sign-in code, it is on its way. Check your inbox and spam folder.",
        );
      } else {
        await refresh();
        setCode("");
        if (action === "sign_out") {
          setEmail("");
          setSent(false);
          setNotice(
            "You are signed out of this account. Your Oura connection in this browser is unchanged.",
          );
        }
        if (action === "save_profile") setNotice("Your account name is saved.");
      }
    } catch {
      setError(unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <p
        role="status"
        aria-live="polite"
        className={notice ? "rounded-2xl bg-secondary p-4 text-sm" : "sr-only"}
      >
        {notice}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 p-4 text-sm"
        >
          {error}
        </p>
      )}
      {!snapshot ? (
        <div>
          <p className="text-muted-foreground">
            {error
              ? "Your account has not loaded."
              : "Checking account availability…"}
          </p>
          {error && (
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => {
                setError("");
                refresh().catch(() => setError(unavailable));
              }}
            >
              Try again
            </Button>
          )}
        </div>
      ) : !snapshot.enabled ? (
        <section className="rounded-3xl border border-border p-5 sm:p-6">
          <h2>Account sign-in is being prepared</h2>
          <p>
            An account is optional. You can explore the demo and use your Oura
            connection without creating one. No email address is collected here
            yet. Accounts are planned after the current free access period and
            before paid access begins. Optional weekly emails, more personal
            setup and AI features will follow in stages.
          </p>
          <Link
            href="/app"
            className="mt-4 inline-flex min-h-11 items-center font-semibold"
          >
            Continue to the app
          </Link>
        </section>
      ) : snapshot.account ? (
        <>
          <section className="rounded-3xl border border-border p-5 sm:p-6">
            <h2>
              {snapshot.account.displayName
                ? `Hello, ${snapshot.account.displayName}.`
                : "Your account"}
            </h2>
            <p className="break-words">{snapshot.account.email}</p>
            <p className="text-sm text-muted-foreground">Email verified</p>
            {snapshot.preferences && (
              <form
                className="mt-6 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform("save_profile", { displayName });
                }}
              >
                <label htmlFor="account-name" className="block font-semibold">
                  What should we call you?{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Input
                  id="account-name"
                  name="name"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={40}
                  disabled={busy}
                />
                <Button type="submit" loading={busy}>
                  Save account name
                </Button>
              </form>
            )}
          </section>
          <section>
            <h2>Your emails</h2>
            <p>
              Only sign-in codes and essential account messages. Creating an
              account does not subscribe you to marketing.
            </p>
            <p>
              Daily and weekly health reports are not available yet. Your Oura
              history and goals remain on this device.
            </p>
          </section>
          <Button
            variant="secondary"
            onClick={() => void perform("sign_out")}
            loading={busy}
          >
            Sign out of this account
          </Button>
        </>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void perform(
              sent ? "verify_code" : "request_code",
              sent ? { email, code } : { email },
            );
          }}
        >
          <div className="space-y-2">
            <label htmlFor="account-email" className="block font-semibold">
              Your email
            </label>
            <Input
              id="account-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              readOnly={sent}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby="account-email-help"
            />
            <p
              id="account-email-help"
              className="text-sm text-muted-foreground"
            >
              We will send a one-time sign-in code. If you are new, verifying
              your email creates your {brand.name} account. No password needed.
            </p>
          </div>
          {sent && (
            <div className="space-y-2">
              <label htmlFor="account-code" className="block font-semibold">
                Six-digit code
              </label>
              <Input
                ref={codeInput}
                id="account-code"
                name="one-time-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                disabled={busy}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="text-lg tracking-[0.2em]"
              />
            </div>
          )}
          <Button type="submit" loading={busy}>
            {sent ? "Verify & sign in" : "Email me a code"}
          </Button>
          {sent && (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                disabled={busy || cooldown > 0}
                onClick={() => void perform("request_code", { email })}
              >
                {cooldown ? `Send again in ${cooldown}s` : "Send another code"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setError("");
                  setNotice("");
                }}
              >
                Use another email
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            An account is optional and separate from Oura. See our{" "}
            <Link href="/privacy">Privacy notice</Link> and{" "}
            <Link href="/terms">Terms</Link>. Marketing is not included.
          </p>
        </form>
      )}
    </div>
  );
}
